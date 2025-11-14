-- =====================================================
-- Agency Analytics Campaign Rankings Table
-- Stores campaign ranking data from Agency Analytics API
-- =====================================================
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Campaign Rankings Table
CREATE TABLE IF NOT EXISTS agency_analytics_campaign_rankings (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL,
    client_name TEXT,
    date DATE NOT NULL,
    campaign_id_date TEXT NOT NULL UNIQUE, -- Unique identifier: campaign_id-date
    google_ranking_count INTEGER DEFAULT 0,
    google_ranking_change INTEGER DEFAULT 0,
    google_local_count INTEGER DEFAULT 0,
    google_mobile_count INTEGER DEFAULT 0,
    bing_ranking_count INTEGER DEFAULT 0,
    ranking_average DECIMAL(10, 2) DEFAULT 0,
    search_volume INTEGER DEFAULT 0,
    competition DECIMAL(10, 2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_aa_campaign_rankings_campaign_id ON agency_analytics_campaign_rankings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_aa_campaign_rankings_date ON agency_analytics_campaign_rankings(date);
CREATE INDEX IF NOT EXISTS idx_aa_campaign_rankings_campaign_id_date ON agency_analytics_campaign_rankings(campaign_id_date);
CREATE INDEX IF NOT EXISTS idx_aa_campaign_rankings_client_name ON agency_analytics_campaign_rankings(client_name);

-- Campaigns Table (to store campaign metadata)
CREATE TABLE IF NOT EXISTS agency_analytics_campaigns (
    id INTEGER PRIMARY KEY, -- Campaign ID from API
    date_created TIMESTAMPTZ,
    date_modified TIMESTAMPTZ,
    url TEXT,
    company TEXT,
    scope TEXT,
    status TEXT,
    group_title TEXT,
    email_addresses TEXT[],
    phone_numbers TEXT[],
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT,
    revenue DECIMAL(15, 2),
    headcount INTEGER,
    google_ignore_places BOOLEAN,
    enforce_google_cid BOOLEAN,
    timezone TEXT,
    type TEXT,
    campaign_group_id INTEGER,
    company_id INTEGER,
    account_id INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for campaigns
CREATE INDEX IF NOT EXISTS idx_aa_campaigns_company ON agency_analytics_campaigns(company);
CREATE INDEX IF NOT EXISTS idx_aa_campaigns_status ON agency_analytics_campaigns(status);

-- Campaign-Brand Linking Table (matches campaigns to brands by URL)
CREATE TABLE IF NOT EXISTS agency_analytics_campaign_brands (
    id SERIAL PRIMARY KEY,
    campaign_id INTEGER NOT NULL REFERENCES agency_analytics_campaigns(id) ON DELETE CASCADE,
    brand_id INTEGER NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
    match_method TEXT NOT NULL, -- 'url_match', 'manual'
    match_confidence TEXT, -- 'exact', 'domain', 'partial'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(campaign_id, brand_id) -- Prevent duplicate links
);

-- Indexes for campaign-brand links
CREATE INDEX IF NOT EXISTS idx_aa_campaign_brands_campaign_id ON agency_analytics_campaign_brands(campaign_id);
CREATE INDEX IF NOT EXISTS idx_aa_campaign_brands_brand_id ON agency_analytics_campaign_brands(brand_id);
CREATE INDEX IF NOT EXISTS idx_aa_campaign_brands_match_method ON agency_analytics_campaign_brands(match_method);

-- Keywords Table (stores keywords for campaigns)
CREATE TABLE IF NOT EXISTS agency_analytics_keywords (
    id INTEGER PRIMARY KEY, -- Keyword ID from API
    campaign_id INTEGER NOT NULL REFERENCES agency_analytics_campaigns(id) ON DELETE CASCADE,
    campaign_keyword_id TEXT NOT NULL UNIQUE, -- Unique identifier: campaign_id - keyword_id
    keyword_phrase TEXT,
    primary_keyword BOOLEAN DEFAULT FALSE,
    search_location TEXT, -- Formatted location string
    search_location_formatted_name TEXT,
    search_location_region_name TEXT,
    search_location_country_code TEXT,
    search_location_latitude DECIMAL(10, 8),
    search_location_longitude DECIMAL(11, 8),
    search_language TEXT,
    tags TEXT, -- Comma-separated tags
    date_created TIMESTAMPTZ,
    date_modified TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for keywords
CREATE INDEX IF NOT EXISTS idx_aa_keywords_campaign_id ON agency_analytics_keywords(campaign_id);
CREATE INDEX IF NOT EXISTS idx_aa_keywords_campaign_keyword_id ON agency_analytics_keywords(campaign_keyword_id);
CREATE INDEX IF NOT EXISTS idx_aa_keywords_keyword_phrase ON agency_analytics_keywords(keyword_phrase);
CREATE INDEX IF NOT EXISTS idx_aa_keywords_primary_keyword ON agency_analytics_keywords(primary_keyword);

-- Keyword Rankings Table (stores daily ranking data for keywords)
CREATE TABLE IF NOT EXISTS agency_analytics_keyword_rankings (
    id SERIAL PRIMARY KEY,
    keyword_id INTEGER NOT NULL REFERENCES agency_analytics_keywords(id) ON DELETE CASCADE,
    campaign_id INTEGER NOT NULL REFERENCES agency_analytics_campaigns(id) ON DELETE CASCADE,
    keyword_id_date TEXT NOT NULL UNIQUE, -- Unique identifier: keyword_id-date
    date DATE NOT NULL,
    google_ranking INTEGER,
    google_ranking_url TEXT,
    google_mobile_ranking INTEGER,
    google_mobile_ranking_url TEXT,
    google_local_ranking INTEGER,
    bing_ranking INTEGER,
    bing_ranking_url TEXT,
    results INTEGER,
    volume INTEGER,
    competition DECIMAL(10, 2),
    field_status JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Keyword Ranking Summaries Table (stores latest ranking + change calculation)
CREATE TABLE IF NOT EXISTS agency_analytics_keyword_ranking_summaries (
    keyword_id INTEGER PRIMARY KEY REFERENCES agency_analytics_keywords(id) ON DELETE CASCADE,
    campaign_id INTEGER NOT NULL REFERENCES agency_analytics_campaigns(id) ON DELETE CASCADE,
    keyword_phrase TEXT,
    keyword_id_date TEXT NOT NULL UNIQUE, -- Latest date identifier: keyword_id-latest_date
    date DATE, -- Latest date
    google_ranking INTEGER,
    google_ranking_url TEXT,
    google_mobile_ranking INTEGER,
    google_mobile_ranking_url TEXT,
    google_local_ranking INTEGER,
    bing_ranking INTEGER,
    bing_ranking_url TEXT,
    search_volume INTEGER,
    competition DECIMAL(10, 2),
    results INTEGER,
    field_status JSONB,
    start_date DATE,
    end_date DATE,
    start_ranking INTEGER,
    end_ranking INTEGER,
    ranking_change INTEGER, -- Calculated: start_ranking - end_ranking
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for keyword rankings
CREATE INDEX IF NOT EXISTS idx_aa_keyword_rankings_keyword_id ON agency_analytics_keyword_rankings(keyword_id);
CREATE INDEX IF NOT EXISTS idx_aa_keyword_rankings_campaign_id ON agency_analytics_keyword_rankings(campaign_id);
CREATE INDEX IF NOT EXISTS idx_aa_keyword_rankings_date ON agency_analytics_keyword_rankings(date);
CREATE INDEX IF NOT EXISTS idx_aa_keyword_rankings_keyword_id_date ON agency_analytics_keyword_rankings(keyword_id_date);

-- Indexes for keyword ranking summaries
CREATE INDEX IF NOT EXISTS idx_aa_keyword_summaries_campaign_id ON agency_analytics_keyword_ranking_summaries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_aa_keyword_summaries_keyword_id_date ON agency_analytics_keyword_ranking_summaries(keyword_id_date);

-- Comments
COMMENT ON TABLE agency_analytics_campaign_rankings IS 'Stores monthly campaign ranking data from Agency Analytics API';
COMMENT ON TABLE agency_analytics_campaigns IS 'Stores campaign metadata from Agency Analytics API';
COMMENT ON TABLE agency_analytics_campaign_brands IS 'Links Agency Analytics campaigns to brands based on URL matching';
COMMENT ON TABLE agency_analytics_keywords IS 'Stores keywords for Agency Analytics campaigns';
COMMENT ON TABLE agency_analytics_keyword_rankings IS 'Stores daily keyword ranking data from Agency Analytics API';
COMMENT ON TABLE agency_analytics_keyword_ranking_summaries IS 'Stores latest keyword ranking data with change calculations';

