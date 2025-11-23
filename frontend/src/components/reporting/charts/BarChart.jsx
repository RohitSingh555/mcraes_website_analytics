import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTheme } from '@mui/material'

/**
 * Reusable Bar Chart Component
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of data objects
 * @param {string} props.dataKey - Key for data values
 * @param {string} props.title - Chart title
 * @param {number} props.height - Chart height (default: 300)
 * @param {boolean} props.horizontal - Horizontal bars (default: false)
 * @param {boolean} props.stacked - Stacked bars (default: false)
 * @param {Array} props.bars - Array of {dataKey, name, color} for multiple bars
 * @param {Function} props.formatter - Custom tooltip formatter
 * @param {Function} props.xAxisFormatter - X-axis label formatter
 */
export default function BarChart({
  data = [],
  dataKey,
  title,
  height = 300,
  horizontal = false,
  stacked = false,
  bars,
  formatter,
  xAxisFormatter,
  margin = { top: 5, right: 30, left: 20, bottom: 5 }
}) {
  const theme = useTheme()
  
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: theme.palette.text.secondary }}>No data available</p>
      </div>
    )
  }
  
  // Default formatter
  const defaultFormatter = (value) => [value.toLocaleString(), '']
  const tooltipFormatter = formatter || defaultFormatter
  
  // If multiple bars specified, use them; otherwise use single bar
  const barConfigs = bars || [{ dataKey, name: title || 'Value', color: theme.palette.primary.main }]
  
  return (
    <div>
      {title && (
        <h6 style={{ 
          marginBottom: 16, 
          fontSize: '1rem', 
          fontWeight: 600,
          color: theme.palette.text.primary 
        }}>
          {title}
        </h6>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart
          data={data}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={margin}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
          {horizontal ? (
            <>
              <XAxis type="number" tick={{ fontSize: 12 }} stroke="#71717A" />
              <YAxis 
                dataKey={dataKey} 
                type="category" 
                width={horizontal ? 120 : undefined}
                tick={{ fontSize: 11 }}
                stroke="#71717A"
              />
            </>
          ) : (
            <>
              <XAxis 
                dataKey={dataKey}
                tick={{ fontSize: 11 }}
                stroke="#71717A"
                angle={data.length > 6 ? -45 : 0}
                textAnchor={data.length > 6 ? "end" : "middle"}
                height={data.length > 6 ? 80 : undefined}
              />
              <YAxis tick={{ fontSize: 12 }} stroke="#71717A" />
            </>
          )}
          <Tooltip 
            contentStyle={{ 
              borderRadius: '8px', 
              border: 'none', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              backgroundColor: '#FFFFFF'
            }}
            formatter={tooltipFormatter}
          />
          <Legend wrapperStyle={{ paddingTop: '10px' }} />
          {barConfigs.map((bar, index) => (
            <Bar
              key={bar.dataKey}
              dataKey={bar.dataKey}
              name={bar.name}
              fill={bar.color}
              stackId={stacked ? "a" : undefined}
              radius={index === barConfigs.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  )
}

