"""
API endpoints for checking sync job status
"""
from fastapi import APIRouter, Query, Depends
from typing import Optional
from app.services.sync_job_service import sync_job_service
from app.api.auth import get_current_user
from app.core.error_utils import handle_api_errors

router = APIRouter()


@router.get("/sync/jobs/{job_id}")
@handle_api_errors(context="fetching sync job status")
async def get_sync_job_status(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get status of a specific sync job"""
    job = await sync_job_service.get_job(job_id)
    
    if not job:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(
            user_message=f"Sync job '{job_id}' not found.",
            technical_message=f"Job {job_id} not found"
        )
    
    # Check if user has access to this job
    if job.get("user_email") != current_user["email"]:
        from app.core.exceptions import AuthenticationException
        raise AuthenticationException(
            user_message="You don't have permission to view this job.",
            technical_message="Job belongs to different user"
        )
    
    return job


@router.get("/sync/jobs")
@handle_api_errors(context="fetching sync jobs")
async def get_sync_jobs(
    status: Optional[str] = Query(None, description="Filter by status (pending, running, completed, failed)"),
    sync_type: Optional[str] = Query(None, description="Filter by sync type"),
    limit: Optional[int] = Query(50, description="Number of records to return"),
    current_user: dict = Depends(get_current_user)
):
    """Get sync jobs for the current user"""
    jobs = await sync_job_service.get_user_jobs(
        user_email=current_user["email"],
        status=status,
        limit=limit or 50
    )
    
    # Filter by sync_type if provided
    if sync_type:
        jobs = [j for j in jobs if j.get("sync_type") == sync_type]
    
    return {
        "items": jobs,
        "count": len(jobs)
    }


@router.post("/sync/jobs/{job_id}/cancel")
@handle_api_errors(context="cancelling sync job")
async def cancel_sync_job(
    job_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Cancel a running sync job"""
    job = await sync_job_service.get_job(job_id)
    
    if not job:
        from app.core.exceptions import NotFoundException
        raise NotFoundException(
            user_message=f"Sync job '{job_id}' not found.",
            technical_message=f"Job {job_id} not found"
        )
    
    # Check if user has access to this job
    if job.get("user_email") != current_user["email"]:
        from app.core.exceptions import AuthenticationException
        raise AuthenticationException(
            user_message="You don't have permission to cancel this job.",
            technical_message="Job belongs to different user"
        )
    
    # Check if job can be cancelled
    if job.get("status") not in ["pending", "running"]:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail=f"Job is already {job.get('status')} and cannot be cancelled."
        )
    
    # Cancel the job
    success = await sync_job_service.cancel_job(job_id)
    
    if success:
        return {
            "status": "success",
            "message": f"Sync job '{job_id}' has been cancelled.",
            "job_id": job_id
        }
    else:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=500,
            detail="Failed to cancel the sync job."
        )



