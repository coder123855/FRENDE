from typing import Dict, Set, Optional, List
from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import json
import logging
import time
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
        # Connection quality tracking
        self.connection_quality: Dict[int, Dict] = {}
        # Message tracking for performance monitoring
        self.message_tracking: Dict[int, List[Dict]] = {}

    async def connect(self, websocket: WebSocket, user_id: int, user: User):
        """Connect a user to the WebSocket manager with enhanced monitoring"""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        self.user_sessions[user_id] = {
            "user": user,
            "match_ids": set(),
            "connected_at": datetime.utcnow()
        }
        
        # Initialize connection quality tracking
        self.connection_quality[user_id] = {
            "ping_times": [],
            "message_latencies": [],
            "error_count": 0,
            "message_count": 0,
            "last_activity": datetime.utcnow(),
            "connection_start": datetime.utcnow()
        }
        
        # Initialize message tracking
        self.message_tracking[user_id] = []
        
        # Add to WebSocket monitor
        from core.websocket_monitor import websocket_monitor
        connection_id = f"user_{user_id}_{int(time.time())}"
        websocket_monitor.add_connection(
            connection_id, 
            user_id, 
            {"connection_type": "chat", "user": user.username or user.name}
        )
        
        logger.info(f"User {user_id} connected to WebSocket")

    def disconnect(self, user_id: int):
        """Disconnect a user from the WebSocket manager with cleanup"""
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
        
        # Clean up quality tracking
        if user_id in self.connection_quality:
            del self.connection_quality[user_id]
        
        # Clean up message tracking
        if user_id in self.message_tracking:
            del self.message_tracking[user_id]
        
        logger.info(f"User {user_id} disconnected from WebSocket")

    async def join_room(self, user_id: int, match_id: int):
        """Add user to a chat room with monitoring"""
        room_id = f"match_{match_id}"
        
        if room_id not in self.room_connections:
            self.room_connections[room_id] = set()
        
        self.room_connections[room_id].add(user_id)
        
        if user_id in self.user_sessions:
            self.user_sessions[user_id]["match_ids"].add(match_id)
        
        # Update WebSocket monitor
        from core.websocket_monitor import websocket_monitor
        connection_id = f"user_{user_id}_{int(time.time())}"
        connection = websocket_monitor.get_connection(connection_id)
        if connection:
            connection.add_room(room_id)
        
        logger.info(f"User {user_id} joined room {room_id}")

    def leave_room(self, user_id: int, match_id: int):
        """Remove user from a chat room with monitoring"""
        room_id = f"match_{match_id}"
        
        if room_id in self.room_connections:
            self.room_connections[room_id].discard(user_id)
            if not self.room_connections[room_id]:
                del self.room_connections[room_id]
        
        if user_id in self.user_sessions:
            self.user_sessions[user_id]["match_ids"].discard(match_id)
        
        # Update WebSocket monitor
        from core.websocket_monitor import websocket_monitor
        connection_id = f"user_{user_id}_{int(time.time())}"
        connection = websocket_monitor.get_connection(connection_id)
        if connection:
            connection.remove_room(room_id)
        
        logger.info(f"User {user_id} left room {room_id}")

    async def send_personal_message(self, message: dict, user_id: int):
        """Send a personal message to a specific user with performance tracking"""
        if user_id in self.active_connections:
            try:
                start_time = time.time()
                message_json = json.dumps(message)
                await self.active_connections[user_id].send_text(message_json)
                
                # Track message performance
                end_time = time.time()
                latency = (end_time - start_time) * 1000  # Convert to milliseconds
                
                # Update connection quality
                if user_id in self.connection_quality:
                    self.connection_quality[user_id]["message_latencies"].append(latency)
                    self.connection_quality[user_id]["message_count"] += 1
                    self.connection_quality[user_id]["last_activity"] = datetime.utcnow()
                    
                    # Keep only last 100 latencies
                    if len(self.connection_quality[user_id]["message_latencies"]) > 100:
                        self.connection_quality[user_id]["message_latencies"] = \
                            self.connection_quality[user_id]["message_latencies"][-100:]
                
                # Update WebSocket monitor
                from core.websocket_monitor import websocket_monitor
                connection_id = f"user_{user_id}_{int(time.time())}"
                websocket_monitor.record_message(connection_id, len(message_json))
                
                # Track message for analytics
                self._track_message(user_id, "send", len(message_json), latency)
                
                return True
            except Exception as e:
                logger.error(f"Error sending personal message to user {user_id}: {e}")
                self._record_error(user_id, "send_error")
                return False
        return False

    async def broadcast_to_room(self, message: dict, room_id: str, exclude_user: Optional[int] = None):
        """Broadcast message to all users in a room with performance tracking"""
        if room_id in self.room_connections:
            message_json = json.dumps(message)
            message_size = len(message_json)
            sent_count = 0
            error_count = 0
            
            for user_id in self.room_connections[room_id]:
                if exclude_user and user_id == exclude_user:
                    continue
                
                try:
                    start_time = time.time()
                    await self.active_connections[user_id].send_text(message_json)
                    end_time = time.time()
                    latency = (end_time - start_time) * 1000
                    
                    # Update connection quality
                    if user_id in self.connection_quality:
                        self.connection_quality[user_id]["message_latencies"].append(latency)
                        self.connection_quality[user_id]["message_count"] += 1
                        self.connection_quality[user_id]["last_activity"] = datetime.utcnow()
                        
                        # Keep only last 100 latencies
                        if len(self.connection_quality[user_id]["message_latencies"]) > 100:
                            self.connection_quality[user_id]["message_latencies"] = \
                                self.connection_quality[user_id]["message_latencies"][-100:]
                    
                    # Update WebSocket monitor
                    from core.websocket_monitor import websocket_monitor
                    connection_id = f"user_{user_id}_{int(time.time())}"
                    websocket_monitor.record_message(connection_id, message_size)
                    
                    # Track message for analytics
                    self._track_message(user_id, "broadcast", message_size, latency)
                    
                    sent_count += 1
                except Exception as e:
                    logger.error(f"Error broadcasting to user {user_id}: {e}")
                    self._record_error(user_id, "broadcast_error")
                    error_count += 1
            
            logger.info(f"Broadcast to room {room_id}: {sent_count} sent, {error_count} errors")
            return sent_count > 0
        return False

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

    def get_connection_quality(self, user_id: int) -> Optional[Dict]:
        """Get connection quality metrics for a user"""
        if user_id in self.connection_quality:
            quality = self.connection_quality[user_id].copy()
            
            # Calculate average latency
            if quality["message_latencies"]:
                quality["avg_latency"] = sum(quality["message_latencies"]) / len(quality["message_latencies"])
            else:
                quality["avg_latency"] = 0
            
            # Calculate error rate
            total_operations = quality["message_count"] + quality["error_count"]
            if total_operations > 0:
                quality["error_rate"] = quality["error_count"] / total_operations
            else:
                quality["error_rate"] = 0
            
            # Calculate connection duration
            quality["connection_duration"] = (datetime.utcnow() - quality["connection_start"]).total_seconds()
            
            return quality
        return None

    def get_room_stats(self, room_id: str) -> Dict:
        """Get statistics for a specific room"""
        if room_id not in self.room_connections:
            return {"user_count": 0, "avg_quality": 0, "total_messages": 0}
        
        user_count = len(self.room_connections[room_id])
        total_messages = 0
        total_errors = 0
        quality_scores = []
        
        for user_id in self.room_connections[room_id]:
            quality = self.get_connection_quality(user_id)
            if quality:
                total_messages += quality["message_count"]
                total_errors += quality["error_count"]
                
                # Calculate quality score (0-100)
                if quality["avg_latency"] < 100:
                    latency_score = 100
                elif quality["avg_latency"] < 500:
                    latency_score = 75
                elif quality["avg_latency"] < 1000:
                    latency_score = 50
                else:
                    latency_score = 25
                
                error_score = max(0, 100 - (quality["error_rate"] * 1000))
                quality_score = (latency_score + error_score) / 2
                quality_scores.append(quality_score)
        
        avg_quality = sum(quality_scores) / len(quality_scores) if quality_scores else 0
        
        return {
            "user_count": user_count,
            "avg_quality": avg_quality,
            "total_messages": total_messages,
            "total_errors": total_errors,
            "error_rate": total_errors / (total_messages + total_errors) if (total_messages + total_errors) > 0 else 0
        }

    def _track_message(self, user_id: int, message_type: str, size: int, latency: float):
        """Track message for analytics"""
        if user_id in self.message_tracking:
            self.message_tracking[user_id].append({
                "type": message_type,
                "size": size,
                "latency": latency,
                "timestamp": datetime.utcnow()
            })
            
            # Keep only last 1000 messages
            if len(self.message_tracking[user_id]) > 1000:
                self.message_tracking[user_id] = self.message_tracking[user_id][-1000:]

    def _record_error(self, user_id: int, error_type: str):
        """Record an error for a user"""
        if user_id in self.connection_quality:
            self.connection_quality[user_id]["error_count"] += 1
        
        # Update WebSocket monitor
        from core.websocket_monitor import websocket_monitor
        connection_id = f"user_{user_id}_{int(time.time())}"
        websocket_monitor.record_error(connection_id)
        
        logger.warning(f"WebSocket error for user {user_id}: {error_type}")

    async def authenticate_websocket(self, websocket: WebSocket) -> Optional[User]:
        """Authenticate WebSocket connection using JWT token"""
        from core.websocket_auth import websocket_auth
        return await websocket_auth.authenticate_websocket(websocket)

    def get_performance_summary(self) -> Dict:
        """Get performance summary for all connections"""
        total_connections = len(self.active_connections)
        total_messages = 0
        total_errors = 0
        avg_latency = 0
        latency_count = 0
        
        for user_id in self.connection_quality:
            quality = self.connection_quality[user_id]
            total_messages += quality["message_count"]
            total_errors += quality["error_count"]
            
            if quality["message_latencies"]:
                avg_latency += sum(quality["message_latencies"])
                latency_count += len(quality["message_latencies"])
        
        if latency_count > 0:
            avg_latency /= latency_count
        
        return {
            "total_connections": total_connections,
            "total_messages": total_messages,
            "total_errors": total_errors,
            "error_rate": total_errors / (total_messages + total_errors) if (total_messages + total_errors) > 0 else 0,
            "avg_latency_ms": avg_latency
        }

# Global connection manager instance
manager = ConnectionManager() 