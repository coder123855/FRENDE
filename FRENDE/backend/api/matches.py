from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional

from core.database import get_async_session
from core.auth import current_active_user
from core.exceptions import UserNotFoundError, MatchNotFoundError, NoAvailableSlotsError, MatchNotPendingError
from models.user import User
from models.match import Match
from schemas.match import MatchCreate, MatchRead, MatchUpdate
from schemas.compatibility import (
    CompatibilityPreviewRequest, CompatibilityPreviewResponse, 
    CommunityLocationOptions, Community, Location, InterestCategory
)
from services.matching import matching_service

router = APIRouter(prefix="/matches", tags=["matches"])

@router.get("/", response_model=List[MatchRead])
async def get_matches(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
    status: Optional[str] = Query(None, description="Filter by match status"),
    limit: int = Query(10, ge=1, le=100, description="Number of matches to return"),
    offset: int = Query(0, ge=0, description="Number of matches to skip")
):
    """Get all matches for the current user"""
    try:
        matches = await matching_service.get_user_matches(
            user_id=current_user.id,
            session=session,
            status=status,
            limit=limit,
            offset=offset
        )
        return matches
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{match_id}", response_model=MatchRead)
async def get_match(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get a specific match by ID"""
    try:
        match = await matching_service.get_match(
            match_id=match_id,
            user_id=current_user.id,
            session=session
        )
        return match
    except MatchNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=MatchRead)
async def create_match(
    match_data: MatchCreate,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Create a new match request"""
    try:
        match = await matching_service.create_match(
            user_id=current_user.id,
            match_data=match_data,
            session=session
        )
        return match
    except NoAvailableSlotsError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{match_id}/accept", response_model=MatchRead)
async def accept_match(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Accept a match request"""
    try:
        match = await matching_service.accept_match(
            match_id=match_id,
            user_id=current_user.id,
            session=session
        )
        return match
    except (MatchNotFoundError, MatchNotPendingError) as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{match_id}/reject", response_model=MatchRead)
async def reject_match(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Reject a match request"""
    try:
        match = await matching_service.reject_match(
            match_id=match_id,
            user_id=current_user.id,
            session=session
        )
        return match
    except (MatchNotFoundError, MatchNotPendingError) as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{match_id}")
async def delete_match(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Delete a match"""
    try:
        await matching_service.delete_match(
            match_id=match_id,
            user_id=current_user.id,
            session=session
        )
        return {"message": "Match deleted successfully"}
    except MatchNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/compatibility/options", response_model=CommunityLocationOptions)
async def get_compatibility_options():
    """Get available community, location, and interest options"""
    return CommunityLocationOptions(
        communities=[community.value for community in Community],
        locations=[location.value for location in Location],
        interest_categories=[interest.value for interest in InterestCategory]
    )

@router.post("/compatibility/preview", response_model=CompatibilityPreviewResponse)
async def preview_compatibility(
    request: CompatibilityPreviewRequest,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Preview compatibility with another user"""
    try:
        # Get target user
        result = await session.execute(
            select(User).where(User.id == request.target_user_id)
        )
        target_user = result.scalar_one_or_none()
        
        if not target_user:
            raise HTTPException(status_code=404, detail="Target user not found")
        
        # Calculate compatibility
        compatibility_result = await matching_service._calculate_compatibility(
            current_user.id, target_user.id, session
        )
        
        # Convert target user to dict for response
        target_user_dict = {
            "id": target_user.id,
            "email": target_user.email,
            "username": target_user.username,
            "name": target_user.name,
            "age": target_user.age,
            "profession": target_user.profession,
            "profile_picture_url": target_user.profile_picture_url,
            "profile_text": target_user.profile_text,
            "community": target_user.community,
            "location": target_user.location,
            "interests": target_user.interests,
            "age_preference_min": target_user.age_preference_min,
            "age_preference_max": target_user.age_preference_max,
            "available_slots": target_user.available_slots,
            "total_slots_used": target_user.total_slots_used,
            "coins": target_user.coins,
            "slot_reset_time": target_user.slot_reset_time,
            "last_slot_purchase": target_user.last_slot_purchase,
            "is_active": target_user.is_active,
            "is_verified": target_user.is_verified,
            "created_at": target_user.created_at,
            "updated_at": target_user.updated_at
        }
        
        return CompatibilityPreviewResponse(
            target_user=target_user_dict,
            compatibility=compatibility_result
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 