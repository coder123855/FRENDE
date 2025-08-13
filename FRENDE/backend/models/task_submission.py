from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from datetime import datetime
from enum import Enum

from core.database import Base

class SubmissionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class TaskSubmission(Base):
    __tablename__ = "task_submissions"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Task and user relationships
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Submission content
    submission_text = Column(Text, nullable=True)
    submission_evidence_url = Column(String(500), nullable=True)
    submission_evidence_type = Column(String(50), nullable=True)  # image, video, link, text
    
    # Status tracking
    submission_status = Column(String(20), default=SubmissionStatus.PENDING)
    submitted_at = Column(DateTime(timezone=True), server_default=func.now())
    validated_at = Column(DateTime(timezone=True), nullable=True)
    validator_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    validation_notes = Column(Text, nullable=True)
    
    # Validation workflow
    requires_validation = Column(Boolean, default=False)
    validation_deadline = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    task = relationship("Task", back_populates="submissions")
    user = relationship("User", foreign_keys=[user_id])
    validator = relationship("User", foreign_keys=[validator_id])
    
    def __repr__(self):
        return f"<TaskSubmission(id={self.id}, task_id={self.task_id}, user_id={self.user_id}, status='{self.submission_status}')>"
    
    def is_pending(self) -> bool:
        """Check if submission is pending validation"""
        return self.submission_status == SubmissionStatus.PENDING
    
    def is_approved(self) -> bool:
        """Check if submission is approved"""
        return self.submission_status == SubmissionStatus.APPROVED
    
    def is_rejected(self) -> bool:
        """Check if submission is rejected"""
        return self.submission_status == SubmissionStatus.REJECTED
    
    def can_be_validated_by(self, validator_id: int) -> bool:
        """Check if a user can validate this submission"""
        # Users can't validate their own submissions
        if validator_id == self.user_id:
            return False
        
        # Only pending submissions can be validated
        if self.submission_status != SubmissionStatus.PENDING:
            return False
        
        # Check if validation deadline has passed
        if self.validation_deadline and datetime.utcnow() > self.validation_deadline:
            return False
        
        return True
    
    def to_dict(self) -> dict:
        """Convert submission to dictionary"""
        return {
            'id': self.id,
            'task_id': self.task_id,
            'user_id': self.user_id,
            'submission_text': self.submission_text,
            'submission_evidence_url': self.submission_evidence_url,
            'submission_evidence_type': self.submission_evidence_type,
            'submission_status': self.submission_status,
            'submitted_at': self.submitted_at.isoformat() if self.submitted_at else None,
            'validated_at': self.validated_at.isoformat() if self.validated_at else None,
            'validator_id': self.validator_id,
            'validation_notes': self.validation_notes,
            'requires_validation': self.requires_validation,
            'validation_deadline': self.validation_deadline.isoformat() if self.validation_deadline else None
        } 