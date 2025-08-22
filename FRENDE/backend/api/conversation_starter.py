from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any
import logging

from core.database import get_async_session
from core.auth import current_active_user
from models.user import User
from services.conversation_starter import conversation_starter_service
from schemas.conversation_starter import (
    ConversationStarterResponse,
    ConversationStarterAssignResponse,
    ConversationStarterResetResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/conversation-starter", tags=["conversation_starter"])

@router.get("/matches/{match_id}", response_model=ConversationStarterResponse)
async def get_conversation_starter(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get current conversation starter for a match"""
    try:
        starter = await conversation_starter_service.get_conversation_starter(match_id, session)
        
        if not starter:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No conversation starter assigned to this match"
            )
        
        return ConversationStarterResponse(**starter)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting conversation starter: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get conversation starter"
        )

@router.post("/matches/{match_id}/assign", response_model=ConversationStarterAssignResponse)
async def assign_conversation_starter(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Assign a new conversation starter to a match"""
    try:
        # Validate user is in match
        from services.matching import matching_service
        match = await matching_service.get_match_details(match_id, current_user.id, session)
        
        if not match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not authorized for this match"
            )
        
        # Assign conversation starter
        result = await conversation_starter_service.assign_conversation_starter(match_id, session)
        
        return ConversationStarterAssignResponse(**result)
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error assigning conversation starter: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to assign conversation starter"
        )

@router.post("/matches/{match_id}/reset", response_model=ConversationStarterResetResponse)
async def reset_conversation_starter(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Reset conversation starter for a match"""
    try:
        # Validate user is in match
        from services.matching import matching_service
        match = await matching_service.get_match_details(match_id, current_user.id, session)
        
        if not match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not authorized for this match"
            )
        
        # Reset conversation starter
        result = await conversation_starter_service.reset_conversation_starter(match_id, session)
        
        return ConversationStarterResetResponse(**result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error resetting conversation starter: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to reset conversation starter"
        )

@router.post("/matches/{match_id}/check-timeout")
async def check_starter_timeout(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Check if conversation starter has timed out"""
    try:
        # Validate user is in match
        from services.matching import matching_service
        match = await matching_service.get_match_details(match_id, current_user.id, session)
        
        if not match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not authorized for this match"
            )
        
        # Check timeout
        timeout_result = await conversation_starter_service.check_starter_timeout(match_id, session)
        
        if timeout_result:
            return {
                "match_id": match_id,
                "timed_out": True,
                "starter_id": timeout_result["starter_id"],
                "timeout_at": timeout_result["timeout_at"],
                "timestamp": timeout_result["timestamp"]
            }
        else:
            return {
                "match_id": match_id,
                "timed_out": False
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error checking starter timeout: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check starter timeout"
        )

@router.post("/matches/{match_id}/mark-greeting-sent")
async def mark_greeting_sent(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Mark that a greeting has been sent for a match"""
    try:
        # Validate user is in match
        from services.matching import matching_service
        match = await matching_service.get_match_details(match_id, current_user.id, session)
        
        if not match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not authorized for this match"
            )
        
        # Mark greeting as sent
        success = await conversation_starter_service.mark_greeting_sent(match_id, session)
        
        if success:
            return {"message": "Greeting marked as sent successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to mark greeting as sent"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking greeting as sent: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark greeting as sent"
        )

@router.get("/default-greeting")
async def get_default_greeting(
    user_name: str,
    current_user: User = Depends(current_active_user)
):
    """Get the default greeting message for a user"""
    try:
        greeting = conversation_starter_service.get_default_greeting(user_name)
        return {
            "greeting": greeting,
            "user_name": user_name
        }
    except Exception as e:
        logger.error(f"Error getting default greeting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get default greeting"
        ) 