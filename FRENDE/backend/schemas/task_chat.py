from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class TaskSubmissionRequest(BaseModel):
    """Schema for task submission request via chat"""
    submission_text: str = Field(..., description="Task submission text", min_length=1, max_length=1000)
    evidence_url: Optional[str] = Field(None, description="Optional evidence URL")

class TaskSubmissionResponse(BaseModel):
    """Schema for task submission response"""
    success: bool
    message: str
    submission_id: Optional[int] = None
    chat_message_id: Optional[int] = None
    task_completion_status: Optional[Dict[str, Any]] = None
    reward: Optional[Dict[str, Any]] = None
    error: Optional[str] = None

class TaskNotificationResponse(BaseModel):
    """Schema for task notification response"""
    type: str = Field(..., description="Notification type")
    task_id: int
    title: str
    description: Optional[str] = None
    due_date: Optional[str] = None  # ISO format datetime
    reward_coins: Optional[int] = None
    hours_remaining: Optional[int] = None
    timestamp: str  # ISO format datetime
    is_read: bool = False

class TaskStatusResponse(BaseModel):
    """Schema for task status response"""
    has_active_task: bool
    task: Optional[Dict[str, Any]] = None
    submissions: Optional[Dict[str, Any]] = None
    time_remaining: Optional[float] = None

class TaskChatMessageResponse(BaseModel):
    """Schema for task-related chat message"""
    id: int
    match_id: int
    sender_id: Optional[int] = None
    message_text: str
    message_type: str = Field(..., description="Message type: text, task_submission, task_notification, etc.")
    task_id: Optional[int] = None
    submission_id: Optional[int] = None
    evidence_url: Optional[str] = None
    notification_type: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    created_at: str  # ISO format datetime
    is_read: bool = False

class TaskCompletionStatusResponse(BaseModel):
    """Schema for task completion status"""
    completed_by_both: bool
    submissions_count: int
    unique_users: List[int]
    match_users: List[int]

class TaskRewardResponse(BaseModel):
    """Schema for task reward response"""
    success: bool
    reward_coins: int
    user_rewards: List[Dict[str, Any]]
    error: Optional[str] = None

class TaskNotificationRequest(BaseModel):
    """Schema for task notification request"""
    notification_type: str = Field(..., description="Type of notification to send")
    message: str = Field(..., description="Notification message")
    task_id: int
    metadata: Optional[Dict[str, Any]] = None

class TaskChatIntegrationStatusResponse(BaseModel):
    """Schema for task chat integration status"""
    match_id: int
    has_active_task: bool
    current_task: Optional[Dict[str, Any]] = None
    notifications_count: int
    unread_notifications_count: int
    last_activity: Optional[str] = None  # ISO format datetime

class TaskSubmissionHistoryResponse(BaseModel):
    """Schema for task submission history"""
    submissions: List[Dict[str, Any]]
    total_count: int
    completed_tasks: int
    pending_tasks: int
    total_rewards_earned: int

class TaskChatMetricsResponse(BaseModel):
    """Schema for task chat metrics"""
    total_submissions: int
    completed_tasks: int
    total_rewards: int
    average_completion_time: Optional[float] = None  # in hours
    most_active_user: Optional[int] = None
    task_completion_rate: float  # percentage
    last_activity: Optional[str] = None  # ISO format datetime 