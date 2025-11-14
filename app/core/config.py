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
    SCRUNCH_API_TOKEN: str = "c62a3e304839aec08441e87b727f14880d297f7713d26005c4e667e729f3bb4a"  # Can be overridden via .env
    BRAND_ID: int = 3230
    
    # Google Analytics 4 API Settings
    GA4_CREDENTIALS_PATH: Optional[str] = None  # Path to service account JSON file
    GA4_SCOPES: list = ["https://www.googleapis.com/auth/analytics.readonly"]
    
    # Supabase Settings (REST API)
    SUPABASE_URL: str = "https://dvmakvtrtjvffceujlfm.supabase.co"
    SUPABASE_KEY: str = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2bWFrdnRydGp2ZmZjZXVqbGZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMjk4NjgsImV4cCI6MjA3ODYwNTg2OH0.HdpTEQskyYOsQTlfEngNkPOv_UUYkHSRKN57hjD0efw"  # anon key
    
    # Supabase Database Settings
    # Note: Direct connection (db.xxx.supabase.co) is IPv6-only and may not work on Windows
    # Use Session Pooler for IPv4 compatibility: aws-0-<region>.pooler.supabase.com
    # Session Pooler (IPv4 compatible): Port 5432 for session mode
    # Transaction Pooler: Port 6543 for transaction mode
    # Check Supabase dashboard → Settings → Database → Connection Pooling for exact hostname
    SUPABASE_DB_HOST: str = "db.dvmakvtrtjvffceujlfm.supabase.co"  # Will try pooler if direct fails
    SUPABASE_DB_PORT: int = 5432
    # Session Pooler format: aws-0-<region>.pooler.supabase.com:5432 (check your dashboard)
    SUPABASE_DB_NAME: str = "postgres"
    SUPABASE_DB_USER: str = "postgres"
    SUPABASE_DB_PASSWORD: str = "Umang@123"  # Can be overridden via .env
    
    @property
    def database_url(self) -> str:
        """Construct PostgreSQL connection URL"""
        # Use psycopg (psycopg3) driver - properly URL encode password
        password = quote_plus(self.SUPABASE_DB_PASSWORD)
        return f"postgresql+psycopg://{self.SUPABASE_DB_USER}:{password}@{self.SUPABASE_DB_HOST}:{self.SUPABASE_DB_PORT}/{self.SUPABASE_DB_NAME}"
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

