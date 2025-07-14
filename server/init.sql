-- Slack Clone Database Initialization
-- This file will be executed when the PostgreSQL container starts for the first time

-- Create database if not exists (already created via POSTGRES_DB env var)
-- Extensions for UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status') THEN
        CREATE TYPE user_status AS ENUM ('online', 'away', 'busy', 'offline');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'workspace_role') THEN
        CREATE TYPE workspace_role AS ENUM ('owner', 'admin', 'member');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'message_type') THEN
        CREATE TYPE message_type AS ENUM ('text', 'file', 'image', 'system');
    END IF;
END
$$; 