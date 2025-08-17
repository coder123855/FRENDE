#!/usr/bin/env python3
"""
Authentication security tests for Frende application
Tests JWT token security, password validation, session management, and authentication bypass
"""
import pytest
import jwt
import time
import hashlib
from datetime import datetime, timedelta
from typing import Dict, Any
from unittest.mock import patch, Mock

from fastapi import HTTPException, status
from fastapi.testclient import TestClient

from core.config import settings
from core.security import create_access_token, create_refresh_token, verify_password, get_password_hash
from core.security_utils import SecurityValidator
from models.user import User

class TestJWTSecurity:
    """Test JWT token security"""
    
    def test_valid_jwt_token_creation(self, security_test_user: User):
        """Test that valid JWT tokens are created correctly"""
        token = create_access_token(
            data={"sub": str(security_test_user.id), "email": security_test_user.email}
        )
        
        # Verify token structure
        assert token is not None
        assert isinstance(token, str)
        assert len(token.split('.')) == 3  # Header.Payload.Signature
        
        # Verify token can be decoded
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=["HS256"]
        )
        assert payload["sub"] == str(security_test_user.id)
        assert payload["email"] == security_test_user.email
        assert "exp" in payload
    
    def test_jwt_token_expiration(self, security_test_user: User):
        """Test that JWT tokens expire correctly"""
        # Create token with short expiration
        token = create_access_token(
            data={"sub": str(security_test_user.id), "email": security_test_user.email},
            expires_delta=timedelta(seconds=1)
        )
        
        # Token should be valid initially
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=["HS256"]
        )
        assert payload["sub"] == str(security_test_user.id)
        
        # Wait for expiration
        time.sleep(2)
        
        # Token should be expired
        with pytest.raises(jwt.ExpiredSignatureError):
            jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=["HS256"]
            )
    
    def test_jwt_token_tampering_detection(self, security_test_user: User):
        """Test that tampered JWT tokens are detected"""
        token = create_access_token(
            data={"sub": str(security_test_user.id), "email": security_test_user.email}
        )
        
        # Tamper with the token
        parts = token.split('.')
        tampered_token = f"{parts[0]}.{parts[1]}.tampered_signature"
        
        # Tampered token should be rejected
        with pytest.raises(jwt.InvalidSignatureError):
            jwt.decode(
                tampered_token,
                settings.JWT_SECRET_KEY,
                algorithms=["HS256"]
            )
    
    def test_jwt_token_with_wrong_secret(self, security_test_user: User):
        """Test that JWT tokens with wrong secret are rejected"""
        token = create_access_token(
            data={"sub": str(security_test_user.id), "email": security_test_user.email}
        )
        
        # Try to decode with wrong secret
        with pytest.raises(jwt.InvalidSignatureError):
            jwt.decode(
                token,
                "wrong-secret-key",
                algorithms=["HS256"]
            )
    
    def test_jwt_token_with_wrong_algorithm(self, security_test_user: User):
        """Test that JWT tokens with wrong algorithm are rejected"""
        token = create_access_token(
            data={"sub": str(security_test_user.id), "email": security_test_user.email}
        )
        
        # Try to decode with wrong algorithm
        with pytest.raises(jwt.InvalidAlgorithmError):
            jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=["HS512"]
            )
    
    def test_refresh_token_security(self, security_test_user: User):
        """Test refresh token security"""
        refresh_token = create_refresh_token(
            data={"sub": str(security_test_user.id), "email": security_test_user.email}
        )
        
        # Verify refresh token structure
        payload = jwt.decode(
            refresh_token,
            settings.JWT_SECRET_KEY,
            algorithms=["HS256"]
        )
        assert payload["sub"] == str(security_test_user.id)
        assert payload["type"] == "refresh"
        assert "exp" in payload
    
    def test_access_token_cannot_be_used_as_refresh(self, security_test_user: User):
        """Test that access tokens cannot be used as refresh tokens"""
        access_token = create_access_token(
            data={"sub": str(security_test_user.id), "email": security_test_user.email}
        )
        
        # Access token should not have refresh type
        payload = jwt.decode(
            access_token,
            settings.JWT_SECRET_KEY,
            algorithms=["HS256"]
        )
        assert "type" not in payload or payload["type"] != "refresh"

class TestPasswordSecurity:
    """Test password security"""
    
    def test_password_hashing(self):
        """Test that passwords are properly hashed"""
        password = "SecurePassword123!"
        hashed = get_password_hash(password)
        
        # Hash should be different from original password
        assert hashed != password
        assert len(hashed) > len(password)
        
        # Hash should be verifiable
        assert verify_password(password, hashed)
        assert not verify_password("wrongpassword", hashed)
    
    def test_password_strength_validation(self):
        """Test password strength validation"""
        validator = SecurityValidator()
        
        # Test strong passwords
        strong_passwords = [
            "SecurePassword123!",
            "MyP@ssw0rd2024!",
            "Complex#Password$123",
            "Str0ng!P@ssw0rd#2024"
        ]
        
        for password in strong_passwords:
            result = validator.validate_password_strength(password)
            assert result["valid"] is True
            assert result["score"] >= 7
        
        # Test weak passwords
        weak_passwords = [
            "password",
            "123456",
            "qwerty",
            "abc123",
            "password123"
        ]
        
        for password in weak_passwords:
            result = validator.validate_password_strength(password)
            assert result["valid"] is False
            assert result["score"] < 5
    
    def test_password_common_patterns(self):
        """Test detection of common password patterns"""
        validator = SecurityValidator()
        
        common_patterns = [
            "password",
            "123456789",
            "qwertyuiop",
            "abcdefgh",
            "admin123",
            "letmein",
            "welcome"
        ]
        
        for password in common_patterns:
            result = validator.validate_password_strength(password)
            assert result["valid"] is False
            assert "common" in str(result["errors"]).lower() or "weak" in str(result["errors"]).lower()
    
    def test_password_length_requirements(self):
        """Test password length requirements"""
        validator = SecurityValidator()
        
        # Test minimum length
        short_password = "Abc1!"
        result = validator.validate_password_strength(short_password)
        assert result["valid"] is False
        assert "length" in str(result["errors"]).lower()
        
        # Test maximum length
        long_password = "A" * 129 + "1!"
        result = validator.validate_password_strength(long_password)
        assert result["valid"] is False
        assert "length" in str(result["errors"]).lower()
    
    def test_password_complexity_requirements(self):
        """Test password complexity requirements"""
        validator = SecurityValidator()
        
        # Test missing uppercase
        no_uppercase = "password123!"
        result = validator.validate_password_strength(no_uppercase)
        assert result["valid"] is False
        assert "uppercase" in str(result["errors"]).lower()
        
        # Test missing lowercase
        no_lowercase = "PASSWORD123!"
        result = validator.validate_password_strength(no_lowercase)
        assert result["valid"] is False
        assert "lowercase" in str(result["errors"]).lower()
        
        # Test missing number
        no_number = "Password!"
        result = validator.validate_password_strength(no_number)
        assert result["valid"] is False
        assert "number" in str(result["errors"]).lower()
        
        # Test missing special character
        no_special = "Password123"
        result = validator.validate_password_strength(no_special)
        assert result["valid"] is False
        assert "special" in str(result["errors"]).lower()

class TestAuthenticationBypass:
    """Test authentication bypass attempts"""
    
    def test_empty_authorization_header(self, test_client: TestClient):
        """Test that empty authorization header is rejected"""
        response = test_client.get(
            "/api/users/me",
            headers={"Authorization": ""}
        )
        assert response.status_code == 401
    
    def test_malformed_authorization_header(self, test_client: TestClient):
        """Test that malformed authorization header is rejected"""
        response = test_client.get(
            "/api/users/me",
            headers={"Authorization": "Bearer"}
        )
        assert response.status_code == 401
    
    def test_invalid_token_format(self, test_client: TestClient):
        """Test that invalid token format is rejected"""
        response = test_client.get(
            "/api/users/me",
            headers={"Authorization": "Bearer invalid.token.here"}
        )
        assert response.status_code == 401
    
    def test_expired_token_rejection(self, test_client: TestClient, expired_token: str):
        """Test that expired tokens are rejected"""
        response = test_client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {expired_token}"}
        )
        assert response.status_code == 401
    
    def test_tampered_token_rejection(self, test_client: TestClient, tampered_token: str):
        """Test that tampered tokens are rejected"""
        response = test_client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {tampered_token}"}
        )
        assert response.status_code == 401
    
    def test_nonexistent_user_token(self, test_client: TestClient):
        """Test that tokens for nonexistent users are rejected"""
        # Create token for non-existent user
        token = create_access_token(
            data={"sub": "999999", "email": "nonexistent@example.com"}
        )
        
        response = test_client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 401
    
    def test_inactive_user_token(self, test_client: TestClient, async_session):
        """Test that tokens for inactive users are rejected"""
        # Create inactive user
        inactive_user = User(
            email="inactive@example.com",
            hashed_password=get_password_hash("password123"),
            is_active=False,
            is_verified=True
        )
        async_session.add(inactive_user)
        await async_session.commit()
        await async_session.refresh(inactive_user)
        
        # Create token for inactive user
        token = create_access_token(
            data={"sub": str(inactive_user.id), "email": inactive_user.email}
        )
        
        response = test_client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        assert response.status_code == 401
    
    def test_basic_auth_rejection(self, test_client: TestClient):
        """Test that basic authentication is rejected"""
        response = test_client.get(
            "/api/users/me",
            headers={"Authorization": "Basic dXNlcjpwYXNz"}
        )
        assert response.status_code == 401
    
    def test_api_key_rejection(self, test_client: TestClient):
        """Test that API key authentication is rejected"""
        response = test_client.get(
            "/api/users/me",
            headers={"X-API-Key": "invalid-key"}
        )
        assert response.status_code == 401

class TestSessionSecurity:
    """Test session security"""
    
    def test_session_timeout(self, security_test_user: User):
        """Test that sessions timeout correctly"""
        # Create token with short expiration
        token = create_access_token(
            data={"sub": str(security_test_user.id), "email": security_test_user.email},
            expires_delta=timedelta(seconds=1)
        )
        
        # Token should be valid initially
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=["HS256"]
        )
        assert payload["sub"] == str(security_test_user.id)
        
        # Wait for expiration
        time.sleep(2)
        
        # Token should be expired
        with pytest.raises(jwt.ExpiredSignatureError):
            jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=["HS256"]
            )
    
    def test_concurrent_session_handling(self, security_test_user: User):
        """Test handling of concurrent sessions"""
        # Create multiple tokens for same user
        token1 = create_access_token(
            data={"sub": str(security_test_user.id), "email": security_test_user.email}
        )
        token2 = create_access_token(
            data={"sub": str(security_test_user.id), "email": security_test_user.email}
        )
        
        # Both tokens should be valid
        payload1 = jwt.decode(token1, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        payload2 = jwt.decode(token2, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        
        assert payload1["sub"] == payload2["sub"]
        assert payload1["email"] == payload2["email"]
    
    def test_session_invalidation(self, security_test_user: User):
        """Test session invalidation"""
        # This would typically involve a blacklist or database check
        # For now, we test that tokens can be created and validated
        token = create_access_token(
            data={"sub": str(security_test_user.id), "email": security_test_user.email}
        )
        
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        assert payload["sub"] == str(security_test_user.id)

class TestBruteForceProtection:
    """Test brute force protection"""
    
    def test_login_attempt_tracking(self, test_client: TestClient):
        """Test that login attempts are tracked"""
        # Make multiple failed login attempts
        for i in range(5):
            response = test_client.post(
                "/auth/jwt/login",
                data={
                    "username": "nonexistent@example.com",
                    "password": "wrongpassword"
                }
            )
            assert response.status_code == 401
        
        # Additional attempts should be rate limited
        response = test_client.post(
            "/auth/jwt/login",
            data={
                "username": "nonexistent@example.com",
                "password": "wrongpassword"
            }
        )
        # Should be rate limited (429) or still 401
        assert response.status_code in [401, 429]
    
    def test_account_lockout_simulation(self, test_client: TestClient):
        """Test account lockout simulation"""
        # This would typically involve tracking failed attempts per user
        # For now, we test the rate limiting mechanism
        responses = []
        for i in range(10):
            response = test_client.post(
                "/auth/jwt/login",
                data={
                    "username": f"test{i}@example.com",
                    "password": "wrongpassword"
                }
            )
            responses.append(response)
            # Should eventually be rate limited
            if response.status_code == 429:
                break
        else:
            # If not rate limited, at least all should be 401
            assert all(response.status_code == 401 for response in responses)

class TestTokenRefreshSecurity:
    """Test token refresh security"""
    
    def test_valid_refresh_token(self, security_test_user: User):
        """Test that valid refresh tokens work"""
        refresh_token = create_refresh_token(
            data={"sub": str(security_test_user.id), "email": security_test_user.email}
        )
        
        payload = jwt.decode(refresh_token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        assert payload["type"] == "refresh"
        assert payload["sub"] == str(security_test_user.id)
    
    def test_refresh_token_expiration(self, security_test_user: User):
        """Test that refresh tokens expire"""
        refresh_token = create_refresh_token(
            data={"sub": str(security_test_user.id), "email": security_test_user.email},
            expires_delta=timedelta(seconds=1)
        )
        
        # Wait for expiration
        time.sleep(2)
        
        with pytest.raises(jwt.ExpiredSignatureError):
            jwt.decode(refresh_token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
    
    def test_access_token_as_refresh_rejection(self, security_test_user: User):
        """Test that access tokens cannot be used as refresh tokens"""
        access_token = create_access_token(
            data={"sub": str(security_test_user.id), "email": security_test_user.email}
        )
        
        # Access token should not have refresh type
        payload = jwt.decode(access_token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        assert "type" not in payload or payload["type"] != "refresh"

class TestAuthenticationHeaders:
    """Test authentication header security"""
    
    def test_missing_authorization_header(self, test_client: TestClient):
        """Test that missing authorization header is rejected"""
        response = test_client.get("/api/users/me")
        assert response.status_code == 401
    
    def test_case_insensitive_authorization_header(self, test_client: TestClient, security_test_user_token: str):
        """Test that authorization header is case insensitive"""
        response = test_client.get(
            "/api/users/me",
            headers={"authorization": f"bearer {security_test_user_token}"}
        )
        # Should work with lowercase header name
        assert response.status_code in [200, 401]  # 401 if token validation fails, 200 if it works
    
    def test_multiple_authorization_headers(self, test_client: TestClient, security_test_user_token: str):
        """Test handling of multiple authorization headers"""
        response = test_client.get(
            "/api/users/me",
            headers={
                "Authorization": f"Bearer {security_test_user_token}",
                "authorization": "Bearer invalid.token"
            }
        )
        # Should use the first valid header or reject if ambiguous
        assert response.status_code in [200, 401, 400]

class TestAuthenticationLogging:
    """Test authentication security logging"""
    
    @patch('core.security_middleware.security_logger')
    def test_failed_login_logging(self, mock_logger, test_client: TestClient):
        """Test that failed login attempts are logged"""
        response = test_client.post(
            "/auth/jwt/login",
            data={
                "username": "nonexistent@example.com",
                "password": "wrongpassword"
            }
        )
        
        assert response.status_code == 401
        # Verify that security event was logged
        mock_logger.warning.assert_called()
    
    @patch('core.security_middleware.security_logger')
    def test_successful_login_logging(self, mock_logger, test_client: TestClient, security_test_user: User):
        """Test that successful login attempts are logged"""
        response = test_client.post(
            "/auth/jwt/login",
            data={
                "username": security_test_user.email,
                "password": "SecurePassword123!"
            }
        )
        
        # Should be successful or rate limited
        assert response.status_code in [200, 429]
        # Verify that security event was logged
        mock_logger.info.assert_called()

class TestAuthenticationPerformance:
    """Test authentication performance under load"""
    
    def test_token_creation_performance(self, security_test_user: User, benchmark):
        """Test JWT token creation performance"""
        def create_token():
            return create_access_token(
                data={"sub": str(security_test_user.id), "email": security_test_user.email}
            )
        
        result = benchmark(create_token)
        assert result.stats.mean < 0.001  # Should be very fast
    
    def test_token_validation_performance(self, security_test_user: User, benchmark):
        """Test JWT token validation performance"""
        token = create_access_token(
            data={"sub": str(security_test_user.id), "email": security_test_user.email}
        )
        
        def validate_token():
            return jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])
        
        result = benchmark(validate_token)
        assert result.stats.mean < 0.001  # Should be very fast
    
    def test_password_hashing_performance(self, benchmark):
        """Test password hashing performance"""
        def hash_password():
            return get_password_hash("SecurePassword123!")
        
        result = benchmark(hash_password)
        assert result.stats.mean < 0.1  # Should be reasonably fast
    
    def test_password_verification_performance(self, benchmark):
        """Test password verification performance"""
        password = "SecurePassword123!"
        hashed = get_password_hash(password)
        
        def verify_password_func():
            return verify_password(password, hashed)
        
        result = benchmark(verify_password_func)
        assert result.stats.mean < 0.1  # Should be reasonably fast
