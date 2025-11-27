-- =====================================================
-- Additional GA4 Tables for Complete Data Storage
-- Stores all GA4 data fetched during sync and dashboard loading
-- =====================================================
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. GA4 PROPERTY DETAILS TABLE
-- Stores static property configuration (doesn't change often)
-- =====================================================
CREATE TABLE IF NOT EXISTS ga4_property_details (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL,
    display_name TEXT,
    time_zone TEXT,
    currency_code TEXT,
    create_time TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id, property_id)
);

-- =====================================================
-- 2. GA4 REVENUE TABLE
-- Stores daily revenue data (separate from conversions for historical tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS ga4_revenue (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL,
    date DATE NOT NULL,
    total_revenue DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id, property_id, date)
);

-- =====================================================
-- 3. GA4 DAILY CONVERSIONS SUMMARY TABLE
-- Stores daily total conversions (aggregated from ga4_conversions for quick access)
-- =====================================================
CREATE TABLE IF NOT EXISTS ga4_daily_conversions (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL,
    date DATE NOT NULL,
    total_conversions DECIMAL(10,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id, property_id, date)
);

-- =====================================================
-- 4. INDEXES FOR PERFORMANCE
-- =====================================================

-- Property Details indexes
CREATE INDEX IF NOT EXISTS idx_ga4_property_details_brand ON ga4_property_details(brand_id);
CREATE INDEX IF NOT EXISTS idx_ga4_property_details_property ON ga4_property_details(property_id);

-- Revenue indexes
CREATE INDEX IF NOT EXISTS idx_ga4_revenue_brand_date ON ga4_revenue(brand_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_revenue_property_date ON ga4_revenue(property_id, date DESC);

-- Daily Conversions indexes
CREATE INDEX IF NOT EXISTS idx_ga4_daily_conversions_brand_date ON ga4_daily_conversions(brand_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_daily_conversions_property_date ON ga4_daily_conversions(property_id, date DESC);

-- =====================================================
-- 5. COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE ga4_property_details IS 'Static GA4 property configuration details';
COMMENT ON TABLE ga4_revenue IS 'Daily revenue data from GA4';
COMMENT ON TABLE ga4_daily_conversions IS 'Daily aggregated conversions from GA4';

-- =====================================================
-- 6. UPDATE EXISTING TABLES IF NEEDED
-- =====================================================

-- Add revenue column to ga4_traffic_overview if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ga4_traffic_overview' 
        AND column_name = 'revenue'
    ) THEN
        ALTER TABLE ga4_traffic_overview ADD COLUMN revenue DECIMAL(15,2) DEFAULT 0;
    END IF;
END $$;

-- Add conversions column to ga4_traffic_overview if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ga4_traffic_overview' 
        AND column_name = 'conversions'
    ) THEN
        ALTER TABLE ga4_traffic_overview ADD COLUMN conversions DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- These tables ensure all GA4 data is stored for historical tracking
-- =====================================================

