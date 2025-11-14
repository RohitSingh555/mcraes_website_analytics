"""
Daily Sync Job - Runs at 12 AM IST
Syncs both Scrunch AI data and GA4 data automatically
"""
import sys
import os
import requests
import time
from datetime import datetime

# Add project root to path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

API_BASE = "http://localhost:8000/api/v1"

def sync_scrunch_data():
    """Sync Scrunch AI data (brands, prompts, responses)"""
    print("=" * 70)
    print("Syncing Scrunch AI Data")
    print("=" * 70)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    try:
        # Sync all Scrunch AI data
        response = requests.post(f"{API_BASE}/sync/all", timeout=1800)  # 30 min timeout
        
        if response.status_code == 200:
            data = response.json()
            summary = data.get("summary", {})
            print("[SUCCESS] Scrunch AI sync completed")
            print(f"  Brands: {summary.get('brands', 0)}")
            print(f"  Prompts: {summary.get('total_prompts', 0)}")
            print(f"  Responses: {summary.get('total_responses', 0)}")
            return True
        else:
            print(f"[ERROR] Scrunch AI sync failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("[ERROR] Cannot connect to API server")
        print("  Make sure the server is running: uvicorn app.main:app --reload")
        return False
    except Exception as e:
        print(f"[ERROR] Scrunch AI sync error: {e}")
        return False

def sync_ga4_data():
    """Sync GA4 data for all brands with GA4 configured"""
    print()
    print("=" * 70)
    print("Syncing GA4 Data")
    print("=" * 70)
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    try:
        # Sync GA4 data (last 30 days, skip realtime to avoid errors)
        response = requests.post(
            f"{API_BASE}/sync/ga4",
            params={"sync_realtime": False},  # Skip realtime to avoid API errors
            timeout=1800  # 30 min timeout
        )
        
        if response.status_code == 200:
            data = response.json()
            total_synced = data.get("total_synced", {})
            print("[SUCCESS] GA4 sync completed")
            print(f"  Brands synced: {total_synced.get('brands', 0)}")
            print(f"  Traffic overview: {total_synced.get('traffic_overview', 0)}")
            print(f"  Top pages: {total_synced.get('top_pages', 0)}")
            print(f"  Traffic sources: {total_synced.get('traffic_sources', 0)}")
            print(f"  Geographic: {total_synced.get('geographic', 0)}")
            print(f"  Devices: {total_synced.get('devices', 0)}")
            print(f"  Conversions: {total_synced.get('conversions', 0)}")
            return True
        else:
            print(f"[ERROR] GA4 sync failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print("[ERROR] Cannot connect to API server")
        return False
    except Exception as e:
        print(f"[ERROR] GA4 sync error: {e}")
        return False

def generate_ga4_token():
    """Generate GA4 access token (needed daily)"""
    print()
    print("=" * 70)
    print("Generating GA4 Access Token")
    print("=" * 70)
    print()
    
    try:
        # Import and run token generator
        import subprocess
        import sys
        
        result = subprocess.run(
            [sys.executable, "generate_ga4_token.py"],
            capture_output=True,
            text=True,
            timeout=60,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        
        if result.returncode == 0:
            print("[SUCCESS] GA4 token generated/verified")
            if result.stdout:
                # Print only key lines from output
                for line in result.stdout.split('\n'):
                    if 'SUCCESS' in line or 'Token' in line or 'token' in line.lower():
                        print(f"  {line}")
            return True
        else:
            print("[WARNING] Failed to generate GA4 token")
            if result.stderr:
                print(f"  Error: {result.stderr}")
            return False
    except Exception as e:
        print(f"[ERROR] Token generation error: {e}")
        return False

def main():
    """Main sync job - runs all syncs"""
    print()
    print("=" * 70)
    print("Daily Sync Job - Started")
    print("=" * 70)
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S IST')}")
    print()
    
    results = {
        "scrunch": False,
        "ga4_token": False,
        "ga4_data": False
    }
    
    # Step 1: Generate GA4 token first (needed for GA4 API calls)
    results["ga4_token"] = generate_ga4_token()
    
    # Step 2: Sync Scrunch AI data
    results["scrunch"] = sync_scrunch_data()
    
    # Step 3: Sync GA4 data
    results["ga4_data"] = sync_ga4_data()
    
    # Summary
    print()
    print("=" * 70)
    print("Daily Sync Job - Summary")
    print("=" * 70)
    print(f"Scrunch AI Sync: {'SUCCESS' if results['scrunch'] else 'FAILED'}")
    print(f"GA4 Token: {'SUCCESS' if results['ga4_token'] else 'FAILED'}")
    print(f"GA4 Data Sync: {'SUCCESS' if results['ga4_data'] else 'FAILED'}")
    print()
    
    if all(results.values()):
        print("[SUCCESS] All syncs completed successfully!")
        return 0
    else:
        print("[WARNING] Some syncs failed. Check logs above.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)

