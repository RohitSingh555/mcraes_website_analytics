import { useState, useEffect, useMemo } from 'react'
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
  ThemeProvider,
  CssBaseline,
} from '@mui/material'
import { createTheme } from '@mui/material/styles'
import { motion } from 'framer-motion'
import { reportingAPI } from '../services/api'
import ReportingDashboard from './ReportingDashboard'
import { theme as baseTheme } from '../theme'

function PublicReportingDashboard() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const [brandInfo, setBrandInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const theme = useTheme()

  // Create custom theme based on brand theme - MUST be called before any conditional returns
  const brandTheme = useMemo(() => {
    if (!brandInfo?.theme || typeof brandInfo.theme !== 'object') {
      return baseTheme
    }

    const themeConfig = brandInfo.theme
    const primaryColor = themeConfig.primary_color || baseTheme.palette.primary.main
    const secondaryColor = themeConfig.secondary_color || baseTheme.palette.secondary.main
    const accentColor = themeConfig.accent_color || baseTheme.palette.info.main
    const fontFamily = themeConfig.font_family || baseTheme.typography.fontFamily

    return createTheme({
      ...baseTheme,
      palette: {
        ...baseTheme.palette,
        primary: {
          main: primaryColor,
          light: alpha(primaryColor, 0.7),
          dark: alpha(primaryColor, 0.9),
          contrastText: '#ffffff',
        },
        secondary: {
          main: secondaryColor,
          light: alpha(secondaryColor, 0.7),
          dark: alpha(secondaryColor, 0.9),
          contrastText: '#ffffff',
        },
        info: {
          main: accentColor,
          light: alpha(accentColor, 0.7),
          dark: alpha(accentColor, 0.9),
        },
      },
      typography: {
        ...baseTheme.typography,
        fontFamily: fontFamily || baseTheme.typography.fontFamily,
      },
    })
  }, [brandInfo?.theme])

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
        <CircularProgress size={40} thickness={4} />
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
    <ThemeProvider theme={brandTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: brandTheme.palette.background.default,
          fontFamily: brandTheme.typography.fontFamily,
          // Apply theme colors globally
          color: brandTheme.palette.text.primary,
        }}
      >
        {/* Pass slug to a modified ReportingDashboard that accepts slug prop */}
        <ReportingDashboard publicSlug={slug} brandInfo={brandInfo} />
      </Box>
    </ThemeProvider>
  )
}

export default PublicReportingDashboard

