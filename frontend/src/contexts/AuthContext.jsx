import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Check if user is logged in on mount
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = localStorage.getItem('access_token')
      const storedUser = localStorage.getItem('user')

      if (storedToken && storedUser) {
        try {
          // Verify token is still valid
          const userData = await authAPI.getCurrentUser()
          setUser(userData)
          setIsAuthenticated(true)
        } catch (error) {
          // Token is invalid, clear storage
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          localStorage.removeItem('user')
          setUser(null)
          setIsAuthenticated(false)
        }
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const signin = async (email, password) => {
    try {
      const response = await authAPI.signin(email, password)
      const { access_token, refresh_token, user: userData } = response

      localStorage.setItem('access_token', access_token)
      if (refresh_token) {
        localStorage.setItem('refresh_token', refresh_token)
      }
      localStorage.setItem('user', JSON.stringify(userData))

      setUser(userData)
      setIsAuthenticated(true)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Sign in failed',
      }
    }
  }

  const signup = async (email, password, fullName = null) => {
    try {
      const response = await authAPI.signup(email, password, fullName)
      const { access_token, refresh_token, user: userData } = response

      if (access_token) {
        localStorage.setItem('access_token', access_token)
        if (refresh_token) {
          localStorage.setItem('refresh_token', refresh_token)
        }
        localStorage.setItem('user', JSON.stringify(userData))

        setUser(userData)
        setIsAuthenticated(true)
      }

      return { success: true, requiresEmailConfirmation: !access_token }
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.detail || 'Sign up failed',
      }
    }
  }

  const signout = async () => {
    try {
      await authAPI.signout()
    } catch (error) {
      console.error('Signout error:', error)
    } finally {
      setUser(null)
      setIsAuthenticated(false)
    }
  }

  const value = {
    user,
    isAuthenticated,
    loading,
    signin,
    signup,
    signout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

