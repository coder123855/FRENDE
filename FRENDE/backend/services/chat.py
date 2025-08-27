import logging
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_, update, desc
from sqlalchemy.orm import selectinload, joinedload
from uuid import uuid4
from models.chat import ChatMessage, ChatRoom
from models.match import Match
from models.user import User
from models.task import Task
from core.socketio_manager import manager
from core.database import get_async_session, async_session
from core.config import settings
from core.performance_monitor import performance_monitor
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
            async with async_session() as session:
                return await self._create_chat_room_internal(match, session)
        
        return await self._create_chat_room_internal(match, session)
    
    async def _create_chat_room_internal(
        self,
        match: Match,
        session: AsyncSession
    ) -> ChatRoom:
        """Internal method to create chat room"""
        room_id = f"match_{match.id}_{uuid4().hex[:8]}"
        
        chat_room = ChatRoom(
            room_id=room_id,
            match_id=match.id,
            is_active=True
        )
        
        session.add(chat_room)
        await session.commit()
        await session.refresh(chat_room)
        
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
            async with async_session() as db_session:
                session = db_session
        
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
        
        online_users = manager.get_online_users(str(match_id))
        typing_users = manager.get_typing_users(str(match_id))
        
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
        manager.set_typing(user_id, str(match_id), is_typing)
    
    async def get_typing_users(self, match_id: int) -> List[int]:
        """Get users currently typing in a chat room"""
        return manager.get_typing_users(str(match_id))
    
    async def send_message(
        self,
        match_id: int,
        sender_id: int,
        message_text: str,
        message_type: str = "text",
        task_id: Optional[int] = None,
        session: AsyncSession = None
    ) -> ChatMessage:
        """Send a message in a chat room"""
        if not session:
            async with get_async_session() as session:
                return await self._send_message_internal(match_id, sender_id, message_text, message_type, task_id, session)
        
        return await self._send_message_internal(match_id, sender_id, message_text, message_type, task_id, session)
    
    async def _send_message_internal(
        self,
        match_id: int,
        sender_id: int,
        message_text: str,
        message_type: str = "text",
        task_id: Optional[int] = None,
        session: AsyncSession = None
    ) -> ChatMessage:
        """Internal method to send message with optimized query"""
        async with performance_monitor("send_message", user_id=sender_id):
            # Validate message length
            if len(message_text) > self.max_message_length:
                raise ValueError(f"Message too long. Maximum length is {self.max_message_length} characters")
            
            # Create message with optimized query
            message = ChatMessage(
                match_id=match_id,
                sender_id=sender_id,
                message_text=message_text,
                message_type=message_type,
                task_id=task_id,
                is_read=False,
                is_system_message=message_type == "system"
            )
            
            session.add(message)
            await session.commit()
            await session.refresh(message)
            
            # Load sender information with eager loading
            await session.execute(
                select(ChatMessage)
                .where(ChatMessage.id == message.id)
                .options(selectinload(ChatMessage.sender))
            )
            
            # Emit to Socket.IO
            await self._emit_message_to_room(match_id, message)
            
            return message
    
    async def _emit_message_to_room(self, match_id: int, message: ChatMessage):
        """Emit message to Socket.IO room"""
        try:
            message_data = {
                "type": "chat_message",
                "message": {
                    "id": message.id,
                        "sender_id": message.sender_id,
                        "message_text": message.message_text,
                        "message_type": message.message_type,
                        "timestamp": message.created_at.isoformat()
                }
            }
            
            await manager.broadcast_to_match("chat_message", str(match_id), message_data)
            logger.info(f"Emitted message {message.id} to match {match_id}")
            
        except Exception as e:
            logger.error(f"Error emitting message to room {match_id}: {e}")
    
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
            
            # Notify users through Socket.IO
            await manager.broadcast_to_match(
                "chat_message",
                str(match_id),
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
            
            await manager.broadcast_to_match("read_receipt", str(message.match_id), read_message)
            return True
        
        return False
    
    async def get_unread_count(
        self,
        match_id: int,
        user_id: int,
        session: AsyncSession = None
    ) -> int:
        """Get count of unread messages for a user in a match"""
        if not session:
            async with get_async_session() as session:
                return await self._get_unread_count_internal(match_id, user_id, session)
        
        return await self._get_unread_count_internal(match_id, user_id, session)
    
    async def _get_unread_count_internal(
        self,
        match_id: int,
        user_id: int,
        session: AsyncSession
    ) -> int:
        """Internal method to get unread count with optimized query"""
        async with performance_monitor("get_unread_count", user_id=user_id):
            result = await session.execute(
                select(func.count(ChatMessage.id))
                .where(
                    and_(
                        ChatMessage.match_id == match_id,
                        ChatMessage.sender_id != user_id,
                        ChatMessage.is_read == False
                    )
                )
            )
            return result.scalar() or 0
    
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
        
        await manager.broadcast_to_match("new_task", str(match_id), task_message)
    
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
        
        await manager.broadcast_to_match("task_completion", str(match_id), completion_message)
    
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
        limit: int = 50,
        offset: int = 0,
        include_system: bool = False,
        session: AsyncSession = None
    ) -> List[ChatMessage]:
        """Get chat history with optimized query and eager loading"""
        if not session:
            async with get_async_session() as session:
                return await self._get_chat_history_internal(match_id, session, limit, offset, include_system)
        
        return await self._get_chat_history_internal(match_id, session, limit, offset, include_system)
    
    async def _get_chat_history_internal(
        self,
        match_id: int,
        session: AsyncSession,
        limit: int = 50,
        offset: int = 0,
        include_system: bool = False
    ) -> List[ChatMessage]:
        """Internal method to get chat history with optimized query"""
        # Build optimized query using indexes
        query = (
            select(ChatMessage)
            .where(ChatMessage.match_id == match_id)
            .options(
                selectinload(ChatMessage.sender),
                selectinload(ChatMessage.task)
            )
            .order_by(desc(ChatMessage.created_at))
            .offset(offset)
            .limit(limit)
        )
        
        if not include_system:
            query = query.where(ChatMessage.is_system_message == False)
        
        result = await session.execute(query)
        messages = result.scalars().all()
        
        # Reverse to get chronological order
        return list(reversed(messages))
    
    async def get_chat_history_paginated(
        self,
        match_id: int,
        user_id: int,
        page: int = 1,
        size: int = 50,
        include_system: bool = False,
        session: AsyncSession = None
    ) -> Dict[str, Any]:
        """Get paginated chat history with optimized query"""
        if not session:
            async with async_session() as session:
                return await self._get_chat_history_paginated_internal(match_id, user_id, page, size, include_system, session)
        
        return await self._get_chat_history_paginated_internal(match_id, user_id, page, size, include_system, session)
    
    async def _get_chat_history_paginated_internal(
        self,
        match_id: int,
        user_id: int,
        session: AsyncSession,
        page: int = 1,
        size: int = 50,
        include_system: bool = False
    ) -> Dict[str, Any]:
        """Internal method to get paginated chat history with optimized query"""
        try:
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
            
            # Get total count with optimized query
            count_query = select(func.count(ChatMessage.id)).where(ChatMessage.match_id == match_id)
            if not include_system:
                count_query = count_query.where(ChatMessage.is_system_message == False)
            
            result = await session.execute(count_query)
            total = result.scalar()
            
            # Get messages with eager loading
            messages = await self._get_chat_history_internal(match_id, session, size, offset, include_system)
            
            return {
                "messages": messages,
                "page": page,
                "size": size,
                "total": total,
                "has_more": offset + size < total,
                "next_cursor": f"page_{page + 1}" if offset + size < total else None,
                "prev_cursor": f"page_{page - 1}" if page > 1 else None
            }
        except Exception as e:
            logger.error(f"Error getting chat history: {str(e)}")
            raise
    
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
            async with async_session() as session:
                return await self._get_chat_history_cursor_internal(match_id, user_id, cursor, size, direction, include_system, session)
        return await self._get_chat_history_cursor_internal(match_id, user_id, cursor, size, direction, include_system, session)

    async def _get_chat_history_cursor_internal(self, match_id: int, user_id: int, cursor: Optional[datetime], size: int, direction: str, include_system: bool, session: AsyncSession) -> Dict[str, Any]:
        try:
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
        message_ids: Optional[List[int]] = None,
        session: AsyncSession = None
    ) -> int:
        """Mark messages as read with optimized query"""
        if not session:
            async with get_async_session() as session:
                return await self._mark_messages_as_read_internal(match_id, user_id, message_ids, session)
        
        return await self._mark_messages_as_read_internal(match_id, user_id, message_ids, session)
    
    async def _mark_messages_as_read_internal(
        self,
        match_id: int,
        user_id: int,
        session: AsyncSession,
        message_ids: Optional[List[int]] = None
    ) -> int:
        """Internal method to mark messages as read with optimized query"""
        async with performance_monitor("mark_messages_as_read", user_id=user_id):
            # Build optimized query using indexes
            query = (
                update(ChatMessage)
                .where(
                    and_(
                        ChatMessage.match_id == match_id,
                        ChatMessage.sender_id != user_id,
                        ChatMessage.is_read == False
                    )
                )
                .values(
                    is_read=True,
                    read_at=datetime.utcnow()
                )
            )
            
            if message_ids:
                query = query.where(ChatMessage.id.in_(message_ids))
            
            result = await session.execute(query)
            await session.commit()
            
            return result.rowcount
    
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
    
    async def validate_user_in_match(
        self,
        match_id: int,
        user_id: int,
        session: AsyncSession = None
    ) -> bool:
        """Validate user is in match with optimized query"""
        if not session:
            async with get_async_session() as session:
                return await self._validate_user_in_match_internal(match_id, user_id, session)
        
        return await self._validate_user_in_match_internal(match_id, user_id, session)
    
    async def _validate_user_in_match_internal(
        self,
        match_id: int,
        user_id: int,
        session: AsyncSession
    ) -> bool:
        """Internal method to validate user in match with optimized query"""
        async with performance_monitor("validate_user_in_match", user_id=user_id):
            result = await session.execute(
                select(Match)
                .where(
                    and_(
                        Match.id == match_id,
                        or_(Match.user1_id == user_id, Match.user2_id == user_id)
                    )
                )
            )
            return result.scalar_one_or_none() is not None
    
    async def submit_task_completion(
        self,
        task_id: int,
        user_id: int,
        submission_data: Dict[str, Any],
        session: AsyncSession = None
    ) -> Any:
        """Submit task completion via chat with optimized query"""
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
        """Internal method to submit task completion with optimized query"""
        async with performance_monitor("submit_task_completion", user_id=user_id):
            try:
                # Use task submission service with optimized query
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