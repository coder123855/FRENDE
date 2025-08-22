from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
import os
import ssl
from core.config import settings
from core.database_optimization import db_optimizer
from sqlalchemy import text

# Database URL - use environment variable or default to SQLite for development
DATABASE_URL = settings.DATABASE_URL

# Create async engine
if DATABASE_URL.startswith("sqlite"):
    # SQLite configuration for development
    async_database_url = DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")
    engine = create_async_engine(
        async_database_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=True  # Enable SQL logging for development
    )
else:
    # PostgreSQL configuration for production with SSL/TLS
    async_database_url = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    
    # SSL configuration for production
    ssl_context = None
    if settings.is_production():
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = True
        ssl_context.verify_mode = ssl.CERT_REQUIRED
    
    engine = create_async_engine(
        async_database_url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        pool_timeout=settings.DATABASE_POOL_TIMEOUT,
        echo=False,  # Disable SQL logging for production
        connect_args={
            "ssl": ssl_context,
            "server_settings": {
                "application_name": "frende_backend",
                "jit": "off",  # Disable JIT for better performance
                "random_page_cost": "1.1",  # Optimize for SSD
                "effective_cache_size": "256MB",  # Optimize cache size
                "work_mem": "4MB",  # Optimize work memory
                "maintenance_work_mem": "64MB",  # Optimize maintenance memory
                "shared_preload_libraries": "pg_stat_statements",  # Enable query statistics
                "pg_stat_statements.track": "all",  # Track all queries
                "pg_stat_statements.max": "10000",  # Maximum tracked queries
                "log_statement": "none",  # Disable statement logging in production
                "log_min_duration_statement": "1000",  # Log queries taking more than 1 second
                "log_checkpoints": "on",  # Log checkpoints
                "log_connections": "off",  # Disable connection logging
                "log_disconnections": "off",  # Disable disconnection logging
                "log_lock_waits": "on",  # Log lock waits
                "log_temp_files": "0",  # Log all temporary files
                "log_autovacuum_min_duration": "0",  # Log all autovacuum operations
                "autovacuum": "on",  # Enable autovacuum
                "autovacuum_vacuum_scale_factor": "0.1",  # Vacuum when 10% of rows are dead
                "autovacuum_analyze_scale_factor": "0.05",  # Analyze when 5% of rows are dead
                "autovacuum_vacuum_cost_limit": "2000",  # Autovacuum cost limit
                "autovacuum_vacuum_cost_delay": "20ms",  # Autovacuum cost delay
                "checkpoint_completion_target": "0.9",  # Spread checkpoint writes
                "wal_buffers": "16MB",  # WAL buffers size
                "default_statistics_target": "100",  # Default statistics target
                "track_activities": "on",  # Track activities
                "track_counts": "on",  # Track counts
                "track_io_timing": "on",  # Track I/O timing
                "track_functions": "all",  # Track all functions
                "track_activity_query_size": "1024",  # Track activity query size
            } if settings.is_production() else {}
        }
    )
    
    # Apply database optimization configuration
    db_optimizer.configure_engine_optimization(engine)

# Create session factory
async_session = sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
    autocommit=False
)

# Base class for models
Base = declarative_base()

async def get_async_session() -> AsyncSession:
    """Get async database session with optimization"""
    async with async_session() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Database initialization
async def init_db():
    """Initialize database with optimization"""
    async with engine.begin() as conn:
        # Create all tables
        await conn.run_sync(Base.metadata.create_all)
        
        # Run optimization queries
        if not DATABASE_URL.startswith("sqlite"):
            # PostgreSQL-specific optimizations
            await conn.execute(text("""
                -- Update statistics for all tables
                ANALYZE;
                
                -- Set up monitoring
                CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
                
                -- Create optimized indexes for common queries
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_active_created 
                ON users (is_active, created_at) WHERE is_active = true;
                
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_matches_status_created 
                ON matches (status, created_at) WHERE status IN ('active', 'pending');
                
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_match_completed 
                ON tasks (match_id, is_completed) WHERE is_completed = false;
                
                CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_match_created 
                ON chat_messages (match_id, created_at DESC);
            """))
        
        print("Database initialized with optimization")

# Database cleanup
async def close_db():
    """Close database connections"""
    await engine.dispose()
    print("Database connections closed")

# Performance monitoring
async def get_database_stats():
    """Get database performance statistics"""
    if DATABASE_URL.startswith("sqlite"):
        return {"database_type": "sqlite", "optimization": "limited"}
    
    async with async_session() as session:
        # Get database statistics
        result = await session.execute(text("""
            SELECT 
                schemaname,
                tablename,
                attname,
                n_distinct,
                correlation
            FROM pg_stats 
            WHERE schemaname = 'public'
            ORDER BY tablename, attname
        """))
        
        stats = result.fetchall()
        
        # Get index usage statistics
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
        
        index_stats = result.fetchall()
        
        # Get query statistics
        result = await session.execute(text("""
            SELECT 
                query,
                calls,
                total_time,
                mean_time,
                rows
            FROM pg_stat_statements 
            ORDER BY total_time DESC 
            LIMIT 10
        """))
        
        query_stats = result.fetchall()
        
        return {
            "database_type": "postgresql",
            "table_statistics": [dict(row._mapping) for row in stats],
            "index_usage": [dict(row._mapping) for row in index_stats],
            "slow_queries": [dict(row._mapping) for row in query_stats],
            "optimization_metrics": db_optimizer.get_performance_metrics()
        }

async def check_database_health():
    """Check database health and connectivity"""
    try:
        async with async_session() as session:
            # Simple query to test connectivity
            result = await session.execute(text("SELECT 1"))
            result.fetchone()
            
            return {
                "status": "healthy",
                "database_type": "sqlite" if DATABASE_URL.startswith("sqlite") else "postgresql",
                "connection": "active",
                "response_time_ms": 0  # Could be measured if needed
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "database_type": "sqlite" if DATABASE_URL.startswith("sqlite") else "postgresql",
            "connection": "failed"
        } 