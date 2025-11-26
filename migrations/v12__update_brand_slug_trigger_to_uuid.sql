-- Migration: Update brand slug trigger to generate UUID instead of name-based slug
-- Run this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled (required for gen_random_uuid())
-- Note: Supabase usually has this enabled by default, but this ensures it's available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop the existing trigger
DROP TRIGGER IF EXISTS trigger_generate_brand_slug ON brands;

-- Update the trigger function to generate UUID instead of name-based slug
CREATE OR REPLACE FUNCTION generate_brand_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate slug if it's NULL or empty
  -- This allows manual override of slugs if needed
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Generate UUID as slug
    -- gen_random_uuid() generates a UUID v4 (random UUID)
    NEW.slug := gen_random_uuid()::TEXT;
    
    -- UUIDs are unique by nature, but we'll add a safety check just in case
    -- (extremely rare edge case)
    WHILE EXISTS (
      SELECT 1 FROM brands 
      WHERE slug = NEW.slug 
      AND (TG_OP = 'INSERT' OR id != NEW.id)
    ) LOOP
      -- Regenerate UUID if collision (should never happen, but safety first)
      NEW.slug := gen_random_uuid()::TEXT;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger that fires BEFORE INSERT or UPDATE
CREATE TRIGGER trigger_generate_brand_slug
  BEFORE INSERT OR UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION generate_brand_slug();

-- Update comments
COMMENT ON FUNCTION generate_brand_slug() IS 'Automatically generates UUID as slug when brand is created or updated';
COMMENT ON TRIGGER trigger_generate_brand_slug ON brands IS 'Automatically generates UUID slug before insert/update if slug is NULL or empty';

-- Optional: Update existing brands that have name-based slugs to UUIDs
-- Uncomment the following if you want to regenerate slugs for existing brands:
/*
UPDATE brands
SET slug = gen_random_uuid()::TEXT
WHERE slug IS NULL OR slug = '';

-- Handle any potential duplicates (shouldn't happen with UUIDs, but safety check)
DO $$
DECLARE
  brand_record RECORD;
  new_slug TEXT;
BEGIN
  FOR brand_record IN 
    SELECT id, slug FROM brands WHERE slug IS NOT NULL AND slug != ''
  LOOP
    -- Check if slug is not a valid UUID format (contains hyphens in wrong places or wrong length)
    -- UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (36 characters with hyphens)
    IF length(brand_record.slug) != 36 OR brand_record.slug !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      new_slug := gen_random_uuid()::TEXT;
      
      -- Ensure uniqueness
      WHILE EXISTS (
        SELECT 1 FROM brands 
        WHERE slug = new_slug AND id != brand_record.id
      ) LOOP
        new_slug := gen_random_uuid()::TEXT;
      END LOOP;
      
      UPDATE brands SET slug = new_slug WHERE id = brand_record.id;
    END IF;
  END LOOP;
END $$;
*/

