from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from core.config import settings
from core.config_utils import log_configuration_startup, check_environment_setup
from core.logging_config import setup_logging, get_logger
from core.middleware import create_middleware_stack
from core.error_handlers import register_exception_handlers
from core.monitoring import get_system_monitor
from core.security_utils import get_security_status, security_monitor
from api.auth import router as auth_router
from api.websocket import router as websocket_router
from api.users import router as users_router
from api.matches import router as matches_router
from api.tasks import router as tasks_router
from api.chat import router as chat_router
import logging
from datetime import datetime

# Setup logging first
setup_logging()
logger = get_logger("main")

# Log configuration at startup
log_configuration_startup()

# Validate configuration
setup_status = check_environment_setup()
if not setup_status["valid"]:
    logger.error("Configuration validation failed!")
    for error in setup_status["errors"]:
        logger.error(f"  - {error}")
    raise RuntimeError("Invalid configuration. Please fix the errors above.")

app = FastAPI(
    title="Frende API",
    description="AI-powered social media app for making friends",
    version="1.0.0",
    debug=settings.DEBUG
)

# Register exception handlers
register_exception_handlers(app)

# Apply complete middleware stack
app = create_middleware_stack(app)

# Add CORS middleware with enhanced configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.get_cors_methods(),
    allow_headers=settings.get_cors_headers(),
    max_age=settings.CORS_MAX_AGE,
)

# Include routers
app.include_router(auth_router)
app.include_router(websocket_router)
app.include_router(users_router)
app.include_router(matches_router)
app.include_router(tasks_router)
app.include_router(chat_router)

@app.get("/")
def read_root():
    return {"message": "Hello, Frende backend is running!"}

@app.get("/health")
def health_check():
    """Health check endpoint"""
    system_monitor = get_system_monitor()
    health_data = system_monitor.get_system_health()
    
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "timestamp": datetime.utcnow().isoformat(),
        "system_health": health_data
    }

@app.get("/health/database")
async def database_health_check():
    """Database health check endpoint"""
    system_monitor = get_system_monitor()
    return await system_monitor.get_database_health()

@app.get("/health/logs")
def logs_health_check():
    """Logging system health check endpoint"""
    system_monitor = get_system_monitor()
    return system_monitor.get_log_status()

@app.get("/health/performance")
def performance_health_check():
    """Performance monitoring health check endpoint"""
    system_monitor = get_system_monitor()
    return system_monitor.get_performance_metrics(hours=1)

@app.get("/config")
def get_config_info():
    """Get configuration information (for debugging)"""
    system_monitor = get_system_monitor()
    return {
        "environment": settings.ENVIRONMENT,
        "debug": settings.DEBUG,
        "features": system_monitor.get_feature_flags(),
        "configuration": system_monitor.get_configuration_summary()
    }

@app.get("/security")
def get_security_info():
    """Get security status and configuration"""
    return get_security_status()

@app.get("/security/test")
def test_security_configuration():
    """Test security configuration"""
    from core.security_utils import SecurityTester
    
    return {
        "security_tests": SecurityTester.run_security_tests(),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/websocket-status")
def websocket_status():
    """Get WebSocket connection status"""
    from core.websocket import manager
    from core.websocket_auth import websocket_auth
    
    return {
        "active_connections": len(manager.active_connections),
        "active_sessions": websocket_auth.get_active_sessions_count(),
        "rooms": len(manager.room_connections)
    }

@app.get("/api-status")
def api_status():
    """Get API status and available endpoints"""
    return {
        "status": "running",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "endpoints": {
            "auth": "/auth",
            "users": "/users",
            "matches": "/matches", 
            "tasks": "/tasks",
            "chat": "/chat",
            "websocket": "/ws",
            "security": "/security",
            "health": "/health",
            "performance": "/health/performance"
        },
        "documentation": "/docs"
    }

@app.get("/monitoring/metrics")
def get_performance_metrics():
    """Get detailed performance metrics"""
    system_monitor = get_system_monitor()
    return system_monitor.get_performance_metrics(hours=1)

@app.get("/monitoring/slow-operations")
def get_slow_operations():
    """Get slow operations list"""
    from core.performance_monitor import get_performance_monitor
    monitor = get_performance_monitor()
    return {
        "slow_operations": monitor.get_slow_operations(limit=20),
        "threshold_ms": settings.SLOW_QUERY_THRESHOLD_MS,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/monitoring/errors")
def get_error_summary():
    """Get error summary"""
    from core.performance_monitor import get_performance_monitor
    monitor = get_performance_monitor()
    return {
        "error_summary": monitor.get_error_summary(hours=1),
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/monitoring/system")
def get_system_metrics():
    """Get system metrics"""
    from core.performance_monitor import get_performance_monitor
    monitor = get_performance_monitor()
    return {
        "system_metrics": monitor.get_system_metrics(),
        "timestamp": datetime.utcnow().isoformat()
    } 