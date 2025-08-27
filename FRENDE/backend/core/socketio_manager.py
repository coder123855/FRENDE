"""
Socket.IO Manager for Frende Backend
Provides Socket.IO functionality to replace WebSocket manager
"""

import logging
import asyncio
from typing import Dict, List, Set, Optional, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class SocketIOManager:
    """Manager for Socket.IO operations"""
    
    def __init__(self):
        self.room_connections: Dict[str, Set[str]] = {}
        self.typing_users: Dict[str, Set[int]] = {}
        self.user_sessions: Dict[int, str] = {}  # user_id -> session_id
        self._sio = None  # Will be set later to avoid circular imports
    
    def set_sio(self, sio):
        """Set the Socket.IO instance"""
        self._sio = sio
    
    def get_online_users(self, match_id: str) -> List[int]:
        """Get list of online users in a match room"""
        if match_id in self.room_connections:
            online_user_ids = []
            for session_id in self.room_connections[match_id]:
                # For now, return session IDs as placeholders
                # This will be updated when we have access to connected_users
                online_user_ids.append(session_id)
            return online_user_ids
        return []
    
    def get_typing_users(self, match_id: str) -> List[int]:
        """Get list of users currently typing in a match room"""
        return list(self.typing_users.get(match_id, set()))
    
    def set_typing(self, user_id: int, match_id: str, is_typing: bool) -> None:
        """Set typing status for a user in a match room"""
        if match_id not in self.typing_users:
            self.typing_users[match_id] = set()
        
        if is_typing:
            self.typing_users[match_id].add(user_id)
        else:
            self.typing_users[match_id].discard(user_id)
    
    async def broadcast_to_match(self, event: str, match_id: str, data: Dict[str, Any] = None) -> None:
        """Broadcast an event to all users in a match room"""
        room_name = f"match_{match_id}"
        
        try:
            if data is None:
                data = {}
            
            # Add timestamp if not present
            if 'timestamp' not in data:
                data['timestamp'] = datetime.utcnow().isoformat()
            
            if self._sio:
                await self._sio.emit(event, data, room=room_name)
                logger.info(f"Broadcasted {event} to room {room_name}")
            else:
                logger.warning(f"Socket.IO not initialized, skipping broadcast of {event} to room {room_name}")
            
        except Exception as e:
            logger.error(f"Error broadcasting {event} to room {room_name}: {e}")
    
    async def send_to_user(self, user_id: int, event: str, data: Dict[str, Any] = None) -> None:
        """Send an event to a specific user"""
        session_id = self.user_sessions.get(user_id)
        if session_id and self._sio:
            try:
                if data is None:
                    data = {}
                
                # Add timestamp if not present
                if 'timestamp' not in data:
                    data['timestamp'] = datetime.utcnow().isoformat()
                
                await self._sio.emit(event, data, room=session_id)
                logger.info(f"Sent {event} to user {user_id}")
                
            except Exception as e:
                logger.error(f"Error sending {event} to user {user_id}: {e}")
        else:
            logger.warning(f"User {user_id} not connected or Socket.IO not initialized")
    
    def add_user_to_room(self, user_id: int, session_id: str, match_id: str) -> None:
        """Add a user to a match room"""
        room_name = f"match_{match_id}"
        
        if match_id not in self.room_connections:
            self.room_connections[match_id] = set()
        
        self.room_connections[match_id].add(session_id)
        self.user_sessions[user_id] = session_id
        
        logger.info(f"User {user_id} added to room {room_name}")
    
    def remove_user_from_room(self, user_id: int, session_id: str, match_id: str) -> None:
        """Remove a user from a match room"""
        room_name = f"match_{match_id}"
        
        if match_id in self.room_connections:
            self.room_connections[match_id].discard(session_id)
            
            # Remove empty rooms
            if not self.room_connections[match_id]:
                del self.room_connections[match_id]
        
        # Remove from typing users
        if match_id in self.typing_users:
            self.typing_users[match_id].discard(user_id)
            
            # Remove empty typing sets
            if not self.typing_users[match_id]:
                del self.typing_users[match_id]
        
        # Remove user session
        if user_id in self.user_sessions:
            del self.user_sessions[user_id]
        
        logger.info(f"User {user_id} removed from room {room_name}")
    
    def get_room_stats(self, match_id: str) -> Dict[str, Any]:
        """Get statistics for a match room"""
        online_count = len(self.room_connections.get(match_id, set()))
        typing_count = len(self.typing_users.get(match_id, set()))
        
        return {
            "match_id": match_id,
            "online_users": online_count,
            "typing_users": typing_count,
            "online_user_ids": self.get_online_users(match_id),
            "typing_user_ids": self.get_typing_users(match_id)
        }
    
    def get_all_stats(self) -> Dict[str, Any]:
        """Get statistics for all rooms"""
        return {
            "total_rooms": len(self.room_connections),
            "total_connected_users": len(self.user_sessions),
            "rooms": {
                match_id: self.get_room_stats(match_id)
                for match_id in self.room_connections.keys()
            }
        }

# Global Socket.IO manager instance
manager = SocketIOManager()
