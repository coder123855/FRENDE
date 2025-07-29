from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from core.database import Base

class Task(Base):
    __tablename__ = "tasks"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Task content
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    task_type = Column(String(50), default="bonding")  # bonding, generic, interest-based
    
    # Match relationship
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=False)
    
    # Completion tracking
    is_completed = Column(Boolean, default=False)
    completed_by_user1 = Column(Boolean, default=False)
    completed_by_user2 = Column(Boolean, default=False)
    
    # Rewards
    coin_reward = Column(Integer, default=10)
    
    # AI generation info
    ai_generated = Column(Boolean, default=True)
    prompt_used = Column(Text, nullable=True)
    
    # Time tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)  # 1 day after creation
    
    # Relationships
    match = relationship("Match", back_populates="tasks")
    
    def __repr__(self):
        return f"<Task(id={self.id}, title='{self.title}', match_id={self.match_id})>"
    
    def is_expired(self):
        """Check if task has expired (1 day after creation)"""
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return datetime.utcnow() > (self.created_at + timedelta(days=1))
    
    def is_completed(self):
        """Check if both users have completed the task"""
        return self.completed_by_user1 and self.completed_by_user2
    
    def mark_completed_by_user(self, user_id, match):
        """Mark task as completed by a specific user"""
        if user_id == match.user1_id:
            self.completed_by_user1 = True
        elif user_id == match.user2_id:
            self.completed_by_user2 = True
        
        # If both users completed, mark as fully completed
        if self.completed_by_user1 and self.completed_by_user2:
            self.is_completed = True
            self.completed_at = datetime.utcnow() 