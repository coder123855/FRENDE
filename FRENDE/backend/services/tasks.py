import logging
import random
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from models.task import Task, TaskDifficulty, TaskCategory
from models.match import Match
from models.user import User
from core.database import get_async_session
from core.config import settings
from core.exceptions import MatchNotFoundError, TaskNotFoundError, UserNotInMatchError, AIGenerationError
from services.ai import ai_service, TaskContext

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
                "Share something you're passionate about",
                "What's your favorite way to spend a weekend?",
                "Describe your perfect meal",
                "What's your favorite season and why?",
                "Share a skill you'd like to learn",
                "What's your favorite way to relax?",
                "Describe your dream job",
                "What's your favorite type of music?",
                "Share a goal you're working towards",
                "What's your favorite way to make new friends?",
                "Describe your ideal home"
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
        difficulty: TaskDifficulty = TaskDifficulty.MEDIUM,
        category: TaskCategory = TaskCategory.BONDING,
        session: AsyncSession = None
    ) -> Task:
        """Generate a new task for a match"""
        if not session:
            async with get_async_session() as session:
                return await self._generate_task_internal(match_id, task_type, difficulty, category, session)
        
        return await self._generate_task_internal(match_id, task_type, difficulty, category, session)
    
    async def _generate_task_internal(
        self,
        match_id: int,
        task_type: str = "bonding",
        difficulty: TaskDifficulty = TaskDifficulty.MEDIUM,
        category: TaskCategory = TaskCategory.BONDING,
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
        
        # Get users from the match
        user1_result = await session.execute(select(User).where(User.id == match.user1_id))
        user1 = user1_result.scalar_one_or_none()
        
        user2_result = await session.execute(select(User).where(User.id == match.user2_id))
        user2 = user2_result.scalar_one_or_none()
        
        if not user1 or not user2:
            raise MatchNotFoundError(f"Users not found for match {match_id}")
        
        # Build enhanced task context with bonding focus
        context = await self._build_task_context(match, user1, user2, task_type, session)
        
        # Try AI generation first with bonding focus
        try:
            title, description = await self._generate_ai_task(context)
            
            # Create task with AI-generated content
            task = Task(
                title=title,
                description=description,
                task_type=task_type,
                difficulty=difficulty,
                category=category,
                match_id=match_id,
                ai_generated=True,
                prompt_used=str(context),
                base_coin_reward=self._get_base_reward_for_difficulty(difficulty),
                difficulty_multiplier=self._get_difficulty_multiplier(difficulty),
                expires_at=datetime.utcnow() + timedelta(days=1)
            )
            
        except (AIGenerationError, Exception) as e:
            logger.warning(f"AI task generation failed: {str(e)}. Using template.")
            
            # Fallback to enhanced template generation
            title, description = self._generate_template_task(task_type, context)
            
            task = Task(
                title=title,
                description=description,
                task_type=task_type,
                difficulty=difficulty,
                category=category,
                match_id=match_id,
                ai_generated=False,
                base_coin_reward=self._get_base_reward_for_difficulty(difficulty),
                difficulty_multiplier=self._get_difficulty_multiplier(difficulty),
                expires_at=datetime.utcnow() + timedelta(days=1)
            )
        
        # Calculate final reward
        task.calculate_reward()
        
        session.add(task)
        await session.commit()
        await session.refresh(task)
        
        logger.info(f"Generated task {task.id} for match {match_id}")
        return task

    async def _build_task_context(
        self, 
        match: Match, 
        user1: User, 
        user2: User, 
        task_type: str, 
        session: AsyncSession
    ) -> TaskContext:
        """Build enhanced task context with bonding focus"""
        # Extract interests from user profiles
        user1_interests = self._extract_interests_from_profile(user1.profile_text) if user1.profile_text else []
        user2_interests = self._extract_interests_from_profile(user2.profile_text) if user2.profile_text else []
        
        # Find common interests for bonding focus
        common_interests = list(set(user1_interests) & set(user2_interests))
        
        # Calculate compatibility score based on shared interests
        compatibility_score = len(common_interests) * 10
        
        # Get previous tasks to avoid repetition and build context
        result = await session.execute(
            select(Task).where(Task.match_id == match.id).order_by(Task.created_at.desc()).limit(5)
        )
        previous_tasks = [task.title for task in result.scalars().all()]
        
        # Build enhanced context for bonding-focused generation
        context = TaskContext(
            user1=user1,
            user2=user2,
            match=match,
            task_type=task_type,
            previous_tasks=previous_tasks,
            compatibility_score=compatibility_score,
            common_interests=common_interests
        )
        
        logger.info(f"Built task context for match {match.id}: compatibility_score={compatibility_score}, common_interests={common_interests}")
        return context

    async def _generate_ai_task(self, context: TaskContext) -> Tuple[str, str]:
        """Generate task using AI service with bonding focus"""
        try:
            # Use AI service to generate bonding-focused task
            title, description = await ai_service.generate_task(context)
            
            # Validate generated content
            if not title or not description:
                raise AIGenerationError("AI generated empty task content")
            
            if len(title) > 200 or len(description) > 1000:
                raise AIGenerationError("AI generated task content too long")
            
            # Ensure the task is bonding-focused
            if not self._is_bonding_focused(title, description):
                logger.warning("AI generated task may not be bonding-focused, regenerating...")
                raise AIGenerationError("Generated task not bonding-focused enough")
            
            return title, description
            
        except Exception as e:
            logger.error(f"AI task generation failed: {e}")
            raise AIGenerationError(f"Failed to generate AI task: {e}")

    def _is_bonding_focused(self, title: str, description: str) -> bool:
        """Check if task is bonding-focused"""
        bonding_keywords = [
            "share", "tell", "describe", "talk about", "discuss", "explore", "discover",
            "friend", "together", "bond", "connect", "relationship", "experience",
            "memory", "story", "favorite", "dream", "goal", "passion", "interest"
        ]
        
        text = (title + " " + description).lower()
        bonding_score = sum(1 for keyword in bonding_keywords if keyword in text)
        
        return bonding_score >= 2  # At least 2 bonding keywords

    def _extract_interests_from_profile(self, profile_text: str) -> List[str]:
        """Extract interests from user profile text for bonding focus"""
        if not profile_text:
            return []
        
        # Enhanced keyword extraction for bonding-focused tasks
        interest_keywords = {
            "music": ["music", "song", "band", "artist", "kpop", "pop", "rock", "jazz", "classical", "hip hop", "country"],
            "sports": ["sports", "basketball", "football", "tennis", "volleyball", "swimming", "hiking", "running", "gym"],
            "arts": ["art", "drawing", "painting", "photography", "creative", "design", "craft"],
            "entertainment": ["movie", "tv", "anime", "show", "series", "comedy", "drama", "action", "horror", "romance"],
            "reading": ["read", "book", "novel", "story", "literature", "poetry"],
            "gaming": ["game", "gaming", "video game", "play", "console", "pc"],
            "cooking": ["cook", "food", "recipe", "baking", "kitchen", "dish"],
            "travel": ["travel", "trip", "vacation", "explore", "adventure", "journey"],
            "technology": ["tech", "computer", "programming", "coding", "software", "app"],
            "fitness": ["fitness", "workout", "exercise", "health", "wellness", "yoga"],
            "social": ["friend", "social", "party", "hangout", "meet", "chat"],
            "learning": ["learn", "study", "education", "course", "skill", "knowledge"]
        }
        
        profile_lower = profile_text.lower()
        found_interests = []
        
        for category, keywords in interest_keywords.items():
            for keyword in keywords:
                if keyword in profile_lower:
                    found_interests.append(category)
                    break  # Only add category once
        
        return found_interests

    def _generate_template_task(self, task_type: str, context: TaskContext = None) -> Tuple[str, str]:
        """Generate a template-based task with bonding focus"""
        templates = self.task_templates.get(task_type, self.task_templates["bonding"])
        
        # If we have context with common interests, try to use interest-based templates
        if context and context.common_interests and task_type == "bonding":
            interest_templates = self.task_templates.get("interest-based", [])
            # Add some interest-specific templates
            for interest in context.common_interests:
                if interest == "music":
                    templates.extend([
                        "Share your favorite song and why it means so much to you",
                        "What's your go-to music when you're feeling down?",
                        "Tell your friend about a concert you'd love to attend"
                    ])
                elif interest == "sports":
                    templates.extend([
                        "What's your favorite sports team and why?",
                        "Share a memorable sports moment from your life",
                        "What sport would you love to learn together?"
                    ])
                elif interest == "travel":
                    templates.extend([
                        "What's your dream travel destination and why?",
                        "Share your most memorable travel experience",
                        "Where would you love to explore together?"
                    ])
        
        task_text = random.choice(templates)
        
        # Create more engaging title
        title = f"Bonding Activity: {task_text[:50]}{'...' if len(task_text) > 50 else ''}"
        description = f"Complete this bonding activity together: {task_text}"
        
        return title, description

    def _get_difficulty_multiplier(self, difficulty: TaskDifficulty) -> int:
        """Get difficulty multiplier for reward calculation"""
        difficulty_map = {
            TaskDifficulty.EASY: 1,
            TaskDifficulty.MEDIUM: 2,
            TaskDifficulty.HARD: 3
        }
        return difficulty_map.get(difficulty, 1)

    async def generate_conversation_starter(
        self,
        match_id: int,
        session: AsyncSession = None
    ) -> str:
        """Generate a conversation starter for matched users"""
        if not session:
            async with get_async_session() as session:
                return await self._generate_conversation_starter_internal(match_id, session)
        
        return await self._generate_conversation_starter_internal(match_id, session)

    async def _generate_conversation_starter_internal(
        self,
        match_id: int,
        session: AsyncSession
    ) -> str:
        """Internal method to generate conversation starter"""
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
        
        # Get users from the match
        user1_result = await session.execute(select(User).where(User.id == match.user1_id))
        user1 = user1_result.scalar_one_or_none()
        
        user2_result = await session.execute(select(User).where(User.id == match.user2_id))
        user2 = user2_result.scalar_one_or_none()
        
        if not user1 or not user2:
            raise MatchNotFoundError(f"Users not found for match {match_id}")
        
        # Try AI generation first
        try:
            context = TaskContext(
                user1=user1,
                user2=user2,
                match=match,
                task_type="conversation_starter"
            )
            
            starter = await ai_service.generate_conversation_starter(context)
            return starter
            
        except (AIGenerationError, Exception) as e:
            logger.warning(f"AI conversation starter generation failed: {str(e)}. Using default.")
            return f"Hello, my name is {user1.name}, I am shy and can't think of a cool opening line :( Wanna be friends?"

    async def _generate_interest_based_task(self, session: AsyncSession) -> tuple[str, str]:
        """Generate an interest-based task"""
        # This would be enhanced with user interest analysis
        return self._generate_template_task("interest-based")

    async def complete_task(
        self,
        task_id: int,
        user_id: int,
        submission: dict = None,
        session: AsyncSession = None
    ) -> Task:
        """Mark a task as completed by a user with two-user requirement logic"""
        if not session:
            async with get_async_session() as session:
                return await self._complete_task_internal(task_id, user_id, submission, session)
        
        return await self._complete_task_internal(task_id, user_id, submission, session)

    async def _complete_task_internal(
        self,
        task_id: int,
        user_id: int,
        submission: dict = None,
        session: AsyncSession = None
    ) -> Task:
        """Internal method to complete task with enhanced two-user logic"""
        # Get task and verify user is part of the match
        task = await self._get_task_details_internal(task_id, user_id, session)
        if not task:
            raise TaskNotFoundError(f"Task {task_id} not found or user not authorized")
        
        # Get match details
        result = await session.execute(
            select(Match).where(Match.id == task.match_id)
        )
        match = result.scalar_one_or_none()
        
        if not match:
            raise MatchNotFoundError(f"Match {task.match_id} not found")
        
        # Determine which user is completing (user1 or user2)
        is_user1 = user_id == match.user1_id
        is_user2 = user_id == match.user2_id
        
        if not (is_user1 or is_user2):
            raise UserNotInMatchError(f"User {user_id} is not part of match {task.match_id}")
        
        # Check if user has already completed this task
        if (is_user1 and task.completed_by_user1) or (is_user2 and task.completed_by_user2):
            raise ValueError(f"User {user_id} has already completed this task")
        
        # Check if task is already fully completed
        if task.is_fully_completed():
            raise ValueError("Task is already fully completed by both users")
        
        # Check if task has expired
        if task.is_expired:
            raise ValueError("Cannot complete expired task")
        
        # Mark user's completion
        if is_user1:
            task.completed_by_user1 = True
            task.completed_at_user1 = datetime.utcnow()
        else:
            task.completed_by_user2 = True
            task.completed_at_user2 = datetime.utcnow()
        
        # Update submission details if provided
        if submission:
            if submission.get('text'):
                task.submission_text = submission['text']
            if submission.get('evidence'):
                task.submission_evidence = submission['evidence']
        
        # Check if both users have completed
        if task.completed_by_user1 and task.completed_by_user2:
            task.is_completed = True
            task.completed_at = datetime.utcnow()
            task.progress_percentage = 100
            
            # Award coins to both users
            await self._award_task_coins(task, match, session)
            
            # Send completion notifications
            await self._send_completion_notifications(task, session)
            
            logger.info(f"Task {task_id} fully completed by both users")
        else:
            # Calculate partial progress
            completed_count = sum([task.completed_by_user1, task.completed_by_user2])
            task.progress_percentage = (completed_count / 2) * 100
            
            logger.info(f"Task {task_id} partially completed by user {user_id} ({completed_count}/2)")
        
        session.add(task)
        await session.commit()
        await session.refresh(task)
        
        return task
    
    async def _award_task_coins(self, task: Task, match: Match, session: AsyncSession):
        """Award coins to both users for completing a task"""
        # Calculate final reward
        final_reward = task.calculate_reward()
        
        # Award coins to both users
        if match.user1_id:
            result = await session.execute(
                select(User).where(User.id == match.user1_id)
            )
            user1 = result.scalar_one_or_none()
            if user1:
                user1.coins += final_reward
                # Update match coins earned if the field exists
                if hasattr(match, 'coins_earned_user1'):
                    match.coins_earned_user1 += final_reward
        
        if match.user2_id:
            result = await session.execute(
                select(User).where(User.id == match.user2_id)
            )
            user2 = result.scalar_one_or_none()
            if user2:
                user2.coins += final_reward
                # Update match coins earned if the field exists
                if hasattr(match, 'coins_earned_user2'):
                    match.coins_earned_user2 += final_reward
        
        await session.commit()
        logger.info(f"Awarded {final_reward} coins to both users for task {task.id}")
    
    async def _send_completion_notifications(self, task: Task, session: AsyncSession):
        """Send completion notifications to both users"""
        try:
            # Get match details
            result = await session.execute(
                select(Match).where(Match.id == task.match_id)
            )
            match = result.scalar_one_or_none()
            
            if not match:
                logger.warning(f"Match {task.match_id} not found for completion notification")
                return
            
            # Get user details
            user1 = None
            user2 = None
            
            if match.user1_id:
                result = await session.execute(select(User).where(User.id == match.user1_id))
                user1 = result.scalar_one_or_none()
            
            if match.user2_id:
                result = await session.execute(select(User).where(User.id == match.user2_id))
                user2 = result.scalar_one_or_none()
            
            # Log completion notification
            user1_name = user1.name if user1 else "User 1"
            user2_name = user2.name if user2 else "User 2"
            
            logger.info(f"Task '{task.title}' completed by {user1_name} and {user2_name}")
            logger.info(f"Both users earned {task.final_coin_reward} coins for task completion")
            
            # TODO: Implement WebSocket notifications here when chat system is ready
            # For now, just log the completion
            
        except Exception as e:
            logger.error(f"Failed to send completion notifications for task {task.id}: {e}")
    
    def _get_base_reward_for_difficulty(self, difficulty: TaskDifficulty) -> int:
        """Get base coin reward for task difficulty"""
        rewards = {
            TaskDifficulty.EASY: 5,
            TaskDifficulty.MEDIUM: 10,
            TaskDifficulty.HARD: 15
        }
        return rewards.get(difficulty, 10)
    
    async def get_task_progress(
        self,
        task_id: int,
        user_id: int,
        session: AsyncSession = None
    ) -> Dict[str, Any]:
        """Get detailed progress information for a task"""
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
        """Internal method to get detailed task progress with two-user completion status"""
        # Get task and verify user authorization
        task = await self._get_task_details_internal(task_id, user_id, session)
        if not task:
            raise TaskNotFoundError(f"Task {task_id} not found or user not authorized")
        
        # Get match details
        result = await session.execute(
            select(Match).where(Match.id == task.match_id)
        )
        match = result.scalar_one_or_none()
        
        if not match:
            raise MatchNotFoundError(f"Match {task.match_id} not found")
        
        # Determine which user is requesting (user1 or user2)
        is_user1 = user_id == match.user1_id
        is_user2 = user_id == match.user2_id
        
        if not (is_user1 or is_user2):
            raise UserNotInMatchError(f"User {user_id} is not part of match {task.match_id}")
        
        # Calculate completion status
        user1_completed = task.completed_by_user1 is True
        user2_completed = task.completed_by_user2 is True
        current_user_completed = (is_user1 and user1_completed) or (is_user2 and user2_completed)
        
        # Calculate progress
        completed_count = sum([user1_completed, user2_completed])
        progress_percentage = (completed_count / 2) * 100
        
        # Determine time remaining
        time_remaining = None
        if task.expires_at:
            now = datetime.utcnow()
            expires_at = task.expires_at
            if expires_at > now:
                time_remaining = expires_at - now
        
        # Get user names for display
        user1_name = None
        user2_name = None
        if match.user1_id:
            result = await session.execute(select(User).where(User.id == match.user1_id))
            user1 = result.scalar_one_or_none()
            user1_name = user1.name if user1 else "User 1"
        
        if match.user2_id:
            result = await session.execute(select(User).where(User.id == match.user2_id))
            user2 = result.scalar_one_or_none()
            user2_name = user2.name if user2 else "User 2"
        
        return {
            "task_id": task.id,
            "is_completed": task.is_completed,
            "progress_percentage": progress_percentage,
            "completion_status": task.get_completion_status(),
            "remaining_time": time_remaining,
            "is_expired": task.is_expired,
            "can_complete": not current_user_completed and not task.is_completed and not task.is_expired,
            "current_user_completed": current_user_completed,
            "user_completion_status": {
                "user1_completed": user1_completed,
                "user2_completed": user2_completed,
                "user1_completed_at": task.completed_at_user1,
                "user2_completed_at": task.completed_at_user2,
                "user1_name": user1_name,
                "user2_name": user2_name
            },
            "completion_summary": {
                "completed_count": completed_count,
                "total_required": 2,
                "both_completed": task.is_completed,
                "partial_completion": completed_count > 0 and not task.is_completed
            },
            "reward_info": {
                "base_reward": task.base_coin_reward,
                "difficulty_multiplier": task.difficulty_multiplier,
                "final_reward": task.final_coin_reward,
                "rewards_earned": task.final_coin_reward if task.is_completed else 0
            }
        }
    
    async def submit_task_validation(
        self,
        task_id: int,
        user_id: int,
        submission_text: str,
        submission_evidence: Optional[str] = None,
        session: AsyncSession = None
    ) -> Task:
        """Submit task validation for tasks that require it"""
        if not session:
            async with get_async_session() as session:
                return await self._submit_task_validation_internal(
                    task_id, user_id, submission_text, submission_evidence, session
                )
        
        return await self._submit_task_validation_internal(
            task_id, user_id, submission_text, submission_evidence, session
        )
    
    async def _submit_task_validation_internal(
        self,
        task_id: int,
        user_id: int,
        submission_text: str,
        submission_evidence: Optional[str] = None,
        session: AsyncSession = None
    ) -> Task:
        """Internal method to submit task validation"""
        # Get task
        result = await session.execute(
            select(Task).where(Task.id == task_id)
        )
        task = result.scalar_one_or_none()
        
        if not task:
            raise TaskNotFoundError(f"Task {task_id} not found")
        
        if not task.requires_validation:
            raise ValueError("This task does not require validation")
        
        if task.validation_submitted:
            raise ValueError("Task validation already submitted")
        
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
        
        # Submit validation
        task.validation_submitted = True
        task.submission_count += 1
        
        # For now, auto-approve validation (could be enhanced with AI review)
        task.validation_approved = True
        
        await session.commit()
        await session.refresh(task)
        
        logger.info(f"Task validation submitted for task {task_id} by user {user_id}")
        return task
    
    async def get_task_statistics(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> Dict[str, Any]:
        """Get comprehensive task statistics for a user"""
        if not session:
            async with get_async_session() as session:
                return await self._get_task_statistics_internal(user_id, session)
        
        return await self._get_task_statistics_internal(user_id, session)
    
    async def _get_task_statistics_internal(
        self,
        user_id: int,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """Internal method to get task statistics"""
        # Get all tasks for user's matches
        result = await session.execute(
            select(Task).join(Match).where(
                or_(Match.user1_id == user_id, Match.user2_id == user_id)
            )
        )
        tasks = result.scalars().all()
        
        if not tasks:
            return {
                "total_tasks_created": 0,
                "total_tasks_completed": 0,
                "total_coins_earned": 0,
                "average_completion_time": 0,
                "tasks_by_difficulty": {},
                "tasks_by_category": {},
                "completion_rate_by_difficulty": {},
                "recent_activity": []
            }
        
        # Calculate statistics
        total_tasks = len(tasks)
        completed_tasks = [t for t in tasks if t.is_fully_completed()]
        total_completed = len(completed_tasks)
        
        # Calculate coins earned
        total_coins = sum(t.final_coin_reward for t in completed_tasks)
        
        # Calculate average completion time
        completion_times = []
        for task in completed_tasks:
            if task.completed_at and task.created_at:
                time_diff = (task.completed_at - task.created_at).total_seconds() / 3600  # hours
                completion_times.append(time_diff)
        
        avg_completion_time = sum(completion_times) / len(completion_times) if completion_times else 0
        
        # Tasks by difficulty
        tasks_by_difficulty = {}
        for difficulty in TaskDifficulty:
            difficulty_tasks = [t for t in tasks if t.difficulty == difficulty]
            tasks_by_difficulty[difficulty.value] = len(difficulty_tasks)
        
        # Tasks by category
        tasks_by_category = {}
        for category in TaskCategory:
            category_tasks = [t for t in tasks if t.category == category]
            tasks_by_category[category.value] = len(category_tasks)
        
        # Completion rate by difficulty
        completion_rate_by_difficulty = {}
        for difficulty in TaskDifficulty:
            difficulty_tasks = [t for t in tasks if t.difficulty == difficulty]
            difficulty_completed = [t for t in difficulty_tasks if t.is_fully_completed()]
            rate = len(difficulty_completed) / len(difficulty_tasks) if difficulty_tasks else 0
            completion_rate_by_difficulty[difficulty.value] = rate
        
        # Recent activity (last 10 tasks)
        recent_tasks = sorted(tasks, key=lambda t: t.created_at, reverse=True)[:10]
        
        return {
            "total_tasks_created": total_tasks,
            "total_tasks_completed": total_completed,
            "total_coins_earned": total_coins,
            "average_completion_time": avg_completion_time,
            "tasks_by_difficulty": tasks_by_difficulty,
            "tasks_by_category": tasks_by_category,
            "completion_rate_by_difficulty": completion_rate_by_difficulty,
            "recent_activity": [t.to_dict() for t in recent_tasks]
        }

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
        
        # Get active tasks (not expired, not completed)
        result = await session.execute(
            select(Task).where(
                and_(
                    Task.match_id == match_id,
                    Task.is_completed == False,
                    or_(
                        Task.expires_at > datetime.utcnow(),
                        Task.expires_at.is_(None)
                    )
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
        """Get detailed information about a specific task"""
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
        try:
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
            
            if not expired_tasks:
                logger.info("No expired tasks found for replacement")
                return
            
            logger.info(f"Found {len(expired_tasks)} expired tasks to replace")
            
            replaced_count = 0
            for task in expired_tasks:
                try:
                    # Generate replacement task
                    replacement_task = await self.generate_task(
                        task.match_id,
                        task.task_type,
                        task.difficulty,
                        task.category,
                        session
                    )
                    
                    logger.info(f"Replaced expired task {task.id} with {replacement_task.id}")
                    replaced_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to replace expired task {task.id}: {str(e)}")
            
            logger.info(f"Successfully replaced {replaced_count} out of {len(expired_tasks)} expired tasks")
            
        except Exception as e:
            logger.error(f"Error in task replacement process: {str(e)}")
            raise

    async def get_expired_tasks_for_match(self, match_id: int, session: AsyncSession = None):
        """Get expired tasks for a specific match"""
        if not session:
            async with get_async_session() as session:
                return await self._get_expired_tasks_for_match_internal(match_id, session)
        
        return await self._get_expired_tasks_for_match_internal(match_id, session)

    async def _get_expired_tasks_for_match_internal(self, match_id: int, session: AsyncSession):
        """Internal method to get expired tasks for a match"""
        try:
            # Find expired tasks for the specific match
            result = await session.execute(
                select(Task).where(
                    and_(
                        Task.match_id == match_id,
                        Task.is_completed == False,
                        Task.expires_at < datetime.utcnow()
                    )
                )
            )
            expired_tasks = result.scalars().all()
            
            return expired_tasks
            
        except Exception as e:
            logger.error(f"Error getting expired tasks for match {match_id}: {str(e)}")
            raise

    async def replace_specific_expired_task(self, task_id: int, session: AsyncSession = None):
        """Replace a specific expired task"""
        if not session:
            async with get_async_session() as session:
                return await self._replace_specific_expired_task_internal(task_id, session)
        
        return await self._replace_specific_expired_task_internal(task_id, session)

    async def _replace_specific_expired_task_internal(self, task_id: int, session: AsyncSession):
        """Internal method to replace a specific expired task"""
        try:
            # Get the specific task
            result = await session.execute(
                select(Task).where(Task.id == task_id)
            )
            task = result.scalar_one_or_none()
            
            if not task:
                raise TaskNotFoundError(f"Task {task_id} not found")
            
            if task.is_completed:
                raise ValueError(f"Task {task_id} is already completed")
            
            if not task.is_expired():
                raise ValueError(f"Task {task_id} is not expired yet")
            
            # Generate replacement task
            replacement_task = await self.generate_task(
                task.match_id,
                task.task_type,
                task.difficulty,
                task.category,
                session
            )
            
            logger.info(f"Replaced specific expired task {task.id} with {replacement_task.id}")
            return replacement_task
            
        except Exception as e:
            logger.error(f"Error replacing specific expired task {task_id}: {str(e)}")
            raise

    async def replace_expired_tasks_for_match(self, match_id: int, session: AsyncSession = None):
        """Replace all expired tasks for a specific match"""
        if not session:
            async with get_async_session() as session:
                return await self._replace_expired_tasks_for_match_internal(match_id, session)
        
        return await self._replace_expired_tasks_for_match_internal(match_id, session)

    async def _replace_expired_tasks_for_match_internal(self, match_id: int, session: AsyncSession):
        """Internal method to replace expired tasks for a specific match"""
        try:
            # Get expired tasks for the match
            expired_tasks = await self.get_expired_tasks_for_match(match_id, session)
            
            if not expired_tasks:
                logger.info(f"No expired tasks found for match {match_id}")
                return []
            
            logger.info(f"Found {len(expired_tasks)} expired tasks for match {match_id}")
            
            replaced_tasks = []
            for task in expired_tasks:
                try:
                    # Generate replacement task
                    replacement_task = await self.generate_task(
                        task.match_id,
                        task.task_type,
                        task.difficulty,
                        task.category,
                        session
                    )
                    
                    logger.info(f"Replaced expired task {task.id} with {replacement_task.id} for match {match_id}")
                    replaced_tasks.append(replacement_task)
                    
                except Exception as e:
                    logger.error(f"Failed to replace expired task {task.id} for match {match_id}: {str(e)}")
            
            logger.info(f"Successfully replaced {len(replaced_tasks)} out of {len(expired_tasks)} expired tasks for match {match_id}")
            return replaced_tasks
            
        except Exception as e:
            logger.error(f"Error replacing expired tasks for match {match_id}: {str(e)}")
            raise

    async def get_task_history(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> Dict[str, Any]:
        """Get task history for a user"""
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
        # Get completed tasks for user's matches
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
        total_coins_earned = sum(task.final_coin_reward for task in completed_tasks)
        
        # Calculate completion rate (would need total tasks for accurate rate)
        completion_rate = 0.0  # Placeholder - would need total tasks count
        
        return {
            "completed_tasks": [task.to_dict() for task in completed_tasks],
            "total_completed": total_completed,
            "total_coins_earned": total_coins_earned,
            "completion_rate": completion_rate,
            "average_difficulty": 0.0,  # Placeholder
            "tasks_by_category": {}  # Placeholder
        }

# Global task service instance
task_service = TaskService() 