#!/usr/bin/env python3
"""
Production Database Setup Script
This script sets up a PostgreSQL database with proper security configurations
for the Frende application in production.
"""

import os
import sys
import asyncio
import asyncpg
from pathlib import Path
from typing import Optional
import logging

# Add the backend directory to the Python path
sys.path.append(str(Path(__file__).parent.parent))

from core.config import settings
from core.database import engine, Base

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProductionDatabaseSetup:
    def __init__(self):
        self.db_url = settings.DATABASE_URL
        self.db_name = None
        self.db_user = None
        self.db_password = None
        self.db_host = None
        self.db_port = None
        
    def parse_database_url(self):
        """Parse the database URL to extract connection parameters"""
        try:
            # Remove postgresql:// prefix
            url = self.db_url.replace("postgresql://", "")
            
            # Split credentials and host
            if "@" in url:
                credentials, host_part = url.split("@", 1)
                if ":" in credentials:
                    self.db_user, self.db_password = credentials.split(":", 1)
                else:
                    self.db_user = credentials
                    self.db_password = ""
            else:
                self.db_user = "postgres"
                self.db_password = ""
                host_part = url
            
            # Split host and database
            if "/" in host_part:
                host_port, self.db_name = host_part.split("/", 1)
                # Remove query parameters from database name
                if "?" in self.db_name:
                    self.db_name = self.db_name.split("?", 1)[0]
            else:
                host_port = host_part
                self.db_name = "frende"
            
            # Split host and port
            if ":" in host_port:
                self.db_host, port_str = host_port.split(":", 1)
                self.db_port = int(port_str)
            else:
                self.db_host = host_port
                self.db_port = 5432
                
            logger.info(f"Parsed database URL: {self.db_host}:{self.db_port}/{self.db_name}")
            
        except Exception as e:
            logger.error(f"Failed to parse database URL: {e}")
            raise
    
    async def test_connection(self) -> bool:
        """Test database connectivity"""
        try:
            conn = await asyncpg.connect(
                host=self.db_host,
                port=self.db_port,
                user=self.db_user,
                password=self.db_password,
                database=self.db_name,
                ssl='require' if settings.is_production() else None
            )
            await conn.close()
            logger.info("Database connection test successful")
            return True
        except Exception as e:
            logger.error(f"Database connection test failed: {e}")
            return False
    
    async def create_database_user(self, admin_conn):
        """Create a dedicated database user with minimal permissions"""
        try:
            # Create dedicated user for the application
            app_user = f"{self.db_name}_app"
            app_password = os.environ.get("DB_APP_PASSWORD", "change_this_password")
            
            # Check if user exists
            user_exists = await admin_conn.fetchval(
                "SELECT 1 FROM pg_roles WHERE rolname = $1", app_user
            )
            
            if not user_exists:
                await admin_conn.execute(
                    f"CREATE USER {app_user} WITH PASSWORD '{app_password}'"
                )
                logger.info(f"Created database user: {app_user}")
            else:
                logger.info(f"Database user {app_user} already exists")
            
            # Grant necessary permissions
            await admin_conn.execute(
                f"GRANT CONNECT ON DATABASE {self.db_name} TO {app_user}"
            )
            await admin_conn.execute(
                f"GRANT USAGE ON SCHEMA public TO {app_user}"
            )
            await admin_conn.execute(
                f"GRANT CREATE ON SCHEMA public TO {app_user}"
            )
            await admin_conn.execute(
                f"GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO {app_user}"
            )
            await admin_conn.execute(
                f"GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO {app_user}"
            )
            await admin_conn.execute(
                f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO {app_user}"
            )
            await admin_conn.execute(
                f"ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO {app_user}"
            )
            
            logger.info(f"Granted permissions to user: {app_user}")
            
        except Exception as e:
            logger.error(f"Failed to create database user: {e}")
            raise
    
    async def setup_database_security(self, admin_conn):
        """Configure database security settings"""
        try:
            # Enable SSL requirement
            await admin_conn.execute(
                "ALTER SYSTEM SET ssl = 'on'"
            )
            
            # Set connection limits
            await admin_conn.execute(
                "ALTER SYSTEM SET max_connections = '200'"
            )
            
            # Set authentication timeout
            await admin_conn.execute(
                "ALTER SYSTEM SET authentication_timeout = '60s'"
            )
            
            # Enable logging
            await admin_conn.execute(
                "ALTER SYSTEM SET log_statement = 'all'"
            )
            await admin_conn.execute(
                "ALTER SYSTEM SET log_connections = 'on'"
            )
            await admin_conn.execute(
                "ALTER SYSTEM SET log_disconnections = 'on'"
            )
            
            # Reload configuration
            await admin_conn.execute("SELECT pg_reload_conf()")
            
            logger.info("Database security settings configured")
            
        except Exception as e:
            logger.error(f"Failed to configure database security: {e}")
            raise
    
    async def create_database_indexes(self):
        """Create database indexes for performance"""
        try:
            conn = await asyncpg.connect(
                host=self.db_host,
                port=self.db_port,
                user=self.db_user,
                password=self.db_password,
                database=self.db_name,
                ssl='require' if settings.is_production() else None
            )
            
            # Create indexes for common queries
            indexes = [
                # User indexes
                "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
                "CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at)",
                
                # Match indexes
                "CREATE INDEX IF NOT EXISTS idx_matches_user1_id ON matches(user1_id)",
                "CREATE INDEX IF NOT EXISTS idx_matches_user2_id ON matches(user2_id)",
                "CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status)",
                "CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at)",
                
                # Chat indexes
                "CREATE INDEX IF NOT EXISTS idx_chat_messages_match_id ON chat_messages(match_id)",
                "CREATE INDEX IF NOT EXISTS idx_chat_messages_sender_id ON chat_messages(sender_id)",
                "CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at)",
                
                # Task indexes
                "CREATE INDEX IF NOT EXISTS idx_tasks_match_id ON tasks(match_id)",
                "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)",
                "CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at)",
                
                # Queue indexes
                "CREATE INDEX IF NOT EXISTS idx_queue_user_id ON queue(user_id)",
                "CREATE INDEX IF NOT EXISTS idx_queue_status ON queue(status)",
                "CREATE INDEX IF NOT EXISTS idx_queue_created_at ON queue(created_at)",
            ]
            
            for index_sql in indexes:
                try:
                    await conn.execute(index_sql)
                except Exception as e:
                    logger.warning(f"Failed to create index: {e}")
            
            await conn.close()
            logger.info("Database indexes created")
            
        except Exception as e:
            logger.error(f"Failed to create database indexes: {e}")
            raise
    
    async def setup_database_monitoring(self):
        """Set up database monitoring and logging"""
        try:
            conn = await asyncpg.connect(
                host=self.db_host,
                port=self.db_port,
                user=self.db_user,
                password=self.db_password,
                database=self.db_name,
                ssl='require' if settings.is_production() else None
            )
            
            # Create monitoring functions
            monitoring_functions = [
                """
                CREATE OR REPLACE FUNCTION get_database_stats()
                RETURNS TABLE (
                    total_connections INTEGER,
                    active_connections INTEGER,
                    database_size TEXT,
                    cache_hit_ratio NUMERIC
                ) AS $$
                BEGIN
                    RETURN QUERY
                    SELECT 
                        (SELECT setting::INTEGER FROM pg_settings WHERE name = 'max_connections') as total_connections,
                        (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
                        (SELECT pg_size_pretty(pg_database_size(current_database()))) as database_size,
                        (SELECT round(100.0 * sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)), 2)
                         FROM pg_statio_user_tables) as cache_hit_ratio;
                END;
                $$ LANGUAGE plpgsql;
                """,
                
                """
                CREATE OR REPLACE FUNCTION get_slow_queries()
                RETURNS TABLE (
                    query TEXT,
                    calls BIGINT,
                    total_time NUMERIC,
                    mean_time NUMERIC
                ) AS $$
                BEGIN
                    RETURN QUERY
                    SELECT 
                        query,
                        calls,
                        total_time,
                        mean_time
                    FROM pg_stat_statements
                    WHERE mean_time > 1000  -- Queries taking more than 1 second
                    ORDER BY mean_time DESC
                    LIMIT 10;
                END;
                $$ LANGUAGE plpgsql;
                """
            ]
            
            for func_sql in monitoring_functions:
                try:
                    await conn.execute(func_sql)
                except Exception as e:
                    logger.warning(f"Failed to create monitoring function: {e}")
            
            await conn.close()
            logger.info("Database monitoring functions created")
            
        except Exception as e:
            logger.error(f"Failed to set up database monitoring: {e}")
            raise
    
    async def run_setup(self):
        """Run the complete database setup process"""
        logger.info("Starting production database setup...")
        
        try:
            # Parse database URL
            self.parse_database_url()
            
            # Test connection
            if not await self.test_connection():
                logger.error("Cannot proceed without database connection")
                return False
            
            # Create database user (requires admin connection)
            admin_url = self.db_url.replace(f"/{self.db_name}", "/postgres")
            admin_conn = await asyncpg.connect(admin_url)
            
            try:
                await self.create_database_user(admin_conn)
                await self.setup_database_security(admin_conn)
            finally:
                await admin_conn.close()
            
            # Create database indexes
            await self.create_database_indexes()
            
            # Set up monitoring
            await self.setup_database_monitoring()
            
            logger.info("Production database setup completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"Database setup failed: {e}")
            return False

async def main():
    """Main function to run the database setup"""
    setup = ProductionDatabaseSetup()
    success = await setup.run_setup()
    
    if success:
        logger.info("✅ Database setup completed successfully")
        sys.exit(0)
    else:
        logger.error("❌ Database setup failed")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main())
