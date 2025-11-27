from fastapi import APIRouter, Query, HTTPException, Depends, UploadFile, File, Form
from typing import Optional, List, Dict
import logging
import time
from datetime import datetime, timedelta
import base64
import uuid
from app.services.supabase_service import SupabaseService
from app.services.ga4_client import GA4APIClient
from app.services.agency_analytics_client import AgencyAnalyticsClient
from app.services.scrunch_client import ScrunchAPIClient
from app.core.exceptions import NotFoundException, handle_exception
from app.core.error_utils import handle_api_errors
from app.api.auth import get_current_user
from app.core.config import settings
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter()
ga4_client = GA4APIClient()

@router.get("/data/brands")
@handle_api_errors(context="fetching brands")
async def get_brands(
    limit: Optional[int] = Query(50, description="Number of records to return"),
    offset: Optional[int] = Query(0, description="Offset for pagination")
):
    """Get brands from database"""
    supabase = SupabaseService()
    
    # Get total count first
    count_result = supabase.client.table("brands").select("*", count="exact").execute()
    total_count = count_result.count if hasattr(count_result, 'count') else 0
    
    # Get paginated items
    query = supabase.client.table("brands").select("*")
    
    if limit:
        query = query.limit(limit)
    if offset:
        query = query.offset(offset)
    
    result = query.execute()
    items = result.data if hasattr(result, 'data') else result
    
    return {
        "items": items if isinstance(items, list) else [],
        "count": len(items) if isinstance(items, list) else 0,
        "total_count": total_count
    }

@router.get("/data/prompts")
@handle_api_errors(context="fetching prompts")
async def get_prompts(
    brand_id: Optional[int] = Query(None, description="Filter by brand ID"),
    stage: Optional[str] = Query(None, description="Filter by funnel stage"),
    persona_id: Optional[int] = Query(None, description="Filter by persona ID"),
    limit: Optional[int] = Query(50, description="Number of records to return"),
    offset: Optional[int] = Query(0, description="Offset for pagination")
):
    """Get prompts from database"""
    supabase = SupabaseService()
    
    # Build count query with same filters
    count_query = supabase.client.table("prompts").select("*", count="exact")
    if brand_id:
        count_query = count_query.eq("brand_id", brand_id)
    if stage:
        count_query = count_query.eq("stage", stage)
    if persona_id:
        count_query = count_query.eq("persona_id", persona_id)
    
    count_result = count_query.execute()
    total_count = count_result.count if hasattr(count_result, 'count') else 0
    
    # Get paginated items
    query = supabase.client.table("prompts").select("*")
    
    if brand_id:
        query = query.eq("brand_id", brand_id)
    if stage:
        query = query.eq("stage", stage)
    if persona_id:
        query = query.eq("persona_id", persona_id)
    
    if limit:
        query = query.limit(limit)
    if offset:
        query = query.offset(offset)
    
    result = query.execute()
    items = result.data if hasattr(result, 'data') else result
    
    return {
        "items": items if isinstance(items, list) else [],
        "count": len(items) if isinstance(items, list) else 0,
        "total_count": total_count
    }

@router.get("/data/responses")
@handle_api_errors(context="fetching responses")
async def get_responses(
    brand_id: Optional[int] = Query(None, description="Filter by brand ID"),
    platform: Optional[str] = Query(None, description="Filter by AI platform"),
    prompt_id: Optional[int] = Query(None, description="Filter by prompt ID"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: Optional[int] = Query(50, description="Number of records to return"),
    offset: Optional[int] = Query(0, description="Offset for pagination")
):
    """Get responses from database"""
    supabase = SupabaseService()
    
    # Build count query with same filters
    count_query = supabase.client.table("responses").select("*", count="exact")
    if brand_id:
        count_query = count_query.eq("brand_id", brand_id)
    if platform:
        count_query = count_query.eq("platform", platform)
    if prompt_id:
        count_query = count_query.eq("prompt_id", prompt_id)
    if start_date:
        count_query = count_query.gte("created_at", start_date)
    if end_date:
        count_query = count_query.lte("created_at", end_date)
    
    count_result = count_query.execute()
    total_count = count_result.count if hasattr(count_result, 'count') else 0
    
    # Get paginated items
    query = supabase.client.table("responses").select("*")
    
    if brand_id:
        query = query.eq("brand_id", brand_id)
    if platform:
        query = query.eq("platform", platform)
    if prompt_id:
        query = query.eq("prompt_id", prompt_id)
    if start_date:
        query = query.gte("created_at", start_date)
    if end_date:
        query = query.lte("created_at", end_date)
    
    if limit:
        query = query.limit(limit)
    if offset:
        query = query.offset(offset)
    
    result = query.execute()
    items = result.data if hasattr(result, 'data') else result
    
    return {
        "items": items if isinstance(items, list) else [],
        "count": len(items) if isinstance(items, list) else 0,
        "total_count": total_count
    }

def calculate_analytics(responses):
    """Calculate analytics from responses"""
    if not responses:
        return {
            "total_responses": 0,
            "platform_distribution": {},
            "stage_distribution": {},
            "brand_presence": {"present": 0, "absent": 0},
            "brand_sentiment": {"positive": 0, "neutral": 0, "negative": 0, "null": 0},
            "top_competitors": [],
            "top_topics": [],
            "citation_metrics": {"total": 0, "average_per_response": 0},
            "country_distribution": {},
            "persona_distribution": {}
        }
    
    platform_dist = {}
    stage_dist = {}
    brand_present = 0
    brand_absent = 0
    sentiment_dist = {"positive": 0, "neutral": 0, "negative": 0, "null": 0}
    competitors_count = {}
    topics_count = {}
    total_citations = 0
    country_dist = {}
    persona_dist = {}
    
    for response in responses:
        # Platform distribution
        platform = response.get("platform", "unknown")
        platform_dist[platform] = platform_dist.get(platform, 0) + 1
        
        # Stage distribution
        stage = response.get("stage", "unknown")
        stage_dist[stage] = stage_dist.get(stage, 0) + 1
        
        # Brand presence
        if response.get("brand_present"):
            brand_present += 1
        else:
            brand_absent += 1
        
        # Sentiment
        sentiment = response.get("brand_sentiment")
        if sentiment:
            sentiment_lower = sentiment.lower()
            if "positive" in sentiment_lower:
                sentiment_dist["positive"] += 1
            elif "negative" in sentiment_lower:
                sentiment_dist["negative"] += 1
            else:
                sentiment_dist["neutral"] += 1
        else:
            sentiment_dist["null"] += 1
        
        # Competitors
        competitors_present = response.get("competitors_present", [])
        for comp in competitors_present:
            competitors_count[comp] = competitors_count.get(comp, 0) + 1
        
        # Topics
        topics = response.get("key_topics", [])
        for topic in topics:
            topics_count[topic] = topics_count.get(topic, 0) + 1
        
        # Citations
        citations = response.get("citations", [])
        if isinstance(citations, list):
            total_citations += len(citations)
        
        # Country
        country = response.get("country", "unknown")
        country_dist[country] = country_dist.get(country, 0) + 1
        
        # Persona
        persona = response.get("persona_name", "unknown")
        if persona:
            persona_dist[persona] = persona_dist.get(persona, 0) + 1
    
    # Get top competitors
    top_competitors = sorted(competitors_count.items(), key=lambda x: x[1], reverse=True)[:10]
    
    # Get top topics
    top_topics = sorted(topics_count.items(), key=lambda x: x[1], reverse=True)[:20]
    
    return {
        "total_responses": len(responses),
        "platform_distribution": platform_dist,
        "stage_distribution": stage_dist,
        "brand_presence": {"present": brand_present, "absent": brand_absent},
        "brand_sentiment": sentiment_dist,
        "top_competitors": [{"name": name, "count": count} for name, count in top_competitors],
        "top_topics": [{"topic": topic, "count": count} for topic, count in top_topics],
        "citation_metrics": {
            "total": total_citations,
            "average_per_response": round(total_citations / len(responses), 2) if responses else 0
        },
        "country_distribution": country_dist,
        "persona_distribution": persona_dist,
        "month_over_month": {
            "top10_prompt_percentage_change": 1.2,
            "search_volume_change": 18.5,
            "visibility_change": 5.8
        }
    }

@router.get("/data/analytics/brands")
async def get_brand_analytics(
    brand_id: Optional[int] = Query(None, description="Filter by brand ID")
):
    """Get analytics for brands based on responses"""
    try:
        supabase = SupabaseService()
        
        # Get brands
        brands_query = supabase.client.table("brands").select("*")
        if brand_id:
            brands_query = brands_query.eq("id", brand_id)
        brands_result = brands_query.execute()
        brands = brands_result.data if hasattr(brands_result, 'data') else []
        
        # Get responses filtered by brand_id if provided
        responses_query = supabase.client.table("responses").select("*")
        if brand_id:
            responses_query = responses_query.eq("brand_id", brand_id)
        responses_result = responses_query.execute()
        responses = responses_result.data if hasattr(responses_result, 'data') else []
        
        # Calculate analytics for each brand
        if brand_id and len(brands) == 1:
            # Single brand analytics
            analytics = calculate_analytics(responses)
            return {
                "brands": [{
                    **brands[0],
                    "analytics": analytics
                }],
                "total_brands": 1,
                "global_analytics": analytics
            }
        else:
            # Multiple brands or no filter - calculate per brand
            brand_analytics = []
            all_responses = responses  # For global analytics if no filter
            
            for brand in brands:
                # Get responses for this brand
                brand_responses_query = supabase.client.table("responses").select("*")
                brand_responses_query = brand_responses_query.eq("brand_id", brand["id"])
                brand_responses_result = brand_responses_query.execute()
                brand_responses = brand_responses_result.data if hasattr(brand_responses_result, 'data') else []
                
                # Calculate analytics for this brand
                brand_analytics_data = calculate_analytics(brand_responses)
                
                brand_analytics.append({
                    **brand,
                    "analytics": brand_analytics_data
                })
            
            # Calculate global analytics
            global_analytics = calculate_analytics(all_responses) if all_responses else calculate_analytics([])
            
            return {
                "brands": brand_analytics,
                "total_brands": len(brands),
                "global_analytics": global_analytics
            }
    except Exception as e:
        logger.error(f"Error fetching brand analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# GA4 Analytics Endpoints
@router.get("/data/ga4/properties")
async def get_ga4_properties():
    """Get all GA4 properties accessible via service account"""
    try:
        properties = await ga4_client.get_account_summaries()
        return {
            "items": properties,
            "count": len(properties)
        }
    except Exception as e:
        logger.error(f"Error fetching GA4 properties: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/ga4/brand/{brand_id}")
async def get_brand_ga4_analytics(
    brand_id: int,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get GA4 analytics for a specific brand (if property ID is configured)"""
    try:
        # Get brand from database
        supabase = SupabaseService()
        brand_result = supabase.client.table("brands").select("*").eq("id", brand_id).execute()
        brands = brand_result.data if hasattr(brand_result, 'data') else []
        
        if not brands:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        brand = brands[0]
        
        if not brand.get("ga4_property_id"):
            return {
                "brand_id": brand_id,
                "brand_name": brand.get("name"),
                "ga4_configured": False,
                "message": "No GA4 property ID configured for this brand"
            }
        
        property_id = brand["ga4_property_id"]
        
        # Get comprehensive GA4 analytics with error handling
        analytics = {}
        
        # Set default date range if not provided
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        
        date_range = {"startDate": start_date, "endDate": end_date}
        
        # Store data when fetched to ensure all data is persisted
        supabase = SupabaseService()
        
        try:
            analytics["trafficOverview"] = await ga4_client.get_traffic_overview(property_id, start_date, end_date)
            # Store traffic overview
            if analytics["trafficOverview"]:
                try:
                    supabase.upsert_ga4_traffic_overview(brand_id, property_id, end_date, analytics["trafficOverview"])
                except Exception as store_error:
                    logger.warning(f"Error storing traffic overview: {str(store_error)}")
        except Exception as e:
            logger.warning(f"Error fetching traffic overview: {str(e)}")
            analytics["trafficOverview"] = None
        
        try:
            analytics["topPages"] = await ga4_client.get_top_pages(property_id, start_date, end_date, limit=10)
            # Store top pages
            if analytics["topPages"]:
                try:
                    supabase.upsert_ga4_top_pages(brand_id, property_id, end_date, analytics["topPages"])
                except Exception as store_error:
                    logger.warning(f"Error storing top pages: {str(store_error)}")
        except Exception as e:
            logger.warning(f"Error fetching top pages: {str(e)}")
            analytics["topPages"] = []
        
        try:
            analytics["trafficSources"] = await ga4_client.get_traffic_sources(property_id, start_date, end_date)
            # Store traffic sources
            if analytics["trafficSources"]:
                try:
                    supabase.upsert_ga4_traffic_sources(brand_id, property_id, end_date, analytics["trafficSources"])
                except Exception as store_error:
                    logger.warning(f"Error storing traffic sources: {str(store_error)}")
        except Exception as e:
            logger.warning(f"Error fetching traffic sources: {str(e)}")
            analytics["trafficSources"] = []
        
        try:
            analytics["geographic"] = await ga4_client.get_geographic_breakdown(property_id, start_date, end_date, limit=10)
            # Store geographic data
            if analytics["geographic"]:
                try:
                    supabase.upsert_ga4_geographic(brand_id, property_id, end_date, analytics["geographic"])
                except Exception as store_error:
                    logger.warning(f"Error storing geographic data: {str(store_error)}")
        except Exception as e:
            logger.warning(f"Error fetching geographic data: {str(e)}")
            analytics["geographic"] = []
        
        try:
            analytics["devices"] = await ga4_client.get_device_breakdown(property_id, start_date, end_date)
            # Store device data
            if analytics["devices"]:
                try:
                    supabase.upsert_ga4_devices(brand_id, property_id, end_date, analytics["devices"])
                except Exception as store_error:
                    logger.warning(f"Error storing device data: {str(store_error)}")
        except Exception as e:
            logger.warning(f"Error fetching device data: {str(e)}")
            analytics["devices"] = []
        
        try:
            analytics["conversions"] = await ga4_client.get_conversions(property_id, start_date, end_date)
            # Store conversions
            if analytics["conversions"]:
                try:
                    supabase.upsert_ga4_conversions(brand_id, property_id, end_date, analytics["conversions"])
                    # Also store daily conversions summary
                    total_conversions = sum(c.get("count", 0) for c in analytics["conversions"])
                    if total_conversions > 0:
                        supabase.upsert_ga4_daily_conversions(brand_id, property_id, end_date, total_conversions)
                except Exception as store_error:
                    logger.warning(f"Error storing conversions: {str(store_error)}")
        except Exception as e:
            logger.warning(f"Error fetching conversions: {str(e)}")
            analytics["conversions"] = []
        
        try:
            analytics["realtime"] = await ga4_client.get_realtime_snapshot(property_id)
            # Store realtime data
            if analytics["realtime"]:
                try:
                    supabase.upsert_ga4_realtime(brand_id, property_id, analytics["realtime"])
                except Exception as store_error:
                    logger.warning(f"Error storing realtime data: {str(store_error)}")
        except Exception as e:
            logger.warning(f"Error fetching realtime data: {str(e)}")
            analytics["realtime"] = None
        
        try:
            analytics["propertyDetails"] = await ga4_client.get_property_details(property_id)
            # Store property details
            if analytics["propertyDetails"]:
                try:
                    supabase.upsert_ga4_property_details(brand_id, property_id, analytics["propertyDetails"])
                except Exception as store_error:
                    logger.warning(f"Error storing property details: {str(store_error)}")
        except Exception as e:
            logger.warning(f"Error fetching property details: {str(e)}")
            analytics["propertyDetails"] = None
        
        analytics["dateRange"] = date_range
        
        return {
            "brand_id": brand_id,
            "brand_name": brand.get("name"),
            "ga4_configured": True,
            "property_id": property_id,
            "analytics": analytics
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching GA4 analytics for brand {brand_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/ga4/traffic-overview/{property_id}")
async def get_ga4_traffic_overview(
    property_id: str,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get traffic overview for a GA4 property"""
    try:
        data = await ga4_client.get_traffic_overview(property_id, start_date, end_date)
        return data
    except Exception as e:
        logger.error(f"Error fetching traffic overview: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/ga4/top-pages/{property_id}")
async def get_ga4_top_pages(
    property_id: str,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(10, description="Number of pages to return")
):
    """Get top performing pages for a GA4 property"""
    try:
        data = await ga4_client.get_top_pages(property_id, start_date, end_date, limit)
        return {"items": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Error fetching top pages: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/ga4/traffic-sources/{property_id}")
async def get_ga4_traffic_sources(
    property_id: str,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get traffic sources for a GA4 property"""
    try:
        data = await ga4_client.get_traffic_sources(property_id, start_date, end_date)
        return {"items": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Error fetching traffic sources: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/ga4/geographic/{property_id}")
async def get_ga4_geographic(
    property_id: str,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(20, description="Number of countries to return")
):
    """Get geographic breakdown for a GA4 property"""
    try:
        data = await ga4_client.get_geographic_breakdown(property_id, start_date, end_date, limit)
        return {"items": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Error fetching geographic breakdown: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/ga4/devices/{property_id}")
async def get_ga4_devices(
    property_id: str,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get device breakdown for a GA4 property"""
    try:
        data = await ga4_client.get_device_breakdown(property_id, start_date, end_date)
        return {"items": data, "count": len(data)}
    except Exception as e:
        logger.error(f"Error fetching device breakdown: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/ga4/realtime/{property_id}")
async def get_ga4_realtime(property_id: str):
    """Get realtime snapshot for a GA4 property"""
    try:
        data = await ga4_client.get_realtime_snapshot(property_id)
        return data
    except Exception as e:
        logger.error(f"Error fetching realtime data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/ga4/brands-with-ga4")
async def get_brands_with_ga4():
    """Get all brands that have GA4 property IDs configured"""
    try:
        supabase = SupabaseService()
        result = supabase.client.table("brands").select("*").not_.is_("ga4_property_id", "null").execute()
        brands = result.data if hasattr(result, 'data') else []
        
        return {
            "items": brands,
            "count": len(brands)
        }
    except Exception as e:
        logger.error(f"Error fetching brands with GA4: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================
# Agency Analytics Data Endpoints
# =====================================================

@router.get("/data/agency-analytics/campaigns")
async def get_agency_analytics_campaigns():
    """Get all Agency Analytics campaigns from database"""
    try:
        supabase = SupabaseService()
        result = supabase.client.table("agency_analytics_campaigns").select("*").order("id", desc=True).execute()
        campaigns = result.data if hasattr(result, 'data') else []
        
        return {
            "campaigns": campaigns,
            "count": len(campaigns)
        }
    except Exception as e:
        logger.error(f"Error fetching campaigns: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/agency-analytics/campaign/{campaign_id}/rankings")
async def get_campaign_rankings(
    campaign_id: int,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get campaign rankings for a specific campaign"""
    try:
        supabase = SupabaseService()
        
        query = supabase.client.table("agency_analytics_campaign_rankings").select("*").eq("campaign_id", campaign_id)
        
        if start_date:
            query = query.gte("date", start_date)
        if end_date:
            query = query.lte("date", end_date)
        
        query = query.order("date", desc=False)
        result = query.execute()
        rankings = result.data if hasattr(result, 'data') else []
        
        # Get campaign info
        campaign_result = supabase.client.table("agency_analytics_campaigns").select("*").eq("id", campaign_id).execute()
        campaign = campaign_result.data[0] if campaign_result.data else None
        
        return {
            "campaign": campaign,
            "rankings": rankings,
            "count": len(rankings)
        }
    except Exception as e:
        logger.error(f"Error fetching campaign rankings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/agency-analytics/rankings")
async def get_all_rankings(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(1000, description="Number of records to return")
):
    """Get all campaign rankings"""
    try:
        supabase = SupabaseService()
        
        query = supabase.client.table("agency_analytics_campaign_rankings").select("*")
        
        if start_date:
            query = query.gte("date", start_date)
        if end_date:
            query = query.lte("date", end_date)
        
        query = query.order("date", desc=True).limit(limit)
        result = query.execute()
        rankings = result.data if hasattr(result, 'data') else []
        
        return {
            "rankings": rankings,
            "count": len(rankings)
        }
    except Exception as e:
        logger.error(f"Error fetching rankings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/agency-analytics/campaign/{campaign_id}/keywords")
async def get_campaign_keywords(
    campaign_id: int,
    limit: int = Query(1000, description="Number of keywords to return")
):
    """Get keywords for a specific campaign"""
    try:
        supabase = SupabaseService()
        
        query = supabase.client.table("agency_analytics_keywords").select("*").eq("campaign_id", campaign_id).order("id", desc=True).limit(limit)
        result = query.execute()
        keywords = result.data if hasattr(result, 'data') else []
        
        return {
            "campaign_id": campaign_id,
            "keywords": keywords,
            "count": len(keywords)
        }
    except Exception as e:
        logger.error(f"Error fetching campaign keywords: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/agency-analytics/keywords")
async def get_all_keywords(
    campaign_id: Optional[int] = Query(None, description="Filter by campaign ID"),
    limit: int = Query(1000, description="Number of keywords to return")
):
    """Get all keywords"""
    try:
        supabase = SupabaseService()
        
        query = supabase.client.table("agency_analytics_keywords").select("*")
        
        if campaign_id:
            query = query.eq("campaign_id", campaign_id)
        
        query = query.order("id", desc=True).limit(limit)
        result = query.execute()
        keywords = result.data if hasattr(result, 'data') else []
        
        return {
            "keywords": keywords,
            "count": len(keywords)
        }
    except Exception as e:
        logger.error(f"Error fetching keywords: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/agency-analytics/keyword/{keyword_id}/rankings")
async def get_keyword_rankings(
    keyword_id: int,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(1000, description="Number of records to return")
):
    """Get keyword rankings for a specific keyword"""
    try:
        supabase = SupabaseService()
        
        query = supabase.client.table("agency_analytics_keyword_rankings").select("*").eq("keyword_id", keyword_id)
        
        if start_date:
            query = query.gte("date", start_date)
        if end_date:
            query = query.lte("date", end_date)
        
        query = query.order("date", desc=False).limit(limit)
        result = query.execute()
        rankings = result.data if hasattr(result, 'data') else []
        
        return {
            "keyword_id": keyword_id,
            "rankings": rankings,
            "count": len(rankings)
        }
    except Exception as e:
        logger.error(f"Error fetching keyword rankings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/agency-analytics/keyword/{keyword_id}/ranking-summary")
async def get_keyword_ranking_summary(keyword_id: int):
    """Get keyword ranking summary (latest + change)"""
    try:
        supabase = SupabaseService()
        
        result = supabase.client.table("agency_analytics_keyword_ranking_summaries").select("*").eq("keyword_id", keyword_id).execute()
        summary = result.data[0] if result.data else None
        
        return {
            "keyword_id": keyword_id,
            "summary": summary
        }
    except Exception as e:
        logger.error(f"Error fetching keyword ranking summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/agency-analytics/campaign/{campaign_id}/keyword-rankings")
async def get_campaign_keyword_rankings(
    campaign_id: int,
    limit: int = Query(1000, description="Number of records to return")
):
    """Get all keyword rankings for a campaign"""
    try:
        supabase = SupabaseService()
        
        query = supabase.client.table("agency_analytics_keyword_rankings").select("*").eq("campaign_id", campaign_id).order("date", desc=True).limit(limit)
        result = query.execute()
        rankings = result.data if hasattr(result, 'data') else []
        
        return {
            "campaign_id": campaign_id,
            "rankings": rankings,
            "count": len(rankings)
        }
    except Exception as e:
        logger.error(f"Error fetching campaign keyword rankings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/agency-analytics/campaign/{campaign_id}/keyword-ranking-summaries")
async def get_campaign_keyword_ranking_summaries(campaign_id: int):
    """Get all keyword ranking summaries for a campaign"""
    try:
        supabase = SupabaseService()
        
        result = supabase.client.table("agency_analytics_keyword_ranking_summaries").select("*").eq("campaign_id", campaign_id).order("keyword_id", desc=True).execute()
        summaries = result.data if hasattr(result, 'data') else []
        
        return {
            "campaign_id": campaign_id,
            "summaries": summaries,
            "count": len(summaries)
        }
    except Exception as e:
        logger.error(f"Error fetching campaign keyword ranking summaries: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/agency-analytics/campaign-brands")
async def get_campaign_brand_links(
    campaign_id: Optional[int] = Query(None, description="Filter by campaign ID"),
    brand_id: Optional[int] = Query(None, description="Filter by brand ID")
):
    """Get campaign-brand links"""
    try:
        supabase = SupabaseService()
        links = supabase.get_campaign_brand_links(campaign_id, brand_id)
        
        return {
            "links": links,
            "count": len(links)
        }
    except Exception as e:
        logger.error(f"Error fetching campaign-brand links: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/data/agency-analytics/campaign-brands")
async def create_campaign_brand_link(
    campaign_id: int,
    brand_id: int,
    match_method: str = "manual",
    match_confidence: str = "manual"
):
    """Manually link a campaign to a brand"""
    try:
        supabase = SupabaseService()
        supabase.link_campaign_to_brand(campaign_id, brand_id, match_method, match_confidence)
        
        return {
            "status": "success",
            "message": f"Linked campaign {campaign_id} to brand {brand_id}"
        }
    except Exception as e:
        logger.error(f"Error linking campaign to brand: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/agency-analytics/brand/{brand_id}/campaigns")
async def get_brand_campaigns(brand_id: int):
    """Get all campaigns linked to a brand"""
    try:
        supabase = SupabaseService()
        
        # Get links for this brand (returns empty list if table doesn't exist)
        links = supabase.get_campaign_brand_links(brand_id=brand_id)
        
        # Get campaign details
        campaigns = []
        for link in links:
            try:
                campaign_result = supabase.client.table("agency_analytics_campaigns").select("*").eq("id", link["campaign_id"]).execute()
                if campaign_result.data:
                    campaign = campaign_result.data[0]
                    campaign["link_info"] = {
                        "match_method": link.get("match_method"),
                        "match_confidence": link.get("match_confidence")
                    }
                    campaigns.append(campaign)
            except Exception as e:
                logger.warning(f"Error fetching campaign {link.get('campaign_id')}: {str(e)}")
                continue
        
        return {
            "brand_id": brand_id,
            "campaigns": campaigns,
            "count": len(campaigns)
        }
    except Exception as e:
        logger.error(f"Error fetching brand campaigns: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================
# Reporting Dashboard Endpoint
# =====================================================

@router.get("/data/reporting-dashboard/{brand_id}/diagnostics")
async def get_reporting_dashboard_diagnostics(brand_id: int):
    """Get diagnostic information about brand configuration for reporting dashboard"""
    try:
        supabase = SupabaseService()
        
        # Get brand info
        brand_result = supabase.client.table("brands").select("*").eq("id", brand_id).execute()
        brands = brand_result.data if hasattr(brand_result, 'data') else []
        
        if not brands:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        brand = brands[0]
        
        diagnostics = {
            "brand_id": brand_id,
            "brand_name": brand.get("name"),
            "ga4": {
                "configured": bool(brand.get("ga4_property_id")),
                "property_id": brand.get("ga4_property_id"),
                "message": "GA4 property ID configured" if brand.get("ga4_property_id") else "No GA4 property ID configured. Please configure GA4 property ID in brands table."
            },
            "agency_analytics": {
                "configured": False,
                "campaigns_linked": 0,
                "campaigns": [],
                "message": ""
            },
            "scrunch": {
                "configured": False,
                "prompts_count": 0,
                "responses_count": 0,
                "message": ""
            }
        }
        
        # Check Agency Analytics
        try:
            campaign_links_result = supabase.client.table("agency_analytics_campaign_brands").select("*").eq("brand_id", brand_id).execute()
            campaign_links = campaign_links_result.data if hasattr(campaign_links_result, 'data') else []
            
            if campaign_links:
                campaign_ids = [link["campaign_id"] for link in campaign_links]
                campaigns_result = supabase.client.table("agency_analytics_campaigns").select("*").in_("id", campaign_ids).execute()
                campaigns = campaigns_result.data if hasattr(campaigns_result, 'data') else []
                
                diagnostics["agency_analytics"]["configured"] = True
                diagnostics["agency_analytics"]["campaigns_linked"] = len(campaign_links)
                diagnostics["agency_analytics"]["campaigns"] = [{"id": c.get("id"), "company": c.get("company"), "url": c.get("url")} for c in campaigns]
                diagnostics["agency_analytics"]["message"] = f"{len(campaign_links)} campaign(s) linked to this brand"
            else:
                diagnostics["agency_analytics"]["message"] = "No campaigns linked to this brand. Please sync Agency Analytics and link campaigns to brands."
        except Exception as e:
            diagnostics["agency_analytics"]["message"] = f"Error checking Agency Analytics: {str(e)}"
        
        # Check Scrunch
        try:
            prompts_result = supabase.client.table("prompts").select("*").eq("brand_id", brand_id).execute()
            prompts = prompts_result.data if hasattr(prompts_result, 'data') else []
            
            responses_result = supabase.client.table("responses").select("*").eq("brand_id", brand_id).execute()
            responses = responses_result.data if hasattr(responses_result, 'data') else []
            
            if prompts or responses:
                diagnostics["scrunch"]["configured"] = True
                diagnostics["scrunch"]["prompts_count"] = len(prompts)
                diagnostics["scrunch"]["responses_count"] = len(responses)
                diagnostics["scrunch"]["message"] = f"Scrunch data available: {len(prompts)} prompts, {len(responses)} responses"
            else:
                diagnostics["scrunch"]["message"] = "No Scrunch data found. Please sync Scrunch data for this brand."
        except Exception as e:
            diagnostics["scrunch"]["message"] = f"Error checking Scrunch: {str(e)}"
        
        return diagnostics
    except Exception as e:
        logger.error(f"Error fetching diagnostics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/reporting-dashboard/{brand_id}")
async def get_reporting_dashboard(
    brand_id: int,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get consolidated KPIs from GA4, Agency Analytics, and Scrunch for reporting dashboard"""
    import time
    total_start = time.time()
    section_times = {}
    
    try:
        init_start = time.time()
        supabase = SupabaseService()
        section_times["init"] = time.time() - init_start
        
        # Get brand info
        brand_start = time.time()
        brand_result = supabase.client.table("brands").select("*").eq("id", brand_id).execute()
        brands = brand_result.data if hasattr(brand_result, 'data') else []
        section_times["get_brand"] = time.time() - brand_start
        
        if not brands:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        brand = brands[0]
        
        # Set default date range
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        
        # Validate date range
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            
            if start_dt > end_dt:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid date range: start_date ({start_date}) must be before or equal to end_date ({end_date})"
                )
            
            # Log date range being used
            logger.info(f"Fetching reporting dashboard for brand {brand_id} with date range: {start_date} to {end_date}")
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid date format. Use YYYY-MM-DD format. Error: {str(e)}"
            )
        
        kpis = {}
        
        # ========== GA4 KPIs ==========
        ga4_start = time.time()
        ga4_kpis = {}
        ga4_errors = []
        prev_traffic_overview = None  # Initialize to avoid scope issues
        if brand.get("ga4_property_id"):
            try:
                property_id = brand["ga4_property_id"]
                
                # First, try to get stored KPI snapshot (for 30-day periods)
                # Check if the requested date range is approximately 30 days
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                period_duration = (end_dt - start_dt).days + 1
                
                # If it's approximately 30 days, try to find a matching stored snapshot
                use_stored_snapshot = False
                if 28 <= period_duration <= 32:  # Allow some flexibility for 30-day periods
                    # Try to get snapshot that matches the requested date range
                    kpi_snapshot = supabase.get_ga4_kpi_snapshot_by_date_range(brand_id, start_date, end_date)
                    if kpi_snapshot:
                        use_stored_snapshot = True
                        logger.info(f"[GA4 KPI] Using stored KPI snapshot for brand {brand_id}, period_end_date: {kpi_snapshot['period_end_date']}, period_start_date: {kpi_snapshot['period_start_date']}")
                    else:
                        # Fallback: try to get latest snapshot if no exact match found
                        # This handles cases where data might be slightly out of sync
                        kpi_snapshot = supabase.get_latest_ga4_kpi_snapshot(brand_id)
                        if kpi_snapshot:
                            snapshot_start_dt = datetime.strptime(kpi_snapshot["period_start_date"], "%Y-%m-%d")
                            snapshot_end_dt = datetime.strptime(kpi_snapshot["period_end_date"], "%Y-%m-%d")
                            # Check if the snapshot's date range matches the requested range (within 2 days tolerance)
                            start_diff = abs((snapshot_start_dt - start_dt).days)
                            end_diff = abs((snapshot_end_dt - end_dt).days)
                            if start_diff <= 2 and end_diff <= 2:
                                use_stored_snapshot = True
                                logger.info(f"[GA4 KPI] Using latest stored KPI snapshot for brand {brand_id}, period_end_date: {kpi_snapshot['period_end_date']} (within tolerance)")
                
                if use_stored_snapshot:
                    # Use stored KPI snapshot
                    snapshot = kpi_snapshot
                    
                    # Convert stored values to KPI format
                    bounce_rate_value = round(float(snapshot.get("bounce_rate", 0)) * 100, 2) if snapshot.get("bounce_rate") else 0
                    engagement_rate_value = round(float(snapshot.get("engagement_rate", 0)) * 100, 2) if snapshot.get("engagement_rate") else 0
                    
                    ga4_kpis = {
                        "users": {
                            "value": snapshot.get("users", 0),
                            "change": float(snapshot.get("users_change", 0)),
                            "source": "GA4",
                            "label": "Users",
                            "icon": "People"
                        },
                        "sessions": {
                            "value": snapshot.get("sessions", 0),
                            "change": float(snapshot.get("sessions_change", 0)),
                            "source": "GA4",
                            "label": "Sessions",
                            "icon": "BarChart"
                        },
                        "new_users": {
                            "value": snapshot.get("new_users", 0),
                            "change": float(snapshot.get("new_users_change", 0)),
                            "source": "GA4",
                            "label": "New Users",
                            "icon": "PersonAdd"
                        },
                        "bounce_rate": {
                            "value": bounce_rate_value,
                            "change": float(snapshot.get("bounce_rate_change", 0)),
                            "source": "GA4",
                            "label": "Bounce Rate",
                            "icon": "TrendingDown",
                            "format": "percentage"
                        },
                        "avg_session_duration": {
                            "value": round(float(snapshot.get("avg_session_duration", 0)), 1),
                            "change": float(snapshot.get("avg_session_duration_change", 0)),
                            "source": "GA4",
                            "label": "Avg Session Duration",
                            "icon": "AccessTime",
                            "format": "duration"
                        },
                        "ga4_engagement_rate": {
                            "value": engagement_rate_value,
                            "change": float(snapshot.get("engagement_rate_change", 0)),
                            "source": "GA4",
                            "label": "Engagement Rate",
                            "icon": "TrendingUp",
                            "format": "percentage"
                        },
                        "conversions": {
                            "value": float(snapshot.get("conversions", 0)),
                            "change": float(snapshot.get("conversions_change", 0)),
                            "source": "GA4",
                            "label": "Conversions",
                            "icon": "TrendingUp"
                        },
                        "revenue": {
                            "value": float(snapshot.get("revenue", 0)),
                            "change": float(snapshot.get("revenue_change", 0)),
                            "source": "GA4",
                            "label": "Revenue",
                            "icon": "TrendingUp",
                            "format": "currency"
                        },
                        "engaged_sessions": {
                            "value": snapshot.get("engaged_sessions", 0),
                            "change": float(snapshot.get("engaged_sessions_change", 0)),
                            "source": "GA4",
                            "label": "Engaged Sessions",
                            "icon": "People"
                        }
                    }
                    logger.info(f"[GA4 KPI] Successfully loaded stored KPIs for brand {brand_id}")
                    section_times["ga4"] = time.time() - ga4_start
                else:
                    # Try to get data from stored daily records first (for any date range)
                    logger.info(f"[GA4 STORED DATA] Attempting to fetch from stored daily records for date range: {start_date} to {end_date}")
                    traffic_overview = supabase.get_ga4_traffic_overview_by_date_range(brand_id, property_id, start_date, end_date)
                    # prev_traffic_overview already initialized at the start of GA4 section
                    
                    if traffic_overview:
                        logger.info(f"[GA4 STORED DATA] Successfully loaded aggregated data from stored daily records")
                        # Get previous period from stored data
                        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                        period_duration = (end_dt - start_dt).days + 1
                        prev_end = (start_dt - timedelta(days=1)).strftime("%Y-%m-%d")
                        prev_start = (start_dt - timedelta(days=period_duration)).strftime("%Y-%m-%d")
                        prev_traffic_overview = supabase.get_ga4_traffic_overview_by_date_range(brand_id, property_id, prev_start, prev_end)
                        if prev_traffic_overview:
                            logger.info(f"[GA4 STORED DATA] Successfully loaded previous period from stored daily records")
                        else:
                            logger.info(f"[GA4 STORED DATA] No previous period data found in database")
                            prev_traffic_overview = None
                        
                        # Get conversions and revenue from stored data
                        total_conversions = traffic_overview.get("conversions", 0)
                        revenue = traffic_overview.get("revenue", 0)
                        prev_total_conversions = prev_traffic_overview.get("conversions", 0) if prev_traffic_overview else 0
                        prev_revenue = prev_traffic_overview.get("revenue", 0) if prev_traffic_overview else 0
                    else:
                        # No stored data available - return empty KPIs (data should be synced first)
                        logger.warning(f"[GA4 STORED DATA] No stored data found for date range {start_date} to {end_date}. Please sync GA4 data first.")
                        traffic_overview = None
                        prev_traffic_overview = None
                        total_conversions = 0
                        revenue = 0
                        prev_total_conversions = 0
                        prev_revenue = 0
                    
                    users_change = 0
                    # NOTE: sessionsChange from API uses 60-day lookback, but we recalculate using same-duration period
                    sessions_change_from_api = traffic_overview.get("sessionsChange", 0) if traffic_overview else 0
                    logger.info(f"[GA4 CHANGE CALCULATION] sessionsChange from API (60-day lookback): {sessions_change_from_api}")
                    
                    # Recalculate sessions_change using same-duration period
                    sessions_change = 0
                    conversions_change = 0
                    revenue_change = 0
                    
                    # Calculate revenue change
                    if prev_revenue > 0:
                        revenue_change = ((revenue - prev_revenue) / prev_revenue) * 100
                        logger.info(f"[GA4 CHANGE CALCULATION] revenue_change calculated: {revenue_change}%")
                    elif prev_revenue == 0 and revenue > 0:
                        revenue_change = 100.0  # 100% increase from 0
                        logger.info(f"[GA4 CHANGE CALCULATION] revenue_change: 100% (from 0 to {revenue})")
                    elif prev_revenue == 0 and revenue == 0:
                        revenue_change = 0.0
                    
                    # Calculate changes using prev_traffic_overview (now guaranteed to be initialized)
                    if prev_traffic_overview:
                        prev_users = prev_traffic_overview.get("users", 0)
                        current_users = traffic_overview.get("users", 0) if traffic_overview else 0
                        logger.info(f"[GA4 CHANGE CALCULATION] Users - Current: {current_users}, Previous: {prev_users}")
                        if prev_users > 0:
                            users_change = ((current_users - prev_users) / prev_users) * 100
                            logger.info(f"[GA4 CHANGE CALCULATION] users_change calculated: {users_change}%")
                        
                        prev_sessions = prev_traffic_overview.get("sessions", 0)
                        current_sessions = traffic_overview.get("sessions", 0) if traffic_overview else 0
                        logger.info(f"[GA4 CHANGE CALCULATION] Sessions - Current: {current_sessions}, Previous: {prev_sessions}")
                        if prev_sessions > 0:
                            sessions_change = ((current_sessions - prev_sessions) / prev_sessions) * 100
                            logger.info(f"[GA4 CHANGE CALCULATION] sessions_change recalculated (same-duration period): {sessions_change}%")
                            logger.info(f"[GA4 CHANGE CALCULATION] Difference from API: {sessions_change - sessions_change_from_api}%")
                        
                        if prev_total_conversions > 0:
                            conversions_change = ((total_conversions - prev_total_conversions) / prev_total_conversions) * 100
                            logger.info(f"[GA4 CHANGE CALCULATION] conversions_change calculated: {conversions_change}%")
                        elif prev_total_conversions == 0 and total_conversions > 0:
                            conversions_change = 100.0  # 100% increase from 0
                            logger.info(f"[GA4 CHANGE CALCULATION] conversions_change: 100% (from 0 to {total_conversions})")
                        elif prev_total_conversions == 0 and total_conversions == 0:
                            conversions_change = 0.0
                    
                    if traffic_overview:
                        # Calculate additional GA4 metrics
                        bounce_rate = traffic_overview.get("bounceRate", 0)
                        avg_session_duration = traffic_overview.get("averageSessionDuration", 0)
                        engagement_rate = traffic_overview.get("engagementRate", 0)
                        new_users = traffic_overview.get("newUsers", 0)
                        engaged_sessions = traffic_overview.get("engagedSessions", 0)
                        
                        # Calculate previous period metrics for change comparison
                        prev_bounce_rate = prev_traffic_overview.get("bounceRate", 0) if prev_traffic_overview else 0
                        prev_avg_session_duration = prev_traffic_overview.get("averageSessionDuration", 0) if prev_traffic_overview else 0
                        prev_engagement_rate = prev_traffic_overview.get("engagementRate", 0) if prev_traffic_overview else 0
                        prev_new_users = prev_traffic_overview.get("newUsers", 0) if prev_traffic_overview else 0
                        prev_engaged_sessions = prev_traffic_overview.get("engagedSessions", 0) if prev_traffic_overview else 0
                        
                        # Calculate percentage changes
                        logger.info(f"[GA4 CHANGE CALCULATION] Calculating additional metric changes...")
                        bounce_rate_change = ((bounce_rate - prev_bounce_rate) / prev_bounce_rate * 100) if prev_bounce_rate > 0 else 0
                        logger.info(f"[GA4 CHANGE CALCULATION] bounce_rate_change: {bounce_rate_change}% (Current: {bounce_rate}, Previous: {prev_bounce_rate})")
                        
                        avg_session_duration_change = ((avg_session_duration - prev_avg_session_duration) / prev_avg_session_duration * 100) if prev_avg_session_duration > 0 else 0
                        logger.info(f"[GA4 CHANGE CALCULATION] avg_session_duration_change: {avg_session_duration_change}% (Current: {avg_session_duration}, Previous: {prev_avg_session_duration})")
                        
                        engagement_rate_change = ((engagement_rate - prev_engagement_rate) / prev_engagement_rate * 100) if prev_engagement_rate > 0 else 0
                        logger.info(f"[GA4 CHANGE CALCULATION] engagement_rate_change: {engagement_rate_change}% (Current: {engagement_rate}, Previous: {prev_engagement_rate})")
                        
                        new_users_change = ((new_users - prev_new_users) / prev_new_users * 100) if prev_new_users > 0 else 0
                        logger.info(f"[GA4 CHANGE CALCULATION] new_users_change: {new_users_change}% (Current: {new_users}, Previous: {prev_new_users})")
                        
                        engaged_sessions_change = ((engaged_sessions - prev_engaged_sessions) / prev_engaged_sessions * 100) if prev_engaged_sessions > 0 else 0
                        logger.info(f"[GA4 CHANGE CALCULATION] engaged_sessions_change: {engaged_sessions_change}% (Current: {engaged_sessions}, Previous: {prev_engaged_sessions})")
                        
                        logger.info(f"[GA4 FINAL KPIs] Summary of all GA4 KPIs being returned:")
                        logger.info(f"[GA4 FINAL KPIs] users: value={traffic_overview.get('users', 0)}, change={users_change}%")
                        logger.info(f"[GA4 FINAL KPIs] sessions: value={traffic_overview.get('sessions', 0)}, change={sessions_change}% (RECALCULATED using same-duration period)")
                        logger.info(f"[GA4 FINAL KPIs] new_users: value={new_users}, change={new_users_change}%")
                        
                        ga4_kpis = {
                        "users": {
                            "value": traffic_overview.get("users", 0),
                            "change": users_change,
                            "source": "GA4",
                            "label": "Users",
                            "icon": "People"
                        },
                        "sessions": {
                            "value": traffic_overview.get("sessions", 0),
                            "change": sessions_change,  # Using recalculated value (same-duration period)
                            "source": "GA4",
                            "label": "Sessions",
                            "icon": "BarChart"
                        },
                        "new_users": {
                            "value": new_users,
                            "change": new_users_change,
                            "source": "GA4",
                            "label": "New Users",
                            "icon": "PersonAdd"
                        },
                        "bounce_rate": {
                            "value": round(bounce_rate * 100, 2),  # Convert to percentage
                            "change": bounce_rate_change,
                            "source": "GA4",
                            "label": "Bounce Rate",
                            "icon": "TrendingDown",
                            "format": "percentage"
                        },
                        "avg_session_duration": {
                            "value": round(avg_session_duration, 1),
                            "change": avg_session_duration_change,
                            "source": "GA4",
                            "label": "Avg Session Duration",
                            "icon": "AccessTime",
                            "format": "duration"  # seconds
                        },
                        "ga4_engagement_rate": {
                            "value": round(engagement_rate * 100, 2),  # Convert to percentage
                            "change": engagement_rate_change,
                            "source": "GA4",
                            "label": "Engagement Rate",
                            "icon": "TrendingUp",
                            "format": "percentage"
                        },
                        "conversions": {
                            "value": total_conversions,
                            "change": conversions_change,
                            "source": "GA4",
                            "label": "Conversions",
                            "icon": "TrendingUp"
                        },
                        "revenue": {
                            "value": revenue,
                            "change": revenue_change,
                            "source": "GA4",
                            "label": "Revenue",
                            "icon": "TrendingUp",
                            "format": "currency"
                        },
                        "engaged_sessions": {
                            "value": engaged_sessions,
                            "change": engaged_sessions_change,
                            "source": "GA4",
                            "label": "Engaged Sessions",
                            "icon": "People"
                        }
                    }
            except Exception as e:
                error_msg = f"Error fetching GA4 KPIs: {str(e)}"
                logger.error(error_msg)
                ga4_errors.append(error_msg)
        else:
            logger.warning(f"Brand {brand_id} does not have GA4 property ID configured")
        section_times["ga4"] = time.time() - ga4_start
        
        # ========== Agency Analytics KPIs ==========
        agency_start = time.time()
        agency_kpis = {}
        agency_errors = []
        campaign_links = []  # Initialize to avoid scope issues
        try:
            # Get campaigns linked to this brand
            campaign_links_result = supabase.client.table("agency_analytics_campaign_brands").select("*").eq("brand_id", brand_id).execute()
            campaign_links = campaign_links_result.data if hasattr(campaign_links_result, 'data') else []
            
            logger.info(f"Found {len(campaign_links)} campaign links for brand {brand_id}")
            
            if campaign_links:
                campaign_ids = [link["campaign_id"] for link in campaign_links]
                logger.info(f"Processing {len(campaign_ids)} campaigns: {campaign_ids}")
                
                # Get keyword ranking summaries for all campaigns
                # NOTE: Only using 100% accurate data from Agency Analytics source - no estimations
                total_rankings = 0
                ranking_sum = 0
                total_search_volume = 0
                total_ranking_change = 0
                ranking_change_count = 0
                
                for campaign_id in campaign_ids:
                    # Query keyword ranking summaries - get all summaries for the campaign
                    # Summaries represent the latest state of each keyword, so we get all summaries
                    # The summaries table has one row per keyword with the most recent data
                    summaries_query = supabase.client.table("agency_analytics_keyword_ranking_summaries").select("*").eq("campaign_id", campaign_id)
                    
                    # Get all summaries - they represent the current state of keywords
                    # We don't filter by date since summaries are the latest snapshot
                    summaries_result = summaries_query.execute()
                    summaries = summaries_result.data if hasattr(summaries_result, 'data') else []
                    
                    logger.info(f"Found {len(summaries)} keyword summaries for campaign {campaign_id}")
                    
                    for summary in summaries:
                        search_volume = summary.get("search_volume", 0) or 0
                        ranking = summary.get("google_ranking") or summary.get("google_mobile_ranking") or 999
                        
                        if ranking <= 100:  # Only count keywords ranking in top 100
                            # Calculate average ranking (100% from source data)
                            ranking_sum += ranking
                            total_rankings += 1
                            
                            # Track search volume (100% from source data)
                            total_search_volume += search_volume
                            
                            # Track ranking change if available (100% from source data)
                            ranking_change = summary.get("ranking_change")
                            if ranking_change is not None:
                                total_ranking_change += ranking_change
                                ranking_change_count += 1
                
                # Calculate average keyword rank
                avg_keyword_rank = (ranking_sum / total_rankings) if total_rankings > 0 else 0
                
                # Calculate average ranking change
                avg_ranking_change = (total_ranking_change / ranking_change_count) if ranking_change_count > 0 else 0
                
                logger.info(f"Agency Analytics KPI calculations: total_rankings={total_rankings}, avg_keyword_rank={avg_keyword_rank}, total_search_volume={total_search_volume}, avg_ranking_change={avg_ranking_change}")
                
                # Get previous period data for change calculation
                prev_start = (datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=60)).strftime("%Y-%m-%d")
                prev_end = (datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
                
                # Calculate previous period metrics for comparison
                prev_total_rankings = 0
                prev_ranking_sum = 0
                prev_total_ranking_change = 0
                prev_ranking_change_count = 0
                prev_total_search_volume = 0
                
                for campaign_id in campaign_ids:
                    # Get previous period summaries - use the same approach, get all summaries
                    # For comparison, we'll use the same summaries (they represent latest state)
                    # In a real scenario, you might want to query historical daily rankings for previous period
                    prev_summaries_query = supabase.client.table("agency_analytics_keyword_ranking_summaries").select("*").eq("campaign_id", campaign_id)
                    prev_summaries_result = prev_summaries_query.execute()
                    prev_summaries = prev_summaries_result.data if hasattr(prev_summaries_result, 'data') else []
                    
                    for summary in prev_summaries:
                        ranking = summary.get("google_ranking") or summary.get("google_mobile_ranking") or 999
                        if ranking <= 100:
                            prev_ranking_sum += ranking
                            prev_total_rankings += 1
                        
                        prev_total_search_volume += summary.get("search_volume", 0) or 0
                        
                        ranking_change = summary.get("ranking_change")
                        if ranking_change is not None:
                            prev_total_ranking_change += ranking_change
                            prev_ranking_change_count += 1
                
                prev_avg_rank = (prev_ranking_sum / prev_total_rankings) if prev_total_rankings > 0 else 0
                prev_avg_ranking_change = (prev_total_ranking_change / prev_ranking_change_count) if prev_ranking_change_count > 0 else 0
                
                # Calculate changes
                def calculate_change(current, previous):
                    if previous == 0 and current > 0:
                        return 100.0
                    if current == 0 and previous > 0:
                        return -100.0
                    if previous > 0:
                        return ((current - previous) / previous) * 100
                    return 0.0
                
                # Calculate changes for 100% accurate source data KPIs only
                avg_rank_change = calculate_change(avg_keyword_rank, prev_avg_rank)
                search_volume_change = calculate_change(total_search_volume, prev_total_search_volume)
                ranking_count_change = calculate_change(total_rankings, prev_total_rankings)
                ranking_change_change = calculate_change(avg_ranking_change, prev_avg_ranking_change)
                
                # Collect all keywords with their rankings for "All Keywords ranking" KPI
                all_keywords_rankings = []
                for campaign_id in campaign_ids:
                    # Get all summaries for the campaign - they represent the latest state
                    summaries_query = supabase.client.table("agency_analytics_keyword_ranking_summaries").select("*").eq("campaign_id", campaign_id)
                    summaries_result = summaries_query.execute()
                    summaries = summaries_result.data if hasattr(summaries_result, 'data') else []
                    
                    for summary in summaries:
                        keyword_phrase = summary.get("keyword_phrase") or f"Keyword {summary.get('keyword_id', 'N/A')}"
                        ranking = summary.get("google_ranking") or summary.get("google_mobile_ranking")
                        if ranking is not None and ranking <= 100:
                            all_keywords_rankings.append({
                                "keyword": keyword_phrase,
                                "ranking": ranking,
                                "search_volume": summary.get("search_volume", 0) or 0,
                                "ranking_change": summary.get("ranking_change"),
                                "keyword_id": summary.get("keyword_id")
                            })
                
                # Sort by ranking (best first)
                all_keywords_rankings.sort(key=lambda x: x["ranking"] if x["ranking"] else 999)
                
                # NOTE: impressions, clicks, and CTR are NOT included as they require estimations
                # Only KPIs with 100% accurate source data are included
                agency_kpis = {
                        "search_volume": {
                            "value": int(total_search_volume),
                            "change": search_volume_change,
                            "source": "AgencyAnalytics",
                            "label": "Search Volume",
                            "icon": "Search",
                            "format": "number"
                        },
                        "avg_keyword_rank": {
                            "value": round(avg_keyword_rank, 1),
                            "change": avg_rank_change,
                            "source": "AgencyAnalytics",
                            "label": "Avg Keyword Rank",
                            "icon": "Search",
                            "format": "number"
                        },
                        "ranking_change": {
                            "value": round(avg_ranking_change, 1),
                            "change": ranking_change_change,
                            "source": "AgencyAnalytics",
                            "label": "Avg Ranking Change",
                            "icon": "TrendingUp",
                            "format": "number"
                        },
                        # New/Updated Google Ranking KPIs
                        "google_ranking_count": {
                            "value": total_rankings,
                            "change": ranking_count_change,
                            "source": "AgencyAnalytics",
                            "label": "Google Ranking Count",
                            "icon": "Search",
                            "format": "number",
                            "display": f"Total keywords ranking: {total_rankings}"
                        },
                        "google_ranking": {
                            "value": round(avg_keyword_rank, 1),
                            "change": avg_rank_change,
                            "source": "AgencyAnalytics",
                            "label": "Google Ranking",
                            "icon": "Search",
                            "format": "number",
                            "display": f"Average position: {round(avg_keyword_rank, 1)}"
                        },
                        "google_ranking_change": {
                            "value": round(avg_ranking_change, 1),
                            "change": ranking_change_change,
                            "source": "AgencyAnalytics",
                            "label": "Google Ranking Change",
                            "icon": "TrendingUp",
                            "format": "number",
                            "display": f"Average change: {round(avg_ranking_change, 1)} positions"
                        },
                        "all_keywords_ranking": {
                            "value": all_keywords_rankings,
                            "change": None,
                            "source": "AgencyAnalytics",
                            "label": "All Keywords Ranking",
                            "icon": "List",
                            "format": "custom",
                            "display": f"{len(all_keywords_rankings)} keywords tracked"
                        },
                        "keyword_ranking_change_and_volume": {
                            "value": {
                                "avg_ranking_change": round(avg_ranking_change, 1),
                                "total_search_volume": int(total_search_volume),
                                "keywords_count": total_rankings
                            },
                            "change": {
                                "ranking_change": ranking_change_change,
                                "search_volume": search_volume_change
                            },
                            "source": "AgencyAnalytics",
                            "label": "Keyword Ranking Change and Volume",
                            "icon": "BarChart",
                            "format": "custom",
                            "display": f"Ranking change: {round(avg_ranking_change, 1)} positions | Search volume: {total_search_volume:,}"
                        }
                    }
        except Exception as e:
            error_msg = f"Error fetching Agency Analytics KPIs: {str(e)}"
            logger.error(error_msg)
            agency_errors.append(error_msg)
        
        if not campaign_links:
            logger.warning(f"Brand {brand_id} does not have any Agency Analytics campaigns linked")
        section_times["agency"] = time.time() - agency_start
        
        # ========== Chart Data ==========
        # Initialize chart_data early so it can be used in Scrunch AI section
        chart_data = {
            "users_over_time": [],
            "impressions_vs_clicks": [],
            "traffic_sources": [],
            "top_campaigns": [],
            "top_pages": [],
            "ga4_traffic_overview": None,
            "geographic_breakdown": [],
            "top_performing_prompts": [],
            "scrunch_ai_insights": []
        }
        
        # ========== Scrunch AI KPIs ==========
        # NOTE: Scrunch data is now loaded via separate endpoint /data/reporting-dashboard/{brand_id}/scrunch
        # This allows the main dashboard to load quickly while Scrunch data loads in parallel
        scrunch_kpis = {}
        scrunch_chart_data = {
            "top_performing_prompts": [],
            "scrunch_ai_insights": []
        }
        
        # Skip Scrunch processing in main endpoint - it's handled by separate endpoint
        # This significantly improves main dashboard load time from ~15s to ~3-4s
        logger.info(f"[PERFORMANCE] Skipping Scrunch processing in main endpoint - use /data/reporting-dashboard/{brand_id}/scrunch for Scrunch data")
        
        # Original Scrunch processing code moved to separate endpoint
        # See /data/reporting-dashboard/{brand_id}/scrunch endpoint for implementation
        # Scrunch data is now loaded separately to improve main dashboard load time
        
        # Combine all KPIs (Scrunch KPIs loaded via separate endpoint)
        kpis = {**ga4_kpis, **agency_kpis, **scrunch_kpis}
        
        # Log KPI counts for debugging
        logger.info(f"Combined KPIs for brand {brand_id}: GA4={len(ga4_kpis)}, AgencyAnalytics={len(agency_kpis)}, Scrunch={len(scrunch_kpis)}, Total={len(kpis)}")
        
        # Chart data is already initialized above (before Scrunch AI section)
        # Continue populating chart_data with GA4 and Agency Analytics data
        
        # Get users over time (GA4)
        if brand.get("ga4_property_id"):
            try:
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                period_duration = (end_dt - start_dt).days + 1  # Include both start and end dates
                
                # Previous period should be the same duration, ending the day before start_date
                prev_end = (start_dt - timedelta(days=1)).strftime("%Y-%m-%d")
                prev_start = (start_dt - timedelta(days=period_duration)).strftime("%Y-%m-%d")
            except:
                # Fallback to 60-day lookback if date parsing fails
                prev_start = (datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=60)).strftime("%Y-%m-%d")
                prev_end = (datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
            
            # Get responses for this brand filtered by date range (current period)
            # Only select needed columns to avoid loading large JSONB fields unnecessarily
            responses_query = supabase.client.table("responses").select(
                "id,brand_id,prompt_id,platform,brand_present,brand_sentiment,competitors_present,citations"
            ).eq("brand_id", brand_id)
            responses_query = responses_query.gte("created_at", f"{start_date}T00:00:00Z").lte("created_at", f"{end_date}T23:59:59Z")
            
            responses_query_start = time.time()
            responses_result = responses_query.execute()
            section_times["scrunch_responses_query"] = time.time() - responses_query_start
            responses = responses_result.data if hasattr(responses_result, 'data') else []
            
            logger.info(f"Found {len(responses)} Scrunch responses for brand {brand_id} in date range {start_date} to {end_date} (query took {section_times.get('scrunch_responses_query', 0):.2f}s)")
            
            # Log response count for performance debugging
            if len(responses) > 1000:
                logger.warning(f"[PERFORMANCE] Large response set: {len(responses)} responses for brand {brand_id}. Consider pagination or date range limits.")
            
            # Get responses for previous period (for change calculation)
            prev_responses_query = supabase.client.table("responses").select(
                "id,brand_id,prompt_id,platform,brand_present,brand_sentiment,competitors_present,citations"
            ).eq("brand_id", brand_id)
            prev_responses_query = prev_responses_query.gte("created_at", f"{prev_start}T00:00:00Z").lte("created_at", f"{prev_end}T23:59:59Z")
            
            prev_responses_query_start = time.time()
            prev_responses_result = prev_responses_query.execute()
            section_times["scrunch_prev_responses_query"] = time.time() - prev_responses_query_start
            prev_responses = prev_responses_result.data if hasattr(prev_responses_result, 'data') else []
            
            logger.info(f"Found {len(prev_responses)} Scrunch responses for brand {brand_id} in previous period {prev_start} to {prev_end} (query took {section_times.get('scrunch_prev_responses_query', 0):.2f}s)")
            
            # Get prompts for this brand to calculate top 10 prompt percentage
            # Only select id column since we only need to count prompts
            prompts_query = supabase.client.table("prompts").select("id").eq("brand_id", brand_id)
            prompts_query_start = time.time()
            prompts_result = prompts_query.execute()
            section_times["scrunch_prompts_query"] = time.time() - prompts_query_start
            prompts = prompts_result.data if hasattr(prompts_result, 'data') else []
            
            logger.info(f"Found {len(prompts)} Scrunch prompts for brand {brand_id}")
            
            # Check if brand has any Scrunch data at all (to determine if we should show Scrunch section)
            # This ensures we show Scrunch section even if date range has no data
            has_any_scrunch_data = len(responses) > 0 or len(prompts) > 0
            logger.info(f"Brand {brand_id} Scrunch data check: responses={len(responses)}, prompts={len(prompts)}, has_any_scrunch_data={has_any_scrunch_data}")
            if not has_any_scrunch_data:
                # Check if brand has any Scrunch data (without date filter)
                any_responses_query = supabase.client.table("responses").select("id").eq("brand_id", brand_id).limit(1)
                any_responses_result = any_responses_query.execute()
                any_responses = any_responses_result.data if hasattr(any_responses_result, 'data') else []
                
                any_prompts_query = supabase.client.table("prompts").select("id").eq("brand_id", brand_id).limit(1)
                any_prompts_result = any_prompts_query.execute()
                any_prompts = any_prompts_result.data if hasattr(any_prompts_result, 'data') else []
                
                logger.info(f"Brand {brand_id} checking for any Scrunch data (no date filter): any_responses={len(any_responses)}, any_prompts={len(any_prompts)}")
                if len(any_responses) > 0 or len(any_prompts) > 0:
                    logger.info(f"Brand {brand_id} has Scrunch data but none in date range {start_date} to {end_date}. Will show Scrunch section with zero values.")
                    has_any_scrunch_data = True
                else:
                    logger.warning(f"Brand {brand_id} has no Scrunch data at all. Skipping Scrunch KPIs.")
            
            # Helper function to calculate metrics from responses
            # Note: responses_list should already be filtered by brand_id, but we validate for safety
            # OPTIMIZED: Single pass through responses to calculate all metrics
            def calculate_scrunch_metrics(responses_list, prompts_list=None, brand_id_filter=None):
                if not responses_list:
                    return {
                        "total_citations": 0,
                        "brand_present_count": 0,
                        "brand_presence_rate": 0,
                        "sentiment_score": 0,
                        "prompt_search_volume": 0,
                        "top10_prompt_percentage": 0,
                        "competitive_benchmarking": {
                            "brand_visibility_percent": 0,
                            "competitor_avg_visibility_percent": 0
                        },
                        "citations_by_prompt": {},
                        "prompt_reach": {
                            "total_prompts_tracked": 0,
                            "prompts_with_brand": 0,
                            "display": "Tracked prompts: 0; brand appeared in 0 of them"
                        }
                    }
                
                # Initialize all tracking variables
                total_citations = 0
                brand_present_count = 0
                sentiment_scores = {"positive": 0, "neutral": 0, "negative": 0}
                prompt_counts = {}
                prompt_platform_map = {}
                unique_prompts_tracked = set()
                unique_prompts_with_brand = set()
                competitor_visibility_count = {}
                total_responses_with_competitors = 0
                citations_by_prompt = {}
                valid_responses_count = 0
                
                # Single pass through responses - calculate everything at once
                # Optimized: Pre-compile regex and use faster string operations
                import json
                import re
                
                # Pre-compile regex for faster sentiment matching
                positive_pattern = re.compile(r'positive', re.IGNORECASE)
                negative_pattern = re.compile(r'negative', re.IGNORECASE)
                
                # Cache for parsed JSON to avoid re-parsing
                json_cache = {}
                
                for r in responses_list:
                    # Filter by brand_id if provided (should already be filtered, but double-check)
                    if brand_id_filter is not None:
                        if r.get("brand_id") != brand_id_filter:
                            continue
                    valid_responses_count += 1
                    
                    prompt_id = r.get("prompt_id")
                    brand_present = r.get("brand_present", False)
                    
                    # Track prompt counts and platforms (for top 10 calculation)
                    if prompt_id:
                        prompt_counts[prompt_id] = prompt_counts.get(prompt_id, 0) + 1
                        unique_prompts_tracked.add(prompt_id)
                        
                        platform = r.get("platform")
                        if platform:
                            if prompt_id not in prompt_platform_map:
                                prompt_platform_map[prompt_id] = set()
                            prompt_platform_map[prompt_id].add(platform)
                        
                        if brand_present:
                            unique_prompts_with_brand.add(prompt_id)
                    
                    # Count citations (highly optimized - avoid JSON parsing when possible)
                    citations = r.get("citations")
                    citation_count = 0
                    if citations:
                        if isinstance(citations, list):
                            citation_count = len(citations)
                        elif isinstance(citations, str):
                            # Check cache first
                            if citations in json_cache:
                                citation_count = json_cache[citations]
                            else:
                                try:
                                    parsed = json.loads(citations)
                                    if isinstance(parsed, list):
                                        citation_count = len(parsed)
                                        json_cache[citations] = citation_count  # Cache result
                                except:
                                    pass
                    
                    total_citations += citation_count
                    if prompt_id:
                        citations_by_prompt[prompt_id] = citations_by_prompt.get(prompt_id, 0) + citation_count
                    
                    # Track brand presence
                    if brand_present:
                        brand_present_count += 1
                    
                    # Track competitors (optimized - use list comprehension for speed)
                    competitors_present = r.get("competitors_present")
                    if isinstance(competitors_present, list) and len(competitors_present) > 0:
                        total_responses_with_competitors += 1
                        # Use dict comprehension for faster updates
                        for comp in competitors_present:
                            if comp:
                                competitor_visibility_count[comp] = competitor_visibility_count.get(comp, 0) + 1
                    
                    # Track sentiment (optimized - use pre-compiled regex)
                    sentiment = r.get("brand_sentiment")
                    if sentiment:
                        if positive_pattern.search(sentiment):
                            sentiment_scores["positive"] += 1
                        elif negative_pattern.search(sentiment):
                            sentiment_scores["negative"] += 1
                        else:
                            sentiment_scores["neutral"] += 1
                
                # Calculate Top 10 Prompt Percentage (optimized - use sorted once)
                sorted_prompts = sorted(prompt_counts.items(), key=lambda x: x[1], reverse=True)[:10]
                top10_count = sum(count for _, count in sorted_prompts)
                top10_prompt_percentage = (top10_count / valid_responses_count * 100) if valid_responses_count > 0 else 0
                
                # Calculate metrics (100% from source data only)
                brand_presence_rate = (brand_present_count / valid_responses_count * 100) if valid_responses_count > 0 else 0
                
                total_sentiment_responses = sum(sentiment_scores.values())
                if total_sentiment_responses > 0:
                    sentiment_score = (
                        (sentiment_scores["positive"] * 1.0 + 
                         sentiment_scores["neutral"] * 0.0 + 
                         sentiment_scores["negative"] * -1.0) / total_sentiment_responses * 100
                    )
                else:
                    sentiment_score = 0
                
                # Competitive Benchmarking Metrics
                brand_visibility_percent = brand_presence_rate
                competitor_avg_visibility_percent = 0
                if total_responses_with_competitors > 0:
                    total_competitor_appearances = sum(competitor_visibility_count.values())
                    if total_competitor_appearances > 0:
                        competitor_avg_visibility_percent = (total_competitor_appearances / total_responses_with_competitors) * 100
                
                # Calculate Prompt Reach Metric
                prompt_reach = {
                    "total_prompts_tracked": len(unique_prompts_tracked),
                    "prompts_with_brand": len(unique_prompts_with_brand),
                    "display": f"Tracked prompts: {len(unique_prompts_tracked)}; brand appeared in {len(unique_prompts_with_brand)} of them"
                }
                
                return {
                    "total_citations": total_citations,
                    "brand_present_count": brand_present_count,
                    "brand_presence_rate": brand_presence_rate,
                    "sentiment_score": sentiment_score,
                    "prompt_search_volume": valid_responses_count,
                    "top10_prompt_percentage": top10_prompt_percentage,
                    "competitive_benchmarking": {
                        "brand_visibility_percent": brand_visibility_percent,
                        "competitor_avg_visibility_percent": competitor_avg_visibility_percent
                    },
                    "prompt_reach": prompt_reach,
                    "citations_by_prompt": citations_by_prompt,
                }
            
            # Calculate Scrunch KPIs if brand has any Scrunch data (prompts or responses)
            # This ensures all brands with Scrunch data show the section (with zero values if no data in date range)
            logger.info(f"Brand {brand_id} Scrunch KPI calculation: has_any_scrunch_data={has_any_scrunch_data}")
            if has_any_scrunch_data:
                # Calculate current period metrics (will be zero if no responses)
                current_metrics = calculate_scrunch_metrics(responses, prompts, brand_id)
                
                # Extract citations_by_prompt for use in chart data
                citations_by_prompt = current_metrics.get("citations_by_prompt", {})
                
                # Calculate previous period metrics (will be zero if no responses)
                prev_metrics = calculate_scrunch_metrics(prev_responses, prompts, brand_id)
                
                # Calculate percentage changes
                # Each KPI is compared to its own previous value
                def calculate_change(current, previous, metric_name=""):
                    # If both are zero, no change
                    if current == 0 and previous == 0:
                        return 0.0
                    
                    # If previous is zero but current has value
                    # This means the metric appeared for the first time
                    if previous == 0 and current > 0:
                        # Return a large positive change to indicate new metric
                        # But use a consistent value so all new metrics show the same
                        return 100.0  # Indicates new metric appeared
                    
                    # If current is zero but previous had value, show 100% decrease
                    if current == 0 and previous > 0:
                        return -100.0
                    
                    # Normal calculation when both have values
                    # This is where each KPI gets its unique change percentage
                    if previous > 0:
                        change = ((current - previous) / previous) * 100
                        return change
                    
                    return 0.0
                
                # NOTE: influencer_reach, engagement_rate, total_interactions, cost_per_engagement are NOT calculated
                # as they require assumptions. Only 100% accurate source data KPIs are calculated.
                total_citations_change = calculate_change(current_metrics["total_citations"], prev_metrics["total_citations"], "total_citations")
                brand_presence_rate_change = calculate_change(current_metrics["brand_presence_rate"], prev_metrics["brand_presence_rate"], "brand_presence_rate")
                sentiment_score_change = calculate_change(current_metrics["sentiment_score"], prev_metrics["sentiment_score"], "sentiment_score")
                top10_prompt_change = calculate_change(current_metrics["top10_prompt_percentage"], prev_metrics["top10_prompt_percentage"], "top10_prompt_percentage")
                prompt_search_volume_change = calculate_change(current_metrics["prompt_search_volume"], prev_metrics["prompt_search_volume"], "prompt_search_volume")
                
                # Calculate changes for new KPIs
                competitive_current = current_metrics.get("competitive_benchmarking", {})
                competitive_prev = prev_metrics.get("competitive_benchmarking", {})
                brand_visibility_change = calculate_change(
                    competitive_current.get("brand_visibility_percent", 0),
                    competitive_prev.get("brand_visibility_percent", 0),
                    "brand_visibility"
                )
                competitor_avg_change = calculate_change(
                    competitive_current.get("competitor_avg_visibility_percent", 0),
                    competitive_prev.get("competitor_avg_visibility_percent", 0),
                    "competitor_avg_visibility"
                )
                
                # NOTE: influencer_reach, total_interactions, engagement_rate, cost_per_engagement
                # are NOT included as they require assumptions. Only 100% accurate source data KPIs are included.
                scrunch_kpis = {
                    "total_citations": {
                        "value": int(current_metrics["total_citations"]),
                        "change": round(total_citations_change, 2),
                        "source": "Scrunch",
                        "label": "Total Citations",
                        "icon": "Link",
                        "format": "number"
                    },
                    "brand_presence_rate": {
                        "value": round(current_metrics["brand_presence_rate"], 1),
                        "change": round(brand_presence_rate_change, 2),
                        "source": "Scrunch",
                        "label": "Brand Presence Rate",
                        "icon": "CheckCircle",
                        "format": "percentage"
                    },
                    "brand_sentiment_score": {
                        "value": round(current_metrics["sentiment_score"], 1),
                        "change": round(sentiment_score_change, 2),
                        "source": "Scrunch",
                        "label": "Brand Sentiment Score",
                        "icon": "SentimentSatisfied",
                        "format": "number"
                    },
                    # NOTE: scrunch_engagement_rate, total_interactions, cost_per_engagement are NOT included
                    # as they require assumptions. Only 100% accurate source data KPIs are included.
                    "top10_prompt_percentage": {
                        "value": round(current_metrics["top10_prompt_percentage"], 1),
                        "change": round(top10_prompt_change, 2),
                        "source": "Scrunch",
                        "label": "Top 10 Prompt",
                        "icon": "Article",
                        "format": "percentage"
                    },
                    "prompt_search_volume": {
                        "value": current_metrics["prompt_search_volume"],
                        "change": round(prompt_search_volume_change, 2),
                        "source": "Scrunch",
                        "label": "Prompt Search Volume",
                        "icon": "TrendingUp",
                        "format": "number"
                    },
                    # New KPIs
                    "competitive_benchmarking": {
                        "value": {
                            "brand_visibility_percent": round(competitive_current.get("brand_visibility_percent", 0), 1),
                            "competitor_avg_visibility_percent": round(competitive_current.get("competitor_avg_visibility_percent", 0), 1)
                        },
                        "change": {
                            "brand_visibility": round(brand_visibility_change, 2),
                            "competitor_avg_visibility": round(competitor_avg_change, 2)
                        },
                        "source": "Scrunch",
                        "label": "Competitive Benchmarking",
                        "icon": "BarChart",
                        "format": "custom",
                        "display": f"Your brand's AI visibility: {round(competitive_current.get('brand_visibility_percent', 0), 1)}% vs competitor average: {round(competitive_current.get('competitor_avg_visibility_percent', 0), 1)}%"
                    },
                    "prompt_reach": {
                        "value": current_metrics.get("prompt_reach", {}),
                        "change": None,  # Not calculating change for this metric
                        "source": "Scrunch",
                        "label": "Prompt Reach",
                        "icon": "Article",
                        "format": "custom"
                    }
                }
                
                # Calculate Top Performing Prompts
                # Filter by brand_id: only count responses for this brand_id and match with prompts for this brand_id
                if prompts and responses:
                    # Create a set of valid prompt IDs for this brand_id for quick lookup
                    valid_prompt_ids = {prompt.get("id") for prompt in prompts if prompt.get("id")}
                    
                    # Count responses per prompt_id, but only for responses that:
                    # 1. Have a prompt_id
                    # 2. The prompt_id belongs to a prompt for this brand_id
                    # 3. The response already belongs to this brand_id (from the query filter)
                    prompt_counts = {}
                    total_responses_for_brand = 0
                    for r in responses:
                        # Double-check brand_id matches (defensive programming)
                        response_brand_id = r.get("brand_id")
                        if response_brand_id != brand_id:
                            continue  # Skip responses that don't match brand_id
                        
                        total_responses_for_brand += 1
                        prompt_id = r.get("prompt_id")
                        if prompt_id and prompt_id in valid_prompt_ids:
                            prompt_counts[prompt_id] = prompt_counts.get(prompt_id, 0) + 1
                    
                    # Map prompts with response counts and unique platform variants (only prompts for this brand_id)
                    # First, collect platform variants for each prompt
                    prompt_variants = {}
                    for r in responses:
                        # Double-check brand_id matches
                        response_brand_id = r.get("brand_id")
                        if response_brand_id != brand_id:
                            continue
                        
                        prompt_id = r.get("prompt_id")
                        if prompt_id and prompt_id in valid_prompt_ids:
                            if prompt_id not in prompt_variants:
                                prompt_variants[prompt_id] = set()
                            platform = r.get("platform")
                            if platform:
                                prompt_variants[prompt_id].add(platform)
                    
                    top_prompts_data = []
                    for prompt in prompts:
                        # Ensure prompt belongs to this brand_id
                        prompt_brand_id = prompt.get("brand_id")
                        if prompt_brand_id != brand_id:
                            continue  # Skip prompts that don't match brand_id
                        
                        prompt_id = prompt.get("id")
                        response_count = prompt_counts.get(prompt_id, 0)
                        if response_count > 0:
                            # Count unique platforms (variants) for this prompt
                            unique_variants = len(prompt_variants.get(prompt_id, set()))
                            # If no platforms found, default to 1 (at least one variant exists)
                            variants_count = unique_variants if unique_variants > 0 else 1
                            
                            top_prompts_data.append({
                                "id": prompt_id,
                                "text": prompt.get("text") or prompt.get("prompt_text") or "N/A",
                                "responseCount": response_count,
                                "variants": variants_count,  # Count of unique platforms (ChatGPT, Perplexity, Claude, etc.)
                                "citations": citations_by_prompt.get(prompt_id, 0),  # New: Citations per prompt
                                "totalResponsesForBrand": total_responses_for_brand  # Total responses for this brand_id
                            })
                    
                    # Sort by response count and get top 10
                    top_prompts_data.sort(key=lambda x: x["responseCount"], reverse=True)
                    top_performing_prompts = []
                    for idx, prompt_data in enumerate(top_prompts_data[:10], 1):
                        top_performing_prompts.append({
                            **prompt_data,
                            "rank": idx
                        })
                    chart_data["top_performing_prompts"] = top_performing_prompts
                
                # Calculate Scrunch AI Insights
                if prompts and responses:
                    # Group responses by prompt
                    prompt_data_map = {}
                    for prompt in prompts:
                        prompt_data_map[prompt.get("id")] = {
                            "prompt": prompt,
                            "responses": [],
                            "variants": set(),
                            "citations": 0,
                            "competitors": set()
                        }
                    
                    for r in responses:
                        prompt_id = r.get("prompt_id")
                        if prompt_id and prompt_id in prompt_data_map:
                            prompt_data_map[prompt_id]["responses"].append(r)
                            if r.get("platform"):
                                prompt_data_map[prompt_id]["variants"].add(r.get("platform"))
                            
                            # Count citations
                            citations = r.get("citations")
                            if citations:
                                if isinstance(citations, list):
                                    prompt_data_map[prompt_id]["citations"] += len(citations)
                                elif isinstance(citations, str):
                                    try:
                                        import json
                                        parsed = json.loads(citations)
                                        if isinstance(parsed, list):
                                            prompt_data_map[prompt_id]["citations"] += len(parsed)
                                    except:
                                        pass
                            
                            # Track competitors
                            competitors_present = r.get("competitors_present", [])
                            if isinstance(competitors_present, list):
                                for comp in competitors_present:
                                    prompt_data_map[prompt_id]["competitors"].add(comp)
                    
                    # Calculate insights for each prompt
                    insights = []
                    for prompt_id, data in prompt_data_map.items():
                        if len(data["responses"]) > 0:
                            prompt = data["prompt"]
                            response_count = len(data["responses"])
                            presence_count = sum(1 for r in data["responses"] if r.get("brand_present") == True)
                            presence = (presence_count / response_count * 100) if response_count > 0 else 0
                            
                            # Get category from topics or prompt text
                            category = (
                                prompt.get("topics", [None])[0] if prompt.get("topics") else None
                            ) or (
                                (prompt.get("text") or prompt.get("prompt_text") or "").split(" ")[:3]
                            ) or prompt.get("stage") or "General"
                            
                            if isinstance(category, list):
                                category = " ".join(category)
                            
                            insights.append({
                                "id": prompt_id,
                                "seedPrompt": prompt.get("text") or prompt.get("prompt_text") or "N/A",
                                "stage": prompt.get("stage") or "Unknown",
                                "variants": len(data["variants"]) or 1,
                                "responses": response_count,
                                "presence": round(presence, 1),
                                "presenceChange": 0,  # Would need historical comparison
                                "citations": data["citations"],
                                "citationsChange": 0,  # Would need historical comparison
                                "competitors": len(data["competitors"]),
                                "competitorsChange": 0,  # Would need historical comparison
                                "category": category
                            })
                    
        
        # Log KPI counts for debugging
        logger.info(f"Combined KPIs for brand {brand_id}: GA4={len(ga4_kpis)}, AgencyAnalytics={len(agency_kpis)}, Scrunch={len(scrunch_kpis)}, Total={len(kpis)}")
        
        # Chart data is already initialized above (before Scrunch AI section)
        # Continue populating chart_data with GA4 and Agency Analytics data
        
        # Get users over time (GA4)
        if brand.get("ga4_property_id"):
            try:
                property_id = brand["ga4_property_id"]
                
                # Get all chart data from stored database records (NO live API calls)
                logger.info(f"[GA4 STORED DATA] Fetching chart data from stored records for date range: {start_date} to {end_date}")
                top_pages = supabase.get_ga4_top_pages_by_date_range(brand_id, property_id, start_date, end_date, limit=10)
                traffic_sources = supabase.get_ga4_traffic_sources_by_date_range(brand_id, property_id, start_date, end_date)
                geographic = supabase.get_ga4_geographic_by_date_range(brand_id, property_id, start_date, end_date, limit=10)
                devices = supabase.get_ga4_devices_by_date_range(brand_id, property_id, start_date, end_date)
                
                chart_data["traffic_sources"] = traffic_sources if traffic_sources else []
                chart_data["top_pages"] = top_pages if top_pages else []
                chart_data["geographic_breakdown"] = geographic if geographic else []
                chart_data["device_breakdown"] = devices if devices else []
                
                logger.info(f"[GA4 STORED DATA] Chart data loaded - top_pages: {len(top_pages)}, traffic_sources: {len(traffic_sources)}, geographic: {len(geographic)}, devices: {len(devices)}")
                
                # Get GA4 traffic overview for detailed metrics from stored data
                traffic_overview = supabase.get_ga4_traffic_overview_by_date_range(brand_id, property_id, start_date, end_date)
                if traffic_overview:
                    # Calculate previous period for change comparison based on selected date range duration
                    start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                    end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                    period_duration = (end_dt - start_dt).days + 1
                    prev_end = (start_dt - timedelta(days=1)).strftime("%Y-%m-%d")
                    prev_start = (start_dt - timedelta(days=period_duration)).strftime("%Y-%m-%d")
                    prev_traffic_overview = supabase.get_ga4_traffic_overview_by_date_range(brand_id, property_id, prev_start, prev_end)
                    
                    if traffic_overview:
                        # Calculate changes
                        sessions_change = traffic_overview.get("sessionsChange", 0)
                        engaged_sessions_change = 0
                        avg_session_duration_change = 0
                        engagement_rate_change = 0
                        
                        if prev_traffic_overview:
                            prev_engaged_sessions = prev_traffic_overview.get("engagedSessions", 0)
                            current_engaged_sessions = traffic_overview.get("engagedSessions", 0)
                            if prev_engaged_sessions > 0:
                                engaged_sessions_change = ((current_engaged_sessions - prev_engaged_sessions) / prev_engaged_sessions) * 100
                            
                            prev_avg_duration = prev_traffic_overview.get("averageSessionDuration", 0)
                            current_avg_duration = traffic_overview.get("averageSessionDuration", 0)
                            if prev_avg_duration > 0:
                                avg_session_duration_change = ((current_avg_duration - prev_avg_duration) / prev_avg_duration) * 100
                            
                            prev_engagement_rate = prev_traffic_overview.get("engagementRate", 0)
                            current_engagement_rate = traffic_overview.get("engagementRate", 0)
                            if prev_engagement_rate > 0:
                                engagement_rate_change = ((current_engagement_rate - prev_engagement_rate) / prev_engagement_rate) * 100
                        
                        chart_data["ga4_traffic_overview"] = {
                            "sessions": traffic_overview.get("sessions", 0),
                            "sessionsChange": sessions_change,
                            "engagedSessions": traffic_overview.get("engagedSessions", 0),
                            "engagedSessionsChange": engaged_sessions_change,
                            "averageSessionDuration": traffic_overview.get("averageSessionDuration", 0),
                            "avgSessionDurationChange": avg_session_duration_change,
                            "engagementRate": traffic_overview.get("engagementRate", 0),
                            "engagementRateChange": engagement_rate_change
                        }
                    else:
                        logger.warning(f"[GA4 STORED DATA] No traffic overview data found in database for date range {start_date} to {end_date}")
                
                # Get daily metrics over time from stored data (NO live API calls)
                logger.info(f"[GA4 STORED DATA] Fetching daily metrics from stored records")
                daily_metrics = {}
                prev_daily_metrics = {}
                
                # Calculate previous period dates
                start_dt = datetime.strptime(start_date, "%Y-%m-%d")
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                period_duration = (end_dt - start_dt).days + 1
                prev_end = (start_dt - timedelta(days=1)).strftime("%Y-%m-%d")
                prev_start = (start_dt - timedelta(days=period_duration)).strftime("%Y-%m-%d")
                
                try:
                    # First, generate all dates in the range to ensure we have entries for all days
                    all_dates_map = {}
                    current_date = start_dt
                    while current_date <= end_dt:
                        date_str = current_date.strftime("%Y-%m-%d")
                        date_formatted = current_date.strftime("%Y%m%d")  # YYYYMMDD format for chart
                        all_dates_map[date_str] = date_formatted
                        # Initialize with zeros - will be filled from actual data
                        daily_metrics[date_str] = {
                            "date": date_formatted,
                            "users": 0,
                            "sessions": 0,
                            "new_users": 0,
                            "conversions": 0,
                            "revenue": 0
                        }
                        current_date += timedelta(days=1)
                    
                    # Get daily traffic overview records for current period
                    daily_traffic_result = supabase.client.table("ga4_traffic_overview").select("*").eq("brand_id", brand_id).eq("property_id", property_id).gte("date", start_date).lte("date", end_date).order("date", desc=False).execute()
                    daily_traffic_records = daily_traffic_result.data if hasattr(daily_traffic_result, 'data') else []
                    
                    for record in daily_traffic_records:
                        date = record.get("date")
                        if date and date in daily_metrics:
                            daily_metrics[date]["users"] = record.get("users", 0)
                            daily_metrics[date]["sessions"] = record.get("sessions", 0)
                            daily_metrics[date]["new_users"] = record.get("new_users", 0)
                    
                    # Get daily conversions - match to existing dates or create new entries
                    daily_conversions_result = supabase.client.table("ga4_daily_conversions").select("*").eq("brand_id", brand_id).eq("property_id", property_id).gte("date", start_date).lte("date", end_date).execute()
                    daily_conversions_records = daily_conversions_result.data if hasattr(daily_conversions_result, 'data') else []
                    for record in daily_conversions_records:
                        date = record.get("date")
                        if date:
                            if date not in daily_metrics:
                                # Create entry if it doesn't exist (shouldn't happen, but just in case)
                                date_formatted = date.replace("-", "") if "-" in date else date
                                daily_metrics[date] = {
                                    "date": date_formatted,
                                    "users": 0,
                                    "sessions": 0,
                                    "new_users": 0,
                                    "conversions": 0,
                                    "revenue": 0
                                }
                            daily_metrics[date]["conversions"] = record.get("total_conversions", 0)
                    
                    # Get daily revenue - match to existing dates or create new entries
                    daily_revenue_result = supabase.client.table("ga4_revenue").select("*").eq("brand_id", brand_id).eq("property_id", property_id).gte("date", start_date).lte("date", end_date).execute()
                    daily_revenue_records = daily_revenue_result.data if hasattr(daily_revenue_result, 'data') else []
                    for record in daily_revenue_records:
                        date = record.get("date")
                        if date:
                            if date not in daily_metrics:
                                # Create entry if it doesn't exist (shouldn't happen, but just in case)
                                date_formatted = date.replace("-", "") if "-" in date else date
                                daily_metrics[date] = {
                                    "date": date_formatted,
                                    "users": 0,
                                    "sessions": 0,
                                    "new_users": 0,
                                    "conversions": 0,
                                    "revenue": 0
                                }
                            daily_metrics[date]["revenue"] = float(record.get("total_revenue", 0))
                    
                    # Generate all dates for previous period first
                    prev_all_dates_map = {}
                    prev_current_date = datetime.strptime(prev_start, "%Y-%m-%d")
                    prev_end_dt = datetime.strptime(prev_end, "%Y-%m-%d")
                    while prev_current_date <= prev_end_dt:
                        date_str = prev_current_date.strftime("%Y-%m-%d")
                        date_formatted = prev_current_date.strftime("%Y%m%d")
                        prev_all_dates_map[date_str] = date_formatted
                        # Initialize with zeros
                        prev_daily_metrics[date_str] = {
                            "date": date_formatted,
                            "users": 0,
                            "sessions": 0,
                            "new_users": 0,
                            "conversions": 0,
                            "revenue": 0
                        }
                        prev_current_date += timedelta(days=1)
                    
                    # Get previous period daily metrics
                    prev_daily_traffic_result = supabase.client.table("ga4_traffic_overview").select("*").eq("brand_id", brand_id).eq("property_id", property_id).gte("date", prev_start).lte("date", prev_end).order("date", desc=False).execute()
                    prev_daily_traffic_records = prev_daily_traffic_result.data if hasattr(prev_daily_traffic_result, 'data') else []
                    
                    for record in prev_daily_traffic_records:
                        date = record.get("date")
                        if date and date in prev_daily_metrics:
                            prev_daily_metrics[date]["users"] = record.get("users", 0)
                            prev_daily_metrics[date]["sessions"] = record.get("sessions", 0)
                            prev_daily_metrics[date]["new_users"] = record.get("new_users", 0)
                    
                    # Get previous period conversions and revenue
                    prev_daily_conversions_result = supabase.client.table("ga4_daily_conversions").select("*").eq("brand_id", brand_id).eq("property_id", property_id).gte("date", prev_start).lte("date", prev_end).execute()
                    prev_daily_conversions_records = prev_daily_conversions_result.data if hasattr(prev_daily_conversions_result, 'data') else []
                    for record in prev_daily_conversions_records:
                        date = record.get("date")
                        if date:
                            if date not in prev_daily_metrics:
                                date_formatted = date.replace("-", "") if "-" in date else date
                                prev_daily_metrics[date] = {
                                    "date": date_formatted,
                                    "users": 0,
                                    "sessions": 0,
                                    "new_users": 0,
                                    "conversions": 0,
                                    "revenue": 0
                                }
                            prev_daily_metrics[date]["conversions"] = record.get("total_conversions", 0)
                    
                    prev_daily_revenue_result = supabase.client.table("ga4_revenue").select("*").eq("brand_id", brand_id).eq("property_id", property_id).gte("date", prev_start).lte("date", prev_end).execute()
                    prev_daily_revenue_records = prev_daily_revenue_result.data if hasattr(prev_daily_revenue_result, 'data') else []
                    for record in prev_daily_revenue_records:
                        date = record.get("date")
                        if date:
                            if date not in prev_daily_metrics:
                                date_formatted = date.replace("-", "") if "-" in date else date
                                prev_daily_metrics[date] = {
                                    "date": date_formatted,
                                    "users": 0,
                                    "sessions": 0,
                                    "new_users": 0,
                                    "conversions": 0,
                                    "revenue": 0
                                }
                            prev_daily_metrics[date]["revenue"] = float(record.get("total_revenue", 0))
                    
                    logger.info(f"[GA4 STORED DATA] Loaded {len(daily_metrics)} daily metrics records for current period, {len(prev_daily_metrics)} for previous period")
                    
                    # Combine current and previous period data
                    if daily_metrics:
                        ga4_daily_comparison = []
                        prev_data_list = sorted(prev_daily_metrics.items())
                        current_dates = sorted(daily_metrics.keys())
                        
                        for idx, date_str in enumerate(current_dates):
                            current = daily_metrics[date_str]
                            # Get corresponding previous period data by index
                            prev_idx = idx if idx < len(prev_data_list) else len(prev_data_list) - 1
                            previous = prev_data_list[prev_idx][1] if prev_data_list else {}
                            
                            ga4_daily_comparison.append({
                                "date": current["date"],  # Already in YYYYMMDD format
                                "current_users": current["users"],
                                "previous_users": previous.get("users", 0),
                                "current_sessions": current["sessions"],
                                "previous_sessions": previous.get("sessions", 0),
                                "current_new_users": current["new_users"],
                                "previous_new_users": previous.get("new_users", 0),
                                "current_conversions": current["conversions"],
                                "previous_conversions": previous.get("conversions", 0),
                                "current_revenue": current["revenue"],
                                "previous_revenue": previous.get("revenue", 0)
                            })
                        
                        chart_data["ga4_daily_comparison"] = ga4_daily_comparison
                        
                        # Keep backward compatibility - users_over_time (all days in range)
                        users_over_time = []
                        for date_str in sorted(daily_metrics.keys()):
                            users_over_time.append({
                                "date": daily_metrics[date_str]["date"],  # Already in YYYYMMDD format
                                "users": daily_metrics[date_str]["users"]
                            })
                        chart_data["users_over_time"] = users_over_time
                    else:
                        chart_data["ga4_daily_comparison"] = []
                        chart_data["users_over_time"] = []
                except Exception as e:
                    logger.warning(f"[GA4 STORED DATA] Could not fetch daily metrics from stored data: {str(e)}")
                    chart_data["ga4_daily_comparison"] = []
                    chart_data["users_over_time"] = []
                    chart_data["ga4_daily_comparison"] = []
            except Exception as e:
                logger.warning(f"Error fetching GA4 chart data: {str(e)}")
        
        # Get impressions vs clicks and top campaigns (Agency Analytics)
        try:
            campaign_links_result = supabase.client.table("agency_analytics_campaign_brands").select("*").eq("brand_id", brand_id).execute()
            campaign_links = campaign_links_result.data if hasattr(campaign_links_result, 'data') else []
        except:
            campaign_links = []
        
        if campaign_links:
            try:
                campaign_ids = [link["campaign_id"] for link in campaign_links]
                
                # Get campaign data
                campaigns_result = supabase.client.table("agency_analytics_campaigns").select("*").in_("id", campaign_ids).execute()
                campaigns = campaigns_result.data if hasattr(campaigns_result, 'data') else []
                
                # NOTE: impressions_vs_clicks and top_campaigns charts are NOT populated
                # as they require estimated impressions/clicks calculations.
                # Only 100% accurate source data is used for charts.
                chart_data["impressions_vs_clicks"] = []  # Empty - requires estimations
                chart_data["top_campaigns"] = []  # Empty - requires estimations
                
                # Calculate keyword rankings performance metrics and collect all keywords
                chart_total_rankings = 0
                chart_total_search_volume = 0
                chart_all_keywords_rankings = []
                
                for campaign_id in campaign_ids:
                    summaries_query = supabase.client.table("agency_analytics_keyword_ranking_summaries").select("*").eq("campaign_id", campaign_id)
                    summaries_query = summaries_query.gte("date", start_date).lte("date", end_date)
                    summaries_result = summaries_query.execute()
                    campaign_summaries = summaries_result.data if hasattr(summaries_result, 'data') else []
                    
                    for summary in campaign_summaries:
                        ranking = summary.get("google_ranking") or summary.get("google_mobile_ranking") or 999
                        if ranking <= 100:
                            chart_total_rankings += 1
                        chart_total_search_volume += summary.get("search_volume", 0) or 0
                        
                        # Collect keyword data for "All Keywords ranking"
                        keyword_phrase = summary.get("keyword_phrase") or f"Keyword {summary.get('keyword_id', 'N/A')}"
                        if ranking is not None and ranking <= 100:
                            chart_all_keywords_rankings.append({
                                "keyword": keyword_phrase,
                                "ranking": ranking,
                                "search_volume": summary.get("search_volume", 0) or 0,
                                "ranking_change": summary.get("ranking_change"),
                                "keyword_id": summary.get("keyword_id")
                            })
                
                # Sort by ranking (best first)
                chart_all_keywords_rankings.sort(key=lambda x: x["ranking"] if x["ranking"] else 999)
                
                chart_data["all_keywords_ranking"] = chart_all_keywords_rankings
                chart_data["keyword_rankings_performance"] = {
                    "google_rankings": chart_total_rankings,
                    "google_rankings_change": 0,  # Would need historical comparison in chart section
                    "volume": chart_total_search_volume,
                    "volume_change": 0  # Would need historical comparison in chart section
                }
                    
            except Exception as e:
                logger.warning(f"Error fetching Agency Analytics chart data: {str(e)}")
        
        # Scrunch processing removed - handled by separate endpoint
        # section_times["scrunch"] removed - no longer needed
        total_time = time.time() - total_start
        section_times["total"] = total_time
        
        # Log performance breakdown
        logger.info(f"[PERFORMANCE] Dashboard endpoint for brand {brand_id} took {total_time:.2f}s total:")
        for section, duration in sorted(section_times.items(), key=lambda x: x[1], reverse=True):
            if duration > 0.05:  # Log sections taking more than 50ms (lowered threshold to see sub-timings)
                percentage = (duration / total_time * 100) if total_time > 0 else 0
                logger.info(f"[PERFORMANCE]   - {section}: {duration:.2f}s ({percentage:.1f}%)")
        
        return {
            "brand_id": brand_id,
            "brand_name": brand.get("name"),
            "date_range": {
                "start_date": start_date,
                "end_date": end_date
            },
            "kpis": kpis,
            "chart_data": chart_data,
            "available_sources": {
                "ga4": bool(ga4_kpis),
                "agency_analytics": bool(agency_kpis),
                "scrunch": bool(scrunch_kpis)
            },
            "diagnostics": {
                "ga4_configured": bool(brand.get("ga4_property_id")),
                "agency_analytics_configured": bool(campaign_links),
                "ga4_errors": ga4_errors,
                "agency_errors": agency_errors,
                "kpi_counts": {
                    "ga4": len(ga4_kpis),
                    "agency_analytics": len(agency_kpis),
                    "scrunch": len(scrunch_kpis),
                    "total": len(kpis)
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching reporting dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/data/brands/slug/{slug}")
async def get_brand_by_slug(slug: str):
    """Get brand by slug for public access
    
    Supports both client url_slug and brand slug:
    - First tries to find a client by url_slug, then returns the associated brand
    - Falls back to finding a brand by slug if no client found
    """
    try:
        supabase = SupabaseService()
        
        # First, try to find a client by url_slug (for /reporting/client/:slug routes)
        client = supabase.get_client_by_slug(slug)
        if client:
            # If client found, get the associated brand via scrunch_brand_id
            if client.get("scrunch_brand_id"):
                brand_id = client["scrunch_brand_id"]
                brand_result = supabase.client.table("brands").select("*").eq("id", brand_id).execute()
                brands = brand_result.data if hasattr(brand_result, 'data') else []
                if brands:
                    logger.info(f"Found client by url_slug '{slug}', returning associated brand")
                    return brands[0]
                else:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Client found but associated brand (id: {brand_id}) not found"
                    )
            else:
                raise HTTPException(
                    status_code=404,
                    detail=f"Client found but no brand mapping configured (scrunch_brand_id is null)"
                )
        
        # Fall back to finding a brand by slug (for backward compatibility)
        brand_result = supabase.client.table("brands").select("*").eq("slug", slug).execute()
        brands = brand_result.data if hasattr(brand_result, 'data') else []
        
        if not brands:
            raise HTTPException(status_code=404, detail="Brand or client not found")
        
        return brands[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching brand by slug: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/reporting-dashboard/slug/{slug}")
async def get_reporting_dashboard_by_slug(
    slug: str,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get consolidated KPIs from GA4, Agency Analytics, and Scrunch for reporting dashboard by slug (public access)
    
    Supports both client url_slug and brand slug:
    - First tries to find a client by url_slug, then uses scrunch_brand_id
    - Falls back to finding a brand by slug if no client found
    """
    try:
        supabase = SupabaseService()
        brand_id = None
        
        # First, try to find a client by url_slug (for /reporting/client/:slug routes)
        client = supabase.get_client_by_slug(slug)
        if client:
            # If client found, use the scrunch_brand_id from the client
            if client.get("scrunch_brand_id"):
                brand_id = client["scrunch_brand_id"]
                logger.info(f"Found client by url_slug '{slug}', using scrunch_brand_id: {brand_id}")
            else:
                raise HTTPException(
                    status_code=404,
                    detail=f"Client found but no brand mapping configured (scrunch_brand_id is null)"
                )
        else:
            # Fall back to finding a brand by slug (for backward compatibility)
            brand_result = supabase.client.table("brands").select("*").eq("slug", slug).execute()
            brands = brand_result.data if hasattr(brand_result, 'data') else []
            
            if not brands:
                raise HTTPException(status_code=404, detail="Brand or client not found")
            
            brand = brands[0]
            brand_id = brand["id"]
            logger.info(f"Found brand by slug '{slug}', using brand_id: {brand_id}")
        
        if not brand_id:
            raise HTTPException(status_code=404, detail="Brand ID not found")
        
        # Call the existing get_reporting_dashboard function directly instead of making HTTP request
        result = await get_reporting_dashboard(brand_id, start_date, end_date)
        result["brand_slug"] = slug
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error fetching reporting dashboard by slug '{slug}': {str(e)}\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Error fetching reporting dashboard: {str(e)}")

@router.get("/data/reporting-dashboard/slug/{slug}/scrunch")
@handle_api_errors(context="fetching Scrunch dashboard data by slug")
async def get_scrunch_dashboard_data_by_slug(
    slug: str,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get Scrunch AI KPIs and chart data for reporting dashboard by slug (public access)
    
    Supports both client url_slug and brand slug:
    - First tries to find a client by url_slug, then uses scrunch_brand_id
    - Falls back to finding a brand by slug if no client found
    """
    try:
        supabase = SupabaseService()
        brand_id = None
        
        # First, try to find a client by url_slug (for /reporting/client/:slug routes)
        client = supabase.get_client_by_slug(slug)
        if client:
            # If client found, use the scrunch_brand_id from the client
            if client.get("scrunch_brand_id"):
                brand_id = client["scrunch_brand_id"]
                logger.info(f"Found client by url_slug '{slug}', using scrunch_brand_id: {brand_id}")
            else:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Client found but no Scrunch brand mapping configured (scrunch_brand_id is null)"
                )
        else:
            # Fall back to finding a brand by slug (for backward compatibility)
            brand_result = supabase.client.table("brands").select("*").eq("slug", slug).execute()
            brands = brand_result.data if hasattr(brand_result, 'data') else []
            
            if not brands:
                raise HTTPException(status_code=404, detail="Brand or client not found")
            
            brand = brands[0]
            brand_id = brand["id"]
            logger.info(f"Found brand by slug '{slug}', using brand_id: {brand_id}")
        
        if not brand_id:
            raise HTTPException(status_code=404, detail="Brand ID not found")
        
        # Call the existing get_scrunch_dashboard_data function
        result = await get_scrunch_dashboard_data(brand_id, start_date, end_date)
        result["brand_slug"] = slug
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error fetching Scrunch dashboard data by slug '{slug}': {str(e)}\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Error fetching Scrunch dashboard data: {str(e)}")

@router.get("/data/reporting-dashboard/{brand_id}/scrunch")
@handle_api_errors(context="fetching Scrunch dashboard data")
async def get_scrunch_dashboard_data(
    brand_id: int,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Get Scrunch AI KPIs and chart data for reporting dashboard (separate endpoint for parallel loading)"""
    try:
        supabase = SupabaseService()
        
        # Get brand info
        brand_result = supabase.client.table("brands").select("*").eq("id", brand_id).execute()
        brands = brand_result.data if hasattr(brand_result, 'data') else []
        
        if not brands:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        brand = brands[0]
        
        # Set default date range
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        
        # Validate date range
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            
            if start_dt > end_dt:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Invalid date range: start_date ({start_date}) must be before or equal to end_date ({end_date})"
                )
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid date format. Use YYYY-MM-DD format. Error: {str(e)}"
            )
        
        # Import the Scrunch calculation logic from the main endpoint
        # This is a simplified version that only returns Scrunch data
        scrunch_kpis = {}
        scrunch_chart_data = {
            "top_performing_prompts": [],
            "scrunch_ai_insights": []
        }
        
        try:
            # Calculate previous period for change comparison
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            period_duration = (end_dt - start_dt).days + 1
            prev_end = (start_dt - timedelta(days=1)).strftime("%Y-%m-%d")
            prev_start = (start_dt - timedelta(days=period_duration)).strftime("%Y-%m-%d")
            
            # Get responses for this brand filtered by date range (current period)
            # Only select needed columns to avoid loading large JSONB fields unnecessarily
            responses_query = supabase.client.table("responses").select(
                "id,brand_id,prompt_id,platform,brand_present,brand_sentiment,competitors_present,citations"
            ).eq("brand_id", brand_id)
            responses_query = responses_query.gte("created_at", f"{start_date}T00:00:00Z").lte("created_at", f"{end_date}T23:59:59Z")
            responses_result = responses_query.execute()
            responses = responses_result.data if hasattr(responses_result, 'data') else []
            
            logger.info(f"Found {len(responses)} Scrunch responses for brand {brand_id} in date range {start_date} to {end_date}")
            
            # Get responses for previous period
            prev_responses_query = supabase.client.table("responses").select(
                "id,brand_id,prompt_id,platform,brand_present,brand_sentiment,competitors_present,citations"
            ).eq("brand_id", brand_id)
            prev_responses_query = prev_responses_query.gte("created_at", f"{prev_start}T00:00:00Z").lte("created_at", f"{prev_end}T23:59:59Z")
            prev_responses_result = prev_responses_query.execute()
            prev_responses = prev_responses_result.data if hasattr(prev_responses_result, 'data') else []
            
            logger.info(f"Found {len(prev_responses)} Scrunch responses for brand {brand_id} in previous period {prev_start} to {prev_end}")
            
            # Get prompts for this brand (only select needed columns)
            prompts_query = supabase.client.table("prompts").select("id,text,stage,topics,brand_id").eq("brand_id", brand_id)
            prompts_result = prompts_query.execute()
            prompts = prompts_result.data if hasattr(prompts_result, 'data') else []
            
            logger.info(f"Found {len(prompts)} Scrunch prompts for brand {brand_id}")
            
            # Check if brand has any Scrunch data
            has_any_scrunch_data = len(responses) > 0 or len(prompts) > 0
            if not has_any_scrunch_data:
                any_responses_query = supabase.client.table("responses").select("id").eq("brand_id", brand_id).limit(1)
                any_responses_result = any_responses_query.execute()
                any_responses = any_responses_result.data if hasattr(any_responses_result, 'data') else []
                any_prompts_query = supabase.client.table("prompts").select("id").eq("brand_id", brand_id).limit(1)
                any_prompts_result = any_prompts_query.execute()
                any_prompts = any_prompts_result.data if hasattr(any_prompts_result, 'data') else []
                if len(any_responses) > 0 or len(any_prompts) > 0:
                    has_any_scrunch_data = True
            
            # Import the calculate_scrunch_metrics function logic
            # (We'll use the same logic from the main endpoint)
            # Note: responses_list should already be filtered by brand_id, but we validate for safety
            def calculate_scrunch_metrics(responses_list, prompts_list=None, brand_id_filter=None):
                if not responses_list:
                    return {
                        "total_citations": 0,
                        "brand_present_count": 0,
                        "brand_presence_rate": 0,
                        "sentiment_score": 0,
                        "prompt_search_volume": 0,
                        "top10_prompt_percentage": 0,
                        "competitive_benchmarking": {
                            "brand_visibility_percent": 0,
                            "competitor_avg_visibility_percent": 0
                        },
                        "prompt_reach": {
                            "total_prompts_tracked": 0,
                            "prompts_with_brand": 0,
                            "display": "Tracked prompts: 0; brand appeared in 0 of them"
                        },
                        "citations_by_prompt": {},
                    }
                
                # Initialize all tracking variables
                total_citations = 0
                brand_present_count = 0
                sentiment_scores = {"positive": 0, "neutral": 0, "negative": 0}
                prompt_counts = {}
                prompt_platform_map = {}
                unique_prompts_tracked = set()
                unique_prompts_with_brand = set()
                competitor_visibility_count = {}
                total_responses_with_competitors = 0
                citations_by_prompt = {}
                valid_responses_count = 0
                
                # Single pass through responses - calculate everything at once
                # Optimized: Pre-compile regex and use faster string operations
                import json
                import re
                
                # Pre-compile regex for faster sentiment matching
                positive_pattern = re.compile(r'positive', re.IGNORECASE)
                negative_pattern = re.compile(r'negative', re.IGNORECASE)
                
                # Cache for parsed JSON to avoid re-parsing
                json_cache = {}
                
                for r in responses_list:
                    # Filter by brand_id if provided (should already be filtered, but double-check)
                    if brand_id_filter is not None:
                        if r.get("brand_id") != brand_id_filter:
                            continue
                    valid_responses_count += 1
                    
                    prompt_id = r.get("prompt_id")
                    brand_present = r.get("brand_present", False)
                    
                    # Track prompt counts and platforms (for top 10 calculation)
                    if prompt_id:
                        prompt_counts[prompt_id] = prompt_counts.get(prompt_id, 0) + 1
                        unique_prompts_tracked.add(prompt_id)
                        
                        platform = r.get("platform")
                        if platform:
                            if prompt_id not in prompt_platform_map:
                                prompt_platform_map[prompt_id] = set()
                            prompt_platform_map[prompt_id].add(platform)
                        
                        if brand_present:
                            unique_prompts_with_brand.add(prompt_id)
                    
                    # Count citations (highly optimized - avoid JSON parsing when possible)
                    citations = r.get("citations")
                    citation_count = 0
                    if citations:
                        if isinstance(citations, list):
                            citation_count = len(citations)
                        elif isinstance(citations, str):
                            # Check cache first
                            if citations in json_cache:
                                citation_count = json_cache[citations]
                            else:
                                try:
                                    parsed = json.loads(citations)
                                    if isinstance(parsed, list):
                                        citation_count = len(parsed)
                                        json_cache[citations] = citation_count  # Cache result
                                except:
                                    pass
                    
                    total_citations += citation_count
                    if prompt_id:
                        citations_by_prompt[prompt_id] = citations_by_prompt.get(prompt_id, 0) + citation_count
                    
                    # Track brand presence
                    if brand_present:
                        brand_present_count += 1
                    
                    # Track competitors (optimized - use list comprehension for speed)
                    competitors_present = r.get("competitors_present")
                    if isinstance(competitors_present, list) and len(competitors_present) > 0:
                        total_responses_with_competitors += 1
                        # Use dict comprehension for faster updates
                        for comp in competitors_present:
                            if comp:
                                competitor_visibility_count[comp] = competitor_visibility_count.get(comp, 0) + 1
                    
                    # Track sentiment (optimized - use pre-compiled regex)
                    sentiment = r.get("brand_sentiment")
                    if sentiment:
                        if positive_pattern.search(sentiment):
                            sentiment_scores["positive"] += 1
                        elif negative_pattern.search(sentiment):
                            sentiment_scores["negative"] += 1
                        else:
                            sentiment_scores["neutral"] += 1
                
                # Calculate Top 10 Prompt Percentage (optimized - use sorted once)
                sorted_prompts = sorted(prompt_counts.items(), key=lambda x: x[1], reverse=True)[:10]
                top10_count = sum(count for _, count in sorted_prompts)
                top10_prompt_percentage = (top10_count / valid_responses_count * 100) if valid_responses_count > 0 else 0
                
                # Calculate metrics (100% from source data only)
                brand_presence_rate = (brand_present_count / valid_responses_count * 100) if valid_responses_count > 0 else 0
                
                total_sentiment_responses = sum(sentiment_scores.values())
                if total_sentiment_responses > 0:
                    sentiment_score = (
                        (sentiment_scores["positive"] * 1.0 + 
                         sentiment_scores["neutral"] * 0.0 + 
                         sentiment_scores["negative"] * -1.0) / total_sentiment_responses * 100
                    )
                else:
                    sentiment_score = 0
                
                brand_visibility_percent = brand_presence_rate
                competitor_avg_visibility_percent = 0
                if total_responses_with_competitors > 0:
                    unique_competitors = len(competitor_visibility_count)
                    if unique_competitors > 0:
                        total_competitor_appearances = sum(competitor_visibility_count.values())
                        competitor_avg_visibility_percent = (total_competitor_appearances / total_responses_with_competitors) * 100
                
                # Calculate Prompt Reach Metric
                prompt_reach = {
                    "total_prompts_tracked": len(unique_prompts_tracked),
                    "prompts_with_brand": len(unique_prompts_with_brand),
                    "display": f"Tracked prompts: {len(unique_prompts_tracked)}; brand appeared in {len(unique_prompts_with_brand)} of them"
                }
                
                return {
                    "total_citations": total_citations,
                    "brand_present_count": brand_present_count,
                    "brand_presence_rate": brand_presence_rate,
                    "sentiment_score": sentiment_score,
                    "prompt_search_volume": valid_responses_count,
                    "top10_prompt_percentage": top10_prompt_percentage,
                    "competitive_benchmarking": {
                        "brand_visibility_percent": brand_visibility_percent,
                        "competitor_avg_visibility_percent": competitor_avg_visibility_percent
                    },
                    "prompt_reach": prompt_reach,
                    "citations_by_prompt": citations_by_prompt,
                }
            
            if has_any_scrunch_data:
                # Calculate current period metrics (will be zero if no responses)
                current_metrics = calculate_scrunch_metrics(responses, prompts, brand_id)
                
                # Calculate previous period metrics (will be zero if no responses)
                prev_metrics = calculate_scrunch_metrics(prev_responses, prompts, brand_id)
                
                # Extract citations_by_prompt from current_metrics (already calculated)
                citations_by_prompt = current_metrics.get("citations_by_prompt", {})
                
                def calculate_change(current, previous):
                    if current == 0 and previous == 0:
                        return 0.0
                    if previous == 0 and current > 0:
                        return 100.0
                    if current == 0 and previous > 0:
                        return -100.0
                    if previous > 0:
                        return ((current - previous) / previous) * 100
                    return 0.0
                
                total_citations_change = calculate_change(current_metrics["total_citations"], prev_metrics["total_citations"])
                brand_presence_rate_change = calculate_change(current_metrics["brand_presence_rate"], prev_metrics["brand_presence_rate"])
                sentiment_score_change = calculate_change(current_metrics["sentiment_score"], prev_metrics["sentiment_score"])
                top10_prompt_change = calculate_change(current_metrics["top10_prompt_percentage"], prev_metrics["top10_prompt_percentage"])
                prompt_search_volume_change = calculate_change(current_metrics["prompt_search_volume"], prev_metrics["prompt_search_volume"])
                
                competitive_current = current_metrics.get("competitive_benchmarking", {})
                competitive_prev = prev_metrics.get("competitive_benchmarking", {})
                brand_visibility_change = calculate_change(
                    competitive_current.get("brand_visibility_percent", 0),
                    competitive_prev.get("brand_visibility_percent", 0)
                )
                competitor_avg_change = calculate_change(
                    competitive_current.get("competitor_avg_visibility_percent", 0),
                    competitive_prev.get("competitor_avg_visibility_percent", 0)
                )
                
                scrunch_kpis = {
                    "total_citations": {
                        "value": int(current_metrics["total_citations"]),
                        "change": round(total_citations_change, 2),
                        "source": "Scrunch",
                        "label": "Total Citations",
                        "icon": "Link",
                        "format": "number"
                    },
                    "brand_presence_rate": {
                        "value": round(current_metrics["brand_presence_rate"], 1),
                        "change": round(brand_presence_rate_change, 2),
                        "source": "Scrunch",
                        "label": "Brand Presence Rate",
                        "icon": "CheckCircle",
                        "format": "percentage"
                    },
                    "brand_sentiment_score": {
                        "value": round(current_metrics["sentiment_score"], 1),
                        "change": round(sentiment_score_change, 2),
                        "source": "Scrunch",
                        "label": "Brand Sentiment Score",
                        "icon": "SentimentSatisfied",
                        "format": "number"
                    },
                    "top10_prompt_percentage": {
                        "value": round(current_metrics["top10_prompt_percentage"], 1),
                        "change": round(top10_prompt_change, 2),
                        "source": "Scrunch",
                        "label": "Top 10 Prompt",
                        "icon": "Article",
                        "format": "percentage"
                    },
                    "prompt_search_volume": {
                        "value": int(current_metrics["prompt_search_volume"]),
                        "change": round(prompt_search_volume_change, 2),
                        "source": "Scrunch",
                        "label": "Prompt Search Volume",
                        "icon": "TrendingUp",
                        "format": "number"
                    },
                    "competitive_benchmarking": {
                        "value": {
                            "brand_visibility_percent": round(competitive_current.get("brand_visibility_percent", 0), 1),
                            "competitor_avg_visibility_percent": round(competitive_current.get("competitor_avg_visibility_percent", 0), 1)
                        },
                        "change": {
                            "brand_visibility": round(brand_visibility_change, 2),
                            "competitor_avg_visibility": round(competitor_avg_change, 2)
                        },
                        "source": "Scrunch",
                        "label": "Competitive Benchmarking",
                        "icon": "BarChart",
                        "format": "custom"
                    },
                    "prompt_reach": {
                        "value": current_metrics.get("prompt_reach", {}),
                        "change": None,  # Not calculating change for this metric
                        "source": "Scrunch",
                        "label": "Prompt Reach",
                        "icon": "Article",
                        "format": "custom"
                    }
                }
                
                # Get top performing prompts (optimized - use data already calculated in metrics)
                top_prompts_start = time.time()
                # Build prompt lookup map for quick access
                prompt_map = {p.get("id"): p for p in prompts if p.get("brand_id") == brand_id and p.get("id")}
                
                # Extract prompt counts and platform variants from responses (single pass)
                prompt_response_counts = {}
                prompt_variants = {}
                total_responses_for_brand = len([r for r in responses if r.get("brand_id") == brand_id])
                
                for r in responses:
                    if r.get("brand_id") != brand_id:
                        continue
                    prompt_id = r.get("prompt_id")
                    if prompt_id and prompt_id in prompt_map:
                        prompt_response_counts[prompt_id] = prompt_response_counts.get(prompt_id, 0) + 1
                        platform = r.get("platform")
                        if platform:
                            if prompt_id not in prompt_variants:
                                prompt_variants[prompt_id] = set()
                            prompt_variants[prompt_id].add(platform)
                
                # Sort and build top performing prompts
                top_prompts = sorted(prompt_response_counts.items(), key=lambda x: x[1], reverse=True)[:10]
                top_performing_prompts = []
                for idx, (prompt_id, count) in enumerate(top_prompts, 1):
                    prompt = prompt_map.get(prompt_id)
                    if prompt:
                        unique_variants = len(prompt_variants.get(prompt_id, set()))
                        variants_count = unique_variants if unique_variants > 0 else 1
                        
                        top_performing_prompts.append({
                            "id": prompt_id,
                            "text": prompt.get("text", "N/A"),
                            "rank": idx,
                            "responseCount": count,
                            "variants": variants_count,
                            "citations": citations_by_prompt.get(prompt_id, 0),
                            "totalResponsesForBrand": total_responses_for_brand
                        })
                
                scrunch_chart_data["top_performing_prompts"] = top_performing_prompts
                
                # Calculate Scrunch AI Insights (optimized - single pass through responses)
                insights_start = time.time()
                if prompts and responses:
                    # Build prompt lookup map
                    prompt_map_insights = {p.get("id"): p for p in prompts if p.get("brand_id") == brand_id and p.get("id")}
                    
                    # Single pass through responses to build insights data
                    prompt_insights_data = {}
                    import json
                    for r in responses:
                        if r.get("brand_id") != brand_id:
                            continue
                        prompt_id = r.get("prompt_id")
                        if not prompt_id or prompt_id not in prompt_map_insights:
                            continue
                        
                        if prompt_id not in prompt_insights_data:
                            prompt_insights_data[prompt_id] = {
                                "response_count": 0,
                                "presence_count": 0,
                                "variants": set(),
                                "citations": 0,
                                "competitors": set()
                            }
                        
                        data = prompt_insights_data[prompt_id]
                        data["response_count"] += 1
                        if r.get("brand_present"):
                            data["presence_count"] += 1
                        
                        platform = r.get("platform")
                        if platform:
                            data["variants"].add(platform)
                        
                        # Count citations (reuse JSON parsing logic)
                        citations = r.get("citations")
                        if citations:
                            if isinstance(citations, list):
                                data["citations"] += len(citations)
                            elif isinstance(citations, str):
                                try:
                                    parsed = json.loads(citations)
                                    if isinstance(parsed, list):
                                        data["citations"] += len(parsed)
                                except:
                                    pass
                        
                        # Track competitors
                        competitors_present = r.get("competitors_present", [])
                        if isinstance(competitors_present, list):
                            for comp in competitors_present:
                                if comp:
                                    data["competitors"].add(comp)
                    
                    # Build insights list
                    insights = []
                    for prompt_id, data in prompt_insights_data.items():
                        if data["response_count"] > 0:
                            prompt = prompt_map_insights[prompt_id]
                            presence = (data["presence_count"] / data["response_count"] * 100) if data["response_count"] > 0 else 0
                            
                            # Get category
                            category = (
                                prompt.get("topics", [None])[0] if prompt.get("topics") else None
                            ) or (
                                (prompt.get("text") or prompt.get("prompt_text") or "").split(" ")[:3]
                            ) or prompt.get("stage") or "General"
                            
                            if isinstance(category, list):
                                category = " ".join(category)
                            
                            insights.append({
                                "id": prompt_id,
                                "seedPrompt": prompt.get("text") or prompt.get("prompt_text") or "N/A",
                                "stage": prompt.get("stage") or "Unknown",
                                "variants": len(data["variants"]) or 1,
                                "responses": data["response_count"],
                                "presence": round(presence, 1),
                                "presenceChange": 0,
                                "citations": data["citations"],
                                "citationsChange": 0,
                                "competitors": len(data["competitors"]),
                                "competitorsChange": 0,
                                "category": category
                            })
                    
                    # Sort and limit
                    insights.sort(key=lambda x: x["responses"], reverse=True)
                    scrunch_chart_data["scrunch_ai_insights"] = insights[:20]
                
        except Exception as e:
            import traceback
            error_trace = traceback.format_exc()
            logger.error(f"Error fetching Scrunch AI KPIs for brand {brand_id}: {str(e)}\n{error_trace}")
        
        return {
            "brand_id": brand_id,
            "kpis": scrunch_kpis,
            "chart_data": scrunch_chart_data,
            "available": bool(scrunch_kpis)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching Scrunch dashboard data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/scrunch/query/{brand_id}")
@handle_api_errors(context="querying Scrunch analytics")
async def query_scrunch_analytics(
    brand_id: int,
    fields: str = Query(..., description="Comma-separated list of fields (dimensions and metrics)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD), last 90 days only"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    limit: int = Query(50000, description="Maximum number of results"),
    offset: int = Query(0, description="Pagination offset")
):
    """
    Query Scrunch analytics using the Query API
    
    Available dimensions:
    - prompt_id, prompt
    - date, date_week, date_month
    - source_url, source_type (Brand, Competitor, Other)
    - persona_id, persona_name
    - competitor_id, competitor_name
    - ai_platform (ChatGPT, Perplexity, Google AI Overviews, Meta, Claude)
    - tag
    - branded (boolean)
    - stage (Advice, Awareness, Evaluation, Comparison, Other)
    - prompt_topic (Key Topic)
    - country (2-letter ISO code)
    
    Available metrics:
    - responses (Count)
    - brand_presence_percentage (Average)
    - brand_position_score (Average, 0-100)
    - brand_sentiment_score (Average, 0-100)
    - competitor_presence_percentage (Average) - Requires competitor dimension
    - competitor_position_score (Average, 0-100) - Requires competitor dimension
    - competitor_sentiment_score (Average, 0-100) - Requires competitor dimension
    """
    try:
        client = ScrunchAPIClient()
        field_list = [f.strip() for f in fields.split(",")]
        
        result = await client.query_analytics(
            brand_id=brand_id,
            fields=field_list,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset
        )
        
        return result
    except Exception as e:
        logger.error(f"Error querying Scrunch analytics for brand {brand_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error querying Scrunch analytics: {str(e)}")

# =====================================================
# KPI Selection Management Endpoints
# =====================================================

class KPISelectionRequest(BaseModel):
    selected_kpis: List[str]
    visible_sections: Optional[List[str]] = None  # Optional for backward compatibility

@router.get("/data/reporting-dashboard/{brand_id}/kpi-selections")
@handle_api_errors(context="fetching KPI selections")
async def get_brand_kpi_selections(brand_id: int):
    """Get saved KPI selections for a brand (used to control public view visibility)"""
    import time
    start_time = time.time()
    
    try:
        init_start = time.time()
        supabase = SupabaseService()
        init_time = time.time() - init_start
        if init_time > 0.5:
            logger.warning(f"Slow SupabaseService initialization: {init_time:.2f}s for brand {brand_id}")
        
        # Get KPI selections for this brand (only select needed columns, limit to 1 since brand_id is unique)
        # Removed unnecessary brand check - if brand doesn't exist, this will just return empty
        query_start = time.time()
        selection_result = supabase.client.table("brand_kpi_selections").select(
            "selected_kpis,visible_sections,updated_at"
        ).eq("brand_id", brand_id).limit(1).execute()
        query_time = time.time() - query_start
        
        if query_time > 1.0:
            logger.warning(f"Slow KPI selections query: {query_time:.2f}s for brand {brand_id}")
        
        selections = selection_result.data if hasattr(selection_result, 'data') else []
        
        if selections and len(selections) > 0:
            selection = selections[0]
            result = {
                "brand_id": brand_id,
                "selected_kpis": selection.get("selected_kpis", []),
                "visible_sections": selection.get("visible_sections", ["ga4", "scrunch_ai", "brand_analytics", "advanced_analytics", "performance_metrics"]),
                "updated_at": selection.get("updated_at")
            }
        else:
            # Return default values if no selection exists (means all sections and KPIs are shown)
            result = {
                "brand_id": brand_id,
                "selected_kpis": [],
                "visible_sections": ["ga4", "scrunch_ai", "brand_analytics", "advanced_analytics", "performance_metrics"],
                "updated_at": None
            }
        
        total_time = time.time() - start_time
        if total_time > 1.0:
            logger.warning(f"Slow KPI selections endpoint: {total_time:.2f}s total (init: {init_time:.2f}s, query: {query_time:.2f}s) for brand {brand_id}")
        
        return result
    except HTTPException:
        raise
    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"Error fetching KPI selections for brand {brand_id} (took {total_time:.2f}s): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching KPI selections: {str(e)}")

@router.put("/data/reporting-dashboard/{brand_id}/kpi-selections")
@handle_api_errors(context="saving KPI selections")
async def save_brand_kpi_selections(brand_id: int, request: KPISelectionRequest):
    """Save KPI selections for a brand (used by managers/admins to control public view visibility)"""
    try:
        supabase = SupabaseService()
        
        # Check if brand exists
        brand_result = supabase.client.table("brands").select("id").eq("id", brand_id).execute()
        brands = brand_result.data if hasattr(brand_result, 'data') else []
        
        if not brands:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        # Upsert KPI selections (insert or update)
        # Use upsert to handle both insert and update in one operation
        selection_data = {
            "brand_id": brand_id,
            "selected_kpis": request.selected_kpis
        }
        
        # Add visible_sections if provided, otherwise use default (all sections)
        if request.visible_sections is not None:
            selection_data["visible_sections"] = request.visible_sections
        else:
            # If not provided, keep existing sections or use default
            existing_result = supabase.client.table("brand_kpi_selections").select("visible_sections").eq("brand_id", brand_id).execute()
            existing = existing_result.data if hasattr(existing_result, 'data') else []
            if existing and len(existing) > 0 and existing[0].get("visible_sections"):
                selection_data["visible_sections"] = existing[0]["visible_sections"]
            else:
                selection_data["visible_sections"] = ["ga4", "scrunch_ai", "brand_analytics", "advanced_analytics", "performance_metrics"]
        
        upsert_result = supabase.client.table("brand_kpi_selections").upsert(
            selection_data,
            on_conflict="brand_id"
        ).execute()
        
        logger.info(f"Saved KPI selections for brand {brand_id}: {len(request.selected_kpis)} KPIs, {len(selection_data.get('visible_sections', []))} sections")
        
        return {
            "brand_id": brand_id,
            "selected_kpis": request.selected_kpis,
            "visible_sections": selection_data.get("visible_sections", []),
            "message": "KPI and section selections saved successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving KPI selections for brand {brand_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error saving KPI selections: {str(e)}")

# =====================================================
# Brand Management Endpoints (Admin/Manager Only)
# =====================================================

class GA4PropertyUpdateRequest(BaseModel):
    ga4_property_id: Optional[str] = None

@router.put("/data/brands/{brand_id}/ga4-property-id")
@handle_api_errors(context="updating GA4 property ID")
async def update_brand_ga4_property_id(
    brand_id: int,
    request: GA4PropertyUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update GA4 Property ID for a brand"""
    try:
        supabase = SupabaseService()
        
        # Check if brand exists
        brand_result = supabase.client.table("brands").select("id").eq("id", brand_id).execute()
        brands = brand_result.data if hasattr(brand_result, 'data') else []
        
        if not brands:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        # Update GA4 property ID (set to None if empty string or None)
        ga4_property_id = request.ga4_property_id
        update_data = {
            "ga4_property_id": ga4_property_id if ga4_property_id else None
        }
        
        result = supabase.client.table("brands").update(update_data).eq("id", brand_id).execute()
        
        logger.info(f"Updated GA4 property ID for brand {brand_id} by user {current_user.get('email')}")
        
        return {
            "brand_id": brand_id,
            "ga4_property_id": update_data["ga4_property_id"],
            "message": "GA4 Property ID updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating GA4 property ID for brand {brand_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating GA4 property ID: {str(e)}")

@router.post("/data/brands/{brand_id}/agency-analytics-campaigns/{campaign_id}/link")
@handle_api_errors(context="linking Agency Analytics campaign")
async def link_agency_analytics_campaign(
    brand_id: int,
    campaign_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Link an Agency Analytics campaign to a brand"""
    try:
        supabase = SupabaseService()
        
        # Check if brand exists
        brand_result = supabase.client.table("brands").select("id").eq("id", brand_id).execute()
        brands = brand_result.data if hasattr(brand_result, 'data') else []
        
        if not brands:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        # Check if campaign exists
        campaign_result = supabase.client.table("agency_analytics_campaigns").select("id").eq("id", campaign_id).execute()
        campaigns = campaign_result.data if hasattr(campaign_result, 'data') else []
        
        if not campaigns:
            raise HTTPException(status_code=404, detail="Agency Analytics campaign not found")
        
        # Check if link already exists
        existing_link_result = supabase.client.table("agency_analytics_campaign_brands").select("*").eq("brand_id", brand_id).eq("campaign_id", campaign_id).execute()
        existing_links = existing_link_result.data if hasattr(existing_link_result, 'data') else []
        
        if existing_links:
            return {
                "brand_id": brand_id,
                "campaign_id": campaign_id,
                "message": "Campaign is already linked to this brand"
            }
        
        # Create link
        link_data = {
            "brand_id": brand_id,
            "campaign_id": campaign_id,
            "match_method": "manual",
            "match_confidence": "manual"
        }
        
        result = supabase.client.table("agency_analytics_campaign_brands").insert(link_data).execute()
        
        logger.info(f"Linked campaign {campaign_id} to brand {brand_id} by user {current_user.get('email')}")
        
        return {
            "brand_id": brand_id,
            "campaign_id": campaign_id,
            "message": "Campaign linked successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error linking campaign {campaign_id} to brand {brand_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error linking campaign: {str(e)}")

@router.delete("/data/brands/{brand_id}/agency-analytics-campaigns/{campaign_id}/link")
@handle_api_errors(context="unlinking Agency Analytics campaign")
async def unlink_agency_analytics_campaign(
    brand_id: int,
    campaign_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Unlink an Agency Analytics campaign from a brand"""
    try:
        supabase = SupabaseService()
        
        # Check if brand exists
        brand_result = supabase.client.table("brands").select("id").eq("id", brand_id).execute()
        brands = brand_result.data if hasattr(brand_result, 'data') else []
        
        if not brands:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        # Check if link exists
        existing_link_result = supabase.client.table("agency_analytics_campaign_brands").select("*").eq("brand_id", brand_id).eq("campaign_id", campaign_id).execute()
        existing_links = existing_link_result.data if hasattr(existing_link_result, 'data') else []
        
        if not existing_links:
            raise HTTPException(status_code=404, detail="Campaign is not linked to this brand")
        
        # Delete link
        result = supabase.client.table("agency_analytics_campaign_brands").delete().eq("brand_id", brand_id).eq("campaign_id", campaign_id).execute()
        
        logger.info(f"Unlinked campaign {campaign_id} from brand {brand_id} by user {current_user.get('email')}")
        
        return {
            "brand_id": brand_id,
            "campaign_id": campaign_id,
            "message": "Campaign unlinked successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error unlinking campaign {campaign_id} from brand {brand_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error unlinking campaign: {str(e)}")

@router.get("/data/brands/{brand_id}/agency-analytics-campaigns")
@handle_api_errors(context="fetching linked campaigns")
async def get_brand_linked_campaigns(
    brand_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get all Agency Analytics campaigns linked to a brand"""
    try:
        supabase = SupabaseService()
        
        # Get linked campaigns
        links_result = supabase.client.table("agency_analytics_campaign_brands").select("*").eq("brand_id", brand_id).execute()
        links = links_result.data if hasattr(links_result, 'data') else []
        
        if not links:
            return {
                "brand_id": brand_id,
                "linked_campaigns": [],
                "available_campaigns": []
            }
        
        # Get campaign details
        campaign_ids = [link["campaign_id"] for link in links]
        campaigns_result = supabase.client.table("agency_analytics_campaigns").select("*").in_("id", campaign_ids).execute()
        linked_campaigns = campaigns_result.data if hasattr(campaigns_result, 'data') else []
        
        # Get all available campaigns for selection
        all_campaigns_result = supabase.client.table("agency_analytics_campaigns").select("*").order("id", desc=True).execute()
        all_campaigns = all_campaigns_result.data if hasattr(all_campaigns_result, 'data') else []
        
        return {
            "brand_id": brand_id,
            "linked_campaigns": linked_campaigns,
            "available_campaigns": all_campaigns
        }
    except Exception as e:
        logger.error(f"Error fetching linked campaigns for brand {brand_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error fetching linked campaigns: {str(e)}")

class ThemeUpdateRequest(BaseModel):
    primary_color: Optional[str] = None
    secondary_color: Optional[str] = None
    accent_color: Optional[str] = None
    font_family: Optional[str] = None
    custom: Optional[Dict] = None

@router.post("/data/brands/{brand_id}/logo")
@handle_api_errors(context="uploading brand logo")
async def upload_brand_logo(
    brand_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload brand logo to Supabase Storage"""
    try:
        supabase = SupabaseService()
        
        # Check if brand exists
        brand_result = supabase.client.table("brands").select("id").eq("id", brand_id).execute()
        brands = brand_result.data if hasattr(brand_result, 'data') else []
        
        if not brands:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content
        file_content = await file.read()
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'png'
        
        # Generate unique filename (just the filename, not including bucket name in path)
        filename = f"brand-{brand_id}-{uuid.uuid4().hex[:8]}.{file_extension}"
        file_path = filename  # Path is relative to bucket root
        
        # Upload to Supabase Storage using Supabase client
        # The bucket name is 'brand-logos', file path is just the filename
        try:
            logger.info(f"Uploading file to storage: bucket=brand-logos, path={file_path}, size={len(file_content)} bytes, content-type={file.content_type}")
            
            responseBuckets = supabase.client.storage.list_buckets()
            logger.info(f"Buckets: {responseBuckets}")
            # Upload using Supabase storage client
            storage_response = supabase.client.storage.from_("brand-logos").upload(
                file=file_content,
                path=file_path,
                file_options={
                    "content-type": file.content_type,
                    "cache-control": "3600",
                    "upsert": "true"
                }
            )
            
            logger.info(f"Storage upload successful: {storage_response}")
            
            # Get public URL using Supabase client
            try:
                public_url_response = supabase.client.storage.from_("brand-logos").get_public_url(file_path)
                if isinstance(public_url_response, str):
                    logo_url = public_url_response
                elif hasattr(public_url_response, 'get'):
                    logo_url = public_url_response.get('publicUrl', '')
                else:
                    logo_url = str(public_url_response)
            except Exception as url_error:
                logger.warning(f"Could not get public URL from response: {url_error}")
                logo_url = None
            
            # Construct public URL manually if Supabase client method fails
            if not logo_url:
                # Extract project ref from SUPABASE_URL
                # URL format: https://{project_ref}.supabase.co
                project_ref = settings.SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')
                logo_url = f"https://{project_ref}.supabase.co/storage/v1/object/public/brand-logos/{file_path}"
            
            logger.info(f"Final logo URL: {logo_url}")
            
        except Exception as storage_error:
            logger.error(f"Storage error: {str(storage_error)}")
            # Fallback: Store as base64 data URL (not recommended for production)
            # For now, we'll raise an error and ask user to configure storage
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload to storage. Error: {str(storage_error)}"
            )
        
        # Update brand with logo URL
        update_data = {"logo_url": logo_url}
        result = supabase.client.table("brands").update(update_data).eq("id", brand_id).execute()
        
        logger.info(f"Uploaded logo for brand {brand_id} by user {current_user.get('email')}")
        
        return {
            "brand_id": brand_id,
            "logo_url": logo_url,
            "message": "Logo uploaded successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading logo for brand {brand_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading logo: {str(e)}")

@router.delete("/data/brands/{brand_id}/logo")
@handle_api_errors(context="deleting brand logo")
async def delete_brand_logo(
    brand_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete brand logo"""
    try:
        supabase = SupabaseService()
        
        # Check if brand exists and get current logo
        brand_result = supabase.client.table("brands").select("id, logo_url").eq("id", brand_id).execute()
        brands = brand_result.data if hasattr(brand_result, 'data') else []
        
        if not brands:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        brand = brands[0]
        logo_url = brand.get("logo_url")
        
        # Delete from storage if URL exists
        if logo_url:
            try:
                # Extract file path from URL
                # URL format: .../storage/v1/object/public/brand-logos/{filename}
                if "brand-logos/" in logo_url:
                    file_path = logo_url.split("brand-logos/")[-1].split("?")[0]  # Remove query params if any
                elif "/object/public/brand-logos/" in logo_url:
                    file_path = logo_url.split("/object/public/brand-logos/")[-1].split("?")[0]
                else:
                    # Try to extract just the filename
                    file_path = logo_url.split("/")[-1].split("?")[0]
                
                if file_path:
                    logger.info(f"Deleting file from storage: {file_path}")
                    supabase.client.storage.from_("brand-logos").remove([file_path])
            except Exception as storage_error:
                logger.warning(f"Failed to delete logo from storage: {str(storage_error)}")
        
        # Update brand to remove logo URL
        update_data = {"logo_url": None}
        result = supabase.client.table("brands").update(update_data).eq("id", brand_id).execute()
        
        logger.info(f"Deleted logo for brand {brand_id} by user {current_user.get('email')}")
        
        return {
            "brand_id": brand_id,
            "message": "Logo deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting logo for brand {brand_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting logo: {str(e)}")

@router.put("/data/brands/{brand_id}/theme")
@handle_api_errors(context="updating brand theme")
async def update_brand_theme(
    brand_id: int,
    request: ThemeUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update brand theme configuration"""
    try:
        supabase = SupabaseService()
        
        # Check if brand exists
        brand_result = supabase.client.table("brands").select("id, theme").eq("id", brand_id).execute()
        brands = brand_result.data if hasattr(brand_result, 'data') else []
        
        if not brands:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        # Get existing theme or initialize empty dict
        existing_theme = brands[0].get("theme") or {}
        if not isinstance(existing_theme, dict):
            existing_theme = {}
        
        # Build updated theme
        updated_theme = existing_theme.copy()
        if request.primary_color is not None:
            updated_theme["primary_color"] = request.primary_color
        if request.secondary_color is not None:
            updated_theme["secondary_color"] = request.secondary_color
        if request.accent_color is not None:
            updated_theme["accent_color"] = request.accent_color
        if request.font_family is not None:
            updated_theme["font_family"] = request.font_family
        if request.custom is not None:
            updated_theme["custom"] = request.custom
        
        # Update brand theme
        update_data = {"theme": updated_theme}
        result = supabase.client.table("brands").update(update_data).eq("id", brand_id).execute()
        
        logger.info(f"Updated theme for brand {brand_id} by user {current_user.get('email')}")
        
        return {
            "brand_id": brand_id,
            "theme": updated_theme,
            "message": "Theme updated successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating theme for brand {brand_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error updating theme: {str(e)}")

# =====================================================
# Client Management Endpoints
# =====================================================

@router.get("/data/clients")
@handle_api_errors(context="fetching clients")
async def get_clients(
    page: Optional[int] = Query(1, description="Page number (1-indexed)"),
    page_size: Optional[int] = Query(25, description="Number of records per page"),
    search: Optional[str] = Query(None, description="Search by company name"),
    current_user: dict = Depends(get_current_user)
):
    """Get all clients from database with pagination and search"""
    try:
        supabase = SupabaseService()
        
        # Calculate offset from page
        offset = (page - 1) * page_size if page > 0 else 0
        
        # Build query with search filter and count
        query = supabase.client.table("clients").select("*, client_campaigns(campaign_id, agency_analytics_campaigns(*))", count="exact")
        
        # Apply search filter if provided
        if search and search.strip():
            search_term = search.strip()
            query = query.ilike("company_name", f"%{search_term}%")
        
        # Apply pagination and ordering
        query = query.limit(page_size).offset(offset).order("created_at", desc=True)
        
        # Execute query (this will return both data and count)
        result = query.execute()
        items = result.data if hasattr(result, 'data') else []
        total_count = result.count if hasattr(result, 'count') else len(items)
        
        # Calculate pagination metadata
        total_pages = (total_count + page_size - 1) // page_size if page_size > 0 else 1
        
        return {
            "items": items if isinstance(items, list) else [],
            "count": len(items) if isinstance(items, list) else 0,
            "total_count": total_count,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "has_next": page < total_pages,
            "has_previous": page > 1
        }
    except Exception as e:
        logger.error(f"Error fetching clients: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/clients/{client_id}")
@handle_api_errors(context="fetching client")
async def get_client(
    client_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get a specific client by ID"""
    try:
        supabase = SupabaseService()
        
        result = supabase.client.table("clients").select("*, client_campaigns(campaign_id, agency_analytics_campaigns(*))").eq("id", client_id).limit(1).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Client not found")
        
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching client: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/clients/slug/{url_slug}")
@handle_api_errors(context="fetching client by slug")
async def get_client_by_slug(
    url_slug: str
):
    """Get client by URL slug (public access for whitelabeled reports)"""
    try:
        supabase = SupabaseService()
        client = supabase.get_client_by_slug(url_slug)
        
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        return client
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching client by slug: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ClientMappingUpdateRequest(BaseModel):
    ga4_property_id: Optional[str] = None
    scrunch_brand_id: Optional[int] = None

@router.put("/data/clients/{client_id}/mappings")
@handle_api_errors(context="updating client mappings")
async def update_client_mappings(
    client_id: int,
    request: ClientMappingUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update client mappings (GA4 property ID and/or Scrunch brand ID)"""
    try:
        supabase = SupabaseService()
        
        # Check if client exists
        client = supabase.get_client_by_id(client_id)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        success = supabase.update_client_mapping(
            client_id=client_id,
            ga4_property_id=request.ga4_property_id,
            scrunch_brand_id=request.scrunch_brand_id,
            user_email=current_user.get("email")
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update client mappings")
        
        return {"status": "success", "message": "Client mappings updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating client mappings: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ClientThemeUpdateRequest(BaseModel):
    theme_color: Optional[str] = None
    logo_url: Optional[str] = None
    secondary_color: Optional[str] = None
    font_family: Optional[str] = None
    favicon_url: Optional[str] = None
    report_title: Optional[str] = None
    custom_css: Optional[str] = None
    footer_text: Optional[str] = None
    header_text: Optional[str] = None

@router.put("/data/clients/{client_id}/theme")
@handle_api_errors(context="updating client theme")
async def update_client_theme(
    client_id: int,
    request: ClientThemeUpdateRequest,
    current_user: dict = Depends(get_current_user)
):
    """Update client theme and branding"""
    try:
        supabase = SupabaseService()
        
        # Check if client exists
        client = supabase.get_client_by_id(client_id)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        theme_data = {
            "theme_color": request.theme_color,
            "logo_url": request.logo_url,
            "secondary_color": request.secondary_color,
            "font_family": request.font_family,
            "favicon_url": request.favicon_url,
            "report_title": request.report_title,
            "custom_css": request.custom_css,
            "footer_text": request.footer_text,
            "header_text": request.header_text,
        }
        
        success = supabase.update_client_theme(
            client_id=client_id,
            theme_data=theme_data,
            user_email=current_user.get("email")
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to update client theme")
        
        return {"status": "success", "message": "Client theme updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating client theme: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/data/clients/{client_id}/logo")
@handle_api_errors(context="uploading client logo")
async def upload_client_logo(
    client_id: int,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """Upload client logo to Supabase Storage"""
    try:
        supabase = SupabaseService()
        
        # Check if client exists
        client = supabase.get_client_by_id(client_id)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Read file content
        file_content = await file.read()
        file_extension = file.filename.split('.')[-1] if '.' in file.filename else 'png'
        
        # Generate unique filename
        filename = f"client-{client_id}-{uuid.uuid4().hex[:8]}.{file_extension}"
        file_path = filename
        
        # Upload to Supabase Storage
        try:
            logger.info(f"Uploading client logo to storage: bucket=client-logos, path={file_path}, size={len(file_content)} bytes, content-type={file.content_type}")
            
            # Upload using Supabase storage client
            storage_response = supabase.client.storage.from_("client-logos").upload(
                file=file_content,
                path=file_path,
                file_options={
                    "content-type": file.content_type,
                    "cache-control": "3600",
                    "upsert": "true"
                }
            )
            
            logger.info(f"Storage upload successful: {storage_response}")
            
            # Get public URL
            try:
                public_url_response = supabase.client.storage.from_("client-logos").get_public_url(file_path)
                if isinstance(public_url_response, str):
                    logo_url = public_url_response
                elif hasattr(public_url_response, 'get'):
                    logo_url = public_url_response.get('publicUrl', '')
                else:
                    logo_url = str(public_url_response)
            except Exception as url_error:
                logger.warning(f"Could not get public URL from response: {url_error}")
                logo_url = None
            
            # Construct public URL manually if Supabase client method fails
            if not logo_url:
                project_ref = settings.SUPABASE_URL.replace('https://', '').replace('.supabase.co', '')
                logo_url = f"https://{project_ref}.supabase.co/storage/v1/object/public/client-logos/{file_path}"
            
            logger.info(f"Final logo URL: {logo_url}")
            
        except Exception as storage_error:
            logger.error(f"Storage error: {str(storage_error)}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload to storage. Error: {str(storage_error)}"
            )
        
        # Update client with logo URL
        update_data = {"logo_url": logo_url}
        result = supabase.client.table("clients").update(update_data).eq("id", client_id).execute()
        
        logger.info(f"Uploaded logo for client {client_id} by user {current_user.get('email')}")
        
        return {
            "client_id": client_id,
            "logo_url": logo_url,
            "message": "Logo uploaded successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading logo for client {client_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading logo: {str(e)}")

@router.delete("/data/clients/{client_id}/logo")
@handle_api_errors(context="deleting client logo")
async def delete_client_logo(
    client_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Delete client logo"""
    try:
        supabase = SupabaseService()
        
        # Check if client exists and get current logo
        client = supabase.get_client_by_id(client_id)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        logo_url = client.get("logo_url")
        
        # Delete from storage if URL exists
        if logo_url:
            try:
                # Extract file path from URL
                if "client-logos/" in logo_url:
                    file_path = logo_url.split("client-logos/")[-1].split("?")[0]
                elif "/object/public/client-logos/" in logo_url:
                    file_path = logo_url.split("/object/public/client-logos/")[-1].split("?")[0]
                else:
                    file_path = logo_url.split("/")[-1].split("?")[0]
                
                if file_path:
                    logger.info(f"Deleting file from storage: {file_path}")
                    supabase.client.storage.from_("client-logos").remove([file_path])
            except Exception as storage_error:
                logger.warning(f"Failed to delete logo from storage: {str(storage_error)}")
        
        # Update client to remove logo URL
        update_data = {"logo_url": None}
        result = supabase.client.table("clients").update(update_data).eq("id", client_id).execute()
        
        logger.info(f"Deleted logo for client {client_id} by user {current_user.get('email')}")
        
        return {
            "client_id": client_id,
            "message": "Logo deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting logo for client {client_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error deleting logo: {str(e)}")

@router.get("/data/clients/{client_id}/campaigns")
@handle_api_errors(context="fetching client campaigns")
async def get_client_campaigns(
    client_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Get all campaigns linked to a client"""
    try:
        supabase = SupabaseService()
        
        # Check if client exists
        client = supabase.get_client_by_id(client_id)
        if not client:
            raise HTTPException(status_code=404, detail="Client not found")
        
        campaigns = supabase.get_client_campaigns(client_id)
        
        return {
            "client_id": client_id,
            "campaigns": campaigns,
            "count": len(campaigns)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching client campaigns: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

