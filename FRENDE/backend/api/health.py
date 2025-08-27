from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_async_session, check_database_health
from core.config import settings
from core.monitoring import SystemMonitor
from core.ai_health_check import ai_health_checker
from core.socketio_monitor import socketio_monitor
from core.external_service_monitor import external_service_monitor
import psutil
import time
from datetime import datetime

router = APIRouter(prefix="/health", tags=["health"])

@router.get("/")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }

@router.get("/detailed")
async def detailed_health_check(db: AsyncSession = Depends(get_async_session)):
    """Detailed health check including database and system metrics"""
    start_time = time.time()
    
    # System metrics
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    # Database health check
    db_health = await check_database_health()
    
    # AI services health check
    ai_health = await ai_health_checker.check_all_ai_services()
    
    # Socket.IO health check
    websocket_health = socketio_monitor.get_connection_health()
    
    # External services health check
    external_health = await external_service_monitor.check_all_services()
    
    # Calculate response time
    response_time = (time.time() - start_time) * 1000
    
    # Determine overall health status
    overall_status = "healthy"
    warnings = []
    
    # Check database
    if db_health["status"] != "healthy":
        overall_status = "degraded"
        warnings.append(f"Database: {db_health.get('error', 'Unknown error')}")
    
    # Check AI services
    if ai_health["overall_status"] != "healthy":
        overall_status = "degraded"
        warnings.append(f"AI Services: {ai_health['overall_status']}")
    
    # Check WebSocket
    if websocket_health["status"] != "healthy":
        overall_status = "degraded"
        warnings.extend(websocket_health["warnings"])
    
    # Check external services
    if external_health["overall_status"] != "healthy":
        overall_status = "degraded"
        warnings.append(f"External Services: {external_health['overall_status']}")
    
    # Check system resources
    if cpu_percent > 80:
        overall_status = "degraded"
        warnings.append(f"High CPU usage: {cpu_percent}%")
    
    if memory.percent > 80:
        overall_status = "degraded"
        warnings.append(f"High memory usage: {memory.percent}%")
    
    if disk.percent > 80:
        overall_status = "degraded"
        warnings.append(f"High disk usage: {disk.percent}%")
    
    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
        "response_time_ms": round(response_time, 2),
        "warnings": warnings,
        "system": {
            "cpu_percent": cpu_percent,
            "memory_percent": memory.percent,
            "memory_available_gb": round(memory.available / (1024**3), 2),
            "disk_percent": disk.percent,
            "disk_free_gb": round(disk.free / (1024**3), 2)
        },
        "database": db_health,
        "ai_services": ai_health,
        "websocket": websocket_health,
        "external_services": external_health,
        "security": {
            "ssl_enabled": settings.is_production(),
            "cors_enabled": bool(settings.CORS_ORIGINS),
            "rate_limiting_enabled": settings.RATE_LIMITING_ENABLED,
            "security_headers_enabled": settings.SECURITY_HEADERS_ENABLED
        }
    }

@router.get("/database")
async def database_health_check():
    """Database-specific health check"""
    db_health = await check_database_health()
    
    return {
        "status": db_health["status"],
        "timestamp": datetime.utcnow().isoformat(),
        "database": db_health
    }

@router.get("/ai")
async def ai_health_check():
    """AI services health check"""
    ai_health = await ai_health_checker.check_all_ai_services()
    
    return {
        "status": ai_health["overall_status"],
        "timestamp": datetime.utcnow().isoformat(),
        "ai_services": ai_health
    }

@router.get("/websocket")
async def websocket_health_check():
    """Socket.IO health check"""
    websocket_health = socketio_monitor.get_connection_health()
    
    return {
        "status": websocket_health["status"],
        "timestamp": datetime.utcnow().isoformat(),
        "websocket": websocket_health
    }

@router.get("/external")
async def external_services_health_check():
    """External services health check"""
    external_health = await external_service_monitor.check_all_services()
    
    return {
        "status": external_health["overall_status"],
        "timestamp": datetime.utcnow().isoformat(),
        "external_services": external_health
    }

@router.get("/ready")
async def readiness_check(db: AsyncSession = Depends(get_async_session)):
    """Readiness check for Kubernetes/container orchestration"""
    # Check all critical services
    db_health = await check_database_health()
    ai_health = await ai_health_checker.check_all_ai_services()
    websocket_health = socketio_monitor.get_connection_health()
    
    # Determine if application is ready
    is_ready = (
        db_health["status"] == "healthy" and
        ai_health["overall_status"] in ["healthy", "degraded"] and  # AI can be degraded but still functional
        websocket_health["status"] in ["healthy", "warning"] and  # WebSocket can have warnings but still work
        settings.ENVIRONMENT in ["development", "staging", "production"]
    )
    
    return {
        "ready": is_ready,
        "timestamp": datetime.utcnow().isoformat(),
        "checks": {
            "database": db_health["status"] == "healthy",
            "ai_services": ai_health["overall_status"] in ["healthy", "degraded"],
            "websocket": websocket_health["status"] in ["healthy", "warning"],
            "environment": settings.ENVIRONMENT in ["development", "staging", "production"]
        }
    }

@router.get("/live")
async def liveness_check():
    """Liveness check for Kubernetes/container orchestration"""
    return {
        "alive": True,
        "timestamp": datetime.utcnow().isoformat()
    }

@router.get("/aggregated")
async def aggregated_health_check():
    """Aggregated health check with scoring"""
    start_time = time.time()
    
    # Collect all health checks
    db_health = await check_database_health()
    ai_health = await ai_health_checker.check_all_ai_services()
    websocket_health = socketio_monitor.get_connection_health()
    external_health = await external_service_monitor.check_all_services()
    
    # Calculate health scores (0-100)
    scores = {}
    
    # Database score
    scores["database"] = 100 if db_health["status"] == "healthy" else 0
    
    # AI services score
    if ai_health["total_services"] > 0:
        scores["ai_services"] = (ai_health["healthy_services"] / ai_health["total_services"]) * 100
    else:
        scores["ai_services"] = 100  # No AI services to check
    
    # WebSocket score
    if websocket_health["status"] == "healthy":
        scores["websocket"] = 100
    elif websocket_health["status"] == "warning":
        scores["websocket"] = 75
    else:
        scores["websocket"] = 0
    
    # External services score
    if external_health["total_services"] > 0:
        scores["external_services"] = (external_health["healthy_services"] / external_health["total_services"]) * 100
    else:
        scores["external_services"] = 100  # No external services to check
    
    # Calculate overall score
    overall_score = sum(scores.values()) / len(scores)
    
    # Determine overall status
    if overall_score >= 90:
        overall_status = "healthy"
    elif overall_score >= 70:
        overall_status = "degraded"
    else:
        overall_status = "unhealthy"
    
    response_time = (time.time() - start_time) * 1000
    
    return {
        "status": overall_status,
        "score": round(overall_score, 2),
        "timestamp": datetime.utcnow().isoformat(),
        "response_time_ms": round(response_time, 2),
        "scores": scores,
        "components": {
            "database": db_health,
            "ai_services": ai_health,
            "websocket": websocket_health,
            "external_services": external_health
        }
    }
