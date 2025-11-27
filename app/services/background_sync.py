"""
Background sync functions that run async
"""
import logging
from typing import Dict, Any, Optional
from app.services.scrunch_client import ScrunchAPIClient
from app.services.supabase_service import SupabaseService
from app.services.ga4_client import GA4APIClient
from app.services.agency_analytics_client import AgencyAnalyticsClient
from app.services.sync_job_service import sync_job_service
from app.services.audit_logger import audit_logger
from app.db.models import AuditLogAction
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


async def sync_all_background(
    job_id: str,
    user_id: str,
    user_email: str,
    request = None
):
    """Background task to sync all Scrunch AI data"""
    client = ScrunchAPIClient()
    supabase = SupabaseService()
    
    try:
        # Check for cancellation before starting
        if sync_job_service.is_cancelled(job_id):
            logger.info(f"[Job {job_id}] Job was cancelled before starting")
            return
        
        await sync_job_service.update_job_status(job_id, "running", progress=0, current_step="Starting sync...", total_steps=3)
        
        # Step 1: Sync brands
        if sync_job_service.is_cancelled(job_id):
            logger.info(f"[Job {job_id}] Job cancelled during brand sync")
            return
        
        await sync_job_service.update_job_status(
            job_id, "running", progress=10,
            current_step="Syncing brands...", completed_steps=0, total_steps=3
        )
        logger.info(f"[Job {job_id}] Step 1: Syncing brands...")
        brands = await client.get_brands()
        
        if sync_job_service.is_cancelled(job_id):
            logger.info(f"[Job {job_id}] Job cancelled after fetching brands")
            return
        
        brands_count = supabase.upsert_brands(brands)
        logger.info(f"[Job {job_id}] Synced {brands_count} brands")
        
        # Step 2: Sync prompts
        await sync_job_service.update_job_status(
            job_id, "running", progress=40,
            current_step="Syncing prompts...", completed_steps=1, total_steps=3
        )
        logger.info(f"[Job {job_id}] Step 2: Syncing prompts...")
        total_prompts = 0
        prompts_by_brand = []
        
        for idx, brand in enumerate(brands):
            # Check for cancellation before each brand
            if sync_job_service.is_cancelled(job_id):
                logger.info(f"[Job {job_id}] Job cancelled during prompts sync")
                return
            
            brand_id_val = brand.get("id")
            if not brand_id_val:
                continue
            
            try:
                logger.info(f"[Job {job_id}] Syncing prompts for brand {brand_id_val}")
                prompts = await client.get_all_prompts_paginated(brand_id=brand_id_val)
                
                if sync_job_service.is_cancelled(job_id):
                    logger.info(f"[Job {job_id}] Job cancelled after fetching prompts for brand {brand_id_val}")
                    return
                
                count = supabase.upsert_prompts(prompts, brand_id=brand_id_val)
                total_prompts += count
                prompts_by_brand.append({"brand_id": brand_id_val, "brand_name": brand.get("name"), "count": count})
                
                # Update progress
                progress = 40 + int((idx + 1) / len(brands) * 30)
                await sync_job_service.update_job_status(
                    job_id, "running", progress=progress,
                    current_step=f"Syncing prompts... ({idx + 1}/{len(brands)} brands)"
                )
            except Exception as e:
                logger.error(f"[Job {job_id}] Error syncing prompts for brand {brand_id_val}: {str(e)}")
                prompts_by_brand.append({"brand_id": brand_id_val, "brand_name": brand.get("name"), "count": 0, "error": str(e)})
        
        # Step 3: Sync responses
        await sync_job_service.update_job_status(
            job_id, "running", progress=70,
            current_step="Syncing responses...", completed_steps=2, total_steps=3
        )
        logger.info(f"[Job {job_id}] Step 3: Syncing responses...")
        total_responses = 0
        responses_by_brand = []
        
        for idx, brand in enumerate(brands):
            # Check for cancellation before each brand
            if sync_job_service.is_cancelled(job_id):
                logger.info(f"[Job {job_id}] Job cancelled during responses sync")
                return
            
            brand_id_val = brand.get("id")
            if not brand_id_val:
                continue
            
            try:
                logger.info(f"[Job {job_id}] Syncing responses for brand {brand_id_val}")
                responses = await client.get_all_responses_paginated(brand_id=brand_id_val)
                
                if sync_job_service.is_cancelled(job_id):
                    logger.info(f"[Job {job_id}] Job cancelled after fetching responses for brand {brand_id_val}")
                    return
                
                count = supabase.upsert_responses(responses, brand_id=brand_id_val)
                total_responses += count
                responses_by_brand.append({"brand_id": brand_id_val, "brand_name": brand.get("name"), "count": count})
                
                # Update progress
                progress = 70 + int((idx + 1) / len(brands) * 25)
                await sync_job_service.update_job_status(
                    job_id, "running", progress=progress,
                    current_step=f"Syncing responses... ({idx + 1}/{len(brands)} brands)"
                )
            except Exception as e:
                logger.error(f"[Job {job_id}] Error syncing responses for brand {brand_id_val}: {str(e)}")
                responses_by_brand.append({"brand_id": brand_id_val, "brand_name": brand.get("name"), "count": 0, "error": str(e)})
        
        # Check for cancellation before completing
        if sync_job_service.is_cancelled(job_id):
            logger.info(f"[Job {job_id}] Job was cancelled, not completing")
            return
        
        # Determine status
        has_errors = any("error" in r for r in prompts_by_brand) or any("error" in r for r in responses_by_brand)
        status = "partial" if has_errors else "success"
        
        result = {
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
        
        # Complete job
        await sync_job_service.complete_job(job_id, result)
        
        # Log audit
        await audit_logger.log_sync(
            sync_type=AuditLogAction.SYNC_ALL,
            user_id=user_id,
            user_email=user_email,
            status=status,
            details={
                "brands": brands_count,
                "total_prompts": total_prompts,
                "total_responses": total_responses,
                "prompts_by_brand": prompts_by_brand,
                "responses_by_brand": responses_by_brand,
                "job_id": job_id
            },
            request=request
        )
        
        logger.info(f"[Job {job_id}] Completed successfully")
        
    except Exception as e:
        logger.error(f"[Job {job_id}] Failed: {str(e)}")
        await sync_job_service.fail_job(job_id, str(e))
        
        # Log audit
        await audit_logger.log_sync(
            sync_type=AuditLogAction.SYNC_ALL,
            user_id=user_id,
            user_email=user_email,
            status="error",
            error_message=str(e),
            details={"job_id": job_id},
            request=request
        )
        raise


async def sync_ga4_background(
    job_id: str,
    user_id: str,
    user_email: str,
    brand_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    sync_realtime: bool = True,
    request = None
):
    """Background task to sync GA4 data"""
    ga4_client = GA4APIClient()
    supabase = SupabaseService()
    
    try:
        # Get date range
        if not end_date:
            end_date = datetime.now().strftime("%Y-%m-%d")
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
        
        await sync_job_service.update_job_status(
            job_id, "running", progress=0,
            current_step="Fetching brands with GA4...", total_steps=1
        )
        
        # Get brands with GA4 configured
        if brand_id:
            brand_result = supabase.client.table("brands").select("*").eq("id", brand_id).execute()
            brands = brand_result.data if brand_result.data else []
        else:
            brands_result = supabase.client.table("brands").select("*").not_.is_("ga4_property_id", "null").execute()
            brands = brands_result.data if brands_result.data else []
        
        if not brands:
            # Check for cancellation before completing
            if sync_job_service.is_cancelled(job_id):
                logger.info(f"[Job {job_id}] Job was cancelled")
                return
            result = {
                "status": "success",
                "message": "No brands with GA4 configured found",
                "total_synced": {},
                "brand_results": []
            }
            await sync_job_service.complete_job(job_id, result)
            return
        
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
        total_brands = len(brands)
        
        for idx, brand in enumerate(brands):
            # Check for cancellation before each brand
            if sync_job_service.is_cancelled(job_id):
                logger.info(f"[Job {job_id}] Job cancelled during GA4 sync")
                return
            
            brand_id_val = brand.get("id")
            property_id = brand.get("ga4_property_id")
            brand_name = brand.get("name", f"Brand {brand_id_val}")
            
            if not property_id:
                continue
            
            try:
                progress = int((idx / total_brands) * 80)
                await sync_job_service.update_job_status(
                    job_id, "running", progress=progress,
                    current_step=f"Syncing GA4 for {brand_name} ({idx + 1}/{total_brands})..."
                )
                
                # Check for cancellation after status update
                if sync_job_service.is_cancelled(job_id):
                    logger.info(f"[Job {job_id}] Job cancelled before syncing brand {brand_name}")
                    return
                
                # Calculate date ranges for 30-day periods
                # Current period: last 30 days from today
                end_dt = datetime.strptime(end_date, "%Y-%m-%d")
                start_dt = end_dt - timedelta(days=29)  # 30 days inclusive
                period_start_date = start_dt.strftime("%Y-%m-%d")
                period_end_date = end_date
                
                # Previous period: 30 days before current period
                prev_period_end_dt = start_dt - timedelta(days=1)
                prev_period_start_dt = prev_period_end_dt - timedelta(days=29)
                prev_period_start_date = prev_period_start_dt.strftime("%Y-%m-%d")
                prev_period_end_date = prev_period_end_dt.strftime("%Y-%m-%d")
                
                logger.info(f"[Job {job_id}] Calculating KPIs for brand {brand_id_val}")
                logger.info(f"[Job {job_id}] Current period: {period_start_date} to {period_end_date}")
                logger.info(f"[Job {job_id}] Previous period: {prev_period_start_date} to {prev_period_end_date}")
                
                # Fetch current period data
                await sync_job_service.update_job_status(
                    job_id, "running", progress=progress + 5,
                    current_step=f"Fetching current period data for {brand_name}..."
                )
                
                current_traffic_overview = await ga4_client.get_traffic_overview(property_id, period_start_date, period_end_date)
                
                # Check for cancellation after API call
                if sync_job_service.is_cancelled(job_id):
                    logger.info(f"[Job {job_id}] Job cancelled after fetching traffic overview for {brand_name}")
                    return
                
                # Get conversions and revenue for current period
                current_conversions = 0
                current_revenue = 0
                try:
                    from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Metric
                    client = ga4_client._get_data_client()
                    
                    # Get conversions
                    conversions_request = RunReportRequest(
                        property=f"properties/{property_id}",
                        date_ranges=[DateRange(start_date=period_start_date, end_date=period_end_date)],
                        metrics=[Metric(name="conversions")],
                    )
                    conversions_response = client.run_report(conversions_request)
                    if conversions_response.rows:
                        current_conversions = float(conversions_response.rows[0].metric_values[0].value)
                    
                    # Get revenue
                    revenue_request = RunReportRequest(
                        property=f"properties/{property_id}",
                        date_ranges=[DateRange(start_date=period_start_date, end_date=period_end_date)],
                        metrics=[Metric(name="totalRevenue")],
                    )
                    revenue_response = client.run_report(revenue_request)
                    if revenue_response.rows:
                        current_revenue = float(revenue_response.rows[0].metric_values[0].value)
                except Exception as e:
                    logger.warning(f"Could not fetch conversions/revenue for current period: {str(e)}")
                
                # Check for cancellation before fetching previous period
                if sync_job_service.is_cancelled(job_id):
                    logger.info(f"[Job {job_id}] Job cancelled after fetching current period data for {brand_name}")
                    return
                
                # Fetch previous period data
                await sync_job_service.update_job_status(
                    job_id, "running", progress=progress + 10,
                    current_step=f"Fetching previous period data for {brand_name}..."
                )
                
                prev_traffic_overview = await ga4_client.get_traffic_overview(property_id, prev_period_start_date, prev_period_end_date)
                
                # Check for cancellation after API call
                if sync_job_service.is_cancelled(job_id):
                    logger.info(f"[Job {job_id}] Job cancelled after fetching previous period traffic overview for {brand_name}")
                    return
                
                # Get conversions and revenue for previous period
                prev_conversions = 0
                prev_revenue = 0
                try:
                    from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Metric
                    client = ga4_client._get_data_client()
                    
                    # Get previous period conversions
                    prev_conversions_request = RunReportRequest(
                        property=f"properties/{property_id}",
                        date_ranges=[DateRange(start_date=prev_period_start_date, end_date=prev_period_end_date)],
                        metrics=[Metric(name="conversions")],
                    )
                    prev_conversions_response = client.run_report(prev_conversions_request)
                    if prev_conversions_response.rows:
                        prev_conversions = float(prev_conversions_response.rows[0].metric_values[0].value)
                    
                    # Get previous period revenue
                    prev_revenue_request = RunReportRequest(
                        property=f"properties/{property_id}",
                        date_ranges=[DateRange(start_date=prev_period_start_date, end_date=prev_period_end_date)],
                        metrics=[Metric(name="totalRevenue")],
                    )
                    prev_revenue_response = client.run_report(prev_revenue_request)
                    if prev_revenue_response.rows:
                        prev_revenue = float(prev_revenue_response.rows[0].metric_values[0].value)
                except Exception as e:
                    logger.warning(f"Could not fetch conversions/revenue for previous period: {str(e)}")
                
                # Prepare current period values
                current_values = {
                    "users": current_traffic_overview.get("users", 0) if current_traffic_overview else 0,
                    "sessions": current_traffic_overview.get("sessions", 0) if current_traffic_overview else 0,
                    "new_users": current_traffic_overview.get("newUsers", 0) if current_traffic_overview else 0,
                    "bounce_rate": current_traffic_overview.get("bounceRate", 0) if current_traffic_overview else 0,
                    "avg_session_duration": current_traffic_overview.get("averageSessionDuration", 0) if current_traffic_overview else 0,
                    "engagement_rate": current_traffic_overview.get("engagementRate", 0) if current_traffic_overview else 0,
                    "engaged_sessions": current_traffic_overview.get("engagedSessions", 0) if current_traffic_overview else 0,
                    "conversions": current_conversions,
                    "revenue": current_revenue,
                }
                
                # Prepare previous period values
                previous_values = {
                    "users": prev_traffic_overview.get("users", 0) if prev_traffic_overview else 0,
                    "sessions": prev_traffic_overview.get("sessions", 0) if prev_traffic_overview else 0,
                    "new_users": prev_traffic_overview.get("newUsers", 0) if prev_traffic_overview else 0,
                    "bounce_rate": prev_traffic_overview.get("bounceRate", 0) if prev_traffic_overview else 0,
                    "avg_session_duration": prev_traffic_overview.get("averageSessionDuration", 0) if prev_traffic_overview else 0,
                    "engagement_rate": prev_traffic_overview.get("engagementRate", 0) if prev_traffic_overview else 0,
                    "engaged_sessions": prev_traffic_overview.get("engagedSessions", 0) if prev_traffic_overview else 0,
                    "conversions": prev_conversions,
                    "revenue": prev_revenue,
                }
                
                # Calculate percentage changes
                def calculate_change(current, previous):
                    if previous > 0:
                        return ((current - previous) / previous) * 100
                    return 0
                
                changes = {
                    "users_change": calculate_change(current_values["users"], previous_values["users"]),
                    "sessions_change": calculate_change(current_values["sessions"], previous_values["sessions"]),
                    "new_users_change": calculate_change(current_values["new_users"], previous_values["new_users"]),
                    "bounce_rate_change": calculate_change(current_values["bounce_rate"], previous_values["bounce_rate"]) if previous_values["bounce_rate"] > 0 else 0,
                    "avg_session_duration_change": calculate_change(current_values["avg_session_duration"], previous_values["avg_session_duration"]) if previous_values["avg_session_duration"] > 0 else 0,
                    "engagement_rate_change": calculate_change(current_values["engagement_rate"], previous_values["engagement_rate"]) if previous_values["engagement_rate"] > 0 else 0,
                    "engaged_sessions_change": calculate_change(current_values["engaged_sessions"], previous_values["engaged_sessions"]),
                    "conversions_change": calculate_change(current_values["conversions"], previous_values["conversions"]) if previous_values["conversions"] > 0 else 0,
                    "revenue_change": calculate_change(current_values["revenue"], previous_values["revenue"]) if previous_values["revenue"] > 0 else 0,
                }
                
                # Store KPI snapshot
                await sync_job_service.update_job_status(
                    job_id, "running", progress=progress + 15,
                    current_step=f"Storing KPI snapshot for {brand_name}..."
                )
                
                supabase.upsert_ga4_kpi_snapshot(
                    brand_id=brand_id_val,
                    property_id=property_id,
                    period_end_date=period_end_date,
                    period_start_date=period_start_date,
                    prev_period_start_date=prev_period_start_date,
                    prev_period_end_date=prev_period_end_date,
                    current_values=current_values,
                    previous_values=previous_values,
                    changes=changes
                )
                
                # Store all GA4 data types for the current period
                await sync_job_service.update_job_status(
                    job_id, "running", progress=progress + 20,
                    current_step=f"Storing all GA4 data for {brand_name}..."
                )
                
                # Store daily traffic overview records (one per day for the entire 30-day period)
                if current_traffic_overview and current_traffic_overview.get("daily_data"):
                    daily_records = current_traffic_overview.get("daily_data", [])
                    logger.info(f"[Job {job_id}] Storing {len(daily_records)} daily traffic overview records for {brand_name}")
                    
                    # Get daily conversions and revenue if available
                    daily_conversions_data = {}
                    daily_revenue_data = {}
                    
                    # Try to get daily breakdown of conversions and revenue
                    try:
                        from google.analytics.data_v1beta.types import RunReportRequest, DateRange, Metric, Dimension
                        client = ga4_client._get_data_client()
                        
                        # Get daily conversions
                        daily_conversions_request = RunReportRequest(
                            property=f"properties/{property_id}",
                            date_ranges=[DateRange(start_date=period_start_date, end_date=period_end_date)],
                            dimensions=[Dimension(name="date")],
                            metrics=[Metric(name="conversions")],
                        )
                        daily_conversions_response = client.run_report(daily_conversions_request)
                        if daily_conversions_response.rows:
                            for row in daily_conversions_response.rows:
                                date_str = row.dimension_values[0].value
                                conversions_value = float(row.metric_values[0].value)
                                daily_conversions_data[date_str] = conversions_value
                        
                        # Get daily revenue
                        daily_revenue_request = RunReportRequest(
                            property=f"properties/{property_id}",
                            date_ranges=[DateRange(start_date=period_start_date, end_date=period_end_date)],
                            dimensions=[Dimension(name="date")],
                            metrics=[Metric(name="totalRevenue")],
                        )
                        daily_revenue_response = client.run_report(daily_revenue_request)
                        if daily_revenue_response.rows:
                            for row in daily_revenue_response.rows:
                                date_str = row.dimension_values[0].value
                                revenue_value = float(row.metric_values[0].value)
                                daily_revenue_data[date_str] = revenue_value
                    except Exception as e:
                        logger.warning(f"Could not fetch daily conversions/revenue breakdown: {str(e)}")
                    
                    # Store each daily record
                    for daily_record in daily_records:
                        date_str = daily_record.get("date")
                        if date_str:
                            # Add conversions and revenue for this day
                            daily_record_with_extras = daily_record.copy()
                            daily_record_with_extras["conversions"] = daily_conversions_data.get(date_str, 0)
                            daily_record_with_extras["revenue"] = daily_revenue_data.get(date_str, 0)
                            supabase.upsert_ga4_traffic_overview(brand_id_val, property_id, date_str, daily_record_with_extras)
                            total_synced["traffic_overview"] += 1
                    
                    logger.info(f"[Job {job_id}] Stored {total_synced['traffic_overview']} daily traffic overview records for {brand_name}")
                elif current_traffic_overview:
                    # Fallback: Store aggregated record if daily data not available
                    traffic_overview_with_extras = current_traffic_overview.copy()
                    traffic_overview_with_extras["conversions"] = current_conversions
                    traffic_overview_with_extras["revenue"] = current_revenue
                    supabase.upsert_ga4_traffic_overview(brand_id_val, property_id, period_end_date, traffic_overview_with_extras)
                    total_synced["traffic_overview"] += 1
                
                # Store revenue separately for historical tracking
                if current_revenue > 0:
                    supabase.upsert_ga4_revenue(brand_id_val, property_id, period_end_date, current_revenue)
                
                # Store daily conversions summary
                if current_conversions > 0:
                    supabase.upsert_ga4_daily_conversions(brand_id_val, property_id, period_end_date, current_conversions)
                
                # Fetch and store additional GA4 data
                try:
                    # Top pages
                    if sync_job_service.is_cancelled(job_id):
                        logger.info(f"[Job {job_id}] Job cancelled before fetching top pages for {brand_name}")
                        return
                    top_pages = await ga4_client.get_top_pages(property_id, period_start_date, period_end_date, limit=50)
                    if sync_job_service.is_cancelled(job_id):
                        logger.info(f"[Job {job_id}] Job cancelled after fetching top pages for {brand_name}")
                        return
                    if top_pages:
                        count = supabase.upsert_ga4_top_pages(brand_id_val, property_id, period_end_date, top_pages)
                        total_synced["top_pages"] += count
                    
                    # Traffic sources
                    if sync_job_service.is_cancelled(job_id):
                        logger.info(f"[Job {job_id}] Job cancelled before fetching traffic sources for {brand_name}")
                        return
                    traffic_sources = await ga4_client.get_traffic_sources(property_id, period_start_date, period_end_date)
                    if sync_job_service.is_cancelled(job_id):
                        logger.info(f"[Job {job_id}] Job cancelled after fetching traffic sources for {brand_name}")
                        return
                    if traffic_sources:
                        count = supabase.upsert_ga4_traffic_sources(brand_id_val, property_id, period_end_date, traffic_sources)
                        total_synced["traffic_sources"] += count
                    
                    # Geographic breakdown
                    if sync_job_service.is_cancelled(job_id):
                        logger.info(f"[Job {job_id}] Job cancelled before fetching geographic data for {brand_name}")
                        return
                    geographic = await ga4_client.get_geographic_breakdown(property_id, period_start_date, period_end_date, limit=50)
                    if sync_job_service.is_cancelled(job_id):
                        logger.info(f"[Job {job_id}] Job cancelled after fetching geographic data for {brand_name}")
                        return
                    if geographic:
                        count = supabase.upsert_ga4_geographic(brand_id_val, property_id, period_end_date, geographic)
                        total_synced["geographic"] += count
                    
                    # Device breakdown
                    if sync_job_service.is_cancelled(job_id):
                        logger.info(f"[Job {job_id}] Job cancelled before fetching device data for {brand_name}")
                        return
                    devices = await ga4_client.get_device_breakdown(property_id, period_start_date, period_end_date)
                    if sync_job_service.is_cancelled(job_id):
                        logger.info(f"[Job {job_id}] Job cancelled after fetching device data for {brand_name}")
                        return
                    if devices:
                        count = supabase.upsert_ga4_devices(brand_id_val, property_id, period_end_date, devices)
                        total_synced["devices"] += count
                    
                    # Conversions (individual events)
                    if sync_job_service.is_cancelled(job_id):
                        logger.info(f"[Job {job_id}] Job cancelled before fetching conversions for {brand_name}")
                        return
                    conversions = await ga4_client.get_conversions(property_id, period_start_date, period_end_date)
                    if sync_job_service.is_cancelled(job_id):
                        logger.info(f"[Job {job_id}] Job cancelled after fetching conversions for {brand_name}")
                        return
                    if conversions:
                        count = supabase.upsert_ga4_conversions(brand_id_val, property_id, period_end_date, conversions)
                        total_synced["conversions"] += count
                    
                    # Realtime snapshot (if enabled)
                    if sync_realtime:
                        if sync_job_service.is_cancelled(job_id):
                            logger.info(f"[Job {job_id}] Job cancelled before fetching realtime data for {brand_name}")
                            return
                        realtime = await ga4_client.get_realtime_snapshot(property_id)
                        if sync_job_service.is_cancelled(job_id):
                            logger.info(f"[Job {job_id}] Job cancelled after fetching realtime data for {brand_name}")
                            return
                        if realtime:
                            supabase.upsert_ga4_realtime(brand_id_val, property_id, realtime)
                            total_synced["realtime"] += 1
                    
                    # Property details (static, only fetch once or periodically)
                    if sync_job_service.is_cancelled(job_id):
                        logger.info(f"[Job {job_id}] Job cancelled before fetching property details for {brand_name}")
                        return
                    property_details = await ga4_client.get_property_details(property_id)
                    if sync_job_service.is_cancelled(job_id):
                        logger.info(f"[Job {job_id}] Job cancelled after fetching property details for {brand_name}")
                        return
                    if property_details:
                        supabase.upsert_ga4_property_details(brand_id_val, property_id, property_details)
                    
                except Exception as e:
                    logger.warning(f"[Job {job_id}] Error storing additional GA4 data for brand {brand_id_val}: {str(e)}")
                    # Continue even if some data fails to store
                
                brand_results.append({
                    "brand_id": brand_id_val,
                    "brand_name": brand_name,
                    "property_id": property_id,
                    "status": "success",
                    "kpi_snapshot_stored": True,
                    "data_stored": {
                        "traffic_overview": total_synced.get("traffic_overview", 0),
                        "top_pages": total_synced.get("top_pages", 0),
                        "traffic_sources": total_synced.get("traffic_sources", 0),
                        "geographic": total_synced.get("geographic", 0),
                        "devices": total_synced.get("devices", 0),
                        "conversions": total_synced.get("conversions", 0),
                        "realtime": total_synced.get("realtime", 0)
                    }
                })
                total_synced["brands"] += 1
                
            except Exception as e:
                logger.error(f"[Job {job_id}] Error syncing GA4 for brand {brand_id_val}: {str(e)}")
                brand_results.append({
                    "brand_id": brand_id_val,
                    "brand_name": brand_name,
                    "status": "error",
                    "error": str(e)
                })
        
        # Check for cancellation before completing
        if sync_job_service.is_cancelled(job_id):
            logger.info(f"[Job {job_id}] Job was cancelled, not completing")
            return
        
        status = "partial" if any(r.get("status") == "error" for r in brand_results) else "success"
        
        result = {
            "status": "success",
            "message": f"Synced GA4 data for {total_synced['brands']} brand(s)",
            "date_range": {"start_date": start_date, "end_date": end_date},
            "total_synced": total_synced,
            "brand_results": brand_results
        }
        
        await sync_job_service.complete_job(job_id, result)
        
        # Log audit
        await audit_logger.log_sync(
            sync_type=AuditLogAction.SYNC_GA4,
            user_id=user_id,
            user_email=user_email,
            status=status,
            details={
                "brand_id": brand_id,
                "start_date": start_date,
                "end_date": end_date,
                "total_synced": total_synced,
                "brand_results": brand_results,
                "job_id": job_id
            },
            request=request
        )
        
    except Exception as e:
        logger.error(f"[Job {job_id}] Failed: {str(e)}")
        await sync_job_service.fail_job(job_id, str(e))
        
        await audit_logger.log_sync(
            sync_type=AuditLogAction.SYNC_GA4,
            user_id=user_id,
            user_email=user_email,
            status="error",
            error_message=str(e),
            details={"brand_id": brand_id, "job_id": job_id},
            request=request
        )
        raise


async def sync_agency_analytics_background(
    job_id: str,
    user_id: str,
    user_email: str,
    campaign_id: Optional[int] = None,
    auto_match_brands: bool = True,
    request = None
):
    """Background task to sync Agency Analytics data"""
    client = AgencyAnalyticsClient()
    supabase = SupabaseService()
    
    try:
        # Check for cancellation before starting
        if sync_job_service.is_cancelled(job_id):
            logger.info(f"[Job {job_id}] Job was cancelled before starting")
            return
        
        await sync_job_service.update_job_status(
            job_id, "running", progress=0,
            current_step="Fetching all campaigns...", total_steps=1
        )
        
        # Step 1: Get all campaigns and update them in database first
        if campaign_id:
            campaign = await client.get_campaign(campaign_id)
            campaigns = [campaign] if campaign else []
        else:
            campaigns = await client.get_all_campaigns()
        
        # Check for cancellation after fetching campaigns
        if sync_job_service.is_cancelled(job_id):
            logger.info(f"[Job {job_id}] Job cancelled after fetching campaigns")
            return
        
        # Filter out None campaigns
        campaigns = [c for c in campaigns if c is not None]
        total_campaigns = len(campaigns)
        
        if total_campaigns == 0:
            raise Exception("No campaigns found to sync")
        
        # Step 1: Update all campaigns in database
        await sync_job_service.update_job_status(
            job_id, "running", progress=5,
            current_step=f"Updating {total_campaigns} campaigns in database...", total_steps=1
        )
        
        total_synced = {
            "campaigns": 0,
            "clients": 0,
            "rankings": 0,
            "keywords": 0,
            "keyword_rankings": 0,
            "keyword_ranking_summaries": 0,
            "brand_links": 0
        }
        
        # Batch upsert all campaigns
        for campaign in campaigns:
            # Check for cancellation before each campaign
            if sync_job_service.is_cancelled(job_id):
                logger.info(f"[Job {job_id}] Job cancelled during campaign upsert")
                return
            
            try:
                # Upsert campaign
                supabase.upsert_agency_analytics_campaign(campaign)
                total_synced["campaigns"] += 1
            except Exception as e:
                logger.warning(f"Error upserting campaign {campaign.get('id')}: {str(e)}")
        
        # Step 2: Filter to only active campaigns and batch create/update clients
        active_campaigns = [c for c in campaigns if c.get("status", "").lower() == "active"]
        active_count = len(active_campaigns)
        
        logger.info(f"Total campaigns: {total_campaigns}, Active campaigns: {active_count}")
        
        # Batch create/update clients from active campaigns
        if active_campaigns:
            await sync_job_service.update_job_status(
                job_id, "running", progress=10,
                current_step=f"Creating/updating clients from {active_count} active campaigns...", total_steps=1
            )
            try:
                client_results = supabase.upsert_clients_from_campaigns_batch(active_campaigns, user_email)
                total_synced["clients"] = client_results.get("total", 0)
                logger.info(f"Batch processed clients: {client_results.get('created', 0)} created, {client_results.get('updated', 0)} updated, {client_results.get('linked', 0)} campaign links")
            except Exception as client_error:
                logger.error(f"Error batch creating/updating clients: {str(client_error)}")
                # Continue even if client creation fails
        
        if active_count == 0:
            # Check for cancellation before completing
            if sync_job_service.is_cancelled(job_id):
                logger.info(f"[Job {job_id}] Job was cancelled")
                return
            result = {
                "status": "success",
                "message": f"Updated {total_synced['campaigns']} campaigns. No active campaigns to sync data for.",
                "total_synced": total_synced,
                "campaign_results": []
            }
            await sync_job_service.complete_job(job_id, result)
            return
        
        campaign_results = []
        
        # Calculate steps: rankings + keywords + keyword rankings for active campaigns
        total_steps = active_count * 3  # Each active campaign: rankings, keywords, keyword_rankings
        current_step_num = 0
        
        # Step 3: Fetch data only for active campaigns
        for idx, campaign in enumerate(active_campaigns):
            # Check for cancellation before each campaign
            if sync_job_service.is_cancelled(job_id):
                logger.info(f"[Job {job_id}] Job cancelled during Agency Analytics data fetch")
                return
            
            campaign_id_val = campaign.get("id")
            company_name = campaign.get("company", "Unknown")
            
            try:
                # Collect all data for this campaign before pushing
                campaign_data_batch = {
                    "rankings": [],
                    "keywords": [],
                    "keyword_rankings": [],
                    "keyword_summaries": []
                }
                
                # Step 3a: Fetch campaign rankings
                current_step_num += 1
                progress = 10 + int((current_step_num / total_steps) * 80)
                await sync_job_service.update_job_status(
                    job_id, "running", progress=progress,
                    current_step=f"[{idx + 1}/{active_count}] Fetching rankings for: {company_name}..."
                )
                
                if sync_job_service.is_cancelled(job_id):
                    logger.info(f"[Job {job_id}] Job cancelled before fetching rankings for {company_name}")
                    return
                
                rankings = await client.get_campaign_rankings(campaign_id_val)
                
                if sync_job_service.is_cancelled(job_id):
                    logger.info(f"[Job {job_id}] Job cancelled after fetching rankings for {company_name}")
                    return
                if rankings:
                    formatted_rankings = client.format_rankings_data(rankings, campaign)
                    campaign_data_batch["rankings"] = formatted_rankings
                
                # Step 3b: Fetch keywords
                current_step_num += 1
                progress = 10 + int((current_step_num / total_steps) * 80)
                await sync_job_service.update_job_status(
                    job_id, "running", progress=progress,
                    current_step=f"[{idx + 1}/{active_count}] Fetching keywords for: {company_name}..."
                )
                
                if sync_job_service.is_cancelled(job_id):
                    logger.info(f"[Job {job_id}] Job cancelled before fetching keywords for {company_name}")
                    return
                
                keywords = await client.get_all_campaign_keywords(campaign_id_val)
                
                if sync_job_service.is_cancelled(job_id):
                    logger.info(f"[Job {job_id}] Job cancelled after fetching keywords for {company_name}")
                    return
                
                if keywords:
                    formatted_keywords = client.format_keywords_data(keywords)
                    campaign_data_batch["keywords"] = formatted_keywords
                    
                    # Step 3c: Fetch keyword rankings
                    current_step_num += 1
                    progress = 10 + int((current_step_num / total_steps) * 80)
                    await sync_job_service.update_job_status(
                        job_id, "running", progress=progress,
                        current_step=f"[{idx + 1}/{active_count}] Fetching keyword rankings for: {company_name}..."
                    )
                    
                    for keyword in formatted_keywords:
                        # Check for cancellation before each keyword
                        if sync_job_service.is_cancelled(job_id):
                            logger.info(f"[Job {job_id}] Job cancelled during keyword rankings fetch for {company_name}")
                            return
                        
                        keyword_id = keyword.get("id")
                        keyword_phrase = keyword.get("keyword_phrase", "")
                        
                        try:
                            keyword_rankings = await client.get_keyword_rankings(keyword_id)
                            
                            if sync_job_service.is_cancelled(job_id):
                                logger.info(f"[Job {job_id}] Job cancelled after fetching rankings for keyword {keyword_id}")
                                return
                            if keyword_rankings:
                                daily_records, summary = client.format_keyword_rankings_data(
                                    keyword_rankings, keyword_id, campaign_id_val, keyword_phrase
                                )
                                
                                if daily_records:
                                    campaign_data_batch["keyword_rankings"].extend(daily_records)
                                
                                if summary:
                                    campaign_data_batch["keyword_summaries"].append(summary)
                        except Exception as keyword_error:
                            logger.warning(f"Error syncing keyword rankings for keyword {keyword_id}: {str(keyword_error)}")
                            continue
                else:
                    # No keywords, but still count as a step
                    current_step_num += 1
                
                # Step 4: Push all data for this campaign at once
                await sync_job_service.update_job_status(
                    job_id, "running", progress=10 + int((current_step_num / total_steps) * 80),
                    current_step=f"[{idx + 1}/{active_count}] Saving data for: {company_name}..."
                )
                
                # Batch upsert all data for this campaign
                if campaign_data_batch["rankings"]:
                    count = supabase.upsert_agency_analytics_rankings(campaign_data_batch["rankings"])
                    total_synced["rankings"] += count
                
                if campaign_data_batch["keywords"]:
                    count = supabase.upsert_agency_analytics_keywords(campaign_data_batch["keywords"])
                    total_synced["keywords"] += count
                
                if campaign_data_batch["keyword_rankings"]:
                    count = supabase.upsert_agency_analytics_keyword_rankings(campaign_data_batch["keyword_rankings"])
                    total_synced["keyword_rankings"] += count
                
                if campaign_data_batch["keyword_summaries"]:
                    count = supabase.upsert_agency_analytics_keyword_ranking_summaries_batch(campaign_data_batch["keyword_summaries"])
                    total_synced["keyword_ranking_summaries"] += count
                
                campaign_results.append({
                    "campaign_id": campaign_id_val,
                    "company": company_name,
                    "status": "success"
                })
                
            except Exception as campaign_error:
                logger.error(f"Error syncing campaign {campaign_id_val}: {str(campaign_error)}")
                campaign_results.append({
                    "campaign_id": campaign_id_val,
                    "company": company_name,
                    "status": "error",
                    "error": str(campaign_error)
                })
                continue
        
        # Step 5: Auto-match campaigns to brands
        if auto_match_brands:
            await sync_job_service.update_job_status(
                job_id, "running", progress=90,
                current_step="Auto-matching campaigns to brands..."
            )
            
            try:
                # Check for cancellation before auto-matching
                if sync_job_service.is_cancelled(job_id):
                    logger.info(f"[Job {job_id}] Job cancelled before auto-matching")
                    return
                
                # Get all brands
                brands_result = supabase.client.table("brands").select("*").execute()
                brands = brands_result.data if hasattr(brands_result, 'data') else []
                
                # Get all campaigns
                campaigns_result = supabase.client.table("agency_analytics_campaigns").select("*").execute()
                all_campaigns = campaigns_result.data if hasattr(campaigns_result, 'data') else []
                
                # Match campaigns to brands
                for campaign in all_campaigns:
                    # Check for cancellation during matching
                    if sync_job_service.is_cancelled(job_id):
                        logger.info(f"[Job {job_id}] Job cancelled during auto-matching")
                        return
                    for brand in brands:
                        match_result = client.match_campaign_to_brand(campaign, brand)
                        if match_result:
                            try:
                                supabase.link_campaign_to_brand(
                                    match_result["campaign_id"],
                                    match_result["brand_id"],
                                    match_result["match_method"],
                                    match_result["match_confidence"]
                                )
                                total_synced["brand_links"] += 1
                            except Exception as link_error:
                                logger.warning(f"Error linking campaign {match_result['campaign_id']} to brand {match_result['brand_id']}: {str(link_error)}")
                                continue
            except Exception as match_error:
                logger.warning(f"Error during auto-matching: {str(match_error)}")
        
        # Check for cancellation before completing
        if sync_job_service.is_cancelled(job_id):
            logger.info(f"[Job {job_id}] Job was cancelled, not completing")
            return
        
        status = "success"
        
        result = {
            "status": "success",
            "message": f"Synced Agency Analytics data for {len(campaign_results)} campaign(s)",
            "total_synced": total_synced,
            "campaign_results": campaign_results
        }
        
        await sync_job_service.complete_job(job_id, result)
        
        # Log audit
        await audit_logger.log_sync(
            sync_type=AuditLogAction.SYNC_AGENCY_ANALYTICS,
            user_id=user_id,
            user_email=user_email,
            status=status,
            details={
                "campaign_id": campaign_id,
                "auto_match_brands": auto_match_brands,
                "total_synced": total_synced,
                "campaign_results": campaign_results,
                "job_id": job_id
            },
            request=request
        )
        
    except Exception as e:
        logger.error(f"[Job {job_id}] Failed: {str(e)}")
        await sync_job_service.fail_job(job_id, str(e))
        
        await audit_logger.log_sync(
            sync_type=AuditLogAction.SYNC_AGENCY_ANALYTICS,
            user_id=user_id,
            user_email=user_email,
            status="error",
            error_message=str(e),
            details={"campaign_id": campaign_id, "job_id": job_id},
            request=request
        )
        raise

