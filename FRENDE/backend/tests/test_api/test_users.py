import pytest
import os
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

from tests.conftest import assert_response_success, assert_response_error


class TestUserEndpoints:
    """Test user profile endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_user_profile_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting user profile with valid authentication."""
        response = await authenticated_client.get(f"/users/{test_user.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert data["id"] == test_user.id
        assert data["email"] == test_user.email
        assert data["name"] == test_user.name
        assert data["age"] == test_user.age
        assert data["profession"] == test_user.profession
        assert data["profile_text"] == test_user.profile_text
        assert data["community"] == test_user.community
        assert data["location"] == test_user.location
        assert data["coins"] == test_user.coins
    
    @pytest.mark.asyncio
    async def test_get_user_profile_unauthorized(self, client: AsyncClient, test_user):
        """Test getting user profile without authentication."""
        response = await client.get(f"/users/{test_user.id}")
        
        assert_response_error(response, 401, "not authenticated")
    
    @pytest.mark.asyncio
    async def test_get_user_profile_nonexistent(self, authenticated_client: AsyncClient):
        """Test getting nonexistent user profile."""
        response = await authenticated_client.get("/users/99999")
        
        assert_response_error(response, 404, "user not found")
    
    @pytest.mark.asyncio
    async def test_update_user_profile_success(self, authenticated_client: AsyncClient, test_user):
        """Test successful profile update."""
        update_data = {
            "name": "Updated Name",
            "age": 26,
            "profession": "Updated Profession",
            "profile_text": "Updated profile text",
            "community": "Arts",
            "location": "New York"
        }
        
        response = await authenticated_client.put(f"/users/{test_user.id}", json=update_data)
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert data["name"] == update_data["name"]
        assert data["age"] == update_data["age"]
        assert data["profession"] == update_data["profession"]
        assert data["profile_text"] == update_data["profile_text"]
        assert data["community"] == update_data["community"]
        assert data["location"] == update_data["location"]
    
    @pytest.mark.asyncio
    async def test_update_user_profile_invalid_age(self, authenticated_client: AsyncClient, test_user):
        """Test profile update with invalid age."""
        update_data = {
            "age": 150  # Invalid age
        }
        
        response = await authenticated_client.put(f"/users/{test_user.id}", json=update_data)
        
        assert_response_error(response, 422, "age")
    
    @pytest.mark.asyncio
    async def test_update_user_profile_too_long_text(self, authenticated_client: AsyncClient, test_user):
        """Test profile update with too long profile text."""
        update_data = {
            "profile_text": "A" * 501  # Exceeds 500 character limit
        }
        
        response = await authenticated_client.put(f"/users/{test_user.id}", json=update_data)
        
        assert_response_error(response, 422, "profile_text")
    
    @pytest.mark.asyncio
    async def test_update_user_profile_unauthorized(self, client: AsyncClient, test_user):
        """Test profile update without authentication."""
        update_data = {"name": "Updated Name"}
        
        response = await client.put(f"/users/{test_user.id}", json=update_data)
        
        assert_response_error(response, 401, "not authenticated")
    
    @pytest.mark.asyncio
    async def test_update_other_user_profile_forbidden(self, authenticated_client: AsyncClient, test_user2):
        """Test updating another user's profile."""
        update_data = {"name": "Updated Name"}
        
        response = await authenticated_client.put(f"/users/{test_user2.id}", json=update_data)
        
        assert_response_error(response, 403, "forbidden")
    
    @pytest.mark.asyncio
    async def test_upload_profile_picture_success(self, authenticated_client: AsyncClient, test_user, test_image_file):
        """Test successful profile picture upload."""
        with open(test_image_file, "rb") as f:
            files = {"file": ("test_image.jpg", f, "image/jpeg")}
            response = await authenticated_client.post(
                f"/users/{test_user.id}/profile-picture",
                files=files
            )
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "profile_picture_url" in data
        assert data["profile_picture_url"] is not None
    
    @pytest.mark.asyncio
    async def test_upload_profile_picture_invalid_format(self, authenticated_client: AsyncClient, test_user):
        """Test profile picture upload with invalid format."""
        # Create a text file instead of image
        files = {"file": ("test.txt", b"not an image", "text/plain")}
        response = await authenticated_client.post(
            f"/users/{test_user.id}/profile-picture",
            files=files
        )
        
        assert_response_error(response, 400, "invalid file format")
    
    @pytest.mark.asyncio
    async def test_upload_profile_picture_file_too_large(self, authenticated_client: AsyncClient, test_user):
        """Test profile picture upload with file too large."""
        # Create a large file (over 30MB)
        large_data = b"x" * (31 * 1024 * 1024)  # 31MB
        files = {"file": ("large_image.jpg", large_data, "image/jpeg")}
        
        response = await authenticated_client.post(
            f"/users/{test_user.id}/profile-picture",
            files=files
        )
        
        assert_response_error(response, 400, "file too large")
    
    @pytest.mark.asyncio
    async def test_upload_profile_picture_no_file(self, authenticated_client: AsyncClient, test_user):
        """Test profile picture upload without file."""
        response = await authenticated_client.post(f"/users/{test_user.id}/profile-picture")
        
        assert_response_error(response, 400, "no file provided")
    
    @pytest.mark.asyncio
    async def test_delete_profile_picture_success(self, authenticated_client: AsyncClient, test_user):
        """Test successful profile picture deletion."""
        response = await authenticated_client.delete(f"/users/{test_user.id}/profile-picture")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "profile picture deleted" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_get_user_stats_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting user statistics."""
        response = await authenticated_client.get(f"/users/{test_user.id}/stats")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "total_matches" in data
        assert "completed_tasks" in data
        assert "total_coins_earned" in data
        assert "current_coins" in data
    
    @pytest.mark.asyncio
    async def test_search_users_success(self, authenticated_client: AsyncClient, test_user, test_user2):
        """Test user search functionality."""
        response = await authenticated_client.get("/users/search?community=Tech&location=San Francisco")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "users" in data
        assert isinstance(data["users"], list)
        # Should find test_user who matches the criteria
        assert any(user["id"] == test_user.id for user in data["users"])
    
    @pytest.mark.asyncio
    async def test_search_users_no_results(self, authenticated_client: AsyncClient):
        """Test user search with no matching results."""
        response = await authenticated_client.get("/users/search?community=NonExistent")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "users" in data
        assert len(data["users"]) == 0
    
    @pytest.mark.asyncio
    async def test_get_user_matches_success(self, authenticated_client: AsyncClient, test_user, test_match):
        """Test getting user matches."""
        response = await authenticated_client.get(f"/users/{test_user.id}/matches")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "matches" in data
        assert isinstance(data["matches"], list)
        # Should find the test match
        assert any(match["id"] == test_match.id for match in data["matches"])
    
    @pytest.mark.asyncio
    async def test_get_user_tasks_success(self, authenticated_client: AsyncClient, test_user, test_task):
        """Test getting user tasks."""
        response = await authenticated_client.get(f"/users/{test_user.id}/tasks")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "tasks" in data
        assert isinstance(data["tasks"], list)
        # Should find the test task
        assert any(task["id"] == test_task.id for task in data["tasks"])
    
    @pytest.mark.asyncio
    async def test_get_user_slots_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting user slots."""
        response = await authenticated_client.get(f"/users/{test_user.id}/slots")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "available_slots" in data
        assert "total_slots" in data
        assert "slot_reset_time" in data
        assert isinstance(data["available_slots"], int)
        assert isinstance(data["total_slots"], int)
    
    @pytest.mark.asyncio
    async def test_purchase_slot_success(self, authenticated_client: AsyncClient, test_user):
        """Test purchasing a slot."""
        response = await authenticated_client.post(f"/users/{test_user.id}/slots/purchase")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "slot purchased" in data["message"].lower()
        assert "available_slots" in data
        assert data["available_slots"] > 0
    
    @pytest.mark.asyncio
    async def test_purchase_slot_insufficient_coins(self, authenticated_client: AsyncClient, test_session):
        """Test purchasing a slot with insufficient coins."""
        # Create user with 0 coins
        from tests.conftest import create_test_user
        poor_user = await create_test_user(test_session, coins=0)
        
        auth_headers = await get_auth_headers(poor_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.post(f"/users/{poor_user.id}/slots/purchase")
        
        assert_response_error(response, 400, "insufficient coins")
    
    @pytest.mark.asyncio
    async def test_get_user_compatibility_success(self, authenticated_client: AsyncClient, test_user, test_user2):
        """Test getting user compatibility with another user."""
        response = await authenticated_client.get(f"/users/{test_user.id}/compatibility/{test_user2.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "compatibility_score" in data
        assert "common_interests" in data
        assert "matching_factors" in data
        assert isinstance(data["compatibility_score"], (int, float))
        assert isinstance(data["common_interests"], list)
        assert isinstance(data["matching_factors"], dict)
    
    @pytest.mark.asyncio
    async def test_get_user_compatibility_nonexistent_user(self, authenticated_client: AsyncClient, test_user):
        """Test getting compatibility with nonexistent user."""
        response = await authenticated_client.get(f"/users/{test_user.id}/compatibility/99999")
        
        assert_response_error(response, 404, "user not found")
    
    @pytest.mark.asyncio
    async def test_update_user_settings_success(self, authenticated_client: AsyncClient, test_user):
        """Test updating user settings."""
        settings_data = {
            "notifications_enabled": False,
            "privacy_level": "private",
            "auto_greeting_enabled": True
        }
        
        response = await authenticated_client.put(f"/users/{test_user.id}/settings", json=settings_data)
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert data["notifications_enabled"] == settings_data["notifications_enabled"]
        assert data["privacy_level"] == settings_data["privacy_level"]
        assert data["auto_greeting_enabled"] == settings_data["auto_greeting_enabled"]
    
    @pytest.mark.asyncio
    async def test_get_user_settings_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting user settings."""
        response = await authenticated_client.get(f"/users/{test_user.id}/settings")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "notifications_enabled" in data
        assert "privacy_level" in data
        assert "auto_greeting_enabled" in data
    
    @pytest.mark.asyncio
    async def test_deactivate_user_success(self, authenticated_client: AsyncClient, test_user):
        """Test deactivating user account."""
        response = await authenticated_client.post(f"/users/{test_user.id}/deactivate")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "account deactivated" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_reactivate_user_success(self, authenticated_client: AsyncClient, test_user):
        """Test reactivating user account."""
        response = await authenticated_client.post(f"/users/{test_user.id}/reactivate")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "account reactivated" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_get_user_activity_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting user activity history."""
        response = await authenticated_client.get(f"/users/{test_user.id}/activity")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "activities" in data
        assert isinstance(data["activities"], list)
        assert "total_count" in data
        assert isinstance(data["total_count"], int)
    
    @pytest.mark.asyncio
    async def test_get_user_activity_pagination(self, authenticated_client: AsyncClient, test_user):
        """Test user activity pagination."""
        response = await authenticated_client.get(f"/users/{test_user.id}/activity?page=1&limit=10")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "activities" in data
        assert "total_count" in data
        assert "page" in data
        assert "limit" in data
        assert data["page"] == 1
        assert data["limit"] == 10
