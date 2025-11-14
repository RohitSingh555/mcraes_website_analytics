-- =====================================================
-- Google Analytics 4 Data Tables
-- These tables store synced GA4 data for historical tracking
-- =====================================================
-- Run this in your Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. GA4 TRAFFIC OVERVIEW TABLE
-- Stores daily traffic metrics for each brand/property
-- =====================================================
CREATE TABLE IF NOT EXISTS ga4_traffic_overview (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL,
    date DATE NOT NULL,
    users INTEGER DEFAULT 0,
    sessions INTEGER DEFAULT 0,
    new_users INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    average_session_duration DECIMAL(10,2) DEFAULT 0,  -- in seconds
    engaged_sessions INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,4) DEFAULT 0,  -- 0-1 range
    sessions_change DECIMAL(6,2) DEFAULT 0,  -- month-over-month %
    engaged_sessions_change DECIMAL(6,2) DEFAULT 0,
    avg_session_duration_change DECIMAL(6,2) DEFAULT 0,
    engagement_rate_change DECIMAL(6,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id, property_id, date)
);

-- =====================================================
-- 2. GA4 TOP PAGES TABLE
-- Stores top performing pages for each brand/property
-- =====================================================
CREATE TABLE IF NOT EXISTS ga4_top_pages (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL,
    date DATE NOT NULL,
    page_path TEXT NOT NULL,
    views INTEGER DEFAULT 0,
    users INTEGER DEFAULT 0,
    avg_session_duration DECIMAL(10,2) DEFAULT 0,  -- in seconds
    rank INTEGER,  -- Ranking position
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id, property_id, date, page_path)
);

-- =====================================================
-- 3. GA4 TRAFFIC SOURCES TABLE
-- Stores traffic acquisition data by source/medium
-- =====================================================
CREATE TABLE IF NOT EXISTS ga4_traffic_sources (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL,
    date DATE NOT NULL,
    source TEXT NOT NULL,  -- e.g., "google / organic"
    sessions INTEGER DEFAULT 0,
    users INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id, property_id, date, source)
);

-- =====================================================
-- 4. GA4 GEOGRAPHIC DATA TABLE
-- Stores geographic breakdown by country
-- =====================================================
CREATE TABLE IF NOT EXISTS ga4_geographic (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL,
    date DATE NOT NULL,
    country TEXT NOT NULL,
    users INTEGER DEFAULT 0,
    sessions INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id, property_id, date, country)
);

-- =====================================================
-- 5. GA4 DEVICES TABLE
-- Stores device and platform breakdown
-- =====================================================
CREATE TABLE IF NOT EXISTS ga4_devices (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL,
    date DATE NOT NULL,
    device_category TEXT NOT NULL,  -- desktop, mobile, tablet
    operating_system TEXT NOT NULL,
    users INTEGER DEFAULT 0,
    sessions INTEGER DEFAULT 0,
    bounce_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id, property_id, date, device_category, operating_system)
);

-- =====================================================
-- 6. GA4 CONVERSIONS TABLE
-- Stores conversion events data
-- =====================================================
CREATE TABLE IF NOT EXISTS ga4_conversions (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL,
    date DATE NOT NULL,
    event_name TEXT NOT NULL,
    event_count INTEGER DEFAULT 0,
    users INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id, property_id, date, event_name)
);

-- =====================================================
-- 7. GA4 REALTIME DATA TABLE
-- Stores realtime snapshot data (updated frequently)
-- =====================================================
CREATE TABLE IF NOT EXISTS ga4_realtime (
    id SERIAL PRIMARY KEY,
    brand_id INTEGER REFERENCES brands(id) ON DELETE CASCADE,
    property_id TEXT NOT NULL,
    snapshot_time TIMESTAMPTZ DEFAULT NOW(),
    total_active_users INTEGER DEFAULT 0,
    active_pages JSONB,  -- Array of {pagePath, activeUsers}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(brand_id, property_id, snapshot_time)
);

-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================

-- Traffic Overview indexes
CREATE INDEX IF NOT EXISTS idx_ga4_traffic_brand_date ON ga4_traffic_overview(brand_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_traffic_property_date ON ga4_traffic_overview(property_id, date DESC);

-- Top Pages indexes
CREATE INDEX IF NOT EXISTS idx_ga4_pages_brand_date ON ga4_top_pages(brand_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_pages_property_date ON ga4_top_pages(property_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_pages_rank ON ga4_top_pages(brand_id, date DESC, rank);

-- Traffic Sources indexes
CREATE INDEX IF NOT EXISTS idx_ga4_sources_brand_date ON ga4_traffic_sources(brand_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_sources_property_date ON ga4_traffic_sources(property_id, date DESC);

-- Geographic indexes
CREATE INDEX IF NOT EXISTS idx_ga4_geo_brand_date ON ga4_geographic(brand_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_geo_property_date ON ga4_geographic(property_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_geo_country ON ga4_geographic(country);

-- Devices indexes
CREATE INDEX IF NOT EXISTS idx_ga4_devices_brand_date ON ga4_devices(brand_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_devices_property_date ON ga4_devices(property_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_devices_category ON ga4_devices(device_category);

-- Conversions indexes
CREATE INDEX IF NOT EXISTS idx_ga4_conversions_brand_date ON ga4_conversions(brand_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_conversions_property_date ON ga4_conversions(property_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_conversions_event ON ga4_conversions(event_name);

-- Realtime indexes
CREATE INDEX IF NOT EXISTS idx_ga4_realtime_brand ON ga4_realtime(brand_id, snapshot_time DESC);
CREATE INDEX IF NOT EXISTS idx_ga4_realtime_property ON ga4_realtime(property_id, snapshot_time DESC);

-- =====================================================
-- 9. COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE ga4_traffic_overview IS 'Daily GA4 traffic overview metrics';
COMMENT ON TABLE ga4_top_pages IS 'Top performing pages from GA4';
COMMENT ON TABLE ga4_traffic_sources IS 'Traffic acquisition sources from GA4';
COMMENT ON TABLE ga4_geographic IS 'Geographic breakdown by country from GA4';
COMMENT ON TABLE ga4_devices IS 'Device and platform breakdown from GA4';
COMMENT ON TABLE ga4_conversions IS 'Conversion events from GA4';
COMMENT ON TABLE ga4_realtime IS 'Realtime snapshot data from GA4';

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- These tables are separate from Scrunch AI tables
-- They store historical GA4 data for trend analysis
-- =====================================================

