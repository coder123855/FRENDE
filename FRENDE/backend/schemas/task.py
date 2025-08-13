from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class TaskType(str, Enum):
    BONDING = "bonding"
    GENERIC = "generic"
    INTEREST_BASED = "interest-based"

class TaskDifficulty(str, Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class TaskCategory(str, Enum):
    SOCIAL = "social"
    CREATIVE = "creative"
    PHYSICAL = "physical"
    MENTAL = "mental"
    BONDING = "bonding"

class TaskStatus(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    EXPIRED = "expired"
    PARTIALLY_COMPLETED = "partially_completed"
    NOT_STARTED = "not_started"

class TaskCreate(BaseModel):
    """Schema for creating a new task"""
    title: str = Field(..., max_length=200)
    description: str = Field(..., max_length=1000)
    task_type: TaskType = TaskType.BONDING
    difficulty: TaskDifficulty = TaskDifficulty.MEDIUM
    category: TaskCategory = TaskCategory.BONDING
    match_id: int
    base_coin_reward: int = Field(10, ge=1, le=100)
    requires_validation: bool = False

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
    difficulty: TaskDifficulty
    category: TaskCategory
    match_id: int
    is_completed: bool
    completed_by_user1: Optional[bool] = None
    completed_by_user2: Optional[bool] = None
    completed_at_user1: Optional[datetime] = None
    completed_at_user2: Optional[datetime] = None
    progress_percentage: int = 0
    submission_count: int = 0
    base_coin_reward: int
    difficulty_multiplier: int = 1
    final_coin_reward: int
    ai_generated: bool
    prompt_used: Optional[str] = None
    requires_validation: bool = False
    validation_submitted: bool = False
    validation_approved: Optional[bool] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    remaining_time: float = 0
    completion_status: TaskStatus

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
    submission_text: Optional[str] = None  # For tasks requiring validation

class TaskCompletionResponse(BaseModel):
    """Schema for task completion response"""
    task: TaskRead
    message: str = "Task completed successfully"
    coins_earned: int
    progress_updated: bool = True

class TaskGenerationRequest(BaseModel):
    """Schema for task generation request"""
    match_id: int
    task_type: Optional[TaskType] = TaskType.BONDING
    difficulty: Optional[TaskDifficulty] = TaskDifficulty.MEDIUM
    category: Optional[TaskCategory] = TaskCategory.BONDING
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
    average_difficulty: float
    tasks_by_category: dict

class TaskProgressResponse(BaseModel):
    """Schema for task progress response"""
    task_id: int
    progress_percentage: int
    completion_status: TaskStatus
    remaining_time: float
    can_complete: bool
    user_completion_status: dict  # Which user completed what

class TaskValidationRequest(BaseModel):
    """Schema for task validation submission"""
    task_id: int
    user_id: int
    submission_text: str = Field(..., min_length=10, max_length=500)
    submission_evidence: Optional[str] = None  # URL or description of evidence

class TaskValidationResponse(BaseModel):
    """Schema for task validation response"""
    task: TaskRead
    message: str = "Task validation submitted successfully"
    requires_approval: bool = True

class TaskStatisticsResponse(BaseModel):
    """Schema for task statistics response"""
    total_tasks_created: int
    total_tasks_completed: int
    total_coins_earned: int
    average_completion_time: float  # in hours
    tasks_by_difficulty: dict
    tasks_by_category: dict
    completion_rate_by_difficulty: dict
    recent_activity: List[TaskRead] 