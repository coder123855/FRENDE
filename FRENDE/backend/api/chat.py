from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from datetime import datetime

from core.auth import current_active_user
from core.database import get_async_session
from models.user import User
from models.chat import ChatMessage, ChatRoom
from models.match import Match
from schemas.chat import (
    ChatMessageCreate, ChatMessageRead, ChatMessageListResponse,
    ChatMessageSendResponse, ReadReceiptRequest, ReadReceiptResponse,
    UnreadCountResponse, ChatRoomStatus
)
from schemas.common import PaginationParams, SuccessResponse, ErrorResponse
from services.chat import chat_service
from services.matching import matching_service

router = APIRouter(prefix="/chat", tags=["chat"])

@router.get("/matches/{match_id}/messages", response_model=ChatMessageListResponse)
async def get_chat_messages(
    match_id: int,
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(50, ge=1, le=100, description="Page size"),
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get chat message history for a match"""
    try:
        # Verify user is part of the match
        match = await matching_service.get_match_details(
            match_id, current_user.id, session
        )
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        # Get chat messages
        messages = await chat_service.get_chat_messages(
            match_id, current_user.id, page, size, session
        )
        
        return messages
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error retrieving chat messages: {str(e)}"
        )

@router.post("/matches/{match_id}/messages", response_model=ChatMessageSendResponse)
async def send_message(
    match_id: int,
    message_data: ChatMessageCreate,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Send a message in a chat room"""
    try:
        # Verify user is part of the match
        match = await matching_service.get_match_details(
            match_id, current_user.id, session
        )
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        # Send message
        message = await chat_service.send_message(
            match_id,
            current_user.id,
            message_data.message_text,
            message_data.message_type,
            message_data.task_id,
            session
        )
        
        return ChatMessageSendResponse(
            message=message,
            status_message="Message sent successfully"
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending message: {str(e)}"
        )

@router.put("/messages/{message_id}/read", response_model=ReadReceiptResponse)
async def mark_message_read(
    message_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Mark a message as read"""
    try:
        # Get message
        result = await session.execute(
            select(ChatMessage).where(ChatMessage.id == message_id)
        )
        message = result.scalar_one_or_none()
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        # Verify user is part of the match
        match = await matching_service.get_match_details(
            message.match_id, current_user.id, session
        )
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        # Mark as read
        message.is_read = True
        message.read_at = datetime.utcnow()
        await session.commit()
        
        return ReadReceiptResponse(
            message_id=message_id,
            read_at=message.read_at,
            message="Message marked as read"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error marking message as read: {str(e)}"
        )

@router.get("/matches/{match_id}/unread", response_model=UnreadCountResponse)
async def get_unread_count(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get unread message count for a match"""
    try:
        # Verify user is part of the match
        match = await matching_service.get_match_details(
            match_id, current_user.id, session
        )
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        # Get unread count
        unread_count = await chat_service.get_unread_count(
            match_id, current_user.id, session
        )
        
        return UnreadCountResponse(
            match_id=match_id,
            unread_count=unread_count,
            last_message_at=await chat_service.get_last_message_time(match_id, session)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting unread count: {str(e)}"
        )

@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Delete a message (own messages only)"""
    try:
        # Get message
        result = await session.execute(
            select(ChatMessage).where(ChatMessage.id == message_id)
        )
        message = result.scalar_one_or_none()
        
        if not message:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Message not found"
            )
        
        # Verify user is the sender
        if message.sender_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Can only delete your own messages"
            )
        
        # Delete message
        await session.delete(message)
        await session.commit()
        
        return SuccessResponse(
            message="Message deleted successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting message: {str(e)}"
        )

@router.get("/matches/{match_id}/room", response_model=ChatRoomStatus)
async def get_chat_room_status(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get chat room status and information"""
    try:
        # Verify user is part of the match
        match = await matching_service.get_match_details(
            match_id, current_user.id, session
        )
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        # Get chat room status
        room_status = await chat_service.get_chat_room_status(
            match_id, session
        )
        
        return room_status
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting chat room status: {str(e)}"
        )

@router.post("/matches/{match_id}/typing")
async def set_typing_status(
    match_id: int,
    is_typing: bool = Query(..., description="Whether user is typing"),
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Set typing status for a user in a chat room"""
    try:
        # Verify user is part of the match
        match = await matching_service.get_match_details(
            match_id, current_user.id, session
        )
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        # Set typing status
        await chat_service.set_typing_status(
            match_id, current_user.id, is_typing
        )
        
        return SuccessResponse(
            message=f"Typing status set to {is_typing}"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error setting typing status: {str(e)}"
        )

@router.get("/matches/{match_id}/typing")
async def get_typing_users(
    match_id: int,
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get users currently typing in a chat room"""
    try:
        # Verify user is part of the match
        match = await matching_service.get_match_details(
            match_id, current_user.id, session
        )
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        # Get typing users
        typing_users = await chat_service.get_typing_users(match_id)
        
        return {
            "match_id": match_id,
            "typing_users": typing_users,
            "count": len(typing_users)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting typing users: {str(e)}"
        )

@router.post("/matches/{match_id}/system-message")
async def send_system_message(
    match_id: int,
    message_text: str = Query(..., description="System message text"),
    current_user: User = Depends(current_active_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Send a system message in a chat room"""
    try:
        # Verify user is part of the match
        match = await matching_service.get_match_details(
            match_id, current_user.id, session
        )
        if not match:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Match not found"
            )
        
        # Send system message
        message = await chat_service.send_system_message(
            match_id, message_text, session
        )
        
        return ChatMessageSendResponse(
            message=message,
            status_message="System message sent successfully"
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error sending system message: {str(e)}"
        ) 