import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { syncAPI } from '../services/api'
import { useAuth } from './AuthContext'

const SyncStatusContext = createContext()

export const useSyncStatus = () => {
  const context = useContext(SyncStatusContext)
  if (!context) {
    throw new Error('useSyncStatus must be used within SyncStatusProvider')
  }
  return context
}

export const SyncStatusProvider = ({ children }) => {
  const [activeJobs, setActiveJobs] = useState([])
  const [polling, setPolling] = useState(false)
  const { isAuthenticated } = useAuth()

  // Poll for active jobs status
  const pollActiveJobs = useCallback(async () => {
    // Only poll if user is authenticated
    if (!isAuthenticated) {
      setActiveJobs([])
      setPolling(false)
      return
    }

    try {
      const response = await syncAPI.getActiveSyncJobs()
      const jobs = response.items || []
      
      // Filter out completed, failed, and cancelled jobs
      const activeJobsOnly = jobs.filter(job => 
        job.status === 'pending' || job.status === 'running'
      )
      
      // Also filter current activeJobs to remove any that are now completed/failed/cancelled
      setActiveJobs(prev => {
        const updated = prev.filter(job => {
          // Check if job still exists in the API response and is still active
          const apiJob = jobs.find(j => j.job_id === job.job_id)
          if (apiJob) {
            return apiJob.status === 'pending' || apiJob.status === 'running'
          }
          // If job not in API response, check if it's in activeJobsOnly
          return activeJobsOnly.some(j => j.job_id === job.job_id)
        })
        return updated
      })
      
      // Update with fresh data from API
      setActiveJobs(activeJobsOnly)
      
      // Stop polling if no active jobs remain
      if (activeJobsOnly.length === 0) {
        setPolling(false)
      }
    } catch (error) {
      // Silently fail if 403 (not authenticated) or other errors
      if (error.response?.status !== 403) {
        console.error('Error polling sync jobs:', error)
      }
      setPolling(false)
      setActiveJobs([])
    }
  }, [isAuthenticated])

  // Start polling when there are active jobs, stop when all jobs are done
  useEffect(() => {
    if (!isAuthenticated) {
      setPolling(false)
      return
    }
    
    // Stop polling if no active jobs
    if (activeJobs.length === 0) {
      setPolling(false)
      return
    }
    
    // Check if any jobs are still active
    const hasActiveJobs = activeJobs.some(job => 
      job.status === 'pending' || job.status === 'running'
    )
    
    if (!hasActiveJobs) {
      setPolling(false)
      return
    }
    
    // Start polling interval
    const interval = setInterval(() => {
      pollActiveJobs()
    }, 2000) // Poll every 2 seconds
    
    return () => clearInterval(interval)
  }, [isAuthenticated, activeJobs, pollActiveJobs])

  // Initial poll and check for active jobs (only if authenticated)
  useEffect(() => {
    if (isAuthenticated) {
      pollActiveJobs()
    } else {
      setActiveJobs([])
      setPolling(false)
    }
  }, [pollActiveJobs, isAuthenticated])

  const addJob = useCallback((jobId, syncType) => {
    setActiveJobs(prev => {
      // Check if job already exists
      if (prev.find(j => j.job_id === jobId)) {
        return prev
      }
      return [...prev, {
        job_id: jobId,
        sync_type: syncType,
        status: 'pending',
        progress: 0,
        current_step: 'Starting...'
      }]
    })
    setPolling(true)
  }, [])

  const removeJob = useCallback((jobId) => {
    setActiveJobs(prev => prev.filter(j => j.job_id !== jobId))
  }, [])

  const refreshJobs = useCallback(() => {
    pollActiveJobs()
  }, [pollActiveJobs])

  return (
    <SyncStatusContext.Provider
      value={{
        activeJobs,
        addJob,
        removeJob,
        refreshJobs,
        hasActiveJobs: activeJobs.length > 0
      }}
    >
      {children}
    </SyncStatusContext.Provider>
  )
}

