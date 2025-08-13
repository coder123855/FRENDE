from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, insert
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import logging
import json

from models.match import Match
from models.user import User
from models.task import Task
from models.chat import ChatMessage
from core.database import get_async_session
from services.chat import chat_service
from services.tasks import task_service

logger = logging.getLogger(__name__)

class TaskNotificationService:
    """Service for managing task-related notifications"""
    
    def __init__(self):
        self.notification_types = {
            'task_assigned': 'Task assigned',
            'task_completed': 'Task completed',
            'task_expiring': 'Task expiring soon',
            'task_replaced': 'Task replaced',
            'task_reward': 'Task reward earned',
            'task_submission': 'Task submission received'
        }
    
    async def send_task_assignment_notification(
        self,
        match_id: int,
        task_id: int,
        session: AsyncSession = None
    ) -> bool:
        """Send notification when a task is assigned"""
        if not session:
            async with get_async_session() as session:
                return await self._send_task_assignment_notification_internal(match_id, task_id, session)
        
        return await self._send_task_assignment_notification_internal(match_id, task_id, session)
    
    async def _send_task_assignment_notification_internal(
        self,
        match_id: int,
        task_id: int,
        session: AsyncSession
    ) -> bool:
        """Internal method to send task assignment notification"""
        try:
            # Get task details
            result = await session.execute(
                select(Task).where(Task.id == task_id)
            )
            task = result.scalar_one_or_none()
            
            if not task:
                return False
            
            # Get match details
            result = await session.execute(
                select(Match).where(Match.id == match_id)
            )
            match = result.scalar_one_or_none()
            
            if not match:
                return False
            
            # Send notification to both users
            message = f"🎯 New task assigned: {task.title}\n\n{task.description}\n\nReward: {task.reward_coins} coins"
            
            await chat_service.send_message_to_match(
                match_id,
                None,  # System message
                message,
                "task_notification",
                session,
                metadata={
                    "task_id": task_id,
                    "notification_type": "task_assigned",
                    "task_title": task.title,
                    "task_description": task.description,
                    "reward_coins": task.reward_coins,
                    "due_date": task.due_date.isoformat() if task.due_date else None,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            logger.info(f"Sent task assignment notification for task {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending task assignment notification: {str(e)}")
            return False
    
    async def send_task_completion_notification(
        self,
        match_id: int,
        task_id: int,
        completed_by_user_id: int,
        session: AsyncSession = None
    ) -> bool:
        """Send notification when a task is completed"""
        if not session:
            async with get_async_session() as session:
                return await self._send_task_completion_notification_internal(
                    match_id, task_id, completed_by_user_id, session
                )
        
        return await self._send_task_completion_notification_internal(
            match_id, task_id, completed_by_user_id, session
        )
    
    async def _send_task_completion_notification_internal(
        self,
        match_id: int,
        task_id: int,
        completed_by_user_id: int,
        session: AsyncSession
    ) -> bool:
        """Internal method to send task completion notification"""
        try:
            # Get task details
            result = await session.execute(
                select(Task).where(Task.id == task_id)
            )
            task = result.scalar_one_or_none()
            
            if not task:
                return False
            
            # Get user details
            result = await session.execute(
                select(User).where(User.id == completed_by_user_id)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                return False
            
            # Check if both users completed the task
            result = await session.execute(
                select(Task).where(Task.id == task_id)
            )
            task = result.scalar_one_or_none()
            
            if task and task.is_completed:
                message = f"🎉 Task completed by both users!\n\nTask: {task.title}\nReward: {task.reward_coins} coins each"
            else:
                message = f"✅ Task submission received from {user.name}\n\nTask: {task.title}"
            
            await chat_service.send_message_to_match(
                match_id,
                None,  # System message
                message,
                "task_notification",
                session,
                metadata={
                    "task_id": task_id,
                    "notification_type": "task_completed",
                    "completed_by_user_id": completed_by_user_id,
                    "completed_by_user_name": user.name,
                    "task_title": task.title,
                    "reward_coins": task.reward_coins,
                    "is_fully_completed": task.is_completed if task else False,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            logger.info(f"Sent task completion notification for task {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending task completion notification: {str(e)}")
            return False
    
    async def send_task_expiration_warning(
        self,
        match_id: int,
        task_id: int,
        hours_remaining: int,
        session: AsyncSession = None
    ) -> bool:
        """Send warning when a task is about to expire"""
        if not session:
            async with get_async_session() as session:
                return await self._send_task_expiration_warning_internal(
                    match_id, task_id, hours_remaining, session
                )
        
        return await self._send_task_expiration_warning_internal(
            match_id, task_id, hours_remaining, session
        )
    
    async def _send_task_expiration_warning_internal(
        self,
        match_id: int,
        task_id: int,
        hours_remaining: int,
        session: AsyncSession
    ) -> bool:
        """Internal method to send task expiration warning"""
        try:
            # Get task details
            result = await session.execute(
                select(Task).where(Task.id == task_id)
            )
            task = result.scalar_one_or_none()
            
            if not task:
                return False
            
            message = f"⏰ Task expiring soon!\n\nTask: {task.title}\nTime remaining: {hours_remaining} hours\n\nComplete it before it expires!"
            
            await chat_service.send_message_to_match(
                match_id,
                None,  # System message
                message,
                "task_notification",
                session,
                metadata={
                    "task_id": task_id,
                    "notification_type": "task_expiring",
                    "task_title": task.title,
                    "hours_remaining": hours_remaining,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            logger.info(f"Sent task expiration warning for task {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending task expiration warning: {str(e)}")
            return False
    
    async def send_task_replacement_notification(
        self,
        match_id: int,
        old_task_id: int,
        new_task_id: int,
        reason: str,
        session: AsyncSession = None
    ) -> bool:
        """Send notification when a task is replaced"""
        if not session:
            async with get_async_session() as session:
                return await self._send_task_replacement_notification_internal(
                    match_id, old_task_id, new_task_id, reason, session
                )
        
        return await self._send_task_replacement_notification_internal(
            match_id, old_task_id, new_task_id, reason, session
        )
    
    async def _send_task_replacement_notification_internal(
        self,
        match_id: int,
        old_task_id: int,
        new_task_id: int,
        reason: str,
        session: AsyncSession
    ) -> bool:
        """Internal method to send task replacement notification"""
        try:
            # Get new task details
            result = await session.execute(
                select(Task).where(Task.id == new_task_id)
            )
            new_task = result.scalar_one_or_none()
            
            if not new_task:
                return False
            
            reason_text = {
                "expired": "The previous task expired",
                "completed": "The previous task was completed",
                "replaced": "The previous task was replaced"
            }.get(reason, "The previous task was replaced")
            
            message = f"🔄 {reason_text}\n\nNew task: {new_task.title}\n\n{new_task.description}\n\nReward: {new_task.reward_coins} coins"
            
            await chat_service.send_message_to_match(
                match_id,
                None,  # System message
                message,
                "task_notification",
                session,
                metadata={
                    "old_task_id": old_task_id,
                    "new_task_id": new_task_id,
                    "notification_type": "task_replaced",
                    "reason": reason,
                    "new_task_title": new_task.title,
                    "new_task_description": new_task.description,
                    "reward_coins": new_task.reward_coins,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            logger.info(f"Sent task replacement notification: {old_task_id} -> {new_task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending task replacement notification: {str(e)}")
            return False
    
    async def send_task_reward_notification(
        self,
        match_id: int,
        task_id: int,
        user_id: int,
        coins_earned: int,
        session: AsyncSession = None
    ) -> bool:
        """Send notification when task rewards are earned"""
        if not session:
            async with get_async_session() as session:
                return await self._send_task_reward_notification_internal(
                    match_id, task_id, user_id, coins_earned, session
                )
        
        return await self._send_task_reward_notification_internal(
            match_id, task_id, user_id, coins_earned, session
        )
    
    async def _send_task_reward_notification_internal(
        self,
        match_id: int,
        task_id: int,
        user_id: int,
        coins_earned: int,
        session: AsyncSession
    ) -> bool:
        """Internal method to send task reward notification"""
        try:
            # Get task details
            result = await session.execute(
                select(Task).where(Task.id == task_id)
            )
            task = result.scalar_one_or_none()
            
            if not task:
                return False
            
            # Get user details
            result = await session.execute(
                select(User).where(User.id == user_id)
            )
            user = result.scalar_one_or_none()
            
            if not user:
                return False
            
            message = f"💰 {user.name} earned {coins_earned} coins for completing: {task.title}"
            
            await chat_service.send_message_to_match(
                match_id,
                None,  # System message
                message,
                "task_notification",
                session,
                metadata={
                    "task_id": task_id,
                    "notification_type": "task_reward",
                    "user_id": user_id,
                    "user_name": user.name,
                    "coins_earned": coins_earned,
                    "task_title": task.title,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            logger.info(f"Sent task reward notification for user {user_id}: {coins_earned} coins")
            return True
            
        except Exception as e:
            logger.error(f"Error sending task reward notification: {str(e)}")
            return False
    
    async def get_pending_notifications(
        self,
        match_id: int,
        session: AsyncSession = None
    ) -> List[Dict]:
        """Get pending notifications for a match"""
        if not session:
            async with get_async_session() as session:
                return await self._get_pending_notifications_internal(match_id, session)
        
        return await self._get_pending_notifications_internal(match_id, session)
    
    async def _get_pending_notifications_internal(
        self,
        match_id: int,
        session: AsyncSession
    ) -> List[Dict]:
        """Internal method to get pending notifications"""
        try:
            # Get tasks for this match
            result = await session.execute(
                select(Task).where(Task.match_id == match_id)
            )
            tasks = result.scalars().all()
            
            pending_notifications = []
            
            for task in tasks:
                # Check for expiring tasks
                if (task.due_date and 
                    task.due_date > datetime.utcnow() and 
                    task.due_date < datetime.utcnow() + timedelta(hours=2) and
                    not task.is_completed):
                    
                    hours_remaining = int((task.due_date - datetime.utcnow()).total_seconds() / 3600)
                    
                    pending_notifications.append({
                        "type": "task_expiring",
                        "task_id": task.id,
                        "task_title": task.title,
                        "hours_remaining": hours_remaining,
                        "timestamp": datetime.utcnow().isoformat()
                    })
            
            return pending_notifications
            
        except Exception as e:
            logger.error(f"Error getting pending notifications: {str(e)}")
            return []
    
    async def check_and_send_notifications(
        self,
        session: AsyncSession = None
    ) -> List[Dict]:
        """Check for and send pending notifications"""
        if not session:
            async with get_async_session() as session:
                return await self._check_and_send_notifications_internal(session)
        
        return await self._check_and_send_notifications_internal(session)
    
    async def _check_and_send_notifications_internal(
        self,
        session: AsyncSession
    ) -> List[Dict]:
        """Internal method to check and send notifications"""
        try:
            # Get all active matches
            result = await session.execute(
                select(Match).where(Match.status == "active")
            )
            matches = result.scalars().all()
            
            sent_notifications = []
            
            for match in matches:
                # Get pending notifications for this match
                pending = await self.get_pending_notifications(match.id, session)
                
                for notification in pending:
                    if notification["type"] == "task_expiring":
                        success = await self.send_task_expiration_warning(
                            match.id,
                            notification["task_id"],
                            notification["hours_remaining"],
                            session
                        )
                        
                        if success:
                            sent_notifications.append({
                                "match_id": match.id,
                                "notification_type": notification["type"],
                                "task_id": notification["task_id"],
                                "timestamp": datetime.utcnow().isoformat()
                            })
            
            logger.info(f"Sent {len(sent_notifications)} notifications")
            return sent_notifications
            
        except Exception as e:
            logger.error(f"Error checking and sending notifications: {str(e)}")
            return []

# Global task notification service instance
task_notification_service = TaskNotificationService() 