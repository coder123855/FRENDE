# Security Setup Guide for Frende Application

This guide provides comprehensive instructions for setting up and maintaining security measures for the Frende application, including SSL certificates, security headers, rate limiting, and monitoring.

## Table of Contents

1. [SSL/TLS Certificate Configuration](#ssltls-certificate-configuration)
2. [Security Headers Implementation](#security-headers-implementation)
3. [Rate Limiting Setup](#rate-limiting-setup)
4. [Security Monitoring](#security-monitoring)
5. [Security Testing](#security-testing)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

## SSL/TLS Certificate Configuration

### Frontend (Vercel)

Vercel automatically provides SSL certificates for all deployments. The configuration is handled in `FRENDE/frontend/vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=31536000; includeSubDomains; preload"
        }
      ]
    }
  ]
}
```

### Backend (Render)

Render automatically provides SSL certificates. The backend is configured to enforce HTTPS in production:

```python
# In core/config.py
SSL_ENABLED: bool = Field(default=True, description="Enable SSL/TLS")
SSL_MIN_VERSION: str = Field(default="TLSv1.2", description="Minimum TLS version")
```

### Custom Domains

If using custom domains, ensure SSL certificates are properly configured:

1. **Vercel Custom Domain**: SSL is automatically provisioned
2. **Render Custom Domain**: SSL is automatically provisioned
3. **Manual SSL Setup**: Use Let's Encrypt or other certificate providers

### SSL Certificate Monitoring

The application includes automated SSL certificate monitoring:

```bash
# Run SSL certificate check
python scripts/security/ssl_monitor.py

# Check specific domains
python scripts/security/ssl_monitor.py --config ssl_config.json

# Output results to file
python scripts/security/ssl_monitor.py --output ssl_report.json
```

## Security Headers Implementation

### Frontend Security Headers (Vercel)

Security headers are configured in `FRENDE/frontend/vercel.json`:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), ambient-light-sensor=(), autoplay=()"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://vercel.live; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net; img-src 'self' data: https: blob:; media-src 'self' https:; connect-src 'self' https: wss:; frame-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'; upgrade-insecure-requests;"
        }
      ]
    }
  ]
}
```

### Backend Security Headers (FastAPI)

Security headers are implemented in `FRENDE/backend/core/security_headers.py`:

```python
# Security headers middleware automatically adds:
# - Strict-Transport-Security
# - Content-Security-Policy
# - X-Frame-Options
# - X-Content-Type-Options
# - X-XSS-Protection
# - Referrer-Policy
# - Permissions-Policy
```

### Content Security Policy (CSP)

The CSP policy is configured to allow necessary resources while maintaining security:

- **Scripts**: Self-hosted + CDN resources (jsdelivr, unpkg, vercel.live)
- **Styles**: Self-hosted + Google Fonts + CDN resources
- **Images**: Self-hosted + data URLs + HTTPS sources
- **Connections**: Self-hosted + HTTPS + WebSocket connections
- **Frames**: Self-hosted + HTTPS sources
- **Objects**: Disabled for security

## Rate Limiting Setup

### Redis Configuration

Rate limiting requires Redis. Configure in `FRENDE/backend/core/config.py`:

```python
# Redis Configuration
REDIS_URL: str = Field(default="redis://localhost:6379", description="Redis connection URL")
REDIS_ENABLED: bool = Field(default=False, description="Enable Redis for rate limiting")

# Rate Limiting Configuration
RATE_LIMITING_ENABLED: bool = Field(default=True, description="Enable rate limiting")
RATE_LIMIT_DEFAULT: int = Field(default=100, description="Default requests per minute")
RATE_LIMIT_AUTH: int = Field(default=5, description="Auth requests per minute")
RATE_LIMIT_UPLOAD: int = Field(default=10, description="Upload requests per hour")
RATE_LIMIT_WEBSOCKET: int = Field(default=10, description="WebSocket connections per minute")
```

### Rate Limit Configuration

Different endpoints have different rate limits:

- **Authentication endpoints**: 5 requests per 5 minutes
- **Registration**: 3 attempts per 10 minutes
- **API endpoints**: 20-50 requests per minute
- **WebSocket connections**: 10 connections per minute

### Environment Variables

Set the following environment variables:

```bash
# Production
REDIS_URL=redis://your-redis-instance:6379
REDIS_ENABLED=true
RATE_LIMITING_ENABLED=true

# Development
REDIS_URL=redis://localhost:6379
REDIS_ENABLED=false
RATE_LIMITING_ENABLED=false
```

## Security Monitoring

### Automated Security Audits

The application includes comprehensive security auditing:

```bash
# Run full security audit
python scripts/security/security_audit.py

# Generate report
python scripts/security/security_audit.py --output security_report.txt

# Check specific aspects
python scripts/security/security_audit.py --config security_audit_config.json
```

### CI/CD Integration

Security checks are integrated into the CI/CD pipeline:

```yaml
# In .github/workflows/ci.yml
- name: Run security audit
  run: |
    python scripts/security/security_audit.py --output security_report.txt

- name: Check SSL certificates
  run: |
    python scripts/security/ssl_monitor.py --output ssl_report.json
```

### Continuous Monitoring

Security monitoring runs continuously via GitHub Actions:

```yaml
# In .github/workflows/monitoring.yml
- name: Check security headers
  run: |
    python scripts/security/security_audit.py --output security_monitoring_report.txt
    python scripts/security/ssl_monitor.py --output ssl_monitoring_report.json
```

## Security Testing

### Manual Testing

Test security headers manually:

```bash
# Check security headers
curl -I https://frende.app

# Check SSL configuration
openssl s_client -connect frende.app:443 -servername frende.app

# Test rate limiting
for i in {1..10}; do curl https://api.frende.app/api/auth/login; done
```

### Automated Testing

Run automated security tests:

```bash
# Frontend security tests
cd FRENDE/frontend && npm run test:security

# Backend security tests
cd FRENDE/backend && python -m pytest tests/security/

# Integration security tests
python scripts/security/security_audit.py
```

## Best Practices

### SSL/TLS Best Practices

1. **Use TLS 1.2 or higher**: Configure minimum TLS version
2. **Enable HSTS**: Force HTTPS connections
3. **Regular certificate monitoring**: Monitor expiration dates
4. **Certificate transparency**: Monitor certificate issuance

### Security Headers Best Practices

1. **Content Security Policy**: Restrict resource loading
2. **X-Frame-Options**: Prevent clickjacking
3. **X-Content-Type-Options**: Prevent MIME sniffing
4. **Referrer Policy**: Control referrer information
5. **Permissions Policy**: Restrict browser features

### Rate Limiting Best Practices

1. **Different limits for different endpoints**: Sensitive endpoints have stricter limits
2. **IP-based limiting**: Use client IP for rate limiting
3. **Graceful degradation**: Allow requests when Redis is unavailable
4. **Monitoring**: Track rate limit violations

### General Security Best Practices

1. **Regular updates**: Keep dependencies updated
2. **Security audits**: Run regular security audits
3. **Monitoring**: Monitor for security incidents
4. **Documentation**: Keep security documentation updated

## Troubleshooting

### Common Issues

#### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in certificate.crt -text -noout

# Check certificate chain
openssl verify certificate.crt

# Test SSL connection
openssl s_client -connect domain.com:443 -servername domain.com
```

#### Security Headers Not Working

1. **Check Vercel configuration**: Ensure headers are properly configured
2. **Check FastAPI middleware**: Ensure security headers middleware is enabled
3. **Check browser developer tools**: Look for security header violations

#### Rate Limiting Issues

1. **Check Redis connection**: Ensure Redis is accessible
2. **Check configuration**: Verify rate limiting is enabled
3. **Check logs**: Look for rate limiting errors

### Debug Commands

```bash
# Test security headers
curl -I https://frende.app

# Test SSL configuration
openssl s_client -connect frende.app:443 -servername frende.app

# Test rate limiting
curl -H "X-Forwarded-For: 192.168.1.1" https://api.frende.app/api/auth/login

# Run security audit
python scripts/security/security_audit.py --output debug_report.txt

# Check SSL certificates
python scripts/security/ssl_monitor.py --output debug_ssl.json
```

### Logs and Monitoring

1. **Application logs**: Check for security-related errors
2. **Sentry logs**: Monitor for security incidents
3. **GitHub Actions logs**: Check CI/CD security checks
4. **Monitoring dashboard**: Review security metrics

## Security Checklist

### Pre-Deployment Checklist

- [ ] SSL certificates are valid and not expiring soon
- [ ] Security headers are properly configured
- [ ] Rate limiting is enabled and configured
- [ ] Security audit passes with score > 70
- [ ] Dependencies are updated and vulnerability-free
- [ ] Environment variables are properly set
- [ ] Monitoring is configured and working

### Post-Deployment Checklist

- [ ] SSL certificates are working correctly
- [ ] Security headers are present in responses
- [ ] Rate limiting is functioning properly
- [ ] Monitoring alerts are working
- [ ] Security audit passes in production
- [ ] No security incidents detected

### Regular Maintenance Checklist

- [ ] SSL certificates are monitored for expiration
- [ ] Security headers are tested regularly
- [ ] Rate limiting is reviewed and adjusted
- [ ] Security audits are run monthly
- [ ] Dependencies are updated regularly
- [ ] Security documentation is updated

## Support and Resources

### Documentation

- [FastAPI Security Documentation](https://fastapi.tiangolo.com/tutorial/security/)
- [Vercel Security Headers](https://vercel.com/docs/concepts/projects/project-configuration#headers)
- [Render SSL Configuration](https://render.com/docs/ssl-certificates)

### Tools

- [SSL Labs SSL Test](https://www.ssllabs.com/ssltest/)
- [Security Headers](https://securityheaders.com/)
- [Mozilla Observatory](https://observatory.mozilla.org/)

### Monitoring

- [Sentry Security Monitoring](https://sentry.io/for/security/)
- [GitHub Security Alerts](https://docs.github.com/en/code-security/security-advisories)
- [Dependabot Security Updates](https://docs.github.com/en/code-security/dependabot-security-updates)

---

For additional security support or questions, please refer to the project documentation or contact the development team.
