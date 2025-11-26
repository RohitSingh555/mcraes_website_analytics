// Color palette for charts - modern, accessible colors
export const CHART_COLORS = {
  primary: '#1e77b9', // McRAE Primary Blue
  secondary: '#f4af46', // McRAE Secondary Orange
  success: '#10b981', // Emerald 500
  warning: '#f59e0b', // Amber 500
  error: '#ef4444', // Red 500
  info: '#3b82f6', // Blue 500
  
  // Extended palette for multiple series
  // First two colors are primary and secondary for two-data-point charts
  palette: [
    '#1e77b9', // McRAE Primary Blue - Primary
    '#f4af46', // McRAE Secondary Orange - Secondary
    '#3b82f6', // Blue 500
    '#10b981', // Emerald 500
    '#f59e0b', // Amber 500
    '#ef4444', // Red 500
    '#8b5cf6', // Violet 500
    '#ec4899', // Pink 500
    '#06b6d4', // Cyan 500
    '#84cc16', // Lime 500
    '#f97316', // Orange 500
  ],
  
  // GA4 specific colors
  ga4: {
    primary: '#4285F4', // Google Blue
    secondary: '#34A853', // Google Green
    accent: '#FBBC04', // Google Yellow
    error: '#EA4335', // Google Red
  },
  
  // AgencyAnalytics colors
  agencyAnalytics: {
    primary: '#34A853', // Green
    secondary: '#10b981', // Emerald
  },
  
  // Scrunch colors
  scrunch: {
    primary: '#FBBC04', // Yellow
    secondary: '#f59e0b', // Amber
  },
  
  // Comparison chart colors (for two-data-point charts like current vs previous)
  comparison: {
    current: '#1e77b9', // Current period - McRAE Primary Blue
    previous: '#f4af46', // Previous period - McRAE Secondary Orange
  },
}

// Chart configuration constants
export const CHART_CONFIG = {
  // Responsive heights based on breakpoints
  heights: {
    mobile: 250,
    tablet: 300,
    desktop: 400,
  },
  
  // Animation delays for staggered animations
  animation: {
    delay: 0.1,
    duration: 0.3,
  },
  
  // Tooltip styling
  tooltip: {
    borderRadius: 8,
    border: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    backgroundColor: '#FFFFFF',
  },
  
  // Grid styling
  grid: {
    stroke: '#E4E4E7',
    strokeDasharray: '3 3',
  },
  
  // Axis styling
  axis: {
    stroke: '#71717A',
    fontSize: { mobile: 10, tablet: 11, desktop: 12 },
  },
}
