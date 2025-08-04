from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from core.database import get_async_session
from core.auth import current_active_user
from core.exceptions import UserNotFoundError, MatchNotFoundError, NoAvailableSlotsError, MatchNotPendingError
from models.user import User
from models.match import Match
from schemas.match import MatchCreate, MatchRead, MatchUpdate
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