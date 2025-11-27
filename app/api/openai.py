from fastapi import APIRouter, HTTPException, Depends, Body, Query
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

class MetricReviewRequest(BaseModel):
    brand_id: int = Field(..., description="Brand ID to analyze")
    data_source: str = Field(..., description="Data source to review: 'ga4', 'agency_analytics', or 'scrunch'")
    start_date: Optional[str] = Field(None, description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(None, description="End date (YYYY-MM-DD)")

@router.post("/openai/metrics/review")
@handle_api_errors(context="generating metric review")
async def generate_metric_review(
    request: MetricReviewRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Generate an AI-powered review of metrics for a specific data source
    
    Analyzes KPIs from the specified data source (GA4, Agency Analytics, or Scrunch)
    and generates insights about what's performing well, trends, and recommendations.
    """
    try:
        # Validate data source
        valid_sources = ["ga4", "agency_analytics", "scrunch"]
        if request.data_source.lower() not in valid_sources:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid data source. Must be one of: {', '.join(valid_sources)}"
            )
        
        # Import the dashboard function to fetch KPIs
        from app.api.data import get_reporting_dashboard
        
        # Fetch dashboard data to get KPIs
        dashboard_data = await get_reporting_dashboard(
            request.brand_id,
            request.start_date,
            request.end_date
        )
        
        # Filter KPIs by data source
        source_kpis = {}
        source_mapping = {
            "ga4": "GA4",
            "agency_analytics": "AgencyAnalytics",
            "scrunch": "Scrunch"
        }
        target_source = source_mapping[request.data_source.lower()]
        
        if not dashboard_data.get("kpis"):
            raise HTTPException(
                status_code=404,
                detail=f"No KPIs found for brand {request.brand_id}"
            )
        
        # Filter KPIs by source
        for kpi_key, kpi_data in dashboard_data["kpis"].items():
            if kpi_data.get("source") == target_source:
                source_kpis[kpi_key] = kpi_data
        
        if not source_kpis:
            raise HTTPException(
                status_code=404,
                detail=f"No {request.data_source} KPIs found for this brand. Make sure the data source is configured."
            )
        
        # Prepare metrics summary for OpenAI
        metrics_summary = []
        for kpi_key, kpi_data in source_kpis.items():
            metric_info = {
                "metric": kpi_data.get("label", kpi_key),
                "value": kpi_data.get("value"),
                "change": kpi_data.get("change"),
                "format": kpi_data.get("format", "number")
            }
            metrics_summary.append(metric_info)
        
        # Create prompt for OpenAI
        data_source_names = {
            "ga4": "Google Analytics 4",
            "agency_analytics": "Agency Analytics (SEO)",
            "scrunch": "Scrunch AI"
        }
        source_name = data_source_names[request.data_source.lower()]
        
        prompt = f"""You are an expert analytics consultant reviewing {source_name} metrics for a brand.

Analyze the following metrics and provide a comprehensive review focusing on:
1. What's performing well (highlight strong metrics and positive trends)
2. Key insights and patterns
3. Notable changes from the previous period
4. Overall performance assessment

Metrics Data:
{format_metrics_for_prompt(metrics_summary)}

Date Range: {dashboard_data.get('date_range', {}).get('start_date', 'N/A')} to {dashboard_data.get('date_range', {}).get('end_date', 'N/A')}

Provide a clear, professional review (2-3 paragraphs) that highlights what's good and performing well. Be specific about the metrics and their significance. Use a positive, analytical tone."""
        
        # Generate review using OpenAI
        messages = [
            {
                "role": "system",
                "content": "You are an expert analytics consultant who provides clear, insightful reviews of marketing and analytics metrics. Focus on positive performance indicators and actionable insights."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
        
        result = await openai_client.create_chat_completion(
            messages=messages,
            model="gpt-4o-mini",
            temperature=0.7,
            max_tokens=500
        )
        
        # Extract the review text
        review_text = ""
        if result.get("choices") and len(result["choices"]) > 0:
            review_text = result["choices"][0].get("message", {}).get("content", "")
        
        return {
            "brand_id": request.brand_id,
            "brand_name": dashboard_data.get("brand_name"),
            "data_source": request.data_source,
            "date_range": dashboard_data.get("date_range"),
            "metrics_analyzed": len(source_kpis),
            "review": review_text,
            "metrics": metrics_summary
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating metric review: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error generating metric review: {str(e)}")

def format_metrics_for_prompt(metrics: List[Dict]) -> str:
    """Format metrics data for OpenAI prompt"""
    formatted = []
    for metric in metrics:
        value_str = str(metric["value"])
        if metric.get("format") == "percentage":
            value_str = f"{metric['value']}%"
        elif metric.get("format") == "currency":
            value_str = f"${metric['value']:,.2f}"
        else:
            value_str = f"{metric['value']:,}" if isinstance(metric['value'], (int, float)) else str(metric['value'])
        
        change_str = ""
        if metric.get("change") is not None:
            change_direction = "↑" if metric["change"] > 0 else "↓" if metric["change"] < 0 else "→"
            change_str = f" ({change_direction} {abs(metric['change']):.1f}% vs previous period)"
        
        formatted.append(f"- {metric['metric']}: {value_str}{change_str}")
    
    return "\n".join(formatted)

