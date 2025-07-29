from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from datetime import datetime, timedelta
import logging

from models.user import User
from models.match import Match
from models.task import Task
from schemas.user import UserUpdate
from core.database import get_async_session
from core.config import settings
from core.exceptions import UserNotFoundError, InsufficientCoinsError

logger = logging.getLogger(__name__)

class UserService:
    """Service for managing user profiles and slot management"""
    
    def __init__(self):
        self.slot_reset_interval = timedelta(days=2)
        self.slot_purchase_cost = settings.SLOT_PURCHASE_COST
    
    async def get_user_profile(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> Optional[User]:
        """Get user profile by ID"""
        if not session:
            async with get_async_session() as session:
                result = await session.execute(
                    select(User).where(User.id == user_id)
                )
                return result.scalar_one_or_none()
        
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()
    
    async def update_user_profile(
        self,
        user_id: int,
        profile_update: UserUpdate,
        session: AsyncSession = None
    ) -> User:
        """Update user profile"""
        if not session:
            async with get_async_session() as session:
                return await self._update_user_profile_internal(user_id, profile_update, session)
        
        return await self._update_user_profile_internal(user_id, profile_update, session)

    async def _update_user_profile_internal(
        self,
        user_id: int,
        profile_update: UserUpdate,
        session: AsyncSession
    ) -> User:
        """Internal method to update user profile"""
        # Get user
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise UserNotFoundError(f"User with ID {user_id} not found")
        
        # Update fields
        update_data = profile_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        await session.commit()
        await session.refresh(user)
        
        logger.info(f"Updated profile for user {user_id}")
        return user
    
    async def get_user_stats(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> Dict[str, Any]:
        """Get user statistics"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        # Get user
        user = await self.get_user_profile(user_id, session)
        if not user:
            raise ValueError("User not found")
        
        # Get match statistics
        result = await session.execute(
            select(func.count(Match.id)).where(
                or_(Match.user1_id == user_id, Match.user2_id == user_id)
            )
        )
        total_matches = result.scalar() or 0
        
        result = await session.execute(
            select(func.count(Match.id)).where(
                and_(
                    or_(Match.user1_id == user_id, Match.user2_id == user_id),
                    Match.status == "active"
                )
            )
        )
        active_matches = result.scalar() or 0
        
        result = await session.execute(
            select(func.count(Match.id)).where(
                and_(
                    or_(Match.user1_id == user_id, Match.user2_id == user_id),
                    Match.status == "completed"
                )
            )
        )
        completed_matches = result.scalar() or 0
        
        # Get task statistics
        result = await session.execute(
            select(func.count(Task.id)).join(Match).where(
                and_(
                    or_(Match.user1_id == user_id, Match.user2_id == user_id),
                    Task.is_completed == True
                )
            )
        )
        completed_tasks = result.scalar() or 0
        
        result = await session.execute(
            select(func.sum(Task.coin_reward)).join(Match).where(
                and_(
                    or_(Match.user1_id == user_id, Match.user2_id == user_id),
                    Task.is_completed == True
                )
            )
        )
        total_coins_earned = result.scalar() or 0
        
        return {
            "user_id": user_id,
            "total_matches": total_matches,
            "active_matches": active_matches,
            "completed_matches": completed_matches,
            "completed_tasks": completed_tasks,
            "total_coins_earned": total_coins_earned,
            "available_slots": user.available_slots,
            "total_slots_used": user.total_slots_used,
            "current_coins": user.coins
        }
    
    async def purchase_slot(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> User:
        """Purchase an additional slot using coins"""
        if not session:
            async with get_async_session() as session:
                return await self._purchase_slot_internal(user_id, session)
        
        return await self._purchase_slot_internal(user_id, session)

    async def _purchase_slot_internal(
        self,
        user_id: int,
        session: AsyncSession
    ) -> User:
        """Internal method to purchase slot"""
        # Get user
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise UserNotFoundError(f"User with ID {user_id} not found")
        
        if user.coins < self.slot_purchase_cost:
            raise InsufficientCoinsError(
                f"Insufficient coins. Need {self.slot_purchase_cost} coins to purchase a slot. "
                f"Current balance: {user.coins} coins"
            )
        
        # Deduct coins and add slot
        user.coins -= self.slot_purchase_cost
        user.available_slots += 1
        
        await session.commit()
        await session.refresh(user)
        
        logger.info(f"User {user_id} purchased a slot for {self.slot_purchase_cost} coins")
        return user
    
    async def reset_expired_slots(self, session: AsyncSession = None):
        """Reset expired slots for all users"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        # Find users with expired slots
        result = await session.execute(
            select(User).where(
                and_(
                    User.available_slots < 2,
                    User.updated_at < datetime.utcnow() - self.slot_reset_interval
                )
            )
        )
        users_to_reset = result.scalars().all()
        
        for user in users_to_reset:
            # Reset slots to default (2)
            user.available_slots = 2
            user.total_slots_used = 0
            user.updated_at = datetime.utcnow()
            
            logger.info(f"Reset slots for user {user.id}")
        
        await session.commit()
    
    async def use_slot(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> bool:
        """Use a slot for matching"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        # Get user
        user = await self.get_user_profile(user_id, session)
        if not user:
            raise ValueError("User not found")
        
        # Check if user has available slots
        if user.available_slots <= 0:
            return False
        
        # Use slot
        user.available_slots -= 1
        user.total_slots_used += 1
        
        await session.commit()
        await session.refresh(user)
        
        logger.info(f"User {user_id} used a slot. Remaining: {user.available_slots}")
        return True
    
    async def get_user_matches(
        self,
        user_id: int,
        status: Optional[str] = None,
        session: AsyncSession = None
    ) -> List[Match]:
        """Get matches for a user"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        query = select(Match).where(
            or_(Match.user1_id == user_id, Match.user2_id == user_id)
        )
        
        if status:
            query = query.where(Match.status == status)
        
        result = await session.execute(query)
        return result.scalars().all()
    
    async def get_user_tasks(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> List[Task]:
        """Get active tasks for a user"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        result = await session.execute(
            select(Task).join(Match).where(
                and_(
                    or_(Match.user1_id == user_id, Match.user2_id == user_id),
                    Task.is_completed == False,
                    Task.expires_at > datetime.utcnow()
                )
            )
        )
        return result.scalars().all()
    
    async def search_users(
        self,
        query: str,
        current_user_id: int,
        session: AsyncSession = None
    ) -> List[User]:
        """Search for users by name, username, or interests"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        # Search in name, username, and profile text
        search_term = f"%{query}%"
        result = await session.execute(
            select(User).where(
                and_(
                    User.id != current_user_id,
                    User.is_active == True,
                    or_(
                        User.name.ilike(search_term),
                        User.username.ilike(search_term),
                        User.profile_text.ilike(search_term),
                        User.community.ilike(search_term),
                        User.location.ilike(search_term)
                    )
                )
            )
        )
        return result.scalars().all()
    
    async def get_compatible_users(
        self,
        user_id: int,
        limit: int = 10,
        session: AsyncSession = None
    ) -> List[Dict[str, Any]]:
        """Get compatible users for matching"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        # Get current user
        current_user = await self.get_user_profile(user_id, session)
        if not current_user:
            return []
        
        # Find users with similar interests
        compatible_users = []
        
        # Get users with similar community/location
        result = await session.execute(
            select(User).where(
                and_(
                    User.id != user_id,
                    User.is_active == True,
                    User.available_slots > 0,
                    or_(
                        User.community == current_user.community,
                        User.location == current_user.location
                    )
                )
            ).limit(limit)
        )
        
        for user in result.scalars().all():
            # Calculate basic compatibility
            compatibility_score = await self._calculate_basic_compatibility(current_user, user)
            
            compatible_users.append({
                "user": user,
                "compatibility_score": compatibility_score,
                "common_interests": await self._get_common_interests(current_user, user)
            })
        
        # Sort by compatibility score
        compatible_users.sort(key=lambda x: x["compatibility_score"], reverse=True)
        
        return compatible_users
    
    async def _calculate_basic_compatibility(
        self,
        user1: User,
        user2: User
    ) -> int:
        """Calculate basic compatibility between two users"""
        score = 0
        
        # Age compatibility
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
        
        return score
    
    async def _get_common_interests(
        self,
        user1: User,
        user2: User
    ) -> List[str]:
        """Get common interests between two users"""
        if not user1.profile_text or not user2.profile_text:
            return []
        
        # Simple keyword extraction (in a real app, you'd use NLP)
        words1 = set(user1.profile_text.lower().split())
        words2 = set(user2.profile_text.lower().split())
        
        return list(words1.intersection(words2))

# Global user service instance
user_service = UserService() 