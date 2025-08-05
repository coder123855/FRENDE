import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from models.user import User
from models.match import Match
from models.match_request import MatchRequest
from core.database import get_async_session
from core.exceptions import UserNotFoundError, MatchRequestNotFoundError, NoAvailableSlotsError, DuplicateRequestError
from services.matching import matching_service

logger = logging.getLogger(__name__)

class MatchRequestService:
    """Service for managing match requests"""
    
    def __init__(self):
        self.request_expiration_hours = 24
    
    async def create_match_request(
        self,
        sender_id: int,
        receiver_id: int,
        message: Optional[str] = None,
        session: AsyncSession = None
    ) -> MatchRequest:
        """Create a new match request"""
        if not session:
            async with get_async_session() as session:
                return await self._create_match_request_internal(sender_id, receiver_id, message, session)
        
        return await self._create_match_request_internal(sender_id, receiver_id, message, session)
    
    async def _create_match_request_internal(
        self,
        sender_id: int,
        receiver_id: int,
        message: Optional[str] = None,
        session: AsyncSession = None
    ) -> MatchRequest:
        """Internal method to create match request"""
        # Validate users exist and are active
        result = await session.execute(
            select(User).where(User.id.in_([sender_id, receiver_id]))
        )
        users = result.scalars().all()
        
        if len(users) != 2:
            raise UserNotFoundError("One or both users not found")
        
        sender, receiver = users if users[0].id == sender_id else [users[1], users[0]]
        
        # Check if sender has available slots
        if sender.available_slots <= 0:
            raise NoAvailableSlotsError(f"User {sender_id} has no available slots")
        
        # Check for existing pending request
        existing_request = await self._get_existing_request(sender_id, receiver_id, session)
        if existing_request:
            raise DuplicateRequestError("A match request already exists between these users")
        
        # Calculate compatibility score
        compatibility_data = await matching_service._calculate_compatibility(sender_id, receiver_id, session)
        compatibility_score = compatibility_data.get('total_score', 0)
        
        # Create match request
        expires_at = datetime.utcnow() + timedelta(hours=self.request_expiration_hours)
        
        match_request = MatchRequest(
            sender_id=sender_id,
            receiver_id=receiver_id,
            message=message,
            compatibility_score=compatibility_score,
            expires_at=expires_at,
            status="pending"
        )
        
        session.add(match_request)
        await session.commit()
        await session.refresh(match_request)
        
        # Use slot for sender
        sender.available_slots -= 1
        sender.total_slots_used += 1
        await session.commit()
        
        logger.info(f"Match request created: {sender_id} -> {receiver_id}")
        return match_request
    
    async def _get_existing_request(
        self,
        sender_id: int,
        receiver_id: int,
        session: AsyncSession
    ) -> Optional[MatchRequest]:
        """Get existing pending request between users"""
        result = await session.execute(
            select(MatchRequest).where(
                and_(
                    or_(
                        and_(MatchRequest.sender_id == sender_id, MatchRequest.receiver_id == receiver_id),
                        and_(MatchRequest.sender_id == receiver_id, MatchRequest.receiver_id == sender_id)
                    ),
                    MatchRequest.status == "pending"
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def accept_match_request(
        self,
        request_id: int,
        user_id: int,
        response_message: Optional[str] = None,
        session: AsyncSession = None
    ) -> Match:
        """Accept a match request and create a match"""
        if not session:
            async with get_async_session() as session:
                return await self._accept_match_request_internal(request_id, user_id, response_message, session)
        
        return await self._accept_match_request_internal(request_id, user_id, response_message, session)
    
    async def _accept_match_request_internal(
        self,
        request_id: int,
        user_id: int,
        response_message: Optional[str] = None,
        session: AsyncSession = None
    ) -> Match:
        """Internal method to accept match request"""
        # Get the request
        result = await session.execute(
            select(MatchRequest).where(MatchRequest.id == request_id)
        )
        request = result.scalar_one_or_none()
        
        if not request:
            raise MatchRequestNotFoundError(f"Match request {request_id} not found")
        
        if request.receiver_id != user_id:
            raise MatchRequestNotFoundError("You can only accept requests sent to you")
        
        if request.status != "pending":
            raise MatchRequestNotFoundError("Request is not pending")
        
        if request.is_expired():
            # Mark as expired
            request.status = "expired"
            await session.commit()
            raise MatchRequestNotFoundError("Request has expired")
        
        # Check if receiver has available slots
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        receiver = result.scalar_one_or_none()
        
        if not receiver or receiver.available_slots <= 0:
            raise NoAvailableSlotsError("No available slots to accept match")
        
        # Update request status
        request.status = "accepted"
        request.responded_at = datetime.utcnow()
        await session.commit()
        
        # Create match
        match = Match(
            user1_id=request.sender_id,
            user2_id=request.receiver_id,
            status="active",
            compatibility_score=request.compatibility_score,
            slot_used_by_user1=True,
            slot_used_by_user2=True,
            started_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=2)
        )
        
        session.add(match)
        await session.commit()
        await session.refresh(match)
        
        # Use slot for receiver
        receiver.available_slots -= 1
        receiver.total_slots_used += 1
        await session.commit()
        
        logger.info(f"Match request accepted: {request_id} -> Match {match.id}")
        return match
    
    async def decline_match_request(
        self,
        request_id: int,
        user_id: int,
        response_message: Optional[str] = None,
        session: AsyncSession = None
    ) -> MatchRequest:
        """Decline a match request"""
        if not session:
            async with get_async_session() as session:
                return await self._decline_match_request_internal(request_id, user_id, response_message, session)
        
        return await self._decline_match_request_internal(request_id, user_id, response_message, session)
    
    async def _decline_match_request_internal(
        self,
        request_id: int,
        user_id: int,
        response_message: Optional[str] = None,
        session: AsyncSession = None
    ) -> MatchRequest:
        """Internal method to decline match request"""
        # Get the request
        result = await session.execute(
            select(MatchRequest).where(MatchRequest.id == request_id)
        )
        request = result.scalar_one_or_none()
        
        if not request:
            raise MatchRequestNotFoundError(f"Match request {request_id} not found")
        
        if request.receiver_id != user_id:
            raise MatchRequestNotFoundError("You can only decline requests sent to you")
        
        if request.status != "pending":
            raise MatchRequestNotFoundError("Request is not pending")
        
        # Update request status
        request.status = "declined"
        request.responded_at = datetime.utcnow()
        await session.commit()
        
        # Return slot to sender
        result = await session.execute(
            select(User).where(User.id == request.sender_id)
        )
        sender = result.scalar_one_or_none()
        if sender:
            sender.available_slots += 1
            sender.total_slots_used -= 1
            await session.commit()
        
        logger.info(f"Match request declined: {request_id}")
        return request
    
    async def get_user_match_requests(
        self,
        user_id: int,
        status: Optional[str] = None,
        session: AsyncSession = None
    ) -> List[MatchRequest]:
        """Get match requests for a user"""
        if not session:
            async with get_async_session() as session:
                return await self._get_user_match_requests_internal(user_id, status, session)
        
        return await self._get_user_match_requests_internal(user_id, status, session)
    
    async def _get_user_match_requests_internal(
        self,
        user_id: int,
        status: Optional[str] = None,
        session: AsyncSession = None
    ) -> List[MatchRequest]:
        """Internal method to get user match requests"""
        query = select(MatchRequest).where(
            or_(
                MatchRequest.sender_id == user_id,
                MatchRequest.receiver_id == user_id
            )
        )
        
        if status:
            query = query.where(MatchRequest.status == status)
        
        query = query.order_by(MatchRequest.created_at.desc())
        
        result = await session.execute(query)
        return result.scalars().all()
    
    async def get_received_requests(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> List[MatchRequest]:
        """Get requests received by a user"""
        if not session:
            async with get_async_session() as session:
                return await self._get_received_requests_internal(user_id, session)
        
        return await self._get_received_requests_internal(user_id, session)
    
    async def _get_received_requests_internal(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> List[MatchRequest]:
        """Internal method to get received requests"""
        result = await session.execute(
            select(MatchRequest).where(
                and_(
                    MatchRequest.receiver_id == user_id,
                    MatchRequest.status == "pending"
                )
            ).order_by(MatchRequest.created_at.desc())
        )
        return result.scalars().all()
    
    async def get_sent_requests(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> List[MatchRequest]:
        """Get requests sent by a user"""
        if not session:
            async with get_async_session() as session:
                return await self._get_sent_requests_internal(user_id, session)
        
        return await self._get_sent_requests_internal(user_id, session)
    
    async def _get_sent_requests_internal(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> List[MatchRequest]:
        """Internal method to get sent requests"""
        result = await session.execute(
            select(MatchRequest).where(
                and_(
                    MatchRequest.sender_id == user_id,
                    MatchRequest.status.in_(["pending", "accepted", "declined"])
                )
            ).order_by(MatchRequest.created_at.desc())
        )
        return result.scalars().all()
    
    async def cleanup_expired_requests(self, session: AsyncSession = None):
        """Clean up expired match requests"""
        if not session:
            async with get_async_session() as session:
                return await self._cleanup_expired_requests_internal(session)
        
        return await self._cleanup_expired_requests_internal(session)
    
    async def _cleanup_expired_requests_internal(self, session: AsyncSession):
        """Internal method to cleanup expired requests"""
        # Find expired requests
        result = await session.execute(
            select(MatchRequest).where(
                and_(
                    MatchRequest.status == "pending",
                    MatchRequest.expires_at < datetime.utcnow()
                )
            )
        )
        expired_requests = result.scalars().all()
        
        for request in expired_requests:
            request.status = "expired"
            # Return slot to sender
            result = await session.execute(
                select(User).where(User.id == request.sender_id)
            )
            sender = result.scalar_one_or_none()
            if sender:
                sender.available_slots += 1
                sender.total_slots_used -= 1
        
        await session.commit()
        logger.info(f"Cleaned up {len(expired_requests)} expired match requests")

# Create service instance
match_request_service = MatchRequestService() 