-- Supabase Database Schema for McRAE's Website Analytics
-- Run these SQL commands in your Supabase SQL Editor

-- Brands Table
CREATE TABLE IF NOT EXISTS brands (
    id INTEGER PRIMARY KEY,
    name TEXT,
    website TEXT,
    ga4_property_id TEXT,  -- Google Analytics 4 Property ID
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prompts Table
CREATE TABLE IF NOT EXISTS prompts (
    id INTEGER PRIMARY KEY,
    brand_id INTEGER,  -- References brands.id
    text TEXT,  -- API returns "text" not "prompt_text"
    stage TEXT,
    persona_id INTEGER,
    persona_name TEXT,  -- Not in API response, but useful
    platforms TEXT[],  -- API returns "platforms" array
    tags TEXT[],
    topics TEXT[],  -- API returns "topics" not "key_topics"
    created_at TIMESTAMPTZ
);

-- Responses Table
CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY,
    brand_id INTEGER,  -- References brands.id
    prompt_id INTEGER,
    prompt TEXT,
    response_text TEXT,
    platform TEXT,
    country TEXT,
    persona_id INTEGER,  -- API returns persona_id
    persona_name TEXT,
    stage TEXT,
    branded BOOLEAN,
    tags TEXT[],  -- API returns tags
    key_topics TEXT[],
    brand_present BOOLEAN,
    brand_sentiment TEXT,
    brand_position TEXT,
    competitors_present TEXT[],  -- Array of competitor names
    competitors JSONB,  -- Array of competitor objects with id, name, present, position, sentiment
    created_at TIMESTAMPTZ,
    citations JSONB  -- Array of citation objects
);

-- Citations Table (Optional - for storing citations separately)
CREATE TABLE IF NOT EXISTS citations (
    id SERIAL PRIMARY KEY,
    response_id INTEGER REFERENCES responses(id) ON DELETE CASCADE,
    url TEXT,
    domain TEXT,
    source_type TEXT,
    title TEXT,
    snippet TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_prompts_brand_id ON prompts(brand_id);
CREATE INDEX IF NOT EXISTS idx_prompts_stage ON prompts(stage);
CREATE INDEX IF NOT EXISTS idx_prompts_persona_id ON prompts(persona_id);

CREATE INDEX IF NOT EXISTS idx_responses_brand_id ON responses(brand_id);
CREATE INDEX IF NOT EXISTS idx_responses_prompt_id ON responses(prompt_id);
CREATE INDEX IF NOT EXISTS idx_responses_platform ON responses(platform);
CREATE INDEX IF NOT EXISTS idx_responses_created_at ON responses(created_at);
CREATE INDEX IF NOT EXISTS idx_responses_stage ON responses(stage);

CREATE INDEX IF NOT EXISTS idx_citations_response_id ON citations(response_id);
CREATE INDEX IF NOT EXISTS idx_citations_domain ON citations(domain);

-- Enable Row Level Security (RLS) if needed
-- ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE responses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE citations ENABLE ROW LEVEL SECURITY;

