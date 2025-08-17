from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    username: Optional[str] = None
    name: Optional[str] = None
    age: Optional[int] = None
    profession: Optional[str] = None
    profile_picture_url: Optional[str] = None
    profile_text: Optional[str] = None
    community: Optional[str] = None
    location: Optional[str] = None
    interests: Optional[str] = None
    age_preference_min: Optional[int] = None
    age_preference_max: Optional[int] = None

class UserCreate(UserBase):
    email: EmailStr
    password: str = Field(..., min_length=8)
    username: str = Field(..., min_length=3, max_length=50)

class UserUpdate(UserBase):
    pass

class UserRead(UserBase):
    id: int
    email: EmailStr
    is_active: bool
    is_superuser: bool
    is_verified: bool
    available_slots: int
    total_slots_used: int
    coins: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserRead
    session_id: Optional[int] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class RefreshTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class LogoutRequest(BaseModel):
    refresh_token: str

class SessionInfo(BaseModel):
    session_id: int
    created_at: datetime
    last_activity: datetime
    refresh_token_id: Optional[int] = None

class UserSessionsResponse(BaseModel):
    sessions: List[SessionInfo]
    total_sessions: int

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirmRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8) 