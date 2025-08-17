import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock

from tests.conftest import assert_response_success, assert_response_error


class TestAuthEndpoints:
    """Test authentication endpoints."""
    
    @pytest.mark.asyncio
    async def test_user_registration_success(self, client: AsyncClient, test_user_data):
        """Test successful user registration."""
        response = await client.post("/auth/register", json=test_user_data)
        
        assert_response_success(response, 201)
        data = response.json()
        
        assert "id" in data
        assert data["email"] == test_user_data["email"]
        assert data["name"] == test_user_data["name"]
        assert "password" not in data  # Password should not be returned
    
    @pytest.mark.asyncio
    async def test_user_registration_invalid_email(self, client: AsyncClient, test_user_data):
        """Test user registration with invalid email."""
        test_user_data["email"] = "invalid-email"
        response = await client.post("/auth/register", json=test_user_data)
        
        assert_response_error(response, 422, "email")
    
    @pytest.mark.asyncio
    async def test_user_registration_weak_password(self, client: AsyncClient, test_user_data):
        """Test user registration with weak password."""
        test_user_data["password"] = "123"
        response = await client.post("/auth/register", json=test_user_data)
        
        assert_response_error(response, 422, "password")
    
    @pytest.mark.asyncio
    async def test_user_registration_duplicate_email(self, client: AsyncClient, test_user_data, test_user):
        """Test user registration with duplicate email."""
        response = await client.post("/auth/register", json=test_user_data)
        
        assert_response_error(response, 400, "email already registered")
    
    @pytest.mark.asyncio
    async def test_user_login_success(self, client: AsyncClient, test_user):
        """Test successful user login."""
        login_data = {
            "email": "test@example.com",
            "password": "testpassword123"
        }
        
        response = await client.post("/auth/login", data=login_data)
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["email"] == login_data["email"]
    
    @pytest.mark.asyncio
    async def test_user_login_invalid_credentials(self, client: AsyncClient):
        """Test user login with invalid credentials."""
        login_data = {
            "email": "test@example.com",
            "password": "wrongpassword"
        }
        
        response = await client.post("/auth/login", data=login_data)
        
        assert_response_error(response, 401, "invalid credentials")
    
    @pytest.mark.asyncio
    async def test_user_login_nonexistent_user(self, client: AsyncClient):
        """Test user login with nonexistent user."""
        login_data = {
            "email": "nonexistent@example.com",
            "password": "testpassword123"
        }
        
        response = await client.post("/auth/login", data=login_data)
        
        assert_response_error(response, 401, "invalid credentials")
    
    @pytest.mark.asyncio
    async def test_get_current_user_success(self, authenticated_client: AsyncClient, test_user):
        """Test getting current user with valid token."""
        response = await authenticated_client.get("/auth/me")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert data["id"] == test_user.id
        assert data["email"] == test_user.email
        assert data["name"] == test_user.name
    
    @pytest.mark.asyncio
    async def test_get_current_user_invalid_token(self, client: AsyncClient):
        """Test getting current user with invalid token."""
        client.headers["Authorization"] = "Bearer invalid_token"
        response = await client.get("/auth/me")
        
        assert_response_error(response, 401, "invalid token")
    
    @pytest.mark.asyncio
    async def test_get_current_user_no_token(self, client: AsyncClient):
        """Test getting current user without token."""
        response = await client.get("/auth/me")
        
        assert_response_error(response, 401, "not authenticated")
    
    @pytest.mark.asyncio
    async def test_refresh_token_success(self, authenticated_client: AsyncClient, test_user):
        """Test token refresh with valid token."""
        response = await authenticated_client.post("/auth/refresh")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "access_token" in data
        assert "token_type" in data
        assert data["token_type"] == "bearer"
    
    @pytest.mark.asyncio
    async def test_refresh_token_invalid_token(self, client: AsyncClient):
        """Test token refresh with invalid token."""
        client.headers["Authorization"] = "Bearer invalid_token"
        response = await client.post("/auth/refresh")
        
        assert_response_error(response, 401, "invalid token")
    
    @pytest.mark.asyncio
    async def test_logout_success(self, authenticated_client: AsyncClient):
        """Test successful logout."""
        response = await authenticated_client.post("/auth/logout")
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "logged out" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_logout_no_token(self, client: AsyncClient):
        """Test logout without token."""
        response = await client.post("/auth/logout")
        
        assert_response_error(response, 401, "not authenticated")
    
    @pytest.mark.asyncio
    async def test_change_password_success(self, authenticated_client: AsyncClient):
        """Test successful password change."""
        password_data = {
            "current_password": "testpassword123",
            "new_password": "newpassword123"
        }
        
        response = await authenticated_client.post("/auth/change-password", json=password_data)
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "password changed" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_change_password_wrong_current_password(self, authenticated_client: AsyncClient):
        """Test password change with wrong current password."""
        password_data = {
            "current_password": "wrongpassword",
            "new_password": "newpassword123"
        }
        
        response = await authenticated_client.post("/auth/change-password", json=password_data)
        
        assert_response_error(response, 400, "current password is incorrect")
    
    @pytest.mark.asyncio
    async def test_change_password_weak_new_password(self, authenticated_client: AsyncClient):
        """Test password change with weak new password."""
        password_data = {
            "current_password": "testpassword123",
            "new_password": "123"
        }
        
        response = await authenticated_client.post("/auth/change-password", json=password_data)
        
        assert_response_error(response, 422, "password")
    
    @pytest.mark.asyncio
    async def test_forgot_password_success(self, client: AsyncClient, test_user):
        """Test successful forgot password request."""
        with patch('services.users.UserService.send_password_reset_email') as mock_send:
            mock_send.return_value = True
            
            response = await client.post("/auth/forgot-password", json={"email": test_user.email})
            
            assert_response_success(response, 200)
            data = response.json()
            
            assert "message" in data
            assert "reset email sent" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_forgot_password_nonexistent_user(self, client: AsyncClient):
        """Test forgot password with nonexistent user."""
        response = await client.post("/auth/forgot-password", json={"email": "nonexistent@example.com"})
        
        assert_response_error(response, 404, "user not found")
    
    @pytest.mark.asyncio
    async def test_reset_password_success(self, client: AsyncClient, test_user):
        """Test successful password reset."""
        with patch('services.users.UserService.verify_reset_token') as mock_verify:
            mock_verify.return_value = test_user
            
            reset_data = {
                "token": "valid_reset_token",
                "new_password": "newpassword123"
            }
            
            response = await client.post("/auth/reset-password", json=reset_data)
            
            assert_response_success(response, 200)
            data = response.json()
            
            assert "message" in data
            assert "password reset" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_reset_password_invalid_token(self, client: AsyncClient):
        """Test password reset with invalid token."""
        with patch('services.users.UserService.verify_reset_token') as mock_verify:
            mock_verify.return_value = None
            
            reset_data = {
                "token": "invalid_token",
                "new_password": "newpassword123"
            }
            
            response = await client.post("/auth/reset-password", json=reset_data)
            
            assert_response_error(response, 400, "invalid or expired token")
    
    @pytest.mark.asyncio
    async def test_delete_account_success(self, authenticated_client: AsyncClient, test_user):
        """Test successful account deletion."""
        delete_data = {
            "password": "testpassword123"
        }
        
        response = await authenticated_client.delete("/auth/delete-account", json=delete_data)
        
        assert_response_success(response, 200)
        data = response.json()
        
        assert "message" in data
        assert "account deleted" in data["message"].lower()
    
    @pytest.mark.asyncio
    async def test_delete_account_wrong_password(self, authenticated_client: AsyncClient):
        """Test account deletion with wrong password."""
        delete_data = {
            "password": "wrongpassword"
        }
        
        response = await authenticated_client.delete("/auth/delete-account", json=delete_data)
        
        assert_response_error(response, 400, "password is incorrect")
    
    @pytest.mark.asyncio
    async def test_rate_limiting_on_login(self, client: AsyncClient):
        """Test rate limiting on login endpoint."""
        login_data = {
            "email": "test@example.com",
            "password": "wrongpassword"
        }
        
        # Make multiple failed login attempts
        for _ in range(6):  # Assuming rate limit is 5 per minute
            response = await client.post("/auth/login", data=login_data)
        
        # The 6th attempt should be rate limited
        assert_response_error(response, 429, "rate limit")
    
    @pytest.mark.asyncio
    async def test_rate_limiting_on_register(self, client: AsyncClient, test_user_data):
        """Test rate limiting on registration endpoint."""
        # Make multiple registration attempts
        for _ in range(6):  # Assuming rate limit is 5 per minute
            response = await client.post("/auth/register", json=test_user_data)
        
        # The 6th attempt should be rate limited
        assert_response_error(response, 429, "rate limit")
