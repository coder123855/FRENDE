import logging
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, update
from uuid import uuid4
from models.chat import ChatMessage, ChatRoom
from models.match import Match
from models.user import User
from models.task import Task
from core.websocket import manager
from core.database import get_async_session
from core.config import settings
from services.task_submission import task_submission_service

logger = logging.getLogger(__name__)

class ChatService:
    """Service for handling chat operations"""
    
    def __init__(self):
        self.max_message_length = 1000
        self.auto_greeting_timeout = settings.AUTO_GREETING_TIMEOUT_SECONDS
        self.chat_message_max_length = settings.CHAT_MESSAGE_MAX_LENGTH
        self.auto_greeting_tasks: Dict[int, asyncio.Task] = {}
    
    async def create_chat_room(
        self,
        match: Match,
        session: AsyncSession = None
    ) -> ChatRoom:
        """Create a chat room for a match"""
        if not session:
            async with get_async_session() as session:
                return await self._create_chat_room_internal(match, session)
        
        return await self._create_chat_room_internal(match, session)
    
    async def _create_chat_room_internal(self, match: Match, session: AsyncSession) -> ChatRoom:
        """Internal method to create a chat room"""
        room_id = f"room_{uuid4().hex[:8]}"
        
        chat_room = ChatRoom(
            room_id=room_id,
            match_id=match.id,
            conversation_starter_id=match.user1_id  # Default to user1 as starter
        )
        
        session.add(chat_room)
        await session.commit()
        await session.refresh(chat_room)
        
        # Update match with chat room ID
        match.chat_room_id = room_id
        await session.commit()
        
        logger.info(f"Created chat room {room_id} for match {match.id}")
        return chat_room
    
    async def get_chat_room(self, match_id: int, session: AsyncSession) -> Optional[ChatRoom]:
        """Get chat room for a match"""
        result = await session.execute(
            select(ChatRoom).where(ChatRoom.match_id == match_id)
        )
        return result.scalar_one_or_none()
    
    async def get_chat_messages(
        self, 
        match_id: int, 
        user_id: int,
        page: int = 1,
        size: int = 50,
        session: AsyncSession = None
    ) -> Dict:
        """Get chat messages for a match with pagination"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        offset = (page - 1) * size
        
        # Get total count
        count_result = await session.execute(
            select(func.count(ChatMessage.id))
            .where(ChatMessage.match_id == match_id)
        )
        total = count_result.scalar() or 0
        
        # Get messages
        result = await session.execute(
            select(ChatMessage)
            .where(ChatMessage.match_id == match_id)
            .order_by(ChatMessage.created_at.desc())
            .offset(offset)
            .limit(size)
        )
        messages = result.scalars().all()
        
        # Get unread count
        unread_count = await self.get_unread_count(match_id, user_id, session)
        
        return {
            "messages": messages,
            "total": total,
            "page": page,
            "size": size,
            "unread_count": unread_count
        }
    
    async def get_last_message_time(self, match_id: int, session: AsyncSession) -> Optional[datetime]:
        """Get the timestamp of the last message in a match"""
        result = await session.execute(
            select(ChatMessage.created_at)
            .where(ChatMessage.match_id == match_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()
    
    async def get_chat_room_status(self, match_id: int, session: AsyncSession) -> Dict:
        """Get chat room status and information"""
        room = await self.get_chat_room(match_id, session)
        if not room:
            return {
                "room_id": None,
                "match_id": match_id,
                "is_active": False,
                "conversation_starter_id": None,
                "starter_message_sent": False,
                "auto_greeting_sent": False,
                "created_at": None,
                "last_activity": None,
                "online_users": [],
                "typing_users": []
            }
        
        # Get online users from WebSocket manager
        online_users = []
        typing_users = []
        
        if str(match_id) in manager.room_connections:
            online_users = list(manager.room_connections[str(match_id)])
            typing_users = list(manager.typing_users.get(str(match_id), set()))
        
        return {
            "room_id": room.room_id,
            "match_id": match_id,
            "is_active": room.is_active,
            "conversation_starter_id": room.conversation_starter_id,
            "starter_message_sent": room.starter_message_sent,
            "auto_greeting_sent": room.auto_greeting_sent,
            "created_at": room.created_at,
            "last_activity": room.last_activity,
            "online_users": online_users,
            "typing_users": typing_users
        }
    
    async def set_typing_status(self, match_id: int, user_id: int, is_typing: bool):
        """Set typing status for a user in a chat room"""
        manager.set_typing(user_id, match_id, is_typing)
    
    async def get_typing_users(self, match_id: int) -> List[int]:
        """Get users currently typing in a chat room"""
        return list(manager.typing_users.get(str(match_id), set()))
    
    async def send_message(
        self,
        match_id: int,
        sender_id: int,
        message_text: str,
        message_type: str = "text",
        task_id: Optional[int] = None,
        is_system_message: bool = False,
        metadata: Optional[Dict[str, Any]] = None,
        session: AsyncSession = None
    ) -> ChatMessage:
        """Send a message in a chat room"""
        if not session:
            async for db_session in get_async_session():
                session = db_session
                break
        
        chat_message = ChatMessage(
            match_id=match_id,
            sender_id=sender_id,
            message_text=message_text,
            message_type=message_type,
            task_id=task_id,
            is_system_message=is_system_message,
            metadata=metadata
        )
        
        session.add(chat_message)
        await session.commit()
        await session.refresh(chat_message)
        
        # Broadcast message via WebSocket
        broadcast_message = {
            "type": "chat_message",
            "message": {
                "id": chat_message.id,
                "match_id": match_id,
                "sender_id": sender_id,
                "message_text": message_text,
                "message_type": message_type,
                "task_id": task_id,
                "is_system_message": is_system_message,
                "metadata": metadata,
                "created_at": chat_message.created_at.isoformat(),
                "is_read": chat_message.is_read,
            }
        }
        
        await manager.broadcast_to_match(broadcast_message, match_id)
        
        logger.info(f"Message sent in match {match_id} by user {sender_id}")
        return chat_message
    
    async def send_system_message(
        self,
        match_id: int,
        message_text: str,
        session: AsyncSession,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ChatMessage:
        """Send a system message (auto-generated)"""
        return await self.send_message(
            match_id=match_id,
            sender_id=0,  # System user ID
            message_text=message_text,
            message_type="system",
            is_system_message=True,
            metadata=metadata,
            session=session
        )
    
    async def start_auto_greeting_timer(self, match_id: int, session: AsyncSession):
        """Start auto-greeting timer for a match"""
        # Cancel existing timer if any
        if match_id in self.auto_greeting_tasks:
            self.auto_greeting_tasks[match_id].cancel()
        
        # Create new timer task
        task = asyncio.create_task(self._auto_greeting_timer(match_id, session))
        self.auto_greeting_tasks[match_id] = task
        
        logger.info(f"Started auto-greeting timer for match {match_id}")
    
    async def _auto_greeting_timer(self, match_id: int, session: AsyncSession):
        """Auto-greeting timer that sends a default message after timeout"""
        try:
            await asyncio.sleep(self.auto_greeting_timeout)
            
            # Check if match is still active
            result = await session.execute(
                select(Match).where(Match.id == match_id)
            )
            match = result.scalar_one_or_none()
            
            if not match or match.status != "active":
                logger.info(f"Match {match_id} is no longer active, skipping auto-greeting")
                return
            
            # Get conversation starter
            result = await session.execute(
                select(User).where(User.id == match.conversation_starter_id)
            )
            starter = result.scalar_one_or_none()
            
            if not starter:
                logger.warning(f"Conversation starter not found for match {match_id}")
                return
            
            # Send default greeting
            default_message = f"Hello, my name is {starter.name}, I am shy and can't think of a cool opening line :( Wanna be friends?"
            
            message = ChatMessage(
                match_id=match_id,
                sender_id=starter.id,
                message_text=default_message,
                message_type="text"
            )
            
            session.add(message)
            await session.commit()
            
            # Notify users through WebSocket
            await manager.broadcast_to_match(
                match_id,
                {
                    "type": "chat_message",
                    "message": {
                        "id": message.id,
                        "sender_id": message.sender_id,
                        "message_text": message.message_text,
                        "message_type": message.message_type,
                        "timestamp": message.created_at.isoformat()
                    }
                }
            )
            
            logger.info(f"Sent auto-greeting for match {match_id}")
            
        except asyncio.CancelledError:
            logger.info(f"Auto-greeting timer cancelled for match {match_id}")
            return
        except Exception as e:
            logger.error(f"Error in auto-greeting timer for match {match_id}: {e}")
        finally:
            # Clean up task reference
            if match_id in self.auto_greeting_tasks:
                del self.auto_greeting_tasks[match_id]
    
    async def cancel_auto_greeting_timer(self, match_id: int):
        """Cancel auto-greeting timer for a match"""
        if match_id in self.auto_greeting_tasks:
            self.auto_greeting_tasks[match_id].cancel()
            del self.auto_greeting_tasks[match_id]
            logger.info(f"Cancelled auto-greeting timer for match {match_id}")
    
    async def mark_message_as_read(
        self,
        message_id: int,
        user_id: int,
        session: AsyncSession
    ) -> bool:
        """Mark a message as read by a user"""
        result = await session.execute(
            select(ChatMessage).where(ChatMessage.id == message_id)
        )
        message = result.scalar_one_or_none()
        
        if message and message.sender_id != user_id:
            message.mark_as_read()
            await session.commit()
            
            # Broadcast read receipt
            read_message = {
                "type": "read_receipt",
                "message_id": message_id,
                "user_id": user_id,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            await manager.broadcast_to_match(read_message, message.match_id)
            return True
        
        return False
    
    async def get_unread_count(
        self,
        match_id: int,
        user_id: int,
        session: AsyncSession
    ) -> int:
        """Get count of unread messages for a user in a match"""
        result = await session.execute(
            select(ChatMessage).where(
                and_(
                    ChatMessage.match_id == match_id,
                    ChatMessage.sender_id != user_id,
                    ChatMessage.is_read == False
                )
            )
        )
        messages = result.scalars().all()
        return len(messages)
    
    async def send_task_notification(
        self,
        match_id: int,
        task: Task,
        session: AsyncSession
    ):
        """Send notification about a new task"""
        notification_text = f"New task available: {task.title}"
        
        await self.send_system_message(match_id, notification_text, session)
        
        # Broadcast task notification via WebSocket
        task_message = {
            "type": "new_task",
            "task_id": task.id,
            "title": task.title,
            "description": task.description,
            "coin_reward": task.coin_reward,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await manager.broadcast_to_match(task_message, match_id)
    
    async def send_task_completion_notification(
        self,
        match_id: int,
        task: Task,
        user: User,
        session: AsyncSession
    ):
        """Send notification about task completion"""
        if task.is_completed:
            completion_text = f"Task completed! Both users earned {task.coin_reward} coins each."
        else:
            completion_text = f"{user.name or user.username} completed the task!"
        
        await self.send_system_message(match_id, completion_text, session)
        
        # Broadcast task completion via WebSocket
        completion_message = {
            "type": "task_completion",
            "task_id": task.id,
            "user_id": user.id,
            "username": user.name or user.username,
            "completed": task.is_completed,
            "coin_reward": task.coin_reward,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await manager.broadcast_to_match(completion_message, match_id)
    
    async def cleanup_expired_matches(self, session: AsyncSession):
        """Clean up expired matches and their chat rooms"""
        # Find expired matches
        result = await session.execute(
            select(Match).where(
                and_(
                    Match.status == "active",
                    Match.created_at < datetime.utcnow() - timedelta(days=2)
                )
            )
        )
        expired_matches = result.scalars().all()
        
        for match in expired_matches:
            # Mark match as expired
            match.status = "expired"
            match.completed_at = datetime.utcnow()
            
            # Cancel auto-greeting timer
            await self.cancel_auto_greeting_timer(match.id)
            
            # Send expiration notification
            expiration_text = "This match has expired. You can start a new match!"
            await self.send_system_message(match.id, expiration_text, session)
            
            logger.info(f"Marked match {match.id} as expired")
        
        await session.commit()

    async def send_message_to_match(
        self, 
        match_id: int, 
        user_id: int, 
        message_text: str, 
        message_type: str = "text",
        session: AsyncSession = None
    ) -> ChatMessage:
        """Send a message to a match"""
        if not session:
            async with get_async_session() as session:
                return await self._send_message_to_match_internal(match_id, user_id, message_text, message_type, session)
        
        return await self._send_message_to_match_internal(match_id, user_id, message_text, message_type, session)
    
    async def _send_message_to_match_internal(
        self, 
        match_id: int, 
        user_id: int, 
        message_text: str, 
        message_type: str,
        session: AsyncSession
    ) -> ChatMessage:
        """Internal method to send message to match"""
        try:
            # Validate message length
            if len(message_text) > self.max_message_length:
                raise ValueError(f"Message too long. Maximum length is {self.max_message_length} characters")
            
            # Validate user is in match
            result = await session.execute(
                select(Match).where(
                    Match.id == match_id,
                    (Match.user1_id == user_id) | (Match.user2_id == user_id)
                )
            )
            match = result.scalar_one_or_none()
            
            if not match:
                raise ValueError("User not authorized for this match")
            
            # Create chat message
            chat_message = ChatMessage(
                match_id=match_id,
                sender_id=user_id,
                message_text=message_text,
                message_type=message_type,
                created_at=datetime.utcnow()
            )
            
            session.add(chat_message)
            await session.commit()
            await session.refresh(chat_message)
            
            logger.info(f"Message sent by user {user_id} in match {match_id}")
            return chat_message
            
        except Exception as e:
            logger.error(f"Error sending message: {str(e)}")
            raise
    
    async def get_chat_history(
        self, 
        match_id: int, 
        user_id: int, 
        limit: int = 50,
        session: AsyncSession = None
    ) -> List[Dict[str, Any]]:
        """Get chat history for a match"""
        if not session:
            async with get_async_session() as session:
                return await self._get_chat_history_internal(match_id, user_id, limit, session)
        
        return await self._get_chat_history_internal(match_id, user_id, limit, session)
    
    async def _get_chat_history_internal(
        self, 
        match_id: int, 
        user_id: int, 
        limit: int,
        session: AsyncSession
    ) -> List[Dict[str, Any]]:
        """Internal method to get chat history"""
        try:
            # Validate user is in match
            result = await session.execute(
                select(Match).where(
                    Match.id == match_id,
                    (Match.user1_id == user_id) | (Match.user2_id == user_id)
                )
            )
            match = result.scalar_one_or_none()
            
            if not match:
                raise ValueError("User not authorized for this match")
            
            # Get chat messages
            result = await session.execute(
                select(ChatMessage)
                .where(ChatMessage.match_id == match_id)
                .order_by(ChatMessage.created_at.desc())
                .limit(limit)
            )
            messages = result.scalars().all()
            
            # Convert to dict format
            chat_history = []
            for message in reversed(messages):  # Reverse to get chronological order
                chat_history.append({
                    "id": message.id,
                    "match_id": message.match_id,
                    "sender_id": message.sender_id,
                    "message_text": message.message_text,
                    "message_type": message.message_type,
                    "created_at": message.created_at.isoformat(),
                    "is_read": message.is_read,
                    "read_at": message.read_at.isoformat() if message.read_at else None,
                    "is_system_message": message.is_system_message,
                    "task_id": message.task_id,
                    "metadata": message.metadata,
                })
            
            return chat_history
    async def get_chat_history_paginated(
        self,
        match_id: int,
        user_id: int,
        page: int = 1,
        size: int = 50,
        include_system: bool = True,
        session: AsyncSession = None
    ) -> Dict[str, Any]:
        """Get chat history with offset pagination"""
        if not session:
            async with get_async_session() as session:
                return await self._get_chat_history_paginated_internal(match_id, user_id, page, size, include_system, session)
        return await self._get_chat_history_paginated_internal(match_id, user_id, page, size, include_system, session)

    async def _get_chat_history_paginated_internal(self, match_id: int, user_id: int, page: int, size: int, include_system: bool, session: AsyncSession) -> Dict[str, Any]:
        # Validate user
        result = await session.execute(
            select(Match).where(
                Match.id == match_id,
                (Match.user1_id == user_id) | (Match.user2_id == user_id)
            )
        )
        match = result.scalar_one_or_none()
        if not match:
            raise ValueError("User not authorized for this match")

        offset = (page - 1) * size
        base_query = select(ChatMessage).where(ChatMessage.match_id == match_id)
        if not include_system:
            base_query = base_query.where(ChatMessage.is_system_message == False)

        count_result = await session.execute(select(func.count(ChatMessage.id)).select_from(base_query.subquery()))
        total = count_result.scalar() or 0

        result = await session.execute(
            base_query.order_by(ChatMessage.created_at.desc()).offset(offset).limit(size)
        )
        rows = list(reversed(result.scalars().all()))
        messages = [
            {
                "id": m.id,
                "match_id": m.match_id,
                "sender_id": m.sender_id,
                "message_text": m.message_text,
                "message_type": m.message_type,
                "created_at": m.created_at.isoformat(),
                "is_read": m.is_read,
                "read_at": m.read_at.isoformat() if m.read_at else None,
                "is_system_message": m.is_system_message,
                "task_id": m.task_id,
                "metadata": m.metadata,
            }
            for m in rows
        ]

        has_more = page * size < total
        next_cursor = rows[0].created_at.isoformat() if rows else None
        prev_cursor = rows[-1].created_at.isoformat() if rows else None
        return {"messages": messages, "page": page, "size": size, "total": total, "has_more": has_more, "next_cursor": next_cursor, "prev_cursor": prev_cursor}

    async def get_chat_history_cursor(
        self,
        match_id: int,
        user_id: int,
        cursor: Optional[datetime] = None,
        size: int = 50,
        direction: str = "older",
        include_system: bool = True,
        session: AsyncSession = None
    ) -> Dict[str, Any]:
        """Get chat history using cursor pagination (by created_at)"""
        if not session:
            async with get_async_session() as session:
                return await self._get_chat_history_cursor_internal(match_id, user_id, cursor, size, direction, include_system, session)
        return await self._get_chat_history_cursor_internal(match_id, user_id, cursor, size, direction, include_system, session)

    async def _get_chat_history_cursor_internal(self, match_id: int, user_id: int, cursor: Optional[datetime], size: int, direction: str, include_system: bool, session: AsyncSession) -> Dict[str, Any]:
        # Validate user
        result = await session.execute(
            select(Match).where(
                Match.id == match_id,
                (Match.user1_id == user_id) | (Match.user2_id == user_id)
            )
        )
        match = result.scalar_one_or_none()
        if not match:
            raise ValueError("User not authorized for this match")

        base_query = select(ChatMessage).where(ChatMessage.match_id == match_id)
        if not include_system:
            base_query = base_query.where(ChatMessage.is_system_message == False)

        if cursor:
            if direction == "older":
                base_query = base_query.where(ChatMessage.created_at < cursor)
            else:
                base_query = base_query.where(ChatMessage.created_at > cursor)

        result = await session.execute(
            base_query.order_by(ChatMessage.created_at.desc()).limit(size)
        )
        rows = list(reversed(result.scalars().all()))

        messages = [
            {
                "id": m.id,
                "match_id": m.match_id,
                "sender_id": m.sender_id,
                "message_text": m.message_text,
                "message_type": m.message_type,
                "created_at": m.created_at.isoformat(),
                "is_read": m.is_read,
                "read_at": m.read_at.isoformat() if m.read_at else None,
                "is_system_message": m.is_system_message,
                "task_id": m.task_id,
                "metadata": m.metadata,
            }
            for m in rows
        ]

        has_more = len(rows) == size
        next_cursor = rows[0].created_at.isoformat() if rows else None
        prev_cursor = rows[-1].created_at.isoformat() if rows else None
        return {"messages": messages, "size": size, "has_more": has_more, "next_cursor": next_cursor, "prev_cursor": prev_cursor}
            
        except Exception as e:
            logger.error(f"Error getting chat history: {str(e)}")
            raise
    
    async def mark_messages_as_read(
        self, 
        match_id: int, 
        user_id: int, 
        message_ids: List[int],
        session: AsyncSession = None
    ) -> bool:
        """Mark messages as read"""
        if not session:
            async with get_async_session() as session:
                return await self._mark_messages_as_read_internal(match_id, user_id, message_ids, session)
        
        return await self._mark_messages_as_read_internal(match_id, user_id, message_ids, session)
    
    async def _mark_messages_as_read_internal(
        self, 
        match_id: int, 
        user_id: int, 
        message_ids: List[int],
        session: AsyncSession
    ) -> bool:
        """Internal method to mark messages as read"""
        try:
            # Validate user is in match
            result = await session.execute(
                select(Match).where(
                    Match.id == match_id,
                    (Match.user1_id == user_id) | (Match.user2_id == user_id)
                )
            )
            match = result.scalar_one_or_none()
            
            if not match:
                raise ValueError("User not authorized for this match")
            
            # Mark messages as read
            await session.execute(
                update(ChatMessage)
                .where(
                    ChatMessage.id.in_(message_ids),
                    ChatMessage.match_id == match_id,
                    ChatMessage.sender_id != user_id  # Can't mark own messages as read
                )
                .values(
                    is_read=True,
                    read_at=datetime.utcnow()
                )
            )
            
            await session.commit()
            logger.info(f"Marked {len(message_ids)} messages as read by user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error marking messages as read: {str(e)}")
            return False
    
    async def get_typing_status(self, match_id: int, user_id: int, session: AsyncSession = None) -> List[int]:
        """Get typing status for a match"""
        if not session:
            async with get_async_session() as session:
                return await self._get_typing_status_internal(match_id, user_id, session)
        
        return await self._get_typing_status_internal(match_id, user_id, session)
    
    async def _get_typing_status_internal(self, match_id: int, user_id: int, session: AsyncSession) -> List[int]:
        """Internal method to get typing status"""
        try:
            # Validate user is in match
            result = await session.execute(
                select(Match).where(
                    Match.id == match_id,
                    (Match.user1_id == user_id) | (Match.user2_id == user_id)
                )
            )
            match = result.scalar_one_or_none()
            
            if not match:
                raise ValueError("User not authorized for this match")
            
            # This would typically come from WebSocket state
            # For now, return empty list
            return []
            
        except Exception as e:
            logger.error(f"Error getting typing status: {str(e)}")
            return []
    
    async def validate_user_in_match(self, match_id: int, user_id: int, session: AsyncSession = None) -> bool:
        """Validate that user is part of the specified match"""
        if not session:
            async with get_async_session() as session:
                return await self._validate_user_in_match_internal(match_id, user_id, session)
        
        return await self._validate_user_in_match_internal(match_id, user_id, session)
    
    async def _validate_user_in_match_internal(self, match_id: int, user_id: int, session: AsyncSession) -> bool:
        """Internal method to validate user in match"""
        try:
            result = await session.execute(
                select(Match).where(
                    Match.id == match_id,
                    (Match.user1_id == user_id) | (Match.user2_id == user_id)
                )
            )
            match = result.scalar_one_or_none()
            return match is not None
            
        except Exception as e:
            logger.error(f"Error validating user in match: {str(e)}")
            return False
    
    async def submit_task_completion(
        self, 
        task_id: int, 
        user_id: int, 
        submission_data: Dict[str, Any],
        session: AsyncSession = None
    ) -> Any:
        """Submit task completion via chat"""
        if not session:
            async with get_async_session() as session:
                return await self._submit_task_completion_internal(task_id, user_id, submission_data, session)
        
        return await self._submit_task_completion_internal(task_id, user_id, submission_data, session)
    
    async def _submit_task_completion_internal(
        self, 
        task_id: int, 
        user_id: int, 
        submission_data: Dict[str, Any],
        session: AsyncSession
    ) -> Any:
        """Internal method to submit task completion"""
        try:
            # Use task submission service
            submission = await task_submission_service.submit_task_completion(
                task_id, user_id, submission_data, session
            )
            
            logger.info(f"Task submission via chat: task {task_id}, user {user_id}")
            return submission
            
        except Exception as e:
            logger.error(f"Error submitting task via chat: {str(e)}")
            raise

# Global chat service instance
chat_service = ChatService() 