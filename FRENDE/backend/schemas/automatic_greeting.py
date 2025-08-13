from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class GreetingStatusResponse(BaseModel):
    """Schema for greeting status response"""
    match_id: int
    conversation_starter_id: Optional[int] = None
    greeting_sent: bool = False
    is_expired: bool = False
    timeout_at: Optional[str] = None  # ISO format datetime
    timeout_minutes: int = 1

class AutomaticGreetingResponse(BaseModel):
    """Schema for automatic greeting response"""
    match_id: int
    starter_id: int
    greeting_text: str
    message_id: int
    timestamp: str  # ISO format datetime

class PendingTimeoutsResponse(BaseModel):
    """Schema for pending timeouts response"""
    pending_timeouts: List[Dict[str, Any]]
    total_count: int

class GreetingTemplateResponse(BaseModel):
    """Schema for greeting template response"""
    id: str
    template: str
    name: str
    is_default: bool = False

class GreetingTemplatesResponse(BaseModel):
    """Schema for greeting templates response"""
    templates: List[GreetingTemplateResponse]
    total_count: int

class DefaultGreetingResponse(BaseModel):
    """Schema for default greeting response"""
    greeting: str
    user_name: str
    template_id: Optional[str] = None

class GreetingStatisticsResponse(BaseModel):
    """Schema for greeting statistics response"""
    statistics: Dict[str, Any]
    timestamp: str  # ISO format datetime

class GreetingPreferenceRequest(BaseModel):
    """Schema for greeting preference request"""
    template_id: str = Field(..., description="Preferred greeting template ID")

class GreetingPreferenceResponse(BaseModel):
    """Schema for greeting preference response"""
    user_id: int
    template_id: str
    updated_at: str  # ISO format datetime 