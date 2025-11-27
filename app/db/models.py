from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, ARRAY, JSON, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime
import enum

Base = declarative_base()


class AuditLogAction(str, enum.Enum):
    """Enum for audit log action types"""
    LOGIN = "login"
    LOGOUT = "logout"
    USER_CREATED = "user_created"
    SYNC_BRANDS = "sync_brands"
    SYNC_PROMPTS = "sync_prompts"
    SYNC_RESPONSES = "sync_responses"
    SYNC_GA4 = "sync_ga4"
    SYNC_AGENCY_ANALYTICS = "sync_agency_analytics"
    SYNC_ALL = "sync_all"


class Brand(Base):
    __tablename__ = "brands"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    website = Column(String, nullable=True)
    ga4_property_id = Column(String, nullable=True)  # Google Analytics 4 Property ID
    created_at = Column(DateTime(timezone=True), nullable=True)
    version = Column(Integer, nullable=False, default=1)  # Version for optimistic locking
    last_modified_by = Column(String, nullable=True)  # Email of user who last modified
    
    def __repr__(self):
        return f"<Brand(id={self.id}, name='{self.name}', version={self.version})>"


class Prompt(Base):
    __tablename__ = "prompts"
    
    id = Column(Integer, primary_key=True, index=True)
    text = Column(Text, nullable=True)
    stage = Column(String, nullable=True, index=True)
    persona_id = Column(Integer, nullable=True, index=True)
    persona_name = Column(String, nullable=True)
    platforms = Column(ARRAY(String), nullable=True)
    tags = Column(ARRAY(String), nullable=True)
    topics = Column(ARRAY(String), nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<Prompt(id={self.id}, stage='{self.stage}')>"


class Response(Base):
    __tablename__ = "responses"
    
    id = Column(Integer, primary_key=True, index=True)
    prompt_id = Column(Integer, nullable=True, index=True)
    prompt = Column(Text, nullable=True)
    response_text = Column(Text, nullable=True)
    platform = Column(String, nullable=True, index=True)
    country = Column(String, nullable=True)
    persona_id = Column(Integer, nullable=True, index=True)
    persona_name = Column(String, nullable=True)
    stage = Column(String, nullable=True, index=True)
    branded = Column(Boolean, nullable=True)
    tags = Column(ARRAY(String), nullable=True)
    key_topics = Column(ARRAY(String), nullable=True)
    brand_present = Column(Boolean, nullable=True)
    brand_sentiment = Column(String, nullable=True)
    brand_position = Column(String, nullable=True)
    competitors_present = Column(ARRAY(String), nullable=True)
    competitors = Column(JSON, nullable=True)  # Array of competitor objects
    created_at = Column(DateTime(timezone=True), nullable=True, index=True)
    citations = Column(JSON, nullable=True)
    
    def __repr__(self):
        return f"<Response(id={self.id}, platform='{self.platform}')>"


class Citation(Base):
    __tablename__ = "citations"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    response_id = Column(Integer, ForeignKey("responses.id", ondelete="CASCADE"), nullable=False, index=True)
    url = Column(Text, nullable=True)
    domain = Column(String, nullable=True, index=True)
    source_type = Column(String, nullable=True)
    title = Column(String, nullable=True)
    snippet = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<Citation(id={self.id}, response_id={self.response_id}, domain='{self.domain}')>"


class AuditLog(Base):
    """Audit log table for tracking user actions and data syncs"""
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    action = Column(Enum(AuditLogAction), nullable=False, index=True)
    user_id = Column(String, nullable=True, index=True)  # Supabase user ID
    user_email = Column(String, nullable=True, index=True)  # User email for easier querying
    ip_address = Column(String, nullable=True)
    user_agent = Column(String, nullable=True)
    
    # Action-specific details
    details = Column(JSON, nullable=True)  # Store additional context (brand_id, sync counts, etc.)
    
    # Status
    status = Column(String, nullable=True, index=True)  # 'success', 'error', 'partial'
    error_message = Column(Text, nullable=True)  # Error message if status is 'error'
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    def __repr__(self):
        return f"<AuditLog(id={self.id}, action='{self.action}', user_email='{self.user_email}', created_at='{self.created_at}')>"
