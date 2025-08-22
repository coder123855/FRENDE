# CI/CD Pipeline Setup Guide

This document provides comprehensive instructions for setting up and configuring the CI/CD pipeline for the Frende application.

## Overview

The CI/CD pipeline consists of multiple workflows that handle different aspects of the development and deployment process:

- **CI Pipeline** (`ci.yml`) - Continuous Integration with testing and validation
- **Staging Deployment** (`deploy-staging.yml`) - Automated staging deployments
- **Production Deployment** (`deploy-production.yml`) - Automated production deployments
- **Continuous Monitoring** (`monitoring.yml`) - Health checks and performance monitoring

## Prerequisites

### Required Accounts and Services

1. **GitHub Repository** - Host your code
2. **Vercel** - Frontend hosting and deployment
3. **Render/Railway** - Backend hosting and deployment
4. **Sentry** - Error tracking and monitoring
5. **Codecov** - Code coverage reporting
6. **PostgreSQL Database** - For staging and production

### Required GitHub Secrets

Configure the following secrets in your GitHub repository settings:

#### Vercel Configuration
```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
```

#### Render Configuration
```
RENDER_API_KEY=your_render_api_key
RENDER_STAGING_SERVICE_ID=your_staging_service_id
RENDER_PRODUCTION_SERVICE_ID=your_production_service_id
```

#### Environment URLs
```
STAGING_FRONTEND_URL=https://staging.frende.app
STAGING_API_URL=https://api-staging.frende.app
STAGING_WS_URL=wss://api-staging.frende.app
STAGING_DATABASE_URL=postgresql://user:pass@staging-db.frende.app/frende_staging

PRODUCTION_FRONTEND_URL=https://frende.app
PRODUCTION_API_URL=https://api.frende.app
PRODUCTION_WS_URL=wss://api.frende.app
PRODUCTION_DATABASE_URL=postgresql://user:pass@prod-db.frende.app/frende_prod
```

#### Sentry Configuration
```
SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
```

## Workflow Configuration

### 1. CI Pipeline (`ci.yml`)

The CI pipeline runs on every push and pull request to `main` and `develop` branches.

**Jobs:**
- **Validate** - Code quality checks, YAML validation, file size checks
- **Test Frontend** - Linting, unit tests, coverage reporting, build verification
- **Test Backend** - Linting, unit tests, coverage reporting
- **Security Scan** - Security audits, secret scanning
- **Performance Test** - Performance and load testing
- **Integration Test** - End-to-end testing with real services
- **Deploy Staging** - Automatic staging deployment (develop branch)
- **Deploy Production** - Automatic production deployment (main branch)
- **Notify** - Status notifications

### 2. Staging Deployment (`deploy-staging.yml`)

Triggers on pushes to `develop` branch or manual dispatch.

**Jobs:**
- **Deploy Frontend** - Build and deploy to Vercel staging
- **Deploy Backend** - Deploy to Render staging with database migrations
- **Smoke Tests** - Post-deployment health checks

### 3. Production Deployment (`deploy-production.yml`)

Triggers on pushes to `main` branch or manual dispatch.

**Jobs:**
- **Pre-deployment Checks** - Validation and readiness checks
- **Deploy Frontend** - Build and deploy to Vercel production
- **Deploy Backend** - Deploy to Render production with database migrations
- **Production Smoke Tests** - Comprehensive post-deployment testing
- **Rollback Monitoring** - Automatic rollback on failure

### 4. Continuous Monitoring (`monitoring.yml`)

Runs every 5 minutes via cron schedule.

**Jobs:**
- **Health Check Production** - API and frontend health monitoring
- **Health Check Staging** - Staging environment health monitoring
- **Performance Monitoring** - Response time and load time checks
- **Security Monitoring** - SSL certificate and security header validation
- **Error Monitoring** - Sentry error rate monitoring
- **Notification** - Alert notifications for failures

## Environment Management

### Environment Files

The pipeline uses environment-specific configuration files:

- `FRENDE/backend/.env.development`
- `FRENDE/backend/.env.staging`
- `FRENDE/backend/.env.production`
- `FRENDE/frontend/.env.development`
- `FRENDE/frontend/.env.staging`
- `FRENDE/frontend/.env.production`

### Environment Manager Script

Use the environment manager script for environment configuration:

```bash
# Generate environment files
./scripts/deploy/environment-manager.sh generate staging

# Validate environment files
./scripts/deploy/environment-manager.sh validate production

# Deploy to environment
./scripts/deploy/environment-manager.sh deploy staging

# Check environment status
./scripts/deploy/environment-manager.sh status production
```

## Deployment Process

### Staging Deployment

1. **Trigger**: Push to `develop` branch
2. **Frontend**: Build and deploy to Vercel staging
3. **Backend**: Deploy to Render staging with migrations
4. **Verification**: Smoke tests and health checks
5. **Sentry**: Create release and upload source maps

### Production Deployment

1. **Trigger**: Push to `main` branch
2. **Pre-checks**: Validate deployment readiness
3. **Frontend**: Build and deploy to Vercel production
4. **Backend**: Deploy to Render production with migrations
5. **Verification**: Comprehensive smoke tests
6. **Monitoring**: Rollback monitoring and alerting
7. **Sentry**: Create release and upload source maps

## Rollback Procedures

### Automated Rollback

The pipeline includes automatic rollback capabilities:

```bash
# Full rollback
./scripts/deploy/rollback.sh full

# Partial rollback
./scripts/deploy/rollback.sh frontend
./scripts/deploy/rollback.sh backend
./scripts/deploy/rollback.sh database
```

### Manual Rollback

If automated rollback fails:

1. **Frontend**: Use Vercel dashboard to rollback to previous deployment
2. **Backend**: Use Render dashboard to rollback to previous deployment
3. **Database**: Use database backup and restore procedures

## Monitoring and Alerting

### Health Checks

- API health endpoint monitoring
- Frontend accessibility checks
- Database connectivity verification
- WebSocket connectivity testing

### Performance Monitoring

- API response time tracking
- Frontend load time monitoring
- Performance threshold alerts

### Security Monitoring

- SSL certificate expiration checks
- Security header validation
- Vulnerability scanning

### Error Monitoring

- Sentry error rate monitoring
- High error rate alerts
- Error trend analysis

## Troubleshooting

### Common Issues

1. **Deployment Failures**
   - Check GitHub Actions logs
   - Verify environment variables
   - Check service connectivity

2. **Test Failures**
   - Review test logs
   - Check test environment setup
   - Verify test data

3. **Performance Issues**
   - Monitor response times
   - Check resource usage
   - Review database performance

### Debug Commands

```bash
# Check environment status
./scripts/deploy/environment-manager.sh status production

# Validate configuration
./scripts/deploy/environment-manager.sh validate staging

# Test rollback
./scripts/deploy/rollback.sh --dry-run

# Check monitoring status
curl -f $PRODUCTION_API_URL/health
```

## Best Practices

### Code Quality

- Write comprehensive tests
- Maintain high test coverage
- Use linting and formatting tools
- Review code before merging

### Security

- Regular security audits
- Keep dependencies updated
- Use environment variables for secrets
- Implement proper authentication

### Performance

- Monitor performance metrics
- Optimize database queries
- Use caching strategies
- Implement CDN for static assets

### Monitoring

- Set up comprehensive monitoring
- Configure appropriate alerts
- Regular health checks
- Performance tracking

## Support

For issues with the CI/CD pipeline:

1. Check GitHub Actions logs
2. Review this documentation
3. Check service-specific documentation
4. Contact the development team

## Updates

This documentation should be updated whenever:

- New workflows are added
- Configuration changes are made
- New services are integrated
- Troubleshooting procedures change
