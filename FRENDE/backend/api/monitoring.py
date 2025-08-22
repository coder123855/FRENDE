from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, List
import logging
from datetime import datetime
from sqlalchemy import text

from core.database import get_async_session, get_database_stats
from core.database_optimization import db_optimizer
from core.auth import current_active_user
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

@router.get("/database/stats")
async def get_database_performance_stats(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get database performance statistics and optimization metrics"""
    try:
        # Check if user is admin
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin privileges required."
            )
        
        # Get database statistics
        db_stats = await get_database_stats()
        
        # Get optimization metrics
        optimization_metrics = db_optimizer.get_performance_metrics()
        
        # Get index usage statistics
        index_stats = await db_optimizer.get_index_usage_stats(session)
        
        return {
            "database_stats": db_stats,
            "optimization_metrics": optimization_metrics,
            "index_usage": index_stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting database stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving database statistics: {str(e)}"
        )

@router.get("/database/tables/{table_name}")
async def get_table_performance(
    table_name: str,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get performance statistics for a specific table"""
    try:
        # Check if user is admin
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin privileges required."
            )
        
        # Get table performance analysis
        table_stats = await db_optimizer.analyze_table_performance(session, table_name)
        
        return {
            "table_name": table_name,
            "performance_stats": table_stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting table performance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving table performance: {str(e)}"
        )

@router.post("/database/optimize/{table_name}")
async def optimize_table(
    table_name: str,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Perform optimization operations on a table"""
    try:
        # Check if user is admin
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin privileges required."
            )
        
        results = {}
        
        # Perform VACUUM ANALYZE
        vacuum_success = await db_optimizer.vacuum_analyze_table(session, table_name)
        results["vacuum_analyze"] = "success" if vacuum_success else "failed"
        
        # Perform REINDEX
        reindex_success = await db_optimizer.reindex_table(session, table_name)
        results["reindex"] = "success" if reindex_success else "failed"
        
        return {
            "table_name": table_name,
            "optimization_results": results,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error optimizing table: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error optimizing table: {str(e)}"
        )

@router.get("/database/slow-queries")
async def get_slow_queries(
    limit: int = 10,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get slow query analysis and recommendations"""
    try:
        # Check if user is admin
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin privileges required."
            )
        
        # Get slow queries from database
        result = await session.execute(text("""
            SELECT 
                query,
                calls,
                total_time,
                mean_time,
                rows,
                shared_blks_hit,
                shared_blks_read,
                shared_blks_written,
                shared_blks_dirtied,
                temp_blks_read,
                temp_blks_written,
                blk_read_time,
                blk_write_time
            FROM pg_stat_statements 
            WHERE mean_time > 100  -- Queries taking more than 100ms on average
            ORDER BY mean_time DESC 
            LIMIT :limit
        """))
        
        slow_queries = result.fetchall()
        
        # Analyze each slow query
        analyzed_queries = []
        for query in slow_queries:
            query_data = dict(query._mapping)
            
            # Get query execution plan
            try:
                plan = await db_optimizer.optimize_query_plan(session, query_data["query"])
                query_data["execution_plan"] = plan
            except Exception:
                query_data["execution_plan"] = {}
            
            # Generate optimization recommendations
            recommendations = []
            if query_data["mean_time"] > 1000:
                recommendations.append("Consider adding indexes for frequently accessed columns")
            if query_data["shared_blks_read"] > query_data["shared_blks_hit"]:
                recommendations.append("High disk I/O detected - consider query optimization")
            if query_data["temp_blks_read"] > 0:
                recommendations.append("Temporary files used - consider increasing work_mem")
            
            query_data["recommendations"] = recommendations
            analyzed_queries.append(query_data)
        
        return {
            "slow_queries": analyzed_queries,
            "total_analyzed": len(analyzed_queries),
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting slow queries: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving slow queries: {str(e)}"
        )

@router.get("/database/cache-stats")
async def get_cache_statistics(
    current_user: User = Depends(current_active_user)
):
    """Get query cache statistics and performance"""
    try:
        # Check if user is admin
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin privileges required."
            )
        
        # Get cache metrics
        cache_metrics = db_optimizer.get_performance_metrics()
        
        # Get cache details
        cache_details = {
            "cache_size": len(db_optimizer.query_cache),
            "cache_ttl": db_optimizer.cache_ttl,
            "max_cache_size": db_optimizer.max_cache_size,
            "cache_entries": list(db_optimizer.query_cache.keys())[:10]  # First 10 keys
        }
        
        return {
            "cache_metrics": cache_metrics,
            "cache_details": cache_details,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting cache stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving cache statistics: {str(e)}"
        )

@router.post("/database/cache/clear")
async def clear_query_cache(
    current_user: User = Depends(current_active_user)
):
    """Clear the query cache"""
    try:
        # Check if user is admin
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied. Admin privileges required."
            )
        
        # Clear cache
        cache_size = len(db_optimizer.query_cache)
        db_optimizer.query_cache.clear()
        
        return {
            "message": "Query cache cleared successfully",
            "cleared_entries": cache_size,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error clearing cache: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error clearing query cache: {str(e)}"
        )
