"""
Monitoring Dashboard API
Provides comprehensive monitoring data and analytics for the application.
"""

from fastapi import APIRouter, Depends, Query
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from core.config import settings
from core.monitoring import SystemMonitor
from core.performance_monitor import get_performance_monitor
from core.ai_health_check import ai_health_checker
from core.websocket_monitor import websocket_monitor
from core.external_service_monitor import external_service_monitor
from core.database import get_async_session
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/monitoring", tags=["monitoring"])

@router.get("/dashboard")
async def get_monitoring_dashboard(
    hours: int = Query(default=24, description="Hours of data to include")
):
    """Get comprehensive monitoring dashboard data"""
    
    # System monitor
    system_monitor = SystemMonitor()
    system_health = system_monitor.get_system_health()
    
    # Performance monitor
    performance_monitor = get_performance_monitor()
    performance_metrics = performance_monitor.get_performance_summary(hours=hours)
    
    # AI services metrics
    ai_performance = ai_health_checker.get_ai_performance_metrics(hours=hours)
    
    # WebSocket metrics
    websocket_stats = websocket_monitor.get_connection_stats()
    websocket_health = websocket_monitor.get_connection_health()
    
    # External services metrics
    external_performance = external_service_monitor.get_all_services_performance(hours=hours)
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.ENVIRONMENT,
        "system": {
            "health": system_health,
            "performance": performance_metrics
        },
        "ai_services": {
            "performance": ai_performance,
            "health": await ai_health_checker.check_all_ai_services()
        },
        "websocket": {
            "stats": websocket_stats,
            "health": websocket_health
        },
        "external_services": {
            "performance": external_performance,
            "health": await external_service_monitor.check_all_services()
        },
        "monitoring_config": {
            "performance_monitoring_enabled": settings.PERFORMANCE_MONITORING_ENABLED,
            "security_monitoring_enabled": settings.SECURITY_MONITORING_ENABLED,
            "monitoring_api_key_configured": bool(settings.MONITORING_API_KEY)
        }
    }

@router.get("/performance")
async def get_performance_metrics(
    hours: int = Query(default=24, description="Hours of data to include")
):
    """Get detailed performance metrics"""
    performance_monitor = get_performance_monitor()
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "summary": performance_monitor.get_performance_summary(hours=hours),
        "system_metrics": performance_monitor.get_system_metrics(),
        "slow_operations": performance_monitor.get_slow_operations(hours=hours),
        "error_metrics": performance_monitor.get_error_metrics(hours=hours)
    }

@router.get("/ai-services")
async def get_ai_services_metrics(
    hours: int = Query(default=24, description="Hours of data to include")
):
    """Get AI services monitoring data"""
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "performance": ai_health_checker.get_ai_performance_metrics(hours=hours),
        "health": await ai_health_checker.check_all_ai_services(),
        "history": ai_health_checker.get_ai_health_history(hours=hours)
    }

@router.get("/websocket")
async def get_websocket_metrics(
    hours: int = Query(default=24, description="Hours of data to include")
):
    """Get WebSocket monitoring data"""
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "stats": websocket_monitor.get_connection_stats(),
        "health": websocket_monitor.get_connection_health(),
        "history": websocket_monitor.get_connection_history(hours=hours)
    }

@router.get("/external-services")
async def get_external_services_metrics(
    hours: int = Query(default=24, description="Hours of data to include")
):
    """Get external services monitoring data"""
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "performance": external_service_monitor.get_all_services_performance(hours=hours),
        "health": await external_service_monitor.check_all_services()
    }

@router.get("/trends")
async def get_monitoring_trends(
    hours: int = Query(default=24, description="Hours of data to include"),
    interval: int = Query(default=1, description="Data interval in hours")
):
    """Get monitoring trends and analytics"""
    
    # Performance trends
    performance_monitor = get_performance_monitor()
    performance_trends = performance_monitor.get_performance_summary(hours=hours)
    
    # AI service trends
    ai_trends = ai_health_checker.get_ai_performance_metrics(hours=hours)
    
    # WebSocket trends
    websocket_trends = websocket_monitor.get_connection_stats()
    
    # External services trends
    external_trends = external_service_monitor.get_all_services_performance(hours=hours)
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "period": f"Last {hours} hours",
        "interval": f"{interval} hour intervals",
        "trends": {
            "performance": performance_trends,
            "ai_services": ai_trends,
            "websocket": websocket_trends,
            "external_services": external_trends
        },
        "analysis": {
            "overall_health": "healthy",  # This would be calculated based on trends
            "performance_trend": "stable",  # This would be calculated based on trends
            "recommendations": []  # This would contain actionable recommendations
        }
    }

@router.get("/alerts")
async def get_monitoring_alerts():
    """Get current monitoring alerts and warnings"""
    alerts = []
    
    # System health alerts
    system_monitor = SystemMonitor()
    system_health = system_monitor.get_system_health()
    
    if system_health["status"] != "healthy":
        alerts.append({
            "type": "system",
            "severity": "warning" if system_health["status"] == "warning" else "critical",
            "message": f"System health: {system_health['status']}",
            "details": system_health.get("warnings", []),
            "timestamp": datetime.utcnow().isoformat()
        })
    
    # AI services alerts
    ai_health = await ai_health_checker.check_all_ai_services()
    if ai_health["overall_status"] != "healthy":
        alerts.append({
            "type": "ai_services",
            "severity": "warning" if ai_health["overall_status"] == "degraded" else "critical",
            "message": f"AI services: {ai_health['overall_status']}",
            "details": [f"{service}: {data['status']}" for service, data in ai_health["services"].items()],
            "timestamp": datetime.utcnow().isoformat()
        })
    
    # WebSocket alerts
    websocket_health = websocket_monitor.get_connection_health()
    if websocket_health["status"] != "healthy":
        alerts.append({
            "type": "websocket",
            "severity": "warning" if websocket_health["status"] == "warning" else "critical",
            "message": f"WebSocket: {websocket_health['status']}",
            "details": websocket_health.get("warnings", []),
            "timestamp": datetime.utcnow().isoformat()
        })
    
    # External services alerts
    external_health = await external_service_monitor.check_all_services()
    if external_health["overall_status"] != "healthy":
        alerts.append({
            "type": "external_services",
            "severity": "warning" if external_health["overall_status"] == "degraded" else "critical",
            "message": f"External services: {external_health['overall_status']}",
            "details": [f"{service}: {data['status']}" for service, data in external_health["services"].items()],
            "timestamp": datetime.utcnow().isoformat()
        })
    
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "total_alerts": len(alerts),
        "critical_alerts": len([a for a in alerts if a["severity"] == "critical"]),
        "warning_alerts": len([a for a in alerts if a["severity"] == "warning"]),
        "alerts": alerts
    }

@router.get("/status")
async def get_monitoring_status():
    """Get monitoring system status"""
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "monitoring_enabled": True,
        "components": {
            "performance_monitor": settings.PERFORMANCE_MONITORING_ENABLED,
            "ai_health_checker": True,
            "websocket_monitor": True,
            "external_service_monitor": True,
            "system_monitor": True
        },
        "configuration": {
            "environment": settings.ENVIRONMENT,
            "performance_monitoring_enabled": settings.PERFORMANCE_MONITORING_ENABLED,
            "security_monitoring_enabled": settings.SECURITY_MONITORING_ENABLED,
            "monitoring_api_key_configured": bool(settings.MONITORING_API_KEY)
        }
    }
