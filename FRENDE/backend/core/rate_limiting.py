"""
Advanced rate limiting service for the Frende backend application.
Provides distributed rate limiting with Redis, multiple algorithms, and granular control.
"""

import time
import asyncio
import logging
from typing import Dict, Any, Optional, Tuple, Union
from datetime import datetime, timedelta
from collections import defaultdict, deque
import json
import hashlib

import redis.asyncio as redis
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse

from core.config import settings
from core.exceptions import RateLimitError

logger = logging.getLogger(__name__)

class RateLimitAlgorithm:
    """Base class for rate limiting algorithms"""
    
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
    
    async def is_allowed(self, key: str, redis_client: redis.Redis) -> Tuple[bool, Dict[str, Any]]:
        """Check if request is allowed and return rate limit info"""
        raise NotImplementedError

class FixedWindowRateLimiter(RateLimitAlgorithm):
    """Fixed window rate limiter with Redis"""
    
    async def is_allowed(self, key: str, redis_client: redis.Redis) -> Tuple[bool, Dict[str, Any]]:
        current_window = int(time.time() // self.window_seconds)
        window_key = f"{key}:{current_window}"
        
        # Get current count
        current_count = await redis_client.get(window_key)
        current_count = int(current_count) if current_count else 0
        
        # Check if limit exceeded
        if current_count >= self.max_requests:
            reset_time = (current_window + 1) * self.window_seconds
            return False, {
                "limit": self.max_requests,
                "remaining": 0,
                "reset": reset_time,
                "retry_after": max(0, reset_time - int(time.time()))
            }
        
        # Increment counter
        pipe = redis_client.pipeline()
        pipe.incr(window_key)
        pipe.expire(window_key, self.window_seconds)
        await pipe.execute()
        
        return True, {
            "limit": self.max_requests,
            "remaining": self.max_requests - current_count - 1,
            "reset": (current_window + 1) * self.window_seconds,
            "retry_after": 0
        }

class SlidingWindowRateLimiter(RateLimitAlgorithm):
    """Sliding window rate limiter with Redis"""
    
    async def is_allowed(self, key: str, redis_client: redis.Redis) -> Tuple[bool, Dict[str, Any]]:
        now = int(time.time())
        window_start = now - self.window_seconds
        
        # Get all requests in current window
        pipe = redis_client.pipeline()
        pipe.zremrangebyscore(key, 0, window_start)
        pipe.zcard(key)
        pipe.zadd(key, {str(now): now})
        pipe.expire(key, self.window_seconds)
        results = await pipe.execute()
        
        current_count = results[1]
        
        if current_count >= self.max_requests:
            # Get oldest request to calculate reset time
            oldest = await redis_client.zrange(key, 0, 0, withscores=True)
            if oldest:
                reset_time = int(oldest[0][1]) + self.window_seconds
            else:
                reset_time = now + self.window_seconds
            
            return False, {
                "limit": self.max_requests,
                "remaining": 0,
                "reset": reset_time,
                "retry_after": max(0, reset_time - now)
            }
        
        return True, {
            "limit": self.max_requests,
            "remaining": self.max_requests - current_count,
            "reset": now + self.window_seconds,
            "retry_after": 0
        }

class TokenBucketRateLimiter(RateLimitAlgorithm):
    """Token bucket rate limiter with burst protection"""
    
    def __init__(self, max_requests: int, window_seconds: int, burst_limit: int = None):
        super().__init__(max_requests, window_seconds)
        self.burst_limit = burst_limit or max_requests
        self.refill_rate = max_requests / window_seconds
    
    async def is_allowed(self, key: str, redis_client: redis.Redis) -> Tuple[bool, Dict[str, Any]]:
        now = time.time()
        
        # Get current bucket state
        bucket_data = await redis_client.hgetall(key)
        
        if not bucket_data:
            # Initialize bucket
            tokens = self.burst_limit
            last_refill = now
        else:
            tokens = float(bucket_data.get(b'tokens', self.burst_limit))
            last_refill = float(bucket_data.get(b'last_refill', now))
        
        # Calculate tokens to refill
        time_passed = now - last_refill
        tokens_to_add = time_passed * self.refill_rate
        tokens = min(self.burst_limit, tokens + tokens_to_add)
        
        # Check if we have enough tokens
        if tokens < 1:
            # Calculate when next token will be available
            tokens_needed = 1 - tokens
            time_to_next = tokens_needed / self.refill_rate
            reset_time = int(now + time_to_next)
            
            return False, {
                "limit": self.max_requests,
                "remaining": 0,
                "reset": reset_time,
                "retry_after": max(0, int(time_to_next))
            }
        
        # Consume token
        tokens -= 1
        
        # Update bucket state
        pipe = redis_client.pipeline()
        pipe.hset(key, "tokens", tokens)
        pipe.hset(key, "last_refill", now)
        pipe.expire(key, self.window_seconds * 2)  # Keep bucket data longer
        await pipe.execute()
        
        return True, {
            "limit": self.max_requests,
            "remaining": int(tokens),
            "reset": int(now + self.window_seconds),
            "retry_after": 0
        }

class RateLimitScope:
    """Rate limiting scope definitions"""
    
    IP = "ip"
    USER = "user"
    ENDPOINT = "endpoint"
    RESOURCE = "resource"
    GLOBAL = "global"

class RateLimiter:
    """Main rate limiter service"""
    
    def __init__(self, redis_url: str = None):
        self.redis_client = None
        self.use_redis = bool(redis_url and settings.REDIS_ENABLED)
        
        if self.use_redis:
            self.redis_client = redis.from_url(redis_url)
            logger.info("Rate limiter initialized with Redis")
        else:
            logger.info("Rate limiter initialized with in-memory storage")
        
        # In-memory fallback
        self.memory_limits = defaultdict(lambda: deque())
        
        # Algorithm registry
        self.algorithms = {
            "fixed_window": FixedWindowRateLimiter,
            "sliding_window": SlidingWindowRateLimiter,
            "token_bucket": TokenBucketRateLimiter
        }
        
        # Rate limit configuration
        self.rate_limits = self._load_rate_limit_config()
        
        # Analytics
        self.violations = defaultdict(int)
        self.total_requests = 0
    
    def _load_rate_limit_config(self) -> Dict[str, Dict[str, Any]]:
        """Load rate limit configuration from settings"""
        return {
            "global": {
                "requests_per_minute": settings.RATE_LIMIT_DEFAULT,
                "algorithm": "sliding_window",
                "scope": RateLimitScope.IP
            },
            "auth": {
                "login": {
                    "requests_per_minute": 5,
                    "algorithm": "fixed_window",
                    "scope": RateLimitScope.IP
                },
                "register": {
                    "requests_per_hour": 3,
                    "algorithm": "fixed_window",
                    "scope": RateLimitScope.IP
                },
                "password_reset": {
                    "requests_per_hour": 2,
                    "algorithm": "fixed_window",
                    "scope": RateLimitScope.IP
                },
                "token_refresh": {
                    "requests_per_minute": 10,
                    "algorithm": "sliding_window",
                    "scope": RateLimitScope.USER
                }
            },
            "api": {
                "default": {
                    "requests_per_minute": 100,
                    "algorithm": "sliding_window",
                    "scope": RateLimitScope.USER
                },
                "matching": {
                    "requests_per_minute": 20,
                    "algorithm": "sliding_window",
                    "scope": RateLimitScope.USER
                },
                "chat": {
                    "requests_per_minute": 60,
                    "algorithm": "token_bucket",
                    "burst_limit": 10,
                    "scope": RateLimitScope.USER
                },
                "tasks": {
                    "requests_per_minute": 30,
                    "algorithm": "sliding_window",
                    "scope": RateLimitScope.USER
                },
                "profile": {
                    "requests_per_minute": 50,
                    "algorithm": "sliding_window",
                    "scope": RateLimitScope.USER
                }
            },
            "resources": {
                "ai": {
                    "requests_per_minute": 60,
                    "algorithm": "token_bucket",
                    "burst_limit": 5,
                    "scope": RateLimitScope.USER
                },
                "upload": {
                    "requests_per_hour": 10,
                    "algorithm": "fixed_window",
                    "scope": RateLimitScope.USER
                },
                "websocket": {
                    "connections_per_minute": 10,
                    "algorithm": "fixed_window",
                    "scope": RateLimitScope.IP
                }
            },
            "admin": {
                "requests_per_minute": 200,
                "algorithm": "sliding_window",
                "scope": RateLimitScope.USER
            }
        }
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address with proxy support"""
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
    
    def _get_user_id(self, request: Request) -> Optional[str]:
        """Get user ID from request (if authenticated)"""
        # This will be populated by authentication middleware
        return getattr(request.state, "user_id", None)
    
    def _generate_key(self, scope: str, identifier: str, endpoint: str = None) -> str:
        """Generate Redis key for rate limiting"""
        key_parts = ["rate_limit", scope, identifier]
        if endpoint:
            key_parts.append(endpoint)
        return ":".join(key_parts)
    
    def _get_rate_limit_config(self, request: Request) -> Dict[str, Any]:
        """Get rate limit configuration for the request"""
        
        # Check for custom rate limit configuration (from decorators)
        if hasattr(request.state, 'custom_rate_limit'):
            return request.state.custom_rate_limit
        
        path = request.url.path
        method = request.method
        
        # Check specific endpoint patterns
        if path.startswith("/api/v1/auth/login"):
            return self.rate_limits["auth"]["login"]
        elif path.startswith("/api/v1/auth/register"):
            return self.rate_limits["auth"]["register"]
        elif path.startswith("/api/v1/auth/password-reset"):
            return self.rate_limits["auth"]["password_reset"]
        elif path.startswith("/api/v1/auth/refresh"):
            return self.rate_limits["auth"]["token_refresh"]
        elif path.startswith("/api/v1/matching"):
            return self.rate_limits["api"]["matching"]
        elif path.startswith("/api/v1/chat"):
            return self.rate_limits["api"]["chat"]
        elif path.startswith("/api/v1/tasks"):
            return self.rate_limits["api"]["tasks"]
        elif path.startswith("/api/v1/users/profile"):
            return self.rate_limits["api"]["profile"]
        elif path.startswith("/api/v1/ai"):
            return self.rate_limits["resources"]["ai"]
        elif path.startswith("/api/v1/upload"):
            return self.rate_limits["resources"]["upload"]
        elif path.startswith("/ws"):
            return self.rate_limits["resources"]["websocket"]
        elif path.startswith("/api/v1/monitoring") and self._is_admin(request):
            return self.rate_limits["admin"]
        
        # Default API rate limit
        return self.rate_limits["api"]["default"]
    
    def _is_admin(self, request: Request) -> bool:
        """Check if user is admin"""
        user = getattr(request.state, "user", None)
        return user and getattr(user, "is_superuser", False)
    
    async def _check_memory_rate_limit(self, key: str, limit: int, window: int) -> Tuple[bool, Dict[str, Any]]:
        """Check rate limit using in-memory storage"""
        now = time.time()
        window_start = now - window
        
        # Clean old entries
        while self.memory_limits[key] and self.memory_limits[key][0] < window_start:
            self.memory_limits[key].popleft()
        
        # Check if limit exceeded
        if len(self.memory_limits[key]) >= limit:
            reset_time = int(self.memory_limits[key][0] + window)
            return False, {
                "limit": limit,
                "remaining": 0,
                "reset": reset_time,
                "retry_after": max(0, reset_time - int(now))
            }
        
        # Add current request
        self.memory_limits[key].append(now)
        
        return True, {
            "limit": limit,
            "remaining": limit - len(self.memory_limits[key]),
            "reset": int(now + window),
            "retry_after": 0
        }
    
    async def check_rate_limit(self, request: Request) -> Tuple[bool, Dict[str, Any]]:
        """Check if request is allowed based on rate limits"""
        self.total_requests += 1
        
        # Get rate limit configuration
        config = self._get_rate_limit_config(request)
        scope = config.get("scope", RateLimitScope.IP)
        
        # Get identifier based on scope
        if scope == RateLimitScope.IP:
            identifier = self._get_client_ip(request)
        elif scope == RateLimitScope.USER:
            user_id = self._get_user_id(request)
            if not user_id:
                # Fallback to IP if user not authenticated
                identifier = self._get_client_ip(request)
            else:
                identifier = f"user:{user_id}"
        else:
            identifier = "global"
        
        # Generate rate limit key
        key = self._generate_key(scope, identifier, request.url.path)
        
        # Get algorithm and parameters
        algorithm_name = config.get("algorithm", "sliding_window")
        max_requests = config.get("requests_per_minute", 100)
        window_seconds = 60  # Default to 1 minute
        
        # Handle different time windows
        if "per_hour" in config:
            max_requests = config["requests_per_hour"]
            window_seconds = 3600
        elif "per_minute" in config:
            max_requests = config["requests_per_minute"]
            window_seconds = 60
        
        # Check rate limit
        if self.use_redis and self.redis_client:
            # Use Redis-based rate limiting
            algorithm_class = self.algorithms[algorithm_name]
            algorithm = algorithm_class(max_requests, window_seconds)
            
            # Add burst limit for token bucket
            if algorithm_name == "token_bucket" and "burst_limit" in config:
                algorithm.burst_limit = config["burst_limit"]
            
            is_allowed, rate_info = await algorithm.is_allowed(key, self.redis_client)
        else:
            # Use in-memory rate limiting
            is_allowed, rate_info = await self._check_memory_rate_limit(key, max_requests, window_seconds)
        
        # Track violations
        if not is_allowed:
            self.violations[request.url.path] += 1
            logger.warning(
                f"Rate limit exceeded: {scope}={identifier}, "
                f"path={request.url.path}, limit={rate_info['limit']}"
            )
        
        return is_allowed, rate_info
    
    async def get_rate_limit_headers(self, rate_info: Dict[str, Any]) -> Dict[str, str]:
        """Generate rate limit headers for response"""
        return {
            "X-RateLimit-Limit": str(rate_info["limit"]),
            "X-RateLimit-Remaining": str(rate_info["remaining"]),
            "X-RateLimit-Reset": str(rate_info["reset"])
        }
    
    async def get_analytics(self) -> Dict[str, Any]:
        """Get rate limiting analytics"""
        total_violations = sum(self.violations.values())
        
        return {
            "total_requests": self.total_requests,
            "total_violations": total_violations,
            "violation_rate": total_violations / max(self.total_requests, 1),
            "violations_by_endpoint": dict(self.violations),
            "redis_enabled": self.use_redis,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def reset_analytics(self):
        """Reset analytics counters"""
        self.violations.clear()
        self.total_requests = 0
    
    async def close(self):
        """Close Redis connection"""
        if self.redis_client:
            await self.redis_client.close()

# Global rate limiter instance
rate_limiter = RateLimiter(settings.REDIS_URL if settings.REDIS_ENABLED else None)
