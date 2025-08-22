# Rate Limiting System Documentation

## Overview

The Frende backend implements a comprehensive rate limiting system designed to protect the API from abuse, ensure fair usage, and maintain optimal performance. The system supports multiple algorithms, distributed rate limiting with Redis, and granular control over different endpoints.

## Features

### 🚀 **Multi-Algorithm Support**
- **Fixed Window**: Simple counter per time window
- **Sliding Window**: More accurate rate limiting with overlapping windows  
- **Token Bucket**: Burst protection with token refill

### 🌐 **Distributed Rate Limiting**
- Redis-based distributed rate limiting for multi-server deployments
- In-memory fallback when Redis is unavailable
- Automatic failover and graceful degradation

### 🎯 **Granular Control**
- IP-based rate limiting for unauthenticated requests
- User-based rate limiting for authenticated users
- Endpoint-specific rate limiting with decorators
- Resource-based rate limiting for expensive operations

### 📊 **Analytics & Monitoring**
- Real-time rate limiting analytics
- Violation tracking and reporting
- Performance impact monitoring
- Admin API endpoints for management

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Rate Limiting Layers                     │
├─────────────────────────────────────────────────────────────┤
│ 1. Global Rate Limiting (IP-based)                         │
│ 2. User-based Rate Limiting (authenticated users)          │
│ 3. Endpoint-specific Rate Limiting                         │
│ 4. Resource-based Rate Limiting (AI, uploads, etc.)        │
│ 5. Burst Protection (token bucket algorithm)               │
└─────────────────────────────────────────────────────────────┘
```

## Configuration

### Environment Variables

```bash
# Rate Limiting
RATE_LIMITING_ENABLED=true
RATE_LIMIT_DEFAULT=100
RATE_LIMIT_AUTH=5
RATE_LIMIT_UPLOAD=10
RATE_LIMIT_WEBSOCKET=10

# Redis Configuration (for distributed rate limiting)
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false
REDIS_POOL_SIZE=10
REDIS_POOL_TIMEOUT=30
REDIS_RETRY_ON_TIMEOUT=true
```

### Default Rate Limits

| Endpoint Category | Rate Limit | Algorithm | Scope |
|------------------|------------|-----------|-------|
| Authentication | 5 requests/minute | Fixed Window | IP |
| Registration | 3 requests/hour | Fixed Window | IP |
| Password Reset | 2 requests/hour | Fixed Window | IP |
| API (Default) | 100 requests/minute | Sliding Window | User |
| Matching | 20 requests/minute | Sliding Window | User |
| Chat Messages | 60 requests/minute | Token Bucket | User |
| Tasks | 30 requests/minute | Sliding Window | User |
| AI Requests | 60 requests/minute | Token Bucket | User |
| File Uploads | 10 requests/hour | Fixed Window | User |
| WebSocket | 10 connections/minute | Fixed Window | IP |
| Admin | 200 requests/minute | Sliding Window | User |

## Usage

### 1. Automatic Rate Limiting

The system automatically applies rate limiting to all API endpoints based on the configuration. No additional code is required.

### 2. Using Decorators

For endpoint-specific rate limiting, use the provided decorators:

```python
from core.rate_limiting_decorators import (
    rate_limit, 
    user_rate_limit, 
    auth_rate_limit,
    resource_rate_limit,
    apply_rate_limit
)

# Custom rate limit
@rate_limit(requests_per_minute=50, algorithm="sliding_window")
async def custom_endpoint(request: Request):
    return {"message": "success"}

# User-based rate limiting
@user_rate_limit(requests_per_minute=30)
async def user_specific_endpoint(request: Request):
    return {"message": "user limited"}

# Authentication rate limiting
@auth_rate_limit(requests_per_minute=3)
async def login_endpoint(request: Request):
    return {"message": "login"}

# Resource-intensive operations
@resource_rate_limit(requests_per_minute=10, burst_limit=2)
async def ai_endpoint(request: Request):
    return {"message": "AI response"}

# Predefined configurations
@apply_rate_limit("chat_message")
async def chat_endpoint(request: Request):
    return {"message": "chat"}
```

### 3. Predefined Configurations

Use predefined rate limit configurations for common use cases:

```python
RATE_LIMIT_CONFIGS = {
    "auth_login": auth_rate_limit(5, "fixed_window"),
    "auth_register": rate_limit(3, "fixed_window", RateLimitScope.IP),
    "chat_message": user_rate_limit(60, "token_bucket", 10),
    "matching": user_rate_limit(20, "sliding_window"),
    "tasks": user_rate_limit(30, "sliding_window"),
    "ai_request": resource_rate_limit(60, "token_bucket", 5),
    "file_upload": rate_limit(10, "fixed_window", RateLimitScope.USER),
    "websocket": rate_limit(10, "fixed_window", RateLimitScope.IP),
}
```

## Response Headers

The system automatically adds rate limiting headers to all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

## Error Responses

When rate limits are exceeded, the system returns a 429 status code:

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "details": {
    "limit": 100,
    "remaining": 0,
    "reset": 1640995200,
    "retry_after": 60
  }
}
```

## Admin API Endpoints

### Get Analytics
```http
GET /api/v1/rate-limiting/analytics
```

Response:
```json
{
  "success": true,
  "data": {
    "total_requests": 1000,
    "total_violations": 25,
    "violation_rate": 0.025,
    "violations_by_endpoint": {
      "/api/v1/auth/login": 15,
      "/api/v1/chat": 10
    },
    "redis_enabled": true,
    "timestamp": "2024-01-20T10:00:00Z"
  }
}
```

### Get Status
```http
GET /api/v1/rate-limiting/status
```

### Get Configuration
```http
GET /api/v1/rate-limiting/config
```

### Get Violations
```http
GET /api/v1/rate-limiting/violations?limit=50
```

### Reset Analytics
```http
POST /api/v1/rate-limiting/analytics/reset
```

### Test Rate Limiting
```http
POST /api/v1/rate-limiting/test
Content-Type: application/json

{
  "endpoint": "/api/v1/auth/login",
  "requests": 10
}
```

## Algorithms

### Fixed Window
- **Use Case**: Simple rate limiting with clear boundaries
- **Pros**: Simple implementation, predictable behavior
- **Cons**: Can allow bursts at window boundaries
- **Best For**: Authentication, registration, password reset

### Sliding Window
- **Use Case**: More accurate rate limiting
- **Pros**: Smooth rate limiting, no burst issues
- **Cons**: More complex implementation
- **Best For**: General API endpoints, user actions

### Token Bucket
- **Use Case**: Burst protection with smooth rate limiting
- **Pros**: Allows bursts up to bucket size, smooth refill
- **Cons**: More complex, requires tuning
- **Best For**: Chat messages, AI requests, resource-intensive operations

## Monitoring & Analytics

### Key Metrics
- **Total Requests**: Number of requests processed
- **Total Violations**: Number of rate limit violations
- **Violation Rate**: Percentage of requests that exceeded limits
- **Violations by Endpoint**: Breakdown of violations by API endpoint
- **Redis Status**: Connection status for distributed rate limiting

### Alerting
Monitor these metrics for potential issues:
- High violation rates (>5%)
- Specific endpoints with high violation counts
- Redis connection failures
- Performance degradation

## Best Practices

### 1. Choose Appropriate Algorithms
- Use **Fixed Window** for authentication and registration
- Use **Sliding Window** for general API endpoints
- Use **Token Bucket** for chat and AI operations

### 2. Set Reasonable Limits
- Start with conservative limits and adjust based on usage
- Consider user experience when setting limits
- Monitor violation rates to optimize limits

### 3. Use Appropriate Scopes
- Use **IP scope** for unauthenticated endpoints
- Use **User scope** for authenticated endpoints
- Use **Resource scope** for expensive operations

### 4. Monitor and Adjust
- Regularly review analytics
- Adjust limits based on user behavior
- Monitor for abuse patterns

### 5. Graceful Degradation
- Ensure system works without Redis
- Provide clear error messages
- Include retry guidance in responses

## Troubleshooting

### Common Issues

1. **High Violation Rates**
   - Check if limits are too restrictive
   - Review user behavior patterns
   - Consider adjusting limits

2. **Redis Connection Issues**
   - Verify Redis server is running
   - Check connection configuration
   - System will fallback to in-memory storage

3. **Performance Issues**
   - Monitor Redis performance
   - Check for memory leaks in in-memory mode
   - Review algorithm choices

### Debug Mode

Enable debug logging to troubleshoot rate limiting issues:

```python
import logging
logging.getLogger("core.rate_limiting").setLevel(logging.DEBUG)
```

## Testing

### Unit Tests
Run the comprehensive test suite:

```bash
pytest tests/test_rate_limiting.py -v
```

### Load Testing
Test rate limiting under load:

```bash
# Test authentication rate limiting
for i in {1..10}; do curl -X POST http://localhost:8000/api/v1/auth/login; done

# Test user rate limiting
for i in {1..150}; do curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/api/v1/users/profile; done
```

### Manual Testing
Use the admin API to test rate limiting:

```bash
# Test rate limiting for specific endpoint
curl -X POST http://localhost:8000/api/v1/rate-limiting/test \
  -H "Content-Type: application/json" \
  -d '{"endpoint": "/api/v1/auth/login", "requests": 10}'
```

## Security Considerations

1. **IP Spoofing**: The system handles proxy headers (X-Forwarded-For, X-Real-IP)
2. **User Authentication**: User-based rate limiting requires proper authentication
3. **Admin Access**: Rate limiting admin endpoints require superuser privileges
4. **Redis Security**: Ensure Redis is properly secured in production

## Performance Impact

- **Redis Mode**: Minimal impact with proper Redis configuration
- **Memory Mode**: Low memory usage with automatic cleanup
- **Algorithm Overhead**: Token bucket has highest overhead, fixed window lowest
- **Monitoring**: Analytics collection has minimal performance impact

## Future Enhancements

1. **Dynamic Rate Limiting**: Adjust limits based on user behavior
2. **Geographic Rate Limiting**: Different limits by region
3. **Machine Learning**: Predict and prevent abuse patterns
4. **Rate Limit Negotiation**: Allow clients to request higher limits
5. **Advanced Analytics**: More detailed violation analysis and reporting
