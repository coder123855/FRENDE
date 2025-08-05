import asyncio
import logging
from typing import List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from core.database import get_async_session
from services.queue_manager import queue_manager
from services.matching import matching_service
from sqlalchemy import select

logger = logging.getLogger(__name__)

class BackgroundTaskProcessor:
    """Service for handling background tasks like queue processing"""
    
    def __init__(self):
        self.is_running = False
        self.processing_interval = 30  # seconds
        self.cleanup_interval = 300  # 5 minutes
        self.slot_reset_interval = 86400  # 24 hours
        
    async def start_queue_processor(self):
        """Start the background queue processor"""
        if self.is_running:
            logger.warning("Queue processor is already running")
            return
        
        self.is_running = True
        logger.info("Starting background queue processor")
        
        try:
            while self.is_running:
                await self.process_matching_queue()
                await asyncio.sleep(self.processing_interval)
        except Exception as e:
            logger.error(f"Error in queue processor: {e}")
            self.is_running = False
        finally:
            logger.info("Background queue processor stopped")
    
    async def stop_queue_processor(self):
        """Stop the background queue processor"""
        self.is_running = False
        logger.info("Stopping background queue processor")
    
    async def process_matching_queue(self):
        """Process the matching queue and create matches"""
        try:
            async with get_async_session() as session:
                # Process queue batch
                matches = await queue_manager.process_queue_batch(session)
                
                if matches:
                    logger.info(f"Created {len(matches)} matches from queue")
                    
                    # Send notifications for new matches
                    await self.send_match_notifications(matches)
                
                # Cleanup expired entries
                expired_count = await queue_manager.cleanup_expired_entries(session)
                if expired_count > 0:
                    logger.info(f"Cleaned up {expired_count} expired queue entries")
                
                # Reset expired slots
                await self.reset_expired_slots(session)
                
        except Exception as e:
            logger.error(f"Error processing matching queue: {e}")
    
    async def send_match_notifications(self, matches: List):
        """Send notifications for new matches"""
        try:
            for match in matches:
                # TODO: Implement WebSocket notifications
                logger.info(f"New match created: {match.id} between users {match.user1_id} and {match.user2_id}")
                
                # Send notification to both users
                await self._send_match_notification(match.user1_id, match)
                await self._send_match_notification(match.user2_id, match)
                
        except Exception as e:
            logger.error(f"Error sending match notifications: {e}")
    
    async def _send_match_notification(self, user_id: int, match):
        """Send match notification to a specific user"""
        # TODO: Implement WebSocket notification
        logger.info(f"Sending match notification to user {user_id} for match {match.id}")
    
    async def reset_expired_slots(self, session: AsyncSession):
        """Reset expired user slots"""
        try:
            # This is already implemented in the matching service
            # We just call it periodically
            await matching_service.reset_expired_slots(session)
        except Exception as e:
            logger.error(f"Error resetting expired slots: {e}")
    
    async def update_queue_metrics(self):
        """Update queue performance metrics"""
        try:
            async with get_async_session() as session:
                # Get queue statistics
                stats = await self._get_queue_statistics(session)
                
                # Log metrics
                logger.info(f"Queue metrics: {stats}")
                
                # TODO: Store metrics in database or send to monitoring service
                
        except Exception as e:
            logger.error(f"Error updating queue metrics: {e}")
    
    async def _get_queue_statistics(self, session: AsyncSession) -> Dict[str, Any]:
        """Get queue statistics"""
        from sqlalchemy import func
        from models.queue_entry import QueueEntry
        
        # Count entries by status
        result = await session.execute(
            select(QueueEntry.status, func.count(QueueEntry.id))
            .group_by(QueueEntry.status)
        )
        status_counts = dict(result.all())
        
        # Get average wait time
        result = await session.execute(
            select(func.avg(func.extract('epoch', func.now() - QueueEntry.created_at)))
            .where(QueueEntry.status == "waiting")
        )
        avg_wait_time = result.scalar() or 0
        
        # Get queue length
        result = await session.execute(
            select(func.count(QueueEntry.id))
            .where(QueueEntry.status == "waiting")
        )
        queue_length = result.scalar() or 0
        
        return {
            "queue_length": queue_length,
            "status_counts": status_counts,
            "avg_wait_time_seconds": avg_wait_time,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def run_maintenance_tasks(self):
        """Run periodic maintenance tasks"""
        try:
            async with get_async_session() as session:
                # Cleanup expired matches
                await self._cleanup_expired_matches(session)
                
                # Update queue metrics
                await self.update_queue_metrics()
                
                # TODO: Add more maintenance tasks as needed
                
        except Exception as e:
            logger.error(f"Error in maintenance tasks: {e}")
    
    async def _cleanup_expired_matches(self, session: AsyncSession):
        """Cleanup expired matches"""
        try:
            # This is already implemented in the matching service
            await matching_service.cleanup_expired_matches(session)
        except Exception as e:
            logger.error(f"Error cleaning up expired matches: {e}")
    
    async def start_background_tasks(self):
        """Start all background tasks"""
        logger.info("Starting all background tasks")
        
        # Start queue processor
        queue_task = asyncio.create_task(self.start_queue_processor())
        
        # Start maintenance tasks
        maintenance_task = asyncio.create_task(self._run_maintenance_loop())
        
        return [queue_task, maintenance_task]
    
    async def _run_maintenance_loop(self):
        """Run maintenance tasks in a loop"""
        while self.is_running:
            try:
                await self.run_maintenance_tasks()
                await asyncio.sleep(self.cleanup_interval)
            except Exception as e:
                logger.error(f"Error in maintenance loop: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying

# Global background task processor instance
background_processor = BackgroundTaskProcessor() 