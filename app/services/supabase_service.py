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

