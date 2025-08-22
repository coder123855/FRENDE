"""
Monitoring Dashboard API
Provides real-time monitoring and analytics endpoints for system health and performance.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import logging

from core.websocket_monitor import websocket_monitor
from core.performance_monitor import get_performance_monitor
from core.monitoring import SystemMonitor
from core.database import check_database_health
from core.auth import current_active_user
from models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

@router.get("/websocket/health")
async def get_websocket_health(
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get WebSocket connection health status"""
    try:
        health = websocket_monitor.get_connection_health()
        return {
            "status": "success",
            "data": health,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting WebSocket health: {e}")
        raise HTTPException(status_code=500, detail="Failed to get WebSocket health")

@router.get("/websocket/stats")
async def get_websocket_stats(
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get WebSocket connection statistics"""
    try:
        stats = websocket_monitor.get_connection_stats()
        return {
            "status": "success",
            "data": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting WebSocket stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get WebSocket stats")

@router.get("/websocket/analytics")
async def get_websocket_analytics(
    hours: int = Query(default=24, ge=1, le=168, description="Hours to analyze"),
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get WebSocket performance analytics"""
    try:
        analytics = websocket_monitor.get_performance_analytics(hours=hours)
        return {
            "status": "success",
            "data": analytics,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting WebSocket analytics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get WebSocket analytics")

@router.get("/websocket/quality-distribution")
async def get_websocket_quality_distribution(
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get distribution of WebSocket connection quality scores"""
    try:
        distribution = websocket_monitor.get_quality_distribution()
        return {
            "status": "success",
            "data": distribution,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting quality distribution: {e}")
        raise HTTPException(status_code=500, detail="Failed to get quality distribution")

@router.get("/websocket/connections")
async def get_websocket_connections(
    limit: int = Query(default=100, ge=1, le=1000, description="Number of connections to return"),
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get list of active WebSocket connections"""
    try:
        connections = []
        for conn_id, conn in list(websocket_monitor.connections.items())[:limit]:
            connections.append({
                "connection_id": conn_id,
                "user_id": conn.user_id,
                "connected_at": conn.connected_at.isoformat(),
                "last_activity": conn.last_activity.isoformat(),
                "message_count": conn.message_count,
                "error_count": conn.error_count,
                "quality_score": conn.get_quality_score(),
                "room_ids": list(conn.room_ids),
                "connection_type": conn.connection_type,
                "is_heartbeat_healthy": conn.is_heartbeat_healthy()
            })
        
        return {
            "status": "success",
            "data": {
                "connections": connections,
                "total_count": len(websocket_monitor.connections),
                "returned_count": len(connections)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting WebSocket connections: {e}")
        raise HTTPException(status_code=500, detail="Failed to get WebSocket connections")

@router.get("/websocket/connection/{connection_id}")
async def get_websocket_connection_details(
    connection_id: str,
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get detailed information about a specific WebSocket connection"""
    try:
        connection = websocket_monitor.get_connection(connection_id)
        if not connection:
            raise HTTPException(status_code=404, detail="Connection not found")
        
        return {
            "status": "success",
            "data": {
                "connection_id": connection.connection_id,
                "user_id": connection.user_id,
                "connected_at": connection.connected_at.isoformat(),
                "last_activity": connection.last_activity.isoformat(),
                "last_heartbeat": connection.last_heartbeat.isoformat(),
                "message_count": connection.message_count,
                "error_count": connection.error_count,
                "connection_type": connection.connection_type,
                "room_ids": list(connection.room_ids),
                "is_active": connection.is_active,
                "is_heartbeat_healthy": connection.is_heartbeat_healthy(),
                "connection_duration": connection.get_connection_duration(),
                "idle_time": connection.get_idle_time(),
                "quality_metrics": connection.get_quality_metrics(),
                "metadata": connection.metadata
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting connection details: {e}")
        raise HTTPException(status_code=500, detail="Failed to get connection details")

@router.get("/websocket/rooms")
async def get_websocket_rooms(
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get list of active WebSocket rooms and their connection counts"""
    try:
        rooms = {}
        for conn in websocket_monitor.connections.values():
            if conn.is_active:
                for room_id in conn.room_ids:
                    if room_id not in rooms:
                        rooms[room_id] = {
                            "room_id": room_id,
                            "connection_count": 0,
                            "user_ids": set()
                        }
                    rooms[room_id]["connection_count"] += 1
                    if conn.user_id:
                        rooms[room_id]["user_ids"].add(conn.user_id)
        
        # Convert sets to lists for JSON serialization
        for room in rooms.values():
            room["user_ids"] = list(room["user_ids"])
        
        return {
            "status": "success",
            "data": {
                "rooms": list(rooms.values()),
                "total_rooms": len(rooms)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting WebSocket rooms: {e}")
        raise HTTPException(status_code=500, detail="Failed to get WebSocket rooms")

@router.get("/websocket/room/{room_id}")
async def get_websocket_room_details(
    room_id: str,
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get detailed information about a specific WebSocket room"""
    try:
        room_connections = websocket_monitor.get_connections_by_room(room_id)
        
        if not room_connections:
            raise HTTPException(status_code=404, detail="Room not found")
        
        connections_info = []
        total_messages = 0
        total_errors = 0
        avg_quality_score = 0
        
        for conn in room_connections:
            connections_info.append({
                "connection_id": conn.connection_id,
                "user_id": conn.user_id,
                "connected_at": conn.connected_at.isoformat(),
                "message_count": conn.message_count,
                "error_count": conn.error_count,
                "quality_score": conn.get_quality_score(),
                "is_heartbeat_healthy": conn.is_heartbeat_healthy()
            })
            total_messages += conn.message_count
            total_errors += conn.error_count
            avg_quality_score += conn.get_quality_score()
        
        if room_connections:
            avg_quality_score /= len(room_connections)
        
        return {
            "status": "success",
            "data": {
                "room_id": room_id,
                "connection_count": len(room_connections),
                "total_messages": total_messages,
                "total_errors": total_errors,
                "average_quality_score": avg_quality_score,
                "connections": connections_info
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting room details: {e}")
        raise HTTPException(status_code=500, detail="Failed to get room details")

@router.get("/websocket/history")
async def get_websocket_history(
    hours: int = Query(default=24, ge=1, le=168, description="Hours of history to retrieve"),
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get WebSocket connection history"""
    try:
        history = websocket_monitor.get_connection_history(hours=hours)
        return {
            "status": "success",
            "data": {
                "history": history,
                "total_entries": len(history),
                "period_hours": hours
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting WebSocket history: {e}")
        raise HTTPException(status_code=500, detail="Failed to get WebSocket history")

@router.post("/websocket/cleanup")
async def trigger_websocket_cleanup(
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Trigger manual WebSocket connection cleanup"""
    try:
        # Cleanup inactive connections
        removed_inactive = websocket_monitor.cleanup_inactive_connections()
        
        # Cleanup unhealthy connections
        removed_unhealthy = websocket_monitor.cleanup_unhealthy_connections()
        
        return {
            "status": "success",
            "data": {
                "removed_inactive": removed_inactive,
                "removed_unhealthy": removed_unhealthy,
                "total_removed": removed_inactive + removed_unhealthy,
                "remaining_connections": len(websocket_monitor.connections)
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error during WebSocket cleanup: {e}")
        raise HTTPException(status_code=500, detail="Failed to perform cleanup")

@router.get("/system/overview")
async def get_system_overview(
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get comprehensive system overview including WebSocket, database, and performance metrics"""
    try:
        # WebSocket metrics
        websocket_health = websocket_monitor.get_connection_health()
        websocket_stats = websocket_monitor.get_connection_stats()
        
        # Database health
        db_health = await check_database_health()
        
        # Performance metrics
        performance_monitor = get_performance_monitor()
        perf_summary = performance_monitor.get_performance_summary(hours=1)
        
        # System monitoring
        system_monitor = SystemMonitor()
        system_metrics = system_monitor.get_system_metrics()
        
        return {
            "status": "success",
            "data": {
                "websocket": {
                    "health": websocket_health,
                    "stats": websocket_stats
                },
                "database": db_health,
                "performance": perf_summary,
                "system": system_metrics
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting system overview: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system overview")

@router.get("/alerts")
async def get_system_alerts(
    current_user: User = Depends(current_active_user)
) -> Dict[str, Any]:
    """Get current system alerts and warnings"""
    try:
        alerts = []
        
        # WebSocket alerts
        websocket_health = websocket_monitor.get_connection_health()
        if websocket_health["status"] == "critical":
            alerts.append({
                "type": "websocket_critical",
                "severity": "critical",
                "message": f"WebSocket health critical: {', '.join(websocket_health['critical_issues'])}",
                "timestamp": datetime.utcnow().isoformat()
            })
        elif websocket_health["status"] == "warning":
            alerts.append({
                "type": "websocket_warning",
                "severity": "warning",
                "message": f"WebSocket health warning: {', '.join(websocket_health['warnings'])}",
                "timestamp": datetime.utcnow().isoformat()
            })
        
        # Database alerts
        db_health = await check_database_health()
        if not db_health.get("healthy", True):
            alerts.append({
                "type": "database_error",
                "severity": "critical",
                "message": f"Database health issue: {db_health.get('error', 'Unknown error')}",
                "timestamp": datetime.utcnow().isoformat()
            })
        
        # Performance alerts
        performance_monitor = get_performance_monitor()
        perf_summary = performance_monitor.get_performance_summary(hours=1)
        if perf_summary.get("error_rate", 0) > 5:
            alerts.append({
                "type": "performance_error",
                "severity": "warning",
                "message": f"High error rate: {perf_summary['error_rate']:.1f}%",
                "timestamp": datetime.utcnow().isoformat()
            })
        
        return {
            "status": "success",
            "data": {
                "alerts": alerts,
                "total_alerts": len(alerts),
                "critical_count": len([a for a in alerts if a["severity"] == "critical"]),
                "warning_count": len([a for a in alerts if a["severity"] == "warning"])
            },
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting system alerts: {e}")
        raise HTTPException(status_code=500, detail="Failed to get system alerts")
