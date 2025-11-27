-- =====================================================
-- Migration: Add Version Tracking for Optimistic Locking
-- Adds version and last_modified_by columns to editable tables
-- =====================================================
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. CLIENTS TABLE
-- =====================================================

-- Add version column to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Add last_modified_by column if it doesn't exist (updated_by already exists, but we'll use last_modified_by for consistency)
-- Note: updated_by already exists, so we'll use that for last_modified_by tracking
-- But we'll add last_modified_by for explicit tracking
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS last_modified_by TEXT;

-- Create index on version for faster conflict checks
CREATE INDEX IF NOT EXISTS idx_clients_version ON clients(version);

-- Update trigger to auto-increment version on updates
CREATE OR REPLACE FUNCTION increment_client_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment version if data actually changed (not just updated_at)
    IF OLD.version IS NULL THEN
        NEW.version := 1;
    ELSIF (OLD.ga4_property_id IS DISTINCT FROM NEW.ga4_property_id OR
           OLD.scrunch_brand_id IS DISTINCT FROM NEW.scrunch_brand_id OR
           OLD.theme_color IS DISTINCT FROM NEW.theme_color OR
           OLD.logo_url IS DISTINCT FROM NEW.logo_url OR
           OLD.secondary_color IS DISTINCT FROM NEW.secondary_color OR
           OLD.font_family IS DISTINCT FROM NEW.font_family OR
           OLD.favicon_url IS DISTINCT FROM NEW.favicon_url OR
           OLD.report_title IS DISTINCT FROM NEW.report_title OR
           OLD.company_domain IS DISTINCT FROM NEW.company_domain OR
           OLD.custom_css IS DISTINCT FROM NEW.custom_css OR
           OLD.footer_text IS DISTINCT FROM NEW.footer_text OR
           OLD.header_text IS DISTINCT FROM NEW.header_text) THEN
        NEW.version := OLD.version + 1;
    ELSE
        NEW.version := OLD.version;
    END IF;
    
    -- Update updated_at timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_increment_client_version ON clients;
CREATE TRIGGER trigger_increment_client_version
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION increment_client_version();

-- =====================================================
-- 2. BRAND_KPI_SELECTIONS TABLE
-- =====================================================

-- Add version column to brand_kpi_selections table
ALTER TABLE brand_kpi_selections 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Add last_modified_by column
ALTER TABLE brand_kpi_selections 
ADD COLUMN IF NOT EXISTS last_modified_by TEXT;

-- Create index on version for faster conflict checks
CREATE INDEX IF NOT EXISTS idx_brand_kpi_selections_version ON brand_kpi_selections(version);

-- Update trigger to auto-increment version on updates
CREATE OR REPLACE FUNCTION increment_brand_kpi_selections_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment version if selected_kpis or visible_sections changed
    IF OLD.version IS NULL THEN
        NEW.version := 1;
    ELSIF (OLD.selected_kpis IS DISTINCT FROM NEW.selected_kpis OR
           OLD.visible_sections IS DISTINCT FROM NEW.visible_sections) THEN
        NEW.version := OLD.version + 1;
    ELSE
        NEW.version := OLD.version;
    END IF;
    
    -- Update updated_at timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_increment_brand_kpi_selections_version ON brand_kpi_selections;
CREATE TRIGGER trigger_increment_brand_kpi_selections_version
    BEFORE UPDATE ON brand_kpi_selections
    FOR EACH ROW
    EXECUTE FUNCTION increment_brand_kpi_selections_version();

-- =====================================================
-- 3. BRANDS TABLE
-- =====================================================

-- Add version column to brands table
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Add last_modified_by column
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS last_modified_by TEXT;

-- Create index on version for faster conflict checks
CREATE INDEX IF NOT EXISTS idx_brands_version ON brands(version);

-- Update trigger to auto-increment version on updates
CREATE OR REPLACE FUNCTION increment_brand_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Increment version if ga4_property_id or theme changed
    IF OLD.version IS NULL THEN
        NEW.version := 1;
    ELSIF (OLD.ga4_property_id IS DISTINCT FROM NEW.ga4_property_id OR
           OLD.theme IS DISTINCT FROM NEW.theme OR
           OLD.logo_url IS DISTINCT FROM NEW.logo_url) THEN
        NEW.version := OLD.version + 1;
    ELSE
        NEW.version := OLD.version;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists and create new one
DROP TRIGGER IF EXISTS trigger_increment_brand_version ON brands;
CREATE TRIGGER trigger_increment_brand_version
    BEFORE UPDATE ON brands
    FOR EACH ROW
    EXECUTE FUNCTION increment_brand_version();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON COLUMN clients.version IS 'Version number for optimistic locking. Increments on each update to editable fields.';
COMMENT ON COLUMN clients.last_modified_by IS 'Email of user who last modified this client record.';
COMMENT ON COLUMN brand_kpi_selections.version IS 'Version number for optimistic locking. Increments on each update to selected_kpis or visible_sections.';
COMMENT ON COLUMN brand_kpi_selections.last_modified_by IS 'Email of user who last modified this KPI selection record.';
COMMENT ON COLUMN brands.version IS 'Version number for optimistic locking. Increments on each update to ga4_property_id, theme, or logo_url.';
COMMENT ON COLUMN brands.last_modified_by IS 'Email of user who last modified this brand record.';

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Version tracking is now enabled for clients, brand_kpi_selections, and brands tables
-- =====================================================

