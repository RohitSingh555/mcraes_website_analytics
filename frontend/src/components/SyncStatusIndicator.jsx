import { useState, useEffect } from 'react'
import {
  Box,
  Chip,
  LinearProgress,
  Typography,
  Collapse,
  IconButton,
  alpha,
  useTheme,
  Tooltip
} from '@mui/material'
import {
  Sync as SyncIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material'
import { motion, AnimatePresence } from 'framer-motion'
import { useSyncStatus } from '../contexts/SyncStatusContext'
import { syncAPI } from '../services/api'

function SyncStatusIndicator() {
  const { activeJobs, refreshJobs, removeJob } = useSyncStatus()
  const [expanded, setExpanded] = useState(false)
  const [jobDetails, setJobDetails] = useState({})
  const [cancellingJobs, setCancellingJobs] = useState(new Set())
  const theme = useTheme()
  
  const handleCancelJob = async (jobId) => {
    if (cancellingJobs.has(jobId)) return // Already cancelling
    
    setCancellingJobs(prev => new Set(prev).add(jobId))
    try {
      await syncAPI.cancelSyncJob(jobId)
      // Remove from active jobs immediately
      removeJob(jobId)
      // Refresh to get updated status
      refreshJobs()
    } catch (error) {
      console.error(`Error cancelling job ${jobId}:`, error)
      // Still remove from cancelling set
    } finally {
      setCancellingJobs(prev => {
        const next = new Set(prev)
        next.delete(jobId)
        return next
      })
    }
  }

  // Poll for job updates - stop when all jobs are completed/failed/cancelled
  useEffect(() => {
    if (activeJobs.length === 0) return

    const interval = setInterval(async () => {
      // Get current active jobs and their details
      const currentActiveJobs = activeJobs.filter(j => {
        const details = jobDetails[j.job_id] || j
        return ['pending', 'running'].includes(details.status)
      })

      // Stop polling immediately if no active jobs
      if (currentActiveJobs.length === 0) {
        clearInterval(interval)
        // Clean up: remove all non-active jobs
        activeJobs.forEach(job => {
          const details = jobDetails[job.job_id] || job
          if (['completed', 'failed', 'cancelled'].includes(details.status)) {
            removeJob(job.job_id)
          }
        })
        return
      }

      // Poll each active job
      const completedJobIds = []
      for (const job of currentActiveJobs) {
        try {
          const updatedJob = await syncAPI.getSyncJobStatus(job.job_id)
          if (updatedJob) {
            setJobDetails(prev => ({
              ...prev,
              [job.job_id]: updatedJob
            }))
            
            // Mark for removal if job is done
            if (['completed', 'failed', 'cancelled'].includes(updatedJob.status)) {
              completedJobIds.push(job.job_id)
            }
          }
        } catch (err) {
          console.error(`Error fetching job ${job.job_id}:`, err)
        }
      }
      
      // Remove completed jobs immediately
      completedJobIds.forEach(jobId => {
        removeJob(jobId)
      })
      
      // Refresh jobs list to sync with backend
      if (completedJobIds.length > 0) {
        refreshJobs()
      }
      
      // Check if we should stop polling (no active jobs remaining)
      const remainingActive = activeJobs.filter(j => {
        if (completedJobIds.includes(j.job_id)) {
          return false // This job was just removed
        }
        const details = jobDetails[j.job_id] || j
        return ['pending', 'running'].includes(details.status)
      })
      
      if (remainingActive.length === 0) {
        clearInterval(interval)
      }
    }, 2000) // Poll every 2 seconds

    return () => clearInterval(interval)
  }, [activeJobs, jobDetails, refreshJobs, removeJob])

  if (activeJobs.length === 0) {
    return null
  }

  const runningJobs = activeJobs.filter(j => {
    const details = jobDetails[j.job_id] || j
    return ['pending', 'running'].includes(details.status)
  })

  if (runningJobs.length === 0) {
    return null
  }

  const getSyncTypeLabel = (syncType) => {
    const labels = {
      'sync_all': 'Scrunch AI',
      'sync_ga4': 'Google Analytics',
      'sync_agency_analytics': 'Agency Analytics',
      'sync_brands': 'Brands',
      'sync_prompts': 'Prompts',
      'sync_responses': 'Responses'
    }
    return labels[syncType] || syncType
  }

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 1300,
        maxWidth: 400,
        width: 'calc(100% - 32px)',
      }}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
      >
        <Box
          sx={{
            bgcolor: 'background.paper',
            borderRadius: 2,
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 1.5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              cursor: 'pointer',
            }}
            onClick={() => setExpanded(!expanded)}
          >
            <Box display="flex" alignItems="center" gap={1}>
              <SyncIcon sx={{ fontSize: 18, color: theme.palette.primary.main }} />
              <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                {runningJobs.length} sync{runningJobs.length > 1 ? 's' : ''} running
              </Typography>
            </Box>
            <IconButton size="small" sx={{ p: 0.5 }}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          {/* Expanded content */}
          <Collapse in={expanded}>
            <Box sx={{ p: 2 }}>
              <AnimatePresence>
                {runningJobs.map((job, index) => {
                  const details = jobDetails[job.job_id] || job
                  const progress = details.progress || 0
                  const status = details.status || 'pending'

                  return (
                    <motion.div
                      key={job.job_id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Box sx={{ mb: index < runningJobs.length - 1 ? 2 : 0 }}>
                        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                          <Typography variant="body2" sx={{ fontSize: '0.875rem', fontWeight: 500 }}>
                            {getSyncTypeLabel(details.sync_type || job.sync_type)}
                          </Typography>
                          <Box display="flex" alignItems="center" gap={0.5}>
                            <Chip
                              label={status === 'running' ? 'Running' : 'Pending'}
                              size="small"
                              color={status === 'running' ? 'primary' : 'default'}
                              sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                            <Tooltip title="Cancel Sync" arrow>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleCancelJob(job.job_id)
                                }}
                                disabled={cancellingJobs.has(job.job_id)}
                                sx={{
                                  p: 0.5,
                                  color: theme.palette.error.main,
                                  '&:hover': {
                                    bgcolor: alpha(theme.palette.error.main, 0.1),
                                  },
                                }}
                              >
                                <CancelIcon sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        </Box>
                        {details.current_step && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontSize: '0.75rem', display: 'block', mb: 1 }}
                          >
                            {details.current_step}
                          </Typography>
                        )}
                        {progress > 0 && (
                          <Box>
                            <LinearProgress
                              variant="determinate"
                              value={progress}
                              sx={{
                                borderRadius: 1,
                                height: 6,
                                mb: 0.5,
                              }}
                            />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ fontSize: '0.7rem' }}
                            >
                              {progress}% complete
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </Box>
          </Collapse>
        </Box>
      </motion.div>
    </Box>
  )
}

export default SyncStatusIndicator

