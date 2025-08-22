"""
Tests for the rate limiting system.
Tests all rate limiting algorithms, middleware, and API endpoints.
"""

import pytest
import asyncio
import time
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from fastapi import FastAPI, Request

from core.rate_limiting import (
    RateLimiter, 
    FixedWindowRateLimiter, 
    SlidingWindowRateLimiter, 
    TokenBucketRateLimiter,
    RateLimitScope
)
from core.rate_limiting_middleware import RateLimitMiddleware
from core.rate_limiting_decorators import rate_limit, user_rate_limit, auth_rate_limit
from api.rate_limiting import router as rate_limiting_router

@pytest.fixture
def mock_redis():
    """Mock Redis client for testing"""
    mock_redis = AsyncMock()
    mock_redis.get.return_value = None
    mock_redis.set.return_value = True
    mock_redis.incr.return_value = 1
    mock_redis.expire.return_value = True
    mock_redis.pipeline.return_value.__aenter__.return_value = mock_redis
    mock_redis.pipeline.return_value.__aexit__.return_value = None
    mock_redis.zremrangebyscore.return_value = 0
    mock_redis.zcard.return_value = 0
    mock_redis.zadd.return_value = 1
    mock_redis.zrange.return_value = []
    mock_redis.hgetall.return_value = {}
    mock_redis.hset.return_value = 1
    mock_redis.ping.return_value = True
    return mock_redis

@pytest.fixture
def rate_limiter(mock_redis):
    """Rate limiter instance for testing"""
    with patch('core.rate_limiting.redis.from_url', return_value=mock_redis):
        limiter = RateLimiter("redis://localhost:6379")
        limiter.use_redis = True
        limiter.redis_client = mock_redis
        return limiter

@pytest.fixture
def mock_request():
    """Mock FastAPI request for testing"""
    request = Mock(spec=Request)
    request.url.path = "/api/v1/test"
    request.method = "GET"
    request.client.host = "127.0.0.1"
    request.headers = {}
    request.state = Mock()
    return request

class TestRateLimitAlgorithms:
    """Test rate limiting algorithms"""
    
    @pytest.mark.asyncio
    async def test_fixed_window_rate_limiter(self, mock_redis):
        """Test fixed window rate limiter"""
        limiter = FixedWindowRateLimiter(5, 60)
        key = "test:key"
        
        # First 5 requests should be allowed
        for i in range(5):
            is_allowed, info = await limiter.is_allowed(key, mock_redis)
            assert is_allowed
            assert info["remaining"] == 4 - i
        
        # 6th request should be blocked
        is_allowed, info = await limiter.is_allowed(key, mock_redis)
        assert not is_allowed
        assert info["remaining"] == 0
    
    @pytest.mark.asyncio
    async def test_sliding_window_rate_limiter(self, mock_redis):
        """Test sliding window rate limiter"""
        limiter = SlidingWindowRateLimiter(5, 60)
        key = "test:key"
        
        # Mock Redis pipeline results
        mock_redis.pipeline.return_value.__aenter__.return_value.execute.return_value = [0, 0, 1, True]
        
        # First request should be allowed
        is_allowed, info = await limiter.is_allowed(key, mock_redis)
        assert is_allowed
        assert info["remaining"] == 4
    
    @pytest.mark.asyncio
    async def test_token_bucket_rate_limiter(self, mock_redis):
        """Test token bucket rate limiter"""
        limiter = TokenBucketRateLimiter(10, 60, burst_limit=5)
        key = "test:key"
        
        # Mock empty bucket
        mock_redis.hgetall.return_value = {}
        
        # First request should be allowed (bucket starts full)
        is_allowed, info = await limiter.is_allowed(key, mock_redis)
        assert is_allowed
        assert info["remaining"] == 4  # 5 - 1

class TestRateLimiter:
    """Test main rate limiter service"""
    
    @pytest.mark.asyncio
    async def test_check_rate_limit_ip_scope(self, rate_limiter, mock_request):
        """Test IP-based rate limiting"""
        # Mock algorithm
        with patch.object(rate_limiter, '_get_rate_limit_config') as mock_config:
            mock_config.return_value = {
                "requests_per_minute": 10,
                "algorithm": "fixed_window",
                "scope": RateLimitScope.IP
            }
            
            # Mock algorithm result
            with patch.object(FixedWindowRateLimiter, 'is_allowed') as mock_algorithm:
                mock_algorithm.return_value = (True, {
                    "limit": 10,
                    "remaining": 9,
                    "reset": int(time.time()) + 60,
                    "retry_after": 0
                })
                
                is_allowed, info = await rate_limiter.check_rate_limit(mock_request)
                assert is_allowed
                assert info["limit"] == 10
    
    @pytest.mark.asyncio
    async def test_check_rate_limit_user_scope(self, rate_limiter, mock_request):
        """Test user-based rate limiting"""
        # Set user ID in request state
        mock_request.state.user_id = "user123"
        
        with patch.object(rate_limiter, '_get_rate_limit_config') as mock_config:
            mock_config.return_value = {
                "requests_per_minute": 10,
                "algorithm": "sliding_window",
                "scope": RateLimitScope.USER
            }
            
            with patch.object(SlidingWindowRateLimiter, 'is_allowed') as mock_algorithm:
                mock_algorithm.return_value = (True, {
                    "limit": 10,
                    "remaining": 9,
                    "reset": int(time.time()) + 60,
                    "retry_after": 0
                })
                
                is_allowed, info = await rate_limiter.check_rate_limit(mock_request)
                assert is_allowed
    
    @pytest.mark.asyncio
    async def test_memory_fallback(self, mock_request):
        """Test in-memory rate limiting fallback"""
        limiter = RateLimiter()  # No Redis URL
        limiter.use_redis = False
        
        with patch.object(limiter, '_get_rate_limit_config') as mock_config:
            mock_config.return_value = {
                "requests_per_minute": 5,
                "algorithm": "fixed_window",
                "scope": RateLimitScope.IP
            }
            
            # First 5 requests should be allowed
            for i in range(5):
                is_allowed, info = await limiter.check_rate_limit(mock_request)
                assert is_allowed
            
            # 6th request should be blocked
            is_allowed, info = await limiter.check_rate_limit(mock_request)
            assert not is_allowed
    
    @pytest.mark.asyncio
    async def test_analytics(self, rate_limiter):
        """Test rate limiting analytics"""
        analytics = await rate_limiter.get_analytics()
        
        assert "total_requests" in analytics
        assert "total_violations" in analytics
        assert "violation_rate" in analytics
        assert "violations_by_endpoint" in analytics
        assert "redis_enabled" in analytics
        assert "timestamp" in analytics

class TestRateLimitMiddleware:
    """Test rate limiting middleware"""
    
    @pytest.mark.asyncio
    async def test_middleware_skip_paths(self):
        """Test that middleware skips certain paths"""
        app = FastAPI()
        middleware = RateLimitMiddleware(app)
        
        # Test skip paths
        assert middleware._should_skip_rate_limit("/health")
        assert middleware._should_skip_rate_limit("/docs")
        assert middleware._should_skip_rate_limit("/api/v1/health")
        
        # Test non-skip paths
        assert not middleware._should_skip_rate_limit("/api/v1/users")
        assert not middleware._should_skip_rate_limit("/api/v1/auth/login")
    
    @pytest.mark.asyncio
    async def test_middleware_rate_limit_exceeded(self, mock_request):
        """Test middleware when rate limit is exceeded"""
        app = FastAPI()
        middleware = RateLimitMiddleware(app)
        
        # Mock rate limiter to return exceeded
        with patch('core.rate_limiting.rate_limiter.check_rate_limit') as mock_check:
            mock_check.return_value = (False, {
                "limit": 10,
                "remaining": 0,
                "reset": int(time.time()) + 60,
                "retry_after": 60
            })
            
            # Mock call_next
            async def mock_call_next(request):
                return Mock()
            
            response = await middleware.dispatch(mock_request, mock_call_next)
            
            assert response.status_code == 429
            assert "Rate limit exceeded" in response.body.decode()

class TestRateLimitDecorators:
    """Test rate limiting decorators"""
    
    @pytest.mark.asyncio
    async def test_rate_limit_decorator(self, mock_request):
        """Test rate limit decorator"""
        @rate_limit(requests_per_minute=5, algorithm="fixed_window")
        async def test_endpoint(request: Request):
            return {"message": "success"}
        
        # Mock rate limiter
        with patch('core.rate_limiting.rate_limiter.check_rate_limit') as mock_check:
            mock_check.return_value = (True, {
                "limit": 5,
                "remaining": 4,
                "reset": int(time.time()) + 60,
                "retry_after": 0
            })
            
            result = await test_endpoint(mock_request)
            assert result["message"] == "success"
    
    @pytest.mark.asyncio
    async def test_auth_rate_limit_decorator(self, mock_request):
        """Test auth rate limit decorator"""
        @auth_rate_limit(requests_per_minute=3)
        async def login_endpoint(request: Request):
            return {"message": "login success"}
        
        # Mock rate limiter to return exceeded
        with patch('core.rate_limiting.rate_limiter.check_rate_limit') as mock_check:
            mock_check.return_value = (False, {
                "limit": 3,
                "remaining": 0,
                "reset": int(time.time()) + 60,
                "retry_after": 60
            })
            
            response = await login_endpoint(mock_request)
            assert response.status_code == 429
            assert "Authentication rate limit exceeded" in response.body.decode()

class TestRateLimitAPI:
    """Test rate limiting API endpoints"""
    
    def test_get_analytics_endpoint(self, client):
        """Test rate limiting analytics endpoint"""
        # Mock authentication
        with patch('core.auth.get_current_user') as mock_auth:
            mock_user = Mock()
            mock_user.is_superuser = True
            mock_auth.return_value = mock_user
            
            # Mock rate limiter analytics
            with patch('core.rate_limiting.rate_limiter.get_analytics') as mock_analytics:
                mock_analytics.return_value = {
                    "total_requests": 100,
                    "total_violations": 5,
                    "violation_rate": 0.05,
                    "violations_by_endpoint": {"/api/v1/auth/login": 3},
                    "redis_enabled": True,
                    "timestamp": "2024-01-20T10:00:00Z"
                }
                
                response = client.get("/api/v1/rate-limiting/analytics")
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert data["data"]["total_requests"] == 100
    
    def test_get_status_endpoint(self, client):
        """Test rate limiting status endpoint"""
        with patch('core.auth.get_current_user') as mock_auth:
            mock_user = Mock()
            mock_user.is_superuser = True
            mock_auth.return_value = mock_user
            
            with patch('core.rate_limiting.rate_limiter.get_analytics') as mock_analytics:
                mock_analytics.return_value = {
                    "total_requests": 100,
                    "total_violations": 5,
                    "violation_rate": 0.05,
                    "violations_by_endpoint": {}
                }
                
                response = client.get("/api/v1/rate-limiting/status")
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert data["data"]["service_status"] == "running"

@pytest.fixture
def client():
    """Test client for API endpoints"""
    app = FastAPI()
    app.include_router(rate_limiting_router, prefix="/api/v1")
    return TestClient(app)

if __name__ == "__main__":
    pytest.main([__file__])
