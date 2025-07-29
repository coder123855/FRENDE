from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
import os
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
    # PostgreSQL configuration for production
    async_database_url = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    engine = create_async_engine(
        async_database_url,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=False  # Disable SQL logging for production
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