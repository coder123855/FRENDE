from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from core.auth import current_active_user
from core.database import get_async_session
from models.user import User
from models.match import Match
from models.task import Task
from schemas.user import UserRead, UserUpdate
from schemas.common import PaginationParams, SuccessResponse, ErrorResponse
from services.users import user_service
from services.matching import matching_service
from services.tasks import task_service

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/me", response_model=UserRead)
async def get_current_user_profile(
    current_user: User = Depends(current_active_user)
):
    """Get current user's profile"""
    return current_user

@router.put("/me", response_model=UserRead)
async def update_current_user_profile(
    profile_update: UserUpdate,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update current user's profile"""
    try:
        updated_user = await user_service.update_user_profile(
            current_user.id, profile_update, session
        )
        return updated_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/me/stats")
async def get_current_user_stats(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get current user's statistics"""
    try:
        stats = await user_service.get_user_stats(current_user.id, session)
        return stats
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )

@router.get("/me/matches")
async def get_current_user_matches(
    status: Optional[str] = Query(None, description="Filter by match status"),
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get current user's matches"""
    try:
        matches = await user_service.get_user_matches(
            current_user.id, status, session
        )
        return {
            "matches": matches,
            "total": len(matches)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving matches: {str(e)}"
        )

@router.get("/me/tasks")
async def get_current_user_tasks(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get current user's active tasks"""
    try:
        tasks = await user_service.get_user_tasks(current_user.id, session)
        return {
            "tasks": tasks,
            "total": len(tasks)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving tasks: {str(e)}"
        )

@router.post("/me/slots/purchase", response_model=UserRead)
async def purchase_slot(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Purchase an additional slot using coins"""
    try:
        updated_user = await user_service.purchase_slot(current_user.id, session)
        return updated_user
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.get("/me/slots")
async def get_slot_info(
    current_user: User = Depends(current_active_user)
):
    """Get current user's slot information"""
    return {
        "available_slots": current_user.available_slots,
        "total_slots_used": current_user.total_slots_used,
        "coins": current_user.coins,
        "slot_purchase_cost": user_service.slot_purchase_cost
    }

@router.get("/{user_id}", response_model=UserRead)
async def get_user_profile(
    user_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get public profile of another user"""
    if user_id == current_user.id:
        return current_user
    
    try:
        user = await user_service.get_user_profile(user_id, session)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Return public profile (exclude sensitive information)
        return {
            "id": user.id,
            "username": user.username,
            "name": user.name,
            "age": user.age,
            "profession": user.profession,
            "profile_picture_url": user.profile_picture_url,
            "profile_text": user.profile_text,
            "community": user.community,
            "location": user.location,
            "created_at": user.created_at,
            "is_active": user.is_active,
            "is_verified": user.is_verified
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving user profile: {str(e)}"
        )

@router.get("/search")
async def search_users(
    query: str = Query(..., min_length=1, description="Search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum number of results"),
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Search for users"""
    try:
        users = await user_service.search_users(query, current_user.id, session)
        return {
            "users": users[:limit],
            "total": len(users),
            "query": query
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error searching users: {str(e)}"
        )

@router.get("/compatible")
async def get_compatible_users(
    limit: int = Query(10, ge=1, le=20, description="Maximum number of results"),
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get compatible users for matching"""
    try:
        compatible_users = await user_service.get_compatible_users(
            current_user.id, limit, session
        )
        return {
            "compatible_users": compatible_users,
            "total": len(compatible_users)
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error finding compatible users: {str(e)}"
        )

@router.get("/me/matches/{match_id}")
async def get_match_details(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get detailed information about a specific match"""
    try:
        match = await matching_service.get_match_details(
            match_id, current_user.id, session
        )
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        return match
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving match details: {str(e)}"
        )

@router.get("/me/tasks/history")
async def get_task_history(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get current user's task completion history"""
    try:
        history = await task_service.get_task_history(current_user.id, session)
        return history
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving task history: {str(e)}"
        ) 