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
  Paper,
  alpha,
  useTheme
} from '@mui/material'
import {
  Business as BusinessIcon,
  Article as ArticleIcon,
  ChatBubble as ChatBubbleIcon,
  ArrowForward as ArrowForwardIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { syncAPI } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const cardVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  }
}

const statCards = [
  {
    key: 'brands',
    icon: BusinessIcon,
    color: '#0f172a',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    bgGradient: 'linear-gradient(135deg, rgba(15, 23, 42, 0.05) 0%, rgba(30, 41, 59, 0.05) 100%)',
    route: '/brands',
    label: 'Brands',
    action: 'View Details'
  },
  {
    key: 'prompts',
    icon: ArticleIcon,
    color: '#3b82f6',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    bgGradient: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(37, 99, 235, 0.05) 100%)',
    route: '/data',
    label: 'Prompts',
    action: 'View Details'
  },
  {
    key: 'responses',
    icon: ChatBubbleIcon,
    color: '#10b981',
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    bgGradient: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)',
    route: '/analytics',
    label: 'Responses',
    action: 'View Analytics'
  }
]

function Dashboard() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const theme = useTheme()
  const { isAuthenticated, loading: authLoading } = useAuth()

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated) {
      navigate('/login', { replace: true })
      return
    }
    
    // Only load status if authenticated
    if (isAuthenticated) {
      loadStatus()
    }
  }, [isAuthenticated, authLoading, navigate])

  const loadStatus = async () => {
    try {
      setLoading(true)
      const data = await syncAPI.getStatus()
      setStatus(data)
      setError(null)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load status')
    } finally {
      setLoading(false)
    }
  }

  const getValue = (key) => {
    const mapping = {
      brands: status?.brands_count || 0,
      prompts: status?.prompts_count || 0,
      responses: status?.responses_count || 0
    }
    return mapping[key] || 0
  }

  // Show loading while checking authentication or loading data
  if (authLoading || loading) {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="50vh"
      >
        <CircularProgress size={32} thickness={4} />
      </Box>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <Box>
        <Box mb={4}>
          <Typography 
            variant="h4" 
            fontWeight={700} 
            mb={1}
            sx={{
              fontSize: '1.75rem',
              letterSpacing: '-0.02em',
            }}
          >
            Dashboard Overview
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
          >
            Monitor your brand performance and track insights across all platforms
          </Typography>
        </Box>

        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3,
              borderRadius: 2,
            }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <Grid container spacing={2.5} sx={{ mb: 4 }}>
          {statCards.map((card, index) => {
            const IconComponent = card.icon
            const value = getValue(card.key)
            
            return (
              <Grid item xs={12} sm={6} md={4} key={card.key} component={motion.div} variants={cardVariants}>
                <Card
                  sx={{
                    height: '100%',
                    cursor: 'pointer',
                    background: '#FFFFFF',
                    border: `1px solid ${theme.palette.divider}`,
                    borderRadius: 2,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.2s ease-in-out',
                    '&:before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '4px',
                      height: '100%',
                      backgroundColor: card.color,
                    },
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                      transform: 'translateY(-2px)',
                      borderColor: alpha(card.color, 0.3),
                    },
                  }}
                  onClick={() => navigate(card.route)}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                      <Box
                        sx={{
                          p: 1,
                          borderRadius: 1.5,
                          background: alpha(card.color, 0.1),
                          color: card.color,
                        }}
                      >
                        <IconComponent sx={{ fontSize: 20 }} />
                      </Box>
                      <ArrowForwardIcon 
                        sx={{ 
                          color: 'text.secondary',
                          fontSize: 16,
                          opacity: 0.4,
                          transition: 'all 0.2s',
                          '.MuiCard-root:hover &': {
                            transform: 'translateX(2px)',
                            opacity: 1,
                            color: card.color,
                          }
                        }} 
                      />
                    </Box>
                    <Typography 
                      variant="h4" 
                      fontWeight={700}
                      sx={{ 
                        mb: 0.5,
                        fontSize: '2rem',
                        letterSpacing: '-0.02em',
                        color: 'text.primary',
                      }}
                    >
                      {value.toLocaleString()}
                    </Typography>
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        fontWeight: 500,
                        fontSize: '0.875rem',
                      }}
                    >
                      {card.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )
          })}
        </Grid>

        <motion.div variants={cardVariants}>
          <Card
            sx={{
              borderRadius: 2,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}
          >
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box>
                  <Typography 
                    variant="h6" 
                    fontWeight={600} 
                    mb={0.5}
                    sx={{ fontSize: '1rem' }}
                  >
                    Quick Actions
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                    Access frequently used features
                  </Typography>
                </Box>
                <TrendingUpIcon sx={{ fontSize: 24, color: 'text.secondary', opacity: 0.3 }} />
              </Box>
              <Box display="flex" gap={1.5} flexWrap="wrap">
                <Button 
                  variant="contained" 
                  size="small"
                  onClick={() => navigate('/brands')}
                  sx={{
                    px: 2,
                    py: 0.75,
                    fontWeight: 600,
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    },
                  }}
                >
                  View Brands
                </Button>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => navigate('/analytics')}
                  sx={{
                    px: 2,
                    py: 0.75,
                    fontWeight: 600,
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    borderColor: theme.palette.divider,
                    '&:hover': {
                      borderColor: theme.palette.divider,
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }}
                >
                  View Analytics
                </Button>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => navigate('/reporting')}
                  startIcon={<AssessmentIcon sx={{ fontSize: 16 }} />}
                  sx={{
                    px: 2,
                    py: 0.75,
                    fontWeight: 600,
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    borderColor: theme.palette.divider,
                    '&:hover': {
                      borderColor: theme.palette.divider,
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }}
                >
                  Reporting Dashboard
                </Button>
                <Button 
                  variant="outlined" 
                  size="small"
                  onClick={() => navigate('/sync')}
                  sx={{
                    px: 2,
                    py: 0.75,
                    fontWeight: 600,
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontSize: '0.875rem',
                    borderColor: theme.palette.divider,
                    '&:hover': {
                      borderColor: theme.palette.divider,
                      bgcolor: alpha(theme.palette.primary.main, 0.05),
                    },
                  }}
                >
                  Sync Data
                </Button>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Box>
    </motion.div>
  )
}

export default Dashboard
