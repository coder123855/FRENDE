# Monitoring System Documentation

This document outlines the comprehensive monitoring system implemented for the Frende application, including health checks, metrics collection, and monitoring dashboards.

## Overview

The Frende monitoring system provides:

- **Health Checks**: Comprehensive health monitoring for all application components
- **Metrics Collection**: Prometheus-compatible metrics for external monitoring
- **Performance Monitoring**: Real-time performance tracking and analysis
- **AI Service Monitoring**: Health checks for Gemini AI and other AI services
- **WebSocket Monitoring**: Connection tracking and health monitoring
- **External Service Monitoring**: Health checks for external APIs and services
- **Monitoring Dashboard**: Comprehensive monitoring data and analytics

## Architecture

### Components

1. **Health Check System** (`api/health.py`)
   - Basic health checks
   - Detailed health checks with system metrics
   - Component-specific health checks
   - Aggregated health scoring

2. **Metrics System** (`api/metrics.py`)
   - Prometheus-compatible metrics
   - Application-specific metrics
   - System metrics collection
   - Metrics middleware for automatic collection

3. **AI Health Checker** (`core/ai_health_check.py`)
   - Gemini AI service monitoring
   - AI service performance tracking
   - Health history and analytics

4. **WebSocket Monitor** (`core/websocket_monitor.py`)
   - Connection tracking
   - Performance monitoring
   - Connection health analysis

5. **External Service Monitor** (`core/external_service_monitor.py`)
   - External API health checks
   - Service performance tracking
   - Multi-service monitoring

6. **Monitoring Dashboard** (`api/monitoring_dashboard.py`)
   - Comprehensive monitoring data
   - Performance analytics
   - Alert management

## Health Check Endpoints

### Basic Health Check
```http
GET /api/v1/health/
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "environment": "production",
  "version": "1.0.0"
}
```

### Detailed Health Check
```http
GET /api/v1/health/detailed
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00Z",
  "environment": "production",
  "version": "1.0.0",
  "response_time_ms": 150.25,
  "warnings": [],
  "system": {
    "cpu_percent": 25.5,
    "memory_percent": 45.2,
    "memory_available_gb": 8.5,
    "disk_percent": 30.1,
    "disk_free_gb": 50.2
  },
  "database": {
    "status": "healthy",
    "pool_status": {
      "size": 20,
      "checked_in": 15,
      "checked_out": 5,
      "overflow": 0,
      "invalid": 0
    }
  },
  "ai_services": {
    "overall_status": "healthy",
    "healthy_services": 1,
    "total_services": 1,
    "services": {
      "gemini": {
        "status": "healthy",
        "response_time_ms": 250.5,
        "status_code": 200
      }
    }
  },
  "websocket": {
    "status": "healthy",
    "stats": {
      "active_connections": 150,
      "unique_users": 120,
      "total_messages": 2500,
      "error_rate": 0.5
    }
  },
  "external_services": {
    "overall_status": "healthy",
    "healthy_services": 2,
    "total_services": 2
  }
}
```

### Component-Specific Health Checks

#### Database Health
```http
GET /api/v1/health/database
```

#### AI Services Health
```http
GET /api/v1/health/ai
```

#### WebSocket Health
```http
GET /api/v1/health/websocket
```

#### External Services Health
```http
GET /api/v1/health/external
```

### Aggregated Health Check
```http
GET /api/v1/health/aggregated
```

**Response:**
```json
{
  "status": "healthy",
  "score": 95.5,
  "timestamp": "2024-01-01T12:00:00Z",
  "response_time_ms": 200.5,
  "scores": {
    "database": 100,
    "ai_services": 100,
    "websocket": 95,
    "external_services": 87
  },
  "components": {
    "database": { /* database health data */ },
    "ai_services": { /* AI services health data */ },
    "websocket": { /* WebSocket health data */ },
    "external_services": { /* external services health data */ }
  }
}
```

## Metrics Endpoints

### Prometheus Metrics
```http
GET /api/v1/metrics/
```

Returns Prometheus-compatible metrics in text format.

### Metrics Health Check
```http
GET /api/v1/metrics/health
```

## Monitoring Dashboard

### Main Dashboard
```http
GET /api/v1/monitoring/dashboard?hours=24
```

**Response:**
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "environment": "production",
  "system": {
    "health": { /* system health data */ },
    "performance": { /* performance metrics */ }
  },
  "ai_services": {
    "performance": { /* AI performance metrics */ },
    "health": { /* AI health data */ }
  },
  "websocket": {
    "stats": { /* WebSocket statistics */ },
    "health": { /* WebSocket health data */ }
  },
  "external_services": {
    "performance": { /* external services performance */ },
    "health": { /* external services health */ }
  },
  "monitoring_config": {
    "performance_monitoring_enabled": true,
    "security_monitoring_enabled": true,
    "monitoring_api_key_configured": true
  }
}
```

### Performance Metrics
```http
GET /api/v1/monitoring/performance?hours=24
```

### AI Services Metrics
```http
GET /api/v1/monitoring/ai-services?hours=24
```

### WebSocket Metrics
```http
GET /api/v1/monitoring/websocket?hours=24
```

### External Services Metrics
```http
GET /api/v1/monitoring/external-services?hours=24
```

### Monitoring Trends
```http
GET /api/v1/monitoring/trends?hours=24&interval=1
```

### Monitoring Alerts
```http
GET /api/v1/monitoring/alerts
```

**Response:**
```json
{
  "timestamp": "2024-01-01T12:00:00Z",
  "total_alerts": 2,
  "critical_alerts": 0,
  "warning_alerts": 2,
  "alerts": [
    {
      "type": "websocket",
      "severity": "warning",
      "message": "WebSocket: warning",
      "details": ["High error rate: 5.2%"],
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Monitoring Status
```http
GET /api/v1/monitoring/status
```

## Configuration

### Environment Variables

```bash
# Performance Monitoring
PERFORMANCE_MONITORING_ENABLED=true
SLOW_QUERY_THRESHOLD_MS=500
API_RESPONSE_TIME_THRESHOLD_MS=2000

# Security Monitoring
SECURITY_MONITORING_ENABLED=true

# Monitoring API
MONITORING_API_KEY=your-monitoring-api-key

# External Services
EMAIL_SERVICE_URL=https://api.email.service/health
FILE_STORAGE_URL=https://api.storage.service/health
```

### Health Check Configuration

Health checks can be configured through the monitoring components:

```python
# AI Health Checker
ai_health_checker.max_history_size = 100

# WebSocket Monitor
websocket_monitor.max_history_size = 1000
websocket_monitor.monitoring_enabled = True

# External Service Monitor
external_service_monitor.monitoring_enabled = True
```

## Usage Examples

### Basic Health Monitoring

```python
import httpx

async def check_application_health():
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:8000/api/v1/health/detailed")
        health_data = response.json()
        
        if health_data["status"] != "healthy":
            print(f"Application health issue: {health_data['warnings']}")
        else:
            print("Application is healthy")
```

### Metrics Collection

```python
import httpx

async def collect_metrics():
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:8000/api/v1/metrics/")
        metrics = response.text
        
        # Send to Prometheus or other monitoring system
        # prometheus_client.push_metrics(metrics)
```

### Monitoring Dashboard Integration

```python
import httpx

async def get_monitoring_data():
    async with httpx.AsyncClient() as client:
        # Get dashboard data
        dashboard_response = await client.get("http://localhost:8000/api/v1/monitoring/dashboard")
        dashboard_data = dashboard_response.json()
        
        # Get alerts
        alerts_response = await client.get("http://localhost:8000/api/v1/monitoring/alerts")
        alerts_data = alerts_response.json()
        
        return {
            "dashboard": dashboard_data,
            "alerts": alerts_data
        }
```

## Integration with External Monitoring

### Prometheus Integration

Add to your `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'frende-backend'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/api/v1/metrics/'
    scrape_interval: 15s
```

### Grafana Dashboard

Create a Grafana dashboard using the metrics:

- HTTP request metrics
- System resource metrics
- Database connection metrics
- AI service metrics
- WebSocket connection metrics

### Alerting Rules

Example Prometheus alerting rules:

```yaml
groups:
  - name: frende-alerts
    rules:
      - alert: HighErrorRate
        expr: error_rate_percent > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"
          
      - alert: DatabaseUnhealthy
        expr: database_connections{status="invalid"} > 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Database connection issues detected"
```

## Best Practices

### 1. Health Check Frequency

- **Basic health checks**: Every 30 seconds
- **Detailed health checks**: Every 5 minutes
- **Component-specific checks**: As needed for troubleshooting

### 2. Metrics Collection

- **Prometheus scraping**: Every 15 seconds
- **Custom metrics**: Record at appropriate intervals
- **Historical data**: Keep for 30 days

### 3. Alerting

- **Critical alerts**: Immediate notification
- **Warning alerts**: Escalate after 5 minutes
- **Recovery alerts**: Notify when issues are resolved

### 4. Performance Considerations

- **Health check timeouts**: 10 seconds maximum
- **Metrics collection**: Non-blocking
- **Historical data**: Implement cleanup policies

### 5. Security

- **Metrics endpoint**: Consider authentication in production
- **Health check data**: Sanitize sensitive information
- **Monitoring API**: Use secure API keys

## Troubleshooting

### Common Issues

1. **Health checks failing**
   - Check database connectivity
   - Verify external service URLs
   - Review application logs

2. **Metrics not updating**
   - Verify Prometheus configuration
   - Check metrics endpoint accessibility
   - Review metrics middleware

3. **High resource usage**
   - Adjust monitoring intervals
   - Implement data retention policies
   - Optimize health check queries

### Debug Mode

Enable debug logging for monitoring components:

```python
import logging
logging.getLogger('core.ai_health_check').setLevel(logging.DEBUG)
logging.getLogger('core.websocket_monitor').setLevel(logging.DEBUG)
logging.getLogger('core.external_service_monitor').setLevel(logging.DEBUG)
```

## Conclusion

The monitoring system provides comprehensive visibility into the Frende application's health and performance. By following the guidelines and best practices outlined in this document, you can ensure effective monitoring and alerting for your application.

For additional support or questions, refer to the application logs or contact the development team.
