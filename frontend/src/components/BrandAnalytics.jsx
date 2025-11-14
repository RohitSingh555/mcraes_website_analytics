import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  CircularProgress,
  Alert,
  LinearProgress,
  Chip,
  Paper,
  alpha,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material'
import { Refresh as RefreshIcon } from '@mui/icons-material'
import { syncAPI } from '../services/api'

function BrandAnalytics() {
  const [analytics, setAnalytics] = useState(null)
  const [brands, setBrands] = useState([])
  const [selectedBrandId, setSelectedBrandId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const theme = useTheme()

  useEffect(() => {
    loadBrands()
    loadAnalytics()
  }, [])

  useEffect(() => {
    loadAnalytics(selectedBrandId)
  }, [selectedBrandId])

  const loadBrands = async () => {
    try {
      const response = await syncAPI.getBrands()
      const brandsData = response.items || response || []
      setBrands(brandsData)
    } catch (err) {
      console.error('Failed to load brands:', err)
    }
  }

  const loadAnalytics = async (brandId = null) => {
    try {
      setLoading(true)
      setError(null)
      const response = await syncAPI.getBrandAnalytics(brandId)
      setAnalytics(response.global_analytics || null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num) => num?.toLocaleString() || '0'
  const formatPercentage = (value, total) => {
    if (!total || total === 0) return '0%'
    return `${((value / total) * 100).toFixed(1)}%`
  }

  const renderChart = (data, title, color = '#007AFF') => {
    if (!data || Object.keys(data).length === 0) {
      return (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          py={3}
          textAlign="center"
          sx={{ fontSize: '13px' }}
        >
          No data available
        </Typography>
      )
    }

    const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
    const max = Math.max(...entries.map(e => e[1]))

    return (
      <Box>
        <Typography 
          variant="h6" 
          mb={2} 
          fontWeight={600}
          sx={{ fontSize: '16px', letterSpacing: '-0.01em' }}
        >
          {title}
        </Typography>
        <Box>
          {entries.map(([key, value]) => (
            <Box key={key} mb={1.5}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                <Typography 
                  variant="body2" 
                  fontWeight={500}
                  textTransform="capitalize"
                  sx={{ fontSize: '13px' }}
                >
                  {key}
                </Typography>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: '11px', fontWeight: 500 }}
                  >
                    {formatPercentage(value, max)}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    fontWeight={700}
                    sx={{ fontSize: '15px', minWidth: 45, textAlign: 'right' }}
                  >
                    {formatNumber(value)}
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(value / max) * 100}
                sx={{
                  height: 6,
                  borderRadius: 1,
                  backgroundColor: alpha(color, 0.08),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 1,
                    background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`,
                  },
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>
    )
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress size={32} thickness={4} />
      </Box>
    )
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        sx={{ 
          mb: 3,
          borderRadius: 2,
          fontSize: '13px',
        }}
        onClose={() => setError(null)}
      >
        {error}
      </Alert>
    )
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="text.secondary" py={3} sx={{ fontSize: '16px' }}>
            No analytics data available. Sync data first to view analytics.
          </Typography>
        </CardContent>
      </Card>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
        <Box>
          <Typography 
            variant="h4" 
            fontWeight={600} 
            mb={0.5}
            sx={{
              fontSize: '24px',
              letterSpacing: '-0.01em',
            }}
          >
            Brand Analytics
          </Typography>
          <Typography 
            variant="body2" 
            color="text.secondary"
            sx={{ fontSize: '13px' }}
          >
            Comprehensive insights and performance metrics
          </Typography>
        </Box>
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Filter by Brand</InputLabel>
            <Select
              value={selectedBrandId || ''}
              onChange={(e) => setSelectedBrandId(e.target.value || null)}
              label="Filter by Brand"
              sx={{
                borderRadius: 2,
                fontSize: '13px',
              }}
            >
              <MenuItem value="">All Brands</MenuItem>
              {brands.map((brand) => (
                <MenuItem key={brand.id} value={brand.id}>
                  {brand.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button 
            variant="outlined" 
            size="small"
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={() => loadAnalytics(selectedBrandId)}
            sx={{
              borderRadius: 2,
              px: 2,
              py: 0.75,
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Key Metrics */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                mb={1}
                sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Total Responses
              </Typography>
              <Typography 
                variant="h4" 
                fontWeight={700}
                sx={{ 
                  fontSize: '28px',
                  letterSpacing: '-0.01em',
                }}
              >
                {formatNumber(analytics.total_responses)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                mb={1}
                sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Brand Presence
              </Typography>
              <Typography 
                variant="h4" 
                fontWeight={700} 
                color="success.main"
                sx={{ 
                  fontSize: '28px',
                  letterSpacing: '-0.01em',
                  mb: 0.25,
                }}
              >
                {formatNumber(analytics.brand_presence?.present)}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontSize: '12px', fontWeight: 500 }}
              >
                {formatPercentage(analytics.brand_presence?.present, analytics.total_responses)} of responses
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                mb={1}
                sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Total Citations
              </Typography>
              <Typography 
                variant="h4" 
                fontWeight={700} 
                color="info.main"
                sx={{ 
                  fontSize: '28px',
                  letterSpacing: '-0.01em',
                  mb: 0.25,
                }}
              >
                {formatNumber(analytics.citation_metrics?.total)}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontSize: '12px', fontWeight: 500 }}
              >
                Avg: {analytics.citation_metrics?.average_per_response || 0} per response
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography 
                variant="caption" 
                color="text.secondary" 
                mb={1}
                sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Top Competitors
              </Typography>
              <Typography 
                variant="h4" 
                fontWeight={700} 
                color="warning.main"
                sx={{ 
                  fontSize: '28px',
                  letterSpacing: '-0.01em',
                  mb: 0.25,
                }}
              >
                {analytics.top_competitors?.length || 0}
              </Typography>
              <Typography 
                variant="caption" 
                color="text.secondary"
                sx={{ fontSize: '12px', fontWeight: 500 }}
              >
                Different competitors mentioned
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              {renderChart(analytics.platform_distribution, 'Platform Distribution', '#007AFF')}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              {renderChart(analytics.stage_distribution, 'Funnel Stage Distribution', '#34C759')}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography 
                variant="h6" 
                mb={2} 
                fontWeight={600}
                sx={{ fontSize: '16px', letterSpacing: '-0.01em' }}
              >
                Brand Sentiment
              </Typography>
              {analytics.brand_sentiment && Object.keys(analytics.brand_sentiment).length > 0 ? (
                <Grid container spacing={1.5}>
                  {Object.entries(analytics.brand_sentiment).map(([key, value]) => (
                    <Grid item xs={6} sm={3} key={key}>
                      <Box textAlign="center">
                        <Chip
                          label={key.charAt(0).toUpperCase() + key.slice(1)}
                          size="small"
                          color={
                            key === 'positive' ? 'success' :
                            key === 'negative' ? 'error' :
                            key === 'neutral' ? 'warning' : 'default'
                          }
                          sx={{ 
                            mb: 1, 
                            width: '100%',
                            fontSize: '11px',
                            height: 24,
                            fontWeight: 600,
                          }}
                        />
                        <Typography 
                          variant="h6" 
                          fontWeight={700}
                          sx={{ fontSize: '20px', mb: 0.25 }}
                        >
                          {formatNumber(value)}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          color="text.secondary"
                          sx={{ fontSize: '11px', fontWeight: 500 }}
                        >
                          {formatPercentage(value, analytics.total_responses)}
                        </Typography>
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography color="text.secondary" sx={{ fontSize: '13px' }}>
                  No sentiment data
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent sx={{ p: 3 }}>
              {renderChart(analytics.country_distribution, 'Country Distribution', '#FF9500')}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Competitors */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography 
            variant="h6" 
            mb={2} 
            fontWeight={600}
            sx={{ fontSize: '16px', letterSpacing: '-0.01em' }}
          >
            Top Competitors
          </Typography>
          {analytics.top_competitors?.length > 0 ? (
            <Grid container spacing={1.5}>
              {analytics.top_competitors.map((comp, idx) => (
                <Grid item xs={12} sm={6} md={4} key={idx}>
                  <Paper 
                    sx={{ 
                      p: 1.5, 
                      borderLeft: `3px solid ${theme.palette.primary.main}`,
                      borderRadius: 1.5,
                      transition: 'all 0.2s',
                      '&:hover': {
                        transform: 'translateX(2px)',
                      },
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Box display="flex" alignItems="center" gap={1}>
                        <Chip 
                          label={`#${idx + 1}`} 
                          size="small" 
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '11px',
                            height: 20,
                            minWidth: 28,
                          }}
                        />
                        <Typography 
                          variant="body2" 
                          fontWeight={600}
                          sx={{ fontSize: '13px' }}
                        >
                          {comp.name}
                        </Typography>
                      </Box>
                      <Typography 
                        variant="body2" 
                        fontWeight={700} 
                        color="primary.main"
                        sx={{ fontSize: '13px' }}
                      >
                        {formatNumber(comp.count)}
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          ) : (
            <Typography color="text.secondary" sx={{ fontSize: '13px' }}>
              No competitors mentioned
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Top Topics */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <Typography 
            variant="h6" 
            mb={2} 
            fontWeight={600}
            sx={{ fontSize: '16px', letterSpacing: '-0.01em' }}
          >
            Top Topics
          </Typography>
          {analytics.top_topics?.length > 0 ? (
            <Box display="flex" flexWrap="wrap" gap={1}>
              {analytics.top_topics.slice(0, 20).map((topic, idx) => (
                <Chip
                  key={idx}
                  label={`${topic.topic} (${topic.count})`}
                  size="small"
                  sx={{
                    bgcolor: alpha(theme.palette.primary.main, 0.08),
                    color: 'primary.main',
                    fontWeight: 600,
                    fontSize: '12px',
                    height: 28,
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.15),
                    },
                  }}
                />
              ))}
            </Box>
          ) : (
            <Typography color="text.secondary" sx={{ fontSize: '13px' }}>
              No topics available
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  )
}

export default BrandAnalytics
