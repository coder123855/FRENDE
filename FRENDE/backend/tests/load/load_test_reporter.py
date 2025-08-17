#!/usr/bin/env python3
"""
Load test reporter for Frende application
Generates comprehensive reports and visualizations from load test results
"""

import json
import os
import time
from typing import List, Dict, Any, Optional
from dataclasses import asdict
from datetime import datetime, timedelta
from pathlib import Path
import logging

try:
    import matplotlib.pyplot as plt
    import matplotlib.dates as mdates
    import seaborn as sns
    import pandas as pd
    import numpy as np
    PLOTTING_AVAILABLE = True
except ImportError:
    PLOTTING_AVAILABLE = False
    logging.warning("Matplotlib/Seaborn not available. Plots will not be generated.")


class LoadTestReporter:
    """Generates comprehensive load test reports"""
    
    def __init__(self, output_dir: str):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.logger = logging.getLogger(__name__)
        
        # Create subdirectories
        self.reports_dir = self.output_dir / "reports"
        self.plots_dir = self.output_dir / "plots"
        self.data_dir = self.output_dir / "data"
        
        for dir_path in [self.reports_dir, self.plots_dir, self.data_dir]:
            dir_path.mkdir(exist_ok=True)
    
    async def generate_single_test_report(self, test_result: Dict[str, Any]):
        """Generate report for a single load test"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save raw data
        data_file = self.data_dir / f"single_test_{timestamp}.json"
        with open(data_file, 'w') as f:
            json.dump(test_result, f, indent=2, default=str)
        
        # Generate report
        report = self._create_single_test_report(test_result)
        report_file = self.reports_dir / f"single_test_report_{timestamp}.html"
        self._save_html_report(report, report_file)
        
        # Generate plots if available
        if PLOTTING_AVAILABLE:
            await self._generate_single_test_plots(test_result, timestamp)
        
        self.logger.info(f"Single test report generated: {report_file}")
        return report_file
    
    async def generate_scenario_report(self, scenario_result: Dict[str, Any]):
        """Generate report for a scenario test"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        scenario_name = scenario_result.get("scenario", {}).get("name", "unknown")
        
        # Save raw data
        data_file = self.data_dir / f"scenario_{scenario_name}_{timestamp}.json"
        with open(data_file, 'w') as f:
            json.dump(scenario_result, f, indent=2, default=str)
        
        # Generate report
        report = self._create_scenario_report(scenario_result)
        report_file = self.reports_dir / f"scenario_{scenario_name}_report_{timestamp}.html"
        self._save_html_report(report, report_file)
        
        # Generate plots if available
        if PLOTTING_AVAILABLE:
            await self._generate_scenario_plots(scenario_result, timestamp)
        
        self.logger.info(f"Scenario report generated: {report_file}")
        return report_file
    
    async def generate_comprehensive_report(self, all_results: Dict[str, Dict[str, Any]]):
        """Generate comprehensive report for all scenarios"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save raw data
        data_file = self.data_dir / f"comprehensive_{timestamp}.json"
        with open(data_file, 'w') as f:
            json.dump(all_results, f, indent=2, default=str)
        
        # Generate report
        report = self._create_comprehensive_report(all_results)
        report_file = self.reports_dir / f"comprehensive_report_{timestamp}.html"
        self._save_html_report(report, report_file)
        
        # Generate plots if available
        if PLOTTING_AVAILABLE:
            await self._generate_comprehensive_plots(all_results, timestamp)
        
        self.logger.info(f"Comprehensive report generated: {report_file}")
        return report_file
    
    async def generate_distributed_report(self, distributed_result: Dict[str, Any]):
        """Generate report for distributed load test"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save raw data
        data_file = self.data_dir / f"distributed_{timestamp}.json"
        with open(data_file, 'w') as f:
            json.dump(distributed_result, f, indent=2, default=str)
        
        # Generate report
        report = self._create_distributed_report(distributed_result)
        report_file = self.reports_dir / f"distributed_report_{timestamp}.html"
        self._save_html_report(report, report_file)
        
        # Generate plots if available
        if PLOTTING_AVAILABLE:
            await self._generate_distributed_plots(distributed_result, timestamp)
        
        self.logger.info(f"Distributed test report generated: {report_file}")
        return report_file
    
    async def generate_suite_report(self, suite_result: Dict[str, Any]):
        """Generate report for test suite"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        suite_name = suite_result.get("suite_name", "default")
        
        # Save raw data
        data_file = self.data_dir / f"suite_{suite_name}_{timestamp}.json"
        with open(data_file, 'w') as f:
            json.dump(suite_result, f, indent=2, default=str)
        
        # Generate report
        report = self._create_suite_report(suite_result)
        report_file = self.reports_dir / f"suite_{suite_name}_report_{timestamp}.html"
        self._save_html_report(report, report_file)
        
        self.logger.info(f"Test suite report generated: {report_file}")
        return report_file
    
    async def generate_final_report(self, final_result: Dict[str, Any]):
        """Generate final comprehensive report"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # Save raw data
        data_file = self.data_dir / f"final_{timestamp}.json"
        with open(data_file, 'w') as f:
            json.dump(final_result, f, indent=2, default=str)
        
        # Generate report
        report = self._create_final_report(final_result)
        report_file = self.reports_dir / f"final_report_{timestamp}.html"
        self._save_html_report(report, report_file)
        
        # Generate summary plots if available
        if PLOTTING_AVAILABLE:
            await self._generate_final_plots(final_result, timestamp)
        
        self.logger.info(f"Final report generated: {report_file}")
        return report_file
    
    def _create_single_test_report(self, test_result: Dict[str, Any]) -> str:
        """Create HTML report for single test"""
        result = test_result.get("result", {})
        config = test_result.get("config", {})
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Single Load Test Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
                .metric {{ margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }}
                .success {{ background-color: #d4edda; border-color: #c3e6cb; }}
                .warning {{ background-color: #fff3cd; border-color: #ffeaa7; }}
                .error {{ background-color: #f8d7da; border-color: #f5c6cb; }}
                table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Single Load Test Report</h1>
                <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
            
            <h2>Test Configuration</h2>
            <table>
                <tr><th>Parameter</th><th>Value</th></tr>
                <tr><td>Concurrent Users</td><td>{config.get('concurrent_users', 'N/A')}</td></tr>
                <tr><td>Duration</td><td>{config.get('duration_seconds', 'N/A')} seconds</td></tr>
                <tr><td>Ramp Up</td><td>{config.get('ramp_up_seconds', 'N/A')} seconds</td></tr>
                <tr><td>Ramp Down</td><td>{config.get('ramp_down_seconds', 'N/A')} seconds</td></tr>
            </table>
            
            <h2>Performance Metrics</h2>
            <div class="metric {'success' if result.get('response_time_p95', 0) <= 2000 else 'warning'}">
                <strong>Response Time (P95):</strong> {result.get('response_time_p95', 'N/A')} ms
            </div>
            <div class="metric {'success' if result.get('throughput', 0) >= 100 else 'warning'}">
                <strong>Throughput:</strong> {result.get('throughput', 'N/A')} requests/second
            </div>
            <div class="metric {'success' if result.get('error_rate', 0) <= 0.01 else 'error'}">
                <strong>Error Rate:</strong> {result.get('error_rate', 'N/A')} ({result.get('error_rate', 0) * 100:.2f}%)
            </div>
            <div class="metric">
                <strong>Total Requests:</strong> {result.get('total_requests', 'N/A')}
            </div>
            <div class="metric">
                <strong>Test Duration:</strong> {result.get('duration', 'N/A')} seconds
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _create_scenario_report(self, scenario_result: Dict[str, Any]) -> str:
        """Create HTML report for scenario test"""
        scenario = scenario_result.get("scenario", {})
        result = scenario_result.get("result", {})
        validation = result.get("validation", {})
        
        # Determine overall status
        passed = result.get("passed", False)
        status_class = "success" if passed else "error"
        status_text = "PASSED" if passed else "FAILED"
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Scenario Test Report - {scenario.get('name', 'Unknown')}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
                .status {{ padding: 10px; border-radius: 5px; font-weight: bold; text-align: center; }}
                .success {{ background-color: #d4edda; border-color: #c3e6cb; color: #155724; }}
                .error {{ background-color: #f8d7da; border-color: #f5c6cb; color: #721c24; }}
                .metric {{ margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }}
                table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Scenario Test Report</h1>
                <h2>{scenario.get('name', 'Unknown Scenario')}</h2>
                <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
            
            <div class="status {status_class}">
                <h2>Overall Status: {status_text}</h2>
            </div>
            
            <h3>Scenario Description</h3>
            <p>{scenario.get('description', 'No description available')}</p>
            
            <h3>Test Configuration</h3>
            <table>
                <tr><th>Parameter</th><th>Value</th></tr>
                <tr><td>Test Type</td><td>{scenario.get('test_type', 'N/A')}</td></tr>
                <tr><td>Duration</td><td>{scenario.get('duration_minutes', 'N/A')} minutes</td></tr>
                <tr><td>Max Concurrent Users</td><td>{scenario.get('max_concurrent_users', 'N/A')}</td></tr>
                <tr><td>Ramp Up</td><td>{scenario.get('ramp_up_minutes', 'N/A')} minutes</td></tr>
                <tr><td>Ramp Down</td><td>{scenario.get('ramp_down_minutes', 'N/A')} minutes</td></tr>
            </table>
            
            <h3>Success Criteria Validation</h3>
            <table>
                <tr><th>Criteria</th><th>Expected</th><th>Actual</th><th>Status</th></tr>
                <tr><td>Response Time (P95)</td><td>≤ {scenario.get('success_criteria', {}).get('response_time_p95', 'N/A')} ms</td><td>{result.get('result', {}).get('response_time_p95', 'N/A')} ms</td><td>{'✓' if validation.get('response_time', False) else '✗'}</td></tr>
                <tr><td>Throughput</td><td>≥ {scenario.get('success_criteria', {}).get('throughput', 'N/A')} req/s</td><td>{result.get('result', {}).get('throughput', 'N/A')} req/s</td><td>{'✓' if validation.get('throughput', False) else '✗'}</td></tr>
                <tr><td>Error Rate</td><td>≤ {scenario.get('success_criteria', {}).get('error_rate', 'N/A')}</td><td>{result.get('result', {}).get('error_rate', 'N/A')}</td><td>{'✓' if validation.get('error_rate', False) else '✗'}</td></tr>
            </table>
        </body>
        </html>
        """
        
        return html
    
    def _create_comprehensive_report(self, all_results: Dict[str, Dict[str, Any]]) -> str:
        """Create HTML report for comprehensive test results"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Comprehensive Load Test Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
                .scenario {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }}
                .success {{ border-left: 5px solid #28a745; }}
                .error {{ border-left: 5px solid #dc3545; }}
                table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Comprehensive Load Test Report</h1>
                <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p>Total Scenarios: {len(all_results)}</p>
            </div>
            
            <h2>Summary</h2>
            <table>
                <tr><th>Scenario</th><th>Status</th><th>Response Time (P95)</th><th>Throughput</th><th>Error Rate</th></tr>
        """
        
        for scenario_name, result in all_results.items():
            passed = result.get("passed", False)
            status_class = "success" if passed else "error"
            status_text = "PASSED" if passed else "FAILED"
            
            test_result = result.get("result", {})
            response_time = test_result.get("response_time_p95", "N/A")
            throughput = test_result.get("throughput", "N/A")
            error_rate = test_result.get("error_rate", "N/A")
            
            html += f"""
                <tr>
                    <td>{scenario_name}</td>
                    <td class="{status_class}">{status_text}</td>
                    <td>{response_time} ms</td>
                    <td>{throughput} req/s</td>
                    <td>{error_rate}</td>
                </tr>
            """
        
        html += """
            </table>
        </body>
        </html>
        """
        
        return html
    
    def _create_distributed_report(self, distributed_result: Dict[str, Any]) -> str:
        """Create HTML report for distributed test"""
        result = distributed_result.get("result", {})
        config = distributed_result.get("config", {})
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Distributed Load Test Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
                .metric {{ margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }}
                table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Distributed Load Test Report</h1>
                <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
            
            <h2>Configuration</h2>
            <p>Number of Nodes: {len(config.get('nodes', []))}</p>
            <p>Total Concurrent Users: {sum(node.get('max_concurrent_users', 0) for node in config.get('nodes', []))}</p>
            
            <h2>Aggregated Results</h2>
            <div class="metric">
                <strong>Total Requests:</strong> {result.get('total_requests', 'N/A')}
            </div>
            <div class="metric">
                <strong>Average Response Time:</strong> {result.get('avg_response_time', 'N/A')} ms
            </div>
            <div class="metric">
                <strong>P95 Response Time:</strong> {result.get('p95_response_time', 'N/A')} ms
            </div>
            <div class="metric">
                <strong>Throughput:</strong> {result.get('throughput', 'N/A')} requests/second
            </div>
            <div class="metric">
                <strong>Test Duration:</strong> {result.get('test_duration', 'N/A')} seconds
            </div>
            
            <h2>Node Results</h2>
            <table>
                <tr><th>Node</th><th>Requests</th><th>Avg Response Time</th><th>P95 Response Time</th></tr>
        """
        
        node_results = result.get("node_results", {})
        for node_id, node_result in node_results.items():
            html += f"""
                <tr>
                    <td>{node_id}</td>
                    <td>{node_result.get('total_requests', 'N/A')}</td>
                    <td>{node_result.get('avg_response_time', 'N/A')} ms</td>
                    <td>{node_result.get('p95_response_time', 'N/A')} ms</td>
                </tr>
            """
        
        html += """
            </table>
        </body>
        </html>
        """
        
        return html
    
    def _create_suite_report(self, suite_result: Dict[str, Any]) -> str:
        """Create HTML report for test suite"""
        tests = suite_result.get("tests", [])
        total_tests = suite_result.get("total_tests", 0)
        passed_tests = suite_result.get("passed_tests", 0)
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Test Suite Report - {suite_result.get('suite_name', 'Default')}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
                .test {{ margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }}
                .success {{ border-left: 5px solid #28a745; }}
                .error {{ border-left: 5px solid #dc3545; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Test Suite Report</h1>
                <h2>{suite_result.get('suite_name', 'Default Suite')}</h2>
                <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
                <p>Total Tests: {total_tests} | Passed: {passed_tests} | Failed: {total_tests - passed_tests}</p>
            </div>
            
            <h2>Test Results</h2>
        """
        
        for test in tests:
            test_type = test.get("test_type", "unknown")
            passed = test.get("passed", False)
            status_class = "success" if passed else "error"
            status_text = "PASSED" if passed else "FAILED"
            
            html += f"""
            <div class="test {status_class}">
                <h3>{test_type.title()} Test - {status_text}</h3>
                <p>Duration: {test.get('duration', 'N/A')} seconds</p>
            </div>
            """
        
        html += """
        </body>
        </html>
        """
        
        return html
    
    def _create_final_report(self, final_result: Dict[str, Any]) -> str:
        """Create HTML report for final comprehensive results"""
        summary = final_result.get("summary", {})
        total_tests = summary.get("total_tests", 0)
        passed_tests = summary.get("passed_tests", 0)
        success_rate = summary.get("success_rate", 0)
        
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <title>Final Load Test Report</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                .header {{ background-color: #f0f0f0; padding: 20px; border-radius: 5px; }}
                .summary {{ background-color: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; }}
                .metric {{ margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 3px; }}
                table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f2f2f2; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Final Load Test Report</h1>
                <p>Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
            </div>
            
            <div class="summary">
                <h2>Executive Summary</h2>
                <p><strong>Total Tests:</strong> {total_tests}</p>
                <p><strong>Passed Tests:</strong> {passed_tests}</p>
                <p><strong>Failed Tests:</strong> {total_tests - passed_tests}</p>
                <p><strong>Success Rate:</strong> {success_rate:.2%}</p>
            </div>
            
            <h2>Performance Summary</h2>
            <div class="metric">
                <strong>Average Response Time (P95):</strong> {summary.get('avg_response_time_p95', 'N/A')} ms
            </div>
            <div class="metric">
                <strong>Average Throughput:</strong> {summary.get('avg_throughput', 'N/A')} requests/second
            </div>
            <div class="metric">
                <strong>Average Error Rate:</strong> {summary.get('avg_error_rate', 'N/A')} ({summary.get('avg_error_rate', 0) * 100:.2f}%)
            </div>
        </body>
        </html>
        """
        
        return html
    
    def _save_html_report(self, html_content: str, file_path: Path):
        """Save HTML report to file"""
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
    
    async def _generate_single_test_plots(self, test_result: Dict[str, Any], timestamp: str):
        """Generate plots for single test"""
        if not PLOTTING_AVAILABLE:
            return
        
        monitoring = test_result.get("monitoring", {})
        if not monitoring:
            return
        
        # Create response time plot
        plt.figure(figsize=(12, 8))
        
        # System metrics over time
        system_metrics = monitoring.get("system_metrics", [])
        if system_metrics:
            timestamps = [m["timestamp"] for m in system_metrics]
            cpu_values = [m["cpu_percent"] for m in system_metrics]
            memory_values = [m["memory_percent"] for m in system_metrics]
            
            plt.subplot(2, 2, 1)
            plt.plot(timestamps, cpu_values, label='CPU %')
            plt.title('CPU Usage Over Time')
            plt.ylabel('CPU %')
            plt.xticks(rotation=45)
            plt.legend()
            
            plt.subplot(2, 2, 2)
            plt.plot(timestamps, memory_values, label='Memory %', color='orange')
            plt.title('Memory Usage Over Time')
            plt.ylabel('Memory %')
            plt.xticks(rotation=45)
            plt.legend()
        
        # Application metrics
        app_metrics = monitoring.get("application_metrics", [])
        if app_metrics:
            timestamps = [m["timestamp"] for m in app_metrics]
            response_times = [m["response_time_avg"] for m in app_metrics]
            error_rates = [m["error_rate"] * 100 for m in app_metrics]
            
            plt.subplot(2, 2, 3)
            plt.plot(timestamps, response_times, label='Avg Response Time', color='green')
            plt.title('Response Time Over Time')
            plt.ylabel('Response Time (ms)')
            plt.xticks(rotation=45)
            plt.legend()
            
            plt.subplot(2, 2, 4)
            plt.plot(timestamps, error_rates, label='Error Rate', color='red')
            plt.title('Error Rate Over Time')
            plt.ylabel('Error Rate (%)')
            plt.xticks(rotation=45)
            plt.legend()
        
        plt.tight_layout()
        plot_file = self.plots_dir / f"single_test_plots_{timestamp}.png"
        plt.savefig(plot_file, dpi=300, bbox_inches='tight')
        plt.close()
    
    async def _generate_scenario_plots(self, scenario_result: Dict[str, Any], timestamp: str):
        """Generate plots for scenario test"""
        if not PLOTTING_AVAILABLE:
            return
        
        # Similar to single test plots but with scenario-specific data
        await self._generate_single_test_plots(scenario_result, f"scenario_{timestamp}")
    
    async def _generate_comprehensive_plots(self, all_results: Dict[str, Dict[str, Any]], timestamp: str):
        """Generate plots for comprehensive results"""
        if not PLOTTING_AVAILABLE:
            return
        
        # Create comparison plots
        scenario_names = []
        response_times = []
        throughputs = []
        error_rates = []
        
        for scenario_name, result in all_results.items():
            scenario_names.append(scenario_name)
            test_result = result.get("result", {})
            response_times.append(test_result.get("response_time_p95", 0))
            throughputs.append(test_result.get("throughput", 0))
            error_rates.append(test_result.get("error_rate", 0) * 100)
        
        plt.figure(figsize=(15, 10))
        
        # Response time comparison
        plt.subplot(2, 2, 1)
        plt.bar(scenario_names, response_times, color='skyblue')
        plt.title('Response Time (P95) Comparison')
        plt.ylabel('Response Time (ms)')
        plt.xticks(rotation=45)
        
        # Throughput comparison
        plt.subplot(2, 2, 2)
        plt.bar(scenario_names, throughputs, color='lightgreen')
        plt.title('Throughput Comparison')
        plt.ylabel('Throughput (req/s)')
        plt.xticks(rotation=45)
        
        # Error rate comparison
        plt.subplot(2, 2, 3)
        plt.bar(scenario_names, error_rates, color='lightcoral')
        plt.title('Error Rate Comparison')
        plt.ylabel('Error Rate (%)')
        plt.xticks(rotation=45)
        
        # Success rate
        success_rates = [1 if result.get("passed", False) else 0 for result in all_results.values()]
        plt.subplot(2, 2, 4)
        plt.bar(scenario_names, success_rates, color=['green' if s else 'red' for s in success_rates])
        plt.title('Success Rate')
        plt.ylabel('Success Rate')
        plt.xticks(rotation=45)
        
        plt.tight_layout()
        plot_file = self.plots_dir / f"comprehensive_plots_{timestamp}.png"
        plt.savefig(plot_file, dpi=300, bbox_inches='tight')
        plt.close()
    
    async def _generate_distributed_plots(self, distributed_result: Dict[str, Any], timestamp: str):
        """Generate plots for distributed test"""
        if not PLOTTING_AVAILABLE:
            return
        
        result = distributed_result.get("result", {})
        node_results = result.get("node_results", {})
        
        if not node_results:
            return
        
        node_names = list(node_results.keys())
        response_times = [node_results[node].get("avg_response_time", 0) for node in node_names]
        throughputs = [node_results[node].get("total_requests", 0) / max(node_results[node].get("duration", 1), 1) for node in node_names]
        
        plt.figure(figsize=(12, 6))
        
        # Response time by node
        plt.subplot(1, 2, 1)
        plt.bar(node_names, response_times, color='skyblue')
        plt.title('Average Response Time by Node')
        plt.ylabel('Response Time (ms)')
        plt.xticks(rotation=45)
        
        # Throughput by node
        plt.subplot(1, 2, 2)
        plt.bar(node_names, throughputs, color='lightgreen')
        plt.title('Throughput by Node')
        plt.ylabel('Throughput (req/s)')
        plt.xticks(rotation=45)
        
        plt.tight_layout()
        plot_file = self.plots_dir / f"distributed_plots_{timestamp}.png"
        plt.savefig(plot_file, dpi=300, bbox_inches='tight')
        plt.close()
    
    async def _generate_final_plots(self, final_result: Dict[str, Any], timestamp: str):
        """Generate plots for final report"""
        if not PLOTTING_AVAILABLE:
            return
        
        # Generate summary plots for final report
        summary = final_result.get("summary", {})
        
        plt.figure(figsize=(10, 6))
        
        # Test results summary
        total_tests = summary.get("total_tests", 0)
        passed_tests = summary.get("passed_tests", 0)
        failed_tests = total_tests - passed_tests
        
        plt.subplot(1, 2, 1)
        plt.pie([passed_tests, failed_tests], labels=['Passed', 'Failed'], 
                colors=['lightgreen', 'lightcoral'], autopct='%1.1f%%')
        plt.title('Test Results Summary')
        
        # Performance metrics
        metrics = ['Avg Response Time', 'Avg Throughput', 'Avg Error Rate']
        values = [
            summary.get("avg_response_time_p95", 0),
            summary.get("avg_throughput", 0),
            summary.get("avg_error_rate", 0) * 100
        ]
        
        plt.subplot(1, 2, 2)
        plt.bar(metrics, values, color=['skyblue', 'lightgreen', 'lightcoral'])
        plt.title('Performance Metrics Summary')
        plt.ylabel('Value')
        plt.xticks(rotation=45)
        
        plt.tight_layout()
        plot_file = self.plots_dir / f"final_plots_{timestamp}.png"
        plt.savefig(plot_file, dpi=300, bbox_inches='tight')
        plt.close()


# Example usage
async def main():
    """Example usage of the reporter"""
    reporter = LoadTestReporter("./test_reports")
    
    # Example test result
    test_result = {
        "test_type": "single",
        "config": {
            "concurrent_users": 100,
            "duration_seconds": 300
        },
        "result": {
            "response_time_p95": 1500,
            "throughput": 120,
            "error_rate": 0.01,
            "total_requests": 36000,
            "duration": 300
        },
        "monitoring": {
            "system_metrics": [
                {"timestamp": "2024-01-01T10:00:00", "cpu_percent": 50, "memory_percent": 60},
                {"timestamp": "2024-01-01T10:01:00", "cpu_percent": 55, "memory_percent": 65}
            ]
        },
        "timestamp": "2024-01-01T10:05:00"
    }
    
    # Generate report
    report_file = await reporter.generate_single_test_report(test_result)
    print(f"Report generated: {report_file}")


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
