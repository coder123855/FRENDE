from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class MessageType(str, Enum):
    TEXT = "text"
    TASK_SUBMISSION = "task_submission"
    SYSTEM = "system"

class ChatMessageCreate(BaseModel):
    """Schema for creating a new chat message"""
    message_text: str = Field(..., max_length=2000)
    message_type: MessageType = MessageType.TEXT
    task_id: Optional[int] = None

class ChatMessageRead(BaseModel):
    """Schema for chat message response"""
    id: int
    match_id: int
    sender_id: int
    message_text: str
    message_type: MessageType
    task_id: Optional[int] = None
    is_read: bool
    is_system_message: bool
    created_at: datetime
    read_at: Optional[datetime] = None
    
    # Sender information
    sender_name: Optional[str] = None
    sender_username: Optional[str] = None

    class Config:
        from_attributes = True

class ChatMessageListResponse(BaseModel):
    """Schema for chat message list response"""
    messages: List[ChatMessageRead]
    total: int
    page: int
    size: int
    unread_count: int

class ChatMessageSendResponse(BaseModel):
    """Schema for message send response"""
    message: ChatMessageRead
    status_message: str = "Message sent successfully"

class ReadReceiptRequest(BaseModel):
    """Schema for read receipt request"""
    message_id: int

class ReadReceiptResponse(BaseModel):
    """Schema for read receipt response"""
    message_id: int
    read_at: datetime
    message: str = "Message marked as read"

class UnreadCountResponse(BaseModel):
    """Schema for unread count response"""
    match_id: int
    unread_count: int
    last_message_at: Optional[datetime] = None

class ChatRoomStatus(BaseModel):
    """Schema for chat room status"""
    room_id: str
    match_id: int
    is_active: bool
    conversation_starter_id: Optional[int] = None
    starter_message_sent: bool
    auto_greeting_sent: bool
    created_at: datetime
    last_activity: datetime
    online_users: List[int]
    typing_users: List[int] 