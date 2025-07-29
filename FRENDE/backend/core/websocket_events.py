from typing import Dict, Any, Optional
from datetime import datetime
import logging
import json
from sqlalchemy.ext.asyncio import AsyncSession

from core.websocket import manager
from core.database import get_async_session
from models.user import User
from models.match import Match
from models.chat import ChatMessage
from models.task import Task

logger = logging.getLogger(__name__)

class WebSocketEventHandler:
    """Handler for WebSocket events and message types"""
    
    @staticmethod
    async def handle_message_event(
        user: User,
        match_id: int,
        message_data: Dict[str, Any],
        session: AsyncSession
    ):
        """Handle chat message events"""
        message_text = message_data.get("message", "").strip()
        task_id = message_data.get("task_id")
        
        if not message_text:
            return
        
        # Create chat message in database
        chat_message = ChatMessage(
            match_id=match_id,
            sender_id=user.id,
            message_text=message_text,
            message_type="text" if not task_id else "task_submission",
            task_id=task_id
        )
        
        session.add(chat_message)
        await session.commit()
        await session.refresh(chat_message)
        
        # Broadcast message to all users in the match
        broadcast_message = {
            "type": "chat_message",
            "message_id": chat_message.id,
            "sender_id": user.id,
            "sender_name": user.username or user.name,
            "message": message_text,
            "task_id": task_id,
            "timestamp": chat_message.created_at.isoformat()
        }
        
        await manager.broadcast_to_match(broadcast_message, match_id)
        logger.info(f"Message event handled for user {user.id} in match {match_id}")
    
    @staticmethod
    async def handle_typing_event(
        user: User,
        match_id: int,
        is_typing: bool
    ):
        """Handle typing indicator events"""
        manager.set_typing(user.id, match_id, is_typing)
        
        typing_message = {
            "type": "typing_start" if is_typing else "typing_stop",
            "user_id": user.id,
            "username": user.username or user.name,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await manager.broadcast_to_match(typing_message, match_id, exclude_user=user.id)
        logger.info(f"Typing event handled for user {user.id} in match {match_id}")
    
    @staticmethod
    async def handle_task_completion_event(
        user: User,
        match_id: int,
        task_id: int,
        session: AsyncSession
    ):
        """Handle task completion events"""
        from sqlalchemy import select
        
        # Get task from database
        result = await session.execute(
            select(Task).where(Task.id == task_id, Task.match_id == match_id)
        )
        task = result.scalar_one_or_none()
        
        if task:
            # Mark task as completed by user
            task.mark_completed_by_user(user.id, task.match)
            await session.commit()
            
            # Broadcast task completion
            completion_message = {
                "type": "task_completion",
                "task_id": task_id,
                "user_id": user.id,
                "username": user.username or user.name,
                "completed": task.is_completed,
                "coin_reward": task.coin_reward,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await manager.broadcast_to_match(completion_message, match_id)
            logger.info(f"Task completion event handled for user {user.id} in match {match_id}")
    
    @staticmethod
    async def handle_read_receipt_event(
        user: User,
        match_id: int,
        message_id: int,
        session: AsyncSession
    ):
        """Handle read receipt events"""
        from sqlalchemy import select
        
        # Get message from database
        result = await session.execute(
            select(ChatMessage).where(
                ChatMessage.id == message_id,
                ChatMessage.match_id == match_id
            )
        )
        message = result.scalar_one_or_none()
        
        if message and message.sender_id != user.id:
            # Mark message as read
            message.mark_as_read()
            await session.commit()
            
            # Broadcast read receipt
            read_message = {
                "type": "read_receipt",
                "message_id": message_id,
                "user_id": user.id,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await manager.broadcast_to_match(read_message, match_id)
            logger.info(f"Read receipt event handled for user {user.id} in match {match_id}")
    
    @staticmethod
    async def handle_online_status_event(
        user: User,
        match_id: int,
        is_online: bool
    ):
        """Handle online/offline status events"""
        status_message = {
            "type": "user_online" if is_online else "user_offline",
            "user_id": user.id,
            "username": user.username or user.name,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await manager.broadcast_to_match(status_message, match_id, exclude_user=user.id)
        logger.info(f"Online status event handled for user {user.id} in match {match_id}")
    
    @staticmethod
    async def handle_match_status_event(
        match_id: int,
        status: str,
        session: AsyncSession
    ):
        """Handle match status change events"""
        from sqlalchemy import select
        
        # Get match from database
        result = await session.execute(select(Match).where(Match.id == match_id))
        match = result.scalar_one_or_none()
        
        if match:
            match.status = status
            await session.commit()
            
            # Broadcast match status change
            status_message = {
                "type": "match_status_change",
                "match_id": match_id,
                "status": status,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await manager.broadcast_to_match(status_message, match_id)
            logger.info(f"Match status event handled for match {match_id}: {status}")
    
    @staticmethod
    async def handle_task_notification_event(
        match_id: int,
        task: Task,
        session: AsyncSession
    ):
        """Handle new task notification events"""
        # Broadcast new task notification
        task_message = {
            "type": "new_task",
            "task_id": task.id,
            "title": task.title,
            "description": task.description,
            "coin_reward": task.coin_reward,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await manager.broadcast_to_match(task_message, match_id)
        logger.info(f"Task notification event handled for match {match_id}")
    
    @staticmethod
    async def handle_system_message_event(
        match_id: int,
        message_text: str,
        session: AsyncSession
    ):
        """Handle system message events"""
        # Create system message in database
        system_message = ChatMessage(
            match_id=match_id,
            sender_id=0,  # System user ID
            message_text=message_text,
            message_type="system",
            is_system_message=True
        )
        
        session.add(system_message)
        await session.commit()
        await session.refresh(system_message)
        
        # Broadcast system message
        broadcast_message = {
            "type": "system_message",
            "message_id": system_message.id,
            "message": message_text,
            "timestamp": system_message.created_at.isoformat()
        }
        
        await manager.broadcast_to_match(broadcast_message, match_id)
        logger.info(f"System message event handled for match {match_id}")
    
    @staticmethod
    async def handle_connection_event(
        user: User,
        match_id: int,
        event_type: str
    ):
        """Handle connection/disconnection events"""
        if event_type == "connect":
            # Send online status to other users
            online_message = {
                "type": "user_online",
                "user_id": user.id,
                "username": user.username or user.name,
                "timestamp": datetime.utcnow().isoformat()
            }
            await manager.broadcast_to_match(online_message, match_id, exclude_user=user.id)
            
            # Send current online users to the new user
            online_users = manager.get_online_users(match_id)
            current_users_message = {
                "type": "online_users",
                "users": online_users,
                "timestamp": datetime.utcnow().isoformat()
            }
            await manager.send_personal_message(current_users_message, user.id)
            
        elif event_type == "disconnect":
            # Send offline status to other users
            offline_message = {
                "type": "user_offline",
                "user_id": user.id,
                "timestamp": datetime.utcnow().isoformat()
            }
            await manager.broadcast_to_match(offline_message, match_id)
        
        logger.info(f"Connection event handled for user {user.id} in match {match_id}: {event_type}")

# Global event handler instance
event_handler = WebSocketEventHandler() 