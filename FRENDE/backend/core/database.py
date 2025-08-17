from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
import os
import ssl
from core.config import settings

# Database URL - use environment variable or default to SQLite for development
DATABASE_URL = settings.DATABASE_URL

# Create async engine
if DATABASE_URL.startswith("sqlite"):
    # SQLite configuration for development
    async_database_url = DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")
    engine = create_async_engine(
        async_database_url,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=True  # Enable SQL logging for development
    )
else:
    # PostgreSQL configuration for production with SSL/TLS
    async_database_url = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    
    # SSL configuration for production
    ssl_context = None
    if settings.is_production():
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = True
        ssl_context.verify_mode = ssl.CERT_REQUIRED
    
    engine = create_async_engine(
        async_database_url,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        pool_timeout=settings.DATABASE_POOL_TIMEOUT,
        echo=False,  # Disable SQL logging for production
        connect_args={
            "ssl": ssl_context,
            "server_settings": {
                "application_name": "frende_backend",
                "timezone": "UTC"
            }
        } if ssl_context else {
            "server_settings": {
                "application_name": "frende_backend",
                "timezone": "UTC"
            }
        }
    )

# Create async SessionLocal class
AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

# Create Base class
Base = declarative_base()

# Dependency to get async database session
async def get_async_session() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session

# Session context manager for proper transaction handling
async def get_session_context():
    """Context manager for database sessions with proper transaction handling"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Legacy sync session for compatibility
def get_db():
    from sqlalchemy.orm import Session
    db = Session(engine)
    try:
        yield db
    finally:
        db.close()

# Database health check function
async def check_database_health() -> dict:
    """Check database connectivity and health"""
    try:
        async with AsyncSessionLocal() as session:
            # Test basic connectivity
            result = await session.execute("SELECT 1")
            await result.fetchone()
            
            # Test connection pool status
            pool = engine.pool
            pool_status = {
                "size": pool.size(),
                "checked_in": pool.checkedin(),
                "checked_out": pool.checkedout(),
                "overflow": pool.overflow(),
                "invalid": pool.invalid()
            }
            
            return {
                "status": "healthy",
                "pool_status": pool_status,
                "ssl_enabled": settings.is_production()
            }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "ssl_enabled": settings.is_production()
        } 