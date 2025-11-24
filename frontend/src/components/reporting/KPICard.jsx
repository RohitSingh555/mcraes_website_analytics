import { Box, Card, CardContent, Chip, Grid, Typography, alpha } from '@mui/material'
import { TrendingUp as TrendingUpIcon, TrendingDown as TrendingDownIcon } from '@mui/icons-material'
import { motion } from 'framer-motion'
import { formatValue, getSourceColor, getSourceLabel } from './utils'

export default function KPICard({ kpi, kpiKey, index = 0, theme }) {
  if (!kpi) return null

  const sourceColor = getSourceColor(kpi.source, theme)
  const sourceLabel = getSourceLabel(kpi.source)

  return (
    <Grid item xs={12} sm={6} md={3} key={kpiKey}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
      >
        <Card
          sx={{
            height: '100%',
            background: '#FFFFFF',
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              transform: 'translateY(-2px)',
            }
          }}
        >
          <CardContent sx={{ p: { xs: 2.5, sm: 3 }, overflow: 'visible' }}>
            {/* Source Label */}
            <Box display="flex" justifyContent="flex-end" mb={1}>
              <Chip
                label={sourceLabel}
                size="small"
                sx={{
                  bgcolor: alpha(sourceColor, 0.1),
                  color: sourceColor,
                  fontWeight: 600,
                  fontSize: '10px',
                  height: 20,
                  borderRadius: '4px',
                  border: `1px solid ${alpha(sourceColor, 0.2)}`
                }}
              />
            </Box>
            
            {/* KPI Label */}
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                fontSize: '0.75rem', 
                fontWeight: 500,
                display: 'block',
                mb: 0.5
              }}
            >
              {kpi.label}
            </Typography>
            
            {/* KPI Value */}
            <Typography 
              variant="h5" 
              fontWeight={700}
              sx={{ 
                fontSize: '1.5rem',
                letterSpacing: '-0.02em',
                mb: 1,
                color: 'text.primary',
              }}
            >
              {formatValue(kpi)}
            </Typography>
            
            {/* Change Indicator - Only show when positive or zero */}
            {sourceLabel !== 'Scrunch' && <Box
              sx={{
                minHeight: '24px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              {kpi.change !== undefined && kpi.change !== null && 
               !['impressions', 'clicks', 'ctr', 'influencer_reach', 'scrunch_engagement_rate', 'total_interactions', 'cost_per_engagement', 'all_keywords_ranking'].includes(kpiKey) &&
               kpi.format !== 'custom' && typeof kpi.change === 'number' &&
               kpi.change >= 0 && (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <TrendingUpIcon sx={{ fontSize: 14, color: '#34A853' }} />
                  <Typography 
                    variant="caption" 
                    sx={{ 
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      color: '#34A853'
                    }}
                  >
                    +{kpi.change.toFixed(1)}%
                  </Typography>
                </Box>
              )}
            </Box>}
            {/* Handle custom format KPIs with object change values - Only show when positive or zero */}
            {kpi.format === 'custom' && kpi.change && typeof kpi.change === 'object' && (
              <Box display="flex" flexDirection="column" gap={0.5} mt={0.5}>
                {kpiKey === 'competitive_benchmarking' && (
                  <>
                    {kpi.change.brand_visibility !== undefined && kpi.change.brand_visibility !== null && kpi.change.brand_visibility >= 0 && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <TrendingUpIcon sx={{ fontSize: 12, color: '#34A853' }} />
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#34A853' }}>
                          Brand: +{kpi.change.brand_visibility.toFixed(1)}%
                        </Typography>
                      </Box>
                    )}
                    {kpi.change.competitor_avg_visibility !== undefined && kpi.change.competitor_avg_visibility !== null && kpi.change.competitor_avg_visibility >= 0 && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <TrendingUpIcon sx={{ fontSize: 12, color: '#34A853' }} />
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#34A853' }}>
                          Competitor avg: +{kpi.change.competitor_avg_visibility.toFixed(1)}%
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
                {kpiKey === 'keyword_ranking_change_and_volume' && (
                  <>
                    {kpi.change.ranking_change !== undefined && kpi.change.ranking_change !== null && kpi.change.ranking_change >= 0 && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <TrendingUpIcon sx={{ fontSize: 12, color: '#34A853' }} />
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#34A853' }}>
                          Ranking change: +{kpi.change.ranking_change.toFixed(1)}%
                        </Typography>
                      </Box>
                    )}
                    {kpi.change.search_volume !== undefined && kpi.change.search_volume !== null && kpi.change.search_volume >= 0 && (
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <TrendingUpIcon sx={{ fontSize: 12, color: '#34A853' }} />
                        <Typography variant="caption" sx={{ fontSize: '0.7rem', color: '#34A853' }}>
                          Search volume: +{kpi.change.search_volume.toFixed(1)}%
                        </Typography>
                      </Box>
                    )}
                  </>
                )}
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Grid>
  )
}

