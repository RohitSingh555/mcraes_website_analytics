import httpx
import logging
from typing import Dict, List, Optional, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class OpenAIClient:
    """Client for interacting with OpenAI API"""
    
    def __init__(self):
        self.base_url = "https://api.openai.com/v1"
        self.api_key = settings.OPENAI_API_KEY
        if not self.api_key:
            logger.warning("OpenAI API key not configured. Set OPENAI_API_KEY in .env file.")
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
    
    async def _request(self, method: str, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None) -> Dict:
        """Make HTTP request to OpenAI API"""
        if not self.api_key:
            raise ValueError("OpenAI API key is not configured. Please set OPENAI_API_KEY in your .env file.")
        
        url = f"{self.base_url}{endpoint}"
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.request(
                    method=method,
                    url=url,
                    headers=self.headers,
                    json=data,
                    params=params,
                    timeout=60.0  # OpenAI requests can take longer
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                error_detail = e.response.text
                logger.error(f"OpenAI API HTTP error for {url}: {e.response.status_code} - {error_detail}")
                # Raise a custom exception that can be caught and converted to HTTPException in the API layer
                raise Exception(f"OpenAI API error ({e.response.status_code}): {error_detail}")
            except Exception as e:
                logger.error(f"Error making request to OpenAI API {url}: {str(e)}")
                raise
    
    async def create_chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-4o-mini",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        stream: bool = False
    ) -> Dict:
        """
        Create a chat completion using OpenAI API
        
        Args:
            messages: List of message dicts with 'role' and 'content' keys
            model: Model to use (default: gpt-4o-mini)
            temperature: Sampling temperature (0-2, default: 0.7)
            max_tokens: Maximum tokens to generate
            stream: Whether to stream the response
        
        Returns:
            Dict containing the completion response
        """
        logger.info(f"Creating chat completion with model: {model}")
        
        data = {
            "model": model,
            "messages": messages,
            "temperature": temperature
        }
        
        if max_tokens:
            data["max_tokens"] = max_tokens
        
        if stream:
            data["stream"] = True
        
        return await self._request("POST", "/chat/completions", data=data)
    
    async def create_completion(
        self,
        prompt: str,
        model: str = "gpt-3.5-turbo-instruct",
        temperature: float = 0.7,
        max_tokens: Optional[int] = None
    ) -> Dict:
        """
        Create a text completion using OpenAI API (legacy endpoint)
        
        Args:
            prompt: The prompt text
            model: Model to use (default: gpt-3.5-turbo-instruct)
            temperature: Sampling temperature (0-2, default: 0.7)
            max_tokens: Maximum tokens to generate
        
        Returns:
            Dict containing the completion response
        """
        logger.info(f"Creating text completion with model: {model}")
        
        data = {
            "model": model,
            "prompt": prompt,
            "temperature": temperature
        }
        
        if max_tokens:
            data["max_tokens"] = max_tokens
        
        return await self._request("POST", "/completions", data=data)
    
    async def create_embedding(
        self,
        input_text: str | List[str],
        model: str = "text-embedding-3-small"
    ) -> Dict:
        """
        Create embeddings using OpenAI API
        
        Args:
            input_text: Text or list of texts to embed
            model: Embedding model to use (default: text-embedding-3-small)
        
        Returns:
            Dict containing the embedding response
        """
        logger.info(f"Creating embeddings with model: {model}")
        
        data = {
            "model": model,
            "input": input_text
        }
        
        return await self._request("POST", "/embeddings", data=data)
    
    async def list_models(self) -> Dict:
        """
        List available OpenAI models
        
        Returns:
            Dict containing list of available models
        """
        logger.info("Fetching available OpenAI models")
        return await self._request("GET", "/models")
    
    async def get_model(self, model_id: str) -> Dict:
        """
        Get information about a specific model
        
        Args:
            model_id: The model identifier
        
        Returns:
            Dict containing model information
        """
        logger.info(f"Fetching model information for: {model_id}")
        return await self._request("GET", f"/models/{model_id}")

