import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Chip,
  alpha,
  useTheme
} from '@mui/material'
import {
  Business as BusinessIcon,
  Article as ArticleIcon,
  ChatBubble as ChatBubbleIcon
} from '@mui/icons-material'
import { syncAPI } from '../services/api'

function DataView() {
  const [dataType, setDataType] = useState('brands')
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    stage: '',
    persona_id: '',
    platform: '',
    prompt_id: '',
    start_date: '',
    end_date: '',
    limit: '50',
  })
  const theme = useTheme()

  useEffect(() => {
    loadData()
  }, [dataType])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      let result

      switch (dataType) {
        case 'brands':
          result = await syncAPI.getBrands()
          setData(Array.isArray(result) ? result : result.items || [])
          break
        case 'prompts':
          result = await syncAPI.getPrompts({
            stage: filters.stage || undefined,
            persona_id: filters.persona_id || undefined,
            limit: filters.limit || undefined,
          })
          setData(Array.isArray(result) ? result : result.items || [])
          break
        case 'responses':
          result = await syncAPI.getResponses({
            platform: filters.platform || undefined,
            prompt_id: filters.prompt_id || undefined,
            start_date: filters.start_date || undefined,
            end_date: filters.end_date || undefined,
            limit: filters.limit || undefined,
          })
          setData(Array.isArray(result) ? result : result.items || [])
          break
        default:
          setData([])
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load data')
      setData([])
    } finally {
      setLoading(false)
    }
  }

  const renderTable = () => {
    if (data.length === 0) {
      return (
        <Card>
          <CardContent sx={{ p: 4, textAlign: 'center' }}>
            <Typography 
              variant="h6" 
              color="text.secondary" 
              py={3}
              sx={{ fontSize: '16px' }}
            >
              No data available. Sync data first to view it here.
            </Typography>
          </CardContent>
        </Card>
      )
    }

    if (dataType === 'brands') {
      return (
        <TableContainer 
          component={Paper}
          sx={{
            borderRadius: 2,
            border: '1px solid rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.grey[100], 0.5) }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>Website</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>Created At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((item) => (
                <TableRow 
                  key={item.id} 
                  hover
                  sx={{
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                    },
                  }}
                >
                  <TableCell sx={{ fontSize: '13px', fontWeight: 500, py: 1.5 }}>{item.id}</TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Box display="flex" alignItems="center">
                      <BusinessIcon sx={{ mr: 1, color: 'primary.main', fontSize: 18 }} />
                      <Typography variant="body2" sx={{ fontSize: '13px', fontWeight: 500 }}>
                        {item.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: '13px', py: 1.5 }}>{item.website || 'N/A'}</TableCell>
                  <TableCell sx={{ fontSize: '13px', py: 1.5 }}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )
    }

    if (dataType === 'prompts') {
      return (
        <TableContainer 
          component={Paper}
          sx={{
            borderRadius: 2,
            border: '1px solid rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.grey[100], 0.5) }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>ID</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>Text</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>Stage</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>Platforms</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>Created At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((item) => (
                <TableRow 
                  key={item.id} 
                  hover
                  sx={{
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                    },
                  }}
                >
                  <TableCell sx={{ fontSize: '13px', fontWeight: 500, py: 1.5 }}>{item.id}</TableCell>
                  <TableCell sx={{ maxWidth: 400, fontSize: '13px', py: 1.5 }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        fontSize: '13px',
                        lineHeight: 1.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                      title={item.text || item.prompt_text || 'N/A'}
                    >
                      {item.text || item.prompt_text || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Chip 
                      label={item.stage || 'N/A'} 
                      size="small" 
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        color: 'primary.main',
                        fontWeight: 600,
                        fontSize: '11px',
                        height: 22,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {item.platforms?.slice(0, 2).map((p) => (
                        <Chip 
                          key={p} 
                          label={p} 
                          size="small" 
                          sx={{
                            fontSize: '10px',
                            height: 20,
                            fontWeight: 500,
                          }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontSize: '13px', py: 1.5 }}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )
    }

    if (dataType === 'responses') {
      return (
        <TableContainer 
          component={Paper}
          sx={{
            borderRadius: 2,
            border: '1px solid rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
          }}
        >
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: alpha(theme.palette.grey[100], 0.5) }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>Platform</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>Stage</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>Brand Sentiment</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>Competitors</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>Citations</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', py: 1.5 }}>Created At</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.map((item) => (
                <TableRow 
                  key={item.id} 
                  hover
                  sx={{
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: alpha(theme.palette.primary.main, 0.02),
                    },
                  }}
                >
                  <TableCell sx={{ py: 1.5 }}>
                    <Chip 
                      label={item.platform || 'N/A'} 
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.08),
                        color: 'primary.main',
                        fontWeight: 600,
                        fontSize: '11px',
                        height: 22,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Chip 
                      label={item.stage || 'N/A'} 
                      size="small" 
                      sx={{
                        bgcolor: alpha(theme.palette.secondary.main, 0.08),
                        color: 'secondary.main',
                        fontWeight: 600,
                        fontSize: '11px',
                        height: 22,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    {item.brand_sentiment ? (
                      <Chip
                        label={item.brand_sentiment}
                        size="small"
                        sx={{
                          bgcolor: item.brand_sentiment.toLowerCase().includes('positive') 
                            ? alpha(theme.palette.success.main, 0.1)
                            : alpha(theme.palette.error.main, 0.1),
                          color: item.brand_sentiment.toLowerCase().includes('positive')
                            ? 'success.main'
                            : 'error.main',
                          fontWeight: 600,
                          fontSize: '11px',
                          height: 22,
                        }}
                      />
                    ) : (
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ fontSize: '12px' }}
                      >
                        N/A
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    {item.competitors_present?.length > 0 ? (
                      <Box display="flex" flexWrap="wrap" gap={0.5}>
                        {item.competitors_present.slice(0, 2).map((comp) => (
                          <Chip 
                            key={comp} 
                            label={comp} 
                            size="small"
                            sx={{
                              fontSize: '10px',
                              height: 20,
                              fontWeight: 500,
                            }}
                          />
                        ))}
                      </Box>
                    ) : (
                      <Typography 
                        variant="caption" 
                        color="text.secondary"
                        sx={{ fontSize: '12px' }}
                      >
                        None
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ py: 1.5 }}>
                    <Chip
                      label={item.citations?.length || 0}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.info.main, 0.08),
                        color: 'info.main',
                        fontWeight: 600,
                        fontSize: '11px',
                        height: 22,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '13px', py: 1.5 }}>
                    {item.created_at ? new Date(item.created_at).toLocaleDateString() : 'N/A'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )
    }
  }

  return (
    <Box>
      <Box mb={3}>
        <Typography 
          variant="h4" 
          fontWeight={600} 
          mb={1}
          sx={{
            fontSize: '24px',
            letterSpacing: '-0.01em',
          }}
        >
          View Data
        </Typography>
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ fontSize: '13px' }}
        >
          Browse synced data from Scrunch AI
        </Typography>
      </Box>

      <Paper 
        sx={{ 
          mb: 3,
          borderRadius: 2,
          border: '1px solid rgba(0, 0, 0, 0.06)',
          overflow: 'hidden',
        }}
      >
        <Tabs
          value={dataType}
          onChange={(e, newValue) => setDataType(newValue)}
          sx={{
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
            '& .MuiTab-root': {
              minHeight: 48,
              fontSize: '14px',
              fontWeight: 600,
              textTransform: 'none',
              '&.Mui-selected': {
                color: 'primary.main',
              },
            },
            '& .MuiTabs-indicator': {
              height: 2,
            },
          }}
        >
          <Tab 
            icon={<BusinessIcon sx={{ fontSize: 18 }} />} 
            iconPosition="start" 
            label="Brands" 
            value="brands"
            sx={{ px: 3 }}
          />
          <Tab 
            icon={<ArticleIcon sx={{ fontSize: 18 }} />} 
            iconPosition="start" 
            label="Prompts" 
            value="prompts"
            sx={{ px: 3 }}
          />
          <Tab 
            icon={<ChatBubbleIcon sx={{ fontSize: 18 }} />} 
            iconPosition="start" 
            label="Responses" 
            value="responses"
            sx={{ px: 3 }}
          />
        </Tabs>
      </Paper>

      {(dataType === 'prompts' || dataType === 'responses') && (
        <Card sx={{ mb: 3 }}>
          <CardContent sx={{ p: 3 }}>
            <Typography 
              variant="h6" 
              mb={2} 
              fontWeight={600}
              sx={{ fontSize: '16px', letterSpacing: '-0.01em' }}
            >
              Filters
            </Typography>
            <Grid container spacing={2}>
              {dataType === 'prompts' && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Stage"
                      size="small"
                      value={filters.stage}
                      onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
                      sx={{ fontSize: '13px' }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Persona ID"
                      type="number"
                      size="small"
                      value={filters.persona_id}
                      onChange={(e) => setFilters({ ...filters, persona_id: e.target.value })}
                    />
                  </Grid>
                </>
              )}
              {dataType === 'responses' && (
                <>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Platform"
                      size="small"
                      value={filters.platform}
                      onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Prompt ID"
                      type="number"
                      size="small"
                      value={filters.prompt_id}
                      onChange={(e) => setFilters({ ...filters, prompt_id: e.target.value })}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="Start Date"
                      type="date"
                      size="small"
                      value={filters.start_date}
                      onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <TextField
                      fullWidth
                      label="End Date"
                      type="date"
                      size="small"
                      value={filters.end_date}
                      onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                      InputLabelProps={{ shrink: true }}
                    />
                  </Grid>
                </>
              )}
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  label="Limit"
                  type="number"
                  size="small"
                  value={filters.limit}
                  onChange={(e) => setFilters({ ...filters, limit: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Button 
                  variant="contained" 
                  fullWidth 
                  size="small"
                  onClick={loadData}
                  sx={{
                    mt: 0.25,
                    borderRadius: 2,
                    px: 2,
                    py: 1,
                    fontSize: '13px',
                    fontWeight: 600,
                  }}
                >
                  Apply Filters
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
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

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
          <CircularProgress size={32} thickness={4} />
        </Box>
      ) : (
        renderTable()
      )}
    </Box>
  )
}

export default DataView
