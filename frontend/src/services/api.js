import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

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

  // Sync all Scrunch AI data
  syncAll: async () => {
    const response = await api.post('/api/v1/sync/all')
    return response.data
  },

  // Sync GA4 data
  syncGA4: async (brandId = null, startDate = null, endDate = null, syncRealtime = false) => {
    const params = new URLSearchParams()
    if (brandId) params.append('brand_id', brandId)
    if (startDate) params.append('start_date', startDate)
    if (endDate) params.append('end_date', endDate)
    params.append('sync_realtime', syncRealtime)
    
    const response = await api.post(`/api/v1/sync/ga4?${params.toString()}`)
    return response.data
  },

  // Get data from database (you'll need to add these endpoints to the backend)
  getBrands: async () => {
    const response = await api.get('/api/v1/data/brands')
    return response.data
  },

  getPrompts: async (filters = {}) => {
    const params = new URLSearchParams()
    if (filters.brand_id) params.append('brand_id', filters.brand_id)
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

export default api

