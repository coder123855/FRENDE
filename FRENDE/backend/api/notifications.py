"""
Push Notification API endpoints
"""

import logging
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_async_session
from core.auth import current_active_user
from models.user import User
from core.push_notifications import push_notification_service
from schemas.notification import (
    PushSubscriptionRequest,
    PushSubscriptionResponse,
    NotificationSendRequest,
    NotificationStatsResponse
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.post("/subscribe", response_model=PushSubscriptionResponse)
async def subscribe_to_push_notifications(
    subscription_data: PushSubscriptionRequest,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> Dict[str, Any]:
    """Subscribe to push notifications"""
    try:
        success = await push_notification_service.save_subscription(
            current_user.id,
            subscription_data.dict(),
            session
        )
        
        if success:
            return {
                "success": True,
                "message": "Successfully subscribed to push notifications",
                "user_id": current_user.id
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save subscription"
            )
            
    except Exception as e:
        logger.error(f"Error subscribing to push notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to subscribe to push notifications"
        )


@router.delete("/unsubscribe")
async def unsubscribe_from_push_notifications(
    endpoint: str,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> Dict[str, Any]:
    """Unsubscribe from push notifications"""
    try:
        success = await push_notification_service.remove_subscription(
            current_user.id,
            endpoint,
            session
        )
        
        if success:
            return {
                "success": True,
                "message": "Successfully unsubscribed from push notifications"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Subscription not found"
            )
            
    except Exception as e:
        logger.error(f"Error unsubscribing from push notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to unsubscribe from push notifications"
        )


@router.get("/subscriptions", response_model=List[PushSubscriptionResponse])
async def get_user_subscriptions(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> List[Dict[str, Any]]:
    """Get user's push notification subscriptions"""
    try:
        subscriptions = await push_notification_service.get_user_subscriptions(
            current_user.id,
            session
        )
        
        return [
            {
                "id": sub.id,
                "endpoint": sub.endpoint,
                "created_at": sub.created_at.isoformat() if sub.created_at else None,
                "updated_at": sub.updated_at.isoformat() if sub.updated_at else None
            }
            for sub in subscriptions
        ]
        
    except Exception as e:
        logger.error(f"Error getting user subscriptions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get subscriptions"
        )


@router.post("/send")
async def send_notification(
    notification_request: NotificationSendRequest,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> Dict[str, Any]:
    """Send a push notification to a user (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can send notifications"
        )
    
    try:
        success = await push_notification_service.send_notification(
            notification_request.user_id,
            notification_request.notification_type,
            notification_request.custom_data,
            session
        )
        
        if success:
            return {
                "success": True,
                "message": "Notification sent successfully",
                "user_id": notification_request.user_id,
                "notification_type": notification_request.notification_type
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found or no subscriptions available"
            )
            
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send notification"
        )


@router.post("/send-bulk")
async def send_bulk_notification(
    user_ids: List[int],
    notification_type: str,
    custom_data: Dict[str, Any] = None,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> Dict[str, Any]:
    """Send push notification to multiple users (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can send bulk notifications"
        )
    
    try:
        results = await push_notification_service.send_bulk_notification(
            user_ids,
            notification_type,
            custom_data,
            session
        )
        
        return {
            "success": True,
            "message": "Bulk notification completed",
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error sending bulk notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send bulk notification"
        )


@router.get("/vapid-public-key")
async def get_vapid_public_key() -> Dict[str, str]:
    """Get VAPID public key for client subscription"""
    try:
        public_key = push_notification_service.get_vapid_public_key()
        return {
            "public_key": public_key
        }
    except Exception as e:
        logger.error(f"Error getting VAPID public key: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get VAPID public key"
        )


@router.get("/stats", response_model=NotificationStatsResponse)
async def get_notification_stats(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> Dict[str, Any]:
    """Get push notification statistics (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view notification stats"
        )
    
    try:
        stats = await push_notification_service.get_subscription_stats(session)
        return stats
        
    except Exception as e:
        logger.error(f"Error getting notification stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get notification stats"
        )


@router.post("/cleanup")
async def cleanup_expired_subscriptions(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> Dict[str, Any]:
    """Clean up expired push notification subscriptions (admin only)"""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can cleanup subscriptions"
        )
    
    try:
        deleted_count = await push_notification_service.cleanup_expired_subscriptions(session)
        
        return {
            "success": True,
            "message": f"Cleaned up {deleted_count} expired subscriptions",
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        logger.error(f"Error cleaning up expired subscriptions: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cleanup expired subscriptions"
        )


@router.post("/test")
async def send_test_notification(
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
) -> Dict[str, Any]:
    """Send a test push notification to the current user"""
    try:
        success = await push_notification_service.send_custom_notification(
            current_user.id,
            "Test Notification 🧪",
            "This is a test push notification from Frende!",
            {
                "type": "test",
                "url": "/"
            },
            [
                {
                    "action": "view",
                    "title": "View App"
                },
                {
                    "action": "dismiss",
                    "title": "Dismiss"
                }
            ],
            session
        )
        
        if success:
            return {
                "success": True,
                "message": "Test notification sent successfully"
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No push subscriptions found for user"
            )
            
    except Exception as e:
        logger.error(f"Error sending test notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send test notification"
        )
