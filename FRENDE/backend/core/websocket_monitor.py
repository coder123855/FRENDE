"""
WebSocket Connection Monitor
Monitors WebSocket connections, their health, and performance metrics.
"""

import asyncio
import time
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timedelta
from collections import defaultdict
import logging

from core.config import settings
from core.logging_config import get_logger
from api.metrics import update_websocket_connections

logger = get_logger("websocket_monitor")

class WebSocketConnection:
    """Represents a single WebSocket connection"""
    
    def __init__(self, connection_id: str, user_id: Optional[int] = None):
        self.connection_id = connection_id
        self.user_id = user_id
        self.connected_at = datetime.utcnow()
        self.last_activity = datetime.utcnow()
        self.message_count = 0
        self.error_count = 0
        self.is_active = True
        self.metadata: Dict[str, Any] = {}
    
    def update_activity(self):
        """Update last activity timestamp"""
        self.last_activity = datetime.utcnow()
    
    def record_message(self):
        """Record a message sent/received"""
        self.message_count += 1
        self.update_activity()
    
    def record_error(self):
        """Record an error"""
        self.error_count += 1
        self.update_activity()
    
    def disconnect(self):
        """Mark connection as disconnected"""
        self.is_active = False
    
    def get_connection_duration(self) -> float:
        """Get connection duration in seconds"""
        return (datetime.utcnow() - self.connected_at).total_seconds()
    
    def get_idle_time(self) -> float:
        """Get idle time in seconds"""
        return (datetime.utcnow() - self.last_activity).total_seconds()

class WebSocketMonitor:
    """WebSocket connection monitoring and management"""
    
    def __init__(self):
        self.connections: Dict[str, WebSocketConnection] = {}
        self.connection_history: List[Dict[str, Any]] = []
        self.max_history_size = 1000
        self.monitoring_enabled = True
        
    def add_connection(self, connection_id: str, user_id: Optional[int] = None, 
                      metadata: Optional[Dict[str, Any]] = None) -> WebSocketConnection:
        """Add a new WebSocket connection"""
        connection = WebSocketConnection(connection_id, user_id)
        if metadata:
            connection.metadata = metadata
        
        self.connections[connection_id] = connection
        
        # Update metrics
        update_websocket_connections(len(self.connections))
        
        logger.info(f"WebSocket connection added: {connection_id} (user: {user_id})")
        return connection
    
    def remove_connection(self, connection_id: str) -> Optional[WebSocketConnection]:
        """Remove a WebSocket connection"""
        if connection_id in self.connections:
            connection = self.connections[connection_id]
            connection.disconnect()
            
            # Add to history
            self._add_to_history(connection)
            
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
    
    def record_message(self, connection_id: str):
        """Record a message for a connection"""
        if connection_id in self.connections:
            self.connections[connection_id].record_message()
    
    def record_error(self, connection_id: str):
        """Record an error for a connection"""
        if connection_id in self.connections:
            self.connections[connection_id].record_error()
    
    def get_active_connections_count(self) -> int:
        """Get count of active connections"""
        return len(self.connections)
    
    def get_connections_by_user(self, user_id: int) -> List[WebSocketConnection]:
        """Get all connections for a specific user"""
        return [
            conn for conn in self.connections.values()
            if conn.user_id == user_id and conn.is_active
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
                "average_idle_time": 0
            }
        
        active_connections = [conn for conn in self.connections.values() if conn.is_active]
        unique_users = len(set(conn.user_id for conn in active_connections if conn.user_id))
        total_messages = sum(conn.message_count for conn in active_connections)
        total_errors = sum(conn.error_count for conn in active_connections)
        
        connection_durations = [conn.get_connection_duration() for conn in active_connections]
        idle_times = [conn.get_idle_time() for conn in active_connections]
        
        return {
            "total_connections": len(self.connections),
            "active_connections": len(active_connections),
            "unique_users": unique_users,
            "total_messages": total_messages,
            "total_errors": total_errors,
            "average_connection_duration": sum(connection_durations) / len(connection_durations) if connection_durations else 0,
            "average_idle_time": sum(idle_times) / len(idle_times) if idle_times else 0,
            "error_rate": (total_errors / total_messages * 100) if total_messages > 0 else 0
        }
    
    def get_connection_health(self) -> Dict[str, Any]:
        """Get WebSocket connection health status"""
        stats = self.get_connection_stats()
        
        # Determine health status
        health_status = "healthy"
        warnings = []
        
        # Check error rate
        if stats["error_rate"] > 5:
            health_status = "warning"
            warnings.append(f"High error rate: {stats['error_rate']:.1f}%")
        elif stats["error_rate"] > 10:
            health_status = "critical"
        
        # Check connection count
        if stats["active_connections"] > 1000:
            health_status = "warning"
            warnings.append(f"High connection count: {stats['active_connections']}")
        elif stats["active_connections"] > 2000:
            health_status = "critical"
        
        # Check average idle time
        if stats["average_idle_time"] > 300:  # 5 minutes
            health_status = "warning"
            warnings.append(f"High average idle time: {stats['average_idle_time']:.1f}s")
        
        return {
            "status": health_status,
            "timestamp": datetime.utcnow().isoformat(),
            "stats": stats,
            "warnings": warnings
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
            "metadata": connection.metadata
        }
        
        self.connection_history.append(history_entry)
        
        # Keep only the last N entries
        if len(self.connection_history) > self.max_history_size:
            self.connection_history = self.connection_history[-self.max_history_size:]
    
    async def run_continuous_monitoring(self, cleanup_interval: int = 300):
        """Run continuous WebSocket monitoring and cleanup"""
        logger.info(f"Starting continuous WebSocket monitoring (cleanup interval: {cleanup_interval}s)")
        
        while True:
            try:
                # Cleanup inactive connections
                removed = self.cleanup_inactive_connections()
                
                # Log stats periodically
                stats = self.get_connection_stats()
                logger.debug(f"WebSocket stats: {stats['active_connections']} active connections")
                
                await asyncio.sleep(cleanup_interval)
            except Exception as e:
                logger.error(f"Error in continuous WebSocket monitoring: {e}")
                await asyncio.sleep(60)  # Wait 1 minute before retrying

# Global WebSocket monitor instance
websocket_monitor = WebSocketMonitor()
