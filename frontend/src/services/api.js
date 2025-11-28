import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname
      // Don't redirect if on public routes (login, signup, or public reporting)
      const isPublicRoute = 
        currentPath === '/login' || 
        currentPath === '/signup' || 
        currentPath.startsWith('/reporting/')
      
      // Clear tokens
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
      
      // Only redirect if not on a public route
      if (!isPublicRoute) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Sync API endpoints
export const syncAPI = {
  // Get sync status
  getStatus: async () => {
    const response = await api.get('/api/v1/sync/status')
    return response.data
  },

  // Sync brands
  syncBrands: async () => {
    const response = await api.post('/api/v1/sync/brands')
    return response.data
  },

  // Sync prompts
  syncPrompts: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.brand_id) params.append('brand_id', filters.brand_id)
    if (filters.stage) params.append('stage', filters.stage)
    if (filters.persona_id) params.append('persona_id', filters.persona_id)
    
    const response = await api.post(`/api/v1/sync/prompts?${params.toString()}`)
    return response.data
  },

  // Sync responses
  syncResponses: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.brand_id) params.append('brand_id', filters.brand_id)
    if (filters.platform) params.append('platform', filters.platform)
    if (filters.prompt_id) params.append('prompt_id', filters.prompt_id)
    if (filters.start_date) params.append('start_date', filters.start_date)
    if (filters.end_date) params.append('end_date', filters.end_date)
    
    const response = await api.post(`/api/v1/sync/responses?${params.toString()}`)
    return response.data
  },

  // Sync all Scrunch AI data (async - returns job_id)
  syncAll: async () => {
    const response = await api.post('/api/v1/sync/all')
    return response.data
  },

  // Sync GA4 data (async - returns job_id) - now uses clientId instead of brandId
  syncGA4: async (clientId = null, startDate = null, endDate = null, syncRealtime = false) => {
    const params = new URLSearchParams()
    if (clientId) params.append('client_id', clientId)
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    params.append('sync_realtime', syncRealtime)
    
    const response = await api.post(`/api/v1/sync/ga4?${params.toString()}`)
    return response.data
  },

  // Sync Agency Analytics data (async - returns job_id)
  syncAgencyAnalytics: async (campaignId = null) => {
    const params = new URLSearchParams()
    if (campaignId) params.append('campaign_id', campaignId)
    
    const response = await api.post(`/api/v1/sync/agency-analytics?${params.toString()}`)
    return response.data
  },

  // Get sync job status
  getSyncJobStatus: async (jobId) => {
    const response = await api.get(`/api/v1/sync/jobs/${jobId}`)
    return response.data
  },

  // Get active sync jobs (pending or running)
  getActiveSyncJobs: async () => {
    // Get all jobs and filter for active ones on the frontend
    const response = await api.get('/api/v1/sync/jobs?limit=100')
    const allJobs = response.data.items || []
    const activeJobs = allJobs.filter(job => 
      job.status === 'pending' || job.status === 'running'
    )
    return {
      items: activeJobs,
      count: activeJobs.length
    }
  },

  // Get user sync jobs
  getSyncJobs: async (status = null, syncType = null, limit = 50) => {
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (syncType) params.append('sync_type', syncType)
    params.append('limit', limit)
    
    const response = await api.get(`/api/v1/sync/jobs?${params.toString()}`)
    return response.data
  },

  // Cancel a sync job
  cancelSyncJob: async (jobId) => {
    const response = await api.post(`/api/v1/sync/jobs/${jobId}/cancel`)
    return response.data
  },

  getPrompts: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.brand_id) params.append('brand_id', filters.brand_id)
    if (filters.client_id) params.append('client_id', filters.client_id)  // Maps to brand_id via scrunch_brand_id
    if (filters.stage) params.append('stage', filters.stage)
    if (filters.persona_id) params.append('persona_id', filters.persona_id)
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.offset) params.append('offset', filters.offset)
    
    const response = await api.get(`/api/v1/data/prompts?${params.toString()}`)
    return response.data
  },

  getResponses: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.brand_id) params.append('brand_id', filters.brand_id)
    if (filters.client_id) params.append('client_id', filters.client_id)  // Maps to brand_id via scrunch_brand_id
    if (filters.platform) params.append('platform', filters.platform)
    if (filters.prompt_id) params.append('prompt_id', filters.prompt_id)
    if (filters.start_date) params.append('start_date', filters.start_date)
    if (filters.end_date) params.append('end_date', filters.end_date)
    if (filters.limit) params.append('limit', filters.limit)
    if (filters.offset) params.append('offset', filters.offset)
    
    const response = await api.get(`/api/v1/data/responses?${params.toString()}`)
    return response.data
  },

  // Analytics endpoints
  getBrandAnalytics: async (brandId = null) => {
    const params = new URLSearchParams()
    if (brandId) params.append('brand_id', brandId)
    
    const response = await api.get(`/api/v1/data/analytics/brands?${params.toString()}`)
    return response.data
  },

  // Database management endpoints
  addBrandIdColumns: async () => {
    const response = await api.post('/api/v1/database/migrate/add-brand-id')
    return response.data
  },

  updateBrandIds: async (brandId = null) => {
    const params = new URLSearchParams()
    if (brandId) params.append('brand_id', brandId)
    
    const response = await api.post(`/api/v1/database/update-brand-ids?${params.toString()}`)
    return response.data
  },

  verifyDatabase: async () => {
    const response = await api.post('/api/v1/database/verify')
    return response.data
  },
}

// GA4 API endpoints
export const ga4API = {
  // Get GA4 properties
  getProperties: async () => {
    const response = await api.get('/api/v1/data/ga4/properties')
    return response.data
  },

  // Get GA4 analytics for a brand
  getBrandAnalytics: async (brandId, startDate = null, endDate = null) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await api.get(`/api/v1/data/ga4/brand/${brandId}?${params.toString()}`)
    return response.data
  },

  // Get GA4 analytics for a client (new client-centric endpoint)
  getClientAnalytics: async (clientId, startDate = null, endDate = null) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await api.get(`/api/v1/data/ga4/client/${clientId}?${params.toString()}`)
    return response.data
  },

  // Get traffic overview
  getTrafficOverview: async (propertyId, startDate = null, endDate = null) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await api.get(`/api/v1/data/ga4/traffic-overview/${propertyId}?${params.toString()}`)
    return response.data
  },

  // Get top pages
  getTopPages: async (propertyId, startDate = null, endDate = null, limit = 10) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    params.append('limit', limit)
    
    const response = await api.get(`/api/v1/data/ga4/top-pages/${propertyId}?${params.toString()}`)
    return response.data
  },

  // Get traffic sources
  getTrafficSources: async (propertyId, startDate = null, endDate = null) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await api.get(`/api/v1/data/ga4/traffic-sources/${propertyId}?${params.toString()}`)
    return response.data
  },

  // Get geographic breakdown
  getGeographic: async (propertyId, startDate = null, endDate = null, limit = 20) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    params.append('limit', limit)
    
    const response = await api.get(`/api/v1/data/ga4/geographic/${propertyId}?${params.toString()}`)
    return response.data
  },

  // Get device breakdown
  getDevices: async (propertyId, startDate = null, endDate = null) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await api.get(`/api/v1/data/ga4/devices/${propertyId}?${params.toString()}`)
    return response.data
  },

  // Get realtime snapshot
  getRealtime: async (propertyId) => {
    const response = await api.get(`/api/v1/data/ga4/realtime/${propertyId}`)
    return response.data
  },

  // Get brands with GA4 configured
  getBrandsWithGA4: async () => {
    const response = await api.get('/api/v1/data/ga4/brands-with-ga4')
    return response.data
  },
}

// Agency Analytics API endpoints
export const agencyAnalyticsAPI = {
  // Get all campaigns with pagination and search
  getCampaigns: async (page = 1, pageSize = 50, search = '') => {
    const params = new URLSearchParams()
    params.append('page', page)
    params.append('page_size', pageSize)
    if (search && search.trim()) {
      params.append('search', search.trim())
    }
    
    const response = await api.get(`/api/v1/data/agency-analytics/campaigns?${params.toString()}`)
    return response.data
  },
  
  // Legacy method for backward compatibility
  getCampaignsLegacy: async () => {
    const response = await api.get('/api/v1/data/agency-analytics/campaigns')
    return response.data
  },

  // Get campaign rankings
  getCampaignRankings: async (campaignId, startDate = null, endDate = null) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await api.get(`/api/v1/data/agency-analytics/campaign/${campaignId}/rankings?${params.toString()}`)
    return response.data
  },

  // Get all rankings
  getAllRankings: async (startDate = null, endDate = null, limit = 1000) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    params.append('limit', limit)
    
    const response = await api.get(`/api/v1/data/agency-analytics/rankings?${params.toString()}`)
    return response.data
  },

  // Get campaign-brand links
  getCampaignBrandLinks: async (campaignId = null, brandId = null) => {
    const params = new URLSearchParams()
    if (campaignId) params.append('campaign_id', campaignId)
    if (brandId) params.append('brand_id', brandId)
    
    const response = await api.get(`/api/v1/data/agency-analytics/campaign-brands?${params.toString()}`)
    return response.data
  },

  // Create campaign-brand link
  linkCampaignToBrand: async (campaignId, brandId, matchMethod = 'manual', matchConfidence = 'manual') => {
    const response = await api.post('/api/v1/data/agency-analytics/campaign-brands', {
      campaign_id: campaignId,
      brand_id: brandId,
      match_method: matchMethod,
      match_confidence: matchConfidence
    })
    return response.data
  },

  // Get campaigns for a brand
  getBrandCampaigns: async (brandId) => {
    const response = await api.get(`/api/v1/data/agency-analytics/brand/${brandId}/campaigns`)
    return response.data
  },

  // Get keywords for a campaign
  getCampaignKeywords: async (campaignId, limit = 1000) => {
    const response = await api.get(`/api/v1/data/agency-analytics/campaign/${campaignId}/keywords?limit=${limit}`)
    return response.data
  },

  // Get all keywords
  getAllKeywords: async (campaignId = null, limit = 1000) => {
    const params = new URLSearchParams()
    if (campaignId) params.append('campaign_id', campaignId)
    params.append('limit', limit)
    
    const response = await api.get(`/api/v1/data/agency-analytics/keywords?${params.toString()}`)
    return response.data
  },

  // Get keyword rankings
  getKeywordRankings: async (keywordId, startDate = null, endDate = null, limit = 1000) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    params.append('limit', limit)
    
    const response = await api.get(`/api/v1/data/agency-analytics/keyword/${keywordId}/rankings?${params.toString()}`)
    return response.data
  },

  // Get keyword ranking summary
  getKeywordRankingSummary: async (keywordId) => {
    const response = await api.get(`/api/v1/data/agency-analytics/keyword/${keywordId}/ranking-summary`)
    return response.data
  },

  // Get campaign keyword rankings
  getCampaignKeywordRankings: async (campaignId, limit = 1000) => {
    const response = await api.get(`/api/v1/data/agency-analytics/campaign/${campaignId}/keyword-rankings?limit=${limit}`)
    return response.data
  },

  // Get campaign keyword ranking summaries
  getCampaignKeywordRankingSummaries: async (campaignId) => {
    const response = await api.get(`/api/v1/data/agency-analytics/campaign/${campaignId}/keyword-ranking-summaries`)
    return response.data
  },
}

// Client Management API endpoints
export const clientAPI = {
  // Get all clients with pagination and search
  getClients: async (page = 1, pageSize = 25, search = '') => {
    const params = new URLSearchParams()
    params.append('page', page)
    params.append('page_size', pageSize)
    if (search && search.trim()) {
      params.append('search', search.trim())
    }
    
    const response = await api.get(`/api/v1/data/clients?${params.toString()}`)
    return response.data
  },

  // Get client by ID
  getClient: async (clientId) => {
    const response = await api.get(`/api/v1/data/clients/${clientId}`)
    return response.data
  },

  // Get client by slug (public)
  getClientBySlug: async (urlSlug) => {
    const response = await api.get(`/api/v1/data/clients/slug/${urlSlug}`)
    return response.data
  },

  // Update client mappings
  updateClientMappings: async (clientId, mappings) => {
    const response = await api.put(`/api/v1/data/clients/${clientId}/mappings`, mappings)
    return response.data
  },

  // Update client theme
  updateClientTheme: async (clientId, theme) => {
    const response = await api.put(`/api/v1/data/clients/${clientId}/theme`, theme)
    return response.data
  },

  // Get client campaigns
  getClientCampaigns: async (clientId) => {
    const response = await api.get(`/api/v1/data/clients/${clientId}/campaigns`)
    return response.data
  },

  // Link a campaign to a client
  linkClientCampaign: async (clientId, campaignId, isPrimary = false) => {
    const params = new URLSearchParams()
    if (isPrimary) {
      params.append('is_primary', 'true')
    }
    const response = await api.post(`/api/v1/data/clients/${clientId}/campaigns/${campaignId}/link?${params.toString()}`)
    return response.data
  },

  // Unlink a campaign from a client
  unlinkClientCampaign: async (clientId, campaignId) => {
    const response = await api.delete(`/api/v1/data/clients/${clientId}/campaigns/${campaignId}/link`)
    return response.data
  },

  // Get GA4 analytics for a client
  getClientGA4Analytics: async (clientId, startDate = null, endDate = null) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await api.get(`/api/v1/data/ga4/client/${clientId}?${params.toString()}`)
    return response.data
  },

  // Upload client logo
  uploadClientLogo: async (clientId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await api.post(
      `/api/v1/data/clients/${clientId}/logo`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  // Delete client logo
  deleteClientLogo: async (clientId) => {
    const response = await api.delete(`/api/v1/data/clients/${clientId}/logo`)
    return response.data
  },
}

// Keywords API endpoints
export const keywordsAPI = {
  // Get keywords for a client with filtering, sorting, and pagination
  getClientKeywords: async (clientId, filters = {}) => {
    const params = new URLSearchParams()
    
    // Add all filter parameters
    if (filters.campaign_id) params.append('campaign_id', filters.campaign_id)
    if (filters.location_country) params.append('location_country', filters.location_country)
    if (filters.location_region) params.append('location_region', filters.location_region)
    if (filters.location_city) params.append('location_city', filters.location_city)
    if (filters.volume_min !== undefined) params.append('volume_min', filters.volume_min)
    if (filters.volume_max !== undefined) params.append('volume_max', filters.volume_max)
    if (filters.google_ranking_min !== undefined) params.append('google_ranking_min', filters.google_ranking_min)
    if (filters.google_ranking_max !== undefined) params.append('google_ranking_max', filters.google_ranking_max)
    if (filters.bing_ranking_min !== undefined) params.append('bing_ranking_min', filters.bing_ranking_min)
    if (filters.bing_ranking_max !== undefined) params.append('bing_ranking_max', filters.bing_ranking_max)
    if (filters.competition_min !== undefined) params.append('competition_min', filters.competition_min)
    if (filters.competition_max !== undefined) params.append('competition_max', filters.competition_max)
    if (filters.primary_only !== undefined) params.append('primary_only', filters.primary_only)
    if (filters.tags) params.append('tags', filters.tags)
    if (filters.language) params.append('language', filters.language)
    if (filters.search) params.append('search', filters.search)
    if (filters.sort_by) params.append('sort_by', filters.sort_by)
    if (filters.sort_order) params.append('sort_order', filters.sort_order)
    if (filters.page) params.append('page', filters.page)
    if (filters.page_size) params.append('page_size', filters.page_size)
    
    const response = await api.get(`/api/v1/data/clients/${clientId}/keywords?${params.toString()}`)
    return response.data
  },

  // Get keyword rankings over time for chart
  getClientKeywordRankingsOverTime: async (clientId, dateRange = {}) => {
    const params = new URLSearchParams()
    
    if (dateRange.start_date) params.append('start_date', dateRange.start_date)
    if (dateRange.end_date) params.append('end_date', dateRange.end_date)
    if (dateRange.campaign_id) params.append('campaign_id', dateRange.campaign_id)
    if (dateRange.location_country) params.append('location_country', dateRange.location_country)
    if (dateRange.group_by) params.append('group_by', dateRange.group_by)
    if (dateRange.engine) params.append('engine', dateRange.engine)
    
    const response = await api.get(`/api/v1/data/clients/${clientId}/keywords/rankings-over-time?${params.toString()}`)
    return response.data
  },

  // Get keyword summary KPIs
  getClientKeywordSummary: async (clientId, filters = {}) => {
    const params = new URLSearchParams()
    
    if (filters.campaign_id) params.append('campaign_id', filters.campaign_id)
    if (filters.location_country) params.append('location_country', filters.location_country)
    if (filters.date_range) params.append('date_range', filters.date_range)
    if (filters.start_date) params.append('start_date', filters.start_date)
    if (filters.end_date) params.append('end_date', filters.end_date)
    
    const response = await api.get(`/api/v1/data/clients/${clientId}/keywords/summary?${params.toString()}`)
    return response.data
  },
}

// Reporting Dashboard API endpoints
export const reportingAPI = {
  // Get consolidated reporting dashboard KPIs
  getReportingDashboard: async (brandId, startDate = null, endDate = null) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await api.get(`/api/v1/data/reporting-dashboard/${brandId}?${params.toString()}`)
    return response.data
  },
  
  // Get consolidated reporting dashboard KPIs by client ID (client-centric)
  getReportingDashboardByClient: async (clientId, startDate = null, endDate = null) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await api.get(`/api/v1/data/reporting-dashboard/client/${clientId}?${params.toString()}`)
    return response.data
  },
  
  // Get consolidated reporting dashboard KPIs by slug (public access)
  getReportingDashboardBySlug: async (slug, startDate = null, endDate = null) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await api.get(`/api/v1/data/reporting-dashboard/slug/${slug}?${params.toString()}`)
    return response.data
  },
  
  // Get brand by slug (public access)
  getBrandBySlug: async (slug) => {
    const response = await api.get(`/api/v1/data/brands/slug/${slug}`)
    return response.data
  },
  
  // Get diagnostic information about brand configuration
  getDiagnostics: async (brandId) => {
    const response = await api.get(`/api/v1/data/reporting-dashboard/${brandId}/diagnostics`)
    return response.data
  },
  
  // Query Scrunch analytics using Query API
  queryScrunchAnalytics: async (brandId, fields, startDate = null, endDate = null, limit = 50000, offset = 0) => {
    const params = new URLSearchParams()
    params.append('fields', Array.isArray(fields) ? fields.join(',') : fields)
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    params.append('limit', limit)
    params.append('offset', offset)
    
    const response = await api.get(`/api/v1/data/scrunch/query/${brandId}?${params.toString()}`)
    return response.data
  },
  
  // Get Scrunch dashboard data (separate endpoint for parallel loading)
  getScrunchDashboard: async (brandId, startDate = null, endDate = null) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await api.get(`/api/v1/data/reporting-dashboard/${brandId}/scrunch?${params.toString()}`)
    return response.data
  },
  
  // Get Scrunch dashboard data by slug (for public access)
  getScrunchDashboardBySlug: async (slug, startDate = null, endDate = null) => {
    const params = new URLSearchParams()
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    
    const response = await api.get(`/api/v1/data/reporting-dashboard/slug/${slug}/scrunch?${params.toString()}`)
    return response.data
  },
  
  // Get KPI selections for a brand (used to control public view visibility)
  getKPISelections: async (brandId) => {
    const response = await api.get(`/api/v1/data/reporting-dashboard/${brandId}/kpi-selections`)
    return response.data
  },
  
  // Save KPI selections for a brand (used by managers/admins)
  saveKPISelections: async (brandId, selectedKPIs, visibleSections = null) => {
    const payload = {
      selected_kpis: Array.isArray(selectedKPIs) ? selectedKPIs : Array.from(selectedKPIs)
    }
    if (visibleSections) {
      payload.visible_sections = Array.isArray(visibleSections) ? visibleSections : Array.from(visibleSections)
    }
    const response = await api.put(`/api/v1/data/reporting-dashboard/${brandId}/kpi-selections`, payload)
    return response.data
  },
  
  // Get prompts analytics with different grouping options
  getPromptsAnalytics: async (clientId, slug, groupBy, search, startDate, endDate, page, rowsPerPage) => {
    const params = new URLSearchParams()
    params.append('group_by', groupBy)
    if (clientId) params.append('client_id', clientId)
    if (slug) params.append('slug', slug)
    if (search) params.append('search', search)
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    if (page !== undefined) params.append('offset', page * (rowsPerPage || 10))
    if (rowsPerPage) params.append('limit', rowsPerPage)
    
    const response = await api.get(`/api/v1/data/prompts-analytics?${params.toString()}`)
    return response.data
  },
  
}

// Brand Management API (Admin/Manager only)
export const dataAPI = {
  // Get brands from database
  getBrands: async (limit = 50, offset = 0, search = '') => {
    const params = new URLSearchParams()
    params.append('limit', limit)
    params.append('offset', offset)
    if (search) params.append('search', search)
    
    const response = await api.get(`/api/v1/data/brands?${params.toString()}`)
    return response.data
  },
  
  // Update GA4 Property ID for a brand
  updateBrandGA4PropertyId: async (brandId, ga4PropertyId) => {
    const response = await api.put(`/api/v1/data/brands/${brandId}/ga4-property-id`, {
      ga4_property_id: ga4PropertyId || null
    })
    return response.data
  },
  
  // Link Agency Analytics campaign to a brand
  linkAgencyAnalyticsCampaign: async (brandId, campaignId) => {
    const response = await api.post(`/api/v1/data/brands/${brandId}/agency-analytics-campaigns/${campaignId}/link`)
    return response.data
  },
  
  // Unlink Agency Analytics campaign from a brand
  unlinkAgencyAnalyticsCampaign: async (brandId, campaignId) => {
    const response = await api.delete(`/api/v1/data/brands/${brandId}/agency-analytics-campaigns/${campaignId}/link`)
    return response.data
  },
  
  // Get all campaigns linked to a brand
  getBrandLinkedCampaigns: async (brandId) => {
    const response = await api.get(`/api/v1/data/brands/${brandId}/agency-analytics-campaigns`)
    return response.data
  },
  
  // Upload brand logo
  uploadBrandLogo: async (brandId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post(`/api/v1/data/brands/${brandId}/logo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },
  
  // Delete brand logo
  deleteBrandLogo: async (brandId) => {
    const response = await api.delete(`/api/v1/data/brands/${brandId}/logo`)
    return response.data
  },
  
  // Update brand theme
  updateBrandTheme: async (brandId, theme) => {
    const response = await api.put(`/api/v1/data/brands/${brandId}/theme`, theme)
    return response.data
  },
}

// Authentication API endpoints
export const authAPI = {
  // Sign up
  signup: async (email, password, fullName = null) => {
    const response = await api.post('/api/v1/auth/signup', {
      email,
      password,
      full_name: fullName,
    })
    return response.data
  },

  // Sign in
  signin: async (email, password) => {
    const response = await api.post('/api/v1/auth/signin', {
      email,
      password,
    })
    return response.data
  },

  // Sign out
  signout: async () => {
    try {
      await api.post('/api/v1/auth/signout')
    } catch (error) {
      // Even if API call fails, clear local storage
      console.error('Signout error:', error)
    } finally {
      localStorage.removeItem('access_token')
      localStorage.removeItem('refresh_token')
      localStorage.removeItem('user')
    }
  },

  // Get current user
  getCurrentUser: async () => {
    const response = await api.get('/api/v1/auth/me')
    return response.data
  },

  // Refresh token
  refreshToken: async (refreshToken) => {
    const response = await api.post(
      '/api/v1/auth/refresh',
      {},
      {
        headers: {
          'refresh-token': refreshToken,
        },
      }
    )
    return response.data
  },
}

// OpenAI API endpoints
export const openaiAPI = {
  // Get overall metrics overview (all sources combined)
  getOverallOverview: async (clientId = null, brandId = null, startDate = null, endDate = null) => {
    const response = await api.post('/api/v1/openai/metrics/overview', {
      client_id: clientId,
      brand_id: brandId,
      start_date: startDate,
      end_date: endDate
    })
    return response.data
  },
  
  // Get metric review for specific data source
  getMetricReview: async (brandId, dataSource, startDate = null, endDate = null) => {
    const response = await api.post('/api/v1/openai/metrics/review', {
      brand_id: brandId,
      data_source: dataSource,
      start_date: startDate,
      end_date: endDate
    })
    return response.data
  },
}

export default api

