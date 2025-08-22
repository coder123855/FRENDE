# GitHub Environments Setup Guide

This guide explains how to set up GitHub environments to resolve the "Value 'production' is not valid" error in GitHub Actions workflows.

## Problem

The error occurs when GitHub Actions workflows reference environments (like `environment: production`) that haven't been configured in the GitHub repository settings.

## Solution

### 1. Create GitHub Environments

1. **Go to your GitHub repository**
2. **Navigate to Settings** → **Environments**
3. **Click "New environment"**
4. **Create the following environments:**

#### Production Environment
- **Name**: `production`
- **Description**: Production deployment environment
- **Protection rules** (optional but recommended):
  - **Required reviewers**: Add team members who must approve production deployments
  - **Wait timer**: Set a delay before deployment (e.g., 5 minutes)
  - **Deployment branches**: Restrict to `main` branch only

#### Staging Environment
- **Name**: `staging`
- **Description**: Staging deployment environment
- **Protection rules** (optional):
  - **Deployment branches**: Restrict to `develop` branch only

### 2. Environment Variables

For each environment, add the following secrets:

#### Production Environment Secrets
```
PRODUCTION_API_URL=https://api.frende.app
PRODUCTION_FRONTEND_URL=https://frende.app
PRODUCTION_WS_URL=wss://api.frende.app
PRODUCTION_DATABASE_URL=postgresql://user:pass@prod-db.frende.app/frende_prod
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
RENDER_API_KEY=your_render_api_key
RENDER_PRODUCTION_SERVICE_ID=your_production_service_id
SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
```

#### Staging Environment Secrets
```
STAGING_API_URL=https://api-staging.frende.app
STAGING_FRONTEND_URL=https://staging.frende.app
STAGING_WS_URL=wss://api-staging.frende.app
STAGING_DATABASE_URL=postgresql://user:pass@staging-db.frende.app/frende_staging
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_vercel_org_id
VERCEL_PROJECT_ID=your_vercel_project_id
RENDER_API_KEY=your_render_api_key
RENDER_STAGING_SERVICE_ID=your_staging_service_id
SENTRY_DSN=your_sentry_dsn
SENTRY_AUTH_TOKEN=your_sentry_auth_token
SENTRY_ORG=your_sentry_org
SENTRY_PROJECT=your_sentry_project
```

### 3. Re-enable Environment References

After setting up the environments, you can re-enable the environment references in the workflows:

#### In `.github/workflows/ci.yml`
```yaml
deploy-production:
  name: Deploy to Production
  runs-on: ubuntu-latest
  needs: [validate, test-frontend, test-backend, security-scan, performance-test, integration-test]
  if: github.ref == 'refs/heads/main' && github.event_name == 'push'
  environment: production  # Re-enable this line
```

#### In `.github/workflows/deploy-production.yml`
```yaml
deploy-frontend-production:
  name: Deploy Frontend to Production
  runs-on: ubuntu-latest
  needs: pre-deployment-checks
  environment: production  # Re-enable this line

deploy-backend-production:
  name: Deploy Backend to Production
  runs-on: ubuntu-latest
  needs: [pre-deployment-checks, deploy-frontend-production]
  environment: production  # Re-enable this line

production-smoke-tests:
  name: Production Smoke Tests
  runs-on: ubuntu-latest
  needs: [deploy-frontend-production, deploy-backend-production]
  environment: production  # Re-enable this line
```

### 4. Benefits of Using Environments

1. **Security**: Environment-specific secrets are isolated
2. **Approval Process**: Can require manual approval for production deployments
3. **Audit Trail**: Track who approved deployments and when
4. **Branch Protection**: Restrict deployments to specific branches
5. **Wait Timers**: Add delays for safety

### 5. Alternative: Repository-Level Secrets

If you prefer not to use environments, you can use repository-level secrets instead:

1. **Go to Settings** → **Secrets and variables** → **Actions**
2. **Add all the secrets listed above**
3. **Keep the environment references removed from workflows**

### 6. Verification

To verify the setup:

1. **Push a change to the `main` branch**
2. **Check the GitHub Actions tab**
3. **Verify that the workflow runs without environment errors**
4. **If using environments with protection rules, verify the approval process**

## Current Status

The workflows have been temporarily modified to remove environment references to resolve the immediate error. Once you set up the GitHub environments as described above, you can re-enable the environment references for better security and deployment control.

### Important Note About Secret Warnings

The linter warnings about "Context access might be invalid" are **expected and normal** when:
1. Secrets haven't been configured yet
2. Using repository-level secrets instead of environment secrets

These are **warnings, not errors** and won't prevent the workflow from running. They will disappear once you add the required secrets to your repository.

## Troubleshooting

### Common Issues

1. **"Environment not found"**: Make sure the environment name matches exactly (case-sensitive)
2. **"Secrets not available"**: Verify secrets are added to the correct environment
3. **"Approval required"**: Check if protection rules are blocking the deployment

### Debug Commands

```bash
# Check if environment exists (GitHub CLI)
gh api repos/:owner/:repo/environments

# List environment secrets (GitHub CLI)
gh api repos/:owner/:repo/environments/:environment/secrets
```

## Next Steps

1. Set up the GitHub environments as described
2. Add the required secrets to each environment
3. Re-enable environment references in the workflows
4. Test the deployment process
5. Configure protection rules as needed
