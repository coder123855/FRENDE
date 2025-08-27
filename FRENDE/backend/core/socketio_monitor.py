"""
Socket.IO Monitor for Frende Backend
Provides Socket.IO monitoring functionality to replace WebSocket monitor
"""

import logging
import time
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
from collections import defaultdict, deque

from api.socketio_server import connected_users, connection_quality, message_tracking

logger = logging.getLogger(__name__)

class SocketIOMonitor:
    """Monitor for Socket.IO connections and performance"""
    
    def __init__(self):
        self.connections: Dict[str, Dict] = {}
        self.connection_history: deque = deque(maxlen=10000)
        self.performance_metrics: deque = deque(maxlen=1000)
        self.error_log: deque = deque(maxlen=1000)
        
    def get_connection_health(self) -> Dict[str, Any]:
        """Get overall connection health status"""
        try:
            total_connections = len(connected_users)
            active_connections = len([sid for sid in connected_users.keys() if sid in connection_quality])
            
            # Calculate average latency
            all_latencies = []
            for quality in connection_quality.values():
                if "message_latencies" in quality:
                    all_latencies.extend(quality["message_latencies"])
            
            avg_latency = sum(all_latencies) / len(all_latencies) if all_latencies else 0
            
            # Calculate error rate
            total_errors = sum(q.get("error_count", 0) for q in connection_quality.values())
            total_messages = sum(q.get("message_count", 0) for q in connection_quality.values())
            error_rate = (total_errors / total_messages * 100) if total_messages > 0 else 0
            
            # Determine health status
            status = "healthy"
            warnings = []
            
            if error_rate > 5:
                status = "degraded"
                warnings.append(f"High error rate: {error_rate:.2f}%")
            
            if avg_latency > 1000:  # 1 second
                status = "degraded"
                warnings.append(f"High average latency: {avg_latency:.2f}ms")
            
            if active_connections == 0 and total_connections > 0:
                status = "degraded"
                warnings.append("No active connections")
            
            return {
                "status": status,
                "total_connections": total_connections,
                "active_connections": active_connections,
                "average_latency_ms": round(avg_latency, 2),
                "error_rate_percent": round(error_rate, 2),
                "warnings": warnings,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting connection health: {e}")
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get connection statistics"""
        try:
            total_connections = len(connected_users)
            
            # Calculate message statistics
            total_messages = sum(q.get("message_count", 0) for q in connection_quality.values())
            total_errors = sum(q.get("error_count", 0) for q in connection_quality.values())
            
            # Calculate latency statistics
            all_latencies = []
            for quality in connection_quality.values():
                if "message_latencies" in quality:
                    all_latencies.extend(quality["message_latencies"])
            
            if all_latencies:
                avg_latency = sum(all_latencies) / len(all_latencies)
                min_latency = min(all_latencies)
                max_latency = max(all_latencies)
            else:
                avg_latency = min_latency = max_latency = 0
            
            # Calculate connection duration
            connection_durations = []
            for quality in connection_quality.values():
                if "connection_start" in quality:
                    duration = (datetime.utcnow() - quality["connection_start"]).total_seconds()
                    connection_durations.append(duration)
            
            avg_duration = sum(connection_durations) / len(connection_durations) if connection_durations else 0
            
            return {
                "total_connections": total_connections,
                "total_messages": total_messages,
                "total_errors": total_errors,
                "error_rate_percent": round((total_errors / total_messages * 100) if total_messages > 0 else 0, 2),
                "average_latency_ms": round(avg_latency, 2),
                "min_latency_ms": round(min_latency, 2),
                "max_latency_ms": round(max_latency, 2),
                "average_connection_duration_seconds": round(avg_duration, 2),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting connection stats: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def get_performance_analytics(self, hours: int = 1) -> Dict[str, Any]:
        """Get performance analytics for the last N hours"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            # Filter recent performance metrics
            recent_metrics = [
                metric for metric in self.performance_metrics
                if metric["timestamp"] >= cutoff_time
            ]
            
            if not recent_metrics:
                return {
                    "period_hours": hours,
                    "total_operations": 0,
                    "average_response_time": 0,
                    "error_count": 0,
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            # Calculate statistics
            response_times = [m["response_time"] for m in recent_metrics]
            errors = [m for m in recent_metrics if m.get("error")]
            
            return {
                "period_hours": hours,
                "total_operations": len(recent_metrics),
                "average_response_time": sum(response_times) / len(response_times),
                "min_response_time": min(response_times),
                "max_response_time": max(response_times),
                "error_count": len(errors),
                "error_rate_percent": round((len(errors) / len(recent_metrics) * 100), 2),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting performance analytics: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def get_quality_distribution(self) -> Dict[str, Any]:
        """Get connection quality distribution"""
        try:
            quality_scores = []
            
            for quality in connection_quality.values():
                # Calculate quality score based on latency and error rate
                avg_latency = sum(quality.get("message_latencies", [])) / max(len(quality.get("message_latencies", [])), 1)
                error_rate = quality.get("error_count", 0) / max(quality.get("message_count", 1), 1)
                
                # Quality score: 100 - (latency_factor + error_factor)
                latency_factor = min(avg_latency / 100, 50)  # Max 50 points for latency
                error_factor = min(error_rate * 100, 50)     # Max 50 points for errors
                quality_score = max(0, 100 - latency_factor - error_factor)
                
                quality_scores.append(quality_score)
            
            if not quality_scores:
                return {
                    "excellent": 0,
                    "good": 0,
                    "fair": 0,
                    "poor": 0,
                    "average_score": 0,
                    "timestamp": datetime.utcnow().isoformat()
                }
            
            # Categorize connections
            excellent = len([s for s in quality_scores if s >= 90])
            good = len([s for s in quality_scores if 70 <= s < 90])
            fair = len([s for s in quality_scores if 50 <= s < 70])
            poor = len([s for s in quality_scores if s < 50])
            
            return {
                "excellent": excellent,
                "good": good,
                "fair": fair,
                "poor": poor,
                "average_score": sum(quality_scores) / len(quality_scores),
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error getting quality distribution: {e}")
            return {
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def get_connection(self, connection_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a specific connection"""
        try:
            if connection_id not in connected_users:
                return None
            
            user_info = connected_users[connection_id]
            quality_info = connection_quality.get(connection_id, {})
            
            return {
                "connection_id": connection_id,
                "user_id": user_info.get("user_id"),
                "username": user_info.get("username"),
                "connected_at": user_info.get("connected_at"),
                "message_count": quality_info.get("message_count", 0),
                "error_count": quality_info.get("error_count", 0),
                "average_latency": sum(quality_info.get("message_latencies", [])) / max(len(quality_info.get("message_latencies", [])), 1),
                "last_activity": quality_info.get("last_activity"),
                "connection_start": quality_info.get("connection_start")
            }
            
        except Exception as e:
            logger.error(f"Error getting connection {connection_id}: {e}")
            return None
    
    def get_connections_by_room(self, room_id: str) -> List[Dict[str, Any]]:
        """Get all connections in a specific room"""
        try:
            # This would need to be implemented based on the actual room structure
            # For now, return empty list as rooms are managed by Socket.IO server
            return []
            
        except Exception as e:
            logger.error(f"Error getting connections for room {room_id}: {e}")
            return []
    
    def get_connection_history(self, hours: int = 1) -> List[Dict[str, Any]]:
        """Get connection history for the last N hours"""
        try:
            cutoff_time = datetime.utcnow() - timedelta(hours=hours)
            
            recent_history = [
                entry for entry in self.connection_history
                if entry["timestamp"] >= cutoff_time
            ]
            
            return recent_history
            
        except Exception as e:
            logger.error(f"Error getting connection history: {e}")
            return []
    
    def cleanup_inactive_connections(self) -> int:
        """Clean up inactive connections (handled by Socket.IO server)"""
        try:
            # This is handled by the Socket.IO server's health check loop
            return 0
            
        except Exception as e:
            logger.error(f"Error cleaning up inactive connections: {e}")
            return 0
    
    def cleanup_unhealthy_connections(self) -> int:
        """Clean up unhealthy connections (handled by Socket.IO server)"""
        try:
            # This is handled by the Socket.IO server's health check loop
            return 0
            
        except Exception as e:
            logger.error(f"Error cleaning up unhealthy connections: {e}")
            return 0

# Global Socket.IO monitor instance
socketio_monitor = SocketIOMonitor()
