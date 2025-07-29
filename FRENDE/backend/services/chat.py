import logging
import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, or_
from uuid import uuid4
from models.chat import ChatMessage, ChatRoom
from models.match import Match
from models.user import User
from models.task import Task
from core.websocket import manager
from core.database import get_async_session
from core.config import settings

logger = logging.getLogger(__name__)

class ChatService:
    def __init__(self):
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
            task_id=task_id
        )
        
        session.add(chat_message)
        await session.commit()
        await session.refresh(chat_message)
        
        # Broadcast message via WebSocket
        broadcast_message = {
            "type": "chat_message",
            "message_id": chat_message.id,
            "sender_id": sender_id,
            "message": message_text,
            "task_id": task_id,
            "timestamp": chat_message.created_at.isoformat()
        }
        
        await manager.broadcast_to_match(broadcast_message, match_id)
        
        logger.info(f"Message sent in match {match_id} by user {sender_id}")
        return chat_message
    
    async def send_system_message(
        self,
        match_id: int,
        message_text: str,
        session: AsyncSession
    ) -> ChatMessage:
        """Send a system message (auto-generated)"""
        return await self.send_message(
            match_id=match_id,
            sender_id=0,  # System user ID
            message_text=message_text,
            message_type="system",
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

# Global chat service instance
chat_service = ChatService() 