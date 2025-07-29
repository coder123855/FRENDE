from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json
import logging
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
    """WebSocket endpoint for chat room"""
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
        
        # Join the chat room
        await manager.join_room(user.id, match_id)
        
        # Send connection event
        from core.websocket_events import event_handler
        await event_handler.handle_connection_event(user, match_id, "connect")
        
        try:
            while True:
                # Receive message from client
                data = await websocket.receive_text()
                message_data = json.loads(data)
                
                # Handle different message types
                await handle_websocket_message(user, match_id, message_data, session)
                
        except WebSocketDisconnect:
            # Handle disconnection
            manager.disconnect(user.id)
            manager.leave_room(user.id, match_id)
            
            # Send disconnection event
            from core.websocket_events import event_handler
            await event_handler.handle_connection_event(user, match_id, "disconnect")
            
        except Exception as e:
            logger.error(f"WebSocket error for user {user.id}: {e}")
            manager.disconnect(user.id)
            manager.leave_room(user.id, match_id)
            
            # Send disconnection event
            from core.websocket_events import event_handler
            await event_handler.handle_connection_event(user, match_id, "disconnect")
            
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
        try:
            await websocket.close(code=4005, reason="Internal server error")
        except Exception as close_error:
            logger.error(f"Failed to close WebSocket connection: {close_error}")

async def handle_websocket_message(user: User, match_id: int, message_data: dict, session: AsyncSession):
    """Handle incoming WebSocket messages"""
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
    else:
        logger.warning(f"Unknown message type: {message_type}")

async def handle_chat_message(user: User, match_id: int, message_data: dict, session: AsyncSession):
    """Handle chat message from user"""
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

async def handle_typing_start(user: User, match_id: int):
    """Handle typing start indicator"""
    manager.set_typing(user.id, match_id, True)
    
    typing_message = {
        "type": "typing_start",
        "user_id": user.id,
        "username": user.username or user.name,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await manager.broadcast_to_match(typing_message, match_id, exclude_user=user.id)

async def handle_typing_stop(user: User, match_id: int):
    """Handle typing stop indicator"""
    manager.set_typing(user.id, match_id, False)
    
    typing_message = {
        "type": "typing_stop",
        "user_id": user.id,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    await manager.broadcast_to_match(typing_message, match_id, exclude_user=user.id)

async def handle_task_completion(user: User, match_id: int, message_data: dict, session: AsyncSession):
    """Handle task completion notification"""
    task_id = message_data.get("task_id")
    
    if not task_id:
        return
    
    # Update task completion status
    from models.task import Task
    result = await session.execute(select(Task).where(Task.id == task_id, Task.match_id == match_id))
    task = result.scalar_one_or_none()
    
    if task:
        task.mark_completed_by_user(user.id, task.match)
        await session.commit()
        
        # Broadcast task completion
        completion_message = {
            "type": "task_completion",
            "task_id": task_id,
            "user_id": user.id,
            "username": user.username or user.name,
            "completed": task.is_completed,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await manager.broadcast_to_match(completion_message, match_id)

async def handle_read_receipt(user: User, match_id: int, message_data: dict, session: AsyncSession):
    """Handle read receipt for messages"""
    message_id = message_data.get("message_id")
    
    if not message_id:
        return
    
    # Mark message as read
    result = await session.execute(
        select(ChatMessage).where(
            ChatMessage.id == message_id,
            ChatMessage.match_id == match_id
        )
    )
    message = result.scalar_one_or_none()
    
    if message and message.sender_id != user.id:
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

@router.get("/status/{match_id}")
async def get_chat_status(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get current chat status (online users, typing indicators)"""
    # Verify user is part of this match
    result = await session.execute(
        select(Match).where(
            (Match.user1_id == current_user.id) | (Match.user2_id == current_user.id),
            Match.id == match_id
        )
    )
    match = result.scalar_one_or_none()
    
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")
    
    return {
        "online_users": manager.get_online_users(match_id),
        "typing_users": manager.get_typing_users(match_id),
        "user_online": manager.is_user_online(current_user.id)
    } 