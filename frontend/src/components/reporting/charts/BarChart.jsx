import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTheme, useMediaQuery } from '@mui/material'
import { CHART_COLORS, CHART_CONFIG } from '../constants'

/**
 * Enhanced Reusable Bar Chart Component with responsive design
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of data objects
 * @param {string} props.dataKey - Key for X-axis category
 * @param {string} props.title - Chart title
 * @param {number} props.height - Chart height (default: responsive)
 * @param {boolean} props.horizontal - Horizontal bars (default: false)
 * @param {boolean} props.stacked - Stacked bars (default: false)
 * @param {Array} props.bars - Array of {dataKey, name, color} for multiple bars
 * @param {Function} props.formatter - Custom tooltip formatter
 * @param {Function} props.labelFormatter - Custom tooltip label formatter
 * @param {Function} props.xAxisFormatter - X-axis label formatter
 * @param {boolean} props.showGrid - Show grid (default: true)
 * @param {boolean} props.showLegend - Show legend (default: true)
 */
export default function BarChart({
  data = [],
  dataKey,
  title,
  height,
  horizontal = false,
  stacked = false,
  bars,
  formatter,
  labelFormatter,
  xAxisFormatter,
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
    left: horizontal ? (isMobile ? 100 : 150) : (isMobile ? 15 : 30),
    bottom: horizontal ? 10 : (isMobile ? 70 : 60),
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
  
  // If multiple bars specified, use them; otherwise use single bar
  const barConfigs = bars || (dataKey ? [{ 
    dataKey: dataKey, 
    name: title || 'Value', 
    color: CHART_COLORS.primary 
  }] : [])
  
  if (!barConfigs || barConfigs.length === 0) {
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
          No bars configured
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
      <RechartsBarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={chartMargin}
        {...props}
      >
        {showGrid && (
          <CartesianGrid 
            strokeDasharray={CHART_CONFIG.grid.strokeDasharray} 
            stroke={CHART_CONFIG.grid.stroke}
            opacity={0.3}
          />
        )}
        {horizontal ? (
          <>
            <XAxis 
              type="number" 
              tick={{ 
                fontSize: isMobile ? 10 : isTablet ? 11 : 12,
                fill: CHART_CONFIG.axis.stroke
              }} 
              stroke={CHART_CONFIG.axis.stroke}
            />
            <YAxis 
              dataKey={dataKey}
              type="category" 
              width={isMobile ? 100 : 150}
              tick={{ 
                fontSize: isMobile ? 10 : 11,
                fill: CHART_CONFIG.axis.stroke
              }}
              stroke={CHART_CONFIG.axis.stroke}
            />
          </>
        ) : (
          <>
            <XAxis 
              dataKey={dataKey}
              tick={{ 
                fontSize: isMobile ? 9 : isTablet ? 10 : 11,
                fill: CHART_CONFIG.axis.stroke
              }}
              stroke={CHART_CONFIG.axis.stroke}
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
              width={isMobile ? 40 : undefined}
            />
          </>
        )}
        <Tooltip 
          contentStyle={CHART_CONFIG.tooltip}
          formatter={tooltipFormatter}
          labelFormatter={tooltipLabelFormatter}
          cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }}
        />
        {showLegend && (
          <Legend 
            wrapperStyle={{ 
              paddingTop: '15px',
              paddingBottom: '5px',
              fontSize: isMobile ? '0.75rem' : '0.875rem'
            }}
            iconType="rect"
          />
        )}
        {barConfigs.map((bar, index) => (
          <Bar
            key={bar.dataKey || index}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color || CHART_COLORS.palette[index % CHART_COLORS.palette.length]}
            stackId={stacked ? "a" : undefined}
            radius={horizontal 
              ? (index === barConfigs.length - 1 ? [0, 4, 4, 0] : [0, 0, 0, 0])
              : (index === barConfigs.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0])
            }
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  )
}

