import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  alpha,
  useTheme,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  TextField,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Settings as SettingsIcon,
  Refresh as RefreshIcon,
  BarChart as BarChartIcon,
  People as PeopleIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  TrendingUp,
  CalendarToday as CalendarTodayIcon,
  PersonAdd as PersonAddIcon,
  AccessTime as AccessTimeIcon,
  Link as LinkIcon,
  CheckCircle as CheckCircleIcon,
  SentimentSatisfied as SentimentSatisfiedIcon,
  Article as ArticleIcon,
  Share as ShareIcon,
  ContentCopy as ContentCopyIcon,
  Check as CheckIcon,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { 
  LineChart, Line,
  BarChart, Bar, 
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { reportingAPI, syncAPI } from '../services/api'

// Define all KPIs in order: GA4 (9), AgencyAnalytics (6), Scrunch (10)
const KPI_ORDER = [
  // GA4 KPIs
  'users', 'sessions', 'new_users', 'engaged_sessions', 'bounce_rate', 'avg_session_duration', 'ga4_engagement_rate', 'conversions', 'revenue',
  // AgencyAnalytics KPIs
  'impressions', 'clicks', 'ctr', 'search_volume', 'avg_keyword_rank', 'ranking_change',
  // Scrunch KPIs
  'influencer_reach', 'total_citations', 'brand_presence_rate', 'brand_sentiment_score', 'scrunch_engagement_rate', 'total_interactions', 'cost_per_engagement', 'top10_prompt_percentage', 'prompt_search_volume', 'visibility_on_ai_platform'
]

// KPI metadata for display
const KPI_METADATA = {
  // GA4 KPIs
  'users': { label: 'Users', source: 'GA4', icon: 'People' },
  'sessions': { label: 'Sessions', source: 'GA4', icon: 'BarChart' },
  'new_users': { label: 'New Users', source: 'GA4', icon: 'PersonAdd' },
  'engaged_sessions': { label: 'Engaged Sessions', source: 'GA4', icon: 'People' },
  'bounce_rate': { label: 'Bounce Rate', source: 'GA4', icon: 'TrendingDown' },
  'avg_session_duration': { label: 'Avg Session Duration', source: 'GA4', icon: 'AccessTime' },
  'ga4_engagement_rate': { label: 'Engagement Rate', source: 'GA4', icon: 'TrendingUp' },
  'conversions': { label: 'Conversions', source: 'GA4', icon: 'TrendingUp' },
  'revenue': { label: 'Revenue', source: 'GA4', icon: 'TrendingUp' },
  // AgencyAnalytics KPIs
  'impressions': { label: 'Impressions', source: 'AgencyAnalytics', icon: 'Visibility' },
  'clicks': { label: 'Clicks', source: 'AgencyAnalytics', icon: 'TrendingUp' },
  'ctr': { label: 'CTR', source: 'AgencyAnalytics', icon: 'BarChart' },
  'search_volume': { label: 'Search Volume', source: 'AgencyAnalytics', icon: 'Search' },
  'avg_keyword_rank': { label: 'Avg Keyword Rank', source: 'AgencyAnalytics', icon: 'Search' },
  'ranking_change': { label: 'Avg Ranking Change', source: 'AgencyAnalytics', icon: 'TrendingUp' },
  // Scrunch KPIs
  'influencer_reach': { label: 'Influencer Reach', source: 'Scrunch', icon: 'People' },
  'total_citations': { label: 'Total Citations', source: 'Scrunch', icon: 'Link' },
  'brand_presence_rate': { label: 'Brand Presence Rate', source: 'Scrunch', icon: 'CheckCircle' },
  'brand_sentiment_score': { label: 'Brand Sentiment Score', source: 'Scrunch', icon: 'SentimentSatisfied' },
  'scrunch_engagement_rate': { label: 'Engagement Rate', source: 'Scrunch', icon: 'TrendingUp' },
  'total_interactions': { label: 'Total Interactions', source: 'Scrunch', icon: 'Visibility' },
  'cost_per_engagement': { label: 'Cost per Engagement', source: 'Scrunch', icon: 'TrendingUp' },
  'top10_prompt_percentage': { label: 'Top 10 Prompt', source: 'Scrunch', icon: 'Article' },
  'prompt_search_volume': { label: 'Prompt Search Volume', source: 'Scrunch', icon: 'TrendingUp' },
  'visibility_on_ai_platform': { label: 'Visibility On AI Platform', source: 'Scrunch', icon: 'Visibility' },
}

// Date range presets
const DATE_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Last 6 months', days: 180 },
  { label: 'Last year', days: 365 },
]

function ReportingDashboard({ publicSlug, brandInfo: publicBrandInfo }) {
  const isPublic = !!publicSlug
  const [brands, setBrands] = useState([])
  const [selectedBrandId, setSelectedBrandId] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedKPIs, setSelectedKPIs] = useState(new Set(KPI_ORDER))
  const [tempSelectedKPIs, setTempSelectedKPIs] = useState(new Set(KPI_ORDER)) // For dialog
  const [showKPISelector, setShowKPISelector] = useState(false)
  const [startDate, setStartDate] = useState(null)
  const [endDate, setEndDate] = useState(null)
  const [datePreset, setDatePreset] = useState('')
  const [brandAnalytics, setBrandAnalytics] = useState(null)
  const [loadingAnalytics, setLoadingAnalytics] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareableUrl, setShareableUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [selectedBrandSlug, setSelectedBrandSlug] = useState(null)
  const theme = useTheme()

  // Load saved KPI preferences from localStorage
  useEffect(() => {
    const savedKPIs = localStorage.getItem('reportingDashboardSelectedKPIs')
    if (savedKPIs) {
      try {
        const parsed = JSON.parse(savedKPIs)
        setSelectedKPIs(new Set(parsed))
        setTempSelectedKPIs(new Set(parsed))
      } catch (e) {
        console.error('Error loading saved KPIs:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (isPublic && publicSlug) {
      // For public mode, fetch brand by slug and set selectedBrandId
      const fetchPublicBrand = async () => {
        try {
          const brand = await reportingAPI.getBrandBySlug(publicSlug)
          setSelectedBrandId(brand.id)
        } catch (err) {
          setError(err.response?.data?.detail || 'Failed to load brand')
        }
      }
      fetchPublicBrand()
    } else {
      loadBrands()
    }
  }, [isPublic, publicSlug])

  useEffect(() => {
    if (selectedBrandId) {
      loadDashboardData()
      if (!isPublic) {
        loadBrandAnalytics()
      }
    }
  }, [selectedBrandId, startDate, endDate, isPublic])

  const loadBrands = async () => {
    try {
      const data = await syncAPI.getBrands()
      setBrands(data.items || [])
      if (data.items && data.items.length > 0) {
        setSelectedBrandId(data.items[0].id)
        // Set slug for first brand
        if (data.items[0].slug) {
          setSelectedBrandSlug(data.items[0].slug)
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load brands')
    }
  }

  // Update slug when brand changes
  useEffect(() => {
    if (selectedBrandId && brands.length > 0) {
      const selectedBrand = brands.find(b => b.id === selectedBrandId)
      if (selectedBrand?.slug) {
        setSelectedBrandSlug(selectedBrand.slug)
      } else {
        setSelectedBrandSlug(null)
      }
    }
  }, [selectedBrandId, brands])

  const handleOpenShareDialog = () => {
    if (selectedBrandSlug) {
      const baseUrl = window.location.origin
      const url = `${baseUrl}/reporting/${selectedBrandSlug}`
      setShareableUrl(url)
      setShowShareDialog(true)
      setCopied(false)
    } else {
      setError('Brand slug not available. Please ensure the brand has a slug configured.')
    }
  }

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareableUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
      setError('Failed to copy URL to clipboard')
    }
  }

  const loadDashboardData = async () => {
    if (!selectedBrandId && !publicSlug) return
    
    try {
      setLoading(true)
      setError(null)
      
      let data
      if (isPublic && publicSlug) {
        data = await reportingAPI.getReportingDashboardBySlug(
          publicSlug,
          startDate || undefined,
          endDate || undefined
        )
      } else {
        data = await reportingAPI.getReportingDashboard(
          selectedBrandId,
          startDate || undefined,
          endDate || undefined
        )
      }
      
      setDashboardData(data)
      
      // Initialize selected KPIs with all available KPIs
      if (selectedKPIs.size === 0 && data.kpis) {
        setSelectedKPIs(new Set(Object.keys(data.kpis)))
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  const loadBrandAnalytics = async () => {
    if (!selectedBrandId) return
    
    try {
      setLoadingAnalytics(true)
      const response = await syncAPI.getBrandAnalytics(selectedBrandId)
      setBrandAnalytics(response.global_analytics || null)
    } catch (err) {
      console.error('Failed to load brand analytics:', err)
      setBrandAnalytics(null)
    } finally {
      setLoadingAnalytics(false)
    }
  }

  const formatValue = (kpi) => {
    const { value, format } = kpi
    
    if (format === 'currency') {
      return `$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    }
    
    if (format === 'percentage') {
      return `${value.toFixed(1)}%`
    }
    
    if (format === 'duration') {
      // Convert seconds to readable format (MM:SS or HH:MM:SS)
      const hours = Math.floor(value / 3600)
      const minutes = Math.floor((value % 3600) / 60)
      const seconds = Math.floor(value % 60)
      
      if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      } else {
        return `${minutes}:${seconds.toString().padStart(2, '0')}`
      }
    }
    
    if (format === 'number') {
      return value.toLocaleString()
    }
    
    return value.toLocaleString()
  }

  // Helper function to get simplified channel label
  const getChannelLabel = (source) => {
    if (!source) return source
    const sourceLower = source.toLowerCase()
    
    if (sourceLower.includes('direct') || sourceLower.includes('(none)')) {
      return 'Direct'
    } else if (sourceLower.includes('organic')) {
      return 'Organic'
    } else if (sourceLower.includes('social') || sourceLower.includes('paid_social') || sourceLower.includes('facebook')) {
      return 'Social'
    } else if (sourceLower.includes('referral') || sourceLower.includes('refer') || sourceLower.includes('cpc')) {
      return 'Referral'
    }
    // Return original if no match
    return source
  }

  // Helper function to get channel color
  const getChannelColor = (source) => {
    if (!source) return 'rgba(59, 130, 246, 0.6)'
    const sourceLower = source.toLowerCase()
    
    if (sourceLower.includes('direct') || sourceLower.includes('(none)')) {
      return 'rgba(20, 184, 166, 0.6)' // Teal/Green for Direct
    } else if (sourceLower.includes('google') && sourceLower.includes('organic')) {
      return 'rgba(59, 130, 246, 0.6)' // Light blue for Google Organic
    } else if (sourceLower.includes('google') && (sourceLower.includes('cpc') || sourceLower.includes('paid'))) {
      return 'rgba(59, 130, 246, 0.6)' // Light blue for Google CPC
    } else if (sourceLower.includes('facebook') || sourceLower.includes('social') || sourceLower.includes('paid_social')) {
      return 'rgba(239, 68, 68, 0.6)' // Orange-red for Social/Paid Social
    } else if (sourceLower.includes('referral') || sourceLower.includes('refer')) {
      return 'rgba(251, 146, 60, 0.6)' // Orange for Referral
    } else if (sourceLower.includes('organic') || sourceLower.includes('search')) {
      return 'rgba(59, 130, 246, 0.6)' // Light blue for Organic Search
    }
    // Default color
    return 'rgba(59, 130, 246, 0.6)'
  }

  const getSourceColor = (source) => {
    switch (source) {
      case 'GA4':
        return '#4285F4' // Google blue
      case 'AgencyAnalytics':
        return '#34A853' // Google green
      case 'Scrunch':
        return '#FBBC04' // Google yellow
      default:
        return theme.palette.grey[500]
    }
  }

  const getSourceLabel = (source) => {
    switch (source) {
      case 'GA4':
        return 'GA4'
      case 'AgencyAnalytics':
        return 'AgencyAnalytics'
      case 'Scrunch':
        return 'Scrunch'
      default:
        return source
    }
  }

  const handleDatePresetChange = (preset) => {
    if (preset === '') {
      setDatePreset('')
      return
    }
    
    const presetData = DATE_PRESETS.find(p => p.label === preset)
    if (presetData) {
      const end = new Date()
      const start = new Date()
      start.setDate(start.getDate() - presetData.days)
      
      setStartDate(start.toISOString().split('T')[0])
      setEndDate(end.toISOString().split('T')[0])
      setDatePreset(preset)
    }
  }

  const handleKPIChange = (kpiKey, checked) => {
    const newSelected = new Set(tempSelectedKPIs)
    if (checked) {
      newSelected.add(kpiKey)
    } else {
      newSelected.delete(kpiKey)
    }
    setTempSelectedKPIs(newSelected)
  }

  const handleSelectAll = () => {
    // Select all available KPIs
    const availableKPIs = dashboardData?.kpis 
      ? Object.keys(dashboardData.kpis)
      : KPI_ORDER
    setTempSelectedKPIs(new Set(availableKPIs))
  }

  const handleDeselectAll = () => {
    setTempSelectedKPIs(new Set())
  }

  const handleSaveKPISelection = () => {
    setSelectedKPIs(new Set(tempSelectedKPIs))
    // Save to localStorage
    localStorage.setItem('reportingDashboardSelectedKPIs', JSON.stringify(Array.from(tempSelectedKPIs)))
    setShowKPISelector(false)
  }

  const handleOpenKPISelector = () => {
    // Initialize temp selection with current selection
    setTempSelectedKPIs(new Set(selectedKPIs))
    setShowKPISelector(true)
  }

  // Get KPIs in the correct order, filtered by selection
  // In public mode, show all KPIs; otherwise filter by selection
  const displayedKPIs = dashboardData?.kpis 
    ? (isPublic 
        ? KPI_ORDER.filter(key => dashboardData.kpis[key])
            .map(key => [key, dashboardData.kpis[key]])
        : KPI_ORDER.filter(key => dashboardData.kpis[key] && selectedKPIs.has(key))
            .map(key => [key, dashboardData.kpis[key]]))
    : []

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box mb={4}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography 
            variant="h4" 
            fontWeight={700} 
            sx={{
              fontSize: '1.75rem',
              letterSpacing: '-0.02em',
              color: 'text.primary'
            }}
          >
            {isPublic && publicBrandInfo ? publicBrandInfo.name : 'Unified Reporting Dashboard'}
          </Typography>
          <Box display="flex" gap={1.5}>
            <IconButton
              onClick={handleOpenKPISelector}
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 2,
                bgcolor: 'background.paper',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.05),
                }
              }}
              title="Configure KPIs"
            >
              <SettingsIcon sx={{ fontSize: 20 }} />
            </IconButton>
            {!isPublic && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<ShareIcon sx={{ fontSize: 16 }} />}
                onClick={handleOpenShareDialog}
                disabled={!selectedBrandSlug}
                sx={{
                  borderRadius: 2,
                  px: 2,
                  py: 0.75,
                  fontWeight: 600,
                  bgcolor: 'background.paper',
                }}
                title={selectedBrandSlug ? 'Share public dashboard URL' : 'Brand slug not configured'}
              >
                Share
              </Button>
            )}
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
              onClick={loadDashboardData}
              sx={{
                borderRadius: 2,
                px: 2,
                py: 0.75,
                fontWeight: 600,
                bgcolor: 'background.paper',
              }}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Paper 
          elevation={0} 
          sx={{ 
            p: 2.5, 
            display: 'flex', 
            gap: 2, 
            flexWrap: 'wrap', 
            alignItems: 'center',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            bgcolor: 'background.paper'
          }}
        >
          {!isPublic && (
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Select Brand</InputLabel>
              <Select
                value={selectedBrandId || ''}
                label="Select Brand"
                onChange={(e) => {
                  const brandId = e.target.value
                  setSelectedBrandId(brandId)
                  // Update slug when brand changes
                  const selectedBrand = brands.find(b => b.id === brandId)
                  if (selectedBrand?.slug) {
                    setSelectedBrandSlug(selectedBrand.slug)
                  } else {
                    setSelectedBrandSlug(null)
                  }
                }}
              >
                {brands.map((brand) => (
                  <MenuItem key={brand.id} value={brand.id}>
                    {brand.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Box display="flex" alignItems="center" gap={1}>
            <CalendarTodayIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Date Range</InputLabel>
              <Select
                value={datePreset}
                label="Date Range"
                onChange={(e) => handleDatePresetChange(e.target.value)}
              >
                <MenuItem value="">Custom Range</MenuItem>
                {DATE_PRESETS.map((preset) => (
                  <MenuItem key={preset.label} value={preset.label}>
                    {preset.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          
          <TextField
            label="Start Date"
            type="date"
            size="small"
            value={startDate || ''}
            onChange={(e) => {
              setStartDate(e.target.value)
              setDatePreset('') // Clear preset when manually selecting dates
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
          
          <TextField
            label="End Date"
            type="date"
            size="small"
            value={endDate || ''}
            onChange={(e) => {
              setEndDate(e.target.value)
              setDatePreset('') // Clear preset when manually selecting dates
            }}
            InputLabelProps={{ shrink: true }}
            sx={{ minWidth: 150 }}
          />
        </Paper>
      </Box>

      {error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3, borderRadius: 2 }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      {/* Diagnostic Information */}
      {dashboardData?.diagnostics && (
        <Box mb={3}>
          {(!dashboardData.diagnostics.ga4_configured || !dashboardData.diagnostics.agency_analytics_configured) && (
            <Alert 
              severity="info" 
              sx={{ mb: 2, borderRadius: 2 }}
            >
              <Typography variant="subtitle2" fontWeight={600} mb={1}>
                Missing Data Sources
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {!dashboardData.diagnostics.ga4_configured && (
                  <li>
                    <Typography variant="body2">
                      <strong>GA4:</strong> No GA4 property ID configured. Configure it in the brands table or use the GA4 sync endpoint.
                    </Typography>
                  </li>
                )}
                {!dashboardData.diagnostics.agency_analytics_configured && (
                  <li>
                    <Typography variant="body2">
                      <strong>AgencyAnalytics:</strong> No campaigns linked to this brand. Sync Agency Analytics data and link campaigns to brands.
                    </Typography>
                  </li>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary" mt={1} display="block">
                Currently showing: {dashboardData.diagnostics.kpi_counts.ga4} GA4 KPIs, {dashboardData.diagnostics.kpi_counts.agency_analytics} AgencyAnalytics KPIs, {dashboardData.diagnostics.kpi_counts.scrunch} Scrunch KPIs
              </Typography>
            </Alert>
          )}
        </Box>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress size={32} thickness={4} />
        </Box>
      ) : dashboardData ? (
        <>
          {/* KPI Grid - 3 rows × 4 columns */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {displayedKPIs.map(([key, kpi], index) => {
              const sourceColor = getSourceColor(kpi.source)
              const sourceLabel = getSourceLabel(kpi.source)
              
              return (
                <Grid item xs={12} sm={6} md={3} key={key}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Card
                      sx={{
                        height: '100%',
                        background: '#FFFFFF',
                        border: `1px solid ${theme.palette.divider}`,
                        borderRadius: 2,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          transform: 'translateY(-2px)',
                        }
                      }}
                    >
                      <CardContent sx={{ p: 2.5 }}>
                        {/* Source Label */}
                        <Box display="flex" justifyContent="flex-end" mb={1}>
                          <Chip
                            label={sourceLabel}
                            size="small"
                            sx={{
                              bgcolor: alpha(sourceColor, 0.1),
                              color: sourceColor,
                              fontWeight: 600,
                              fontSize: '10px',
                              height: 20,
                              borderRadius: '4px',
                              border: `1px solid ${alpha(sourceColor, 0.2)}`
                            }}
                          />
                        </Box>
                        
                        {/* KPI Label */}
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 500,
                            display: 'block',
                            mb: 0.5
                          }}
                        >
                          {kpi.label}
                        </Typography>
                        
                        {/* KPI Value */}
                        <Typography 
                          variant="h5" 
                          fontWeight={700}
                          sx={{ 
                            fontSize: '1.5rem',
                            letterSpacing: '-0.02em',
                            mb: 1,
                            color: 'text.primary',
                          }}
                        >
                          {formatValue(kpi)}
                        </Typography>
                        
                        {/* Change Indicator */}
                        {kpi.change !== undefined && kpi.change !== null && (
                          <Box display="flex" alignItems="center" gap={0.5}>
                            {kpi.change >= 0 ? (
                              <TrendingUpIcon sx={{ fontSize: 14, color: '#34A853' }} />
                            ) : (
                              <TrendingDownIcon sx={{ fontSize: 14, color: '#EA4335' }} />
                            )}
                            <Typography 
                              variant="caption" 
                              sx={{ 
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                color: kpi.change >= 0 ? '#34A853' : '#EA4335'
                              }}
                            >
                              {kpi.change >= 0 ? '+' : ''}{kpi.change.toFixed(1)}%
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              )
            })}
          </Grid>

          {/* Overall Metrics Section - Large Cards */}
          {dashboardData?.kpis && (
            <>
              <Typography 
                variant="h5" 
                fontWeight={700} 
                sx={{ 
                  mt: 4, 
                  mb: 3,
                  fontSize: '1.5rem',
                  letterSpacing: '-0.02em',
                  color: 'text.primary'
                }}
              >
                Overall Performance Metrics
              </Typography>
              
              <Grid container spacing={2.5} sx={{ mb: 4 }}>
                {/* Top 10 Prompt Percentage */}
                {dashboardData.kpis.top10_prompt_percentage && (
                  <Grid item xs={12} md={4}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                    >
                      <Card
                        sx={{
                          background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.04) 0%, rgba(88, 86, 214, 0.04) 100%)',
                          border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                          borderRadius: 2,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            >
                              Top 10 Prompt
                            </Typography>
                            <ArticleIcon sx={{ fontSize: 20, color: 'primary.main', opacity: 0.6 }} />
                          </Box>
                          <Typography 
                            variant="h3" 
                            fontWeight={700}
                            sx={{ 
                              fontSize: '36px',
                              letterSpacing: '-0.02em',
                              mb: 1,
                            }}
                          >
                            {formatValue(dashboardData.kpis.top10_prompt_percentage)}
                          </Typography>
                          {dashboardData.kpis.top10_prompt_percentage.change !== undefined && dashboardData.kpis.top10_prompt_percentage.change !== null && (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              {dashboardData.kpis.top10_prompt_percentage.change >= 0 ? (
                                <TrendingUpIcon sx={{ fontSize: 14, color: '#34A853' }} />
                              ) : (
                                <TrendingDownIcon sx={{ fontSize: 14, color: '#EA4335' }} />
                              )}
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: dashboardData.kpis.top10_prompt_percentage.change >= 0 ? '#34A853' : '#EA4335'
                                }}
                              >
                                {dashboardData.kpis.top10_prompt_percentage.change >= 0 ? '+' : ''}{dashboardData.kpis.top10_prompt_percentage.change.toFixed(1)}%
                              </Typography>
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ fontSize: '12px' }}
                              >
                                vs last period
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                )}

                {/* Prompt Search Volume */}
                {dashboardData.kpis.prompt_search_volume && (
                  <Grid item xs={12} md={4}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <Card
                        sx={{
                          background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.04) 0%, rgba(90, 200, 250, 0.04) 100%)',
                          border: `1px solid ${alpha(theme.palette.success.main, 0.08)}`,
                          borderRadius: 2,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            >
                              Prompt Search Volume
                            </Typography>
                            <TrendingUpIcon sx={{ fontSize: 20, color: 'success.main', opacity: 0.6 }} />
                          </Box>
                          <Typography 
                            variant="h3" 
                            fontWeight={700}
                            color="success.main"
                            sx={{ 
                              fontSize: '36px',
                              letterSpacing: '-0.02em',
                              mb: 1,
                            }}
                          >
                            {formatValue(dashboardData.kpis.prompt_search_volume)}
                          </Typography>
                          {dashboardData.kpis.prompt_search_volume.change !== undefined && dashboardData.kpis.prompt_search_volume.change !== null && (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: 'success.main'
                                }}
                              >
                                {dashboardData.kpis.prompt_search_volume.change >= 0 ? '+' : ''}{Math.abs(dashboardData.kpis.prompt_search_volume.change).toFixed(1)}%
                              </Typography>
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ fontSize: '12px' }}
                              >
                                vs last period
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                )}

                {/* Visibility On AI Platform */}
                {dashboardData.kpis.visibility_on_ai_platform && (
                  <Grid item xs={12} md={4}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.4 }}
                    >
                      <Card
                        sx={{
                          background: 'linear-gradient(135deg, rgba(88, 86, 214, 0.04) 0%, rgba(0, 122, 255, 0.04) 100%)',
                          border: `1px solid ${alpha(theme.palette.secondary.main, 0.08)}`,
                          borderRadius: 2,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                            <Typography 
                              variant="caption" 
                              color="text.secondary"
                              sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                            >
                              Visibility On AI Platform
                            </Typography>
                            <VisibilityIcon sx={{ fontSize: 20, color: 'secondary.main', opacity: 0.6 }} />
                          </Box>
                          <Typography 
                            variant="h3" 
                            fontWeight={700}
                            color="secondary.main"
                            sx={{ 
                              fontSize: '36px',
                              letterSpacing: '-0.02em',
                              mb: 1,
                            }}
                          >
                            {formatValue(dashboardData.kpis.visibility_on_ai_platform)}
                          </Typography>
                          {dashboardData.kpis.visibility_on_ai_platform.change !== undefined && dashboardData.kpis.visibility_on_ai_platform.change !== null && (
                            <Box display="flex" alignItems="center" gap={0.5}>
                              {dashboardData.kpis.visibility_on_ai_platform.change >= 0 ? (
                                <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                              ) : (
                                <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
                              )}
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontSize: '13px',
                                  fontWeight: 600,
                                  color: dashboardData.kpis.visibility_on_ai_platform.change >= 0 ? 'success.main' : 'error.main'
                                }}
                              >
                                {dashboardData.kpis.visibility_on_ai_platform.change >= 0 ? '+' : ''}{Math.abs(dashboardData.kpis.visibility_on_ai_platform.change).toFixed(1)}%
                              </Typography>
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ fontSize: '12px' }}
                              >
                                vs last period
                              </Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                )}
              </Grid>
            </>
          )}

          {/* Google Analytics 4 Section */}
          {dashboardData?.chart_data?.ga4_traffic_overview && (
            <>
              <Typography 
                variant="h5" 
                fontWeight={700} 
                sx={{ 
                  mt: 5, 
                  mb: 3,
                  fontSize: '1.5rem',
                  letterSpacing: '-0.02em',
                  color: 'text.primary'
                }}
              >
                Google Analytics 4
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  mb: 3,
                  fontSize: '0.875rem'
                }}
              >
                Website traffic and engagement metrics
              </Typography>

              {/* GA4 Traffic Overview Cards */}
              <Grid container spacing={2.5} sx={{ mb: 4 }}>
                <Grid item xs={12} md={3}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    <Card
                      sx={{
                        background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.04) 0%, rgba(90, 200, 250, 0.04) 100%)',
                        border: `1px solid ${alpha(theme.palette.success.main, 0.08)}`,
                        borderRadius: 2,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                          >
                            Total Sessions
                          </Typography>
                          <BarChartIcon sx={{ fontSize: 20, color: 'success.main', opacity: 0.6 }} />
                        </Box>
                        <Typography 
                          variant="h3" 
                          fontWeight={700}
                          color="success.main"
                          sx={{ 
                            fontSize: '36px',
                            letterSpacing: '-0.02em',
                            mb: 1,
                          }}
                        >
                          {dashboardData.chart_data.ga4_traffic_overview.sessions.toLocaleString()}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {dashboardData.chart_data.ga4_traffic_overview.sessionsChange >= 0 ? (
                            <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                          ) : (
                            <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
                          )}
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: '13px',
                              fontWeight: 600,
                              color: dashboardData.chart_data.ga4_traffic_overview.sessionsChange >= 0 ? 'success.main' : 'error.main'
                            }}
                          >
                            {Math.abs(dashboardData.chart_data.ga4_traffic_overview.sessionsChange).toFixed(1)}%
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ fontSize: '12px' }}
                          >
                            vs last period
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>

                <Grid item xs={12} md={3}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 }}
                  >
                    <Card
                      sx={{
                        background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.04) 0%, rgba(88, 86, 214, 0.04) 100%)',
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                        borderRadius: 2,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                          >
                            Engaged Sessions
                          </Typography>
                          <PeopleIcon sx={{ fontSize: 20, color: 'primary.main', opacity: 0.6 }} />
                        </Box>
                        <Typography 
                          variant="h3" 
                          fontWeight={700}
                          sx={{ 
                            fontSize: '36px',
                            letterSpacing: '-0.02em',
                            mb: 1,
                          }}
                        >
                          {dashboardData.chart_data.ga4_traffic_overview.engagedSessions.toLocaleString()}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {dashboardData.chart_data.ga4_traffic_overview.engagedSessionsChange >= 0 ? (
                            <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                          ) : (
                            <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
                          )}
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: '13px',
                              fontWeight: 600,
                              color: dashboardData.chart_data.ga4_traffic_overview.engagedSessionsChange >= 0 ? 'success.main' : 'error.main'
                            }}
                          >
                            {Math.abs(dashboardData.chart_data.ga4_traffic_overview.engagedSessionsChange).toFixed(1)}%
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ fontSize: '12px' }}
                          >
                            vs last period
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>

                <Grid item xs={12} md={3}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 }}
                  >
                    <Card
                      sx={{
                        background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.04) 0%, rgba(255, 45, 85, 0.04) 100%)',
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.08)}`,
                        borderRadius: 2,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                          >
                            Avg. Session Duration
                          </Typography>
                          <AccessTimeIcon sx={{ fontSize: 20, color: 'warning.main', opacity: 0.6 }} />
                        </Box>
                        <Typography 
                          variant="h3" 
                          fontWeight={700}
                          color="warning.main"
                          sx={{ 
                            fontSize: '36px',
                            letterSpacing: '-0.02em',
                            mb: 1,
                          }}
                        >
                          {(() => {
                            const duration = dashboardData.chart_data.ga4_traffic_overview.averageSessionDuration || 0
                            const minutes = Math.floor(duration / 60)
                            const seconds = Math.floor(duration % 60)
                            return `${minutes}:${seconds.toString().padStart(2, '0')}`
                          })()}
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {dashboardData.chart_data.ga4_traffic_overview.avgSessionDurationChange >= 0 ? (
                            <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                          ) : (
                            <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
                          )}
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: '13px',
                              fontWeight: 600,
                              color: dashboardData.chart_data.ga4_traffic_overview.avgSessionDurationChange >= 0 ? 'success.main' : 'error.main'
                            }}
                          >
                            {Math.abs(dashboardData.chart_data.ga4_traffic_overview.avgSessionDurationChange).toFixed(1)}%
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ fontSize: '12px' }}
                          >
                            vs last period
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>

                <Grid item xs={12} md={3}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.8 }}
                  >
                    <Card
                      sx={{
                        background: 'linear-gradient(135deg, rgba(88, 86, 214, 0.04) 0%, rgba(0, 122, 255, 0.04) 100%)',
                        border: `1px solid ${alpha(theme.palette.secondary.main, 0.08)}`,
                        borderRadius: 2,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                          >
                            Engagement Rate
                          </Typography>
                          <VisibilityIcon sx={{ fontSize: 20, color: 'secondary.main', opacity: 0.6 }} />
                        </Box>
                        <Typography 
                          variant="h3" 
                          fontWeight={700}
                          color="secondary.main"
                          sx={{ 
                            fontSize: '36px',
                            letterSpacing: '-0.02em',
                            mb: 1,
                          }}
                        >
                          {((dashboardData.chart_data.ga4_traffic_overview.engagementRate || 0) * 100).toFixed(1)}%
                        </Typography>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          {dashboardData.chart_data.ga4_traffic_overview.engagementRateChange >= 0 ? (
                            <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                          ) : (
                            <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
                          )}
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontSize: '13px',
                              fontWeight: 600,
                              color: dashboardData.chart_data.ga4_traffic_overview.engagementRateChange >= 0 ? 'success.main' : 'error.main'
                            }}
                          >
                            {Math.abs(dashboardData.chart_data.ga4_traffic_overview.engagementRateChange).toFixed(1)}%
                          </Typography>
                          <Typography 
                            variant="caption" 
                            color="text.secondary"
                            sx={{ fontSize: '12px' }}
                          >
                            vs last period
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </motion.div>
                </Grid>
              </Grid>

              {/* Top Performing Pages */}
              {dashboardData.chart_data?.top_pages && dashboardData.chart_data.top_pages.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 }}
                >
                  <Card sx={{ mb: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography 
                        variant="h6" 
                        mb={3} 
                        fontWeight={600}
                        sx={{ fontSize: '1.125rem', letterSpacing: '-0.01em' }}
                      >
                        Top Performing Pages
                      </Typography>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                              <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>
                                Page
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>
                                Views
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>
                                Users
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>
                                Avg. Duration
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {dashboardData.chart_data.top_pages.map((page, idx) => (
                              <TableRow key={idx} hover>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                    {page.pagePath || 'N/A'}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                    {page.views?.toLocaleString() || 0}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                    {page.users?.toLocaleString() || 0}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                    {Math.round(page.avgSessionDuration || 0)}s
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Sessions by Channel */}
              {dashboardData.chart_data?.traffic_sources && dashboardData.chart_data.traffic_sources.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.0 }}
                >
                  <Card sx={{ mb: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography 
                        variant="h6" 
                        mb={1} 
                        fontWeight={600}
                        sx={{ fontSize: '1.125rem', letterSpacing: '-0.01em' }}
                      >
                        Sessions by Channel
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        mb={3}
                        sx={{ fontSize: '0.875rem' }}
                      >
                        Traffic Acquisition Channels
                      </Typography>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                              <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>
                                Channel
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>
                                Sessions
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>
                                Users
                              </TableCell>
                              <TableCell align="right" sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>
                                Bounce Rate
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {dashboardData.chart_data.traffic_sources.slice(0, 15).map((source, idx) => (
                              <TableRow key={idx} hover>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                    {source.source}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                    {source.sessions?.toLocaleString() || 0}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                    {source.users?.toLocaleString() || 0}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                    {source.bounceRate ? source.bounceRate.toFixed(1) : '0.0'}%
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Keyword Rankings Performance */}
              {dashboardData.chart_data?.keyword_rankings_performance && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.1 }}
                >
                  <Card sx={{ mb: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography 
                        variant="h6" 
                        mb={3} 
                        fontWeight={600}
                        sx={{ fontSize: '1.125rem', letterSpacing: '-0.01em' }}
                      >
                        Keyword Rankings Performance
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                          <Card
                            sx={{
                              background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.04) 0%, rgba(88, 86, 214, 0.04) 100%)',
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                              borderRadius: 2,
                            }}
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}
                                >
                                  Google Rankings
                                </Typography>
                                <SearchIcon sx={{ fontSize: 20, color: 'primary.main', opacity: 0.6 }} />
                              </Box>
                              <Typography 
                                variant="h4" 
                                fontWeight={700}
                                sx={{ 
                                  fontSize: '32px',
                                  letterSpacing: '-0.02em',
                                  mb: 1,
                                }}
                              >
                                {dashboardData.chart_data.keyword_rankings_performance.google_rankings || 0}
                              </Typography>
                              {dashboardData.chart_data.keyword_rankings_performance.google_rankings_change !== undefined && dashboardData.chart_data.keyword_rankings_performance.google_rankings_change !== 0 && (
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontSize: '0.875rem',
                                      fontWeight: 600,
                                      color: 'success.main'
                                    }}
                                  >
                                    ↑+{Math.abs(dashboardData.chart_data.keyword_rankings_performance.google_rankings_change)} top positions
                                  </Typography>
                                </Box>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Card
                            sx={{
                              background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.04) 0%, rgba(88, 86, 214, 0.04) 100%)',
                              border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                              borderRadius: 2,
                            }}
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}
                                >
                                  Google Change
                                </Typography>
                                <BarChartIcon sx={{ fontSize: 20, color: 'primary.main', opacity: 0.6 }} />
                              </Box>
                              <Typography 
                                variant="h4" 
                                fontWeight={700}
                                sx={{ 
                                  fontSize: '32px',
                                  letterSpacing: '-0.02em',
                                  mb: 1,
                                }}
                              >
                                {dashboardData.chart_data.keyword_rankings_performance.google_rankings_change >= 0 ? '+' : ''}{dashboardData.chart_data.keyword_rankings_performance.google_rankings_change || 0}
                              </Typography>
                              {dashboardData.chart_data.keyword_rankings_performance.google_rankings_change !== undefined && dashboardData.chart_data.keyword_rankings_performance.google_rankings_change !== 0 && (
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontSize: '0.875rem',
                                      fontWeight: 600,
                                      color: 'success.main'
                                    }}
                                  >
                                    ↑+{((Math.abs(dashboardData.chart_data.keyword_rankings_performance.google_rankings_change) / (dashboardData.chart_data.keyword_rankings_performance.google_rankings || 1)) * 100).toFixed(1)}% improvement
                                  </Typography>
                                </Box>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={12} md={4}>
                          <Card
                            sx={{
                              background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.04) 0%, rgba(90, 200, 250, 0.04) 100%)',
                              border: `1px solid ${alpha(theme.palette.success.main, 0.08)}`,
                              borderRadius: 2,
                            }}
                          >
                            <CardContent sx={{ p: 3 }}>
                              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block' }}
                                >
                                  Volume
                                </Typography>
                                <VisibilityIcon sx={{ fontSize: 20, color: 'success.main', opacity: 0.6 }} />
                              </Box>
                              <Typography 
                                variant="h4" 
                                fontWeight={700}
                                color="success.main"
                                sx={{ 
                                  fontSize: '32px',
                                  letterSpacing: '-0.02em',
                                  mb: 1,
                                }}
                              >
                                {(() => {
                                  const volume = dashboardData.chart_data.keyword_rankings_performance.volume || 0
                                  if (volume >= 1000000) {
                                    return `${(volume / 1000000).toFixed(1)}M`
                                  } else if (volume >= 1000) {
                                    return `${(volume / 1000).toFixed(1)}K`
                                  }
                                  return volume.toLocaleString()
                                })()}
                              </Typography>
                              {dashboardData.chart_data.keyword_rankings_performance.volume_change !== undefined && dashboardData.chart_data.keyword_rankings_performance.volume_change !== 0 && (
                                <Box display="flex" alignItems="center" gap={0.5}>
                                  <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                                  <Typography 
                                    variant="body2" 
                                    sx={{ 
                                      fontSize: '0.875rem',
                                      fontWeight: 600,
                                      color: 'success.main'
                                    }}
                                  >
                                    ↑+{Math.abs(dashboardData.chart_data.keyword_rankings_performance.volume_change).toFixed(1)}% search volume
                                  </Typography>
                                </Box>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Geographic Breakdown */}
              {dashboardData.chart_data?.geographic_breakdown && dashboardData.chart_data.geographic_breakdown.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1.2 }}
                >
                  <Card sx={{ mb: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography 
                        variant="h6" 
                        mb={3} 
                        fontWeight={600}
                        sx={{ fontSize: '1.125rem', letterSpacing: '-0.01em' }}
                      >
                        Geographic Breakdown
                      </Typography>
                      <TableContainer>
                        <Table>
                          <TableHead>
                            <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                              <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>
                                Country
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>
                                Users
                              </TableCell>
                              <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>
                                Sessions
                              </TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {dashboardData.chart_data.geographic_breakdown.map((geo, idx) => (
                              <TableRow key={idx} hover>
                                <TableCell>
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                                      {geo.country}
                                    </Typography>
                                  </Box>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                    {geo.users?.toLocaleString() || 0}
                                  </Typography>
                                </TableCell>
                                <TableCell>
                                  <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
                                    {geo.sessions?.toLocaleString() || 0}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          )}

          {/* Top Performing Prompts Section */}
          {dashboardData?.chart_data?.top_performing_prompts && dashboardData.chart_data.top_performing_prompts.length > 0 && (
            <>
              <Typography 
                variant="h5" 
                fontWeight={700} 
                sx={{ 
                  mt: 5, 
                  mb: 3,
                  fontSize: '1.5rem',
                  letterSpacing: '-0.02em',
                  color: 'text.primary'
                }}
              >
                Top Performing Prompts from Scrunch AI
              </Typography>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <Card sx={{ mb: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <CardContent sx={{ p: 3 }}>
                    <Grid container spacing={2}>
                      {dashboardData.chart_data.top_performing_prompts.map((prompt) => (
                        <Grid item xs={12} sm={6} md={4} key={prompt.id}>
                          <Paper
                            sx={{
                              p: 2,
                              borderLeft: `3px solid ${theme.palette.primary.main}`,
                              borderRadius: 1.5,
                              transition: 'all 0.2s',
                              '&:hover': {
                                transform: 'translateX(2px)',
                                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                              },
                            }}
                          >
                            <Box display="flex" alignItems="flex-start" justifyContent="space-between" mb={1}>
                              <Box display="flex" alignItems="center" gap={1}>
                                <Chip
                                  label={`Rank #${prompt.rank}`}
                                  size="small"
                                  sx={{
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '11px',
                                    height: 22,
                                    minWidth: 50,
                                  }}
                                />
                              </Box>
                            </Box>
                            <Typography 
                              variant="body2" 
                              fontWeight={600}
                              sx={{ 
                                fontSize: '0.875rem',
                                lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              {prompt.text || 'N/A'}
                            </Typography>
                            <Box display="flex" gap={2} mt={1.5}>
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ fontSize: '11px', fontWeight: 500 }}
                              >
                                {prompt.responseCount?.toLocaleString() || 0} responses
                              </Typography>
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ fontSize: '11px', fontWeight: 500 }}
                              >
                                {prompt.variants || 0} variants
                              </Typography>
                            </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}

          {/* Scrunch AI Insights Section */}
          {dashboardData?.chart_data?.scrunch_ai_insights && dashboardData.chart_data.scrunch_ai_insights.length > 0 && (
            <>
              <Typography 
                variant="h5" 
                fontWeight={700} 
                sx={{ 
                  mt: 5, 
                  mb: 3,
                  fontSize: '1.5rem',
                  letterSpacing: '-0.02em',
                  color: 'text.primary'
                }}
              >
                Scrunch AI Insights
              </Typography>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <Card sx={{ mb: 3, borderRadius: 2, border: `1px solid ${theme.palette.divider}`, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <CardContent sx={{ p: 0 }}>
                    <Box p={3} borderBottom="1px solid" borderColor="divider">
                      <Typography 
                        variant="h6" 
                        fontWeight={600}
                        sx={{ fontSize: '1.125rem', letterSpacing: '-0.01em' }}
                      >
                        Scrunch AI Insights
                      </Typography>
                    </Box>
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.04) }}>
                            <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, minWidth: 200 }}>
                              Seed Prompt
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, minWidth: 120 }}>
                              Data
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, minWidth: 120 }}>
                              Presence
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, minWidth: 100 }}>
                              Citations
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, minWidth: 100 }}>
                              Competitors
                            </TableCell>
                            <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5, minWidth: 100 }}>
                              Stage
                            </TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {dashboardData.chart_data.scrunch_ai_insights.map((insight) => (
                            <TableRow 
                              key={insight.id || insight.seedPrompt}
                              hover
                              sx={{
                                transition: 'all 0.2s',
                                '&:hover': {
                                  bgcolor: alpha(theme.palette.primary.main, 0.02),
                                },
                              }}
                            >
                              <TableCell sx={{ py: 2 }}>
                                <Box>
                                  <Typography 
                                    variant="body2" 
                                    fontWeight={600}
                                    sx={{ 
                                      fontSize: '0.875rem',
                                      mb: 0.5,
                                      lineHeight: 1.4,
                                    }}
                                  >
                                    {insight.seedPrompt.length > 60 
                                      ? insight.seedPrompt.substring(0, 60) + '...' 
                                      : insight.seedPrompt}
                                  </Typography>
                                  <Typography 
                                    variant="caption" 
                                    color="text.secondary"
                                    sx={{ fontSize: '11px', fontStyle: 'italic' }}
                                  >
                                    {insight.category}
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Box>
                                  <Typography 
                                    variant="body2" 
                                    sx={{ fontSize: '0.875rem', fontWeight: 600, mb: 0.25 }}
                                  >
                                    {insight.variants?.toLocaleString() || 0} variants
                                  </Typography>
                                  <Typography 
                                    variant="caption" 
                                    color="text.secondary"
                                    sx={{ fontSize: '0.75rem' }}
                                  >
                                    {insight.responses?.toLocaleString() || 0} responses
                                  </Typography>
                                </Box>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Box>
                                  <Typography 
                                    variant="body2" 
                                    fontWeight={700}
                                    sx={{ fontSize: '0.9375rem', mb: 0.25 }}
                                  >
                                    {insight.presence}%
                                  </Typography>
                                  {insight.presenceChange !== undefined && (
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                      {insight.presenceChange >= 0 ? (
                                        <TrendingUpIcon sx={{ fontSize: 12, color: 'success.main' }} />
                                      ) : (
                                        <TrendingDownIcon sx={{ fontSize: 12, color: 'error.main' }} />
                                      )}
                                      <Typography 
                                        variant="caption" 
                                        sx={{ 
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          color: insight.presenceChange >= 0 ? 'success.main' : 'error.main'
                                        }}
                                      >
                                        {insight.presenceChange >= 0 ? '+' : ''}{insight.presenceChange.toFixed(1)}%
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Box>
                                  <Typography 
                                    variant="body2" 
                                    fontWeight={600}
                                    sx={{ fontSize: '0.9375rem', mb: 0.25 }}
                                  >
                                    {insight.citations || 0}
                                  </Typography>
                                  {insight.citationsChange !== undefined && (
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                      {insight.citationsChange >= 0 ? (
                                        <TrendingUpIcon sx={{ fontSize: 12, color: 'success.main' }} />
                                      ) : (
                                        <TrendingDownIcon sx={{ fontSize: 12, color: 'error.main' }} />
                                      )}
                                      <Typography 
                                        variant="caption" 
                                        sx={{ 
                                          fontSize: '11px',
                                          fontWeight: 600,
                                          color: insight.citationsChange >= 0 ? 'success.main' : 'error.main'
                                        }}
                                      >
                                        {insight.citationsChange >= 0 ? '+' : ''}{insight.citationsChange}
                                      </Typography>
                                    </Box>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Box>
                                  <Typography 
                                    variant="body2" 
                                    fontWeight={600}
                                    sx={{ fontSize: '0.9375rem', mb: 0.25 }}
                                  >
                                    {insight.competitors || 0} active
                                  </Typography>
                                  {insight.competitorsChange !== undefined && (
                                    <Typography 
                                      variant="caption" 
                                      color="text.secondary"
                                      sx={{ fontSize: '11px' }}
                                    >
                                      {insight.competitorsChange >= 0 ? '+' : ''}{insight.competitorsChange}
                                    </Typography>
                                  )}
                                </Box>
                              </TableCell>
                              <TableCell sx={{ py: 2 }}>
                                <Chip
                                  label={insight.stage}
                                  size="small"
                                  sx={{
                                    bgcolor: insight.stage === 'Awareness' ? alpha(theme.palette.info.main, 0.1) :
                                             insight.stage === 'Evaluation' ? alpha(theme.palette.warning.main, 0.1) :
                                             alpha(theme.palette.success.main, 0.1),
                                    color: insight.stage === 'Awareness' ? 'info.main' :
                                           insight.stage === 'Evaluation' ? 'warning.main' :
                                           'success.main',
                                    fontWeight: 600,
                                    fontSize: '11px',
                                    height: 24,
                                  }}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                    {dashboardData.chart_data.scrunch_ai_insights.length === 0 && (
                      <Box p={4} textAlign="center">
                        <Typography color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                          No insights available
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </>
          )}

          {/* Charts Section */}
          <Grid container spacing={3}>
            {/* Users Over Time - Line Chart */}
            {dashboardData.chart_data?.users_over_time?.length > 0 && (
              <Grid item xs={12} md={8}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Card sx={{ height: 400 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" mb={2} fontWeight={600}>Users</Typography>
                      <ResponsiveContainer width="100%" height={320}>
                        <LineChart 
                          data={[...dashboardData.chart_data.users_over_time].sort((a, b) => {
                            // Sort by date in ascending order (oldest to newest)
                            const dateA = a.date || ''
                            const dateB = b.date || ''
                            return dateA.localeCompare(dateB)
                          })}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                          <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 12 }}
                            stroke="#71717A"
                            tickFormatter={(value) => {
                              // Format date from YYYYMMDD to MM-DD-YYYY
                              if (value && value.length === 8) {
                                const year = value.substring(0, 4)
                                const month = value.substring(4, 6)
                                const day = value.substring(6, 8)
                                return `${month}-${day}-${year}`
                              }
                              return value
                            }}
                          />
                          <YAxis 
                            tick={{ fontSize: 12 }}
                            stroke="#71717A"
                          />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '8px', 
                              border: 'none', 
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              backgroundColor: '#FFFFFF'
                            }}
                            labelFormatter={(value) => {
                              // Format date from YYYYMMDD to MM-DD-YYYY for tooltip
                              if (value && value.length === 8) {
                                const year = value.substring(0, 4)
                                const month = value.substring(4, 6)
                                const day = value.substring(6, 8)
                                return `${month}-${day}-${year}`
                              }
                              return value
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="users" 
                            stroke="rgba(59, 130, 246, 0.6)" 
                            strokeWidth={2}
                            dot={{ fill: 'rgba(59, 130, 246, 0.6)', r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            )}

            {/* Sessions by Channel - Donut Chart */}
            {dashboardData.chart_data?.traffic_sources?.length > 0 && (
              <Grid item xs={12} md={4}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <Card sx={{ height: 400 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" mb={2} fontWeight={600}>Sessions by Channel</Typography>
                      <ResponsiveContainer width="100%" height={320}>
                        <PieChart>
                          <Pie
                            data={dashboardData.chart_data.traffic_sources.slice(0, 4).map((item) => ({
                              name: getChannelLabel(item.source),
                              value: item.sessions || 0,
                              originalSource: item.source // Keep original for color mapping
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(2)}%`}
                            outerRadius={100}
                            innerRadius={60}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {dashboardData.chart_data.traffic_sources.slice(0, 4).map((entry, index) => {
                              return <Cell key={`cell-${index}`} fill={getChannelColor(entry.source)} />
                            })}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '8px', 
                              border: 'none', 
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              backgroundColor: '#FFFFFF'
                            }}
                          />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value) => {
                              // Find the original source to get the correct color
                              const originalSource = dashboardData.chart_data.traffic_sources.slice(0, 4).find(
                                item => getChannelLabel(item.source) === value
                              )?.source || value
                              const color = getChannelColor(originalSource)
                              return <span style={{ color }}>{value}</span>
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            )}

            {/* Traffic Acquisition Channels - Horizontal Bar Chart */}
            {dashboardData.chart_data?.traffic_sources?.length > 0 && (
              <Grid item xs={12} md={4}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.45 }}
                >
                  <Card sx={{ height: 400 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" mb={2} fontWeight={600}>Traffic Acquisition Channels</Typography>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          data={dashboardData.chart_data.traffic_sources.slice(0, 4)}
                          layout="vertical"
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4E4E7" />
                          <XAxis type="number" tick={{ fontSize: 12 }} stroke="#71717A" />
                          <YAxis 
                            dataKey="source" 
                            type="category" 
                            width={100} 
                            stroke="#71717A"
                            tick={(props) => {
                              const { x, y, payload } = props
                              const color = getChannelColor(payload.value)
                              const label = getChannelLabel(payload.value)
                              return (
                                <g transform={`translate(${x},${y})`}>
                                  <text
                                    x={0}
                                    y={0}
                                    dy={4}
                                    textAnchor="end"
                                    fill={color}
                                    fontSize={12}
                                  >
                                    {label}
                                  </text>
                                </g>
                              )
                            }}
                          />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '8px', 
                              border: 'none', 
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              backgroundColor: '#FFFFFF'
                            }}
                          />
                          <Bar dataKey="sessions" radius={[0, 4, 4, 0]}>
                            {dashboardData.chart_data.traffic_sources.slice(0, 4).map((entry, index) => {
                              return <Cell key={`cell-${index}`} fill={getChannelColor(entry.source)} />
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            )}

            {/* Impressions vs Clicks - Bar Chart */}
            {dashboardData.chart_data?.impressions_vs_clicks?.length > 0 && (
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                >
                  <Card sx={{ height: 400 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" mb={2} fontWeight={600}>Impressions vs Clicks</Typography>
                      <ResponsiveContainer width="100%" height={320}>
                        <BarChart
                          data={dashboardData.chart_data.impressions_vs_clicks}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                          <XAxis 
                            dataKey="campaign" 
                            tick={{ fontSize: 12 }}
                            stroke="#71717A"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis tick={{ fontSize: 12 }} stroke="#71717A" />
                          <Tooltip 
                            contentStyle={{ 
                              borderRadius: '8px', 
                              border: 'none', 
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                              backgroundColor: '#FFFFFF'
                            }}
                          />
                          <Legend />
                          <Bar dataKey="impressions" fill="rgba(59, 130, 246, 0.6)" name="Impressions" />
                          <Bar dataKey="clicks" fill="rgba(20, 184, 166, 0.6)" name="Clicks" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            )}

            {/* Top Campaigns - Table */}
            {dashboardData.chart_data?.top_campaigns?.length > 0 && (
              <Grid item xs={12} md={6}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.6 }}
                >
                  <Card sx={{ height: 400 }}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h6" mb={2} fontWeight={600}>Top Campaigns</Typography>
                      <TableContainer sx={{ maxHeight: 320 }}>
                        <Table stickyHeader>
                          <TableHead>
                            <TableRow>
                              <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Campaign</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Impressions</TableCell>
                              <TableCell align="right" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>Engagement</TableCell>
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {dashboardData.chart_data.top_campaigns.map((campaign, index) => (
                              <TableRow key={index} hover>
                                <TableCell sx={{ fontSize: '0.875rem' }}>{campaign.campaign}</TableCell>
                                <TableCell align="right" sx={{ fontSize: '0.875rem' }}>
                                  {campaign.impressions.toLocaleString()}
                                </TableCell>
                                <TableCell align="right" sx={{ fontSize: '0.875rem' }}>
                                  {campaign.engagement.toLocaleString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </TableContainer>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            )}
          </Grid>

          {/* Brand Analytics Charts Section */}
          {brandAnalytics && (
            <>
              <Typography 
                variant="h5" 
                fontWeight={700} 
                sx={{ 
                  mt: 5, 
                  mb: 3,
                  fontSize: '1.5rem',
                  letterSpacing: '-0.02em',
                  color: 'text.primary'
                }}
              >
                Brand Analytics Insights
              </Typography>

              <Grid container spacing={2.5} sx={{ mb: 3 }}>
                {/* Platform Distribution - Donut Chart */}
                {brandAnalytics.platform_distribution && Object.keys(brandAnalytics.platform_distribution).length > 0 && (
                  <Grid item xs={12} md={6}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.7 }}
                    >
                      <Card
                        sx={{
                          borderRadius: 2,
                          border: `1px solid ${theme.palette.divider}`,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="h6" mb={3} fontWeight={600} sx={{ fontSize: '1rem' }}>
                            Platform Distribution
                          </Typography>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={Object.entries(brandAnalytics.platform_distribution).map(([name, value]) => ({
                                  name,
                                  value
                                }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                innerRadius={60}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {Object.entries(brandAnalytics.platform_distribution).map((entry, index) => {
                                  const softColors = [
                                    'rgba(0, 122, 255, 0.5)',      // Blue
                                    'rgba(52, 199, 89, 0.5)',      // Green
                                    'rgba(255, 149, 0, 0.5)',      // Orange
                                    'rgba(255, 45, 85, 0.5)',      // Red
                                    'rgba(88, 86, 214, 0.5)',      // Purple
                                    'rgba(255, 193, 7, 0.5)',      // Yellow
                                    'rgba(90, 200, 250, 0.5)',     // Light Blue
                                  ]
                                  return <Cell key={`cell-${index}`} fill={softColors[index % softColors.length]} />
                                })}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  borderRadius: '8px', 
                                  border: 'none', 
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  backgroundColor: '#FFFFFF'
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                )}

                {/* Stage Distribution - Pie Chart */}
                {brandAnalytics.stage_distribution && Object.keys(brandAnalytics.stage_distribution).length > 0 && (
                  <Grid item xs={12} md={6}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.8 }}
                    >
                      <Card
                        sx={{
                          borderRadius: 2,
                          border: `1px solid ${theme.palette.divider}`,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="h6" mb={3} fontWeight={600} sx={{ fontSize: '1rem' }}>
                            Funnel Stage Distribution
                          </Typography>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={Object.entries(brandAnalytics.stage_distribution).map(([name, value]) => ({
                                  name,
                                  value
                                }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {Object.entries(brandAnalytics.stage_distribution).map((entry, index) => {
                                  const softColors = [
                                    'rgba(59, 130, 246, 0.6)',      // Light blue
                                    'rgba(20, 184, 166, 0.6)',      // Teal/Green
                                    'rgba(251, 146, 60, 0.6)',      // Orange
                                    'rgba(239, 68, 68, 0.6)',       // Orange-red
                                    'rgba(88, 86, 214, 0.6)',       // Purple
                                  ]
                                  return <Cell key={`cell-${index}`} fill={softColors[index % softColors.length]} />
                                })}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  borderRadius: '8px', 
                                  border: 'none', 
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  backgroundColor: '#FFFFFF'
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                )}

                {/* Brand Sentiment - Donut Chart */}
                {brandAnalytics.brand_sentiment && Object.keys(brandAnalytics.brand_sentiment).filter(key => brandAnalytics.brand_sentiment[key] > 0).length > 0 && (
                  <Grid item xs={12} md={6}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.9 }}
                    >
                      <Card
                        sx={{
                          borderRadius: 2,
                          border: `1px solid ${theme.palette.divider}`,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="h6" mb={3} fontWeight={600} sx={{ fontSize: '1rem' }}>
                            Brand Sentiment
                          </Typography>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={Object.entries(brandAnalytics.brand_sentiment)
                                  .filter(([name, value]) => value > 0)
                                  .map(([name, value]) => ({
                                    name: name.charAt(0).toUpperCase() + name.slice(1),
                                    value
                                  }))}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                                outerRadius={100}
                                innerRadius={60}
                                fill="#8884d8"
                                dataKey="value"
                              >
                                {Object.entries(brandAnalytics.brand_sentiment)
                                  .filter(([name, value]) => value > 0)
                                  .map((entry, index) => {
                                    const colors = {
                                      positive: 'rgba(20, 184, 166, 0.6)',      // Teal/Green
                                      negative: 'rgba(239, 68, 68, 0.6)',       // Orange-red
                                      neutral: 'rgba(251, 146, 60, 0.6)',       // Orange
                                      null: 'rgba(88, 86, 214, 0.6)',           // Purple
                                    }
                                    const key = entry[0].toLowerCase()
                                    return <Cell key={`cell-${index}`} fill={colors[key] || 'rgba(88, 86, 214, 0.6)'} />
                                  })}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  borderRadius: '8px', 
                                  border: 'none', 
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  backgroundColor: '#FFFFFF'
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>
                )}

              </Grid>

              {/* Top Competitors - List */}
              {brandAnalytics.top_competitors && brandAnalytics.top_competitors.length > 0 && (
                <Grid container spacing={2.5} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={6}>
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 1.1 }}
                    >
                      <Card
                        sx={{
                          borderRadius: 2,
                          border: `1px solid ${theme.palette.divider}`,
                          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                        }}
                      >
                        <CardContent sx={{ p: 3 }}>
                          <Typography variant="h6" mb={2} fontWeight={600} sx={{ fontSize: '1rem' }}>
                            Top Competitors
                          </Typography>
                          <Box display="flex" flexDirection="column" gap={1.5}>
                            {brandAnalytics.top_competitors.slice(0, 10).map((comp, idx) => (
                              <Paper
                                key={idx}
                                sx={{
                                  p: 1.5,
                                  borderLeft: `3px solid ${theme.palette.primary.main}`,
                                  borderRadius: 1.5,
                                  transition: 'all 0.2s',
                                  '&:hover': {
                                    transform: 'translateX(2px)',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                                  },
                                }}
                              >
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                  <Box display="flex" alignItems="center" gap={1}>
                                    <Chip
                                      label={`#${idx + 1}`}
                                      size="small"
                                      sx={{
                                        bgcolor: theme.palette.primary.main,
                                        color: 'white',
                                        fontWeight: 700,
                                        fontSize: '0.7rem',
                                        height: 20,
                                        minWidth: 28,
                                      }}
                                    />
                                    <Typography variant="body2" fontWeight={600} sx={{ fontSize: '0.875rem' }}>
                                      {comp.name}
                                    </Typography>
                                  </Box>
                                  <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ fontSize: '0.875rem' }}>
                                    {comp.count.toLocaleString()}
                                  </Typography>
                                </Box>
                              </Paper>
                            ))}
                          </Box>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Grid>

                  {/* Top Topics - Chips List */}
                  {brandAnalytics.top_topics && brandAnalytics.top_topics.length > 0 && (
                    <Grid item xs={12} md={6}>
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 1.2 }}
                      >
                        <Card
                          sx={{
                            borderRadius: 2,
                            border: `1px solid ${theme.palette.divider}`,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                          }}
                        >
                          <CardContent sx={{ p: 3 }}>
                            <Typography variant="h6" mb={2} fontWeight={600} sx={{ fontSize: '1rem' }}>
                              Top Topics
                            </Typography>
                            <Box display="flex" flexWrap="wrap" gap={1}>
                              {brandAnalytics.top_topics.slice(0, 20).map((topic, idx) => (
                                <Chip
                                  key={idx}
                                  label={`${topic.topic} (${topic.count})`}
                                  size="small"
                                  sx={{
                                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                                    color: 'primary.main',
                                    fontWeight: 600,
                                    fontSize: '0.75rem',
                                    height: 28,
                                    '&:hover': {
                                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                                    },
                                  }}
                                />
                              ))}
                            </Box>
                          </CardContent>
                        </Card>
                      </motion.div>
                    </Grid>
                  )}
                </Grid>
              )}
            </>
          )}
        </>
      ) : (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          Please select a brand to view the reporting dashboard.
        </Alert>
      )}

      {/* KPI Selector Dialog */}
      <Dialog
        open={showKPISelector}
        onClose={() => setShowKPISelector(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" fontWeight={600}>
              Select KPIs to Display
            </Typography>
            <Box display="flex" gap={1}>
              <Button size="small" onClick={handleSelectAll} variant="outlined">
                Select All
              </Button>
              <Button size="small" onClick={handleDeselectAll} variant="outlined">
                Deselect All
              </Button>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent dividers sx={{ maxHeight: 500, overflow: 'auto' }}>
          <Box>
            {/* Group KPIs by source */}
            {['GA4', 'AgencyAnalytics', 'Scrunch'].map((source) => {
              const sourceKPIs = KPI_ORDER.filter(key => {
                const metadata = KPI_METADATA[key]
                return metadata && metadata.source === source
              })
              
              return (
                <Box key={source} mb={3}>
                  <Typography 
                    variant="subtitle1" 
                    fontWeight={600} 
                    mb={1.5}
                    sx={{ 
                      color: getSourceColor(source),
                      textTransform: 'uppercase',
                      fontSize: '0.75rem',
                      letterSpacing: '0.05em'
                    }}
                  >
                    {source} ({sourceKPIs.filter(k => tempSelectedKPIs.has(k)).length} / {sourceKPIs.length})
                  </Typography>
                  <Box display="flex" flexDirection="column" gap={1}>
                    {sourceKPIs.map((key) => {
                      const metadata = KPI_METADATA[key]
                      const kpi = dashboardData?.kpis?.[key]
                      const isAvailable = !!kpi
                      
                      return (
                        <FormControlLabel
                          key={key}
                          control={
                            <Checkbox
                              checked={tempSelectedKPIs.has(key)}
                              onChange={(e) => handleKPIChange(key, e.target.checked)}
                              disabled={!isAvailable}
                              sx={{
                                color: getSourceColor(source),
                                '&.Mui-checked': {
                                  color: getSourceColor(source),
                                },
                                '&.Mui-disabled': {
                                  color: theme.palette.grey[400],
                                },
                              }}
                            />
                          }
                          label={
                            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                              <Box>
                                <Typography variant="body2" fontWeight={600}>
                                  {metadata.label}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {metadata.source}
                                </Typography>
                              </Box>
                              {!isAvailable && (
                                <Chip
                                  label="Not Available"
                                  size="small"
                                  sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    bgcolor: theme.palette.grey[100],
                                    color: theme.palette.grey[600],
                                  }}
                                />
                              )}
                            </Box>
                          }
                          sx={{ 
                            mb: 0.5, 
                            width: '100%',
                            opacity: isAvailable ? 1 : 0.6
                          }}
                        />
                      )
                    })}
                  </Box>
                </Box>
              )
            })}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
          <Button 
            onClick={() => {
              setTempSelectedKPIs(new Set(selectedKPIs))
              setShowKPISelector(false)
            }}
            variant="outlined"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSaveKPISelection} 
            variant="contained"
            disabled={tempSelectedKPIs.size === 0}
            sx={{
              bgcolor: theme.palette.primary.main,
              '&:hover': {
                bgcolor: theme.palette.primary.dark,
              }
            }}
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600, pb: 1 }}>
          Share Public Dashboard
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Share this URL with clients to give them access to the public reporting dashboard for this brand.
          </Typography>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              p: 1.5,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              border: `1px solid ${theme.palette.divider}`,
            }}
          >
            <LinkIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
            <Typography
              variant="body2"
              sx={{
                flex: 1,
                fontFamily: 'monospace',
                fontSize: '0.875rem',
                wordBreak: 'break-all',
                color: 'text.primary',
              }}
            >
              {shareableUrl}
            </Typography>
            <IconButton
              onClick={handleCopyUrl}
              size="small"
              sx={{
                color: copied ? theme.palette.success.main : 'text.secondary',
                '&:hover': {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
              title={copied ? 'Copied!' : 'Copy URL'}
            >
              {copied ? <CheckIcon fontSize="small" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Box>
          {copied && (
            <Typography
              variant="caption"
              color="success.main"
              sx={{ mt: 1, display: 'block', fontWeight: 600 }}
            >
              URL copied to clipboard!
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 1 }}>
          <Button
            onClick={() => setShowShareDialog(false)}
            variant="outlined"
            sx={{ borderRadius: 2, textTransform: 'none' }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default ReportingDashboard
