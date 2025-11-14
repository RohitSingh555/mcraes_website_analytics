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
  useTheme
} from '@mui/material'
import {
  Sync as SyncIcon,
  CloudDownload as CloudDownloadIcon,
  Analytics as AnalyticsIcon,
} from '@mui/icons-material'
import { syncAPI } from '../services/api'

function SyncPanel() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [syncing, setSyncing] = useState(null)
  const theme = useTheme()

  const handleSyncScrunch = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      setSyncing('scrunch')
      
      const result = await syncAPI.syncAll()
      
      const summary = result.summary || {}
      const message = `Successfully synced Scrunch AI data:\n` +
        `• Brands: ${summary.brands || 0}\n` +
        `• Prompts: ${summary.total_prompts || 0}\n` +
        `• Responses: ${summary.total_responses || 0}`
      
      setSuccess(message)
      setTimeout(() => setSuccess(null), 8000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to sync Scrunch AI data')
    } finally {
      setLoading(false)
      setSyncing(null)
    }
  }

  const handleSyncGA4 = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      setSyncing('ga4')
      
      const result = await syncAPI.syncGA4()
      
      const totalSynced = result.total_synced || {}
      const message = `Successfully synced GA4 data:\n` +
        `• Brands synced: ${totalSynced.brands || 0}\n` +
        `• Traffic overview: ${totalSynced.traffic_overview || 0}\n` +
        `• Top pages: ${totalSynced.top_pages || 0}\n` +
        `• Traffic sources: ${totalSynced.traffic_sources || 0}\n` +
        `• Geographic data: ${totalSynced.geographic || 0}\n` +
        `• Device data: ${totalSynced.devices || 0}\n` +
        `• Conversions: ${totalSynced.conversions || 0}`
      
      setSuccess(message)
      setTimeout(() => setSuccess(null), 8000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to sync GA4 data')
    } finally {
      setLoading(false)
      setSyncing(null)
    }
  }

  const handleSyncAgencyAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      setSyncing('agency-analytics')
      
      const result = await syncAPI.syncAgencyAnalytics()
      
      const totalSynced = result.total_synced || {}
      const message = `Successfully synced Agency Analytics data:\n` +
        `• Campaigns synced: ${totalSynced.campaigns || 0}\n` +
        `• Ranking records: ${totalSynced.rankings || 0}`
      
      setSuccess(message)
      setTimeout(() => setSuccess(null), 8000)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to sync Agency Analytics data')
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
          Sync data from Scrunch AI API and Google Analytics 4 to Supabase
        </Typography>
      </Box>

      {success && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 3,
            borderRadius: 2,
            fontSize: '13px',
            whiteSpace: 'pre-line',
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

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
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
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <CloudDownloadIcon 
                sx={{ 
                  fontSize: 48, 
                  color: 'primary.main', 
                  mb: 2,
                }} 
              />
              <Typography 
                variant="h5" 
                fontWeight={700} 
                mb={1}
                sx={{ fontSize: '20px' }}
              >
                Sync Scrunch API Data
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                mb={3}
                sx={{ fontSize: '13px', lineHeight: 1.6 }}
              >
                Sync all data from Scrunch AI API including brands, prompts, and responses to Supabase database.
              </Typography>
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleSyncScrunch}
                disabled={loading}
                startIcon={
                  syncing === 'scrunch' ? (
                    <CircularProgress size={20} thickness={4} sx={{ color: 'white' }} />
                  ) : (
                    <SyncIcon sx={{ fontSize: 20 }} />
                  )
                }
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  fontSize: '14px',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(0, 122, 255, 0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(0, 122, 255, 0.4)',
                  },
                }}
              >
                {syncing === 'scrunch' ? 'Syncing Scrunch Data...' : 'Sync Scrunch API Data'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.08) 0%, rgba(90, 200, 250, 0.08) 100%)',
              border: `2px solid ${theme.palette.success.main}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 32px rgba(52, 199, 89, 0.2)',
              },
            }}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <AnalyticsIcon 
                sx={{ 
                  fontSize: 48, 
                  color: 'success.main', 
                  mb: 2,
                }} 
              />
              <Typography 
                variant="h5" 
                fontWeight={700} 
                mb={1}
                sx={{ fontSize: '20px' }}
              >
                Sync GA4 Data
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                mb={3}
                sx={{ fontSize: '13px', lineHeight: 1.6 }}
              >
                Sync Google Analytics 4 data for all brands with GA4 property IDs configured. Includes traffic overview, top pages, sources, geographic, devices, and conversions.
              </Typography>
              <Button
                variant="contained"
                color="success"
                fullWidth
                size="large"
                onClick={handleSyncGA4}
                disabled={loading}
                startIcon={
                  syncing === 'ga4' ? (
                    <CircularProgress size={20} thickness={4} sx={{ color: 'white' }} />
                  ) : (
                    <AnalyticsIcon sx={{ fontSize: 20 }} />
                  )
                }
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  fontSize: '14px',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(52, 199, 89, 0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(52, 199, 89, 0.4)',
                  },
                }}
              >
                {syncing === 'ga4' ? 'Syncing GA4 Data...' : 'Sync GA4 Data'}
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              height: '100%',
              background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.08) 0%, rgba(255, 45, 85, 0.08) 100%)',
              border: `2px solid ${theme.palette.warning.main}`,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: '0 12px 32px rgba(255, 149, 0, 0.2)',
              },
            }}
          >
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <AnalyticsIcon 
                sx={{ 
                  fontSize: 48, 
                  color: 'warning.main', 
                  mb: 2,
                }} 
              />
              <Typography 
                variant="h5" 
                fontWeight={700} 
                mb={1}
                sx={{ fontSize: '20px' }}
              >
                Sync Agency Analytics Data
              </Typography>
              <Typography 
                variant="body2" 
                color="text.secondary" 
                mb={3}
                sx={{ fontSize: '13px', lineHeight: 1.6 }}
              >
                Sync Agency Analytics campaigns and quarterly ranking data. Includes Google rankings, Bing rankings, search volume, and competition metrics.
              </Typography>
              <Button
                variant="contained"
                color="warning"
                fullWidth
                size="large"
                onClick={handleSyncAgencyAnalytics}
                disabled={loading}
                startIcon={
                  syncing === 'agency-analytics' ? (
                    <CircularProgress size={20} thickness={4} sx={{ color: 'white' }} />
                  ) : (
                    <AnalyticsIcon sx={{ fontSize: 20 }} />
                  )
                }
                sx={{
                  borderRadius: 2,
                  px: 3,
                  py: 1.5,
                  fontSize: '14px',
                  fontWeight: 700,
                  boxShadow: '0 4px 12px rgba(255, 149, 0, 0.3)',
                  '&:hover': {
                    boxShadow: '0 6px 16px rgba(255, 149, 0, 0.4)',
                  },
                }}
              >
                {syncing === 'agency-analytics' ? 'Syncing Agency Analytics...' : 'Sync Agency Analytics'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {loading && syncing && (
        <Box mt={3}>
          <Card>
            <CardContent sx={{ p: 2.5 }}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                <Typography 
                  variant="body2" 
                  sx={{ fontSize: '13px', fontWeight: 600 }}
                >
                  {syncing === 'scrunch' ? 'Syncing Scrunch AI data...' : 
                   syncing === 'ga4' ? 'Syncing GA4 data...' : 
                   'Syncing Agency Analytics data...'}
                </Typography>
                <Typography 
                  variant="caption" 
                  color="text.secondary"
                  sx={{ fontSize: '12px' }}
                >
                  This may take a few minutes
                </Typography>
              </Box>
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
