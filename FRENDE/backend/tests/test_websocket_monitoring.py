"""
Tests for WebSocket monitoring functionality
"""

import pytest
import asyncio
import time
from datetime import datetime, timedelta
from unittest.mock import Mock, patch, AsyncMock

from core.websocket_monitor import (
    WebSocketMonitor, 
    WebSocketConnection, 
    ConnectionQualityMetrics,
    websocket_monitor
)
from core.websocket import ConnectionManager, manager


class TestConnectionQualityMetrics:
    """Test ConnectionQualityMetrics class"""
    
    def test_initialization(self):
        """Test ConnectionQualityMetrics initialization"""
        metrics = ConnectionQualityMetrics()
        
        assert len(metrics.ping_times) == 0
        assert len(metrics.message_latencies) == 0
        assert metrics.error_count == 0
        assert metrics.reconnection_count == 0
        assert metrics.connection_stability_score == 100.0
        assert metrics.bandwidth_usage == 0
        assert len(metrics.message_sizes) == 0
    
    def test_record_ping(self):
        """Test recording ping times"""
        metrics = ConnectionQualityMetrics()
        
        metrics.record_ping(50.0)
        metrics.record_ping(75.0)
        
        assert len(metrics.ping_times) == 2
        assert metrics.ping_times[0] == 50.0
        assert metrics.ping_times[1] == 75.0
        assert metrics.last_ping_time is not None
    
    def test_record_pong(self):
        """Test recording pong responses"""
        metrics = ConnectionQualityMetrics()
        
        metrics.record_pong()
        
        assert metrics.last_pong_time is not None
    
    def test_record_message_latency(self):
        """Test recording message latencies"""
        metrics = ConnectionQualityMetrics()
        
        metrics.record_message_latency(100.0)
        metrics.record_message_latency(150.0)
        
        assert len(metrics.message_latencies) == 2
        assert metrics.message_latencies[0] == 100.0
        assert metrics.message_latencies[1] == 150.0
    
    def test_record_error(self):
        """Test recording errors"""
        metrics = ConnectionQualityMetrics()
        
        metrics.record_error()
        metrics.record_error()
        
        assert metrics.error_count == 2
        assert metrics.connection_stability_score < 100.0
    
    def test_record_reconnection(self):
        """Test recording reconnections"""
        metrics = ConnectionQualityMetrics()
        
        metrics.record_reconnection()
        
        assert metrics.reconnection_count == 1
        assert metrics.connection_stability_score < 100.0
    
    def test_record_bandwidth(self):
        """Test recording bandwidth usage"""
        metrics = ConnectionQualityMetrics()
        
        metrics.record_bandwidth(1000, 500)
        metrics.record_bandwidth(2000, 1000)
        
        assert metrics.bandwidth_usage == 4500  # 1000+500+2000+1000
    
    def test_record_message_size(self):
        """Test recording message sizes"""
        metrics = ConnectionQualityMetrics()
        
        metrics.record_message_size(100)
        metrics.record_message_size(200)
        
        assert len(metrics.message_sizes) == 2
        assert metrics.message_sizes[0] == 100
        assert metrics.message_sizes[1] == 200
    
    def test_get_quality_score_excellent(self):
        """Test quality score calculation for excellent connection"""
        metrics = ConnectionQualityMetrics()
        
        # Add excellent metrics
        metrics.record_ping(50.0)
        metrics.record_message_latency(100.0)
        
        score = metrics.get_quality_score()
        assert score >= 90.0
    
    def test_get_quality_score_poor(self):
        """Test quality score calculation for poor connection"""
        metrics = ConnectionQualityMetrics()
        
        # Add poor metrics
        metrics.record_ping(2000.0)  # Very high ping
        metrics.record_message_latency(3000.0)  # Very high latency
        metrics.record_error()
        metrics.record_error()
        metrics.record_error()
        
        score = metrics.get_quality_score()
        assert score < 50.0
    
    def test_get_metrics_summary(self):
        """Test getting metrics summary"""
        metrics = ConnectionQualityMetrics()
        
        metrics.record_ping(100.0)
        metrics.record_message_latency(200.0)
        metrics.record_error()
        metrics.record_bandwidth(1000, 500)
        metrics.record_message_size(150)
        
        summary = metrics.get_metrics_summary()
        
        assert "quality_score" in summary
        assert "avg_ping_time" in summary
        assert "avg_latency" in summary
        assert "error_count" in summary
        assert "reconnection_count" in summary
        assert "bandwidth_usage" in summary
        assert "avg_message_size" in summary
        assert "stability_score" in summary


class TestWebSocketConnection:
    """Test WebSocketConnection class"""
    
    def test_initialization(self):
        """Test WebSocketConnection initialization"""
        conn = WebSocketConnection("test_conn_1", user_id=123)
        
        assert conn.connection_id == "test_conn_1"
        assert conn.user_id == 123
        assert conn.is_active is True
        assert conn.message_count == 0
        assert conn.error_count == 0
        assert isinstance(conn.quality_metrics, ConnectionQualityMetrics)
        assert len(conn.room_ids) == 0
        assert conn.connection_type == "standard"
    
    def test_update_activity(self):
        """Test updating activity timestamp"""
        conn = WebSocketConnection("test_conn_2")
        
        old_activity = conn.last_activity
        time.sleep(0.1)  # Small delay
        conn.update_activity()
        
        assert conn.last_activity > old_activity
    
    def test_record_message(self):
        """Test recording messages"""
        conn = WebSocketConnection("test_conn_3")
        
        conn.record_message(100)
        conn.record_message(200)
        
        assert conn.message_count == 2
        assert len(conn.quality_metrics.message_sizes) == 2
        assert conn.quality_metrics.message_sizes[0] == 100
        assert conn.quality_metrics.message_sizes[1] == 200
    
    def test_record_error(self):
        """Test recording errors"""
        conn = WebSocketConnection("test_conn_4")
        
        conn.record_error()
        conn.record_error()
        
        assert conn.error_count == 2
        assert conn.quality_metrics.error_count == 2
    
    def test_record_ping_pong(self):
        """Test recording ping and pong"""
        conn = WebSocketConnection("test_conn_5")
        
        conn.record_ping(50.0)
        conn.record_pong()
        
        assert len(conn.quality_metrics.ping_times) == 1
        assert conn.quality_metrics.ping_times[0] == 50.0
        assert conn.quality_metrics.last_pong_time is not None
    
    def test_record_bandwidth(self):
        """Test recording bandwidth usage"""
        conn = WebSocketConnection("test_conn_6")
        
        conn.record_bandwidth(1000, 500)
        
        assert conn.quality_metrics.bandwidth_usage == 1500
    
    def test_record_reconnection(self):
        """Test recording reconnection"""
        conn = WebSocketConnection("test_conn_7")
        
        conn.record_reconnection()
        
        assert conn.quality_metrics.reconnection_count == 1
    
    def test_add_remove_room(self):
        """Test adding and removing rooms"""
        conn = WebSocketConnection("test_conn_8")
        
        conn.add_room("room_1")
        conn.add_room("room_2")
        
        assert "room_1" in conn.room_ids
        assert "room_2" in conn.room_ids
        assert len(conn.room_ids) == 2
        
        conn.remove_room("room_1")
        
        assert "room_1" not in conn.room_ids
        assert "room_2" in conn.room_ids
        assert len(conn.room_ids) == 1
    
    def test_update_heartbeat(self):
        """Test updating heartbeat"""
        conn = WebSocketConnection("test_conn_9")
        
        old_heartbeat = conn.last_heartbeat
        time.sleep(0.1)  # Small delay
        conn.update_heartbeat()
        
        assert conn.last_heartbeat > old_heartbeat
    
    def test_is_heartbeat_healthy(self):
        """Test heartbeat health check"""
        conn = WebSocketConnection("test_conn_10")
        
        # Should be healthy initially
        assert conn.is_heartbeat_healthy() is True
        
        # Simulate old heartbeat
        conn.last_heartbeat = datetime.utcnow() - timedelta(seconds=100)
        
        assert conn.is_heartbeat_healthy() is False
    
    def test_disconnect(self):
        """Test disconnecting"""
        conn = WebSocketConnection("test_conn_11")
        
        assert conn.is_active is True
        conn.disconnect()
        assert conn.is_active is False
    
    def test_get_connection_duration(self):
        """Test getting connection duration"""
        conn = WebSocketConnection("test_conn_12")
        
        duration = conn.get_connection_duration()
        assert duration >= 0
    
    def test_get_idle_time(self):
        """Test getting idle time"""
        conn = WebSocketConnection("test_conn_13")
        
        idle_time = conn.get_idle_time()
        assert idle_time >= 0
    
    def test_get_quality_score(self):
        """Test getting quality score"""
        conn = WebSocketConnection("test_conn_14")
        
        score = conn.get_quality_score()
        assert 0 <= score <= 100
    
    def test_get_quality_metrics(self):
        """Test getting quality metrics"""
        conn = WebSocketConnection("test_conn_15")
        
        metrics = conn.get_quality_metrics()
        assert isinstance(metrics, dict)
        assert "quality_score" in metrics


class TestWebSocketMonitor:
    """Test WebSocketMonitor class"""
    
    def setup_method(self):
        """Setup method for each test"""
        self.monitor = WebSocketMonitor()
        # Clear any existing connections
        self.monitor.connections.clear()
        self.monitor.connection_history.clear()
    
    def test_initialization(self):
        """Test WebSocketMonitor initialization"""
        assert len(self.monitor.connections) == 0
        assert len(self.monitor.connection_history) == 0
        assert self.monitor.monitoring_enabled is True
        assert self.monitor.max_history_size == 1000
    
    def test_add_connection(self):
        """Test adding a connection"""
        conn = self.monitor.add_connection("test_conn_1", user_id=123)
        
        assert "test_conn_1" in self.monitor.connections
        assert self.monitor.connections["test_conn_1"] == conn
        assert conn.user_id == 123
        assert conn.is_active is True
    
    def test_add_connection_with_metadata(self):
        """Test adding a connection with metadata"""
        metadata = {"type": "chat", "room": "test_room"}
        conn = self.monitor.add_connection("test_conn_2", user_id=456, metadata=metadata)
        
        assert conn.metadata == metadata
    
    def test_remove_connection(self):
        """Test removing a connection"""
        conn = self.monitor.add_connection("test_conn_3", user_id=789)
        
        removed_conn = self.monitor.remove_connection("test_conn_3")
        
        assert "test_conn_3" not in self.monitor.connections
        assert removed_conn == conn
        assert removed_conn.is_active is False
        assert len(self.monitor.connection_history) == 1
    
    def test_remove_nonexistent_connection(self):
        """Test removing a non-existent connection"""
        removed_conn = self.monitor.remove_connection("nonexistent")
        
        assert removed_conn is None
    
    def test_get_connection(self):
        """Test getting a connection"""
        conn = self.monitor.add_connection("test_conn_4", user_id=123)
        
        retrieved_conn = self.monitor.get_connection("test_conn_4")
        
        assert retrieved_conn == conn
    
    def test_get_nonexistent_connection(self):
        """Test getting a non-existent connection"""
        conn = self.monitor.get_connection("nonexistent")
        
        assert conn is None
    
    def test_record_message(self):
        """Test recording a message"""
        conn = self.monitor.add_connection("test_conn_5", user_id=123)
        
        self.monitor.record_message("test_conn_5")
        
        assert conn.message_count == 1
    
    def test_record_error(self):
        """Test recording an error"""
        conn = self.monitor.add_connection("test_conn_6", user_id=123)
        
        self.monitor.record_error("test_conn_6")
        
        assert conn.error_count == 1
    
    def test_record_ping_pong(self):
        """Test recording ping and pong"""
        conn = self.monitor.add_connection("test_conn_7", user_id=123)
        
        self.monitor.record_ping("test_conn_7", 50.0)
        self.monitor.record_pong("test_conn_7")
        
        assert len(conn.quality_metrics.ping_times) == 1
        assert conn.quality_metrics.ping_times[0] == 50.0
        assert conn.quality_metrics.last_pong_time is not None
    
    def test_record_bandwidth(self):
        """Test recording bandwidth usage"""
        conn = self.monitor.add_connection("test_conn_8", user_id=123)
        
        self.monitor.record_bandwidth("test_conn_8", 1000, 500)
        
        assert conn.quality_metrics.bandwidth_usage == 1500
    
    def test_get_active_connections_count(self):
        """Test getting active connections count"""
        self.monitor.add_connection("test_conn_9", user_id=123)
        self.monitor.add_connection("test_conn_10", user_id=456)
        
        count = self.monitor.get_active_connections_count()
        
        assert count == 2
    
    def test_get_connections_by_user(self):
        """Test getting connections by user"""
        self.monitor.add_connection("test_conn_11", user_id=123)
        self.monitor.add_connection("test_conn_12", user_id=123)
        self.monitor.add_connection("test_conn_13", user_id=456)
        
        user_connections = self.monitor.get_connections_by_user(123)
        
        assert len(user_connections) == 2
        assert all(conn.user_id == 123 for conn in user_connections)
    
    def test_get_connections_by_room(self):
        """Test getting connections by room"""
        conn1 = self.monitor.add_connection("test_conn_14", user_id=123)
        conn2 = self.monitor.add_connection("test_conn_15", user_id=456)
        
        conn1.add_room("room_1")
        conn2.add_room("room_1")
        conn2.add_room("room_2")
        
        room_connections = self.monitor.get_connections_by_room("room_1")
        
        assert len(room_connections) == 2
        assert all("room_1" in conn.room_ids for conn in room_connections)
    
    def test_get_connection_stats_empty(self):
        """Test getting connection stats when no connections"""
        stats = self.monitor.get_connection_stats()
        
        assert stats["total_connections"] == 0
        assert stats["active_connections"] == 0
        assert stats["unique_users"] == 0
        assert stats["total_messages"] == 0
        assert stats["total_errors"] == 0
        assert stats["average_connection_duration"] == 0
        assert stats["average_idle_time"] == 0
        assert stats["average_quality_score"] == 100.0
        assert stats["error_rate"] == 0
    
    def test_get_connection_stats_with_connections(self):
        """Test getting connection stats with connections"""
        conn1 = self.monitor.add_connection("test_conn_16", user_id=123)
        conn2 = self.monitor.add_connection("test_conn_17", user_id=456)
        
        # Add some activity
        conn1.record_message(100)
        conn1.record_message(200)
        conn2.record_message(150)
        conn2.record_error()
        
        stats = self.monitor.get_connection_stats()
        
        assert stats["total_connections"] == 2
        assert stats["active_connections"] == 2
        assert stats["unique_users"] == 2
        assert stats["total_messages"] == 3
        assert stats["total_errors"] == 1
        assert stats["error_rate"] > 0
    
    def test_get_connection_health_healthy(self):
        """Test getting connection health when healthy"""
        self.monitor.add_connection("test_conn_18", user_id=123)
        
        health = self.monitor.get_connection_health()
        
        assert health["status"] == "healthy"
        assert "timestamp" in health
        assert "stats" in health
        assert "warnings" in health
        assert "critical_issues" in health
        assert "thresholds" in health
    
    def test_get_connection_health_warning(self):
        """Test getting connection health when warning"""
        # Add many connections to trigger warning
        for i in range(1700):  # Above warning threshold
            self.monitor.add_connection(f"test_conn_{i}", user_id=i)
        
        health = self.monitor.get_connection_health()
        
        assert health["status"] == "warning"
        assert len(health["warnings"]) > 0
    
    def test_get_connection_health_critical(self):
        """Test getting connection health when critical"""
        # Add many connections to trigger critical
        for i in range(2100):  # Above critical threshold
            self.monitor.add_connection(f"test_conn_{i}", user_id=i)
        
        health = self.monitor.get_connection_health()
        
        assert health["status"] == "critical"
        assert len(health["critical_issues"]) > 0
    
    def test_get_quality_distribution(self):
        """Test getting quality distribution"""
        conn1 = self.monitor.add_connection("test_conn_19", user_id=123)
        conn2 = self.monitor.add_connection("test_conn_20", user_id=456)
        
        # Add some quality metrics
        conn1.quality_metrics.record_ping(50.0)  # Excellent
        conn2.quality_metrics.record_ping(2000.0)  # Poor
        conn2.quality_metrics.record_error()
        
        distribution = self.monitor.get_quality_distribution()
        
        assert "excellent" in distribution
        assert "good" in distribution
        assert "fair" in distribution
        assert "poor" in distribution
    
    def test_get_performance_analytics(self):
        """Test getting performance analytics"""
        conn = self.monitor.add_connection("test_conn_21", user_id=123)
        
        # Add some activity
        conn.quality_metrics.record_bandwidth(1000, 500)
        conn.quality_metrics.record_message_size(150)
        conn.add_room("room_1")
        
        analytics = self.monitor.get_performance_analytics(hours=1)
        
        assert analytics["period_hours"] == 1
        assert analytics["total_connections"] == 1
        assert analytics["total_bandwidth_bytes"] == 1500
        assert "quality_distribution" in analytics
        assert "room_activity" in analytics
        assert "error_patterns" in analytics
    
    def test_cleanup_inactive_connections(self):
        """Test cleaning up inactive connections"""
        conn = self.monitor.add_connection("test_conn_22", user_id=123)
        
        # Make connection inactive by setting old last_activity
        conn.last_activity = datetime.utcnow() - timedelta(hours=2)
        
        removed_count = self.monitor.cleanup_inactive_connections(max_idle_time=3600)
        
        assert removed_count == 1
        assert "test_conn_22" not in self.monitor.connections
    
    def test_cleanup_unhealthy_connections(self):
        """Test cleaning up unhealthy connections"""
        conn = self.monitor.add_connection("test_conn_23", user_id=123)
        
        # Make connection unhealthy by adding many errors
        for _ in range(10):
            conn.quality_metrics.record_error()
        
        removed_count = self.monitor.cleanup_unhealthy_connections(min_quality_score=50.0)
        
        assert removed_count == 1
        assert "test_conn_23" not in self.monitor.connections
    
    def test_get_connection_history(self):
        """Test getting connection history"""
        conn = self.monitor.add_connection("test_conn_24", user_id=123)
        self.monitor.remove_connection("test_conn_24")
        
        history = self.monitor.get_connection_history(hours=24)
        
        assert len(history) == 1
        assert history[0]["connection_id"] == "test_conn_24"
        assert history[0]["user_id"] == 123
    
    def test_monitoring_disabled(self):
        """Test behavior when monitoring is disabled"""
        self.monitor.monitoring_enabled = False
        
        removed_count = self.monitor.cleanup_inactive_connections()
        
        assert removed_count == 0


class TestWebSocketIntegration:
    """Integration tests for WebSocket monitoring"""
    
    @pytest.mark.asyncio
    async def test_websocket_monitor_integration(self):
        """Test integration between WebSocket monitor and connection manager"""
        # Clear global monitor
        websocket_monitor.connections.clear()
        websocket_monitor.connection_history.clear()
        
        # Add connections through monitor
        conn1 = websocket_monitor.add_connection("test_integration_1", user_id=123)
        conn2 = websocket_monitor.add_connection("test_integration_2", user_id=456)
        
        # Record some activity
        websocket_monitor.record_message("test_integration_1", 100)
        websocket_monitor.record_ping("test_integration_1", 50.0)
        websocket_monitor.record_error("test_integration_2")
        
        # Check stats
        stats = websocket_monitor.get_connection_stats()
        assert stats["total_connections"] == 2
        assert stats["total_messages"] == 1
        assert stats["total_errors"] == 1
        
        # Check health
        health = websocket_monitor.get_connection_health()
        assert health["status"] == "healthy"
        
        # Cleanup
        websocket_monitor.remove_connection("test_integration_1")
        websocket_monitor.remove_connection("test_integration_2")
    
    def test_connection_manager_integration(self):
        """Test integration between connection manager and monitoring"""
        # Clear global manager
        manager.active_connections.clear()
        manager.user_sessions.clear()
        manager.room_connections.clear()
        manager.typing_users.clear()
        manager.connection_quality.clear()
        manager.message_tracking.clear()
        
        # Test that manager can track performance
        performance = manager.get_performance_summary()
        assert performance["total_connections"] == 0
        assert performance["total_messages"] == 0
        assert performance["total_errors"] == 0


if __name__ == "__main__":
    pytest.main([__file__])
