from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from app.db.models import Base
import logging

logger = logging.getLogger(__name__)

# Create database engine
# Note: For Supabase, if IPv6 causes issues, you might need to use IPv4 or connection pooler
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,  # Verify connections before using them
    pool_size=5,
    max_overflow=10,
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    connect_args={
        "connect_timeout": 10,  # 10 second timeout
        # Force IPv4 if IPv6 causes issues
        # "host": "db.dvmakvtrtjvffceujlfm.supabase.co",
    }
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    """
    Dependency function to get database session.
    Use this in FastAPI route dependencies.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database - create all tables.
    This should be run after migrations for production.
    """
    try:
        # Test connection
        with engine.connect() as connection:
            connection.execute("SELECT 1")
        logger.info("Database connection successful")
        
        # Create all tables (use Alembic migrations for production)
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created/verified")
        
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        raise


def check_db_connection() -> bool:
    """
    Check if database connection is working.
    Returns True if connection is successful, False otherwise.
    """
    try:
        with engine.connect() as connection:
            connection.execute("SELECT 1")
        logger.info("Database connection check: SUCCESS")
        return True
    except Exception as e:
        logger.error(f"Database connection check: FAILED - {e}")
        return False

