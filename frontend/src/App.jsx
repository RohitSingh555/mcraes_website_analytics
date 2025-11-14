import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import Layout from './components/Layout'
import Dashboard from './components/Dashboard'
import BrandsList from './components/BrandsList'
import BrandAnalytics from './components/BrandAnalytics'
import BrandAnalyticsDetailWrapper from './components/BrandAnalyticsDetailWrapper'
import SyncPanel from './components/SyncPanel'
import DataView from './components/DataView'
import AgencyAnalytics from './components/AgencyAnalytics'
import { theme } from './theme'
import './App.css'

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/brands" element={<BrandsList />} />
            <Route path="/brands/:id" element={<BrandAnalyticsDetailWrapper />} />
            <Route path="/analytics" element={<BrandAnalytics />} />
            <Route path="/agency-analytics" element={<AgencyAnalytics />} />
            <Route path="/sync" element={<SyncPanel />} />
            <Route path="/data" element={<DataView />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  )
}

export default App
