import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from models.user import User
from models.match import Match
from core.database import get_async_session
from core.config import settings
from core.exceptions import UserNotFoundError, MatchNotFoundError, NoAvailableSlotsError, MatchNotPendingError

logger = logging.getLogger(__name__)

class MatchingService:
    """Service for managing matches and matching logic"""
    
    def __init__(self):
        self.matching_queue: List[int] = []
        self.compatibility_cache: Dict[str, int] = {}
        self.min_compatibility_threshold = settings.MIN_COMPATIBILITY_THRESHOLD
        self.max_compatibility_score = settings.MAX_COMPATIBILITY_SCORE
    
    async def create_match_request(
        self,
        user_id: int,
        target_user_id: Optional[int] = None,
        community: Optional[str] = None,
        location: Optional[str] = None,
        session: AsyncSession = None
    ) -> Match:
        """Create a new match request"""
        if not session:
            async with get_async_session() as session:
                return await self._create_match_request_internal(user_id, target_user_id, session)
        
        return await self._create_match_request_internal(user_id, target_user_id, session)

    async def _create_match_request_internal(
        self,
        user_id: int,
        target_user_id: Optional[int] = None,
        session: AsyncSession = None
    ) -> Match:
        """Internal method to create match request"""
        # Check if user has available slots
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user or user.available_slots <= 0:
            raise NoAvailableSlotsError(f"User {user_id} has no available slots for matching")
        
        if target_user_id:
            # Direct match with specific user
            return await self._create_direct_match(user_id, target_user_id, session)
        else:
            # Find compatible user from queue
            compatible_user_id = await self._find_compatible_user(user_id, session=session)
            if not compatible_user_id:
                # Add to queue and wait
                if user_id not in self.matching_queue:
                    self.matching_queue.append(user_id)
                raise NoAvailableSlotsError("No compatible users available. Added to matching queue.")
            
            return await self._create_direct_match(user_id, compatible_user_id, session)
    
    async def _create_direct_match(
        self,
        user1_id: int,
        user2_id: int,
        session: AsyncSession
    ) -> Match:
        """Create a direct match between two users"""
        # Get both users
        result = await session.execute(
            select(User).where(User.id.in_([user1_id, user2_id]))
        )
        users = result.scalars().all()
        
        if len(users) != 2:
            raise UserNotFoundError("One or both users not found or inactive")
        
        # Create match
        match = Match(
            user1_id=user1_id,
            user2_id=user2_id,
            status="pending",
            created_at=datetime.utcnow()
        )
        
        session.add(match)
        await session.commit()
        await session.refresh(match)
        
        # Use slot for both users
        for user in users:
            user.available_slots -= 1
            user.total_slots_used += 1
        
        await session.commit()
        
        logger.info(f"Created direct match {match.id} between users {user1_id} and {user2_id}")
        return match
    
    async def _create_queue_match(
        self,
        user_id: int,
        community: Optional[str] = None,
        location: Optional[str] = None,
        session: AsyncSession = None
    ) -> Match:
        """Create a match using the matching queue"""
        # Add user to matching queue
        if user_id not in self.matching_queue:
            self.matching_queue.append(user_id)
        
        # Find compatible user in queue
        compatible_user = await self._find_compatible_user(user_id, community, location, session)
        
        if compatible_user:
            # Remove both users from queue
            self.matching_queue.remove(user_id)
            self.matching_queue.remove(compatible_user)
            
            # Create match
            return await self._create_direct_match(user_id, compatible_user, session)
        else:
            # No compatible user found, return None (user stays in queue)
            return None
    
    async def _find_compatible_user(
        self,
        user_id: int,
        community: Optional[str] = None,
        location: Optional[str] = None,
        session: AsyncSession = None
    ) -> Optional[int]:
        """Find a compatible user from the queue"""
        if not session:
            async with get_async_session() as session:
                return await self._find_compatible_user_internal(user_id, community, location, session)
        
        return await self._find_compatible_user_internal(user_id, community, location, session)

    async def _find_compatible_user_internal(
        self,
        user_id: int,
        community: Optional[str] = None,
        location: Optional[str] = None,
        session: AsyncSession = None
    ) -> Optional[int]:
        """Find a compatible user from the queue"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        # Get user preferences
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            return None
        
        # Find users in queue with similar preferences
        for queue_user_id in self.matching_queue:
            if queue_user_id == user_id:
                continue
            
            # Check if users are compatible
            compatibility = await self._calculate_compatibility(user_id, queue_user_id, session)
            
            if compatibility >= self.min_compatibility_threshold:  # Minimum compatibility threshold
                return queue_user_id
        
        return None
    
    async def _calculate_compatibility(
        self,
        user1_id: int,
        user2_id: int,
        session: AsyncSession
    ) -> int:
        """Calculate compatibility score between two users"""
        cache_key = f"{min(user1_id, user2_id)}_{max(user1_id, user2_id)}"
        
        if cache_key in self.compatibility_cache:
            return self.compatibility_cache[cache_key]
        
        # Get user profiles
        result = await session.execute(
            select(User).where(User.id.in_([user1_id, user2_id]))
        )
        users = result.scalars().all()
        
        if len(users) != 2:
            return 0
        
        user1, user2 = users
        
        score = 0
        
        # Age compatibility (prefer similar age)
        if user1.age and user2.age:
            age_diff = abs(user1.age - user2.age)
            if age_diff <= 2:
                score += 25
            elif age_diff <= 5:
                score += 15
            elif age_diff <= 10:
                score += 5
        
        # Community compatibility
        if user1.community and user2.community and user1.community == user2.community:
            score += 20
        
        # Location compatibility
        if user1.location and user2.location and user1.location == user2.location:
            score += 15
        
        # Profession compatibility (if both have professions)
        if user1.profession and user2.profession:
            # Simple keyword matching for profession compatibility
            prof1_lower = user1.profession.lower()
            prof2_lower = user2.profession.lower()
            
            if prof1_lower == prof2_lower:
                score += 10
            elif any(word in prof2_lower for word in prof1_lower.split()):
                score += 5
        
        # Profile text compatibility (simple keyword matching)
        if user1.profile_text and user2.profile_text:
            text1_lower = user1.profile_text.lower()
            text2_lower = user2.profile_text.lower()
            
            # Count common words
            words1 = set(text1_lower.split())
            words2 = set(text2_lower.split())
            common_words = words1.intersection(words2)
            
            if len(common_words) > 0:
                score += min(len(common_words) * 2, 20)
        
        # Random factor for variety
        score += random.randint(-5, 5)
        
        # Ensure score is between 0 and 100
        score = max(0, min(100, score))
        
        # Cache the result
        self.compatibility_cache[cache_key] = score
        
        return score
    
    async def accept_match(
        self,
        match_id: int,
        user_id: int,
        session: AsyncSession = None
    ) -> Match:
        """Accept a match request"""
        if not session:
            async with get_async_session() as session:
                return await self._accept_match_internal(match_id, user_id, session)
        
        return await self._accept_match_internal(match_id, user_id, session)

    async def _accept_match_internal(
        self,
        match_id: int,
        user_id: int,
        session: AsyncSession
    ) -> Match:
        """Internal method to accept match"""
        # Get match
        result = await session.execute(
            select(Match).where(Match.id == match_id)
        )
        match = result.scalar_one_or_none()
        
        if not match or match.status != "pending":
            raise MatchNotPendingError(f"Match {match_id} not found or not in pending status")
        
        if match.user1_id != user_id and match.user2_id != user_id:
            raise MatchNotFoundError(f"User {user_id} is not part of match {match_id}")
        
        # Accept match
        match.status = "active"
        match.accepted_at = datetime.utcnow()
        match.accepted_by = user_id
        
        await session.commit()
        await session.refresh(match)
        
        logger.info(f"Match {match_id} accepted by user {user_id}")
        return match
    
    async def reject_match(
        self,
        match_id: int,
        user_id: int,
        session: AsyncSession = None
    ) -> Match:
        """Reject a match request"""
        if not session:
            async with get_async_session() as session:
                return await self._reject_match_internal(match_id, user_id, session)
        
        return await self._reject_match_internal(match_id, user_id, session)

    async def _reject_match_internal(
        self,
        match_id: int,
        user_id: int,
        session: AsyncSession
    ) -> Match:
        """Internal method to reject match"""
        # Get match
        result = await session.execute(
            select(Match).where(Match.id == match_id)
        )
        match = result.scalar_one_or_none()
        
        if not match or match.status != "pending":
            raise MatchNotPendingError(f"Match {match_id} not found or not in pending status")
        
        if match.user1_id != user_id and match.user2_id != user_id:
            raise MatchNotFoundError(f"User {user_id} is not part of match {match_id}")
        
        # Reject match
        match.status = "rejected"
        match.rejected_at = datetime.utcnow()
        match.rejected_by = user_id
        
        # Return slots to both users
        for user_id in [match.user1_id, match.user2_id]:
            result = await session.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()
            if user:
                user.available_slots += 1
                user.total_slots_used -= 1
        
        await session.commit()
        await session.refresh(match)
        
        logger.info(f"Match {match_id} rejected by user {user_id}")
        return match
    
    async def get_user_matches(
        self,
        user_id: int,
        status: Optional[str] = None,
        session: AsyncSession = None
    ) -> List[Match]:
        """Get matches for a user"""
        if not session:
            async with get_async_session() as session:
                return await self._get_user_matches_internal(user_id, status, session)
        
        query = select(Match).where(
            or_(Match.user1_id == user_id, Match.user2_id == user_id)
        )
        
        if status:
            query = query.where(Match.status == status)
        
        result = await session.execute(query)
        return result.scalars().all()
    
    async def get_match_details(
        self,
        match_id: int,
        user_id: int,
        session: AsyncSession = None
    ) -> Optional[Match]:
        """Get detailed match information"""
        if not session:
            async with get_async_session() as session:
                return await self._get_match_details_internal(match_id, user_id, session)
        
        result = await session.execute(
            select(Match).where(
                and_(
                    Match.id == match_id,
                    or_(Match.user1_id == user_id, Match.user2_id == user_id)
                )
            )
        )
        return result.scalar_one_or_none()
    
    async def cleanup_expired_matches(self, session: AsyncSession = None):
        """Clean up expired matches"""
        if not session:
            async with get_async_session() as session:
                return await self._cleanup_expired_matches_internal(session)
        
        # Find expired matches
        result = await session.execute(
            select(Match).where(
                and_(
                    Match.status.in_(["pending", "active"]),
                    Match.created_at < datetime.utcnow() - timedelta(days=2)
                )
            )
        )
        expired_matches = result.scalars().all()
        
        for match in expired_matches:
            match.status = "expired"
            match.completed_at = datetime.utcnow()
            
            # Cancel auto-greeting timer
            # await chat_service.cancel_auto_greeting_timer(match.id) # This line was removed as per the new_code
            
            logger.info(f"Marked match {match.id} as expired")
        
        await session.commit()

# Global matching service instance
matching_service = MatchingService() 