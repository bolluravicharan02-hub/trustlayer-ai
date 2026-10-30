-- ============================================================================
-- TrustLayer AI - Migration 005: Clerk Authentication Integration
-- ============================================================================

-- Add Clerk User ID column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_user_id VARCHAR(255) UNIQUE;

-- Allow password_hash to be nullable for users authenticating via Clerk
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Index for rapid lookups on Clerk user ID
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id) WHERE clerk_user_id IS NOT NULL;

