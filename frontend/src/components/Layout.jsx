import { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  CssBaseline,
  useTheme,
  useMediaQuery,
  alpha
} from '@mui/material'
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Sync as SyncIcon,
  Analytics as AnalyticsIcon,
  Storage as StorageIcon,
  Business as BusinessIcon
} from '@mui/icons-material'

const drawerWidth = 240

const menuItems = [
  { text: 'Overview', icon: <DashboardIcon />, path: '/' },
  { text: 'Brands', icon: <BusinessIcon />, path: '/brands' },
  { text: 'Analytics', icon: <AnalyticsIcon />, path: '/analytics' },
  { text: 'Sync Data', icon: <SyncIcon />, path: '/sync' },
  { text: 'View Data', icon: <StorageIcon />, path: '/data' },
]

function Layout({ children }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        sx={{
          background: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
          color: 'white',
          minHeight: '64px !important',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Box textAlign="center">
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 600, 
              fontSize: '18px',
              letterSpacing: '-0.01em',
              mb: 0.25
            }}
          >
            McRAE Analytics
          </Typography>
        </Box>
      </Toolbar>
      
      <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.5) }} />
      
      <Box sx={{ flex: 1, overflow: 'auto', py: 1.5 }}>
        <List sx={{ px: 1.5 }}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path || 
                            (item.path === '/' && location.pathname === '/') ||
                            (item.path === '/brands' && location.pathname.startsWith('/brands'))
            return (
              <ListItem 
                key={item.text} 
                disablePadding 
                sx={{ 
                  mb: 0.5,
                }}
              >
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={isActive}
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    px: 2,
                    minHeight: 40,
                    textDecoration: 'none',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&.Mui-selected': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      color: theme.palette.primary.main,
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.16),
                      },
                      '& .MuiListItemIcon-root': {
                        color: theme.palette.primary.main,
                      },
                    },
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.action.hover, 0.5),
                      transform: 'translateX(2px)',
                    },
                  }}
                  onClick={() => {
                    if (isMobile) {
                      setMobileOpen(false)
                    }
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: isActive ? theme.palette.primary.main : theme.palette.text.secondary,
                      minWidth: 36,
                      transition: 'color 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '14px',
                      fontWeight: isActive ? 600 : 500,
                      letterSpacing: '-0.01em',
                    }}
                  />
                </ListItemButton>
              </ListItem>
            )
          })}
        </List>
      </Box>
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#F5F5F7' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
          color: 'text.primary',
          height: 56,
        }}
      >
        <Toolbar sx={{ height: 56, px: { xs: 2, md: 3 } }}>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 1.5, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography 
            variant="h6" 
            noWrap 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontSize: '16px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: '#1D1D1F'
            }}
          >
            Website Analytics
          </Typography>
        </Toolbar>
      </AppBar>
      
      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: 'none',
              boxShadow: '2px 0 16px rgba(0, 0, 0, 0.06)',
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              borderRight: '1px solid rgba(0, 0, 0, 0.06)',
              boxShadow: 'none',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 2.5, md: 3 },
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '56px',
          minHeight: 'calc(100vh - 56px)',
        }}
      >
        {children}
      </Box>
    </Box>
  )
}

export default Layout
