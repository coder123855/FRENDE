from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Dict, List, Optional
from datetime import datetime, timedelta
import logging
import uuid
import os

from models.task import Task
from models.task_submission import TaskSubmission, SubmissionStatus
from models.user import User
from models.match import Match
from core.exceptions import TaskNotFoundError, UserNotInMatchError, ValidationError

logger = logging.getLogger(__name__)

class TaskSubmissionService:
    """Service for handling task submissions and validations"""
    
    def __init__(self):
        self.upload_dir = "uploads/submissions"
        self.allowed_file_types = {
            'image': ['.jpg', '.jpeg', '.png', '.gif'],
            'video': ['.mp4', '.avi', '.mov', '.wmv'],
            'document': ['.pdf', '.doc', '.docx', '.txt']
        }
        self.max_file_size = 10 * 1024 * 1024  # 10MB
    
    async def submit_task_completion(
        self, 
        task_id: int, 
        user_id: int, 
        submission_data: Dict,
        session: AsyncSession
    ) -> TaskSubmission:
        """Submit a task completion with optional evidence"""
        
        # Verify task exists and user is part of the match
        task = await self._get_task_with_match(task_id, user_id, session)
        if not task:
            raise TaskNotFoundError(f"Task {task_id} not found or user not authorized")
        
        # Check if user already submitted
        existing_submission = await self._get_user_submission(task_id, user_id, session)
        if existing_submission:
            raise ValidationError("User has already submitted for this task")
        
        # Create submission
        submission = TaskSubmission(
            task_id=task_id,
            user_id=user_id,
            submission_text=submission_data.get('submission_text'),
            submission_evidence_url=submission_data.get('submission_evidence_url'),
            submission_evidence_type=submission_data.get('submission_evidence_type'),
            requires_validation=task.requires_validation,
            validation_deadline=datetime.utcnow() + timedelta(days=7) if task.requires_validation else None
        )
        
        session.add(submission)
        await session.commit()
        await session.refresh(submission)
        
        logger.info(f"Task submission created: {submission.id} for task {task_id} by user {user_id}")
        return submission
    
    async def validate_submission(
        self, 
        submission_id: int, 
        validator_id: int, 
        validation_data: Dict,
        session: AsyncSession
    ) -> TaskSubmission:
        """Validate a task submission"""
        
        # Get submission
        result = await session.execute(
            select(TaskSubmission).where(TaskSubmission.id == submission_id)
        )
        submission = result.scalar_one_or_none()
        
        if not submission:
            raise TaskNotFoundError(f"Submission {submission_id} not found")
        
        # Check if validator can validate this submission
        if not submission.can_be_validated_by(validator_id):
            raise ValidationError("Cannot validate this submission")
        
        # Update submission status
        submission.submission_status = validation_data.get('status', 'approved')
        submission.validated_at = datetime.utcnow()
        submission.validator_id = validator_id
        submission.validation_notes = validation_data.get('notes')
        
        await session.commit()
        await session.refresh(submission)
        
        logger.info(f"Submission {submission_id} validated by user {validator_id}")
        return submission
    
    async def get_submission_details(
        self, 
        submission_id: int, 
        session: AsyncSession
    ) -> Optional[TaskSubmission]:
        """Get detailed information about a submission"""
        
        result = await session.execute(
            select(TaskSubmission).where(TaskSubmission.id == submission_id)
        )
        return result.scalar_one_or_none()
    
    async def get_pending_validations(
        self, 
        user_id: int, 
        session: AsyncSession
    ) -> List[TaskSubmission]:
        """Get pending validations that a user can review"""
        
        # Get submissions from matches where user is involved but not the submitter
        result = await session.execute(
            select(TaskSubmission)
            .join(Task)
            .join(Match)
            .where(
                ((Match.user1_id == user_id) | (Match.user2_id == user_id)),
                TaskSubmission.user_id != user_id,
                TaskSubmission.submission_status == SubmissionStatus.PENDING,
                TaskSubmission.requires_validation == True
            )
        )
        
        return result.scalars().all()
    
    async def get_user_submissions(
        self, 
        user_id: int, 
        session: AsyncSession,
        status: Optional[str] = None
    ) -> List[TaskSubmission]:
        """Get all submissions by a user"""
        
        query = select(TaskSubmission).where(TaskSubmission.user_id == user_id)
        
        if status:
            query = query.where(TaskSubmission.submission_status == status)
        
        result = await session.execute(query)
        return result.scalars().all()
    
    async def upload_submission_evidence(
        self, 
        submission_id: int, 
        file_data: bytes,
        file_name: str,
        file_type: str,
        session: AsyncSession
    ) -> str:
        """Upload evidence file for a submission"""
        
        # Validate file type
        if file_type not in self.allowed_file_types:
            raise ValidationError(f"File type {file_type} not allowed")
        
        # Validate file size
        if len(file_data) > self.max_file_size:
            raise ValidationError(f"File size exceeds maximum of {self.max_file_size} bytes")
        
        # Generate unique filename
        file_extension = os.path.splitext(file_name)[1]
        unique_filename = f"{uuid.uuid4()}{file_extension}"
        
        # Ensure upload directory exists
        os.makedirs(self.upload_dir, exist_ok=True)
        
        # Save file
        file_path = os.path.join(self.upload_dir, unique_filename)
        with open(file_path, 'wb') as f:
            f.write(file_data)
        
        # Update submission with file URL
        result = await session.execute(
            update(TaskSubmission)
            .where(TaskSubmission.id == submission_id)
            .values(
                submission_evidence_url=f"/uploads/submissions/{unique_filename}",
                submission_evidence_type=file_type
            )
            .returning(TaskSubmission.submission_evidence_url)
        )
        
        file_url = result.scalar_one()
        await session.commit()
        
        logger.info(f"Evidence uploaded for submission {submission_id}: {file_url}")
        return file_url
    
    async def get_submission_statistics(
        self, 
        user_id: int, 
        session: AsyncSession
    ) -> Dict:
        """Get submission statistics for a user"""
        
        # Get all user submissions
        submissions = await self.get_user_submissions(user_id, session)
        
        # Calculate statistics
        total_submissions = len(submissions)
        pending_submissions = len([s for s in submissions if s.is_pending()])
        approved_submissions = len([s for s in submissions if s.is_approved()])
        rejected_submissions = len([s for s in submissions if s.is_rejected()])
        
        # Calculate approval rate
        approval_rate = (approved_submissions / total_submissions * 100) if total_submissions > 0 else 0
        
        return {
            'user_id': user_id,
            'total_submissions': total_submissions,
            'pending_submissions': pending_submissions,
            'approved_submissions': approved_submissions,
            'rejected_submissions': rejected_submissions,
            'approval_rate': round(approval_rate, 2)
        }
    
    async def _get_task_with_match(
        self, 
        task_id: int, 
        user_id: int, 
        session: AsyncSession
    ) -> Optional[Task]:
        """Get task and verify user is part of the match"""
        
        result = await session.execute(
            select(Task)
            .join(Match)
            .where(
                Task.id == task_id,
                (Match.user1_id == user_id) | (Match.user2_id == user_id)
            )
        )
        
        return result.scalar_one_or_none()
    
    async def _get_user_submission(
        self, 
        task_id: int, 
        user_id: int, 
        session: AsyncSession
    ) -> Optional[TaskSubmission]:
        """Get existing submission by user for a task"""
        
        result = await session.execute(
            select(TaskSubmission).where(
                TaskSubmission.task_id == task_id,
                TaskSubmission.user_id == user_id
            )
        )
        
        return result.scalar_one_or_none()

# Global instance
task_submission_service = TaskSubmissionService() 