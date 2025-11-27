import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { SyncStatusProvider } from './contexts/SyncStatusContext'
import { WebSocketProvider } from './contexts/WebSocketContext'
import { queryClient } from './lib/queryClient'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Dashboard from './components/Dashboard'
import BrandsList from './components/BrandsList'
import ClientsList from './components/ClientsList'
import BrandAnalytics from './components/BrandAnalytics'
import BrandAnalyticsDetailWrapper from './components/BrandAnalyticsDetailWrapper'
import SyncPanel from './components/SyncPanel'
import DataView from './components/DataView'
import AgencyAnalytics from './components/AgencyAnalytics'
import ReportingDashboard from './components/ReportingDashboard'
import PublicReportingDashboard from './components/PublicReportingDashboard'
import Login from './components/Login'
import CreateUser from './components/CreateUser'
import NotFound from './components/NotFound'
import { theme } from './theme'
import './App.css'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <WebSocketProvider>
            <ToastProvider>
              <SyncStatusProvider>
                <Router>
                <Routes>
                  {/* Public routes (no authentication required) */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/reporting/client/:slug" element={<PublicReportingDashboard />} />
                  
                  {/* Protected routes (require authentication) */}
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <Routes>
                          <Route path="/" element={<Layout><Dashboard /></Layout>} />
                          <Route path="/brands" element={<Layout><BrandsList /></Layout>} />
                          <Route path="/brands/:id" element={<Layout><BrandAnalyticsDetailWrapper /></Layout>} />
                          <Route path="/clients" element={<Layout><ClientsList /></Layout>} />
                          {/* <Route path="/analytics" element={<Layout><BrandAnalytics /></Layout>} /> */}
                          <Route path="/agency-analytics" element={<Layout><AgencyAnalytics /></Layout>} />
                          <Route path="/sync" element={<Layout><SyncPanel /></Layout>} />
                          <Route path="/data" element={<Layout><DataView /></Layout>} />
                          <Route path="/reporting" element={<Layout><ReportingDashboard /></Layout>} />
                          <Route path="/create-user" element={<Layout><CreateUser /></Layout>} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Router>
            </SyncStatusProvider>
          </ToastProvider>
          </WebSocketProvider>
        </AuthProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}

export default App
