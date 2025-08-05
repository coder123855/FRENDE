from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any, Optional

from core.database import get_async_session
from core.auth import current_active_user
from core.exceptions import UserNotFoundError, NoAvailableSlotsError
from models.user import User
from services.queue_manager import queue_manager
from schemas.queue import QueueJoinRequest, QueueStatusResponse, QueuePreferences

router = APIRouter(prefix="/queue", tags=["queue"])

@router.post("/join", response_model=QueueStatusResponse)
async def join_queue(
    request: QueueJoinRequest,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Join the matching queue"""
    try:
        # Extract preferences from request
        preferences = None
        if request.preferences:
            preferences = {
                "age_range": {
                    "min": request.preferences.age_preference_min,
                    "max": request.preferences.age_preference_max
                },
                "location": request.preferences.location,
                "community": request.preferences.community,
                "interests": request.preferences.interests
            }
        
        # Add user to queue
        queue_entry = await queue_manager.add_to_queue(
            user_id=current_user.id,
            preferences=preferences,
            session=session
        )
        
        # Get queue status
        status_info = await queue_manager.get_queue_status(
            user_id=current_user.id,
            session=session
        )
        
        return QueueStatusResponse(**status_info)
        
    except NoAvailableSlotsError as e:
        raise HTTPException(
            status_code=400,
            detail=f"No available slots: {str(e)}"
        )
    except UserNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to join queue: {str(e)}"
        )

@router.delete("/leave")
async def leave_queue(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Leave the matching queue"""
    try:
        removed = await queue_manager.remove_from_queue(
            user_id=current_user.id,
            session=session
        )
        
        if removed:
            return {"message": "Successfully left the queue"}
        else:
            return {"message": "Not currently in queue"}
            
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to leave queue: {str(e)}"
        )

@router.get("/status", response_model=QueueStatusResponse)
async def get_queue_status(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get current queue status for the user"""
    try:
        status_info = await queue_manager.get_queue_status(
            user_id=current_user.id,
            session=session
        )
        
        if not status_info:
            raise HTTPException(
                status_code=404,
                detail="User not found in queue"
            )
        
        return QueueStatusResponse(**status_info)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get queue status: {str(e)}"
        )

@router.put("/preferences", response_model=QueueStatusResponse)
async def update_queue_preferences(
    preferences: QueuePreferences,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update queue preferences"""
    try:
        # Convert preferences to dict format
        preferences_dict = {
            "age_range": {
                "min": preferences.age_preference_min,
                "max": preferences.age_preference_max
            },
            "location": preferences.location,
            "community": preferences.community,
            "interests": preferences.interests
        }
        
        # Update queue entry with new preferences
        queue_entry = await queue_manager.add_to_queue(
            user_id=current_user.id,
            preferences=preferences_dict,
            session=session
        )
        
        # Get updated status
        status_info = await queue_manager.get_queue_status(
            user_id=current_user.id,
            session=session
        )
        
        return QueueStatusResponse(**status_info)
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update queue preferences: {str(e)}"
        )

@router.get("/stats")
async def get_queue_statistics(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get queue statistics (for monitoring)"""
    try:
        from services.background_tasks import background_processor
        
        # Get queue statistics
        stats = await background_processor._get_queue_statistics(session)
        
        return {
            "queue_statistics": stats,
            "timestamp": stats["timestamp"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get queue statistics: {str(e)}"
        )

@router.post("/process")
async def process_queue_manual(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Manually trigger queue processing (admin function)"""
    try:
        # Check if user is admin (you might want to add admin role checking)
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=403,
                detail="Only administrators can manually process queue"
            )
        
        # Process queue batch
        matches = await queue_manager.process_queue_batch(session)
        
        return {
            "message": f"Queue processed successfully",
            "matches_created": len(matches),
            "matches": [
                {
                    "id": match.id,
                    "user1_id": match.user1_id,
                    "user2_id": match.user2_id,
                    "status": match.status
                }
                for match in matches
            ]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process queue: {str(e)}"
        ) 