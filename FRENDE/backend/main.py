from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import logging
from contextlib import asynccontextmanager

from core.config import settings
from core.logging_config import configure_logging
from core.middleware import setup_middleware
from core.websocket import setup_websocket
from core.database import engine, Base

# Import API routers
from api import auth, users, matches, tasks, chat, queue, conversation_starter, match_requests, coin_rewards, automatic_greeting, task_chat, task_submissions
from api.health import router as health_router
from api.metrics import router as metrics_router
from api.monitoring_dashboard import router as monitoring_router

# Import monitoring components
from core.ai_health_check import ai_health_checker
from core.websocket_monitor import websocket_monitor
from core.external_service_monitor import external_service_monitor
from api.metrics import MetricsMiddleware

# Configure logging
configure_logging()
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    # Startup
    logger.info("Starting Frende Backend Application...")
    
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Initialize monitoring components
    if settings.PERFORMANCE_MONITORING_ENABLED:
        logger.info("Performance monitoring initialized")
    
    # Start background monitoring tasks
    import asyncio
    asyncio.create_task(ai_health_checker.run_continuous_monitoring())
    asyncio.create_task(websocket_monitor.run_continuous_monitoring())
    asyncio.create_task(external_service_monitor.run_continuous_monitoring())
    
    logger.info("Frende Backend Application started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Frende Backend Application...")

# Create FastAPI app
app = FastAPI(
    title="Frende Backend API",
    description="AI-powered social media app for making new friends",
    version="1.0.0",
    lifespan=lifespan
)

# Setup middleware
setup_middleware(app)

# Add metrics middleware
app.add_middleware(MetricsMiddleware)

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.get_cors_methods(),
    allow_headers=settings.get_cors_headers(),
)

# Setup WebSocket
setup_websocket(app)

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include API routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(matches.router, prefix="/api/v1")
app.include_router(tasks.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")
app.include_router(queue.router, prefix="/api/v1")
app.include_router(conversation_starter.router, prefix="/api/v1")
app.include_router(match_requests.router, prefix="/api/v1")
app.include_router(coin_rewards.router, prefix="/api/v1")
app.include_router(automatic_greeting.router, prefix="/api/v1")
app.include_router(task_chat.router, prefix="/api/v1")
app.include_router(task_submissions.router, prefix="/api/v1")

# Include monitoring routers
app.include_router(health_router, prefix="/api/v1")
app.include_router(metrics_router, prefix="/api/v1")
app.include_router(monitoring_router, prefix="/api/v1")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Frende Backend API",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "health": "/api/v1/health",
        "metrics": "/api/v1/metrics"
    }

@app.get("/api/v1")
async def api_root():
    """API root endpoint"""
    return {
        "message": "Frende Backend API v1.0.0",
        "endpoints": {
            "auth": "/api/v1/auth",
            "users": "/api/v1/users",
            "matches": "/api/v1/matches",
            "tasks": "/api/v1/tasks",
            "chat": "/api/v1/chat",
            "health": "/api/v1/health",
            "metrics": "/api/v1/metrics",
            "monitoring": "/api/v1/monitoring"
        },
        "documentation": "/docs"
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    ) 