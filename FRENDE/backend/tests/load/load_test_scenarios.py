#!/usr/bin/env python3
"""
Load testing scenarios for Frende application
Defines different load test patterns and user behaviors
"""

import asyncio
import time
import random
import json
from typing import List, Dict, Any, Callable
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum

from load_test import LoadTestUser, LoadTestConfig


class LoadTestType(Enum):
    """Types of load tests"""
    PEAK_HOUR = "peak_hour"
    FLASH_CROWD = "flash_crowd"
    SUSTAINED_LOAD = "sustained_load"
    MIXED_WORKLOAD = "mixed_workload"
    STRESS_TEST = "stress_test"
    SPIKE_TEST = "spike_test"


@dataclass
class LoadTestScenario:
    """Configuration for a specific load test scenario"""
    name: str
    description: str
    test_type: LoadTestType
    duration_minutes: int
    ramp_up_minutes: int
    ramp_down_minutes: int
    max_concurrent_users: int
    user_behavior: Callable
    success_criteria: Dict[str, Any]


class UserBehaviorPatterns:
    """Different user behavior patterns for load testing"""
    
    @staticmethod
    async def casual_user(user: LoadTestUser):
        """Casual user behavior - light usage"""
        # Login
        await user.make_request("/auth/login", "POST", {
            "email": user.email,
            "password": user.password
        })
        
        # Browse profile
        await user.make_request("/users/profile")
        
        # Check matches (low activity)
        if random.random() < 0.3:
            await user.make_request("/matching/compatible-users")
        
        # Maybe send a message
        if random.random() < 0.1:
            await user.make_request("/chat/send-message", "POST", {
                "match_id": 1,
                "message": "Hello!"
            })
        
        # Think time
        await asyncio.sleep(random.uniform(5, 15))
    
    @staticmethod
    async def active_user(user: LoadTestUser):
        """Active user behavior - moderate usage"""
        # Login
        await user.make_request("/auth/login", "POST", {
            "email": user.email,
            "password": user.password
        })
        
        # Update profile
        await user.make_request("/users/profile", "PUT", {
            "bio": f"Updated bio at {datetime.now()}"
        })
        
        # Browse matches
        await user.make_request("/matching/compatible-users")
        
        # Send match requests
        if random.random() < 0.4:
            await user.make_request("/matching/send-request", "POST", {
                "target_user_id": random.randint(1, 100)
            })
        
        # Chat activity
        if random.random() < 0.6:
            await user.make_request("/chat/send-message", "POST", {
                "match_id": 1,
                "message": f"Message at {datetime.now()}"
            })
        
        # Check tasks
        await user.make_request("/tasks/current")
        
        # Think time
        await asyncio.sleep(random.uniform(2, 8))
    
    @staticmethod
    async def power_user(user: LoadTestUser):
        """Power user behavior - heavy usage"""
        # Login
        await user.make_request("/auth/login", "POST", {
            "email": user.email,
            "password": user.password
        })
        
        # Multiple profile updates
        for _ in range(random.randint(1, 3)):
            await user.make_request("/users/profile", "PUT", {
                "bio": f"Power user update {_} at {datetime.now()}"
            })
        
        # Aggressive matching
        for _ in range(random.randint(2, 5)):
            await user.make_request("/matching/send-request", "POST", {
                "target_user_id": random.randint(1, 100)
            })
        
        # Multiple chat messages
        for _ in range(random.randint(3, 8)):
            await user.make_request("/chat/send-message", "POST", {
                "match_id": 1,
                "message": f"Power user message {_} at {datetime.now()}"
            })
        
        # Task management
        await user.make_request("/tasks/current")
        await user.make_request("/tasks/completed")
        
        # Purchase slots
        if random.random() < 0.2:
            await user.make_request("/matching/purchase-slots", "POST", {
                "quantity": random.randint(1, 3)
            })
        
        # Think time
        await asyncio.sleep(random.uniform(1, 4))
    
    @staticmethod
    async def chat_focused_user(user: LoadTestUser):
        """Chat-focused user behavior"""
        # Login
        await user.make_request("/auth/login", "POST", {
            "email": user.email,
            "password": user.password
        })
        
        # Get chat history
        await user.make_request("/chat/history/1")
        
        # Send multiple messages rapidly
        for _ in range(random.randint(5, 15)):
            await user.make_request("/chat/send-message", "POST", {
                "match_id": 1,
                "message": f"Chat message {_} at {datetime.now()}"
            })
            await asyncio.sleep(random.uniform(0.5, 2))
        
        # Check typing indicators
        await user.make_request("/chat/typing/1", "POST", {"is_typing": True})
        await asyncio.sleep(2)
        await user.make_request("/chat/typing/1", "POST", {"is_typing": False})
        
        # Think time
        await asyncio.sleep(random.uniform(3, 10))


class LoadTestScenarios:
    """Predefined load test scenarios"""
    
    @staticmethod
    def get_scenarios() -> List[LoadTestScenario]:
        """Get all available load test scenarios"""
        return [
            LoadTestScenarios.peak_hour_scenario(),
            LoadTestScenarios.flash_crowd_scenario(),
            LoadTestScenarios.sustained_load_scenario(),
            LoadTestScenarios.mixed_workload_scenario(),
            LoadTestScenarios.stress_test_scenario(),
            LoadTestScenarios.spike_test_scenario(),
        ]
    
    @staticmethod
    def peak_hour_scenario() -> LoadTestScenario:
        """Simulate typical peak hour usage"""
        return LoadTestScenario(
            name="Peak Hour Simulation",
            description="Simulates typical app usage during peak hours (evening)",
            test_type=LoadTestType.PEAK_HOUR,
            duration_minutes=30,
            ramp_up_minutes=5,
            ramp_down_minutes=5,
            max_concurrent_users=500,
            user_behavior=UserBehaviorPatterns.active_user,
            success_criteria={
                "response_time_p95": 2000,  # 2 seconds
                "throughput": 100,  # requests per second
                "error_rate": 0.01,  # 1%
                "cpu_usage": 0.7,  # 70%
                "memory_usage": 0.6,  # 60%
            }
        )
    
    @staticmethod
    def flash_crowd_scenario() -> LoadTestScenario:
        """Simulate sudden surge of users (viral moment)"""
        return LoadTestScenario(
            name="Flash Crowd Simulation",
            description="Simulates sudden surge of users (viral moment)",
            test_type=LoadTestType.FLASH_CROWD,
            duration_minutes=15,
            ramp_up_minutes=2,
            ramp_down_minutes=3,
            max_concurrent_users=1000,
            user_behavior=UserBehaviorPatterns.casual_user,
            success_criteria={
                "response_time_p95": 3000,  # 3 seconds
                "throughput": 200,  # requests per second
                "error_rate": 0.05,  # 5%
                "cpu_usage": 0.8,  # 80%
                "memory_usage": 0.7,  # 70%
            }
        )
    
    @staticmethod
    def sustained_load_scenario() -> LoadTestScenario:
        """Simulate sustained high load over extended period"""
        return LoadTestScenario(
            name="Sustained Load Simulation",
            description="Simulates sustained high load over extended period",
            test_type=LoadTestType.SUSTAINED_LOAD,
            duration_minutes=60,
            ramp_up_minutes=10,
            ramp_down_minutes=10,
            max_concurrent_users=300,
            user_behavior=UserBehaviorPatterns.active_user,
            success_criteria={
                "response_time_p95": 2500,  # 2.5 seconds
                "throughput": 80,  # requests per second
                "error_rate": 0.02,  # 2%
                "cpu_usage": 0.75,  # 75%
                "memory_usage": 0.65,  # 65%
            }
        )
    
    @staticmethod
    def mixed_workload_scenario() -> LoadTestScenario:
        """Simulate mixed user behaviors"""
        return LoadTestScenario(
            name="Mixed Workload Simulation",
            description="Simulates mixed user behaviors (casual, active, power users)",
            test_type=LoadTestType.MIXED_WORKLOAD,
            duration_minutes=45,
            ramp_up_minutes=8,
            ramp_down_minutes=7,
            max_concurrent_users=400,
            user_behavior=LoadTestScenarios._mixed_user_behavior,
            success_criteria={
                "response_time_p95": 2200,  # 2.2 seconds
                "throughput": 120,  # requests per second
                "error_rate": 0.015,  # 1.5%
                "cpu_usage": 0.72,  # 72%
                "memory_usage": 0.63,  # 63%
            }
        )
    
    @staticmethod
    def stress_test_scenario() -> LoadTestScenario:
        """Stress test to find breaking point"""
        return LoadTestScenario(
            name="Stress Test",
            description="Stress test to find system breaking point",
            test_type=LoadTestType.STRESS_TEST,
            duration_minutes=20,
            ramp_up_minutes=5,
            ramp_down_minutes=5,
            max_concurrent_users=2000,
            user_behavior=UserBehaviorPatterns.power_user,
            success_criteria={
                "response_time_p95": 5000,  # 5 seconds
                "throughput": 300,  # requests per second
                "error_rate": 0.1,  # 10%
                "cpu_usage": 0.9,  # 90%
                "memory_usage": 0.8,  # 80%
            }
        )
    
    @staticmethod
    def spike_test_scenario() -> LoadTestScenario:
        """Test system recovery from traffic spikes"""
        return LoadTestScenario(
            name="Spike Test",
            description="Test system recovery from traffic spikes",
            test_type=LoadTestType.SPIKE_TEST,
            duration_minutes=25,
            ramp_up_minutes=3,
            ramp_down_minutes=3,
            max_concurrent_users=800,
            user_behavior=LoadTestScenarios._spike_user_behavior,
            success_criteria={
                "response_time_p95": 3500,  # 3.5 seconds
                "throughput": 150,  # requests per second
                "error_rate": 0.03,  # 3%
                "cpu_usage": 0.78,  # 78%
                "memory_usage": 0.68,  # 68%
            }
        )
    
    @staticmethod
    async def _mixed_user_behavior(user: LoadTestUser):
        """Mixed user behavior - randomly selects from different patterns"""
        behaviors = [
            UserBehaviorPatterns.casual_user,
            UserBehaviorPatterns.active_user,
            UserBehaviorPatterns.power_user,
            UserBehaviorPatterns.chat_focused_user,
        ]
        
        # Weighted selection (more casual users)
        weights = [0.4, 0.35, 0.15, 0.1]
        selected_behavior = random.choices(behaviors, weights=weights)[0]
        
        await selected_behavior(user)
    
    @staticmethod
    async def _spike_user_behavior(user: LoadTestUser):
        """Spike user behavior - bursts of activity"""
        # Initial burst
        for _ in range(random.randint(3, 8)):
            await user.make_request("/auth/login", "POST", {
                "email": user.email,
                "password": user.password
            })
            await user.make_request("/matching/compatible-users")
            await user.make_request("/chat/send-message", "POST", {
                "match_id": 1,
                "message": f"Spike message {_}"
            })
        
        # Quiet period
        await asyncio.sleep(random.uniform(10, 20))
        
        # Another burst
        for _ in range(random.randint(2, 5)):
            await user.make_request("/tasks/current")
            await user.make_request("/users/profile")


class ScenarioRunner:
    """Runner for executing load test scenarios"""
    
    def __init__(self, base_config: LoadTestConfig):
        self.base_config = base_config
        self.scenarios = LoadTestScenarios.get_scenarios()
    
    async def run_scenario(self, scenario_name: str) -> Dict[str, Any]:
        """Run a specific scenario by name"""
        scenario = next((s for s in self.scenarios if s.name == scenario_name), None)
        if not scenario:
            raise ValueError(f"Scenario '{scenario_name}' not found")
        
        return await self._execute_scenario(scenario)
    
    async def run_all_scenarios(self) -> Dict[str, Dict[str, Any]]:
        """Run all available scenarios"""
        results = {}
        for scenario in self.scenarios:
            print(f"\n=== Running Scenario: {scenario.name} ===")
            results[scenario.name] = await self._execute_scenario(scenario)
        
        return results
    
    async def _execute_scenario(self, scenario: LoadTestScenario) -> Dict[str, Any]:
        """Execute a single scenario"""
        # Create scenario-specific config
        config = LoadTestConfig(
            base_url=self.base_config.base_url,
            concurrent_users=scenario.max_concurrent_users,
            duration_seconds=scenario.duration_minutes * 60,
            ramp_up_seconds=scenario.ramp_up_minutes * 60,
            ramp_down_seconds=scenario.ramp_down_minutes * 60,
            user_behavior=scenario.user_behavior,
            timeout_seconds=self.base_config.timeout_seconds,
            max_memory_mb=self.base_config.max_memory_mb
        )
        
        # Run the load test
        from load_test import LoadTestRunner
        runner = LoadTestRunner(config)
        result = await runner.run_load_test()
        
        # Validate against success criteria
        validation = self._validate_scenario_result(result, scenario.success_criteria)
        
        return {
            "scenario": scenario,
            "result": result,
            "validation": validation,
            "passed": all(validation.values())
        }
    
    def _validate_scenario_result(self, result: Dict[str, Any], criteria: Dict[str, Any]) -> Dict[str, bool]:
        """Validate test results against success criteria"""
        validation = {}
        
        # Response time validation
        if "response_time_p95" in criteria:
            p95_response_time = result.get("response_time_p95", float('inf'))
            validation["response_time"] = p95_response_time <= criteria["response_time_p95"]
        
        # Throughput validation
        if "throughput" in criteria:
            throughput = result.get("throughput", 0)
            validation["throughput"] = throughput >= criteria["throughput"]
        
        # Error rate validation
        if "error_rate" in criteria:
            error_rate = result.get("error_rate", 1.0)
            validation["error_rate"] = error_rate <= criteria["error_rate"]
        
        # CPU usage validation
        if "cpu_usage" in criteria:
            cpu_usage = result.get("cpu_usage", 1.0)
            validation["cpu_usage"] = cpu_usage <= criteria["cpu_usage"]
        
        # Memory usage validation
        if "memory_usage" in criteria:
            memory_usage = result.get("memory_usage", 1.0)
            validation["memory_usage"] = memory_usage <= criteria["memory_usage"]
        
        return validation


if __name__ == "__main__":
    # Example usage
    async def main():
        config = LoadTestConfig(
            base_url="http://localhost:8000",
            concurrent_users=100,
            duration_seconds=300,
            ramp_up_seconds=60,
            ramp_down_seconds=60,
            user_behavior=UserBehaviorPatterns.active_user,
            timeout_seconds=30,
            max_memory_mb=512
        )
        
        runner = ScenarioRunner(config)
        
        # Run a specific scenario
        result = await runner.run_scenario("Peak Hour Simulation")
        print(f"Scenario result: {result}")
        
        # Or run all scenarios
        # results = await runner.run_all_scenarios()
        # print(f"All results: {results}")
    
    asyncio.run(main())
