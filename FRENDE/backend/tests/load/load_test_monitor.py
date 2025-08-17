#!/usr/bin/env python3
"""
Load test monitor for Frende application
Tracks system performance metrics during load testing
"""

import asyncio
import time
import json
import psutil
import threading
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import logging

from load_test import LoadTestResult


@dataclass
class SystemMetrics:
    """System performance metrics"""
    timestamp: datetime
    cpu_percent: float
    memory_percent: float
    memory_used_mb: float
    memory_available_mb: float
    disk_usage_percent: float
    disk_io_read_mb: float
    disk_io_write_mb: float
    network_bytes_sent: int
    network_bytes_recv: int
    network_packets_sent: int
    network_packets_recv: int


@dataclass
class ApplicationMetrics:
    """Application-specific metrics"""
    timestamp: datetime
    active_connections: int
    request_rate: float
    response_time_avg: float
    response_time_p95: float
    response_time_p99: float
    error_rate: float
    throughput: float


@dataclass
class DatabaseMetrics:
    """Database performance metrics"""
    timestamp: datetime
    active_connections: int
    query_execution_time_avg: float
    slow_queries_count: int
    cache_hit_ratio: float
    deadlocks_count: int
    locks_waiting: int


class LoadTestMonitor:
    """Monitors system and application performance during load testing"""
    
    def __init__(self, interval_seconds: float = 1.0):
        self.interval_seconds = interval_seconds
        self.is_monitoring = False
        self.monitoring_task = None
        
        # Metrics storage
        self.system_metrics: List[SystemMetrics] = []
        self.application_metrics: List[ApplicationMetrics] = []
        self.database_metrics: List[DatabaseMetrics] = []
        
        # Performance counters
        self.request_count = 0
        self.error_count = 0
        self.response_times: List[float] = []
        
        # Baseline metrics
        self.baseline_system_metrics: Optional[SystemMetrics] = None
        
        # Threading
        self.lock = threading.Lock()
        
        # Logging
        self.logger = logging.getLogger(__name__)
    
    async def start(self):
        """Start monitoring"""
        if self.is_monitoring:
            self.logger.warning("Monitoring is already running")
            return
        
        self.logger.info("Starting load test monitoring")
        self.is_monitoring = True
        
        # Capture baseline metrics
        await self._capture_baseline()
        
        # Start monitoring task
        self.monitoring_task = asyncio.create_task(self._monitoring_loop())
    
    async def stop(self):
        """Stop monitoring"""
        if not self.is_monitoring:
            return
        
        self.logger.info("Stopping load test monitoring")
        self.is_monitoring = False
        
        if self.monitoring_task:
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
    
    async def _monitoring_loop(self):
        """Main monitoring loop"""
        while self.is_monitoring:
            try:
                # Capture system metrics
                system_metrics = await self._capture_system_metrics()
                self.system_metrics.append(system_metrics)
                
                # Capture application metrics
                app_metrics = await self._capture_application_metrics()
                self.application_metrics.append(app_metrics)
                
                # Capture database metrics
                db_metrics = await self._capture_database_metrics()
                self.database_metrics.append(db_metrics)
                
                # Log metrics if significant changes detected
                await self._check_anomalies(system_metrics, app_metrics, db_metrics)
                
                await asyncio.sleep(self.interval_seconds)
                
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(self.interval_seconds)
    
    async def _capture_baseline(self):
        """Capture baseline system metrics"""
        self.logger.info("Capturing baseline system metrics")
        
        # Wait a moment for system to stabilize
        await asyncio.sleep(2)
        
        # Capture baseline
        self.baseline_system_metrics = await self._capture_system_metrics()
        
        self.logger.info(f"Baseline captured: CPU={self.baseline_system_metrics.cpu_percent}%, "
                        f"Memory={self.baseline_system_metrics.memory_percent}%")
    
    async def _capture_system_metrics(self) -> SystemMetrics:
        """Capture current system metrics"""
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=0.1)
        
        # Memory usage
        memory = psutil.virtual_memory()
        
        # Disk usage
        disk = psutil.disk_usage('/')
        
        # Disk I/O
        disk_io = psutil.disk_io_counters()
        disk_io_read_mb = disk_io.read_bytes / (1024 * 1024) if disk_io else 0
        disk_io_write_mb = disk_io.write_bytes / (1024 * 1024) if disk_io else 0
        
        # Network I/O
        network = psutil.net_io_counters()
        
        return SystemMetrics(
            timestamp=datetime.now(),
            cpu_percent=cpu_percent,
            memory_percent=memory.percent,
            memory_used_mb=memory.used / (1024 * 1024),
            memory_available_mb=memory.available / (1024 * 1024),
            disk_usage_percent=disk.percent,
            disk_io_read_mb=disk_io_read_mb,
            disk_io_write_mb=disk_io_write_mb,
            network_bytes_sent=network.bytes_sent,
            network_bytes_recv=network.bytes_recv,
            network_packets_sent=network.packets_sent,
            network_packets_recv=network.packets_recv
        )
    
    async def _capture_application_metrics(self) -> ApplicationMetrics:
        """Capture application-specific metrics"""
        with self.lock:
            # Calculate request rate (requests per second)
            current_time = time.time()
            if len(self.response_times) > 1:
                time_window = 60  # 1 minute window
                recent_requests = [rt for rt in self.response_times 
                                 if current_time - rt < time_window]
                request_rate = len(recent_requests) / time_window
            else:
                request_rate = 0
            
            # Calculate response time statistics
            if self.response_times:
                sorted_times = sorted(self.response_times)
                avg_response_time = sum(self.response_times) / len(self.response_times)
                p95_index = int(len(sorted_times) * 0.95)
                p99_index = int(len(sorted_times) * 0.99)
                p95_response_time = sorted_times[p95_index] if p95_index < len(sorted_times) else 0
                p99_response_time = sorted_times[p99_index] if p99_index < len(sorted_times) else 0
            else:
                avg_response_time = p95_response_time = p99_response_time = 0
            
            # Calculate error rate
            total_requests = self.request_count
            error_rate = self.error_count / total_requests if total_requests > 0 else 0
            
            # Calculate throughput (requests per second)
            throughput = request_rate
        
        return ApplicationMetrics(
            timestamp=datetime.now(),
            active_connections=0,  # Would need to track from application
            request_rate=request_rate,
            response_time_avg=avg_response_time,
            response_time_p95=p95_response_time,
            response_time_p99=p99_response_time,
            error_rate=error_rate,
            throughput=throughput
        )
    
    async def _capture_database_metrics(self) -> DatabaseMetrics:
        """Capture database performance metrics"""
        # This would typically connect to the database and run monitoring queries
        # For now, we'll return placeholder metrics
        
        return DatabaseMetrics(
            timestamp=datetime.now(),
            active_connections=0,  # Would query database
            query_execution_time_avg=0,  # Would calculate from query logs
            slow_queries_count=0,  # Would count slow queries
            cache_hit_ratio=0,  # Would query cache statistics
            deadlocks_count=0,  # Would query deadlock counters
            locks_waiting=0  # Would query lock statistics
        )
    
    async def _check_anomalies(self, system_metrics: SystemMetrics, 
                              app_metrics: ApplicationMetrics, 
                              db_metrics: DatabaseMetrics):
        """Check for performance anomalies and log warnings"""
        if not self.baseline_system_metrics:
            return
        
        # Check CPU usage
        cpu_threshold = 80.0
        if system_metrics.cpu_percent > cpu_threshold:
            self.logger.warning(f"High CPU usage detected: {system_metrics.cpu_percent}%")
        
        # Check memory usage
        memory_threshold = 85.0
        if system_metrics.memory_percent > memory_threshold:
            self.logger.warning(f"High memory usage detected: {system_metrics.memory_percent}%")
        
        # Check response time
        response_time_threshold = 5000  # 5 seconds
        if app_metrics.response_time_p95 > response_time_threshold:
            self.logger.warning(f"High response time detected: {app_metrics.response_time_p95}ms")
        
        # Check error rate
        error_rate_threshold = 0.05  # 5%
        if app_metrics.error_rate > error_rate_threshold:
            self.logger.warning(f"High error rate detected: {app_metrics.error_rate * 100}%")
    
    def record_request(self, response_time: float, is_error: bool = False):
        """Record a request for metrics calculation"""
        with self.lock:
            self.request_count += 1
            self.response_times.append(response_time)
            
            if is_error:
                self.error_count += 1
            
            # Keep only recent response times to avoid memory issues
            if len(self.response_times) > 10000:
                self.response_times = self.response_times[-5000:]
    
    async def get_data(self) -> Dict[str, Any]:
        """Get all monitoring data"""
        with self.lock:
            return {
                "system_metrics": [asdict(m) for m in self.system_metrics],
                "application_metrics": [asdict(m) for m in self.application_metrics],
                "database_metrics": [asdict(m) for m in self.database_metrics],
                "baseline_metrics": asdict(self.baseline_system_metrics) if self.baseline_system_metrics else None,
                "summary": self._generate_summary()
            }
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate summary of monitoring data"""
        if not self.system_metrics:
            return {}
        
        # System metrics summary
        cpu_values = [m.cpu_percent for m in self.system_metrics]
        memory_values = [m.memory_percent for m in self.system_metrics]
        
        # Application metrics summary
        response_times = [m.response_time_avg for m in self.application_metrics if m.response_time_avg > 0]
        error_rates = [m.error_rate for m in self.application_metrics]
        
        return {
            "monitoring_duration_seconds": (self.system_metrics[-1].timestamp - self.system_metrics[0].timestamp).total_seconds(),
            "system": {
                "cpu_avg": sum(cpu_values) / len(cpu_values),
                "cpu_max": max(cpu_values),
                "cpu_min": min(cpu_values),
                "memory_avg": sum(memory_values) / len(memory_values),
                "memory_max": max(memory_values),
                "memory_min": min(memory_values)
            },
            "application": {
                "response_time_avg": sum(response_times) / len(response_times) if response_times else 0,
                "response_time_max": max(response_times) if response_times else 0,
                "error_rate_avg": sum(error_rates) / len(error_rates) if error_rates else 0,
                "error_rate_max": max(error_rates) if error_rates else 0,
                "total_requests": self.request_count,
                "total_errors": self.error_count
            }
        }
    
    async def save_metrics(self, filename: str):
        """Save monitoring data to file"""
        data = await self.get_data()
        
        with open(filename, 'w') as f:
            json.dump(data, f, indent=2, default=str)
        
        self.logger.info(f"Monitoring data saved to {filename}")
    
    async def get_realtime_metrics(self) -> Dict[str, Any]:
        """Get current real-time metrics"""
        if not self.system_metrics:
            return {}
        
        latest_system = self.system_metrics[-1]
        latest_app = self.application_metrics[-1] if self.application_metrics else None
        latest_db = self.database_metrics[-1] if self.database_metrics else None
        
        return {
            "timestamp": latest_system.timestamp.isoformat(),
            "system": {
                "cpu_percent": latest_system.cpu_percent,
                "memory_percent": latest_system.memory_percent,
                "memory_used_mb": latest_system.memory_used_mb,
                "disk_usage_percent": latest_system.disk_usage_percent
            },
            "application": {
                "request_rate": latest_app.request_rate if latest_app else 0,
                "response_time_avg": latest_app.response_time_avg if latest_app else 0,
                "error_rate": latest_app.error_rate if latest_app else 0,
                "throughput": latest_app.throughput if latest_app else 0
            } if latest_app else {},
            "database": {
                "active_connections": latest_db.active_connections if latest_db else 0,
                "query_execution_time_avg": latest_db.query_execution_time_avg if latest_db else 0
            } if latest_db else {}
        }
    
    def reset(self):
        """Reset monitoring data"""
        with self.lock:
            self.system_metrics.clear()
            self.application_metrics.clear()
            self.database_metrics.clear()
            self.request_count = 0
            self.error_count = 0
            self.response_times.clear()
            self.baseline_system_metrics = None
        
        self.logger.info("Monitoring data reset")


class MetricsAggregator:
    """Aggregates metrics from multiple monitoring sessions"""
    
    def __init__(self):
        self.sessions: List[Dict[str, Any]] = []
    
    def add_session(self, session_data: Dict[str, Any]):
        """Add a monitoring session"""
        self.sessions.append(session_data)
    
    def get_aggregated_summary(self) -> Dict[str, Any]:
        """Get aggregated summary across all sessions"""
        if not self.sessions:
            return {}
        
        all_cpu_values = []
        all_memory_values = []
        all_response_times = []
        all_error_rates = []
        total_duration = 0
        
        for session in self.sessions:
            summary = session.get("summary", {})
            
            # System metrics
            system = summary.get("system", {})
            if "cpu_avg" in system:
                all_cpu_values.append(system["cpu_avg"])
            if "memory_avg" in system:
                all_memory_values.append(system["memory_avg"])
            
            # Application metrics
            app = summary.get("application", {})
            if "response_time_avg" in app and app["response_time_avg"] > 0:
                all_response_times.append(app["response_time_avg"])
            if "error_rate_avg" in app:
                all_error_rates.append(app["error_rate_avg"])
            
            # Duration
            total_duration += summary.get("monitoring_duration_seconds", 0)
        
        return {
            "total_sessions": len(self.sessions),
            "total_duration_seconds": total_duration,
            "system": {
                "cpu_avg": sum(all_cpu_values) / len(all_cpu_values) if all_cpu_values else 0,
                "cpu_max": max(all_cpu_values) if all_cpu_values else 0,
                "memory_avg": sum(all_memory_values) / len(all_memory_values) if all_memory_values else 0,
                "memory_max": max(all_memory_values) if all_memory_values else 0
            },
            "application": {
                "response_time_avg": sum(all_response_times) / len(all_response_times) if all_response_times else 0,
                "response_time_max": max(all_response_times) if all_response_times else 0,
                "error_rate_avg": sum(all_error_rates) / len(all_error_rates) if all_error_rates else 0,
                "error_rate_max": max(all_error_rates) if all_error_rates else 0
            }
        }


# Example usage
async def main():
    """Example usage of the monitor"""
    monitor = LoadTestMonitor(interval_seconds=1.0)
    
    try:
        await monitor.start()
        
        # Simulate some requests
        for i in range(10):
            response_time = 100 + i * 10  # Simulate increasing response times
            is_error = i % 10 == 0  # Every 10th request is an error
            monitor.record_request(response_time, is_error)
            await asyncio.sleep(0.5)
        
        # Get real-time metrics
        metrics = await monitor.get_realtime_metrics()
        print("Real-time metrics:", json.dumps(metrics, indent=2))
        
        # Wait a bit more
        await asyncio.sleep(5)
        
        # Get all data
        data = await monitor.get_data()
        print("Summary:", json.dumps(data["summary"], indent=2))
        
    finally:
        await monitor.stop()


if __name__ == "__main__":
    asyncio.run(main())
