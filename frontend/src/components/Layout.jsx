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
  Business as BusinessIcon,
  People as PeopleIcon,
  Assessment as AssessmentIcon,
  Computer as ComputerIcon,
  Logout as LogoutIcon,
  AccountCircle as AccountCircleIcon,
  PersonAdd as PersonAddIcon,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'
import { Button, Menu, MenuItem } from '@mui/material'
import SyncStatusIndicator from './SyncStatusIndicator'

const drawerWidth = 240

const menuItems = [
  { text: 'Overview', icon: DashboardIcon, path: '/' },
  { text: 'Brands', icon: BusinessIcon, path: '/brands' },
  { text: 'Clients', icon: PeopleIcon, path: '/clients' },
  { text: 'Analytics', icon: AnalyticsIcon, path: '/analytics' },
  { text: 'Agency Analytics', icon: AnalyticsIcon, path: '/agency-analytics' },
  { text: 'Reporting Dashboard', icon: AssessmentIcon, path: '/reporting' },
  { text: 'Sync Data', icon: SyncIcon, path: '/sync' },
  { text: 'View Data', icon: StorageIcon, path: '/data' },
]

const itemVariants = {
  hidden: { x: -20, opacity: 0 },
  visible: (i) => ({
    x: 0,
    opacity: 1,
    transition: {
      delay: i * 0.05,
      type: 'spring',
      stiffness: 100,
      damping: 15
    }
  })
}

function Layout({ children }) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [anchorEl, setAnchorEl] = useState(null)
  const location = useLocation()
  const { user, signout } = useAuth()
  const navigate = useNavigate()

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget)
  }

  const handleMenuClose = () => {
    setAnchorEl(null)
  }

  const handleLogout = async () => {
    handleMenuClose()
    await signout()
    navigate('/login')
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        sx={{
          bgcolor: 'background.paper',
          borderBottom: `1px solid ${theme.palette.divider}`,
          minHeight: '64px !important',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Box 
          textAlign="center"
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Box
            component="img"
            src="https://kvrnlsosagpwiuqzifva.supabase.co/storage/v1/object/public/brand-logos/1631325584055.jpeg"
            alt="McRAE Analytics"
            sx={{
              maxHeight: 100,
              maxWidth: 200,
              height: 'auto',
              width: 'auto',
              objectFit: 'contain',
            }}
          />
        </Box>
      </Toolbar>
      
      <Divider sx={{ borderColor: theme.palette.divider }} />
      
      <Box sx={{ flex: 1, overflow: 'auto', py: 1.5 }}>
        <List sx={{ px: 1.5 }}>
          {menuItems.map((item, index) => {
            const isActive = location.pathname === item.path || 
                            (item.path === '/' && location.pathname === '/') ||
                            (item.path === '/brands' && location.pathname.startsWith('/brands')) ||
                            (item.path === '/clients' && location.pathname.startsWith('/clients')) ||
                            (item.path === '/agency-analytics' && location.pathname === '/agency-analytics') ||
                            (item.path === '/reporting' && location.pathname === '/reporting')
                                        const IconComponent = item.icon
            
            return (
              <ListItem 
                key={item.text} 
                disablePadding 
                sx={{ 
                  mb: 0.5,
                }}
                component={motion.div}
                custom={index}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
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
                    position: 'relative',
                    '&.Mui-selected': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.08),
                      color: theme.palette.primary.main,
                      '&:before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        width: '3px',
                        height: '60%',
                        backgroundColor: theme.palette.primary.main,
                        borderRadius: '0 2px 2px 0',
                      },
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      },
                      '& .MuiListItemIcon-root': {
                        color: theme.palette.primary.main,
                      },
                    },
                    '&:hover': {
                      backgroundColor: alpha(theme.palette.primary.main, 0.04),
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
                    <IconComponent sx={{ fontSize: 20 }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '0.875rem',
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
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          bgcolor: 'background.paper',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderBottom: `1px solid ${theme.palette.divider}`,
          color: 'text.primary',
          height: 64,
        }}
      >
        <Toolbar sx={{ height: 64, px: { xs: 2, md: 3 } }}>
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
              fontSize: '1rem',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              color: 'text.primary'
            }}
          >
            Website Analytics
          </Typography>
          
          {user && (
            <Box display="flex" alignItems="center" gap={1}>
              <Button
                onClick={handleMenuOpen}
                sx={{
                  color: 'text.primary',
                  textTransform: 'none',
                  borderRadius: 2,
                  px: 1.5,
                  py: 0.75,
                }}
                startIcon={<AccountCircleIcon />}
              >
                {user.email}
              </Button>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  sx: {
                    borderRadius: 2,
                    border: `1px solid ${theme.palette.divider}`,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    mt: 1,
                    minWidth: 200,
                  },
                }}
              >
                <MenuItem 
                  onClick={() => {
                    handleMenuClose()
                    navigate('/create-user')
                  }} 
                  sx={{ py: 1.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <PersonAddIcon fontSize="small" />
                  </ListItemIcon>
                  <Typography variant="body2">Create User</Typography>
                </MenuItem>
                <MenuItem onClick={handleLogout} sx={{ py: 1.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <LogoutIcon fontSize="small" />
                  </ListItemIcon>
                  <Typography variant="body2">Sign Out</Typography>
                </MenuItem>
              </Menu>
            </Box>
          )}
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
              borderRight: `1px solid ${theme.palette.divider}`,
              boxShadow: 'none',
              bgcolor: 'background.paper',
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
              borderRight: `1px solid ${theme.palette.divider}`,
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
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </Box>
      
      {/* Global sync status indicator */}
      <SyncStatusIndicator />
    </Box>
  )
}

export default Layout
