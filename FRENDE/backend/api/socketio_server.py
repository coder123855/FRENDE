import socketio
import asyncio
import json
import logging
import time
from typing import Dict, List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_async_session, async_session
from core.auth import get_current_user
from models.user import User
from models.match import Match
from models.chat import ChatMessage

logger = logging.getLogger(__name__)

# Connection quality tracking
connection_quality: Dict[str, Dict] = {}
message_tracking: Dict[str, List] = {}

# Health check interval
HEALTH_CHECK_INTERVAL = 30  # seconds

# Create Socket.IO server
sio = socketio.AsyncServer(
    cors_allowed_origins=[
        "http://localhost:3000", 
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ],
    async_mode='asgi'
)

# Store connected users and their rooms
connected_users: Dict[str, Dict] = {}
user_rooms: Dict[str, List[str]] = {}

@sio.event
async def connect(sid, environ, auth):
    """Handle client connection"""
    try:
        logger.info(f"🔌 Socket.IO: Connection attempt from {sid}")
        logger.info(f"🔌 Socket.IO: Environment keys: {list(environ.keys())}")
        
        # Extract token from query parameters or headers
        token = None
        if 'HTTP_AUTHORIZATION' in environ:
            auth_header = environ['HTTP_AUTHORIZATION']
            logger.info(f"🔌 Socket.IO: Auth header found: {auth_header[:20]}...")
            if auth_header.startswith('Bearer '):
                token = auth_header[7:]
        elif 'QUERY_STRING' in environ:
            query_string = environ['QUERY_STRING']
            logger.info(f"🔌 Socket.IO: Query string: {query_string}")
            if 'token=' in query_string:
                token = query_string.split('token=')[1].split('&')[0]
        
        logger.info(f"🔌 Socket.IO: Token extracted: {token[:20] if token else 'None'}...")
        
        if not token:
            logger.warning(f"Connection attempt without token from {sid}")
            return False
        
        # Verify token and get user
        async with async_session() as session:
            try:
                # Create a mock credentials object for the token
                from fastapi.security import HTTPAuthorizationCredentials
                credentials = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
                
                user = await get_current_user(credentials, session)
                if not user:
                    logger.warning(f"Invalid token from {sid}")
                    return False
                
                # Store user connection info
                connected_users[sid] = {
                    'user_id': user.id,
                    'username': user.username or user.name,
                    'connected_at': datetime.utcnow()
                }
                
                # Initialize connection quality tracking
                connection_quality[sid] = {
                    "ping_times": [],
                    "message_latencies": [],
                    "error_count": 0,
                    "message_count": 0,
                    "last_activity": datetime.utcnow(),
                    "connection_start": datetime.utcnow()
                }
                
                # Initialize message tracking
                message_tracking[sid] = []
                
                # Start health check if not already running
                if not hasattr(sio, '_health_check_task'):
                    sio._health_check_task = asyncio.create_task(health_check_loop())
                
                logger.info(f"User {user.username} connected with sid {sid}")
                return True
                
            except Exception as e:
                logger.error(f"Error authenticating user: {e}")
                return False
    
    except Exception as e:
        logger.error(f"Error in connect handler: {e}")
        return False

@sio.event
async def disconnect(sid):
    """Handle client disconnection"""
    try:
        if sid in connected_users:
            user_info = connected_users[sid]
            logger.info(f"User {user_info['username']} disconnected")
            
            # Remove from all rooms
            if sid in user_rooms:
                for room in user_rooms[sid]:
                    await sio.leave_room(sid, room)
                del user_rooms[sid]
            
            del connected_users[sid]
            
            # Clean up tracking
            if sid in connection_quality:
                del connection_quality[sid]
            if sid in message_tracking:
                del message_tracking[sid]
    
    except Exception as e:
        logger.error(f"Error in disconnect handler: {e}")

@sio.event
async def join_chat_room(sid, data):
    """Join a chat room for a specific match"""
    try:
        if sid not in connected_users:
            await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
            return
        
        match_id = data.get('match_id')
        if not match_id:
            await sio.emit('error', {'message': 'Match ID required'}, room=sid)
            return
        
        user_info = connected_users[sid]
        user_id = user_info['user_id']
        
        # Verify user is part of this match
        async with async_session() as session:
            result = await session.execute(
                select(Match).where(
                    (Match.user1_id == user_id) | (Match.user2_id == user_id),
                    Match.id == match_id,
                    Match.status == "active"
                )
            )
            match = result.scalar_one_or_none()
            
            if not match:
                await sio.emit('error', {'message': 'User not part of this match or match not active'}, room=sid)
                return
            
            # Join the room
            room_name = f"chat_{match_id}"
            await sio.enter_room(sid, room_name)
            
            # Store room info
            if sid not in user_rooms:
                user_rooms[sid] = []
            user_rooms[sid].append(room_name)
            
            # Notify others in the room
            await sio.emit('user_joined', {
                'user_id': user_id,
                'username': user_info['username']
            }, room=room_name, skip_sid=sid)
            
            # Send online users list
            online_users = []
            # Get online users from our tracking
            for sid, user_info in connected_users.items():
                if sid in user_rooms and room_name in user_rooms[sid]:
                    online_users.append({
                        'user_id': user_info['user_id'],
                        'username': user_info['username']
                    })
            
            await sio.emit('online_users', online_users, room=sid)
            
            logger.info(f"User {user_info['username']} joined chat room {match_id}")
    
    except Exception as e:
        logger.error(f"Error joining chat room: {e}")
        await sio.emit('error', {'message': 'Failed to join chat room'}, room=sid)

@sio.event
async def leave_chat_room(sid, data):
    """Leave a chat room"""
    try:
        match_id = data.get('match_id')
        if not match_id:
            return
        
        room_name = f"chat_{match_id}"
        await sio.leave_room(sid, room_name)
        
        # Remove from user_rooms
        if sid in user_rooms and room_name in user_rooms[sid]:
            user_rooms[sid].remove(room_name)
        
        # Notify others in the room
        if sid in connected_users:
            user_info = connected_users[sid]
            await sio.emit('user_left', {
                'user_id': user_info['user_id'],
                'username': user_info['username']
            }, room=room_name, skip_sid=sid)
        
        logger.info(f"User left chat room {match_id}")
    
    except Exception as e:
        logger.error(f"Error leaving chat room: {e}")

@sio.event
async def send_message(sid, data):
    """Send a message to a chat room"""
    start_time = time.time()
    
    try:
        if sid not in connected_users:
            await sio.emit('error', {'message': 'Not authenticated'}, room=sid)
            return
        
        match_id = data.get('match_id')
        message_text = data.get('message')
        message_type = data.get('type', 'text')
        task_id = data.get('task_id')
        temp_id = data.get('temp_id')
        
        if not match_id or not message_text:
            await sio.emit('error', {'message': 'Match ID and message required'}, room=sid)
            return
        
        user_info = connected_users[sid]
        user_id = user_info['user_id']
        
        # Save message to database
        async with async_session() as session:
            try:
                # Verify user is part of this match
                result = await session.execute(
                    select(Match).where(
                        (Match.user1_id == user_id) | (Match.user2_id == user_id),
                        Match.id == match_id,
                        Match.status == "active"
                    )
                )
                match = result.scalar_one_or_none()
                
                if not match:
                    await sio.emit('error', {'message': 'User not part of this match'}, room=sid)
                    return
                
                # Create chat message
                chat_message = ChatMessage(
                    match_id=match_id,
                    sender_id=user_id,
                    message_text=message_text,
                    message_type=message_type,
                    task_id=task_id,
                    created_at=datetime.utcnow()
                )
                
                session.add(chat_message)
                await session.commit()
                await session.refresh(chat_message)
                
                # Track performance
                end_time = time.time()
                latency = (end_time - start_time) * 1000
                
                if sid in connection_quality:
                    connection_quality[sid]["message_latencies"].append(latency)
                    connection_quality[sid]["message_count"] += 1
                    connection_quality[sid]["last_activity"] = datetime.utcnow()
                    
                    # Keep only last 100 latencies
                    if len(connection_quality[sid]["message_latencies"]) > 100:
                        connection_quality[sid]["message_latencies"] = \
                            connection_quality[sid]["message_latencies"][-100:]
                
                # Track message for analytics
                if sid in message_tracking:
                    message_tracking[sid].append({
                        "type": "send",
                        "size": len(message_text),
                        "latency": latency,
                        "timestamp": datetime.utcnow()
                    })
                
                # Send acknowledgment to sender
                await sio.emit('message_ack', {
                    'message_id': chat_message.id,
                    'temp_id': temp_id,
                    'success': True,
                    'timestamp': datetime.utcnow().isoformat()
                }, room=sid)
                
                # Broadcast message to room
                room_name = f"chat_{match_id}"
                message_data = {
                    'message_id': chat_message.id,
                    'sender_id': user_id,
                    'sender_name': user_info['username'],
                    'message': message_text,
                    'message_type': message_type,
                    'task_id': task_id,
                    'timestamp': chat_message.created_at.isoformat(),
                    'is_read': False
                }
                
                await sio.emit('new_message', message_data, room=room_name)
                
                logger.info(f"Message sent by {user_info['username']} in match {match_id}")
                
            except Exception as e:
                logger.error(f"Error saving message: {e}")
                
                # Send error acknowledgment
                await sio.emit('message_ack', {
                    'message_id': None,
                    'temp_id': temp_id,
                    'success': False,
                    'error': str(e),
                    'timestamp': datetime.utcnow().isoformat()
                }, room=sid)
                
                await sio.emit('error', {'message': 'Failed to send message'}, room=sid)
    
    except Exception as e:
        logger.error(f"Error in send_message: {e}")
        await sio.emit('error', {'message': 'Failed to send message'}, room=sid)

@sio.event
async def typing_start(sid, data):
    """Handle typing start event"""
    try:
        match_id = data.get('match_id')
        if not match_id or sid not in connected_users:
            return
        
        user_info = connected_users[sid]
        room_name = f"chat_{match_id}"
        
        await sio.emit('typing_start', {
            'user_id': user_info['user_id'],
            'username': user_info['username']
        }, room=room_name, skip_sid=sid)
    
    except Exception as e:
        logger.error(f"Error in typing_start: {e}")

@sio.event
async def typing_stop(sid, data):
    """Handle typing stop event"""
    try:
        match_id = data.get('match_id')
        if not match_id or sid not in connected_users:
            return
        
        user_info = connected_users[sid]
        room_name = f"chat_{match_id}"
        
        await sio.emit('typing_stop', {
            'user_id': user_info['user_id'],
            'username': user_info['username']
        }, room=room_name, skip_sid=sid)
    
    except Exception as e:
        logger.error(f"Error in typing_stop: {e}")

@sio.event
async def mark_messages_read(sid, data):
    """Mark messages as read"""
    try:
        match_id = data.get('match_id')
        message_ids = data.get('message_ids', [])
        
        if not match_id or sid not in connected_users:
            return
        
        user_info = connected_users[sid]
        user_id = user_info['user_id']
        
        # Update messages in database
        async with async_session() as session:
            try:
                # Mark messages as read
                await session.execute(
                    "UPDATE chat_messages SET is_read = true WHERE id = ANY(:message_ids) AND match_id = :match_id",
                    {'message_ids': message_ids, 'match_id': match_id}
                )
                await session.commit()
                
                # Notify others in the room
                room_name = f"chat_{match_id}"
                await sio.emit('messages_read', {
                    'user_id': user_id,
                    'message_ids': message_ids
                }, room=room_name, skip_sid=sid)
                
            except Exception as e:
                logger.error(f"Error marking messages as read: {e}")
    
    except Exception as e:
        logger.error(f"Error in mark_messages_read: {e}")

async def health_check_loop():
    """Periodic health check and cleanup"""
    while True:
        try:
            current_time = datetime.utcnow()
            
            # Clean up inactive connections
            inactive_sids = []
            for sid, quality in connection_quality.items():
                idle_time = (current_time - quality["last_activity"]).total_seconds()
                if idle_time > 3600:  # 1 hour
                    inactive_sids.append(sid)
            
            for sid in inactive_sids:
                await sio.disconnect(sid)
            
            # Log health metrics
            active_connections = len(connection_quality)
            total_messages = sum(q["message_count"] for q in connection_quality.values())
            
            logger.info(f"Health check: {active_connections} active connections, {total_messages} total messages")
            
        except Exception as e:
            logger.error(f"Health check error: {e}")
        
        await asyncio.sleep(HEALTH_CHECK_INTERVAL)



# Error handler
@sio.event
async def error(sid, data):
    """Handle errors"""
    logger.error(f"Socket.IO error for {sid}: {data}")
    await sio.emit('error', {'message': 'Internal server error'}, room=sid)

# Initialize Socket.IO manager
from core.socketio_manager import manager
manager.set_sio(sio)
