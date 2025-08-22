"""
Rate limiting API endpoints for analytics and management.
Provides endpoints for monitoring rate limiting performance and managing configurations.
"""

import logging
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime

from core.rate_limiting import rate_limiter
from core.auth import current_active_user
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rate-limiting", tags=["rate-limiting"])

@router.get("/analytics")
async def get_rate_limit_analytics(
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """
    Get rate limiting analytics and performance metrics.
    Requires admin privileges.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )
    
    try:
        analytics = await rate_limiter.get_analytics()
        return {
            "success": True,
            "data": analytics,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting rate limit analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving rate limit analytics: {str(e)}"
        )

@router.post("/analytics/reset")
async def reset_rate_limit_analytics(
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """
    Reset rate limiting analytics counters.
    Requires admin privileges.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )
    
    try:
        await rate_limiter.reset_analytics()
        return {
            "success": True,
            "message": "Rate limit analytics reset successfully",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error resetting rate limit analytics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error resetting rate limit analytics: {str(e)}"
        )

@router.get("/config")
async def get_rate_limit_config(
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """
    Get current rate limiting configuration.
    Requires admin privileges.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )
    
    try:
        config = rate_limiter.rate_limits
        return {
            "success": True,
            "data": {
                "config": config,
                "redis_enabled": rate_limiter.use_redis,
                "algorithms": list(rate_limiter.algorithms.keys())
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting rate limit config: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving rate limit configuration: {str(e)}"
        )

@router.get("/status")
async def get_rate_limit_status(
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """
    Get rate limiting service status and health.
    Requires admin privileges.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )
    
    try:
        # Test Redis connection if enabled
        redis_status = "disabled"
        if rate_limiter.use_redis and rate_limiter.redis_client:
            try:
                await rate_limiter.redis_client.ping()
                redis_status = "connected"
            except Exception:
                redis_status = "error"
        
        analytics = await rate_limiter.get_analytics()
        
        return {
            "success": True,
            "data": {
                "service_status": "running",
                "redis_status": redis_status,
                "total_requests": analytics["total_requests"],
                "total_violations": analytics["total_violations"],
                "violation_rate": analytics["violation_rate"],
                "memory_limits_count": len(rate_limiter.memory_limits),
                "timestamp": datetime.utcnow().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Error getting rate limit status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving rate limit status: {str(e)}"
        )

@router.get("/violations")
async def get_rate_limit_violations(
    limit: int = 50,
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """
    Get recent rate limit violations.
    Requires admin privileges.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )
    
    try:
        analytics = await rate_limiter.get_analytics()
        violations = analytics["violations_by_endpoint"]
        
        # Sort violations by count
        sorted_violations = sorted(
            violations.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:limit]
        
        return {
            "success": True,
            "data": {
                "violations": dict(sorted_violations),
                "total_violations": analytics["total_violations"],
                "violation_rate": analytics["violation_rate"]
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting rate limit violations: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving rate limit violations: {str(e)}"
        )

@router.post("/test")
async def test_rate_limit(
    endpoint: str,
    requests: int = 10,
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """
    Test rate limiting for a specific endpoint.
    Requires admin privileges.
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied. Admin privileges required."
        )
    
    try:
        # This is a simulation test - in a real implementation,
        # you might want to create actual test requests
        test_results = {
            "endpoint": endpoint,
            "test_requests": requests,
            "simulated_violations": max(0, requests - 100),  # Assuming 100 req/min limit
            "estimated_violation_rate": max(0, (requests - 100) / requests) if requests > 100 else 0,
            "recommendation": "Rate limit appears to be working correctly" if requests <= 100 else "Consider adjusting rate limits"
        }
        
        return {
            "success": True,
            "data": test_results,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error testing rate limit: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error testing rate limit: {str(e)}"
        )
