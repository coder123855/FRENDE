from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import logging
import time
from datetime import datetime
from typing import Optional

from core.websocket import manager
from core.database import get_async_session
from core.auth import current_active_user
from models.user import User
from models.match import Match
from models.chat import ChatMessage, ChatRoom

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ws", tags=["websocket"])

@router.websocket("/chat/{match_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    match_id: int,
    session: AsyncSession = Depends(get_async_session)
):
    """WebSocket endpoint for chat room with enhanced monitoring"""
    connection_start_time = time.time()
    connection_id = None
    
    try:
        # Authenticate the WebSocket connection
        user = await manager.authenticate_websocket(websocket)
        if not user:
            return
        
        # Verify user is part of this match
        result = await session.execute(
            select(Match).where(
                (Match.user1_id == user.id) | (Match.user2_id == user.id),
                Match.id == match_id,
                Match.status == "active"
            )
        )
        match = result.scalar_one_or_none()
        
        if not match:
            await websocket.close(code=4004, reason="User not part of this match or match not active")
            return
        
        # Connect user to WebSocket manager
        await manager.connect(websocket, user.id, user)
        
        # Generate connection ID for monitoring
        connection_id = f"user_{user.id}_{int(connection_start_time)}"
        
        # Join the chat room
        await manager.join_room(user.id, match_id)
        
        # Send connection event
        from core.websocket_events import event_handler
        await event_handler.handle_connection_event(user, match_id, "connect")
        
        # Record connection in WebSocket monitor
        from core.websocket_monitor import websocket_monitor
        websocket_monitor.add_connection(
            connection_id,
            user.id,
            {
                "connection_type": "chat",
                "match_id": match_id,
                "user": user.username or user.name
            }
        )
        
        logger.info(f"WebSocket connection established for user {user.id} in match {match_id}")
        
        try:
            while True:
                # Receive message from client with timing
                receive_start = time.time()
                data = await websocket.receive_text()
                receive_end = time.time()
                receive_latency = (receive_end - receive_start) * 1000
                
                # Parse message
                try:
                    message_data = json.loads(data)
                except json.JSONDecodeError as e:
                    logger.error(f"Invalid JSON from user {user.id}: {e}")
                    manager._record_error(user.id, "json_decode_error")
                    continue
                
                # Record message in monitor
                websocket_monitor.record_message(connection_id, len(data))
                
                # Handle different message types
                await handle_websocket_message(user, match_id, message_data, session)
                
        except WebSocketDisconnect:
            # Handle disconnection
            manager.disconnect(user.id)
            manager.leave_room(user.id, match_id)
            
            # Remove from WebSocket monitor
            if connection_id:
                websocket_monitor.remove_connection(connection_id)
            
            # Send disconnection event
            from core.websocket_events import event_handler
            await event_handler.handle_connection_event(user, match_id, "disconnect")
            
            logger.info(f"WebSocket disconnected for user {user.id} in match {match_id}")
            
        except Exception as e:
            logger.error(f"WebSocket error for user {user.id}: {e}")
            manager.disconnect(user.id)
            manager.leave_room(user.id, match_id)
            
            # Record error in monitor
            if connection_id:
                websocket_monitor.record_error(connection_id)
            
            # Remove from WebSocket monitor
            if connection_id:
                websocket_monitor.remove_connection(connection_id)
            
            # Send disconnection event
            from core.websocket_events import event_handler
            await event_handler.handle_connection_event(user, match_id, "disconnect")
            
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        
        # Record error in monitor if connection was established
        if connection_id:
            from core.websocket_monitor import websocket_monitor
            websocket_monitor.record_error(connection_id)
            websocket_monitor.remove_connection(connection_id)
        
        try:
            await websocket.close(code=4005, reason="Internal server error")
        except Exception as close_error:
            logger.error(f"Failed to close WebSocket connection: {close_error}")

async def handle_websocket_message(user: User, match_id: int, message_data: dict, session: AsyncSession):
    """Handle WebSocket message with performance tracking"""
    start_time = time.time()
    
    try:
        from core.websocket_events import event_handler
        
        message_type = message_data.get("type")
        
        if message_type == "chat_message":
            await event_handler.handle_message_event(user, match_id, message_data, session)
        elif message_type == "typing_start":
            await event_handler.handle_typing_event(user, match_id, True)
        elif message_type == "typing_stop":
            await event_handler.handle_typing_event(user, match_id, False)
        elif message_type == "task_completion":
            task_id = message_data.get("task_id")
            if task_id:
                await event_handler.handle_task_completion_event(user, match_id, task_id, session)
        elif message_type == "read_receipt":
            message_id = message_data.get("message_id")
            if message_id:
                await event_handler.handle_read_receipt_event(user, match_id, message_id, session)
        elif message_type == "ping":
            # Handle ping message for connection quality monitoring
            await handle_ping_message(user, match_id, message_data)
        else:
            logger.warning(f"Unknown message type: {message_type}")
        
        # Record successful message processing
        end_time = time.time()
        processing_time = (end_time - start_time) * 1000
        
        # Update performance metrics
        from core.performance_monitor import get_performance_monitor
        performance_monitor = get_performance_monitor()
        performance_monitor.record_websocket_event(
            "message_processing",
            processing_time,
            user_id=user.id,
            room_id=f"match_{match_id}"
        )
        
    except Exception as e:
        logger.error(f"Error handling WebSocket message for user {user.id}: {e}")
        
        # Record error
        from core.websocket_monitor import websocket_monitor
        connection_id = f"user_{user.id}_{int(time.time())}"
        websocket_monitor.record_error(connection_id)
        
        # Record error in performance monitor
        from core.performance_monitor import get_performance_monitor
        performance_monitor = get_performance_monitor()
        performance_monitor.record_websocket_event(
            "message_error",
            (time.time() - start_time) * 1000,
            user_id=user.id,
            room_id=f"match_{match_id}"
        )

async def handle_ping_message(user: User, match_id: int, message_data: dict):
    """Handle ping message for connection quality monitoring"""
    try:
        ping_time = message_data.get("ping_time", time.time())
        current_time = time.time()
        latency = (current_time - ping_time) * 1000  # Convert to milliseconds
        
        # Record ping in WebSocket monitor
        from core.websocket_monitor import websocket_monitor
        connection_id = f"user_{user.id}_{int(time.time())}"
        websocket_monitor.record_ping(connection_id, latency)
        
        # Send pong response
        pong_message = {
            "type": "pong",
            "pong_time": current_time,
            "latency": latency
        }
        
        await manager.send_personal_message(pong_message, user.id)
        
        # Record pong in monitor
        websocket_monitor.record_pong(connection_id)
        
    except Exception as e:
        logger.error(f"Error handling ping message for user {user.id}: {e}")

async def handle_chat_message(user: User, match_id: int, message_data: dict, session: AsyncSession):
    """Handle chat message with enhanced monitoring"""
    start_time = time.time()
    
    try:
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
        
        # Record successful message processing
        end_time = time.time()
        processing_time = (end_time - start_time) * 1000
        
        # Update performance metrics
        from core.performance_monitor import get_performance_monitor
        performance_monitor = get_performance_monitor()
        performance_monitor.record_websocket_event(
            "chat_message",
            processing_time,
            user_id=user.id,
            room_id=f"match_{match_id}"
        )
        
        logger.info(f"Chat message processed for user {user.id} in match {match_id} in {processing_time:.2f}ms")
        
    except Exception as e:
        logger.error(f"Error handling chat message for user {user.id}: {e}")
        
        # Record error
        from core.websocket_monitor import websocket_monitor
        connection_id = f"user_{user.id}_{int(time.time())}"
        websocket_monitor.record_error(connection_id)
        
        # Record error in performance monitor
        from core.performance_monitor import get_performance_monitor
        performance_monitor = get_performance_monitor()
        performance_monitor.record_websocket_event(
            "chat_message_error",
            (time.time() - start_time) * 1000,
            user_id=user.id,
            room_id=f"match_{match_id}"
        ) 