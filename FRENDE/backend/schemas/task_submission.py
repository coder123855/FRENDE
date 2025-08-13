from typing import Optional, List, Dict
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum

class SubmissionStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class EvidenceType(str, Enum):
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"
    LINK = "link"
    TEXT = "text"

class TaskSubmissionRequest(BaseModel):
    """Schema for task submission request"""
    submission_text: Optional[str] = Field(None, max_length=1000, description="Text description of completion")
    submission_evidence_url: Optional[str] = Field(None, description="URL to evidence (image, video, document)")
    submission_evidence_type: Optional[EvidenceType] = Field(None, description="Type of evidence provided")

class TaskSubmissionResponse(BaseModel):
    """Schema for task submission response"""
    submission_id: int
    task_id: int
    user_id: int
    submission_text: Optional[str]
    submission_evidence_url: Optional[str]
    submission_evidence_type: Optional[str]
    submission_status: SubmissionStatus
    submitted_at: datetime
    requires_validation: bool
    validation_deadline: Optional[datetime]
    message: str = "Task submission created successfully"

class TaskValidationRequest(BaseModel):
    """Schema for task validation request"""
    status: SubmissionStatus = Field(..., description="Approval or rejection status")
    notes: Optional[str] = Field(None, max_length=500, description="Validation notes or feedback")

class TaskValidationResponse(BaseModel):
    """Schema for task validation response"""
    submission_id: int
    validator_id: int
    status: SubmissionStatus
    notes: Optional[str]
    validated_at: datetime
    message: str = "Task validation completed successfully"

class SubmissionDetailsResponse(BaseModel):
    """Schema for detailed submission information"""
    id: int
    task_id: int
    user_id: int
    submission_text: Optional[str]
    submission_evidence_url: Optional[str]
    submission_evidence_type: Optional[str]
    submission_status: SubmissionStatus
    submitted_at: datetime
    validated_at: Optional[datetime]
    validator_id: Optional[int]
    validation_notes: Optional[str]
    requires_validation: bool
    validation_deadline: Optional[datetime]
    
    # Task information
    task_title: str
    task_description: str
    task_difficulty: str
    
    # User information
    user_name: str
    validator_name: Optional[str]

class PendingValidationResponse(BaseModel):
    """Schema for pending validation response"""
    submission_id: int
    task_id: int
    task_title: str
    task_description: str
    submitter_id: int
    submitter_name: str
    submission_text: Optional[str]
    submission_evidence_url: Optional[str]
    submission_evidence_type: Optional[str]
    submitted_at: datetime
    validation_deadline: Optional[datetime]

class SubmissionStatisticsResponse(BaseModel):
    """Schema for submission statistics response"""
    user_id: int
    total_submissions: int
    pending_submissions: int
    approved_submissions: int
    rejected_submissions: int
    approval_rate: float

class EvidenceUploadRequest(BaseModel):
    """Schema for evidence upload request"""
    file_name: str = Field(..., description="Original filename")
    file_type: EvidenceType = Field(..., description="Type of evidence file")
    file_size: int = Field(..., ge=1, le=10*1024*1024, description="File size in bytes")

class EvidenceUploadResponse(BaseModel):
    """Schema for evidence upload response"""
    submission_id: int
    file_url: str
    file_type: str
    upload_successful: bool
    message: str = "Evidence uploaded successfully"

class SubmissionListResponse(BaseModel):
    """Schema for submission list response"""
    submissions: List[SubmissionDetailsResponse]
    total: int
    page: int
    size: int 