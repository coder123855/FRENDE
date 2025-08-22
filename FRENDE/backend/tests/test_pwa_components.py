"""
Tests for PWA-related backend components
"""

import pytest
import asyncio
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from core.push_notifications import push_notification_service
from models.push_subscription import PushSubscription
from models.user import User
from schemas.notification import PushSubscriptionRequest


class TestPushNotificationService:
    """Test push notification service functionality"""
    
    @pytest.fixture
    def mock_session(self):
        """Mock database session"""
        session = AsyncMock(spec=AsyncSession)
        return session
    
    @pytest.fixture
    def sample_subscription_data(self):
        """Sample push subscription data"""
        return {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test",
            "keys": {
                "auth": "test_auth_key",
                "p256dh": "test_p256dh_key"
            }
        }
    
    @pytest.fixture
    def sample_user(self):
        """Sample user for testing"""
        user = User(
            id=1,
            email="test@example.com",
            username="testuser",
            is_active=True
        )
        return user
    
    async def test_save_subscription_success(self, mock_session, sample_subscription_data, sample_user):
        """Test successful subscription saving"""
        with patch('core.push_notifications.PushNotificationService._get_existing_subscription') as mock_get:
            mock_get.return_value = None
            
            with patch.object(mock_session, 'add') as mock_add:
                with patch.object(mock_session, 'commit') as mock_commit:
                    result = await push_notification_service.save_subscription(
                        1, sample_subscription_data, mock_session
                    )
                    
                    assert result is True
                    mock_add.assert_called_once()
                    mock_commit.assert_called_once()
    
    async def test_save_subscription_update_existing(self, mock_session, sample_subscription_data):
        """Test updating existing subscription"""
        existing_subscription = PushSubscription(
            id=1,
            user_id=1,
            endpoint="https://fcm.googleapis.com/fcm/send/test",
            auth="old_auth",
            p256dh="old_p256dh"
        )
        
        with patch('core.push_notifications.PushNotificationService._get_existing_subscription') as mock_get:
            mock_get.return_value = existing_subscription
            
            with patch.object(mock_session, 'commit') as mock_commit:
                result = await push_notification_service.save_subscription(
                    1, sample_subscription_data, mock_session
                )
                
                assert result is True
                assert existing_subscription.auth == "test_auth_key"
                assert existing_subscription.p256dh == "test_p256dh_key"
                mock_commit.assert_called_once()
    
    async def test_remove_subscription_success(self, mock_session):
        """Test successful subscription removal"""
        subscription = PushSubscription(
            id=1,
            user_id=1,
            endpoint="https://fcm.googleapis.com/fcm/send/test",
            auth="test_auth",
            p256dh="test_p256dh"
        )
        
        with patch('core.push_notifications.PushNotificationService._get_existing_subscription') as mock_get:
            mock_get.return_value = subscription
            
            with patch.object(mock_session, 'delete') as mock_delete:
                with patch.object(mock_session, 'commit') as mock_commit:
                    result = await push_notification_service.remove_subscription(
                        1, "https://fcm.googleapis.com/fcm/send/test", mock_session
                    )
                    
                    assert result is True
                    mock_delete.assert_called_once_with(subscription)
                    mock_commit.assert_called_once()
    
    async def test_remove_subscription_not_found(self, mock_session):
        """Test subscription removal when not found"""
        with patch('core.push_notifications.PushNotificationService._get_existing_subscription') as mock_get:
            mock_get.return_value = None
            
            result = await push_notification_service.remove_subscription(
                1, "https://fcm.googleapis.com/fcm/send/test", mock_session
            )
            
            assert result is False
    
    async def test_get_user_subscriptions(self, mock_session):
        """Test getting user subscriptions"""
        subscriptions = [
            PushSubscription(
                id=1,
                user_id=1,
                endpoint="https://fcm.googleapis.com/fcm/send/test1",
                auth="auth1",
                p256dh="p256dh1"
            ),
            PushSubscription(
                id=2,
                user_id=1,
                endpoint="https://fcm.googleapis.com/fcm/send/test2",
                auth="auth2",
                p256dh="p256dh2"
            )
        ]
        
        with patch('core.push_notifications.PushNotificationService._get_user_subscriptions') as mock_get:
            mock_get.return_value = subscriptions
            
            result = await push_notification_service.get_user_subscriptions(1, mock_session)
            
            assert len(result) == 2
            assert result[0].endpoint == "https://fcm.googleapis.com/fcm/send/test1"
            assert result[1].endpoint == "https://fcm.googleapis.com/fcm/send/test2"


class TestPushNotificationAPI:
    """Test push notification API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Test client"""
        from main import app
        return TestClient(app)
    
    @pytest.fixture
    def auth_headers(self):
        """Authentication headers"""
        return {"Authorization": "Bearer test_token"}
    
    def test_subscribe_endpoint_requires_auth(self, client):
        """Test that subscribe endpoint requires authentication"""
        response = client.post("/api/v1/notifications/subscribe", json={})
        assert response.status_code == 401
    
    def test_unsubscribe_endpoint_requires_auth(self, client):
        """Test that unsubscribe endpoint requires authentication"""
        response = client.delete("/api/v1/notifications/unsubscribe?endpoint=test")
        assert response.status_code == 401
    
    def test_subscriptions_endpoint_requires_auth(self, client):
        """Test that subscriptions endpoint requires authentication"""
        response = client.get("/api/v1/notifications/subscriptions")
        assert response.status_code == 401


class TestVAPIDConfiguration:
    """Test VAPID key configuration"""
    
    def test_vapid_keys_configured(self):
        """Test that VAPID keys are properly configured"""
        from core.config import settings
        
        # Check that VAPID settings exist
        assert hasattr(settings, 'VAPID_PRIVATE_KEY')
        assert hasattr(settings, 'VAPID_PUBLIC_KEY')
        assert hasattr(settings, 'VAPID_EMAIL')
        assert hasattr(settings, 'VAPID_AUDIENCE')
    
    def test_vapid_public_key_format(self):
        """Test VAPID public key format"""
        from core.push_notifications import push_notification_service
        
        # The public key should be a base64-encoded string
        public_key = push_notification_service.get_vapid_public_key()
        assert isinstance(public_key, str)
        assert len(public_key) > 0


class TestNotificationTemplates:
    """Test notification templates"""
    
    def test_notification_templates_exist(self):
        """Test that all required notification templates exist"""
        from core.push_notifications import push_notification_service
        
        required_templates = [
            'new_match',
            'new_message',
            'task_assigned',
            'task_completed',
            'task_expiring',
            'match_request',
            'system_announcement'
        ]
        
        for template_name in required_templates:
            assert template_name in push_notification_service.notification_templates
    
    def test_template_structure(self):
        """Test that templates have required fields"""
        from core.push_notifications import push_notification_service
        
        required_fields = ['title', 'body', 'icon', 'badge', 'tag', 'data']
        
        for template_name, template in push_notification_service.notification_templates.items():
            for field in required_fields:
                assert field in template, f"Template {template_name} missing field {field}"
                assert template[field] is not None, f"Template {template_name} has None value for {field}"


if __name__ == "__main__":
    pytest.main([__file__])
