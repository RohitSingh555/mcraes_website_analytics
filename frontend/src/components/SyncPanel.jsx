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
import { motion } from 'framer-motion'
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
          fontWeight={700} 
          mb={1}
          sx={{
            fontSize: '1.75rem',
            letterSpacing: '-0.02em',
            color: 'text.primary'
          }}
        >
          Sync Data
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary"
          sx={{ fontSize: '0.875rem' }}
        >
          Sync data from Scrunch AI API, Google Analytics 4, and Agency Analytics to Supabase
        </Typography>
      </Box>

      {success && (
        <Alert 
          severity="success" 
          sx={{ 
            mb: 3,
            borderRadius: 2,
            fontSize: '0.875rem',
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
            fontSize: '0.875rem',
          }}
          onClose={() => setError(null)}
        >
          {error}
        </Alert>
      )}

      <Grid container spacing={2.5}>
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card
              sx={{
                height: '100%',
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
                },
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    background: alpha(theme.palette.primary.main, 0.1),
                    color: theme.palette.primary.main,
                    display: 'inline-flex',
                    mb: 2,
                  }}
                >
                  <CloudDownloadIcon sx={{ fontSize: 24 }} />
                </Box>
                <Typography 
                  variant="h6" 
                  fontWeight={600} 
                  mb={1}
                  sx={{ fontSize: '1rem' }}
                >
                  Sync Scrunch API Data
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  mb={3}
                  sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}
                >
                  Sync all data from Scrunch AI API including brands, prompts, and responses to Supabase database.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  size="small"
                  onClick={handleSyncScrunch}
                  disabled={loading}
                  startIcon={
                    syncing === 'scrunch' ? (
                      <CircularProgress size={16} thickness={4} sx={{ color: 'white' }} />
                    ) : (
                      <SyncIcon sx={{ fontSize: 16 }} />
                    )
                  }
                  sx={{
                    borderRadius: 1.5,
                    px: 2,
                    py: 0.75,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    boxShadow: 'none',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    },
                  }}
                >
                  {syncing === 'scrunch' ? 'Syncing...' : 'Sync Scrunch Data'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card
              sx={{
                height: '100%',
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
                  backgroundColor: theme.palette.success.main,
                },
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    background: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.main,
                    display: 'inline-flex',
                    mb: 2,
                  }}
                >
                  <AnalyticsIcon sx={{ fontSize: 24 }} />
                </Box>
                <Typography 
                  variant="h6" 
                  fontWeight={600} 
                  mb={1}
                  sx={{ fontSize: '1rem' }}
                >
                  Sync GA4 Data
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  mb={3}
                  sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}
                >
                  Sync Google Analytics 4 data for all brands with GA4 property IDs configured. Includes traffic overview, top pages, sources, geographic, devices, and conversions.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  size="small"
                  onClick={handleSyncGA4}
                  disabled={loading}
                  startIcon={
                    syncing === 'ga4' ? (
                      <CircularProgress size={16} thickness={4} sx={{ color: 'white' }} />
                    ) : (
                      <AnalyticsIcon sx={{ fontSize: 16 }} />
                    )
                  }
                  sx={{
                    borderRadius: 1.5,
                    px: 2,
                    py: 0.75,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    bgcolor: theme.palette.success.main,
                    boxShadow: 'none',
                    '&:hover': {
                      bgcolor: theme.palette.success.dark,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    },
                  }}
                >
                  {syncing === 'ga4' ? 'Syncing...' : 'Sync GA4 Data'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card
              sx={{
                height: '100%',
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
                  backgroundColor: theme.palette.warning.main,
                },
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  transform: 'translateY(-2px)',
                },
              }}
            >
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    background: alpha(theme.palette.warning.main, 0.1),
                    color: theme.palette.warning.main,
                    display: 'inline-flex',
                    mb: 2,
                  }}
                >
                  <AnalyticsIcon sx={{ fontSize: 24 }} />
                </Box>
                <Typography 
                  variant="h6" 
                  fontWeight={600} 
                  mb={1}
                  sx={{ fontSize: '1rem' }}
                >
                  Sync Agency Analytics Data
                </Typography>
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  mb={3}
                  sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}
                >
                  Sync Agency Analytics campaigns and quarterly ranking data. Includes Google rankings, Bing rankings, search volume, and competition metrics.
                </Typography>
                <Button
                  variant="contained"
                  fullWidth
                  size="small"
                  onClick={handleSyncAgencyAnalytics}
                  disabled={loading}
                  startIcon={
                    syncing === 'agency-analytics' ? (
                      <CircularProgress size={16} thickness={4} sx={{ color: 'white' }} />
                    ) : (
                      <AnalyticsIcon sx={{ fontSize: 16 }} />
                    )
                  }
                  sx={{
                    borderRadius: 1.5,
                    px: 2,
                    py: 0.75,
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    bgcolor: theme.palette.warning.main,
                    boxShadow: 'none',
                    '&:hover': {
                      bgcolor: theme.palette.warning.dark,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    },
                  }}
                >
                  {syncing === 'agency-analytics' ? 'Syncing...' : 'Sync Agency Analytics'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {loading && syncing && (
        <Box mt={3}>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Card
              sx={{
                borderRadius: 2,
                border: `1px solid ${theme.palette.divider}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Typography 
                    variant="body2" 
                    sx={{ fontSize: '0.875rem', fontWeight: 600 }}
                  >
                    {syncing === 'scrunch' ? 'Syncing Scrunch AI data...' : 
                     syncing === 'ga4' ? 'Syncing GA4 data...' : 
                     'Syncing Agency Analytics data...'}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: '0.75rem' }}
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
          </motion.div>
        </Box>
      )}
    </Box>
  )
}

export default SyncPanel
