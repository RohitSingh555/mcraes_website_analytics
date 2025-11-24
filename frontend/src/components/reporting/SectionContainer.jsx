import { Box, Typography, CircularProgress, alpha, useTheme } from '@mui/material'

/**
 * Reusable Section Container Component
 * Provides consistent section layout with title, description, and loading states
 */
export default function SectionContainer({
  title,
  description,
  loading,
  error,
  children,
  sx = {},
  titleSx = {},
  descriptionSx = {},
  ...props
}) {
  const theme = useTheme()

  return (
    <Box
      sx={{
        mb: { xs: 4, md: 5 },
        ...sx,
      }}
      {...props}
    >
      {title && (
        <Typography
          variant="h1"
          fontWeight={700}
          sx={{
            mb: description ? 1 : 3,
            fontSize: { xs: '1.25rem', sm: '1.375rem', md: '1.5rem' },
            letterSpacing: '-0.02em',
            color: 'text.primary',
            ...titleSx,
          }}
        >
          {title}
          {loading && (
            <CircularProgress
              size={16}
              sx={{ ml: 2, verticalAlign: 'middle' }}
            />
          )}
        </Typography>
      )}
      {description && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 3,
            fontSize: { xs: '0.8125rem', sm: '0.875rem' },
            ...descriptionSx,
          }}
        >
          {description}
        </Typography>
      )}
      {error && (
        <Box
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            bgcolor: alpha(theme.palette.error.main, 0.1),
            border: `1px solid ${alpha(theme.palette.error.main, 0.2)}`,
          }}
        >
          <Typography variant="body2" color="error.main">
            {error}
          </Typography>
        </Box>
      )}
      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="200px"
        >
          <CircularProgress size={40} />
        </Box>
      ) : (
        children
      )}
    </Box>
  )
}

