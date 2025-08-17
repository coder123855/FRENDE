import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from core.config import settings
from core.security import (
    create_access_token, create_refresh_token, verify_refresh_token,
    blacklist_token, rotate_tokens
)
from models.user import User
from models.refresh_token import RefreshToken
from models.user_session import UserSession
from models.blacklisted_token import BlacklistedToken

logger = logging.getLogger(__name__)

class TokenService:
    """Service for managing authentication tokens and sessions."""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create_tokens(self, user: User) -> Dict[str, str]:
        """Create access and refresh tokens for a user."""
        try:
            # Create tokens
            access_token = create_access_token(data={"sub": str(user.id)})
            refresh_token = create_refresh_token(data={"sub": str(user.id)})
            
            # Store refresh token in database
            refresh_token_model = RefreshToken(
                user_id=user.id,
                token_hash=blacklist_token(refresh_token),
                expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
                is_revoked=False
            )
            self.session.add(refresh_token_model)
            
            # Create session record
            session_model = UserSession(
                user_id=user.id,
                refresh_token_id=refresh_token_model.id,
                created_at=datetime.utcnow(),
                last_activity=datetime.utcnow(),
                is_active=True
            )
            self.session.add(session_model)
            
            await self.session.commit()
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "session_id": session_model.id
            }
            
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error creating tokens for user {user.id}: {e}")
            raise
    
    async def refresh_tokens(self, refresh_token: str) -> Dict[str, str]:
        """Refresh access token using refresh token."""
        try:
            # Verify refresh token
            payload = verify_refresh_token(refresh_token)
            if not payload:
                raise ValueError("Invalid refresh token")
            
            user_id = int(payload.get("sub"))
            
            # Check if refresh token exists and is not revoked
            token_hash = blacklist_token(refresh_token)
            result = await self.session.execute(
                select(RefreshToken).where(
                    RefreshToken.token_hash == token_hash,
                    RefreshToken.is_revoked == False,
                    RefreshToken.expires_at > datetime.utcnow()
                )
            )
            stored_token = result.scalar_one_or_none()
            
            if not stored_token:
                raise ValueError("Refresh token not found or revoked")
            
            # Check if token rotation is enabled
            if settings.TOKEN_ROTATION_ENABLED:
                # Rotate tokens (create new refresh token)
                new_tokens = rotate_tokens(user_id, refresh_token)
                
                # Revoke old refresh token
                stored_token.is_revoked = True
                
                # Store new refresh token
                new_refresh_token_model = RefreshToken(
                    user_id=user_id,
                    token_hash=blacklist_token(new_tokens["refresh_token"]),
                    expires_at=datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
                    is_revoked=False
                )
                self.session.add(new_refresh_token_model)
                
                # Update session
                session_result = await self.session.execute(
                    select(UserSession).where(UserSession.refresh_token_id == stored_token.id)
                )
                session = session_result.scalar_one_or_none()
                if session:
                    session.refresh_token_id = new_refresh_token_model.id
                    session.last_activity = datetime.utcnow()
                
                await self.session.commit()
                
                return {
                    "access_token": new_tokens["access_token"],
                    "refresh_token": new_tokens["refresh_token"]
                }
            else:
                # Just create new access token
                new_access_token = create_access_token(data={"sub": str(user_id)})
                
                # Update session activity
                session_result = await self.session.execute(
                    select(UserSession).where(UserSession.refresh_token_id == stored_token.id)
                )
                session = session_result.scalar_one_or_none()
                if session:
                    session.last_activity = datetime.utcnow()
                
                await self.session.commit()
                
                return {
                    "access_token": new_access_token,
                    "refresh_token": refresh_token  # Return same refresh token
                }
                
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error refreshing tokens: {e}")
            raise
    
    async def revoke_token(self, refresh_token: str) -> bool:
        """Revoke a refresh token."""
        try:
            token_hash = blacklist_token(refresh_token)
            
            # Find and revoke refresh token
            result = await self.session.execute(
                select(RefreshToken).where(RefreshToken.token_hash == token_hash)
            )
            stored_token = result.scalar_one_or_none()
            
            if stored_token:
                stored_token.is_revoked = True
                
                # Deactivate associated session
                session_result = await self.session.execute(
                    select(UserSession).where(UserSession.refresh_token_id == stored_token.id)
                )
                session = session_result.scalar_one_or_none()
                if session:
                    session.is_active = False
                
                await self.session.commit()
                return True
            
            return False
            
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error revoking token: {e}")
            raise
    
    async def blacklist_token(self, token: str) -> None:
        """Add a token to the blacklist."""
        try:
            token_hash = blacklist_token(token)
            expires_at = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            
            blacklisted_token = BlacklistedToken(
                token_hash=token_hash,
                expires_at=expires_at
            )
            self.session.add(blacklisted_token)
            await self.session.commit()
            
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error blacklisting token: {e}")
            raise
    
    async def is_token_blacklisted(self, token: str) -> bool:
        """Check if a token is blacklisted."""
        try:
            token_hash = blacklist_token(token)
            
            result = await self.session.execute(
                select(BlacklistedToken).where(
                    BlacklistedToken.token_hash == token_hash,
                    BlacklistedToken.expires_at > datetime.utcnow()
                )
            )
            
            return result.scalar_one_or_none() is not None
            
        except Exception as e:
            logger.error(f"Error checking token blacklist: {e}")
            return False
    
    async def get_user_sessions(self, user_id: int) -> List[Dict]:
        """Get all active sessions for a user."""
        try:
            result = await self.session.execute(
                select(UserSession)
                .options(selectinload(UserSession.refresh_token))
                .where(
                    UserSession.user_id == user_id,
                    UserSession.is_active == True
                )
            )
            
            sessions = result.scalars().all()
            return [
                {
                    "session_id": session.id,
                    "created_at": session.created_at,
                    "last_activity": session.last_activity,
                    "refresh_token_id": session.refresh_token_id
                }
                for session in sessions
            ]
            
        except Exception as e:
            logger.error(f"Error getting user sessions: {e}")
            raise
    
    async def revoke_session(self, session_id: int, user_id: int) -> bool:
        """Revoke a specific session."""
        try:
            result = await self.session.execute(
                select(UserSession).where(
                    UserSession.id == session_id,
                    UserSession.user_id == user_id
                )
            )
            session = result.scalar_one_or_none()
            
            if session:
                session.is_active = False
                
                # Revoke associated refresh token
                if session.refresh_token_id:
                    refresh_result = await self.session.execute(
                        select(RefreshToken).where(RefreshToken.id == session.refresh_token_id)
                    )
                    refresh_token = refresh_result.scalar_one_or_none()
                    if refresh_token:
                        refresh_token.is_revoked = True
                
                await self.session.commit()
                return True
            
            return False
            
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error revoking session: {e}")
            raise
    
    async def revoke_all_sessions(self, user_id: int) -> int:
        """Revoke all sessions for a user."""
        try:
            # Get all active sessions
            result = await self.session.execute(
                select(UserSession).where(
                    UserSession.user_id == user_id,
                    UserSession.is_active == True
                )
            )
            sessions = result.scalars().all()
            
            revoked_count = 0
            for session in sessions:
                session.is_active = False
                
                # Revoke associated refresh token
                if session.refresh_token_id:
                    refresh_result = await self.session.execute(
                        select(RefreshToken).where(RefreshToken.id == session.refresh_token_id)
                    )
                    refresh_token = refresh_result.scalar_one_or_none()
                    if refresh_token:
                        refresh_token.is_revoked = True
                
                revoked_count += 1
            
            await self.session.commit()
            return revoked_count
            
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error revoking all sessions: {e}")
            raise
    
    async def cleanup_expired_tokens(self) -> Tuple[int, int]:
        """Clean up expired tokens and sessions."""
        try:
            # Clean up expired refresh tokens
            expired_refresh_result = await self.session.execute(
                delete(RefreshToken).where(RefreshToken.expires_at < datetime.utcnow())
            )
            expired_refresh_count = expired_refresh_result.rowcount
            
            # Clean up expired blacklisted tokens
            expired_blacklist_result = await self.session.execute(
                delete(BlacklistedToken).where(BlacklistedToken.expires_at < datetime.utcnow())
            )
            expired_blacklist_count = expired_blacklist_result.rowcount
            
            # Clean up inactive sessions
            inactive_sessions_result = await self.session.execute(
                delete(UserSession).where(UserSession.is_active == False)
            )
            inactive_sessions_count = inactive_sessions_result.rowcount
            
            await self.session.commit()
            
            return expired_refresh_count + expired_blacklist_count, inactive_sessions_count
            
        except Exception as e:
            await self.session.rollback()
            logger.error(f"Error cleaning up expired tokens: {e}")
            raise
