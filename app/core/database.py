from supabase import create_client, Client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

supabase: Client = None

def get_supabase_client() -> Client:
    """Get or create Supabase client"""
    global supabase
    if supabase is None:
        url = settings.SUPABASE_URL or ""
        key = settings.SUPABASE_KEY or ""
        
        if not url or not key:
            error_msg = (
                f"Supabase URL and Key must be set. "
                f"URL: {'SET' if url else 'NOT SET'}, "
                f"KEY: {'SET' if key else 'NOT SET'}. "
                f"Please check your .env file or config.py"
            )
            logger.error(error_msg)
            raise ValueError(error_msg)
        
        supabase = create_client(url, key)
        logger.info("Supabase client initialized")
    return supabase

def init_db():
    """Initialize database tables if they don't exist"""
    # Note: Supabase tables should be created manually in Supabase dashboard
    # or via migrations. This function can be used to verify connection.
    try:
        client = get_supabase_client()
        logger.info("Database connection verified")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        raise

