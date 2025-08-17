import pytest
import asyncio
import time
import json
from typing import List, Dict, Any
from unittest.mock import AsyncMock, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from core.websocket import manager
from models.user import User
from models.match import Match

class TestWebSocketPerformance:
    """Performance tests for WebSocket functionality"""
    
    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_connection_establishment_performance(self, benchmark, websocket_manager):
        """Test WebSocket connection establishment performance"""
        async def establish_connection():
            websocket = AsyncMock()
            user = MagicMock()
            user.id = 1
            
            await websocket_manager.connect(websocket, user.id, user)
            return websocket
        
        result = await benchmark(establish_connection)
        assert result is not None
    
    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_message_broadcasting_performance(self, benchmark, websocket_manager, active_matches_dataset):
        """Test message broadcasting performance to multiple users"""
        # Setup test users and connections
        test_users = []
        for i in range(10):
            websocket = AsyncMock()
            user = MagicMock()
            user.id = i + 1
            test_users.append((websocket, user))
            await websocket_manager.connect(websocket, user.id, user)
        
        # Join users to a test room
        room_id = "test_room"
        for _, user in test_users:
            await websocket_manager.join_room(user.id, room_id)
        
        async def broadcast_message():
            message = {
                "type": "chat_message",
                "message": "Test message",
                "timestamp": time.time()
            }
            await websocket_manager.broadcast_to_room(json.dumps(message), room_id)
        
        result = await benchmark(broadcast_message)
        assert result is not None
    
    @pytest.mark.asyncio
    async def test_concurrent_connections_performance(self, performance_test_config):
        """Test performance with multiple concurrent connections"""
        connection_times = []
        
        async def establish_single_connection(user_id: int):
            start_time = time.time()
            websocket = AsyncMock()
            user = MagicMock()
            user.id = user_id
            
            await manager.connect(websocket, user.id, user)
            end_time = time.time()
            return end_time - start_time
        
        # Test with different numbers of concurrent connections
        for num_connections in performance_test_config["concurrent_users"][:3]:  # Test with 10, 50, 100
            start_time = time.time()
            
            # Create concurrent connection tasks
            tasks = [
                establish_single_connection(i) 
                for i in range(num_connections)
            ]
            
            # Execute all connections concurrently
            connection_times_batch = await asyncio.gather(*tasks)
            end_time = time.time()
            
            total_time = end_time - start_time
            avg_connection_time = sum(connection_times_batch) / len(connection_times_batch)
            
            print(f"Concurrent connections: {num_connections}")
            print(f"Total time: {total_time:.3f}s")
            print(f"Average connection time: {avg_connection_time:.3f}s")
            print(f"Connections per second: {num_connections / total_time:.2f}")
            
            # Assertions for performance requirements
            assert total_time < performance_test_config["timeout_seconds"]
            assert avg_connection_time < 0.1  # Each connection should take less than 100ms
    
    @pytest.mark.asyncio
    async def test_message_latency_performance(self, websocket_manager, active_matches_dataset):
        """Test message latency performance"""
        # Setup test environment
        websocket = AsyncMock()
        user = MagicMock()
        user.id = 1
        await websocket_manager.connect(websocket, user.id, user)
        
        room_id = "test_room"
        await websocket_manager.join_room(user.id, room_id)
        
        latencies = []
        
        async def send_message_and_measure():
            start_time = time.time()
            message = {
                "type": "chat_message",
                "message": "Test message",
                "timestamp": start_time
            }
            
            await websocket_manager.broadcast_to_room(json.dumps(message), room_id)
            
            # Simulate message received
            end_time = time.time()
            latency = (end_time - start_time) * 1000  # Convert to milliseconds
            latencies.append(latency)
            return latency
        
        # Send multiple messages and measure latency
        for _ in range(100):
            await send_message_and_measure()
        
        avg_latency = sum(latencies) / len(latencies)
        max_latency = max(latencies)
        min_latency = min(latencies)
        
        print(f"Message latency statistics:")
        print(f"Average: {avg_latency:.2f}ms")
        print(f"Maximum: {max_latency:.2f}ms")
        print(f"Minimum: {min_latency:.2f}ms")
        
        # Assertions for performance requirements
        assert avg_latency < 100  # Average latency should be less than 100ms
        assert max_latency < 300  # Maximum latency should be less than 300ms
    
    @pytest.mark.asyncio
    async def test_typing_indicator_performance(self, websocket_manager):
        """Test typing indicator performance"""
        # Setup test users
        websocket1 = AsyncMock()
        websocket2 = AsyncMock()
        user1 = MagicMock()
        user1.id = 1
        user2 = MagicMock()
        user2.id = 2
        
        await websocket_manager.connect(websocket1, user1.id, user1)
        await websocket_manager.connect(websocket2, user2.id, user2)
        
        room_id = "test_room"
        await websocket_manager.join_room(user1.id, room_id)
        await websocket_manager.join_room(user2.id, room_id)
        
        typing_times = []
        
        async def send_typing_indicator():
            start_time = time.time()
            
            # Send typing start
            await websocket_manager.broadcast_to_room(
                json.dumps({"type": "typing_start", "user_id": user1.id}),
                room_id
            )
            
            # Simulate typing duration
            await asyncio.sleep(0.1)
            
            # Send typing stop
            await websocket_manager.broadcast_to_room(
                json.dumps({"type": "typing_stop", "user_id": user1.id}),
                room_id
            )
            
            end_time = time.time()
            typing_times.append(end_time - start_time)
        
        # Test typing indicators
        for _ in range(50):
            await send_typing_indicator()
        
        avg_typing_time = sum(typing_times) / len(typing_times)
        
        print(f"Typing indicator average time: {avg_typing_time:.3f}s")
        
        # Assertions
        assert avg_typing_time < 0.2  # Should be close to the sleep time (0.1s) plus overhead
    
    @pytest.mark.asyncio
    async def test_room_management_performance(self, websocket_manager):
        """Test room join/leave performance"""
        join_times = []
        leave_times = []
        
        async def test_room_operations():
            websocket = AsyncMock()
            user = MagicMock()
            user.id = 1
            
            await websocket_manager.connect(websocket, user.id, user)
            
            # Test join performance
            start_time = time.time()
            await websocket_manager.join_room(user.id, "test_room")
            join_time = time.time() - start_time
            join_times.append(join_time)
            
            # Test leave performance
            start_time = time.time()
            await websocket_manager.leave_room(user.id, "test_room")
            leave_time = time.time() - start_time
            leave_times.append(leave_time)
        
        # Test multiple room operations
        for _ in range(100):
            await test_room_operations()
        
        avg_join_time = sum(join_times) / len(join_times)
        avg_leave_time = sum(leave_times) / len(leave_times)
        
        print(f"Room join average time: {avg_join_time:.3f}s")
        print(f"Room leave average time: {avg_leave_time:.3f}s")
        
        # Assertions
        assert avg_join_time < 0.01  # Join should be very fast
        assert avg_leave_time < 0.01  # Leave should be very fast
    
    @pytest.mark.asyncio
    async def test_memory_usage_performance(self, websocket_manager):
        """Test memory usage with many connections"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Create many connections
        connections = []
        for i in range(100):
            websocket = AsyncMock()
            user = MagicMock()
            user.id = i
            await websocket_manager.connect(websocket, user.id, user)
            connections.append((websocket, user))
        
        # Measure memory after connections
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        print(f"Memory usage:")
        print(f"Initial: {initial_memory:.2f}MB")
        print(f"Final: {final_memory:.2f}MB")
        print(f"Increase: {memory_increase:.2f}MB")
        print(f"Per connection: {memory_increase / 100:.2f}MB")
        
        # Assertions
        assert memory_increase < 50  # Should not increase more than 50MB for 100 connections
        assert memory_increase / 100 < 1  # Each connection should use less than 1MB
    
    @pytest.mark.asyncio
    async def test_cleanup_performance(self, websocket_manager):
        """Test cleanup performance when disconnecting users"""
        disconnect_times = []
        
        async def test_disconnect():
            websocket = AsyncMock()
            user = MagicMock()
            user.id = 1
            
            await websocket_manager.connect(websocket, user.id, user)
            await websocket_manager.join_room(user.id, "test_room")
            
            start_time = time.time()
            websocket_manager.disconnect(user.id)
            disconnect_time = time.time() - start_time
            disconnect_times.append(disconnect_time)
        
        # Test multiple disconnections
        for _ in range(100):
            await test_disconnect()
        
        avg_disconnect_time = sum(disconnect_times) / len(disconnect_times)
        
        print(f"Disconnect average time: {avg_disconnect_time:.3f}s")
        
        # Assertions
        assert avg_disconnect_time < 0.01  # Disconnect should be very fast
