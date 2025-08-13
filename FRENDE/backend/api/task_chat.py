from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List
import logging
from datetime import datetime

from core.database import get_async_session
from core.auth import get_current_user
from models.user import User
from services.task_chat_integration import task_chat_integration_service
from services.task_notifications import task_notification_service
from schemas.task_chat import (
    TaskSubmissionRequest,
    TaskSubmissionResponse,
    TaskNotificationResponse,
    TaskStatusResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/task-chat", tags=["task_chat"])

@router.post("/matches/{match_id}/tasks/{task_id}/submit", response_model=TaskSubmissionResponse)
async def submit_task_via_chat(
    match_id: int,
    task_id: int,
    submission: TaskSubmissionRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Submit task completion via chat interface"""
    try:
        # Validate user is in match
        from services.matching import matching_service
        match = await matching_service.get_match_details(match_id, current_user.id, session)
        
        if not match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not authorized for this match"
            )
        
        # Submit task via chat
        result = await task_chat_integration_service.submit_task_via_chat(
            match_id,
            task_id,
            current_user.id,
            submission.submission_text,
            submission.evidence_url,
            session
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to submit task")
            )
        
        return TaskSubmissionResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error submitting task via chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to submit task via chat"
        )

@router.get("/matches/{match_id}/notifications", response_model=List[TaskNotificationResponse])
async def get_task_notifications(
    match_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get task notifications for a match"""
    try:
        # Validate user is in match
        from services.matching import matching_service
        match = await matching_service.get_match_details(match_id, current_user.id, session)
        
        if not match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not authorized for this match"
            )
        
        # Get task notifications
        notifications = await task_chat_integration_service.get_task_notifications(
            match_id, current_user.id, session
        )
        
        return [TaskNotificationResponse(**notification) for notification in notifications]
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get task notifications"
        )

@router.put("/matches/{match_id}/notifications/{notification_id}/read")
async def mark_notification_read(
    match_id: int,
    notification_id: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Mark a task notification as read"""
    try:
        # Validate user is in match
        from services.matching import matching_service
        match = await matching_service.get_match_details(match_id, current_user.id, session)
        
        if not match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not authorized for this match"
            )
        
        # Mark notification as read
        success = await task_chat_integration_service.mark_notification_read(
            notification_id, current_user.id, session
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to mark notification as read"
            )
        
        return {"message": "Notification marked as read successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark notification as read"
        )

@router.get("/matches/{match_id}/status", response_model=TaskStatusResponse)
async def get_task_status(
    match_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get current task status for a match"""
    try:
        # Validate user is in match
        from services.matching import matching_service
        match = await matching_service.get_match_details(match_id, current_user.id, session)
        
        if not match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not authorized for this match"
            )
        
        # Get task status
        status_data = await task_chat_integration_service.get_task_status(match_id, session)
        
        return TaskStatusResponse(**status_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting task status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get task status"
        )

@router.post("/matches/{match_id}/tasks/{task_id}/complete")
async def complete_task_via_chat(
    match_id: int,
    task_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Complete a task via chat interface"""
    try:
        # Validate user is in match
        from services.matching import matching_service
        match = await matching_service.get_match_details(match_id, current_user.id, session)
        
        if not match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not authorized for this match"
            )
        
        # Submit a simple completion
        result = await task_chat_integration_service.submit_task_via_chat(
            match_id,
            task_id,
            current_user.id,
            "Task completed via chat",
            None,
            session
        )
        
        if not result.get("success"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get("error", "Failed to complete task")
            )
        
        return {
            "success": True,
            "message": "Task completed successfully",
            "task_id": task_id,
            "completed_by": current_user.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error completing task via chat: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to complete task via chat"
        )

@router.post("/matches/{match_id}/tasks/{task_id}/notify")
async def send_task_notification(
    match_id: int,
    task_id: int,
    notification_type: str,
    message: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Send a task notification via chat"""
    try:
        # Validate user is in match
        from services.matching import matching_service
        match = await matching_service.get_match_details(match_id, current_user.id, session)
        
        if not match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not authorized for this match"
            )
        
        # Send task notification
        success = await task_chat_integration_service.send_task_notification(
            match_id, notification_type, task_id, message, session
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to send task notification"
            )
        
        return {"message": "Task notification sent successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending task notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send task notification"
        ) 