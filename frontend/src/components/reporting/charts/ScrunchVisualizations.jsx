import { useState, useEffect } from 'react'
import { Box, Card, CardContent, Grid, Typography, CircularProgress, useTheme, alpha } from '@mui/material'
import { motion } from 'framer-motion'
import PieChart from './PieChart'
import BarChart from './BarChart'
import LineChart from './LineChart'
import { reportingAPI } from '../../../services/api'

/**
 * Scrunch AI Visualizations Component
 * Fetches and displays Query API-based visualizations
 */
export default function ScrunchVisualizations({ brandId, startDate, endDate }) {
  const theme = useTheme()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    positionDistribution: null,
    platformDistribution: null,
    sentimentDistribution: null,
    citationSourceBreakdown: null,
    competitorPresence: null,
    timeSeries: null
  })
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!brandId) return
    
    const fetchData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        // Fetch all Query API data in parallel
        const [
          positionData,
          platformData,
          sentimentData,
          citationData,
          competitorData,
          timeSeriesData
        ] = await Promise.allSettled([
          // Position distribution
          reportingAPI.queryScrunchAnalytics(
            brandId,
            ['brand_position_score', 'responses'],
            startDate,
            endDate
          ),
          // Platform distribution
          reportingAPI.queryScrunchAnalytics(
            brandId,
            ['ai_platform', 'responses'],
            startDate,
            endDate
          ),
          // Sentiment distribution
          reportingAPI.queryScrunchAnalytics(
            brandId,
            ['brand_sentiment_score', 'responses'],
            startDate,
            endDate
          ),
          // Citation source breakdown
          reportingAPI.queryScrunchAnalytics(
            brandId,
            ['source_type', 'responses'],
            startDate,
            endDate
          ),
          // Competitor presence
          reportingAPI.queryScrunchAnalytics(
            brandId,
            ['competitor_name', 'competitor_presence_percentage', 'responses'],
            startDate,
            endDate
          ),
          // Time series
          reportingAPI.queryScrunchAnalytics(
            brandId,
            ['date_week', 'brand_presence_percentage', 'responses'],
            startDate,
            endDate
          )
        ])
        
        // Process results (handle both fulfilled and rejected promises)
        setData({
          positionDistribution: positionData.status === 'fulfilled' ? processPositionData(positionData.value) : null,
          platformDistribution: platformData.status === 'fulfilled' ? processPlatformData(platformData.value) : null,
          sentimentDistribution: sentimentData.status === 'fulfilled' ? processSentimentData(sentimentData.value) : null,
          citationSourceBreakdown: citationData.status === 'fulfilled' ? processCitationData(citationData.value) : null,
          competitorPresence: competitorData.status === 'fulfilled' ? processCompetitorData(competitorData.value) : null,
          timeSeries: timeSeriesData.status === 'fulfilled' ? processTimeSeriesData(timeSeriesData.value) : null
        })
      } catch (err) {
        console.error('Error fetching Scrunch visualizations:', err)
        // Don't show error if Query API is not available - just show empty state
        if (err.response?.status === 404 || err.response?.status === 403) {
          setError(null) // Query API might not be enabled for this brand
          setData({
            positionDistribution: null,
            platformDistribution: null,
            sentimentDistribution: null,
            citationSourceBreakdown: null,
            competitorPresence: null,
            timeSeries: null
          })
        } else {
          setError('Failed to load visualizations')
        }
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [brandId, startDate, endDate])

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress size={40} />
      </Box>
    )
  }

  if (error) {
    return (
      <Box p={3}>
        <Typography color="error">{error}</Typography>
      </Box>
    )
  }

  // Check if we have any data to display
  const hasData = Object.values(data).some(value => value !== null && (Array.isArray(value) ? value.length > 0 : true))
  
  if (!hasData) {
    return null // Don't show empty section
  }

  return (
    <Grid container spacing={3}>
      {/* Position Distribution */}
      {data.positionDistribution && (
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card sx={{ height: '100%', borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                <PieChart
                  data={data.positionDistribution}
                  title="Position Distribution"
                  height={300}
                  donut={true}
                  innerRadius={60}
                />
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      )}

      {/* Platform Distribution */}
      {data.platformDistribution && (
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card sx={{ height: '100%', borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                <PieChart
                  data={data.platformDistribution}
                  title="Platform Distribution"
                  height={300}
                  donut={true}
                  innerRadius={60}
                />
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      )}

      {/* Sentiment Distribution */}
      {data.sentimentDistribution && (
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            <Card sx={{ height: '100%', borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                <PieChart
                  data={data.sentimentDistribution}
                  title="Sentiment Distribution"
                  height={300}
                  donut={true}
                  innerRadius={60}
                />
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      )}

      {/* Citation Source Breakdown */}
      {data.citationSourceBreakdown && (
        <Grid item xs={12} md={6}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <Card sx={{ height: '100%', borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                <PieChart
                  data={data.citationSourceBreakdown}
                  title="Citation Source Breakdown"
                  height={300}
                  donut={true}
                  innerRadius={60}
                />
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      )}

      {/* Competitive Presence */}
      {data.competitorPresence && data.competitorPresence.length > 0 && (
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
          >
            <Card sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                <BarChart
                  data={data.competitorPresence}
                  dataKey="name"
                  title="Competitive Presence"
                  height={400}
                  horizontal={true}
                  margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                  bars={[{
                    dataKey: 'presence',
                    name: 'Presence %',
                    color: theme.palette.primary.main
                  }]}
                  formatter={(value) => [`${value.toFixed(1)}%`, 'Presence']}
                />
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      )}

      {/* Time Series Trends */}
      {data.timeSeries && data.timeSeries.length > 0 && (
        <Grid item xs={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.5 }}
          >
            <Card sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
              <CardContent>
                <LineChart
                  data={data.timeSeries}
                  title="Brand Presence Trend Over Time"
                  height={400}
                  lines={[{
                    dataKey: 'presence',
                    name: 'Brand Presence %',
                    color: theme.palette.primary.main,
                    strokeWidth: 3
                  }]}
                  formatter={(value) => [`${value.toFixed(1)}%`, 'Presence']}
                  xAxisFormatter={(value) => {
                    // Format date_week (YYYY-MM-DD format)
                    if (value && value.length >= 10) {
                      const date = new Date(value)
                      return `${date.getMonth() + 1}/${date.getDate()}`
                    }
                    return value
                  }}
                />
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      )}
    </Grid>
  )
}

// Data processing functions
function processPositionData(data) {
  if (!data) return null
  
  const items = data.items || (Array.isArray(data) ? data : [])
  if (items.length === 0) return null
  
  // Categorize position scores: Top (67-100), Middle (34-66), Bottom (0-33)
  const distribution = { Top: 0, Middle: 0, Bottom: 0 }
  
  items.forEach(item => {
    const score = item.brand_position_score || 0
    const responses = item.responses || 0
    
    if (score >= 67) distribution.Top += responses
    else if (score >= 34) distribution.Middle += responses
    else distribution.Bottom += responses
  })
  
  return Object.entries(distribution)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))
}

function processPlatformData(data) {
  if (!data) return null
  
  const items = data.items || (Array.isArray(data) ? data : [])
  if (items.length === 0) return null
  
  return items
    .filter(item => item.responses > 0)
    .map(item => ({
      name: item.ai_platform || 'Unknown',
      value: item.responses || 0
    }))
}

function processSentimentData(data) {
  if (!data) return null
  
  const items = data.items || (Array.isArray(data) ? data : [])
  if (items.length === 0) return null
  
  // Categorize sentiment scores: Positive (67-100), Mixed (34-66), Negative (0-33), None (null)
  const distribution = { Positive: 0, Mixed: 0, Negative: 0, None: 0 }
  
  items.forEach(item => {
    const score = item.brand_sentiment_score
    const responses = item.responses || 0
    
    if (score === null || score === undefined) {
      distribution.None += responses
    } else if (score >= 67) {
      distribution.Positive += responses
    } else if (score >= 34) {
      distribution.Mixed += responses
    } else {
      distribution.Negative += responses
    }
  })
  
  return Object.entries(distribution)
    .filter(([_, value]) => value > 0)
    .map(([name, value]) => ({ name, value }))
}

function processCitationData(data) {
  if (!data) return null
  
  const items = data.items || (Array.isArray(data) ? data : [])
  if (items.length === 0) return null
  
  const sourceMap = {
    'Brand': 'Your Brand',
    'Competitor': 'Competitors',
    'Other': 'Third Party'
  }
  
  return items
    .filter(item => item.responses > 0)
    .map(item => ({
      name: sourceMap[item.source_type] || item.source_type || 'Unknown',
      value: item.responses || 0
    }))
}

function processCompetitorData(data) {
  if (!data) return null
  
  const items = data.items || (Array.isArray(data) ? data : [])
  if (items.length === 0) return null
  
  return items
    .filter(item => item.competitor_name && item.competitor_presence_percentage > 0)
    .sort((a, b) => (b.competitor_presence_percentage || 0) - (a.competitor_presence_percentage || 0))
    .slice(0, 10)
    .map(item => ({
      name: item.competitor_name,
      presence: item.competitor_presence_percentage || 0
    }))
}

function processTimeSeriesData(data) {
  if (!data) return null
  
  const items = data.items || (Array.isArray(data) ? data : [])
  if (items.length === 0) return null
  
  return items
    .filter(item => item.date_week && item.brand_presence_percentage !== undefined)
    .sort((a, b) => a.date_week.localeCompare(b.date_week))
    .map(item => ({
      date: item.date_week,
      presence: item.brand_presence_percentage || 0
    }))
}

