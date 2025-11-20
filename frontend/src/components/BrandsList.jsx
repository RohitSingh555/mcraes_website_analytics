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
  Skeleton
} from '@mui/material'
import {
  Business as BusinessIcon,
  Language as LanguageIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material'
import { motion } from 'framer-motion'
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
      <Card
        sx={{
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <BusinessIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2, opacity: 0.4 }} />
          <Typography variant="h6" fontWeight={600} mb={1} sx={{ fontSize: '1.125rem' }}>
            No brands available
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3} sx={{ fontSize: '0.875rem' }}>
            Sync data first to view brands
          </Typography>
          <Button 
            variant="contained" 
            size="small"
            onClick={loadBrands}
            sx={{
              px: 2,
              py: 0.75,
              borderRadius: 1.5,
              fontSize: '0.875rem',
              fontWeight: 600,
              boxShadow: 'none',
              '&:hover': {
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              },
            }}
          >
            Refresh
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography 
            variant="h4" 
            fontWeight={700} 
            mb={1}
            sx={{
              fontSize: '1.75rem',
              letterSpacing: '-0.02em',
              color: 'text.primary'
            }}
          >
            Brands
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{ fontSize: '0.875rem' }}
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
            fontWeight: 600,
            fontSize: '0.875rem',
            bgcolor: 'background.paper',
            borderColor: theme.palette.divider,
            '&:hover': {
              borderColor: theme.palette.divider,
              bgcolor: alpha(theme.palette.primary.main, 0.05),
            },
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
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    background: '#FFFFFF',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'all 0.2s ease-in-out',
                    position: 'relative',
                    overflow: 'hidden',
                    '&:before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '4px',
                      height: '100%',
                      backgroundColor: theme.palette.primary.main,
                      opacity: 0,
                      transition: 'opacity 0.2s',
                    },
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      transform: 'translateY(-2px)',
                      borderColor: alpha(theme.palette.primary.main, 0.3),
                      '&:before': {
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
                            bgcolor: alpha(theme.palette.primary.main, 0.1),
                            color: theme.palette.primary.main,
                            width: 40,
                            height: 40,
                            mr: 1.5,
                            fontSize: '18px',
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
                              fontSize: '1rem',
                              letterSpacing: '-0.01em',
                              mb: 0.25,
                              lineHeight: 1.3,
                              color: 'text.primary',
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
                                  fontSize: '0.75rem',
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
                          borderTop={`1px solid ${theme.palette.divider}`}
                        >
                          <Grid container spacing={1.5}>
                            <Grid item xs={4}>
                              <Box textAlign="center">
                                <Typography 
                                  variant="h6" 
                                  fontWeight={700}
                                  sx={{
                                    fontSize: '1.25rem',
                                    letterSpacing: '-0.02em',
                                    mb: 0.25,
                                    color: 'text.primary',
                                  }}
                                >
                                  {stats.totalResponses.toLocaleString()}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ 
                                    fontSize: '0.7rem',
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
                                  sx={{
                                    fontSize: '1.25rem',
                                    letterSpacing: '-0.02em',
                                    mb: 0.25,
                                    color: 'text.primary',
                                  }}
                                >
                                  {stats.brandPresence.toLocaleString()}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ 
                                    fontSize: '0.7rem',
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
                                  sx={{
                                    fontSize: '1.25rem',
                                    letterSpacing: '-0.02em',
                                    mb: 0.25,
                                    color: 'text.primary',
                                  }}
                                >
                                  {stats.topCompetitors}
                                </Typography>
                                <Typography 
                                  variant="caption" 
                                  color="text.secondary"
                                  sx={{ 
                                    fontSize: '0.7rem',
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
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            )
          })}
        </Grid>
      </Box>
  )
}

export default BrandsList
