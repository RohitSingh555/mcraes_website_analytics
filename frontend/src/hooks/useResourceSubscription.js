import { useEffect, useState, useCallback, useRef } from 'react'
import { useWebSocket } from '../contexts/WebSocketContext'
import { useToast } from '../contexts/ToastContext'

/**
 * Hook for subscribing to resource updates via WebSocket
 * @param {string} resourceType - Type of resource: 'client', 'brand', or 'kpi_selection'
 * @param {number} resourceId - ID of the resource to subscribe to
 * @param {object} options - Options for the subscription
 * @param {boolean} options.showNotifications - Whether to show toast notifications (default: true)
 * @param {function} options.onUpdate - Callback when resource is updated
 */
export const useResourceSubscription = (resourceType, resourceId, options = {}) => {
  const { isConnected, sendMessage, addMessageHandler } = useWebSocket()
  const { showInfo, showWarning } = useToast()
  const [lastUpdate, setLastUpdate] = useState(null)
  const [currentVersion, setCurrentVersion] = useState(null)
  const subscriptionRef = useRef(false)
  const onUpdateRef = useRef(options.onUpdate)
  const showNotifications = options.showNotifications !== false

  // Update callback ref when it changes
  useEffect(() => {
    onUpdateRef.current = options.onUpdate
  }, [options.onUpdate])

  const subscribe = useCallback(() => {
    if (!isConnected || !resourceType || resourceId === null || resourceId === undefined) {
      return
    }

    if (subscriptionRef.current) {
      return // Already subscribed
    }

    const message = {
      action: 'subscribe',
      resource_type: resourceType,
      resource_id: resourceId,
    }

    if (sendMessage(message)) {
      subscriptionRef.current = true
      console.log(`Subscribed to ${resourceType}:${resourceId}`)
    }
  }, [isConnected, resourceType, resourceId, sendMessage])

  const unsubscribe = useCallback(() => {
    if (!isConnected || !resourceType || resourceId === null || resourceId === undefined) {
      return
    }

    if (!subscriptionRef.current) {
      return // Not subscribed
    }

    const message = {
      action: 'unsubscribe',
      resource_type: resourceType,
      resource_id: resourceId,
    }

    if (sendMessage(message)) {
      subscriptionRef.current = false
      console.log(`Unsubscribed from ${resourceType}:${resourceId}`)
    }
  }, [isConnected, resourceType, resourceId, sendMessage])

  // Subscribe when connected and resource info is available
  useEffect(() => {
    if (isConnected && resourceType && resourceId !== null && resourceId !== undefined) {
      subscribe()
    }

    return () => {
      if (subscriptionRef.current) {
        unsubscribe()
      }
    }
  }, [isConnected, resourceType, resourceId, subscribe, unsubscribe])

  // Listen for WebSocket messages
  useEffect(() => {
    if (!isConnected || !resourceType || resourceId === null || resourceId === undefined) {
      return
    }

    const handleMessage = (message) => {
      if (message.type === 'resource_updated' && 
          message.resource_type === resourceType && 
          message.resource_id === resourceId) {
        
        // Update state
        setLastUpdate({
          updated_by: message.updated_by,
          updated_at: message.updated_at,
          version: message.version,
        })
        setCurrentVersion(message.version)

        // Show notification if enabled
        if (showNotifications) {
          const resourceName = resourceType === 'client' ? 'Client' : 
                              resourceType === 'brand' ? 'Brand' : 
                              'KPI Selection'
          showWarning(
            `${resourceName} was updated by ${message.updated_by}`,
            {
              action: 'Refresh',
              onClick: () => {
                // Call the onUpdate callback if provided
                if (onUpdateRef.current) {
                  onUpdateRef.current(message)
                }
              }
            }
          )
        }

        // Call the onUpdate callback if provided
        if (onUpdateRef.current) {
          onUpdateRef.current(message)
        }
      }
    }

    const removeHandler = addMessageHandler(handleMessage)

    return () => {
      removeHandler()
    }
  }, [isConnected, resourceType, resourceId, showNotifications, showWarning, addMessageHandler])

  return {
    isSubscribed: subscriptionRef.current,
    lastUpdate,
    currentVersion,
    subscribe,
    unsubscribe,
  }
}

