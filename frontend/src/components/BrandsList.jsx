import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Button,
  alpha,
  useTheme,
  Fade,
  Skeleton
} from '@mui/material'
import {
  Business as BusinessIcon,
  Language as LanguageIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import { syncAPI } from '../services/api'

function BrandsList() {
  const [brands, setBrands] = useState([])
  const [brandsWithAnalytics, setBrandsWithAnalytics] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const theme = useTheme()

  useEffect(() => {
    loadBrands()
  }, [])

  const loadBrands = async () => {
    try {
      setLoading(true)
      setError(null)
      const [brandsResponse, analyticsResponse] = await Promise.all([
        syncAPI.getBrands(),
        syncAPI.getBrandAnalytics().catch(() => null)
      ])
      
      const brandsList = brandsResponse.items || brandsResponse || []
      setBrands(brandsList)
      
      // Map brands with their individual analytics
      if (analyticsResponse?.brands && Array.isArray(analyticsResponse.brands)) {
        // Create a map of brand ID to analytics
        const analyticsMap = new Map()
        analyticsResponse.brands.forEach(brandWithAnalytics => {
          analyticsMap.set(brandWithAnalytics.id, brandWithAnalytics.analytics)
        })
        
        // Merge brands with their analytics
        const brandsWithStats = brandsList.map(brand => ({
          ...brand,
          analytics: analyticsMap.get(brand.id) || null
        }))
        
        setBrandsWithAnalytics(brandsWithStats)
      } else {
        // If no analytics response, just set brands without analytics
        setBrandsWithAnalytics(brandsList.map(brand => ({ ...brand, analytics: null })))
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load brands')
    } finally {
      setLoading(false)
    }
  }

  const getBrandStats = (brandId) => {
    const brandWithAnalytics = brandsWithAnalytics.find(b => b.id === brandId)
    if (!brandWithAnalytics?.analytics) return null
    
    const analytics = brandWithAnalytics.analytics
    return {
      totalResponses: analytics.total_responses || 0,
      brandPresence: analytics.brand_presence?.present || 0,
      topCompetitors: analytics.top_competitors?.length || 0
    }
  }


  if (loading) {
    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Skeleton variant="rectangular" width={150} height={32} sx={{ borderRadius: 1.5 }} />
          <Skeleton variant="rectangular" width={100} height={32} sx={{ borderRadius: 1.5 }} />
        </Box>
        <Grid container spacing={2.5}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={6} md={4} key={i}>
              <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
        </Grid>
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

  if (brands.length === 0) {
    return (
      <Card>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <BusinessIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.4 }} />
          <Typography variant="h6" fontWeight={600} mb={1} sx={{ fontSize: '18px' }}>
            No brands available
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3} sx={{ fontSize: '13px' }}>
            Sync data first to view brands
          </Typography>
          <Button 
            variant="contained" 
            size="small"
            onClick={loadBrands}
            sx={{
              px: 2.5,
              py: 1,
              borderRadius: 2,
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            Refresh
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Fade in={true}>
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
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
              Brands
            </Typography>
            <Typography 
              variant="body2" 
              color="text.secondary" 
              sx={{ fontSize: '13px' }}
            >
              {brands.length} {brands.length === 1 ? 'brand' : 'brands'} available
            </Typography>
          </Box>
          <Button 
            variant="outlined" 
            size="small"
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={loadBrands}
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

        <Grid container spacing={2.5}>
          {(brandsWithAnalytics.length > 0 ? brandsWithAnalytics : brands).map((brand, index) => {
            const stats = getBrandStats(brand.id)
            return (
              <Grid item xs={12} sm={6} md={4} key={brand.id}>
                <Fade in={true} timeout={200 + index * 50}>
                  <Card
                    sx={{
                      height: '100%',
                      cursor: 'pointer',
                      background: 'rgba(255, 255, 255, 0.8)',
                      border: '1px solid rgba(0, 0, 0, 0.06)',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        background: 'linear-gradient(90deg, #007AFF 0%, #5856D6 100%)',
                        opacity: 0,
                        transition: 'opacity 0.3s',
                      },
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)',
                        borderColor: alpha(theme.palette.primary.main, 0.2),
                        '&::before': {
                          opacity: 1,
                        },
                        '& .brand-arrow': {
                          transform: 'translateX(2px)',
                          opacity: 1,
                        },
                      },
                    }}
                    onClick={() => navigate(`/brands/${brand.id}`)}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Box display="flex" alignItems="center" mb={2}>
                        <Avatar
                          sx={{
                            bgcolor: 'primary.main',
                            width: 48,
                            height: 48,
                            mr: 2,
                            fontSize: '20px',
                            fontWeight: 600,
                          }}
                        >
                          {brand.name?.charAt(0) || <BusinessIcon />}
                        </Avatar>
                        <Box flex={1}>
                          <Typography 
                            variant="h6" 
                            fontWeight={600}
                            sx={{ 
                              fontSize: '16px',
                              letterSpacing: '-0.01em',
                              mb: 0.25,
                              lineHeight: 1.3,
                            }}
                          >
                            {brand.name}
                          </Typography>
                          {brand.website && (
                            <Box display="flex" alignItems="center">
                              <LanguageIcon 
                                sx={{ 
                                  fontSize: 12, 
                                  mr: 0.5, 
                                  color: 'text.secondary',
                                  opacity: 0.6
                                }} 
                              />
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ 
                                  fontSize: '12px',
                                  fontWeight: 500,
                                }}
                              >
                                {brand.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        <ArrowForwardIcon 
                          className="brand-arrow"
                          sx={{ 
                            color: 'text.secondary',
                            fontSize: 16,
                            transition: 'all 0.2s',
                            opacity: 0.4,
                          }} 
                        />
                      </Box>

                      {stats && (
                        <Box 
                          mt={2} 
                          pt={2}
                          borderTop="1px solid"
                          borderColor="divider"
                        >
                          <Grid container spacing={1.5}>
                            <Grid item xs={4}>
                              <Box textAlign="center">
                                <Typography 
                                  variant="h6" 
                                  fontWeight={700}
                                  color="primary.main"
                                  sx={{
                                    fontSize: '20px',
                                    letterSpacing: '-0.01em',
                                    mb: 0.25,
                                  }}
                                >
                                  {stats.totalResponses.toLocaleString()}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ 
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                  }}
                                >
                                  Responses
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={4}>
                              <Box textAlign="center">
                                <Typography 
                                  variant="h6" 
                                  fontWeight={700}
                                  color="success.main"
                                  sx={{
                                    fontSize: '20px',
                                    letterSpacing: '-0.01em',
                                    mb: 0.25,
                                  }}
                                >
                                  {stats.brandPresence.toLocaleString()}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ 
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                  }}
                                >
                                  Mentions
                                </Typography>
                              </Box>
                            </Grid>
                            <Grid item xs={4}>
                              <Box textAlign="center">
                                <Typography 
                                  variant="h6" 
                                  fontWeight={700}
                                  color="warning.main"
                                  sx={{
                                    fontSize: '20px',
                                    letterSpacing: '-0.01em',
                                    mb: 0.25,
                                  }}
                                >
                                  {stats.topCompetitors}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ 
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                  }}
                                >
                                  Competitors
                                </Typography>
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>
                      )}

                      <Box mt={2} pt={1.5}>
                        <Chip
                          label="View Details"
                          size="small"
                          sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            color: 'primary.main',
                            fontWeight: 600,
                            fontSize: '12px',
                            height: 24,
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.15),
                            },
                          }}
                        />
                      </Box>
                    </CardContent>
                  </Card>
                </Fade>
              </Grid>
            )
          })}
        </Grid>
      </Box>
    </Fade>
  )
}

export default BrandsList
