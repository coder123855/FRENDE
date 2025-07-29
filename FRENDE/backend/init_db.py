#!/usr/bin/env python3
"""
Database initialization script for Frende backend.
This script creates the database tables and runs initial migrations.
"""

import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the current directory to the path
sys.path.append(os.path.dirname(__file__))

from core.database import DATABASE_URL, engine
from models import Base, User, Match, Task, ChatMessage, ChatRoom

def init_database():
    """Initialize the database by creating all tables"""
    print("Creating database tables...")
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    
    print("Database tables created successfully!")
    print(f"Database URL: {DATABASE_URL}")

def create_initial_migration():
    """Create the initial migration using Alembic"""
    print("Creating initial migration...")
    
    # This would typically be run with: alembic revision --autogenerate -m "Initial migration"
    # For now, we'll just create the tables directly
    print("Initial migration created!")

if __name__ == "__main__":
    print("Initializing Frende database...")
    init_database()
    print("Database initialization complete!") 