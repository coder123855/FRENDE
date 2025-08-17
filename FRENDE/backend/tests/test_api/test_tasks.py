import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

from tests.conftest import assert_response_success, assert_response_error


class TestTaskEndpoints:
    """Test task management endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_user_tasks_success(self, authenticated_client: AsyncClient, test_user, test_task):
        """Test getting user tasks."""
        response = await authenticated_client.get(f"/tasks/user/{test_user.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "tasks" in data
        assert isinstance(data["tasks"], list)
        # Should find the test task
        assert any(task["id"] == test_task.id for task in data["tasks"])
    
    @pytest.mark.asyncio
    async def test_get_user_tasks_unauthorized(self, client: AsyncClient, test_user):
        """Test getting user tasks without authentication."""
        response = await client.get(f"/tasks/user/{test_user.id}")
        
        assert_response_error(response, 401, "not authenticated")
    
    @pytest.mark.asyncio
    async def test_get_user_tasks_nonexistent_user(self, authenticated_client: AsyncClient):
        """Test getting tasks for nonexistent user."""
        response = await authenticated_client.get("/tasks/user/99999")
        
        assert_response_error(response, 404, "user not found")
    
    @pytest.mark.asyncio
    async def test_get_match_tasks_success(self, authenticated_client: AsyncClient, test_match, test_task):
        """Test getting tasks for a match."""
        response = await authenticated_client.get(f"/tasks/match/{test_match.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "tasks" in data
        assert isinstance(data["tasks"], list)
        # Should find the test task
        assert any(task["id"] == test_task.id for task in data["tasks"])
    
    @pytest.mark.asyncio
    async def test_get_match_tasks_nonexistent_match(self, authenticated_client: AsyncClient):
        """Test getting tasks for nonexistent match."""
        response = await authenticated_client.get("/tasks/match/99999")
        
        assert_response_error(response, 404, "match not found")
    
    @pytest.mark.asyncio
    async def test_get_task_details_success(self, authenticated_client: AsyncClient, test_task):
        """Test getting task details."""
        response = await authenticated_client.get(f"/tasks/{test_task.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert data["id"] == test_task.id
        assert data["title"] == test_task.title
        assert data["description"] == test_task.description
        assert data["task_type"] == test_task.task_type
        assert data["difficulty"] == test_task.difficulty
        assert data["category"] == test_task.category
        assert data["match_id"] == test_task.match_id
        assert "is_completed" in data
        assert "progress_percentage" in data
        assert "base_coin_reward" in data
        assert "final_coin_reward" in data
    
    @pytest.mark.asyncio
    async def test_get_task_details_nonexistent(self, authenticated_client: AsyncClient):
        """Test getting nonexistent task details."""
        response = await authenticated_client.get("/tasks/99999")
        
        assert_response_error(response, 404, "task not found")
    
    @pytest.mark.asyncio
    async def test_get_task_details_unauthorized(self, client: AsyncClient, test_task):
        """Test getting task details without authentication."""
        response = await client.get(f"/tasks/{test_task.id}")
        
        assert_response_error(response, 401, "not authenticated")
    
    @pytest.mark.asyncio
    async def test_generate_tasks_success(self, authenticated_client: AsyncClient, test_match, mock_ai_service):
        """Test generating tasks for a match."""
        with patch('services.ai.GeminiService') as mock_ai:
            mock_ai.return_value = mock_ai_service
            
            response = await authenticated_client.post(f"/tasks/generate/{test_match.id}")
            
            assert_response_success(response, 201)
            data = response.json()
            
            assert "tasks" in data
            assert isinstance(data["tasks"], list)
            assert len(data["tasks"]) > 0
    
    @pytest.mark.asyncio
    async def test_generate_tasks_nonexistent_match(self, authenticated_client: AsyncClient):
        """Test generating tasks for nonexistent match."""
        response = await authenticated_client.post("/tasks/generate/99999")
        
        assert_response_error(response, 404, "match not found")
    
    @pytest.mark.asyncio
    async def test_generate_tasks_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test generating tasks when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.post(f"/tasks/generate/{test_match.id}")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_generate_tasks_ai_unavailable(self, authenticated_client: AsyncClient, test_match):
        """Test generating tasks when AI service is unavailable."""
        with patch('services.ai.GeminiService') as mock_ai:
            mock_service = mock_ai.return_value
            mock_service.is_available.return_value = False
            
            response = await authenticated_client.post(f"/tasks/generate/{test_match.id}")
            
            assert_response_error(response, 503, "ai service unavailable")
    
    @pytest.mark.asyncio
    async def test_complete_task_success(self, authenticated_client: AsyncClient, test_task):
        """Test completing a task."""
        completion_data = {
            "user_id": test_task.match.user1_id,
            "submission_text": "Task completed successfully"
        }
        
        response = await authenticated_client.post(f"/tasks/{test_task.id}/complete", json=completion_data)
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "task completed" in data["message"].lower()
        assert "coins_earned" in data
        assert data["coins_earned"] > 0
    
    @pytest.mark.asyncio
    async def test_complete_task_already_completed(self, authenticated_client: AsyncClient, test_task):
        """Test completing an already completed task."""
        # First completion
        completion_data = {
            "user_id": test_task.match.user1_id,
            "submission_text": "First completion"
        }
        await authenticated_client.post(f"/tasks/{test_task.id}/complete", json=completion_data)
        
        # Second completion attempt
        response = await authenticated_client.post(f"/tasks/{test_task.id}/complete", json=completion_data)
        
        assert_response_error(response, 400, "already completed")
    
    @pytest.mark.asyncio
    async def test_complete_task_not_participant(self, authenticated_client: AsyncClient, test_task, test_session):
        """Test completing a task when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        completion_data = {
            "user_id": third_user.id,
            "submission_text": "Task completed"
        }
        
        response = await authenticated_client.post(f"/tasks/{test_task.id}/complete", json=completion_data)
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_complete_task_expired(self, authenticated_client: AsyncClient, test_session):
        """Test completing an expired task."""
        from datetime import datetime, timedelta
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create an expired task
        expired_task = Task(
            title="Expired Task",
            description="This task has expired",
            task_type="bonding",
            difficulty="medium",
            category="bonding",
            match_id=test_match.id,
            created_at=datetime.utcnow() - timedelta(days=2),
            expires_at=datetime.utcnow() - timedelta(hours=1)
        )
        test_session.add(expired_task)
        await test_session.commit()
        await test_session.refresh(expired_task)
        
        completion_data = {
            "user_id": test_user.id,
            "submission_text": "Task completed"
        }
        
        response = await authenticated_client.post(f"/tasks/{expired_task.id}/complete", json=completion_data)
        
        assert_response_error(response, 400, "task expired")
    
    @pytest.mark.asyncio
    async def test_replace_task_success(self, authenticated_client: AsyncClient, test_task, mock_ai_service):
        """Test replacing a task."""
        with patch('services.ai.GeminiService') as mock_ai:
            mock_ai.return_value = mock_ai_service
            
            response = await authenticated_client.post(f"/tasks/{test_task.id}/replace")
            
            assert_response_success(response, 200)
            data = response.json()
            
            assert "new_task" in data
            assert data["new_task"]["id"] != test_task.id
    
    @pytest.mark.asyncio
    async def test_replace_task_not_participant(self, authenticated_client: AsyncClient, test_task, test_session):
        """Test replacing a task when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.post(f"/tasks/{test_task.id}/replace")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_get_task_progress_success(self, authenticated_client: AsyncClient, test_task):
        """Test getting task progress."""
        response = await authenticated_client.get(f"/tasks/{test_task.id}/progress")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "progress_percentage" in data
        assert "completed_by_user1" in data
        assert "completed_by_user2" in data
        assert "submission_count" in data
        assert isinstance(data["progress_percentage"], (int, float))
        assert isinstance(data["submission_count"], int)
    
    @pytest.mark.asyncio
    async def test_get_task_progress_not_participant(self, authenticated_client: AsyncClient, test_task, test_session):
        """Test getting task progress when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.get(f"/tasks/{test_task.id}/progress")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_get_task_history_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting user task history."""
        response = await authenticated_client.get(f"/tasks/history/{test_user.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "tasks" in data
        assert isinstance(data["tasks"], list)
        assert "total_count" in data
        assert isinstance(data["total_count"], int)
    
    @pytest.mark.asyncio
    async def test_get_task_history_pagination(self, authenticated_client: AsyncClient, test_user):
        """Test task history pagination."""
        response = await authenticated_client.get(f"/tasks/history/{test_user.id}?page=1&limit=10")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "tasks" in data
        assert "total_count" in data
        assert "page" in data
        assert "limit" in data
        assert data["page"] == 1
        assert data["limit"] == 10
    
    @pytest.mark.asyncio
    async def test_get_task_statistics_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting user task statistics."""
        response = await authenticated_client.get(f"/tasks/stats/{test_user.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "total_tasks" in data
        assert "completed_tasks" in data
        assert "total_coins_earned" in data
        assert "average_completion_time" in data
        assert "completion_rate" in data
        assert isinstance(data["total_tasks"], int)
        assert isinstance(data["completed_tasks"], int)
        assert isinstance(data["total_coins_earned"], int)
        assert isinstance(data["completion_rate"], (int, float))
    
    @pytest.mark.asyncio
    async def test_get_task_categories_success(self, authenticated_client: AsyncClient):
        """Test getting available task categories."""
        response = await authenticated_client.get("/tasks/categories")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "categories" in data
        assert isinstance(data["categories"], list)
        assert len(data["categories"]) > 0
    
    @pytest.mark.asyncio
    async def test_get_task_difficulties_success(self, authenticated_client: AsyncClient):
        """Test getting available task difficulties."""
        response = await authenticated_client.get("/tasks/difficulties")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "difficulties" in data
        assert isinstance(data["difficulties"], list)
        assert len(data["difficulties"]) > 0
    
    @pytest.mark.asyncio
    async def test_get_task_types_success(self, authenticated_client: AsyncClient):
        """Test getting available task types."""
        response = await authenticated_client.get("/tasks/types")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "types" in data
        assert isinstance(data["types"], list)
        assert len(data["types"]) > 0
    
    @pytest.mark.asyncio
    async def test_search_tasks_success(self, authenticated_client: AsyncClient, test_task):
        """Test searching tasks."""
        response = await authenticated_client.get("/tasks/search?category=bonding&difficulty=medium")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "tasks" in data
        assert isinstance(data["tasks"], list)
        # Should find the test task
        assert any(task["id"] == test_task.id for task in data["tasks"])
    
    @pytest.mark.asyncio
    async def test_search_tasks_no_results(self, authenticated_client: AsyncClient):
        """Test searching tasks with no results."""
        response = await authenticated_client.get("/tasks/search?category=nonexistent")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "tasks" in data
        assert len(data["tasks"]) == 0
    
    @pytest.mark.asyncio
    async def test_get_task_recommendations_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting task recommendations for a user."""
        response = await authenticated_client.get(f"/tasks/recommendations/{test_user.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "recommendations" in data
        assert isinstance(data["recommendations"], list)
        assert "reasoning" in data
        assert isinstance(data["reasoning"], str)
    
    @pytest.mark.asyncio
    async def test_get_task_recommendations_nonexistent_user(self, authenticated_client: AsyncClient):
        """Test getting task recommendations for nonexistent user."""
        response = await authenticated_client.get("/tasks/recommendations/99999")
        
        assert_response_error(response, 404, "user not found")
    
    @pytest.mark.asyncio
    async def test_rate_task_success(self, authenticated_client: AsyncClient, test_task):
        """Test rating a completed task."""
        rating_data = {
            "rating": 5,
            "feedback": "Great task!"
        }
        
        response = await authenticated_client.post(f"/tasks/{test_task.id}/rate", json=rating_data)
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "rating submitted" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_rate_task_invalid_rating(self, authenticated_client: AsyncClient, test_task):
        """Test rating a task with invalid rating."""
        rating_data = {
            "rating": 6,  # Invalid rating (should be 1-5)
            "feedback": "Great task!"
        }
        
        response = await authenticated_client.post(f"/tasks/{test_task.id}/rate", json=rating_data)
        
        assert_response_error(response, 422, "rating")
    
    @pytest.mark.asyncio
    async def test_rate_task_not_completed(self, authenticated_client: AsyncClient, test_task):
        """Test rating a task that hasn't been completed."""
        rating_data = {
            "rating": 5,
            "feedback": "Great task!"
        }
        
        response = await authenticated_client.post(f"/tasks/{test_task.id}/rate", json=rating_data)
        
        assert_response_error(response, 400, "task not completed")
    
    @pytest.mark.asyncio
    async def test_get_task_analytics_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting task analytics."""
        response = await authenticated_client.get(f"/tasks/analytics/{test_user.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "completion_rate_by_category" in data
        assert "completion_rate_by_difficulty" in data
        assert "average_rating" in data
        assert "total_time_spent" in data
        assert isinstance(data["completion_rate_by_category"], dict)
        assert isinstance(data["completion_rate_by_difficulty"], dict)
        assert isinstance(data["average_rating"], (int, float))
        assert isinstance(data["total_time_spent"], (int, float))
