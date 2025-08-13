from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import uvicorn

from core.config import settings
from core.database import engine, Base
from core.logging_middleware import LoggingMiddleware
from core.security_middleware import SecurityHeadersMiddleware
from core.monitoring import get_system_monitor
from core.websocket import manager

# Import routers
from api.auth import router as auth_router
from api.users import router as users_router
from api.matches import router as matches_router
from api.tasks import router as tasks_router
from api.chat import router as chat_router
from api.match_requests import router as match_requests_router
from api.coin_rewards import router as coin_rewards_router
from api.task_submissions import router as task_submissions_router
from api.conversation_starter import router as conversation_starter_router
from api.automatic_greeting import router as automatic_greeting_router
from api.task_chat import router as task_chat_router
import logging
from datetime import datetime
import os

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Frende API server...")
    
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Start background tasks
    from services.background_tasks import background_processor
    background_processor.start_background_tasks()
    
    logger.info("Frende API server started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Frende API server...")
    
    # Stop background tasks
    background_processor.stop_background_tasks()
    
    logger.info("Frende API server shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="Frende API",
    description="API for the Frende friend matching application",
    version="1.0.0",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.get_cors_methods(),
    allow_headers=settings.get_cors_headers(),
)

app.add_middleware(TrustedHostMiddleware, allowed_hosts=["*"])  # Allow all hosts for development
app.add_middleware(LoggingMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# Include routers
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(matches_router)
app.include_router(tasks_router)
app.include_router(chat_router)
app.include_router(match_requests_router)
app.include_router(coin_rewards_router)
app.include_router(task_submissions_router)
app.include_router(conversation_starter_router)
app.include_router(automatic_greeting_router)
app.include_router(task_chat_router)

@app.on_event("startup")
async def startup_event():
    """Application startup event"""
    logger.info("Application startup complete")

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event"""
    logger.info("Application shutdown complete")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Frende API",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    monitor = get_system_monitor()
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "system_metrics": monitor.get_performance_metrics()
    }

@app.get("/metrics")
async def get_metrics():
    """Get application metrics"""
    monitor = get_system_monitor()
    return {
        "system_metrics": monitor.get_performance_metrics(),
        "timestamp": datetime.utcnow().isoformat()
    }

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="info"
    ) 