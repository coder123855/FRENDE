-- Frende Database Initialization Script
-- This script sets up the initial database structure and permissions

-- Create database if it doesn't exist (this will be handled by Docker)
-- CREATE DATABASE frende;

-- Create user if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'frende_user') THEN
        CREATE USER frende_user WITH PASSWORD 'frende_password';
    END IF;
END
$$;

-- Grant privileges to the user
GRANT ALL PRIVILEGES ON DATABASE frende TO frende_user;

-- Connect to the frende database
\c frende;

-- Grant schema privileges
GRANT ALL ON SCHEMA public TO frende_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO frende_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO frende_user;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO frende_user;

-- Set default privileges for future objects
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO frende_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO frende_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO frende_user;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create indexes for better performance (these will be created by Alembic, but good to have)
-- CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
-- CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
-- CREATE INDEX IF NOT EXISTS idx_matches_user_id ON matches(user_id);
-- CREATE INDEX IF NOT EXISTS idx_tasks_match_id ON tasks(match_id);
-- CREATE INDEX IF NOT EXISTS idx_chat_messages_match_id ON chat_messages(match_id);

-- Set timezone
SET timezone = 'UTC';

-- Log successful initialization
DO $$
BEGIN
    RAISE NOTICE 'Frende database initialized successfully';
    RAISE NOTICE 'Database: %', current_database();
    RAISE NOTICE 'User: %', current_user;
    RAISE NOTICE 'Timezone: %', current_setting('timezone');
END
$$;
