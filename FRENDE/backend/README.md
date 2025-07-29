# Frende Backend

AI-powered social media app backend for making friends through AI-generated tasks and compatibility-based matching.

## 🚀 Quick Start

### Prerequisites
- Python 3.8 or higher
- PostgreSQL (for production) or SQLite (for development)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FRENDE/backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   
   # Windows
   .\venv\Scripts\Activate.ps1
   
   # macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   # Copy the template
   cp env.example .env
   
   # Edit the .env file with your values
   nano .env  # or use your preferred editor
   ```

5. **Validate configuration**
   ```bash
   python scripts/validate_config.py
   ```

6. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

7. **Start the server**
   ```bash
   uvicorn main:app --reload
   ```

The API will be available at [http://127.0.0.1:8000](http://127.0.0.1:8000)

## 📋 Configuration

### Environment Variables

The application uses environment variables for configuration. Copy `env.example` to `.env` and customize the values:

#### Required Variables
- `ENVIRONMENT`: Set to `development`, `staging`, or `production`
- `JWT_SECRET_KEY`: Secret key for JWT token generation
- `DATABASE_URL`: Database connection string

#### Optional Variables
- `DEBUG`: Enable debug mode (default: True in development)
- `GEMINI_API_KEY`: API key for Gemini AI features
- `LOG_LEVEL`: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
- `CORS_ORIGINS`: Comma-separated list of allowed origins

### Configuration Categories

#### Database Configuration
```bash
DATABASE_URL=sqlite:///./frende.db  # Development
DATABASE_URL=postgresql://user:pass@localhost/frende  # Production
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
```

#### Security Configuration
```bash
JWT_SECRET_KEY=your-super-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
BCRYPT_ROUNDS=12
```

#### CORS Configuration
```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
CORS_ALLOW_CREDENTIALS=True
CORS_ALLOW_METHODS=GET,POST,PUT,DELETE,OPTIONS
CORS_ALLOW_HEADERS=*
CORS_MAX_AGE=86400
```

#### Security Headers Configuration
```bash
SECURITY_HEADERS_ENABLED=True
CSP_ENABLED=True
HSTS_ENABLED=True
HSTS_MAX_AGE=31536000
HSTS_INCLUDE_SUBDOMAINS=True
HSTS_PRELOAD=False
```

#### Rate Limiting Configuration
```bash
RATE_LIMITING_ENABLED=True
RATE_LIMIT_DEFAULT=100
RATE_LIMIT_AUTH=5
RATE_LIMIT_UPLOAD=10
RATE_LIMIT_WEBSOCKET=10
```

#### AI Services Configuration
```bash
GEMINI_API_KEY=your-gemini-api-key
GEMINI_API_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent
AI_RATE_LIMIT_PER_MINUTE=60
```

#### Logging Configuration
```bash
LOG_LEVEL=INFO
LOG_FORMAT=json
LOG_FILE_PATH=/var/log/frende/app.log  # Optional
```

### Environment-Specific Configuration

#### Development
- Uses SQLite database
- Debug mode enabled
- Detailed logging
- Local CORS origins
- Relaxed security settings

#### Production
- Uses PostgreSQL database
- Debug mode disabled
- JSON logging format
- HTTPS CORS origins only
- JWT secret key required
- Strict security headers
- Rate limiting enabled

## 🔒 Security Features

### Security Headers
The application automatically adds security headers to all responses:

- **X-Frame-Options**: `DENY` - Prevents clickjacking
- **X-Content-Type-Options**: `nosniff` - Prevents MIME type sniffing
- **X-XSS-Protection**: `1; mode=block` - XSS protection
- **Referrer-Policy**: `strict-origin-when-cross-origin` - Controls referrer information
- **Permissions-Policy**: Restricts browser features
- **Content-Security-Policy**: Controls resource loading
- **Strict-Transport-Security**: HTTPS enforcement (production only)

### Rate Limiting
Configurable rate limiting per endpoint:

- **Authentication endpoints**: 5 requests per minute
- **Upload endpoints**: 10 requests per hour
- **WebSocket connections**: 10 connections per minute
- **General API**: 100 requests per minute

### CORS Security
Environment-specific CORS policies:

- **Development**: Allows localhost origins with relaxed settings
- **Production**: Only HTTPS origins with strict validation

### Request Validation
- Request size limiting (configurable)
- Input sanitization
- Suspicious content detection
- Security event monitoring

### Security Monitoring
Real-time security monitoring with:

- Failed authentication attempt tracking
- Suspicious IP detection
- Security event logging
- Rate limit violation monitoring
- Request anomaly detection

## 🔧 Configuration Validation

Run the validation script to check your configuration:

```bash
python scripts/validate_config.py
```

This will:
- ✅ Validate required environment variables
- ✅ Check database connection
- ✅ Verify security settings
- ✅ Display feature flags
- ✅ Show configuration summary

## 📚 API Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

## 🔍 Security Monitoring

### Security Endpoints
- `/security` - Get security status and configuration
- `/security/test` - Test security configuration
- `/health` - Health check with security info

### Security Logging
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
- [ ] Enable security headers
- [ ] Configure rate limiting
- [ ] Set up security monitoring

### Security Best Practices
1. **Use HTTPS in production**
2. **Set strong JWT secret keys**
3. **Configure proper CORS origins**
4. **Enable all security headers**
5. **Monitor security logs**
6. **Regular security updates**
7. **Input validation and sanitization**
8. **Rate limiting on all endpoints**

### Docker Deployment
```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .
RUN alembic upgrade head

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## 🔍 Monitoring

### Health Checks
- `/health` - Basic health check
- `/config` - Configuration information
- `/api-status` - API status and endpoints
- `/security` - Security status and monitoring

### Logging
The application supports structured logging in JSON format for production environments.

### Error Tracking
Configure Sentry DSN for error tracking in production.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License. 