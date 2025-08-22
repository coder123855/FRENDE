"""
WebSocket Connection Monitor
Monitors WebSocket connections, their health, and performance metrics.
"""

import asyncio
import time
import json
from typing import Dict, Any, List, Optional, Set, Tuple
from datetime import datetime, timedelta
from collections import defaultdict, deque
import logging
import statistics
import hashlib

from core.config import settings
from core.logging_config import get_logger
from api.metrics import update_websocket_connections

logger = get_logger("websocket_monitor")

class ConnectionQualityMetrics:
    """Tracks connection quality metrics for a WebSocket connection"""
    
    def __init__(self):
        self.ping_times: List[float] = deque(maxlen=100)  # Last 100 ping times
        self.message_latencies: List[float] = deque(maxlen=100)  # Last 100 message latencies
        self.error_count = 0
        self.reconnection_count = 0
        self.last_ping_time: Optional[datetime] = None
        self.last_pong_time: Optional[datetime] = None
        self.connection_stability_score = 100.0  # 0-100 score
        self.bandwidth_usage = 0  # Bytes sent/received
        self.message_sizes: List[int] = deque(maxlen=100)  # Last 100 message sizes
    
    def record_ping(self, ping_time: float):
        """Record a ping time"""
        self.ping_times.append(ping_time)
        self.last_ping_time = datetime.utcnow()
        self._update_stability_score()
    
    def record_pong(self):
        """Record a pong response"""
        self.last_pong_time = datetime.utcnow()
    
    def record_message_latency(self, latency: float):
        """Record message round-trip latency"""
        self.message_latencies.append(latency)
        self._update_stability_score()
    
    def record_error(self):
        """Record an error"""
        self.error_count += 1
        self._update_stability_score()
    
    def record_reconnection(self):
        """Record a reconnection"""
        self.reconnection_count += 1
        self._update_stability_score()
    
    def record_bandwidth(self, bytes_sent: int, bytes_received: int):
        """Record bandwidth usage"""
        self.bandwidth_usage += bytes_sent + bytes_received
    
    def record_message_size(self, size: int):
        """Record message size"""
        self.message_sizes.append(size)
    
    def get_quality_score(self) -> float:
        """Calculate overall connection quality score (0-100)"""
        if not self.ping_times and not self.message_latencies:
            return self.connection_stability_score
        
        # Calculate ping quality (lower is better)
        ping_score = 100.0
        if self.ping_times:
            avg_ping = statistics.mean(self.ping_times)
            if avg_ping > 1000:  # > 1 second
                ping_score = 0.0
            elif avg_ping > 500:  # > 500ms
                ping_score = 50.0
            elif avg_ping > 100:  # > 100ms
                ping_score = 75.0
        
        # Calculate latency quality (lower is better)
        latency_score = 100.0
        if self.message_latencies:
            avg_latency = statistics.mean(self.message_latencies)
            if avg_latency > 2000:  # > 2 seconds
                latency_score = 0.0
            elif avg_latency > 1000:  # > 1 second
                latency_score = 50.0
            elif avg_latency > 500:  # > 500ms
                latency_score = 75.0
        
        # Calculate error rate (lower is better)
        error_score = 100.0
        total_operations = len(self.ping_times) + len(self.message_latencies)
        if total_operations > 0:
            error_rate = self.error_count / total_operations
            if error_rate > 0.1:  # > 10% error rate
                error_score = 0.0
            elif error_rate > 0.05:  # > 5% error rate
                error_score = 50.0
            elif error_rate > 0.01:  # > 1% error rate
                error_score = 75.0
        
        # Weighted average of all scores
        quality_score = (
            ping_score * 0.3 +
            latency_score * 0.3 +
            error_score * 0.2 +
            self.connection_stability_score * 0.2
        )
        
        return min(100.0, max(0.0, quality_score))
    
    def _update_stability_score(self):
        """Update connection stability score based on recent activity"""
        # Decrease score for errors and reconnections
        if self.error_count > 0:
            self.connection_stability_score = max(0.0, self.connection_stability_score - (self.error_count * 5))
        
        if self.reconnection_count > 0:
            self.connection_stability_score = max(0.0, self.connection_stability_score - (self.reconnection_count * 10))
        
        # Gradually recover stability score over time
        if self.error_count == 0 and self.reconnection_count == 0:
            self.connection_stability_score = min(100.0, self.connection_stability_score + 1)
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get summary of quality metrics"""
        return {
            "quality_score": self.get_quality_score(),
            "avg_ping_time": statistics.mean(self.ping_times) if self.ping_times else 0,
            "avg_latency": statistics.mean(self.message_latencies) if self.message_latencies else 0,
            "error_count": self.error_count,
            "reconnection_count": self.reconnection_count,
            "bandwidth_usage": self.bandwidth_usage,
            "avg_message_size": statistics.mean(self.message_sizes) if self.message_sizes else 0,
            "stability_score": self.connection_stability_score
        }

class WebSocketConnection:
    """Represents a single WebSocket connection with enhanced monitoring"""
    
    def __init__(self, connection_id: str, user_id: Optional[int] = None):
        self.connection_id = connection_id
        self.user_id = user_id
        self.connected_at = datetime.utcnow()
        self.last_activity = datetime.utcnow()
        self.message_count = 0
        self.error_count = 0
        self.is_active = True
        self.metadata: Dict[str, Any] = {}
        self.quality_metrics = ConnectionQualityMetrics()
        self.room_ids: Set[str] = set()
        self.last_heartbeat = datetime.utcnow()
        self.heartbeat_interval = 30  # seconds
        self.connection_type = "standard"  # standard, persistent, temporary
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.utcnow()
    
    def record_message(self, message_size: int = 0):
        """Record a message sent/received"""
        self.message_count += 1
        self.update_activity()
        if message_size > 0:
            self.quality_metrics.record_message_size(message_size)
    
    def record_error(self):
        """Record an error"""
        self.error_count += 1
        self.update_activity()
        self.quality_metrics.record_error()
    
    def record_ping(self, ping_time: float):
        """Record ping time"""
        self.quality_metrics.record_ping(ping_time)
        self.update_activity()
    
    def record_pong(self):
        """Record pong response"""
        self.quality_metrics.record_pong()
        self.update_activity()
    
    def record_bandwidth(self, bytes_sent: int, bytes_received: int):
        """Record bandwidth usage"""
        self.quality_metrics.record_bandwidth(bytes_sent, bytes_received)
    
    def record_reconnection(self):
        """Record a reconnection"""
        self.quality_metrics.record_reconnection()
    
    def add_room(self, room_id: str):
        """Add connection to a room"""
        self.room_ids.add(room_id)
    
    def remove_room(self, room_id: str):
        """Remove connection from a room"""
        self.room_ids.discard(room_id)
    
    def update_heartbeat(self):
        """Update heartbeat timestamp"""
        self.last_heartbeat = datetime.utcnow()
    
    def is_heartbeat_healthy(self) -> bool:
        """Check if heartbeat is healthy"""
        return (datetime.utcnow() - self.last_heartbeat).total_seconds() < self.heartbeat_interval * 2
    
    def disconnect(self):
        """Mark connection as disconnected"""
        self.is_active = False
    
    def get_connection_duration(self) -> float:
        """Get connection duration in seconds"""
        return (datetime.utcnow() - self.connected_at).total_seconds()
    
    def get_idle_time(self) -> float:
        """Get idle time in seconds"""
        return (datetime.utcnow() - self.last_activity).total_seconds()
    
    def get_quality_score(self) -> float:
        """Get connection quality score"""
        return self.quality_metrics.get_quality_score()
    
    def get_quality_metrics(self) -> Dict[str, Any]:
        """Get detailed quality metrics"""
        return self.quality_metrics.get_metrics_summary()

class WebSocketMonitor:
    """Enhanced WebSocket connection monitoring and management"""
    
    def __init__(self):
        self.connections: Dict[str, WebSocketConnection] = {}
        self.connection_history: List[Dict[str, Any]] = []
        self.max_history_size = 1000
        self.monitoring_enabled = True
        
        # Performance tracking
        self.performance_metrics = {
            "total_messages": 0,
            "total_errors": 0,
            "avg_quality_score": 100.0,
            "peak_connections": 0,
            "connection_churn_rate": 0.0
        }
        
        # Alert thresholds
        self.alert_thresholds = {
            "max_connections": 2000,
            "min_quality_score": 50.0,
            "max_error_rate": 0.05,  # 5%
            "max_latency_ms": 1000,
            "max_idle_time": 3600  # 1 hour
        }
        
        # Analytics data
        self.analytics = {
            "hourly_connections": defaultdict(int),
            "quality_distribution": defaultdict(int),
            "error_patterns": defaultdict(int),
            "room_activity": defaultdict(int)
        }
    
    def add_connection(self, connection_id: str, user_id: Optional[int] = None, 
                      metadata: Optional[Dict[str, Any]] = None) -> WebSocketConnection:
        """Add a new WebSocket connection"""
        connection = WebSocketConnection(connection_id, user_id)
        if metadata:
            connection.metadata = metadata
        
        self.connections[connection_id] = connection
        
        # Update metrics
        update_websocket_connections(len(self.connections))
        self._update_peak_connections()
        self._update_analytics("connection_added", connection)
        
        logger.info(f"WebSocket connection added: {connection_id} (user: {user_id})")
        return connection
    
    def remove_connection(self, connection_id: str) -> Optional[WebSocketConnection]:
        """Remove a WebSocket connection"""
        if connection_id in self.connections:
            connection = self.connections[connection_id]
            connection.disconnect()
            
            # Add to history
            self._add_to_history(connection)
            
            # Update analytics
            self._update_analytics("connection_removed", connection)
            
            # Remove from active connections
            del self.connections[connection_id]
            
            # Update metrics
            update_websocket_connections(len(self.connections))
            
            logger.info(f"WebSocket connection removed: {connection_id}")
            return connection
        return None
    
    def get_connection(self, connection_id: str) -> Optional[WebSocketConnection]:
        """Get a WebSocket connection by ID"""
        return self.connections.get(connection_id)
    
    def record_message(self, connection_id: str, message_size: int = 0):
        """Record a message for a connection"""
        if connection_id in self.connections:
            self.connections[connection_id].record_message(message_size)
            self.performance_metrics["total_messages"] += 1
    
    def record_error(self, connection_id: str):
        """Record an error for a connection"""
        if connection_id in self.connections:
            self.connections[connection_id].record_error()
            self.performance_metrics["total_errors"] += 1
    
    def record_ping(self, connection_id: str, ping_time: float):
        """Record ping time for a connection"""
        if connection_id in self.connections:
            self.connections[connection_id].record_ping(ping_time)
    
    def record_pong(self, connection_id: str):
        """Record pong response for a connection"""
        if connection_id in self.connections:
            self.connections[connection_id].record_pong()
    
    def record_bandwidth(self, connection_id: str, bytes_sent: int, bytes_received: int):
        """Record bandwidth usage for a connection"""
        if connection_id in self.connections:
            self.connections[connection_id].record_bandwidth(bytes_sent, bytes_received)
    
    def get_active_connections_count(self) -> int:
        """Get count of active connections"""
        return len(self.connections)
    
    def get_connections_by_user(self, user_id: int) -> List[WebSocketConnection]:
        """Get all connections for a specific user"""
        return [
            conn for conn in self.connections.values()
            if conn.user_id == user_id and conn.is_active
        ]
    
    def get_connections_by_room(self, room_id: str) -> List[WebSocketConnection]:
        """Get all connections in a specific room"""
        return [
            conn for conn in self.connections.values()
            if room_id in conn.room_ids and conn.is_active
        ]
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get comprehensive connection statistics"""
        if not self.connections:
            return {
                "total_connections": 0,
                "active_connections": 0,
                "unique_users": 0,
                "total_messages": 0,
                "total_errors": 0,
                "average_connection_duration": 0,
                "average_idle_time": 0,
                "average_quality_score": 100.0,
                "error_rate": 0,
                "peak_connections": self.performance_metrics["peak_connections"]
            }
        
        active_connections = [conn for conn in self.connections.values() if conn.is_active]
        unique_users = len(set(conn.user_id for conn in active_connections if conn.user_id))
        total_messages = sum(conn.message_count for conn in active_connections)
        total_errors = sum(conn.error_count for conn in active_connections)
        
        connection_durations = [conn.get_connection_duration() for conn in active_connections]
        idle_times = [conn.get_idle_time() for conn in active_connections]
        quality_scores = [conn.get_quality_score() for conn in active_connections]
        
        return {
            "total_connections": len(self.connections),
            "active_connections": len(active_connections),
            "unique_users": unique_users,
            "total_messages": total_messages,
            "total_errors": total_errors,
            "average_connection_duration": sum(connection_durations) / len(connection_durations) if connection_durations else 0,
            "average_idle_time": sum(idle_times) / len(idle_times) if idle_times else 0,
            "average_quality_score": sum(quality_scores) / len(quality_scores) if quality_scores else 100.0,
            "error_rate": (total_errors / total_messages * 100) if total_messages > 0 else 0,
            "peak_connections": self.performance_metrics["peak_connections"]
        }
    
    def get_connection_health(self) -> Dict[str, Any]:
        """Get WebSocket connection health status with enhanced metrics"""
        stats = self.get_connection_stats()
        
        # Determine health status
        health_status = "healthy"
        warnings = []
        critical_issues = []
        
        # Check error rate
        if stats["error_rate"] > 10:
            health_status = "critical"
            critical_issues.append(f"Critical error rate: {stats['error_rate']:.1f}%")
        elif stats["error_rate"] > 5:
            health_status = "warning"
            warnings.append(f"High error rate: {stats['error_rate']:.1f}%")
        
        # Check connection count
        if stats["active_connections"] > self.alert_thresholds["max_connections"]:
            health_status = "critical"
            critical_issues.append(f"Critical connection count: {stats['active_connections']}")
        elif stats["active_connections"] > self.alert_thresholds["max_connections"] * 0.8:
            health_status = "warning"
            warnings.append(f"High connection count: {stats['active_connections']}")
        
        # Check quality score
        if stats["average_quality_score"] < self.alert_thresholds["min_quality_score"]:
            health_status = "critical"
            critical_issues.append(f"Critical quality score: {stats['average_quality_score']:.1f}")
        elif stats["average_quality_score"] < self.alert_thresholds["min_quality_score"] * 1.2:
            health_status = "warning"
            warnings.append(f"Low quality score: {stats['average_quality_score']:.1f}")
        
        # Check average idle time
        if stats["average_idle_time"] > self.alert_thresholds["max_idle_time"]:
            health_status = "warning"
            warnings.append(f"High average idle time: {stats['average_idle_time']:.1f}s")
        
        return {
            "status": health_status,
            "timestamp": datetime.utcnow().isoformat(),
            "stats": stats,
            "warnings": warnings,
            "critical_issues": critical_issues,
            "thresholds": self.alert_thresholds
        }
    
    def get_quality_distribution(self) -> Dict[str, int]:
        """Get distribution of connection quality scores"""
        distribution = defaultdict(int)
        for conn in self.connections.values():
            if conn.is_active:
                score = conn.get_quality_score()
                if score >= 90:
                    distribution["excellent"] += 1
                elif score >= 70:
                    distribution["good"] += 1
                elif score >= 50:
                    distribution["fair"] += 1
                else:
                    distribution["poor"] += 1
        return dict(distribution)
    
    def get_performance_analytics(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance analytics for the specified time period"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Filter recent connections
        recent_connections = [
            conn for conn in self.connections.values()
            if conn.connected_at >= cutoff_time
        ]
        
        # Calculate analytics
        total_bandwidth = sum(conn.quality_metrics.bandwidth_usage for conn in recent_connections)
        avg_message_size = statistics.mean([
            statistics.mean(conn.quality_metrics.message_sizes) 
            for conn in recent_connections 
            if conn.quality_metrics.message_sizes
        ]) if any(conn.quality_metrics.message_sizes for conn in recent_connections) else 0
        
        return {
            "period_hours": hours,
            "total_connections": len(recent_connections),
            "total_bandwidth_bytes": total_bandwidth,
            "average_message_size": avg_message_size,
            "quality_distribution": self.get_quality_distribution(),
            "room_activity": dict(self.analytics["room_activity"]),
            "error_patterns": dict(self.analytics["error_patterns"])
        }
    
    def cleanup_inactive_connections(self, max_idle_time: int = 3600) -> int:
        """Clean up connections that have been idle for too long"""
        if not self.monitoring_enabled:
            return 0
        
        current_time = datetime.utcnow()
        removed_count = 0
        
        connections_to_remove = []
        for connection_id, connection in self.connections.items():
            if connection.is_active:
                idle_time = (current_time - connection.last_activity).total_seconds()
                if idle_time > max_idle_time:
                    connections_to_remove.append(connection_id)
        
        for connection_id in connections_to_remove:
            self.remove_connection(connection_id)
            removed_count += 1
        
        if removed_count > 0:
            logger.info(f"Cleaned up {removed_count} inactive WebSocket connections")
        
        return removed_count
    
    def cleanup_unhealthy_connections(self, min_quality_score: float = 20.0) -> int:
        """Clean up connections with very poor quality scores"""
        if not self.monitoring_enabled:
            return 0
        
        removed_count = 0
        connections_to_remove = []
        
        for connection_id, connection in self.connections.items():
            if connection.is_active and connection.get_quality_score() < min_quality_score:
                connections_to_remove.append(connection_id)
        
        for connection_id in connections_to_remove:
            self.remove_connection(connection_id)
            removed_count += 1
        
        if removed_count > 0:
            logger.info(f"Cleaned up {removed_count} unhealthy WebSocket connections")
        
        return removed_count
    
    def get_connection_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """Get connection history"""
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)
        
        return [
            entry for entry in self.connection_history
            if datetime.fromisoformat(entry["disconnected_at"]) >= cutoff_time
        ]
    
    def _add_to_history(self, connection: WebSocketConnection):
        """Add connection to history when it's removed"""
        history_entry = {
            "connection_id": connection.connection_id,
            "user_id": connection.user_id,
            "connected_at": connection.connected_at.isoformat(),
            "disconnected_at": datetime.utcnow().isoformat(),
            "duration_seconds": connection.get_connection_duration(),
            "message_count": connection.message_count,
            "error_count": connection.error_count,
            "quality_score": connection.get_quality_score(),
            "room_ids": list(connection.room_ids),
            "metadata": connection.metadata,
            "quality_metrics": connection.get_quality_metrics()
        }
        
        self.connection_history.append(history_entry)
        
        # Keep only the last N entries
        if len(self.connection_history) > self.max_history_size:
            self.connection_history = self.connection_history[-self.max_history_size:]
    
    def _update_peak_connections(self):
        """Update peak connection count"""
        current_count = len(self.connections)
        if current_count > self.performance_metrics["peak_connections"]:
            self.performance_metrics["peak_connections"] = current_count
    
    def _update_analytics(self, event_type: str, connection: WebSocketConnection):
        """Update analytics data"""
        current_hour = datetime.utcnow().strftime("%Y-%m-%d %H:00")
        
        if event_type == "connection_added":
            self.analytics["hourly_connections"][current_hour] += 1
        
        # Update quality distribution
        quality_score = connection.get_quality_score()
        if quality_score >= 90:
            self.analytics["quality_distribution"]["excellent"] += 1
        elif quality_score >= 70:
            self.analytics["quality_distribution"]["good"] += 1
        elif quality_score >= 50:
            self.analytics["quality_distribution"]["fair"] += 1
        else:
            self.analytics["quality_distribution"]["poor"] += 1
        
        # Update room activity
        for room_id in connection.room_ids:
            self.analytics["room_activity"][room_id] += 1
    
    async def run_continuous_monitoring(self, cleanup_interval: int = 300):
        """Run continuous WebSocket monitoring and cleanup"""
        logger.info(f"Starting continuous WebSocket monitoring (cleanup interval: {cleanup_interval}s)")
        
        while True:
            try:
                # Cleanup inactive connections
                removed_inactive = self.cleanup_inactive_connections()
                
                # Cleanup unhealthy connections
                removed_unhealthy = self.cleanup_unhealthy_connections()
                
                # Update performance metrics
                self._update_performance_metrics()
                
                # Log stats periodically
                stats = self.get_connection_stats()
                health = self.get_connection_health()
                
                if health["status"] == "critical":
                    logger.critical(f"WebSocket health critical: {health['critical_issues']}")
                elif health["status"] == "warning":
                    logger.warning(f"WebSocket health warning: {health['warnings']}")
                else:
                    logger.debug(f"WebSocket stats: {stats['active_connections']} active connections")
                
                await asyncio.sleep(cleanup_interval)
            except Exception as e:
                logger.error(f"Error in continuous WebSocket monitoring: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying
    
    def _update_performance_metrics(self):
        """Update performance metrics"""
        if self.connections:
            quality_scores = [conn.get_quality_score() for conn in self.connections.values()]
            self.performance_metrics["avg_quality_score"] = sum(quality_scores) / len(quality_scores)
        
        # Calculate connection churn rate (connections per minute)
        recent_connections = [
            conn for conn in self.connections.values()
            if (datetime.utcnow() - conn.connected_at).total_seconds() < 60
        ]
        self.performance_metrics["connection_churn_rate"] = len(recent_connections)

# Global WebSocket monitor instance
websocket_monitor = WebSocketMonitor()
