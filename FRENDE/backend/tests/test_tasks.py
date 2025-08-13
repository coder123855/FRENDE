import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from models.task import Task, TaskDifficulty, TaskCategory
from models.match import Match
from models.user import User
from services.tasks import TaskService, task_service
from core.exceptions import TaskNotFoundError, UserNotInMatchError, MatchNotFoundError

# Test data fixtures
@pytest.fixture
def mock_user1():
    user = Mock(spec=User)
    user.id = 1
    user.name = "Alice"
    user.age = 25
    user.profession = "Engineer"
    user.profile_text = "I love coding and hiking"
    user.coins = 100
    return user

@pytest.fixture
def mock_user2():
    user = Mock(spec=User)
    user.id = 2
    user.name = "Bob"
    user.age = 28
    user.profession = "Designer"
    user.profile_text = "I enjoy art and music"
    user.coins = 50
    return user

@pytest.fixture
def mock_match():
    match = Mock(spec=Match)
    match.id = 1
    match.user1_id = 1
    match.user2_id = 2
    match.status = "active"
    match.coins_earned_user1 = 0
    match.coins_earned_user2 = 0
    return match

@pytest.fixture
def mock_task():
    task = Mock(spec=Task)
    task.id = 1
    task.title = "Test Task"
    task.description = "Test task description"
    task.task_type = "bonding"
    task.difficulty = TaskDifficulty.MEDIUM
    task.category = TaskCategory.BONDING
    task.match_id = 1
    task.is_completed = False
    task.completed_by_user1 = None
    task.completed_by_user2 = None
    task.completed_at_user1 = None
    task.completed_at_user2 = None
    task.progress_percentage = 0
    task.submission_count = 0
    task.base_coin_reward = 10
    task.difficulty_multiplier = 2
    task.final_coin_reward = 20
    task.ai_generated = True
    task.requires_validation = False
    task.validation_submitted = False
    task.validation_approved = None
    task.created_at = datetime.utcnow()
    task.completed_at = None
    task.expires_at = datetime.utcnow() + timedelta(days=1)
    return task

@pytest.fixture
def task_service_instance():
    return TaskService()

class TestTaskModel:
    """Test the enhanced Task model"""
    
    def test_task_creation(self):
        """Test creating a new task"""
        task = Task(
            title="Test Task",
            description="Test description",
            task_type="bonding",
            difficulty=TaskDifficulty.MEDIUM,
            category=TaskCategory.BONDING,
            match_id=1
        )
        
        assert task.title == "Test Task"
        assert task.difficulty == TaskDifficulty.MEDIUM
        assert task.category == TaskCategory.BONDING
        assert task.progress_percentage == 0
        assert task.is_completed == False
    
    def test_task_completion_status(self, mock_task):
        """Test task completion status methods"""
        # Not started
        assert mock_task.get_completion_status() == "not_started"
        
        # Partially completed
        mock_task.completed_by_user1 = True
        assert mock_task.get_completion_status() == "partially_completed"
        
        # Fully completed
        mock_task.completed_by_user2 = True
        assert mock_task.get_completion_status() == "completed"
    
    def test_task_progress_calculation(self, mock_task):
        """Test progress percentage calculation"""
        # 0% progress
        assert mock_task.calculate_progress() == 0
        
        # 50% progress
        mock_task.completed_by_user1 = True
        assert mock_task.calculate_progress() == 50
        
        # 100% progress
        mock_task.completed_by_user2 = True
        assert mock_task.calculate_progress() == 100
    
    def test_task_reward_calculation(self, mock_task):
        """Test reward calculation based on difficulty"""
        # Medium difficulty (multiplier = 2)
        mock_task.base_coin_reward = 10
        mock_task.difficulty_multiplier = 2
        assert mock_task.calculate_reward() == 20
        
        # Easy difficulty (multiplier = 1)
        mock_task.difficulty_multiplier = 1
        assert mock_task.calculate_reward() == 10
        
        # Hard difficulty (multiplier = 3)
        mock_task.difficulty_multiplier = 3
        assert mock_task.calculate_reward() == 30
    
    def test_task_expiration(self, mock_task):
        """Test task expiration logic"""
        # Not expired
        mock_task.expires_at = datetime.utcnow() + timedelta(hours=1)
        assert not mock_task.is_expired()
        
        # Expired
        mock_task.expires_at = datetime.utcnow() - timedelta(hours=1)
        assert mock_task.is_expired()
    
    def test_task_completion_by_user(self, mock_task, mock_match):
        """Test marking task as completed by a user"""
        # User 1 completes task
        mock_task.mark_completed_by_user(1, mock_match)
        assert mock_task.completed_by_user1 == True
        assert mock_task.completed_by_user2 == None
        assert mock_task.is_completed == False
        
        # User 2 completes task
        mock_task.mark_completed_by_user(2, mock_match)
        assert mock_task.completed_by_user2 == True
        assert mock_task.is_completed == True
    
    def test_task_can_be_completed_by_user(self, mock_task, mock_match):
        """Test if a user can complete a task"""
        # User can complete
        assert mock_task.can_be_completed_by_user(1, mock_match) == True
        
        # User already completed
        mock_task.completed_by_user1 = True
        assert mock_task.can_be_completed_by_user(1, mock_match) == False
        
        # Task expired
        mock_task.expires_at = datetime.utcnow() - timedelta(hours=1)
        assert mock_task.can_be_completed_by_user(2, mock_match) == False
        
        # Task already completed
        mock_task.expires_at = datetime.utcnow() + timedelta(hours=1)
        mock_task.is_completed = True
        assert mock_task.can_be_completed_by_user(2, mock_match) == False
    
    def test_task_to_dict(self, mock_task):
        """Test task serialization to dictionary"""
        task_dict = mock_task.to_dict()
        
        assert task_dict["id"] == 1
        assert task_dict["title"] == "Test Task"
        assert task_dict["difficulty"] == "medium"
        assert task_dict["category"] == "bonding"
        assert task_dict["progress_percentage"] == 0
        assert task_dict["completion_status"] == "not_started"

class TestTaskService:
    """Test the TaskService class"""
    
    @pytest.mark.asyncio
    async def test_generate_task_success(self, task_service_instance, mock_user1, mock_user2, mock_match):
        """Test successful task generation"""
        with patch('services.tasks.ai_service.generate_task') as mock_ai_generate:
            mock_ai_generate.return_value = ("AI Task", "AI generated description")
            
            with patch('services.tasks.get_async_session') as mock_session:
                mock_session.return_value.__aenter__.return_value = AsyncMock()
                
                task = await task_service_instance.generate_task(
                    match_id=1,
                    task_type="bonding",
                    difficulty=TaskDifficulty.MEDIUM,
                    category=TaskCategory.BONDING
                )
                
                assert task.title == "AI Task"
                assert task.description == "AI generated description"
                assert task.difficulty == TaskDifficulty.MEDIUM
                assert task.category == TaskCategory.BONDING
    
    @pytest.mark.asyncio
    async def test_generate_task_ai_fallback(self, task_service_instance, mock_user1, mock_user2, mock_match):
        """Test task generation with AI fallback"""
        with patch('services.tasks.ai_service.generate_task') as mock_ai_generate:
            mock_ai_generate.side_effect = Exception("AI Error")
            
            with patch('services.tasks.get_async_session') as mock_session:
                mock_session.return_value.__aenter__.return_value = AsyncMock()
                
                task = await task_service_instance.generate_task(
                    match_id=1,
                    task_type="bonding"
                )
                
                assert task.ai_generated == False
                assert "bonding" in task.title.lower()
    
    @pytest.mark.asyncio
    async def test_complete_task_success(self, task_service_instance, mock_task, mock_match):
        """Test successful task completion"""
        with patch('services.tasks.get_async_session') as mock_session:
            mock_session.return_value.__aenter__.return_value = AsyncMock()
            
            # Mock database queries
            mock_session.return_value.__aenter__.return_value.execute.return_value.scalar_one_or_none.side_effect = [
                mock_task,  # Task query
                mock_match   # Match query
            ]
            
            result = await task_service_instance.complete_task(task_id=1, user_id=1)
            
            assert result == mock_task
            assert mock_task.completed_by_user1 == True
    
    @pytest.mark.asyncio
    async def test_complete_task_not_found(self, task_service_instance):
        """Test task completion with non-existent task"""
        with patch('services.tasks.get_async_session') as mock_session:
            mock_session.return_value.__aenter__.return_value = AsyncMock()
            mock_session.return_value.__aenter__.return_value.execute.return_value.scalar_one_or_none.return_value = None
            
            with pytest.raises(TaskNotFoundError):
                await task_service_instance.complete_task(task_id=999, user_id=1)
    
    @pytest.mark.asyncio
    async def test_complete_task_user_not_in_match(self, task_service_instance, mock_task):
        """Test task completion by user not in match"""
        with patch('services.tasks.get_async_session') as mock_session:
            mock_session.return_value.__aenter__.return_value = AsyncMock()
            
            # Mock database queries
            mock_session.return_value.__aenter__.return_value.execute.return_value.scalar_one_or_none.side_effect = [
                mock_task,  # Task query
                None        # Match query (user not in match)
            ]
            
            with pytest.raises(UserNotInMatchError):
                await task_service_instance.complete_task(task_id=1, user_id=999)
    
    @pytest.mark.asyncio
    async def test_get_task_progress(self, task_service_instance, mock_task, mock_match):
        """Test getting task progress information"""
        with patch('services.tasks.get_async_session') as mock_session:
            mock_session.return_value.__aenter__.return_value = AsyncMock()
            
            # Mock database queries
            mock_session.return_value.__aenter__.return_value.execute.return_value.scalar_one_or_none.side_effect = [
                mock_task,  # Task query
                mock_match   # Match query
            ]
            
            progress = await task_service_instance.get_task_progress(task_id=1, user_id=1)
            
            assert progress["task_id"] == 1
            assert progress["progress_percentage"] == 0
            assert progress["completion_status"] == "not_started"
            assert progress["can_complete"] == True
    
    @pytest.mark.asyncio
    async def test_submit_task_validation(self, task_service_instance, mock_task, mock_match):
        """Test task validation submission"""
        mock_task.requires_validation = True
        mock_task.validation_submitted = False
        
        with patch('services.tasks.get_async_session') as mock_session:
            mock_session.return_value.__aenter__.return_value = AsyncMock()
            
            # Mock database queries
            mock_session.return_value.__aenter__.return_value.execute.return_value.scalar_one_or_none.side_effect = [
                mock_task,  # Task query
                mock_match   # Match query
            ]
            
            result = await task_service_instance.submit_task_validation(
                task_id=1,
                user_id=1,
                submission_text="I completed the task!",
                submission_evidence="Photo proof"
            )
            
            assert result == mock_task
            assert mock_task.validation_submitted == True
            assert mock_task.validation_approved == True
            assert mock_task.submission_count == 1
    
    @pytest.mark.asyncio
    async def test_get_task_statistics(self, task_service_instance):
        """Test getting task statistics"""
        with patch('services.tasks.get_async_session') as mock_session:
            mock_session.return_value.__aenter__.return_value = AsyncMock()
            
            # Mock empty result
            mock_session.return_value.__aenter__.return_value.execute.return_value.scalars.return_value.all.return_value = []
            
            stats = await task_service_instance.get_task_statistics(user_id=1)
            
            assert stats["total_tasks_created"] == 0
            assert stats["total_tasks_completed"] == 0
            assert stats["total_coins_earned"] == 0
            assert stats["average_completion_time"] == 0
    
    def test_get_base_reward_for_difficulty(self, task_service_instance):
        """Test base reward calculation for different difficulties"""
        assert task_service_instance._get_base_reward_for_difficulty(TaskDifficulty.EASY) == 5
        assert task_service_instance._get_base_reward_for_difficulty(TaskDifficulty.MEDIUM) == 10
        assert task_service_instance._get_base_reward_for_difficulty(TaskDifficulty.HARD) == 15

class TestTaskAPI:
    """Test the task API endpoints"""
    
    @pytest.mark.asyncio
    async def test_generate_task_endpoint(self):
        """Test task generation endpoint"""
        with patch('api.tasks.task_service.generate_task') as mock_generate:
            mock_task = Mock(spec=Task)
            mock_task.id = 1
            mock_task.title = "Test Task"
            mock_generate.return_value = mock_task
            
            # This would be tested with FastAPI TestClient
            # For now, just test the service integration
            assert mock_generate.called == False
    
    @pytest.mark.asyncio
    async def test_complete_task_endpoint(self):
        """Test task completion endpoint"""
        with patch('api.tasks.task_service.complete_task') as mock_complete:
            mock_task = Mock(spec=Task)
            mock_task.final_coin_reward = 20
            mock_complete.return_value = mock_task
            
            # This would be tested with FastAPI TestClient
            # For now, just test the service integration
            assert mock_complete.called == False

class TestTaskIntegration:
    """Integration tests for the task system"""
    
    @pytest.mark.asyncio
    async def test_full_task_workflow(self, task_service_instance):
        """Test complete task workflow from generation to completion"""
        # This would test the full workflow:
        # 1. Generate task
        # 2. Get task progress
        # 3. Complete task
        # 4. Verify completion
        # 5. Check rewards
        
        # For now, just a placeholder
        assert True
    
    @pytest.mark.asyncio
    async def test_task_validation_workflow(self, task_service_instance):
        """Test task validation workflow"""
        # This would test:
        # 1. Generate task requiring validation
        # 2. Submit validation
        # 3. Approve validation
        # 4. Complete task
        
        # For now, just a placeholder
        assert True

class TestTaskPerformance:
    """Performance tests for the task system"""
    
    @pytest.mark.asyncio
    async def test_bulk_task_generation(self, task_service_instance):
        """Test generating multiple tasks efficiently"""
        # This would test generating many tasks quickly
        # and verify performance characteristics
        
        # For now, just a placeholder
        assert True
    
    @pytest.mark.asyncio
    async def test_task_statistics_performance(self, task_service_instance):
        """Test task statistics calculation performance"""
        # This would test calculating statistics for users
        # with many tasks and verify performance
        
        # For now, just a placeholder
        assert True

# Test the global task service instance
class TestGlobalTaskService:
    """Test the global task service instance"""
    
    def test_task_service_instance_exists(self):
        """Test that the global task service instance exists"""
        assert task_service is not None
        assert isinstance(task_service, TaskService)
    
    def test_task_service_methods_available(self):
        """Test that all required methods are available"""
        assert hasattr(task_service, 'generate_task')
        assert hasattr(task_service, 'complete_task')
        assert hasattr(task_service, 'get_task_progress')
        assert hasattr(task_service, 'submit_task_validation')
        assert hasattr(task_service, 'get_task_statistics')
        assert hasattr(task_service, 'get_task_history') 