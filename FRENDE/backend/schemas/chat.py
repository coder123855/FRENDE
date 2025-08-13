from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class ChatMessageRequest(BaseModel):
    """Schema for chat message request"""
    message_text: str = Field(..., min_length=1, max_length=1000, description="Message text")
    message_type: str = Field(default="text", description="Message type (text, task_submission, system)")

class ChatMessageResponse(BaseModel):
    """Schema for chat message response"""
    id: int
    match_id: int
    sender_id: int
    message_text: str
    message_type: str
    created_at: str  # ISO format datetime
    is_read: bool = False
    read_at: Optional[str] = None  # ISO format datetime
    is_system_message: Optional[bool] = False
    task_id: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None

class ChatHistoryResponse(BaseModel):
    """Schema for chat history response"""
    match_id: int
    messages: List[Dict[str, Any]]
    total_messages: int

class ChatHistoryPage(BaseModel):
    """Paginated chat history with cursors"""
    match_id: int
    messages: List[Dict[str, Any]]
    page: Optional[int] = None
    size: int
    total: Optional[int] = None
    has_more: bool
    next_cursor: Optional[str] = None
    prev_cursor: Optional[str] = None

class MessageReadRequest(BaseModel):
    """Schema for marking messages as read"""
    message_ids: List[int] = Field(..., description="List of message IDs to mark as read")

class TypingStatusResponse(BaseModel):
    """Schema for typing status response"""
    match_id: int
    typing_users: List[int] = Field(default_factory=list, description="List of user IDs currently typing")

class ChatRoomStatus(BaseModel):
    """Schema for chat room status"""
    match_id: int
    online_users: List[int]
    total_users: int
    last_activity: Optional[str] = None  # ISO format datetime

class SystemMessageRequest(BaseModel):
    """Schema for system message request"""
    message_text: str = Field(..., min_length=1, max_length=500, description="System message text")

class ChatNotification(BaseModel):
    """Schema for chat notifications"""
    type: str = Field(..., description="Notification type")
    match_id: int
    user_id: int
    message: str
    timestamp: str  # ISO format datetime
    data: Optional[Dict[str, Any]] = None 