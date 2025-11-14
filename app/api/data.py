from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging
from datetime import datetime, timedelta
from app.services.supabase_service import SupabaseService
from app.services.ga4_client import GA4APIClient
from app.services.agency_analytics_client import AgencyAnalyticsClient

logger = logging.getLogger(__name__)

router = APIRouter()
ga4_client = GA4APIClient()

@router.get("/data/brands")
async def get_brands(
    limit: Optional[int] = Query(50, description="Number of records to return"),
    offset: Optional[int] = Query(0, description="Offset for pagination")
):
    """Get brands from database"""
    try:
        supabase = SupabaseService()
        
        query = supabase.client.table("brands").select("*")
        
        if limit:
            query = query.limit(limit)
        if offset:
            query = query.offset(offset)
        
        result = query.execute()
        items = result.data if hasattr(result, 'data') else result
        
        return {
            "items": items if isinstance(items, list) else [],
            "count": len(items) if isinstance(items, list) else 0
        }
    except Exception as e:
        logger.error(f"Error fetching brands: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/prompts")
async def get_prompts(
    brand_id: Optional[int] = Query(None, description="Filter by brand ID"),
    stage: Optional[str] = Query(None, description="Filter by funnel stage"),
    persona_id: Optional[int] = Query(None, description="Filter by persona ID"),
    limit: Optional[int] = Query(50, description="Number of records to return"),
    offset: Optional[int] = Query(0, description="Offset for pagination")
):
    """Get prompts from database"""
    try:
        supabase = SupabaseService()
        
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
            "count": len(items) if isinstance(items, list) else 0
        }
    except Exception as e:
        logger.error(f"Error fetching prompts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/data/responses")
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
    try:
        supabase = SupabaseService()
        
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
            "count": len(items) if isinstance(items, list) else 0
        }
    except Exception as e:
        logger.error(f"Error fetching responses: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

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
        
        try:
            analytics["trafficOverview"] = await ga4_client.get_traffic_overview(property_id, start_date, end_date)
        except Exception as e:
            logger.warning(f"Error fetching traffic overview: {str(e)}")
            analytics["trafficOverview"] = None
        
        try:
            analytics["topPages"] = await ga4_client.get_top_pages(property_id, start_date, end_date, limit=10)
        except Exception as e:
            logger.warning(f"Error fetching top pages: {str(e)}")
            analytics["topPages"] = []
        
        try:
            analytics["trafficSources"] = await ga4_client.get_traffic_sources(property_id, start_date, end_date)
        except Exception as e:
            logger.warning(f"Error fetching traffic sources: {str(e)}")
            analytics["trafficSources"] = []
        
        try:
            analytics["geographic"] = await ga4_client.get_geographic_breakdown(property_id, start_date, end_date, limit=10)
        except Exception as e:
            logger.warning(f"Error fetching geographic data: {str(e)}")
            analytics["geographic"] = []
        
        try:
            analytics["devices"] = await ga4_client.get_device_breakdown(property_id, start_date, end_date)
        except Exception as e:
            logger.warning(f"Error fetching device data: {str(e)}")
            analytics["devices"] = []
        
        try:
            analytics["conversions"] = await ga4_client.get_conversions(property_id, start_date, end_date)
        except Exception as e:
            logger.warning(f"Error fetching conversions: {str(e)}")
            analytics["conversions"] = []
        
        try:
            analytics["realtime"] = await ga4_client.get_realtime_snapshot(property_id)
        except Exception as e:
            logger.warning(f"Error fetching realtime data: {str(e)}")
            analytics["realtime"] = None
        
        try:
            analytics["propertyDetails"] = await ga4_client.get_property_details(property_id)
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

