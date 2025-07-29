from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    username: Optional[str] = None
    name: Optional[str] = None
    age: Optional[int] = Field(None, ge=13, le=100)
    profession: Optional[str] = None
    profile_text: Optional[str] = Field(None, max_length=500)
    community: Optional[str] = None
    location: Optional[str] = None

class UserUpdate(BaseModel):
    username: Optional[str] = None
    name: Optional[str] = None
    age: Optional[int] = Field(None, ge=13, le=100)
    profession: Optional[str] = None
    profile_text: Optional[str] = Field(None, max_length=500)
    profile_picture_url: Optional[str] = None
    community: Optional[str] = None
    location: Optional[str] = None

class UserRead(BaseModel):
    id: int
    email: str
    username: Optional[str] = None
    name: Optional[str] = None
    age: Optional[int] = None
    profession: Optional[str] = None
    profile_picture_url: Optional[str] = None
    profile_text: Optional[str] = None
    community: Optional[str] = None
    location: Optional[str] = None
    available_slots: int
    total_slots_used: int
    coins: int
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8) 