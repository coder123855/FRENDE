from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, List
import logging
from datetime import datetime

from core.database import get_async_session
from core.auth import current_active_user
from models.user import User
from services.automatic_greeting import automatic_greeting_service
from services.default_greeting import default_greeting_service
from schemas.automatic_greeting import (
    GreetingStatusResponse,
    AutomaticGreetingResponse,
    PendingTimeoutsResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/automatic-greeting", tags=["automatic_greeting"])

@router.get("/matches/{match_id}/status", response_model=GreetingStatusResponse)
async def get_greeting_status(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get automatic greeting status for a match"""
    try:
        # Validate user is in match
        from services.matching import matching_service
        match = await matching_service.get_match_details(match_id, current_user.id, session)
        
        if not match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not authorized for this match"
            )
        
        # Get greeting status
        status_data = await automatic_greeting_service.get_greeting_status(match_id, session)
        
        if "error" in status_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=status_data["error"]
            )
        
        return GreetingStatusResponse(**status_data)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting greeting status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get greeting status"
        )

@router.post("/matches/{match_id}/send-automatic")
async def send_automatic_greeting(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Manually trigger automatic greeting for a match"""
    try:
        # Validate user is in match
        from services.matching import matching_service
        match = await matching_service.get_match_details(match_id, current_user.id, session)
        
        if not match:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User not authorized for this match"
            )
        
        # Check if greeting is already sent
        status_data = await automatic_greeting_service.get_greeting_status(match_id, session)
        if status_data.get("greeting_sent"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Greeting already sent for this match"
            )
        
        # Send automatic greeting
        greeting_result = await automatic_greeting_service._send_automatic_greeting(match, session)
        
        if greeting_result:
            return {
                "success": True,
                "message": "Automatic greeting sent successfully",
                "greeting": greeting_result
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to send automatic greeting"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending automatic greeting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send automatic greeting"
        )

@router.post("/matches/{match_id}/mark-sent")
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
        success = await automatic_greeting_service.mark_greeting_sent(match_id, session)
        
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

@router.get("/pending-timeouts", response_model=PendingTimeoutsResponse)
async def get_pending_timeouts(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get list of matches with pending timeouts (admin only)"""
    try:
        # Check if user is admin (you might want to add admin role checking)
        # For now, allow any authenticated user
        
        # Get pending timeouts
        pending_timeouts = await automatic_greeting_service.get_pending_timeouts(session)
        
        return PendingTimeoutsResponse(
            pending_timeouts=pending_timeouts,
            total_count=len(pending_timeouts)
        )
        
    except Exception as e:
        logger.error(f"Error getting pending timeouts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get pending timeouts"
        )

@router.post("/check-timeouts")
async def check_timeouts_manually(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Manually check and handle timeouts (admin only)"""
    try:
        # Check for timed out conversation starters and send automatic greetings
        handled_greetings = await automatic_greeting_service.check_and_handle_timeouts(session)
        
        return {
            "success": True,
            "message": f"Handled {len(handled_greetings)} automatic greetings",
            "handled_greetings": handled_greetings
        }
        
    except Exception as e:
        logger.error(f"Error checking timeouts: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to check timeouts"
        )

@router.get("/default-greeting/{user_name}")
async def get_default_greeting(
    user_name: str,
    template_id: str = None,
    current_user: User = Depends(current_active_user)
):
    """Get default greeting for a user"""
    try:
        # Sanitize user name
        sanitized_name = default_greeting_service.sanitize_user_name(user_name)
        
        # Get default greeting
        greeting = default_greeting_service.get_default_greeting(sanitized_name, template_id)
        
        return {
            "greeting": greeting,
            "user_name": sanitized_name,
            "template_id": template_id or "default"
        }
        
    except Exception as e:
        logger.error(f"Error getting default greeting: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get default greeting"
        )

@router.get("/templates")
async def get_greeting_templates(
    current_user: User = Depends(current_active_user)
):
    """Get all available greeting templates"""
    try:
        templates = default_greeting_service.get_all_templates()
        
        return {
            "templates": templates,
            "total_count": len(templates)
        }
        
    except Exception as e:
        logger.error(f"Error getting greeting templates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get greeting templates"
        )

@router.get("/templates/{template_id}")
async def get_greeting_template(
    template_id: str,
    current_user: User = Depends(current_active_user)
):
    """Get a specific greeting template"""
    try:
        template = default_greeting_service.get_template_by_id(template_id)
        
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        return template
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting greeting template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get greeting template"
        )

@router.get("/statistics")
async def get_greeting_statistics(
    current_user: User = Depends(current_active_user)
):
    """Get greeting system statistics"""
    try:
        stats = default_greeting_service.get_greeting_statistics()
        
        return {
            "statistics": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error getting greeting statistics: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get greeting statistics"
        ) 