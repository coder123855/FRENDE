from typing import Dict, Set, Optional, List
from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import json
import logging
from datetime import datetime
from core.database import get_async_session
from core.security import decode_jwt_token
from models.user import User
from models.match import Match
from models.chat import ChatRoom

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        # Active connections: {user_id: WebSocket}
        self.active_connections: Dict[int, WebSocket] = {}
        # User sessions: {user_id: {"user": User, "match_ids": Set[int]}}
        self.user_sessions: Dict[int, Dict] = {}
        # Room connections: {room_id: Set[user_id]}
        self.room_connections: Dict[str, Set[int]] = {}
        # Typing indicators: {room_id: Set[user_id]}
        self.typing_users: Dict[str, Set[int]] = {}

    async def connect(self, websocket: WebSocket, user_id: int, user: User):
        """Connect a user to the WebSocket manager"""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.user_sessions[user_id] = {
            "user": user,
            "match_ids": set(),
            "connected_at": datetime.utcnow()
        }
        logger.info(f"User {user_id} connected to WebSocket")

    def disconnect(self, user_id: int):
        """Disconnect a user from the WebSocket manager"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
        
        if user_id in self.user_sessions:
            # Remove user from all rooms
            user_data = self.user_sessions[user_id]
            for match_id in user_data["match_ids"]:
                room_id = f"match_{match_id}"
                if room_id in self.room_connections:
                    self.room_connections[room_id].discard(user_id)
                    if not self.room_connections[room_id]:
                        del self.room_connections[room_id]
            
            del self.user_sessions[user_id]
        
        # Remove from typing indicators
        for room_id in list(self.typing_users.keys()):
            self.typing_users[room_id].discard(user_id)
            if not self.typing_users[room_id]:
                del self.typing_users[room_id]
        
        logger.info(f"User {user_id} disconnected from WebSocket")

    async def join_room(self, user_id: int, match_id: int):
        """Add user to a chat room"""
        room_id = f"match_{match_id}"
        
        if room_id not in self.room_connections:
            self.room_connections[room_id] = set()
        
        self.room_connections[room_id].add(user_id)
        
        if user_id in self.user_sessions:
            self.user_sessions[user_id]["match_ids"].add(match_id)
        
        logger.info(f"User {user_id} joined room {room_id}")

    def leave_room(self, user_id: int, match_id: int):
        """Remove user from a chat room"""
        room_id = f"match_{match_id}"
        
        if room_id in self.room_connections:
            self.room_connections[room_id].discard(user_id)
            if not self.room_connections[room_id]:
                del self.room_connections[room_id]
        
        if user_id in self.user_sessions:
            self.user_sessions[user_id]["match_ids"].discard(match_id)
        
        logger.info(f"User {user_id} left room {room_id}")

    async def send_personal_message(self, message: dict, user_id: int):
        """Send message to a specific user"""
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
            except Exception as e:
                logger.error(f"Error sending message to user {user_id}: {e}")
                self.disconnect(user_id)

    async def broadcast_to_room(self, message: dict, room_id: str, exclude_user: Optional[int] = None):
        """Broadcast message to all users in a room"""
        if room_id in self.room_connections:
            for user_id in self.room_connections[room_id]:
                if user_id != exclude_user:
                    await self.send_personal_message(message, user_id)

    async def broadcast_to_match(self, message: dict, match_id: int, exclude_user: Optional[int] = None):
        """Broadcast message to all users in a match"""
        room_id = f"match_{match_id}"
        await self.broadcast_to_room(message, room_id, exclude_user)

    def set_typing(self, user_id: int, match_id: int, is_typing: bool):
        """Set typing indicator for a user in a match"""
        room_id = f"match_{match_id}"
        
        if room_id not in self.typing_users:
            self.typing_users[room_id] = set()
        
        if is_typing:
            self.typing_users[room_id].add(user_id)
        else:
            self.typing_users[room_id].discard(user_id)
            if not self.typing_users[room_id]:
                del self.typing_users[room_id]

    def get_typing_users(self, match_id: int) -> List[int]:
        """Get list of typing users in a match"""
        room_id = f"match_{match_id}"
        if room_id in self.typing_users:
            return list(self.typing_users[room_id])
        return []

    def get_online_users(self, match_id: int) -> List[int]:
        """Get list of online users in a match"""
        room_id = f"match_{match_id}"
        if room_id in self.room_connections:
            return list(self.room_connections[room_id])
        return []

    def is_user_online(self, user_id: int) -> bool:
        """Check if a user is online"""
        return user_id in self.active_connections

    async def authenticate_websocket(self, websocket: WebSocket) -> Optional[User]:
        """Authenticate WebSocket connection using JWT token"""
        from core.websocket_auth import websocket_auth
        return await websocket_auth.authenticate_websocket(websocket)

# Global connection manager instance
manager = ConnectionManager() 