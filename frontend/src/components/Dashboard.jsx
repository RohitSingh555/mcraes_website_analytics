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
  ArrowForward as ArrowForwardIcon
} from '@mui/icons-material'
import { useNavigate } from 'react-router-dom'
import { syncAPI } from '../services/api'

function Dashboard() {
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const theme = useTheme()

  useEffect(() => {
    loadStatus()
  }, [])

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

  if (loading) {
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

  return (
    <Box>
      <Box mb={4}>
        <Typography 
          variant="h4" 
          fontWeight={600} 
          mb={1}
          sx={{
            fontSize: '24px',
            letterSpacing: '-0.01em',
          }}
        >
          Dashboard Overview
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ fontSize: '15px', lineHeight: 1.5 }}
        >
          Monitor your brand performance and track insights
        </Typography>
      </Box>

      {error && (
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
      )}

      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              height: '100%',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.04) 0%, rgba(88, 86, 214, 0.04) 100%)',
              border: '1px solid rgba(0, 122, 255, 0.08)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0, 122, 255, 0.12)',
                borderColor: alpha(theme.palette.primary.main, 0.2),
              },
            }}
            onClick={() => navigate('/brands')}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                    color: 'white',
                  }}
                >
                  <BusinessIcon sx={{ fontSize: 22 }} />
                </Box>
                <ArrowForwardIcon 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: 16,
                    opacity: 0.6,
                    transition: 'all 0.2s',
                    '.MuiCard-root:hover &': {
                      transform: 'translateX(2px)',
                      opacity: 1,
                      color: 'primary.main',
                    }
                  }} 
                />
              </Box>
              <Typography 
                variant="h4" 
                fontWeight={700}
                sx={{ 
                  mb: 0.5,
                  fontSize: '32px',
                  letterSpacing: '-0.01em',
                }}
              >
                {status?.brands_count?.toLocaleString() || 0}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  fontSize: '13px',
                  fontWeight: 500,
                  mb: 1.5
                }}
              >
                Brands
              </Typography>
              <Button 
                variant="text" 
                size="small"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                sx={{
                  color: 'primary.main',
                  px: 0,
                  fontWeight: 600,
                  fontSize: '13px',
                  '&:hover': {
                    backgroundColor: 'transparent',
                  }
                }}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              height: '100%',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(90, 200, 250, 0.04) 0%, rgba(0, 122, 255, 0.04) 100%)',
              border: '1px solid rgba(90, 200, 250, 0.08)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(90, 200, 250, 0.12)',
                borderColor: alpha(theme.palette.info.main, 0.2),
              },
            }}
            onClick={() => navigate('/data')}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%)',
                    color: 'white',
                  }}
                >
                  <ArticleIcon sx={{ fontSize: 22 }} />
                </Box>
                <ArrowForwardIcon 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: 16,
                    opacity: 0.6,
                    transition: 'all 0.2s',
                    '.MuiCard-root:hover &': {
                      transform: 'translateX(2px)',
                      opacity: 1,
                      color: 'info.main',
                    }
                  }} 
                />
              </Box>
              <Typography 
                variant="h4" 
                fontWeight={700}
                sx={{ 
                  mb: 0.5,
                  fontSize: '32px',
                  letterSpacing: '-0.01em',
                }}
              >
                {status?.prompts_count?.toLocaleString() || 0}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  fontSize: '13px',
                  fontWeight: 500,
                  mb: 1.5
                }}
              >
                Prompts
              </Typography>
              <Button 
                variant="text" 
                size="small"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                sx={{
                  color: 'info.main',
                  px: 0,
                  fontWeight: 600,
                  fontSize: '13px',
                  '&:hover': {
                    backgroundColor: 'transparent',
                  }
                }}
              >
                View Details
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Card
            sx={{
              height: '100%',
              cursor: 'pointer',
              background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.04) 0%, rgba(90, 200, 250, 0.04) 100%)',
              border: '1px solid rgba(52, 199, 89, 0.08)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(52, 199, 89, 0.12)',
                borderColor: alpha(theme.palette.success.main, 0.2),
              },
            }}
            onClick={() => navigate('/analytics')}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #34C759 0%, #5AC8FA 100%)',
                    color: 'white',
                  }}
                >
                  <ChatBubbleIcon sx={{ fontSize: 22 }} />
                </Box>
                <ArrowForwardIcon 
                  sx={{ 
                    color: 'text.secondary',
                    fontSize: 16,
                    opacity: 0.6,
                    transition: 'all 0.2s',
                    '.MuiCard-root:hover &': {
                      transform: 'translateX(2px)',
                      opacity: 1,
                      color: 'success.main',
                    }
                  }} 
                />
              </Box>
              <Typography 
                variant="h4" 
                fontWeight={700}
                sx={{ 
                  mb: 0.5,
                  fontSize: '32px',
                  letterSpacing: '-0.01em',
                }}
              >
                {status?.responses_count?.toLocaleString() || 0}
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  fontSize: '13px',
                  fontWeight: 500,
                  mb: 1.5
                }}
              >
                Responses
              </Typography>
              <Button 
                variant="text" 
                size="small"
                endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                sx={{
                  color: 'success.main',
                  px: 0,
                  fontWeight: 600,
                  fontSize: '13px',
                  '&:hover': {
                    backgroundColor: 'transparent',
                  }
                }}
              >
                View Analytics
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper
        sx={{
          p: 3,
          borderRadius: 2,
          background: 'rgba(255, 255, 255, 0.8)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
        }}
      >
        <Typography 
          variant="h6" 
          fontWeight={600} 
          mb={2}
          sx={{ fontSize: '16px' }}
        >
          Quick Actions
        </Typography>
        <Box display="flex" gap={1.5} flexWrap="wrap">
          <Button 
            variant="contained" 
            size="small"
            onClick={() => navigate('/brands')}
            sx={{
              px: 2.5,
              py: 1,
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            View Brands
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => navigate('/analytics')}
            sx={{
              px: 2.5,
              py: 1,
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            View Analytics
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => navigate('/sync')}
            sx={{
              px: 2.5,
              py: 1,
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            Sync Data
          </Button>
          <Button 
            variant="outlined" 
            size="small"
            onClick={() => navigate('/data')}
            sx={{
              px: 2.5,
              py: 1,
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: 2,
            }}
          >
            Browse Data
          </Button>
        </Box>
      </Paper>
    </Box>
  )
}

export default Dashboard
