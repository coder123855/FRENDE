#!/bin/bash

# Frende Backend Health Check Script
# This script verifies the application is running properly and all services are healthy

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Frende Backend"
BASE_URL="${HEALTH_CHECK_URL:-http://localhost:8000}"
HEALTH_ENDPOINT="/health"
METRICS_ENDPOINT="/metrics"
ROOT_ENDPOINT="/"

# Timeout for requests
TIMEOUT=30

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

# Function to make HTTP request with timeout
make_request() {
    local url=$1
    local endpoint=$2
    local description=$3
    
    log "Checking $description..."
    
    local response
    local status_code
    
    # Make request with timeout
    response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "${url}${endpoint}" 2>/dev/null || echo "000")
    status_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$status_code" = "200" ]; then
        success "$description is healthy (HTTP $status_code)"
        echo "$response_body"
        return 0
    else
        error "$description is unhealthy (HTTP $status_code)"
        return 1
    fi
}

# Function to check database connectivity
check_database() {
    log "Checking database connectivity..."
    
    # Try to make a request that requires database access
    local response
    local status_code
    
    response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "${BASE_URL}/health" 2>/dev/null || echo "000")
    status_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$status_code" = "200" ]; then
        # Check if response contains database-related information
        if echo "$response_body" | grep -q "database\|postgres\|sqlite"; then
            success "Database connectivity is healthy"
            return 0
        else
            warning "Database connectivity status unclear"
            return 0
        fi
    else
        error "Database connectivity check failed (HTTP $status_code)"
        return 1
    fi
}

# Function to check application metrics
check_metrics() {
    log "Checking application metrics..."
    
    local response
    local status_code
    
    response=$(curl -s -w "%{http_code}" --max-time $TIMEOUT "${BASE_URL}${METRICS_ENDPOINT}" 2>/dev/null || echo "000")
    status_code="${response: -3}"
    response_body="${response%???}"
    
    if [ "$status_code" = "200" ]; then
        success "Application metrics are available"
        
        # Parse and display key metrics
        if echo "$response_body" | grep -q "system_metrics"; then
            log "System metrics found in response"
        fi
        
        return 0
    else
        warning "Application metrics endpoint not available (HTTP $status_code)"
        return 0  # Not critical for health
    fi
}

# Function to check response time
check_response_time() {
    log "Checking response time..."
    
    local start_time=$(date +%s%N)
    curl -s --max-time $TIMEOUT "${BASE_URL}${HEALTH_ENDPOINT}" >/dev/null
    local end_time=$(date +%s%N)
    local response_time=$(( (end_time - start_time) / 1000000 ))
    
    if [ $response_time -lt 1000 ]; then
        success "Response time is excellent: ${response_time}ms"
    elif [ $response_time -lt 3000 ]; then
        success "Response time is good: ${response_time}ms"
    elif [ $response_time -lt 5000 ]; then
        warning "Response time is acceptable: ${response_time}ms"
    else
        error "Response time is slow: ${response_time}ms"
        return 1
    fi
    
    return 0
}

# Function to check memory usage (if running in container)
check_memory_usage() {
    log "Checking memory usage..."
    
    if [ -f /proc/meminfo ]; then
        local total_mem=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        local available_mem=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
        local used_mem=$((total_mem - available_mem))
        local usage_percent=$((used_mem * 100 / total_mem))
        
        if [ $usage_percent -lt 80 ]; then
            success "Memory usage is healthy: ${usage_percent}%"
        elif [ $usage_percent -lt 90 ]; then
            warning "Memory usage is high: ${usage_percent}%"
        else
            error "Memory usage is critical: ${usage_percent}%"
            return 1
        fi
    else
        warning "Memory information not available"
    fi
    
    return 0
}

# Function to check disk space
check_disk_space() {
    log "Checking disk space..."
    
    local usage_percent=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ $usage_percent -lt 80 ]; then
        success "Disk space is healthy: ${usage_percent}% used"
    elif [ $usage_percent -lt 90 ]; then
        warning "Disk space is getting low: ${usage_percent}% used"
    else
        error "Disk space is critical: ${usage_percent}% used"
        return 1
    fi
    
    return 0
}

# Function to check environment variables
check_environment() {
    log "Checking environment variables..."
    
    local required_vars=(
        "ENVIRONMENT"
        "DATABASE_URL"
        "JWT_SECRET_KEY"
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
        error "Missing environment variables: ${missing_vars[*]}"
        return 1
    fi
    
    return 0
}

# Function to generate health report
generate_report() {
    local overall_status=$1
    local checks_passed=$2
    local total_checks=$3
    
    echo ""
    echo "=========================================="
    echo "           HEALTH CHECK REPORT            "
    echo "=========================================="
    echo "Application: $APP_NAME"
    echo "Base URL: $BASE_URL"
    echo "Timestamp: $(date)"
    echo "Overall Status: $overall_status"
    echo "Checks Passed: $checks_passed/$total_checks"
    echo "=========================================="
}

# Main health check process
main() {
    log "Starting health check for $APP_NAME"
    
    local checks_passed=0
    local total_checks=0
    local overall_status="HEALTHY"
    
    # Check 1: Root endpoint
    total_checks=$((total_checks + 1))
    if make_request "$BASE_URL" "$ROOT_ENDPOINT" "Root endpoint"; then
        checks_passed=$((checks_passed + 1))
    else
        overall_status="UNHEALTHY"
    fi
    
    # Check 2: Health endpoint
    total_checks=$((total_checks + 1))
    if make_request "$BASE_URL" "$HEALTH_ENDPOINT" "Health endpoint"; then
        checks_passed=$((checks_passed + 1))
    else
        overall_status="UNHEALTHY"
    fi
    
    # Check 3: Database connectivity
    total_checks=$((total_checks + 1))
    if check_database; then
        checks_passed=$((checks_passed + 1))
    else
        overall_status="UNHEALTHY"
    fi
    
    # Check 4: Application metrics
    total_checks=$((total_checks + 1))
    if check_metrics; then
        checks_passed=$((checks_passed + 1))
    fi
    
    # Check 5: Response time
    total_checks=$((total_checks + 1))
    if check_response_time; then
        checks_passed=$((checks_passed + 1))
    else
        overall_status="DEGRADED"
    fi
    
    # Check 6: Memory usage
    total_checks=$((total_checks + 1))
    if check_memory_usage; then
        checks_passed=$((checks_passed + 1))
    else
        overall_status="DEGRADED"
    fi
    
    # Check 7: Disk space
    total_checks=$((total_checks + 1))
    if check_disk_space; then
        checks_passed=$((checks_passed + 1))
    else
        overall_status="DEGRADED"
    fi
    
    # Check 8: Environment variables
    total_checks=$((total_checks + 1))
    if check_environment; then
        checks_passed=$((checks_passed + 1))
    else
        overall_status="UNHEALTHY"
    fi
    
    # Generate final report
    generate_report "$overall_status" "$checks_passed" "$total_checks"
    
    # Exit with appropriate code
    if [ "$overall_status" = "HEALTHY" ]; then
        success "Health check completed successfully"
        exit 0
    elif [ "$overall_status" = "DEGRADED" ]; then
        warning "Health check completed with warnings"
        exit 1
    else
        error "Health check failed"
        exit 2
    fi
}

# Run main function
main "$@"
