import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useTheme, useMediaQuery, Box, Typography } from '@mui/material'
import { CHART_COLORS, CHART_CONFIG } from '../constants'

/**
 * Enhanced Reusable Pie/Donut Chart Component with responsive design
 * Features 70/30 split layout: Chart (70%) | Legend (30%)
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of {name: string, value: number} objects
 * @param {string} props.title - Chart title
 * @param {number} props.height - Chart height (default: responsive)
 * @param {boolean} props.showLegend - Show legend (default: true)
 * @param {boolean} props.donut - Show as donut chart (default: false)
 * @param {number} props.innerRadius - Inner radius for donut (default: 60)
 * @param {number} props.outerRadius - Outer radius (default: responsive)
 * @param {Array} props.colors - Custom color array
 * @param {Function} props.formatter - Custom tooltip formatter
 * @param {Function} props.labelFormatter - Custom label formatter
 * @param {boolean} props.showLabel - Show labels on slices (default: false)
 */
export default function PieChart({
  data = [],
  title,
  height,
  showLegend = true,
  donut = false,
  innerRadius,
  outerRadius,
  colors,
  formatter,
  labelFormatter,
  showLabel = false,
  ...props
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.down('md'))
  
  // Responsive height
  const chartHeight = height || (isMobile ? CHART_CONFIG.heights.mobile : isTablet ? CHART_CONFIG.heights.tablet : CHART_CONFIG.heights.desktop)
  
  // Use provided colors or default palette
  const chartColors = colors || CHART_COLORS.palette
  
  // Responsive radius - adjusted for 70% width
  const defaultOuterRadius = isMobile ? 60 : isTablet ? 75 : 90
  const defaultInnerRadius = donut ? (innerRadius || (isMobile ? 35 : isTablet ? 45 : 55)) : 0
  
  // Default formatter
  const defaultFormatter = (value, name) => {
    const total = data.reduce((sum, item) => sum + (item.value || 0), 0)
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
    return [`${value.toLocaleString()} (${percentage}%)`, name]
  }
  
  const tooltipFormatter = formatter || defaultFormatter
  
  if (!data || data.length === 0) {
    return (
      <Box sx={{ 
        height: chartHeight, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        width: '100%'
      }}>
        <Typography 
          variant="body2"
          sx={{ 
            color: theme.palette.text.secondary,
            fontSize: isMobile ? '0.875rem' : '1rem'
          }}
        >
          No data available
        </Typography>
      </Box>
    )
  }
  
  // Calculate responsive right margin for 30% legend space
  // This ensures the chart uses 70% and legend uses 30% of available width
  const calculateRightMargin = () => {
    // For a 70/30 split, we need approximately 30% of container width as right margin
    // Using a responsive calculation based on typical container widths
    if (isMobile) {
      return 80 // Smaller margin for mobile
    } else if (isTablet) {
      return 120 // Medium margin for tablet
    } else {
      return 160 // Larger margin for desktop (30% of ~533px = ~160px)
    }
  }
  
  const rightMargin = calculateRightMargin()
  
  return (
    <Box 
      sx={{ 
        width: '100%', 
        height: chartHeight,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'visible',
        padding: { xs: 1, sm: 1.5, md: 2 }
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <RechartsPieChart 
          margin={{
            top: 10,
            right: 0,
            bottom: 10,
            left: 30
          }}
          {...props}
        >
          <Pie
            data={data}
            cx="35%"
            cy="50%"
            labelLine={false}
            label={false}
            outerRadius={outerRadius || defaultOuterRadius}
            innerRadius={defaultInnerRadius}
            fill={CHART_COLORS.primary}
            dataKey="value"
            paddingAngle={2}
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={chartColors[index % chartColors.length]}
                stroke="#FFFFFF"
                strokeWidth={2}
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={CHART_CONFIG.tooltip}
            formatter={tooltipFormatter}
          />
          {showLegend && (
            <Legend 
              wrapperStyle={{ 
                paddingLeft: '10px',
                paddingRight: '10px',
                fontSize: isMobile ? '0.7rem' : isTablet ? '0.75rem' : '0.875rem',
                lineHeight: 1.5
              }}
              layout="vertical"
              verticalAlign="middle"
              align="right"
              formatter={(value) => {
                const maxLength = isMobile ? 12 : isTablet ? 18 : 25
                return value.length > maxLength ? value.substring(0, maxLength) + '...' : value
              }}
              iconType="circle"
              iconSize={isMobile ? 8 : 10}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </Box>
  )
}
