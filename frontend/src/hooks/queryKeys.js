/**
 * Centralized query keys factory for React Query
 * This ensures consistent cache key management across the application
 */

export const queryKeys = {
  // Brands
  brands: {
    all: ['brands'],
    lists: () => [...queryKeys.brands.all, 'list'],
    list: (filters) => [...queryKeys.brands.lists(), { filters }],
    details: () => [...queryKeys.brands.all, 'detail'],
    detail: (id) => [...queryKeys.brands.details(), id],
    bySlug: (slug) => [...queryKeys.brands.all, 'slug', slug],
    analytics: () => [...queryKeys.brands.all, 'analytics'],
    linkedCampaigns: (id) => [...queryKeys.brands.detail(id), 'campaigns'],
  },

  // Dashboard
  dashboard: {
    all: ['dashboard'],
    detail: (brandId, startDate, endDate) => 
      [...queryKeys.dashboard.all, brandId, startDate, endDate],
    bySlug: (slug, startDate, endDate) => 
      [...queryKeys.dashboard.all, 'slug', slug, startDate, endDate],
    scrunch: (brandId) => [...queryKeys.dashboard.detail(brandId), 'scrunch'],
    kpiSelections: (brandId) => [...queryKeys.dashboard.detail(brandId), 'kpi-selections'],
  },

  // Sync
  sync: {
    all: ['sync'],
    status: () => [...queryKeys.sync.all, 'status'],
  },

  // Data
  data: {
    all: ['data'],
    prompts: (filters) => [...queryKeys.data.all, 'prompts', filters],
    responses: (filters) => [...queryKeys.data.all, 'responses', filters],
  },

  // Agency Analytics
  agencyAnalytics: {
    all: ['agency-analytics'],
    campaigns: () => [...queryKeys.agencyAnalytics.all, 'campaigns'],
  },

  // Clients
  clients: {
    all: ['clients'],
    lists: () => [...queryKeys.clients.all, 'list'],
    list: (filters) => [...queryKeys.clients.lists(), { filters }],
    details: () => [...queryKeys.clients.all, 'detail'],
    detail: (id) => [...queryKeys.clients.details(), id],
    bySlug: (slug) => [...queryKeys.clients.all, 'slug', slug],
    campaigns: (id) => [...queryKeys.clients.detail(id), 'campaigns'],
  },
}

