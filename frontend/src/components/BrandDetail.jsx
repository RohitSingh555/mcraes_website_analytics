import { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  Chip,
  Tabs,
  Tab,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Avatar,
  LinearProgress,
  alpha,
  useTheme,
  Fade
} from '@mui/material'
import {
  ArrowBack as ArrowBackIcon,
  Business as BusinessIcon,
  Analytics as AnalyticsIcon,
  Article as ArticleIcon,
  ChatBubble as ChatBubbleIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Language as LanguageIcon
} from '@mui/icons-material'
import { syncAPI } from '../services/api'

function BrandDetail({ brand, analytics, onBack }) {
  const [tabValue, setTabValue] = useState(0)
  const [prompts, setPrompts] = useState([])
  const [responses, setResponses] = useState([])
  const [loading, setLoading] = useState(false)
  const theme = useTheme()

  useEffect(() => {
    if (tabValue === 1) {
      loadPrompts()
    } else if (tabValue === 2) {
      loadResponses()
    }
  }, [tabValue])

  const loadPrompts = async () => {
    try {
      setLoading(true)
      const brandId = brand?.id
      const result = await syncAPI.getPrompts({ brand_id: brandId, limit: 100 })
      setPrompts(Array.isArray(result) ? result : result.items || [])
    } catch (err) {
      console.error('Failed to load prompts:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadResponses = async () => {
    try {
      setLoading(true)
      const brandId = brand?.id
      const result = await syncAPI.getResponses({ brand_id: brandId, limit: 100 })
      setResponses(Array.isArray(result) ? result : result.items || [])
    } catch (err) {
      console.error('Failed to load responses:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatNumber = (num) => num?.toLocaleString() || '0'
  const formatPercentage = (value, total) => {
    if (!total || total === 0) return '0%'
    return `${((value / total) * 100).toFixed(1)}%`
  }

  const renderChart = (data, title, color = '#007AFF') => {
    if (!data || Object.keys(data).length === 0) {
      return (
        <Typography 
          variant="body2" 
          color="text.secondary" 
          py={4}
          textAlign="center"
          sx={{ fontSize: '13px' }}
        >
          No data available
        </Typography>
      )
    }

    const entries = Object.entries(data).sort((a, b) => b[1] - a[1])
    const max = Math.max(...entries.map(e => e[1]))

    return (
      <Box>
        <Typography 
          variant="h6" 
          mb={2} 
          fontWeight={600}
          sx={{ fontSize: '16px', letterSpacing: '-0.01em' }}
        >
          {title}
        </Typography>
        <Box>
          {entries.map(([key, value]) => (
            <Box key={key} mb={2}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.75}>
                <Typography 
                  variant="body2" 
                  fontWeight={500}
                  textTransform="capitalize"
                  sx={{ fontSize: '13px' }}
                >
                  {key}
                </Typography>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: '12px', fontWeight: 500 }}
                  >
                    {formatPercentage(value, max)}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    fontWeight={700}
                    sx={{ fontSize: '15px', minWidth: 50, textAlign: 'right' }}
                  >
                    {formatNumber(value)}
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={(value / max) * 100}
                sx={{
                  height: 6,
                  borderRadius: 1,
                  backgroundColor: alpha(color, 0.08),
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 1,
                    background: `linear-gradient(90deg, ${color} 0%, ${alpha(color, 0.7)} 100%)`,
                  },
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>
    )
  }

  return (
    <Fade in={true}>
      <Box>
        <Button
          startIcon={<ArrowBackIcon sx={{ fontSize: 16 }} />}
          onClick={onBack}
          size="small"
          sx={{
            mb: 3,
            px: 2,
            py: 0.75,
            borderRadius: 2,
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'none',
            color: 'text.secondary',
            '&:hover': {
              bgcolor: alpha(theme.palette.action.hover, 0.5),
              color: 'text.primary',
            },
          }}
        >
          Back to Brands
        </Button>

        <Card
          sx={{
            mb: 3,
            background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.04) 0%, rgba(88, 86, 214, 0.04) 100%)',
            border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center">
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  width: 56,
                  height: 56,
                  mr: 2,
                  fontSize: '24px',
                  fontWeight: 700,
                }}
              >
                {brand.name?.charAt(0) || <BusinessIcon sx={{ fontSize: 28 }} />}
              </Avatar>
              <Box flex={1}>
                <Typography 
                  variant="h4" 
                  fontWeight={600}
                  mb={0.5}
                  sx={{
                    fontSize: '24px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {brand.name}
                </Typography>
                {brand.website && (
                  <Box display="flex" alignItems="center">
                    <LanguageIcon 
                      sx={{ 
                        fontSize: 14, 
                        mr: 0.75, 
                        color: 'text.secondary',
                        opacity: 0.6
                      }} 
                    />
                    <Typography 
                      variant="body2" 
                      color="text.secondary"
                      sx={{ 
                        fontSize: '13px',
                        fontWeight: 500,
                      }}
                      component="a"
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {brand.website}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </CardContent>
        </Card>

        {analytics && (
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.04) 0%, rgba(0, 122, 255, 0.02) 100%)',
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.08)}`,
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box display="flex" alignItems="center" mb={1.5}>
                    <ChatBubbleIcon 
                      sx={{ 
                        color: 'primary.main', 
                        mr: 1,
                        fontSize: 20,
                      }} 
                    />
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      Total Responses
                    </Typography>
                  </Box>
                  <Typography 
                    variant="h4" 
                    fontWeight={700}
                    sx={{ 
                      fontSize: '28px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    {formatNumber(analytics.total_responses)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.04) 0%, rgba(52, 199, 89, 0.02) 100%)',
                  border: `1px solid ${alpha(theme.palette.success.main, 0.08)}`,
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box display="flex" alignItems="center" mb={1.5}>
                    <TrendingUpIcon 
                      sx={{ 
                        color: 'success.main', 
                        mr: 1,
                        fontSize: 20,
                      }} 
                    />
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      Brand Mentions
                    </Typography>
                  </Box>
                  <Typography 
                    variant="h4" 
                    fontWeight={700}
                    color="success.main"
                    sx={{ 
                      fontSize: '28px',
                      letterSpacing: '-0.01em',
                      mb: 0.25,
                    }}
                  >
                    {formatNumber(analytics.brand_presence?.present)}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: '12px', fontWeight: 500 }}
                  >
                    {formatPercentage(analytics.brand_presence?.present, analytics.total_responses)}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.04) 0%, rgba(255, 149, 0, 0.02) 100%)',
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.08)}`,
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box display="flex" alignItems="center" mb={1.5}>
                    <PeopleIcon 
                      sx={{ 
                        color: 'warning.main', 
                        mr: 1,
                        fontSize: 20,
                      }} 
                    />
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      Competitors
                    </Typography>
                  </Box>
                  <Typography 
                    variant="h4" 
                    fontWeight={700}
                    color="warning.main"
                    sx={{ 
                      fontSize: '28px',
                      letterSpacing: '-0.01em',
                      mb: 0.25,
                    }}
                  >
                    {analytics.top_competitors?.length || 0}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: '12px', fontWeight: 500 }}
                  >
                    Different competitors
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card
                sx={{
                  background: 'linear-gradient(135deg, rgba(90, 200, 250, 0.04) 0%, rgba(90, 200, 250, 0.02) 100%)',
                  border: `1px solid ${alpha(theme.palette.info.main, 0.08)}`,
                }}
              >
                <CardContent sx={{ p: 2.5 }}>
                  <Box display="flex" alignItems="center" mb={1.5}>
                    <ArticleIcon 
                      sx={{ 
                        color: 'info.main', 
                        mr: 1,
                        fontSize: 20,
                      }} 
                    />
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}
                    >
                      Citations
                    </Typography>
                  </Box>
                  <Typography 
                    variant="h4" 
                    fontWeight={700}
                    color="info.main"
                    sx={{ 
                      fontSize: '28px',
                      letterSpacing: '-0.01em',
                      mb: 0.25,
                    }}
                  >
                    {formatNumber(analytics.citation_metrics?.total)}
                  </Typography>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ fontSize: '12px', fontWeight: 500 }}
                  >
                    Avg: {analytics.citation_metrics?.average_per_response || 0} per response
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        <Paper
          sx={{
            mb: 3,
            borderRadius: 2,
            border: '1px solid rgba(0, 0, 0, 0.06)',
            overflow: 'hidden',
          }}
        >
          <Tabs
            value={tabValue}
            onChange={(e, newValue) => setTabValue(newValue)}
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
              icon={<AnalyticsIcon sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
              label="Analytics"
              sx={{ px: 3 }}
            />
            <Tab 
              icon={<ArticleIcon sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
              label="Prompts"
              sx={{ px: 3 }}
            />
            <Tab 
              icon={<ChatBubbleIcon sx={{ fontSize: 18 }} />} 
              iconPosition="start" 
              label="Responses"
              sx={{ px: 3 }}
            />
          </Tabs>
        </Paper>

        {tabValue === 0 && analytics && (
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  {renderChart(analytics.platform_distribution, 'Platform Distribution', '#007AFF')}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  {renderChart(analytics.stage_distribution, 'Funnel Stage Distribution', '#34C759')}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography 
                    variant="h6" 
                    mb={2} 
                    fontWeight={600}
                    sx={{ fontSize: '16px', letterSpacing: '-0.01em' }}
                  >
                    Top Competitors
                  </Typography>
                  {analytics.top_competitors?.length > 0 ? (
                    <Grid container spacing={1.5}>
                      {analytics.top_competitors.slice(0, 10).map((comp, idx) => (
                        <Grid item xs={12} sm={6} md={4} key={idx}>
                          <Paper
                            sx={{
                              p: 1.5,
                              borderLeft: `3px solid ${theme.palette.primary.main}`,
                              borderRadius: 1.5,
                              transition: 'all 0.2s',
                              '&:hover': {
                                transform: 'translateX(2px)',
                              },
                            }}
                          >
                            <Box display="flex" justifyContent="space-between" alignItems="center">
                              <Box display="flex" alignItems="center" gap={1}>
                                <Chip
                                  label={`#${idx + 1}`}
                                  size="small"
                                  sx={{
                                    bgcolor: 'primary.main',
                                    color: 'white',
                                    fontWeight: 700,
                                    fontSize: '11px',
                                    height: 20,
                                    minWidth: 28,
                                  }}
                                />
                                <Typography 
                                  variant="body2" 
                                  fontWeight={600}
                                  sx={{ fontSize: '13px' }}
                                >
                                  {comp.name}
                                </Typography>
                              </Box>
                              <Typography 
                                variant="body2" 
                                fontWeight={700} 
                                color="primary.main"
                                sx={{ fontSize: '13px' }}
                              >
                                {formatNumber(comp.count)}
                              </Typography>
                            </Box>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  ) : (
                    <Typography color="text.secondary" textAlign="center" py={3} sx={{ fontSize: '13px' }}>
                      No competitors mentioned
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card>
                <CardContent sx={{ p: 3 }}>
                  <Typography 
                    variant="h6" 
                    mb={2} 
                    fontWeight={600}
                    sx={{ fontSize: '16px', letterSpacing: '-0.01em' }}
                  >
                    Top Topics
                  </Typography>
                  {analytics.top_topics?.length > 0 ? (
                    <Box display="flex" flexWrap="wrap" gap={1}>
                      {analytics.top_topics.slice(0, 20).map((topic, idx) => (
                        <Chip
                          key={idx}
                          label={`${topic.topic} (${topic.count})`}
                          size="small"
                          sx={{
                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                            color: 'primary.main',
                            fontWeight: 600,
                            fontSize: '12px',
                            height: 28,
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.15),
                            },
                          }}
                        />
                      ))}
                    </Box>
                  ) : (
                    <Typography color="text.secondary" textAlign="center" py={3} sx={{ fontSize: '13px' }}>
                      No topics available
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {tabValue === 1 && (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography 
                variant="h6" 
                mb={2} 
                fontWeight={600}
                sx={{ fontSize: '16px', letterSpacing: '-0.01em' }}
              >
                Prompts
              </Typography>
              {loading ? (
                <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />
              ) : prompts.length > 0 ? (
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
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {prompts.slice(0, 50).map((prompt) => (
                        <TableRow 
                          key={prompt.id} 
                          hover
                          sx={{
                            transition: 'all 0.2s',
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, 0.02),
                            },
                          }}
                        >
                          <TableCell sx={{ fontSize: '13px', fontWeight: 500, py: 1.5 }}>{prompt.id}</TableCell>
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
                            >
                              {prompt.text || prompt.prompt_text || 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell sx={{ py: 1.5 }}>
                            <Chip 
                              label={prompt.stage || 'N/A'} 
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
                              {prompt.platforms?.slice(0, 2).map((p) => (
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={4} sx={{ fontSize: '13px' }}>
                  No prompts available
                </Typography>
              )}
            </CardContent>
          </Card>
        )}

        {tabValue === 2 && (
          <Card>
            <CardContent sx={{ p: 3 }}>
              <Typography 
                variant="h6" 
                mb={2} 
                fontWeight={600}
                sx={{ fontSize: '16px', letterSpacing: '-0.01em' }}
              >
                Responses
              </Typography>
              {loading ? (
                <LinearProgress sx={{ mb: 2, borderRadius: 1 }} />
              ) : responses.length > 0 ? (
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
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {responses.slice(0, 50).map((response) => (
                        <TableRow 
                          key={response.id} 
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
                              label={response.platform || 'N/A'} 
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
                              label={response.stage || 'N/A'} 
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
                            {response.brand_sentiment ? (
                              <Chip
                                label={response.brand_sentiment}
                                size="small"
                                sx={{
                                  bgcolor: response.brand_sentiment.toLowerCase().includes('positive') 
                                    ? alpha(theme.palette.success.main, 0.1)
                                    : alpha(theme.palette.error.main, 0.1),
                                  color: response.brand_sentiment.toLowerCase().includes('positive')
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
                            {response.competitors_present?.length > 0 ? (
                              <Box display="flex" flexWrap="wrap" gap={0.5}>
                                {response.competitors_present.slice(0, 2).map((comp) => (
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
                              label={response.citations?.length || 0}
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary" textAlign="center" py={4} sx={{ fontSize: '13px' }}>
                  No responses available
                </Typography>
              )}
            </CardContent>
          </Card>
        )}
      </Box>
    </Fade>
  )
}

export default BrandDetail
