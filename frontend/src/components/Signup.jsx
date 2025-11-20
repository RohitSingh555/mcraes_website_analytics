import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  useTheme,
  Container,
  InputAdornment,
  IconButton,
} from '@mui/material'
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Person as PersonIcon,
  Visibility,
  VisibilityOff,
} from '@mui/icons-material'
import { motion } from 'framer-motion'
import { useAuth } from '../contexts/AuthContext'

function Signup() {
  const theme = useTheme()
  const navigate = useNavigate()
  const { signup } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    const result = await signup(email, password, fullName || null)

    if (result.success) {
      if (result.requiresEmailConfirmation) {
        setSuccess('Please check your email to confirm your account before signing in.')
      } else {
        navigate('/')
      }
    } else {
      setError(result.error || 'Sign up failed')
    }

    setLoading(false)
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: theme.palette.background.default,
        py: 4,
      }}
    >
      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card
            sx={{
              borderRadius: 3,
              border: `1px solid ${theme.palette.divider}`,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography
                variant="h4"
                fontWeight={700}
                textAlign="center"
                mb={1}
                sx={{
                  fontSize: '1.75rem',
                  letterSpacing: '-0.02em',
                }}
              >
                Create Account
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
                mb={4}
              >
                Sign up to get started
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              )}

              {success && (
                <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                  {success}
                </Alert>
              )}

              <Box component="form" onSubmit={handleSubmit}>
                <TextField
                  fullWidth
                  label="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  sx={{ mb: 2 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />

                <TextField
                  fullWidth
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  sx={{ mb: 3 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={loading}
                  sx={{
                    mb: 2,
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: 'none',
                    fontSize: '1rem',
                  }}
                >
                  {loading ? 'Creating account...' : 'Sign Up'}
                </Button>

                <Typography
                  variant="body2"
                  textAlign="center"
                  color="text.secondary"
                >
                  Already have an account?{' '}
                  <Link
                    to="/login"
                    style={{
                      color: theme.palette.primary.main,
                      textDecoration: 'none',
                      fontWeight: 600,
                    }}
                  >
                    Sign in
                  </Link>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </motion.div>
      </Container>
    </Box>
  )
}

export default Signup

