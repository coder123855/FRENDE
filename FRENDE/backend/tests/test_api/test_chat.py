import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

from tests.conftest import assert_response_success, assert_response_error


class TestChatEndpoints:
    """Test chat endpoints."""
    
    @pytest.mark.asyncio
    async def test_get_chat_history_success(self, authenticated_client: AsyncClient, test_match):
        """Test getting chat history for a match."""
        response = await authenticated_client.get(f"/chat/{test_match.id}/history")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "messages" in data
        assert isinstance(data["messages"], list)
        assert "total_count" in data
        assert isinstance(data["total_count"], int)
    
    @pytest.mark.asyncio
    async def test_get_chat_history_unauthorized(self, client: AsyncClient, test_match):
        """Test getting chat history without authentication."""
        response = await client.get(f"/chat/{test_match.id}/history")
        
        assert_response_error(response, 401, "not authenticated")
    
    @pytest.mark.asyncio
    async def test_get_chat_history_nonexistent_match(self, authenticated_client: AsyncClient):
        """Test getting chat history for nonexistent match."""
        response = await authenticated_client.get("/chat/99999/history")
        
        assert_response_error(response, 404, "match not found")
    
    @pytest.mark.asyncio
    async def test_get_chat_history_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test getting chat history when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.get(f"/chat/{test_match.id}/history")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_get_chat_history_pagination(self, authenticated_client: AsyncClient, test_match):
        """Test chat history pagination."""
        response = await authenticated_client.get(f"/chat/{test_match.id}/history?page=1&limit=10")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "messages" in data
        assert "total_count" in data
        assert "page" in data
        assert "limit" in data
        assert data["page"] == 1
        assert data["limit"] == 10
    
    @pytest.mark.asyncio
    async def test_send_message_success(self, authenticated_client: AsyncClient, test_match):
        """Test sending a message."""
        message_data = {
            "content": "Hello, how are you?",
            "message_type": "text"
        }
        
        response = await authenticated_client.post(f"/chat/{test_match.id}/send", json=message_data)
        
        assert_response_success(response, 201)
        data = response.json()
        
        assert "message" in data
        assert data["message"]["content"] == message_data["content"]
        assert data["message"]["message_type"] == message_data["message_type"]
        assert "id" in data["message"]
        assert "created_at" in data["message"]
    
    @pytest.mark.asyncio
    async def test_send_message_empty_content(self, authenticated_client: AsyncClient, test_match):
        """Test sending a message with empty content."""
        message_data = {
            "content": "",
            "message_type": "text"
        }
        
        response = await authenticated_client.post(f"/chat/{test_match.id}/send", json=message_data)
        
        assert_response_error(response, 422, "content")
    
    @pytest.mark.asyncio
    async def test_send_message_too_long(self, authenticated_client: AsyncClient, test_match):
        """Test sending a message that's too long."""
        message_data = {
            "content": "A" * 1001,  # Exceeds 1000 character limit
            "message_type": "text"
        }
        
        response = await authenticated_client.post(f"/chat/{test_match.id}/send", json=message_data)
        
        assert_response_error(response, 422, "content")
    
    @pytest.mark.asyncio
    async def test_send_message_invalid_type(self, authenticated_client: AsyncClient, test_match):
        """Test sending a message with invalid type."""
        message_data = {
            "content": "Hello",
            "message_type": "invalid_type"
        }
        
        response = await authenticated_client.post(f"/chat/{test_match.id}/send", json=message_data)
        
        assert_response_error(response, 422, "message_type")
    
    @pytest.mark.asyncio
    async def test_send_message_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test sending a message when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        message_data = {
            "content": "Hello",
            "message_type": "text"
        }
        
        response = await authenticated_client.post(f"/chat/{test_match.id}/send", json=message_data)
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_send_message_match_expired(self, authenticated_client: AsyncClient, test_session):
        """Test sending a message to an expired match."""
        from datetime import datetime, timedelta
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create an expired match
        expired_match = Match(
            user1_id=test_user.id,
            user2_id=test_user2.id,
            status="expired",
            created_at=datetime.utcnow() - timedelta(days=3),
            expires_at=datetime.utcnow() - timedelta(days=1)
        )
        test_session.add(expired_match)
        await test_session.commit()
        await test_session.refresh(expired_match)
        
        message_data = {
            "content": "Hello",
            "message_type": "text"
        }
        
        response = await authenticated_client.post(f"/chat/{expired_match.id}/send", json=message_data)
        
        assert_response_error(response, 400, "match expired")
    
    @pytest.mark.asyncio
    async def test_delete_message_success(self, authenticated_client: AsyncClient, test_match):
        """Test deleting a message."""
        # First send a message
        message_data = {
            "content": "Message to delete",
            "message_type": "text"
        }
        send_response = await authenticated_client.post(f"/chat/{test_match.id}/send", json=message_data)
        message_id = send_response.json()["message"]["id"]
        
        # Then delete it
        response = await authenticated_client.delete(f"/chat/message/{message_id}")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "message deleted" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_delete_message_nonexistent(self, authenticated_client: AsyncClient):
        """Test deleting a nonexistent message."""
        response = await authenticated_client.delete("/chat/message/99999")
        
        assert_response_error(response, 404, "message not found")
    
    @pytest.mark.asyncio
    async def test_delete_message_not_author(self, authenticated_client: AsyncClient, test_match, test_session):
        """Test deleting a message when user is not the author."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.delete("/chat/message/1")
        
        assert_response_error(response, 403, "not the author")
    
    @pytest.mark.asyncio
    async def test_edit_message_success(self, authenticated_client: AsyncClient, test_match):
        """Test editing a message."""
        # First send a message
        message_data = {
            "content": "Original message",
            "message_type": "text"
        }
        send_response = await authenticated_client.post(f"/chat/{test_match.id}/send", json=message_data)
        message_id = send_response.json()["message"]["id"]
        
        # Then edit it
        edit_data = {
            "content": "Edited message"
        }
        response = await authenticated_client.put(f"/chat/message/{message_id}", json=edit_data)
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert data["message"]["content"] == edit_data["content"]
        assert "edited_at" in data["message"]
    
    @pytest.mark.asyncio
    async def test_edit_message_nonexistent(self, authenticated_client: AsyncClient):
        """Test editing a nonexistent message."""
        edit_data = {
            "content": "Edited content"
        }
        response = await authenticated_client.put("/chat/message/99999", json=edit_data)
        
        assert_response_error(response, 404, "message not found")
    
    @pytest.mark.asyncio
    async def test_edit_message_not_author(self, authenticated_client: AsyncClient, test_match, test_session):
        """Test editing a message when user is not the author."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        edit_data = {
            "content": "Edited content"
        }
        response = await authenticated_client.put("/chat/message/1", json=edit_data)
        
        assert_response_error(response, 403, "not the author")
    
    @pytest.mark.asyncio
    async def test_mark_messages_read_success(self, authenticated_client: AsyncClient, test_match):
        """Test marking messages as read."""
        response = await authenticated_client.post(f"/chat/{test_match.id}/mark-read")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "messages marked as read" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_mark_messages_read_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test marking messages as read when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.post(f"/chat/{test_match.id}/mark-read")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_get_unread_count_success(self, authenticated_client: AsyncClient, test_match):
        """Test getting unread message count."""
        response = await authenticated_client.get(f"/chat/{test_match.id}/unread-count")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "unread_count" in data
        assert isinstance(data["unread_count"], int)
    
    @pytest.mark.asyncio
    async def test_get_unread_count_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test getting unread count when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.get(f"/chat/{test_match.id}/unread-count")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_get_chat_statistics_success(self, authenticated_client: AsyncClient, test_match):
        """Test getting chat statistics."""
        response = await authenticated_client.get(f"/chat/{test_match.id}/stats")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "total_messages" in data
        assert "messages_today" in data
        assert "average_response_time" in data
        assert "most_active_hour" in data
        assert isinstance(data["total_messages"], int)
        assert isinstance(data["messages_today"], int)
        assert isinstance(data["average_response_time"], (int, float))
        assert isinstance(data["most_active_hour"], int)
    
    @pytest.mark.asyncio
    async def test_get_chat_statistics_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test getting chat statistics when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.get(f"/chat/{test_match.id}/stats")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_search_messages_success(self, authenticated_client: AsyncClient, test_match):
        """Test searching messages."""
        response = await authenticated_client.get(f"/chat/{test_match.id}/search?query=hello")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "messages" in data
        assert isinstance(data["messages"], list)
        assert "total_count" in data
        assert isinstance(data["total_count"], int)
    
    @pytest.mark.asyncio
    async def test_search_messages_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test searching messages when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.get(f"/chat/{test_match.id}/search?query=hello")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_get_typing_status_success(self, authenticated_client: AsyncClient, test_match):
        """Test getting typing status."""
        response = await authenticated_client.get(f"/chat/{test_match.id}/typing-status")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "typing_users" in data
        assert isinstance(data["typing_users"], list)
    
    @pytest.mark.asyncio
    async def test_set_typing_status_success(self, authenticated_client: AsyncClient, test_match):
        """Test setting typing status."""
        typing_data = {
            "is_typing": True
        }
        
        response = await authenticated_client.post(f"/chat/{test_match.id}/typing", json=typing_data)
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "typing status updated" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_set_typing_status_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test setting typing status when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        typing_data = {
            "is_typing": True
        }
        
        response = await authenticated_client.post(f"/chat/{test_match.id}/typing", json=typing_data)
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_get_online_status_success(self, authenticated_client: AsyncClient, test_match):
        """Test getting online status of participants."""
        response = await authenticated_client.get(f"/chat/{test_match.id}/online-status")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "online_users" in data
        assert isinstance(data["online_users"], list)
        assert "last_seen" in data
        assert isinstance(data["last_seen"], dict)
    
    @pytest.mark.asyncio
    async def test_get_online_status_not_participant(self, authenticated_client: AsyncClient, test_session):
        """Test getting online status when user is not a participant."""
        from tests.conftest import create_test_user, get_auth_headers
        
        # Create a third user who is not in the match
        third_user = await create_test_user(test_session, email="third@example.com")
        auth_headers = await get_auth_headers(third_user.id)
        authenticated_client.headers.update(auth_headers)
        
        response = await authenticated_client.get(f"/chat/{test_match.id}/online-status")
        
        assert_response_error(response, 403, "not a participant")
    
    @pytest.mark.asyncio
    async def test_report_message_success(self, authenticated_client: AsyncClient, test_match):
        """Test reporting a message."""
        # First send a message
        message_data = {
            "content": "Message to report",
            "message_type": "text"
        }
        send_response = await authenticated_client.post(f"/chat/{test_match.id}/send", json=message_data)
        message_id = send_response.json()["message"]["id"]
        
        # Then report it
        report_data = {
            "reason": "inappropriate_content",
            "description": "This message contains inappropriate content"
        }
        
        response = await authenticated_client.post(f"/chat/message/{message_id}/report", json=report_data)
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "report submitted" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_report_message_invalid_reason(self, authenticated_client: AsyncClient, test_match):
        """Test reporting a message with invalid reason."""
        # First send a message
        message_data = {
            "content": "Message to report",
            "message_type": "text"
        }
        send_response = await authenticated_client.post(f"/chat/{test_match.id}/send", json=message_data)
        message_id = send_response.json()["message"]["id"]
        
        # Then report it with invalid reason
        report_data = {
            "reason": "invalid_reason",
            "description": "Invalid reason"
        }
        
        response = await authenticated_client.post(f"/chat/message/{message_id}/report", json=report_data)
        
        assert_response_error(response, 422, "reason")
    
    @pytest.mark.asyncio
    async def test_report_message_nonexistent(self, authenticated_client: AsyncClient):
        """Test reporting a nonexistent message."""
        report_data = {
            "reason": "inappropriate_content",
            "description": "Inappropriate content"
        }
        
        response = await authenticated_client.post("/chat/message/99999/report", json=report_data)
        
        assert_response_error(response, 404, "message not found")
