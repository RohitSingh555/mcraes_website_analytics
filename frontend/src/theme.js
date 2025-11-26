import { createTheme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'

// Modern Minimalist Theme (Shadcn/ui inspired)
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1e77b9', // McRAE Primary Blue
      light: alpha('#1e77b9', 0.7),
      dark: alpha('#1e77b9', 0.9),
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f4af46', // McRAE Secondary Orange
      light: alpha('#f4af46', 0.7),
      dark: alpha('#f4af46', 0.9),
      contrastText: '#ffffff',
    },
    success: {
      main: '#10b981', // Emerald 500
      light: '#d1fae5', // Emerald 100
      dark: '#059669', // Emerald 600
    },
    warning: {
      main: '#f59e0b', // Amber 500
      light: '#fef3c7', // Amber 100
      dark: '#d97706', // Amber 600
    },
    error: {
      main: '#ef4444', // Red 500
      light: '#fee2e2', // Red 100
      dark: '#dc2626', // Red 600
    },
    info: {
      main: '#3b82f6', // Blue 500
      light: '#dbeafe', // Blue 100
      dark: '#2563eb', // Blue 600
    },
    background: {
      default: '#f8fafc', // Slate 50
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b', // Dark blue-gray for readability, aligned with primary theme
      secondary: alpha('#1e77b9', 0.7), // Mix of primary and secondary for balanced secondary text
      disabled: '#94a3b8', // Slate 400
    },
    divider: '#e2e8f0', // Slate 200
    action: {
      hover: alpha('#f4af46', 0.08), // Use secondary color for hover backgrounds
      selected: alpha('#1e77b9', 0.1), // Use primary color for selected backgrounds
      hoverOpacity: 0.08,
      selectedOpacity: 0.1,
    },
  },
  typography: {
    fontFamily: '"Inter", "Inter var", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      letterSpacing: '-0.02em',
      lineHeight: 1.2,
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600,
      letterSpacing: '-0.01em',
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      color: alpha('#f4af46', 0.8), // Use secondary color for subtitles
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      color: alpha('#f4af46', 0.8), // Use secondary color for subtitles
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8, // 0.5rem
  },
  shadows: [
    'none',
    '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    ...Array(19).fill('none'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f8fafc',
          color: '#1e293b', // Updated to match text.primary
          fontFamily: '"Inter", "Inter var", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          borderRadius: 8,
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          fontSize: '0.875rem',
          padding: '8px 16px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: '#1e77b9',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: alpha('#1e77b9', 0.9),
          },
        },
        containedSecondary: {
          backgroundColor: '#f4af46',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: alpha('#f4af46', 0.9),
          },
        },
        outlined: {
          borderColor: '#e2e8f0',
          color: '#1e293b', // Updated to match text.primary
          '&:hover': {
            backgroundColor: alpha('#f4af46', 0.08), // Use secondary color for hover
            borderColor: alpha('#f4af46', 0.3),
          },
        },
        textPrimary: {
          color: '#1e77b9',
          '&:hover': {
            backgroundColor: alpha('#1e77b9', 0.08),
          },
        },
        textSecondary: {
          color: '#f4af46',
          '&:hover': {
            backgroundColor: alpha('#f4af46', 0.08),
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        elevation1: {
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #e2e8f0',
          padding: '16px',
        },
        head: {
          backgroundColor: '#f8fafc',
          color: alpha('#f4af46', 0.8), // Use secondary color for table headers
          fontWeight: 600,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
        filled: {
          border: '1px solid transparent',
        },
        filledPrimary: {
          backgroundColor: alpha('#1e77b9', 0.1),
          color: '#1e77b9',
          border: `1px solid ${alpha('#1e77b9', 0.2)}`,
        },
        filledSecondary: {
          backgroundColor: alpha('#f4af46', 0.1),
          color: '#f4af46',
          border: `1px solid ${alpha('#f4af46', 0.2)}`,
        },
        outlined: {
          borderColor: '#e2e8f0',
        },
        outlinedPrimary: {
          borderColor: alpha('#1e77b9', 0.3),
          color: '#1e77b9',
        },
        outlinedSecondary: {
          borderColor: alpha('#f4af46', 0.3),
          color: '#f4af46',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: 'none',
          color: '#1e293b', // Updated to match text.primary
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e2e8f0',
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          margin: '4px 8px',
          padding: '8px 12px',
          '&.Mui-selected': {
            backgroundColor: alpha('#1e77b9', 0.1), // Use primary color for selected state
            color: '#1e77b9', // Use primary color for selected text
            '&:hover': {
              backgroundColor: alpha('#1e77b9', 0.15),
            },
            '& .MuiListItemIcon-root': {
              color: '#1e77b9', // Use primary color for selected icons
            },
          },
          '&:hover': {
            backgroundColor: alpha('#f4af46', 0.08), // Use secondary color for hover
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 32,
          color: alpha('#f4af46', 0.7), // Use secondary color for icons
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: '#1e77b9', // Use primary color for links
          textDecoration: 'none',
          '&:hover': {
            color: '#f4af46', // Use secondary color on hover
            textDecoration: 'underline',
          },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          '&.Mui-selected': {
            color: '#1e77b9', // Use primary color for selected tab
          },
          '&:hover': {
            color: '#f4af46', // Use secondary color on hover
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          backgroundColor: '#1e77b9', // Use primary color for tab indicator
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: '#1e77b9', // Use primary color for checked switch
            '& + .MuiSwitch-track': {
              backgroundColor: '#1e77b9',
            },
          },
        },
        track: {
          backgroundColor: alpha('#f4af46', 0.3), // Use secondary color for track
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          '&.Mui-checked': {
            color: '#1e77b9', // Use primary color for checked checkbox
          },
          '&.Mui-indeterminate': {
            color: '#f4af46', // Use secondary color for indeterminate
          },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          '&.Mui-checked': {
            color: '#1e77b9', // Use primary color for checked radio
          },
        },
      },
    },
    MuiSlider: {
      styleOverrides: {
        thumb: {
          '&:hover': {
            boxShadow: `0 0 0 8px ${alpha('#f4af46', 0.16)}`, // Use secondary color for hover
          },
          '&.Mui-active': {
            boxShadow: `0 0 0 14px ${alpha('#f4af46', 0.16)}`,
          },
        },
        track: {
          backgroundColor: '#1e77b9', // Use primary color for track
        },
        rail: {
          backgroundColor: alpha('#f4af46', 0.2), // Use secondary color for rail
        },
      },
    },
    MuiProgress: {
      styleOverrides: {
        bar: {
          backgroundColor: '#1e77b9', // Use primary color for progress bar
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        bar: {
          backgroundColor: '#1e77b9', // Use primary color for linear progress
        },
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        circle: {
          stroke: '#1e77b9', // Use primary color for circular progress
        },
      },
    },
  },
})
