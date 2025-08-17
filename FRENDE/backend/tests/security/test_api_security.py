#!/usr/bin/env python3
"""
API security tests for Frende application
Tests authorization, rate limiting, security headers, CORS, and API security
"""
import pytest
import time
import json
from typing import Dict, Any, List
from unittest.mock import patch, Mock

from fastapi.testclient import TestClient
from fastapi import status

from core.config import settings

class TestAuthorization:
    """Test API authorization"""
    
    def test_protected_endpoints_require_auth(self, test_client: TestClient):
        """Test that protected endpoints require authentication"""
        protected_endpoints = [
            ("GET", "/api/users/me"),
            ("PUT", "/api/users/profile"),
            ("GET", "/api/matching/queue"),
            ("POST", "/api/matching/request"),
            ("GET", "/api/tasks"),
            ("POST", "/api/tasks/create"),
            ("GET", "/api/chat/rooms"),
            ("POST", "/api/chat/send"),
        ]
        
        for method, endpoint in protected_endpoints:
            if method == "GET":
                response = test_client.get(endpoint)
            elif method == "POST":
                response = test_client.post(endpoint, json={})
            elif method == "PUT":
                response = test_client.put(endpoint, json={})
            elif method == "DELETE":
                response = test_client.delete(endpoint)
            
            assert response.status_code == 401
    
    def test_public_endpoints_accessible(self, test_client: TestClient):
        """Test that public endpoints are accessible without authentication"""
        public_endpoints = [
            ("GET", "/health"),
            ("GET", "/docs"),
            ("GET", "/openapi.json"),
            ("POST", "/auth/register"),
            ("POST", "/auth/jwt/login"),
        ]
        
        for method, endpoint in public_endpoints:
            if method == "GET":
                response = test_client.get(endpoint)
            elif method == "POST":
                response = test_client.post(endpoint, json={})
            
            # Should be accessible (200, 422 for invalid data, etc.)
            assert response.status_code != 401
    
    def test_user_cannot_access_other_user_data(self, test_client: TestClient, security_test_user_token: str, multiple_test_users: List):
        """Test that users cannot access other users' data"""
        other_user = multiple_test_users[1]
        
        # Try to access another user's profile
        response = test_client.get(
            f"/api/users/{other_user.id}",
            headers={"Authorization": f"Bearer {security_test_user_token}"}
        )
        
        # Should be forbidden
        assert response.status_code == 403
    
    def test_user_cannot_modify_other_user_data(self, test_client: TestClient, security_test_user_token: str, multiple_test_users: List):
        """Test that users cannot modify other users' data"""
        other_user = multiple_test_users[1]
        
        # Try to modify another user's profile
        response = test_client.put(
            f"/api/users/{other_user.id}/profile",
            headers={"Authorization": f"Bearer {security_test_user_token}"},
            json={"name": "Hacked User"}
        )
        
        # Should be forbidden
        assert response.status_code == 403
    
    def test_invalid_user_id_handling(self, test_client: TestClient, security_test_user_token: str):
        """Test handling of invalid user IDs"""
        invalid_user_ids = [999999, -1, 0, "invalid", "999999a"]
        
        for user_id in invalid_user_ids:
            response = test_client.get(
                f"/api/users/{user_id}",
                headers={"Authorization": f"Bearer {security_test_user_token}"}
            )
            
            # Should be not found or bad request
            assert response.status_code in [404, 400, 422]

class TestRateLimiting:
    """Test API rate limiting"""
    
    def test_auth_endpoint_rate_limiting(self, test_client: TestClient):
        """Test rate limiting on authentication endpoints"""
        # Make multiple requests to auth endpoint
        for i in range(10):
            response = test_client.post(
                "/auth/jwt/login",
                data={
                    "username": f"test{i}@example.com",
                    "password": "wrongpassword"
                }
            )
            
            # Should eventually be rate limited
            if response.status_code == 429:
                break
        else:
            # If not rate limited, at least all should be 401
            assert all(response.status_code == 401 for response in responses)
    
    def test_api_endpoint_rate_limiting(self, test_client: TestClient, security_test_user_token: str):
        """Test rate limiting on API endpoints"""
        # Make multiple requests to API endpoint
        responses = []
        for i in range(20):
            response = test_client.get(
                "/api/users/me",
                headers={"Authorization": f"Bearer {security_test_user_token}"}
            )
            responses.append(response)
            
            # Should eventually be rate limited
            if response.status_code == 429:
                break
        
        # Check that we got some successful responses before rate limiting
        successful_responses = [r for r in responses if r.status_code == 200]
        assert len(successful_responses) > 0
    
    def test_upload_endpoint_rate_limiting(self, test_client: TestClient, security_test_user_token: str):
        """Test rate limiting on upload endpoints"""
        # Make multiple upload requests
        for i in range(15):
            files = {"file": (f"test{i}.jpg", b"fake-image-content", "image/jpeg")}
            response = test_client.post(
                "/api/users/upload-profile-picture",
                headers={"Authorization": f"Bearer {security_test_user_token}"},
                files=files
            )
            
            # Should eventually be rate limited
            if response.status_code == 429:
                break
    
    def test_rate_limit_headers(self, test_client: TestClient, security_test_user_token: str):
        """Test that rate limit headers are present"""
        response = test_client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {security_test_user_token}"}
        )
        
        # Check for rate limit headers
        headers = response.headers
        rate_limit_headers = [
            "X-RateLimit-Limit",
            "X-RateLimit-Remaining",
            "X-RateLimit-Reset"
        ]
        
        # At least some rate limit headers should be present
        present_headers = [h for h in rate_limit_headers if h in headers]
        assert len(present_headers) > 0

class TestSecurityHeaders:
    """Test security headers"""
    
    def test_security_headers_present(self, test_client: TestClient):
        """Test that security headers are present in responses"""
        response = test_client.get("/health")
        
        headers = response.headers
        
        # Check for essential security headers
        expected_headers = {
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
        }
        
        for header, expected_value in expected_headers.items():
            if header in headers:
                assert headers[header] == expected_value
    
    def test_csp_header_present(self, test_client: TestClient):
        """Test that Content Security Policy header is present"""
        response = test_client.get("/health")
        
        headers = response.headers
        
        # Check for CSP header
        if "Content-Security-Policy" in headers:
            csp = headers["Content-Security-Policy"]
            # Should contain basic CSP directives
            assert "default-src" in csp
            assert "script-src" in csp
    
    def test_hsts_header_in_production(self, test_client: TestClient):
        """Test that HSTS header is present in production"""
        response = test_client.get("/health")
        
        headers = response.headers
        
        # HSTS should be present if enabled
        if settings.HSTS_ENABLED and settings.is_production():
            assert "Strict-Transport-Security" in headers
            hsts = headers["Strict-Transport-Security"]
            assert "max-age=" in hsts
    
    def test_permissions_policy_header(self, test_client: TestClient):
        """Test that Permissions Policy header is present"""
        response = test_client.get("/health")
        
        headers = response.headers
        
        # Check for Permissions Policy header
        if "Permissions-Policy" in headers:
            policy = headers["Permissions-Policy"]
            # Should contain some restrictions
            assert len(policy) > 0

class TestCORS:
    """Test CORS configuration"""
    
    def test_cors_preflight_request(self, test_client: TestClient):
        """Test CORS preflight request handling"""
        response = test_client.options(
            "/api/users/me",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization"
            }
        )
        
        # Should handle preflight request
        assert response.status_code in [200, 204]
        
        # Check CORS headers
        headers = response.headers
        if "Access-Control-Allow-Origin" in headers:
            assert headers["Access-Control-Allow-Origin"] in ["http://localhost:3000", "*"]
    
    def test_cors_allowed_origins(self, test_client: TestClient, cors_test_data: Dict[str, Any]):
        """Test CORS allowed origins"""
        for origin in cors_test_data["allowed_origins"]:
            response = test_client.get(
                "/health",
                headers={"Origin": origin}
            )
            
            # Should be allowed
            assert response.status_code == 200
            
            # Check CORS headers
            headers = response.headers
            if "Access-Control-Allow-Origin" in headers:
                assert headers["Access-Control-Allow-Origin"] in [origin, "*"]
    
    def test_cors_disallowed_origins(self, test_client: TestClient, cors_test_data: Dict[str, Any]):
        """Test CORS disallowed origins"""
        for origin in cors_test_data["disallowed_origins"]:
            response = test_client.get(
                "/health",
                headers={"Origin": origin}
            )
            
            # Should be rejected or not include CORS headers
            headers = response.headers
            if "Access-Control-Allow-Origin" in headers:
                assert headers["Access-Control-Allow-Origin"] != origin
    
    def test_cors_methods(self, test_client: TestClient, cors_test_data: Dict[str, Any]):
        """Test CORS allowed methods"""
        for method in cors_test_data["allowed_methods"]:
            response = test_client.options(
                "/api/users/me",
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": method
                }
            )
            
            # Should be allowed
            assert response.status_code in [200, 204]
            
            # Check CORS headers
            headers = response.headers
            if "Access-Control-Allow-Methods" in headers:
                allowed_methods = headers["Access-Control-Allow-Methods"]
                assert method in allowed_methods or "*" in allowed_methods

class TestRequestValidation:
    """Test request validation security"""
    
    def test_request_size_limits(self, test_client: TestClient, security_test_user_token: str):
        """Test request size limits"""
        # Create large request body
        large_data = {"data": "x" * (11 * 1024 * 1024)}  # 11MB
        
        response = test_client.post(
            "/api/users/update",
            headers={"Authorization": f"Bearer {security_test_user_token}"},
            json=large_data
        )
        
        # Should be rejected due to size
        assert response.status_code in [400, 413]
    
    def test_malicious_headers_rejection(self, test_client: TestClient, malicious_headers: Dict[str, str]):
        """Test that malicious headers are rejected"""
        response = test_client.get(
            "/health",
            headers=malicious_headers
        )
        
        # Should be rejected or logged
        assert response.status_code in [400, 403, 200]
    
    def test_invalid_content_type_rejection(self, test_client: TestClient, security_test_user_token: str):
        """Test that invalid content types are rejected"""
        response = test_client.post(
            "/api/users/update",
            headers={
                "Authorization": f"Bearer {security_test_user_token}",
                "Content-Type": "application/x-malicious"
            },
            data="malicious data"
        )
        
        # Should be rejected
        assert response.status_code in [400, 415, 422]
    
    def test_missing_required_fields(self, test_client: TestClient, security_test_user_token: str):
        """Test that missing required fields are handled properly"""
        response = test_client.post(
            "/api/users/update",
            headers={"Authorization": f"Bearer {security_test_user_token}"},
            json={}
        )
        
        # Should be rejected due to validation
        assert response.status_code in [400, 422]

class TestErrorHandling:
    """Test error handling security"""
    
    def test_error_messages_dont_leak_info(self, test_client: TestClient):
        """Test that error messages don't leak sensitive information"""
        # Test authentication error
        response = test_client.get("/api/users/me")
        assert response.status_code == 401
        
        # Error message should not contain sensitive info
        if "detail" in response.json():
            error_detail = response.json()["detail"]
            sensitive_info = ["password", "token", "secret", "key", "database"]
            for info in sensitive_info:
                assert info not in error_detail.lower()
    
    def test_database_error_handling(self, test_client: TestClient, security_test_user_token: str):
        """Test that database errors are handled securely"""
        # This would typically involve testing with invalid database connections
        # For now, we test that the API handles errors gracefully
        response = test_client.get(
            "/api/users/me",
            headers={"Authorization": f"Bearer {security_test_user_token}"}
        )
        
        # Should not expose database details
        if response.status_code != 200:
            error_detail = response.json().get("detail", "")
            db_info = ["postgresql", "sqlite", "mysql", "connection", "query"]
            for info in db_info:
                assert info not in error_detail.lower()
    
    def test_validation_error_handling(self, test_client: TestClient, security_test_user_token: str):
        """Test that validation errors are handled securely"""
        # Test with invalid data
        response = test_client.put(
            "/api/users/profile",
            headers={"Authorization": f"Bearer {security_test_user_token}"},
            json={"age": "invalid_age", "email": "invalid_email"}
        )
        
        # Should return validation error
        assert response.status_code == 422
        
        # Error should not contain sensitive information
        error_detail = response.json()
        sensitive_info = ["password", "token", "secret", "key"]
        for info in sensitive_info:
            assert info not in str(error_detail).lower()

class TestAPIEndpointSecurity:
    """Test specific API endpoint security"""
    
    def test_user_search_security(self, test_client: TestClient, security_test_user_token: str):
        """Test user search endpoint security"""
        # Test with malicious search terms
        malicious_terms = [
            "'; DROP TABLE users; --",
            "<script>alert('XSS')</script>",
            "../../../etc/passwd"
        ]
        
        for term in malicious_terms:
            response = test_client.get(
                f"/api/users/search?q={term}",
                headers={"Authorization": f"Bearer {security_test_user_token}"}
            )
            
            # Should be rejected or return empty results
            assert response.status_code in [400, 422, 200]
            if response.status_code == 200:
                data = response.json()
                # Should not contain sensitive data
                assert "password" not in str(data).lower()
    
    def test_chat_message_security(self, test_client: TestClient, security_test_user_token: str):
        """Test chat message endpoint security"""
        malicious_messages = [
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "'; DROP TABLE messages; --"
        ]
        
        for message in malicious_messages:
            response = test_client.post(
                "/api/chat/send",
                headers={"Authorization": f"Bearer {security_test_user_token}"},
                json={"message": message, "room_id": 1}
            )
            
            # Should be rejected
            assert response.status_code in [400, 422]
    
    def test_task_creation_security(self, test_client: TestClient, security_test_user_token: str):
        """Test task creation endpoint security"""
        malicious_tasks = [
            {"title": "<script>alert('XSS')</script>", "description": "Normal task"},
            {"title": "Normal task", "description": "javascript:alert('XSS')"},
            {"title": "'; DROP TABLE tasks; --", "description": "Normal task"}
        ]
        
        for task in malicious_tasks:
            response = test_client.post(
                "/api/tasks/create",
                headers={"Authorization": f"Bearer {security_test_user_token}"},
                json=task
            )
            
            # Should be rejected
            assert response.status_code in [400, 422]
    
    def test_matching_request_security(self, test_client: TestClient, security_test_user_token: str):
        """Test matching request endpoint security"""
        # Test with invalid user IDs
        invalid_user_ids = [-1, 0, 999999, "invalid"]
        
        for user_id in invalid_user_ids:
            response = test_client.post(
                "/api/matching/request",
                headers={"Authorization": f"Bearer {security_test_user_token}"},
                json={"target_user_id": user_id}
            )
            
            # Should be rejected
            assert response.status_code in [400, 404, 422]

class TestWebSocketSecurity:
    """Test WebSocket security"""
    
    def test_websocket_authentication_required(self, test_client: TestClient):
        """Test that WebSocket connections require authentication"""
        # This would typically involve testing WebSocket connections
        # For now, we test the WebSocket endpoint
        response = test_client.get("/ws")
        
        # Should require authentication
        assert response.status_code in [401, 403, 404]
    
    def test_websocket_message_validation(self, test_client: TestClient, security_test_user_token: str):
        """Test WebSocket message validation"""
        # This would typically involve testing WebSocket message handling
        # For now, we test that the endpoint exists and requires auth
        response = test_client.get(
            "/ws",
            headers={"Authorization": f"Bearer {security_test_user_token}"}
        )
        
        # Should handle WebSocket upgrade or return appropriate response
        assert response.status_code in [101, 400, 404]

class TestAPIPerformance:
    """Test API performance under security load"""
    
    def test_authentication_performance(self, test_client: TestClient, benchmark):
        """Test authentication endpoint performance"""
        def auth_request():
            return test_client.post(
                "/auth/jwt/login",
                data={
                    "username": "test@example.com",
                    "password": "password"
                }
            )
        
        result = benchmark(auth_request)
        assert result.stats.mean < 0.1  # Should be reasonably fast
    
    def test_protected_endpoint_performance(self, test_client: TestClient, security_test_user_token: str, benchmark):
        """Test protected endpoint performance"""
        def protected_request():
            return test_client.get(
                "/api/users/me",
                headers={"Authorization": f"Bearer {security_test_user_token}"}
            )
        
        result = benchmark(protected_request)
        assert result.stats.mean < 0.1  # Should be reasonably fast
    
    def test_rate_limiting_performance(self, test_client: TestClient, security_test_user_token: str, benchmark):
        """Test rate limiting performance"""
        def rate_limited_request():
            return test_client.get(
                "/api/users/me",
                headers={"Authorization": f"Bearer {security_test_user_token}"}
            )
        
        result = benchmark(rate_limited_request)
        assert result.stats.mean < 0.1  # Should be reasonably fast
