from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, func
from datetime import datetime, timedelta
import logging
import random

from models.task import Task
from models.match import Match
from models.user import User
from services.chat import chat_service
from core.websocket import manager

logger = logging.getLogger(__name__)

class TaskService:
    """Service for managing tasks and task generation"""
    
    def __init__(self):
        self.task_templates = {
            "bonding": [
                "Tell your friend about your favorite childhood memory",
                "Share a funny story that happened to you recently",
                "What's your biggest fear and why?",
                "If you could have dinner with anyone, who would it be?",
                "What's the most embarrassing thing that happened to you?",
                "Share your biggest dream or goal in life",
                "What's your favorite way to spend a weekend?",
                "Tell a joke that always makes you laugh",
                "What's your favorite food and why?",
                "Share something you're proud of"
            ],
            "generic": [
                "Ask your friend about their day",
                "Share something interesting you learned today",
                "What's your favorite movie and why?",
                "Tell your friend about your hobbies",
                "Share your favorite music or song",
                "What's your ideal vacation destination?",
                "Ask about their family or friends",
                "Share a book you recently read",
                "What's your favorite season and why?",
                "Tell about your favorite place to visit"
            ]
        }
    
    async def generate_task(
        self,
        match_id: int,
        task_type: str = "bonding",
        user_interests: Optional[List[str]] = None,
        session: AsyncSession = None
    ) -> Task:
        """Generate a new task for a match"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        # Verify match exists and is active
        result = await session.execute(
            select(Match).where(
                and_(
                    Match.id == match_id,
                    Match.status == "active"
                )
            )
        )
        match = result.scalar_one_or_none()
        
        if not match:
            raise ValueError("Match not found or not active")
        
        # Generate task content
        if task_type == "interest-based" and user_interests:
            title, description = await self._generate_interest_based_task(user_interests)
        else:
            title, description = self._generate_template_task(task_type)
        
        # Create task
        task = Task(
            title=title,
            description=description,
            task_type=task_type,
            match_id=match_id,
            coin_reward=random.randint(5, 15),
            ai_generated=True,
            expires_at=datetime.utcnow() + timedelta(days=1)
        )
        
        session.add(task)
        await session.commit()
        await session.refresh(task)
        
        # Send task notification via WebSocket
        await chat_service.send_task_notification(match_id, task, session)
        
        logger.info(f"Generated task {task.id} for match {match_id}")
        return task
    
    def _generate_template_task(self, task_type: str) -> tuple[str, str]:
        """Generate task from templates"""
        templates = self.task_templates.get(task_type, self.task_templates["bonding"])
        template = random.choice(templates)
        
        title = template
        description = f"Complete this task together: {template}"
        
        return title, description
    
    async def _generate_interest_based_task(self, interests: List[str]) -> tuple[str, str]:
        """Generate task based on user interests"""
        if not interests:
            return self._generate_template_task("bonding")
        
        interest = random.choice(interests)
        
        title = f"Share your thoughts about {interest}"
        description = f"Tell your friend about your experience with {interest} and ask them about theirs"
        
        return title, description
    
    async def complete_task(
        self,
        task_id: int,
        user_id: int,
        session: AsyncSession = None
    ) -> Task:
        """Mark a task as completed by a user"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        # Get task
        result = await session.execute(
            select(Task).where(Task.id == task_id)
        )
        task = result.scalar_one_or_none()
        
        if not task:
            raise ValueError("Task not found")
        
        # Verify user is part of the match
        result = await session.execute(
            select(Match).where(
                and_(
                    Match.id == task.match_id,
                    or_(Match.user1_id == user_id, Match.user2_id == user_id)
                )
            )
        )
        match = result.scalar_one_or_none()
        
        if not match:
            raise ValueError("User not part of this match")
        
        # Mark task as completed by user
        task.mark_completed_by_user(user_id, match)
        await session.commit()
        await session.refresh(task)
        
        # Send completion notification
        result = await session.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        
        if user:
            await chat_service.send_task_completion_notification(
                task.match_id, task, user, session
            )
        
        # Award coins if both users completed
        if task.is_completed:
            await self._award_task_coins(task, match, session)
        
        logger.info(f"Task {task_id} completed by user {user_id}")
        return task
    
    async def _award_task_coins(self, task: Task, match: Match, session: AsyncSession):
        """Award coins to both users for completing a task"""
        # Award coins to both users
        if match.user1_id:
            result = await session.execute(
                select(User).where(User.id == match.user1_id)
            )
            user1 = result.scalar_one_or_none()
            if user1:
                user1.coins += task.coin_reward
                match.coins_earned_user1 += task.coin_reward
        
        if match.user2_id:
            result = await session.execute(
                select(User).where(User.id == match.user2_id)
            )
            user2 = result.scalar_one_or_none()
            if user2:
                user2.coins += task.coin_reward
                match.coins_earned_user2 += task.coin_reward
        
        await session.commit()
        logger.info(f"Awarded {task.coin_reward} coins to both users for task {task.id}")
    
    async def get_match_tasks(
        self,
        match_id: int,
        user_id: int,
        session: AsyncSession = None
    ) -> List[Task]:
        """Get tasks for a match"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        # Verify user is part of the match
        result = await session.execute(
            select(Match).where(
                and_(
                    Match.id == match_id,
                    or_(Match.user1_id == user_id, Match.user2_id == user_id)
                )
            )
        )
        match = result.scalar_one_or_none()
        
        if not match:
            raise ValueError("User not part of this match")
        
        # Get active tasks
        result = await session.execute(
            select(Task).where(
                and_(
                    Task.match_id == match_id,
                    Task.is_completed == False,
                    Task.expires_at > datetime.utcnow()
                )
            )
        )
        return result.scalars().all()
    
    async def get_task_details(
        self,
        task_id: int,
        user_id: int,
        session: AsyncSession = None
    ) -> Optional[Task]:
        """Get detailed task information"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        # Get task
        result = await session.execute(
            select(Task).where(Task.id == task_id)
        )
        task = result.scalar_one_or_none()
        
        if not task:
            return None
        
        # Verify user is part of the match
        result = await session.execute(
            select(Match).where(
                and_(
                    Match.id == task.match_id,
                    or_(Match.user1_id == user_id, Match.user2_id == user_id)
                )
            )
        )
        match = result.scalar_one_or_none()
        
        if not match:
            return None
        
        return task
    
    async def replace_expired_tasks(self, session: AsyncSession = None):
        """Replace expired tasks with new ones"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        # Find expired tasks
        result = await session.execute(
            select(Task).where(
                and_(
                    Task.is_completed == False,
                    Task.expires_at < datetime.utcnow()
                )
            )
        )
        expired_tasks = result.scalars().all()
        
        for task in expired_tasks:
            # Generate new task
            new_task = await self.generate_task(
                task.match_id,
                task.task_type,
                session=session
            )
            
            # Mark old task as expired
            task.expires_at = datetime.utcnow()
            
            logger.info(f"Replaced expired task {task.id} with new task {new_task.id}")
        
        await session.commit()
    
    async def get_task_history(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> Dict[str, Any]:
        """Get task completion history for a user"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        # Get completed tasks
        result = await session.execute(
            select(Task).join(Match).where(
                and_(
                    or_(Match.user1_id == user_id, Match.user2_id == user_id),
                    Task.is_completed == True
                )
            )
        )
        completed_tasks = result.scalars().all()
        
        total_completed = len(completed_tasks)
        total_coins_earned = sum(task.coin_reward for task in completed_tasks)
        
        # Calculate completion rate (tasks completed vs total tasks)
        result = await session.execute(
            select(func.count(Task.id)).join(Match).where(
                or_(Match.user1_id == user_id, Match.user2_id == user_id)
            )
        )
        total_tasks = result.scalar() or 0
        
        completion_rate = (total_completed / total_tasks * 100) if total_tasks > 0 else 0
        
        return {
            "completed_tasks": completed_tasks,
            "total_completed": total_completed,
            "total_coins_earned": total_coins_earned,
            "completion_rate": completion_rate
        }

# Global task service instance
task_service = TaskService() 