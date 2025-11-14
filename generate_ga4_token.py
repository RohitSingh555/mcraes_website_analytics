"""
Generate and store GA4 access token daily
This script should be run daily (via cron/scheduler) to refresh the token
"""
import os
import json
import time
import requests
import jwt  # PyJWT
import sys
from datetime import datetime, timedelta
from app.core.config import settings

# === CONFIGURATION ===
# Get key file path from settings or environment variable
KEY_FILE = settings.GA4_CREDENTIALS_PATH or os.getenv("GA4_CREDENTIALS_PATH") or "service-key.json"
TOKEN_FILE = "ga4_token.json"  # Local file backup
SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]

# Debug: Print what path we're using
if __name__ == "__main__":
    print(f"[DEBUG] Looking for service key at: {KEY_FILE}")
    print(f"[DEBUG] File exists: {os.path.exists(KEY_FILE)}")
    if settings.GA4_CREDENTIALS_PATH:
        print(f"[DEBUG] GA4_CREDENTIALS_PATH from settings: {settings.GA4_CREDENTIALS_PATH}")
    if os.getenv("GA4_CREDENTIALS_PATH"):
        print(f"[DEBUG] GA4_CREDENTIALS_PATH from env: {os.getenv('GA4_CREDENTIALS_PATH')}")

def get_cached_token_from_file():
    """Return cached token from file if valid, else None."""
    if not os.path.exists(TOKEN_FILE):
        return None
    try:
        with open(TOKEN_FILE, "r") as f:
            data = json.load(f)
        if data.get("expires_at", 0) > time.time():
            print("[OK] Using cached access token from file.")
            return data.get("access_token")
    except Exception as e:
        print(f"[WARNING] Failed reading cached token from file: {e}")
    return None

def get_cached_token_from_db():
    """Return cached token from database if valid, else None."""
    try:
        from app.services.supabase_service import SupabaseService
        supabase = SupabaseService()
        
        # Get the most recent valid token
        result = supabase.client.table("ga4_tokens").select("*").order("expires_at", desc=True).limit(1).execute()
        
        if result.data:
            token_data = result.data[0]
            expires_at = token_data.get("expires_at")
            
            # Check if token is still valid (with 5 minute buffer)
            if expires_at and expires_at > (time.time() + 300):
                print("[OK] Using cached access token from database.")
                return token_data.get("access_token")
    except Exception as e:
        # Table might not exist yet, that's OK
        error_msg = str(e)
        if "ga4_tokens" in error_msg.lower() or "table" in error_msg.lower():
            print("[INFO] Token table not found - will create on first token generation.")
        else:
            print(f"[WARNING] Failed reading cached token from database: {error_msg}")
    return None

def save_token_to_file(token, expires_at):
    """Save token to local file."""
    data = {
        "access_token": token,
        "expires_at": expires_at,
        "generated_at": time.time()
    }
    with open(TOKEN_FILE, "w") as f:
        json.dump(data, f, indent=2)
    print(f"[OK] Saved access token to {TOKEN_FILE}")

def save_token_to_db(token, expires_at):
    """Save token to database."""
    try:
        from app.services.supabase_service import SupabaseService
        supabase = SupabaseService()
        
        # Insert new token (old ones will remain for history)
        # Convert timestamps to integers (bigint in database)
        record = {
            "access_token": token,
            "expires_at": int(expires_at),  # Convert to int for bigint column
            "generated_at": int(time.time()),  # Convert to int for bigint column
            "created_at": datetime.now().isoformat()
        }
        
        result = supabase.client.table("ga4_tokens").insert(record).execute()
        print("[OK] Saved access token to database")
        return True
    except Exception as e:
        error_msg = str(e)
        if "ga4_tokens" in error_msg.lower() or "table" in error_msg.lower():
            print("[INFO] Token table not found - please run ga4_token_table.sql in Supabase")
        else:
            print(f"[WARNING] Failed saving token to database: {error_msg}")
        return False

def generate_new_token():
    """Create signed JWT and exchange for a new access token."""
    print("[INFO] Requesting new access token from Google...")
    
    # Check if file exists (try both absolute and relative paths)
    key_file_path = KEY_FILE
    if not os.path.isabs(key_file_path):
        # Try relative to current directory
        if not os.path.isfile(key_file_path):
            # Try relative to script directory
            script_dir = os.path.dirname(os.path.abspath(__file__))
            key_file_path = os.path.join(script_dir, key_file_path)
    
    # Load service account key
    if not os.path.isfile(key_file_path):
        print(f"[ERROR] Service key not found!")
        print(f"   Configured path: {KEY_FILE}")
        print(f"   Tried absolute: {os.path.abspath(KEY_FILE)}")
        print(f"   Tried relative: {key_file_path}")
        print()
        print(f"   To fix this:")
        print(f"   1. Get your GA4 service account JSON file from Google Cloud Console")
        print(f"   2. Set GA4_CREDENTIALS_PATH in .env file to the full path, e.g.:")
        print(f"      GA4_CREDENTIALS_PATH=C:\\Users\\DAY\\path\\to\\your-service-account.json")
        print(f"   3. Or place the file as 'service-key.json' in the project root")
        print(f"   4. Make sure the path uses forward slashes or escaped backslashes")
        return None
    
    # Use the found path
    actual_key_file = key_file_path
    print(f"[INFO] Using service key file: {actual_key_file}")
    
    with open(actual_key_file, "r") as f:
        info = json.load(f)
    
    private_key = info["private_key"]
    client_email = info["client_email"]
    token_uri = info["token_uri"]
    
    # Create JWT
    now = int(time.time())
    payload = {
        "iss": client_email,
        "scope": " ".join(SCOPES),
        "aud": token_uri,
        "iat": now,
        "exp": now + 3600,
    }
    
    signed_jwt = jwt.encode(payload, private_key, algorithm="RS256")
    
    # Exchange JWT for access token
    data = {
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": signed_jwt,
    }
    
    resp = requests.post(token_uri, data=data)
    if resp.status_code != 200:
        print(f"[ERROR] Token request failed: {resp.status_code}")
        print(f"   Response: {resp.text}")
        return None
    
    token_data = resp.json()
    access_token = token_data["access_token"]
    expires_in = token_data.get("expires_in", 3600)
    expires_at = time.time() + expires_in - 300  # 5 minute buffer
    
    # Save to file first (always works)
    save_token_to_file(access_token, expires_at)
    
    # Try to save to database (may fail if table doesn't exist)
    save_token_to_db(access_token, expires_at)
    
    return access_token

def get_access_token():
    """Get access token from cache or generate new one."""
    # Try database first
    token = get_cached_token_from_db()
    if token:
        return token
    
    # Try file
    token = get_cached_token_from_file()
    if token:
        return token
    
    # Generate new token
    token = generate_new_token()
    return token

def main():
    """Main function to generate and store token."""
    print("=" * 70)
    print("GA4 Access Token Generator")
    print("=" * 70)
    print()
    
    access_token = get_access_token()
    
    if access_token:
        print("\n[SUCCESS] Access token generated successfully!")
        print(f"[OK] Token (first 40 chars): {access_token[:40]}...")
        
        # Show expiry
        try:
            with open(TOKEN_FILE, "r") as f:
                data = json.load(f)
                expires_at = data.get("expires_at", 0)
                if expires_at:
                    expiry_time = datetime.fromtimestamp(expires_at)
                    print(f"[INFO] Token valid until: {expiry_time.strftime('%Y-%m-%d %H:%M:%S')}")
        except:
            pass
        
        print("\n[SUCCESS] Token is ready to use!")
        print("   The GA4 client will automatically use this token.")
        print("\n[NOTE] Remember to run this script daily to refresh the token!")
        return True
    else:
        print("\n[ERROR] Failed to generate access token")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

