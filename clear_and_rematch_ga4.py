"""
Clear incorrectly assigned GA4 property IDs and re-match with strict URL matching
"""
import sys
import os
import requests
import asyncio

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.supabase_service import SupabaseService
from match_ga4_properties_to_brands import get_ga4_properties, get_brands_from_db, extract_domain, normalize_domain, match_property_to_brand

API_BASE = "http://localhost:8000/api/v1"

def clear_ga4_property_ids():
    """Clear all GA4 property IDs from brands"""
    try:
        supabase = SupabaseService()
        # Get all brands
        result = supabase.client.table("brands").select("id, name").execute()
        brands = result.data if result.data else []
        
        cleared = 0
        for brand in brands:
            brand_id = brand.get("id")
            # Set ga4_property_id to NULL
            update_result = supabase.client.table("brands").update({
                "ga4_property_id": None
            }).eq("id", brand_id).execute()
            
            if update_result.data:
                cleared += 1
                print(f"  [OK] Cleared GA4 property ID for brand {brand_id} ({brand.get('name', 'N/A')})")
        
        return cleared
    except Exception as e:
        print(f"[ERROR] Failed to clear property IDs: {e}")
        return 0

async def rematch_with_strict_matching():
    """Re-match GA4 properties to brands with strict URL matching"""
    print("=" * 70)
    print("Clear and Re-Match GA4 Properties (Strict URL Matching)")
    print("=" * 70)
    print()
    
    # Step 1: Clear existing property IDs
    print("Step 1: Clearing existing GA4 property IDs...")
    cleared = clear_ga4_property_ids()
    print(f"  [OK] Cleared {cleared} brand(s)")
    print()
    
    # Step 2: Get GA4 properties
    print("Step 2: Fetching GA4 properties...")
    properties = await get_ga4_properties()
    
    if not properties:
        print("  [ERROR] No GA4 properties found")
        return False
    
    print(f"  [OK] Found {len(properties)} GA4 property(ies)")
    for prop in properties:
        prop_name = prop.get('propertyDisplayName', prop.get('displayName', 'N/A'))
        prop_id = prop.get('propertyId', 'N/A')
        print(f"    - {prop_name} (ID: {prop_id})")
    print()
    
    # Step 3: Get brands
    print("Step 3: Fetching brands from database...")
    brands = get_brands_from_db()
    
    if not brands:
        print("  [ERROR] No brands found")
        return False
    
    print(f"  [OK] Found {len(brands)} brand(s)")
    print()
    
    # Step 4: Match with strict URL matching
    print("Step 4: Matching properties to brands (STRICT URL MATCHING ONLY)...")
    print("-" * 70)
    
    matches_found = 0
    updates_made = 0
    used_property_ids = set()  # Track which property IDs have been assigned
    
    for brand in brands:
        brand_id = brand.get("id")
        brand_name = brand.get("name", "N/A")
        brand_website = brand.get("website", "N/A")
        
        print(f"\nBrand: {brand_name} (ID: {brand_id})")
        print(f"  Website: {brand_website}")
        
        brand_domain = extract_domain(brand_website)
        print(f"  Domain: {brand_domain}")
        
        best_match = None
        best_reason = None
        
        # Try to find a match - check all properties
        for property_data in properties:
            property_id = property_data.get("propertyId")
            
            # Skip if this property ID is already assigned to another brand
            if property_id in used_property_ids:
                continue
            
            is_match, reason = match_property_to_brand(property_data, brand)
            if is_match:
                # Only use this match if we haven't found one yet, or if this is an exact domain match
                if not best_match or "exact domain match" in reason:
                    best_match = property_data
                    best_reason = reason
                    # If we have an exact match, use it immediately
                    if "exact domain match" in reason:
                        break
        
        if best_match:
            property_id = best_match.get("propertyId")
            property_name = best_match.get("propertyDisplayName", best_match.get("displayName", "N/A"))
            print(f"  [MATCH] Found: {property_name} (ID: {property_id})")
            print(f"  Reason: {best_reason}")
            
            # Update brand
            try:
                supabase = SupabaseService()
                result = supabase.client.table("brands").update({
                    "ga4_property_id": property_id
                }).eq("id", brand_id).execute()
                
                if result.data:
                    print(f"  [OK] Updated brand {brand_id} with property {property_id}")
                    used_property_ids.add(property_id)  # Mark as used
                    matches_found += 1
                    updates_made += 1
                else:
                    print(f"  [WARNING] Failed to update brand {brand_id}")
            except Exception as e:
                print(f"  [ERROR] Failed to update brand {brand_id}: {e}")
        else:
            print(f"  [NO MATCH] No matching GA4 property found for domain: {brand_domain}")
            print(f"    You may need to manually set the GA4 Property ID")
    
    print()
    print("=" * 70)
    print("Re-Matching Summary")
    print("=" * 70)
    print(f"Brands checked: {len(brands)}")
    print(f"Matches found: {matches_found}")
    print(f"Updates made: {updates_made}")
    print()
    
    if updates_made > 0:
        print("[SUCCESS] Brands updated with correct GA4 Property IDs!")
        print("You can now run: python sync_ga4_data.py")
    else:
        print("[INFO] No automatic matches found with strict URL matching.")
        print("You may need to manually configure GA4 Property IDs in Supabase.")
    
    return True

if __name__ == "__main__":
    print()
    print("NOTE: Make sure your FastAPI server is running!")
    print("Start it with: uvicorn app.main:app --reload")
    print()
    import time
    time.sleep(1)
    
    success = asyncio.run(rematch_with_strict_matching())
    sys.exit(0 if success else 1)

