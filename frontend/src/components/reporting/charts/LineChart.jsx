import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { useTheme } from '@mui/material'

/**
 * Reusable Line Chart Component
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of data objects
 * @param {string} props.title - Chart title
 * @param {number} props.height - Chart height (default: 300)
 * @param {Array} props.lines - Array of {dataKey, name, color, strokeWidth} for lines
 * @param {Function} props.formatter - Custom tooltip formatter
 * @param {Function} props.xAxisFormatter - X-axis label formatter
 */
export default function LineChart({
  data = [],
  title,
  height = 300,
  lines,
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
        <RechartsLineChart data={data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
          <XAxis 
            dataKey="date" 
            tick={{ fontSize: 12 }}
            stroke="#71717A"
            tickFormatter={xAxisFormatter}
          />
          <YAxis 
            tick={{ fontSize: 12 }}
            stroke="#71717A"
          />
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
          {lines.map((line, index) => (
            <Line
              key={line.dataKey}
              type="monotone"
              dataKey={line.dataKey}
              name={line.name}
              stroke={line.color || theme.palette.primary.main}
              strokeWidth={line.strokeWidth || 2}
              dot={{ fill: line.color || theme.palette.primary.main, r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  )
}

