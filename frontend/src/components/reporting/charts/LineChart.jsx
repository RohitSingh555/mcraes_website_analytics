import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTheme, useMediaQuery } from '@mui/material'
import { CHART_COLORS, CHART_CONFIG } from '../constants'

/**
 * Enhanced Reusable Line Chart Component with responsive design
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of data objects
 * @param {string} props.title - Chart title
 * @param {number} props.height - Chart height (default: responsive)
 * @param {Array} props.lines - Array of {dataKey, name, color, strokeWidth, strokeDasharray} for lines
 * @param {Function} props.formatter - Custom tooltip formatter
 * @param {Function} props.labelFormatter - Custom tooltip label formatter
 * @param {Function} props.xAxisFormatter - X-axis label formatter
 * @param {string} props.dataKey - Key for X-axis data (default: 'date')
 */
export default function LineChart({
  data = [],
  title,
  height,
  lines = [],
  formatter,
  labelFormatter,
  xAxisFormatter,
  dataKey = 'date',
  margin,
  showGrid = true,
  showLegend = true,
  ...props
}) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const isTablet = useMediaQuery(theme.breakpoints.down('md'))
  
  // Responsive height
  const chartHeight = height || (isMobile ? CHART_CONFIG.heights.mobile : isTablet ? CHART_CONFIG.heights.tablet : CHART_CONFIG.heights.desktop)
  
  // Responsive margin - increased to prevent label clipping
  const chartMargin = margin || {
    top: 15,
    right: isMobile ? 15 : 40,
    left: isMobile ? 15 : 30,
    bottom: isMobile ? 50 : (data.length > 8 ? 60 : 40),
  }
  
  if (!data || data.length === 0) {
    return (
      <div style={{ 
        height: chartHeight, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <p style={{ 
          color: theme.palette.text.secondary,
          fontSize: isMobile ? '0.875rem' : '1rem'
        }}>
          No data available
        </p>
      </div>
    )
  }
  
  if (!lines || lines.length === 0) {
    return (
      <div style={{ 
        height: chartHeight, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <p style={{ 
          color: theme.palette.text.secondary,
          fontSize: isMobile ? '0.875rem' : '1rem'
        }}>
          No lines configured
        </p>
      </div>
    )
  }
  
  // Default formatter
  const defaultFormatter = (value, name) => {
    if (typeof value === 'number') {
      return [value.toLocaleString(), name || '']
    }
    return [value, name || '']
  }
  const tooltipFormatter = formatter || defaultFormatter
  
  // Default label formatter
  const defaultLabelFormatter = (label) => label || ''
  const tooltipLabelFormatter = labelFormatter || defaultLabelFormatter
  
  return (
    <ResponsiveContainer width="100%" height={chartHeight}>
      <RechartsLineChart data={data} margin={chartMargin} {...props}>
        {showGrid && (
          <CartesianGrid 
            strokeDasharray={CHART_CONFIG.grid.strokeDasharray} 
            stroke={CHART_CONFIG.grid.stroke}
            opacity={0.3}
          />
        )}
        <XAxis 
          dataKey={dataKey}
          tick={{ 
            fontSize: isMobile ? 10 : isTablet ? 11 : 12,
            fill: CHART_CONFIG.axis.stroke
          }}
          stroke={CHART_CONFIG.axis.stroke}
          tickFormatter={xAxisFormatter}
          angle={0}
          textAnchor="middle"
          height={50}
          interval="preserveStartEnd"
        />
        <YAxis 
          tick={{ 
            fontSize: isMobile ? 10 : isTablet ? 11 : 12,
            fill: CHART_CONFIG.axis.stroke
          }}
          stroke={CHART_CONFIG.axis.stroke}
          width={isMobile ? 50 : 60}
        />
        <Tooltip 
          contentStyle={CHART_CONFIG.tooltip}
          formatter={tooltipFormatter}
          labelFormatter={tooltipLabelFormatter}
          cursor={{ stroke: theme.palette.primary.main, strokeWidth: 1, strokeDasharray: '3 3' }}
        />
        {showLegend && (
          <Legend 
            wrapperStyle={{ 
              paddingTop: '15px',
              paddingBottom: '5px',
              fontSize: isMobile ? '0.75rem' : '0.875rem'
            }}
            iconType="line"
          />
        )}
        {lines.map((line, index) => (
          <Line
            key={line.dataKey || index}
            type={line.type || 'monotone'}
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color || CHART_COLORS.palette[index % CHART_COLORS.palette.length]}
            strokeWidth={line.strokeWidth || (isMobile ? 2 : 2.5)}
            strokeDasharray={line.strokeDasharray}
            dot={line.showDot !== false ? { 
              fill: line.color || CHART_COLORS.palette[index % CHART_COLORS.palette.length], 
              r: isMobile ? 3 : 4 
            } : false}
            activeDot={{ r: isMobile ? 5 : 6 }}
            connectNulls={line.connectNulls || false}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  )
}

