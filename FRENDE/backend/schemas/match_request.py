from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class MatchRequestStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"

class MatchRequestCreate(BaseModel):
    """Schema for creating a new match request"""
    receiver_id: int = Field(..., description="ID of the user to send request to")
    message: Optional[str] = Field(None, max_length=500, description="Optional message with request")

class MatchRequestUpdate(BaseModel):
    """Schema for updating match request status"""
    status: MatchRequestStatus
    response_message: Optional[str] = Field(None, max_length=500)

class MatchRequestRead(BaseModel):
    """Schema for match request response"""
    id: int
    sender_id: int
    receiver_id: int
    status: MatchRequestStatus
    message: Optional[str] = None
    compatibility_score: Optional[int] = None
    created_at: datetime
    expires_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None
    
    # User information
    sender_name: Optional[str] = None
    sender_username: Optional[str] = None
    sender_profile_picture: Optional[str] = None
    receiver_name: Optional[str] = None
    receiver_username: Optional[str] = None
    receiver_profile_picture: Optional[str] = None

    class Config:
        from_attributes = True

class MatchRequestResponse(BaseModel):
    """Schema for match request response"""
    request: MatchRequestRead
    message: str = "Match request processed successfully"

class MatchRequestListResponse(BaseModel):
    """Schema for match request list response"""
    requests: list[MatchRequestRead]
    total: int
    page: int
    size: int 