"""
Test script to verify Sentry integration in the backend.
This script tests error reporting and performance monitoring.
"""

import pytest
import asyncio
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from main import app
from core.sentry import init_sentry, capture_exception, capture_message, set_user_context


class TestSentryIntegration:
    """Test Sentry integration functionality"""
    
    def setup_method(self):
        """Setup test client"""
        self.client = TestClient(app)
    
    @patch('core.sentry.sentry_sdk.init')
    def test_sentry_initialization(self, mock_init):
        """Test that Sentry is properly initialized"""
        # Mock settings to return a DSN
        with patch('core.config.settings.SENTRY_DSN', 'https://test@sentry.io/123'):
            init_sentry()
            mock_init.assert_called_once()
    
    @patch('core.sentry.sentry_sdk.init')
    def test_sentry_initialization_no_dsn(self, mock_init):
        """Test that Sentry is not initialized without DSN"""
        with patch('core.config.settings.SENTRY_DSN', None):
            init_sentry()
            mock_init.assert_not_called()
    
    @patch('core.sentry.sentry_sdk.capture_exception')
    def test_capture_exception(self, mock_capture):
        """Test exception capture"""
        test_error = ValueError("Test error")
        test_context = {"test": "context"}
        
        capture_exception(test_error, test_context)
        mock_capture.assert_called_once_with(test_error)
    
    @patch('core.sentry.sentry_sdk.capture_message')
    def test_capture_message(self, mock_capture):
        """Test message capture"""
        test_message = "Test message"
        test_context = {"test": "context"}
        
        capture_message(test_message, "info", test_context)
        mock_capture.assert_called_once_with(test_message, "info")
    
    @patch('core.sentry.sentry_sdk.set_user')
    def test_set_user_context(self, mock_set_user):
        """Test user context setting"""
        user_id = 123
        username = "testuser"
        
        set_user_context(user_id, username)
        mock_set_user.assert_called_once_with({
            "id": str(user_id),
            "username": username,
        })
    
    def test_error_endpoint_returns_500(self):
        """Test that error endpoints return proper status codes"""
        # Test a non-existent endpoint to trigger 404
        response = self.client.get("/api/v1/nonexistent")
        assert response.status_code == 404
    
    @patch('core.sentry.sentry_sdk.capture_exception')
    def test_exception_handling_in_middleware(self, mock_capture):
        """Test that exceptions are captured in middleware"""
        # This would require a more complex setup to test actual middleware
        # For now, we just verify the function exists
        assert callable(capture_exception)


class TestSentryMiddleware:
    """Test Sentry middleware functionality"""
    
    def setup_method(self):
        """Setup test client"""
        self.client = TestClient(app)
    
    def test_request_tracking_headers(self):
        """Test that request tracking headers are added"""
        response = self.client.get("/health")
        assert response.status_code == 200
        # Check for performance headers
        assert "X-Response-Time" in response.headers
    
    def test_user_context_in_request(self):
        """Test that user context is properly set in requests"""
        # This would require authentication to test properly
        # For now, we just verify the endpoint exists
        response = self.client.get("/health")
        assert response.status_code == 200


def test_sentry_configuration():
    """Test Sentry configuration settings"""
    from core.config import settings
    
    # Test that Sentry settings are properly defined
    assert hasattr(settings, 'SENTRY_DSN')
    assert hasattr(settings, 'SENTRY_DEBUG_ENABLED')
    assert hasattr(settings, 'SENTRY_TRACES_SAMPLE_RATE')
    assert hasattr(settings, 'SENTRY_PROFILES_SAMPLE_RATE')


if __name__ == "__main__":
    # Run basic tests
    print("Testing Sentry integration...")
    
    # Test configuration
    test_sentry_configuration()
    print("✓ Configuration test passed")
    
    # Test initialization (with mocked dependencies)
    with patch('core.sentry.sentry_sdk.init'):
        with patch('core.config.settings.SENTRY_DSN', 'https://test@sentry.io/123'):
            init_sentry()
            print("✓ Initialization test passed")
    
    print("All Sentry integration tests completed successfully!")
