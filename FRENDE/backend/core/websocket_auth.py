from typing import Optional, Dict, Any
from fastapi import WebSocket, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
import logging
import time
from datetime import datetime, timedelta
import jwt
from collections import defaultdict

from core.config import settings
from core.database import get_async_session
from models.user import User
from sqlalchemy import select

logger = logging.getLogger(__name__)

class WebSocketAuthManager:
    """Manages WebSocket authentication and security"""
    
    def __init__(self):
        # Rate limiting: {user_id: [timestamps]}
        self.connection_attempts: Dict[int, list] = defaultdict(list)
        # Blacklisted tokens: {token_hash: expiry}
        self.blacklisted_tokens: Dict[str, datetime] = {}
        # Active sessions: {user_id: session_data}
        self.active_sessions: Dict[int, Dict[str, Any]] = {}
    
    def _cleanup_expired_data(self):
        """Clean up expired rate limiting and blacklisted tokens"""
        current_time = datetime.utcnow()
        
        # Clean up rate limiting (keep only last 5 minutes)
        cutoff_time = current_time - timedelta(minutes=5)
        for user_id in list(self.connection_attempts.keys()):
            self.connection_attempts[user_id] = [
                ts for ts in self.connection_attempts[user_id] 
                if ts > cutoff_time
            ]
            if not self.connection_attempts[user_id]:
                del self.connection_attempts[user_id]
        
        # Clean up expired blacklisted tokens
        for token_hash in list(self.blacklisted_tokens.keys()):
            if self.blacklisted_tokens[token_hash] < current_time:
                del self.blacklisted_tokens[token_hash]
    
    def _is_rate_limited(self, user_id: int) -> bool:
        """Check if user is rate limited (max 10 connections per 5 minutes)"""
        current_time = datetime.utcnow()
        cutoff_time = current_time - timedelta(minutes=5)
        
        # Clean old attempts
        self.connection_attempts[user_id] = [
            ts for ts in self.connection_attempts[user_id] 
            if ts > cutoff_time
        ]
        
        # Check if user has exceeded limit
        if len(self.connection_attempts[user_id]) >= 10:
            return True
        
        # Add current attempt
        self.connection_attempts[user_id].append(current_time)
        return False
    
    def _hash_token(self, token: str) -> str:
        """Create a hash of the token for blacklisting"""
        import hashlib
        return hashlib.sha256(token.encode()).hexdigest()
    
    def blacklist_token(self, token: str, expiry_minutes: int = 60):
        """Blacklist a token"""
        token_hash = self._hash_token(token)
        expiry = datetime.utcnow() + timedelta(minutes=expiry_minutes)
        self.blacklisted_tokens[token_hash] = expiry
        logger.info(f"Token blacklisted, expires at {expiry}")
    
    def _is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted"""
        token_hash = self._hash_token(token)
        if token_hash in self.blacklisted_tokens:
            if self.blacklisted_tokens[token_hash] > datetime.utcnow():
                return True
            else:
                # Remove expired blacklist entry
                del self.blacklisted_tokens[token_hash]
        return False
    
    async def extract_token(self, websocket: WebSocket) -> Optional[str]:
        """Extract JWT token from WebSocket connection"""
        # Try query parameters first
        token = websocket.query_params.get("token")
        
        if not token:
            # Try authorization header
            auth_header = websocket.headers.get("authorization")
            if auth_header and auth_header.startswith("Bearer "):
                token = auth_header[7:]
        
        if not token:
            # Try sec-websocket-protocol header (alternative method)
            protocols = websocket.headers.get("sec-websocket-protocol")
            if protocols:
                for protocol in protocols.split(","):
                    protocol = protocol.strip()
                    if protocol.startswith("token="):
                        token = protocol[6:]  # Remove "token=" prefix
                        break
        
        return token
    
    async def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate JWT token and return payload"""
        try:
            # Check if token is blacklisted
            if self._is_token_blacklisted(token):
                logger.warning("Attempted to use blacklisted token")
                return None
            
            # Decode JWT token
            payload = jwt.decode(
                token,
                settings.JWT_SECRET_KEY,
                algorithms=["HS256"],
                options={"verify_signature": True}
            )
            
            # Check if token is expired
            exp = payload.get("exp")
            if exp and datetime.utcfromtimestamp(exp) < datetime.utcnow():
                logger.warning("Token has expired")
                return None
            
            return payload
            
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            return None
        except Exception as e:
            logger.error(f"Token validation error: {e}")
            return None
    
    async def authenticate_websocket(self, websocket: WebSocket) -> Optional[User]:
        """Authenticate WebSocket connection"""
        try:
            # Clean up expired data
            self._cleanup_expired_data()
            
            # Extract token
            token = await self.extract_token(websocket)
            if not token:
                await websocket.close(code=4001, reason="Missing authentication token")
                return None
            
            # Validate token
            payload = await self.validate_token(token)
            if not payload:
                await websocket.close(code=4002, reason="Invalid or expired token")
                return None
            
            # Get user ID from payload
            user_id = payload.get("sub")
            if not user_id:
                await websocket.close(code=4003, reason="Invalid token payload")
                return None
            
            # Check rate limiting
            if self._is_rate_limited(int(user_id)):
                await websocket.close(code=4004, reason="Rate limit exceeded")
                return None
            
            # Get user from database
            async for session in get_async_session():
                result = await session.execute(
                    select(User).where(User.id == int(user_id))
                )
                user = result.scalar_one_or_none()
                
                if not user:
                    await websocket.close(code=4005, reason="User not found")
                    return None
                
                if not user.is_active:
                    await websocket.close(code=4006, reason="User account is inactive")
                    return None
                
                # Store session data
                self.active_sessions[user.id] = {
                    "user": user,
                    "connected_at": datetime.utcnow(),
                    "token_hash": self._hash_token(token)
                }
                
                logger.info(f"WebSocket authenticated for user {user.id}")
                return user
                
        except Exception as e:
            logger.error(f"WebSocket authentication error: {e}")
            await websocket.close(code=4007, reason="Authentication failed")
            return None
    
    def get_user_session(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user session data"""
        return self.active_sessions.get(user_id)
    
    def remove_user_session(self, user_id: int):
        """Remove user session data"""
        if user_id in self.active_sessions:
            del self.active_sessions[user_id]
            logger.info(f"Removed session for user {user_id}")
    
    def get_active_sessions_count(self) -> int:
        """Get count of active sessions"""
        return len(self.active_sessions)
    
    def get_rate_limit_info(self, user_id: int) -> Dict[str, Any]:
        """Get rate limit information for a user"""
        current_time = datetime.utcnow()
        cutoff_time = current_time - timedelta(minutes=5)
        
        attempts = [
            ts for ts in self.connection_attempts.get(user_id, [])
            if ts > cutoff_time
        ]
        
        return {
            "attempts": len(attempts),
            "limit": 10,
            "window_minutes": 5,
            "remaining": max(0, 10 - len(attempts))
        }

# Global WebSocket auth manager instance
websocket_auth = WebSocketAuthManager() 