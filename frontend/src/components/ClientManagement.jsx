import { useState, useEffect } from 'react'
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
} from '@mui/icons-material'
import { clientAPI, dataAPI, ga4API } from '../services/api'
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
  const [availableGA4Properties, setAvailableGA4Properties] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [brandsLoading, setBrandsLoading] = useState(false)
  const [ga4PropertiesLoading, setGa4PropertiesLoading] = useState(false)

  useEffect(() => {
    if (open && client) {
      loadClientData()
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
      
      // Load available brands and GA4 properties
      await loadAvailableOptions()
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
    setBrandsLoading(true)
    setGa4PropertiesLoading(true)
    
    try {
      // Load available brands
      const brandsResponse = await dataAPI.getBrands(100, 0)
      setAvailableBrands(brandsResponse.items || [])
      
      // Load available GA4 properties
      const ga4Response = await ga4API.getProperties()
      setAvailableGA4Properties(ga4Response.items || [])
    } catch (err) {
      showError(getErrorMessage(err))
    } finally {
      setBrandsLoading(false)
      setGa4PropertiesLoading(false)
    }
  }

  const handleSaveMappings = async () => {
    if (!client) return
    
    setSaving(true)
    try {
      await clientAPI.updateClientMappings(client.id, {
        ga4_property_id: ga4PropertyId || null,
        scrunch_brand_id: scrunchBrandId ? parseInt(scrunchBrandId) : null,
      })
      showSuccess('Client mappings updated successfully')
      onClose()
    } catch (err) {
      showError(getErrorMessage(err))
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
                  <FormControl fullWidth>
                    <InputLabel>Scrunch Brand</InputLabel>
                    <Select
                      value={scrunchBrandId || ''}
                      onChange={(e) => setScrunchBrandId(e.target.value)}
                      label="Scrunch Brand"
                      disabled={brandsLoading || saving}
                    >
                      <MenuItem value="">
                        <em>None</em>
                      </MenuItem>
                      {availableBrands.map((brand) => (
                        <MenuItem key={brand.id} value={brand.id}>
                          {brand.name} (ID: {brand.id})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
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
                
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Font Family"
                    value={clientTheme.font_family}
                    onChange={(e) => setClientTheme({ ...clientTheme, font_family: e.target.value })}
                    placeholder="Arial, sans-serif"
                    helperText="CSS font-family value"
                  />
                </Grid>
                
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

            <Divider sx={{ my: 3 }} />

            {/* Whitelabeling Section */}
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
                    placeholder="/* Custom CSS for whitelabeled reports */"
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

            {/* Linked Campaigns Section */}
            <Box mb={2}>
              <Typography variant="subtitle1" fontWeight={600} mb={2}>
                Linked Campaigns
              </Typography>
              {linkedCampaigns.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No campaigns linked to this client
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
                          <Chip
                            label={link.is_primary ? 'Primary' : 'Linked'}
                            size="small"
                            color={link.is_primary ? 'primary' : 'default'}
                          />
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
  )
}

export default ClientManagement

