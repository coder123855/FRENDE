# Frende Backend Deployment Guide

This guide will walk you through deploying the Frende backend application to Render and Railway platforms.

## Prerequisites

- GitHub account with the Frende repository
- Render account (free tier available)
- Railway account (free tier available)
- Gemini AI API key for task generation

## Platform Comparison

### Render
- **Pros**: Free tier, PostgreSQL included, easy setup
- **Cons**: Limited resources on free tier
- **Best for**: Production deployment

### Railway
- **Pros**: Generous free tier, fast deployments, good developer experience
- **Cons**: No free PostgreSQL on free tier
- **Best for**: Development and staging

## Option 1: Render Deployment

### Step 1: Prepare Repository

1. **Verify Application Structure**
   ```bash
   cd FRENDE/backend
   ls -la
   # Should see: Dockerfile, Procfile, requirements.txt, main.py
   ```

2. **Test Local Build**
   ```bash
   # Test Docker build locally
   docker build -t frende-backend .
   
   # Test application locally
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```

### Step 2: Deploy to Render

1. **Sign in to Render**
   - Go to [render.com](https://render.com)
   - Sign in with your GitHub account

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Service**
   - **Name**: `frende-api`
   - **Environment**: `Python`
   - **Build Command**: `pip install -r requirements.txt && alembic upgrade head`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT --workers 1`
   - **Root Directory**: Leave empty (or `FRENDE/backend` if deploying from root)

4. **Add PostgreSQL Database**
   - Click "New +" → "PostgreSQL"
   - **Name**: `frende-db`
   - **Database**: `frende`
   - **User**: `frende_user`

5. **Configure Environment Variables**
   In the service settings, add these environment variables:

   **Required Variables:**
   ```
   ENVIRONMENT=production
   DEBUG=false
   JWT_SECRET_KEY=<generate-strong-secret>
   GEMINI_API_KEY=<your-gemini-api-key>
   ```

   **Database Variables (auto-set by Render):**
   ```
   DATABASE_URL=<auto-set-by-render>
   ```

   **CORS Variables:**
   ```
   CORS_ORIGINS=https://frende-frontend.vercel.app,https://frende.vercel.app
   ```

6. **Deploy**
   - Click "Create Web Service"
   - Render will automatically deploy your application

### Step 3: Verify Deployment

1. **Check Build Logs**
   - Monitor the build process in Render dashboard
   - Ensure all dependencies install correctly

2. **Test Health Endpoint**
   ```bash
   curl https://your-app-name.onrender.com/health
   ```

3. **Test API Documentation**
   - Visit: `https://your-app-name.onrender.com/docs`

## Option 2: Railway Deployment

### Step 1: Prepare Repository

1. **Install Railway CLI**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**
   ```bash
   railway login
   ```

### Step 2: Deploy to Railway

1. **Initialize Railway Project**
   ```bash
   cd FRENDE/backend
   railway init
   ```

2. **Configure Deployment**
   - Railway will auto-detect the Dockerfile
   - The `railway.json` file contains the configuration

3. **Add Environment Variables**
   ```bash
   railway variables set ENVIRONMENT=production
   railway variables set DEBUG=false
   railway variables set JWT_SECRET_KEY=<generate-strong-secret>
   railway variables set GEMINI_API_KEY=<your-gemini-api-key>
   railway variables set CORS_ORIGINS=https://frende-frontend.vercel.app,https://frende.vercel.app
   ```

4. **Deploy**
   ```bash
   railway up
   ```

### Step 3: Add PostgreSQL (Railway Pro)

If you have Railway Pro:
1. Add PostgreSQL service in Railway dashboard
2. Link it to your application
3. Railway will automatically set `DATABASE_URL`

For free tier, use external PostgreSQL (e.g., Supabase, Neon).

## Environment Variables Reference

### Required Variables
```bash
# Environment
ENVIRONMENT=production
DEBUG=false
HOST=0.0.0.0
PORT=8000

# Security
JWT_SECRET_KEY=<strong-secret-key>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
BCRYPT_ROUNDS=12

# Database (auto-set by platform)
DATABASE_URL=<postgresql-url>

# CORS
CORS_ORIGINS=https://frende-frontend.vercel.app,https://frende.vercel.app
CORS_ALLOW_CREDENTIALS=true

# AI Services
GEMINI_API_KEY=<your-gemini-api-key>
```

### Optional Variables
```bash
# Performance
DATABASE_POOL_SIZE=10
DATABASE_MAX_OVERFLOW=20
DATABASE_POOL_TIMEOUT=30

# Security
SECURITY_HEADERS_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true
RATE_LIMITING_ENABLED=true

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json
PERFORMANCE_MONITORING_ENABLED=true
```

## Health Check and Monitoring

### Health Check Endpoints
- **Health**: `GET /health`
- **Metrics**: `GET /metrics`
- **Root**: `GET /`

### Manual Health Check
```bash
# Test health endpoint
curl https://your-app-url/health

# Test metrics endpoint
curl https://your-app-url/metrics

# Run comprehensive health check
./scripts/health-check.sh
```

### Monitoring Setup
1. **Render**: Built-in monitoring in dashboard
2. **Railway**: Built-in metrics and logs
3. **External**: Set up Sentry for error tracking
   - Create a Sentry project at https://sentry.io
   - Get your DSN from the project settings
   - Set the `SENTRY_DSN` environment variable
   - Configure sampling rates for traces and profiles
   - Set up alerts and dashboards for monitoring

## Sentry Error Tracking Setup

### Backend Sentry Configuration

1. **Create Sentry Project**
   - Go to https://sentry.io and create a new project
   - Choose "FastAPI" as the platform
   - Copy the DSN from the project settings

2. **Environment Variables**
   ```bash
   # Required
   SENTRY_DSN=https://your-dsn@sentry.io/project-id
   
   # Optional (with defaults)
   SENTRY_DEBUG_ENABLED=false
   SENTRY_TRACES_SAMPLE_RATE=0.1
   SENTRY_PROFILES_SAMPLE_RATE=0.1
   ```

3. **Features Enabled**
   - ✅ Automatic error capture and reporting
   - ✅ Performance monitoring with traces
   - ✅ User context tracking
   - ✅ Request/response monitoring
   - ✅ Database query monitoring
   - ✅ HTTP client monitoring
   - ✅ Structured logging integration

4. **Testing Sentry Integration**
   ```bash
   # Run the Sentry integration tests
   python -m pytest tests/test_sentry_integration.py -v
   
   # Test error reporting manually
   curl -X GET http://localhost:8000/api/v1/nonexistent
   ```

### Frontend Sentry Configuration

1. **Environment Variables**
   ```bash
   # Required
   VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   
   # Optional (with defaults)
   VITE_SENTRY_DEBUG_ENABLED=false
   VITE_ENVIRONMENT=production
   VITE_APP_VERSION=1.0.0
   ```

2. **Features Enabled**
   - ✅ React error boundary integration
   - ✅ Performance monitoring with BrowserTracing
   - ✅ User context tracking
   - ✅ Breadcrumb tracking for user actions
   - ✅ Source map uploads for production builds
   - ✅ Automatic error capture

3. **Testing Frontend Sentry Integration**
   ```bash
   # Run the Sentry integration tests
   npm test -- --testPathPattern=test_sentry_integration
   
   # Test error boundary manually
   # Open browser console and run:
   window.runSentryTests()
   ```

### Sentry Dashboard Configuration

1. **Alerts Setup**
   - Create alerts for error rate spikes
   - Set up alerts for performance degradation
   - Configure alerts for specific error types

2. **Dashboards**
   - Error rate dashboard
   - Performance metrics dashboard
   - User experience dashboard
   - Release tracking dashboard

3. **Release Tracking**
   - Configure release tracking in CI/CD
   - Set up source map uploads
   - Monitor release health

### Monitoring Best Practices

1. **Error Filtering**
   - Filter out expected errors (404s, validation errors)
   - Set up error sampling for high-volume errors
   - Configure environment-specific filtering

2. **Performance Monitoring**
   - Monitor API response times
   - Track database query performance
   - Monitor frontend bundle size and load times

3. **User Experience**
   - Track user journey errors
   - Monitor conversion funnel issues
   - Set up user feedback collection

## Database Migration

### Automatic Migration
Both platforms will run migrations automatically during deployment:
```bash
alembic upgrade head
```

### Manual Migration
```bash
# Connect to your deployed application
railway shell  # or use Render's shell

# Run migrations
alembic upgrade head

# Check migration status
alembic current
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check requirements.txt
   pip install -r requirements.txt
   
   # Test locally
   python -m uvicorn main:app --host 0.0.0.0 --port 8000
   ```

2. **Database Connection Issues**
   - Verify `DATABASE_URL` is set correctly
   - Check database is accessible
   - Ensure migrations run successfully

3. **CORS Issues**
   - Verify `CORS_ORIGINS` includes your frontend URL
   - Check frontend is making requests to correct backend URL

4. **Environment Variables**
   - Ensure all required variables are set
   - Check variable names match exactly
   - Verify sensitive data is properly secured

### Debug Commands

```bash
# Check application logs
railway logs  # Railway
# Or check Render dashboard

# Test database connection
railway shell
python -c "from core.database import engine; print('DB OK')"

# Check environment variables
railway variables  # Railway
# Or check Render dashboard
```

## Security Considerations

### Production Security Checklist
- [ ] JWT_SECRET_KEY is strong and unique
- [ ] DEBUG=false in production
- [ ] CORS_ORIGINS only includes trusted domains
- [ ] Database credentials are secure
- [ ] API keys are properly stored
- [ ] HTTPS is enforced
- [ ] Security headers are enabled

### Security Headers
The application automatically sets:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security: max-age=31536000

## Performance Optimization

### Database Optimization
- Connection pooling is configured
- Indexes are created automatically
- Query optimization is enabled

### Application Optimization
- Response compression enabled
- Static file caching
- Rate limiting configured
- Performance monitoring enabled

## Backup and Recovery

### Database Backups
- **Render**: Automatic daily backups
- **Railway**: Manual backups available
- **External**: Set up automated backups

### Application Recovery
- Use deployment rollback features
- Keep multiple deployment environments
- Test recovery procedures regularly

## Next Steps

After successful deployment:

1. **Update Frontend Configuration**
   - Update API URL in frontend environment variables
   - Test frontend-backend communication

2. **Set Up Monitoring**
   - Configure error tracking (Sentry)
   - Set up performance monitoring
   - Configure alerting

3. **Set Up CI/CD**
   - Configure automatic deployments
   - Set up testing pipeline
   - Configure staging environment

4. **Documentation**
   - Update API documentation
   - Document deployment procedures
   - Create runbooks for common issues

## Support

For deployment issues:
- Check platform documentation (Render/Railway)
- Review build logs for errors
- Test locally before deploying
- Use health check scripts for verification
