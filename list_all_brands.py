"""
List all brands and their GA4 configuration status
"""
import sys
import os
import requests

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

API_BASE = "http://localhost:8000/api/v1"

def list_all_brands():
    """List all brands and show GA4 configuration status"""
    print("=" * 70)
    print("All Brands in Database")
    print("=" * 70)
    print()
    
    try:
        # Get all brands
        response = requests.get(f"{API_BASE}/data/brands?limit=1000", timeout=10)
        if response.status_code == 200:
            data = response.json()
            brands = data.get("items", [])
            
            if not brands:
                print("No brands found in database.")
                print()
                print("To add brands, sync from Scrunch AI:")
                print("  POST /api/v1/sync/brands")
                return
            
            print(f"Found {len(brands)} brand(s):")
            print("-" * 70)
            
            brands_with_ga4 = []
            brands_without_ga4 = []
            
            for brand in brands:
                brand_id = brand.get("id")
                brand_name = brand.get("name", "N/A")
                website = brand.get("website", "N/A")
                ga4_property_id = brand.get("ga4_property_id")
                
                print(f"  Brand ID: {brand_id}")
                print(f"  Name: {brand_name}")
                print(f"  Website: {website}")
                
                if ga4_property_id:
                    print(f"  GA4 Property ID: {ga4_property_id} [CONFIGURED]")
                    brands_with_ga4.append(brand)
                else:
                    print(f"  GA4 Property ID: Not configured [NOT CONFIGURED]")
                    brands_without_ga4.append(brand)
                print()
            
            # Summary
            print("=" * 70)
            print("Summary")
            print("=" * 70)
            print(f"Total brands: {len(brands)}")
            print(f"Brands with GA4 configured: {len(brands_with_ga4)}")
            print(f"Brands without GA4 configured: {len(brands_without_ga4)}")
            print()
            
            if brands_without_ga4:
                print("To configure GA4 for brands, run this SQL in Supabase:")
                print("-" * 70)
                for brand in brands_without_ga4:
                    brand_id = brand.get("id")
                    brand_name = brand.get("name", f"Brand {brand_id}")
                    print(f"-- Configure GA4 for {brand_name} (ID: {brand_id})")
                    print(f"UPDATE brands SET ga4_property_id = 'YOUR_GA4_PROPERTY_ID' WHERE id = {brand_id};")
                    print()
                print("-" * 70)
                print()
                print("After configuring GA4 property IDs, run:")
                print("  python sync_ga4_data.py")
            else:
                print("All brands have GA4 configured!")
                print()
                print("You can now sync GA4 data:")
                print("  python sync_ga4_data.py")
            
            return True
        else:
            print(f"Error: {response.status_code}")
            print(response.text)
            return False
    except requests.exceptions.ConnectionError:
        print("Cannot connect to API server")
        print("Please start the server first: uvicorn app.main:app --reload")
        return False
    except Exception as e:
        print(f"Error: {e}")
        return False

if __name__ == "__main__":
    list_all_brands()

