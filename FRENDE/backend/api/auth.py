from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from core.auth import fastapi_users, current_active_user, auth_backend
from core.database import get_async_session
from core.security import verify_password, get_password_hash
from models.user import User
from schemas.user import (
    UserCreate, UserUpdate, UserRead, LoginRequest, 
    TokenResponse, PasswordChangeRequest
)

router = APIRouter(prefix="/auth", tags=["authentication"])

# Include FastAPI Users routes
router.include_router(fastapi_users.get_auth_router(auth_backend), prefix="/jwt")

# Custom registration endpoint
@router.post("/register", response_model=UserRead)
async def register(
    user_create: UserCreate,
    session: AsyncSession = Depends(get_async_session)
):
    """Register a new user with custom fields."""
    # Check if email already exists
    from sqlalchemy import select
    result = await session.execute(select(User).where(User.email == user_create.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists (if provided)
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
        hashed_password=get_password_hash(user_create.password),
        username=user_create.username,
        name=user_create.name,
        age=user_create.age,
        profession=user_create.profession,
        profile_text=user_create.profile_text,
        community=user_create.community,
        location=user_create.location
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
    
    # Generate access token
    from core.security import create_access_token
    access_token = create_access_token(data={"sub": str(user.id)})
    
    return TokenResponse(
        access_token=access_token,
        user=user
    )

# Profile update endpoint
@router.put("/profile", response_model=UserRead)
async def update_profile(
    user_update: UserUpdate,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update user profile."""
    # Check if username is being changed and if it's already taken
    if user_update.username and user_update.username != current_user.username:
        from sqlalchemy import select
        result = await session.execute(select(User).where(User.username == user_update.username))
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )
    
    # Update user fields
    update_data = user_update.dict(exclude_unset=True)
    for field, value in update_data.items():
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
    if not verify_password(password_data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    current_user.hashed_password = get_password_hash(password_data.new_password)
    await session.commit()
    
    return {"message": "Password updated successfully"}

# Get current user profile
@router.get("/me", response_model=UserRead)
async def get_current_user(current_user: User = Depends(current_active_user)):
    """Get current user profile."""
    return current_user 