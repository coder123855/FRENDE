from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class TaskType(str, Enum):
    BONDING = "bonding"
    GENERIC = "generic"
    INTEREST_BASED = "interest-based"

class TaskStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    EXPIRED = "expired"

class TaskCreate(BaseModel):
    """Schema for creating a new task"""
    title: str = Field(..., max_length=200)
    description: str = Field(..., max_length=1000)
    task_type: TaskType = TaskType.BONDING
    match_id: int
    coin_reward: int = Field(10, ge=1, le=100)

class TaskUpdate(BaseModel):
    """Schema for updating task completion"""
    completed_by_user: int
    is_completed: bool = False

class TaskRead(BaseModel):
    """Schema for task response"""
    id: int
    title: str
    description: str
    task_type: TaskType
    match_id: int
    is_completed: bool
    completed_by_user1: bool
    completed_by_user2: bool
    coin_reward: int
    ai_generated: bool
    prompt_used: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TaskListResponse(BaseModel):
    """Schema for task list response"""
    tasks: List[TaskRead]
    total: int
    page: int
    size: int

class TaskCompletionRequest(BaseModel):
    """Schema for task completion request"""
    task_id: int
    user_id: int

class TaskCompletionResponse(BaseModel):
    """Schema for task completion response"""
    task: TaskRead
    message: str = "Task completed successfully"
    coins_earned: int

class TaskGenerationRequest(BaseModel):
    """Schema for task generation request"""
    match_id: int
    task_type: Optional[TaskType] = TaskType.BONDING
    user_interests: Optional[List[str]] = None

class TaskGenerationResponse(BaseModel):
    """Schema for task generation response"""
    task: TaskRead
    message: str = "Task generated successfully"

class TaskHistoryResponse(BaseModel):
    """Schema for task history response"""
    completed_tasks: List[TaskRead]
    total_completed: int
    total_coins_earned: int
    completion_rate: float  # Percentage of completed tasks 