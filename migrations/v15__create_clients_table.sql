-- =====================================================
-- Clients Table
-- Stores client information from Agency Analytics campaigns
-- Each company from a campaign becomes a client
-- Used for whitelabeling reports
-- =====================================================
-- Run this in your Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS clients (
    id SERIAL PRIMARY KEY,
    
    -- Basic company information (from Agency Analytics campaigns)
    company_name TEXT NOT NULL,
    company_id INTEGER,  -- From Agency Analytics company_id
    url TEXT,  -- Company website URL from campaign
    email_addresses TEXT[],  -- Contact emails
    phone_numbers TEXT[],  -- Contact phone numbers
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    country TEXT,
    timezone TEXT,
    
    -- URL slug for whitelabeling (UUID-based for security, e.g., "a1b2c3d4e5f6..." for /reports/{url_slug})
    url_slug TEXT UNIQUE,
    
    -- External system mappings
    ga4_property_id TEXT,  -- Google Analytics 4 Property ID mapping
    scrunch_brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,  -- Scrunch brand mapping
    
    -- Theme and branding for whitelabeling
    theme_color TEXT,  -- Primary brand color (hex code, e.g., "#FF5733")
    logo_url TEXT,  -- URL to client logo image
    secondary_color TEXT,  -- Secondary brand color (hex code)
    font_family TEXT,  -- Custom font family for reports
    favicon_url TEXT,  -- Favicon URL
    
    -- Additional whitelabeling attributes
    report_title TEXT,  -- Custom title for reports (e.g., "Acme Corp Analytics Dashboard")
    company_domain TEXT,  -- Primary domain for the client
    custom_css TEXT,  -- Custom CSS for whitelabeled reports
    footer_text TEXT,  -- Custom footer text for reports
    header_text TEXT,  -- Custom header text for reports
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT,  -- User who created the client
    updated_by TEXT,  -- User who last updated the client
    
    -- Constraints
    CONSTRAINT clients_url_slug_check CHECK (url_slug IS NULL OR (url_slug ~ '^[a-z0-9-]+$' AND length(url_slug) >= 32))
);

-- =====================================================
-- Client-Campaign Linking Table
-- Links clients to their Agency Analytics campaigns
-- =====================================================
CREATE TABLE IF NOT EXISTS client_campaigns (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    campaign_id INTEGER NOT NULL REFERENCES agency_analytics_campaigns(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT FALSE,  -- Primary campaign for this client
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(client_id, campaign_id)  -- Prevent duplicate links
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_company_name ON clients(company_name);
CREATE INDEX IF NOT EXISTS idx_clients_company_id ON clients(company_id);
CREATE INDEX IF NOT EXISTS idx_clients_url_slug ON clients(url_slug);
CREATE INDEX IF NOT EXISTS idx_clients_ga4_property_id ON clients(ga4_property_id);
CREATE INDEX IF NOT EXISTS idx_clients_scrunch_brand_id ON clients(scrunch_brand_id);
CREATE INDEX IF NOT EXISTS idx_clients_company_domain ON clients(company_domain);

-- Client-Campaign links indexes
CREATE INDEX IF NOT EXISTS idx_client_campaigns_client_id ON client_campaigns(client_id);
CREATE INDEX IF NOT EXISTS idx_client_campaigns_campaign_id ON client_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_client_campaigns_primary ON client_campaigns(client_id, is_primary) WHERE is_primary = TRUE;

-- =====================================================
-- FUNCTION TO GENERATE URL SLUG FROM UUID
-- Uses UUID for better security (harder to guess client URLs)
-- =====================================================
CREATE OR REPLACE FUNCTION generate_client_slug()
RETURNS TEXT AS $$
DECLARE
    slug TEXT;
    uuid_part TEXT;
BEGIN
    -- Generate a UUID and convert to lowercase, remove hyphens
    -- This creates a secure, unguessable slug
    uuid_part := replace(lower(gen_random_uuid()::TEXT), '-', '');
    
    -- Use the UUID as the slug (32 characters of hex)
    -- This is secure and unguessable
    slug := uuid_part;
    
    -- Extremely unlikely, but check if slug exists (should never happen with UUID)
    WHILE EXISTS (SELECT 1 FROM clients WHERE url_slug = slug) LOOP
        -- If somehow a collision occurs, generate a new UUID
        uuid_part := replace(lower(gen_random_uuid()::TEXT), '-', '');
        slug := uuid_part;
    END LOOP;
    
    RETURN slug;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER TO AUTO-GENERATE URL SLUG
-- =====================================================
CREATE OR REPLACE FUNCTION auto_generate_client_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate slug if not provided
    -- Uses UUID for secure, unguessable slugs
    IF NEW.url_slug IS NULL OR NEW.url_slug = '' THEN
        NEW.url_slug := generate_client_slug();
    END IF;
    
    -- Update updated_at timestamp
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_auto_generate_client_slug
    BEFORE INSERT OR UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_client_slug();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON TABLE clients IS 'Client entities created from Agency Analytics campaigns, used for whitelabeling reports';
COMMENT ON TABLE client_campaigns IS 'Links clients to their Agency Analytics campaigns (many-to-many relationship)';
COMMENT ON COLUMN clients.url_slug IS 'URL-friendly identifier for whitelabeled reports (UUID-based for security, e.g., /reports/{url_slug})';
COMMENT ON COLUMN clients.theme_color IS 'Primary brand color in hex format (e.g., #FF5733)';
COMMENT ON COLUMN clients.scrunch_brand_id IS 'Optional mapping to Scrunch brand for unified reporting';
COMMENT ON COLUMN clients.ga4_property_id IS 'Optional mapping to GA4 property for analytics integration';

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================
-- Clients table is ready for whitelabeling reports
-- =====================================================

