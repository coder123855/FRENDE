from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from core.database import get_async_session
from core.auth import current_active_user
from core.exceptions import (
    UserNotFoundError, MatchRequestNotFoundError, NoAvailableSlotsError, 
    DuplicateRequestError, MatchNotPendingError
)
from models.user import User
from models.match_request import MatchRequest
from schemas.match_request import (
    MatchRequestCreate, MatchRequestRead, MatchRequestUpdate, 
    MatchRequestResponse, MatchRequestListResponse
)
from services.match_request import match_request_service

router = APIRouter(prefix="/match-requests", tags=["match-requests"])

@router.post("/", response_model=MatchRequestResponse)
async def create_match_request(
    request_data: MatchRequestCreate,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Create a new match request"""
    try:
        match_request = await match_request_service.create_match_request(
            sender_id=current_user.id,
            receiver_id=request_data.receiver_id,
            message=request_data.message,
            session=session
        )
        
        # Convert to response schema with user details
        response_data = await _enrich_match_request(match_request, session)
        
        return MatchRequestResponse(
            request=response_data,
            message="Match request sent successfully"
        )
    except (UserNotFoundError, NoAvailableSlotsError, DuplicateRequestError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/received", response_model=List[MatchRequestRead])
async def get_received_requests(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
    limit: int = Query(10, ge=1, le=100, description="Number of requests to return"),
    offset: int = Query(0, ge=0, description="Number of requests to skip")
):
    """Get match requests received by the current user"""
    try:
        requests = await match_request_service.get_received_requests(
            user_id=current_user.id,
            session=session
        )
        
        # Apply pagination
        paginated_requests = requests[offset:offset + limit]
        
        # Enrich with user details
        enriched_requests = []
        for request in paginated_requests:
            enriched_request = await _enrich_match_request(request, session)
            enriched_requests.append(enriched_request)
        
        return enriched_requests
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sent", response_model=List[MatchRequestRead])
async def get_sent_requests(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session),
    limit: int = Query(10, ge=1, le=100, description="Number of requests to return"),
    offset: int = Query(0, ge=0, description="Number of requests to skip")
):
    """Get match requests sent by the current user"""
    try:
        requests = await match_request_service.get_sent_requests(
            user_id=current_user.id,
            session=session
        )
        
        # Apply pagination
        paginated_requests = requests[offset:offset + limit]
        
        # Enrich with user details
        enriched_requests = []
        for request in paginated_requests:
            enriched_request = await _enrich_match_request(request, session)
            enriched_requests.append(enriched_request)
        
        return enriched_requests
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{request_id}", response_model=MatchRequestRead)
async def get_match_request(
    request_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get a specific match request by ID"""
    try:
        # Get all user requests and find the specific one
        user_requests = await match_request_service.get_user_match_requests(
            user_id=current_user.id,
            session=session
        )
        
        target_request = None
        for request in user_requests:
            if request.id == request_id:
                target_request = request
                break
        
        if not target_request:
            raise MatchRequestNotFoundError(f"Match request {request_id} not found")
        
        # Enrich with user details
        enriched_request = await _enrich_match_request(target_request, session)
        return enriched_request
    except MatchRequestNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{request_id}/accept", response_model=MatchRequestResponse)
async def accept_match_request(
    request_id: int,
    response_data: Optional[MatchRequestUpdate] = None,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Accept a match request"""
    try:
        # Accept the request and create a match
        match = await match_request_service.accept_match_request(
            request_id=request_id,
            user_id=current_user.id,
            response_message=response_data.response_message if response_data else None,
            session=session
        )
        
        # Get the updated request
        user_requests = await match_request_service.get_user_match_requests(
            user_id=current_user.id,
            session=session
        )
        
        target_request = None
        for request in user_requests:
            if request.id == request_id:
                target_request = request
                break
        
        if target_request:
            enriched_request = await _enrich_match_request(target_request, session)
            return MatchRequestResponse(
                request=enriched_request,
                message=f"Match request accepted! You are now matched with your new friend. Match ID: {match.id}"
            )
        else:
            raise MatchRequestNotFoundError(f"Match request {request_id} not found after acceptance")
            
    except (MatchRequestNotFoundError, NoAvailableSlotsError, MatchNotPendingError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{request_id}/decline", response_model=MatchRequestResponse)
async def decline_match_request(
    request_id: int,
    response_data: Optional[MatchRequestUpdate] = None,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Decline a match request"""
    try:
        # Decline the request
        declined_request = await match_request_service.decline_match_request(
            request_id=request_id,
            user_id=current_user.id,
            response_message=response_data.response_message if response_data else None,
            session=session
        )
        
        # Enrich with user details
        enriched_request = await _enrich_match_request(declined_request, session)
        
        return MatchRequestResponse(
            request=enriched_request,
            message="Match request declined successfully"
        )
    except (MatchRequestNotFoundError, MatchNotPendingError) as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{request_id}")
async def delete_match_request(
    request_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Delete a match request (only if it's pending and sent by current user)"""
    try:
        # Get the request
        user_requests = await match_request_service.get_user_match_requests(
            user_id=current_user.id,
            session=session
        )
        
        target_request = None
        for request in user_requests:
            if request.id == request_id and request.sender_id == current_user.id:
                target_request = request
                break
        
        if not target_request:
            raise MatchRequestNotFoundError(f"Match request {request_id} not found")
        
        if target_request.status != "pending":
            raise HTTPException(status_code=400, detail="Can only delete pending requests")
        
        # For now, we'll just decline it (which returns the slot)
        await match_request_service.decline_match_request(
            request_id=request_id,
            user_id=target_request.receiver_id,  # This will be the receiver
            session=session
        )
        
        return {"message": "Match request deleted successfully"}
    except MatchRequestNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def _enrich_match_request(match_request: MatchRequest, session: AsyncSession) -> MatchRequestRead:
    """Enrich match request with user details"""
    from sqlalchemy import select
    
    # Get sender details
    result = await session.execute(
        select(User).where(User.id == match_request.sender_id)
    )
    sender = result.scalar_one_or_none()
    
    # Get receiver details
    result = await session.execute(
        select(User).where(User.id == match_request.receiver_id)
    )
    receiver = result.scalar_one_or_none()
    
    return MatchRequestRead(
        id=match_request.id,
        sender_id=match_request.sender_id,
        receiver_id=match_request.receiver_id,
        status=match_request.status,
        message=match_request.message,
        compatibility_score=match_request.compatibility_score,
        created_at=match_request.created_at,
        expires_at=match_request.expires_at,
        responded_at=match_request.responded_at,
        sender_name=sender.name if sender else None,
        sender_username=sender.username if sender else None,
        sender_profile_picture=sender.profile_picture_url if sender else None,
        receiver_name=receiver.name if receiver else None,
        receiver_username=receiver.username if receiver else None,
        receiver_profile_picture=receiver.profile_picture_url if receiver else None
    ) 