import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

from tests.conftest import assert_response_success, assert_response_error


class TestMatchRequestEndpoints:
    """Test match request endpoints."""
    
    @pytest.mark.asyncio
    async def test_create_match_request_success(self, authenticated_client: AsyncClient, test_user, test_user2):
        """Test creating a match request."""
        request_data = {
            "target_user_id": test_user2.id,
            "message": "Hi, I'd like to be friends!"
        }
        
        response = await authenticated_client.post("/match-requests", json=request_data)
        
        assert_response_success(response, 201)
        data = response.json()
        
        assert "id" in data
        assert data["requester_id"] == test_user.id
        assert data["target_user_id"] == test_user2.id
        assert data["message"] == request_data["message"]
        assert data["status"] == "pending"
    
    @pytest.mark.asyncio
    async def test_create_match_request_self(self, authenticated_client: AsyncClient, test_user):
        """Test creating a match request to yourself."""
        request_data = {
            "target_user_id": test_user.id,
            "message": "Hi, I'd like to be friends!"
        }
        
        response = await authenticated_client.post("/match-requests", json=request_data)
        
        assert_response_error(response, 400, "cannot request yourself")
    
    @pytest.mark.asyncio
    async def test_create_match_request_nonexistent_user(self, authenticated_client: AsyncClient, test_user):
        """Test creating a match request to nonexistent user."""
        request_data = {
            "target_user_id": 99999,
            "message": "Hi, I'd like to be friends!"
        }
        
        response = await authenticated_client.post("/match-requests", json=request_data)
        
        assert_response_error(response, 404, "user not found")
    
    @pytest.mark.asyncio
    async def test_create_match_request_no_slots(self, authenticated_client: AsyncClient, test_session):
        """Test creating a match request when user has no available slots."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a user with 0 slots
        user_no_slots = await create_test_user(test_session, email="noslots@example.com")
        auth_headers = await get_auth_headers(user_no_slots.id)
        authenticated_client.headers.update(auth_headers)
        
        request_data = {
            "target_user_id": test_user2.id,
            "message": "Hi, I'd like to be friends!"
        }
        
        response = await authenticated_client.post("/match-requests", json=request_data)
        
        assert_response_error(response, 400, "no available slots")
    
    @pytest.mark.asyncio
    async def test_create_match_request_duplicate(self, authenticated_client: AsyncClient, test_user, test_user2):
        """Test creating a duplicate match request."""
        request_data = {
            "target_user_id": test_user2.id,
            "message": "Hi, I'd like to be friends!"
        }
        
        # First request
        await authenticated_client.post("/match-requests", json=request_data)
        
        # Second request (should fail)
        response = await authenticated_client.post("/match-requests", json=request_data)
        
        assert_response_error(response, 400, "request already exists")
    
    @pytest.mark.asyncio
    async def test_get_match_requests_received_success(self, authenticated_client: AsyncClient, test_user2):
        """Test getting received match requests."""
        response = await authenticated_client.get(f"/match-requests/received/{test_user2.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "requests" in data
        assert isinstance(data["requests"], list)
        assert "total_count" in data
        assert isinstance(data["total_count"], int)
    
    @pytest.mark.asyncio
    async def test_get_match_requests_received_unauthorized(self, client: AsyncClient, test_user2):
        """Test getting received match requests without authentication."""
        response = await client.get(f"/match-requests/received/{test_user2.id}")
        
        assert_response_error(response, 401, "not authenticated")
    
    @pytest.mark.asyncio
    async def test_get_match_requests_received_not_owner(self, authenticated_client: AsyncClient, test_user, test_user2):
        """Test getting received match requests when user is not the owner."""
        response = await authenticated_client.get(f"/match-requests/received/{test_user2.id}")
        
        assert_response_error(response, 403, "not authorized")
    
    @pytest.mark.asyncio
    async def test_get_match_requests_sent_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting sent match requests."""
        response = await authenticated_client.get(f"/match-requests/sent/{test_user.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "requests" in data
        assert isinstance(data["requests"], list)
        assert "total_count" in data
        assert isinstance(data["total_count"], int)
    
    @pytest.mark.asyncio
    async def test_get_match_requests_sent_not_owner(self, authenticated_client: AsyncClient, test_user, test_user2):
        """Test getting sent match requests when user is not the owner."""
        response = await authenticated_client.get(f"/match-requests/sent/{test_user2.id}")
        
        assert_response_error(response, 403, "not authorized")
    
    @pytest.mark.asyncio
    async def test_get_match_request_details_success(self, authenticated_client: AsyncClient, test_match_request):
        """Test getting match request details."""
        response = await authenticated_client.get(f"/match-requests/{test_match_request.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert data["id"] == test_match_request.id
        assert "requester" in data
        assert "target_user" in data
        assert "message" in data
        assert "status" in data
        assert "created_at" in data
    
    @pytest.mark.asyncio
    async def test_get_match_request_details_nonexistent(self, authenticated_client: AsyncClient):
        """Test getting nonexistent match request details."""
        response = await authenticated_client.get("/match-requests/99999")
        
        assert_response_error(response, 404, "match request not found")
    
    @pytest.mark.asyncio
    async def test_get_match_request_details_unauthorized(self, client: AsyncClient, test_match_request):
        """Test getting match request details without authentication."""
        response = await client.get(f"/match-requests/{test_match_request.id}")
        
        assert_response_error(response, 401, "not authenticated")
    
    @pytest.mark.asyncio
    async def test_get_match_request_details_not_participant(self, authenticated_client: AsyncClient, test_match_request, test_session):
        """Test getting match request details when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the request
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.get(f"/match-requests/{test_match_request.id}")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_accept_match_request_success(self, authenticated_client: AsyncClient, test_match_request):
        """Test accepting a match request."""
        response = await authenticated_client.post(f"/match-requests/{test_match_request.id}/accept")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "match request accepted" in data["message"].lower()
        assert "match" in data
        assert data["match"]["status"] == "active"
    
    @pytest.mark.asyncio
    async def test_accept_match_request_not_target(self, authenticated_client: AsyncClient, test_match_request, test_session):
        """Test accepting a match request when user is not the target."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not the target
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.post(f"/match-requests/{test_match_request.id}/accept")
        
        assert_response_error(response, 403, "not the target user")
    
    @pytest.mark.asyncio
    async def test_accept_match_request_already_processed(self, authenticated_client: AsyncClient, test_match_request):
        """Test accepting an already processed match request."""
        # First acceptance
        await authenticated_client.post(f"/match-requests/{test_match_request.id}/accept")
        
        # Second acceptance attempt
        response = await authenticated_client.post(f"/match-requests/{test_match_request.id}/accept")
        
        assert_response_error(response, 400, "already processed")
    
    @pytest.mark.asyncio
    async def test_reject_match_request_success(self, authenticated_client: AsyncClient, test_match_request):
        """Test rejecting a match request."""
        response = await authenticated_client.post(f"/match-requests/{test_match_request.id}/reject")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "match request rejected" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_reject_match_request_not_target(self, authenticated_client: AsyncClient, test_match_request, test_session):
        """Test rejecting a match request when user is not the target."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not the target
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.post(f"/match-requests/{test_match_request.id}/reject")
        
        assert_response_error(response, 403, "not the target user")
    
    @pytest.mark.asyncio
    async def test_reject_match_request_already_processed(self, authenticated_client: AsyncClient, test_match_request):
        """Test rejecting an already processed match request."""
        # First rejection
        await authenticated_client.post(f"/match-requests/{test_match_request.id}/reject")
        
        # Second rejection attempt
        response = await authenticated_client.post(f"/match-requests/{test_match_request.id}/reject")
        
        assert_response_error(response, 400, "already processed")
    
    @pytest.mark.asyncio
    async def test_cancel_match_request_success(self, authenticated_client: AsyncClient, test_match_request):
        """Test canceling a match request."""
        response = await authenticated_client.post(f"/match-requests/{test_match_request.id}/cancel")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "match request canceled" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_cancel_match_request_not_requester(self, authenticated_client: AsyncClient, test_match_request, test_session):
        """Test canceling a match request when user is not the requester."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not the requester
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.post(f"/match-requests/{test_match_request.id}/cancel")
        
        assert_response_error(response, 403, "not the requester")
    
    @pytest.mark.asyncio
    async def test_cancel_match_request_already_processed(self, authenticated_client: AsyncClient, test_match_request):
        """Test canceling an already processed match request."""
        # First cancel
        await authenticated_client.post(f"/match-requests/{test_match_request.id}/cancel")
        
        # Second cancel attempt
        response = await authenticated_client.post(f"/match-requests/{test_match_request.id}/cancel")
        
        assert_response_error(response, 400, "already processed")
    
    @pytest.mark.asyncio
    async def test_update_match_request_message_success(self, authenticated_client: AsyncClient, test_match_request):
        """Test updating match request message."""
        update_data = {
            "message": "Updated message"
        }
        
        response = await authenticated_client.put(f"/match-requests/{test_match_request.id}/message", json=update_data)
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert data["message"] == update_data["message"]
    
    @pytest.mark.asyncio
    async def test_update_match_request_message_not_requester(self, authenticated_client: AsyncClient, test_match_request, test_session):
        """Test updating match request message when user is not the requester."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not the requester
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        update_data = {
            "message": "Updated message"
        }
        
        response = await authenticated_client.put(f"/match-requests/{test_match_request.id}/message", json=update_data)
        
        assert_response_error(response, 403, "not the requester")
    
    @pytest.mark.asyncio
    async def test_update_match_request_message_already_processed(self, authenticated_client: AsyncClient, test_match_request):
        """Test updating match request message when already processed."""
        # First process the request
        await authenticated_client.post(f"/match-requests/{test_match_request.id}/accept")
        
        # Then try to update message
        update_data = {
            "message": "Updated message"
        }
        
        response = await authenticated_client.put(f"/match-requests/{test_match_request.id}/message", json=update_data)
        
        assert_response_error(response, 400, "already processed")
    
    @pytest.mark.asyncio
    async def test_get_match_request_statistics_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting match request statistics."""
        response = await authenticated_client.get(f"/match-requests/stats/{test_user.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "total_sent" in data
        assert "total_received" in data
        assert "accepted_requests" in data
        assert "rejected_requests" in data
        assert "acceptance_rate" in data
        assert isinstance(data["total_sent"], int)
        assert isinstance(data["total_received"], int)
        assert isinstance(data["accepted_requests"], int)
        assert isinstance(data["rejected_requests"], int)
        assert isinstance(data["acceptance_rate"], (int, float))
    
    @pytest.mark.asyncio
    async def test_get_match_request_statistics_not_owner(self, authenticated_client: AsyncClient, test_user, test_user2):
        """Test getting match request statistics when user is not the owner."""
        response = await authenticated_client.get(f"/match-requests/stats/{test_user2.id}")
        
        assert_response_error(response, 403, "not authorized")
    
    @pytest.mark.asyncio
    async def test_get_match_request_history_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting match request history."""
        response = await authenticated_client.get(f"/match-requests/history/{test_user.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "requests" in data
        assert isinstance(data["requests"], list)
        assert "total_count" in data
        assert isinstance(data["total_count"], int)
    
    @pytest.mark.asyncio
    async def test_get_match_request_history_pagination(self, authenticated_client: AsyncClient, test_user):
        """Test match request history pagination."""
        response = await authenticated_client.get(f"/match-requests/history/{test_user.id}?page=1&limit=10")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "requests" in data
        assert "total_count" in data
        assert "page" in data
        assert "limit" in data
        assert data["page"] == 1
        assert data["limit"] == 10
    
    @pytest.mark.asyncio
    async def test_get_match_request_history_not_owner(self, authenticated_client: AsyncClient, test_user, test_user2):
        """Test getting match request history when user is not the owner."""
        response = await authenticated_client.get(f"/match-requests/history/{test_user2.id}")
        
        assert_response_error(response, 403, "not authorized")
    
    @pytest.mark.asyncio
    async def test_search_match_requests_success(self, authenticated_client: AsyncClient, test_user):
        """Test searching match requests."""
        response = await authenticated_client.get(f"/match-requests/search/{test_user.id}?status=pending")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "requests" in data
        assert isinstance(data["requests"], list)
        assert "total_count" in data
        assert isinstance(data["total_count"], int)
    
    @pytest.mark.asyncio
    async def test_search_match_requests_not_owner(self, authenticated_client: AsyncClient, test_user, test_user2):
        """Test searching match requests when user is not the owner."""
        response = await authenticated_client.get(f"/match-requests/search/{test_user2.id}?status=pending")
        
        assert_response_error(response, 403, "not authorized")
    
    @pytest.mark.asyncio
    async def test_get_match_request_notifications_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting match request notifications."""
        response = await authenticated_client.get(f"/match-requests/notifications/{test_user.id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "notifications" in data
        assert isinstance(data["notifications"], list)
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)
    
    @pytest.mark.asyncio
    async def test_get_match_request_notifications_not_owner(self, authenticated_client: AsyncClient, test_user, test_user2):
        """Test getting match request notifications when user is not the owner."""
        response = await authenticated_client.get(f"/match-requests/notifications/{test_user2.id}")
        
        assert_response_error(response, 403, "not authorized")
    
    @pytest.mark.asyncio
    async def test_mark_match_request_notifications_read_success(self, authenticated_client: AsyncClient, test_user):
        """Test marking match request notifications as read."""
        response = await authenticated_client.post(f"/match-requests/notifications/{test_user.id}/mark-read")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "notifications marked as read" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_mark_match_request_notifications_read_not_owner(self, authenticated_client: AsyncClient, test_user, test_user2):
        """Test marking match request notifications as read when user is not the owner."""
        response = await authenticated_client.post(f"/match-requests/notifications/{test_user2.id}/mark-read")
        
        assert_response_error(response, 403, "not authorized")
