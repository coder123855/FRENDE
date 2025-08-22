import logging
import random
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload, joinedload
from models.user import User
from models.match import Match
from core.database import get_async_session
from core.config import settings
from core.exceptions import UserNotFoundError, MatchNotFoundError, NoAvailableSlotsError, MatchNotPendingError
from core.performance_monitor import performance_monitor

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
        """Internal method to create match request with optimized queries"""
        async with performance_monitor("create_match_request", user_id=user_id):
            # Get user with eager loading to avoid N+1 queries
            result = await session.execute(
                select(User).where(User.id == user_id)
                .options(selectinload(User.refresh_tokens))
            )
            user = result.scalar_one_or_none()
            
            if not user:
                raise UserNotFoundError(f"User {user_id} not found")
            
            # Check available slots with optimized query
            if user.available_slots <= 0:
                raise NoAvailableSlotsError("No available slots")
            
            # If target user specified, create direct match
            if target_user_id:
                return await self._create_direct_match(user_id, target_user_id, session)
            
            # Find compatible users with optimized query
            compatible_users = await self._find_compatible_users_optimized(user, session)
            
            if not compatible_users:
                # Add to queue if no compatible users found
                await self._add_to_queue(user_id, session)
                raise NoAvailableSlotsError("No compatible users found, added to queue")
            
            # Select best match
            best_match = compatible_users[0]
            return await self._create_match_with_user(user_id, best_match.id, session)
    
    async def _find_compatible_users_optimized(
        self, 
        user: User, 
        session: AsyncSession
    ) -> List[User]:
        """Find compatible users with optimized query and eager loading"""
        async with performance_monitor("find_compatible_users", user_id=user.id):
            # Build optimized query with proper indexes
            query = (
                select(User)
                .where(
                    and_(
                        User.id != user.id,
                        User.is_active == True,
                        User.available_slots > 0,
                        # Age compatibility check
                        or_(
                            and_(
                                User.age >= user.age_preference_min,
                                User.age <= user.age_preference_max
                            ),
                            user.age_preference_min.is_(None),
                            user.age_preference_max.is_(None)
                        ),
                        # User's age within target's preference
                        or_(
                            and_(
                                user.age >= User.age_preference_min,
                                user.age <= User.age_preference_max
                            ),
                            User.age_preference_min.is_(None),
                            User.age_preference_max.is_(None)
                        )
                    )
                )
                .options(selectinload(User.refresh_tokens))
                .order_by(desc(User.created_at))
                .limit(50)  # Limit for performance
            )
            
            result = await session.execute(query)
            potential_matches = result.scalars().all()
            
            # Calculate compatibility scores with caching
            scored_matches = []
            for potential_match in potential_matches:
                score = await self._calculate_compatibility_score_cached(user, potential_match)
                if score >= self.min_compatibility_threshold:
                    scored_matches.append((potential_match, score))
            
            # Sort by compatibility score and return top matches
            scored_matches.sort(key=lambda x: x[1], reverse=True)
            return [user for user, score in scored_matches[:10]]
    
    async def _calculate_compatibility_score_cached(
        self, 
        user1: User, 
        user2: User
    ) -> int:
        """Calculate compatibility score with caching"""
        cache_key = f"{min(user1.id, user2.id)}_{max(user1.id, user2.id)}"
        
        if cache_key in self.compatibility_cache:
            return self.compatibility_cache[cache_key]
        
        score = await self._calculate_compatibility_score(user1, user2)
        self.compatibility_cache[cache_key] = score
        
        # Limit cache size
        if len(self.compatibility_cache) > 1000:
            # Remove oldest entries
            keys_to_remove = list(self.compatibility_cache.keys())[:100]
            for key in keys_to_remove:
                del self.compatibility_cache[key]
        
        return score
    
    async def _calculate_compatibility_score(self, user1: User, user2: User) -> int:
        """Calculate compatibility score between two users"""
        score = 0
        
        # Age compatibility (30 points)
        if user1.age and user2.age:
            age_diff = abs(user1.age - user2.age)
            if age_diff <= 2:
                score += 30
            elif age_diff <= 5:
                score += 20
            elif age_diff <= 10:
                score += 10
        
        # Community compatibility (25 points)
        if user1.community and user2.community and user1.community == user2.community:
            score += 25
        
        # Location compatibility (25 points)
        if user1.location and user2.location and user1.location == user2.location:
            score += 25
        
        # Interest compatibility (20 points)
        if user1.interests and user2.interests:
            # Simple keyword matching (could be enhanced with AI)
            interests1 = user1.interests.lower().split()
            interests2 = user2.interests.lower().split()
            common_interests = set(interests1) & set(interests2)
            if common_interests:
                score += min(20, len(common_interests) * 5)
        
        return min(score, self.max_compatibility_score)
    
    async def get_user_matches(
        self,
        user_id: int,
        status: Optional[str] = None,
        limit: int = 10,
        offset: int = 0,
        session: AsyncSession = None
    ) -> List[Match]:
        """Get user's matches with optimized query and eager loading"""
        if not session:
            async with get_async_session() as session:
                return await self._get_user_matches_internal(user_id, status, limit, offset, session)
        
        return await self._get_user_matches_internal(user_id, status, limit, offset, session)
    
    async def _get_user_matches_internal(
        self,
        user_id: int,
        status: Optional[str] = None,
        limit: int = 10,
        offset: int = 0,
        session: AsyncSession = None
    ) -> List[Match]:
        """Internal method to get user matches with optimized query"""
        async with performance_monitor("get_user_matches", user_id=user_id):
            # Build optimized query using indexes
            query = (
                select(Match)
                .where(
                    or_(Match.user1_id == user_id, Match.user2_id == user_id)
                )
                .options(
                    selectinload(Match.user1),
                    selectinload(Match.user2),
                    selectinload(Match.tasks),
                    selectinload(Match.messages)
                )
                .order_by(desc(Match.created_at))
                .offset(offset)
                .limit(limit)
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
        """Get match details with optimized query and eager loading"""
        if not session:
            async with get_async_session() as session:
                return await self._get_match_details_internal(match_id, user_id, session)
        
        return await self._get_match_details_internal(match_id, user_id, session)
    
    async def _get_match_details_internal(
        self,
        match_id: int,
        user_id: int,
        session: AsyncSession
    ) -> Optional[Match]:
        """Internal method to get match details with optimized query"""
        async with performance_monitor("get_match_details", user_id=user_id):
            result = await session.execute(
                select(Match)
                .where(
                    and_(
                        Match.id == match_id,
                        or_(Match.user1_id == user_id, Match.user2_id == user_id)
                    )
                )
                .options(
                    selectinload(Match.user1),
                    selectinload(Match.user2),
                    selectinload(Match.tasks),
                    selectinload(Match.messages)
                )
            )
            return result.scalar_one_or_none()
    
    async def _create_direct_match(
        self,
        user1_id: int,
        user2_id: int,
        session: AsyncSession
    ) -> Match:
        """Create a direct match between two users"""
        async with performance_monitor("create_direct_match", user_id=user1_id):
            # Check if match already exists
            existing_match = await session.execute(
                select(Match).where(
                    or_(
                        and_(Match.user1_id == user1_id, Match.user2_id == user2_id),
                        and_(Match.user1_id == user2_id, Match.user2_id == user1_id)
                    )
                )
            )
            
            if existing_match.scalar_one_or_none():
                raise ValueError("Match already exists")
            
            # Create new match
            match = Match(
                user1_id=user1_id,
                user2_id=user2_id,
                status="pending",
                expires_at=datetime.utcnow() + timedelta(days=2)
            )
            
            session.add(match)
            await session.commit()
            await session.refresh(match)
            
            return match
    
    async def _create_match_with_user(
        self,
        user1_id: int,
        user2_id: int,
        session: AsyncSession
    ) -> Match:
        """Create a match with a specific user"""
        async with performance_monitor("create_match_with_user", user_id=user1_id):
            match = Match(
                user1_id=user1_id,
                user2_id=user2_id,
                status="active",
                expires_at=datetime.utcnow() + timedelta(days=2)
            )
            
            session.add(match)
            await session.commit()
            await session.refresh(match)
            
            return match
    
    async def _add_to_queue(
        self,
        user_id: int,
        session: AsyncSession
    ):
        """Add user to matching queue"""
        from models.queue_entry import QueueEntry
        
        # Check if already in queue
        existing = await session.execute(
            select(QueueEntry).where(QueueEntry.user_id == user_id)
        )
        
        if not existing.scalar_one_or_none():
            queue_entry = QueueEntry(
                user_id=user_id,
                status="waiting",
                expires_at=datetime.utcnow() + timedelta(hours=1)
            )
            session.add(queue_entry)
            await session.commit()

# Global matching service instance
matching_service = MatchingService() 