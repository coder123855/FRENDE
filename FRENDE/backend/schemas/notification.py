"""
Push Notification Schemas
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


class PushSubscriptionRequest(BaseModel):
    """Request schema for push notification subscription"""
    endpoint: str = Field(..., description="Push subscription endpoint")
    keys: Dict[str, str] = Field(..., description="Encryption keys for push subscription")
    
    class Config:
        json_schema_extra = {
            "example": {
                "endpoint": "https://fcm.googleapis.com/fcm/send/...",
                "keys": {
                    "auth": "auth_key_here",
                    "p256dh": "p256dh_key_here"
                }
            }
        }


class PushSubscriptionResponse(BaseModel):
    """Response schema for push notification subscription"""
    id: int = Field(..., description="Subscription ID")
    endpoint: str = Field(..., description="Push subscription endpoint")
    created_at: Optional[str] = Field(None, description="Subscription creation timestamp")
    updated_at: Optional[str] = Field(None, description="Subscription update timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "endpoint": "https://fcm.googleapis.com/fcm/send/...",
                "created_at": "2024-01-01T12:00:00Z",
                "updated_at": "2024-01-01T12:00:00Z"
            }
        }


class NotificationSendRequest(BaseModel):
    """Request schema for sending push notifications"""
    user_id: int = Field(..., description="Target user ID")
    notification_type: str = Field(..., description="Type of notification to send")
    custom_data: Optional[Dict[str, Any]] = Field(None, description="Custom notification data")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_id": 123,
                "notification_type": "new_match",
                "custom_data": {
                    "match_id": 456,
                    "match_name": "John Doe"
                }
            }
        }


class NotificationStatsResponse(BaseModel):
    """Response schema for notification statistics"""
    total_subscriptions: int = Field(..., description="Total number of subscriptions")
    recent_subscriptions: int = Field(..., description="Subscriptions created in last 7 days")
    unique_users: int = Field(..., description="Number of unique users with subscriptions")
    timestamp: str = Field(..., description="Statistics timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "total_subscriptions": 1500,
                "recent_subscriptions": 45,
                "unique_users": 1200,
                "timestamp": "2024-01-01T12:00:00Z"
            }
        }


class NotificationTemplate(BaseModel):
    """Schema for notification templates"""
    title: str = Field(..., description="Notification title")
    body: str = Field(..., description="Notification body")
    icon: str = Field(..., description="Notification icon URL")
    badge: str = Field(..., description="Notification badge URL")
    tag: str = Field(..., description="Notification tag for grouping")
    data: Dict[str, Any] = Field(..., description="Notification data payload")
    actions: List[Dict[str, str]] = Field(default=[], description="Notification actions")
    requireInteraction: bool = Field(default=False, description="Require user interaction")
    silent: bool = Field(default=False, description="Silent notification")
    
    class Config:
        json_schema_extra = {
            "example": {
                "title": "New Match! 🎉",
                "body": "You have a new potential friend! Check them out.",
                "icon": "/assets/icon-192x192.png",
                "badge": "/assets/icon-72x72.png",
                "tag": "new-match",
                "data": {
                    "type": "new_match",
                    "url": "/matching"
                },
                "actions": [
                    {
                        "action": "view",
                        "title": "View Match"
                    },
                    {
                        "action": "dismiss",
                        "title": "Later"
                    }
                ],
                "requireInteraction": False,
                "silent": False
            }
        }


class BulkNotificationRequest(BaseModel):
    """Request schema for bulk notification sending"""
    user_ids: List[int] = Field(..., description="List of target user IDs")
    notification_type: str = Field(..., description="Type of notification to send")
    custom_data: Optional[Dict[str, Any]] = Field(None, description="Custom notification data")
    
    class Config:
        json_schema_extra = {
            "example": {
                "user_ids": [123, 456, 789],
                "notification_type": "system_announcement",
                "custom_data": {
                    "announcement_id": 1,
                    "title": "App Update",
                    "body": "New features available!"
                }
            }
        }


class NotificationResult(BaseModel):
    """Schema for notification sending results"""
    success: bool = Field(..., description="Whether notification was sent successfully")
    user_id: int = Field(..., description="Target user ID")
    error: Optional[str] = Field(None, description="Error message if failed")
    timestamp: str = Field(..., description="Result timestamp")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "user_id": 123,
                "error": None,
                "timestamp": "2024-01-01T12:00:00Z"
            }
        }


class BulkNotificationResponse(BaseModel):
    """Response schema for bulk notification sending"""
    success: bool = Field(..., description="Overall success status")
    message: str = Field(..., description="Response message")
    results: Dict[str, int] = Field(..., description="Bulk operation results")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Bulk notification completed",
                "results": {
                    "total_users": 100,
                    "successful": 95,
                    "failed": 5
                }
            }
        }


class VapidKeyResponse(BaseModel):
    """Response schema for VAPID public key"""
    public_key: str = Field(..., description="VAPID public key for client subscription")
    
    class Config:
        json_schema_extra = {
            "example": {
                "public_key": "BEl62iUYgUivxIkv69yViEuiBIa1eJO..."
            }
        }


class TestNotificationResponse(BaseModel):
    """Response schema for test notification"""
    success: bool = Field(..., description="Whether test notification was sent")
    message: str = Field(..., description="Response message")
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Test notification sent successfully"
            }
        }
