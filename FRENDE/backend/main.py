from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from core.config import settings
from api.auth import router as auth_router
from api.websocket import router as websocket_router
from api.users import router as users_router
from api.matches import router as matches_router
from api.tasks import router as tasks_router
from api.chat import router as chat_router
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Frende API",
    description="AI-powered social media app for making friends",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Global exception handler for unhandled errors"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "detail": str(exc) if settings.DEBUG else "Internal server error"
        }
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handler for HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": "HTTP error",
            "message": exc.detail,
            "status_code": exc.status_code
        }
    )

@app.exception_handler(ValueError)
async def value_error_handler(request: Request, exc: ValueError):
    """Handler for ValueError exceptions"""
    return JSONResponse(
        status_code=400,
        content={
            "error": "Validation error",
            "message": str(exc),
            "status_code": 400
        }
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
    return {
        "status": "healthy",
        "version": "1.0.0",
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
        "endpoints": {
            "auth": "/auth",
            "users": "/users",
            "matches": "/matches", 
            "tasks": "/tasks",
            "chat": "/chat",
            "websocket": "/ws"
        },
        "documentation": "/docs"
    } 