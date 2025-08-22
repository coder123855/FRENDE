"""
Security Headers Middleware for FastAPI

This module provides comprehensive security headers middleware to protect
the application against various security vulnerabilities.
"""

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import RequestResponseEndpoint
from typing import Optional
import time


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware to add security headers to all responses.
    
    Implements:
    - Content Security Policy (CSP)
    - HTTP Strict Transport Security (HSTS)
    - X-Frame-Options
    - X-Content-Type-Options
    - X-XSS-Protection
    - Referrer-Policy
    - Permissions-Policy
    - Cache-Control for sensitive endpoints
    """
    
    def __init__(
        self,
        app,
        csp_policy: Optional[str] = None,
        hsts_max_age: int = 31536000,
        enable_hsts: bool = True,
        enable_csp: bool = True,
        enable_frame_options: bool = True,
        enable_content_type_options: bool = True,
        enable_xss_protection: bool = True,
        enable_referrer_policy: bool = True,
        enable_permissions_policy: bool = True,
    ):
        super().__init__(app)
        self.csp_policy = csp_policy or self._get_default_csp()
        self.hsts_max_age = hsts_max_age
        self.enable_hsts = enable_hsts
        self.enable_csp = enable_csp
        self.enable_frame_options = enable_frame_options
        self.enable_content_type_options = enable_content_type_options
        self.enable_xss_protection = enable_xss_protection
        self.enable_referrer_policy = enable_referrer_policy
        self.enable_permissions_policy = enable_permissions_policy
    
    def _get_default_csp(self) -> str:
        """Get default Content Security Policy."""
        return (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; "
            "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; "
            "img-src 'self' data: https: blob:; "
            "media-src 'self' https:; "
            "connect-src 'self' https: wss:; "
            "frame-src 'self' https:; "
            "object-src 'none'; "
            "base-uri 'self'; "
            "form-action 'self'; "
            "frame-ancestors 'self'; "
            "upgrade-insecure-requests;"
        )
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        """Add security headers to the response."""
        response = await call_next(request)
        
        # Add security headers
        if self.enable_hsts:
            response.headers["Strict-Transport-Security"] = f"max-age={self.hsts_max_age}; includeSubDomains; preload"
        
        if self.enable_csp:
            response.headers["Content-Security-Policy"] = self.csp_policy
        
        if self.enable_frame_options:
            response.headers["X-Frame-Options"] = "DENY"
        
        if self.enable_content_type_options:
            response.headers["X-Content-Type-Options"] = "nosniff"
        
        if self.enable_xss_protection:
            response.headers["X-XSS-Protection"] = "1; mode=block"
        
        if self.enable_referrer_policy:
            response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        
        if self.enable_permissions_policy:
            response.headers["Permissions-Policy"] = (
                "camera=(), microphone=(), geolocation=(), "
                "payment=(), usb=(), magnetometer=(), gyroscope=(), "
                "accelerometer=(), ambient-light-sensor=(), autoplay=()"
            )
        
        # Add cache control for sensitive endpoints
        if self._is_sensitive_endpoint(request.url.path):
            response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        # Add timestamp header for debugging
        response.headers["X-Response-Time"] = str(time.time())
        
        return response
    
    def _is_sensitive_endpoint(self, path: str) -> bool:
        """Check if the endpoint is sensitive and should not be cached."""
        sensitive_paths = [
            "/api/auth/",
            "/api/users/me",
            "/api/matches/",
            "/api/chat/",
            "/api/tasks/",
            "/admin/",
        ]
        return any(sensitive_path in path for sensitive_path in sensitive_paths)


class CORSMiddleware:
    """
    Enhanced CORS middleware with security considerations.
    """
    
    def __init__(
        self,
        app,
        allow_origins: list = None,
        allow_credentials: bool = True,
        allow_methods: list = None,
        allow_headers: list = None,
    ):
        self.app = app
        self.allow_origins = allow_origins or ["https://frende.app", "https://staging.frende.app"]
        self.allow_credentials = allow_credentials
        self.allow_methods = allow_methods or ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
        self.allow_headers = allow_headers or ["*"]
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            # Add CORS headers
            headers = dict(scope.get("headers", []))
            
            origin = headers.get(b"origin", b"").decode()
            if origin in self.allow_origins:
                scope["headers"].append((b"access-control-allow-origin", origin.encode()))
            
            scope["headers"].extend([
                (b"access-control-allow-credentials", b"true" if self.allow_credentials else b"false"),
                (b"access-control-allow-methods", ", ".join(self.allow_methods).encode()),
                (b"access-control-allow-headers", ", ".join(self.allow_headers).encode()),
            ])
        
        await self.app(scope, receive, send)


def create_security_middleware_stack(app, config):
    """
    Create a stack of security middleware.
    
    Args:
        app: FastAPI application instance
        config: Application configuration
    
    Returns:
        FastAPI app with security middleware
    """
    # Add security headers middleware
    app.add_middleware(
        SecurityHeadersMiddleware,
        enable_hsts=config.ENVIRONMENT == "production",
        enable_csp=True,
        csp_policy=config.CSP_POLICY if hasattr(config, 'CSP_POLICY') else None,
    )
    
    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=config.ALLOWED_ORIGINS,
        allow_credentials=True,
    )
    
    return app
