from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
import uvicorn
import os
from typing import Optional

# Import core modules
from core.config import configure_logging, settings
from core.database import get_async_session, engine, Base
from core.auth import current_active_user
from core.middleware import create_middleware_stack

# Import API routers
from api import auth, users, matches, tasks, chat, websocket
from api import conversation_starter, automatic_greeting, coin_rewards
from api import monitoring, health, rate_limiting, asset_performance, task_chat

# Import models for database initialization
from models.user import User
from models.match import Match
from models.task import Task
from models.chat import ChatMessage

# Configure logging
configure_logging()

# Create FastAPI app
app = FastAPI(
    title="Frende Backend API",
    description="AI-powered social media app for making new friends",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Security
security = HTTPBearer()

# Include API routers
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/users", tags=["Users"])
app.include_router(matches.router, prefix="/matches", tags=["Matches"])
app.include_router(tasks.router, prefix="/tasks", tags=["Tasks"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])
app.include_router(conversation_starter.router, prefix="/conversation-starter", tags=["Conversation Starter"])
app.include_router(automatic_greeting.router, prefix="/automatic-greeting", tags=["Automatic Greeting"])
app.include_router(coin_rewards.router, prefix="/coins", tags=["Coin Rewards"])
app.include_router(monitoring.router, prefix="/monitoring", tags=["Monitoring"])
app.include_router(health.router, prefix="/health", tags=["Health"])
app.include_router(rate_limiting.router, prefix="/rate-limiting", tags=["Rate Limiting"])
app.include_router(asset_performance.router, prefix="/assets", tags=["Asset Performance"])
app.include_router(task_chat.router, prefix="/task-chat", tags=["Task Chat"])

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Frende Backend API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/api/status")
async def api_status():
    """API status endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }

@app.get("/protected")
async def protected_route(current_user: User = Depends(current_active_user)):
    """Protected route example"""
    return {
        "message": "This is a protected route",
        "user_id": current_user.id,
        "username": current_user.username
    }

@app.on_event("startup")
async def startup_event():
    """Startup event handler"""
    # Create database tables
    async with engine.begin() as conn:
        # Import all models to ensure they're registered
        from models import user, match, task, chat
        
        # Create tables
        await conn.run_sync(Base.metadata.create_all)
    
    print("🚀 Frende Backend API started successfully!")
    print(f"📚 API Documentation: http://localhost:8000/docs")
    print(f"🔧 Environment: {settings.ENVIRONMENT}")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler"""
    print("🛑 Frende Backend API shutting down...")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Setup custom middleware stack last
app = create_middleware_stack(app)

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    ) 