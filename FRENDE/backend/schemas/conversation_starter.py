from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ConversationStarterResponse(BaseModel):
    """Schema for conversation starter response"""
    match_id: int
    starter_id: int
    started_at: Optional[str] = None  # ISO format datetime
    timeout_at: Optional[str] = None  # ISO format datetime
    greeting_sent: bool = False
    is_expired: bool = False
    timeout_minutes: int = 1

class ConversationStarterAssignResponse(BaseModel):
    """Schema for conversation starter assignment response"""
    match_id: int
    starter_id: int
    timeout_at: str  # ISO format datetime
    timeout_minutes: int = 1

class ConversationStarterResetResponse(BaseModel):
    """Schema for conversation starter reset response"""
    match_id: int
    reset: bool = True
    timestamp: str  # ISO format datetime

class ConversationStarterTimeoutResponse(BaseModel):
    """Schema for conversation starter timeout response"""
    match_id: int
    starter_id: int
    timed_out: bool = True
    timeout_at: str  # ISO format datetime
    timestamp: str  # ISO format datetime

class DefaultGreetingResponse(BaseModel):
    """Schema for default greeting response"""
    greeting: str
    user_name: str 