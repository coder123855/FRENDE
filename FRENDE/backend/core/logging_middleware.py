"""
Request/response logging middleware for the Frende backend application.
Provides comprehensive request tracking, performance monitoring, and structured logging.
"""

import time
import uuid
from typing import Optional, Callable
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from core.config import settings
from core.logging_config import get_logger, log_request, log_response

logger = get_logger("api")

class RequestIDMiddleware(BaseHTTPMiddleware):
    """Middleware to generate and track request IDs"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Generate unique request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Add request ID to response headers
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        
        return response

class LoggingMiddleware(BaseHTTPMiddleware):
    """Middleware to log requests and responses with performance timing"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Get request details
        request_id = getattr(request.state, "request_id", "unknown")
        method = request.method
        path = request.url.path
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "")
        
        # Get user ID if available (from auth middleware)
        user_id = getattr(request.state, "user_id", None)
        
        # Log incoming request
        log_request(
            logger,
            request_id=request_id,
            method=method,
            path=path,
            user_id=user_id,
            client_ip=client_ip
        )
        
        # Track start time
        start_time = time.time()
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate response time
            response_time = (time.time() - start_time) * 1000  # Convert to milliseconds
            
            # Log response
            log_response(
                logger,
                request_id=request_id,
                status_code=response.status_code,
                response_time=response_time,
                user_id=user_id
            )
            
            # Add performance headers
            response.headers["X-Response-Time"] = f"{response_time:.2f}ms"
            
            return response
            
        except Exception as e:
            # Calculate response time for errors
            response_time = (time.time() - start_time) * 1000
            
            # Log error response
            log_response(
                logger,
                request_id=request_id,
                status_code=500,
                response_time=response_time,
                user_id=user_id
            )
            
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

class PerformanceMiddleware(BaseHTTPMiddleware):
    """Middleware to monitor and log performance metrics"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.perf_logger = get_logger("performance")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Track start time
        start_time = time.time()
        
        # Get request details
        method = request.method
        path = request.url.path
        user_id = getattr(request.state, "user_id", None)
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration = (time.time() - start_time) * 1000
            
            # Log performance metrics
            self.perf_logger.info(
                f"Performance: {method} {path} took {duration:.2f}ms",
                extra={
                    "operation": f"{method} {path}",
                    "duration": duration,
                    "user_id": user_id,
                    "status_code": response.status_code,
                    "request_id": getattr(request.state, "request_id", None)
                }
            )
            
            # Add performance headers
            response.headers["X-Processing-Time"] = f"{duration:.2f}ms"
            
            return response
            
        except Exception as e:
            # Calculate duration for errors
            duration = (time.time() - start_time) * 1000
            
            # Log performance for errors
            self.perf_logger.warning(
                f"Performance (error): {method} {path} took {duration:.2f}ms",
                extra={
                    "operation": f"{method} {path}",
                    "duration": duration,
                    "user_id": user_id,
                    "error": str(e),
                    "request_id": getattr(request.state, "request_id", None)
                }
            )
            
            # Re-raise the exception
            raise

class UserContextMiddleware(BaseHTTPMiddleware):
    """Middleware to extract and store user context from authentication"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Extract user ID from authentication header if present
        user_id = None
        
        # Check for Authorization header
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            try:
                # This would typically decode the JWT token to get user ID
                # For now, we'll set a placeholder
                user_id = None  # Will be set by auth middleware
            except Exception:
                pass
        
        # Store user ID in request state
        request.state.user_id = user_id
        
        return await call_next(request)

class RequestSizeMiddleware(BaseHTTPMiddleware):
    """Middleware to log request size and validate limits"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Get request size from headers
        content_length = request.headers.get("content-length")
        if content_length:
            size = int(content_length)
            
            # Log large requests
            if size > 1024 * 1024:  # 1MB
                logger.warning(
                    f"Large request: {size} bytes for {request.method} {request.url.path}",
                    extra={
                        "request_size": size,
                        "method": request.method,
                        "path": request.url.path,
                        "user_id": getattr(request.state, "user_id", None),
                        "request_id": getattr(request.state, "request_id", None)
                    }
                )
        
        return await call_next(request)

def create_logging_middleware_stack(app: ASGIApp) -> ASGIApp:
    """Create a stack of logging middleware"""
    # Apply middleware in order (last applied = first executed)
    app = RequestIDMiddleware(app)
    app = UserContextMiddleware(app)
    app = RequestSizeMiddleware(app)
    app = PerformanceMiddleware(app)
    app = LoggingMiddleware(app)
    return app 