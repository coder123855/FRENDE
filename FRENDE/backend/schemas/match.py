from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class MatchStatus(str, Enum):
    PENDING = "pending"
    ACTIVE = "active"
    COMPLETED = "completed"
    EXPIRED = "expired"
    REJECTED = "rejected"

class MatchCreate(BaseModel):
    """Schema for creating a new match request"""
    target_user_id: Optional[int] = None  # For direct match requests
    community: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=100)

class MatchUpdate(BaseModel):
    """Schema for updating match status"""
    status: MatchStatus
    compatibility_score: Optional[int] = Field(None, ge=0, le=100)

class MatchRead(BaseModel):
    """Schema for match response"""
    id: int
    user1_id: int
    user2_id: int
    status: MatchStatus
    compatibility_score: Optional[int] = None
    slot_used_by_user1: bool
    slot_used_by_user2: bool
    coins_earned_user1: int
    coins_earned_user2: int
    chat_room_id: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    
    # User information (for match details)
    user1_name: Optional[str] = None
    user1_username: Optional[str] = None
    user1_profile_picture: Optional[str] = None
    user2_name: Optional[str] = None
    user2_username: Optional[str] = None
    user2_profile_picture: Optional[str] = None

    class Config:
        from_attributes = True

class MatchListResponse(BaseModel):
    """Schema for match list response"""
    matches: List[MatchRead]
    total: int
    page: int
    size: int

class MatchRequestResponse(BaseModel):
    """Schema for match request response"""
    match: MatchRead
    message: str = "Match request created successfully"

class MatchAcceptRequest(BaseModel):
    """Schema for accepting a match"""
    accept: bool = True

class MatchAcceptResponse(BaseModel):
    """Schema for match acceptance response"""
    match: MatchRead
    message: str = "Match accepted successfully"

class MatchRejectResponse(BaseModel):
    """Schema for match rejection response"""
    message: str = "Match rejected successfully"

class CompatibilityScore(BaseModel):
    """Schema for compatibility score response"""
    match_id: int
    score: int = Field(..., ge=0, le=100)
    factors: dict  # Detailed compatibility factors
    created_at: datetime 