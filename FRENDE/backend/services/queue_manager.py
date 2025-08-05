import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, desc, func
from models.queue_entry import QueueEntry
from models.user import User
from models.match import Match
from core.database import get_async_session
from core.exceptions import UserNotFoundError, QueueEntryNotFoundError

logger = logging.getLogger(__name__)

class QueueManager:
    """Service for managing the matching queue"""
    
    def __init__(self):
        self.processing_interval = 30  # seconds
        self.batch_size = 10
        self.max_wait_time = 3600  # 1 hour
        self.priority_weights = {
            "wait_time": 0.4,
            "activity_score": 0.3,
            "compatibility": 0.3
        }
    
    async def add_to_queue(
        self,
        user_id: int,
        preferences: Optional[Dict[str, Any]] = None,
        session: AsyncSession = None
    ) -> QueueEntry:
        """Add a user to the matching queue"""
        if not session:
            async with get_async_session() as session:
                return await self._add_to_queue_internal(user_id, preferences, session)
        
        return await self._add_to_queue_internal(user_id, preferences, session)
    
    async def _add_to_queue_internal(
        self,
        user_id: int,
        preferences: Optional[Dict[str, Any]] = None,
        session: AsyncSession = None
    ) -> QueueEntry:
        """Internal method to add user to queue"""
        # Check if user exists and has available slots
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if not user:
            raise UserNotFoundError(f"User {user_id} not found")
        
        if user.available_slots <= 0:
            raise ValueError(f"User {user_id} has no available slots")
        
        # Check if user is already in queue
        existing_entry = await self._get_queue_entry(user_id, session)
        if existing_entry:
            # Update existing entry
            existing_entry.compatibility_preferences = preferences
            existing_entry.status = "waiting"
            existing_entry.processed_at = None
            existing_entry.matched_with_user_id = None
            existing_entry.match_id = None
            existing_entry.update_priority_score(self.priority_weights)
            await session.commit()
            await session.refresh(existing_entry)
            return existing_entry
        
        # Create new queue entry
        queue_entry = QueueEntry(
            user_id=user_id,
            status="waiting",
            compatibility_preferences=preferences,
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        queue_entry.update_priority_score(self.priority_weights)
        
        session.add(queue_entry)
        await session.commit()
        await session.refresh(queue_entry)
        
        logger.info(f"User {user_id} added to matching queue")
        return queue_entry
    
    async def remove_from_queue(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> bool:
        """Remove a user from the matching queue"""
        if not session:
            async with get_async_session() as session:
                return await self._remove_from_queue_internal(user_id, session)
        
        return await self._remove_from_queue_internal(user_id, session)
    
    async def _remove_from_queue_internal(
        self,
        user_id: int,
        session: AsyncSession
    ) -> bool:
        """Internal method to remove user from queue"""
        queue_entry = await self._get_queue_entry(user_id, session)
        if not queue_entry:
            return False
        
        await session.delete(queue_entry)
        await session.commit()
        
        logger.info(f"User {user_id} removed from matching queue")
        return True
    
    async def get_queue_position(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> Optional[int]:
        """Get user's position in the queue"""
        if not session:
            async with get_async_session() as session:
                return await self._get_queue_position_internal(user_id, session)
        
        return await self._get_queue_position_internal(user_id, session)
    
    async def _get_queue_position_internal(
        self,
        user_id: int,
        session: AsyncSession
    ) -> Optional[int]:
        """Internal method to get queue position"""
        queue_entry = await self._get_queue_entry(user_id, session)
        if not queue_entry or not queue_entry.is_waiting():
            return None
        
        # Count users ahead in queue
        result = await session.execute(
            select(func.count(QueueEntry.id)).where(
                and_(
                    QueueEntry.status == "waiting",
                    QueueEntry.priority_score >= queue_entry.priority_score,
                    QueueEntry.created_at <= queue_entry.created_at,
                    QueueEntry.id != queue_entry.id
                )
            )
        )
        position = result.scalar() + 1
        return position
    
    async def get_queue_status(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> Optional[Dict[str, Any]]:
        """Get comprehensive queue status for a user"""
        if not session:
            async with get_async_session() as session:
                return await self._get_queue_status_internal(user_id, session)
        
        return await self._get_queue_status_internal(user_id, session)
    
    async def _get_queue_status_internal(
        self,
        user_id: int,
        session: AsyncSession
    ) -> Optional[Dict[str, Any]]:
        """Internal method to get queue status"""
        queue_entry = await self._get_queue_entry(user_id, session)
        if not queue_entry:
            return None
        
        position = await self._get_queue_position_internal(user_id, session)
        wait_time = queue_entry.get_wait_time()
        
        return {
            "user_id": user_id,
            "status": queue_entry.status,
            "position": position,
            "wait_time_seconds": wait_time,
            "estimated_wait_time": self._estimate_wait_time(position),
            "created_at": queue_entry.created_at,
            "expires_at": queue_entry.expires_at,
            "preferences": queue_entry.compatibility_preferences
        }
    
    async def process_queue_batch(
        self,
        session: AsyncSession = None
    ) -> List[Match]:
        """Process a batch of queue entries and create matches"""
        if not session:
            async with get_async_session() as session:
                return await self._process_queue_batch_internal(session)
        
        return await self._process_queue_batch_internal(session)
    
    async def _process_queue_batch_internal(
        self,
        session: AsyncSession
    ) -> List[Match]:
        """Internal method to process queue batch"""
        # Get waiting users ordered by priority
        result = await session.execute(
            select(QueueEntry).where(
                QueueEntry.status == "waiting"
            ).order_by(desc(QueueEntry.priority_score))
        )
        waiting_entries = result.scalars().all()
        
        if len(waiting_entries) < 2:
            return []
        
        matches = []
        processed_user_ids = set()
        
        # Process entries in batches
        for i in range(0, len(waiting_entries), self.batch_size):
            batch = waiting_entries[i:i + self.batch_size]
            
            for entry in batch:
                if entry.user_id in processed_user_ids:
                    continue
                
                # Mark as processing
                entry.status = "processing"
                entry.processed_at = datetime.utcnow()
                
                # Find compatible user
                compatible_entry = await self._find_compatible_entry(
                    entry, batch, processed_user_ids, session
                )
                
                if compatible_entry:
                    # Create match
                    match = await self._create_match_from_queue(
                        entry, compatible_entry, session
                    )
                    matches.append(match)
                    
                    # Mark both as matched
                    entry.status = "matched"
                    entry.matched_with_user_id = compatible_entry.user_id
                    entry.match_id = match.id
                    
                    compatible_entry.status = "matched"
                    compatible_entry.matched_with_user_id = entry.user_id
                    compatible_entry.match_id = match.id
                    
                    processed_user_ids.add(entry.user_id)
                    processed_user_ids.add(compatible_entry.user_id)
                else:
                    # Reset to waiting if no match found
                    entry.status = "waiting"
                    entry.processed_at = None
        
        await session.commit()
        logger.info(f"Processed queue batch, created {len(matches)} matches")
        return matches
    
    async def _find_compatible_entry(
        self,
        entry: QueueEntry,
        batch: List[QueueEntry],
        processed_user_ids: set,
        session: AsyncSession
    ) -> Optional[QueueEntry]:
        """Find a compatible queue entry for matching"""
        from services.matching import matching_service
        
        for other_entry in batch:
            if (other_entry.user_id in processed_user_ids or 
                other_entry.user_id == entry.user_id):
                continue
            
            # Check basic compatibility
            if await self._are_compatible(entry, other_entry, session):
                return other_entry
        
        return None
    
    async def _are_compatible(
        self,
        entry1: QueueEntry,
        entry2: QueueEntry,
        session: AsyncSession
    ) -> bool:
        """Check if two queue entries are compatible"""
        # Get user details
        result = await session.execute(
            select(User).where(User.id.in_([entry1.user_id, entry2.user_id]))
        )
        users = result.scalars().all()
        
        if len(users) != 2:
            return False
        
        user1, user2 = users
        
        # Check if both users have available slots
        if user1.available_slots <= 0 or user2.available_slots <= 0:
            return False
        
        # Check age preferences
        if not self._check_age_compatibility(user1, user2):
            return False
        
        # Check location preferences
        if not self._check_location_compatibility(user1, user2):
            return False
        
        return True
    
    def _check_age_compatibility(self, user1: User, user2: User) -> bool:
        """Check age compatibility between users"""
        if not user1.age or not user2.age:
            return True  # Allow if age not set
        
        # Check user1's age preferences
        if user1.age_preference_min and user2.age < user1.age_preference_min:
            return False
        if user1.age_preference_max and user2.age > user1.age_preference_max:
            return False
        
        # Check user2's age preferences
        if user2.age_preference_min and user1.age < user2.age_preference_min:
            return False
        if user2.age_preference_max and user1.age > user2.age_preference_max:
            return False
        
        return True
    
    def _check_location_compatibility(self, user1: User, user2: User) -> bool:
        """Check location compatibility between users"""
        # If both users have location preferences, they should match
        if user1.location and user2.location:
            return user1.location == user2.location
        
        return True  # Allow if location not set
    
    async def _create_match_from_queue(
        self,
        entry1: QueueEntry,
        entry2: QueueEntry,
        session: AsyncSession
    ) -> Match:
        """Create a match from two queue entries"""
        # Use slots for both users
        result = await session.execute(
            select(User).where(User.id.in_([entry1.user_id, entry2.user_id]))
        )
        users = result.scalars().all()
        
        for user in users:
            user.available_slots -= 1
            user.total_slots_used += 1
        
        # Create match
        match = Match(
            user1_id=entry1.user_id,
            user2_id=entry2.user_id,
            status="pending",
            created_at=datetime.utcnow()
        )
        
        session.add(match)
        await session.commit()
        await session.refresh(match)
        
        return match
    
    async def cleanup_expired_entries(
        self,
        session: AsyncSession = None
    ) -> int:
        """Clean up expired queue entries"""
        if not session:
            async with get_async_session() as session:
                return await self._cleanup_expired_entries_internal(session)
        
        return await self._cleanup_expired_entries_internal(session)
    
    async def _cleanup_expired_entries_internal(
        self,
        session: AsyncSession
    ) -> int:
        """Internal method to cleanup expired entries"""
        # Find expired entries
        result = await session.execute(
            select(QueueEntry).where(
                and_(
                    QueueEntry.status.in_(["waiting", "processing"]),
                    QueueEntry.created_at < datetime.utcnow() - timedelta(hours=1)
                )
            )
        )
        expired_entries = result.scalars().all()
        
        # Mark as expired
        for entry in expired_entries:
            entry.status = "expired"
        
        await session.commit()
        
        logger.info(f"Cleaned up {len(expired_entries)} expired queue entries")
        return len(expired_entries)
    
    async def _get_queue_entry(
        self,
        user_id: int,
        session: AsyncSession
    ) -> Optional[QueueEntry]:
        """Get queue entry for a user"""
        result = await session.execute(
            select(QueueEntry).where(QueueEntry.user_id == user_id)
        )
        return result.scalar_one_or_none()
    
    def _estimate_wait_time(self, position: int) -> int:
        """Estimate wait time in seconds based on position"""
        # Rough estimate: 30 seconds per position
        return position * 30

# Global queue manager instance
queue_manager = QueueManager() 