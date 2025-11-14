"""
GA4 Token Service
Manages GA4 access tokens from database and file
"""
import os
import json
import time
import logging
from typing import Optional
from app.services.supabase_service import SupabaseService

logger = logging.getLogger(__name__)

class GA4TokenService:
    """Service for managing GA4 access tokens"""
    
    TOKEN_FILE = "ga4_token.json"
    
    @staticmethod
    def get_token_from_file() -> Optional[str]:
        """Get token from local file if valid"""
        if not os.path.exists(GA4TokenService.TOKEN_FILE):
            return None
        
        try:
            with open(GA4TokenService.TOKEN_FILE, "r") as f:
                data = json.load(f)
            expires_at = data.get("expires_at", 0)
            if expires_at > time.time():
                logger.debug("Using cached token from file")
                return data.get("access_token")
        except Exception as e:
            logger.warning(f"Failed to read token from file: {e}")
        
        return None
    
    @staticmethod
    def get_token_from_db() -> Optional[str]:
        """Get token from database if valid"""
        try:
            supabase = SupabaseService()
            result = supabase.client.table("ga4_tokens").select("*").order("expires_at", desc=True).limit(1).execute()
            
            if result.data:
                token_data = result.data[0]
                expires_at = token_data.get("expires_at", 0)
                
                # Check if token is still valid (with 5 minute buffer)
                if expires_at and expires_at > (time.time() + 300):
                    logger.debug("Using cached token from database")
                    return token_data.get("access_token")
        except Exception as e:
            logger.warning(f"Failed to read token from database: {e}")
        
        return None
    
    @staticmethod
    def get_access_token() -> Optional[str]:
        """Get access token from database or file (in that order)"""
        # Try database first
        token = GA4TokenService.get_token_from_db()
        if token:
            return token
        
        # Try file
        token = GA4TokenService.get_token_from_file()
        if token:
            return token
        
        logger.warning("No valid access token found. Run generate_ga4_token.py to generate one.")
        return None

