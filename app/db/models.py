from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, ARRAY, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()


class Brand(Base):
    __tablename__ = "brands"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=True)
    website = Column(String, nullable=True)
    ga4_property_id = Column(String, nullable=True)  # Google Analytics 4 Property ID
    created_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<Brand(id={self.id}, name='{self.name}')>"


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

