import logging
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.orm import selectinload, joinedload
from models.task import Task, TaskDifficulty, TaskCategory
from models.match import Match
from models.user import User
from core.database import get_async_session
from core.exceptions import UserNotInMatchError, TaskNotFoundError
from core.performance_monitor import performance_monitor

logger = logging.getLogger(__name__)

class TaskService:
    """Service for managing tasks and task generation"""
    
    def __init__(self):
        self.task_cache: Dict[str, Task] = {}
        self.max_cache_size = 100
    
    async def get_match_tasks(
        self,
        match_id: int,
        user_id: int,
        session: AsyncSession = None
    ) -> List[Task]:
        """Get tasks for a match with optimized query and eager loading"""
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
        """Internal method to get tasks for a match with optimized query"""
        async with performance_monitor("get_match_tasks", user_id=user_id):
            # Verify user is part of the match with optimized query
            result = await session.execute(
                select(Match)
                .where(
                    and_(
                        Match.id == match_id,
                        or_(Match.user1_id == user_id, Match.user2_id == user_id)
                    )
                )
            )
            match = result.scalar_one_or_none()
            
            if not match:
                raise UserNotInMatchError(f"User {user_id} is not part of match {match_id}")
            
            # Get active tasks with optimized query and eager loading
            result = await session.execute(
                select(Task)
                .where(
                    and_(
                        Task.match_id == match_id,
                        Task.is_completed == False,
                        or_(
                            Task.expires_at > datetime.utcnow(),
                            Task.expires_at.is_(None)
                        )
                    )
                )
                .options(
                    selectinload(Task.match),
                    selectinload(Task.submissions)
                )
                .order_by(desc(Task.created_at))
            )
            return result.scalars().all()
    
    async def get_task_details(
        self,
        task_id: int,
        user_id: int,
        session: AsyncSession = None
    ) -> Optional[Task]:
        """Get detailed information about a specific task with optimized query"""
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
        """Internal method to get task details with optimized query"""
        async with performance_monitor("get_task_details", user_id=user_id):
            # Get task with eager loading
            result = await session.execute(
                select(Task)
                .where(Task.id == task_id)
                .options(
                    selectinload(Task.match),
                    selectinload(Task.submissions)
                )
            )
            task = result.scalar_one_or_none()
            
            if not task:
                return None
            
            # Verify user is part of the match
            if task.match.user1_id != user_id and task.match.user2_id != user_id:
                raise UserNotInMatchError(f"User {user_id} is not part of match {task.match_id}")
            
            return task
    
    async def get_task_progress(
        self,
        task_id: int,
        user_id: int,
        session: AsyncSession = None
    ) -> Dict[str, Any]:
        """Get task progress with optimized query"""
        if not session:
            async with get_async_session() as session:
                return await self._get_task_progress_internal(task_id, user_id, session)
        
        return await self._get_task_progress_internal(task_id, user_id, session)
    
    async def _get_task_progress_internal(
        self,
        task_id: int,
        user_id: int,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """Internal method to get task progress with optimized query"""
        async with performance_monitor("get_task_progress", user_id=user_id):
            # Get task with submissions using eager loading
            result = await session.execute(
                select(Task)
                .where(Task.id == task_id)
                .options(
                    selectinload(Task.submissions),
                    selectinload(Task.match)
                )
            )
            task = result.scalar_one_or_none()
            
            if not task:
                return {"error": "Task not found"}
            
            # Verify user is part of the match
            if task.match.user1_id != user_id and task.match.user2_id != user_id:
                return {"error": "User not in match"}
            
            # Get user's submission
            user_submission = None
            for submission in task.submissions:
                if submission.user_id == user_id:
                    user_submission = submission
                    break
            
            return {
                "task_id": task.id,
                "progress_percentage": task.progress_percentage,
                "is_completed": task.is_completed,
                "user_submitted": user_submission is not None,
                "submission_status": user_submission.submission_status if user_submission else None,
                "total_submissions": len(task.submissions),
                "expires_at": task.expires_at.isoformat() if task.expires_at else None,
                "time_remaining": (task.expires_at - datetime.utcnow()).total_seconds() if task.expires_at and task.expires_at > datetime.utcnow() else 0
            }
    
    async def get_active_tasks_for_user(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> List[Task]:
        """Get all active tasks for a user with optimized query"""
        if not session:
            async with get_async_session() as session:
                return await self._get_active_tasks_for_user_internal(user_id, session)
        
        return await self._get_active_tasks_for_user_internal(user_id, session)
    
    async def _get_active_tasks_for_user_internal(
        self,
        user_id: int,
        session: AsyncSession
    ) -> List[Task]:
        """Internal method to get active tasks for user with optimized query"""
        async with performance_monitor("get_active_tasks_for_user", user_id=user_id):
            # Get user's matches with tasks using optimized query
            result = await session.execute(
                select(Task)
                .join(Match)
                .where(
                    and_(
                        or_(Match.user1_id == user_id, Match.user2_id == user_id),
                        Task.is_completed == False,
                        or_(
                            Task.expires_at > datetime.utcnow(),
                            Task.expires_at.is_(None)
                        )
                    )
                )
                .options(
                    selectinload(Task.match),
                    selectinload(Task.submissions)
                )
                .order_by(desc(Task.created_at))
            )
            return result.scalars().all()
    
    async def get_expired_tasks(
        self,
        session: AsyncSession = None
    ) -> List[Task]:
        """Get expired tasks with optimized query"""
        if not session:
            async with get_async_session() as session:
                return await self._get_expired_tasks_internal(session)
        
        return await self._get_expired_tasks_internal(session)
    
    async def _get_expired_tasks_internal(
        self,
        session: AsyncSession
    ) -> List[Task]:
        """Internal method to get expired tasks with optimized query"""
        async with performance_monitor("get_expired_tasks", user_id=None):
            result = await session.execute(
                select(Task)
                .where(
                    and_(
                        Task.is_completed == False,
                        Task.expires_at < datetime.utcnow()
                    )
                )
                .options(selectinload(Task.match))
            )
            return result.scalars().all()
    
    async def cleanup_expired_tasks(
        self,
        session: AsyncSession = None
    ) -> int:
        """Clean up expired tasks with optimized query"""
        if not session:
            async with get_async_session() as session:
                return await self._cleanup_expired_tasks_internal(session)
        
        return await self._cleanup_expired_tasks_internal(session)
    
    async def _cleanup_expired_tasks_internal(
        self,
        session: AsyncSession
    ) -> int:
        """Internal method to cleanup expired tasks with optimized query"""
        async with performance_monitor("cleanup_expired_tasks", user_id=None):
            # Get expired tasks
            expired_tasks = await self._get_expired_tasks_internal(session)
            
            # Mark as completed
            for task in expired_tasks:
                task.is_completed = True
                task.completed_at = datetime.utcnow()
            
            await session.commit()
            
            logger.info(f"Cleaned up {len(expired_tasks)} expired tasks")
            return len(expired_tasks)

# Global task service instance
task_service = TaskService() 