-- Migration: Create brand_kpi_selections table for storing KPI visibility preferences per brand
-- Run this in your Supabase SQL Editor

-- Create brand_kpi_selections table
CREATE TABLE IF NOT EXISTS brand_kpi_selections (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    selected_kpis TEXT[] NOT NULL DEFAULT '{}',  -- Array of KPI keys that should be visible in public view
    visible_sections TEXT[] NOT NULL DEFAULT ARRAY['ga4', 'scrunch_ai', 'brand_analytics', 'advanced_analytics', 'performance_metrics'],  -- Array of section keys that should be visible in public view
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id)  -- One selection per brand
);

-- Create index on brand_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_brand_kpi_selections_brand_id ON brand_kpi_selections(brand_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_brand_kpi_selections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER trigger_update_brand_kpi_selections_updated_at
    BEFORE UPDATE ON brand_kpi_selections
    FOR EACH ROW
    EXECUTE FUNCTION update_brand_kpi_selections_updated_at();

-- Comments
COMMENT ON TABLE brand_kpi_selections IS 'Stores KPI and section visibility preferences for each brand. Used by managers/admins to control which sections and KPIs are shown in public reporting dashboard.';
COMMENT ON COLUMN brand_kpi_selections.brand_id IS 'Reference to the brand this selection applies to';
COMMENT ON COLUMN brand_kpi_selections.selected_kpis IS 'Array of KPI keys that should be visible in public view. If empty or NULL, all available KPIs are shown.';
COMMENT ON COLUMN brand_kpi_selections.visible_sections IS 'Array of section keys that should be visible in public view. Default: all sections visible. Valid sections: ga4, scrunch_ai, brand_analytics, advanced_analytics, performance_metrics';

