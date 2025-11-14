import { createTheme } from '@mui/material/styles'

// Apple-inspired premium theme - minimal, refined, aesthetic
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#007AFF', // Apple blue
      light: '#E3F2FD',
      dark: '#0051D5',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#5856D6', // Apple purple
      light: '#F3F4F9',
      dark: '#3634A3',
    },
    success: {
      main: '#34C759', // Apple green
      light: '#E8F5E9',
    },
    warning: {
      main: '#FF9500', // Apple orange
      light: '#FFF3E0',
    },
    error: {
      main: '#FF3B30', // Apple red
      light: '#FFEBEE',
    },
    info: {
      main: '#5AC8FA', // Apple light blue
      light: '#E0F7FA',
    },
    background: {
      default: '#F5F5F7', // Apple gray
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1D1D1F', // Apple dark gray
      secondary: '#6E6E73', // Apple medium gray
    },
    grey: {
      50: '#FAFAFA',
      100: '#F5F5F7',
      200: '#E5E5EA',
      300: '#D2D2D7',
      400: '#AEAEB2',
      500: '#8E8E93',
      600: '#6E6E73',
      700: '#48484A',
      800: '#1D1D1F',
    },
    divider: 'rgba(0, 0, 0, 0.06)',
  },
  typography: {
    fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", Helvetica, Arial, sans-serif',
    h1: {
      fontSize: '32px',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '-0.003em',
      color: '#1D1D1F',
    },
    h2: {
      fontSize: '28px',
      fontWeight: 600,
      lineHeight: 1.25,
      letterSpacing: '-0.002em',
      color: '#1D1D1F',
    },
    h3: {
      fontSize: '24px',
      fontWeight: 600,
      lineHeight: 1.3,
      letterSpacing: '-0.001em',
      color: '#1D1D1F',
    },
    h4: {
      fontSize: '20px',
      fontWeight: 600,
      lineHeight: 1.35,
      letterSpacing: 0,
      color: '#1D1D1F',
    },
    h5: {
      fontSize: '18px',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: 0,
      color: '#1D1D1F',
    },
    h6: {
      fontSize: '16px',
      fontWeight: 600,
      lineHeight: 1.4,
      letterSpacing: 0,
      color: '#1D1D1F',
    },
    subtitle1: {
      fontSize: '15px',
      fontWeight: 400,
      lineHeight: 1.47,
      letterSpacing: '-0.01em',
      color: '#1D1D1F',
    },
    subtitle2: {
      fontSize: '13px',
      fontWeight: 400,
      lineHeight: 1.38,
      letterSpacing: '-0.006em',
      color: '#6E6E73',
    },
    body1: {
      fontSize: '15px',
      fontWeight: 400,
      lineHeight: 1.47,
      letterSpacing: '-0.01em',
      color: '#1D1D1F',
    },
    body2: {
      fontSize: '13px',
      fontWeight: 400,
      lineHeight: 1.38,
      letterSpacing: '-0.006em',
      color: '#6E6E73',
    },
    button: {
      fontSize: '15px',
      fontWeight: 500,
      lineHeight: 1.47,
      letterSpacing: '-0.01em',
      textTransform: 'none',
    },
    caption: {
      fontSize: '12px',
      fontWeight: 400,
      lineHeight: 1.33,
      letterSpacing: '-0.004em',
      color: '#6E6E73',
    },
    overline: {
      fontSize: '10px',
      fontWeight: 600,
      lineHeight: 1.2,
      letterSpacing: '0.06em',
      textTransform: 'uppercase',
      color: '#6E6E73',
    },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    'none',
    '0 1px 2px rgba(0, 0, 0, 0.04)',
    '0 2px 4px rgba(0, 0, 0, 0.04)',
    '0 4px 8px rgba(0, 0, 0, 0.04)',
    '0 8px 16px rgba(0, 0, 0, 0.04)',
    '0 12px 24px rgba(0, 0, 0, 0.06)',
    ...Array(19).fill('none'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          WebkitFontSmoothing: 'antialiased',
          MozOsxFontSmoothing: 'grayscale',
          scrollBehavior: 'smooth',
        },
        '*': {
          boxSizing: 'border-box',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: 'none',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          padding: '8px 16px',
          fontSize: '15px',
          fontWeight: 500,
          textTransform: 'none',
          boxShadow: 'none',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0, 122, 255, 0.2)',
            transform: 'translateY(-1px)',
          },
        },
        contained: {
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
          '&:hover': {
            boxShadow: '0 2px 8px rgba(0, 122, 255, 0.25)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: 'none',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            fontSize: '15px',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#007AFF',
              },
            },
            '&.Mui-focused': {
              '& .MuiOutlinedInput-notchedOutline': {
                borderWidth: '1.5px',
                borderColor: '#007AFF',
              },
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontSize: '12px',
          fontWeight: 500,
          height: 24,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontSize: '15px',
          fontWeight: 500,
          minHeight: 48,
          padding: '10px 20px',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          height: 6,
          backgroundColor: '#F5F5F7',
        },
        bar: {
          borderRadius: 6,
        },
      },
    },
  },
})
