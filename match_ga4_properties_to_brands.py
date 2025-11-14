"""
Match GA4 properties to brands and update the brands table
Matches by brand name or website URL
"""
import sys
import os
import requests
import asyncio

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.supabase_service import SupabaseService
from app.services.ga4_client import GA4APIClient

API_BASE = "http://localhost:8000/api/v1"

async def get_ga4_properties():
    """Get all GA4 properties from the API"""
    try:
        # Use the API endpoint to get properties
        response = requests.get(f"{API_BASE}/data/ga4/properties", timeout=30)
        if response.status_code == 200:
            data = response.json()
            # The API might return properties directly or in a nested structure
            if isinstance(data, list):
                return data
            elif isinstance(data, dict):
                # Try different possible keys
                return data.get("properties", data.get("items", []))
            else:
                return []
        else:
            print(f"[ERROR] Failed to get GA4 properties: {response.status_code}")
            print(f"   Response: {response.text}")
            return []
    except requests.exceptions.ConnectionError:
        print(f"[ERROR] Cannot connect to API server at {API_BASE}")
        print(f"   Make sure the server is running: uvicorn app.main:app --reload")
        return []
    except Exception as e:
        print(f"[ERROR] Failed to get GA4 properties: {e}")
        return []

def get_brands_from_db():
    """Get all brands from database"""
    try:
        supabase = SupabaseService()
        result = supabase.client.table("brands").select("*").execute()
        return result.data if result.data else []
    except Exception as e:
        print(f"[ERROR] Failed to get brands: {e}")
        return []

def extract_domain(url):
    """Extract domain from URL"""
    if not url:
        return ""
    url = url.lower().strip()
    # Remove protocol
    url = url.replace("https://", "").replace("http://", "")
    # Remove www.
    url = url.replace("www.", "")
    # Remove path and query
    url = url.split("/")[0].split("?")[0]
    # Remove port if present
    url = url.split(":")[0]
    return url

def normalize_domain(domain):
    """Normalize domain for comparison"""
    if not domain:
        return ""
    return domain.lower().strip().replace(" ", "").replace("-", "").replace("_", "").replace(".", "")

def match_property_to_brand(property_data, brand):
    """Try to match a GA4 property to a brand by URL - STRICT MATCHING ONLY"""
    property_id = property_data.get("propertyId", "")
    property_name = property_data.get("propertyDisplayName", property_data.get("displayName", "")).lower()
    
    brand_website = brand.get("website", "").lower()
    
    if not brand_website:
        return False, None
    
    # Extract domain from brand website
    brand_domain = extract_domain(brand_website)
    norm_brand_domain = normalize_domain(brand_domain)
    
    if not norm_brand_domain:
        return False, None
    
    # Extract domain from property name (property name might be the domain)
    property_domain = extract_domain(property_name)
    norm_property_domain = normalize_domain(property_domain)
    
    # STRICT MATCH: Only match if domains are the same
    if norm_brand_domain and norm_property_domain:
        if norm_brand_domain == norm_property_domain:
            return True, f"exact domain match: {brand_domain}"
    
    # Also check if property name contains the brand domain (without normalization for better matching)
    if brand_domain and property_name:
        # Check if brand domain appears in property name
        if brand_domain in property_name or property_name in brand_domain:
            return True, f"domain found in property name: {brand_domain}"
    
    return False, None

def update_brand_ga4_property(brand_id, property_id, match_reason):
    """Update brand with GA4 property ID"""
    try:
        supabase = SupabaseService()
        result = supabase.client.table("brands").update({
            "ga4_property_id": property_id
        }).eq("id", brand_id).execute()
        
        if result.data:
            print(f"  [OK] Updated brand {brand_id} with property {property_id} ({match_reason})")
            return True
        else:
            print(f"  [WARNING] No rows updated for brand {brand_id}")
            return False
    except Exception as e:
        print(f"  [ERROR] Failed to update brand {brand_id}: {e}")
        return False

async def match_and_update():
    """Match GA4 properties to brands and update database"""
    print("=" * 70)
    print("GA4 Property to Brand Matching")
    print("=" * 70)
    print()
    
    # Get GA4 properties
    print("Step 1: Fetching GA4 properties...")
    properties = await get_ga4_properties()
    
    if not properties:
        print("  [ERROR] No GA4 properties found or failed to fetch")
        print("  Make sure your GA4 credentials are configured correctly")
        return False
    
    print(f"  [OK] Found {len(properties)} GA4 property(ies)")
    for prop in properties:
        prop_name = prop.get('propertyDisplayName', prop.get('displayName', 'N/A'))
        print(f"    - {prop_name} (ID: {prop.get('propertyId', 'N/A')})")
    print()
    
    # Get brands
    print("Step 2: Fetching brands from database...")
    brands = get_brands_from_db()
    
    if not brands:
        print("  [ERROR] No brands found in database")
        return False
    
    print(f"  [OK] Found {len(brands)} brand(s)")
    print()
    
    # Match properties to brands
    print("Step 3: Matching properties to brands...")
    print("-" * 70)
    
    matches_found = 0
    updates_made = 0
    
    for brand in brands:
        brand_id = brand.get("id")
        brand_name = brand.get("name", "N/A")
        brand_website = brand.get("website", "N/A")
        current_property_id = brand.get("ga4_property_id")
        
        print(f"\nBrand: {brand_name} (ID: {brand_id})")
        print(f"  Website: {brand_website}")
        
        if current_property_id:
            print(f"  Current GA4 Property ID: {current_property_id} [ALREADY CONFIGURED]")
            continue
        
        best_match = None
        best_reason = None
        
        # Try to find a match - check all properties
        for property_data in properties:
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
            print(f"  [MATCH] Found: {property_name} (ID: {property_id}) - {best_reason}")
            
            # Ask for confirmation (or auto-update)
            update_brand_ga4_property(brand_id, property_id, best_reason)
            matches_found += 1
            updates_made += 1
        else:
            print(f"  [NO MATCH] No matching GA4 property found")
            print(f"    You may need to manually set the GA4 Property ID")
    
    print()
    print("=" * 70)
    print("Matching Summary")
    print("=" * 70)
    print(f"Brands checked: {len(brands)}")
    print(f"Matches found: {matches_found}")
    print(f"Updates made: {updates_made}")
    print()
    
    if updates_made > 0:
        print("[SUCCESS] Brands updated with GA4 Property IDs!")
        print("You can now run: python sync_ga4_data.py")
    else:
        print("[INFO] No automatic matches found.")
        print("You may need to manually configure GA4 Property IDs in Supabase.")
    
    return True

if __name__ == "__main__":
    print()
    print("NOTE: Make sure your FastAPI server is running!")
    print("Start it with: uvicorn app.main:app --reload")
    print()
    import time
    time.sleep(1)
    
    success = asyncio.run(match_and_update())
    sys.exit(0 if success else 1)

