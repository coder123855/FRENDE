"""
Rate limiting middleware for FastAPI that integrates with the advanced rate limiting service.
Provides proper error handling, response headers, and analytics integration.
"""

import logging
from typing import Callable
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from core.rate_limiting import rate_limiter
from core.exceptions import RateLimitError

logger = logging.getLogger(__name__)

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Advanced rate limiting middleware with analytics and proper error handling"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.skip_paths = {
            "/health",
            "/docs",
            "/redoc", 
            "/openapi.json",
            "/favicon.ico",
            "/metrics",
            "/api/v1/health"
        }
    
    def _should_skip_rate_limit(self, path: str) -> bool:
        """Check if rate limiting should be skipped for this path"""
        return any(path.startswith(skip_path) for skip_path in self.skip_paths)
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process request with rate limiting"""
        
        # Skip rate limiting for certain paths
        if self._should_skip_rate_limit(request.url.path):
            return await call_next(request)
        
        try:
            # Check rate limit
            is_allowed, rate_info = await rate_limiter.check_rate_limit(request)
            
            if not is_allowed:
                # Rate limit exceeded
                retry_after = rate_info.get("retry_after", 60)
                
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": "Rate limit exceeded",
                        "message": "Too many requests. Please try again later.",
                        "details": {
                            "limit": rate_info["limit"],
                            "remaining": rate_info["remaining"],
                            "reset": rate_info["reset"],
                            "retry_after": retry_after
                        }
                    },
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(rate_info["limit"]),
                        "X-RateLimit-Remaining": str(rate_info["remaining"]),
                        "X-RateLimit-Reset": str(rate_info["reset"])
                    }
                )
            
            # Process request
            response = await call_next(request)
            
            # Add rate limit headers to response
            rate_headers = await rate_limiter.get_rate_limit_headers(rate_info)
            for header, value in rate_headers.items():
                response.headers[header] = value
            
            return response
            
        except Exception as e:
            logger.error(f"Rate limiting error: {str(e)}")
            # Allow request to proceed if rate limiting fails
            return await call_next(request)

def create_rate_limit_middleware(app: ASGIApp) -> ASGIApp:
    """Create and apply rate limiting middleware"""
    app.add_middleware(RateLimitMiddleware)
    return app
