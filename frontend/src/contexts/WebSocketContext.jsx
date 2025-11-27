import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './AuthContext'

const WebSocketContext = createContext(null)

export const useWebSocket = () => {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}

export const WebSocketProvider = ({ children }) => {
  const { isAuthenticated } = useAuth()
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const wsRef = useRef(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  const reconnectDelay = 3000 // 3 seconds
  const messageHandlersRef = useRef(new Set())

  const getWebSocketUrl = useCallback(() => {
    const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    const wsProtocol = API_BASE_URL.startsWith('https') ? 'wss' : 'ws'
    const wsBaseUrl = API_BASE_URL.replace(/^https?/, wsProtocol)
    const token = localStorage.getItem('access_token')
    
    if (!token) {
      throw new Error('No authentication token available')
    }
    
    return `${wsBaseUrl}/api/v1/ws?token=${encodeURIComponent(token)}`
  }, [])

  const connect = useCallback(() => {
    if (!isAuthenticated) {
      return
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return // Already connected
    }

    try {
      const url = getWebSocketUrl()
      const ws = new WebSocket(url)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        setConnectionError(null)
        reconnectAttempts.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          // Broadcast message to all registered handlers
          messageHandlersRef.current.forEach(handler => {
            try {
              handler(message)
            } catch (error) {
              console.error('Error in message handler:', error)
            }
          })
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setConnectionError('WebSocket connection error')
      }

      ws.onclose = (event) => {
        console.log('WebSocket disconnected', event.code, event.reason)
        setIsConnected(false)
        wsRef.current = null

        // Attempt to reconnect if not a normal closure and user is still authenticated
        if (event.code !== 1000 && isAuthenticated && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(`Reconnecting WebSocket (attempt ${reconnectAttempts.current}/${maxReconnectAttempts})...`)
            connect()
          }, reconnectDelay * reconnectAttempts.current) // Exponential backoff
        }
      }

      wsRef.current = ws
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      setConnectionError(error.message)
    }
  }, [isAuthenticated, getWebSocketUrl])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnecting')
      wsRef.current = null
    }
    
    setIsConnected(false)
    reconnectAttempts.current = 0
  }, [])

  const sendMessage = useCallback((message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      return true
    } else {
      console.warn('WebSocket is not connected')
      return false
    }
  }, [])

  const addMessageHandler = useCallback((handler) => {
    messageHandlersRef.current.add(handler)
    return () => {
      messageHandlersRef.current.delete(handler)
    }
  }, [])

  // Connect when authenticated, disconnect when not
  useEffect(() => {
    if (isAuthenticated) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [isAuthenticated, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  const value = {
    isConnected,
    connectionError,
    sendMessage,
    addMessageHandler,
    ws: wsRef.current,
  }

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>
}

