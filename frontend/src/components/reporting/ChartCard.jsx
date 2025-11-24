import { Card, CardContent, Box, Typography, Chip, alpha, useTheme } from '@mui/material'
import { motion } from 'framer-motion'

/**
 * Reusable Chart Card Component
 * Wraps charts in a consistent, responsive card with optional title and badge
 */
export default function ChartCard({
  title,
  badge,
  badgeColor,
  children,
  height = 'auto',
  minHeight,
  sx = {},
  animationDelay = 0,
  ...props
}) {
  const theme = useTheme()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: animationDelay }}
      style={{ height: '100%' }}
    >
      <Card
        sx={{
          height: height,
          minHeight: minHeight,
          background: '#FFFFFF',
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 2,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          },
          ...sx,
        }}
        {...props}
      >
        <CardContent
          sx={{
            p: { xs: 2.5, sm: 3, md: 3.5 },
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'visible',
          }}
        >
          {(title || badge) && (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              mb={2.5}
              mt={0.5}
              sx={{
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
                gap: { xs: 1, sm: 0 },
              }}
            >
              {title && (
                <Typography
                  variant="h6"
                  fontWeight={600}
                  sx={{
                    fontSize: { xs: '0.95rem', sm: '1rem', md: '1.125rem' },
                    letterSpacing: '-0.01em',
                  }}
                >
                  {title}
                </Typography>
              )}
              {badge && (
                <Chip
                  label={badge}
                  size="small"
                  sx={{
                    bgcolor: badgeColor
                      ? alpha(badgeColor, 0.1)
                      : alpha(theme.palette.primary.main, 0.1),
                    color: badgeColor || theme.palette.primary.main,
                    fontWeight: 600,
                    fontSize: { xs: '9px', sm: '10px' },
                    height: { xs: 18, sm: 20 },
                    borderRadius: '4px',
                    border: `1px solid ${alpha(
                      badgeColor || theme.palette.primary.main,
                      0.2
                    )}`,
                  }}
                />
              )}
            </Box>
          )}
          <Box sx={{ flex: 1, minHeight: 0, overflow: 'visible' }}>{children}</Box>
        </CardContent>
      </Card>
    </motion.div>
  )
}

