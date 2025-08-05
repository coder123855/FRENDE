from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

class QueuePreferences(BaseModel):
    """Schema for queue preferences"""
    age_preference_min: Optional[int] = Field(None, ge=18, le=100, description="Minimum age preference")
    age_preference_max: Optional[int] = Field(None, ge=18, le=100, description="Maximum age preference")
    location: Optional[str] = Field(None, description="Preferred location")
    community: Optional[str] = Field(None, description="Preferred community")
    interests: Optional[List[str]] = Field(None, description="Preferred interests")

class QueueJoinRequest(BaseModel):
    """Schema for joining the queue"""
    preferences: Optional[QueuePreferences] = Field(None, description="Matching preferences")

class QueueStatusResponse(BaseModel):
    """Schema for queue status response"""
    user_id: int = Field(..., description="User ID")
    status: str = Field(..., description="Queue status: waiting, processing, matched, expired")
    position: Optional[int] = Field(None, description="Position in queue")
    wait_time_seconds: float = Field(..., description="Time spent waiting in seconds")
    estimated_wait_time: int = Field(..., description="Estimated wait time in seconds")
    created_at: datetime = Field(..., description="When user joined the queue")
    expires_at: Optional[datetime] = Field(None, description="When queue entry expires")
    preferences: Optional[Dict[str, Any]] = Field(None, description="User preferences")

class QueueStatistics(BaseModel):
    """Schema for queue statistics"""
    queue_length: int = Field(..., description="Number of users waiting in queue")
    status_counts: Dict[str, int] = Field(..., description="Count of entries by status")
    avg_wait_time_seconds: float = Field(..., description="Average wait time in seconds")
    timestamp: str = Field(..., description="Timestamp of statistics")

class QueueProcessResponse(BaseModel):
    """Schema for queue processing response"""
    message: str = Field(..., description="Processing result message")
    matches_created: int = Field(..., description="Number of matches created")
    matches: List[Dict[str, Any]] = Field(..., description="List of created matches")

class QueueLeaveResponse(BaseModel):
    """Schema for leaving queue response"""
    message: str = Field(..., description="Leave queue result message") 