from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Dict, Optional
from datetime import datetime, timedelta
import logging
import random

from models.match import Match
from models.user import User
from core.database import get_async_session

logger = logging.getLogger(__name__)

class ConversationStarterService:
    """Service for managing conversation starter logic"""
    
    def __init__(self):
        self.timeout_minutes = 1  # 1 minute timeout for greeting
    
    async def assign_conversation_starter(self, match_id: int, session: AsyncSession = None) -> Dict[str, any]:
        """Assign a random conversation starter to a match"""
        if not session:
            async with get_async_session() as session:
                return await self._assign_conversation_starter_internal(match_id, session)
        
        return await self._assign_conversation_starter_internal(match_id, session)
    
    async def _assign_conversation_starter_internal(self, match_id: int, session: AsyncSession) -> Dict[str, any]:
        """Internal method to assign conversation starter"""
        try:
            # Get match details
            result = await session.execute(
                select(Match).where(Match.id == match_id)
            )
            match = result.scalar_one_or_none()
            
            if not match:
                raise ValueError(f"Match {match_id} not found")
            
            # Randomly select one of the two users
            starter_id = random.choice([match.user1_id, match.user2_id])
            timeout_at = datetime.utcnow() + timedelta(minutes=self.timeout_minutes)
            
            # Update match with conversation starter
            await session.execute(
                update(Match)
                .where(Match.id == match_id)
                .values(
                    conversation_starter_id=starter_id,
                    conversation_started_at=datetime.utcnow(),
                    greeting_sent=False,
                    starter_timeout_at=timeout_at
                )
            )
            
            await session.commit()
            
            logger.info(f"Assigned conversation starter {starter_id} to match {match_id}")
            
            return {
                "match_id": match_id,
                "starter_id": starter_id,
                "timeout_at": timeout_at.isoformat(),
                "timeout_minutes": self.timeout_minutes
            }
            
        except Exception as e:
            logger.error(f"Error assigning conversation starter: {str(e)}")
            raise
    
    async def get_conversation_starter(self, match_id: int, session: AsyncSession = None) -> Optional[Dict[str, any]]:
        """Get current conversation starter for a match"""
        if not session:
            async with get_async_session() as session:
                return await self._get_conversation_starter_internal(match_id, session)
        
        return await self._get_conversation_starter_internal(match_id, session)
    
    async def _get_conversation_starter_internal(self, match_id: int, session: AsyncSession) -> Optional[Dict[str, any]]:
        """Internal method to get conversation starter"""
        try:
            result = await session.execute(
                select(Match).where(Match.id == match_id)
            )
            match = result.scalar_one_or_none()
            
            if not match or not match.conversation_starter_id:
                return None
            
            # Check if timeout has passed
            is_expired = (match.starter_timeout_at and 
                         match.starter_timeout_at < datetime.utcnow())
            
            return {
                "match_id": match_id,
                "starter_id": match.conversation_starter_id,
                "started_at": match.conversation_started_at.isoformat() if match.conversation_started_at else None,
                "timeout_at": match.starter_timeout_at.isoformat() if match.starter_timeout_at else None,
                "greeting_sent": match.greeting_sent,
                "is_expired": is_expired,
                "timeout_minutes": self.timeout_minutes
            }
            
        except Exception as e:
            logger.error(f"Error getting conversation starter: {str(e)}")
            return None
    
    async def reset_conversation_starter(self, match_id: int, session: AsyncSession = None) -> Dict[str, any]:
        """Reset conversation starter for a match"""
        if not session:
            async with get_async_session() as session:
                return await self._reset_conversation_starter_internal(match_id, session)
        
        return await self._reset_conversation_starter_internal(match_id, session)
    
    async def _reset_conversation_starter_internal(self, match_id: int, session: AsyncSession) -> Dict[str, any]:
        """Internal method to reset conversation starter"""
        try:
            # Clear current starter
            await session.execute(
                update(Match)
                .where(Match.id == match_id)
                .values(
                    conversation_starter_id=None,
                    conversation_started_at=None,
                    greeting_sent=False,
                    starter_timeout_at=None
                )
            )
            
            await session.commit()
            
            logger.info(f"Reset conversation starter for match {match_id}")
            
            return {
                "match_id": match_id,
                "reset": True,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error resetting conversation starter: {str(e)}")
            raise
    
    async def check_starter_timeout(self, match_id: int, session: AsyncSession = None) -> Optional[Dict[str, any]]:
        """Check if conversation starter has timed out and handle accordingly"""
        if not session:
            async with get_async_session() as session:
                return await self._check_starter_timeout_internal(match_id, session)
        
        return await self._check_starter_timeout_internal(match_id, session)
    
    async def _check_starter_timeout_internal(self, match_id: int, session: AsyncSession) -> Optional[Dict[str, any]]:
        """Internal method to check starter timeout"""
        try:
            result = await session.execute(
                select(Match).where(Match.id == match_id)
            )
            match = result.scalar_one_or_none()
            
            if not match or not match.conversation_starter_id:
                return None
            
            # Check if timeout has passed and greeting hasn't been sent
            if (match.starter_timeout_at and 
                match.starter_timeout_at < datetime.utcnow() and 
                not match.greeting_sent):
                
                # Mark greeting as sent to prevent duplicate processing
                await session.execute(
                    update(Match)
                    .where(Match.id == match_id)
                    .values(greeting_sent=True)
                )
                
                await session.commit()
                
                logger.info(f"Conversation starter timed out for match {match_id}")
                
                return {
                    "match_id": match_id,
                    "starter_id": match.conversation_starter_id,
                    "timed_out": True,
                    "timeout_at": match.starter_timeout_at.isoformat(),
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            return None
            
        except Exception as e:
            logger.error(f"Error checking starter timeout: {str(e)}")
            return None
    
    async def mark_greeting_sent(self, match_id: int, session: AsyncSession = None) -> bool:
        """Mark that a greeting has been sent for a match"""
        if not session:
            async with get_async_session() as session:
                return await self._mark_greeting_sent_internal(match_id, session)
        
        return await self._mark_greeting_sent_internal(match_id, session)
    
    async def _mark_greeting_sent_internal(self, match_id: int, session: AsyncSession) -> bool:
        """Internal method to mark greeting as sent"""
        try:
            await session.execute(
                update(Match)
                .where(Match.id == match_id)
                .values(greeting_sent=True)
            )
            
            await session.commit()
            
            logger.info(f"Marked greeting as sent for match {match_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error marking greeting as sent: {str(e)}")
            return False
    
    async def get_default_greeting(self, user_name: str) -> str:
        """Get the default greeting message"""
        return f"Hello, my name is {user_name}, I am shy and can't think of a cool opening line :( Wanna be friends?"

# Global conversation starter service instance
conversation_starter_service = ConversationStarterService() 