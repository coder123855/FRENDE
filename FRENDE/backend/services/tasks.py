import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from models.task import Task
from models.match import Match
from models.user import User
from core.database import get_async_session
from core.config import settings
from core.exceptions import MatchNotFoundError, TaskNotFoundError, UserNotInMatchError

logger = logging.getLogger(__name__)

class TaskService:
    """Service for managing tasks and task generation"""
    
    def __init__(self):
        self.task_expiration_hours = settings.TASK_EXPIRATION_HOURS
        self.task_templates = {
            "bonding": [
                "Tell your friend about your first pet",
                "Share your favorite childhood memory",
                "What's your dream vacation destination?",
                "Describe your perfect day",
                "What's your biggest fear and how do you cope with it?",
                "Share a funny story from your life",
                "What's your favorite book and why?",
                "Describe your ideal friend",
                "What's your biggest achievement so far?",
                "Share something you're passionate about"
            ],
            "generic": [
                "What's your favorite color and why?",
                "If you could have any superpower, what would it be?",
                "What's your favorite food?",
                "Describe your perfect weekend",
                "What's your favorite movie genre?",
                "If you could travel anywhere, where would you go?",
                "What's your favorite season and why?",
                "Describe your ideal job",
                "What's your biggest goal in life?",
                "Share something that makes you happy"
            ],
            "interest-based": [
                "What hobbies do you enjoy in your free time?",
                "What type of music do you listen to?",
                "Do you enjoy sports? Which ones?",
                "What's your favorite way to relax?",
                "Do you like to read? What genres?",
                "What's your favorite way to spend time with friends?",
                "Do you enjoy cooking? What's your favorite dish?",
                "What's your favorite type of art or creative activity?",
                "Do you enjoy traveling? Where have you been?",
                "What's your favorite way to learn new things?"
            ]
        }
    
    async def generate_task(
        self,
        match_id: int,
        task_type: str = "bonding",
        session: AsyncSession = None
    ) -> Task:
        """Generate a new task for a match"""
        if not session:
            async with get_async_session() as session:
                return await self._generate_task_internal(match_id, task_type, session)
        
        return await self._generate_task_internal(match_id, task_type, session)
    
    async def _generate_task_internal(
        self,
        match_id: int,
        task_type: str = "bonding",
        session: AsyncSession = None
    ) -> Task:
        """Internal method to generate a task"""
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
            raise MatchNotFoundError(f"Match {match_id} not found or not active")
        
        # Generate task content
        if task_type == "interest-based":
            title, description = await self._generate_interest_based_task(session)
        else:
            title, description = self._generate_template_task(task_type)
        
        # Create task
        task = Task(
            match_id=match_id,
            title=title,
            description=description,
            task_type=task_type,
            status="active",
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(hours=self.task_expiration_hours)
        )
        
        session.add(task)
        await session.commit()
        await session.refresh(task)
        
        logger.info(f"Generated task {task.id} for match {match_id}")
        return task
    
    def _generate_template_task(self, task_type: str) -> tuple[str, str]:
        """Generate task from templates"""
        templates = self.task_templates.get(task_type, self.task_templates["bonding"])
        template = random.choice(templates)
        
        title = template
        description = f"Complete this task together: {template}"
        
        return title, description
    
    async def _generate_interest_based_task(self, session: AsyncSession) -> tuple[str, str]:
        """Generate task based on user interests"""
        # This method needs to be implemented to fetch user interests from the match
        # For now, it will generate a generic bonding task if no interests are found
        # In a real application, you would fetch interests from the match or user profiles
        interests = ["friends", "family", "hobbies", "music", "movies"] # Placeholder
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
            async with get_async_session() as session:
                return await self._complete_task_internal(task_id, user_id, session)
        
        return await self._complete_task_internal(task_id, user_id, session)

    async def _complete_task_internal(
        self,
        task_id: int,
        user_id: int,
        session: AsyncSession
    ) -> Task:
        """Internal method to complete task"""
        # Get task
        result = await session.execute(
            select(Task).where(Task.id == task_id)
        )
        task = result.scalar_one_or_none()
        
        if not task:
            raise TaskNotFoundError(f"Task {task_id} not found")
        
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
            raise UserNotInMatchError(f"User {user_id} is not part of match {task.match_id}")
        
        # Mark task as completed by this user
        if task.completed_by_user1 is None and match.user1_id == user_id:
            task.completed_by_user1 = True
            task.completed_at_user1 = datetime.utcnow()
        elif task.completed_by_user2 is None and match.user2_id == user_id:
            task.completed_by_user2 = True
            task.completed_at_user2 = datetime.utcnow()
        else:
            raise TaskNotFoundError(f"Task {task_id} already completed by user {user_id}")
        
        # Check if both users completed the task
        if task.completed_by_user1 and task.completed_by_user2:
            task.is_completed = True
            task.completed_at = datetime.utcnow()
            
            # Award coins to both users
            await self._award_task_coins(task, match, session)
        
        await session.commit()
        await session.refresh(task)
        
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
            async with get_async_session() as session:
                return await self._get_match_tasks_internal(match_id, user_id, session)
        
        return await self._get_match_tasks_internal(match_id, user_id, session)

    async def _get_match_tasks_internal(
        self,
        match_id: int,
        user_id: int,
        session: AsyncSession
    ) -> List[Task]:
        """Internal method to get tasks for a match"""
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
            raise UserNotInMatchError(f"User {user_id} is not part of match {match_id}")
        
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
            async with get_async_session() as session:
                return await self._get_task_details_internal(task_id, user_id, session)
        
        return await self._get_task_details_internal(task_id, user_id, session)

    async def _get_task_details_internal(
        self,
        task_id: int,
        user_id: int,
        session: AsyncSession
    ) -> Optional[Task]:
        """Internal method to get task details"""
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
            async with get_async_session() as session:
                return await self._replace_expired_tasks_internal(session)
        
        return await self._replace_expired_tasks_internal(session)

    async def _replace_expired_tasks_internal(self, session: AsyncSession):
        """Internal method to replace expired tasks"""
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
            async with get_async_session() as session:
                return await self._get_task_history_internal(user_id, session)
        
        return await self._get_task_history_internal(user_id, session)

    async def _get_task_history_internal(
        self,
        user_id: int,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """Internal method to get task history"""
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