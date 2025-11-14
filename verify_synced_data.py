"""
Verify synced data and check brand_id is properly assigned
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.services.supabase_service import SupabaseService
from collections import Counter

def verify_data():
    """Verify all data is properly synced"""
    print("=" * 70)
    print("Verifying Synced Data")
    print("=" * 70)
    print()
    
    try:
        supabase = SupabaseService()
        
        # Get brands
        brands_result = supabase.client.table("brands").select("id, name").execute()
        brands = brands_result.data if hasattr(brands_result, 'data') else []
        
        print(f"Brands in database: {len(brands)}")
        for brand in brands:
            print(f"  - ID: {brand.get('id')}, Name: {brand.get('name')}")
            print(f"    URL: /brands/{brand.get('id')}")
        print()
        
        # Get prompts by brand
        prompts_result = supabase.client.table("prompts").select("id, brand_id").execute()
        prompts = prompts_result.data if hasattr(prompts_result, 'data') else []
        
        prompts_by_brand = Counter(p.get("brand_id") for p in prompts if p.get("brand_id"))
        prompts_no_brand = sum(1 for p in prompts if not p.get("brand_id"))
        
        print(f"Total prompts: {len(prompts)}")
        print(f"  Prompts with brand_id: {len(prompts) - prompts_no_brand}")
        print(f"  Prompts without brand_id: {prompts_no_brand}")
        print()
        print("Prompts by brand:")
        for brand_id, count in sorted(prompts_by_brand.items()):
            brand_name = next((b.get("name") for b in brands if b.get("id") == brand_id), f"Brand {brand_id}")
            print(f"  - {brand_name} (ID: {brand_id}): {count} prompts")
        print()
        
        # Get responses by brand
        responses_result = supabase.client.table("responses").select("id, brand_id").execute()
        responses = responses_result.data if hasattr(responses_result, 'data') else []
        
        responses_by_brand = Counter(r.get("brand_id") for r in responses if r.get("brand_id"))
        responses_no_brand = sum(1 for r in responses if not r.get("brand_id"))
        
        print(f"Total responses: {len(responses)}")
        print(f"  Responses with brand_id: {len(responses) - responses_no_brand}")
        print(f"  Responses without brand_id: {responses_no_brand}")
        print()
        print("Responses by brand:")
        for brand_id, count in sorted(responses_by_brand.items()):
            brand_name = next((b.get("name") for b in brands if b.get("id") == brand_id), f"Brand {brand_id}")
            print(f"  - {brand_name} (ID: {brand_id}): {count} responses")
        print()
        
        print("=" * 70)
        if prompts_no_brand == 0 and responses_no_brand == 0:
            print("[OK] All data properly synced with brand_id!")
        else:
            print("[WARNING] Some records missing brand_id")
            print(f"  - Run migration script to fix")
        print()
        print("Unique URLs for each brand:")
        for brand in brands:
            print(f"  - {brand.get('name')}: http://localhost:5173/brands/{brand.get('id')}")
        print("=" * 70)
        
        return True
        
    except Exception as e:
        print(f"[ERROR] Verification failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    verify_data()

