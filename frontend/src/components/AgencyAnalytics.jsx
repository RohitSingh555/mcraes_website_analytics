import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Alert,
  Chip,
  alpha,
  useTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material'
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Analytics as AnalyticsIcon
} from '@mui/icons-material'
import { agencyAnalyticsAPI } from '../services/api'

function AgencyAnalytics() {
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState(null)
  const [rankings, setRankings] = useState([])
  const [campaignLinks, setCampaignLinks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const theme = useTheme()

  useEffect(() => {
    loadCampaigns()
    loadCampaignLinks()
  }, [])

  useEffect(() => {
    if (selectedCampaign) {
      loadRankings(selectedCampaign)
    }
  }, [selectedCampaign])

  const loadCampaigns = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await agencyAnalyticsAPI.getCampaigns()
      setCampaigns(response.campaigns || [])
      if (response.campaigns && response.campaigns.length > 0) {
        setSelectedCampaign(response.campaigns[0].id)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load campaigns')
    } finally {
      setLoading(false)
    }
  }

  const loadRankings = async (campaignId) => {
    try {
      setLoading(true)
      setError(null)
      const response = await agencyAnalyticsAPI.getCampaignRankings(campaignId)
      setRankings(response.rankings || [])
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load rankings')
    } finally {
      setLoading(false)
    }
  }

  const loadCampaignLinks = async () => {
    try {
      const response = await agencyAnalyticsAPI.getCampaignBrandLinks()
      setCampaignLinks(response.links || [])
    } catch (err) {
      console.error('Failed to load campaign links:', err)
    }
  }

  const getLinkedBrandId = (campaignId) => {
    const link = campaignLinks.find(l => l.campaign_id === campaignId)
    return link ? link.brand_id : null
  }

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '0'
    return Number(num).toLocaleString()
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    try {
      const date = new Date(dateStr)
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    } catch {
      return dateStr
    }
  }

  if (loading && campaigns.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress size={32} thickness={4} />
      </Box>
    )
  }

  if (error && campaigns.length === 0) {
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
          Agency Analytics
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ fontSize: '13px' }}
        >
          Campaign rankings and performance metrics
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

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ p: 3 }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Select Campaign</InputLabel>
            <Select
              value={selectedCampaign || ''}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              label="Select Campaign"
              sx={{
                borderRadius: 2,
                fontSize: '13px',
              }}
            >
              {campaigns.map((campaign) => (
                <MenuItem key={campaign.id} value={campaign.id}>
                  {campaign.company || `Campaign ${campaign.id}`} - {campaign.url || 'N/A'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {selectedCampaign && (
        <Card>
          <CardContent sx={{ p: 3 }}>
            <Typography 
              variant="h6" 
              fontWeight={600} 
              mb={3}
              sx={{ fontSize: '18px' }}
            >
              Campaign Rankings (Quarterly)
            </Typography>

            {loading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress size={32} thickness={4} />
              </Box>
            ) : rankings.length === 0 ? (
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                No ranking data available for this campaign. Please sync Agency Analytics data first.
              </Alert>
            ) : (
              <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08) }}>
                      <TableCell sx={{ fontWeight: 700, fontSize: '13px' }}>Date</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '13px' }}>Google Ranking Count</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '13px' }}>Google Ranking Change</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '13px' }}>Google Local Count</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '13px' }}>Google Mobile Count</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '13px' }}>Bing Ranking Count</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '13px' }}>Ranking Average</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '13px' }}>Search Volume</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, fontSize: '13px' }}>Competition</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rankings.map((row, idx) => (
                      <TableRow 
                        key={row.id || idx}
                        sx={{
                          '&:nth-of-type(odd)': {
                            bgcolor: alpha(theme.palette.primary.main, 0.02),
                          },
                          '&:hover': {
                            bgcolor: alpha(theme.palette.primary.main, 0.05),
                          },
                        }}
                      >
                        <TableCell sx={{ fontSize: '13px' }}>{formatDate(row.date)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '13px' }}>{formatNumber(row.google_ranking_count)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '13px' }}>
                          <Box display="flex" alignItems="center" justifyContent="flex-end" gap={0.5}>
                            {row.google_ranking_change > 0 ? (
                              <TrendingUpIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            ) : row.google_ranking_change < 0 ? (
                              <TrendingDownIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            ) : null}
                            {formatNumber(row.google_ranking_change)}
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={{ fontSize: '13px' }}>{formatNumber(row.google_local_count)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '13px' }}>{formatNumber(row.google_mobile_count)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '13px' }}>{formatNumber(row.bing_ranking_count)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '13px' }}>{formatNumber(row.ranking_average)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '13px' }}>{formatNumber(row.search_volume)}</TableCell>
                        <TableCell align="right" sx={{ fontSize: '13px' }}>{formatNumber(row.competition)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

export default AgencyAnalytics

