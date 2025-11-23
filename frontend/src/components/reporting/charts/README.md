# Reusable Chart Components

This directory contains reusable chart components built on top of Recharts, following React best practices.

## Components

### PieChart
Reusable pie/donut chart component.

**Props:**
- `data` (Array): Array of `{name: string, value: number}` objects
- `title` (string, optional): Chart title
- `height` (number, default: 300): Chart height
- `showLegend` (boolean, default: true): Show legend
- `donut` (boolean, default: false): Show as donut chart
- `innerRadius` (number, default: 0): Inner radius for donut
- `colors` (Array, optional): Custom color array
- `formatter` (Function, optional): Custom tooltip formatter

**Example:**
```jsx
import PieChart from './charts/PieChart'

<PieChart
  data={[
    { name: 'Top', value: 44 },
    { name: 'Middle', value: 45 },
    { name: 'Bottom', value: 11 }
  ]}
  title="Position Distribution"
  height={300}
  donut={true}
  innerRadius={60}
/>
```

### BarChart
Reusable bar chart component supporting horizontal/vertical orientation.

**Props:**
- `data` (Array): Array of data objects
- `dataKey` (string): Key for data values
- `title` (string, optional): Chart title
- `height` (number, default: 300): Chart height
- `horizontal` (boolean, default: false): Horizontal bars
- `stacked` (boolean, default: false): Stacked bars
- `bars` (Array): Array of `{dataKey, name, color}` for multiple bars
- `formatter` (Function, optional): Custom tooltip formatter
- `xAxisFormatter` (Function, optional): X-axis label formatter

**Example:**
```jsx
import BarChart from './charts/BarChart'

<BarChart
  data={competitors}
  dataKey="name"
  title="Competitive Presence"
  height={400}
  horizontal={true}
  bars={[{
    dataKey: 'presence',
    name: 'Presence %',
    color: theme.palette.primary.main
  }]}
/>
```

### LineChart
Reusable line chart component for time series data.

**Props:**
- `data` (Array): Array of data objects
- `title` (string, optional): Chart title
- `height` (number, default: 300): Chart height
- `lines` (Array): Array of `{dataKey, name, color, strokeWidth}` for lines
- `formatter` (Function, optional): Custom tooltip formatter
- `xAxisFormatter` (Function, optional): X-axis label formatter

**Example:**
```jsx
import LineChart from './charts/LineChart'

<LineChart
  data={timeSeriesData}
  title="Brand Presence Trend"
  height={400}
  lines={[{
    dataKey: 'presence',
    name: 'Brand Presence %',
    color: theme.palette.primary.main,
    strokeWidth: 3
  }]}
/>
```

### ScrunchVisualizations
Complete visualization component that fetches and displays Query API data.

**Props:**
- `brandId` (number, required): Brand ID
- `startDate` (string, optional): Start date (YYYY-MM-DD)
- `endDate` (string, optional): End date (YYYY-MM-DD)

**Displays:**
1. Position Distribution (Pie)
2. Platform Distribution (Pie)
3. Sentiment Distribution (Pie)
4. Citation Source Breakdown (Pie)
5. Competitive Presence (Bar)
6. Time Series Trends (Line)

**Example:**
```jsx
import ScrunchVisualizations from './charts/ScrunchVisualizations'

<ScrunchVisualizations
  brandId={selectedBrandId}
  startDate="2024-01-01"
  endDate="2024-01-31"
/>
```

## Best Practices

1. **Always handle empty data**: Components show "No data available" message
2. **Use theme colors**: Components automatically use Material-UI theme
3. **Customize formatters**: Use formatter props for custom tooltip formatting
4. **Responsive design**: All charts are responsive via ResponsiveContainer

## File Sizes

All components are kept under 500 LOC:
- PieChart.jsx: ~110 LOC ✅
- BarChart.jsx: ~115 LOC ✅
- LineChart.jsx: ~90 LOC ✅
- ScrunchVisualizations.jsx: ~423 LOC ✅

