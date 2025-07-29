"""
Performance monitoring system for the Frende backend application.
Provides comprehensive performance tracking and metrics collection.
"""

import time
import psutil
import threading
from typing import Dict, List, Optional, Any
from collections import defaultdict, deque
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from contextlib import contextmanager

from core.config import settings
from core.logging_config import get_logger

logger = get_logger("performance")

@dataclass
class PerformanceMetric:
    """Represents a single performance metric"""
    operation: str
    duration: float
    timestamp: datetime
    user_id: Optional[int] = None
    request_id: Optional[str] = None
    status_code: Optional[int] = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

class PerformanceMonitor:
    """Performance monitoring and metrics collection"""
    
    def __init__(self):
        self.metrics: deque = deque(maxlen=10000)  # Keep last 10k metrics
        self.slow_queries: deque = deque(maxlen=1000)
        self.error_metrics: deque = deque(maxlen=1000)
        self.lock = threading.Lock()
        
        # Performance thresholds
        self.slow_query_threshold = settings.SLOW_QUERY_THRESHOLD_MS
        self.api_response_threshold = settings.API_RESPONSE_TIME_THRESHOLD_MS
        
        # System metrics
        self.system_metrics = {
            "cpu_usage": [],
            "memory_usage": [],
            "disk_usage": []
        }
    
    def record_metric(self, metric: PerformanceMetric) -> None:
        """Record a performance metric"""
        with self.lock:
            self.metrics.append(metric)
            
            # Check if it's a slow operation
            if metric.duration > self.slow_query_threshold:
                self.slow_queries.append(metric)
                logger.warning(
                    f"Slow operation detected: {metric.operation} took {metric.duration:.2f}ms",
                    extra={
                        "operation": metric.operation,
                        "duration": metric.duration,
                        "user_id": metric.user_id,
                        "request_id": metric.request_id,
                        "error": metric.error
                    }
                )
            
            # Check if it's an error
            if metric.error:
                self.error_metrics.append(metric)
    
    def record_api_call(self, method: str, path: str, duration: float, 
                       user_id: Optional[int] = None, request_id: Optional[str] = None,
                       status_code: Optional[int] = None, error: Optional[str] = None) -> None:
        """Record an API call performance metric"""
        metric = PerformanceMetric(
            operation=f"{method} {path}",
            duration=duration,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            request_id=request_id,
            status_code=status_code,
            error=error
        )
        self.record_metric(metric)
    
    def record_database_query(self, query: str, duration: float, 
                             user_id: Optional[int] = None, request_id: Optional[str] = None,
                             table: Optional[str] = None, operation: Optional[str] = None) -> None:
        """Record a database query performance metric"""
        metadata = {}
        if table:
            metadata["table"] = table
        if operation:
            metadata["operation"] = operation
        
        metric = PerformanceMetric(
            operation=f"DB: {query[:50]}{'...' if len(query) > 50 else ''}",
            duration=duration,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            request_id=request_id,
            metadata=metadata
        )
        self.record_metric(metric)
    
    def record_external_service_call(self, service: str, endpoint: str, duration: float,
                                   user_id: Optional[int] = None, request_id: Optional[str] = None,
                                   status_code: Optional[int] = None, error: Optional[str] = None) -> None:
        """Record an external service call performance metric"""
        metric = PerformanceMetric(
            operation=f"{service}: {endpoint}",
            duration=duration,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            request_id=request_id,
            status_code=status_code,
            error=error,
            metadata={"service": service, "endpoint": endpoint}
        )
        self.record_metric(metric)
    
    def record_websocket_event(self, event_type: str, duration: float,
                              user_id: Optional[int] = None, room_id: Optional[str] = None) -> None:
        """Record a WebSocket event performance metric"""
        metadata = {"event_type": event_type}
        if room_id:
            metadata["room_id"] = room_id
        
        metric = PerformanceMetric(
            operation=f"WebSocket: {event_type}",
            duration=duration,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            metadata=metadata
        )
        self.record_metric(metric)
    
    def get_performance_summary(self, hours: int = 1) -> Dict[str, Any]:
        """Get performance summary for the last N hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        with self.lock:
            recent_metrics = [
                m for m in self.metrics 
                if m.timestamp >= cutoff_time
            ]
        
        if not recent_metrics:
            return {
                "period_hours": hours,
                "total_operations": 0,
                "average_response_time": 0,
                "slow_operations": 0,
                "error_count": 0
            }
        
        durations = [m.duration for m in recent_metrics]
        errors = [m for m in recent_metrics if m.error]
        slow_ops = [m for m in recent_metrics if m.duration > self.slow_query_threshold]
        
        return {
            "period_hours": hours,
            "total_operations": len(recent_metrics),
            "average_response_time": sum(durations) / len(durations),
            "min_response_time": min(durations),
            "max_response_time": max(durations),
            "slow_operations": len(slow_ops),
            "error_count": len(errors),
            "error_rate": len(errors) / len(recent_metrics) * 100
        }
    
    def get_slow_operations(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get the slowest operations"""
        with self.lock:
            slow_ops = sorted(self.slow_queries, key=lambda x: x.duration, reverse=True)[:limit]
        
        return [
            {
                "operation": op.operation,
                "duration": op.duration,
                "timestamp": op.timestamp.isoformat(),
                "user_id": op.user_id,
                "request_id": op.request_id,
                "error": op.error
            }
            for op in slow_ops
        ]
    
    def get_error_summary(self, hours: int = 1) -> Dict[str, Any]:
        """Get error summary for the last N hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        with self.lock:
            recent_errors = [
                m for m in self.error_metrics 
                if m.timestamp >= cutoff_time
            ]
        
        if not recent_errors:
            return {
                "period_hours": hours,
                "total_errors": 0,
                "error_types": {},
                "most_common_errors": []
            }
        
        # Group errors by operation
        error_counts = defaultdict(int)
        for error in recent_errors:
            error_counts[error.operation] += 1
        
        return {
            "period_hours": hours,
            "total_errors": len(recent_errors),
            "error_types": dict(error_counts),
            "most_common_errors": sorted(error_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        }
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get current system metrics"""
        try:
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            return {
                "cpu_usage_percent": cpu_percent,
                "memory_usage_percent": memory.percent,
                "memory_available_gb": memory.available / (1024**3),
                "disk_usage_percent": disk.percent,
                "disk_free_gb": disk.free / (1024**3)
            }
        except Exception as e:
            logger.error(f"Error getting system metrics: {e}")
            return {
                "cpu_usage_percent": 0,
                "memory_usage_percent": 0,
                "memory_available_gb": 0,
                "disk_usage_percent": 0,
                "disk_free_gb": 0,
                "error": str(e)
            }
    
    def clear_old_metrics(self, hours: int = 24) -> None:
        """Clear metrics older than specified hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        with self.lock:
            # Clear old metrics
            self.metrics = deque(
                [m for m in self.metrics if m.timestamp >= cutoff_time],
                maxlen=10000
            )
            
            # Clear old slow queries
            self.slow_queries = deque(
                [m for m in self.slow_queries if m.timestamp >= cutoff_time],
                maxlen=1000
            )
            
            # Clear old error metrics
            self.error_metrics = deque(
                [m for m in self.error_metrics if m.timestamp >= cutoff_time],
                maxlen=1000
            )
        
        logger.info(f"Cleared metrics older than {hours} hours")

@contextmanager
def performance_monitor(operation: str, user_id: Optional[int] = None, 
                       request_id: Optional[str] = None, **metadata):
    """Context manager for monitoring operation performance"""
    start_time = time.time()
    error = None
    
    try:
        yield
    except Exception as e:
        error = str(e)
        raise
    finally:
        duration = (time.time() - start_time) * 1000
        metric = PerformanceMetric(
            operation=operation,
            duration=duration,
            timestamp=datetime.utcnow(),
            user_id=user_id,
            request_id=request_id,
            error=error,
            metadata=metadata
        )
        monitor.record_metric(metric)

# Global performance monitor instance
monitor = PerformanceMonitor()

def get_performance_monitor() -> PerformanceMonitor:
    """Get the global performance monitor instance"""
    return monitor 