"""
Sentry middleware for FastAPI application.
Provides request/response tracking and user context.
"""

import time
import sentry_sdk
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
from typing import Optional

from core.sentry import set_user_context, set_request_context
from core.logging_config import get_logger

logger = get_logger("sentry")


class SentryMiddleware(BaseHTTPMiddleware):
    """Middleware to track requests and responses in Sentry"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next):
        # Get request details
        method = request.method
        path = request.url.path
        request_id = getattr(request.state, "request_id", None)
        user_id = getattr(request.state, "user_id", None)
        username = getattr(request.state, "username", None)
        
        # Start Sentry transaction
        transaction = sentry_sdk.start_transaction(
            name=f"{method} {path}",
            op="http.server",
        )
        
        # Set request context
        set_request_context(
            request_id=request_id,
            method=method,
            path=path,
            user_agent=request.headers.get("user-agent"),
            client_ip=self._get_client_ip(request),
        )
        
        # Set user context if available
        if user_id:
            set_user_context(user_id=user_id, username=username)
        
        # Track request start time
        start_time = time.time()
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate response time
            response_time = (time.time() - start_time) * 1000
            
            # Set response context
            sentry_sdk.set_tag("status_code", response.status_code)
            sentry_sdk.set_tag("response_time_ms", response_time)
            
            # Add performance headers
            response.headers["X-Response-Time"] = f"{response_time:.2f}ms"
            
            # Finish transaction
            transaction.finish()
            
            return response
            
        except Exception as e:
            # Calculate response time for errors
            response_time = (time.time() - start_time) * 1000
            
            # Set error context
            sentry_sdk.set_tag("error", True)
            sentry_sdk.set_tag("error_type", type(e).__name__)
            sentry_sdk.set_tag("response_time_ms", response_time)
            
            # Capture exception
            sentry_sdk.capture_exception(e)
            
            # Finish transaction with error
            transaction.finish()
            
            # Re-raise the exception
            raise
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address"""
        # Check for forwarded headers first
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        # Check for real IP header
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip
        
        # Fallback to client host
        return request.client.host if request.client else "unknown"


class SentryUserMiddleware(BaseHTTPMiddleware):
    """Middleware to extract and set user context for Sentry"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next):
        # Extract user information from request state
        user_id = getattr(request.state, "user_id", None)
        username = getattr(request.state, "username", None)
        
        # Set user context in Sentry
        if user_id:
            set_user_context(user_id=user_id, username=username)
        
        # Continue processing
        response = await call_next(request)
        return response
