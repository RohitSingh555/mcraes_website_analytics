import { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  Button,
  Typography,
  Grid,
  CircularProgress,
  Alert,
  LinearProgress,
  alpha,
  useTheme,
  Divider
} from '@mui/material'
import {
  Sync as SyncIcon,
  CloudDownload as CloudDownloadIcon,
  Refresh as RefreshIcon,
  Storage as StorageIcon,
  Update as UpdateIcon
} from '@mui/icons-material'
import { syncAPI } from '../services/api'

function SyncPanel() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [syncing, setSyncing] = useState(null)
  const [dbLoading, setDbLoading] = useState(false)
  const [dbError, setDbError] = useState(null)
  const [dbSuccess, setDbSuccess] = useState(null)
  const [dbVerification, setDbVerification] = useState(null)
  const theme = useTheme()

  const handleSync = async (type) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      setSyncing(type)
      
      let result
      switch (type) {
        case 'brands':
          result = await syncAPI.syncBrands()
          break
        case 'prompts':
          result = await syncAPI.syncPrompts()
          break
        case 'responses':
          result = await syncAPI.syncResponses()
          break
        case 'all':
          result = await syncAPI.syncAll()
          break
        default:
          return
      }
      
      setSuccess(`Successfully synced ${type}. Count: ${result.count || JSON.stringify(result.counts || {})}`)
      setTimeout(() => setSuccess(null), 5000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to sync data')
    } finally {
      setLoading(false)
      setSyncing(null)
    }
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
          Sync Data
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ fontSize: '13px' }}
        >
          Sync data from Scrunch AI API to Supabase
        </Typography>
      </Box>

      {success && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 3,
            borderRadius: 2,
            fontSize: '13px',
          }}
          onClose={() => setSuccess(null)}
        >
          {success}
        </Alert>
      )}

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

      <Grid container spacing={2.5}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.04) 0%, rgba(88, 86, 214, 0.04) 100%)',
              border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(0, 122, 255, 0.12)',
                borderColor: alpha(theme.palette.primary.main, 0.2),
              },
            }}
          >
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <CloudDownloadIcon 
                sx={{ 
                  fontSize: 36, 
                  color: 'primary.main', 
                  mb: 2,
                  opacity: 0.9,
                }} 
              />
              <Typography 
                variant="h6" 
                fontWeight={600} 
                mb={1}
                sx={{ fontSize: '16px' }}
              >
                Sync Brands
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                mb={2}
                sx={{ fontSize: '12px' }}
              >
                Fetch all brands from Scrunch AI
              </Typography>
              <Button
                variant="contained"
                fullWidth
                size="small"
                onClick={() => handleSync('brands')}
                disabled={loading}
                startIcon={
                  syncing === 'brands' ? (
                    <CircularProgress size={16} thickness={4} sx={{ color: 'white' }} />
                  ) : (
                    <SyncIcon sx={{ fontSize: 16 }} />
                  )
                }
                sx={{
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {syncing === 'brands' ? 'Syncing...' : 'Sync Brands'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, rgba(90, 200, 250, 0.04) 0%, rgba(0, 122, 255, 0.04) 100%)',
              border: `1px solid ${alpha(theme.palette.info.main, 0.08)}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(90, 200, 250, 0.12)',
                borderColor: alpha(theme.palette.info.main, 0.2),
              },
            }}
          >
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <CloudDownloadIcon 
                sx={{ 
                  fontSize: 36, 
                  color: 'info.main', 
                  mb: 2,
                  opacity: 0.9,
                }} 
              />
              <Typography 
                variant="h6" 
                fontWeight={600} 
                mb={1}
                sx={{ fontSize: '16px' }}
              >
                Sync Prompts
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                mb={2}
                sx={{ fontSize: '12px' }}
              >
                Fetch all prompts for your brand
              </Typography>
              <Button
                variant="contained"
                color="info"
                fullWidth
                size="small"
                onClick={() => handleSync('prompts')}
                disabled={loading}
                startIcon={
                  syncing === 'prompts' ? (
                    <CircularProgress size={16} thickness={4} sx={{ color: 'white' }} />
                  ) : (
                    <SyncIcon sx={{ fontSize: 16 }} />
                  )
                }
                sx={{
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {syncing === 'prompts' ? 'Syncing...' : 'Sync Prompts'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.04) 0%, rgba(90, 200, 250, 0.04) 100%)',
              border: `1px solid ${alpha(theme.palette.success.main, 0.08)}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 8px 24px rgba(52, 199, 89, 0.12)',
                borderColor: alpha(theme.palette.success.main, 0.2),
              },
            }}
          >
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <CloudDownloadIcon 
                sx={{ 
                  fontSize: 36, 
                  color: 'success.main', 
                  mb: 2,
                  opacity: 0.9,
                }} 
              />
              <Typography 
                variant="h6" 
                fontWeight={600} 
                mb={1}
                sx={{ fontSize: '16px' }}
              >
                Sync Responses
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                mb={2}
                sx={{ fontSize: '12px' }}
              >
                Fetch all responses from AI platforms
              </Typography>
              <Button
                variant="contained"
                color="success"
                fullWidth
                size="small"
                onClick={() => handleSync('responses')}
                disabled={loading}
                startIcon={
                  syncing === 'responses' ? (
                    <CircularProgress size={16} thickness={4} sx={{ color: 'white' }} />
                  ) : (
                    <SyncIcon sx={{ fontSize: 16 }} />
                  )
                }
                sx={{
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                {syncing === 'responses' ? 'Syncing...' : 'Sync Responses'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.08) 0%, rgba(88, 86, 214, 0.08) 100%)',
              border: `2px solid ${theme.palette.primary.main}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 32px rgba(0, 122, 255, 0.2)',
              },
            }}
          >
            <CardContent sx={{ p: 3, textAlign: 'center' }}>
              <RefreshIcon 
                sx={{ 
                  fontSize: 36, 
                  color: 'primary.main', 
                  mb: 2,
                }} 
              />
              <Typography 
                variant="h6" 
                fontWeight={700} 
                mb={1}
                sx={{ fontSize: '16px' }}
              >
                Sync All
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                mb={2}
                sx={{ fontSize: '12px' }}
              >
                Sync all data at once
              </Typography>
              <Button
                variant="contained"
                fullWidth
                size="small"
                onClick={() => handleSync('all')}
                disabled={loading}
                startIcon={
                  syncing === 'all' ? (
                    <CircularProgress size={16} thickness={4} sx={{ color: 'white' }} />
                  ) : (
                    <RefreshIcon sx={{ fontSize: 16 }} />
                  )
                }
                sx={{
                  borderRadius: 2,
                  px: 2,
                  py: 1,
                  fontSize: '13px',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(0, 122, 255, 0.4)',
                  },
                }}
              >
                {syncing === 'all' ? 'Syncing All...' : 'Sync All Data'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading && syncing && (
        <Box mt={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Typography 
                variant="body2" 
                mb={1.5}
                sx={{ fontSize: '13px', fontWeight: 500 }}
              >
                Syncing {syncing}...
              </Typography>
              <LinearProgress 
                sx={{ 
                  borderRadius: 1,
                  height: 6,
                }}
              />
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  )
}

export default SyncPanel
