import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { useTheme, alpha } from '@mui/material'

/**
 * Reusable Pie Chart Component
 * 
 * @param {Object} props
 * @param {Array} props.data - Array of {name: string, value: number} objects
 * @param {string} props.title - Chart title
 * @param {number} props.height - Chart height (default: 300)
 * @param {boolean} props.showLegend - Show legend (default: true)
 * @param {boolean} props.donut - Show as donut chart (default: false)
 * @param {number} props.innerRadius - Inner radius for donut (default: 0)
 * @param {Array} props.colors - Custom color array
 * @param {Function} props.formatter - Custom tooltip formatter
 */
export default function PieChart({
  data = [],
  title,
  height = 300,
  showLegend = true,
  donut = false,
  innerRadius = 0,
  colors,
  formatter
}) {
  const theme = useTheme()
  
  // Default color palette
  const defaultColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
  ]
  
  const chartColors = colors || defaultColors
  
  // Default formatter
  const defaultFormatter = (value, name) => {
    const total = data.reduce((sum, item) => sum + item.value, 0)
    const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0
    return [`${value.toLocaleString()} (${percentage}%)`, name]
  }
  
  const tooltipFormatter = formatter || defaultFormatter
  
  if (!data || data.length === 0) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: theme.palette.text.secondary }}>No data available</p>
      </div>
    )
  }
  
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
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={donut ? 100 : undefined}
            innerRadius={donut ? innerRadius || 60 : 0}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={chartColors[index % chartColors.length]} 
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ 
              borderRadius: '8px', 
              border: 'none', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              backgroundColor: '#FFFFFF'
            }}
            formatter={tooltipFormatter}
          />
          {showLegend && (
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  )
}

