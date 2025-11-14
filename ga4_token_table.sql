-- =====================================================
-- GA4 Token Storage Table
-- Stores GA4 access tokens for daily use
-- =====================================================
-- Run this in your Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS ga4_tokens (
    id SERIAL PRIMARY KEY,
    access_token TEXT NOT NULL,
    expires_at BIGINT NOT NULL,  -- Unix timestamp
    generated_at BIGINT NOT NULL,  -- Unix timestamp when token was generated
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- Index for quick lookup of active tokens
CREATE INDEX IF NOT EXISTS idx_ga4_tokens_expires_at ON ga4_tokens(expires_at DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_tokens_active ON ga4_tokens(is_active) WHERE is_active = TRUE;

-- Add comment
COMMENT ON TABLE ga4_tokens IS 'Stores GA4 access tokens for daily authentication';
COMMENT ON COLUMN ga4_tokens.access_token IS 'Google Analytics 4 access token';
COMMENT ON COLUMN ga4_tokens.expires_at IS 'Unix timestamp when token expires';
COMMENT ON COLUMN ga4_tokens.generated_at IS 'Unix timestamp when token was generated';
COMMENT ON COLUMN ga4_tokens.is_active IS 'Whether this token is currently active';

-- =====================================================
-- Optional: Cleanup old tokens (run periodically)
-- =====================================================
-- This will delete tokens older than 7 days
-- DELETE FROM ga4_tokens WHERE expires_at < EXTRACT(EPOCH FROM NOW()) - 604800;

-- =====================================================
-- Verify table creation
-- =====================================================
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'ga4_tokens'
-- ORDER BY ordinal_position;

