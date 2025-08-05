from sqlalchemy import Column, Integer, String, DateTime, Float, ForeignKey, JSON, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from core.database import Base

class QueueEntry(Base):
    __tablename__ = "queue_entries"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User relationship
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    
    # Queue status
    status = Column(String(20), default="waiting")  # waiting, processing, matched, expired
    
    # Priority and scoring
    priority_score = Column(Float, default=0.0)
    compatibility_preferences = Column(JSON, nullable=True)  # age_range, location, community
    
    # Time tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    processed_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Match tracking
    matched_with_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    match_id = Column(Integer, ForeignKey("matches.id"), nullable=True)
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])
    matched_user = relationship("User", foreign_keys=[matched_with_user_id])
    match = relationship("Match", foreign_keys=[match_id])
    
    def __repr__(self):
        return f"<QueueEntry(id={self.id}, user_id={self.user_id}, status='{self.status}')>"
    
    def is_expired(self):
        """Check if queue entry has expired (1 hour since creation)"""
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return datetime.utcnow() > (self.created_at + timedelta(hours=1))
    
    def is_processing(self):
        """Check if entry is currently being processed"""
        return self.status == "processing"
    
    def is_waiting(self):
        """Check if entry is waiting for match"""
        return self.status == "waiting"
    
    def is_matched(self):
        """Check if entry has been matched"""
        return self.status == "matched"
    
    def should_expire(self):
        """Check if entry should be marked as expired"""
        return self.is_expired() and self.status != "matched"
    
    def get_wait_time(self):
        """Get wait time in seconds"""
        if not self.created_at:
            return 0.0
        return (datetime.utcnow() - self.created_at).total_seconds()
    
    def update_priority_score(self, weights=None):
        """Update priority score based on wait time and other factors"""
        if weights is None:
            weights = {
                "wait_time": 0.4,
                "activity_score": 0.3,
                "compatibility": 0.3
            }
        
        wait_time_score = min(self.get_wait_time() / 3600, 1.0)  # Normalize to 1 hour
        activity_score = 0.5  # Default, could be calculated from user activity
        compatibility_score = 0.5  # Default, could be calculated from preferences
        
        self.priority_score = (
            wait_time_score * weights["wait_time"] +
            activity_score * weights["activity_score"] +
            compatibility_score * weights["compatibility"]
        ) 