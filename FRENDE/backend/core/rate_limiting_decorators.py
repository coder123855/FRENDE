"""
Rate limiting decorators for FastAPI endpoints.
Provides granular rate limiting control for individual endpoints.
"""

import functools
import logging
from typing import Callable, Optional, Dict, Any
from fastapi import Request, HTTPException, status, Depends
from fastapi.responses import JSONResponse

from core.rate_limiting import rate_limiter, RateLimitScope

logger = logging.getLogger(__name__)

def rate_limit(
    requests_per_minute: int = 100,
    algorithm: str = "sliding_window",
    scope: str = RateLimitScope.USER,
    burst_limit: Optional[int] = None,
    error_message: Optional[str] = None
):
    """
    Decorator to apply rate limiting to an endpoint.
    
    Args:
        requests_per_minute: Maximum requests per minute
        algorithm: Rate limiting algorithm (fixed_window, sliding_window, token_bucket)
        scope: Rate limiting scope (ip, user, endpoint, resource, global)
        burst_limit: Burst limit for token bucket algorithm
        error_message: Custom error message
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            # Find request object in args or kwargs
            request = None
            for arg in args:
                if isinstance(arg, Request):
                    request = arg
                    break
            
            if not request:
                request = kwargs.get('request')
            
            if not request:
                logger.warning(f"Rate limiting decorator applied to {func.__name__} but no request found")
                return await func(*args, **kwargs)
            
            # Create custom rate limit configuration
            config = {
                "requests_per_minute": requests_per_minute,
                "algorithm": algorithm,
                "scope": scope
            }
            
            if burst_limit and algorithm == "token_bucket":
                config["burst_limit"] = burst_limit
            
            # Override rate limit configuration for this request
            original_config = rate_limiter._get_rate_limit_config(request)
            request.state.custom_rate_limit = config
            
            # Check rate limit
            is_allowed, rate_info = await rate_limiter.check_rate_limit(request)
            
            if not is_allowed:
                retry_after = rate_info.get("retry_after", 60)
                message = error_message or "Rate limit exceeded for this endpoint"
                
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": "Rate limit exceeded",
                        "message": message,
                        "details": {
                            "limit": rate_info["limit"],
                            "remaining": rate_info["remaining"],
                            "reset": rate_info["reset"],
                            "retry_after": retry_after,
                            "endpoint": func.__name__
                        }
                    },
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(rate_info["limit"]),
                        "X-RateLimit-Remaining": str(rate_info["remaining"]),
                        "X-RateLimit-Reset": str(rate_info["reset"])
                    }
                )
            
            # Clear custom rate limit
            if hasattr(request.state, 'custom_rate_limit'):
                delattr(request.state, 'custom_rate_limit')
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator

def user_rate_limit(
    requests_per_minute: int = 100,
    algorithm: str = "sliding_window",
    burst_limit: Optional[int] = None
):
    """
    Decorator for user-based rate limiting.
    
    Args:
        requests_per_minute: Maximum requests per minute per user
        algorithm: Rate limiting algorithm
        burst_limit: Burst limit for token bucket algorithm
    """
    return rate_limit(
        requests_per_minute=requests_per_minute,
        algorithm=algorithm,
        scope=RateLimitScope.USER,
        burst_limit=burst_limit,
        error_message="User rate limit exceeded"
    )

def ip_rate_limit(
    requests_per_minute: int = 100,
    algorithm: str = "sliding_window"
):
    """
    Decorator for IP-based rate limiting.
    
    Args:
        requests_per_minute: Maximum requests per minute per IP
        algorithm: Rate limiting algorithm
    """
    return rate_limit(
        requests_per_minute=requests_per_minute,
        algorithm=algorithm,
        scope=RateLimitScope.IP,
        error_message="IP rate limit exceeded"
    )

def resource_rate_limit(
    requests_per_minute: int = 60,
    algorithm: str = "token_bucket",
    burst_limit: int = 5
):
    """
    Decorator for resource-intensive operations.
    
    Args:
        requests_per_minute: Maximum requests per minute
        algorithm: Rate limiting algorithm (default: token_bucket)
        burst_limit: Burst limit for token bucket algorithm
    """
    return rate_limit(
        requests_per_minute=requests_per_minute,
        algorithm=algorithm,
        scope=RateLimitScope.RESOURCE,
        burst_limit=burst_limit,
        error_message="Resource rate limit exceeded"
    )

def auth_rate_limit(
    requests_per_minute: int = 5,
    algorithm: str = "fixed_window"
):
    """
    Decorator for authentication endpoints.
    
    Args:
        requests_per_minute: Maximum requests per minute per IP
        algorithm: Rate limiting algorithm (default: fixed_window)
    """
    return rate_limit(
        requests_per_minute=requests_per_minute,
        algorithm=algorithm,
        scope=RateLimitScope.IP,
        error_message="Authentication rate limit exceeded"
    )

def admin_rate_limit(
    requests_per_minute: int = 200,
    algorithm: str = "sliding_window"
):
    """
    Decorator for admin endpoints.
    
    Args:
        requests_per_minute: Maximum requests per minute per admin user
        algorithm: Rate limiting algorithm
    """
    return rate_limit(
        requests_per_minute=requests_per_minute,
        algorithm=algorithm,
        scope=RateLimitScope.USER,
        error_message="Admin rate limit exceeded"
    )

# Predefined rate limit configurations for common use cases
RATE_LIMIT_CONFIGS = {
    "auth_login": auth_rate_limit(5, "fixed_window"),
    "auth_register": rate_limit(3, "fixed_window", RateLimitScope.IP, error_message="Registration rate limit exceeded"),
    "auth_password_reset": rate_limit(2, "fixed_window", RateLimitScope.IP, error_message="Password reset rate limit exceeded"),
    "chat_message": user_rate_limit(60, "token_bucket", 10),
    "matching": user_rate_limit(20, "sliding_window"),
    "tasks": user_rate_limit(30, "sliding_window"),
    "profile": user_rate_limit(50, "sliding_window"),
    "ai_request": resource_rate_limit(60, "token_bucket", 5),
    "file_upload": rate_limit(10, "fixed_window", RateLimitScope.USER, error_message="Upload rate limit exceeded"),
    "websocket": rate_limit(10, "fixed_window", RateLimitScope.IP, error_message="WebSocket connection rate limit exceeded"),
    "admin": admin_rate_limit(200, "sliding_window")
}

def apply_rate_limit(config_name: str):
    """
    Apply a predefined rate limit configuration.
    
    Args:
        config_name: Name of the predefined configuration
    """
    if config_name not in RATE_LIMIT_CONFIGS:
        raise ValueError(f"Unknown rate limit configuration: {config_name}")
    
    return RATE_LIMIT_CONFIGS[config_name]
