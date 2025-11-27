-- Migration: Add composite index on responses table for faster date-range queries
-- This index will significantly speed up queries filtering by brand_id and created_at
-- Run this in your Supabase SQL Editor

-- Composite index for brand_id + created_at (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_responses_brand_id_created_at ON responses(brand_id, created_at);

-- Composite index for brand_id + prompt_id (for prompt-based queries)
CREATE INDEX IF NOT EXISTS idx_responses_brand_id_prompt_id ON responses(brand_id, prompt_id);

-- Comments
COMMENT ON INDEX idx_responses_brand_id_created_at IS 'Composite index for fast date-range queries filtered by brand_id';
COMMENT ON INDEX idx_responses_brand_id_prompt_id IS 'Composite index for fast prompt-based queries filtered by brand_id';

