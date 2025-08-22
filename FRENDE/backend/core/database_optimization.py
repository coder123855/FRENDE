"""
Database optimization utilities and configuration
Provides query optimization, connection pooling, and performance monitoring
"""

import logging
import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from sqlalchemy import text, event
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool
from core.config import settings
from core.performance_monitor import performance_monitor

logger = logging.getLogger(__name__)

class DatabaseOptimizer:
    """Database optimization and monitoring utilities"""
    
    def __init__(self):
        self.slow_query_threshold = settings.SLOW_QUERY_THRESHOLD_MS
        self.query_cache: Dict[str, Any] = {}
        self.cache_ttl = 300  # 5 minutes
        self.max_cache_size = 1000
        
        # Performance metrics
        self.query_metrics = {
            "total_queries": 0,
            "slow_queries": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "average_query_time": 0.0
        }
    
    def configure_engine_optimization(self, engine):
        """Configure engine for optimal performance"""
        # Set up connection pooling
        engine.pool_size = settings.DATABASE_POOL_SIZE
        engine.max_overflow = settings.DATABASE_MAX_OVERFLOW
        engine.pool_timeout = settings.DATABASE_POOL_TIMEOUT
        engine.pool_recycle = 3600  # Recycle connections every hour
        engine.pool_pre_ping = True  # Verify connections before use
        
        # Set up query monitoring
        self._setup_query_monitoring(engine)
        
        logger.info("Database engine optimized for performance")
    
    def _setup_query_monitoring(self, engine):
        """Set up query monitoring and logging"""
        @event.listens_for(engine.sync_engine, "before_cursor_execute")
        def before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            context._query_start_time = datetime.utcnow()
        
        @event.listens_for(engine.sync_engine, "after_cursor_execute")
        def after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            if hasattr(context, '_query_start_time'):
                duration = (datetime.utcnow() - context._query_start_time).total_seconds() * 1000
                
                # Update metrics
                self.query_metrics["total_queries"] += 1
                self.query_metrics["average_query_time"] = (
                    (self.query_metrics["average_query_time"] * (self.query_metrics["total_queries"] - 1) + duration) /
                    self.query_metrics["total_queries"]
                )
                
                # Log slow queries
                if duration > self.slow_query_threshold:
                    self.query_metrics["slow_queries"] += 1
                    logger.warning(
                        f"Slow query detected: {duration:.2f}ms\n"
                        f"Statement: {statement[:200]}...\n"
                        f"Parameters: {parameters}"
                    )
    
    async def optimize_query_plan(self, session: AsyncSession, query: str) -> Dict[str, Any]:
        """Analyze and optimize query execution plan"""
        try:
            # Get query execution plan
            result = await session.execute(text(f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {query}"))
            plan = result.fetchone()
            
            if plan and plan[0]:
                plan_data = plan[0][0]
                return {
                    "execution_time": plan_data.get("Execution Time", 0),
                    "planning_time": plan_data.get("Planning Time", 0),
                    "total_cost": plan_data.get("Total Cost", 0),
                    "rows": plan_data.get("Plan", {}).get("Actual Rows", 0),
                    "loops": plan_data.get("Plan", {}).get("Actual Loops", 0),
                    "shared_hit_blocks": plan_data.get("Shared Hit Blocks", 0),
                    "shared_read_blocks": plan_data.get("Shared Read Blocks", 0)
                }
        except Exception as e:
            logger.error(f"Error analyzing query plan: {e}")
        
        return {}
    
    def get_cache_key(self, query: str, params: Dict[str, Any] = None) -> str:
        """Generate cache key for query"""
        import hashlib
        key_data = f"{query}:{str(sorted(params.items()) if params else '')}"
        return hashlib.md5(key_data.encode()).hexdigest()
    
    async def cached_query(
        self,
        session: AsyncSession,
        query_func,
        cache_key: str,
        ttl: int = None
    ) -> Any:
        """Execute query with caching"""
        if ttl is None:
            ttl = self.cache_ttl
        
        # Check cache
        if cache_key in self.query_cache:
            cache_entry = self.query_cache[cache_key]
            if datetime.utcnow() - cache_entry["timestamp"] < timedelta(seconds=ttl):
                self.query_metrics["cache_hits"] += 1
                return cache_entry["data"]
        
        # Cache miss
        self.query_metrics["cache_misses"] += 1
        
        # Execute query
        result = await query_func(session)
        
        # Cache result
        self.query_cache[cache_key] = {
            "data": result,
            "timestamp": datetime.utcnow()
        }
        
        # Clean up cache if too large
        if len(self.query_cache) > self.max_cache_size:
            self._cleanup_cache()
        
        return result
    
    def _cleanup_cache(self):
        """Clean up old cache entries"""
        current_time = datetime.utcnow()
        keys_to_remove = []
        
        for key, entry in self.query_cache.items():
            if current_time - entry["timestamp"] > timedelta(seconds=self.cache_ttl):
                keys_to_remove.append(key)
        
        for key in keys_to_remove:
            del self.query_cache[key]
        
        logger.info(f"Cleaned up {len(keys_to_remove)} cache entries")
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get current performance metrics"""
        return {
            **self.query_metrics,
            "cache_size": len(self.query_cache),
            "cache_hit_rate": (
                self.query_metrics["cache_hits"] / 
                (self.query_metrics["cache_hits"] + self.query_metrics["cache_misses"])
                if (self.query_metrics["cache_hits"] + self.query_metrics["cache_misses"]) > 0
                else 0
            )
        }
    
    async def analyze_table_performance(self, session: AsyncSession, table_name: str) -> Dict[str, Any]:
        """Analyze table performance and statistics"""
        try:
            # Get table statistics
            result = await session.execute(text(f"""
                SELECT 
                    schemaname,
                    tablename,
                    attname,
                    n_distinct,
                    correlation,
                    most_common_vals,
                    most_common_freqs
                FROM pg_stats 
                WHERE tablename = '{table_name}'
            """))
            
            stats = result.fetchall()
            
            # Get table size
            result = await session.execute(text(f"""
                SELECT 
                    pg_size_pretty(pg_total_relation_size('{table_name}')) as size,
                    pg_total_relation_size('{table_name}') as size_bytes,
                    (SELECT count(*) FROM {table_name}) as row_count
            """))
            
            size_info = result.fetchone()
            
            return {
                "table_name": table_name,
                "statistics": [dict(row._mapping) for row in stats],
                "size": size_info.size if size_info else "Unknown",
                "size_bytes": size_info.size_bytes if size_info else 0,
                "row_count": size_info.row_count if size_info else 0
            }
        except Exception as e:
            logger.error(f"Error analyzing table performance: {e}")
            return {"error": str(e)}
    
    async def get_index_usage_stats(self, session: AsyncSession) -> List[Dict[str, Any]]:
        """Get index usage statistics"""
        try:
            result = await session.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_scan,
                    idx_tup_read,
                    idx_tup_fetch
                FROM pg_stat_user_indexes 
                ORDER BY idx_scan DESC
            """))
            
            return [dict(row._mapping) for row in result.fetchall()]
        except Exception as e:
            logger.error(f"Error getting index usage stats: {e}")
            return []
    
    async def vacuum_analyze_table(self, session: AsyncSession, table_name: str) -> bool:
        """Perform VACUUM ANALYZE on a table"""
        try:
            await session.execute(text(f"VACUUM ANALYZE {table_name}"))
            await session.commit()
            logger.info(f"VACUUM ANALYZE completed for table {table_name}")
            return True
        except Exception as e:
            logger.error(f"Error performing VACUUM ANALYZE: {e}")
            return False
    
    async def reindex_table(self, session: AsyncSession, table_name: str) -> bool:
        """Reindex a table"""
        try:
            await session.execute(text(f"REINDEX TABLE {table_name}"))
            await session.commit()
            logger.info(f"REINDEX completed for table {table_name}")
            return True
        except Exception as e:
            logger.error(f"Error performing REINDEX: {e}")
            return False

# Global database optimizer instance
db_optimizer = DatabaseOptimizer()

# Query optimization decorators
def optimize_query(cache_key: str = None, ttl: int = None):
    """Decorator to optimize query execution with caching and monitoring"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract session from args or kwargs
            session = None
            for arg in args:
                if isinstance(arg, AsyncSession):
                    session = arg
                    break
            if not session:
                session = kwargs.get('session')
            
            if not session:
                raise ValueError("No session provided")
            
            # Generate cache key if not provided
            if not cache_key:
                func_name = func.__name__
                params = str(args) + str(sorted(kwargs.items()))
                key = db_optimizer.get_cache_key(f"{func_name}:{params}")
            else:
                key = cache_key
            
            # Execute with caching and monitoring
            async with performance_monitor(f"optimized_query_{func.__name__}"):
                return await db_optimizer.cached_query(session, func, key, ttl)
        
        return wrapper
    return decorator

def monitor_query_performance():
    """Decorator to monitor query performance"""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            start_time = datetime.utcnow()
            
            try:
                result = await func(*args, **kwargs)
                duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                
                # Log performance
                if duration > db_optimizer.slow_query_threshold:
                    logger.warning(f"Slow query in {func.__name__}: {duration:.2f}ms")
                
                return result
            except Exception as e:
                duration = (datetime.utcnow() - start_time).total_seconds() * 1000
                logger.error(f"Query error in {func.__name__}: {e} (took {duration:.2f}ms)")
                raise
        
        return wrapper
    return decorator
