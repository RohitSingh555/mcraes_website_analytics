from fastapi import APIRouter, HTTPException, Depends, Body
from typing import Optional, List, Dict
from pydantic import BaseModel, Field
import logging
from app.services.openai_client import OpenAIClient
from app.core.error_utils import handle_api_errors
from app.api.auth import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter()
openai_client = OpenAIClient()

# Request/Response Models
class ChatMessage(BaseModel):
    role: str = Field(..., description="Message role: 'system', 'user', or 'assistant'")
    content: str = Field(..., description="Message content")

class ChatCompletionRequest(BaseModel):
    messages: List[ChatMessage] = Field(..., description="List of messages in the conversation")
    model: str = Field(default="gpt-4o-mini", description="Model to use (e.g., gpt-4o-mini, gpt-4, gpt-3.5-turbo)")
    temperature: float = Field(default=0.7, ge=0, le=2, description="Sampling temperature (0-2)")
    max_tokens: Optional[int] = Field(default=None, description="Maximum tokens to generate")
    stream: bool = Field(default=False, description="Whether to stream the response")

class TextCompletionRequest(BaseModel):
    prompt: str = Field(..., description="The prompt text")
    model: str = Field(default="gpt-3.5-turbo-instruct", description="Model to use")
    temperature: float = Field(default=0.7, ge=0, le=2, description="Sampling temperature (0-2)")
    max_tokens: Optional[int] = Field(default=None, description="Maximum tokens to generate")

class EmbeddingRequest(BaseModel):
    input: str | List[str] = Field(..., description="Text or list of texts to embed")
    model: str = Field(default="text-embedding-3-small", description="Embedding model to use")

@router.post("/openai/chat/completions")
@handle_api_errors(context="creating chat completion")
async def create_chat_completion(
    request: ChatCompletionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a chat completion using OpenAI API
    
    This endpoint allows you to have a conversation with OpenAI's chat models.
    """
    try:
        # Convert Pydantic models to dict format expected by OpenAI API
        messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
        
        result = await openai_client.create_chat_completion(
            messages=messages,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            stream=request.stream
        )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating chat completion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating chat completion: {str(e)}")

@router.post("/openai/completions")
@handle_api_errors(context="creating text completion")
async def create_completion(
    request: TextCompletionRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a text completion using OpenAI API (legacy endpoint)
    
    This endpoint uses the older completion API for text generation.
    """
    try:
        result = await openai_client.create_completion(
            prompt=request.prompt,
            model=request.model,
            temperature=request.temperature,
            max_tokens=request.max_tokens
        )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating text completion: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating text completion: {str(e)}")

@router.post("/openai/embeddings")
@handle_api_errors(context="creating embeddings")
async def create_embedding(
    request: EmbeddingRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Create embeddings using OpenAI API
    
    This endpoint generates vector embeddings for text, useful for semantic search,
    clustering, and other ML applications.
    """
    try:
        result = await openai_client.create_embedding(
            input_text=request.input,
            model=request.model
        )
        
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating embeddings: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating embeddings: {str(e)}")

@router.get("/openai/models")
@handle_api_errors(context="listing OpenAI models")
async def list_models(
    current_user: dict = Depends(get_current_user)
):
    """
    List all available OpenAI models
    
    Returns a list of models available through the OpenAI API.
    """
    try:
        result = await openai_client.list_models()
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error listing models: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error listing models: {str(e)}")

@router.get("/openai/models/{model_id}")
@handle_api_errors(context="getting model information")
async def get_model(
    model_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Get information about a specific OpenAI model
    
    Returns detailed information about the specified model.
    """
    try:
        result = await openai_client.get_model(model_id)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting model information: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error getting model information: {str(e)}")

