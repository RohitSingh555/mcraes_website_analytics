-- Migration: Add visible_sections column to existing brand_kpi_selections table
-- Run this in your Supabase SQL Editor if you already ran v9 migration

-- Add visible_sections column if it doesn't exist
ALTER TABLE brand_kpi_selections 
ADD COLUMN IF NOT EXISTS visible_sections TEXT[] NOT NULL DEFAULT ARRAY['ga4', 'scrunch_ai', 'brand_analytics', 'advanced_analytics', 'performance_metrics'];

-- Update comment
COMMENT ON COLUMN brand_kpi_selections.visible_sections IS 'Array of section keys that should be visible in public view. Default: all sections visible. Valid sections: ga4, scrunch_ai, brand_analytics, advanced_analytics, performance_metrics';

