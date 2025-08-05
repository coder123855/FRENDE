from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta
from core.database import Base

class MatchRequest(Base):
    __tablename__ = "match_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # User relationships
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    receiver_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Request details
    status = Column(String(20), default="pending")  # pending, accepted, declined, expired
    message = Column(Text, nullable=True)
    compatibility_score = Column(Integer, nullable=True)
    
    # Time tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=True)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id])
    receiver = relationship("User", foreign_keys=[receiver_id])
    
    def __repr__(self):
        return f"<MatchRequest(id={self.id}, sender_id={self.sender_id}, receiver_id={self.receiver_id}, status='{self.status}')>"
    
    def is_expired(self):
        """Check if request has expired (24 hours since creation)"""
        if self.expires_at:
            return datetime.utcnow() > self.expires_at
        return datetime.utcnow() > (self.created_at + timedelta(hours=24))
    
    def should_expire(self):
        """Check if request should be marked as expired"""
        return self.is_expired() and self.status == "pending" 