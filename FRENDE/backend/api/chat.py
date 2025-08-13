from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
import logging

from core.database import get_async_session
from core.auth import get_current_user
from models.user import User
from services.chat import chat_service
from schemas.chat import (
    ChatMessageRequest,
    ChatMessageResponse,
    ChatHistoryResponse,
    ChatHistoryPage,
    MessageReadRequest,
    TypingStatusResponse,
    ChatRoomStatus
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["chat"])

@router.get("/{match_id}/history", response_model=ChatHistoryPage)
async def get_chat_history(
    match_id: int,
    limit: int = 50,
    page: int = 1,
    include_system: bool = False,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get chat history for a match"""
    try:
        page_data = await chat_service.get_chat_history_paginated(
            match_id, current_user.id, page, limit, include_system, session
        )
        return ChatHistoryPage(
            match_id=match_id,
            messages=page_data["messages"],
            page=page_data["page"],
            size=page_data["size"],
            total=page_data["total"],
            has_more=page_data["has_more"],
            next_cursor=page_data["next_cursor"],
            prev_cursor=page_data["prev_cursor"],
        )
@router.get("/{match_id}/history/cursor", response_model=ChatHistoryPage)
async def get_chat_history_cursor(
    match_id: int,
    cursor: str | None = None,
    direction: str = "older",
    limit: int = 50,
    include_system: bool = False,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get chat history using cursor pagination"""
    try:
        cursor_dt = None
        if cursor:
            cursor_dt = datetime.fromisoformat(cursor)
        page_data = await chat_service.get_chat_history_cursor(
            match_id, current_user.id, cursor_dt, limit, direction, include_system, session
        )
        return ChatHistoryPage(
            match_id=match_id,
            messages=page_data["messages"],
            size=page_data["size"],
            has_more=page_data["has_more"],
            next_cursor=page_data["next_cursor"],
            prev_cursor=page_data["prev_cursor"],
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error getting chat history (cursor): {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chat history"
        )

@router.get("/{match_id}/status", response_model=ChatRoomStatus)
async def get_chat_status(
    match_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get chat room online and typing status"""
    try:
        status_data = await chat_service.get_chat_room_status(match_id, session)
        return ChatRoomStatus(
            match_id=match_id,
            online_users=status_data.get("online_users", []),
            total_users=len(status_data.get("online_users", [])),
            last_activity=status_data.get("last_activity").isoformat() if status_data.get("last_activity") else None,
        )
    except Exception as e:
        logger.error(f"Error getting chat status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get chat status"
        )

@router.get("/{match_id}/unread-count")
async def get_unread_count(
    match_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get unread message count for a match"""
    try:
        count = await chat_service.get_unread_count(match_id, current_user.id, session)
        return {"match_id": match_id, "unread_count": count}
    except Exception as e:
        logger.error(f"Error getting unread count: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get unread count"
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error getting chat history: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve chat history"
        )

@router.post("/{match_id}/messages", response_model=ChatMessageResponse)
async def send_message(
    match_id: int,
    message_request: ChatMessageRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Send a message to a match"""
    try:
        message = await chat_service.send_message_to_match(
            match_id, 
            current_user.id, 
            message_request.message_text,
            message_request.message_type,
            session
        )
        
        return ChatMessageResponse(
            id=message.id,
            match_id=message.match_id,
            sender_id=message.sender_id,
            message_text=message.message_text,
            message_type=message.message_type,
            created_at=message.created_at.isoformat(),
            is_read=message.is_read
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error sending message: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send message"
        )

@router.put("/{match_id}/messages/read")
async def mark_messages_as_read(
    match_id: int,
    read_request: MessageReadRequest,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Mark messages as read"""
    try:
        success = await chat_service.mark_messages_as_read(
            match_id, current_user.id, read_request.message_ids, session
        )
        
        if success:
            return {"message": "Messages marked as read successfully"}
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to mark messages as read"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error marking messages as read: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to mark messages as read"
        )

@router.get("/{match_id}/typing", response_model=TypingStatusResponse)
async def get_typing_status(
    match_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get typing status for a match"""
    try:
        typing_users = await chat_service.get_typing_status(match_id, current_user.id, session)
        return TypingStatusResponse(
            match_id=match_id,
            typing_users=typing_users
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error getting typing status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get typing status"
        )

@router.post("/{match_id}/messages/{message_id}/react")
async def react_to_message(
    match_id: int,
    message_id: int,
    reaction: str,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """React to a message (future feature)"""
    # This is a placeholder for future message reaction functionality
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Message reactions not yet implemented"
    )

@router.delete("/{match_id}/messages/{message_id}")
async def delete_message(
    match_id: int,
    message_id: int,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Delete a message (future feature)"""
    # This is a placeholder for future message deletion functionality
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Message deletion not yet implemented"
    ) 