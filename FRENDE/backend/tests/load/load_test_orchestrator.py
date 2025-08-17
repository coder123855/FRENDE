#!/usr/bin/env python3
"""
Load test orchestrator for Frende application
Manages test execution, monitoring, and reporting
"""

import asyncio
import time
import json
import yaml
import argparse
import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path
import signal
import sys

from load_test import LoadTestConfig, LoadTestRunner
from load_test_scenarios import LoadTestScenarios, ScenarioRunner, LoadTestScenario
from distributed_load_test import DistributedLoadTestCoordinator, DistributedTestConfig, NodeConfig
from load_test_monitor import LoadTestMonitor
from load_test_reporter import LoadTestReporter


@dataclass
class OrchestratorConfig:
    """Configuration for the load test orchestrator"""
    base_url: str
    test_mode: str  # "single", "scenario", "distributed"
    output_dir: str
    log_level: str = "INFO"
    parallel_tests: int = 1
    retry_failed: bool = True
    max_retries: int = 3
    cleanup_after_test: bool = True


class LoadTestOrchestrator:
    """Orchestrates load test execution and monitoring"""
    
    def __init__(self, config: OrchestratorConfig):
        self.config = config
        self.monitor = LoadTestMonitor()
        self.reporter = LoadTestReporter(config.output_dir)
        self.test_results: List[Dict[str, Any]] = []
        self.is_running = False
        
        # Setup logging
        self._setup_logging()
        
        # Setup signal handlers
        self._setup_signal_handlers()
    
    def _setup_logging(self):
        """Setup logging configuration"""
        logging.basicConfig(
            level=getattr(logging, self.config.log_level),
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(f"{self.config.output_dir}/orchestrator.log"),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger(__name__)
    
    def _setup_signal_handlers(self):
        """Setup signal handlers for graceful shutdown"""
        def signal_handler(signum, frame):
            self.logger.info(f"Received signal {signum}, shutting down gracefully...")
            self.is_running = False
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
    
    async def run_single_test(self, test_config: LoadTestConfig) -> Dict[str, Any]:
        """Run a single load test"""
        self.logger.info(f"Starting single load test with {test_config.concurrent_users} users")
        
        # Start monitoring
        await self.monitor.start()
        
        try:
            # Run the test
            runner = LoadTestRunner(test_config)
            result = await runner.run_load_test()
            
            # Get monitoring data
            monitoring_data = await self.monitor.get_data()
            
            # Combine results
            full_result = {
                "test_type": "single",
                "config": asdict(test_config),
                "result": result,
                "monitoring": monitoring_data,
                "timestamp": datetime.now().isoformat(),
                "duration": result.get("duration", 0)
            }
            
            self.test_results.append(full_result)
            
            # Generate report
            await self.reporter.generate_single_test_report(full_result)
            
            return full_result
            
        finally:
            await self.monitor.stop()
    
    async def run_scenario_test(self, scenario_name: str) -> Dict[str, Any]:
        """Run a specific scenario test"""
        self.logger.info(f"Starting scenario test: {scenario_name}")
        
        # Get scenario
        scenarios = LoadTestScenarios.get_scenarios()
        scenario = next((s for s in scenarios if s.name == scenario_name), None)
        
        if not scenario:
            raise ValueError(f"Scenario '{scenario_name}' not found")
        
        # Create base config
        base_config = LoadTestConfig(
            base_url=self.config.base_url,
            concurrent_users=scenario.max_concurrent_users,
            duration_seconds=scenario.duration_minutes * 60,
            ramp_up_seconds=scenario.ramp_up_minutes * 60,
            ramp_down_seconds=scenario.ramp_down_minutes * 60,
            user_behavior=scenario.user_behavior,
            timeout_seconds=30,
            max_memory_mb=512
        )
        
        # Run scenario
        scenario_runner = ScenarioRunner(base_config)
        result = await scenario_runner.run_scenario(scenario_name)
        
        # Add monitoring data
        await self.monitor.start()
        monitoring_data = await self.monitor.get_data()
        await self.monitor.stop()
        
        full_result = {
            "test_type": "scenario",
            "scenario": asdict(scenario),
            "result": result,
            "monitoring": monitoring_data,
            "timestamp": datetime.now().isoformat()
        }
        
        self.test_results.append(full_result)
        
        # Generate report
        await self.reporter.generate_scenario_report(full_result)
        
        return full_result
    
    async def run_all_scenarios(self) -> Dict[str, Dict[str, Any]]:
        """Run all available scenarios"""
        self.logger.info("Starting all scenario tests")
        
        base_config = LoadTestConfig(
            base_url=self.config.base_url,
            concurrent_users=100,
            duration_seconds=300,
            ramp_up_seconds=60,
            ramp_down_seconds=60,
            user_behavior=None,  # Will be set by scenarios
            timeout_seconds=30,
            max_memory_mb=512
        )
        
        scenario_runner = ScenarioRunner(base_config)
        results = await scenario_runner.run_all_scenarios()
        
        # Add monitoring data to each result
        for scenario_name, result in results.items():
            await self.monitor.start()
            monitoring_data = await self.monitor.get_data()
            await self.monitor.stop()
            
            result["monitoring"] = monitoring_data
            result["timestamp"] = datetime.now().isoformat()
            self.test_results.append(result)
        
        # Generate comprehensive report
        await self.reporter.generate_comprehensive_report(results)
        
        return results
    
    async def run_distributed_test(self, distributed_config: DistributedTestConfig) -> Dict[str, Any]:
        """Run distributed load test"""
        self.logger.info(f"Starting distributed load test with {len(distributed_config.nodes)} nodes")
        
        # Start monitoring
        await self.monitor.start()
        
        try:
            # Run distributed test
            coordinator = DistributedLoadTestCoordinator(distributed_config)
            result = await coordinator.start()
            
            # Get monitoring data
            monitoring_data = await self.monitor.get_data()
            
            full_result = {
                "test_type": "distributed",
                "config": asdict(distributed_config),
                "result": result,
                "monitoring": monitoring_data,
                "timestamp": datetime.now().isoformat()
            }
            
            self.test_results.append(full_result)
            
            # Generate report
            await self.reporter.generate_distributed_report(full_result)
            
            return full_result
            
        finally:
            await self.monitor.stop()
    
    async def run_parallel_tests(self, test_configs: List[LoadTestConfig]) -> List[Dict[str, Any]]:
        """Run multiple tests in parallel"""
        self.logger.info(f"Starting {len(test_configs)} parallel tests")
        
        # Limit parallel tests
        semaphore = asyncio.Semaphore(self.config.parallel_tests)
        
        async def run_test_with_semaphore(config: LoadTestConfig) -> Dict[str, Any]:
            async with semaphore:
                return await self.run_single_test(config)
        
        # Run tests in parallel
        tasks = [run_test_with_semaphore(config) for config in test_configs]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Filter out exceptions
        valid_results = [r for r in results if not isinstance(r, Exception)]
        failed_results = [r for r in results if isinstance(r, Exception)]
        
        if failed_results:
            self.logger.warning(f"{len(failed_results)} tests failed")
            for i, error in enumerate(failed_results):
                self.logger.error(f"Test {i} failed: {error}")
        
        return valid_results
    
    async def run_test_suite(self, suite_config: Dict[str, Any]) -> Dict[str, Any]:
        """Run a complete test suite"""
        self.logger.info("Starting test suite execution")
        
        suite_results = {
            "suite_name": suite_config.get("name", "default"),
            "start_time": datetime.now().isoformat(),
            "tests": []
        }
        
        self.is_running = True
        
        try:
            # Run different types of tests based on suite configuration
            if "single_tests" in suite_config:
                for test_config_dict in suite_config["single_tests"]:
                    test_config = LoadTestConfig(**test_config_dict)
                    result = await self.run_single_test(test_config)
                    suite_results["tests"].append(result)
            
            if "scenarios" in suite_config:
                for scenario_name in suite_config["scenarios"]:
                    result = await self.run_scenario_test(scenario_name)
                    suite_results["tests"].append(result)
            
            if "distributed_tests" in suite_config:
                for dist_config_dict in suite_config["distributed_tests"]:
                    # Convert dict to DistributedTestConfig
                    dist_config = self._create_distributed_config(dist_config_dict)
                    result = await self.run_distributed_test(dist_config)
                    suite_results["tests"].append(result)
            
            suite_results["end_time"] = datetime.now().isoformat()
            suite_results["total_tests"] = len(suite_results["tests"])
            suite_results["passed_tests"] = sum(1 for t in suite_results["tests"] if t.get("passed", False))
            
            # Generate suite report
            await self.reporter.generate_suite_report(suite_results)
            
            return suite_results
            
        finally:
            self.is_running = False
    
    def _create_distributed_config(self, config_dict: Dict[str, Any]) -> DistributedTestConfig:
        """Create DistributedTestConfig from dictionary"""
        # This is a simplified version - you'd need to handle all the nested objects
        nodes = []
        for node_dict in config_dict.get("nodes", []):
            node = NodeConfig(**node_dict)
            nodes.append(node)
        
        # Get scenario
        scenario_name = config_dict.get("scenario_name")
        scenarios = LoadTestScenarios.get_scenarios()
        scenario = next((s for s in scenarios if s.name == scenario_name), None)
        
        if not scenario:
            raise ValueError(f"Scenario '{scenario_name}' not found")
        
        return DistributedTestConfig(
            base_url=config_dict.get("base_url"),
            nodes=nodes,
            scenario=scenario,
            sync_interval=config_dict.get("sync_interval", 1.0),
            timeout_seconds=config_dict.get("timeout_seconds", 30),
            max_memory_mb=config_dict.get("max_memory_mb", 512)
        )
    
    async def cleanup(self):
        """Cleanup after tests"""
        if self.config.cleanup_after_test:
            self.logger.info("Cleaning up test artifacts")
            # Add cleanup logic here (e.g., remove temporary files, reset database state)
    
    async def generate_final_report(self):
        """Generate final comprehensive report"""
        self.logger.info("Generating final comprehensive report")
        
        final_report = {
            "orchestrator_config": asdict(self.config),
            "total_tests": len(self.test_results),
            "start_time": min(t.get("timestamp") for t in self.test_results) if self.test_results else None,
            "end_time": max(t.get("timestamp") for t in self.test_results) if self.test_results else None,
            "test_results": self.test_results,
            "summary": self._generate_summary()
        }
        
        await self.reporter.generate_final_report(final_report)
        return final_report
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate summary of all test results"""
        if not self.test_results:
            return {}
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for t in self.test_results if t.get("passed", False))
        
        # Aggregate performance metrics
        all_response_times = []
        all_throughputs = []
        all_error_rates = []
        
        for result in self.test_results:
            if "result" in result and "response_time_p95" in result["result"]:
                all_response_times.append(result["result"]["response_time_p95"])
            if "result" in result and "throughput" in result["result"]:
                all_throughputs.append(result["result"]["throughput"])
            if "result" in result and "error_rate" in result["result"]:
                all_error_rates.append(result["result"]["error_rate"])
        
        return {
            "total_tests": total_tests,
            "passed_tests": passed_tests,
            "failed_tests": total_tests - passed_tests,
            "success_rate": passed_tests / total_tests if total_tests > 0 else 0,
            "avg_response_time_p95": sum(all_response_times) / len(all_response_times) if all_response_times else 0,
            "avg_throughput": sum(all_throughputs) / len(all_throughputs) if all_throughputs else 0,
            "avg_error_rate": sum(all_error_rates) / len(all_error_rates) if all_error_rates else 0,
            "best_performing_test": min(self.test_results, key=lambda x: x.get("result", {}).get("response_time_p95", float('inf'))),
            "worst_performing_test": max(self.test_results, key=lambda x: x.get("result", {}).get("response_time_p95", 0))
        }


def load_config_from_file(config_path: str) -> Dict[str, Any]:
    """Load configuration from YAML file"""
    with open(config_path, 'r') as f:
        return yaml.safe_load(f)


async def main():
    """Main function for the orchestrator"""
    parser = argparse.ArgumentParser(description="Load Test Orchestrator")
    parser.add_argument("--config", "-c", help="Configuration file path")
    parser.add_argument("--base-url", help="Base URL for the application")
    parser.add_argument("--mode", choices=["single", "scenario", "distributed", "suite"], 
                       default="scenario", help="Test mode")
    parser.add_argument("--scenario", help="Scenario name to run")
    parser.add_argument("--output-dir", default="./load_test_results", help="Output directory")
    parser.add_argument("--log-level", default="INFO", help="Log level")
    
    args = parser.parse_args()
    
    # Load configuration
    if args.config:
        config_dict = load_config_from_file(args.config)
    else:
        config_dict = {
            "base_url": args.base_url or "http://localhost:8000",
            "test_mode": args.mode,
            "output_dir": args.output_dir,
            "log_level": args.log_level
        }
    
    # Create orchestrator
    orchestrator_config = OrchestratorConfig(**config_dict)
    orchestrator = LoadTestOrchestrator(orchestrator_config)
    
    try:
        if args.mode == "single":
            # Run single test
            test_config = LoadTestConfig(
                base_url=orchestrator_config.base_url,
                concurrent_users=100,
                duration_seconds=300,
                ramp_up_seconds=60,
                ramp_down_seconds=60,
                user_behavior=None,
                timeout_seconds=30,
                max_memory_mb=512
            )
            await orchestrator.run_single_test(test_config)
            
        elif args.mode == "scenario":
            if args.scenario:
                # Run specific scenario
                await orchestrator.run_scenario_test(args.scenario)
            else:
                # Run all scenarios
                await orchestrator.run_all_scenarios()
                
        elif args.mode == "distributed":
            # Run distributed test
            nodes = [
                NodeConfig("coordinator", "localhost", 8001, 100, is_coordinator=True),
                NodeConfig("node1", "localhost", 8002, 200),
                NodeConfig("node2", "localhost", 8003, 200),
            ]
            
            from load_test_scenarios import LoadTestScenarios
            scenario = LoadTestScenarios.peak_hour_scenario()
            
            dist_config = DistributedTestConfig(
                base_url=orchestrator_config.base_url,
                nodes=nodes,
                scenario=scenario
            )
            
            await orchestrator.run_distributed_test(dist_config)
            
        elif args.mode == "suite":
            # Run test suite
            suite_config = config_dict.get("suite", {})
            await orchestrator.run_test_suite(suite_config)
        
        # Generate final report
        await orchestrator.generate_final_report()
        
    except KeyboardInterrupt:
        print("Interrupted by user")
    except Exception as e:
        logging.error(f"Error during test execution: {e}")
        raise
    finally:
        await orchestrator.cleanup()


if __name__ == "__main__":
    asyncio.run(main())
