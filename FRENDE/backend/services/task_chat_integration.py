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
from models.task_submission import TaskSubmission
from core.database import get_async_session
from services.chat import chat_service
from services.tasks import task_service
from services.task_submission import task_submission_service
from services.coin_rewards import coin_rewards_service

logger = logging.getLogger(__name__)

class TaskChatIntegrationService:
    """Service for handling task-chat integration functionality"""
    
    def __init__(self):
        self.notification_types = {
            'task_assigned': 'Task assigned',
            'task_completed': 'Task completed',
            'task_expiring': 'Task expiring soon',
            'task_replaced': 'Task replaced',
            'task_reward': 'Task reward earned',
            'task_submission': 'Task submission received'
        }
    
    async def submit_task_via_chat(
        self, 
        match_id: int, 
        task_id: int, 
        user_id: int, 
        submission_text: str,
        evidence_url: Optional[str] = None,
        session: AsyncSession = None
    ) -> Dict:
        """Submit task completion via chat interface"""
        if not session:
            async with get_async_session() as session:
                return await self._submit_task_via_chat_internal(
                    match_id, task_id, user_id, submission_text, evidence_url, session
                )
        
        return await self._submit_task_via_chat_internal(
            match_id, task_id, user_id, submission_text, evidence_url, session
        )
    
    async def _submit_task_via_chat_internal(
        self,
        match_id: int,
        task_id: int,
        user_id: int,
        submission_text: str,
        evidence_url: Optional[str],
        session: AsyncSession
    ) -> Dict:
        """Internal method to submit task via chat"""
        try:
            # Validate match and task
            match = await self._validate_match_and_task(match_id, task_id, user_id, session)
            if not match:
                return {"success": False, "error": "Invalid match or task"}
            
            # Create task submission
            submission_data = {
                "task_id": task_id,
                "user_id": user_id,
                "submission_text": submission_text,
                "evidence_url": evidence_url,
                "submission_method": "chat",
                "submitted_at": datetime.utcnow()
            }
            
            submission = await task_submission_service.submit_task_completion(
                task_id, user_id, submission_text, evidence_url, session
            )
            
            if not submission:
                return {"success": False, "error": "Failed to submit task"}
            
            # Send chat message about submission
            chat_message = await chat_service.send_message_to_match(
                match_id,
                user_id,
                f"Task submission: {submission_text}",
                "task_submission",
                session,
                metadata={
                    "task_id": task_id,
                    "submission_id": submission.id,
                    "evidence_url": evidence_url
                }
            )
            
            # Check if both users have completed the task
            task_completion_status = await self._check_task_completion_status(task_id, session)
            
            result = {
                "success": True,
                "message": "Task submitted successfully",
                "submission_id": submission.id,
                "chat_message_id": chat_message.id,
                "task_completion_status": task_completion_status
            }
            
            # If task is completed by both users, handle rewards
            if task_completion_status.get("completed_by_both"):
                reward_result = await self._handle_task_completion_rewards(task_id, session)
                result["reward"] = reward_result
            
            logger.info(f"Task {task_id} submitted via chat by user {user_id}")
            return result
            
        except Exception as e:
            logger.error(f"Error submitting task via chat: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def _validate_match_and_task(
        self, 
        match_id: int, 
        task_id: int, 
        user_id: int, 
        session: AsyncSession
    ) -> Optional[Match]:
        """Validate that match and task are valid for user"""
        try:
            # Check if user is in match
            result = await session.execute(
                select(Match).where(
                    Match.id == match_id,
                    (Match.user1_id == user_id) | (Match.user2_id == user_id)
                )
            )
            match = result.scalar_one_or_none()
            
            if not match:
                return None
            
            # Check if task belongs to this match
            result = await session.execute(
                select(Task).where(
                    Task.id == task_id,
                    Task.match_id == match_id
                )
            )
            task = result.scalar_one_or_none()
            
            if not task:
                return None
            
            return match
            
        except Exception as e:
            logger.error(f"Error validating match and task: {str(e)}")
            return None
    
    async def _check_task_completion_status(
        self, 
        task_id: int, 
        session: AsyncSession
    ) -> Dict:
        """Check if both users have completed the task"""
        try:
            # Get task details
            result = await session.execute(
                select(Task).where(Task.id == task_id)
            )
            task = result.scalar_one_or_none()
            
            if not task:
                return {"completed_by_both": False}
            
            # Get submissions for this task
            result = await session.execute(
                select(TaskSubmission).where(TaskSubmission.task_id == task_id)
            )
            submissions = result.scalars().all()
            
            # Get unique users who submitted
            user_ids = list(set([sub.user_id for sub in submissions]))
            
            # Check if both users in match have submitted
            match_user_ids = [task.match.user1_id, task.match.user2_id]
            completed_by_both = len(user_ids) == 2 and all(uid in user_ids for uid in match_user_ids)
            
            return {
                "completed_by_both": completed_by_both,
                "submissions_count": len(submissions),
                "unique_users": user_ids,
                "match_users": match_user_ids
            }
            
        except Exception as e:
            logger.error(f"Error checking task completion status: {str(e)}")
            return {"completed_by_both": False}
    
    async def _handle_task_completion_rewards(
        self, 
        task_id: int, 
        session: AsyncSession
    ) -> Dict:
        """Handle rewards when both users complete a task"""
        try:
            # Get task details
            result = await session.execute(
                select(Task).where(Task.id == task_id)
            )
            task = result.scalar_one_or_none()
            
            if not task:
                return {"success": False, "error": "Task not found"}
            
            # Award coins to both users
            reward_results = []
            for user_id in [task.match.user1_id, task.match.user2_id]:
                reward_result = await coin_rewards_service.award_coins_to_users(
                    [user_id], 
                    task.reward_coins, 
                    f"Task completion: {task.title}",
                    session
                )
                reward_results.append(reward_result)
            
            # Mark task as completed
            await session.execute(
                update(Task)
                .where(Task.id == task_id)
                .values(
                    completed_at=datetime.utcnow(),
                    is_completed=True
                )
            )
            
            await session.commit()
            
            return {
                "success": True,
                "reward_coins": task.reward_coins,
                "user_rewards": reward_results
            }
            
        except Exception as e:
            logger.error(f"Error handling task completion rewards: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_task_notifications(
        self, 
        match_id: int, 
        user_id: int,
        session: AsyncSession = None
    ) -> List[Dict]:
        """Get task notifications for a match"""
        if not session:
            async with get_async_session() as session:
                return await self._get_task_notifications_internal(match_id, user_id, session)
        
        return await self._get_task_notifications_internal(match_id, user_id, session)
    
    async def _get_task_notifications_internal(
        self, 
        match_id: int, 
        user_id: int,
        session: AsyncSession
    ) -> List[Dict]:
        """Internal method to get task notifications"""
        try:
            # Get tasks for this match
            result = await session.execute(
                select(Task).where(Task.match_id == match_id)
            )
            tasks = result.scalars().all()
            
            notifications = []
            
            for task in tasks:
                # Check for task assignment
                if task.created_at > datetime.utcnow() - timedelta(hours=1):
                    notifications.append({
                        "type": "task_assigned",
                        "task_id": task.id,
                        "title": task.title,
                        "description": task.description,
                        "due_date": task.due_date.isoformat() if task.due_date else None,
                        "timestamp": task.created_at.isoformat(),
                        "is_read": False
                    })
                
                # Check for task completion
                if task.completed_at:
                    notifications.append({
                        "type": "task_completed",
                        "task_id": task.id,
                        "title": task.title,
                        "reward_coins": task.reward_coins,
                        "timestamp": task.completed_at.isoformat(),
                        "is_read": False
                    })
                
                # Check for task expiration warning
                if task.due_date and task.due_date > datetime.utcnow() and task.due_date < datetime.utcnow() + timedelta(hours=2):
                    notifications.append({
                        "type": "task_expiring",
                        "task_id": task.id,
                        "title": task.title,
                        "hours_remaining": int((task.due_date - datetime.utcnow()).total_seconds() / 3600),
                        "timestamp": datetime.utcnow().isoformat(),
                        "is_read": False
                    })
            
            return notifications
            
        except Exception as e:
            logger.error(f"Error getting task notifications: {str(e)}")
            return []
    
    async def mark_notification_read(
        self, 
        notification_id: str,
        user_id: int,
        session: AsyncSession = None
    ) -> bool:
        """Mark a task notification as read"""
        if not session:
            async with get_async_session() as session:
                return await self._mark_notification_read_internal(notification_id, user_id, session)
        
        return await self._mark_notification_read_internal(notification_id, user_id, session)
    
    async def _mark_notification_read_internal(
        self, 
        notification_id: str,
        user_id: int,
        session: AsyncSession
    ) -> bool:
        """Internal method to mark notification as read"""
        try:
            # This would update a notifications table
            # For now, just return success
            logger.info(f"Marked notification {notification_id} as read for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error marking notification as read: {str(e)}")
            return False
    
    async def get_task_status(
        self, 
        match_id: int,
        session: AsyncSession = None
    ) -> Dict:
        """Get current task status for a match"""
        if not session:
            async with get_async_session() as session:
                return await self._get_task_status_internal(match_id, session)
        
        return await self._get_task_status_internal(match_id, session)
    
    async def _get_task_status_internal(
        self, 
        match_id: int,
        session: AsyncSession
    ) -> Dict:
        """Internal method to get task status"""
        try:
            # Get current active task
            result = await session.execute(
                select(Task).where(
                    Task.match_id == match_id,
                    Task.is_completed == False,
                    Task.due_date > datetime.utcnow()
                ).order_by(Task.created_at.desc())
            )
            current_task = result.scalar_one_or_none()
            
            if not current_task:
                return {"has_active_task": False}
            
            # Get submission status
            result = await session.execute(
                select(TaskSubmission).where(TaskSubmission.task_id == current_task.id)
            )
            submissions = result.scalars().all()
            
            submitted_user_ids = [sub.user_id for sub in submissions]
            
            return {
                "has_active_task": True,
                "task": {
                    "id": current_task.id,
                    "title": current_task.title,
                    "description": current_task.description,
                    "due_date": current_task.due_date.isoformat() if current_task.due_date else None,
                    "reward_coins": current_task.reward_coins,
                    "created_at": current_task.created_at.isoformat()
                },
                "submissions": {
                    "count": len(submissions),
                    "user_ids": submitted_user_ids
                },
                "time_remaining": (current_task.due_date - datetime.utcnow()).total_seconds() if current_task.due_date else None
            }
            
        except Exception as e:
            logger.error(f"Error getting task status: {str(e)}")
            return {"has_active_task": False}
    
    async def send_task_notification(
        self,
        match_id: int,
        notification_type: str,
        task_id: int,
        message: str,
        session: AsyncSession = None
    ) -> bool:
        """Send a task notification via chat"""
        if not session:
            async with get_async_session() as session:
                return await self._send_task_notification_internal(
                    match_id, notification_type, task_id, message, session
                )
        
        return await self._send_task_notification_internal(
            match_id, notification_type, task_id, message, session
        )
    
    async def _send_task_notification_internal(
        self,
        match_id: int,
        notification_type: str,
        task_id: int,
        message: str,
        session: AsyncSession
    ) -> bool:
        """Internal method to send task notification"""
        try:
            # Send system message about task notification
            await chat_service.send_message_to_match(
                match_id,
                None,  # System message
                message,
                "task_notification",
                session,
                metadata={
                    "task_id": task_id,
                    "notification_type": notification_type,
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
            
            logger.info(f"Sent task notification: {notification_type} for task {task_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error sending task notification: {str(e)}")
            return False

# Global task chat integration service instance
task_chat_integration_service = TaskChatIntegrationService() 