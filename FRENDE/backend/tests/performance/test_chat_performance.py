import pytest
import asyncio
import time
import json
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime, timedelta

from models.chat import ChatMessage, ChatRoom
from models.match import Match
from models.user import User
from core.websocket import manager

class TestChatPerformance:
    """Performance tests for chat system"""
    
    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_message_persistence_performance(self, benchmark, performance_session, active_matches_dataset):
        """Test message persistence performance"""
        match = active_matches_dataset[0]
        
        async def persist_message():
            message = ChatMessage(
                match_id=match.id,
                sender_id=match.user1_id,
                message_text="Test message for performance testing",
                message_type="text",
                created_at=datetime.utcnow()
            )
            performance_session.add(message)
            await performance_session.commit()
            await performance_session.refresh(message)
            return message
        
        result = await benchmark(persist_message)
        assert result is not None
        assert result.id is not None
    
    @pytest.mark.asyncio
    async def test_bulk_message_persistence_performance(self, performance_session, active_matches_dataset):
        """Test bulk message persistence performance"""
        match = active_matches_dataset[0]
        batch_sizes = [10, 50, 100, 500]
        
        for batch_size in batch_sizes:
            start_time = time.time()
            
            # Create batch of messages
            messages = []
            for i in range(batch_size):
                message = ChatMessage(
                    match_id=match.id,
                    sender_id=match.user1_id if i % 2 == 0 else match.user2_id,
                    message_text=f"Test message {i} for bulk performance testing",
                    message_type="text",
                    created_at=datetime.utcnow() - timedelta(minutes=i)
                )
                messages.append(message)
            
            # Bulk insert
            performance_session.add_all(messages)
            await performance_session.commit()
            
            end_time = time.time()
            persistence_time = end_time - start_time
            messages_per_second = batch_size / persistence_time
            
            print(f"Bulk message persistence ({batch_size} messages):")
            print(f"Time: {persistence_time:.3f}s")
            print(f"Messages per second: {messages_per_second:.2f}")
            
            # Assertions
            assert persistence_time < 10  # Should complete in under 10 seconds
            assert messages_per_second > 10  # Should handle at least 10 messages per second
    
    @pytest.mark.asyncio
    async def test_chat_history_loading_performance(self, performance_session, chat_messages_dataset):
        """Test chat history loading performance with pagination"""
        match = chat_messages_dataset[0].match_id
        page_sizes = [10, 25, 50, 100]
        
        for page_size in page_sizes:
            start_time = time.time()
            
            # Load chat history with pagination
            result = await performance_session.execute(
                select(ChatMessage)
                .where(ChatMessage.match_id == match)
                .order_by(ChatMessage.created_at.desc())
                .limit(page_size)
            )
            messages = result.scalars().all()
            
            end_time = time.time()
            loading_time = end_time - start_time
            
            print(f"Chat history loading ({page_size} messages):")
            print(f"Time: {loading_time:.3f}s")
            print(f"Messages loaded: {len(messages)}")
            
            # Assertions
            assert loading_time < 1  # Should load in under 1 second
            assert len(messages) <= page_size
    
    @pytest.mark.asyncio
    async def test_message_search_performance(self, performance_session, chat_messages_dataset):
        """Test message search performance"""
        match = chat_messages_dataset[0].match_id
        
        # Add some messages with specific text for searching
        search_messages = []
        for i in range(50):
            message = ChatMessage(
                match_id=match,
                sender_id=chat_messages_dataset[0].sender_id,
                message_text=f"Important message {i} with keyword search",
                message_type="text",
                created_at=datetime.utcnow() - timedelta(minutes=i)
            )
            search_messages.append(message)
        
        performance_session.add_all(search_messages)
        await performance_session.commit()
        
        # Test search performance
        start_time = time.time()
        
        result = await performance_session.execute(
            select(ChatMessage)
            .where(
                ChatMessage.match_id == match,
                ChatMessage.message_text.contains("keyword")
            )
            .order_by(ChatMessage.created_at.desc())
        )
        found_messages = result.scalars().all()
        
        end_time = time.time()
        search_time = end_time - start_time
        
        print(f"Message search performance:")
        print(f"Search time: {search_time:.3f}s")
        print(f"Messages found: {len(found_messages)}")
        
        # Assertions
        assert search_time < 1  # Should search in under 1 second
        assert len(found_messages) >= 50  # Should find all messages with keyword
    
    @pytest.mark.asyncio
    async def test_concurrent_message_sending_performance(self, performance_session, active_matches_dataset):
        """Test concurrent message sending performance"""
        match = active_matches_dataset[0]
        concurrent_levels = [10, 25, 50, 100]
        
        async def send_message(message_id: int):
            start_time = time.time()
            
            message = ChatMessage(
                match_id=match.id,
                sender_id=match.user1_id if message_id % 2 == 0 else match.user2_id,
                message_text=f"Concurrent message {message_id}",
                message_type="text",
                created_at=datetime.utcnow()
            )
            
            performance_session.add(message)
            await performance_session.commit()
            await performance_session.refresh(message)
            
            end_time = time.time()
            return end_time - start_time
        
        for num_concurrent in concurrent_levels:
            start_time = time.time()
            
            # Create concurrent message sending tasks
            tasks = [send_message(i) for i in range(num_concurrent)]
            
            # Execute all tasks concurrently
            send_times = await asyncio.gather(*tasks)
            total_time = time.time() - start_time
            
            avg_send_time = sum(send_times) / len(send_times)
            messages_per_second = num_concurrent / total_time
            
            print(f"Concurrent message sending ({num_concurrent}):")
            print(f"Total time: {total_time:.3f}s")
            print(f"Average send time: {avg_send_time:.3f}s")
            print(f"Messages per second: {messages_per_second:.2f}")
            
            # Assertions
            assert total_time < 30  # Should complete in reasonable time
            assert messages_per_second > 1  # Should handle at least 1 message per second
    
    @pytest.mark.asyncio
    async def test_real_time_message_broadcasting_performance(self, websocket_manager, active_matches_dataset):
        """Test real-time message broadcasting performance"""
        # Setup test environment
        test_users = []
        for i in range(10):
            websocket = AsyncMock()
            user = MagicMock()
            user.id = i + 1
            test_users.append((websocket, user))
            await websocket_manager.connect(websocket, user.id, user)
        
        room_id = "test_chat_room"
        for _, user in test_users:
            await websocket_manager.join_room(user.id, room_id)
        
        broadcast_times = []
        
        async def broadcast_message():
            start_time = time.time()
            
            message = {
                "type": "chat_message",
                "message": "Real-time test message",
                "sender_id": 1,
                "timestamp": time.time()
            }
            
            await websocket_manager.broadcast_to_room(json.dumps(message), room_id)
            
            end_time = time.time()
            return end_time - start_time
        
        # Test broadcasting performance
        for _ in range(100):
            broadcast_time = await broadcast_message()
            broadcast_times.append(broadcast_time)
        
        avg_broadcast_time = sum(broadcast_times) / len(broadcast_times)
        max_broadcast_time = max(broadcast_times)
        broadcasts_per_second = 100 / sum(broadcast_times)
        
        print(f"Real-time message broadcasting performance:")
        print(f"Average broadcast time: {avg_broadcast_time:.3f}s")
        print(f"Maximum broadcast time: {max_broadcast_time:.3f}s")
        print(f"Broadcasts per second: {broadcasts_per_second:.2f}")
        
        # Assertions
        assert avg_broadcast_time < 0.1  # Average should be under 100ms
        assert max_broadcast_time < 0.5  # Maximum should be under 500ms
        assert broadcasts_per_second > 10  # Should handle at least 10 broadcasts per second
    
    @pytest.mark.asyncio
    async def test_chat_room_management_performance(self, websocket_manager):
        """Test chat room management performance"""
        room_operation_times = []
        
        async def test_room_operations():
            # Create test users
            websocket = AsyncMock()
            user = MagicMock()
            user.id = 1
            
            await websocket_manager.connect(websocket, user.id, user)
            
            # Test room join
            start_time = time.time()
            await websocket_manager.join_room(user.id, "test_room")
            join_time = time.time() - start_time
            
            # Test room leave
            start_time = time.time()
            await websocket_manager.leave_room(user.id, "test_room")
            leave_time = time.time() - start_time
            
            return join_time, leave_time
        
        # Test multiple room operations
        for _ in range(100):
            join_time, leave_time = await test_room_operations()
            room_operation_times.append((join_time, leave_time))
        
        avg_join_time = sum(join for join, _ in room_operation_times) / len(room_operation_times)
        avg_leave_time = sum(leave for _, leave in room_operation_times) / len(room_operation_times)
        
        print(f"Chat room management performance:")
        print(f"Average join time: {avg_join_time:.3f}s")
        print(f"Average leave time: {avg_leave_time:.3f}s")
        
        # Assertions
        assert avg_join_time < 0.01  # Join should be very fast
        assert avg_leave_time < 0.01  # Leave should be very fast
    
    @pytest.mark.asyncio
    async def test_message_retrieval_performance(self, performance_session, chat_messages_dataset):
        """Test message retrieval performance with different query patterns"""
        match = chat_messages_dataset[0].match_id
        
        # Test different retrieval patterns
        retrieval_patterns = [
            ("Recent messages", 
             select(ChatMessage)
             .where(ChatMessage.match_id == match)
             .order_by(ChatMessage.created_at.desc())
             .limit(50)),
            
            ("Messages by sender", 
             select(ChatMessage)
             .where(ChatMessage.match_id == match, ChatMessage.sender_id == chat_messages_dataset[0].sender_id)
             .order_by(ChatMessage.created_at.desc())),
            
            ("Messages by type", 
             select(ChatMessage)
             .where(ChatMessage.match_id == match, ChatMessage.message_type == "text")
             .order_by(ChatMessage.created_at.desc())),
            
            ("Messages in time range", 
             select(ChatMessage)
             .where(
                 ChatMessage.match_id == match,
                 ChatMessage.created_at >= datetime.utcnow() - timedelta(hours=1)
             )
             .order_by(ChatMessage.created_at.desc()))
        ]
        
        for pattern_name, query in retrieval_patterns:
            start_time = time.time()
            
            result = await performance_session.execute(query)
            messages = result.scalars().all()
            
            end_time = time.time()
            retrieval_time = end_time - start_time
            
            print(f"Message retrieval - {pattern_name}:")
            print(f"Time: {retrieval_time:.3f}s")
            print(f"Messages retrieved: {len(messages)}")
            
            # Assertions
            assert retrieval_time < 1  # Should retrieve in under 1 second
    
    @pytest.mark.asyncio
    async def test_chat_statistics_performance(self, performance_session, chat_messages_dataset):
        """Test chat statistics calculation performance"""
        match = chat_messages_dataset[0].match_id
        
        # Test different statistics calculations
        start_time = time.time()
        
        # Message count
        result = await performance_session.execute(
            select(func.count(ChatMessage.id))
            .where(ChatMessage.match_id == match)
        )
        message_count = result.scalar()
        
        # Messages per sender
        result = await performance_session.execute(
            select(ChatMessage.sender_id, func.count(ChatMessage.id))
            .where(ChatMessage.match_id == match)
            .group_by(ChatMessage.sender_id)
        )
        messages_per_sender = result.all()
        
        # Average message length
        result = await performance_session.execute(
            select(func.avg(func.length(ChatMessage.message_text)))
            .where(ChatMessage.match_id == match)
        )
        avg_message_length = result.scalar()
        
        end_time = time.time()
        stats_time = end_time - start_time
        
        print(f"Chat statistics calculation:")
        print(f"Time: {stats_time:.3f}s")
        print(f"Total messages: {message_count}")
        print(f"Messages per sender: {messages_per_sender}")
        print(f"Average message length: {avg_message_length:.2f}")
        
        # Assertions
        assert stats_time < 1  # Should calculate statistics in under 1 second
        assert message_count > 0  # Should have messages
    
    @pytest.mark.asyncio
    async def test_memory_usage_chat_system(self, performance_session, chat_messages_dataset):
        """Test memory usage of chat system with large message datasets"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Load large message dataset
        match = chat_messages_dataset[0].match_id
        
        result = await performance_session.execute(
            select(ChatMessage)
            .where(ChatMessage.match_id == match)
            .order_by(ChatMessage.created_at.desc())
            .limit(1000)
        )
        messages = result.scalars().all()
        
        # Process messages (simulate chat display)
        message_data = []
        for message in messages:
            message_data.append({
                "id": message.id,
                "text": message.message_text,
                "sender_id": message.sender_id,
                "timestamp": message.created_at.isoformat()
            })
        
        # Measure memory after operations
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        print(f"Chat system memory usage:")
        print(f"Initial memory: {initial_memory:.2f}MB")
        print(f"Final memory: {final_memory:.2f}MB")
        print(f"Memory increase: {memory_increase:.2f}MB")
        print(f"Messages loaded: {len(messages)}")
        print(f"Message data size: {len(message_data)}")
        
        # Assertions
        assert memory_increase < 100  # Should not increase more than 100MB
        assert len(messages) > 0  # Should have loaded messages
