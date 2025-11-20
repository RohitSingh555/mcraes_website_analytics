-- Migration: Add automatic slug generation trigger for brands table
-- Run this in your Supabase SQL Editor AFTER running add_brand_slug_migration.sql

-- Create trigger function that automatically generates slug when brand is inserted or updated
CREATE OR REPLACE FUNCTION generate_brand_slug()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate slug if it's NULL or empty
  -- This allows manual override of slugs if needed
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    -- Generate slug from brand name
    NEW.slug := generate_slug(COALESCE(NEW.name, 'brand-' || NEW.id::TEXT));
    
    -- Ensure uniqueness by appending number if slug already exists
    -- This handles cases where multiple brands have the same name
    DECLARE
      base_slug TEXT := NEW.slug;
      counter INTEGER := 1;
      final_slug TEXT;
    BEGIN
      final_slug := base_slug;
      
      -- Check if slug already exists (excluding current row for updates)
      WHILE EXISTS (
        SELECT 1 FROM brands 
        WHERE slug = final_slug 
        AND (TG_OP = 'INSERT' OR id != NEW.id)
      ) LOOP
        final_slug := base_slug || '-' || counter;
        counter := counter + 1;
      END LOOP;
      
      NEW.slug := final_slug;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires BEFORE INSERT or UPDATE
CREATE TRIGGER trigger_generate_brand_slug
  BEFORE INSERT OR UPDATE ON brands
  FOR EACH ROW
  EXECUTE FUNCTION generate_brand_slug();

-- Comment
COMMENT ON FUNCTION generate_brand_slug() IS 'Automatically generates URL-friendly slug from brand name when brand is created or updated';
COMMENT ON TRIGGER trigger_generate_brand_slug ON brands IS 'Automatically generates slug before insert/update if slug is NULL or empty';

-- Optional: Generate slugs for existing brands that don't have one
-- Uncomment the following if you want to backfill slugs for existing brands:
/*
UPDATE brands
SET slug = generate_slug(COALESCE(name, 'brand-' || id::TEXT))
WHERE slug IS NULL OR slug = '';

-- Handle duplicates by appending numbers
DO $$
DECLARE
  brand_record RECORD;
  base_slug TEXT;
  counter INTEGER;
  final_slug TEXT;
BEGIN
  FOR brand_record IN 
    SELECT id, name, slug FROM brands WHERE slug IS NOT NULL AND slug != ''
  LOOP
    base_slug := brand_record.slug;
    counter := 1;
    final_slug := base_slug;
    
    -- Check for duplicates
    WHILE EXISTS (
      SELECT 1 FROM brands 
      WHERE slug = final_slug AND id != brand_record.id
    ) LOOP
      final_slug := base_slug || '-' || counter;
      counter := counter + 1;
    END LOOP;
    
    -- Update if slug changed
    IF final_slug != brand_record.slug THEN
      UPDATE brands SET slug = final_slug WHERE id = brand_record.id;
    END IF;
  END LOOP;
END $$;
*/

