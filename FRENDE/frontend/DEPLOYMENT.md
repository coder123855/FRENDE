# Vercel Deployment Guide for Frende Frontend

This guide will walk you through deploying the Frende frontend application to Vercel.

## Prerequisites

- GitHub account with the Frende repository
- Vercel account (free tier available)
- Backend API deployed and accessible

## Step 1: Prepare Your Repository

Ensure your repository is ready for deployment:

1. **Verify Build Success**
   ```bash
   cd FRENDE/frontend
   npm run build:verify
   ```

2. **Check Environment Variables**
   - Copy `env.example` to `.env.local` for local development
   - Configure your local environment variables

## Step 2: Connect to Vercel

### Option A: Deploy via Vercel Dashboard

1. **Sign in to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign in with your GitHub account

2. **Import Repository**
   - Click "New Project"
   - Select your Frende repository
   - Vercel will auto-detect it's a Vite project

3. **Configure Project Settings**
   - **Framework Preset**: Vite
   - **Root Directory**: `FRENDE/frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from Frontend Directory**
   ```bash
   cd FRENDE/frontend
   vercel
   ```

## Step 3: Configure Environment Variables

In your Vercel project dashboard, go to **Settings > Environment Variables** and add:

### Required Variables
```
VITE_API_URL=https://your-backend-api.com
VITE_WS_URL=wss://your-backend-api.com
VITE_APP_NAME=Frende
VITE_APP_VERSION=1.0.0
```

### Optional Variables
```
VITE_DEV_MODE=false
VITE_ENABLE_DEBUG_LOGGING=false
VITE_ENABLE_OFFLINE_MODE=true
VITE_ENABLE_PWA=true
VITE_ENABLE_ANALYTICS=false
```

### Environment-Specific Variables

**Production:**
```
VITE_API_URL=https://api.frende.com
VITE_WS_URL=wss://api.frende.com
```

**Preview/Development:**
```
VITE_API_URL=https://dev-api.frende.com
VITE_WS_URL=wss://dev-api.frende.com
```

## Step 4: Configure Domain (Optional)

1. **Custom Domain**
   - Go to **Settings > Domains**
   - Add your custom domain (e.g., `app.frende.com`)
   - Configure DNS records as instructed

2. **Subdomain**
   - Vercel provides a default subdomain (e.g., `frende-frontend.vercel.app`)
   - You can use this for testing

## Step 5: Configure Build Settings

### Vercel Configuration File
The `vercel.json` file is already configured with:

- **Build settings** for Vite
- **Routing** for SPA (Single Page Application)
- **Security headers** for production
- **Caching** for static assets

### Build Optimization
The build is configured with:
- **Code splitting** for vendor, UI, and icon libraries
- **Asset optimization** with proper caching headers
- **Security headers** for production deployment

## Step 6: Deploy and Test

1. **Trigger Deployment**
   - Push to main branch for production deployment
   - Create pull request for preview deployment

2. **Verify Deployment**
   - Check build logs for any errors
   - Test the application functionality
   - Verify API connectivity
   - Test WebSocket connections

3. **Monitor Performance**
   - Check Vercel Analytics
   - Monitor Core Web Vitals
   - Review build performance

## Step 7: Continuous Deployment

### Automatic Deployments
- **Production**: Deploys on push to `main` branch
- **Preview**: Deploys on pull request creation
- **Branch**: Deploys on push to any branch

### Deployment Hooks
You can configure webhooks for:
- Slack notifications
- Discord notifications
- Custom webhook endpoints

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Check build locally first
   npm run build:verify
   ```

2. **Environment Variables**
   - Ensure all required variables are set
   - Check variable names (must start with `VITE_`)
   - Verify API URLs are accessible

3. **API Connectivity**
   - Test API endpoints from deployed frontend
   - Check CORS configuration on backend
   - Verify WebSocket connections

4. **Performance Issues**
   - Review bundle size warnings
   - Consider code splitting for large chunks
   - Optimize images and assets

### Performance Optimization

1. **Bundle Size**
   - Current main chunk: ~731KB
   - Consider lazy loading for routes
   - Implement dynamic imports for heavy components

2. **Caching**
   - Static assets are cached for 1 year
   - API responses should be cached appropriately
   - Consider service worker for offline functionality

## Monitoring and Analytics

### Vercel Analytics
- **Performance monitoring**
- **Real user metrics**
- **Error tracking**

### Custom Monitoring
- **Sentry integration** for error tracking
- **PostHog** for user analytics
- **Custom logging** for debugging

## Security Considerations

### Headers Configured
- **X-Content-Type-Options**: nosniff
- **X-Frame-Options**: DENY
- **X-XSS-Protection**: 1; mode=block
- **Referrer-Policy**: strict-origin-when-cross-origin
- **Permissions-Policy**: camera=(), microphone=(), geolocation=()

### Additional Security
- **HTTPS enforcement** (automatic on Vercel)
- **Environment variable protection**
- **Build-time security scanning**

## Next Steps

After successful deployment:

1. **Set up monitoring** and error tracking
2. **Configure analytics** for user insights
3. **Implement CI/CD** for automated testing
4. **Set up staging environment** for testing
5. **Configure backup and recovery** procedures

## Support

For deployment issues:
- Check [Vercel Documentation](https://vercel.com/docs)
- Review build logs in Vercel dashboard
- Test locally with `npm run build:verify`
- Check environment variable configuration
