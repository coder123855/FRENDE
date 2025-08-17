from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_async_session
from core.security import verify_password
from core.auth import current_active_user
from models.user import User
from schemas.user import (
    UserCreate, UserRead, LoginRequest, TokenResponse, 
    RefreshTokenRequest, RefreshTokenResponse, LogoutRequest,
    UserSessionsResponse, PasswordChangeRequest
)
from services.token_service import TokenService

router = APIRouter(prefix="/auth", tags=["authentication"])

# Custom registration endpoint
@router.post("/register", response_model=UserRead)
async def register(
    user_create: UserCreate,
    session: AsyncSession = Depends(get_async_session)
):
    """Register a new user."""
    from core.security import get_password_hash
    
    # Check if user already exists
    result = await session.execute(select(User).where(User.email == user_create.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    if user_create.username:
        result = await session.execute(select(User).where(User.username == user_create.username))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Create new user
    user = User(
        email=user_create.email,
        username=user_create.username,
        name=user_create.name,
        age=user_create.age,
        profession=user_create.profession,
        profile_text=user_create.profile_text,
        community=user_create.community,
        location=user_create.location,
        interests=user_create.interests,
        age_preference_min=user_create.age_preference_min,
        age_preference_max=user_create.age_preference_max,
        hashed_password=get_password_hash(user_create.password)
    )
    
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    return user

# Custom login endpoint
@router.post("/login", response_model=TokenResponse)
async def login(
    login_data: LoginRequest,
    session: AsyncSession = Depends(get_async_session)
):
    """Login with email and password."""
    from sqlalchemy import select
    
    # Find user by email
    result = await session.execute(select(User).where(User.email == login_data.email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Create tokens using token service
    token_service = TokenService(session)
    tokens = await token_service.create_tokens(user)
    
    return TokenResponse(
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
        user=user,
        session_id=tokens["session_id"]
    )

# Refresh token endpoint
@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    refresh_data: RefreshTokenRequest,
    session: AsyncSession = Depends(get_async_session)
):
    """Refresh access token using refresh token."""
    try:
        token_service = TokenService(session)
        tokens = await token_service.refresh_tokens(refresh_data.refresh_token)
        
        return RefreshTokenResponse(
            access_token=tokens["access_token"],
            refresh_token=tokens["refresh_token"]
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Token refresh failed"
        )

# Logout endpoint
@router.post("/logout")
async def logout(
    logout_data: LogoutRequest,
    session: AsyncSession = Depends(get_async_session)
):
    """Logout and revoke refresh token."""
    try:
        token_service = TokenService(session)
        revoked = await token_service.revoke_token(logout_data.refresh_token)
        
        if revoked:
            return {"message": "Successfully logged out"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid refresh token"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed"
        )

# Get user sessions endpoint
@router.get("/sessions", response_model=UserSessionsResponse)
async def get_user_sessions(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get all active sessions for the current user."""
    try:
        token_service = TokenService(session)
        sessions = await token_service.get_user_sessions(current_user.id)
        
        return UserSessionsResponse(
            sessions=sessions,
            total_sessions=len(sessions)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve sessions"
        )

# Revoke specific session endpoint
@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Revoke a specific session."""
    try:
        token_service = TokenService(session)
        revoked = await token_service.revoke_session(session_id, current_user.id)
        
        if revoked:
            return {"message": "Session revoked successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke session"
        )

# Revoke all sessions endpoint
@router.delete("/sessions")
async def revoke_all_sessions(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Revoke all sessions for the current user."""
    try:
        token_service = TokenService(session)
        revoked_count = await token_service.revoke_all_sessions(current_user.id)
        
        return {"message": f"Revoked {revoked_count} sessions"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke sessions"
        )

# Profile update endpoint
@router.put("/profile", response_model=UserRead)
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update user profile."""
    # Update user fields
    for field, value in user_update.dict(exclude_unset=True).items():
        setattr(current_user, field, value)
    
    await session.commit()
    await session.refresh(current_user)
    
    return current_user

# Password change endpoint
@router.post("/change-password")
async def change_password(
    password_data: PasswordChangeRequest,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Change user password."""
    from core.security import get_password_hash, verify_password
    
    # Verify current password
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    current_user.hashed_password = get_password_hash(password_data.new_password)
    await session.commit()
    
    return {"message": "Password changed successfully"}

# Import the current_active_user dependency
from core.auth import current_active_user 