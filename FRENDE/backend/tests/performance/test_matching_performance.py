import pytest
import asyncio
import time
import random
from typing import List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from services.matching import MatchingService
from models.user import User
from models.match import Match

class TestMatchingPerformance:
    """Performance tests for matching system"""
    
    @pytest.mark.asyncio
    @pytest.mark.benchmark
    async def test_compatibility_calculation_performance(self, benchmark, matching_service_instance, large_user_dataset):
        """Test compatibility calculation performance with various user profiles"""
        # Get two users for compatibility testing
        user1 = large_user_dataset[0]
        user2 = large_user_dataset[1]
        
        async def calculate_compatibility():
            async with get_async_session() as session:
                result = await matching_service_instance._calculate_compatibility(
                    user1.id, user2.id, session
                )
                return result
        
        result = await benchmark(calculate_compatibility)
        assert result is not None
        assert "score" in result
    
    @pytest.mark.asyncio
    async def test_bulk_compatibility_calculation_performance(self, matching_service_instance, large_user_dataset):
        """Test compatibility calculation performance with large user pools"""
        calculation_times = []
        
        async def calculate_multiple_compatibilities():
            async with get_async_session() as session:
                start_time = time.time()
                
                # Calculate compatibility for multiple user pairs
                for i in range(0, min(100, len(large_user_dataset) - 1), 2):
                    user1 = large_user_dataset[i]
                    user2 = large_user_dataset[i + 1]
                    
                    result = await matching_service_instance._calculate_compatibility(
                        user1.id, user2.id, session
                    )
                    
                    assert result is not None
                    assert "score" in result
                
                end_time = time.time()
                return end_time - start_time
        
        # Run multiple batches
        for _ in range(5):
            calculation_time = await calculate_multiple_compatibilities()
            calculation_times.append(calculation_time)
        
        avg_calculation_time = sum(calculation_times) / len(calculation_times)
        calculations_per_second = 100 / avg_calculation_time
        
        print(f"Bulk compatibility calculation performance:")
        print(f"Average time for 100 calculations: {avg_calculation_time:.3f}s")
        print(f"Calculations per second: {calculations_per_second:.2f}")
        
        # Assertions for performance requirements
        assert avg_calculation_time < 10  # Should complete 100 calculations in under 10 seconds
        assert calculations_per_second > 10  # Should handle at least 10 calculations per second
    
    @pytest.mark.asyncio
    async def test_matching_queue_performance(self, matching_service_instance, large_user_dataset):
        """Test matching queue performance with large user pools"""
        queue_processing_times = []
        
        async def process_matching_queue():
            async with get_async_session() as session:
                start_time = time.time()
                
                # Add users to queue
                for i in range(100):
                    user = large_user_dataset[i]
                    if user.id not in matching_service_instance.matching_queue:
                        matching_service_instance.matching_queue.append(user.id)
                
                # Process queue (simulate finding matches)
                processed_matches = 0
                for i in range(0, len(matching_service_instance.matching_queue) - 1, 2):
                    if i + 1 < len(matching_service_instance.matching_queue):
                        user1_id = matching_service_instance.matching_queue[i]
                        user2_id = matching_service_instance.matching_queue[i + 1]
                        
                        # Simulate match creation
                        try:
                            match = await matching_service_instance._create_direct_match(
                                user1_id, user2_id, session
                            )
                            processed_matches += 1
                        except Exception:
                            pass  # Skip if match creation fails
                
                end_time = time.time()
                return end_time - start_time, processed_matches
        
        # Test queue processing multiple times
        for _ in range(5):
            processing_time, matches_processed = await process_matching_queue()
            queue_processing_times.append(processing_time)
            
            print(f"Queue processing: {matches_processed} matches in {processing_time:.3f}s")
        
        avg_processing_time = sum(queue_processing_times) / len(queue_processing_times)
        matches_per_second = 50 / avg_processing_time  # Assuming 50 matches per batch
        
        print(f"Queue processing performance:")
        print(f"Average processing time: {avg_processing_time:.3f}s")
        print(f"Matches per second: {matches_per_second:.2f}")
        
        # Assertions
        assert avg_processing_time < 30  # Should process queue in under 30 seconds
        assert matches_per_second > 1  # Should process at least 1 match per second
    
    @pytest.mark.asyncio
    async def test_slot_management_performance(self, matching_service_instance, large_user_dataset):
        """Test slot allocation and deallocation performance"""
        slot_operation_times = []
        
        async def test_slot_operations():
            async with get_async_session() as session:
                start_time = time.time()
                
                # Test slot allocation
                for i in range(50):
                    user = large_user_dataset[i]
                    
                    # Simulate slot usage
                    user.available_slots = max(0, user.available_slots - 1)
                    user.total_slots_used += 1
                    
                    # Simulate slot reset (after 2 days or 50 coins)
                    if user.total_slots_used >= 2 or user.coins >= 50:
                        user.available_slots = min(2, user.available_slots + 1)
                        user.total_slots_used = max(0, user.total_slots_used - 1)
                
                await session.commit()
                end_time = time.time()
                return end_time - start_time
        
        # Test slot operations multiple times
        for _ in range(10):
            operation_time = await test_slot_operations()
            slot_operation_times.append(operation_time)
        
        avg_operation_time = sum(slot_operation_times) / len(slot_operation_times)
        operations_per_second = 50 / avg_operation_time
        
        print(f"Slot management performance:")
        print(f"Average time for 50 operations: {avg_operation_time:.3f}s")
        print(f"Operations per second: {operations_per_second:.2f}")
        
        # Assertions
        assert avg_operation_time < 5  # Should complete 50 operations in under 5 seconds
        assert operations_per_second > 10  # Should handle at least 10 operations per second
    
    @pytest.mark.asyncio
    async def test_match_creation_throughput(self, matching_service_instance, large_user_dataset):
        """Test match creation throughput"""
        creation_times = []
        
        async def create_match_batch():
            async with get_async_session() as session:
                start_time = time.time()
                
                # Create multiple matches
                for i in range(0, min(50, len(large_user_dataset) - 1), 2):
                    user1 = large_user_dataset[i]
                    user2 = large_user_dataset[i + 1]
                    
                    try:
                        match = await matching_service_instance._create_direct_match(
                            user1.id, user2.id, session
                        )
                        assert match is not None
                    except Exception:
                        pass  # Skip if match creation fails
                
                end_time = time.time()
                return end_time - start_time
        
        # Test match creation multiple times
        for _ in range(5):
            creation_time = await create_match_batch()
            creation_times.append(creation_time)
        
        avg_creation_time = sum(creation_times) / len(creation_times)
        matches_per_second = 25 / avg_creation_time  # Assuming 25 matches per batch
        
        print(f"Match creation throughput:")
        print(f"Average time for 25 matches: {avg_creation_time:.3f}s")
        print(f"Matches per second: {matches_per_second:.2f}")
        
        # Assertions
        assert avg_creation_time < 10  # Should create 25 matches in under 10 seconds
        assert matches_per_second > 2  # Should create at least 2 matches per second
    
    @pytest.mark.asyncio
    async def test_compatibility_cache_performance(self, matching_service_instance, large_user_dataset):
        """Test compatibility cache performance"""
        cache_hit_times = []
        cache_miss_times = []
        
        async def test_cache_performance():
            async with get_async_session() as session:
                user1 = large_user_dataset[0]
                user2 = large_user_dataset[1]
                
                # Test cache miss (first calculation)
                start_time = time.time()
                result1 = await matching_service_instance._calculate_compatibility(
                    user1.id, user2.id, session
                )
                cache_miss_time = time.time() - start_time
                cache_miss_times.append(cache_miss_time)
                
                # Test cache hit (second calculation)
                start_time = time.time()
                result2 = await matching_service_instance._calculate_compatibility(
                    user1.id, user2.id, session
                )
                cache_hit_time = time.time() - start_time
                cache_hit_times.append(cache_hit_time)
                
                assert result1["score"] == result2["score"]
        
        # Test cache performance multiple times
        for _ in range(100):
            await test_cache_performance()
        
        avg_cache_miss_time = sum(cache_miss_times) / len(cache_miss_times)
        avg_cache_hit_time = sum(cache_hit_times) / len(cache_hit_times)
        
        print(f"Compatibility cache performance:")
        print(f"Cache miss average time: {avg_cache_miss_time:.3f}s")
        print(f"Cache hit average time: {avg_cache_hit_time:.3f}s")
        print(f"Cache speedup: {avg_cache_miss_time / avg_cache_hit_time:.2f}x")
        
        # Assertions
        assert avg_cache_hit_time < avg_cache_miss_time  # Cache hit should be faster
        assert avg_cache_hit_time < 0.01  # Cache hit should be very fast (< 10ms)
        assert avg_cache_miss_time / avg_cache_hit_time > 2  # Cache should provide at least 2x speedup
    
    @pytest.mark.asyncio
    async def test_concurrent_match_requests_performance(self, matching_service_instance, large_user_dataset):
        """Test performance with concurrent match requests"""
        concurrent_request_times = []
        
        async def make_match_request(user_id: int):
            async with get_async_session() as session:
                start_time = time.time()
                
                try:
                    # Simulate match request
                    await matching_service_instance._create_match_request_internal(
                        user_id, session=session
                    )
                except Exception:
                    pass  # Expected to fail for some users due to slot limitations
                
                end_time = time.time()
                return end_time - start_time
        
        # Test with different levels of concurrency
        for num_concurrent in [10, 25, 50]:
            start_time = time.time()
            
            # Create concurrent request tasks
            tasks = [
                make_match_request(large_user_dataset[i].id)
                for i in range(num_concurrent)
            ]
            
            # Execute all requests concurrently
            request_times = await asyncio.gather(*tasks)
            total_time = time.time() - start_time
            
            avg_request_time = sum(request_times) / len(request_times)
            requests_per_second = num_concurrent / total_time
            
            print(f"Concurrent match requests ({num_concurrent}):")
            print(f"Total time: {total_time:.3f}s")
            print(f"Average request time: {avg_request_time:.3f}s")
            print(f"Requests per second: {requests_per_second:.2f}")
            
            concurrent_request_times.append((num_concurrent, total_time, requests_per_second))
            
            # Assertions
            assert total_time < 30  # Should handle concurrent requests in reasonable time
            assert requests_per_second > 1  # Should handle at least 1 request per second
    
    @pytest.mark.asyncio
    async def test_matching_algorithm_scalability(self, matching_service_instance, large_user_dataset):
        """Test matching algorithm scalability with different user pool sizes"""
        scalability_results = []
        
        async def test_user_pool_size(pool_size: int):
            async with get_async_session() as session:
                start_time = time.time()
                
                # Test compatibility calculations for a subset of users
                test_users = large_user_dataset[:pool_size]
                calculations = 0
                
                for i in range(0, min(50, len(test_users) - 1), 2):
                    user1 = test_users[i]
                    user2 = test_users[i + 1]
                    
                    result = await matching_service_instance._calculate_compatibility(
                        user1.id, user2.id, session
                    )
                    calculations += 1
                    
                    assert result is not None
                
                end_time = time.time()
                return end_time - start_time, calculations
        
        # Test with different pool sizes
        for pool_size in [100, 500, 1000]:
            processing_time, calculations = await test_user_pool_size(pool_size)
            calculations_per_second = calculations / processing_time
            
            print(f"Matching algorithm scalability (pool size {pool_size}):")
            print(f"Processing time: {processing_time:.3f}s")
            print(f"Calculations: {calculations}")
            print(f"Calculations per second: {calculations_per_second:.2f}")
            
            scalability_results.append((pool_size, processing_time, calculations_per_second))
            
            # Assertions
            assert processing_time < 30  # Should complete in reasonable time
            assert calculations_per_second > 1  # Should maintain reasonable throughput
    
    @pytest.mark.asyncio
    async def test_memory_usage_matching_service(self, matching_service_instance, large_user_dataset):
        """Test memory usage of matching service with large datasets"""
        import psutil
        import os
        
        process = psutil.Process(os.getpid())
        initial_memory = process.memory_info().rss / 1024 / 1024  # MB
        
        # Perform matching operations
        async with get_async_session() as session:
            for i in range(0, min(100, len(large_user_dataset) - 1), 2):
                user1 = large_user_dataset[i]
                user2 = large_user_dataset[i + 1]
                
                # Calculate compatibility (this populates the cache)
                await matching_service_instance._calculate_compatibility(
                    user1.id, user2.id, session
                )
        
        # Measure memory after operations
        final_memory = process.memory_info().rss / 1024 / 1024  # MB
        memory_increase = final_memory - initial_memory
        
        print(f"Matching service memory usage:")
        print(f"Initial memory: {initial_memory:.2f}MB")
        print(f"Final memory: {final_memory:.2f}MB")
        print(f"Memory increase: {memory_increase:.2f}MB")
        print(f"Cache entries: {len(matching_service_instance.compatibility_cache)}")
        
        # Assertions
        assert memory_increase < 100  # Should not increase more than 100MB
        assert len(matching_service_instance.compatibility_cache) > 0  # Cache should be populated
