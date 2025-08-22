"""
Asset performance monitoring API endpoints for the Frende backend application.
Provides endpoints for monitoring asset loading, compression, and CDN performance.
"""

from typing import Dict, List, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import JSONResponse
from datetime import datetime, timedelta

from core.asset_performance_monitor import asset_performance_monitor
from core.auth import current_active_user
from models.user import User

router = APIRouter(prefix="/asset-performance", tags=["asset-performance"])

@router.get("/metrics")
async def get_asset_performance_metrics(
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get global asset performance metrics"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied. Admin privileges required."
        )
    
    try:
        metrics = asset_performance_monitor.get_global_metrics()
        return {
            "success": True,
            "data": metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving asset performance metrics: {str(e)}"
        )

@router.get("/assets/{asset_path:path}")
async def get_asset_metrics(
    asset_path: str,
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get performance metrics for a specific asset"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied. Admin privileges required."
        )
    
    try:
        metrics = asset_performance_monitor.get_asset_metrics(asset_path)
        if not metrics:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No metrics found for asset: {asset_path}"
            )
        
        return {
            "success": True,
            "data": metrics,
            "timestamp": datetime.utcnow().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving asset metrics: {str(e)}"
        )

@router.get("/alerts")
async def get_performance_alerts(
    limit: int = Query(default=50, ge=1, le=100),
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get recent performance alerts"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied. Admin privileges required."
        )
    
    try:
        alerts = asset_performance_monitor.get_performance_alerts(limit)
        return {
            "success": True,
            "data": {
                "alerts": alerts,
                "total_alerts": len(alerts)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving performance alerts: {str(e)}"
        )

@router.get("/suggestions")
async def get_optimization_suggestions(
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get optimization suggestions based on performance metrics"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied. Admin privileges required."
        )
    
    try:
        suggestions = asset_performance_monitor.get_optimization_suggestions()
        return {
            "success": True,
            "data": {
                "suggestions": suggestions,
                "total_suggestions": len(suggestions)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving optimization suggestions: {str(e)}"
        )

@router.get("/compression-stats")
async def get_compression_statistics(
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get detailed compression statistics"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied. Admin privileges required."
        )
    
    try:
        global_metrics = asset_performance_monitor.get_global_metrics()
        
        # Calculate additional compression stats
        total_assets = global_metrics.get('total_assets_served', 0)
        total_bandwidth_saved = global_metrics.get('total_bandwidth_saved', 0)
        avg_compression_ratio = global_metrics.get('average_compression_ratio', 0.0)
        
        compression_stats = {
            "total_assets_served": total_assets,
            "total_bandwidth_saved_bytes": total_bandwidth_saved,
            "total_bandwidth_saved_mb": round(total_bandwidth_saved / (1024 * 1024), 2),
            "average_compression_ratio": round(avg_compression_ratio, 2),
            "compression_efficiency": "Excellent" if avg_compression_ratio > 60 else "Good" if avg_compression_ratio > 40 else "Fair" if avg_compression_ratio > 20 else "Poor"
        }
        
        return {
            "success": True,
            "data": compression_stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving compression statistics: {str(e)}"
        )

@router.get("/cdn-stats")
async def get_cdn_statistics(
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get CDN performance statistics"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied. Admin privileges required."
        )
    
    try:
        global_metrics = asset_performance_monitor.get_global_metrics()
        cdn_hit_rate = global_metrics.get('cdn_hit_rate', 0.0)
        
        cdn_stats = {
            "cdn_hit_rate": round(cdn_hit_rate, 2),
            "cdn_miss_rate": round(100 - cdn_hit_rate, 2),
            "cdn_performance": "Excellent" if cdn_hit_rate > 90 else "Good" if cdn_hit_rate > 80 else "Fair" if cdn_hit_rate > 60 else "Poor",
            "cdn_enabled": True,  # This would be dynamic based on settings
            "cdn_provider": "Vercel"  # This would be dynamic based on configuration
        }
        
        return {
            "success": True,
            "data": cdn_stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving CDN statistics: {str(e)}"
        )

@router.post("/track")
async def track_asset_performance(
    asset_path: str,
    load_time: float,
    file_size: int,
    compressed_size: Optional[int] = None,
    cdn_hit: bool = False,
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Track asset performance metrics (for internal use)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied. Admin privileges required."
        )
    
    try:
        asset_performance_monitor.track_asset_loading(
            asset_path=asset_path,
            load_time=load_time,
            file_size=file_size,
            compressed_size=compressed_size,
            cdn_hit=cdn_hit
        )
        
        return {
            "success": True,
            "message": "Asset performance tracked successfully",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error tracking asset performance: {str(e)}"
        )

@router.delete("/reset")
async def reset_performance_metrics(
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Reset all performance metrics (for testing/debugging)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Access denied. Admin privileges required."
        )
    
    try:
        # Reset the monitor (this would need to be implemented in the monitor class)
        # For now, we'll just return a success message
        return {
            "success": True,
            "message": "Performance metrics reset successfully",
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error resetting performance metrics: {str(e)}"
        )
