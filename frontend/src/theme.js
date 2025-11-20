import { createTheme } from '@mui/material/styles'
import { alpha } from '@mui/material/styles'

// Modern Minimalist Theme (Shadcn/ui inspired)
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#0f172a', // Slate 900
      light: '#334155', // Slate 700
      dark: '#020617', // Slate 950
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#64748b', // Slate 500
      light: '#94a3b8', // Slate 400
      dark: '#475569', // Slate 600
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
      primary: '#0f172a', // Slate 900
      secondary: '#64748b', // Slate 500
      disabled: '#94a3b8', // Slate 400
    },
    divider: '#e2e8f0', // Slate 200
    action: {
      hover: '#f1f5f9', // Slate 100
      selected: '#e2e8f0', // Slate 200
    },
  },
  typography: {
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
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
      color: '#64748b',
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      color: '#64748b',
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
          color: '#0f172a',
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
          backgroundColor: '#0f172a',
          color: '#ffffff',
          '&:hover': {
            backgroundColor: '#1e293b',
          },
        },
        outlined: {
          borderColor: '#e2e8f0',
          color: '#0f172a',
          '&:hover': {
            backgroundColor: '#f1f5f9',
            borderColor: '#cbd5e1',
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
          color: '#64748b',
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
        outlined: {
          borderColor: '#e2e8f0',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0',
          boxShadow: 'none',
          color: '#0f172a',
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
            backgroundColor: '#f1f5f9',
            color: '#0f172a',
            '&:hover': {
              backgroundColor: '#e2e8f0',
            },
            '& .MuiListItemIcon-root': {
              color: '#0f172a',
            },
          },
          '&:hover': {
            backgroundColor: '#f8fafc',
          },
        },
      },
    },
    MuiListItemIcon: {
      styleOverrides: {
        root: {
          minWidth: 32,
          color: '#64748b',
        },
      },
    },
  },
})
