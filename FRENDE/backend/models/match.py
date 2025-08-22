from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Text, Index
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from core.database import Base

class Match(Base):
    __tablename__ = "matches"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User relationships
    user1_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    user2_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    
    # Match status
    status = Column(String(20), default="pending", index=True)  # pending, active, completed, expired
    compatibility_score = Column(Integer, nullable=True, index=True)  # 0-100 score
    
    # Slot tracking
    slot_used_by_user1 = Column(Boolean, default=False)
    slot_used_by_user2 = Column(Boolean, default=False)
    
    # Completion tracking
    coins_earned_user1 = Column(Integer, default=0)
    coins_earned_user2 = Column(Integer, default=0)
    
    # Time tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    started_at = Column(DateTime(timezone=True), nullable=True, index=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True, index=True)
    
    # Chat room
    chat_room_id = Column(String(100), unique=True, nullable=True)
    
    # Conversation starter fields
    conversation_starter_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    conversation_started_at = Column(DateTime(timezone=True), nullable=True)
    greeting_sent = Column(Boolean, default=False)
    starter_timeout_at = Column(DateTime(timezone=True), nullable=True, index=True)
    
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
    
    def is_active(self):
        """Check if match is active"""
        return self.status == "active"
    
    def is_pending(self):
        """Check if match is pending"""
        return self.status == "pending"
    
    def is_completed(self):
        """Check if match is completed"""
        return self.status == "completed"
    
    def get_other_user_id(self, user_id: int) -> int:
        """Get the ID of the other user in the match"""
        if self.user1_id == user_id:
            return self.user2_id
        elif self.user2_id == user_id:
            return self.user1_id
        else:
            raise ValueError(f"User {user_id} is not part of this match")
    
    def get_user_slot_used(self, user_id: int) -> bool:
        """Check if a user has used their slot for this match"""
        if self.user1_id == user_id:
            return self.slot_used_by_user1
        elif self.user2_id == user_id:
            return self.slot_used_by_user2
        else:
            raise ValueError(f"User {user_id} is not part of this match")
    
    def mark_slot_used(self, user_id: int):
        """Mark that a user has used their slot for this match"""
        if self.user1_id == user_id:
            self.slot_used_by_user1 = True
        elif self.user2_id == user_id:
            self.slot_used_by_user2 = True
        else:
            raise ValueError(f"User {user_id} is not part of this match")
    
    def get_coins_earned(self, user_id: int) -> int:
        """Get coins earned by a user in this match"""
        if self.user1_id == user_id:
            return self.coins_earned_user1
        elif self.user2_id == user_id:
            return self.coins_earned_user2
        else:
            raise ValueError(f"User {user_id} is not part of this match")
    
    def add_coins_earned(self, user_id: int, coins: int):
        """Add coins earned by a user in this match"""
        if self.user1_id == user_id:
            self.coins_earned_user1 += coins
        elif self.user2_id == user_id:
            self.coins_earned_user2 += coins
        else:
            raise ValueError(f"User {user_id} is not part of this match")

# Performance optimization indexes
Index('ix_matches_user_status', Match.user1_id, Match.user2_id, Match.status)
Index('ix_matches_status_created', Match.status, Match.created_at)
Index('ix_matches_active_users', Match.user1_id, Match.user2_id, Match.status, Match.created_at)
Index('ix_matches_compatibility_status', Match.compatibility_score, Match.status)
Index('ix_matches_expires_status', Match.expires_at, Match.status)
Index('ix_matches_conversation_starter', Match.conversation_starter_id, Match.starter_timeout_at)
Index('ix_matches_user1_status', Match.user1_id, Match.status, Match.created_at)
Index('ix_matches_user2_status', Match.user2_id, Match.status, Match.created_at) 