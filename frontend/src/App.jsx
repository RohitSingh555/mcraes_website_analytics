import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import { SyncStatusProvider } from './contexts/SyncStatusContext'
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
import { theme } from './theme'
import './App.css'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
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
                        <Layout>
                          <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/brands" element={<BrandsList />} />
                            <Route path="/brands/:id" element={<BrandAnalyticsDetailWrapper />} />
                            <Route path="/clients" element={<ClientsList />} />
                            {/* <Route path="/analytics" element={<BrandAnalytics />} /> */}
                            <Route path="/agency-analytics" element={<AgencyAnalytics />} />
                            <Route path="/sync" element={<SyncPanel />} />
                            <Route path="/data" element={<DataView />} />
                            <Route path="/reporting" element={<ReportingDashboard />} />
                            <Route path="/create-user" element={<CreateUser />} />
                          </Routes>
                        </Layout>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </Router>
            </SyncStatusProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}

export default App
