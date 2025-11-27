from pydantic_settings import BaseSettings
from typing import Optional
from urllib.parse import quote_plus

class Settings(BaseSettings):
    # FastAPI Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # Scrunch AI API Settings
    SCRUNCH_API_BASE_URL: str = "https://api.scrunchai.com/v1"
    SCRUNCH_API_TOKEN: Optional[str] = None  # Must be set via .env file
    BRAND_ID: int = 3230
    
    # Agency Analytics API Settings
    AGENCY_ANALYTICS_API_KEY: Optional[str] = None  # Can be overridden via .env
    
    # OpenAI API Settings
    OPENAI_API_KEY: Optional[str] = None  # Can be overridden via .env
    
    # Google Analytics 4 API Settings
    GA4_CREDENTIALS_PATH: Optional[str] = None  # Path to service account JSON file
    GA4_SCOPES: list = ["https://www.googleapis.com/auth/analytics.readonly"]
    
    # Supabase Settings (REST API)
    # These must be set via environment variables (.env file)
    SUPABASE_URL: Optional[str] = None  # Must be set via .env file
    SUPABASE_KEY: Optional[str] = None  # Must be set via .env file (anon key)
    # Note: Supabase JWT token expiration duration is configured in Supabase Dashboard
    # Go to: Authentication → Settings → JWT expiry time (default is 3600 seconds / 1 hour)
    
    # Supabase Database Settings
    # Note: Direct connection (db.xxx.supabase.co) is IPv6-only and may not work on Windows
    # Use Session Pooler for IPv4 compatibility: aws-0-<region>.pooler.supabase.com
    # Session Pooler (IPv4 compatible): Port 5432 for session mode
    # Transaction Pooler: Port 6543 for transaction mode
    # Check Supabase dashboard → Settings → Database → Connection Pooling for exact hostname
    SUPABASE_DB_HOST: Optional[str] = None  # Must be set via .env file
    SUPABASE_DB_PORT: int = 5432
    # Session Pooler format: aws-0-<region>.pooler.supabase.com:5432 (check your dashboard)
    SUPABASE_DB_NAME: str = "postgres"
    SUPABASE_DB_USER: str = "postgres"
    SUPABASE_DB_PASSWORD: Optional[str] = None  # Must be set via .env file
    
    # For deployment: Use SUPABASE_DB_URL if provided (Railway/Render)
    SUPABASE_DB_URL: Optional[str] = None
    
    @property
    def database_url(self) -> str:
        """Construct PostgreSQL connection URL"""
        # If SUPABASE_DB_URL is provided (e.g., from Railway/Render env vars), use it
        if self.SUPABASE_DB_URL:
            return self.SUPABASE_DB_URL
        # Otherwise, construct from individual components
        # Validate required fields
        if not self.SUPABASE_DB_HOST:
            raise ValueError("SUPABASE_DB_HOST must be set in .env file")
        if not self.SUPABASE_DB_PASSWORD:
            raise ValueError("SUPABASE_DB_PASSWORD must be set in .env file")
        # Use standard postgresql:// format (SQLAlchemy will use psycopg2 or psycopg3)
        # Properly URL encode password to handle special characters
        password = quote_plus(self.SUPABASE_DB_PASSWORD)
        return f"postgresql://{self.SUPABASE_DB_USER}:{password}@{self.SUPABASE_DB_HOST}:{self.SUPABASE_DB_PORT}/{self.SUPABASE_DB_NAME}"
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra environment variables (like VITE_API_BASE_URL which is frontend-only)

settings = Settings()

