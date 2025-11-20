from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.database import get_supabase_client
from supabase import Client
import logging

logger = logging.getLogger(__name__)

router = APIRouter()
security = HTTPBearer()

# Request/Response models
class SignUpRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None

class SignInRequest(BaseModel):
    email: EmailStr
    password: str

class AuthResponse(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    user: dict
    expires_in: Optional[int] = None

class UserResponse(BaseModel):
    id: str
    email: str
    user_metadata: Optional[dict] = None

def get_auth_client() -> Client:
    """Get Supabase client for authentication"""
    return get_supabase_client()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    client: Client = Depends(get_auth_client)
) -> dict:
    """Dependency to get current authenticated user"""
    try:
        token = credentials.credentials
        # Verify token and get user
        user_response = client.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        return {
            "id": user_response.user.id,
            "email": user_response.user.email,
            "user_metadata": user_response.user.user_metadata or {}
        }
    except Exception as e:
        logger.error(f"Authentication error: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")

@router.post("/auth/signup", response_model=AuthResponse)
async def signup(request: SignUpRequest, client: Client = Depends(get_auth_client)):
    """Sign up a new user"""
    try:
        sign_up_data = {
            "email": request.email,
            "password": request.password,
        }
        
        if request.full_name:
            sign_up_data["data"] = {"full_name": request.full_name}
        
        response = client.auth.sign_up(sign_up_data)
        
        if not response.user:
            raise HTTPException(status_code=400, detail="Failed to create user")
        
        # Get session if available
        session = response.session
        if session:
            return {
                "access_token": session.access_token,
                "refresh_token": session.refresh_token,
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                    "user_metadata": response.user.user_metadata or {}
                },
                "expires_in": session.expires_in
            }
        else:
            # Email confirmation required
            return {
                "access_token": "",
                "refresh_token": "",
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                    "user_metadata": response.user.user_metadata or {}
                },
                "expires_in": None
            }
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        error_msg = str(e)
        if "already registered" in error_msg.lower():
            raise HTTPException(status_code=400, detail="Email already registered")
        raise HTTPException(status_code=400, detail=f"Signup failed: {error_msg}")

@router.post("/auth/signin", response_model=AuthResponse)
async def signin(request: SignInRequest, client: Client = Depends(get_auth_client)):
    """Sign in an existing user"""
    try:
        response = client.auth.sign_in_with_password({
            "email": request.email,
            "password": request.password
        })
        
        if not response.user or not response.session:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "user": {
                "id": response.user.id,
                "email": response.user.email,
                "user_metadata": response.user.user_metadata or {}
            },
            "expires_in": response.session.expires_in
        }
    except Exception as e:
        logger.error(f"Signin error: {str(e)}")
        error_msg = str(e)
        if "invalid" in error_msg.lower() or "credentials" in error_msg.lower():
            raise HTTPException(status_code=401, detail="Invalid email or password")
        raise HTTPException(status_code=401, detail=f"Signin failed: {error_msg}")

@router.post("/auth/signout")
async def signout(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    client: Client = Depends(get_auth_client)
):
    """Sign out the current user"""
    try:
        token = credentials.credentials
        client.auth.sign_out(token)
        return {"message": "Successfully signed out"}
    except Exception as e:
        logger.error(f"Signout error: {str(e)}")
        # Even if signout fails, return success (token will expire anyway)
        return {"message": "Signed out"}

@router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user information"""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        user_metadata=current_user.get("user_metadata")
    )

@router.post("/auth/refresh")
async def refresh_token(
    refresh_token: str = Header(..., alias="refresh-token"),
    client: Client = Depends(get_auth_client)
):
    """Refresh access token using refresh token"""
    try:
        response = client.auth.refresh_session(refresh_token)
        
        if not response.user or not response.session:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        
        return {
            "access_token": response.session.access_token,
            "refresh_token": response.session.refresh_token,
            "user": {
                "id": response.user.id,
                "email": response.user.email,
                "user_metadata": response.user.user_metadata or {}
            },
            "expires_in": response.session.expires_in
        }
    except Exception as e:
        logger.error(f"Token refresh error: {str(e)}")
        raise HTTPException(status_code=401, detail="Failed to refresh token")

