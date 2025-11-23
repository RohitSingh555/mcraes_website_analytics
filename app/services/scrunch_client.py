import httpx
import logging
from typing import Dict, List, Optional, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class ScrunchAPIClient:
    """Client for interacting with Scrunch AI API"""
    
    def __init__(self):
        self.base_url = settings.SCRUNCH_API_BASE_URL
        self.token = settings.SCRUNCH_API_TOKEN
        self.headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
    
    async def _request(self, method: str, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Make HTTP request to Scrunch API"""
        url = f"{self.base_url}{endpoint}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    params=params,
                    timeout=30.0
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error for {url}: {e.response.status_code} - {e.response.text}")
                raise
            except Exception as e:
                logger.error(f"Error making request to {url}: {str(e)}")
                raise
    
    async def get_brands(self) -> List[Dict]:
        """Retrieve all brands"""
        logger.info("Fetching brands from Scrunch API")
        data = await self._request("GET", "/brands")
        return data if isinstance(data, list) else data.get("items", [])
    
    async def get_prompts(
        self, 
        brand_id: int,
        stage: Optional[str] = None,
        persona_id: Optional[int] = None,
        limit: int = 1000,
        offset: int = 0
    ) -> Dict:
        """Retrieve prompts for a brand"""
        logger.info(f"Fetching prompts for brand {brand_id}")
        params = {
            "limit": limit,
            "offset": offset
        }
        if stage:
            params["stage"] = stage
        if persona_id:
            params["persona_id"] = persona_id
        
        return await self._request("GET", f"/{brand_id}/prompts", params=params)
    
    async def get_responses(
        self,
        brand_id: int,
        platform: Optional[str] = None,
        prompt_id: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 1000,
        offset: int = 0
    ) -> Dict:
        """Retrieve responses for a brand"""
        logger.info(f"Fetching responses for brand {brand_id}")
        params = {
            "limit": limit,
            "offset": offset
        }
        if platform:
            params["platform"] = platform
        if prompt_id:
            params["prompt_id"] = prompt_id
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        
        return await self._request("GET", f"/{brand_id}/responses", params=params)
    
    async def get_all_prompts_paginated(
        self, 
        brand_id: int,
        stage: Optional[str] = None,
        persona_id: Optional[int] = None
    ) -> List[Dict]:
        """Get all prompts with pagination"""
        all_prompts = []
        offset = 0
        limit = 1000
        
        while True:
            data = await self.get_prompts(
                brand_id, 
                stage=stage,
                persona_id=persona_id,
                limit=limit, 
                offset=offset
            )
            prompts = data if isinstance(data, list) else data.get("items", [])
            
            if not prompts:
                break
            
            all_prompts.extend(prompts)
            
            if len(prompts) < limit:
                break
            
            offset += limit
        
        logger.info(f"Fetched {len(all_prompts)} total prompts")
        return all_prompts
    
    async def get_all_responses_paginated(
        self, 
        brand_id: int,
        platform: Optional[str] = None,
        prompt_id: Optional[int] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict]:
        """Get all responses with pagination"""
        all_responses = []
        offset = 0
        limit = 1000
        
        while True:
            data = await self.get_responses(
                brand_id=brand_id,
                platform=platform,
                prompt_id=prompt_id,
                start_date=start_date,
                end_date=end_date,
                limit=limit,
                offset=offset
            )
            
            responses = data if isinstance(data, list) else data.get("items", [])
            
            if not responses:
                break
            
            all_responses.extend(responses)
            
            if len(responses) < limit:
                break
            
            offset += limit
        
        logger.info(f"Fetched {len(all_responses)} total responses")
        return all_responses
    
    async def query_analytics(
        self,
        brand_id: int,
        fields: List[str],
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 50000,
        offset: int = 0
    ) -> Dict:
        """
        Query analytics data using the Query API
        
        Args:
            brand_id: Brand ID
            fields: List of dimension and metric fields to retrieve
            start_date: Start date (YYYY-MM-DD), last 90 days only
            end_date: End date (YYYY-MM-DD)
            limit: Max results (default 50,000)
            offset: Pagination offset
        
        Returns:
            Dict with query results
        """
        logger.info(f"Querying analytics for brand {brand_id} with fields: {fields}")
        params = {
            "fields": ",".join(fields),
            "limit": limit,
            "offset": offset
        }
        if start_date:
            params["start_date"] = start_date
        if end_date:
            params["end_date"] = end_date
        
        return await self._request("GET", f"/{brand_id}/query", params=params)

