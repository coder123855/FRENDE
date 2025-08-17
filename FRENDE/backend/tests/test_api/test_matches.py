import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

from tests.conftest import assert_response_success, assert_response_error


class TestMatchEndpoints:
    """Test match management endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_user_matches_success(self, authenticated_client: AsyncClient, test_user, test_match):
        """Test getting user matches."""
        response = await authenticated_client.get(f"/matches/user/{test_user.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "matches" in data
        assert isinstance(data["matches"], list)
        # Should find the test match
        assert any(match["id"] == test_match.id for match in data["matches"])
    
    @pytest.mark.asyncio
    async def test_get_user_matches_unauthorized(self, client: AsyncClient, test_user):
        """Test getting user matches without authentication."""
        response = await client.get(f"/matches/user/{test_user.id}")
        
        assert_response_error(response, 401, "not authenticated")
    
    @pytest.mark.asyncio
    async def test_get_user_matches_nonexistent_user(self, authenticated_client: AsyncClient):
        """Test getting matches for nonexistent user."""
        response = await authenticated_client.get("/matches/user/99999")
        
        assert_response_error(response, 404, "user not found")
    
    @pytest.mark.asyncio
    async def test_get_match_details_success(self, authenticated_client: AsyncClient, test_match):
        """Test getting match details."""
        response = await authenticated_client.get(f"/matches/{test_match.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert data["id"] == test_match.id
        assert "user1" in data
        assert "user2" in data
        assert "status" in data
        assert "created_at" in data
        assert "expires_at" in data
    
    @pytest.mark.asyncio
    async def test_get_match_details_nonexistent(self, authenticated_client: AsyncClient):
        """Test getting nonexistent match details."""
        response = await authenticated_client.get("/matches/99999")
        
        assert_response_error(response, 404, "match not found")
    
    @pytest.mark.asyncio
    async def test_get_match_details_unauthorized(self, client: AsyncClient, test_match):
        """Test getting match details without authentication."""
        response = await client.get(f"/matches/{test_match.id}")
        
        assert_response_error(response, 401, "not authenticated")
    
    @pytest.mark.asyncio
    async def test_get_match_details_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test getting match details when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.get(f"/matches/{test_match.id}")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_update_match_status_success(self, authenticated_client: AsyncClient, test_match):
        """Test updating match status."""
        update_data = {"status": "completed"}
        
        response = await authenticated_client.put(f"/matches/{test_match.id}/status", json=update_data)
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert data["status"] == "completed"
    
    @pytest.mark.asyncio
    async def test_update_match_status_invalid_status(self, authenticated_client: AsyncClient, test_match):
        """Test updating match status with invalid status."""
        update_data = {"status": "invalid_status"}
        
        response = await authenticated_client.put(f"/matches/{test_match.id}/status", json=update_data)
        
        assert_response_error(response, 422, "status")
    
    @pytest.mark.asyncio
    async def test_update_match_status_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test updating match status when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        update_data = {"status": "completed"}
        response = await authenticated_client.put(f"/matches/{test_match.id}/status", json=update_data)
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_extend_match_expiration_success(self, authenticated_client: AsyncClient, test_match):
        """Test extending match expiration."""
        response = await authenticated_client.post(f"/matches/{test_match.id}/extend")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "expires_at" in data
        # The new expiration should be later than the original
        assert data["expires_at"] > test_match.expires_at.isoformat()
    
    @pytest.mark.asyncio
    async def test_extend_match_expiration_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test extending match expiration when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.post(f"/matches/{test_match.id}/extend")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_get_match_tasks_success(self, authenticated_client: AsyncClient, test_match, test_task):
        """Test getting tasks for a match."""
        response = await authenticated_client.get(f"/matches/{test_match.id}/tasks")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "tasks" in data
        assert isinstance(data["tasks"], list)
        # Should find the test task
        assert any(task["id"] == test_task.id for task in data["tasks"])
    
    @pytest.mark.asyncio
    async def test_get_match_tasks_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test getting match tasks when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.get(f"/matches/{test_match.id}/tasks")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_get_match_chat_history_success(self, authenticated_client: AsyncClient, test_match):
        """Test getting chat history for a match."""
        response = await authenticated_client.get(f"/matches/{test_match.id}/chat")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "messages" in data
        assert isinstance(data["messages"], list)
        assert "total_count" in data
        assert isinstance(data["total_count"], int)
    
    @pytest.mark.asyncio
    async def test_get_match_chat_history_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test getting match chat history when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.get(f"/matches/{test_match.id}/chat")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_get_match_chat_history_pagination(self, authenticated_client: AsyncClient, test_match):
        """Test match chat history pagination."""
        response = await authenticated_client.get(f"/matches/{test_match.id}/chat?page=1&limit=10")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "messages" in data
        assert "total_count" in data
        assert "page" in data
        assert "limit" in data
        assert data["page"] == 1
        assert data["limit"] == 10
    
    @pytest.mark.asyncio
    async def test_get_match_statistics_success(self, authenticated_client: AsyncClient, test_match):
        """Test getting match statistics."""
        response = await authenticated_client.get(f"/matches/{test_match.id}/stats")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "total_messages" in data
        assert "completed_tasks" in data
        assert "total_coins_earned" in data
        assert "match_duration_hours" in data
        assert isinstance(data["total_messages"], int)
        assert isinstance(data["completed_tasks"], int)
        assert isinstance(data["total_coins_earned"], int)
        assert isinstance(data["match_duration_hours"], (int, float))
    
    @pytest.mark.asyncio
    async def test_get_match_statistics_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test getting match statistics when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.get(f"/matches/{test_match.id}/stats")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_leave_match_success(self, authenticated_client: AsyncClient, test_match):
        """Test leaving a match."""
        response = await authenticated_client.post(f"/matches/{test_match.id}/leave")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "left match" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_leave_match_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test leaving a match when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.post(f"/matches/{test_match.id}/leave")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_report_match_success(self, authenticated_client: AsyncClient, test_match):
        """Test reporting a match."""
        report_data = {
            "reason": "inappropriate_behavior",
            "description": "User was being inappropriate"
        }
        
        response = await authenticated_client.post(f"/matches/{test_match.id}/report", json=report_data)
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "report submitted" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_report_match_invalid_reason(self, authenticated_client: AsyncClient, test_match):
        """Test reporting a match with invalid reason."""
        report_data = {
            "reason": "invalid_reason",
            "description": "Invalid reason"
        }
        
        response = await authenticated_client.post(f"/matches/{test_match.id}/report", json=report_data)
        
        assert_response_error(response, 422, "reason")
    
    @pytest.mark.asyncio
    async def test_report_match_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test reporting a match when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        report_data = {
            "reason": "inappropriate_behavior",
            "description": "User was being inappropriate"
        }
        
        response = await authenticated_client.post(f"/matches/{test_match.id}/report", json=report_data)
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_get_match_compatibility_success(self, authenticated_client: AsyncClient, test_match):
        """Test getting match compatibility details."""
        response = await authenticated_client.get(f"/matches/{test_match.id}/compatibility")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "compatibility_score" in data
        assert "common_interests" in data
        assert "matching_factors" in data
        assert isinstance(data["compatibility_score"], (int, float))
        assert isinstance(data["common_interests"], list)
        assert isinstance(data["matching_factors"], dict)
    
    @pytest.mark.asyncio
    async def test_get_match_compatibility_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test getting match compatibility when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.get(f"/matches/{test_match.id}/compatibility")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_get_match_activity_success(self, authenticated_client: AsyncClient, test_match):
        """Test getting match activity timeline."""
        response = await authenticated_client.get(f"/matches/{test_match.id}/activity")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "activities" in data
        assert isinstance(data["activities"], list)
        assert "total_count" in data
        assert isinstance(data["total_count"], int)
    
    @pytest.mark.asyncio
    async def test_get_match_activity_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test getting match activity when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.get(f"/matches/{test_match.id}/activity")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_get_match_activity_pagination(self, authenticated_client: AsyncClient, test_match):
        """Test match activity pagination."""
        response = await authenticated_client.get(f"/matches/{test_match.id}/activity?page=1&limit=10")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "activities" in data
        assert "total_count" in data
        assert "page" in data
        assert "limit" in data
        assert data["page"] == 1
        assert data["limit"] == 10
