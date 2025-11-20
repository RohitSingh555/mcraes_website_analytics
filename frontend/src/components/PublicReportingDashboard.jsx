import { useState, useEffect } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  alpha,
  useTheme,
  Container,
} from '@mui/material'
import { motion } from 'framer-motion'
import { reportingAPI } from '../services/api'
import ReportingDashboard from './ReportingDashboard'

function PublicReportingDashboard() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const [brandInfo, setBrandInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const theme = useTheme()

  useEffect(() => {
    const fetchBrand = async () => {
      if (!slug) {
        setError('Invalid brand slug')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Fetch brand info first
        const brand = await reportingAPI.getBrandBySlug(slug)
        setBrandInfo(brand)
      } catch (err) {
        console.error('Error fetching brand:', err)
        setError(err.response?.data?.detail || err.message || 'Failed to load brand')
      } finally {
        setLoading(false)
      }
    }

    fetchBrand()
  }, [slug])

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: theme.palette.background.default,
        }}
      >
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ borderRadius: 2 }}>
          {error === 'Brand not found' ? (
            <>
              <Typography variant="h6" gutterBottom>
                Brand Not Found
              </Typography>
              <Typography>
                The brand you're looking for doesn't exist or the link is invalid.
              </Typography>
            </>
          ) : (
            <Typography>{error}</Typography>
          )}
        </Alert>
      </Container>
    )
  }

  if (!brandInfo) {
    return null
  }

  // Render the ReportingDashboard component but override it to use slug-based data fetching
  // We'll create a wrapper that passes the brand_id to ReportingDashboard
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: theme.palette.background.default,
      }}
    >
      {/* Pass slug to a modified ReportingDashboard that accepts slug prop */}
      <ReportingDashboard publicSlug={slug} brandInfo={brandInfo} />
    </Box>
  )
}

export default PublicReportingDashboard

