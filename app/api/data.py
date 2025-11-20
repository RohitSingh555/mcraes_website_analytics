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
            
            # Log date range being used
            logger.info(f"Fetching reporting dashboard for brand {brand_id} with date range: {start_date} to {end_date}")
        except ValueError as e:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid date format. Use YYYY-MM-DD format. Error: {str(e)}"
            )
        
        kpis = {}
        
        # ========== GA4 KPIs ==========
        ga4_kpis = {}
        ga4_errors = []
        if brand.get("ga4_property_id"):
            try:
                property_id = brand["ga4_property_id"]
                logger.info(f"Fetching GA4 data for property {property_id}")
                traffic_overview = await ga4_client.get_traffic_overview(property_id, start_date, end_date)
                
                # Get conversions data
                conversions_data = await ga4_client.get_conversions(property_id, start_date, end_date)
                total_conversions = sum(c.get("count", 0) for c in conversions_data) if conversions_data else 0
                
                # Get revenue from purchase events (if available)
                # Revenue is typically stored in purchase event value
                revenue = 0
                try:
                    from google.analytics.data_v1beta import BetaAnalyticsDataClient
                    from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Dimension, Metric
                    client = ga4_client._get_data_client()
                    revenue_request = RunReportRequest(
                        property=f"properties/{property_id}",
                        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                        metrics=[Metric(name="totalRevenue")],
                    )
                    revenue_response = client.run_report(revenue_request)
                    if revenue_response.rows:
                        revenue = float(revenue_response.rows[0].metric_values[0].value)
                except Exception as e:
                    logger.warning(f"Could not fetch revenue: {str(e)}")
                
                # Calculate previous period for change comparison
                prev_start = (datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=60)).strftime("%Y-%m-%d")
                prev_end = (datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
                
                prev_traffic_overview = await ga4_client.get_traffic_overview(property_id, prev_start, prev_end)
                prev_conversions_data = await ga4_client.get_conversions(property_id, prev_start, prev_end)
                prev_total_conversions = sum(c.get("count", 0) for c in prev_conversions_data) if prev_conversions_data else 0
                
                users_change = 0
                sessions_change = traffic_overview.get("sessionsChange", 0) if traffic_overview else 0
                conversions_change = 0
                revenue_change = 0
                
                if prev_traffic_overview:
                    prev_users = prev_traffic_overview.get("users", 0)
                    current_users = traffic_overview.get("users", 0) if traffic_overview else 0
                    if prev_users > 0:
                        users_change = ((current_users - prev_users) / prev_users) * 100
                    
                    if prev_total_conversions > 0:
                        conversions_change = ((total_conversions - prev_total_conversions) / prev_total_conversions) * 100
                
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
                    bounce_rate_change = ((bounce_rate - prev_bounce_rate) / prev_bounce_rate * 100) if prev_bounce_rate > 0 else 0
                    avg_session_duration_change = ((avg_session_duration - prev_avg_session_duration) / prev_avg_session_duration * 100) if prev_avg_session_duration > 0 else 0
                    engagement_rate_change = ((engagement_rate - prev_engagement_rate) / prev_engagement_rate * 100) if prev_engagement_rate > 0 else 0
                    new_users_change = ((new_users - prev_new_users) / prev_new_users * 100) if prev_new_users > 0 else 0
                    engaged_sessions_change = ((engaged_sessions - prev_engaged_sessions) / prev_engaged_sessions * 100) if prev_engaged_sessions > 0 else 0
                    
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
                            "change": sessions_change,
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
        
        # ========== Agency Analytics KPIs ==========
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
                
                # Get keyword ranking summaries for all campaigns
                total_impressions = 0
                total_clicks = 0
                total_rankings = 0
                ranking_sum = 0
                total_search_volume = 0
                total_ranking_change = 0
                ranking_change_count = 0
                
                # Calculate impressions and clicks based on search volume and ranking position
                # Impressions: estimated based on search volume and ranking (higher rank = more impressions)
                # Clicks: estimated based on CTR by position (position 1-3: ~30%, 4-10: ~10%, 11-20: ~5%, etc.)
                for campaign_id in campaign_ids:
                    # Query keyword ranking summaries filtered by date range
                    # Use the date column or end_date column to filter
                    summaries_query = supabase.client.table("agency_analytics_keyword_ranking_summaries").select("*").eq("campaign_id", campaign_id)
                    
                    # Filter by date range - check if date falls within range
                    # The summaries table has 'date' column which is the latest date
                    summaries_query = summaries_query.gte("date", start_date).lte("date", end_date)
                    
                    summaries_result = summaries_query.execute()
                    summaries = summaries_result.data if hasattr(summaries_result, 'data') else []
                    
                    logger.debug(f"Found {len(summaries)} keyword summaries for campaign {campaign_id} in date range {start_date} to {end_date}")
                    
                    for summary in summaries:
                        search_volume = summary.get("search_volume", 0) or 0
                        ranking = summary.get("google_ranking") or summary.get("google_mobile_ranking") or 999
                        
                        if ranking <= 100:  # Only count keywords ranking in top 100
                            # Estimate impressions: search volume * impression rate by position
                            if ranking <= 3:
                                impression_rate = 0.95  # 95% of searches see top 3
                            elif ranking <= 10:
                                impression_rate = 0.75  # 75% see top 10
                            elif ranking <= 20:
                                impression_rate = 0.50  # 50% see top 20
                            else:
                                impression_rate = 0.25  # 25% see beyond top 20
                            
                            estimated_impressions = search_volume * impression_rate
                            total_impressions += estimated_impressions
                            
                            # Estimate clicks based on CTR by position
                            if ranking <= 3:
                                ctr = 0.30  # ~30% CTR for top 3
                            elif ranking <= 10:
                                ctr = 0.10  # ~10% CTR for positions 4-10
                            elif ranking <= 20:
                                ctr = 0.05  # ~5% CTR for positions 11-20
                            else:
                                ctr = 0.01  # ~1% CTR for positions 21+
                            
                            estimated_clicks = estimated_impressions * ctr
                            total_clicks += estimated_clicks
                            
                            # Calculate average ranking
                            ranking_sum += ranking
                            total_rankings += 1
                            
                            # Track search volume
                            total_search_volume += search_volume
                            
                            # Track ranking change if available
                            ranking_change = summary.get("ranking_change")
                            if ranking_change is not None:
                                total_ranking_change += ranking_change
                                ranking_change_count += 1
                
                # Calculate CTR
                ctr_percentage = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0
                
                # Calculate average keyword rank
                avg_keyword_rank = (ranking_sum / total_rankings) if total_rankings > 0 else 0
                
                # Calculate average ranking change
                avg_ranking_change = (total_ranking_change / ranking_change_count) if ranking_change_count > 0 else 0
                
                # Get previous period data for change calculation
                prev_start = (datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=60)).strftime("%Y-%m-%d")
                prev_end = (datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
                
                prev_total_impressions = 0
                prev_total_clicks = 0
                prev_total_search_volume = 0
                prev_avg_rank = 0
                
                # Calculate previous period metrics (simplified - would need historical data)
                # For now, we'll use 0 change
                
                impressions_change = 0
                clicks_change = 0
                ctr_change = 0
                avg_rank_change = 0
                search_volume_change = 0
                
                agency_kpis = {
                        "impressions": {
                            "value": int(total_impressions),
                            "change": impressions_change,
                            "source": "AgencyAnalytics",
                            "label": "Impressions",
                            "icon": "Visibility",
                            "format": "number"
                        },
                        "clicks": {
                            "value": int(total_clicks),
                            "change": clicks_change,
                            "source": "AgencyAnalytics",
                            "label": "Clicks",
                            "icon": "TrendingUp",
                            "format": "number"
                        },
                        "ctr": {
                            "value": ctr_percentage,
                            "change": ctr_change,
                            "source": "AgencyAnalytics",
                            "label": "CTR",
                            "icon": "BarChart",
                            "format": "percentage"
                        },
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
                            "change": 0,  # This is already a change metric
                            "source": "AgencyAnalytics",
                            "label": "Avg Ranking Change",
                            "icon": "TrendingUp",
                            "format": "number"
                        }
                    }
        except Exception as e:
            error_msg = f"Error fetching Agency Analytics KPIs: {str(e)}"
            logger.error(error_msg)
            agency_errors.append(error_msg)
        
        if not campaign_links:
            logger.warning(f"Brand {brand_id} does not have any Agency Analytics campaigns linked")
        
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
        scrunch_kpis = {}
        try:
            # Calculate previous period for change comparison
            # Use the same duration as the current period for fair comparison
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
            responses_query = supabase.client.table("responses").select("*").eq("brand_id", brand_id)
            responses_query = responses_query.gte("created_at", f"{start_date}T00:00:00Z").lte("created_at", f"{end_date}T23:59:59Z")
            
            responses_result = responses_query.execute()
            responses = responses_result.data if hasattr(responses_result, 'data') else []
            
            logger.info(f"Found {len(responses)} Scrunch responses for brand {brand_id} in date range {start_date} to {end_date}")
            
            # Get responses for previous period (for change calculation)
            prev_responses_query = supabase.client.table("responses").select("*").eq("brand_id", brand_id)
            prev_responses_query = prev_responses_query.gte("created_at", f"{prev_start}T00:00:00Z").lte("created_at", f"{prev_end}T23:59:59Z")
            
            prev_responses_result = prev_responses_query.execute()
            prev_responses = prev_responses_result.data if hasattr(prev_responses_result, 'data') else []
            
            logger.info(f"Found {len(prev_responses)} Scrunch responses for brand {brand_id} in previous period {prev_start} to {prev_end}")
            
            # Get prompts for this brand to calculate top 10 prompt percentage
            prompts_query = supabase.client.table("prompts").select("*").eq("brand_id", brand_id)
            prompts_result = prompts_query.execute()
            prompts = prompts_result.data if hasattr(prompts_result, 'data') else []
            
            # Helper function to calculate metrics from responses
            def calculate_scrunch_metrics(responses_list):
                if not responses_list:
                    return {
                        "total_citations": 0,
                        "total_interactions": 0,
                        "influencer_reach": 0,
                        "engagement_rate": 0,
                        "brand_present_count": 0,
                        "brand_presence_rate": 0,
                        "visibility_on_ai_platform": 0,
                        "sentiment_score": 0,
                        "prompt_search_volume": 0,
                        "top10_prompt_percentage": 0,
                        "cost_per_engagement": 0,
                    }
                
                total_citations = 0
                total_interactions = 0
                brand_present_count = 0
                sentiment_scores = {"positive": 0, "neutral": 0, "negative": 0}
                
                # Calculate Top 10 Prompt Percentage
                prompt_counts = {}
                for r in responses_list:
                    prompt_id = r.get("prompt_id")
                    if prompt_id:
                        prompt_counts[prompt_id] = prompt_counts.get(prompt_id, 0) + 1
                
                sorted_prompts = sorted(prompt_counts.items(), key=lambda x: x[1], reverse=True)[:10]
                top10_count = sum(count for _, count in sorted_prompts)
                top10_prompt_percentage = (top10_count / len(responses_list) * 100) if responses_list else 0
                
                for r in responses_list:
                    # Count citations
                    citations = r.get("citations")
                    citation_count = 0
                    if citations:
                        if isinstance(citations, list):
                            citation_count = len(citations)
                        elif isinstance(citations, str):
                            try:
                                import json
                                parsed = json.loads(citations)
                                if isinstance(parsed, list):
                                    citation_count = len(parsed)
                            except:
                                pass
                    
                    total_citations += citation_count
                    
                    # Track brand presence
                    if r.get("brand_present"):
                        brand_present_count += 1
                    
                    # Track sentiment
                    sentiment = r.get("brand_sentiment")
                    if sentiment:
                        sentiment_lower = sentiment.lower()
                        if "positive" in sentiment_lower:
                            sentiment_scores["positive"] += 1
                        elif "negative" in sentiment_lower:
                            sentiment_scores["negative"] += 1
                        else:
                            sentiment_scores["neutral"] += 1
                    
                    # Estimate interactions
                    interactions_per_citation = 100
                    total_interactions += citation_count * interactions_per_citation
                
                # Calculate metrics
                avg_reach_per_citation = 10000
                influencer_reach = total_citations * avg_reach_per_citation
                engagement_rate = (total_interactions / influencer_reach * 100) if influencer_reach > 0 else 0
                brand_presence_rate = (brand_present_count / len(responses_list) * 100) if responses_list else 0
                visibility_on_ai_platform = brand_presence_rate
                
                total_sentiment_responses = sum(sentiment_scores.values())
                if total_sentiment_responses > 0:
                    sentiment_score = (
                        (sentiment_scores["positive"] * 1.0 + 
                         sentiment_scores["neutral"] * 0.0 + 
                         sentiment_scores["negative"] * -1.0) / total_sentiment_responses * 100
                    )
                else:
                    sentiment_score = 0
                
                estimated_cost_per_response = 0.50
                total_cost = len(responses_list) * estimated_cost_per_response
                cost_per_engagement = (total_cost / total_interactions) if total_interactions > 0 else 0
                
                return {
                    "total_citations": total_citations,
                    "total_interactions": total_interactions,
                    "influencer_reach": influencer_reach,
                    "engagement_rate": engagement_rate,
                    "brand_present_count": brand_present_count,
                    "brand_presence_rate": brand_presence_rate,
                    "visibility_on_ai_platform": visibility_on_ai_platform,
                    "sentiment_score": sentiment_score,
                    "prompt_search_volume": len(responses_list),
                    "top10_prompt_percentage": top10_prompt_percentage,
                    "cost_per_engagement": cost_per_engagement,
                }
            
            if responses:
                # Calculate current period metrics
                current_metrics = calculate_scrunch_metrics(responses)
                
                # Calculate previous period metrics
                prev_metrics = calculate_scrunch_metrics(prev_responses)
                
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
                
                influencer_reach_change = calculate_change(current_metrics["influencer_reach"], prev_metrics["influencer_reach"], "influencer_reach")
                total_citations_change = calculate_change(current_metrics["total_citations"], prev_metrics["total_citations"], "total_citations")
                brand_presence_rate_change = calculate_change(current_metrics["brand_presence_rate"], prev_metrics["brand_presence_rate"], "brand_presence_rate")
                visibility_change = calculate_change(current_metrics["visibility_on_ai_platform"], prev_metrics["visibility_on_ai_platform"], "visibility_on_ai_platform")
                sentiment_score_change = calculate_change(current_metrics["sentiment_score"], prev_metrics["sentiment_score"], "sentiment_score")
                engagement_rate_change = calculate_change(current_metrics["engagement_rate"], prev_metrics["engagement_rate"], "engagement_rate")
                total_interactions_change = calculate_change(current_metrics["total_interactions"], prev_metrics["total_interactions"], "total_interactions")
                cost_per_engagement_change = calculate_change(current_metrics["cost_per_engagement"], prev_metrics["cost_per_engagement"], "cost_per_engagement")
                top10_prompt_change = calculate_change(current_metrics["top10_prompt_percentage"], prev_metrics["top10_prompt_percentage"], "top10_prompt_percentage")
                prompt_search_volume_change = calculate_change(current_metrics["prompt_search_volume"], prev_metrics["prompt_search_volume"], "prompt_search_volume")
                
                scrunch_kpis = {
                    "influencer_reach": {
                        "value": int(current_metrics["influencer_reach"]),
                        "change": round(influencer_reach_change, 2),
                        "source": "Scrunch",
                        "label": "Influencer Reach",
                        "icon": "People",
                        "format": "number"
                    },
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
                    "scrunch_engagement_rate": {
                        "value": round(current_metrics["engagement_rate"], 1),
                        "change": round(engagement_rate_change, 2),
                        "source": "Scrunch",
                        "label": "Engagement Rate",
                        "icon": "TrendingUp",
                        "format": "percentage"
                    },
                    "total_interactions": {
                        "value": int(current_metrics["total_interactions"]),
                        "change": round(total_interactions_change, 2),
                        "source": "Scrunch",
                        "label": "Total Interactions",
                        "icon": "Visibility",
                        "format": "number"
                    },
                    "cost_per_engagement": {
                        "value": round(current_metrics["cost_per_engagement"], 2),
                        "change": round(cost_per_engagement_change, 2),
                        "source": "Scrunch",
                        "label": "Cost per Engagement",
                        "icon": "TrendingUp",
                        "format": "currency"
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
                        "value": current_metrics["prompt_search_volume"],
                        "change": round(prompt_search_volume_change, 2),
                        "source": "Scrunch",
                        "label": "Prompt Search Volume",
                        "icon": "TrendingUp",
                        "format": "number"
                    },
                    "visibility_on_ai_platform": {
                        "value": round(current_metrics["visibility_on_ai_platform"], 1),
                        "change": round(visibility_change, 2),
                        "source": "Scrunch",
                        "label": "Visibility On AI Platform",
                        "icon": "Visibility",
                        "format": "percentage"
                    }
                }
                
                # Calculate Top Performing Prompts
                if prompts and responses:
                    prompt_counts = {}
                    for r in responses:
                        prompt_id = r.get("prompt_id")
                        if prompt_id:
                            prompt_counts[prompt_id] = prompt_counts.get(prompt_id, 0) + 1
                    
                    # Map prompts with response counts
                    top_prompts_data = []
                    for prompt in prompts:
                        prompt_id = prompt.get("id")
                        response_count = prompt_counts.get(prompt_id, 0)
                        if response_count > 0:
                            top_prompts_data.append({
                                "id": prompt_id,
                                "text": prompt.get("text") or prompt.get("prompt_text") or "N/A",
                                "responseCount": response_count,
                                "variants": response_count,  # Using response count as variants estimate
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
                    
                    # Sort by response count and get top 20
                    insights.sort(key=lambda x: x["responses"], reverse=True)
                    chart_data["scrunch_ai_insights"] = insights[:20]
                
        except Exception as e:
            logger.warning(f"Error fetching Scrunch AI KPIs: {str(e)}")
        
        # Combine all KPIs
        kpis = {**ga4_kpis, **agency_kpis, **scrunch_kpis}
        
        # Chart data is already initialized above (before Scrunch AI section)
        # Continue populating chart_data with GA4 and Agency Analytics data
        
        # Get users over time (GA4)
        if brand.get("ga4_property_id"):
            try:
                property_id = brand["ga4_property_id"]
                top_pages = await ga4_client.get_top_pages(property_id, start_date, end_date, limit=10)
                traffic_sources = await ga4_client.get_traffic_sources(property_id, start_date, end_date)
                
                chart_data["traffic_sources"] = traffic_sources if traffic_sources else []
                chart_data["top_pages"] = top_pages if top_pages else []
                
                # Get geographic breakdown
                try:
                    geographic = await ga4_client.get_geographic_breakdown(property_id, start_date, end_date, limit=10)
                    chart_data["geographic_breakdown"] = geographic if geographic else []
                except Exception as e:
                    logger.warning(f"Could not fetch geographic breakdown: {str(e)}")
                    chart_data["geographic_breakdown"] = []
                
                # Get GA4 traffic overview for detailed metrics
                try:
                    traffic_overview = await ga4_client.get_traffic_overview(property_id, start_date, end_date)
                    # Calculate previous period for change comparison
                    prev_start = (datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=60)).strftime("%Y-%m-%d")
                    prev_end = (datetime.strptime(start_date, "%Y-%m-%d") - timedelta(days=1)).strftime("%Y-%m-%d")
                    prev_traffic_overview = await ga4_client.get_traffic_overview(property_id, prev_start, prev_end)
                    
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
                except Exception as e:
                    logger.warning(f"Could not fetch GA4 traffic overview: {str(e)}")
                
                # Get users over time (daily breakdown)
                try:
                    from google.analytics.data_v1beta import BetaAnalyticsDataClient
                    from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Dimension, Metric
                    client = ga4_client._get_data_client()
                    users_request = RunReportRequest(
                        property=f"properties/{property_id}",
                        date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                        dimensions=[Dimension(name="date")],
                        metrics=[Metric(name="activeUsers")],
                    )
                    users_response = client.run_report(users_request)
                    users_over_time = []
                    for row in users_response.rows:
                        users_over_time.append({
                            "date": row.dimension_values[0].value,
                            "users": int(row.metric_values[0].value)
                        })
                    # Sort by date in ascending order (oldest to newest)
                    users_over_time.sort(key=lambda x: x["date"])
                    chart_data["users_over_time"] = users_over_time
                except Exception as e:
                    logger.warning(f"Could not fetch users over time: {str(e)}")
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
                
                impressions_vs_clicks = []
                top_campaigns = []
                
                for campaign_id in campaign_ids:
                    # Query keyword ranking summaries filtered by date range for chart data
                    summaries_query = supabase.client.table("agency_analytics_keyword_ranking_summaries").select("*").eq("campaign_id", campaign_id)
                    summaries_query = summaries_query.gte("date", start_date).lte("date", end_date)
                    
                    summaries_result = summaries_query.execute()
                    summaries = summaries_result.data if hasattr(summaries_result, 'data') else []
                    
                    campaign_impressions = 0
                    campaign_clicks = 0
                    
                    for summary in summaries:
                        search_volume = summary.get("search_volume", 0) or 0
                        ranking = summary.get("google_ranking") or summary.get("google_mobile_ranking") or 999
                        
                        if ranking <= 100:
                            if ranking <= 3:
                                impression_rate = 0.95
                                ctr = 0.30
                            elif ranking <= 10:
                                impression_rate = 0.75
                                ctr = 0.10
                            elif ranking <= 20:
                                impression_rate = 0.50
                                ctr = 0.05
                            else:
                                impression_rate = 0.25
                                ctr = 0.01
                            
                            estimated_impressions = search_volume * impression_rate
                            estimated_clicks = estimated_impressions * ctr
                            campaign_impressions += estimated_impressions
                            campaign_clicks += estimated_clicks
                    
                    campaign_name = next((c.get("company", f"Campaign {campaign_id}") for c in campaigns if c.get("id") == campaign_id), f"Campaign {campaign_id}")
                    
                    impressions_vs_clicks.append({
                        "campaign": campaign_name,
                        "impressions": int(campaign_impressions),
                        "clicks": int(campaign_clicks)
                    })
                    
                    top_campaigns.append({
                        "campaign": campaign_name,
                        "impressions": int(campaign_impressions),
                        "engagement": int(campaign_clicks)  # Using clicks as engagement metric
                    })
                
                # Sort by impressions descending
                top_campaigns.sort(key=lambda x: x["impressions"], reverse=True)
                chart_data["impressions_vs_clicks"] = impressions_vs_clicks[:5]  # Top 5
                chart_data["top_campaigns"] = top_campaigns[:5]  # Top 5
                
                # Calculate keyword rankings performance metrics
                total_rankings = 0
                total_search_volume = 0
                for campaign_id in campaign_ids:
                    summaries_query = supabase.client.table("agency_analytics_keyword_ranking_summaries").select("*").eq("campaign_id", campaign_id)
                    summaries_query = summaries_query.gte("date", start_date).lte("date", end_date)
                    summaries_result = summaries_query.execute()
                    campaign_summaries = summaries_result.data if hasattr(summaries_result, 'data') else []
                    
                    for summary in campaign_summaries:
                        ranking = summary.get("google_ranking") or summary.get("google_mobile_ranking") or 999
                        if ranking <= 100:
                            total_rankings += 1
                        total_search_volume += summary.get("search_volume", 0) or 0
                
                # Get previous period for comparison (simplified - would need actual historical data)
                chart_data["keyword_rankings_performance"] = {
                    "google_rankings": total_rankings,
                    "google_rankings_change": 0,  # Would need historical comparison
                    "volume": total_search_volume,
                    "volume_change": 0  # Would need historical comparison
                }
                    
            except Exception as e:
                logger.warning(f"Error fetching Agency Analytics chart data: {str(e)}")
        
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
    """Get brand by slug for public access"""
    try:
        supabase = SupabaseService()
        
        brand_result = supabase.client.table("brands").select("*").eq("slug", slug).execute()
        brands = brand_result.data if hasattr(brand_result, 'data') else []
        
        if not brands:
            raise HTTPException(status_code=404, detail="Brand not found")
        
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
    """Get consolidated KPIs from GA4, Agency Analytics, and Scrunch for reporting dashboard by slug (public access)"""
    try:
        supabase = SupabaseService()
        
        # Get brand by slug
        brand_result = supabase.client.table("brands").select("*").eq("slug", slug).execute()
        brands = brand_result.data if hasattr(brand_result, 'data') else []
        
        if not brands:
            raise HTTPException(status_code=404, detail="Brand not found")
        
        brand = brands[0]
        brand_id = brand["id"]
        
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

