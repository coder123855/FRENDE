#!/usr/bin/env python3
"""
Distributed load testing framework for Frende application
Supports running load tests across multiple machines for higher concurrency
"""

import asyncio
import time
import json
import socket
import threading
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
import aiohttp
import websockets
import psutil
import os
import signal
import sys

from load_test import LoadTestUser, LoadTestConfig, LoadTestResult
from load_test_scenarios import LoadTestScenario, ScenarioRunner


@dataclass
class NodeConfig:
    """Configuration for a load test node"""
    node_id: str
    host: str
    port: int
    max_concurrent_users: int
    is_coordinator: bool = False


@dataclass
class DistributedTestConfig:
    """Configuration for distributed load testing"""
    base_url: str
    nodes: List[NodeConfig]
    scenario: LoadTestScenario
    sync_interval: float = 1.0  # seconds
    timeout_seconds: int = 30
    max_memory_mb: int = 512


class LoadTestNode:
    """A single load test node"""
    
    def __init__(self, config: NodeConfig, base_config: LoadTestConfig):
        self.config = config
        self.base_config = base_config
        self.users: List[LoadTestUser] = []
        self.results: List[Dict[str, Any]] = []
        self.is_running = False
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None
        
        # Performance monitoring
        self.cpu_usage = []
        self.memory_usage = []
        self.network_io = []
        
        # Communication
        self.websocket_server = None
        self.websocket_clients = {}
    
    async def start(self):
        """Start the load test node"""
        print(f"Starting load test node {self.config.node_id} on {self.config.host}:{self.config.port}")
        
        # Start WebSocket server for coordination
        await self._start_websocket_server()
        
        # Start performance monitoring
        await self._start_performance_monitoring()
        
        self.is_running = True
        self.start_time = datetime.now()
    
    async def stop(self):
        """Stop the load test node"""
        print(f"Stopping load test node {self.config.node_id}")
        
        self.is_running = False
        self.end_time = datetime.now()
        
        # Stop WebSocket server
        if self.websocket_server:
            self.websocket_server.close()
            await self.websocket_server.wait_closed()
        
        # Stop performance monitoring
        await self._stop_performance_monitoring()
    
    async def _start_websocket_server(self):
        """Start WebSocket server for node coordination"""
        self.websocket_server = await websockets.serve(
            self._handle_websocket_connection,
            self.config.host,
            self.config.port
        )
        print(f"WebSocket server started on {self.config.host}:{self.config.port}")
    
    async def _handle_websocket_connection(self, websocket, path):
        """Handle WebSocket connections from other nodes"""
        try:
            async for message in websocket:
                data = json.loads(message)
                await self._handle_coordination_message(data, websocket)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            if websocket in self.websocket_clients:
                del self.websocket_clients[websocket]
    
    async def _handle_coordination_message(self, data: Dict[str, Any], websocket):
        """Handle coordination messages from other nodes"""
        message_type = data.get("type")
        
        if message_type == "sync":
            # Synchronize with other nodes
            await self._handle_sync_message(data)
        elif message_type == "start":
            # Start load test
            await self._handle_start_message(data)
        elif message_type == "stop":
            # Stop load test
            await self._handle_stop_message(data)
        elif message_type == "status":
            # Report status
            await self._send_status(websocket)
    
    async def _handle_sync_message(self, data: Dict[str, Any]):
        """Handle synchronization message"""
        # Implement synchronization logic
        pass
    
    async def _handle_start_message(self, data: Dict[str, Any]):
        """Handle start message"""
        scenario_config = data.get("scenario")
        if scenario_config:
            await self._run_load_test(scenario_config)
    
    async def _handle_stop_message(self, data: Dict[str, Any]):
        """Handle stop message"""
        await self.stop()
    
    async def _send_status(self, websocket):
        """Send current status to coordinator"""
        status = {
            "type": "status",
            "node_id": self.config.node_id,
            "is_running": self.is_running,
            "active_users": len(self.users),
            "results_count": len(self.results),
            "cpu_usage": self.cpu_usage[-1] if self.cpu_usage else 0,
            "memory_usage": self.memory_usage[-1] if self.memory_usage else 0,
            "timestamp": datetime.now().isoformat()
        }
        await websocket.send(json.dumps(status))
    
    async def _start_performance_monitoring(self):
        """Start monitoring system performance"""
        async def monitor_performance():
            while self.is_running:
                # CPU usage
                cpu_percent = psutil.cpu_percent(interval=1)
                self.cpu_usage.append(cpu_percent)
                
                # Memory usage
                memory = psutil.virtual_memory()
                self.memory_usage.append(memory.percent)
                
                # Network I/O
                network = psutil.net_io_counters()
                self.network_io.append({
                    "bytes_sent": network.bytes_sent,
                    "bytes_recv": network.bytes_recv,
                    "timestamp": datetime.now()
                })
                
                await asyncio.sleep(1)
        
        asyncio.create_task(monitor_performance())
    
    async def _stop_performance_monitoring(self):
        """Stop performance monitoring"""
        # Performance monitoring is stopped by setting is_running = False
        pass
    
    async def _run_load_test(self, scenario_config: Dict[str, Any]):
        """Run load test on this node"""
        print(f"Node {self.config.node_id} starting load test")
        
        # Create users for this node
        users_per_node = self.config.max_concurrent_users
        for i in range(users_per_node):
            user = LoadTestUser(
                user_id=f"{self.config.node_id}_{i}",
                config=self.base_config
            )
            await user.setup()
            self.users.append(user)
        
        # Run user workloads
        tasks = []
        for user in self.users:
            task = asyncio.create_task(self._run_user_workload(user))
            tasks.append(task)
        
        # Wait for all tasks to complete
        await asyncio.gather(*tasks, return_exceptions=True)
        
        # Cleanup users
        for user in self.users:
            await user.teardown()
    
    async def _run_user_workload(self, user: LoadTestUser):
        """Run workload for a single user"""
        try:
            while self.is_running:
                # Execute user behavior
                start_time = time.time()
                
                # Simulate user workflow
                await user.simulate_user_workflow()
                
                # Record result
                end_time = time.time()
                result = {
                    "user_id": user.user_id,
                    "node_id": self.config.node_id,
                    "start_time": start_time,
                    "end_time": end_time,
                    "duration": end_time - start_time,
                    "timestamp": datetime.now().isoformat()
                }
                self.results.append(result)
                
                # Think time
                await asyncio.sleep(random.uniform(1, 5))
        
        except Exception as e:
            print(f"Error in user workload for {user.user_id}: {e}")
    
    def get_results(self) -> Dict[str, Any]:
        """Get aggregated results from this node"""
        if not self.results:
            return {}
        
        durations = [r["duration"] for r in self.results]
        durations.sort()
        
        return {
            "node_id": self.config.node_id,
            "total_requests": len(self.results),
            "avg_response_time": sum(durations) / len(durations),
            "p50_response_time": durations[len(durations) // 2],
            "p95_response_time": durations[int(len(durations) * 0.95)],
            "p99_response_time": durations[int(len(durations) * 0.99)],
            "min_response_time": min(durations),
            "max_response_time": max(durations),
            "avg_cpu_usage": sum(self.cpu_usage) / len(self.cpu_usage) if self.cpu_usage else 0,
            "avg_memory_usage": sum(self.memory_usage) / len(self.memory_usage) if self.memory_usage else 0,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration": (self.end_time - self.start_time).total_seconds() if self.start_time and self.end_time else 0
        }


class DistributedLoadTestCoordinator:
    """Coordinates distributed load testing across multiple nodes"""
    
    def __init__(self, config: DistributedTestConfig):
        self.config = config
        self.nodes: Dict[str, LoadTestNode] = {}
        self.coordinator_node = None
        self.is_running = False
        
        # Find coordinator node
        coordinator_config = next((n for n in config.nodes if n.is_coordinator), None)
        if not coordinator_config:
            raise ValueError("No coordinator node specified")
        
        self.coordinator_config = coordinator_config
    
    async def start(self):
        """Start distributed load testing"""
        print("Starting distributed load test coordinator")
        
        # Initialize nodes
        await self._initialize_nodes()
        
        # Start coordinator node
        await self._start_coordinator()
        
        # Connect to other nodes
        await self._connect_to_nodes()
        
        self.is_running = True
        
        # Start coordination loop
        await self._coordination_loop()
    
    async def stop(self):
        """Stop distributed load testing"""
        print("Stopping distributed load test coordinator")
        
        self.is_running = False
        
        # Stop all nodes
        for node in self.nodes.values():
            await node.stop()
        
        # Stop coordinator
        if self.coordinator_node:
            await self.coordinator_node.stop()
    
    async def _initialize_nodes(self):
        """Initialize all load test nodes"""
        for node_config in self.config.nodes:
            if not node_config.is_coordinator:
                # Create base config for this node
                base_config = LoadTestConfig(
                    base_url=self.config.base_url,
                    concurrent_users=node_config.max_concurrent_users,
                    duration_seconds=self.config.scenario.duration_minutes * 60,
                    ramp_up_seconds=self.config.scenario.ramp_up_minutes * 60,
                    ramp_down_seconds=self.config.scenario.ramp_down_minutes * 60,
                    user_behavior=self.config.scenario.user_behavior,
                    timeout_seconds=self.config.timeout_seconds,
                    max_memory_mb=self.config.max_memory_mb
                )
                
                # Create node
                node = LoadTestNode(node_config, base_config)
                self.nodes[node_config.node_id] = node
    
    async def _start_coordinator(self):
        """Start the coordinator node"""
        base_config = LoadTestConfig(
            base_url=self.config.base_url,
            concurrent_users=self.coordinator_config.max_concurrent_users,
            duration_seconds=self.config.scenario.duration_minutes * 60,
            ramp_up_seconds=self.config.scenario.ramp_up_minutes * 60,
            ramp_down_seconds=self.config.scenario.ramp_down_minutes * 60,
            user_behavior=self.config.scenario.user_behavior,
            timeout_seconds=self.config.timeout_seconds,
            max_memory_mb=self.config.max_memory_mb
        )
        
        self.coordinator_node = LoadTestNode(self.coordinator_config, base_config)
        await self.coordinator_node.start()
    
    async def _connect_to_nodes(self):
        """Connect to all other nodes"""
        for node_config in self.config.nodes:
            if not node_config.is_coordinator:
                try:
                    uri = f"ws://{node_config.host}:{node_config.port}"
                    websocket = await websockets.connect(uri)
                    self.coordinator_node.websocket_clients[node_config.node_id] = websocket
                    print(f"Connected to node {node_config.node_id}")
                except Exception as e:
                    print(f"Failed to connect to node {node_config.node_id}: {e}")
    
    async def _coordination_loop(self):
        """Main coordination loop"""
        start_time = datetime.now()
        
        # Send start message to all nodes
        await self._broadcast_start_message()
        
        # Monitor nodes during test
        while self.is_running:
            await self._collect_node_status()
            await asyncio.sleep(self.config.sync_interval)
            
            # Check if test duration has elapsed
            elapsed = (datetime.now() - start_time).total_seconds()
            if elapsed >= self.config.scenario.duration_minutes * 60:
                break
        
        # Send stop message to all nodes
        await self._broadcast_stop_message()
        
        # Collect final results
        await self._collect_final_results()
    
    async def _broadcast_start_message(self):
        """Broadcast start message to all nodes"""
        message = {
            "type": "start",
            "scenario": asdict(self.config.scenario),
            "timestamp": datetime.now().isoformat()
        }
        
        for websocket in self.coordinator_node.websocket_clients.values():
            try:
                await websocket.send(json.dumps(message))
            except Exception as e:
                print(f"Failed to send start message: {e}")
    
    async def _broadcast_stop_message(self):
        """Broadcast stop message to all nodes"""
        message = {
            "type": "stop",
            "timestamp": datetime.now().isoformat()
        }
        
        for websocket in self.coordinator_node.websocket_clients.values():
            try:
                await websocket.send(json.dumps(message))
            except Exception as e:
                print(f"Failed to send stop message: {e}")
    
    async def _collect_node_status(self):
        """Collect status from all nodes"""
        message = {
            "type": "status",
            "timestamp": datetime.now().isoformat()
        }
        
        for node_id, websocket in self.coordinator_node.websocket_clients.items():
            try:
                await websocket.send(json.dumps(message))
            except Exception as e:
                print(f"Failed to collect status from node {node_id}: {e}")
    
    async def _collect_final_results(self):
        """Collect final results from all nodes"""
        print("Collecting final results from all nodes")
        
        all_results = {}
        
        # Get coordinator results
        if self.coordinator_node:
            all_results[self.coordinator_config.node_id] = self.coordinator_node.get_results()
        
        # Get other node results
        for node_id, node in self.nodes.items():
            all_results[node_id] = node.get_results()
        
        # Aggregate results
        aggregated_results = self._aggregate_results(all_results)
        
        # Save results
        await self._save_results(aggregated_results)
        
        return aggregated_results
    
    def _aggregate_results(self, node_results: Dict[str, Dict[str, Any]]) -> Dict[str, Any]:
        """Aggregate results from all nodes"""
        if not node_results:
            return {}
        
        # Aggregate metrics
        total_requests = sum(r.get("total_requests", 0) for r in node_results.values())
        all_response_times = []
        
        for result in node_results.values():
            # Add response times (simplified - in real implementation, you'd collect all individual times)
            avg_time = result.get("avg_response_time", 0)
            total_requests_node = result.get("total_requests", 0)
            all_response_times.extend([avg_time] * total_requests_node)
        
        if all_response_times:
            all_response_times.sort()
            p50_response_time = all_response_times[len(all_response_times) // 2]
            p95_response_time = all_response_times[int(len(all_response_times) * 0.95)]
            p99_response_time = all_response_times[int(len(all_response_times) * 0.99)]
            avg_response_time = sum(all_response_times) / len(all_response_times)
        else:
            p50_response_time = p95_response_time = p99_response_time = avg_response_time = 0
        
        # Calculate throughput
        total_duration = max(r.get("duration", 0) for r in node_results.values())
        throughput = total_requests / total_duration if total_duration > 0 else 0
        
        return {
            "total_requests": total_requests,
            "avg_response_time": avg_response_time,
            "p50_response_time": p50_response_time,
            "p95_response_time": p95_response_time,
            "p99_response_time": p99_response_time,
            "throughput": throughput,
            "node_results": node_results,
            "test_duration": total_duration,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _save_results(self, results: Dict[str, Any]):
        """Save test results to file"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"distributed_load_test_results_{timestamp}.json"
        
        with open(filename, "w") as f:
            json.dump(results, f, indent=2, default=str)
        
        print(f"Results saved to {filename}")


async def main():
    """Main function for distributed load testing"""
    # Example configuration
    nodes = [
        NodeConfig("coordinator", "localhost", 8001, 100, is_coordinator=True),
        NodeConfig("node1", "localhost", 8002, 200),
        NodeConfig("node2", "localhost", 8003, 200),
        NodeConfig("node3", "localhost", 8004, 200),
    ]
    
    # Get scenario
    from load_test_scenarios import LoadTestScenarios
    scenario = LoadTestScenarios.peak_hour_scenario()
    
    config = DistributedTestConfig(
        base_url="http://localhost:8000",
        nodes=nodes,
        scenario=scenario,
        sync_interval=1.0,
        timeout_seconds=30,
        max_memory_mb=512
    )
    
    coordinator = DistributedLoadTestCoordinator(config)
    
    try:
        await coordinator.start()
    except KeyboardInterrupt:
        print("Interrupted by user")
    finally:
        await coordinator.stop()


if __name__ == "__main__":
    import random
    asyncio.run(main())
