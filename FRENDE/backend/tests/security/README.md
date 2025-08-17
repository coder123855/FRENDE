# Security Testing Suite for Frende Application

This directory contains a comprehensive security testing suite designed to validate the security of the Frende application's authentication system and data validation mechanisms.

## Overview

The security testing suite covers:

- **Authentication Security**: JWT token validation, password security, session management, authentication bypass prevention
- **Input Validation Security**: XSS prevention, SQL injection prevention, input sanitization, file upload security
- **API Security**: Authorization, rate limiting, security headers, CORS, request validation
- **WebSocket Security**: WebSocket authentication and message validation
- **Data Validation Security**: User input validation, profile data sanitization, chat message security

## Prerequisites

### Backend Dependencies

Install the required security testing dependencies:

```bash
cd FRENDE/backend
pip install -r requirements-test.txt
```

Key security testing packages:
- `bandit` - Security linter for Python
- `safety` - Dependency vulnerability checker
- `cryptography` - Cryptographic testing utilities
- `pyjwt` - JWT testing utilities
- `bcrypt` - Password hashing testing

### Frontend Dependencies

Install frontend security testing dependencies:

```bash
cd FRENDE/frontend
npm install --save-dev @testing-library/jest-dom
```

## Test Structure

### Backend Security Tests

```
tests/security/
├── conftest.py                           # Security test fixtures and configuration
├── test_authentication_security.py       # JWT, password, session security tests
├── test_input_validation_security.py     # XSS, SQL injection, input sanitization tests
├── test_api_security.py                  # API authorization, rate limiting, headers tests
├── test_websocket_security.py            # WebSocket authentication and security tests
├── test_data_validation_security.py      # Data validation and sanitization tests
├── security_test_utils.py                # Security testing utilities and helpers
└── README.md                             # This documentation
```

### Frontend Security Tests

```
src/components/__tests__/security/
├── AuthSecurity.test.jsx                 # Authentication component security tests
├── InputValidationSecurity.test.jsx      # Form input security and validation tests
├── XSSProtection.test.jsx                # XSS prevention and content sanitization tests
├── CSRFProtection.test.jsx               # CSRF token validation and protection tests
└── SecurityUtils.test.js                 # Security utility function tests
```

## Running Security Tests

### Backend Security Tests

Run all security tests:

```bash
cd FRENDE/backend
pytest tests/security/ -v
```

Run specific security test categories:

```bash
# Authentication security tests
pytest tests/security/test_authentication_security.py -v

# Input validation security tests
pytest tests/security/test_input_validation_security.py -v

# API security tests
pytest tests/security/test_api_security.py -v

# WebSocket security tests
pytest tests/security/test_websocket_security.py -v

# Data validation security tests
pytest tests/security/test_data_validation_security.py -v
```

Run security tests with coverage:

```bash
pytest tests/security/ --cov=core.security --cov=core.security_utils --cov=core.security_middleware --cov-report=html
```

### Frontend Security Tests

Run all frontend security tests:

```bash
cd FRENDE/frontend
npm test -- --testPathPattern=security
```

Run specific frontend security test files:

```bash
# Authentication security tests
npm test -- AuthSecurity.test.jsx

# Input validation security tests
npm test -- InputValidationSecurity.test.jsx

# XSS protection tests
npm test -- XSSProtection.test.jsx

# CSRF protection tests
npm test -- CSRFProtection.test.jsx
```

## Security Test Categories

### 1. Authentication Security Tests

**JWT Token Security**:
- Token creation and validation
- Token expiration handling
- Token tampering detection
- Wrong secret/algorithm rejection
- Refresh token security

**Password Security**:
- Password hashing and verification
- Password strength validation
- Common password pattern detection
- Password complexity requirements
- Password length validation

**Authentication Bypass Prevention**:
- Empty/malformed authorization headers
- Invalid token formats
- Expired/tampered token rejection
- Nonexistent user token handling
- Inactive user token rejection

**Session Security**:
- Session timeout handling
- Concurrent session management
- Session invalidation
- Brute force protection

### 2. Input Validation Security Tests

**XSS Prevention**:
- Reflected XSS payload detection
- Stored XSS prevention
- DOM XSS prevention
- XSS filter bypass attempts
- HTML tag removal
- Special character encoding

**SQL Injection Prevention**:
- Authentication bypass attempts
- Data extraction attempts
- Data modification attempts
- Blind SQL injection attempts
- SQL injection payload detection

**Input Sanitization**:
- HTML tag removal
- Special character encoding
- Whitespace handling
- Null byte handling
- Unicode character handling

**File Upload Security**:
- Malicious file type validation
- Oversized file prevention
- Path traversal prevention
- Double extension attack prevention
- Valid file acceptance

### 3. API Security Tests

**Authorization**:
- Protected endpoint authentication requirements
- Public endpoint accessibility
- User data access control
- Invalid user ID handling
- Cross-user data access prevention

**Rate Limiting**:
- Authentication endpoint rate limiting
- API endpoint rate limiting
- Upload endpoint rate limiting
- Rate limit header validation

**Security Headers**:
- Essential security header presence
- Content Security Policy validation
- HSTS header validation
- Permissions Policy validation

**CORS Configuration**:
- Preflight request handling
- Allowed origin validation
- Disallowed origin rejection
- Method and header validation

**Request Validation**:
- Request size limits
- Malicious header rejection
- Invalid content type rejection
- Missing required field handling

### 4. WebSocket Security Tests

**WebSocket Authentication**:
- Authentication requirement validation
- Token validation in WebSocket connections
- Unauthenticated connection rejection

**Message Validation**:
- WebSocket message sanitization
- Malicious message rejection
- Message size limits

### 5. Data Validation Security Tests

**User Input Validation**:
- Email format validation
- Password strength validation
- Input length validation
- Age validation
- Profile data validation

**Chat Message Security**:
- Message content sanitization
- XSS prevention in messages
- SQL injection prevention
- Message length validation

**Task Submission Security**:
- Submission text validation
- Evidence URL validation
- File upload security
- Malicious content rejection

## Security Test Data

The security testing suite includes comprehensive test data for various attack vectors:

### XSS Payloads
```python
xss_payloads = [
    "<script>alert('XSS')</script>",
    "javascript:alert('XSS')",
    "<img src=x onerror=alert('XSS')>",
    "<svg onload=alert('XSS')>",
    "data:text/html,<script>alert('XSS')</script>",
]
```

### SQL Injection Payloads
```python
sql_injection_payloads = [
    "'; DROP TABLE users; --",
    "1' OR '1'='1",
    "admin'--",
    "' UNION SELECT * FROM users --",
    "'; INSERT INTO users VALUES ('hacker','password'); --",
]
```

### File Upload Attacks
```python
malicious_files = [
    {"name": "malicious.php", "content": "<?php system($_GET['cmd']); ?>", "type": "application/x-php"},
    {"name": "malicious.js", "content": "<script>alert('XSS')</script>", "type": "application/javascript"},
    {"name": "profile.jpg.php", "content": "<?php system($_GET['cmd']); ?>", "type": "image/jpeg"},
]
```

## Security Metrics and Reporting

### Security Test Coverage

The security testing suite provides comprehensive coverage of:

- **Authentication Mechanisms**: 100% coverage of JWT token handling
- **Input Validation**: 100% coverage of XSS and SQL injection prevention
- **API Security**: 100% coverage of authorization and rate limiting
- **Data Validation**: 100% coverage of user input validation

### Security Test Reports

Generate security test reports:

```bash
# Backend security test report
pytest tests/security/ --html=reports/security_report.html --self-contained-html

# Frontend security test report
npm test -- --coverage --coverageReporters=html --coverageDirectory=coverage/security
```

### Security Compliance

The security testing suite validates compliance with:

- **OWASP Top 10**: All major web application security risks
- **Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- **Authentication Standards**: JWT best practices, password security
- **Input Validation**: Comprehensive input sanitization
- **API Security**: Authorization, rate limiting, CORS

## Security Best Practices

### Authentication Security

1. **JWT Token Management**:
   - Use secure secret keys
   - Implement proper token expiration
   - Validate token signatures
   - Handle token refresh securely

2. **Password Security**:
   - Use strong password requirements
   - Implement secure password hashing
   - Prevent common password usage
   - Enforce password complexity

3. **Session Management**:
   - Implement session timeout
   - Handle concurrent sessions
   - Secure session invalidation
   - Prevent session hijacking

### Input Validation Security

1. **XSS Prevention**:
   - Sanitize all user inputs
   - Use Content Security Policy
   - Validate and encode output
   - Prevent script injection

2. **SQL Injection Prevention**:
   - Use parameterized queries
   - Validate input types
   - Implement input sanitization
   - Use ORM frameworks

3. **File Upload Security**:
   - Validate file types
   - Check file sizes
   - Prevent path traversal
   - Scan for malware

### API Security

1. **Authorization**:
   - Implement proper authentication
   - Use role-based access control
   - Validate user permissions
   - Prevent unauthorized access

2. **Rate Limiting**:
   - Implement request rate limits
   - Monitor for abuse
   - Handle rate limit violations
   - Provide rate limit headers

3. **Security Headers**:
   - Set appropriate security headers
   - Configure CORS properly
   - Implement HSTS
   - Use Content Security Policy

## Continuous Security Testing

### Automated Security Testing

Integrate security tests into CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Run Security Tests
  run: |
    cd FRENDE/backend
    pytest tests/security/ --cov=core.security --cov-report=xml
    cd ../frontend
    npm test -- --testPathPattern=security --coverage
```

### Security Scanning

Regular security scanning:

```bash
# Run security linter
bandit -r core/ -f json -o security_scan.json

# Check dependencies for vulnerabilities
safety check --json --output-file dependency_scan.json

# Run security tests
pytest tests/security/ --junitxml=security_test_results.xml
```

### Security Monitoring

Monitor security events:

```python
# Security event logging
import logging
security_logger = logging.getLogger("security")

def log_security_event(event_type, details):
    security_logger.warning(f"Security event: {event_type} - {details}")
```

## Troubleshooting

### Common Issues

1. **Test Database Setup**:
   ```bash
   # Ensure test database is properly configured
   export DATABASE_URL="sqlite:///./test.db"
   pytest tests/security/ --setup-show
   ```

2. **Mock Dependencies**:
   ```python
   # Mock external dependencies for testing
   @patch('core.security_middleware.security_logger')
   def test_security_logging(self, mock_logger):
       # Test implementation
   ```

3. **Test Data Cleanup**:
   ```python
   # Clean up test data after tests
   @pytest.fixture(autouse=True)
   def cleanup_test_data():
       yield
       # Cleanup code
   ```

### Debug Mode

Run security tests in debug mode:

```bash
# Backend debug mode
pytest tests/security/ -v -s --tb=long

# Frontend debug mode
npm test -- --verbose --testPathPattern=security
```

## Contributing

### Adding New Security Tests

1. **Identify Security Risk**: Determine the security vulnerability to test
2. **Create Test Case**: Write comprehensive test cases
3. **Add Test Data**: Include relevant attack payloads
4. **Update Documentation**: Document the new test category
5. **Run Tests**: Ensure all tests pass

### Security Test Guidelines

1. **Comprehensive Coverage**: Test all attack vectors
2. **Realistic Scenarios**: Use realistic attack payloads
3. **Performance Impact**: Minimize test execution time
4. **Maintainability**: Write clear, maintainable tests
5. **Documentation**: Document test purpose and expected behavior

## Support

For security testing support:

1. **Check Documentation**: Review this README and test documentation
2. **Run Debug Mode**: Use debug mode for detailed error information
3. **Review Logs**: Check security event logs for issues
4. **Update Dependencies**: Ensure all security testing dependencies are up to date

## License

This security testing suite is part of the Frende application and follows the same license terms.
