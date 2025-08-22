"""
Push Notification Service for Frende App
Handles VAPID key management, push notification delivery, and subscription management
"""

import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.serialization import Encoding, PublicFormat
import base64
import pywebpush
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import selectinload

from models.user import User
from models.push_subscription import PushSubscription
from core.config import settings
from core.database import get_async_session

logger = logging.getLogger(__name__)


class PushNotificationService:
    """Service for managing push notifications"""
    
    def __init__(self):
        self.vapid_private_key = settings.VAPID_PRIVATE_KEY
        self.vapid_public_key = settings.VAPID_PUBLIC_KEY
        self.vapid_claims = {
            "sub": f"mailto:{settings.VAPID_EMAIL}",
            "aud": settings.VAPID_AUDIENCE
        }
        
        # Notification templates
        self.notification_templates = {
            'new_match': {
                'title': 'New Match! 🎉',
                'body': 'You have a new potential friend! Check them out.',
                'icon': '/assets/icon-192x192.png',
                'badge': '/assets/icon-72x72.png',
                'tag': 'new-match',
                'data': {
                    'type': 'new_match',
                    'url': '/matching'
                },
                'actions': [
                    {
                        'action': 'view',
                        'title': 'View Match'
                    },
                    {
                        'action': 'dismiss',
                        'title': 'Later'
                    }
                ]
            },
            'new_message': {
                'title': 'New Message 💬',
                'body': 'You received a new message from your friend.',
                'icon': '/assets/icon-192x192.png',
                'badge': '/assets/icon-72x72.png',
                'tag': 'new-message',
                'data': {
                    'type': 'new_message',
                    'url': '/chat'
                },
                'actions': [
                    {
                        'action': 'reply',
                        'title': 'Reply'
                    },
                    {
                        'action': 'dismiss',
                        'title': 'Later'
                    }
                ]
            },
            'task_assigned': {
                'title': 'New Task! 📋',
                'body': 'A new bonding task has been assigned to you.',
                'icon': '/assets/icon-192x192.png',
                'badge': '/assets/icon-72x72.png',
                'tag': 'task-assigned',
                'data': {
                    'type': 'task_assigned',
                    'url': '/tasks'
                },
                'actions': [
                    {
                        'action': 'view',
                        'title': 'View Task'
                    },
                    {
                        'action': 'dismiss',
                        'title': 'Later'
                    }
                ]
            },
            'task_completed': {
                'title': 'Task Completed! 🎊',
                'body': 'You and your friend completed a bonding task!',
                'icon': '/assets/icon-192x192.png',
                'badge': '/assets/icon-72x72.png',
                'tag': 'task-completed',
                'data': {
                    'type': 'task_completed',
                    'url': '/tasks'
                },
                'actions': [
                    {
                        'action': 'view',
                        'title': 'View Reward'
                    },
                    {
                        'action': 'dismiss',
                        'title': 'Later'
                    }
                ]
            },
            'task_expiring': {
                'title': 'Task Expiring Soon! ⏰',
                'body': 'Your bonding task will expire soon. Complete it now!',
                'icon': '/assets/icon-192x192.png',
                'badge': '/assets/icon-72x72.png',
                'tag': 'task-expiring',
                'data': {
                    'type': 'task_expiring',
                    'url': '/tasks'
                },
                'actions': [
                    {
                        'action': 'complete',
                        'title': 'Complete Now'
                    },
                    {
                        'action': 'dismiss',
                        'title': 'Later'
                    }
                ]
            },
            'match_request': {
                'title': 'Match Request! 🤝',
                'body': 'Someone wants to be your friend!',
                'icon': '/assets/icon-192x192.png',
                'badge': '/assets/icon-72x72.png',
                'tag': 'match-request',
                'data': {
                    'type': 'match_request',
                    'url': '/matching'
                },
                'actions': [
                    {
                        'action': 'accept',
                        'title': 'Accept'
                    },
                    {
                        'action': 'decline',
                        'title': 'Decline'
                    }
                ]
            },
            'system_announcement': {
                'title': 'Frende Update 📢',
                'body': 'Important update from the Frende team.',
                'icon': '/assets/icon-192x192.png',
                'badge': '/assets/icon-72x72.png',
                'tag': 'system-announcement',
                'data': {
                    'type': 'system_announcement',
                    'url': '/'
                },
                'actions': [
                    {
                        'action': 'view',
                        'title': 'Read More'
                    },
                    {
                        'action': 'dismiss',
                        'title': 'Dismiss'
                    }
                ]
            }
        }
    
    async def save_subscription(
        self,
        user_id: int,
        subscription_data: Dict[str, Any],
        session: AsyncSession = None
    ) -> bool:
        """Save push notification subscription for a user"""
        if not session:
            async with get_async_session() as session:
                return await self._save_subscription_internal(user_id, subscription_data, session)
        
        return await self._save_subscription_internal(user_id, subscription_data, session)
    
    async def _save_subscription_internal(
        self,
        user_id: int,
        subscription_data: Dict[str, Any],
        session: AsyncSession
    ) -> bool:
        """Internal method to save subscription"""
        try:
            # Check if subscription already exists
            result = await session.execute(
                select(PushSubscription).where(
                    PushSubscription.user_id == user_id,
                    PushSubscription.endpoint == subscription_data['endpoint']
                )
            )
            existing_subscription = result.scalar_one_or_none()
            
            if existing_subscription:
                # Update existing subscription
                existing_subscription.auth = subscription_data['keys']['auth']
                existing_subscription.p256dh = subscription_data['keys']['p256dh']
                existing_subscription.updated_at = datetime.utcnow()
            else:
                # Create new subscription
                new_subscription = PushSubscription(
                    user_id=user_id,
                    endpoint=subscription_data['endpoint'],
                    auth=subscription_data['keys']['auth'],
                    p256dh=subscription_data['keys']['p256dh'],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                session.add(new_subscription)
            
            await session.commit()
            logger.info(f"Push subscription saved for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving push subscription for user {user_id}: {str(e)}")
            await session.rollback()
            return False
    
    async def remove_subscription(
        self,
        user_id: int,
        endpoint: str,
        session: AsyncSession = None
    ) -> bool:
        """Remove push notification subscription for a user"""
        if not session:
            async with get_async_session() as session:
                return await self._remove_subscription_internal(user_id, endpoint, session)
        
        return await self._remove_subscription_internal(user_id, endpoint, session)
    
    async def _remove_subscription_internal(
        self,
        user_id: int,
        endpoint: str,
        session: AsyncSession
    ) -> bool:
        """Internal method to remove subscription"""
        try:
            result = await session.execute(
                delete(PushSubscription).where(
                    PushSubscription.user_id == user_id,
                    PushSubscription.endpoint == endpoint
                )
            )
            await session.commit()
            
            logger.info(f"Push subscription removed for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error removing push subscription for user {user_id}: {str(e)}")
            await session.rollback()
            return False
    
    async def get_user_subscriptions(
        self,
        user_id: int,
        session: AsyncSession = None
    ) -> List[PushSubscription]:
        """Get all push notification subscriptions for a user"""
        if not session:
            async with get_async_session() as session:
                return await self._get_user_subscriptions_internal(user_id, session)
        
        return await self._get_user_subscriptions_internal(user_id, session)
    
    async def _get_user_subscriptions_internal(
        self,
        user_id: int,
        session: AsyncSession
    ) -> List[PushSubscription]:
        """Internal method to get user subscriptions"""
        try:
            result = await session.execute(
                select(PushSubscription).where(PushSubscription.user_id == user_id)
            )
            return result.scalars().all()
            
        except Exception as e:
            logger.error(f"Error getting push subscriptions for user {user_id}: {str(e)}")
            return []
    
    async def send_notification(
        self,
        user_id: int,
        notification_type: str,
        custom_data: Dict[str, Any] = None,
        session: AsyncSession = None
    ) -> bool:
        """Send push notification to a user"""
        if not session:
            async with get_async_session() as session:
                return await self._send_notification_internal(user_id, notification_type, custom_data, session)
        
        return await self._send_notification_internal(user_id, notification_type, custom_data, session)
    
    async def _send_notification_internal(
        self,
        user_id: int,
        notification_type: str,
        custom_data: Dict[str, Any] = None,
        session: AsyncSession = None
    ) -> bool:
        """Internal method to send notification"""
        try:
            # Get user subscriptions
            subscriptions = await self.get_user_subscriptions(user_id, session)
            
            if not subscriptions:
                logger.info(f"No push subscriptions found for user {user_id}")
                return False
            
            # Get notification template
            template = self.notification_templates.get(notification_type)
            if not template:
                logger.error(f"Unknown notification type: {notification_type}")
                return False
            
            # Merge custom data with template
            notification_data = template.copy()
            if custom_data:
                notification_data['data'] = {**notification_data['data'], **custom_data}
                if 'body' in custom_data:
                    notification_data['body'] = custom_data['body']
                if 'title' in custom_data:
                    notification_data['title'] = custom_data['title']
            
            # Send to all user subscriptions
            success_count = 0
            for subscription in subscriptions:
                try:
                    success = await self._send_to_subscription(subscription, notification_data)
                    if success:
                        success_count += 1
                except Exception as e:
                    logger.error(f"Error sending notification to subscription {subscription.id}: {str(e)}")
            
            logger.info(f"Sent {success_count}/{len(subscriptions)} notifications to user {user_id}")
            return success_count > 0
            
        except Exception as e:
            logger.error(f"Error sending notification to user {user_id}: {str(e)}")
            return False
    
    async def send_bulk_notification(
        self,
        user_ids: List[int],
        notification_type: str,
        custom_data: Dict[str, Any] = None,
        session: AsyncSession = None
    ) -> Dict[str, int]:
        """Send push notification to multiple users"""
        if not session:
            async with get_async_session() as session:
                return await self._send_bulk_notification_internal(user_ids, notification_type, custom_data, session)
        
        return await self._send_bulk_notification_internal(user_ids, notification_type, custom_data, session)
    
    async def _send_bulk_notification_internal(
        self,
        user_ids: List[int],
        notification_type: str,
        custom_data: Dict[str, Any] = None,
        session: AsyncSession = None
    ) -> Dict[str, int]:
        """Internal method to send bulk notification"""
        results = {
            'total_users': len(user_ids),
            'successful': 0,
            'failed': 0
        }
        
        # Process in batches to avoid overwhelming the system
        batch_size = 50
        for i in range(0, len(user_ids), batch_size):
            batch = user_ids[i:i + batch_size]
            
            # Create tasks for concurrent processing
            tasks = [
                self.send_notification(user_id, notification_type, custom_data, session)
                for user_id in batch
            ]
            
            # Execute tasks concurrently
            batch_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Count results
            for result in batch_results:
                if isinstance(result, Exception):
                    results['failed'] += 1
                    logger.error(f"Bulk notification error: {str(result)}")
                elif result:
                    results['successful'] += 1
                else:
                    results['failed'] += 1
        
        logger.info(f"Bulk notification completed: {results}")
        return results
    
    async def _send_to_subscription(
        self,
        subscription: PushSubscription,
        notification_data: Dict[str, Any]
    ) -> bool:
        """Send notification to a specific subscription"""
        try:
            # Prepare subscription info
            subscription_info = {
                'endpoint': subscription.endpoint,
                'keys': {
                    'auth': subscription.auth,
                    'p256dh': subscription.p256dh
                }
            }
            
            # Prepare notification payload
            payload = {
                'title': notification_data['title'],
                'body': notification_data['body'],
                'icon': notification_data['icon'],
                'badge': notification_data['badge'],
                'tag': notification_data['tag'],
                'data': notification_data['data'],
                'actions': notification_data.get('actions', []),
                'requireInteraction': notification_data.get('requireInteraction', False),
                'silent': notification_data.get('silent', False)
            }
            
            # Send push notification
            response = pywebpush(
                subscription_info=subscription_info,
                data=json.dumps(payload),
                vapid_private_key=self.vapid_private_key,
                vapid_claims=self.vapid_claims
            )
            
            if response.status_code == 200:
                logger.debug(f"Push notification sent successfully to subscription {subscription.id}")
                return True
            elif response.status_code in [404, 410]:
                # Subscription is invalid, remove it
                logger.warning(f"Invalid subscription {subscription.id}, removing")
                await self.remove_subscription(subscription.user_id, subscription.endpoint)
                return False
            else:
                logger.error(f"Push notification failed for subscription {subscription.id}: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"Error sending push notification to subscription {subscription.id}: {str(e)}")
            return False
    
    async def send_custom_notification(
        self,
        user_id: int,
        title: str,
        body: str,
        data: Dict[str, Any] = None,
        actions: List[Dict[str, str]] = None,
        session: AsyncSession = None
    ) -> bool:
        """Send custom push notification to a user"""
        custom_data = {
            'title': title,
            'body': body,
            'data': data or {},
            'actions': actions or []
        }
        
        return await self.send_notification(user_id, 'system_announcement', custom_data, session)
    
    async def cleanup_expired_subscriptions(
        self,
        session: AsyncSession = None
    ) -> int:
        """Clean up expired push notification subscriptions"""
        if not session:
            async with get_async_session() as session:
                return await self._cleanup_expired_subscriptions_internal(session)
        
        return await self._cleanup_expired_subscriptions_internal(session)
    
    async def _cleanup_expired_subscriptions_internal(
        self,
        session: AsyncSession
    ) -> int:
        """Internal method to cleanup expired subscriptions"""
        try:
            # Remove subscriptions older than 30 days
            cutoff_date = datetime.utcnow() - timedelta(days=30)
            
            result = await session.execute(
                delete(PushSubscription).where(
                    PushSubscription.updated_at < cutoff_date
                )
            )
            
            await session.commit()
            
            deleted_count = result.rowcount
            logger.info(f"Cleaned up {deleted_count} expired push subscriptions")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up expired subscriptions: {str(e)}")
            await session.rollback()
            return 0
    
    def get_vapid_public_key(self) -> str:
        """Get VAPID public key for client subscription"""
        return self.vapid_public_key
    
    async def get_subscription_stats(
        self,
        session: AsyncSession = None
    ) -> Dict[str, Any]:
        """Get push notification subscription statistics"""
        if not session:
            async with get_async_session() as session:
                return await self._get_subscription_stats_internal(session)
        
        return await self._get_subscription_stats_internal(session)
    
    async def _get_subscription_stats_internal(
        self,
        session: AsyncSession
    ) -> Dict[str, Any]:
        """Internal method to get subscription stats"""
        try:
            # Get total subscriptions
            result = await session.execute(select(PushSubscription))
            total_subscriptions = len(result.scalars().all())
            
            # Get subscriptions by date
            result = await session.execute(
                select(PushSubscription).where(
                    PushSubscription.created_at >= datetime.utcnow() - timedelta(days=7)
                )
            )
            recent_subscriptions = len(result.scalars().all())
            
            # Get unique users with subscriptions
            result = await session.execute(
                select(PushSubscription.user_id).distinct()
            )
            unique_users = len(result.scalars().all())
            
            return {
                'total_subscriptions': total_subscriptions,
                'recent_subscriptions': recent_subscriptions,
                'unique_users': unique_users,
                'timestamp': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting subscription stats: {str(e)}")
            return {
                'total_subscriptions': 0,
                'recent_subscriptions': 0,
                'unique_users': 0,
                'timestamp': datetime.utcnow().isoformat()
            }


# Global push notification service instance
push_notification_service = PushNotificationService()
