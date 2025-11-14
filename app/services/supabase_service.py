from typing import List, Dict, Optional, Any
from app.core.database import get_supabase_client
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class SupabaseService:
    """Service for interacting with Supabase database"""
    
    def __init__(self):
        try:
            self.client = get_supabase_client()
        except ValueError as e:
            # Re-raise with better error message
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise ValueError(
                f"Failed to initialize Supabase client. "
                f"Please check that SUPABASE_URL and SUPABASE_KEY are set in config.py or .env file. "
                f"Error: {e}"
            ) from e
    
    def upsert_brands(self, brands: List[Dict]) -> int:
        """Upsert brands data"""
        if not brands:
            return 0
        
        # Transform data to match database schema
        # API returns: {id, name, website}
        records = []
        for brand in brands:
            records.append({
                "id": brand.get("id"),
                "name": brand.get("name"),
                "website": brand.get("website"),
                # created_at is set by default in DB
            })
        
        try:
            result = self.client.table("brands").upsert(records).execute()
            logger.info(f"Upserted {len(records)} brands")
            return len(records)
        except Exception as e:
            logger.error(f"Error upserting brands: {str(e)}")
            raise
    
    def upsert_prompts(self, prompts: List[Dict], brand_id: int = None) -> int:
        """Upsert prompts data"""
        if not prompts:
            return 0
        
        # Transform data to match database schema
        # API returns: {id, text, stage, persona_id, platforms, tags, topics, created_at}
        records = []
        for prompt in prompts:
            records.append({
                "id": prompt.get("id"),
                "brand_id": brand_id or prompt.get("brand_id"),  # Add brand_id
                "text": prompt.get("text"),  # API returns "text"
                "stage": prompt.get("stage"),
                "persona_id": prompt.get("persona_id"),
                "persona_name": prompt.get("persona_name"),  # May not be in response
                "platforms": prompt.get("platforms", []),  # API returns "platforms" array
                "tags": prompt.get("tags", []),
                "topics": prompt.get("topics", []),  # API returns "topics" not "key_topics"
                "created_at": prompt.get("created_at")
            })
        
        try:
            result = self.client.table("prompts").upsert(records).execute()
            logger.info(f"Upserted {len(records)} prompts")
            return len(records)
        except Exception as e:
            logger.error(f"Error upserting prompts: {str(e)}")
            raise
    
    def upsert_responses(self, responses: List[Dict], brand_id: int = None) -> int:
        """Upsert responses data"""
        if not responses:
            return 0
        
        # Transform data to match database schema
        # API returns: {id, created_at, prompt_id, prompt, persona_id, persona_name, country, 
        #              stage, branded, tags, key_topics, platform, brand_present, 
        #              brand_sentiment, brand_position, competitors_present, response_text, 
        #              citations (array of objects), competitors (array of objects)}
        records = []
        for response in responses:
            # Extract citations (array of objects with url, domain, source_type, title, snippet)
            citations = response.get("citations", [])
            
            # Extract competitors_present (array of strings)
            competitors_present = response.get("competitors_present", [])
            
            # Extract competitors (array of objects with id, name, present, position, sentiment)
            competitors = response.get("competitors", [])
            
            record = {
                "id": response.get("id"),
                "brand_id": brand_id or response.get("brand_id"),  # Add brand_id
                "prompt_id": response.get("prompt_id"),
                "prompt": response.get("prompt"),
                "response_text": response.get("response_text"),
                "platform": response.get("platform"),
                "country": response.get("country"),
                "persona_id": response.get("persona_id"),
                "persona_name": response.get("persona_name"),
                "stage": response.get("stage"),
                "branded": response.get("branded"),
                "tags": response.get("tags", []),
                "key_topics": response.get("key_topics", []),
                "brand_present": response.get("brand_present"),
                "brand_sentiment": response.get("brand_sentiment"),
                "brand_position": response.get("brand_position"),
                "competitors_present": competitors_present if isinstance(competitors_present, list) else [],
                "competitors": competitors,  # Store as JSON array of objects
                "created_at": response.get("created_at"),
                "citations": citations  # Store as JSON array of objects
            }
            records.append(record)
        
        try:
            # Upsert in batches to avoid payload size issues
            batch_size = 100
            total_upserted = 0
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                result = self.client.table("responses").upsert(batch).execute()
                total_upserted += len(batch)
                logger.info(f"Upserted batch {i//batch_size + 1}: {len(batch)} responses")
            
            logger.info(f"Total upserted {total_upserted} responses")
            return total_upserted
        except Exception as e:
            logger.error(f"Error upserting responses: {str(e)}")
            raise
    
    def upsert_citations(self, responses: List[Dict]) -> int:
        """Upsert citations separately (if you want a separate citations table)"""
        if not responses:
            return 0
        
        citations_records = []
        for response in responses:
            response_id = response.get("id")
            citations = response.get("citations", [])
            
            for citation in citations:
                citations_records.append({
                    "response_id": response_id,
                    "url": citation.get("url"),
                    "domain": citation.get("domain"),
                    "source_type": citation.get("source_type"),
                    "title": citation.get("title"),
                    "snippet": citation.get("snippet")
                })
        
        if not citations_records:
            return 0
        
        try:
            result = self.client.table("citations").upsert(citations_records).execute()
            logger.info(f"Upserted {len(citations_records)} citations")
            return len(citations_records)
        except Exception as e:
            logger.error(f"Error upserting citations: {str(e)}")
            raise
    
    # =====================================================
    # GA4 Data Sync Methods
    # =====================================================
    
    def upsert_ga4_traffic_overview(self, brand_id: int, property_id: str, date: str, data: Dict) -> int:
        """Upsert GA4 traffic overview data"""
        try:
            record = {
                "brand_id": brand_id,
                "property_id": property_id,
                "date": date,
                "users": data.get("users", 0),
                "sessions": data.get("sessions", 0),
                "new_users": data.get("newUsers", 0),
                "bounce_rate": data.get("bounceRate", 0),
                "average_session_duration": data.get("averageSessionDuration", 0),
                "engaged_sessions": data.get("engagedSessions", 0),
                "engagement_rate": data.get("engagementRate", 0),
                "sessions_change": data.get("sessionsChange", 0),
                "engaged_sessions_change": data.get("engagedSessionsChange", 0),
                "avg_session_duration_change": data.get("avgSessionDurationChange", 0),
                "engagement_rate_change": data.get("engagementRateChange", 0),
                "updated_at": datetime.now().isoformat()
            }
            
            result = self.client.table("ga4_traffic_overview").upsert(record).execute()
            logger.info(f"Upserted GA4 traffic overview for brand {brand_id}, property {property_id}, date {date}")
            return 1
        except Exception as e:
            logger.error(f"Error upserting GA4 traffic overview: {str(e)}")
            raise
    
    def upsert_ga4_top_pages(self, brand_id: int, property_id: str, date: str, pages: List[Dict]) -> int:
        """Upsert GA4 top pages data"""
        if not pages:
            return 0
        
        records = []
        for idx, page in enumerate(pages):
            records.append({
                "brand_id": brand_id,
                "property_id": property_id,
                "date": date,
                "page_path": page.get("pagePath", ""),
                "views": page.get("views", 0),
                "users": page.get("users", 0),
                "avg_session_duration": page.get("avgSessionDuration", 0),
                "rank": idx + 1,
                "updated_at": datetime.now().isoformat()
            })
        
        try:
            # Upsert in batches
            batch_size = 50
            total_upserted = 0
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                result = self.client.table("ga4_top_pages").upsert(batch).execute()
                total_upserted += len(batch)
            
            logger.info(f"Upserted {total_upserted} GA4 top pages for brand {brand_id}, property {property_id}, date {date}")
            return total_upserted
        except Exception as e:
            logger.error(f"Error upserting GA4 top pages: {str(e)}")
            raise
    
    def upsert_ga4_traffic_sources(self, brand_id: int, property_id: str, date: str, sources: List[Dict]) -> int:
        """Upsert GA4 traffic sources data"""
        if not sources:
            return 0
        
        records = []
        for source in sources:
            records.append({
                "brand_id": brand_id,
                "property_id": property_id,
                "date": date,
                "source": source.get("source", ""),
                "sessions": source.get("sessions", 0),
                "users": source.get("users", 0),
                "bounce_rate": source.get("bounceRate", 0),
                "updated_at": datetime.now().isoformat()
            })
        
        try:
            result = self.client.table("ga4_traffic_sources").upsert(records).execute()
            logger.info(f"Upserted {len(records)} GA4 traffic sources for brand {brand_id}, property {property_id}, date {date}")
            return len(records)
        except Exception as e:
            logger.error(f"Error upserting GA4 traffic sources: {str(e)}")
            raise
    
    def upsert_ga4_geographic(self, brand_id: int, property_id: str, date: str, geographic: List[Dict]) -> int:
        """Upsert GA4 geographic data"""
        if not geographic:
            return 0
        
        records = []
        for geo in geographic:
            records.append({
                "brand_id": brand_id,
                "property_id": property_id,
                "date": date,
                "country": geo.get("country", ""),
                "users": geo.get("users", 0),
                "sessions": geo.get("sessions", 0),
                "updated_at": datetime.now().isoformat()
            })
        
        try:
            result = self.client.table("ga4_geographic").upsert(records).execute()
            logger.info(f"Upserted {len(records)} GA4 geographic records for brand {brand_id}, property {property_id}, date {date}")
            return len(records)
        except Exception as e:
            logger.error(f"Error upserting GA4 geographic: {str(e)}")
            raise
    
    def upsert_ga4_devices(self, brand_id: int, property_id: str, date: str, devices: List[Dict]) -> int:
        """Upsert GA4 devices data"""
        if not devices:
            return 0
        
        records = []
        for device in devices:
            records.append({
                "brand_id": brand_id,
                "property_id": property_id,
                "date": date,
                "device_category": device.get("deviceCategory", ""),
                "operating_system": device.get("operatingSystem", ""),
                "users": device.get("users", 0),
                "sessions": device.get("sessions", 0),
                "bounce_rate": device.get("bounceRate", 0),
                "updated_at": datetime.now().isoformat()
            })
        
        try:
            result = self.client.table("ga4_devices").upsert(records).execute()
            logger.info(f"Upserted {len(records)} GA4 devices for brand {brand_id}, property {property_id}, date {date}")
            return len(records)
        except Exception as e:
            logger.error(f"Error upserting GA4 devices: {str(e)}")
            raise
    
    def upsert_ga4_conversions(self, brand_id: int, property_id: str, date: str, conversions: List[Dict]) -> int:
        """Upsert GA4 conversions data"""
        if not conversions:
            return 0
        
        records = []
        for conversion in conversions:
            records.append({
                "brand_id": brand_id,
                "property_id": property_id,
                "date": date,
                "event_name": conversion.get("eventName", ""),
                "event_count": conversion.get("count", 0),
                "users": conversion.get("users", 0),
                "updated_at": datetime.now().isoformat()
            })
        
        try:
            result = self.client.table("ga4_conversions").upsert(records).execute()
            logger.info(f"Upserted {len(records)} GA4 conversions for brand {brand_id}, property {property_id}, date {date}")
            return len(records)
        except Exception as e:
            logger.error(f"Error upserting GA4 conversions: {str(e)}")
            raise
    
    def upsert_ga4_realtime(self, brand_id: int, property_id: str, realtime_data: Dict) -> int:
        """Upsert GA4 realtime data"""
        try:
            record = {
                "brand_id": brand_id,
                "property_id": property_id,
                "snapshot_time": datetime.now().isoformat(),
                "total_active_users": realtime_data.get("totalActiveUsers", 0),
                "active_pages": realtime_data.get("activePages", []),
            }
            
            result = self.client.table("ga4_realtime").upsert(record).execute()
            logger.info(f"Upserted GA4 realtime data for brand {brand_id}, property {property_id}")
            return 1
        except Exception as e:
            logger.error(f"Error upserting GA4 realtime: {str(e)}")
            raise

