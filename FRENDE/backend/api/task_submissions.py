from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import logging

from core.auth import current_active_user
from core.database import get_async_session
from models.user import User
from schemas.task_submission import (
    TaskSubmissionRequest, TaskSubmissionResponse, TaskValidationRequest,
    TaskValidationResponse, SubmissionDetailsResponse, PendingValidationResponse,
    SubmissionStatisticsResponse, EvidenceUploadRequest, EvidenceUploadResponse,
    SubmissionListResponse
)
from services.task_submission import task_submission_service
from core.exceptions import TaskNotFoundError, ValidationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks/submissions", tags=["task_submissions"])

@router.post("/{task_id}/submit", response_model=TaskSubmissionResponse)
async def submit_task_completion(
    task_id: int,
    submission_data: TaskSubmissionRequest,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Submit a task completion with optional evidence"""
    try:
        submission = await task_submission_service.submit_task_completion(
            task_id, current_user.id, submission_data.dict(), session
        )
        
        return TaskSubmissionResponse(
            submission_id=submission.id,
            task_id=submission.task_id,
            user_id=submission.user_id,
            submission_text=submission.submission_text,
            submission_evidence_url=submission.submission_evidence_url,
            submission_evidence_type=submission.submission_evidence_type,
            submission_status=submission.submission_status,
            submitted_at=submission.submitted_at,
            requires_validation=submission.requires_validation,
            validation_deadline=submission.validation_deadline
        )
    except TaskNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error submitting task completion: {str(e)}"
        )

@router.post("/{submission_id}/validate", response_model=TaskValidationResponse)
async def validate_submission(
    submission_id: int,
    validation_data: TaskValidationRequest,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Validate a task submission"""
    try:
        submission = await task_submission_service.validate_submission(
            submission_id, current_user.id, validation_data.dict(), session
        )
        
        return TaskValidationResponse(
            submission_id=submission.id,
            validator_id=submission.validator_id,
            status=submission.submission_status,
            notes=submission.validation_notes,
            validated_at=submission.validated_at
        )
    except TaskNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error validating submission: {str(e)}"
        )

@router.get("/{submission_id}", response_model=SubmissionDetailsResponse)
async def get_submission_details(
    submission_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get detailed information about a submission"""
    try:
        submission = await task_submission_service.get_submission_details(submission_id, session)
        
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Submission not found"
            )
        
        # Get task and user details
        task = submission.task
        user = submission.user
        validator = submission.validator if submission.validator_id else None
        
        return SubmissionDetailsResponse(
            id=submission.id,
            task_id=submission.task_id,
            user_id=submission.user_id,
            submission_text=submission.submission_text,
            submission_evidence_url=submission.submission_evidence_url,
            submission_evidence_type=submission.submission_evidence_type,
            submission_status=submission.submission_status,
            submitted_at=submission.submitted_at,
            validated_at=submission.validated_at,
            validator_id=submission.validator_id,
            validation_notes=submission.validation_notes,
            requires_validation=submission.requires_validation,
            validation_deadline=submission.validation_deadline,
            task_title=task.title,
            task_description=task.description,
            task_difficulty=task.difficulty.value,
            user_name=user.name or user.username or f"User {user.id}",
            validator_name=validator.name if validator else None
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching submission details: {str(e)}"
        )

@router.get("/pending", response_model=List[PendingValidationResponse])
async def get_pending_validations(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get pending validations that the user can review"""
    try:
        submissions = await task_submission_service.get_pending_validations(current_user.id, session)
        
        pending_validations = []
        for submission in submissions:
            task = submission.task
            user = submission.user
            
            pending_validations.append(PendingValidationResponse(
                submission_id=submission.id,
                task_id=submission.task_id,
                task_title=task.title,
                task_description=task.description,
                submitter_id=submission.user_id,
                submitter_name=user.name or user.username or f"User {user.id}",
                submission_text=submission.submission_text,
                submission_evidence_url=submission.submission_evidence_url,
                submission_evidence_type=submission.submission_evidence_type,
                submitted_at=submission.submitted_at,
                validation_deadline=submission.validation_deadline
            ))
        
        return pending_validations
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching pending validations: {str(e)}"
        )

@router.get("/user", response_model=SubmissionListResponse)
async def get_user_submissions(
    status: Optional[str] = Query(None, description="Filter by submission status"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get all submissions by the current user"""
    try:
        submissions = await task_submission_service.get_user_submissions(current_user.id, session, status)
        
        # Pagination
        total = len(submissions)
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        paginated_submissions = submissions[start_idx:end_idx]
        
        # Convert to response format
        submission_details = []
        for submission in paginated_submissions:
            task = submission.task
            user = submission.user
            validator = submission.validator if submission.validator_id else None
            
            submission_details.append(SubmissionDetailsResponse(
                id=submission.id,
                task_id=submission.task_id,
                user_id=submission.user_id,
                submission_text=submission.submission_text,
                submission_evidence_url=submission.submission_evidence_url,
                submission_evidence_type=submission.submission_evidence_type,
                submission_status=submission.submission_status,
                submitted_at=submission.submitted_at,
                validated_at=submission.validated_at,
                validator_id=submission.validator_id,
                validation_notes=submission.validation_notes,
                requires_validation=submission.requires_validation,
                validation_deadline=submission.validation_deadline,
                task_title=task.title,
                task_description=task.description,
                task_difficulty=task.difficulty.value,
                user_name=user.name or user.username or f"User {user.id}",
                validator_name=validator.name if validator else None
            ))
        
        return SubmissionListResponse(
            submissions=submission_details,
            total=total,
            page=page,
            size=size
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching user submissions: {str(e)}"
        )

@router.get("/statistics", response_model=SubmissionStatisticsResponse)
async def get_submission_statistics(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get submission statistics for the current user"""
    try:
        stats = await task_submission_service.get_submission_statistics(current_user.id, session)
        
        return SubmissionStatisticsResponse(
            user_id=stats['user_id'],
            total_submissions=stats['total_submissions'],
            pending_submissions=stats['pending_submissions'],
            approved_submissions=stats['approved_submissions'],
            rejected_submissions=stats['rejected_submissions'],
            approval_rate=stats['approval_rate']
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching submission statistics: {str(e)}"
        )

@router.post("/{submission_id}/upload", response_model=EvidenceUploadResponse)
async def upload_evidence(
    submission_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Upload evidence file for a submission"""
    try:
        # Read file data
        file_data = await file.read()
        
        # Upload evidence
        file_url = await task_submission_service.upload_submission_evidence(
            submission_id, file_data, file.filename, file.content_type, session
        )
        
        return EvidenceUploadResponse(
            submission_id=submission_id,
            file_url=file_url,
            file_type=file.content_type,
            upload_successful=True
        )
    except ValidationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except TaskNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading evidence: {str(e)}"
        ) 