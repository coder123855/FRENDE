#!/usr/bin/env python3
"""
Database initialization script for Frende backend.
This script creates the database tables and runs initial migrations.
"""

import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from core.database import Base, engine, get_async_session
from models import User, Match, Task, ChatMessage, ChatRoom, MatchRequest

def init_database():
    """Initialize the database with tables"""
    try:
        logger.info("Creating database tables...")
        # Use sync engine for table creation
        from sqlalchemy import create_engine
        from core.config import settings
        
        # Create sync engine for table creation
        sync_engine = create_engine(settings.DATABASE_URL.replace("+asyncpg", ""))
        Base.metadata.create_all(bind=sync_engine)
        logger.info("Database tables created successfully!")
        
        logger.info(f"Database URL: {settings.DATABASE_URL}")
        
        return True
    except Exception as e:
        logger.error(f"Failed to create database tables: {e}")
        return False

def create_initial_migration():
    """Create initial Alembic migration"""
    try:
        logger.info("Creating initial migration...")
        import subprocess
        result = subprocess.run(
            ["alembic", "revision", "--autogenerate", "-m", "Initial migration"],
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            logger.info("Initial migration created!")
            return True
        else:
            logger.error(f"Failed to create migration: {result.stderr}")
            return False
    except Exception as e:
        logger.error(f"Error creating migration: {e}")
        return False

def main():
    """Main initialization function"""
    logger.info("Initializing Frende database...")
    
    # Create tables
    if not init_database():
        return False
    
    # Create initial migration
    if not create_initial_migration():
        logger.warning("Failed to create initial migration, but database is ready")
    
    logger.info("Database initialization complete!")
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 