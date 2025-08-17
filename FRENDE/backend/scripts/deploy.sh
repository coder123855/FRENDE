#!/bin/bash

# Frende Backend Deployment Script
# This script handles pre-deployment checks, database migrations, and health verification

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Configuration
APP_NAME="Frende Backend"
HEALTH_CHECK_URL="http://localhost:8000/health"
MIGRATION_TIMEOUT=300  # 5 minutes
HEALTH_CHECK_TIMEOUT=60  # 1 minute

log "Starting deployment for $APP_NAME"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local timeout=$2
    local interval=5
    local elapsed=0
    
    log "Waiting for service to be ready at $url (timeout: ${timeout}s)"
    
    while [ $elapsed -lt $timeout ]; do
        if curl -f -s "$url" >/dev/null 2>&1; then
            success "Service is ready!"
            return 0
        fi
        
        sleep $interval
        elapsed=$((elapsed + interval))
        log "Still waiting... (${elapsed}s elapsed)"
    done
    
    error "Service failed to become ready within ${timeout}s"
    return 1
}

# Function to run database migrations
run_migrations() {
    log "Running database migrations..."
    
    if command_exists alembic; then
        # Wait for database to be ready
        log "Waiting for database connection..."
        sleep 10
        
        # Run migrations
        if alembic upgrade head; then
            success "Database migrations completed successfully"
        else
            error "Database migrations failed"
            return 1
        fi
    else
        warning "Alembic not found, skipping migrations"
    fi
}

# Function to verify environment variables
verify_environment() {
    log "Verifying environment variables..."
    
    local required_vars=(
        "DATABASE_URL"
        "JWT_SECRET_KEY"
        "ENVIRONMENT"
    )
    
    local missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -eq 0 ]; then
        success "All required environment variables are set"
    else
        error "Missing required environment variables: ${missing_vars[*]}"
        return 1
    fi
}

# Function to run health check
run_health_check() {
    log "Running health check..."
    
    if wait_for_service "$HEALTH_CHECK_URL" $HEALTH_CHECK_TIMEOUT; then
        success "Health check passed"
        
        # Get detailed health information
        local health_response=$(curl -s "$HEALTH_CHECK_URL")
        log "Health check response: $health_response"
        
        return 0
    else
        error "Health check failed"
        return 1
    fi
}

# Function to run security checks
run_security_checks() {
    log "Running security checks..."
    
    # Check if running as non-root user
    if [ "$(id -u)" -eq 0 ]; then
        warning "Application is running as root user"
    else
        success "Application is running as non-root user"
    fi
    
    # Check if JWT secret is not default
    if [ "$JWT_SECRET_KEY" = "your-secret-key-change-in-production" ]; then
        error "JWT_SECRET_KEY is still using default value"
        return 1
    else
        success "JWT_SECRET_KEY is properly configured"
    fi
    
    # Check if debug mode is disabled in production
    if [ "$ENVIRONMENT" = "production" ] && [ "$DEBUG" = "true" ]; then
        warning "Debug mode is enabled in production"
    else
        success "Debug mode is properly configured"
    fi
}

# Function to run performance checks
run_performance_checks() {
    log "Running performance checks..."
    
    # Check response time
    local start_time=$(date +%s%N)
    curl -s "$HEALTH_CHECK_URL" >/dev/null
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))
    
    if [ $response_time -lt 1000 ]; then
        success "Response time is good: ${response_time}ms"
    else
        warning "Response time is slow: ${response_time}ms"
    fi
}

# Main deployment process
main() {
    log "Starting deployment process..."
    
    # Step 1: Verify environment
    if ! verify_environment; then
        error "Environment verification failed"
        exit 1
    fi
    
    # Step 2: Run database migrations
    if ! run_migrations; then
        error "Database migration failed"
        exit 1
    fi
    
    # Step 3: Wait for service to be ready
    if ! wait_for_service "$HEALTH_CHECK_URL" $MIGRATION_TIMEOUT; then
        error "Service failed to start"
        exit 1
    fi
    
    # Step 4: Run health check
    if ! run_health_check; then
        error "Health check failed"
        exit 1
    fi
    
    # Step 5: Run security checks
    if ! run_security_checks; then
        error "Security checks failed"
        exit 1
    fi
    
    # Step 6: Run performance checks
    run_performance_checks
    
    success "Deployment completed successfully!"
    log "Application is ready to serve requests"
}

# Run main function
main "$@"
