from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from core.database import Base

class Match(Base):
    __tablename__ = "matches"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User relationships
    user1_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user2_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Match status
    status = Column(String(20), default="pending")  # pending, active, completed, expired
    compatibility_score = Column(Integer, nullable=True)  # 0-100 score
    
    # Slot tracking
    slot_used_by_user1 = Column(Boolean, default=False)
    slot_used_by_user2 = Column(Boolean, default=False)
    
    # Completion tracking
    coins_earned_user1 = Column(Integer, default=0)
    coins_earned_user2 = Column(Integer, default=0)
    
    # Time tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Chat room
    chat_room_id = Column(String(100), unique=True, nullable=True)
    
    # Conversation starter fields
    conversation_starter_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    conversation_started_at = Column(DateTime(timezone=True), nullable=True)
    greeting_sent = Column(Boolean, default=False)
    starter_timeout_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])
    conversation_starter = relationship("User", foreign_keys=[conversation_starter_id])
    tasks = relationship("Task", back_populates="match")
    messages = relationship("ChatMessage", back_populates="match")
    chat_room = relationship("ChatRoom", back_populates="match", uselist=False)
    
    def __repr__(self):
        return f"<Match(id={self.id}, user1_id={self.user1_id}, user2_id={self.user2_id}, status='{self.status}')>"
    
    def is_expired(self):
        """Check if match has expired (2 days since creation)"""
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return datetime.utcnow() > (self.created_at + timedelta(days=2))
    
    def is_completed(self):
        """Check if match is completed (50+ coins earned by both users)"""
        return (self.coins_earned_user1 >= 50 and self.coins_earned_user2 >= 50)
    
    def should_expire(self):
        """Check if match should be marked as expired"""
        return self.is_expired() or self.is_completed()
    
    def has_conversation_starter(self):
        """Check if match has a conversation starter assigned"""
        return self.conversation_starter_id is not None
    
    def is_conversation_starter_expired(self):
        """Check if conversation starter has timed out"""
        if not self.starter_timeout_at:
            return False
        return datetime.utcnow() > self.starter_timeout_at
    
    def get_conversation_starter_user_id(self):
        """Get the user ID of the conversation starter"""
        return self.conversation_starter_id 