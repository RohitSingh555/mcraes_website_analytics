from fastapi import APIRouter, HTTPException
from typing import Optional
import logging
from app.services.supabase_service import SupabaseService
from app.core.config import settings

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/database/migrate/add-brand-id")
async def add_brand_id_columns():
    """Add brand_id columns to prompts and responses tables via Supabase API"""
    try:
        supabase = SupabaseService()
        
        # Note: Supabase REST API doesn't support ALTER TABLE directly
        # This endpoint will update existing records with brand_id
        # The columns should be added manually via Supabase SQL Editor first
        # OR we can use RPC if available
        
        return {
            "status": "info",
            "message": "Please add brand_id columns manually via Supabase SQL Editor. Use /database/update-brand-ids to populate existing records.",
            "sql": """
                ALTER TABLE prompts ADD COLUMN IF NOT EXISTS brand_id INTEGER;
                ALTER TABLE responses ADD COLUMN IF NOT EXISTS brand_id INTEGER;
                CREATE INDEX IF NOT EXISTS idx_prompts_brand_id ON prompts(brand_id);
                CREATE INDEX IF NOT EXISTS idx_responses_brand_id ON responses(brand_id);
            """
        }
    except Exception as e:
        logger.error(f"Error in migration: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/database/update-brand-ids")
async def update_brand_ids(
    brand_id: Optional[int] = None
):
    """Update existing prompts and responses with brand_id"""
    try:
        supabase = SupabaseService()
        brand_id_to_use = brand_id or settings.BRAND_ID
        
        if not brand_id_to_use:
            raise HTTPException(status_code=400, detail="brand_id is required")
        
        # Update prompts
        prompts_result = supabase.client.table("prompts").select("id").execute()
        prompts = prompts_result.data if hasattr(prompts_result, 'data') else []
        
        prompts_updated = 0
        if prompts:
            # Update prompts in batches
            batch_size = 100
            for i in range(0, len(prompts), batch_size):
                batch = prompts[i:i + batch_size]
                for prompt in batch:
                    try:
                        supabase.client.table("prompts").update({
                            "brand_id": brand_id_to_use
                        }).eq("id", prompt["id"]).execute()
                        prompts_updated += 1
                    except Exception as e:
                        logger.warning(f"Failed to update prompt {prompt['id']}: {e}")
        
        # Update responses
        responses_result = supabase.client.table("responses").select("id").execute()
        responses = responses_result.data if hasattr(responses_result, 'data') else []
        
        responses_updated = 0
        if responses:
            # Update responses in batches
            batch_size = 100
            for i in range(0, len(responses), batch_size):
                batch = responses[i:i + batch_size]
                for response in batch:
                    try:
                        supabase.client.table("responses").update({
                            "brand_id": brand_id_to_use
                        }).eq("id", response["id"]).execute()
                        responses_updated += 1
                    except Exception as e:
                        logger.warning(f"Failed to update response {response['id']}: {e}")
        
        return {
            "status": "success",
            "message": f"Updated brand_id for existing records",
            "brand_id": brand_id_to_use,
            "prompts_updated": prompts_updated,
            "responses_updated": responses_updated
        }
    except Exception as e:
        logger.error(f"Error updating brand_ids: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/database/verify")
async def verify_database():
    """Verify database schema and brand_id columns"""
    try:
        supabase = SupabaseService()
        
        # Check if brand_id column exists in prompts
        prompts_result = supabase.client.table("prompts").select("brand_id").limit(1).execute()
        prompts_has_brand_id = True
        
        # Check if brand_id column exists in responses
        responses_result = supabase.client.table("responses").select("brand_id").limit(1).execute()
        responses_has_brand_id = True
        
        # Count records without brand_id
        prompts_without_brand_id = 0
        responses_without_brand_id = 0
        
        try:
            prompts_all = supabase.client.table("prompts").select("id, brand_id").execute()
            prompts_data = prompts_all.data if hasattr(prompts_all, 'data') else []
            prompts_without_brand_id = sum(1 for p in prompts_data if not p.get("brand_id"))
        except Exception as e:
            logger.warning(f"Error checking prompts: {e}")
            prompts_has_brand_id = False
        
        try:
            responses_all = supabase.client.table("responses").select("id, brand_id").execute()
            responses_data = responses_all.data if hasattr(responses_all, 'data') else []
            responses_without_brand_id = sum(1 for r in responses_data if not r.get("brand_id"))
        except Exception as e:
            logger.warning(f"Error checking responses: {e}")
            responses_has_brand_id = False
        
        return {
            "status": "success",
            "schema": {
                "prompts_has_brand_id": prompts_has_brand_id,
                "responses_has_brand_id": responses_has_brand_id,
                "prompts_without_brand_id": prompts_without_brand_id,
                "responses_without_brand_id": responses_without_brand_id
            },
            "message": "Database verification complete"
        }
    except Exception as e:
        logger.error(f"Error verifying database: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

