#!/bin/bash

# Rollback script for Frende application
# This script handles automated rollbacks in case of deployment failures

set -e

# Configuration
FRONTEND_SERVICE_ID="${FRONTEND_SERVICE_ID:-}"
BACKEND_SERVICE_ID="${BACKEND_SERVICE_ID:-}"
VERCEL_TOKEN="${VERCEL_TOKEN:-}"
RENDER_API_KEY="${RENDER_API_KEY:-}"
SENTRY_AUTH_TOKEN="${SENTRY_AUTH_TOKEN:-}"
SENTRY_ORG="${SENTRY_ORG:-}"
SENTRY_PROJECT="${SENTRY_PROJECT:-}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_environment() {
    local missing_vars=()
    
    if [ -z "$FRONTEND_SERVICE_ID" ]; then
        missing_vars+=("FRONTEND_SERVICE_ID")
    fi
    
    if [ -z "$BACKEND_SERVICE_ID" ]; then
        missing_vars+=("BACKEND_SERVICE_ID")
    fi
    
    if [ -z "$VERCEL_TOKEN" ]; then
        missing_vars+=("VERCEL_TOKEN")
    fi
    
    if [ -z "$RENDER_API_KEY" ]; then
        missing_vars+=("RENDER_API_KEY")
    fi
    
    if [ ${#missing_vars[@]} -ne 0 ]; then
        log_error "Missing required environment variables: ${missing_vars[*]}"
        exit 1
    fi
}

# Rollback frontend deployment
rollback_frontend() {
    log_info "Rolling back frontend deployment..."
    
    # Get the previous deployment
    PREVIOUS_DEPLOYMENT=$(curl -s -H "Authorization: Bearer $VERCEL_TOKEN" \
        "https://api.vercel.com/v1/deployments?projectId=$FRONTEND_SERVICE_ID&limit=2" | \
        jq -r '.deployments[1].id')
    
    if [ "$PREVIOUS_DEPLOYMENT" = "null" ] || [ -z "$PREVIOUS_DEPLOYMENT" ]; then
        log_error "No previous deployment found for rollback"
        return 1
    fi
    
    log_info "Rolling back to deployment: $PREVIOUS_DEPLOYMENT"
    
    # Trigger rollback
    curl -X POST "https://api.vercel.com/v1/deployments/$PREVIOUS_DEPLOYMENT/rollback" \
        -H "Authorization: Bearer $VERCEL_TOKEN" \
        -H "Content-Type: application/json"
    
    log_info "Frontend rollback initiated"
}

# Rollback backend deployment
rollback_backend() {
    log_info "Rolling back backend deployment..."
    
    # Get the previous deployment
    PREVIOUS_DEPLOYMENT=$(curl -s -H "Authorization: Bearer $RENDER_API_KEY" \
        "https://api.render.com/v1/services/$BACKEND_SERVICE_ID/deploys?limit=2" | \
        jq -r '.deploys[1].id')
    
    if [ "$PREVIOUS_DEPLOYMENT" = "null" ] || [ -z "$PREVIOUS_DEPLOYMENT" ]; then
        log_error "No previous deployment found for rollback"
        return 1
    fi
    
    log_info "Rolling back to deployment: $PREVIOUS_DEPLOYMENT"
    
    # Trigger rollback
    curl -X POST "https://api.render.com/v1/services/$BACKEND_SERVICE_ID/deploys" \
        -H "Authorization: Bearer $RENDER_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"commit\": \"$PREVIOUS_DEPLOYMENT\"}"
    
    log_info "Backend rollback initiated"
}

# Rollback database migrations
rollback_database() {
    log_info "Rolling back database migrations..."
    
    # This would need to be implemented based on your specific database setup
    # For now, we'll just log the action
    log_warn "Database rollback not implemented - manual intervention may be required"
}

# Create Sentry release for rollback
create_rollback_release() {
    if [ -n "$SENTRY_AUTH_TOKEN" ] && [ -n "$SENTRY_ORG" ] && [ -n "$SENTRY_PROJECT" ]; then
        log_info "Creating Sentry release for rollback..."
        
        ROLLBACK_RELEASE="rollback-$(date +%Y%m%d-%H%M%S)"
        
        npx @sentry/cli releases new "$ROLLBACK_RELEASE" \
            --org "$SENTRY_ORG" \
            --project "$SENTRY_PROJECT" \
            --auth-token "$SENTRY_AUTH_TOKEN"
        
        npx @sentry/cli releases finalize "$ROLLBACK_RELEASE" \
            --org "$SENTRY_ORG" \
            --project "$SENTRY_PROJECT" \
            --auth-token "$SENTRY_AUTH_TOKEN"
        
        log_info "Sentry rollback release created: $ROLLBACK_RELEASE"
    else
        log_warn "Sentry credentials not available - skipping Sentry release creation"
    fi
}

# Send notification about rollback
send_notification() {
    log_info "Sending rollback notification..."
    
    # This would integrate with your notification system (Slack, email, etc.)
    # For now, we'll just log the action
    log_info "Rollback notification would be sent here"
}

# Main rollback function
main() {
    log_info "Starting automated rollback process..."
    
    # Check environment
    check_environment
    
    # Rollback frontend
    if rollback_frontend; then
        log_info "Frontend rollback completed successfully"
    else
        log_error "Frontend rollback failed"
    fi
    
    # Rollback backend
    if rollback_backend; then
        log_info "Backend rollback completed successfully"
    else
        log_error "Backend rollback failed"
    fi
    
    # Rollback database (if needed)
    rollback_database
    
    # Create Sentry release
    create_rollback_release
    
    # Send notification
    send_notification
    
    log_info "Rollback process completed"
}

# Handle script arguments
case "${1:-}" in
    "frontend")
        check_environment
        rollback_frontend
        ;;
    "backend")
        check_environment
        rollback_backend
        ;;
    "database")
        rollback_database
        ;;
    "full"|"")
        main
        ;;
    *)
        echo "Usage: $0 [frontend|backend|database|full]"
        echo "  frontend  - Rollback only frontend deployment"
        echo "  backend   - Rollback only backend deployment"
        echo "  database  - Rollback database migrations"
        echo "  full      - Full rollback (default)"
        exit 1
        ;;
esac
