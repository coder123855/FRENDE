"""
Security middleware for the Frende backend application.
Provides security headers, rate limiting, request validation, and security monitoring.
"""

import time
import hashlib
import logging
from typing import Dict, Set, Optional, Callable
from collections import defaultdict, deque
from fastapi import Request, Response, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import json

from core.config import settings

logger = logging.getLogger(__name__)
security_logger = logging.getLogger("security")

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Middleware to add security headers to all responses"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.security_headers = settings.get_security_headers()
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        response = await call_next(request)
        
        # Add security headers
        for header, value in self.security_headers.items():
            response.headers[header] = value
        
        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Middleware to implement rate limiting"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.rate_limits = defaultdict(lambda: deque())
        self.rate_config = settings.get_rate_limit_config()
        
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
    
    def _get_rate_limit(self, request: Request) -> int:
        """Get rate limit based on endpoint"""
        path = request.url.path
        
        if path.startswith("/auth"):
            return self.rate_config["auth"]
        elif path.startswith("/upload") or "upload" in path:
            return self.rate_config["upload"]
        elif path.startswith("/ws"):
            return self.rate_config["websocket"]
        else:
            return self.rate_config["default"]
    
    def _is_rate_limited(self, client_ip: str, rate_limit: int) -> bool:
        """Check if client is rate limited"""
        now = time.time()
        window_start = now - 60  # 1 minute window
        
        # Clean old entries
        while self.rate_limits[client_ip] and self.rate_limits[client_ip][0] < window_start:
            self.rate_limits[client_ip].popleft()
        
        # Check if limit exceeded
        if len(self.rate_limits[client_ip]) >= rate_limit:
            return True
        
        # Add current request
        self.rate_limits[client_ip].append(now)
        return False
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not self.rate_config["enabled"]:
            return await call_next(request)
        
        client_ip = self._get_client_ip(request)
        rate_limit = self._get_rate_limit(request)
        
        if self._is_rate_limited(client_ip, rate_limit):
            security_logger.warning(f"Rate limit exceeded for IP: {client_ip}, Path: {request.url.path}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": "Rate limit exceeded",
                    "message": "Too many requests. Please try again later.",
                    "retry_after": 60
                },
                headers={"Retry-After": "60"}
            )
        
        return await call_next(request)

class RequestSizeMiddleware(BaseHTTPMiddleware):
    """Middleware to limit request size"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.max_size = self._parse_size_limit(settings.REQUEST_SIZE_LIMIT)
    
    def _parse_size_limit(self, size_str: str) -> int:
        """Parse size limit string to bytes"""
        size_map = {"KB": 1024, "MB": 1024**2, "GB": 1024**3}
        
        for unit, multiplier in size_map.items():
            if unit in size_str.upper():
                size = int(size_str.upper().replace(unit, "")) * multiplier
                return size
        
        return 10 * 1024**2  # Default 10MB
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        content_length = request.headers.get("content-length")
        
        if content_length:
            try:
                size = int(content_length)
                if size > self.max_size:
                    security_logger.warning(f"Request too large: {size} bytes from {request.client.host}")
                    return JSONResponse(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        content={
                            "error": "Request too large",
                            "message": f"Request size exceeds limit of {settings.REQUEST_SIZE_LIMIT}"
                        }
                    )
            except ValueError:
                pass
        
        return await call_next(request)

class SecurityMonitoringMiddleware(BaseHTTPMiddleware):
    """Middleware to monitor security events"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.suspicious_patterns = [
            "script", "javascript:", "data:text/html", "vbscript:",
            "onload=", "onerror=", "onclick=", "eval(", "document.cookie"
        ]
    
    def _check_suspicious_content(self, request: Request) -> bool:
        """Check for suspicious content in request"""
        # Check URL parameters
        for param, value in request.query_params.items():
            if any(pattern in value.lower() for pattern in self.suspicious_patterns):
                return True
        
        # Check headers
        for header, value in request.headers.items():
            if any(pattern in value.lower() for pattern in self.suspicious_patterns):
                return True
        
        return False
    
    def _log_security_event(self, event_type: str, request: Request, details: str = ""):
        """Log security events"""
        security_data = {
            "event_type": event_type,
            "client_ip": request.client.host if request.client else "unknown",
            "user_agent": request.headers.get("user-agent", ""),
            "path": request.url.path,
            "method": request.method,
            "details": details,
            "timestamp": time.time()
        }
        
        security_logger.warning(f"Security event: {json.dumps(security_data)}")
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        if not settings.SECURITY_MONITORING_ENABLED:
            return await call_next(request)
        
        # Check for suspicious content
        if self._check_suspicious_content(request):
            self._log_security_event("suspicious_content", request, "Potential XSS attempt")
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "error": "Invalid request",
                    "message": "Request contains suspicious content"
                }
            )
        
        # Check for missing or invalid headers in production
        if settings.is_production():
            if not request.headers.get("user-agent"):
                self._log_security_event("missing_user_agent", request)
            
            if request.headers.get("x-forwarded-for") and not request.headers.get("x-real-ip"):
                self._log_security_event("proxy_anomaly", request)
        
        response = await call_next(request)
        
        # Log security events based on response
        if response.status_code >= 400:
            self._log_security_event("error_response", request, f"Status: {response.status_code}")
        
        return response

class CORSValidationMiddleware(BaseHTTPMiddleware):
    """Middleware to validate CORS requests"""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.allowed_origins = settings.get_cors_origins()
        self.allowed_methods = settings.get_cors_methods()
        self.allowed_headers = settings.get_cors_headers()
    
    def _validate_origin(self, origin: str) -> bool:
        """Validate CORS origin"""
        if not origin:
            return False
        
        # Check exact match
        if origin in self.allowed_origins:
            return True
        
        # Check wildcard patterns
        for allowed_origin in self.allowed_origins:
            if allowed_origin == "*":
                return True
            if allowed_origin.endswith("*"):
                base_origin = allowed_origin[:-1]
                if origin.startswith(base_origin):
                    return True
        
        return False
    
    def _validate_method(self, method: str) -> bool:
        """Validate CORS method"""
        return method.upper() in [m.upper() for m in self.allowed_methods]
    
    def _validate_headers(self, headers: str) -> bool:
        """Validate CORS headers"""
        if not headers:
            return True
        
        requested_headers = [h.strip().lower() for h in headers.split(",")]
        
        for header in requested_headers:
            if header not in [h.lower() for h in self.allowed_headers] and "*" not in self.allowed_headers:
                return False
        
        return True
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Handle preflight requests
        if request.method == "OPTIONS":
            origin = request.headers.get("origin")
            method = request.headers.get("access-control-request-method")
            headers = request.headers.get("access-control-request-headers")
            
            # Validate origin
            if origin and not self._validate_origin(origin):
                security_logger.warning(f"Invalid CORS origin: {origin}")
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"error": "CORS origin not allowed"}
                )
            
            # Validate method
            if method and not self._validate_method(method):
                security_logger.warning(f"Invalid CORS method: {method}")
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"error": "CORS method not allowed"}
                )
            
            # Validate headers
            if headers and not self._validate_headers(headers):
                security_logger.warning(f"Invalid CORS headers: {headers}")
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={"error": "CORS headers not allowed"}
                )
        
        # Handle actual requests
        origin = request.headers.get("origin")
        if origin and not self._validate_origin(origin):
            security_logger.warning(f"Invalid CORS origin in request: {origin}")
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"error": "CORS origin not allowed"}
            )
        
        return await call_next(request)

def create_security_middleware_stack(app: ASGIApp) -> ASGIApp:
    """Create a stack of security middleware"""
    # Apply middleware in order (last applied = first executed)
    app = SecurityHeadersMiddleware(app)
    app = RateLimitMiddleware(app)
    app = RequestSizeMiddleware(app)
    app = SecurityMonitoringMiddleware(app)
    app = CORSValidationMiddleware(app)
    
    return app 