"""
Agency Analytics API Client
Fetches campaigns and campaign rankings data
"""
import httpx
import logging
import json
import base64
from typing import Dict, List, Optional, Tuple
from datetime import datetime, timedelta
from urllib.parse import urlparse
from app.core.config import settings

logger = logging.getLogger(__name__)

class AgencyAnalyticsClient:
    """Client for interacting with Agency Analytics API"""
    
    def __init__(self):
        self.base_url = "https://apirequest.app/query"
        
        # Get API key from config (can be overridden via .env)
        api_key = settings.AGENCY_ANALYTICS_API_KEY
        if not api_key:
            raise ValueError(
                "AGENCY_ANALYTICS_API_KEY is not set. "
                "Please set it in config.py or .env file."
            )
        
        # Format: BASE64_ENCODE(:API_KEY) as per API documentation
        # Basic auth requires base64 encoding of ":API_KEY"
        auth_string = f":{api_key}"
        auth_bytes = auth_string.encode('utf-8')
        auth_b64 = base64.b64encode(auth_bytes).decode('utf-8')
        
        self.headers = {
            "Content-Type": "application/json",
            "Authorization": f"Basic {auth_b64}"
        }
    
    async def _request(self, body: Dict) -> Dict:
        """Make HTTP request to Agency Analytics API"""
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    self.base_url,
                    headers=self.headers,
                    json=body
                )
                
                # API always returns 200, but check response status field
                response_data = response.json()
                
                # Check for errors in response
                if response_data.get("status") == "error":
                    error_code = response_data.get("code", 0)
                    error_messages = response_data.get("results", {}).get("messages", {})
                    
                    error_msg = f"Agency Analytics API error (code {error_code})"
                    if error_messages:
                        error_msg += f": {json.dumps(error_messages)}"
                    
                    logger.error(error_msg)
                    raise Exception(error_msg)
                
                # Check HTTP status code (should be 200, but handle other codes)
                if response.status_code != 200:
                    logger.error(f"HTTP error: {response.status_code} - {response.text}")
                    response.raise_for_status()
                
                return response_data
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Error making request: {str(e)}")
            raise
    
    async def get_campaigns(self, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get campaigns with pagination"""
        try:
            body = {
                "provider": "agency-analytics-v2",
                "asset": "campaign",
                "operation": "read",
                "fields": [
                    "id",
                    "date_created",
                    "date_modified",
                    "url",
                    "company",
                    "scope",
                    "status",
                    "group_title",
                    "email_addresses",
                    "phone_numbers",
                    "address",
                    "city",
                    "state",
                    "zip",
                    "country",
                    "revenue",
                    "headcount",
                    "google_ignore_places",
                    "enforce_google_cid",
                    "timezone",
                    "type",
                    "campaign_group_id",
                    "company_id",
                    "account_id"
                ],
                "sort": {"id": "desc"},
                "offset": offset,
                "limit": limit
            }
            
            response = await self._request(body)
            return response.get("results", {}).get("rows", [])
        except Exception as e:
            logger.error(f"Error fetching campaigns: {str(e)}")
            raise
    
    async def get_all_campaigns(self) -> List[Dict]:
        """Get all campaigns with automatic pagination"""
        all_campaigns = []
        offset = 0
        batch_size = 100  # Reasonable batch size
        
        while True:
            try:
                campaigns = await self.get_campaigns(limit=batch_size, offset=offset)
                if not campaigns:
                    break
                
                all_campaigns.extend(campaigns)
                
                # If we got fewer than batch_size, we've reached the end
                if len(campaigns) < batch_size:
                    break
                
                offset += batch_size
            except Exception as e:
                logger.error(f"Error fetching campaigns batch at offset {offset}: {str(e)}")
                break
        
        return all_campaigns
    
    async def get_campaign(self, campaign_id: int) -> Optional[Dict]:
        """Get a specific campaign by ID"""
        try:
            body = {
                "provider": "agency-analytics-v2",
                "asset": "campaign",
                "operation": "read",
                "fields": [
                    "id",
                    "date_created",
                    "date_modified",
                    "url",
                    "company",
                    "scope",
                    "status",
                    "group_title",
                    "email_addresses",
                    "phone_numbers",
                    "address",
                    "city",
                    "state",
                    "zip",
                    "country",
                    "revenue",
                    "headcount",
                    "google_ignore_places",
                    "enforce_google_cid",
                    "timezone",
                    "type",
                    "campaign_group_id",
                    "company_id",
                    "account_id"
                ],
                "filters": [
                    {
                        "id": {"$equals_comparison": campaign_id}
                    }
                ],
                "sort": {"id": "desc"},
                "offset": 0,
                "limit": 50
            }
            
            response = await self._request(body)
            rows = response.get("results", {}).get("rows", [])
            return rows[0] if rows else None
        except Exception as e:
            logger.error(f"Error fetching campaign {campaign_id}: {str(e)}")
            raise
    
    async def get_campaign_rankings(
        self,
        campaign_id: int,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict]:
        """Get campaign rankings data (last 30 days by default)"""
        try:
            # Default to last 30 days
            if not end_date:
                end_date = datetime.now().strftime("%Y-%m-%d")
            if not start_date:
                # Get last 30 days
                start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            
            body = {
                "provider": "agency-analytics-v2",
                "asset": "campaign-rankings",
                "operation": "read",
                "fields": [
                    "date",
                    "google_ranking_change",
                    "google_ranking_count",
                    "google_local_ranking_change",
                    "google_local_ranking_count",
                    "google_mobile_ranking_change",
                    "google_mobile_ranking_count",
                    "bing_ranking_change",
                    "bing_ranking_count",
                    "ranking_average",
                    "results",
                    "volume",
                    "competition",
                    "field_status"
                ],
                "filters": [
                    {"end_date": {"$lessthanorequal_comparison": end_date}},
                    {"start_date": {"$greaterthanorequal_comparison": start_date}},
                    {"campaign_id": {"$equals_comparison": campaign_id}}
                ],
                "group_by": ["date"],
                "sort": {"date": "asc"},
                "offset": 0,
                "limit": 9999
            }
            
            response = await self._request(body)
            return response.get("results", {}).get("rows", [])
        except Exception as e:
            logger.error(f"Error fetching campaign rankings for {campaign_id}: {str(e)}")
            raise
    
    async def get_campaign_keywords(self, campaign_id: int, limit: int = 50, offset: int = 0) -> List[Dict]:
        """Get keywords for a specific campaign (max limit is 500 per API)"""
        try:
            # API has max limit of 500, so cap it
            limit = min(limit, 500)
            
            body = {
                "provider": "agency-analytics-v2",
                "asset": "keyword",
                "operation": "read",
                "fields": [
                    "id",
                    "date_created",
                    "date_modified",
                    "keyword_phrase",
                    "primary_keyword",
                    "campaign_id",
                    "search_location",
                    "search_language",
                    "tags"
                ],
                "filters": [
                    {"campaign_id": {"$equals_comparison": campaign_id}}
                ],
                "sort": {"id": "desc"},
                "offset": offset,
                "limit": limit
            }
            
            response = await self._request(body)
            return response.get("results", {}).get("rows", [])
        except Exception as e:
            logger.error(f"Error fetching keywords for campaign {campaign_id}: {str(e)}")
            raise
    
    async def get_all_campaign_keywords(self, campaign_id: int) -> List[Dict]:
        """Get all keywords for a campaign with automatic pagination (handles limit of 500)"""
        all_keywords = []
        offset = 0
        batch_size = 500  # Max allowed by API
        
        while True:
            try:
                keywords = await self.get_campaign_keywords(campaign_id, limit=batch_size, offset=offset)
                if not keywords:
                    break
                
                all_keywords.extend(keywords)
                
                # If we got fewer than batch_size, we've reached the end
                if len(keywords) < batch_size:
                    break
                
                offset += batch_size
            except Exception as e:
                logger.error(f"Error fetching keywords batch at offset {offset}: {str(e)}")
                break
        
        return all_keywords
    
    def format_keywords_data(self, keywords: List[Dict]) -> List[Dict]:
        """Format keywords data for database storage"""
        formatted_rows = []
        
        for row in keywords:
            # Format search_location
            location_text = "N/A"
            location_obj = row.get("search_location")
            
            if location_obj and isinstance(location_obj, dict):
                parts = []
                if location_obj.get("formatted_name"):
                    parts.append(location_obj["formatted_name"])
                if location_obj.get("region_name") and location_obj["region_name"] != location_obj.get("formatted_name"):
                    parts.append(location_obj["region_name"])
                if location_obj.get("country_code"):
                    parts.append(f"({location_obj['country_code']})")
                if location_obj.get("latitude") and location_obj.get("longitude"):
                    parts.append(f"lat: {location_obj['latitude']}, long: {location_obj['longitude']}")
                location_text = " ".join(parts) if parts else "N/A"
            
            # Create unique identifier
            campaign_id = row.get("campaign_id", "N/A")
            keyword_id = row.get("id", "N/A")
            campaign_keyword_id = f"{campaign_id} - {keyword_id}"
            
            # Format tags
            tags = row.get("tags", [])
            if isinstance(tags, list):
                tags_str = ", ".join(tags) if tags else "N/A"
            else:
                tags_str = str(tags) if tags else "N/A"
            
            formatted_rows.append({
                "id": keyword_id,
                "campaign_id": campaign_id,
                "campaign_keyword_id": campaign_keyword_id,
                "keyword_phrase": row.get("keyword_phrase", ""),
                "primary_keyword": bool(row.get("primary_keyword", False)),
                "search_location": location_text,
                "search_location_formatted_name": location_obj.get("formatted_name") if isinstance(location_obj, dict) else None,
                "search_location_region_name": location_obj.get("region_name") if isinstance(location_obj, dict) else None,
                "search_location_country_code": location_obj.get("country_code") if isinstance(location_obj, dict) else None,
                "search_location_latitude": float(location_obj.get("latitude")) if isinstance(location_obj, dict) and location_obj.get("latitude") else None,
                "search_location_longitude": float(location_obj.get("longitude")) if isinstance(location_obj, dict) and location_obj.get("longitude") else None,
                "search_language": row.get("search_language", "N/A"),
                "tags": tags_str,
                "date_created": row.get("date_created"),
                "date_modified": row.get("date_modified")
            })
        
        return formatted_rows
    
    def format_rankings_data(self, rankings: List[Dict], campaign_data: Dict) -> List[Dict]:
        """Format rankings data for database storage"""
        client_name = campaign_data.get("company", "Unknown Client")
        campaign_id = campaign_data.get("id", "N/A")
        
        formatted_rows = []
        for row in rankings:
            date = row.get("date", "N/A")
            
            # Convert date from "YYYY-MM" to "YYYY-MM-01" (first day of month)
            # PostgreSQL DATE type requires full date format
            if date and date != "N/A" and len(date) == 7 and date.count("-") == 1:
                # Format is "YYYY-MM", append "-01" to make it a valid date
                date = f"{date}-01"
            elif date and date != "N/A":
                # Try to parse and format if it's already a date string
                try:
                    # If it's already in YYYY-MM-DD format, keep it
                    if len(date) == 10 and date.count("-") == 2:
                        # Validate it's a proper date
                        datetime.strptime(date, "%Y-%m-%d")
                    else:
                        # Try to parse various formats
                        parsed_date = datetime.strptime(date, "%Y-%m-%d")
                        date = parsed_date.strftime("%Y-%m-%d")
                except ValueError:
                    # If parsing fails, default to first day of current month
                    logger.warning(f"Invalid date format: {date}, using first day of month")
                    date = datetime.now().strftime("%Y-%m-01")
            
            formatted_rows.append({
                "campaign_id": campaign_id,
                "client_name": client_name,
                "date": date,
                "campaign_id_date": f"{campaign_id}-{date}",
                "google_ranking_count": row.get("google_ranking_count", 0) or 0,
                "google_ranking_change": row.get("google_ranking_change", 0) or 0,
                "google_local_count": row.get("google_local_ranking_count", 0) or 0,
                "google_mobile_count": row.get("google_mobile_ranking_count", 0) or 0,
                "bing_ranking_count": row.get("bing_ranking_count", 0) or 0,
                "ranking_average": float(row.get("ranking_average", 0) or 0),
                "search_volume": row.get("volume", 0) or 0,
                "competition": float(row.get("competition", 0) or 0)
            })
        
        return formatted_rows
    
    async def get_keyword_rankings(
        self,
        keyword_id: int,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict]:
        """Get keyword rankings data (last 30 days by default)"""
        try:
            # Default to last 30 days if not provided
            if not end_date:
                end_date = datetime.now().strftime("%Y-%m-%d")
            if not start_date:
                # Get last 30 days
                start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            
            body = {
                "provider": "agency-analytics-v2",
                "asset": "keyword-rankings",
                "operation": "read",
                "fields": [
                    "date",
                    "google_ranking",
                    "google_ranking_url",
                    "google_mobile_ranking",
                    "google_mobile_ranking_url",
                    "google_local_ranking",
                    "bing_ranking",
                    "bing_ranking_url",
                    "results",
                    "volume",
                    "competition",
                    "field_status"
                ],
                "filters": [
                    {"end_date": {"$lessthanorequal_comparison": end_date}},
                    {"start_date": {"$greaterthanorequal_comparison": start_date}},
                    {"keyword_id": {"$equals_comparison": keyword_id}}
                ],
                "group_by": ["date"],
                "sort": {"date": "asc"},
                "offset": 0,
                "limit": 9999
            }
            
            response = await self._request(body)
            return response.get("results", {}).get("rows", [])
        except Exception as e:
            logger.error(f"Error fetching keyword rankings for {keyword_id}: {str(e)}")
            raise
    
    def format_keyword_rankings_data(
        self,
        rankings: List[Dict],
        keyword_id: int,
        campaign_id: int,
        keyword_phrase: str = ""
    ) -> Tuple[List[Dict], Optional[Dict]]:
        """
        Format keyword rankings data for database storage
        Returns: (daily_records, summary_record)
        """
        if not rankings:
            return [], None
        
        # Sort by date
        sorted_rankings = sorted(rankings, key=lambda x: x.get("date", ""))
        
        daily_records = []
        for row in sorted_rankings:
            date = row.get("date", "N/A")
            
            # Convert date from "YYYY-MM" to "YYYY-MM-01" if needed
            if date and date != "N/A" and len(date) == 7 and date.count("-") == 1:
                date = f"{date}-01"
            elif date and date != "N/A":
                try:
                    if len(date) == 10 and date.count("-") == 2:
                        datetime.strptime(date, "%Y-%m-%d")
                    else:
                        parsed_date = datetime.strptime(date, "%Y-%m-%d")
                        date = parsed_date.strftime("%Y-%m-%d")
                except ValueError:
                    logger.warning(f"Invalid date format: {date}, using first day of month")
                    date = datetime.now().strftime("%Y-%m-%d")
            
            keyword_id_date = f"{keyword_id}-{date}"
            
            # Handle field_status (store as JSON)
            field_status = row.get("field_status")
            if field_status and not isinstance(field_status, dict):
                try:
                    if isinstance(field_status, str):
                        field_status = json.loads(field_status)
                except:
                    field_status = {}
            
            daily_records.append({
                "keyword_id": keyword_id,
                "campaign_id": campaign_id,
                "keyword_id_date": keyword_id_date,
                "date": date,
                "google_ranking": row.get("google_ranking"),
                "google_ranking_url": row.get("google_ranking_url"),
                "google_mobile_ranking": row.get("google_mobile_ranking"),
                "google_mobile_ranking_url": row.get("google_mobile_ranking_url"),
                "google_local_ranking": row.get("google_local_ranking"),
                "bing_ranking": row.get("bing_ranking"),
                "bing_ranking_url": row.get("bing_ranking_url"),
                "results": row.get("results"),
                "volume": row.get("volume"),
                "competition": float(row.get("competition", 0) or 0) if row.get("competition") else None,
                "field_status": field_status
            })
        
        # Calculate summary (latest data + ranking change)
        first_row = sorted_rankings[0]
        last_row = sorted_rankings[-1]
        
        first_rank = first_row.get("google_ranking")
        last_rank = last_row.get("google_ranking")
        ranking_change = None
        if first_rank is not None and last_rank is not None:
            ranking_change = first_rank - last_rank
        
        # Format latest date
        latest_date = last_row.get("date", "")
        if latest_date and len(latest_date) == 7 and latest_date.count("-") == 1:
            latest_date = f"{latest_date}-01"
        
        start_date = first_row.get("date", "")
        if start_date and len(start_date) == 7 and start_date.count("-") == 1:
            start_date = f"{start_date}-01"
        
        # Handle field_status for summary
        summary_field_status = last_row.get("field_status")
        if summary_field_status and not isinstance(summary_field_status, dict):
            try:
                if isinstance(summary_field_status, str):
                    summary_field_status = json.loads(summary_field_status)
            except:
                summary_field_status = {}
        
        summary_record = {
            "keyword_id": keyword_id,
            "campaign_id": campaign_id,
            "keyword_phrase": keyword_phrase,
            "keyword_id_date": f"{keyword_id}-{latest_date}",
            "date": latest_date,
            "google_ranking": last_rank,
            "google_ranking_url": last_row.get("google_ranking_url"),
            "google_mobile_ranking": last_row.get("google_mobile_ranking"),
            "google_mobile_ranking_url": last_row.get("google_mobile_ranking_url"),
            "google_local_ranking": last_row.get("google_local_ranking"),
            "bing_ranking": last_row.get("bing_ranking"),
            "bing_ranking_url": last_row.get("bing_ranking_url"),
            "search_volume": last_row.get("volume"),
            "competition": float(last_row.get("competition", 0) or 0) if last_row.get("competition") else None,
            "results": last_row.get("results"),
            "field_status": summary_field_status,
            "start_date": start_date,
            "end_date": latest_date,
            "start_ranking": first_rank,
            "end_ranking": last_rank,
            "ranking_change": ranking_change
        }
        
        return daily_records, summary_record
    
    @staticmethod
    def extract_domain(url: str) -> Optional[str]:
        """Extract domain from URL"""
        if not url:
            return None
        try:
            # Remove protocol if present
            url = url.strip()
            if not url.startswith(('http://', 'https://')):
                url = 'https://' + url
            
            parsed = urlparse(url)
            domain = parsed.netloc.lower()
            # Remove www. prefix
            if domain.startswith('www.'):
                domain = domain[4:]
            return domain
        except Exception:
            return None
    
    @staticmethod
    def normalize_domain(domain: str) -> str:
        """Normalize domain for comparison"""
        if not domain:
            return ""
        domain = domain.lower().strip()
        # Remove www. prefix
        if domain.startswith('www.'):
            domain = domain[4:]
        # Remove trailing slash
        domain = domain.rstrip('/')
        return domain
    
    @staticmethod
    def match_campaign_to_brand(campaign: Dict, brand: Dict) -> Optional[Dict]:
        """Match campaign to brand based on URL"""
        campaign_url = campaign.get("url", "")
        brand_website = brand.get("website", "")
        
        if not campaign_url or not brand_website:
            return None
        
        campaign_domain = AgencyAnalyticsClient.extract_domain(campaign_url)
        brand_domain = AgencyAnalyticsClient.extract_domain(brand_website)
        
        if not campaign_domain or not brand_domain:
            return None
        
        # Normalize domains
        campaign_domain = AgencyAnalyticsClient.normalize_domain(campaign_domain)
        brand_domain = AgencyAnalyticsClient.normalize_domain(brand_domain)
        
        # Exact match
        if campaign_domain == brand_domain:
            return {
                "campaign_id": campaign.get("id"),
                "brand_id": brand.get("id"),
                "match_method": "url_match",
                "match_confidence": "exact"
            }
        
        # Check if brand domain is in campaign URL or vice versa
        if brand_domain in campaign_url.lower() or campaign_domain in brand_website.lower():
            return {
                "campaign_id": campaign.get("id"),
                "brand_id": brand.get("id"),
                "match_method": "url_match",
                "match_confidence": "partial"
            }
        
        return None

