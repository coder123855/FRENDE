from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from core.database import Base
import enum

class TaskDifficulty(str, enum.Enum):
    EASY = "easy"
    MEDIUM = "medium"
    HARD = "hard"

class TaskCategory(str, enum.Enum):
    SOCIAL = "social"
    CREATIVE = "creative"
    PHYSICAL = "physical"
    MENTAL = "mental"
    BONDING = "bonding"

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Task content
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    task_type = Column(String(50), default="bonding")  # bonding, generic, interest-based
    
    # Enhanced task properties
    difficulty = Column(Enum(TaskDifficulty), default=TaskDifficulty.MEDIUM)
    category = Column(Enum(TaskCategory), default=TaskCategory.BONDING)
    
    # Match relationship
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    
    # Completion tracking (fixed to be nullable)
    is_completed = Column(Boolean, default=False)
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
    ai_generated = Column(Boolean, default=True)
    prompt_used = Column(Text, nullable=True)
    
    # Time tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # 1 day after creation
    
    # Task validation
    requires_validation = Column(Boolean, default=False)
    validation_submitted = Column(Boolean, default=False)
    validation_approved = Column(Boolean, nullable=True)
    
    # Relationships
    match = relationship("Match", back_populates="tasks")
    submissions = relationship("TaskSubmission", back_populates="task")
    
    def __repr__(self):
        return f"<Task(id={self.id}, title='{self.title}', match_id={self.match_id})>"
    
    def is_expired(self):
        """Check if task has expired (1 day after creation)"""
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return datetime.utcnow() > (self.created_at + timedelta(days=1))
    
    def is_fully_completed(self):
        """Check if both users have completed the task"""
        return self.completed_by_user1 and self.completed_by_user2
    
    def get_completion_status(self):
        """Get detailed completion status"""
        user1_completed = self.completed_by_user1 is True
        user2_completed = self.completed_by_user2 is True
        
        if user1_completed and user2_completed:
            return "completed"
        elif user1_completed or user2_completed:
            return "partially_completed"
        else:
            return "not_started"
    
    def calculate_progress(self):
        """Calculate completion progress percentage"""
        completed_count = 0
        if self.completed_by_user1:
            completed_count += 1
        if self.completed_by_user2:
            completed_count += 1
        
        self.progress_percentage = (completed_count / 2) * 100
        return self.progress_percentage
    
    def calculate_reward(self):
        """Calculate final coin reward based on difficulty"""
        self.final_coin_reward = self.base_coin_reward * self.difficulty_multiplier
        return self.final_coin_reward
    
    def mark_completed_by_user(self, user_id, match):
        """Mark task as completed by a specific user"""
        current_time = datetime.utcnow()
        
        if user_id == match.user1_id:
            if self.completed_by_user1 is None:
                self.completed_by_user1 = True
                self.completed_at_user1 = current_time
            else:
                raise ValueError(f"Task already completed by user {user_id}")
        elif user_id == match.user2_id:
            if self.completed_by_user2 is None:
                self.completed_by_user2 = True
                self.completed_at_user2 = current_time
            else:
                raise ValueError(f"Task already completed by user {user_id}")
        else:
            raise ValueError(f"User {user_id} is not part of match {match.id}")
        
        # Update progress
        self.calculate_progress()
        
        # If both users completed, mark as fully completed
        if self.completed_by_user1 and self.completed_by_user2:
            self.is_completed = True
            self.completed_at = current_time
            self.calculate_reward()
    
    def can_be_completed_by_user(self, user_id, match):
        """Check if a user can complete this task"""
        if self.is_expired():
            return False
        
        if self.is_completed:
            return False
        
        if user_id == match.user1_id:
            return self.completed_by_user1 is None
        elif user_id == match.user2_id:
            return self.completed_by_user2 is None
        
        return False
    
    def get_remaining_time(self):
        """Get remaining time until expiration"""
        if self.expires_at:
            remaining = self.expires_at - datetime.utcnow()
            return max(remaining.total_seconds(), 0)
        else:
            # Default 1 day expiration
            expiration = self.created_at + timedelta(days=1)
            remaining = expiration - datetime.utcnow()
            return max(remaining.total_seconds(), 0)
    
    def get_difficulty_multiplier(self):
        """Get coin multiplier based on difficulty"""
        multipliers = {
            TaskDifficulty.EASY: 1,
            TaskDifficulty.MEDIUM: 2,
            TaskDifficulty.HARD: 3
        }
        return multipliers.get(self.difficulty, 1)
    
    def to_dict(self):
        """Convert task to dictionary for API responses"""
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "task_type": self.task_type,
            "difficulty": self.difficulty.value if self.difficulty else None,
            "category": self.category.value if self.category else None,
            "match_id": self.match_id,
            "is_completed": self.is_completed,
            "completed_by_user1": self.completed_by_user1,
            "completed_by_user2": self.completed_by_user2,
            "progress_percentage": self.progress_percentage,
            "submission_count": self.submission_count,
            "base_coin_reward": self.base_coin_reward,
            "final_coin_reward": self.final_coin_reward,
            "ai_generated": self.ai_generated,
            "requires_validation": self.requires_validation,
            "validation_submitted": self.validation_submitted,
            "validation_approved": self.validation_approved,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "remaining_time": self.get_remaining_time(),
            "completion_status": self.get_completion_status()
        } 