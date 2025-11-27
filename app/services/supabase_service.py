from typing import List, Dict, Optional, Any
from app.core.database import get_supabase_client
import logging
import re
import unicodedata
import uuid
from urllib.parse import urlparse
from datetime import datetime, timedelta

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
    
    def get_ga4_traffic_overview_by_date_range(self, brand_id: int, property_id: str, start_date: str, end_date: str) -> Optional[Dict]:
        """Get aggregated GA4 traffic overview data from stored daily records for a date range"""
        try:
            # Get all daily records for the date range
            result = self.client.table("ga4_traffic_overview").select("*").eq("brand_id", brand_id).eq("property_id", property_id).gte("date", start_date).lte("date", end_date).order("date", desc=False).execute()
            
            records = result.data if hasattr(result, 'data') else []
            
            if not records:
                return None
            
            # Aggregate the daily data
            total_users = sum(int(r.get("users", 0) or 0) for r in records)
            total_sessions = sum(int(r.get("sessions", 0) or 0) for r in records)
            total_new_users = sum(int(r.get("new_users", 0) or 0) for r in records)
            total_engaged_sessions = sum(int(r.get("engaged_sessions", 0) or 0) for r in records)
            total_conversions = sum(float(r.get("conversions", 0) or 0) for r in records)
            total_revenue = sum(float(r.get("revenue", 0) or 0) for r in records)
            
            # Calculate weighted averages for rates
            total_session_duration = sum(float(r.get("average_session_duration", 0) or 0) * int(r.get("sessions", 0) or 0) for r in records)
            avg_session_duration = total_session_duration / total_sessions if total_sessions > 0 else 0
            
            # Calculate bounce rate (weighted average)
            total_bounce_sessions = sum((1 - float(r.get("engagement_rate", 0) or 0)) * int(r.get("sessions", 0) or 0) for r in records)
            bounce_rate = total_bounce_sessions / total_sessions if total_sessions > 0 else 0
            
            # Calculate engagement rate (weighted average)
            total_engagement_weight = sum(float(r.get("engagement_rate", 0) or 0) * int(r.get("sessions", 0) or 0) for r in records)
            engagement_rate = total_engagement_weight / total_sessions if total_sessions > 0 else 0
            
            return {
                "users": total_users,
                "sessions": total_sessions,
                "newUsers": total_new_users,
                "engagedSessions": total_engaged_sessions,
                "averageSessionDuration": avg_session_duration,
                "bounceRate": bounce_rate,
                "engagementRate": engagement_rate,
                "conversions": total_conversions,
                "revenue": total_revenue
            }
        except Exception as e:
            logger.error(f"Error getting GA4 traffic overview from stored data: {str(e)}")
            return None
    
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
                "conversions": data.get("conversions", 0),
                "revenue": data.get("revenue", 0),
                "updated_at": datetime.now().isoformat()
            }
            
            # Check if record exists
            existing = self.client.table("ga4_traffic_overview").select("id").eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).limit(1).execute()
            
            if existing.data and len(existing.data) > 0:
                result = self.client.table("ga4_traffic_overview").update(record).eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).execute()
                logger.info(f"Updated GA4 traffic overview for brand {brand_id}, property {property_id}, date {date}")
            else:
                result = self.client.table("ga4_traffic_overview").insert(record).execute()
                logger.info(f"Inserted GA4 traffic overview for brand {brand_id}, property {property_id}, date {date}")
            return 1
        except Exception as e:
            error_str = str(e)
            if "23505" in error_str or "duplicate key" in error_str.lower() or "unique constraint" in error_str.lower():
                try:
                    result = self.client.table("ga4_traffic_overview").update(record).eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).execute()
                    logger.info(f"Updated existing GA4 traffic overview for brand {brand_id}, property {property_id}, date {date}")
                    return 1
                except Exception as update_error:
                    logger.error(f"Error updating GA4 traffic overview after conflict: {str(update_error)}")
                    raise
            logger.error(f"Error upserting GA4 traffic overview: {error_str}")
            raise
    
    def upsert_ga4_top_pages(self, brand_id: int, property_id: str, date: str, pages: List[Dict]) -> int:
        """Upsert GA4 top pages data"""
        if not pages:
            return 0
        
        # Delete existing records for this date first, then insert new ones
        # This ensures we don't have stale data from previous syncs
        try:
            self.client.table("ga4_top_pages").delete().eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).execute()
        except Exception as delete_error:
            logger.warning(f"Error deleting existing top pages (may not exist): {str(delete_error)}")
        
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
            # Insert in batches
            batch_size = 50
            total_inserted = 0
            for i in range(0, len(records), batch_size):
                batch = records[i:i + batch_size]
                result = self.client.table("ga4_top_pages").insert(batch).execute()
                total_inserted += len(batch)
            
            logger.info(f"Upserted {total_inserted} GA4 top pages for brand {brand_id}, property {property_id}, date {date}")
            return total_inserted
        except Exception as e:
            error_str = str(e)
            if "23505" in error_str or "duplicate key" in error_str.lower():
                # If duplicates exist, try individual upserts
                total_upserted = 0
                for record in records:
                    try:
                        existing = self.client.table("ga4_top_pages").select("id").eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).eq("page_path", record["page_path"]).limit(1).execute()
                        if existing.data:
                            self.client.table("ga4_top_pages").update(record).eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).eq("page_path", record["page_path"]).execute()
                        else:
                            self.client.table("ga4_top_pages").insert(record).execute()
                        total_upserted += 1
                    except Exception:
                        pass
                logger.info(f"Upserted {total_upserted} GA4 top pages (individual) for brand {brand_id}, property {property_id}, date {date}")
                return total_upserted
            logger.error(f"Error upserting GA4 top pages: {error_str}")
            raise
    
    def upsert_ga4_traffic_sources(self, brand_id: int, property_id: str, date: str, sources: List[Dict]) -> int:
        """Upsert GA4 traffic sources data"""
        if not sources:
            return 0
        
        # Delete existing records for this date first
        try:
            self.client.table("ga4_traffic_sources").delete().eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).execute()
        except Exception as delete_error:
            logger.warning(f"Error deleting existing traffic sources (may not exist): {str(delete_error)}")
        
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
            result = self.client.table("ga4_traffic_sources").insert(records).execute()
            logger.info(f"Upserted {len(records)} GA4 traffic sources for brand {brand_id}, property {property_id}, date {date}")
            return len(records)
        except Exception as e:
            error_str = str(e)
            if "23505" in error_str or "duplicate key" in error_str.lower():
                # If duplicates exist, try individual upserts
                total_upserted = 0
                for record in records:
                    try:
                        existing = self.client.table("ga4_traffic_sources").select("id").eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).eq("source", record["source"]).limit(1).execute()
                        if existing.data:
                            self.client.table("ga4_traffic_sources").update(record).eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).eq("source", record["source"]).execute()
                        else:
                            self.client.table("ga4_traffic_sources").insert(record).execute()
                        total_upserted += 1
                    except Exception:
                        pass
                logger.info(f"Upserted {total_upserted} GA4 traffic sources (individual) for brand {brand_id}, property {property_id}, date {date}")
                return total_upserted
            logger.error(f"Error upserting GA4 traffic sources: {error_str}")
            raise
    
    def upsert_ga4_geographic(self, brand_id: int, property_id: str, date: str, geographic: List[Dict]) -> int:
        """Upsert GA4 geographic data"""
        if not geographic:
            return 0
        
        # Delete existing records for this date first
        try:
            self.client.table("ga4_geographic").delete().eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).execute()
        except Exception as delete_error:
            logger.warning(f"Error deleting existing geographic data (may not exist): {str(delete_error)}")
        
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
            result = self.client.table("ga4_geographic").insert(records).execute()
            logger.info(f"Upserted {len(records)} GA4 geographic records for brand {brand_id}, property {property_id}, date {date}")
            return len(records)
        except Exception as e:
            error_str = str(e)
            if "23505" in error_str or "duplicate key" in error_str.lower():
                # If duplicates exist, try individual upserts
                total_upserted = 0
                for record in records:
                    try:
                        existing = self.client.table("ga4_geographic").select("id").eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).eq("country", record["country"]).limit(1).execute()
                        if existing.data:
                            self.client.table("ga4_geographic").update(record).eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).eq("country", record["country"]).execute()
                        else:
                            self.client.table("ga4_geographic").insert(record).execute()
                        total_upserted += 1
                    except Exception:
                        pass
                logger.info(f"Upserted {total_upserted} GA4 geographic records (individual) for brand {brand_id}, property {property_id}, date {date}")
                return total_upserted
            logger.error(f"Error upserting GA4 geographic: {error_str}")
            raise
    
    def upsert_ga4_devices(self, brand_id: int, property_id: str, date: str, devices: List[Dict]) -> int:
        """Upsert GA4 devices data"""
        if not devices:
            return 0
        
        # Delete existing records for this date first
        try:
            self.client.table("ga4_devices").delete().eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).execute()
        except Exception as delete_error:
            logger.warning(f"Error deleting existing devices data (may not exist): {str(delete_error)}")
        
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
            result = self.client.table("ga4_devices").insert(records).execute()
            logger.info(f"Upserted {len(records)} GA4 devices for brand {brand_id}, property {property_id}, date {date}")
            return len(records)
        except Exception as e:
            error_str = str(e)
            if "23505" in error_str or "duplicate key" in error_str.lower():
                # If duplicates exist, try individual upserts
                total_upserted = 0
                for record in records:
                    try:
                        existing = self.client.table("ga4_devices").select("id").eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).eq("device_category", record["device_category"]).eq("operating_system", record["operating_system"]).limit(1).execute()
                        if existing.data:
                            self.client.table("ga4_devices").update(record).eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).eq("device_category", record["device_category"]).eq("operating_system", record["operating_system"]).execute()
                        else:
                            self.client.table("ga4_devices").insert(record).execute()
                        total_upserted += 1
                    except Exception:
                        pass
                logger.info(f"Upserted {total_upserted} GA4 devices (individual) for brand {brand_id}, property {property_id}, date {date}")
                return total_upserted
            logger.error(f"Error upserting GA4 devices: {error_str}")
            raise
    
    def upsert_ga4_conversions(self, brand_id: int, property_id: str, date: str, conversions: List[Dict]) -> int:
        """Upsert GA4 conversions data"""
        if not conversions:
            return 0
        
        # Delete existing records for this date first
        try:
            self.client.table("ga4_conversions").delete().eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).execute()
        except Exception as delete_error:
            logger.warning(f"Error deleting existing conversions data (may not exist): {str(delete_error)}")
        
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
            result = self.client.table("ga4_conversions").insert(records).execute()
            logger.info(f"Upserted {len(records)} GA4 conversions for brand {brand_id}, property {property_id}, date {date}")
            return len(records)
        except Exception as e:
            error_str = str(e)
            if "23505" in error_str or "duplicate key" in error_str.lower():
                # If duplicates exist, try individual upserts
                total_upserted = 0
                for record in records:
                    try:
                        existing = self.client.table("ga4_conversions").select("id").eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).eq("event_name", record["event_name"]).limit(1).execute()
                        if existing.data:
                            self.client.table("ga4_conversions").update(record).eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).eq("event_name", record["event_name"]).execute()
                        else:
                            self.client.table("ga4_conversions").insert(record).execute()
                        total_upserted += 1
                    except Exception:
                        pass
                logger.info(f"Upserted {total_upserted} GA4 conversions (individual) for brand {brand_id}, property {property_id}, date {date}")
                return total_upserted
            logger.error(f"Error upserting GA4 conversions: {error_str}")
            raise
    
    def upsert_ga4_realtime(self, brand_id: int, property_id: str, realtime_data: Dict) -> int:
        """Upsert GA4 realtime data"""
        try:
            snapshot_time = datetime.now().isoformat()
            record = {
                "brand_id": brand_id,
                "property_id": property_id,
                "snapshot_time": snapshot_time,
                "total_active_users": realtime_data.get("totalActiveUsers", 0),
                "active_pages": realtime_data.get("activePages", []),
            }
            
            # Check if record exists (realtime uses snapshot_time as part of unique constraint)
            existing = self.client.table("ga4_realtime").select("id").eq("brand_id", brand_id).eq("property_id", property_id).eq("snapshot_time", snapshot_time).limit(1).execute()
            
            if existing.data and len(existing.data) > 0:
                result = self.client.table("ga4_realtime").update(record).eq("brand_id", brand_id).eq("property_id", property_id).eq("snapshot_time", snapshot_time).execute()
                logger.info(f"Updated GA4 realtime data for brand {brand_id}, property {property_id}")
            else:
                result = self.client.table("ga4_realtime").insert(record).execute()
                logger.info(f"Inserted GA4 realtime data for brand {brand_id}, property {property_id}")
            return 1
        except Exception as e:
            error_str = str(e)
            if "23505" in error_str or "duplicate key" in error_str.lower() or "unique constraint" in error_str.lower():
                try:
                    result = self.client.table("ga4_realtime").update(record).eq("brand_id", brand_id).eq("property_id", property_id).eq("snapshot_time", snapshot_time).execute()
                    logger.info(f"Updated existing GA4 realtime data for brand {brand_id}, property {property_id}")
                    return 1
                except Exception as update_error:
                    logger.error(f"Error updating GA4 realtime after conflict: {str(update_error)}")
                    raise
            logger.error(f"Error upserting GA4 realtime: {error_str}")
            raise
    
    def upsert_ga4_property_details(self, brand_id: int, property_id: str, property_details: Dict) -> int:
        """Upsert GA4 property details (static configuration)"""
        try:
            record = {
                "brand_id": brand_id,
                "property_id": property_id,
                "display_name": property_details.get("displayName"),
                "time_zone": property_details.get("timeZone"),
                "currency_code": property_details.get("currencyCode"),
                "create_time": property_details.get("createTime"),
                "updated_at": datetime.now().isoformat()
            }
            
            # Check if record exists
            existing = self.client.table("ga4_property_details").select("id").eq("brand_id", brand_id).eq("property_id", property_id).limit(1).execute()
            
            if existing.data and len(existing.data) > 0:
                result = self.client.table("ga4_property_details").update(record).eq("brand_id", brand_id).eq("property_id", property_id).execute()
                logger.info(f"Updated GA4 property details for brand {brand_id}, property {property_id}")
            else:
                result = self.client.table("ga4_property_details").insert(record).execute()
                logger.info(f"Inserted GA4 property details for brand {brand_id}, property {property_id}")
            return 1
        except Exception as e:
            error_str = str(e)
            if "23505" in error_str or "duplicate key" in error_str.lower() or "unique constraint" in error_str.lower():
                try:
                    result = self.client.table("ga4_property_details").update(record).eq("brand_id", brand_id).eq("property_id", property_id).execute()
                    logger.info(f"Updated existing GA4 property details for brand {brand_id}, property {property_id}")
                    return 1
                except Exception as update_error:
                    logger.error(f"Error updating GA4 property details after conflict: {str(update_error)}")
                    raise
            logger.error(f"Error upserting GA4 property details: {error_str}")
            raise
    
    def upsert_ga4_revenue(self, brand_id: int, property_id: str, date: str, revenue: float) -> int:
        """Upsert GA4 revenue data for a specific date"""
        try:
            record = {
                "brand_id": brand_id,
                "property_id": property_id,
                "date": date,
                "total_revenue": revenue,
                "updated_at": datetime.now().isoformat()
            }
            
            # Check if record exists
            existing = self.client.table("ga4_revenue").select("id").eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).limit(1).execute()
            
            if existing.data and len(existing.data) > 0:
                result = self.client.table("ga4_revenue").update(record).eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).execute()
                logger.info(f"Updated GA4 revenue for brand {brand_id}, property {property_id}, date {date}: {revenue}")
            else:
                result = self.client.table("ga4_revenue").insert(record).execute()
                logger.info(f"Inserted GA4 revenue for brand {brand_id}, property {property_id}, date {date}: {revenue}")
            return 1
        except Exception as e:
            error_str = str(e)
            if "23505" in error_str or "duplicate key" in error_str.lower() or "unique constraint" in error_str.lower():
                try:
                    result = self.client.table("ga4_revenue").update(record).eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).execute()
                    logger.info(f"Updated existing GA4 revenue for brand {brand_id}, property {property_id}, date {date}: {revenue}")
                    return 1
                except Exception as update_error:
                    logger.error(f"Error updating GA4 revenue after conflict: {str(update_error)}")
                    raise
            logger.error(f"Error upserting GA4 revenue: {error_str}")
            raise
    
    def upsert_ga4_daily_conversions(self, brand_id: int, property_id: str, date: str, total_conversions: float) -> int:
        """Upsert GA4 daily conversions summary"""
        try:
            record = {
                "brand_id": brand_id,
                "property_id": property_id,
                "date": date,
                "total_conversions": total_conversions,
                "updated_at": datetime.now().isoformat()
            }
            
            # Check if record exists
            existing = self.client.table("ga4_daily_conversions").select("id").eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).limit(1).execute()
            
            if existing.data and len(existing.data) > 0:
                result = self.client.table("ga4_daily_conversions").update(record).eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).execute()
                logger.info(f"Updated GA4 daily conversions for brand {brand_id}, property {property_id}, date {date}: {total_conversions}")
            else:
                result = self.client.table("ga4_daily_conversions").insert(record).execute()
                logger.info(f"Inserted GA4 daily conversions for brand {brand_id}, property {property_id}, date {date}: {total_conversions}")
            return 1
        except Exception as e:
            error_str = str(e)
            if "23505" in error_str or "duplicate key" in error_str.lower() or "unique constraint" in error_str.lower():
                try:
                    result = self.client.table("ga4_daily_conversions").update(record).eq("brand_id", brand_id).eq("property_id", property_id).eq("date", date).execute()
                    logger.info(f"Updated existing GA4 daily conversions for brand {brand_id}, property {property_id}, date {date}: {total_conversions}")
                    return 1
                except Exception as update_error:
                    logger.error(f"Error updating GA4 daily conversions after conflict: {str(update_error)}")
                    raise
            logger.error(f"Error upserting GA4 daily conversions: {error_str}")
            raise
    
    def upsert_ga4_kpi_snapshot(
        self,
        brand_id: int,
        property_id: str,
        period_end_date: str,
        period_start_date: str,
        prev_period_start_date: str,
        prev_period_end_date: str,
        current_values: Dict,
        previous_values: Dict,
        changes: Dict
    ) -> int:
        """Upsert GA4 KPI snapshot for a 30-day period"""
        try:
            record = {
                "brand_id": brand_id,
                "property_id": property_id,
                "period_end_date": period_end_date,
                "period_start_date": period_start_date,
                "prev_period_start_date": prev_period_start_date,
                "prev_period_end_date": prev_period_end_date,
                # Current period values
                "users": current_values.get("users", 0),
                "sessions": current_values.get("sessions", 0),
                "new_users": current_values.get("new_users", 0),
                "bounce_rate": current_values.get("bounce_rate", 0),
                "avg_session_duration": current_values.get("avg_session_duration", 0),
                "engagement_rate": current_values.get("engagement_rate", 0),
                "engaged_sessions": current_values.get("engaged_sessions", 0),
                "conversions": current_values.get("conversions", 0),
                "revenue": current_values.get("revenue", 0),
                # Previous period values
                "prev_users": previous_values.get("users", 0),
                "prev_sessions": previous_values.get("sessions", 0),
                "prev_new_users": previous_values.get("new_users", 0),
                "prev_bounce_rate": previous_values.get("bounce_rate", 0),
                "prev_avg_session_duration": previous_values.get("avg_session_duration", 0),
                "prev_engagement_rate": previous_values.get("engagement_rate", 0),
                "prev_engaged_sessions": previous_values.get("engaged_sessions", 0),
                "prev_conversions": previous_values.get("conversions", 0),
                "prev_revenue": previous_values.get("revenue", 0),
                # Percentage changes
                "users_change": changes.get("users_change", 0),
                "sessions_change": changes.get("sessions_change", 0),
                "new_users_change": changes.get("new_users_change", 0),
                "bounce_rate_change": changes.get("bounce_rate_change", 0),
                "avg_session_duration_change": changes.get("avg_session_duration_change", 0),
                "engagement_rate_change": changes.get("engagement_rate_change", 0),
                "engaged_sessions_change": changes.get("engaged_sessions_change", 0),
                "conversions_change": changes.get("conversions_change", 0),
                "revenue_change": changes.get("revenue_change", 0),
                "updated_at": datetime.now().isoformat()
            }
            
            # Check if record exists first
            existing = self.client.table("ga4_kpi_snapshots").select("id").eq("brand_id", brand_id).eq("property_id", property_id).eq("period_end_date", period_end_date).limit(1).execute()
            
            if existing.data and len(existing.data) > 0:
                # Update existing record
                result = self.client.table("ga4_kpi_snapshots").update(record).eq("brand_id", brand_id).eq("property_id", property_id).eq("period_end_date", period_end_date).execute()
                logger.info(f"Updated GA4 KPI snapshot for brand {brand_id}, property {property_id}, period_end_date {period_end_date}")
            else:
                # Insert new record
                result = self.client.table("ga4_kpi_snapshots").insert(record).execute()
                logger.info(f"Inserted GA4 KPI snapshot for brand {brand_id}, property {property_id}, period_end_date {period_end_date}")
            
            return 1
        except Exception as e:
            error_str = str(e)
            # Handle unique constraint violation by updating instead
            if "23505" in error_str or "duplicate key" in error_str.lower() or "unique constraint" in error_str.lower():
                try:
                    # Try to update the existing record
                    result = self.client.table("ga4_kpi_snapshots").update(record).eq("brand_id", brand_id).eq("property_id", property_id).eq("period_end_date", period_end_date).execute()
                    logger.info(f"Updated existing GA4 KPI snapshot for brand {brand_id}, property {property_id}, period_end_date {period_end_date}")
                    return 1
                except Exception as update_error:
                    logger.error(f"Error updating GA4 KPI snapshot after conflict: {str(update_error)}")
                    raise
            logger.error(f"Error upserting GA4 KPI snapshot: {error_str}")
            raise
    
    def get_latest_ga4_kpi_snapshot(self, brand_id: int) -> Optional[Dict]:
        """Get the latest GA4 KPI snapshot for a brand"""
        try:
            result = self.client.table("ga4_kpi_snapshots").select("*").eq("brand_id", brand_id).order("period_end_date", desc=True).limit(1).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            logger.error(f"Error getting latest GA4 KPI snapshot for brand {brand_id}: {str(e)}")
            return None
    
    def get_ga4_kpi_snapshot_by_period(self, brand_id: int, period_end_date: str) -> Optional[Dict]:
        """Get GA4 KPI snapshot for a specific period end date"""
        try:
            result = self.client.table("ga4_kpi_snapshots").select("*").eq("brand_id", brand_id).eq("period_end_date", period_end_date).limit(1).execute()
            if result.data and len(result.data) > 0:
                return result.data[0]
            return None
        except Exception as e:
            logger.error(f"Error getting GA4 KPI snapshot for brand {brand_id}, period_end_date {period_end_date}: {str(e)}")
            return None
    
    def get_ga4_kpi_snapshot_by_date_range(self, brand_id: int, start_date: str, end_date: str) -> Optional[Dict]:
        """Get GA4 KPI snapshot that matches the requested date range (within 1 day tolerance)"""
        try:
            # Convert dates to datetime for comparison
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            
            # Look for snapshots where period_end_date is within 1 day of the requested end_date
            # This handles cases where the snapshot was created on a different day
            result = self.client.table("ga4_kpi_snapshots").select("*").eq("brand_id", brand_id).gte("period_end_date", (end_dt - timedelta(days=1)).strftime("%Y-%m-%d")).lte("period_end_date", (end_dt + timedelta(days=1)).strftime("%Y-%m-%d")).order("period_end_date", desc=True).limit(1).execute()
            
            if result.data and len(result.data) > 0:
                snapshot = result.data[0]
                # Verify the snapshot's date range matches what we need (approximately 30 days)
                snapshot_start = datetime.strptime(snapshot["period_start_date"], "%Y-%m-%d")
                snapshot_end = datetime.strptime(snapshot["period_end_date"], "%Y-%m-%d")
                requested_start = datetime.strptime(start_date, "%Y-%m-%d")
                requested_end = datetime.strptime(end_date, "%Y-%m-%d")
                
                # Check if the snapshot's period matches the requested period (within 2 days tolerance)
                start_diff = abs((snapshot_start - requested_start).days)
                end_diff = abs((snapshot_end - requested_end).days)
                
                if start_diff <= 2 and end_diff <= 2:
                    return snapshot
            
            return None
        except Exception as e:
            logger.error(f"Error getting GA4 KPI snapshot for brand {brand_id}, date range {start_date} to {end_date}: {str(e)}")
            return None
    
    def get_ga4_top_pages_by_date_range(self, brand_id: int, property_id: str, start_date: str, end_date: str, limit: int = 10) -> List[Dict]:
        """Get aggregated GA4 top pages data from stored daily records for a date range"""
        try:
            # Get all daily records for the date range
            result = self.client.table("ga4_top_pages").select("*").eq("brand_id", brand_id).eq("property_id", property_id).gte("date", start_date).lte("date", end_date).execute()
            records = result.data if hasattr(result, 'data') else []
            
            if not records:
                return []
            
            # Aggregate by page_path
            page_aggregates = {}
            for record in records:
                page_path = record.get("page_path")
                if not page_path:
                    continue
                
                if page_path not in page_aggregates:
                    page_aggregates[page_path] = {
                        "pagePath": page_path,
                        "views": 0,
                        "users": 0,
                        "avgSessionDuration": 0.0,
                        "count": 0
                    }
                
                page_aggregates[page_path]["views"] += record.get("views", 0)
                page_aggregates[page_path]["users"] += record.get("users", 0)
                page_aggregates[page_path]["avgSessionDuration"] += record.get("avg_session_duration", 0)
                page_aggregates[page_path]["count"] += 1
            
            # Calculate averages and sort
            pages = []
            for page_path, data in page_aggregates.items():
                if data["count"] > 0:
                    data["avgSessionDuration"] = data["avgSessionDuration"] / data["count"]
                pages.append(data)
            
            # Sort by views descending and limit
            pages.sort(key=lambda x: x["views"], reverse=True)
            return pages[:limit]
        except Exception as e:
            logger.error(f"Error getting GA4 top pages for date range: {str(e)}")
            return []
    
    def get_ga4_traffic_sources_by_date_range(self, brand_id: int, property_id: str, start_date: str, end_date: str) -> List[Dict]:
        """Get aggregated GA4 traffic sources data from stored daily records for a date range"""
        try:
            # Get all daily records for the date range
            result = self.client.table("ga4_traffic_sources").select("*").eq("brand_id", brand_id).eq("property_id", property_id).gte("date", start_date).lte("date", end_date).execute()
            records = result.data if hasattr(result, 'data') else []
            
            if not records:
                return []
            
            # Aggregate by source
            source_aggregates = {}
            for record in records:
                source = record.get("source")
                if not source:
                    continue
                
                if source not in source_aggregates:
                    source_aggregates[source] = {
                        "source": source,
                        "sessions": 0,
                        "users": 0,
                        "bounceRate": 0.0,
                        "conversions": 0.0,
                        "conversionRate": 0.0,
                        "totalBounce": 0.0,
                        "totalSessions": 0
                    }
                
                source_aggregates[source]["sessions"] += record.get("sessions", 0)
                source_aggregates[source]["users"] += record.get("users", 0)
                source_aggregates[source]["totalBounce"] += record.get("bounce_rate", 0) * record.get("sessions", 0)
                source_aggregates[source]["totalSessions"] += record.get("sessions", 0)
            
            # Calculate weighted average bounce rate
            sources = []
            for source, data in source_aggregates.items():
                if data["totalSessions"] > 0:
                    data["bounceRate"] = data["totalBounce"] / data["totalSessions"]
                sources.append(data)
            
            # Sort by sessions descending
            sources.sort(key=lambda x: x["sessions"], reverse=True)
            return sources
        except Exception as e:
            logger.error(f"Error getting GA4 traffic sources for date range: {str(e)}")
            return []
    
    def get_ga4_geographic_by_date_range(self, brand_id: int, property_id: str, start_date: str, end_date: str, limit: int = 10) -> List[Dict]:
        """Get aggregated GA4 geographic data from stored daily records for a date range"""
        try:
            # Get all daily records for the date range
            result = self.client.table("ga4_geographic").select("*").eq("brand_id", brand_id).eq("property_id", property_id).gte("date", start_date).lte("date", end_date).execute()
            records = result.data if hasattr(result, 'data') else []
            
            if not records:
                return []
            
            # Aggregate by country
            country_aggregates = {}
            for record in records:
                country = record.get("country")
                if not country:
                    continue
                
                if country not in country_aggregates:
                    country_aggregates[country] = {
                        "country": country,
                        "users": 0,
                        "sessions": 0,
                        "engagementRate": 0.0
                    }
                
                country_aggregates[country]["users"] += record.get("users", 0)
                country_aggregates[country]["sessions"] += record.get("sessions", 0)
            
            # Calculate engagement rate (simplified - would need engaged_sessions in table for accurate calculation)
            countries = []
            for country, data in country_aggregates.items():
                countries.append(data)
            
            # Sort by users descending and limit
            countries.sort(key=lambda x: x["users"], reverse=True)
            return countries[:limit]
        except Exception as e:
            logger.error(f"Error getting GA4 geographic data for date range: {str(e)}")
            return []
    
    def get_ga4_devices_by_date_range(self, brand_id: int, property_id: str, start_date: str, end_date: str) -> List[Dict]:
        """Get aggregated GA4 devices data from stored daily records for a date range"""
        try:
            # Get all daily records for the date range
            result = self.client.table("ga4_devices").select("*").eq("brand_id", brand_id).eq("property_id", property_id).gte("date", start_date).lte("date", end_date).execute()
            records = result.data if hasattr(result, 'data') else []
            
            if not records:
                return []
            
            # Aggregate by device_category and operating_system
            device_aggregates = {}
            for record in records:
                device_key = f"{record.get('device_category', 'unknown')}|{record.get('operating_system', 'unknown')}"
                
                if device_key not in device_aggregates:
                    device_aggregates[device_key] = {
                        "deviceCategory": record.get("device_category", "unknown"),
                        "operatingSystem": record.get("operating_system", "unknown"),
                        "users": 0,
                        "sessions": 0,
                        "bounceRate": 0.0,
                        "totalBounce": 0.0,
                        "totalSessions": 0
                    }
                
                device_aggregates[device_key]["users"] += record.get("users", 0)
                device_aggregates[device_key]["sessions"] += record.get("sessions", 0)
                device_aggregates[device_key]["totalBounce"] += record.get("bounce_rate", 0) * record.get("sessions", 0)
                device_aggregates[device_key]["totalSessions"] += record.get("sessions", 0)
            
            # Calculate weighted average bounce rate
            devices = []
            for device_key, data in device_aggregates.items():
                if data["totalSessions"] > 0:
                    data["bounceRate"] = data["totalBounce"] / data["totalSessions"]
                devices.append(data)
            
            # Sort by users descending
            devices.sort(key=lambda x: x["users"], reverse=True)
            return devices
        except Exception as e:
            logger.error(f"Error getting GA4 devices data for date range: {str(e)}")
            return []
    
    # =====================================================
    # Client Methods
    # =====================================================
    
    def generate_client_slug(self, company_name: str = None) -> str:
        """Generate a URL-friendly slug using UUID for better security"""
        # Generate UUID-based slug (32 hex characters, no hyphens)
        # This matches the database trigger logic for consistency
        slug = uuid.uuid4().hex.lower()
        
        # Check if slug exists (extremely unlikely with UUID, but safety check)
        while True:
            try:
                result = self.client.table("clients").select("id").eq("url_slug", slug).limit(1).execute()
                if not result.data:
                    break
                # If collision occurs (should never happen), generate new UUID
                slug = uuid.uuid4().hex.lower()
            except Exception:
                break
        
        return slug
    
    def upsert_clients_from_campaigns_batch(self, campaigns: List[Dict], user_email: Optional[str] = None) -> Dict[str, int]:
        """Batch create/update clients from active campaigns
        
        Args:
            campaigns: List of campaign dictionaries (should be filtered to active only)
            user_email: Email of user performing the sync
            
        Returns:
            Dict with 'created', 'updated', 'total' counts
        """
        if not campaigns:
            return {"created": 0, "updated": 0, "total": 0}
        
        # Filter to only active campaigns
        active_campaigns = [c for c in campaigns if c.get("status", "").lower() == "active"]
        
        if not active_campaigns:
            logger.info("No active campaigns to create clients from")
            return {"created": 0, "updated": 0, "total": 0}
        
        # Step 1: Get all existing clients to check for updates
        try:
            # Get all company_ids and company_names from active campaigns
            company_ids = [c.get("company_id") for c in active_campaigns if c.get("company_id")]
            company_names = [c.get("company", "").strip() for c in active_campaigns if c.get("company", "").strip()]
            
            # Fetch existing clients by company_id or company_name
            existing_clients_query = self.client.table("clients").select("*")
            if company_ids:
                existing_clients_query = existing_clients_query.in_("company_id", company_ids)
            if company_names:
                existing_clients_query = existing_clients_query.in_("company_name", company_names)
            
            existing_clients_result = existing_clients_query.execute()
            existing_clients = existing_clients_result.data if existing_clients_result.data else []
            
            # Create lookup maps
            existing_by_company_id = {c["company_id"]: c for c in existing_clients if c.get("company_id")}
            existing_by_company_name = {c["company_name"]: c for c in existing_clients if c.get("company_name")}
            
        except Exception as e:
            logger.warning(f"Error fetching existing clients: {str(e)}")
            existing_by_company_id = {}
            existing_by_company_name = {}
        
        # Step 2: Build all client records locally
        clients_to_insert = []
        clients_to_update = []
        campaign_client_links = []  # Store (campaign_id, client_id, company_name, is_primary) tuples
        
        for campaign in active_campaigns:
            try:
                company_name = campaign.get("company", "").strip()
                if not company_name:
                    logger.warning(f"Skipping campaign {campaign.get('id')}: no company name")
                    continue
                
                company_id = campaign.get("company_id")
                campaign_id = campaign.get("id")
                
                # Check if client exists
                existing_client = None
                if company_id and company_id in existing_by_company_id:
                    existing_client = existing_by_company_id[company_id]
                elif company_name in existing_by_company_name:
                    existing_client = existing_by_company_name[company_name]
                
                # Prepare client data
                client_data = {
                    "company_name": company_name,
                    "company_id": company_id,
                    "url": campaign.get("url"),
                    "email_addresses": campaign.get("email_addresses", []),
                    "phone_numbers": campaign.get("phone_numbers", []),
                    "address": campaign.get("address"),
                    "city": campaign.get("city"),
                    "state": campaign.get("state"),
                    "zip": campaign.get("zip"),
                    "country": campaign.get("country"),
                    "timezone": campaign.get("timezone"),
                    "company_domain": self._extract_domain(campaign.get("url", "")),
                    "updated_by": user_email,
                }
                
                if existing_client:
                    # Update existing client
                    client_data["id"] = existing_client["id"]
                    # Don't overwrite slug, theme, or mappings if they exist
                    if existing_client.get("url_slug"):
                        client_data["url_slug"] = existing_client["url_slug"]
                    clients_to_update.append(client_data)
                    client_id = existing_client["id"]
                else:
                    # New client - generate slug
                    client_data["url_slug"] = self.generate_client_slug()
                    client_data["created_by"] = user_email
                    clients_to_insert.append(client_data)
                    # We'll get the client_id after insert
                    client_id = None
                
                # Store campaign-client link info (include company_name for matching after insert)
                if campaign_id:
                    campaign_client_links.append((campaign_id, client_id, company_name, existing_client is None))
                    
            except Exception as e:
                logger.warning(f"Error preparing client data from campaign {campaign.get('id')}: {str(e)}")
                continue
        
        # Step 3: Batch insert new clients
        created_count = 0
        if clients_to_insert:
            try:
                result = self.client.table("clients").insert(clients_to_insert).execute()
                inserted_clients = result.data if result.data else []
                created_count = len(inserted_clients)
                
                # Create a map of company_name to client_id for inserted clients
                inserted_client_map = {client["company_name"]: client["id"] for client in inserted_clients}
                
                # Update campaign_client_links with new client IDs
                updated_links = []
                for campaign_id, old_client_id, company_name, is_primary in campaign_client_links:
                    if old_client_id is None and company_name in inserted_client_map:
                        updated_links.append((campaign_id, inserted_client_map[company_name], company_name, is_primary))
                    else:
                        updated_links.append((campaign_id, old_client_id, company_name, is_primary))
                campaign_client_links = updated_links
                
                logger.info(f"Batch inserted {created_count} new clients")
            except Exception as e:
                logger.error(f"Error batch inserting clients: {str(e)}")
                # Fallback to individual inserts
                inserted_client_map = {}
                for client_data in clients_to_insert:
                    try:
                        result = self.client.table("clients").insert(client_data).execute()
                        if result.data:
                            created_count += 1
                            inserted_client_map[client_data["company_name"]] = result.data[0]["id"]
                    except Exception as insert_error:
                        logger.warning(f"Error inserting client {client_data.get('company_name')}: {str(insert_error)}")
                
                # Update links with individually inserted clients
                updated_links = []
                for campaign_id, old_client_id, company_name, is_primary in campaign_client_links:
                    if old_client_id is None and company_name in inserted_client_map:
                        updated_links.append((campaign_id, inserted_client_map[company_name], company_name, is_primary))
                    else:
                        updated_links.append((campaign_id, old_client_id, company_name, is_primary))
                campaign_client_links = updated_links
        
        # Step 4: Batch update existing clients
        updated_count = 0
        if clients_to_update:
            try:
                # Update clients individually (Supabase doesn't support batch update easily)
                for client_data in clients_to_update:
                    try:
                        client_id = client_data.pop("id")
                        result = self.client.table("clients").update(client_data).eq("id", client_id).execute()
                        if result.data:
                            updated_count += 1
                    except Exception as update_error:
                        logger.warning(f"Error updating client {client_data.get('company_name')}: {str(update_error)}")
                
                logger.info(f"Batch updated {updated_count} existing clients")
            except Exception as e:
                logger.error(f"Error batch updating clients: {str(e)}")
        
        # Step 5: Link campaigns to clients
        linked_count = 0
        for campaign_id, client_id, company_name, is_primary in campaign_client_links:
            if client_id:
                try:
                    self._link_campaign_to_client(campaign_id, client_id, is_primary)
                    linked_count += 1
                except Exception as link_error:
                    logger.warning(f"Error linking campaign {campaign_id} to client {client_id} ({company_name}): {str(link_error)}")
        
        total_count = created_count + updated_count
        logger.info(f"Batch upserted clients: {created_count} created, {updated_count} updated, {linked_count} campaign links")
        
        return {
            "created": created_count,
            "updated": updated_count,
            "total": total_count,
            "linked": linked_count
        }
    
    def upsert_client_from_campaign(self, campaign: Dict, user_email: Optional[str] = None) -> Dict:
        """Create or update a client from an Agency Analytics campaign"""
        try:
            company_name = campaign.get("company", "").strip()
            if not company_name:
                raise ValueError("Campaign must have a company name")
            
            company_id = campaign.get("company_id")
            
            # Check if client already exists by company_id or company_name
            existing_client = None
            if company_id:
                result = self.client.table("clients").select("*").eq("company_id", company_id).limit(1).execute()
                if result.data:
                    existing_client = result.data[0]
            
            if not existing_client:
                result = self.client.table("clients").select("*").eq("company_name", company_name).limit(1).execute()
                if result.data:
                    existing_client = result.data[0]
            
            # Prepare client data
            client_data = {
                "company_name": company_name,
                "company_id": company_id,
                "url": campaign.get("url"),
                "email_addresses": campaign.get("email_addresses", []),
                "phone_numbers": campaign.get("phone_numbers", []),
                "address": campaign.get("address"),
                "city": campaign.get("city"),
                "state": campaign.get("state"),
                "zip": campaign.get("zip"),
                "country": campaign.get("country"),
                "timezone": campaign.get("timezone"),
                "company_domain": self._extract_domain(campaign.get("url", "")),
                "updated_by": user_email,
            }
            
            # Generate slug if client doesn't exist (UUID-based for security)
            if not existing_client:
                client_data["url_slug"] = self.generate_client_slug()
                client_data["created_by"] = user_email
            else:
                # Update existing client with campaign data (don't overwrite theme/branding)
                client_data["id"] = existing_client["id"]
            
            # Upsert client
            result = self.client.table("clients").upsert(client_data).execute()
            client = result.data[0] if result.data else client_data
            
            # Link campaign to client
            campaign_id = campaign.get("id")
            if campaign_id:
                self._link_campaign_to_client(campaign_id, client["id"], existing_client is None)
            
            logger.info(f"Upserted client '{company_name}' (ID: {client.get('id')}) from campaign {campaign_id}")
            return client
            
        except Exception as e:
            logger.error(f"Error upserting client from campaign: {str(e)}")
            raise
    
    def _extract_domain(self, url: str) -> Optional[str]:
        """Extract domain from URL"""
        if not url:
            return None
        try:
            parsed = urlparse(url)
            domain = parsed.netloc or parsed.path
            # Remove www. prefix
            if domain.startswith("www."):
                domain = domain[4:]
            return domain.lower() if domain else None
        except Exception:
            return None
    
    def _link_campaign_to_client(self, campaign_id: int, client_id: int, is_primary: bool = False):
        """Link a campaign to a client"""
        try:
            # Check if link already exists
            result = self.client.table("client_campaigns").select("*").eq("campaign_id", campaign_id).eq("client_id", client_id).limit(1).execute()
            
            if result.data:
                # Update existing link
                link_data = {
                    "is_primary": is_primary,
                    "updated_at": datetime.now().isoformat()
                }
                self.client.table("client_campaigns").update(link_data).eq("id", result.data[0]["id"]).execute()
            else:
                # Create new link
                link_data = {
                    "client_id": client_id,
                    "campaign_id": campaign_id,
                    "is_primary": is_primary
                }
                self.client.table("client_campaigns").upsert(link_data).execute()
        except Exception as e:
            logger.warning(f"Error linking campaign {campaign_id} to client {client_id}: {str(e)}")
    
    def get_client_by_slug(self, url_slug: str) -> Optional[Dict]:
        """Get client by URL slug"""
        try:
            result = self.client.table("clients").select("*").eq("url_slug", url_slug).limit(1).execute()
            if result.data:
                return result.data[0]
            return None
        except Exception as e:
            logger.error(f"Error getting client by slug {url_slug}: {str(e)}")
            return None
    
    def get_client_by_id(self, client_id: int) -> Optional[Dict]:
        """Get client by ID"""
        try:
            result = self.client.table("clients").select("*").eq("id", client_id).limit(1).execute()
            if result.data:
                return result.data[0]
            return None
        except Exception as e:
            logger.error(f"Error getting client by ID {client_id}: {str(e)}")
            return None
    
    def update_client_mapping(self, client_id: int, ga4_property_id: Optional[str] = None, scrunch_brand_id: Optional[int] = None, user_email: Optional[str] = None) -> bool:
        """Update client mappings (GA4 property ID or Scrunch brand ID)"""
        try:
            update_data = {
                "updated_by": user_email,
                "updated_at": datetime.now().isoformat()
            }
            
            if ga4_property_id is not None:
                update_data["ga4_property_id"] = ga4_property_id
            
            if scrunch_brand_id is not None:
                update_data["scrunch_brand_id"] = scrunch_brand_id
            
            result = self.client.table("clients").update(update_data).eq("id", client_id).execute()
            logger.info(f"Updated client {client_id} mappings")
            return True
        except Exception as e:
            logger.error(f"Error updating client mappings: {str(e)}")
            return False
    
    def update_client_theme(self, client_id: int, theme_data: Dict, user_email: Optional[str] = None) -> bool:
        """Update client theme and branding"""
        try:
            update_data = {
                "updated_by": user_email,
                "updated_at": datetime.now().isoformat()
            }
            
            if "theme_color" in theme_data:
                update_data["theme_color"] = theme_data["theme_color"]
            if "logo_url" in theme_data:
                update_data["logo_url"] = theme_data["logo_url"]
            if "secondary_color" in theme_data:
                update_data["secondary_color"] = theme_data["secondary_color"]
            if "font_family" in theme_data:
                update_data["font_family"] = theme_data["font_family"]
            if "favicon_url" in theme_data:
                update_data["favicon_url"] = theme_data["favicon_url"]
            if "report_title" in theme_data:
                update_data["report_title"] = theme_data["report_title"]
            if "custom_css" in theme_data:
                update_data["custom_css"] = theme_data["custom_css"]
            if "footer_text" in theme_data:
                update_data["footer_text"] = theme_data["footer_text"]
            if "header_text" in theme_data:
                update_data["header_text"] = theme_data["header_text"]
            
            result = self.client.table("clients").update(update_data).eq("id", client_id).execute()
            logger.info(f"Updated client {client_id} theme")
            return True
        except Exception as e:
            logger.error(f"Error updating client theme: {str(e)}")
            return False
    
    def get_client_campaigns(self, client_id: int) -> List[Dict]:
        """Get all campaigns linked to a client"""
        try:
            result = self.client.table("client_campaigns").select("*, agency_analytics_campaigns(*)").eq("client_id", client_id).execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Error getting client campaigns: {str(e)}")
            return []
    
    # =====================================================
    # Agency Analytics Methods
    # =====================================================
    
    def upsert_agency_analytics_campaign(self, campaign: Dict) -> int:
        """Upsert Agency Analytics campaign metadata - Updates existing records by primary key (id)"""
        try:
            record = {
                "id": campaign.get("id"),
                "date_created": campaign.get("date_created"),
                "date_modified": campaign.get("date_modified"),
                "url": campaign.get("url"),
                "company": campaign.get("company"),
                "scope": campaign.get("scope"),
                "status": campaign.get("status"),
                "group_title": campaign.get("group_title"),
                "email_addresses": campaign.get("email_addresses"),
                "phone_numbers": campaign.get("phone_numbers"),
                "address": campaign.get("address"),
                "city": campaign.get("city"),
                "state": campaign.get("state"),
                "zip": campaign.get("zip"),
                "country": campaign.get("country"),
                "revenue": campaign.get("revenue"),
                "headcount": campaign.get("headcount"),
                "google_ignore_places": campaign.get("google_ignore_places"),
                "enforce_google_cid": campaign.get("enforce_google_cid"),
                "timezone": campaign.get("timezone"),
                "type": campaign.get("type"),
                "campaign_group_id": campaign.get("campaign_group_id"),
                "company_id": campaign.get("company_id"),
                "account_id": campaign.get("account_id"),
                "updated_at": datetime.now().isoformat()
            }
            
            # Upsert by primary key (id) - Supabase automatically handles conflicts on primary keys
            # This will update existing records or insert new ones
            result = self.client.table("agency_analytics_campaigns").upsert(record).execute()
            logger.debug(f"Upserted campaign {campaign.get('id')}")
            return 1
        except Exception as e:
            error_str = str(e)
            # If upsert fails, try update then insert as fallback
            if "conflict" in error_str.lower() or "duplicate" in error_str.lower() or "23505" in error_str:
                try:
                    # Try to update first (record exists)
                    campaign_id = campaign.get("id")
                    update_result = self.client.table("agency_analytics_campaigns").update(record).eq("id", campaign_id).execute()
                    if update_result.data:
                        logger.debug(f"Updated existing campaign {campaign_id}")
                        return 1
                    # If update didn't find record, insert (new record)
                    insert_result = self.client.table("agency_analytics_campaigns").insert(record).execute()
                    logger.debug(f"Inserted new campaign {campaign_id}")
                    return 1
                except Exception as retry_error:
                    logger.warning(f"Retry upsert failed for campaign {campaign.get('id')}: {str(retry_error)}")
                    # Don't raise - return 0 to indicate failure but don't stop the sync
                    return 0
            logger.error(f"Error upserting campaign {campaign.get('id')}: {error_str}")
            # Don't raise - return 0 to allow sync to continue
            return 0
    
    def upsert_agency_analytics_rankings(self, rankings: List[Dict]) -> int:
        """Upsert Agency Analytics campaign rankings - Optimized batch upsert"""
        if not rankings:
            return 0
        
        try:
            # Add updated_at timestamp to all records
            for record in rankings:
                record["updated_at"] = datetime.now().isoformat()
            
            # Use batch upsert - Supabase handles conflicts automatically via unique constraint
            batch_size = 500  # Larger batch size for better performance
            total_upserted = 0
            
            for i in range(0, len(rankings), batch_size):
                batch = rankings[i:i + batch_size]
                
                # Filter out records without required field
                valid_batch = [r for r in batch if r.get("campaign_id_date")]
                
                if not valid_batch:
                    continue
                
                try:
                    # Batch upsert - Supabase automatically handles conflicts on unique constraints (campaign_id_date)
                    # This will update existing records or insert new ones
                    result = self.client.table("agency_analytics_campaign_rankings").upsert(valid_batch).execute()
                    
                    total_upserted += len(valid_batch)
                    logger.debug(f"Upserted batch {i//batch_size + 1}: {len(valid_batch)} records")
                except Exception as batch_error:
                    error_str = str(batch_error)
                    # Check if table doesn't exist
                    if "Could not find the table" in error_str or "does not exist" in error_str:
                        logger.warning(f"Table 'agency_analytics_campaign_rankings' does not exist yet. Please run the SQL script to create it.")
                        return 0
                    # Fallback to smaller batches if large batch fails
                    logger.warning(f"Batch upsert failed, trying smaller batches: {error_str}")
                    small_batch_size = 50
                    for j in range(0, len(valid_batch), small_batch_size):
                        small_batch = valid_batch[j:j + small_batch_size]
                        try:
                            self.client.table("agency_analytics_campaign_rankings").upsert(small_batch).execute()
                            total_upserted += len(small_batch)
                        except Exception as small_batch_error:
                            # Log but continue - don't fail the entire sync
                            logger.warning(f"Failed to upsert small batch (continuing): {str(small_batch_error)}")
            
            logger.info(f"Total upserted {total_upserted} rankings")
            return total_upserted
        except Exception as e:
            logger.error(f"Error upserting rankings: {str(e)}")
            raise
    
    def link_campaign_to_brand(self, campaign_id: int, brand_id: int, match_method: str = "url_match", match_confidence: str = "exact") -> int:
        """Link an Agency Analytics campaign to a brand"""
        try:
            record = {
                "campaign_id": campaign_id,
                "brand_id": brand_id,
                "match_method": match_method,
                "match_confidence": match_confidence,
                "updated_at": datetime.now().isoformat()
            }
            
            result = self.client.table("agency_analytics_campaign_brands").upsert(record).execute()
            logger.info(f"Linked campaign {campaign_id} to brand {brand_id} ({match_method}, {match_confidence})")
            return 1
        except Exception as e:
            error_str = str(e)
            # Check if table doesn't exist
            if "Could not find the table" in error_str or "does not exist" in error_str:
                logger.warning(f"Table 'agency_analytics_campaign_brands' does not exist yet. Please run the SQL script to create it. Skipping link for campaign {campaign_id} to brand {brand_id}.")
                return 0  # Return 0 instead of raising error
            logger.error(f"Error linking campaign to brand: {error_str}")
            raise
    
    def get_campaign_brand_links(self, campaign_id: Optional[int] = None, brand_id: Optional[int] = None) -> List[Dict]:
        """Get campaign-brand links"""
        try:
            query = self.client.table("agency_analytics_campaign_brands").select("*")
            
            if campaign_id:
                query = query.eq("campaign_id", campaign_id)
            if brand_id:
                query = query.eq("brand_id", brand_id)
            
            result = query.execute()
            return result.data if hasattr(result, 'data') else []
        except Exception as e:
            error_str = str(e)
            # Check if table doesn't exist
            if "Could not find the table" in error_str or "does not exist" in error_str:
                logger.warning(f"Table 'agency_analytics_campaign_brands' does not exist yet. Please run the SQL script to create it.")
                return []  # Return empty list instead of raising error
            logger.error(f"Error fetching campaign-brand links: {error_str}")
            raise
    
    def upsert_agency_analytics_keywords(self, keywords: List[Dict]) -> int:
        """Upsert Agency Analytics keywords - Optimized batch upsert"""
        if not keywords:
            return 0
        
        try:
            # Add updated_at timestamp to all records
            for record in keywords:
                record["updated_at"] = datetime.now().isoformat()
            
            # Use batch upsert - Supabase handles conflicts automatically via unique constraint
            batch_size = 500  # Larger batch size for better performance
            total_upserted = 0
            
            for i in range(0, len(keywords), batch_size):
                batch = keywords[i:i + batch_size]
                
                # Filter out records without required field
                valid_batch = [r for r in batch if r.get("campaign_keyword_id")]
                
                if not valid_batch:
                    continue
                
                try:
                    # Batch upsert - Supabase automatically handles conflicts on unique constraints (campaign_keyword_id)
                    # This will update existing records or insert new ones
                    result = self.client.table("agency_analytics_keywords").upsert(valid_batch).execute()
                    
                    total_upserted += len(valid_batch)
                    logger.debug(f"Upserted batch {i//batch_size + 1}: {len(valid_batch)} keywords")
                except Exception as batch_error:
                    error_str = str(batch_error)
                    # Check if table doesn't exist
                    if "Could not find the table" in error_str or "does not exist" in error_str:
                        logger.warning(f"Table 'agency_analytics_keywords' does not exist yet. Please run the SQL script to create it.")
                        return 0
                    # Fallback to smaller batches if large batch fails
                    logger.warning(f"Batch upsert failed, trying smaller batches: {error_str}")
                    small_batch_size = 50
                    for j in range(0, len(valid_batch), small_batch_size):
                        small_batch = valid_batch[j:j + small_batch_size]
                        try:
                            self.client.table("agency_analytics_keywords").upsert(small_batch).execute()
                            total_upserted += len(small_batch)
                        except Exception as small_batch_error:
                            # Log but continue - don't fail the entire sync
                            logger.warning(f"Failed to upsert small batch (continuing): {str(small_batch_error)}")
            
            logger.info(f"Total upserted {total_upserted} keywords")
            return total_upserted
        except Exception as e:
            logger.error(f"Error upserting keywords: {str(e)}")
            raise
    
    def upsert_agency_analytics_keyword_rankings(self, rankings: List[Dict]) -> int:
        """Upsert Agency Analytics keyword rankings (daily records) - Optimized batch upsert"""
        if not rankings:
            return 0
        
        try:
            # Add updated_at timestamp to all records
            for record in rankings:
                record["updated_at"] = datetime.now().isoformat()
            
            # Use batch upsert - Supabase handles conflicts automatically via unique constraint
            batch_size = 500  # Larger batch size for better performance
            total_upserted = 0
            
            for i in range(0, len(rankings), batch_size):
                batch = rankings[i:i + batch_size]
                
                # Filter out records without required field
                valid_batch = [r for r in batch if r.get("keyword_id_date")]
                
                if not valid_batch:
                    continue
                
                try:
                    # Batch upsert - Supabase automatically handles conflicts on unique constraints (keyword_id_date)
                    # This will update existing records or insert new ones
                    result = self.client.table("agency_analytics_keyword_rankings").upsert(valid_batch).execute()
                    
                    total_upserted += len(valid_batch)
                    logger.debug(f"Upserted batch {i//batch_size + 1}: {len(valid_batch)} records")
                except Exception as batch_error:
                    error_str = str(batch_error)
                    # Check if table doesn't exist
                    if "Could not find the table" in error_str or "does not exist" in error_str:
                        logger.warning(f"Table 'agency_analytics_keyword_rankings' does not exist yet. Please run the SQL script to create it.")
                        return 0
                    # Fallback to smaller batches if large batch fails
                    logger.warning(f"Batch upsert failed, trying smaller batches: {error_str}")
                    small_batch_size = 50
                    for j in range(0, len(valid_batch), small_batch_size):
                        small_batch = valid_batch[j:j + small_batch_size]
                        try:
                            self.client.table("agency_analytics_keyword_rankings").upsert(small_batch).execute()
                            total_upserted += len(small_batch)
                        except Exception as small_batch_error:
                            # Log but continue - don't fail the entire sync
                            logger.warning(f"Failed to upsert small batch (continuing): {str(small_batch_error)}")
            
            logger.info(f"Total upserted {total_upserted} keyword rankings")
            return total_upserted
        except Exception as e:
            error_str = str(e)
            # Check if table doesn't exist
            if "Could not find the table" in error_str or "does not exist" in error_str:
                logger.warning(f"Table 'agency_analytics_keyword_rankings' does not exist yet. Please run the SQL script to create it.")
                return 0
            logger.error(f"Error upserting keyword rankings: {error_str}")
            raise
    
    def upsert_agency_analytics_keyword_ranking_summary(self, summary: Dict) -> int:
        """Upsert Agency Analytics keyword ranking summary (latest + change) - Updates existing records by primary key (keyword_id)"""
        if not summary:
            return 0
        
        try:
            summary["updated_at"] = datetime.now().isoformat()
            
            # Upsert by keyword_id (primary key) - Supabase automatically handles conflicts on primary keys
            # This will update existing records or insert new ones
            self.client.table("agency_analytics_keyword_ranking_summaries").upsert(summary).execute()
            logger.debug(f"Upserted keyword ranking summary for keyword {summary.get('keyword_id')}")
            return 1
        except Exception as e:
            error_str = str(e)
            # Check if table doesn't exist
            if "Could not find the table" in error_str or "does not exist" in error_str:
                logger.warning(f"Table 'agency_analytics_keyword_ranking_summaries' does not exist yet. Please run the SQL script to create it.")
                return 0
            # If upsert fails, try update then insert as fallback
            if "conflict" in error_str.lower() or "duplicate" in error_str.lower() or "23505" in error_str:
                try:
                    keyword_id = summary.get("keyword_id")
                    # Try to update first (record exists)
                    update_result = self.client.table("agency_analytics_keyword_ranking_summaries").update(summary).eq("keyword_id", keyword_id).execute()
                    if update_result.data:
                        logger.debug(f"Updated existing keyword ranking summary for keyword {keyword_id}")
                        return 1
                    # If update didn't find record, insert (new record)
                    insert_result = self.client.table("agency_analytics_keyword_ranking_summaries").insert(summary).execute()
                    logger.debug(f"Inserted new keyword ranking summary for keyword {keyword_id}")
                    return 1
                except Exception as retry_error:
                    logger.warning(f"Retry upsert failed for keyword {summary.get('keyword_id')}: {str(retry_error)}")
                    # Don't raise - return 0 to indicate failure but don't stop the sync
                    return 0
            logger.error(f"Error upserting keyword ranking summary: {error_str}")
            # Don't raise - return 0 to allow sync to continue
            return 0
    
    def upsert_agency_analytics_keyword_ranking_summaries_batch(self, summaries: List[Dict]) -> int:
        """Batch upsert Agency Analytics keyword ranking summaries - Optimized"""
        if not summaries:
            return 0
        
        try:
            # Add updated_at timestamp to all summaries
            for summary in summaries:
                summary["updated_at"] = datetime.now().isoformat()
            
            # Batch upsert - Supabase handles conflicts via keyword_id primary key
            batch_size = 100
            total_upserted = 0
            
            for i in range(0, len(summaries), batch_size):
                batch = summaries[i:i + batch_size]
                
                try:
                    # Batch upsert - Supabase automatically handles conflicts on primary keys (keyword_id)
                    # This will update existing records or insert new ones
                    result = self.client.table("agency_analytics_keyword_ranking_summaries").upsert(batch).execute()
                    total_upserted += len(batch)
                    logger.debug(f"Upserted summary batch {i//batch_size + 1}: {len(batch)} summaries")
                except Exception as batch_error:
                    error_str = str(batch_error)
                    if "Could not find the table" in error_str or "does not exist" in error_str:
                        logger.warning(f"Table 'agency_analytics_keyword_ranking_summaries' does not exist yet. Please run the SQL script to create it.")
                        return 0
                    # Fallback to individual upserts if batch fails
                    logger.warning(f"Batch upsert failed, falling back to individual upserts: {error_str}")
                    for summary in batch:
                        try:
                            self.client.table("agency_analytics_keyword_ranking_summaries").upsert(summary).execute()
                            total_upserted += 1
                        except Exception as summary_error:
                            # Log but continue - don't fail the entire sync
                            logger.warning(f"Failed to upsert summary for keyword {summary.get('keyword_id')} (continuing): {str(summary_error)}")
            
            logger.info(f"Total upserted {total_upserted} keyword ranking summaries")
            return total_upserted
        except Exception as e:
            error_str = str(e)
            if "Could not find the table" in error_str or "does not exist" in error_str:
                logger.warning(f"Table 'agency_analytics_keyword_ranking_summaries' does not exist yet. Please run the SQL script to create it.")
                return 0
            logger.error(f"Error upserting keyword ranking summaries: {error_str}")
            raise

