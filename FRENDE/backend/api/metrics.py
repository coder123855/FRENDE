"""
Prometheus Metrics Endpoint
Provides Prometheus-compatible metrics for external monitoring systems.
"""

from fastapi import APIRouter, Depends, Request
from prometheus_client import (
    Counter, Histogram, Gauge, Summary, generate_latest, 
    CONTENT_TYPE_LATEST, CollectorRegistry, multiprocess
)
import time
import psutil
from typing import Dict, Any
from datetime import datetime, timedelta

from core.config import settings
from core.monitoring import SystemMonitor
from core.performance_monitor import get_performance_monitor
from core.database import get_async_session, check_database_health
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/metrics", tags=["metrics"])

# Create a custom registry for multiprocess support
registry = CollectorRegistry()
multiprocess.MultiProcessCollector(registry)

# Application metrics
REQUEST_COUNT = Counter(
    'http_requests_total',
    'Total HTTP requests',
    ['method', 'endpoint', 'status'],
    registry=registry
)

REQUEST_DURATION = Histogram(
    'http_request_duration_seconds',
    'HTTP request duration in seconds',
    ['method', 'endpoint'],
    registry=registry
)

ACTIVE_CONNECTIONS = Gauge(
    'websocket_active_connections',
    'Number of active WebSocket connections',
    registry=registry
)

DATABASE_CONNECTIONS = Gauge(
    'database_connections',
    'Database connection pool status',
    ['status'],
    registry=registry
)

AI_REQUESTS = Counter(
    'ai_requests_total',
    'Total AI service requests',
    ['service', 'status'],
    registry=registry
)

AI_REQUEST_DURATION = Histogram(
    'ai_request_duration_seconds',
    'AI request duration in seconds',
    ['service'],
    registry=registry
)

TASK_COMPLETIONS = Counter(
    'task_completions_total',
    'Total task completions',
    ['task_type', 'status'],
    registry=registry
)

MATCH_REQUESTS = Counter(
    'match_requests_total',
    'Total match requests',
    ['status'],
    registry=registry
)

SYSTEM_MEMORY = Gauge(
    'system_memory_bytes',
    'System memory usage in bytes',
    ['type'],
    registry=registry
)

SYSTEM_CPU = Gauge(
    'system_cpu_percent',
    'System CPU usage percentage',
    registry=registry
)

SYSTEM_DISK = Gauge(
    'system_disk_bytes',
    'System disk usage in bytes',
    ['type'],
    registry=registry
)

ERROR_RATE = Gauge(
    'error_rate_percent',
    'Application error rate percentage',
    registry=registry
)

@router.get("/")
async def get_metrics():
    """Get Prometheus metrics"""
    try:
        # Update system metrics
        await update_system_metrics()
        
        # Update application metrics
        await update_application_metrics()
        
        # Generate Prometheus format
        return generate_latest(registry)
    except Exception as e:
        return f"# Error generating metrics: {str(e)}"

@router.get("/health")
async def metrics_health_check():
    """Health check for metrics endpoint"""
    try:
        # Basic metrics generation test
        generate_latest(registry)
        return {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "metrics_available": True
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "metrics_available": False
        }

async def update_system_metrics():
    """Update system-level metrics"""
    try:
        # Memory metrics
        memory = psutil.virtual_memory()
        SYSTEM_MEMORY.labels(type="total").set(memory.total)
        SYSTEM_MEMORY.labels(type="available").set(memory.available)
        SYSTEM_MEMORY.labels(type="used").set(memory.used)
        SYSTEM_MEMORY.labels(type="free").set(memory.free)
        
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        SYSTEM_CPU.set(cpu_percent)
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        SYSTEM_DISK.labels(type="total").set(disk.total)
        SYSTEM_DISK.labels(type="used").set(disk.used)
        SYSTEM_DISK.labels(type="free").set(disk.free)
        
    except Exception as e:
        # Log error but don't fail metrics endpoint
        pass

async def update_application_metrics():
    """Update application-specific metrics"""
    try:
        # Database metrics
        db_health = await check_database_health()
        if db_health.get("pool_status"):
            pool = db_health["pool_status"]
            DATABASE_CONNECTIONS.labels(status="checked_in").set(pool.get("checked_in", 0))
            DATABASE_CONNECTIONS.labels(status="checked_out").set(pool.get("checked_out", 0))
            DATABASE_CONNECTIONS.labels(status="overflow").set(pool.get("overflow", 0))
            DATABASE_CONNECTIONS.labels(status="invalid").set(pool.get("invalid", 0))
        
        # Performance metrics
        performance_monitor = get_performance_monitor()
        perf_summary = performance_monitor.get_performance_summary(hours=1)
        
        # Error rate
        error_rate = perf_summary.get("error_rate", 0)
        ERROR_RATE.set(error_rate)
        
    except Exception as e:
        # Log error but don't fail metrics endpoint
        pass

def record_request_metric(method: str, endpoint: str, status: int, duration: float):
    """Record HTTP request metrics"""
    try:
        REQUEST_COUNT.labels(method=method, endpoint=endpoint, status=status).inc()
        REQUEST_DURATION.labels(method=method, endpoint=endpoint).observe(duration)
    except Exception:
        # Don't fail if metrics recording fails
        pass

def record_ai_request(service: str, status: str, duration: float):
    """Record AI service request metrics"""
    try:
        AI_REQUESTS.labels(service=service, status=status).inc()
        AI_REQUEST_DURATION.labels(service=service).observe(duration)
    except Exception:
        # Don't fail if metrics recording fails
        pass

def record_task_completion(task_type: str, status: str):
    """Record task completion metrics"""
    try:
        TASK_COMPLETIONS.labels(task_type=task_type, status=status).inc()
    except Exception:
        # Don't fail if metrics recording fails
        pass

def record_match_request(status: str):
    """Record match request metrics"""
    try:
        MATCH_REQUESTS.labels(status=status).inc()
    except Exception:
        # Don't fail if metrics recording fails
        pass

def update_websocket_connections(count: int):
    """Update WebSocket connection count"""
    try:
        ACTIVE_CONNECTIONS.set(count)
    except Exception:
        # Don't fail if metrics recording fails
        pass

# Middleware for automatic request metrics
class MetricsMiddleware:
    """Middleware to automatically record request metrics"""
    
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            method = scope["method"]
            path = scope["path"]
            
            # Start timing
            start_time = time.time()
            
            # Track response status
            status_code = 200
            
            async def send_wrapper(message):
                nonlocal status_code
                if message["type"] == "http.response.start":
                    status_code = message["status"]
                await send(message)
            
            try:
                await self.app(scope, receive, send_wrapper)
            except Exception as e:
                status_code = 500
                raise
            finally:
                # Record metrics
                duration = time.time() - start_time
                record_request_metric(method, path, status_code, duration)
        else:
            await self.app(scope, receive, send)
