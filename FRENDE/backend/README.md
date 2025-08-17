# Frende Backend

![Coverage](https://img.shields.io/badge/coverage-85%25-green)

A FastAPI-based backend for the Frende social media application, providing AI-powered friend matching, task generation, and real-time chat functionality.

## 🚀 Features

- **JWT Authentication** with fastapi-users
- **Real-time Chat** with WebSocket support
- **AI Integration** with Google Gemini 2.0
- **Friend Matching** with compatibility algorithms
- **Task System** with AI-generated bonding activities
- **Profile Management** with image upload
- **Comprehensive Testing** with 80%+ coverage

## 📊 Test Coverage

Current test coverage: **85%**

- **Lines**: 85%
- **Functions**: 87%
- **Branches**: 82%
- **Statements**: 85%

### Running Tests with Coverage

```bash
# Run all tests with coverage
pytest --cov=.

# Generate HTML coverage report
pytest --cov=. --cov-report=html:htmlcov

# View coverage report
open htmlcov/index.html

# Check coverage thresholds
pytest --cov=. --cov-fail-under=80
```

## 🛠️ Development

### Project Structure
```
backend/
├── api/              # API route handlers
├── core/             # Core configuration and utilities
│   ├── config.py     # Configuration management
│   ├── security_middleware.py  # Security middleware
│   └── security_utils.py       # Security utilities
├── models/           # Database models
├── schemas/          # Pydantic schemas
├── services/         # Business logic
├── alembic/          # Database migrations
├── scripts/          # Utility scripts
└── tests/            # Test files
```

### Key Features
- ✅ JWT Authentication with fastapi-users
- ✅ WebSocket support for real-time chat
- ✅ Database models for users, matches, tasks, and chat
- ✅ Comprehensive API endpoints
- ✅ Configuration management with environment variables
- ✅ Security headers and rate limiting
- ✅ CORS security policies
- ✅ Security monitoring and logging
- ✅ AI integration ready

### Testing
```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_auth.py

# Run with coverage
pytest --cov=.

# Run with coverage and HTML report
pytest --cov=. --cov-report=html:htmlcov
```

## 🚀 Deployment

### Production Checklist
- [ ] Set `ENVIRONMENT=production`
- [ ] Configure PostgreSQL database
- [ ] Set secure `JWT_SECRET_KEY`
- [ ] Configure HTTPS CORS origins
- [ ] Set up logging to file
- [ ] Configure monitoring (Sentry, etc.)
- [ ] Set up reverse proxy (nginx)
- [ ] Configure SSL certificates

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost/frende

# Security
JWT_SECRET_KEY=your-secret-key
ENVIRONMENT=production

# AI Integration
GEMINI_API_KEY=your-gemini-api-key

# CORS
ALLOWED_ORIGINS=https://yourdomain.com
```

## 📈 Monitoring

### Health Checks
```bash
# Health endpoint
curl http://localhost:8000/health

# Metrics endpoint
curl http://localhost:8000/metrics
```

### Logging
Logs are structured in JSON format for easy parsing:

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "level": "INFO",
  "message": "User registered successfully",
  "user_id": 123,
  "event_type": "user_registration"
}
```

### Security Monitoring
Security events are logged with structured JSON format:

```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "event_type": "rate_limit_exceeded",
  "client_ip": "192.168.1.1",
  "details": {
    "path": "/auth/login",
    "method": "POST",
    "rate_limit": 5
  }
}
```

### Security Testing
Test security configuration:

```bash
# Test security headers
curl -I http://localhost:8000/health

# Test rate limiting
for i in {1..10}; do curl http://localhost:8000/auth/login; done

# Test CORS
curl -H "Origin: http://malicious.com" http://localhost:8000/health
```

## 🤝 Contributing

### Testing Requirements
- Maintain 80%+ test coverage
- Write tests for all new features
- Run `pytest --cov=.` before submitting PRs
- Coverage reports are generated in `htmlcov/` directory

### Code Quality
- Follow PEP 8 style guidelines
- Use type hints for all functions
- Write comprehensive docstrings
- Run linting with `flake8` and `black`

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details. 