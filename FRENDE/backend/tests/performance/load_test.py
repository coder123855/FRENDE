#!/usr/bin/env python3
"""
Load testing script for Frende application
Simulates concurrent users and measures system performance
"""

import asyncio
import time
import json
import random
import statistics
from typing import List, Dict, Any
from dataclasses import dataclass
from datetime import datetime, timedelta
import aiohttp
import websockets
import psutil
import os

@dataclass
class LoadTestConfig:
    """Configuration for load testing"""
    base_url: str = "http://localhost:8000"
    websocket_url: str = "ws://localhost:8000/ws"
    num_users: int = 100
    ramp_up_time: int = 60  # seconds
    test_duration: int = 300  # seconds
    max_concurrent_connections: int = 50
    request_timeout: int = 30
    think_time_min: float = 1.0
    think_time_max: float = 5.0

@dataclass
class LoadTestResult:
    """Results from load testing"""
    total_requests: int
    successful_requests: int
    failed_requests: int
    total_response_time: float
    min_response_time: float
    max_response_time: float
    avg_response_time: float
    median_response_time: float
    p95_response_time: float
    p99_response_time: float
    requests_per_second: float
    error_rate: float
    memory_usage_mb: float
    cpu_usage_percent: float

class LoadTestUser:
    """Simulates a single user in the load test"""
    
    def __init__(self, user_id: int, config: LoadTestConfig):
        self.user_id = user_id
        self.config = config
        self.session = None
        self.websocket = None
        self.auth_token = None
        self.test_data = {
            "requests": [],
            "errors": [],
            "start_time": None,
            "end_time": None
        }
    
    async def setup(self):
        """Setup user session and authentication"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=self.config.request_timeout)
        )
        
        # Simulate user registration/login
        try:
            login_data = {
                "username": f"loadtest_user_{self.user_id}",
                "password": "testpassword123"
            }
            
            async with self.session.post(
                f"{self.config.base_url}/auth/login",
                json=login_data
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    self.auth_token = data.get("access_token")
                else:
                    # Try registration if login fails
                    async with self.session.post(
                        f"{self.config.base_url}/auth/register",
                        json=login_data
                    ) as reg_response:
                        if reg_response.status == 200:
                            data = await reg_response.json()
                            self.auth_token = data.get("access_token")
            
            self.test_data["start_time"] = time.time()
            
        except Exception as e:
            self.test_data["errors"].append(f"Setup failed: {str(e)}")
    
    async def teardown(self):
        """Cleanup user session"""
        if self.session:
            await self.session.close()
        if self.websocket:
            await self.websocket.close()
        
        self.test_data["end_time"] = time.time()
    
    async def make_request(self, endpoint: str, method: str = "GET", data: Dict = None) -> Dict:
        """Make an HTTP request and record metrics"""
        start_time = time.time()
        
        try:
            headers = {}
            if self.auth_token:
                headers["Authorization"] = f"Bearer {self.auth_token}"
            
            if method == "GET":
                async with self.session.get(f"{self.config.base_url}{endpoint}", headers=headers) as response:
                    response_time = time.time() - start_time
                    await response.read()  # Ensure response is fully read
                    
                    result = {
                        "endpoint": endpoint,
                        "method": method,
                        "status_code": response.status,
                        "response_time": response_time,
                        "success": 200 <= response.status < 300,
                        "timestamp": start_time
                    }
                    
                    self.test_data["requests"].append(result)
                    return result
            
            elif method == "POST":
                async with self.session.post(
                    f"{self.config.base_url}{endpoint}", 
                    json=data, 
                    headers=headers
                ) as response:
                    response_time = time.time() - start_time
                    await response.read()
                    
                    result = {
                        "endpoint": endpoint,
                        "method": method,
                        "status_code": response.status,
                        "response_time": response_time,
                        "success": 200 <= response.status < 300,
                        "timestamp": start_time
                    }
                    
                    self.test_data["requests"].append(result)
                    return result
        
        except Exception as e:
            response_time = time.time() - start_time
            error_result = {
                "endpoint": endpoint,
                "method": method,
                "status_code": 0,
                "response_time": response_time,
                "success": False,
                "error": str(e),
                "timestamp": start_time
            }
            
            self.test_data["requests"].append(error_result)
            self.test_data["errors"].append(str(e))
            return error_result
    
    async def simulate_user_workflow(self):
        """Simulate typical user workflow"""
        try:
            # Get user profile
            await self.make_request("/api/users/profile")
            
            # Get compatible users
            await self.make_request("/api/matching/compatible-users")
            
            # Send match request (randomly)
            if random.random() < 0.3:  # 30% chance
                await self.make_request("/api/matching/request", method="POST", data={
                    "target_user_id": random.randint(1, 100)
                })
            
            # Get matches
            await self.make_request("/api/matches")
            
            # Get tasks (if has active matches)
            await self.make_request("/api/tasks")
            
            # Simulate think time
            think_time = random.uniform(self.config.think_time_min, self.config.think_time_max)
            await asyncio.sleep(think_time)
            
        except Exception as e:
            self.test_data["errors"].append(f"Workflow failed: {str(e)}")
    
    async def simulate_chat_workflow(self):
        """Simulate chat-related workflow"""
        try:
            # Get active matches
            await self.make_request("/api/matches?status=active")
            
            # Get chat history for a match (if exists)
            match_id = random.randint(1, 10)
            await self.make_request(f"/api/chat/{match_id}/messages")
            
            # Send a message (randomly)
            if random.random() < 0.2:  # 20% chance
                await self.make_request(f"/api/chat/{match_id}/messages", method="POST", data={
                    "message": f"Test message from user {self.user_id}",
                    "message_type": "text"
                })
            
            # Simulate think time
            think_time = random.uniform(0.5, 2.0)
            await asyncio.sleep(think_time)
            
        except Exception as e:
            self.test_data["errors"].append(f"Chat workflow failed: {str(e)}")

class LoadTestRunner:
    """Main load test runner"""
    
    def __init__(self, config: LoadTestConfig):
        self.config = config
        self.users: List[LoadTestUser] = []
        self.results: List[LoadTestResult] = []
        self.start_time = None
        self.end_time = None
    
    async def setup_users(self):
        """Setup all test users"""
        print(f"Setting up {self.config.num_users} users...")
        
        # Create users in batches to avoid overwhelming the system
        batch_size = min(10, self.config.num_users)
        for i in range(0, self.config.num_users, batch_size):
            batch_users = []
            for j in range(batch_size):
                if i + j < self.config.num_users:
                    user = LoadTestUser(i + j, self.config)
                    batch_users.append(user)
            
            # Setup batch concurrently
            await asyncio.gather(*[user.setup() for user in batch_users])
            self.users.extend(batch_users)
            
            # Small delay between batches
            await asyncio.sleep(1)
        
        print(f"Setup complete for {len(self.users)} users")
    
    async def run_user_workload(self, user: LoadTestUser):
        """Run workload for a single user"""
        try:
            # Simulate user session duration
            session_duration = random.uniform(30, 120)  # 30-120 seconds
            end_time = time.time() + session_duration
            
            while time.time() < end_time:
                # Randomly choose workflow
                if random.random() < 0.7:  # 70% chance for regular workflow
                    await user.simulate_user_workflow()
                else:  # 30% chance for chat workflow
                    await user.simulate_chat_workflow()
                
                # Small delay between actions
                await asyncio.sleep(random.uniform(0.1, 0.5))
        
        except Exception as e:
            user.test_data["errors"].append(f"User workload failed: {str(e)}")
    
    async def run_load_test(self):
        """Run the main load test"""
        print("Starting load test...")
        self.start_time = time.time()
        
        # Setup users
        await self.setup_users()
        
        # Start user workloads with ramp-up
        print("Starting user workloads...")
        tasks = []
        
        for i, user in enumerate(self.users):
            # Ramp up users over time
            delay = (i / len(self.users)) * self.config.ramp_up_time
            task = asyncio.create_task(self.delayed_user_workload(user, delay))
            tasks.append(task)
        
        # Wait for all tasks to complete
        await asyncio.gather(*tasks, return_exceptions=True)
        
        self.end_time = time.time()
        print("Load test completed")
    
    async def delayed_user_workload(self, user: LoadTestUser, delay: float):
        """Start user workload after a delay"""
        await asyncio.sleep(delay)
        await self.run_user_workload(user)
    
    async def cleanup(self):
        """Cleanup all users"""
        print("Cleaning up users...")
        await asyncio.gather(*[user.teardown() for user in self.users])
    
    def calculate_results(self) -> LoadTestResult:
        """Calculate test results"""
        all_requests = []
        all_errors = []
        
        for user in self.users:
            all_requests.extend(user.test_data["requests"])
            all_errors.extend(user.test_data["errors"])
        
        if not all_requests:
            return LoadTestResult(
                total_requests=0,
                successful_requests=0,
                failed_requests=0,
                total_response_time=0,
                min_response_time=0,
                max_response_time=0,
                avg_response_time=0,
                median_response_time=0,
                p95_response_time=0,
                p99_response_time=0,
                requests_per_second=0,
                error_rate=0,
                memory_usage_mb=0,
                cpu_usage_percent=0
            )
        
        # Calculate response time statistics
        response_times = [req["response_time"] for req in all_requests]
        successful_requests = [req for req in all_requests if req["success"]]
        failed_requests = [req for req in all_requests if not req["success"]]
        
        total_time = self.end_time - self.start_time
        
        # Calculate percentiles
        response_times.sort()
        p95_index = int(len(response_times) * 0.95)
        p99_index = int(len(response_times) * 0.99)
        
        # Get system metrics
        process = psutil.Process(os.getpid())
        memory_usage = process.memory_info().rss / 1024 / 1024  # MB
        cpu_usage = process.cpu_percent()
        
        return LoadTestResult(
            total_requests=len(all_requests),
            successful_requests=len(successful_requests),
            failed_requests=len(failed_requests),
            total_response_time=sum(response_times),
            min_response_time=min(response_times),
            max_response_time=max(response_times),
            avg_response_time=statistics.mean(response_times),
            median_response_time=statistics.median(response_times),
            p95_response_time=response_times[p95_index] if p95_index < len(response_times) else 0,
            p99_response_time=response_times[p99_index] if p99_index < len(response_times) else 0,
            requests_per_second=len(all_requests) / total_time if total_time > 0 else 0,
            error_rate=len(failed_requests) / len(all_requests) if all_requests else 0,
            memory_usage_mb=memory_usage,
            cpu_usage_percent=cpu_usage
        )
    
    def print_results(self, results: LoadTestResult):
        """Print test results"""
        print("\n" + "="*60)
        print("LOAD TEST RESULTS")
        print("="*60)
        print(f"Test Duration: {self.end_time - self.start_time:.2f} seconds")
        print(f"Total Users: {len(self.users)}")
        print(f"Total Requests: {results.total_requests}")
        print(f"Successful Requests: {results.successful_requests}")
        print(f"Failed Requests: {results.failed_requests}")
        print(f"Error Rate: {results.error_rate:.2%}")
        print(f"Requests per Second: {results.requests_per_second:.2f}")
        print()
        print("Response Time Statistics:")
        print(f"  Average: {results.avg_response_time:.3f}s")
        print(f"  Median: {results.median_response_time:.3f}s")
        print(f"  Minimum: {results.min_response_time:.3f}s")
        print(f"  Maximum: {results.max_response_time:.3f}s")
        print(f"  95th Percentile: {results.p95_response_time:.3f}s")
        print(f"  99th Percentile: {results.p99_response_time:.3f}s")
        print()
        print("System Metrics:")
        print(f"  Memory Usage: {results.memory_usage_mb:.2f} MB")
        print(f"  CPU Usage: {results.cpu_usage_percent:.2f}%")
        print("="*60)

async def main():
    """Main function to run load test"""
    # Configuration
    config = LoadTestConfig(
        num_users=50,  # Start with smaller number for testing
        ramp_up_time=30,
        test_duration=120,
        max_concurrent_connections=25
    )
    
    # Create and run load test
    runner = LoadTestRunner(config)
    
    try:
        await runner.run_load_test()
        results = runner.calculate_results()
        runner.print_results(results)
        
        # Save results to file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"load_test_results_{timestamp}.json"
        
        with open(filename, 'w') as f:
            json.dump({
                "config": {
                    "num_users": config.num_users,
                    "ramp_up_time": config.ramp_up_time,
                    "test_duration": config.test_duration
                },
                "results": {
                    "total_requests": results.total_requests,
                    "successful_requests": results.successful_requests,
                    "failed_requests": results.failed_requests,
                    "avg_response_time": results.avg_response_time,
                    "requests_per_second": results.requests_per_second,
                    "error_rate": results.error_rate
                },
                "timestamp": timestamp
            }, f, indent=2)
        
        print(f"Results saved to {filename}")
        
    except Exception as e:
        print(f"Load test failed: {str(e)}")
        raise
    finally:
        await runner.cleanup()

if __name__ == "__main__":
    asyncio.run(main())
