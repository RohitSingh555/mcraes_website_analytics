"""
Service for managing async sync jobs
"""
import uuid
import asyncio
import logging
from typing import Optional, Dict, Any
from datetime import datetime
from app.services.supabase_service import SupabaseService
from app.services.audit_logger import audit_logger
from app.db.models import AuditLogAction

logger = logging.getLogger(__name__)


class SyncJobService:
    """Service for managing async sync jobs"""
    
    def __init__(self):
        self.supabase = SupabaseService()
        self.running_jobs: Dict[str, asyncio.Task] = {}
        self.cancelled_jobs: set = set()  # Track cancelled job IDs
    
    def _generate_job_id(self) -> str:
        """Generate unique job ID"""
        return str(uuid.uuid4())
    
    async def create_job(
        self,
        sync_type: str,
        user_id: Optional[str],
        user_email: Optional[str],
        parameters: Optional[Dict[str, Any]] = None
    ) -> str:
        """Create a new sync job and return job ID"""
        job_id = self._generate_job_id()
        
        job_data = {
            "job_id": job_id,
            "sync_type": sync_type,
            "user_id": user_id,
            "user_email": user_email,
            "status": "pending",
            "progress": 0,
            "parameters": parameters or {},
            "created_at": datetime.utcnow().isoformat() + "Z"
        }
        
        try:
            result = self.supabase.client.table("sync_jobs").insert(job_data).execute()
            logger.info(f"Created sync job {job_id} for {sync_type}")
            return job_id
        except Exception as e:
            logger.error(f"Failed to create sync job: {str(e)}")
            raise
    
    async def update_job_status(
        self,
        job_id: str,
        status: str,
        progress: Optional[int] = None,
        current_step: Optional[str] = None,
        total_steps: Optional[int] = None,
        completed_steps: Optional[int] = None,
        error_message: Optional[str] = None
    ):
        """Update job status"""
        update_data = {
            "status": status,
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
        
        if progress is not None:
            update_data["progress"] = progress
        if current_step is not None:
            update_data["current_step"] = current_step
        if total_steps is not None:
            update_data["total_steps"] = total_steps
        if completed_steps is not None:
            update_data["completed_steps"] = completed_steps
        if error_message is not None:
            update_data["error_message"] = error_message
        
        if status == "running" and "started_at" not in update_data:
            update_data["started_at"] = datetime.utcnow().isoformat() + "Z"
        
        if status in ["completed", "failed", "cancelled"]:
            update_data["completed_at"] = datetime.utcnow().isoformat() + "Z"
        
        try:
            self.supabase.client.table("sync_jobs").update(update_data).eq("job_id", job_id).execute()
            
            # Send WebSocket notification for status changes
            try:
                from app.services.websocket_manager import websocket_manager
                job = await self.get_job(job_id)
                if job:
                    sync_type = job.get("sync_type", "unknown")
                    parameters = job.get("parameters", {})
                    brand_id = parameters.get("brand_id")
                    
                    if status == "running":
                        message = f"Sync started: {current_step or 'Processing...'}"
                    elif status in ["completed", "failed", "cancelled"]:
                        message = f"Sync {status}: {current_step or 'Finished'}"
                    else:
                        message = current_step or f"Sync {status}"
                    
                    await websocket_manager.notify_sync_status(
                        sync_type=sync_type,
                        brand_id=brand_id,
                        status=status,
                        message=message,
                        job_id=job_id
                    )
            except Exception as ws_error:
                logger.warning(f"Failed to send WebSocket notification for job {job_id}: {str(ws_error)}")
        except Exception as e:
            logger.error(f"Failed to update job {job_id}: {str(e)}")
    
    async def complete_job(
        self,
        job_id: str,
        result: Dict[str, Any],
        status: str = "completed"
    ):
        """Mark job as completed with result"""
        update_data = {
            "status": status,
            "progress": 100,
            "result": result,
            "completed_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
        
        try:
            self.supabase.client.table("sync_jobs").update(update_data).eq("job_id", job_id).execute()
            logger.info(f"Completed sync job {job_id}")
            
            # Send WebSocket notification
            try:
                from app.services.websocket_manager import websocket_manager
                job = await self.get_job(job_id)
                if job:
                    sync_type = job.get("sync_type", "unknown")
                    parameters = job.get("parameters", {})
                    brand_id = parameters.get("brand_id")
                    message = result.get("message", f"Sync {status} successfully")
                    
                    await websocket_manager.notify_sync_status(
                        sync_type=sync_type,
                        brand_id=brand_id,
                        status=status,
                        message=message,
                        job_id=job_id
                    )
            except Exception as ws_error:
                logger.warning(f"Failed to send WebSocket notification for job {job_id}: {str(ws_error)}")
        except Exception as e:
            logger.error(f"Failed to complete job {job_id}: {str(e)}")
    
    async def fail_job(
        self,
        job_id: str,
        error_message: str
    ):
        """Mark job as failed"""
        await self.update_job_status(
            job_id=job_id,
            status="failed",
            error_message=error_message
        )
        logger.error(f"Sync job {job_id} failed: {error_message}")
    
    async def get_job(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get job by ID"""
        try:
            result = self.supabase.client.table("sync_jobs").select("*").eq("job_id", job_id).execute()
            if result.data:
                return result.data[0]
            return None
        except Exception as e:
            logger.error(f"Failed to get job {job_id}: {str(e)}")
            return None
    
    async def get_user_jobs(
        self,
        user_email: str,
        status: Optional[str] = None,
        limit: int = 50
    ) -> list:
        """Get jobs for a user"""
        try:
            query = self.supabase.client.table("sync_jobs").select("*").eq("user_email", user_email)
            if status:
                query = query.eq("status", status)
            query = query.order("created_at", desc=True).limit(limit)
            
            result = query.execute()
            return result.data if result.data else []
        except Exception as e:
            logger.error(f"Failed to get user jobs: {str(e)}")
            return []
    
    async def get_active_jobs(self, user_email: Optional[str] = None) -> list:
        """Get active (pending or running) jobs only - excludes completed and failed"""
        try:
            query = self.supabase.client.table("sync_jobs").select("*").in_("status", ["pending", "running"])
            if user_email:
                query = query.eq("user_email", user_email)
            query = query.order("created_at", desc=True)
            
            result = query.execute()
            jobs = result.data if result.data else []
            
            # Double-check: filter out any completed/failed jobs that might have slipped through
            active_jobs = [j for j in jobs if j.get("status") in ["pending", "running"]]
            
            return active_jobs
        except Exception as e:
            logger.error(f"Failed to get active jobs: {str(e)}")
            return []
    
    def is_cancelled(self, job_id: str) -> bool:
        """Check if a job has been cancelled"""
        return job_id in self.cancelled_jobs
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a running job"""
        try:
            # Mark as cancelled
            self.cancelled_jobs.add(job_id)
            
            # Update job status in database
            await self.update_job_status(
                job_id=job_id,
                status="cancelled",
                current_step="Cancelled by user"
            )
            
            # Cancel the running task if it exists
            if job_id in self.running_jobs:
                task = self.running_jobs[job_id]
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    logger.info(f"Job {job_id} task cancelled")
                finally:
                    if job_id in self.running_jobs:
                        del self.running_jobs[job_id]
            
            # Remove from cancelled set after cleanup
            self.cancelled_jobs.discard(job_id)
            
            logger.info(f"Cancelled sync job {job_id}")
            return True
        except Exception as e:
            logger.error(f"Error cancelling job {job_id}: {str(e)}")
            return False
    
    def run_background_task(self, task_coro, job_id: str):
        """Run a task in the background and track it"""
        async def wrapped_task():
            try:
                await task_coro
            except asyncio.CancelledError:
                logger.info(f"Background task {job_id} was cancelled")
                await self.update_job_status(
                    job_id=job_id,
                    status="cancelled",
                    current_step="Cancelled by user"
                )
            except Exception as e:
                logger.error(f"Background task {job_id} failed: {str(e)}")
                await self.fail_job(job_id, str(e))
            finally:
                # Clean up running job reference
                if job_id in self.running_jobs:
                    del self.running_jobs[job_id]
                if job_id in self.cancelled_jobs:
                    self.cancelled_jobs.discard(job_id)
        
        task = asyncio.create_task(wrapped_task())
        self.running_jobs[job_id] = task
        return task


# Global instance
sync_job_service = SyncJobService()

