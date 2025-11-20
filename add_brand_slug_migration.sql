-- Migration: Add slug field to brands table for public URL sharing
-- Run this in your Supabase SQL Editor

-- Add slug column to brands table
ALTER TABLE brands ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- Create index on slug for faster lookups
CREATE INDEX IF NOT EXISTS idx_brands_slug ON brands(slug);

-- Function to generate slug from brand name (optional - can be done in application code)
-- This is a helper function, slugs should ideally be set when creating/updating brands
CREATE OR REPLACE FUNCTION generate_slug(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN lower(regexp_replace(regexp_replace(input_text, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
END;
$$ LANGUAGE plpgsql;

-- Comment
COMMENT ON COLUMN brands.slug IS 'URL-friendly identifier for public brand reporting dashboard access';

