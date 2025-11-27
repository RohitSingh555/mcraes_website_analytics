"""
Google Analytics 4 API Client
Handles all GA4 API interactions for multi-property reporting
"""
import httpx
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from google.analytics.data_v1beta import BetaAnalyticsDataClient
from google.analytics.data_v1beta.types import (
    RunReportRequest,
    DateRange,
    Dimension,
    Metric,
    FilterExpression,
    Filter,
    RunRealtimeReportRequest,
    OrderBy,
)
from google.analytics.admin_v1beta import AnalyticsAdminServiceClient
from google.analytics.admin_v1beta.types import ListPropertiesRequest
from google.auth import default
from google.oauth2 import service_account
from google.auth.credentials import Credentials as GoogleCredentials
from google.auth.transport.requests import Request
import os
from app.core.config import settings
from app.services.ga4_token_service import GA4TokenService

logger = logging.getLogger(__name__)

class AccessTokenCredentials(GoogleCredentials):
    """Custom credentials class that uses a stored access token"""
    
    def __init__(self, token: str):
        self.token = token
        self.expired = False
    
    def refresh(self, request: Request):
        """Access tokens can't be refreshed this way - need to regenerate"""
        self.expired = True
        raise ValueError("Access token expired. Please regenerate using generate_ga4_token.py")

class GA4APIClient:
    """Client for interacting with Google Analytics 4 API"""
    
    def __init__(self):
        self.credentials_path = settings.GA4_CREDENTIALS_PATH
        self.scopes = settings.GA4_SCOPES
        self._data_client = None
        self._admin_client = None
        self._use_token = True  # Prefer stored tokens over service account
    
    def _get_credentials(self):
        """Get Google Analytics credentials - prefer stored tokens"""
        # First, try to use stored access token
        if self._use_token:
            access_token = GA4TokenService.get_access_token()
            if access_token:
                try:
                    credentials = AccessTokenCredentials(token=access_token)
                    logger.debug("Using stored access token for GA4 API")
                    return credentials
                except Exception as e:
                    logger.warning(f"Failed to use stored token: {e}, falling back to service account")
        
        # Fallback to service account credentials
        if self.credentials_path and os.path.exists(self.credentials_path):
            logger.debug("Using service account credentials for GA4 API")
            return service_account.Credentials.from_service_account_file(
                self.credentials_path,
                scopes=self.scopes
            )
        else:
            # Try to use default credentials (for GCP environments)
            logger.debug("Using default credentials for GA4 API")
            credentials, _ = default(scopes=self.scopes)
            return credentials
    
    def _get_data_client(self):
        """Get or create Analytics Data API client"""
        if self._data_client is None:
            credentials = self._get_credentials()
            self._data_client = BetaAnalyticsDataClient(credentials=credentials)
        return self._data_client
    
    def _get_admin_client(self):
        """Get or create Analytics Admin API client"""
        if self._admin_client is None:
            credentials = self._get_credentials()
            self._admin_client = AnalyticsAdminServiceClient(credentials=credentials)
        return self._admin_client
    
    # 1. Website Traffic Overview API
    async def get_traffic_overview(
        self,
        property_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict:
        """Get high-level visitor metrics"""
        try:
            if not start_date:
                start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            if not end_date:
                end_date = datetime.now().strftime("%Y-%m-%d")
            
            client = self._get_data_client()
            
            request = RunReportRequest(
                property=f"properties/{property_id}",
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                dimensions=[
                    Dimension(name="date"),
                ],
                metrics=[
                    Metric(name="activeUsers"),
                    Metric(name="sessions"),
                    Metric(name="newUsers"),
                    Metric(name="bounceRate"),
                    Metric(name="averageSessionDuration"),
                    Metric(name="engagedSessions"),
                    Metric(name="engagementRate"),
                ],
            )
            
            response = client.run_report(request)
            
            # Aggregate totals
            totals = {
                "users": 0,
                "sessions": 0,
                "newUsers": 0,
                "bounceRate": 0,
                "averageSessionDuration": 0,
                "engagedSessions": 0,
                "engagementRate": 0,
            }
            
            count = 0
            for row in response.rows:
                for i, metric_value in enumerate(row.metric_values):
                    metric_name = request.metrics[i].name
                    value = float(metric_value.value)
                    if metric_name == "activeUsers":
                        totals["users"] += int(value)
                    elif metric_name == "sessions":
                        totals["sessions"] += int(value)
                    elif metric_name == "newUsers":
                        totals["newUsers"] += int(value)
                    elif metric_name == "bounceRate":
                        totals["bounceRate"] += value
                    elif metric_name == "averageSessionDuration":
                        totals["averageSessionDuration"] += value
                    elif metric_name == "engagedSessions":
                        totals["engagedSessions"] += int(value)
                    elif metric_name == "engagementRate":
                        totals["engagementRate"] += value
                count += 1
            
            if count > 0:
                totals["bounceRate"] = totals["bounceRate"] / count
                totals["averageSessionDuration"] = totals["averageSessionDuration"] / count
                totals["engagementRate"] = totals["engagementRate"] / count
            
            # Store daily breakdown for later use
            daily_data = []
            for row in response.rows:
                date_str = row.dimension_values[0].value  # First dimension is date
                daily_record = {
                    "date": date_str,
                    "users": 0,
                    "sessions": 0,
                    "newUsers": 0,
                    "bounceRate": 0,
                    "averageSessionDuration": 0,
                    "engagedSessions": 0,
                    "engagementRate": 0,
                }
                for i, metric_value in enumerate(row.metric_values):
                    metric_name = request.metrics[i].name
                    value = float(metric_value.value)
                    if metric_name == "activeUsers":
                        daily_record["users"] = int(value)
                    elif metric_name == "sessions":
                        daily_record["sessions"] = int(value)
                    elif metric_name == "newUsers":
                        daily_record["newUsers"] = int(value)
                    elif metric_name == "bounceRate":
                        daily_record["bounceRate"] = value
                    elif metric_name == "averageSessionDuration":
                        daily_record["averageSessionDuration"] = value
                    elif metric_name == "engagedSessions":
                        daily_record["engagedSessions"] = int(value)
                    elif metric_name == "engagementRate":
                        daily_record["engagementRate"] = value
                daily_data.append(daily_record)
            
            # Add daily_data to totals for storage
            totals["daily_data"] = daily_data
            
            # Calculate month-over-month comparison
            # Get previous period data for comparison
            # Use the same duration as current period (not a fixed 60-day lookback)
            start_dt = datetime.strptime(start_date, "%Y-%m-%d")
            end_dt = datetime.strptime(end_date, "%Y-%m-%d")
            period_duration = (end_dt - start_dt).days + 1  # Include both start and end dates
            prev_end = (start_dt - timedelta(days=1)).strftime("%Y-%m-%d")
            prev_start = (start_dt - timedelta(days=period_duration)).strftime("%Y-%m-%d")
            
            logger.info(f"[GA4 CLIENT] get_traffic_overview - Calculating change using same-duration period")
            logger.info(f"[GA4 CLIENT] Current period: {start_date} to {end_date} (duration: {period_duration} days)")
            logger.info(f"[GA4 CLIENT] Previous period: {prev_start} to {prev_end} (duration: {period_duration} days)")
            logger.info(f"[GA4 CLIENT] Current values - users: {totals.get('users')}, sessions: {totals.get('sessions')}, newUsers: {totals.get('newUsers')}")
            
            try:
                logger.info(f"[GA4 CLIENT] Making API call to Google Analytics Data API for previous period")
                logger.info(f"[GA4 CLIENT] API Request: RunReportRequest with property={property_id}, date_range={prev_start} to {prev_end}")
                prev_request = RunReportRequest(
                    property=f"properties/{property_id}",
                    date_ranges=[DateRange(start_date=prev_start, end_date=prev_end)],
                    dimensions=[Dimension(name="date")],
                    metrics=[
                        Metric(name="sessions"),
                        Metric(name="engagedSessions"),
                        Metric(name="averageSessionDuration"),
                        Metric(name="engagementRate"),
                    ],
                )
                prev_response = client.run_report(prev_request)
                logger.info(f"[GA4 CLIENT] Previous period API response received")
                
                prev_totals = {
                    "sessions": 0,
                    "engagedSessions": 0,
                    "averageSessionDuration": 0,
                    "engagementRate": 0,
                }
                prev_count = 0
                for row in prev_response.rows:
                    for i, metric_value in enumerate(row.metric_values):
                        metric_name = prev_request.metrics[i].name
                        value = float(metric_value.value)
                        if metric_name == "sessions":
                            prev_totals["sessions"] += int(value)
                        elif metric_name == "engagedSessions":
                            prev_totals["engagedSessions"] += int(value)
                        elif metric_name == "averageSessionDuration":
                            prev_totals["averageSessionDuration"] += value
                        elif metric_name == "engagementRate":
                            prev_totals["engagementRate"] += value
                    prev_count += 1
                
                if prev_count > 0:
                    prev_totals["averageSessionDuration"] = prev_totals["averageSessionDuration"] / prev_count
                    prev_totals["engagementRate"] = prev_totals["engagementRate"] / prev_count
                
                # Calculate percentage changes
                logger.info(f"[GA4 CLIENT] Previous period values - sessions: {prev_totals.get('sessions')}, engagedSessions: {prev_totals.get('engagedSessions')}")
                
                if prev_totals["sessions"] > 0:
                    totals["sessionsChange"] = ((totals["sessions"] - prev_totals["sessions"]) / prev_totals["sessions"]) * 100
                    logger.info(f"[GA4 CLIENT] sessionsChange calculated (same-duration period): {totals['sessionsChange']}%")
                    logger.info(f"[GA4 CLIENT] Formula: (({totals['sessions']} - {prev_totals['sessions']}) / {prev_totals['sessions']}) * 100")
                else:
                    totals["sessionsChange"] = 0
                    logger.info(f"[GA4 CLIENT] sessionsChange set to 0 (no previous sessions)")
                
                if prev_totals["engagedSessions"] > 0:
                    totals["engagedSessionsChange"] = ((totals["engagedSessions"] - prev_totals["engagedSessions"]) / prev_totals["engagedSessions"]) * 100
                    logger.info(f"[GA4 CLIENT] engagedSessionsChange calculated: {totals['engagedSessionsChange']}%")
                else:
                    totals["engagedSessionsChange"] = 0
                
                if prev_totals["averageSessionDuration"] > 0:
                    totals["avgSessionDurationChange"] = ((totals["averageSessionDuration"] - prev_totals["averageSessionDuration"]) / prev_totals["averageSessionDuration"]) * 100
                    logger.info(f"[GA4 CLIENT] avgSessionDurationChange calculated: {totals['avgSessionDurationChange']}%")
                else:
                    totals["avgSessionDurationChange"] = 0
                
                if prev_totals["engagementRate"] > 0:
                    totals["engagementRateChange"] = ((totals["engagementRate"] - prev_totals["engagementRate"]) / prev_totals["engagementRate"]) * 100
                    logger.info(f"[GA4 CLIENT] engagementRateChange calculated: {totals['engagementRateChange']}%")
                else:
                    totals["engagementRateChange"] = 0
            except Exception as e:
                logger.warning(f"Could not fetch previous period data for comparison: {str(e)}")
                totals["sessionsChange"] = 0
                totals["engagedSessionsChange"] = 0
                totals["avgSessionDurationChange"] = 0
                totals["engagementRateChange"] = 0
            
            return totals
        except Exception as e:
            logger.error(f"Error fetching traffic overview: {str(e)}")
            raise
    
    # 2. Top Performing Pages API
    async def get_top_pages(
        self,
        property_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        """Get top performing pages"""
        try:
            if not start_date:
                start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            if not end_date:
                end_date = datetime.now().strftime("%Y-%m-%d")
            
            client = self._get_data_client()
            
            request = RunReportRequest(
                property=f"properties/{property_id}",
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                dimensions=[Dimension(name="pagePath")],
                metrics=[
                    Metric(name="screenPageViews"),
                    Metric(name="activeUsers"),
                    Metric(name="averageSessionDuration"),
                ],
                limit=limit,
                order_bys=[
                    OrderBy(
                        metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"),
                        desc=True
                    )
                ],
            )
            
            response = client.run_report(request)
            
            pages = []
            for row in response.rows:
                pages.append({
                    "pagePath": row.dimension_values[0].value,
                    "views": int(row.metric_values[0].value),
                    "users": int(row.metric_values[1].value),
                    "avgSessionDuration": float(row.metric_values[2].value),
                })
            
            return pages
        except Exception as e:
            logger.error(f"Error fetching top pages: {str(e)}")
            raise
    
    # 3. Traffic Sources (Acquisition) API
    async def get_traffic_sources(
        self,
        property_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict]:
        """Get traffic sources breakdown"""
        try:
            if not start_date:
                start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            if not end_date:
                end_date = datetime.now().strftime("%Y-%m-%d")
            
            client = self._get_data_client()
            
            request = RunReportRequest(
                property=f"properties/{property_id}",
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                dimensions=[Dimension(name="sessionSourceMedium")],
                metrics=[
                    Metric(name="sessions"),
                    Metric(name="activeUsers"),
                    Metric(name="bounceRate"),
                    Metric(name="conversions"),  # New: Add conversions metric
                ],
                order_bys=[
                    OrderBy(
                        metric=OrderBy.MetricOrderBy(metric_name="sessions"),
                        desc=True
                    )
                ],
            )
            
            response = client.run_report(request)
            
            sources = []
            for row in response.rows:
                sessions = int(row.metric_values[0].value)
                conversions = float(row.metric_values[3].value) if len(row.metric_values) > 3 else 0
                conversion_rate = (conversions / sessions * 100) if sessions > 0 else 0
                
                sources.append({
                    "source": row.dimension_values[0].value,
                    "sessions": sessions,
                    "users": int(row.metric_values[1].value),
                    "bounceRate": float(row.metric_values[2].value),
                    "conversions": conversions,  # New: Conversions count
                    "conversionRate": conversion_rate,  # New: Conversion rate per source
                })
            
            return sources
        except Exception as e:
            logger.error(f"Error fetching traffic sources: {str(e)}")
            raise
    
    # 4. Geographic Breakdown API
    async def get_geographic_breakdown(
        self,
        property_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict]:
        """Get geographic breakdown by country"""
        try:
            if not start_date:
                start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            if not end_date:
                end_date = datetime.now().strftime("%Y-%m-%d")
            
            client = self._get_data_client()
            
            request = RunReportRequest(
                property=f"properties/{property_id}",
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                dimensions=[Dimension(name="country")],
                metrics=[
                    Metric(name="activeUsers"),
                    Metric(name="sessions"),
                    Metric(name="engagementRate"),  # New: Add engagement rate metric
                ],
                limit=limit,
                order_bys=[
                    OrderBy(
                        metric=OrderBy.MetricOrderBy(metric_name="activeUsers"),
                        desc=True
                    )
                ],
            )
            
            response = client.run_report(request)
            
            countries = []
            for row in response.rows:
                countries.append({
                    "country": row.dimension_values[0].value,
                    "users": int(row.metric_values[0].value),
                    "sessions": int(row.metric_values[1].value),
                    "engagementRate": float(row.metric_values[2].value) if len(row.metric_values) > 2 else 0,  # New: Engagement rate per country
                })
            
            return countries
        except Exception as e:
            logger.error(f"Error fetching geographic breakdown: {str(e)}")
            raise
    
    # 5. Device & Platform Insights API
    async def get_device_breakdown(
        self,
        property_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict]:
        """Get device and platform breakdown"""
        try:
            if not start_date:
                start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            if not end_date:
                end_date = datetime.now().strftime("%Y-%m-%d")
            
            client = self._get_data_client()
            
            request = RunReportRequest(
                property=f"properties/{property_id}",
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                dimensions=[
                    Dimension(name="deviceCategory"),
                    Dimension(name="operatingSystem"),
                ],
                metrics=[
                    Metric(name="activeUsers"),
                    Metric(name="sessions"),
                    Metric(name="bounceRate"),
                ],
            )
            
            response = client.run_report(request)
            
            devices = []
            for row in response.rows:
                devices.append({
                    "deviceCategory": row.dimension_values[0].value,
                    "operatingSystem": row.dimension_values[1].value,
                    "users": int(row.metric_values[0].value),
                    "sessions": int(row.metric_values[1].value),
                    "bounceRate": float(row.metric_values[2].value),
                })
            
            return devices
        except Exception as e:
            logger.error(f"Error fetching device breakdown: {str(e)}")
            raise
    
    # 6. Conversion & Goal Tracking API
    async def get_conversions(
        self,
        property_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> List[Dict]:
        """Get conversion events"""
        try:
            if not start_date:
                start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            if not end_date:
                end_date = datetime.now().strftime("%Y-%m-%d")
            
            client = self._get_data_client()
            
            request = RunReportRequest(
                property=f"properties/{property_id}",
                date_ranges=[DateRange(start_date=start_date, end_date=end_date)],
                dimensions=[Dimension(name="eventName")],
                metrics=[
                    Metric(name="eventCount"),
                    Metric(name="totalUsers"),
                ],
                dimension_filter=FilterExpression(
                    filter=Filter(
                        field_name="eventName",
                        string_filter=Filter.StringFilter(
                            match_type=Filter.StringFilter.MatchType.CONTAINS,
                            value="conversion"
                        )
                    )
                ),
            )
            
            response = client.run_report(request)
            
            conversions = []
            for row in response.rows:
                conversions.append({
                    "eventName": row.dimension_values[0].value,
                    "count": int(row.metric_values[0].value),
                    "users": int(row.metric_values[1].value),
                })
            
            return conversions
        except Exception as e:
            logger.error(f"Error fetching conversions: {str(e)}")
            raise
    
    # 7. Realtime Snapshot API
    async def get_realtime_snapshot(self, property_id: str) -> Dict:
        """Get realtime data snapshot"""
        try:
            client = self._get_data_client()
            
            # Realtime API doesn't support pagePath dimension, use city or other supported dimensions
            request = RunRealtimeReportRequest(
                property=f"properties/{property_id}",
                dimensions=[],  # No dimensions for now - just get total active users
                metrics=[
                    Metric(name="activeUsers"),
                ],
            )
            
            response = client.run_realtime_report(request)
            
            active_users = 0
            active_pages = []
            
            # Get total active users
            if response.rows:
                for row in response.rows:
                    active_users += int(row.metric_values[0].value)
            
            # Try to get active pages with a different approach (using pageTitle or screenClass)
            try:
                page_request = RunRealtimeReportRequest(
                    property=f"properties/{property_id}",
                    dimensions=[Dimension(name="pageTitle")],  # Use pageTitle instead of pagePath
                    metrics=[Metric(name="activeUsers")],
                    limit=10
                )
                page_response = client.run_realtime_report(page_request)
                
                for row in page_response.rows:
                    if row.dimension_values[0].value:
                        active_pages.append({
                            "pagePath": row.dimension_values[0].value,  # Actually pageTitle
                            "activeUsers": int(row.metric_values[0].value),
                        })
            except Exception as page_error:
                logger.warning(f"Could not fetch active pages: {str(page_error)}")
                # Continue without pages
            
            return {
                "totalActiveUsers": active_users,
                "activePages": active_pages[:10],  # Top 10 active pages
            }
        except Exception as e:
            logger.error(f"Error fetching realtime snapshot: {str(e)}")
            raise
    
    # 8. Property Details API
    async def get_property_details(self, property_id: str) -> Dict:
        """Get property configuration details"""
        try:
            client = self._get_admin_client()
            property_name = f"properties/{property_id}"
            
            property_obj = client.get_property(name=property_name)
            
            return {
                "propertyId": property_id,
                "displayName": property_obj.display_name,
                "timeZone": property_obj.time_zone,
                "currencyCode": property_obj.currency_code,
                "createTime": property_obj.create_time.isoformat() if property_obj.create_time else None,
            }
        except Exception as e:
            logger.error(f"Error fetching property details: {str(e)}")
            raise
    
    # 9. Conversion Configuration API
    async def get_conversion_events(self, property_id: str) -> List[Dict]:
        """Get conversion events configuration"""
        try:
            client = self._get_admin_client()
            property_name = f"properties/{property_id}"
            
            conversion_events = client.list_conversion_events(parent=property_name)
            
            events = []
            for event in conversion_events:
                events.append({
                    "eventName": event.event_name,
                    "createTime": event.create_time.isoformat() if event.create_time else None,
                    "deletable": event.deletable,
                    "custom": event.custom,
                })
            
            return events
        except Exception as e:
            logger.error(f"Error fetching conversion events: {str(e)}")
            raise
    
    # 10. Data Streams API
    async def get_data_streams(self, property_id: str) -> List[Dict]:
        """Get data streams for a property"""
        try:
            client = self._get_admin_client()
            property_name = f"properties/{property_id}"
            
            streams = client.list_data_streams(parent=property_name)
            
            stream_list = []
            for stream in streams:
                stream_list.append({
                    "streamId": stream.name.split("/")[-1],
                    "displayName": stream.display_name,
                    "type": stream.type_.name if stream.type_ else None,
                    "createTime": stream.create_time.isoformat() if stream.create_time else None,
                })
            
            return stream_list
        except Exception as e:
            logger.error(f"Error fetching data streams: {str(e)}")
            raise
    
    # 11. Custom Dimensions API
    async def get_custom_dimensions(self, property_id: str) -> List[Dict]:
        """Get custom dimensions"""
        try:
            client = self._get_admin_client()
            property_name = f"properties/{property_id}"
            
            dimensions = client.list_custom_dimensions(parent=property_name)
            
            dim_list = []
            for dim in dimensions:
                dim_list.append({
                    "parameterName": dim.parameter_name,
                    "displayName": dim.display_name,
                    "description": dim.description,
                    "scope": dim.scope.name if dim.scope else None,
                })
            
            return dim_list
        except Exception as e:
            logger.error(f"Error fetching custom dimensions: {str(e)}")
            raise
    
    # 12. Custom Metrics API
    async def get_custom_metrics(self, property_id: str) -> List[Dict]:
        """Get custom metrics"""
        try:
            client = self._get_admin_client()
            property_name = f"properties/{property_id}"
            
            metrics = client.list_custom_metrics(parent=property_name)
            
            metric_list = []
            for metric in metrics:
                metric_list.append({
                    "parameterName": metric.parameter_name,
                    "displayName": metric.display_name,
                    "description": metric.description,
                    "measurementUnit": metric.measurement_unit.name if metric.measurement_unit else None,
                })
            
            return metric_list
        except Exception as e:
            logger.error(f"Error fetching custom metrics: {str(e)}")
            raise
    
    # 13. Audiences API
    async def get_audiences(self, property_id: str) -> List[Dict]:
        """Get audiences configuration"""
        try:
            client = self._get_admin_client()
            property_name = f"properties/{property_id}"
            
            audiences = client.list_audiences(parent=property_name)
            
            audience_list = []
            for audience in audiences:
                audience_list.append({
                    "audienceId": audience.name.split("/")[-1],
                    "displayName": audience.display_name,
                    "description": audience.description,
                    "membershipDurationDays": audience.membership_duration_days,
                })
            
            return audience_list
        except Exception as e:
            logger.error(f"Error fetching audiences: {str(e)}")
            raise
    
    # 14. Account Summaries API
    async def get_account_summaries(self) -> List[Dict]:
        """Get all accessible accounts and properties"""
        try:
            client = self._get_admin_client()
            
            summaries = client.list_account_summaries()
            
            account_list = []
            for summary in summaries:
                for property_summary in summary.property_summaries:
                    account_list.append({
                        "accountId": summary.account.split("/")[-1],
                        "accountDisplayName": summary.display_name,
                        "propertyId": property_summary.property.split("/")[-1],
                        "propertyDisplayName": property_summary.display_name,
                    })
            
            return account_list
        except Exception as e:
            logger.error(f"Error fetching account summaries: {str(e)}")
            raise
    
    # 15. Metadata API
    async def get_metadata(self, property_id: str) -> Dict:
        """Get available metrics and dimensions"""
        try:
            client = self._get_data_client()
            property_name = f"properties/{property_id}"
            
            metadata = client.get_metadata(name=property_name)
            
            dimensions = []
            for dim in metadata.dimensions:
                dimensions.append({
                    "apiName": dim.api_name,
                    "uiName": dim.ui_name,
                    "description": dim.description,
                    "category": dim.category,
                })
            
            metrics = []
            for metric in metadata.metrics:
                metrics.append({
                    "apiName": metric.api_name,
                    "uiName": metric.ui_name,
                    "description": metric.description,
                    "type": metric.type_.name if metric.type_ else None,
                })
            
            return {
                "dimensions": dimensions,
                "metrics": metrics,
            }
        except Exception as e:
            logger.error(f"Error fetching metadata: {str(e)}")
            raise
    
    # Comprehensive method to get all GA4 data for a property
    async def get_all_analytics(
        self,
        property_id: str,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict:
        """Get comprehensive GA4 analytics for a property"""
        try:
            if not start_date:
                start_date = (datetime.now() - timedelta(days=30)).strftime("%Y-%m-%d")
            if not end_date:
                end_date = datetime.now().strftime("%Y-%m-%d")
            
            # Fetch all data in parallel where possible
            traffic_overview = await self.get_traffic_overview(property_id, start_date, end_date)
            top_pages = await self.get_top_pages(property_id, start_date, end_date, limit=10)
            traffic_sources = await self.get_traffic_sources(property_id, start_date, end_date)
            geographic = await self.get_geographic_breakdown(property_id, start_date, end_date, limit=10)
            devices = await self.get_device_breakdown(property_id, start_date, end_date)
            conversions = await self.get_conversions(property_id, start_date, end_date)
            realtime = await self.get_realtime_snapshot(property_id)
            property_details = await self.get_property_details(property_id)
            
            return {
                "trafficOverview": traffic_overview,
                "topPages": top_pages,
                "trafficSources": traffic_sources,
                "geographic": geographic,
                "devices": devices,
                "conversions": conversions,
                "realtime": realtime,
                "propertyDetails": property_details,
                "dateRange": {
                    "startDate": start_date,
                    "endDate": end_date,
                },
            }
        except Exception as e:
            logger.error(f"Error fetching all analytics: {str(e)}")
            raise

