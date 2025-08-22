import enum
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Enum, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from core.database import Base

class TaskDifficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class TaskCategory(str, enum.Enum):
    BONDING = "bonding"

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Task content
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    task_type = Column(String(50), default="bonding", index=True)  # bonding, generic, interest-based
    
    # Enhanced task properties
    difficulty = Column(Enum(TaskDifficulty), default=TaskDifficulty.MEDIUM, index=True)
    category = Column(Enum(TaskCategory), default=TaskCategory.BONDING, index=True)
    
    # Match relationship
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False, index=True)
    
    # Completion tracking (fixed to be nullable)
    is_completed = Column(Boolean, default=False, index=True)
    completed_by_user1 = Column(Boolean, nullable=True, default=None)
    completed_by_user2 = Column(Boolean, nullable=True, default=None)
    completed_at_user1 = Column(DateTime(timezone=True), nullable=True)
    completed_at_user2 = Column(DateTime(timezone=True), nullable=True)
    
    # Progress tracking
    progress_percentage = Column(Integer, default=0)  # 0-100
    submission_count = Column(Integer, default=0)  # Number of submissions
    
    # Enhanced rewards system
    base_coin_reward = Column(Integer, default=10)
    difficulty_multiplier = Column(Integer, default=1)  # 1 for easy, 2 for medium, 3 for hard
    final_coin_reward = Column(Integer, default=10)  # Calculated reward
    
    # AI generation info
    ai_generated = Column(Boolean, default=True, index=True)
    prompt_used = Column(Text, nullable=True)
    
    # Time tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)  # 1 day after creation
    
    # Task validation
    requires_validation = Column(Boolean, default=False, index=True)
    validation_submitted = Column(Boolean, default=False)
    validation_approved = Column(Boolean, nullable=True)
    
    # Relationships
    match = relationship("Match", back_populates="tasks")
    submissions = relationship("TaskSubmission", back_populates="task")
    
    def __repr__(self):
        return f"<Task(id={self.id}, title='{self.title}', match_id={self.match_id}, is_completed={self.is_completed})>"
    
    def is_expired(self):
        """Check if task has expired"""
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return datetime.utcnow() > (self.created_at + timedelta(days=1))
    
    def is_completed_by_user(self, user_id: int) -> bool:
        """Check if task is completed by a specific user"""
        if self.match.user1_id == user_id:
            return self.completed_by_user1 == True
        elif self.match.user2_id == user_id:
            return self.completed_by_user2 == True
        return False
    
    def mark_completed_by_user(self, user_id: int):
        """Mark task as completed by a specific user"""
        if self.match.user1_id == user_id:
            self.completed_by_user1 = True
            self.completed_at_user1 = datetime.utcnow()
        elif self.match.user2_id == user_id:
            self.completed_by_user2 = True
            self.completed_at_user2 = datetime.utcnow()
        else:
            raise ValueError(f"User {user_id} is not part of this match")
        
        # Check if both users completed
        if self.completed_by_user1 and self.completed_by_user2:
            self.is_completed = True
            self.completed_at = datetime.utcnow()
            self.progress_percentage = 100
    
    def get_completion_progress(self) -> dict:
        """Get task completion progress"""
        total_users = 2
        completed_users = 0
        
        if self.completed_by_user1:
            completed_users += 1
        if self.completed_by_user2:
            completed_users += 1
        
        return {
            "total_users": total_users,
            "completed_users": completed_users,
            "progress_percentage": (completed_users / total_users) * 100,
            "is_fully_completed": completed_users == total_users
        }
    
    def calculate_reward(self) -> int:
        """Calculate final coin reward based on difficulty"""
        self.final_coin_reward = self.base_coin_reward * self.difficulty_multiplier
        return self.final_coin_reward
    
    def should_be_replaced(self) -> bool:
        """Check if task should be replaced (expired and not completed)"""
        return self.is_expired() and not self.is_completed
    
    def to_dict(self) -> dict:
        """Convert task to dictionary"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "task_type": self.task_type,
            "difficulty": self.difficulty.value if self.difficulty else None,
            "category": self.category.value if self.category else None,
            "match_id": self.match_id,
            "is_completed": self.is_completed,
            "progress_percentage": self.progress_percentage,
            "submission_count": self.submission_count,
            "base_coin_reward": self.base_coin_reward,
            "final_coin_reward": self.final_coin_reward,
            "ai_generated": self.ai_generated,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "requires_validation": self.requires_validation,
            "validation_submitted": self.validation_submitted,
            "validation_approved": self.validation_approved
        }

# Performance optimization indexes
Index('ix_tasks_match_completed', Task.match_id, Task.is_completed)
Index('ix_tasks_match_expires', Task.match_id, Task.expires_at)
Index('ix_tasks_completed_created', Task.is_completed, Task.created_at)
Index('ix_tasks_expires_active', Task.expires_at, Task.is_completed)
Index('ix_tasks_difficulty_category', Task.difficulty, Task.category)
Index('ix_tasks_ai_generated', Task.ai_generated, Task.created_at)
Index('ix_tasks_validation_status', Task.requires_validation, Task.validation_approved)
Index('ix_tasks_progress_completion', Task.progress_percentage, Task.is_completed) 