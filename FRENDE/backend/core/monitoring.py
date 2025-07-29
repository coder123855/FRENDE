"""
Monitoring system for the Frende backend application.
Provides health checks, performance metrics, and system status monitoring.
"""

import time
import psutil
from typing import Dict, Any, List
from datetime import datetime, timedelta
from fastapi import HTTPException

from core.config import settings
from core.logging_config import get_logger
from core.performance_monitor import get_performance_monitor
from core.database import get_async_session
from sqlalchemy import text

logger = get_logger("monitoring")

class SystemMonitor:
    """System monitoring and health checks"""
    
    def __init__(self):
        self.start_time = datetime.utcnow()
        self.performance_monitor = get_performance_monitor()
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get comprehensive system health status"""
        try:
            # Basic system metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Performance metrics
            perf_summary = self.performance_monitor.get_performance_summary(hours=1)
            
            # Determine overall health
            health_status = "healthy"
            warnings = []
            
            # Check CPU usage
            if cpu_percent > 80:
                health_status = "warning"
                warnings.append(f"High CPU usage: {cpu_percent}%")
            elif cpu_percent > 90:
                health_status = "critical"
            
            # Check memory usage
            if memory.percent > 80:
                health_status = "warning"
                warnings.append(f"High memory usage: {memory.percent}%")
            elif memory.percent > 90:
                health_status = "critical"
            
            # Check disk usage
            if disk.percent > 80:
                health_status = "warning"
                warnings.append(f"High disk usage: {disk.percent}%")
            elif disk.percent > 90:
                health_status = "critical"
            
            # Check error rate
            if perf_summary.get("error_rate", 0) > 5:
                health_status = "warning"
                warnings.append(f"High error rate: {perf_summary.get('error_rate', 0):.1f}%")
            elif perf_summary.get("error_rate", 0) > 10:
                health_status = "critical"
            
            return {
                "status": health_status,
                "timestamp": datetime.utcnow().isoformat(),
                "uptime_seconds": (datetime.utcnow() - self.start_time).total_seconds(),
                "system": {
                    "cpu_usage_percent": cpu_percent,
                    "memory_usage_percent": memory.percent,
                    "memory_available_gb": memory.available / (1024**3),
                    "disk_usage_percent": disk.percent,
                    "disk_free_gb": disk.free / (1024**3)
                },
                "performance": perf_summary,
                "warnings": warnings,
                "environment": settings.ENVIRONMENT,
                "version": "1.0.0"
            }
        except Exception as e:
            logger.error(f"Error getting system health: {e}")
            return {
                "status": "error",
                "timestamp": datetime.utcnow().isoformat(),
                "error": str(e),
                "environment": settings.ENVIRONMENT,
                "version": "1.0.0"
            }
    
    async def get_database_health(self) -> Dict[str, Any]:
        """Check database connectivity and performance"""
        try:
            start_time = time.time()
            
            # Test database connection
            async with get_async_session() as session:
                # Simple query to test connectivity
                result = await session.execute(text("SELECT 1"))
                result.fetchone()
            
            query_time = (time.time() - start_time) * 1000
            
            status = "healthy"
            if query_time > 1000:  # 1 second
                status = "warning"
            elif query_time > 5000:  # 5 seconds
                status = "critical"
            
            return {
                "status": status,
                "connection": "ok",
                "query_time_ms": query_time,
                "database_url": settings.get_database_url().split("@")[-1] if "@" in settings.get_database_url() else "sqlite",
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Database health check failed: {e}")
            return {
                "status": "error",
                "connection": "failed",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def get_performance_metrics(self, hours: int = 1) -> Dict[str, Any]:
        """Get detailed performance metrics"""
        try:
            perf_summary = self.performance_monitor.get_performance_summary(hours=hours)
            slow_ops = self.performance_monitor.get_slow_operations(limit=10)
            error_summary = self.performance_monitor.get_error_summary(hours=hours)
            system_metrics = self.performance_monitor.get_system_metrics()
            
            return {
                "period_hours": hours,
                "performance_summary": perf_summary,
                "slow_operations": slow_ops,
                "error_summary": error_summary,
                "system_metrics": system_metrics,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting performance metrics: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def get_log_status(self) -> Dict[str, Any]:
        """Get logging system status"""
        try:
            # Get loggers status
            loggers = {
                "api": logger.getEffectiveLevel(),
                "database": logger.getEffectiveLevel(),
                "websocket": logger.getEffectiveLevel(),
                "security": logger.getEffectiveLevel(),
                "performance": logger.getEffectiveLevel(),
                "error": logger.getEffectiveLevel()
            }
            
            return {
                "log_level": settings.LOG_LEVEL,
                "log_format": settings.LOG_FORMAT,
                "log_file_path": settings.LOG_FILE_PATH,
                "loggers": loggers,
                "performance_monitoring_enabled": settings.PERFORMANCE_MONITORING_ENABLED,
                "security_monitoring_enabled": settings.SECURITY_MONITORING_ENABLED,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting log status: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def get_configuration_summary(self) -> Dict[str, Any]:
        """Get configuration summary (without sensitive data)"""
        try:
            return {
                "environment": settings.ENVIRONMENT,
                "debug": settings.DEBUG,
                "host": settings.HOST,
                "port": settings.PORT,
                "database_url": settings.get_database_url().split("@")[-1] if "@" in settings.get_database_url() else "sqlite",
                "cors_origins_count": len(settings.get_cors_origins()),
                "security_headers_enabled": settings.SECURITY_HEADERS_ENABLED,
                "rate_limiting_enabled": settings.RATE_LIMITING_ENABLED,
                "performance_monitoring_enabled": settings.PERFORMANCE_MONITORING_ENABLED,
                "websocket_ping_interval": settings.WEBSOCKET_PING_INTERVAL,
                "websocket_ping_timeout": settings.WEBSOCKET_PING_TIMEOUT,
                "max_tasks_per_match": settings.MAX_TASKS_PER_MATCH,
                "match_expiration_days": settings.MATCH_EXPIRATION_DAYS,
                "coins_per_task": settings.COINS_PER_TASK,
                "coins_per_slot": settings.COINS_PER_SLOT,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting configuration summary: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def get_feature_flags(self) -> Dict[str, bool]:
        """Get current feature flags status"""
        return {
            "authentication_enabled": True,
            "websocket_enabled": True,
            "ai_integration_enabled": bool(settings.GEMINI_API_KEY),
            "file_upload_enabled": bool(settings.FILE_STORAGE_URL),
            "email_enabled": bool(settings.EMAIL_SERVICE_URL),
            "monitoring_enabled": bool(settings.MONITORING_API_KEY),
            "sentry_enabled": bool(settings.SENTRY_DSN),
            "performance_monitoring": settings.PERFORMANCE_MONITORING_ENABLED,
            "security_monitoring": settings.SECURITY_MONITORING_ENABLED,
            "rate_limiting": settings.RATE_LIMITING_ENABLED,
            "security_headers": settings.SECURITY_HEADERS_ENABLED,
            "cors_enabled": True,
            "request_id_tracking": settings.REQUEST_ID_ENABLED,
            "performance_headers": settings.PERFORMANCE_HEADERS_ENABLED
        }

# Global system monitor instance
system_monitor = SystemMonitor()

def get_system_monitor() -> SystemMonitor:
    """Get the global system monitor instance"""
    return system_monitor 