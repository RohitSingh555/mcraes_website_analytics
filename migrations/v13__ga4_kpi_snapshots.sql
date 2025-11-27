-- =====================================================
-- GA4 KPI Snapshots Table
-- Stores pre-calculated GA4 KPIs for 30-day periods
-- This table is used to speed up dashboard API calls
-- =====================================================
-- Run this in your Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS ga4_kpi_snapshots (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL,
    period_end_date DATE NOT NULL,  -- End date of the 30-day period (e.g., today)
    period_start_date DATE NOT NULL,  -- Start date of the 30-day period
    prev_period_start_date DATE NOT NULL,  -- Start date of previous 30-day period
    prev_period_end_date DATE NOT NULL,  -- End date of previous 30-day period
    
    -- Current period values (last 30 days)
    users INTEGER DEFAULT 0,
    sessions INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    bounce_rate DECIMAL(10,4) DEFAULT 0,  -- Stored as decimal (0-1)
    avg_session_duration DECIMAL(10,2) DEFAULT 0,  -- in seconds
    engagement_rate DECIMAL(10,4) DEFAULT 0,  -- Stored as decimal (0-1)
    engaged_sessions INTEGER DEFAULT 0,
    conversions DECIMAL(10,2) DEFAULT 0,
    revenue DECIMAL(15,2) DEFAULT 0,
    
    -- Previous period values (30 days before current period)
    prev_users INTEGER DEFAULT 0,
    prev_sessions INTEGER DEFAULT 0,
    prev_new_users INTEGER DEFAULT 0,
    prev_bounce_rate DECIMAL(10,4) DEFAULT 0,
    prev_avg_session_duration DECIMAL(10,2) DEFAULT 0,
    prev_engagement_rate DECIMAL(10,4) DEFAULT 0,
    prev_engaged_sessions INTEGER DEFAULT 0,
    prev_conversions DECIMAL(10,2) DEFAULT 0,
    prev_revenue DECIMAL(15,2) DEFAULT 0,
    
    -- Percentage changes
    users_change DECIMAL(8,2) DEFAULT 0,
    sessions_change DECIMAL(8,2) DEFAULT 0,
    new_users_change DECIMAL(8,2) DEFAULT 0,
    bounce_rate_change DECIMAL(8,2) DEFAULT 0,
    avg_session_duration_change DECIMAL(8,2) DEFAULT 0,
    engagement_rate_change DECIMAL(8,2) DEFAULT 0,
    engaged_sessions_change DECIMAL(8,2) DEFAULT 0,
    conversions_change DECIMAL(8,2) DEFAULT 0,
    revenue_change DECIMAL(8,2) DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(brand_id, property_id, period_end_date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ga4_kpi_snapshots_brand_date ON ga4_kpi_snapshots(brand_id, period_end_date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_kpi_snapshots_property_date ON ga4_kpi_snapshots(property_id, period_end_date DESC);
-- Note: Removed partial index with CURRENT_DATE as it's not immutable
-- The above indexes are sufficient for querying latest snapshots efficiently

-- Comments for documentation
COMMENT ON TABLE ga4_kpi_snapshots IS 'Pre-calculated GA4 KPIs for 30-day periods to speed up dashboard API calls';
COMMENT ON COLUMN ga4_kpi_snapshots.period_end_date IS 'End date of the 30-day period (typically today)';
COMMENT ON COLUMN ga4_kpi_snapshots.period_start_date IS 'Start date of the 30-day period (30 days before period_end_date)';
COMMENT ON COLUMN ga4_kpi_snapshots.prev_period_start_date IS 'Start date of previous 30-day period (60 days before period_end_date)';
COMMENT ON COLUMN ga4_kpi_snapshots.prev_period_end_date IS 'End date of previous 30-day period (31 days before period_end_date)';

