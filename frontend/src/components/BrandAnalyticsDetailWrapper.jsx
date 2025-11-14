import { useParams, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { CircularProgress, Box, Alert } from '@mui/material'
import BrandAnalyticsDetail from './BrandAnalyticsDetail'
import { syncAPI } from '../services/api'

function BrandAnalyticsDetailWrapper() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [brand, setBrand] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const loadBrand = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const brandId = parseInt(id)
        if (isNaN(brandId)) {
          setError('Invalid brand ID')
          setLoading(false)
          return
        }
        
        // Get brand details
        const brandsResponse = await syncAPI.getBrands()
        const brands = brandsResponse.items || brandsResponse || []
        const foundBrand = brands.find(b => b.id === brandId)
        
        if (!foundBrand) {
          setError(`Brand with ID ${brandId} not found`)
        } else {
          setBrand(foundBrand)
        }
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load brand')
      } finally {
        setLoading(false)
      }
    }
    
    loadBrand()
  }, [id])

  const handleBack = () => {
    navigate('/brands')
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    )
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      </Box>
    )
  }

  if (!brand) {
    return (
      <Box>
        <Alert severity="warning" sx={{ mb: 3 }}>
          Brand not found
        </Alert>
      </Box>
    )
  }

  return (
    <BrandAnalyticsDetail
      brandId={parseInt(id)}
      brand={brand}
      onBack={handleBack}
    />
  )
}

export default BrandAnalyticsDetailWrapper

