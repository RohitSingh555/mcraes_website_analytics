import { useState, useEffect, useRef } from 'react'
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Typography,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  alpha,
  useTheme,
  Grid,
  Alert,
  Autocomplete,
} from '@mui/material'
import {
  Close as CloseIcon,
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Analytics as AnalyticsIcon,
  CheckCircle as CheckCircleIcon,
  Palette as PaletteIcon,
  Business as BusinessIcon,
  Campaign as CampaignIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material'
import { clientAPI, dataAPI, ga4API, agencyAnalyticsAPI } from '../services/api'
import { useToast } from '../contexts/ToastContext'
import { getErrorMessage } from '../utils/errorHandler'

function ClientManagement({ open, onClose, client }) {
  const theme = useTheme()
  const { showError, showSuccess } = useToast()
  
  const [ga4PropertyId, setGa4PropertyId] = useState('')
  const [scrunchBrandId, setScrunchBrandId] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [clientTheme, setClientTheme] = useState({
    theme_color: '',
    secondary_color: '',
    font_family: '',
  })
  const [reportTitle, setReportTitle] = useState('')
  const [customCss, setCustomCss] = useState('')
  const [footerText, setFooterText] = useState('')
  const [headerText, setHeaderText] = useState('')
  const [linkedCampaigns, setLinkedCampaigns] = useState([])
  const [availableBrands, setAvailableBrands] = useState([])
  const [availableCampaigns, setAvailableCampaigns] = useState([])
  const [availableGA4Properties, setAvailableGA4Properties] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [brandsLoading, setBrandsLoading] = useState(false)
  const [campaignsLoading, setCampaignsLoading] = useState(false)
  const [ga4PropertiesLoading, setGa4PropertiesLoading] = useState(false)
  const [brandSearchTerm, setBrandSearchTerm] = useState('')
  const [campaignSearchTerm, setCampaignSearchTerm] = useState('')
  const [brandsPage, setBrandsPage] = useState(0)
  const [campaignsPage, setCampaignsPage] = useState(0)
  const [hasMoreBrands, setHasMoreBrands] = useState(true)
  const [hasMoreCampaigns, setHasMoreCampaigns] = useState(true)
  const searchTimeoutRef = useRef(null)
  const campaignSearchTimeoutRef = useRef(null)
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [conflictData, setConflictData] = useState(null)
  const [pendingMappings, setPendingMappings] = useState(null)

  useEffect(() => {
    if (open && client) {
      loadClientData()
    } else if (open && !client) {
      // Reset state when dialog opens without client
      setAvailableBrands([])
      setBrandSearchTerm('')
      setBrandsPage(0)
      setHasMoreBrands(true)
    }
    
    // Cleanup timeouts on unmount
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
      if (campaignSearchTimeoutRef.current) {
        clearTimeout(campaignSearchTimeoutRef.current)
      }
    }
  }, [open, client])

  const loadClientData = async () => {
    if (!client) return
    
    setLoading(true)
    try {
      // Load GA4 property ID
      setGa4PropertyId(client.ga4_property_id || '')
      
      // Load Scrunch brand ID
      setScrunchBrandId(client.scrunch_brand_id || '')
      
      // Load logo URL
      setLogoUrl(client.logo_url || '')
      setLogoFile(null)
      setLogoPreview(null)
      
      // Load theme
      setClientTheme({
        theme_color: client.theme_color || '',
        secondary_color: client.secondary_color || '',
        font_family: client.font_family || '',
      })
      
      // Load whitelabeling fields
      setReportTitle(client.report_title || '')
      setCustomCss(client.custom_css || '')
      setFooterText(client.footer_text || '')
      setHeaderText(client.header_text || '')
      
      // Load linked campaigns
      await loadLinkedCampaigns()
      
      // Load available GA4 properties
      await loadAvailableOptions()
      
      // Load initial brands (first page)
      await loadBrands('', 0, false)
      
      // Load initial campaigns (first page)
      await loadCampaigns('', 0, false)
      
      // If client has a scrunch_brand_id, find and set it in autocomplete
      if (client.scrunch_brand_id) {
        try {
          // Search for the brand by loading brands and finding the matching one
          const brandsResponse = await dataAPI.getBrands(100, 0, '')
          const matchingBrand = brandsResponse.items?.find(b => b.id === client.scrunch_brand_id)
          if (matchingBrand) {
            setBrandSearchTerm(matchingBrand.name || '')
            // Add to available brands if not already there
            setAvailableBrands(prev => {
              const exists = prev.find(b => b.id === matchingBrand.id)
              return exists ? prev : [matchingBrand, ...prev]
            })
          }
        } catch (err) {
          console.error('Error loading selected brand:', err)
        }
      }
    } catch (err) {
      showError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const loadLinkedCampaigns = async () => {
    if (!client) return
    
    try {
      const data = await clientAPI.getClientCampaigns(client.id)
      setLinkedCampaigns(data.campaigns || [])
    } catch (err) {
      showError(getErrorMessage(err))
    }
  }

  const loadAvailableOptions = async () => {
    setGa4PropertiesLoading(true)
    
    try {
      // Load available GA4 properties
      const ga4Response = await ga4API.getProperties()
      setAvailableGA4Properties(ga4Response.items || [])
    } catch (err) {
      showError(getErrorMessage(err))
    } finally {
      setGa4PropertiesLoading(false)
    }
  }

  const loadBrands = async (searchTerm = '', page = 0, append = false) => {
    setBrandsLoading(true)
    try {
      const limit = 50
      const offset = page * limit
      console.log('Loading brands:', { searchTerm, page, offset, limit })
      const brandsResponse = await dataAPI.getBrands(limit, offset, searchTerm)
      console.log('Brands response:', brandsResponse)
      const newBrands = brandsResponse.items || []
      
      if (append) {
        setAvailableBrands(prev => [...prev, ...newBrands])
      } else {
        setAvailableBrands(newBrands)
      }
      
      setHasMoreBrands(newBrands.length === limit)
    } catch (err) {
      console.error('Error loading brands:', err)
      showError(getErrorMessage(err))
    } finally {
      setBrandsLoading(false)
    }
  }

  const loadCampaigns = async (searchTerm = '', page = 0, append = false) => {
    setCampaignsLoading(true)
    try {
      const pageSize = 50
      const pageNumber = page + 1 // API uses 1-indexed pages
      console.log('Loading campaigns:', { searchTerm, page, pageNumber, pageSize })
      const campaignsResponse = await agencyAnalyticsAPI.getCampaigns(pageNumber, pageSize, searchTerm)
      console.log('Campaigns response:', campaignsResponse)
      const newCampaigns = campaignsResponse.items || []
      
      if (append) {
        setAvailableCampaigns(prev => [...prev, ...newCampaigns])
      } else {
        setAvailableCampaigns(newCampaigns)
      }
      
      setHasMoreCampaigns(newCampaigns.length === pageSize)
    } catch (err) {
      console.error('Error loading campaigns:', err)
      showError(getErrorMessage(err))
    } finally {
      setCampaignsLoading(false)
    }
  }

  const handleBrandSearchChange = (event, newValue) => {
    // This handles when a brand is selected from the dropdown
    if (newValue === null) {
      setScrunchBrandId('')
      setBrandSearchTerm('')
    } else if (typeof newValue === 'object' && newValue !== null) {
      // Brand object selected
      setScrunchBrandId(newValue.id.toString())
      setBrandSearchTerm(newValue.name || '')
    }
  }

  const handleBrandListboxScroll = (event) => {
    const listboxNode = event.currentTarget
    if (
      listboxNode.scrollTop + listboxNode.clientHeight >= listboxNode.scrollHeight - 5 &&
      hasMoreBrands &&
      !brandsLoading
    ) {
      const nextPage = brandsPage + 1
      setBrandsPage(nextPage)
      loadBrands(brandSearchTerm, nextPage, true)
    }
  }

  const handleCampaignSearchChange = (event, newValue) => {
    // This handles when a campaign is selected from the dropdown
    if (newValue === null) {
      // Don't clear on null - allow manual selection
      return
    } else if (typeof newValue === 'object' && newValue !== null) {
      // Campaign object selected - link it to client
      handleLinkCampaign(newValue.id)
    }
  }

  const handleCampaignListboxScroll = (event) => {
    const listboxNode = event.currentTarget
    if (
      listboxNode.scrollTop + listboxNode.clientHeight >= listboxNode.scrollHeight - 5 &&
      hasMoreCampaigns &&
      !campaignsLoading
    ) {
      const nextPage = campaignsPage + 1
      setCampaignsPage(nextPage)
      loadCampaigns(campaignSearchTerm, nextPage, true)
    }
  }

  const handleLinkCampaign = async (campaignId, isPrimary = false) => {
    if (!client) return
    
    setSaving(true)
    try {
      await clientAPI.linkClientCampaign(client.id, campaignId, isPrimary)
      showSuccess('Campaign linked successfully')
      await loadLinkedCampaigns()
      // Clear campaign search
      setCampaignSearchTerm('')
    } catch (err) {
      showError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleUnlinkCampaign = async (campaignId) => {
    if (!client) return
    
    setSaving(true)
    try {
      await clientAPI.unlinkClientCampaign(client.id, campaignId)
      showSuccess('Campaign unlinked successfully')
      await loadLinkedCampaigns()
    } catch (err) {
      showError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMappings = async () => {
    if (!client) return
    
    setSaving(true)
    try {
      const mappings = {
        ga4_property_id: ga4PropertyId || null,
        scrunch_brand_id: scrunchBrandId ? parseInt(scrunchBrandId) : null,
      }
      
      // Include version for optimistic locking if available
      if (client.version !== undefined && client.version !== null) {
        mappings.version = client.version
      }
      
      await clientAPI.updateClientMappings(client.id, mappings)
      showSuccess('Client mappings updated successfully')
      onClose()
    } catch (err) {
      // Check if it's a conflict error (409)
      if (err.response?.status === 409 && err.response?.data?.detail?.error === 'conflict') {
        setConflictData(err.response.data.detail)
        setPendingMappings({
          ga4_property_id: ga4PropertyId || null,
          scrunch_brand_id: scrunchBrandId ? parseInt(scrunchBrandId) : null,
        })
        setConflictDialogOpen(true)
      } else {
        showError(getErrorMessage(err))
      }
    } finally {
      setSaving(false)
    }
  }

  const handleConflictRefresh = async () => {
    setConflictDialogOpen(false)
    setConflictData(null)
    setPendingMappings(null)
    // Fetch latest client data from server
    if (!client) return
    try {
      const updatedClient = await clientAPI.getClient(client.id)
      // Update form fields with latest values
      if (updatedClient) {
        setGa4PropertyId(updatedClient.ga4_property_id || '')
        setScrunchBrandId(updatedClient.scrunch_brand_id || '')
      }
      // Reload all client data
      await loadClientData()
    } catch (err) {
      showError(getErrorMessage(err))
      // Still reload what we have
      await loadClientData()
    }
  }

  const handleConflictOverwrite = async () => {
    if (!client || !pendingMappings) return
    
    setSaving(true)
    try {
      // Overwrite with current values, using the latest version from conflict data
      const mappings = {
        ...pendingMappings,
        version: conflictData?.current_version, // Use the current version from conflict
      }
      
      await clientAPI.updateClientMappings(client.id, mappings)
      showSuccess('Client mappings updated successfully')
      setConflictDialogOpen(false)
      setConflictData(null)
      setPendingMappings(null)
      onClose()
    } catch (err) {
      // If still a conflict, show error
      if (err.response?.status === 409) {
        setConflictData(err.response.data.detail)
      } else {
        showError(getErrorMessage(err))
        setConflictDialogOpen(false)
        setConflictData(null)
        setPendingMappings(null)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async () => {
    if (!client || !logoFile) return
    
    setSaving(true)
    try {
      const result = await clientAPI.uploadClientLogo(client.id, logoFile)
      setLogoUrl(result.logo_url)
      setLogoFile(null)
      setLogoPreview(null)
      showSuccess('Logo uploaded successfully')
    } catch (err) {
      showError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleLogoDelete = async () => {
    if (!client) return
    
    setSaving(true)
    try {
      await clientAPI.deleteClientLogo(client.id)
      setLogoUrl('')
      setLogoFile(null)
      setLogoPreview(null)
      showSuccess('Logo deleted successfully')
    } catch (err) {
      showError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        showError('Please select an image file')
        return
      }
      setLogoFile(file)
      // Create preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setLogoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleThemeUpdate = async () => {
    if (!client) return
    
    setSaving(true)
    try {
      await clientAPI.updateClientTheme(client.id, {
        theme_color: clientTheme.theme_color,
        secondary_color: clientTheme.secondary_color,
        font_family: clientTheme.font_family,
        logo_url: logoUrl,
        report_title: reportTitle,
        custom_css: customCss,
        footer_text: footerText,
        header_text: headerText,
      })
      showSuccess('Client theme updated successfully')
      onClose()
    } catch (err) {
      showError(getErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const normalizeHexColor = (value) => {
    if (!value) return ''
    value = value.trim()
    if (!value.startsWith('#')) {
      value = '#' + value
    }
    const hexMatch = value.match(/^#([0-9A-Fa-f]{0,6})$/)
    if (hexMatch) {
      return value.toUpperCase()
    }
    return value
  }

  const handleHexColorChange = (colorField, value) => {
    const normalized = normalizeHexColor(value)
    if (normalized === '' || /^#[0-9A-Fa-f]{1,6}$/.test(normalized)) {
      setClientTheme({ ...clientTheme, [colorField]: normalized })
    }
  }

  if (!client) return null

  return (
    <>
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <BusinessIcon sx={{ color: theme.palette.primary.main }} />
          <Typography variant="h6" fontWeight={600}>
            Manage {client.company_name}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: 'text.secondary',
            '&:hover': {
              bgcolor: alpha(theme.palette.error.main, 0.1),
              color: theme.palette.error.main,
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress size={40} />
          </Box>
        ) : (
          <Box>
            {/* URL Slug Info */}
            {client.url_slug && (
              <Alert severity="info" sx={{ mb: 3 }}>
                <Typography variant="body2">
                  <strong>URL Slug:</strong> {client.url_slug}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Whitelabeled reports available at: /reporting/client/{client.url_slug}
                </Typography>
              </Alert>
            )}

            {/* Mappings Section */}
            <Box mb={4}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                External Mappings
              </Typography>
              
              <Grid container spacing={2} mb={2}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>GA4 Property ID</InputLabel>
                    <Select
                      value={ga4PropertyId || ''}
                      onChange={(e) => setGa4PropertyId(e.target.value)}
                      label="GA4 Property ID"
                      disabled={ga4PropertiesLoading || saving}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {availableGA4Properties.map((prop) => (
                        <MenuItem key={prop.propertyId} value={prop.propertyId}>
                          {prop.propertyDisplayName} ({prop.propertyId})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <Autocomplete
                    options={availableBrands}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option
                      return option.name || `Brand ${option.id}`
                    }}
                    value={availableBrands.find(b => b.id.toString() === scrunchBrandId) || null}
                    onChange={handleBrandSearchChange}
                    onInputChange={(event, newInputValue, reason) => {
                      // Handle search input changes
                      if (reason === 'input') {
                        setBrandSearchTerm(newInputValue)
                        setBrandsPage(0)
                        // Clear previous timeout
                        if (searchTimeoutRef.current) {
                          clearTimeout(searchTimeoutRef.current)
                        }
                        // Debounce the search
                        searchTimeoutRef.current = setTimeout(() => {
                          loadBrands(newInputValue, 0, false)
                        }, 300)
                      }
                    }}
                    inputValue={brandSearchTerm}
                    loading={brandsLoading}
                    disabled={saving}
                    filterOptions={(x) => x} // Disable client-side filtering, we do it server-side
                    ListboxProps={{
                      onScroll: handleBrandListboxScroll,
                      style: { maxHeight: 300 }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Scrunch Brand"
                        placeholder="Search brands..."
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {brandsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                    renderOption={(props, option) => (
                      <Box component="li" {...props} key={option.id}>
                        <Typography variant="body2">
                          {option.name} {option.id ? `(ID: ${option.id})` : ''}
                        </Typography>
                      </Box>
                    )}
                    isOptionEqualToValue={(option, value) => option.id === value.id}
                    noOptionsText={brandsLoading ? 'Loading...' : 'No brands found'}
                  />
                </Grid>
              </Grid>

              <Button
                variant="contained"
                onClick={handleSaveMappings}
                disabled={saving}
                startIcon={saving ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                sx={{
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                {saving ? 'Saving...' : 'Save Mappings'}
              </Button>
            </Box>

            <Divider sx={{ my: 3 }} />

            {/* Theme Section */}
            <Box mb={4}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Theme & Branding
              </Typography>
              
              <Grid container spacing={2} mb={2}>
                <Grid item xs={12} sm={6}>
                  <Box display="flex" gap={1} alignItems="flex-end">
                    <TextField
                      fullWidth
                      label="Primary Color"
                      type="color"
                      value={clientTheme.theme_color || '#1976d2'}
                      onChange={(e) => setClientTheme({ ...clientTheme, theme_color: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="Hex"
                      value={clientTheme.theme_color || '#1976d2'}
                      onChange={(e) => handleHexColorChange('theme_color', e.target.value)}
                      onBlur={(e) => {
                        const normalized = normalizeHexColor(e.target.value)
                        if (normalized && /^#[0-9A-Fa-f]{6}$/.test(normalized)) {
                          setClientTheme({ ...clientTheme, theme_color: normalized })
                        }
                      }}
                      placeholder="#1976d2"
                      size="small"
                      sx={{ minWidth: 120 }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Box display="flex" gap={1} alignItems="flex-end">
                    <TextField
                      fullWidth
                      label="Secondary Color"
                      type="color"
                      value={clientTheme.secondary_color || '#dc004e'}
                      onChange={(e) => setClientTheme({ ...clientTheme, secondary_color: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                      label="Hex"
                      value={clientTheme.secondary_color || '#dc004e'}
                      onChange={(e) => handleHexColorChange('secondary_color', e.target.value)}
                      onBlur={(e) => {
                        const normalized = normalizeHexColor(e.target.value)
                        if (normalized && /^#[0-9A-Fa-f]{6}$/.test(normalized)) {
                          setClientTheme({ ...clientTheme, secondary_color: normalized })
                        }
                      }}
                      placeholder="#dc004e"
                      size="small"
                      sx={{ minWidth: 120 }}
                    />
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" fontWeight={500} mb={1}>
                    Logo
                  </Typography>
                  {logoUrl || logoPreview ? (
                    <Box mb={2}>
                      <Box
                        component="img"
                        src={logoPreview || logoUrl}
                        alt={`${client.company_name} logo`}
                        sx={{
                          maxWidth: 200,
                          maxHeight: 100,
                          objectFit: 'contain',
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          p: 1,
                          mb: 2,
                        }}
                      />
                      <Box display="flex" gap={1} flexWrap="wrap">
                        {logoFile ? (
                          <>
                            <Button
                              variant="contained"
                              size="small"
                              onClick={handleLogoUpload}
                              disabled={saving}
                              startIcon={saving ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                            >
                              {saving ? 'Uploading...' : 'Upload Logo'}
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              onClick={() => {
                                setLogoFile(null)
                                setLogoPreview(null)
                              }}
                              disabled={saving}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outlined"
                              component="label"
                              size="small"
                              disabled={saving}
                              sx={{ textTransform: 'none' }}
                            >
                              Replace Logo
                              <input
                                type="file"
                                hidden
                                accept="image/*"
                                onChange={handleFileChange}
                              />
                            </Button>
                            {logoUrl && (
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={handleLogoDelete}
                                disabled={saving}
                                sx={{ textTransform: 'none' }}
                              >
                                Delete Logo
                              </Button>
                            )}
                          </>
                        )}
                      </Box>
                    </Box>
                  ) : null}
                  {!logoUrl && !logoPreview && (
                    <Box display="flex" gap={1} alignItems="flex-end" mb={2}>
                      <TextField
                        fullWidth
                        label="Logo URL"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="https://example.com/logo.png"
                        helperText="Enter logo URL or upload an image file"
                        disabled={!!logoFile}
                      />
                      <Button
                        variant="outlined"
                        component="label"
                        disabled={saving || !!logoFile}
                        sx={{
                          minWidth: 120,
                          textTransform: 'none',
                        }}
                      >
                        Upload File
                        <input
                          type="file"
                          hidden
                          accept="image/*"
                          onChange={handleFileChange}
                        />
                      </Button>
                    </Box>
                  )}
                  {logoFile && !logoUrl && !logoPreview && (
                    <Box mb={2}>
                      <Typography variant="body2" color="text.secondary" mb={1}>
                        Selected: {logoFile.name}
                      </Typography>
                      <Button
                        variant="contained"
                        onClick={handleLogoUpload}
                        disabled={saving}
                        startIcon={saving ? <CircularProgress size={16} /> : <CheckCircleIcon />}
                        sx={{ textTransform: 'none' }}
                      >
                        {saving ? 'Uploading...' : 'Upload Logo'}
                      </Button>
                    </Box>
                  )}
                </Grid>
                
                {/* <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Font Family"
                    value={clientTheme.font_family}
                    onChange={(e) => setClientTheme({ ...clientTheme, font_family: e.target.value })}
                    placeholder="Arial, sans-serif"
                    helperText="CSS font-family value"
                  />
                </Grid> */}
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Report Title"
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder={`${client.company_name} Analytics Dashboard`}
                    helperText="Custom title for whitelabeled reports"
                  />
                </Grid>
              </Grid>
            </Box>

            {/* Whitelabeling Section - Commented out
            <Divider sx={{ my: 3 }} />

            <Box mb={4}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Whitelabeling Content
              </Typography>
              
              <Grid container spacing={2} mb={2}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Header Text"
                    value={headerText}
                    onChange={(e) => setHeaderText(e.target.value)}
                    placeholder="Custom header text for reports"
                    multiline
                    rows={2}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Footer Text"
                    value={footerText}
                    onChange={(e) => setFooterText(e.target.value)}
                    placeholder="Custom footer text for reports"
                    multiline
                    rows={2}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Custom CSS"
                    value={customCss}
                    onChange={(e) => setCustomCss(e.target.value)}
                    placeholder="Custom CSS for whitelabeled reports"
                    multiline
                    rows={6}
                    helperText="Custom CSS to apply to whitelabeled reports"
                    sx={{
                      '& .MuiInputBase-input': {
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ my: 3 }} />
            */}

            {/* Linked Campaigns Section */}
            <Box mb={2}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Linked Campaigns
              </Typography>
              
              {/* Add Campaign Autocomplete */}
              <Box mb={2}>
                <Autocomplete
                  options={availableCampaigns}
                  getOptionLabel={(option) => {
                    if (typeof option === 'string') return option
                    return `${option.company || `Campaign ${option.id}`}${option.url ? ` - ${option.url}` : ''}`
                  }}
                  value={null}
                  onChange={handleCampaignSearchChange}
                  onInputChange={(event, newInputValue, reason) => {
                    // Handle search input changes
                    if (reason === 'input') {
                      setCampaignSearchTerm(newInputValue)
                      setCampaignsPage(0)
                      // Clear previous timeout
                      if (campaignSearchTimeoutRef.current) {
                        clearTimeout(campaignSearchTimeoutRef.current)
                      }
                      // Debounce the search
                      campaignSearchTimeoutRef.current = setTimeout(() => {
                        loadCampaigns(newInputValue, 0, false)
                      }, 300)
                    }
                  }}
                  inputValue={campaignSearchTerm}
                  loading={campaignsLoading}
                  disabled={saving}
                  filterOptions={(x) => x} // Disable client-side filtering, we do it server-side
                  ListboxProps={{
                    onScroll: handleCampaignListboxScroll,
                    style: { maxHeight: 300 }
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Add Campaign"
                      placeholder="Search campaigns..."
                      InputProps={{
                        ...params.InputProps,
                        endAdornment: (
                          <>
                            {campaignsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, option) => (
                    <Box component="li" {...props} key={option.id}>
                      <Typography variant="body2">
                        {option.company || `Campaign ${option.id}`} {option.url ? `(${option.url})` : ''}
                      </Typography>
                    </Box>
                  )}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  noOptionsText={campaignsLoading ? 'Loading...' : 'No campaigns found'}
                />
              </Box>
              
              {linkedCampaigns.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No campaigns linked to this client. Use the search above to add campaigns.
                </Typography>
              ) : (
                <List>
                  {linkedCampaigns.map((link) => {
                    const campaign = link.agency_analytics_campaigns
                    if (!campaign) return null
                    return (
                      <ListItem
                        key={link.campaign_id}
                        sx={{
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          mb: 1,
                        }}
                      >
                        <CampaignIcon sx={{ mr: 2, color: 'text.secondary' }} />
                        <ListItemText
                          primary={campaign.company || `Campaign ${link.campaign_id}`}
                          secondary={campaign.url || `Campaign ID: ${link.campaign_id}`}
                        />
                        <ListItemSecondaryAction>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Chip
                              label={link.is_primary ? 'Primary' : 'Linked'}
                              size="small"
                              color={link.is_primary ? 'primary' : 'default'}
                            />
                            <IconButton
                              size="small"
                              onClick={() => handleUnlinkCampaign(link.campaign_id)}
                              disabled={saving}
                              sx={{
                                color: theme.palette.error.main,
                                '&:hover': {
                                  bgcolor: alpha(theme.palette.error.main, 0.1),
                                },
                              }}
                            >
                              <LinkOffIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </ListItemSecondaryAction>
                      </ListItem>
                    )
                  })}
                </List>
              )}
            </Box>

            <Button
              variant="contained"
              fullWidth
              onClick={handleThemeUpdate}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={16} /> : <PaletteIcon />}
              sx={{
                borderRadius: 1.5,
                textTransform: 'none',
                fontWeight: 600,
                mt: 2,
              }}
            >
              {saving ? 'Saving...' : 'Save Theme & Branding'}
            </Button>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={onClose}
          sx={{
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>

    {/* Conflict Dialog */}
    <Dialog
      open={conflictDialogOpen}
      onClose={() => {
        setConflictDialogOpen(false)
        setConflictData(null)
        setPendingMappings(null)
      }}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 1,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <WarningIcon sx={{ color: theme.palette.warning.main }} />
          <Typography variant="h6" fontWeight={600}>
            Conflict Detected
          </Typography>
        </Box>
        <IconButton
          onClick={() => {
            setConflictDialogOpen(false)
            setConflictData(null)
            setPendingMappings(null)
          }}
          size="small"
          sx={{
            color: 'text.secondary',
            '&:hover': {
              bgcolor: alpha(theme.palette.error.main, 0.1),
              color: theme.palette.error.main,
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight={600} mb={0.5}>
            {conflictData?.message || 'Resource was modified by another user.'}
          </Typography>
        </Alert>

        {conflictData?.current_data && (
          <Box mb={3}>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Current Values:
            </Typography>
            <Box
              sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: alpha(theme.palette.info.main, 0.05),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="body2" mb={1}>
                <strong>GA4 Property ID:</strong>{' '}
                {conflictData.current_data.ga4_property_id || 'None'}
              </Typography>
              <Typography variant="body2" mb={1}>
                <strong>Scrunch Brand ID:</strong>{' '}
                {conflictData.current_data.scrunch_brand_id || 'None'}
              </Typography>
              {conflictData.current_data.last_modified_by && (
                <Typography variant="body2" color="text.secondary">
                  <strong>Last modified by:</strong>{' '}
                  {conflictData.current_data.last_modified_by}
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {pendingMappings && (
          <Box mb={3}>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Your Changes:
            </Typography>
            <Box
              sx={{
                p: 2,
                borderRadius: 1,
                bgcolor: alpha(theme.palette.warning.main, 0.05),
                border: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Typography variant="body2" mb={1}>
                <strong>GA4 Property ID:</strong>{' '}
                {pendingMappings.ga4_property_id || 'None'}
              </Typography>
              <Typography variant="body2">
                <strong>Scrunch Brand ID:</strong>{' '}
                {pendingMappings.scrunch_brand_id || 'None'}
              </Typography>
            </Box>
          </Box>
        )}

        <Typography variant="body2" color="text.secondary">
          Would you like to refresh and see the current values, or overwrite with your changes?
        </Typography>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button
          onClick={() => {
            setConflictDialogOpen(false)
            setConflictData(null)
            setPendingMappings(null)
          }}
          sx={{
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleConflictRefresh}
          variant="outlined"
          startIcon={<RefreshIcon />}
          sx={{
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          Refresh
        </Button>
        <Button
          onClick={handleConflictOverwrite}
          variant="contained"
          color="warning"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : <CheckCircleIcon />}
          sx={{
            borderRadius: 1.5,
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          {saving ? 'Overwriting...' : 'Overwrite'}
        </Button>
      </DialogActions>
    </Dialog>
    </>
  )
}

export default ClientManagement

