from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from typing import Dict, Optional, List
from datetime import datetime, timedelta
import logging
import random

from models.match import Match
from models.user import User
from models.chat import ChatMessage
from core.database import get_async_session
from services.chat import chat_service
from services.conversation_starter import conversation_starter_service

logger = logging.getLogger(__name__)

class AutomaticGreetingService:
    """Service for handling automatic greeting system"""
    
    def __init__(self):
        self.timeout_minutes = 1
        self.default_greeting_template = "Hello, my name is {name}, I am shy and can't think of a cool opening line :( Wanna be friends?"
        self.alternative_greetings = [
            "Hey! I'm {name} and I'm a bit nervous about starting conversations. Want to be friends? 😊",
            "Hi there! I'm {name} and I'm not great at opening lines. Friends? 🙈",
            "Hello! I'm {name} and I'm awkward at first messages. Let's be friends? 😅",
            "Hey! I'm {name} and I'm shy about starting chats. Want to be friends? 🤗"
        ]
    
    async def check_and_handle_timeouts(self, session: AsyncSession = None) -> List[Dict]:
        """Check for timed out conversation starters and handle automatic greetings"""
        if not session:
            async with get_async_session() as session:
                return await self._check_and_handle_timeouts_internal(session)
        
        return await self._check_and_handle_timeouts_internal(session)
    
    async def _check_and_handle_timeouts_internal(self, session: AsyncSession) -> List[Dict]:
        """Internal method to check and handle timeouts"""
        try:
            # Find matches with expired conversation starters
            result = await session.execute(
                select(Match).where(
                    Match.conversation_starter_id.isnot(None),
                    Match.starter_timeout_at < datetime.utcnow(),
                    Match.greeting_sent == False
                )
            )
            expired_matches = result.scalars().all()
            
            handled_greetings = []
            
            for match in expired_matches:
                try:
                    greeting_result = await self._send_automatic_greeting(match, session)
                    if greeting_result:
                        handled_greetings.append(greeting_result)
                except Exception as e:
                    logger.error(f"Error handling automatic greeting for match {match.id}: {str(e)}")
            
            logger.info(f"Handled {len(handled_greetings)} automatic greetings")
            return handled_greetings
            
        except Exception as e:
            logger.error(f"Error checking timeouts: {str(e)}")
            return []
    
    async def _send_automatic_greeting(self, match: Match, session: AsyncSession) -> Optional[Dict]:
        """Send automatic greeting for a timed out match"""
        try:
            # Get the conversation starter user
            result = await session.execute(
                select(User).where(User.id == match.conversation_starter_id)
            )
            starter_user = result.scalar_one_or_none()
            
            if not starter_user:
                logger.error(f"Conversation starter user not found for match {match.id}")
                return None
            
            # Generate personalized greeting
            greeting_text = self._generate_personalized_greeting(starter_user.name)
            
            # Send greeting message
            chat_message = await chat_service.send_message_to_match(
                match.id,
                match.conversation_starter_id,
                greeting_text,
                "system",  # Mark as system message
                session
            )
            
            # Mark greeting as sent
            await session.execute(
                update(Match)
                .where(Match.id == match.id)
                .values(greeting_sent=True)
            )
            
            await session.commit()
            
            logger.info(f"Sent automatic greeting for match {match.id} by user {starter_user.id}")
            
            return {
                "match_id": match.id,
                "starter_id": match.conversation_starter_id,
                "greeting_text": greeting_text,
                "message_id": chat_message.id,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error sending automatic greeting: {str(e)}")
            return None
    
    def _generate_personalized_greeting(self, user_name: str) -> str:
        """Generate a personalized greeting message"""
        # Use default template or random alternative
        if random.random() < 0.7:  # 70% chance to use default
            return self.default_greeting_template.format(name=user_name)
        else:
            template = random.choice(self.alternative_greetings)
            return template.format(name=user_name)
    
    async def get_greeting_status(self, match_id: int, session: AsyncSession = None) -> Dict:
        """Get greeting status for a match"""
        if not session:
            async with get_async_session() as session:
                return await self._get_greeting_status_internal(match_id, session)
        
        return await self._get_greeting_status_internal(match_id, session)
    
    async def _get_greeting_status_internal(self, match_id: int, session: AsyncSession) -> Dict:
        """Internal method to get greeting status"""
        try:
            result = await session.execute(
                select(Match).where(Match.id == match_id)
            )
            match = result.scalar_one_or_none()
            
            if not match:
                return {"error": "Match not found"}
            
            is_expired = (match.starter_timeout_at and 
                         match.starter_timeout_at < datetime.utcnow())
            
            return {
                "match_id": match_id,
                "conversation_starter_id": match.conversation_starter_id,
                "greeting_sent": match.greeting_sent,
                "is_expired": is_expired,
                "timeout_at": match.starter_timeout_at.isoformat() if match.starter_timeout_at else None,
                "timeout_minutes": self.timeout_minutes
            }
            
        except Exception as e:
            logger.error(f"Error getting greeting status: {str(e)}")
            return {"error": str(e)}
    
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
    
    async def get_pending_timeouts(self, session: AsyncSession = None) -> List[Dict]:
        """Get list of matches with pending timeouts"""
        if not session:
            async with get_async_session() as session:
                return await self._get_pending_timeouts_internal(session)
        
        return await self._get_pending_timeouts_internal(session)
    
    async def _get_pending_timeouts_internal(self, session: AsyncSession) -> List[Dict]:
        """Internal method to get pending timeouts"""
        try:
            result = await session.execute(
                select(Match).where(
                    Match.conversation_starter_id.isnot(None),
                    Match.greeting_sent == False
                )
            )
            matches = result.scalars().all()
            
            pending_timeouts = []
            for match in matches:
                if match.starter_timeout_at and match.starter_timeout_at < datetime.utcnow():
                    pending_timeouts.append({
                        "match_id": match.id,
                        "starter_id": match.conversation_starter_id,
                        "timeout_at": match.starter_timeout_at.isoformat(),
                        "minutes_overdue": int((datetime.utcnow() - match.starter_timeout_at).total_seconds() / 60)
                    })
            
            return pending_timeouts
            
        except Exception as e:
            logger.error(f"Error getting pending timeouts: {str(e)}")
            return []

# Global automatic greeting service instance
automatic_greeting_service = AutomaticGreetingService() 