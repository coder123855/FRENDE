from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from datetime import datetime

from fastapi_users import current_active_user
from models.user import User
from models.match import Match
from schemas.match import (
    MatchCreate, MatchRead, MatchUpdate, MatchListResponse,
    MatchRequestResponse, MatchAcceptRequest, MatchAcceptResponse,
    MatchRejectResponse, CompatibilityScore
)
from schemas.common import PaginationParams, SuccessResponse, ErrorResponse
from core.database import get_async_session
from core.exceptions import (
    UserNotFoundError, MatchNotFoundError, NoAvailableSlotsError, 
    MatchNotPendingError, UserNotInMatchError
)
from services.matching import matching_service
from services.users import user_service

router = APIRouter(prefix="/matches", tags=["matches"])

@router.post("/request", response_model=MatchRequestResponse)
async def request_match(
    match_request: MatchCreate,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Request a new match"""
    try:
        # Use a slot for matching
        slot_used = await user_service.use_slot(current_user.id, session)
        if not slot_used:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No available slots for matching"
            )
        
        # Create match request
        match = await matching_service.create_match_request(
            current_user.id,
            match_request.target_user_id,
            match_request.community,
            match_request.location,
            session
        )
        
        if not match:
            # No compatible user found, user is in queue
            return MatchRequestResponse(
                match=None,
                message="No compatible users found. You have been added to the matching queue."
            )
        
        return MatchRequestResponse(
            match=match,
            message="Match request created successfully"
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating match request: {str(e)}"
        )

@router.get("/", response_model=MatchListResponse)
async def list_matches(
    status: Optional[str] = Query(None, description="Filter by match status"),
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """List user's matches"""
    try:
        matches = await matching_service.get_user_matches(
            current_user.id, status, session
        )
        
        # Pagination
        total = len(matches)
        start_idx = (page - 1) * size
        end_idx = start_idx + size
        paginated_matches = matches[start_idx:end_idx]
        
        return MatchListResponse(
            matches=paginated_matches,
            total=total,
            page=page,
            size=size
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving matches: {str(e)}"
        )

@router.get("/{match_id}", response_model=MatchRead)
async def get_match(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get specific match details"""
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
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving match: {str(e)}"
        )

@router.put("/{match_id}/accept", response_model=MatchAcceptResponse)
async def accept_match(
    match_id: int,
    accept_request: MatchAcceptRequest,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Accept a match request"""
    try:
        if not accept_request.accept:
            # Reject the match
            match = await matching_service.reject_match(
                match_id, current_user.id, session
            )
            return MatchAcceptResponse(
                match=match,
                message="Match rejected successfully"
            )
        
        # Accept the match
        match = await matching_service.accept_match(
            match_id, current_user.id, session
        )
        
        return MatchAcceptResponse(
            match=match,
            message="Match accepted successfully"
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error accepting match: {str(e)}"
        )

@router.put("/{match_id}/reject", response_model=MatchRejectResponse)
async def reject_match(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Reject a match request"""
    try:
        match = await matching_service.reject_match(
            match_id, current_user.id, session
        )
        
        return MatchRejectResponse(
            message="Match rejected successfully"
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error rejecting match: {str(e)}"
        )

@router.delete("/{match_id}")
async def end_match(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """End/expire a match"""
    try:
        match = await matching_service.get_match_details(
            match_id, current_user.id, session
        )
        
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        # Update match status to expired
        match.status = "expired"
        match.completed_at = datetime.utcnow()
        await session.commit()
        
        return SuccessResponse(
            message="Match ended successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error ending match: {str(e)}"
        )

@router.get("/{match_id}/compatibility", response_model=CompatibilityScore)
async def get_match_compatibility(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get compatibility score for a match"""
    try:
        match = await matching_service.get_match_details(
            match_id, current_user.id, session
        )
        
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        # Calculate compatibility factors
        factors = {
            "age_compatibility": "high" if abs(match.user1.age - match.user2.age) <= 2 else "medium",
            "community_match": match.user1.community == match.user2.community,
            "location_match": match.user1.location == match.user2.location,
            "interests_overlap": await user_service._get_common_interests(
                match.user1, match.user2
            )
        }
        
        return CompatibilityScore(
            match_id=match_id,
            score=match.compatibility_score or 0,
            factors=factors,
            created_at=match.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating compatibility: {str(e)}"
        )

@router.get("/queue/status")
async def get_queue_status(
    current_user: User = Depends(current_active_user)
):
    """Get current user's position in matching queue"""
    try:
        # Check if user is in queue
        in_queue = current_user.id in matching_service.matching_queue
        position = matching_service.matching_queue.index(current_user.id) + 1 if in_queue else None
        
        return {
            "in_queue": in_queue,
            "position": position,
            "queue_length": len(matching_service.matching_queue),
            "available_slots": current_user.available_slots
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting queue status: {str(e)}"
        )

@router.post("/queue/leave")
async def leave_queue(
    current_user: User = Depends(current_active_user)
):
    """Leave the matching queue"""
    try:
        if current_user.id in matching_service.matching_queue:
            matching_service.matching_queue.remove(current_user.id)
        
        return SuccessResponse(
            message="Successfully left the matching queue"
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error leaving queue: {str(e)}"
        ) 