from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging
from datetime import datetime, timedelta
from app.services.scrunch_client import ScrunchAPIClient
from app.services.supabase_service import SupabaseService
from app.services.ga4_client import GA4APIClient
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()
ga4_client = GA4APIClient()

@router.post("/sync/brands")
async def sync_brands():
    """Sync brands from Scrunch AI to Supabase"""
    try:
        client = ScrunchAPIClient()
        supabase = SupabaseService()
        
        brands = await client.get_brands()
        count = supabase.upsert_brands(brands)
        
        return {
            "status": "success",
            "message": f"Synced {count} brands",
            "count": count
        }
    except Exception as e:
        logger.error(f"Error syncing brands: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync/prompts")
async def sync_prompts(
    brand_id: Optional[int] = Query(None, description="Sync prompts for specific brand ID (if not provided, syncs all brands)"),
    stage: Optional[str] = Query(None, description="Filter by funnel stage"),
    persona_id: Optional[int] = Query(None, description="Filter by persona ID")
):
    """Sync prompts from Scrunch AI to Supabase for all brands or a specific brand"""
    try:
        client = ScrunchAPIClient()
        supabase = SupabaseService()
        
        total_count = 0
        brand_results = []
        
        if brand_id:
            # Sync for specific brand
            logger.info(f"Syncing prompts for brand {brand_id}")
            prompts = await client.get_all_prompts_paginated(
                brand_id=brand_id,
                stage=stage,
                persona_id=persona_id
            )
            count = supabase.upsert_prompts(prompts, brand_id=brand_id)
            total_count = count
            brand_results.append({"brand_id": brand_id, "count": count})
        else:
            # Sync for all brands
            logger.info("Syncing prompts for all brands")
            brands = await client.get_brands()
            
            for brand in brands:
                brand_id_val = brand.get("id")
                if not brand_id_val:
                    continue
                
                try:
                    logger.info(f"Syncing prompts for brand {brand_id_val} ({brand.get('name', 'Unknown')})")
                    prompts = await client.get_all_prompts_paginated(
                        brand_id=brand_id_val,
                        stage=stage,
                        persona_id=persona_id
                    )
                    count = supabase.upsert_prompts(prompts, brand_id=brand_id_val)
                    total_count += count
                    brand_results.append({"brand_id": brand_id_val, "brand_name": brand.get("name"), "count": count})
                    logger.info(f"Synced {count} prompts for brand {brand_id_val}")
                except Exception as e:
                    logger.error(f"Error syncing prompts for brand {brand_id_val}: {str(e)}")
                    brand_results.append({"brand_id": brand_id_val, "brand_name": brand.get("name"), "count": 0, "error": str(e)})
        
        return {
            "status": "success",
            "message": f"Synced {total_count} prompts across {len(brand_results)} brand(s)",
            "total_count": total_count,
            "brand_results": brand_results
        }
    except Exception as e:
        logger.error(f"Error syncing prompts: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync/responses")
async def sync_responses(
    brand_id: Optional[int] = Query(None, description="Sync responses for specific brand ID (if not provided, syncs all brands)"),
    platform: Optional[str] = Query(None, description="Filter by AI platform"),
    prompt_id: Optional[int] = Query(None, description="Filter by prompt ID"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)")
):
    """Sync responses from Scrunch AI to Supabase for all brands or a specific brand"""
    try:
        client = ScrunchAPIClient()
        supabase = SupabaseService()
        
        total_count = 0
        brand_results = []
        
        if brand_id:
            # Sync for specific brand
            logger.info(f"Syncing responses for brand {brand_id}")
            responses = await client.get_all_responses_paginated(
                brand_id=brand_id,
                platform=platform,
                prompt_id=prompt_id,
                start_date=start_date,
                end_date=end_date
            )
            count = supabase.upsert_responses(responses, brand_id=brand_id)
            total_count = count
            brand_results.append({"brand_id": brand_id, "count": count})
        else:
            # Sync for all brands
            logger.info("Syncing responses for all brands")
            brands = await client.get_brands()
            
            for brand in brands:
                brand_id_val = brand.get("id")
                if not brand_id_val:
                    continue
                
                try:
                    logger.info(f"Syncing responses for brand {brand_id_val} ({brand.get('name', 'Unknown')})")
                    responses = await client.get_all_responses_paginated(
                        brand_id=brand_id_val,
                        platform=platform,
                        prompt_id=prompt_id,
                        start_date=start_date,
                        end_date=end_date
                    )
                    count = supabase.upsert_responses(responses, brand_id=brand_id_val)
                    total_count += count
                    brand_results.append({"brand_id": brand_id_val, "brand_name": brand.get("name"), "count": count})
                    logger.info(f"Synced {count} responses for brand {brand_id_val}")
                except Exception as e:
                    logger.error(f"Error syncing responses for brand {brand_id_val}: {str(e)}")
                    brand_results.append({"brand_id": brand_id_val, "brand_name": brand.get("name"), "count": 0, "error": str(e)})
        
        return {
            "status": "success",
            "message": f"Synced {total_count} responses across {len(brand_results)} brand(s)",
            "total_count": total_count,
            "brand_results": brand_results
        }
    except Exception as e:
        logger.error(f"Error syncing responses: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sync/all")
async def sync_all():
    """Sync all data (brands, prompts, responses) from Scrunch AI to Supabase for ALL brands"""
    try:
        client = ScrunchAPIClient()
        supabase = SupabaseService()
        
        # Step 1: Sync brands first
        logger.info("Step 1: Syncing brands...")
        brands = await client.get_brands()
        brands_count = supabase.upsert_brands(brands)
        logger.info(f"Synced {brands_count} brands")
        
        # Step 2: Sync prompts for all brands
        logger.info("Step 2: Syncing prompts for all brands...")
        total_prompts = 0
        prompts_by_brand = []
        
        for brand in brands:
            brand_id_val = brand.get("id")
            if not brand_id_val:
                continue
            
            try:
                logger.info(f"Syncing prompts for brand {brand_id_val} ({brand.get('name', 'Unknown')})...")
                prompts = await client.get_all_prompts_paginated(brand_id=brand_id_val)
                count = supabase.upsert_prompts(prompts, brand_id=brand_id_val)
                total_prompts += count
                prompts_by_brand.append({"brand_id": brand_id_val, "brand_name": brand.get("name"), "count": count})
                logger.info(f"Synced {count} prompts for brand {brand_id_val}")
            except Exception as e:
                logger.error(f"Error syncing prompts for brand {brand_id_val}: {str(e)}")
                prompts_by_brand.append({"brand_id": brand_id_val, "brand_name": brand.get("name"), "count": 0, "error": str(e)})
        
        # Step 3: Sync responses for all brands
        logger.info("Step 3: Syncing responses for all brands...")
        total_responses = 0
        responses_by_brand = []
        
        for brand in brands:
            brand_id_val = brand.get("id")
            if not brand_id_val:
                continue
            
            try:
                logger.info(f"Syncing responses for brand {brand_id_val} ({brand.get('name', 'Unknown')})...")
                responses = await client.get_all_responses_paginated(brand_id=brand_id_val)
                count = supabase.upsert_responses(responses, brand_id=brand_id_val)
                total_responses += count
                responses_by_brand.append({"brand_id": brand_id_val, "brand_name": brand.get("name"), "count": count})
                logger.info(f"Synced {count} responses for brand {brand_id_val}")
            except Exception as e:
                logger.error(f"Error syncing responses for brand {brand_id_val}: {str(e)}")
                responses_by_brand.append({"brand_id": brand_id_val, "brand_name": brand.get("name"), "count": 0, "error": str(e)})
        
        return {
            "status": "success",
            "message": "Synced all data for all brands",
            "summary": {
                "brands": brands_count,
                "total_prompts": total_prompts,
                "total_responses": total_responses
            },
            "prompts_by_brand": prompts_by_brand,
            "responses_by_brand": responses_by_brand
        }
    except Exception as e:
        logger.error(f"Error syncing all data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sync/status")
async def sync_status():
    """Get sync status from database"""
    try:
        supabase = SupabaseService()
        
        # Get counts from database
        brands_result = supabase.client.table("brands").select("id", count="exact").execute()
        prompts_result = supabase.client.table("prompts").select("id", count="exact").execute()
        responses_result = supabase.client.table("responses").select("id", count="exact").execute()
        
        return {
            "brands_count": brands_result.count if hasattr(brands_result, 'count') else 0,
            "prompts_count": prompts_result.count if hasattr(prompts_result, 'count') else 0,
            "responses_count": responses_result.count if hasattr(responses_result, 'count') else 0
        }
    except Exception as e:
        logger.error(f"Error getting sync status: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# =====================================================
# GA4 Sync Endpoints
# =====================================================

@router.post("/sync/ga4")
async def sync_ga4(
    brand_id: Optional[int] = Query(None, description="Sync GA4 data for specific brand ID (if not provided, syncs all brands with GA4 configured)"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD), defaults to 30 days ago"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD), defaults to today"),
    sync_realtime: bool = Query(True, description="Whether to sync realtime data")
):
    """Sync GA4 data to Supabase for a specific brand or all brands with GA4 configured"""
    try:
        supabase = SupabaseService()
        
        # Get date range
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        
        total_synced = {
            "brands": 0,
            "traffic_overview": 0,
            "top_pages": 0,
            "traffic_sources": 0,
            "geographic": 0,
            "devices": 0,
            "conversions": 0,
            "realtime": 0
        }
        
        brand_results = []
        
        # Get brands with GA4 configured
        if brand_id:
            # Sync for specific brand
            brand_result = supabase.client.table("brands").select("*").eq("id", brand_id).execute()
            if not brand_result.data:
                raise HTTPException(status_code=404, detail=f"Brand {brand_id} not found")
            brands = brand_result.data
        else:
            # Sync for all brands with GA4 configured
            brands_result = supabase.client.table("brands").select("*").not_.is_("ga4_property_id", "null").execute()
            brands = brands_result.data if brands_result.data else []
        
        if not brands:
            return {
                "status": "success",
                "message": "No brands with GA4 configured found",
                "total_synced": total_synced,
                "brand_results": []
            }
        
        # Sync GA4 data for each brand
        for brand in brands:
            brand_id_val = brand.get("id")
            property_id = brand.get("ga4_property_id")
            brand_name = brand.get("name", f"Brand {brand_id_val}")
            
            if not property_id:
                logger.warning(f"Brand {brand_id_val} ({brand_name}) has no GA4 property ID, skipping")
                brand_results.append({
                    "brand_id": brand_id_val,
                    "brand_name": brand_name,
                    "status": "skipped",
                    "reason": "No GA4 property ID configured"
                })
                continue
            
            try:
                logger.info(f"Syncing GA4 data for brand {brand_id_val} ({brand_name}), property {property_id}")
                brand_sync_result = {
                    "brand_id": brand_id_val,
                    "brand_name": brand_name,
                    "property_id": property_id,
                    "status": "success",
                    "synced": {}
                }
                
                # Sync traffic overview (aggregated data for the date range)
                try:
                    traffic_data = await ga4_client.get_traffic_overview(property_id, start_date, end_date)
                    if traffic_data:
                        # Store aggregated data for the end date
                        supabase.upsert_ga4_traffic_overview(
                            brand_id_val, property_id, end_date, traffic_data
                        )
                        brand_sync_result["synced"]["traffic_overview"] = 1
                        total_synced["traffic_overview"] += 1
                except Exception as e:
                    logger.error(f"Error syncing traffic overview for brand {brand_id_val}: {str(e)}")
                    brand_sync_result["synced"]["traffic_overview"] = 0
                    brand_sync_result["errors"] = brand_sync_result.get("errors", [])
                    brand_sync_result["errors"].append(f"traffic_overview: {str(e)}")
                
                # Sync top pages
                try:
                    top_pages = await ga4_client.get_top_pages(property_id, start_date, end_date, limit=50)
                    if top_pages:
                        count = supabase.upsert_ga4_top_pages(brand_id_val, property_id, end_date, top_pages)
                        brand_sync_result["synced"]["top_pages"] = count
                        total_synced["top_pages"] += count
                except Exception as e:
                    logger.error(f"Error syncing top pages for brand {brand_id_val}: {str(e)}")
                    brand_sync_result["synced"]["top_pages"] = 0
                    brand_sync_result["errors"] = brand_sync_result.get("errors", [])
                    brand_sync_result["errors"].append(f"top_pages: {str(e)}")
                
                # Sync traffic sources
                try:
                    traffic_sources = await ga4_client.get_traffic_sources(property_id, start_date, end_date)
                    if traffic_sources:
                        count = supabase.upsert_ga4_traffic_sources(brand_id_val, property_id, end_date, traffic_sources)
                        brand_sync_result["synced"]["traffic_sources"] = count
                        total_synced["traffic_sources"] += count
                except Exception as e:
                    logger.error(f"Error syncing traffic sources for brand {brand_id_val}: {str(e)}")
                    brand_sync_result["synced"]["traffic_sources"] = 0
                    brand_sync_result["errors"] = brand_sync_result.get("errors", [])
                    brand_sync_result["errors"].append(f"traffic_sources: {str(e)}")
                
                # Sync geographic data
                try:
                    geographic = await ga4_client.get_geographic_breakdown(property_id, start_date, end_date, limit=50)
                    if geographic:
                        count = supabase.upsert_ga4_geographic(brand_id_val, property_id, end_date, geographic)
                        brand_sync_result["synced"]["geographic"] = count
                        total_synced["geographic"] += count
                except Exception as e:
                    logger.error(f"Error syncing geographic data for brand {brand_id_val}: {str(e)}")
                    brand_sync_result["synced"]["geographic"] = 0
                    brand_sync_result["errors"] = brand_sync_result.get("errors", [])
                    brand_sync_result["errors"].append(f"geographic: {str(e)}")
                
                # Sync devices
                try:
                    devices = await ga4_client.get_device_breakdown(property_id, start_date, end_date)
                    if devices:
                        count = supabase.upsert_ga4_devices(brand_id_val, property_id, end_date, devices)
                        brand_sync_result["synced"]["devices"] = count
                        total_synced["devices"] += count
                except Exception as e:
                    logger.error(f"Error syncing devices for brand {brand_id_val}: {str(e)}")
                    brand_sync_result["synced"]["devices"] = 0
                    brand_sync_result["errors"] = brand_sync_result.get("errors", [])
                    brand_sync_result["errors"].append(f"devices: {str(e)}")
                
                # Sync conversions
                try:
                    conversions = await ga4_client.get_conversions(property_id, start_date, end_date)
                    if conversions:
                        count = supabase.upsert_ga4_conversions(brand_id_val, property_id, end_date, conversions)
                        brand_sync_result["synced"]["conversions"] = count
                        total_synced["conversions"] += count
                except Exception as e:
                    logger.error(f"Error syncing conversions for brand {brand_id_val}: {str(e)}")
                    brand_sync_result["synced"]["conversions"] = 0
                    brand_sync_result["errors"] = brand_sync_result.get("errors", [])
                    brand_sync_result["errors"].append(f"conversions: {str(e)}")
                
                # Sync realtime data
                if sync_realtime:
                    try:
                        realtime_data = await ga4_client.get_realtime_snapshot(property_id)
                        if realtime_data:
                            supabase.upsert_ga4_realtime(brand_id_val, property_id, realtime_data)
                            brand_sync_result["synced"]["realtime"] = 1
                            total_synced["realtime"] += 1
                    except Exception as e:
                        logger.error(f"Error syncing realtime data for brand {brand_id_val}: {str(e)}")
                        brand_sync_result["synced"]["realtime"] = 0
                        brand_sync_result["errors"] = brand_sync_result.get("errors", [])
                        brand_sync_result["errors"].append(f"realtime: {str(e)}")
                
                total_synced["brands"] += 1
                brand_results.append(brand_sync_result)
                logger.info(f"Successfully synced GA4 data for brand {brand_id_val}")
                
            except Exception as e:
                logger.error(f"Error syncing GA4 data for brand {brand_id_val}: {str(e)}")
                brand_results.append({
                    "brand_id": brand_id_val,
                    "brand_name": brand_name,
                    "property_id": property_id,
                    "status": "error",
                    "error": str(e)
                })
        
        return {
            "status": "success",
            "message": f"Synced GA4 data for {total_synced['brands']} brand(s)",
            "date_range": {
                "start_date": start_date,
                "end_date": end_date
            },
            "total_synced": total_synced,
            "brand_results": brand_results
        }
        
    except Exception as e:
        logger.error(f"Error syncing GA4 data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

