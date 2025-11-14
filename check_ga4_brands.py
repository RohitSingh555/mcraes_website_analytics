"""
Check which brands have GA4 property IDs configured
"""
import sys
import os
import requests

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

API_BASE = "http://localhost:8000/api/v1"

def check_brands():
    """Check brands and their GA4 configuration"""
    print("=" * 70)
    print("Checking Brands with GA4 Configuration")
    print("=" * 70)
    print()
    
    try:
        # Get brands with GA4
        response = requests.get(f"{API_BASE}/data/ga4/brands-with-ga4", timeout=10)
        if response.status_code == 200:
            data = response.json()
            brands = data.get("brands", [])
            
            if brands:
                print(f"Found {len(brands)} brand(s) with GA4 configured:")
                print("-" * 70)
                for brand in brands:
                    print(f"  Brand ID: {brand.get('id')}")
                    print(f"  Name: {brand.get('name', 'N/A')}")
                    print(f"  Website: {brand.get('website', 'N/A')}")
                    print(f"  GA4 Property ID: {brand.get('ga4_property_id', 'N/A')}")
                    print()
                return True
            else:
                print("No brands with GA4 property IDs configured.")
                print()
                print("To configure GA4 for a brand, update the brands table in Supabase:")
                print("  UPDATE brands SET ga4_property_id = 'YOUR_PROPERTY_ID' WHERE id = YOUR_BRAND_ID;")
                print()
                return False
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
    check_brands()

