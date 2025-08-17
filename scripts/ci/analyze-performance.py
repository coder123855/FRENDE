#!/usr/bin/env python3
"""
Performance test results analyzer for CI/CD pipeline
Generates HTML reports from performance test data
"""
import json
import os
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List

def load_json_file(file_path: str) -> Dict[str, Any]:
    """Load JSON file safely"""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def analyze_backend_performance() -> Dict[str, Any]:
    """Analyze backend performance test results"""
    results = {
        'api_response_times': [],
        'database_performance': [],
        'websocket_performance': [],
        'memory_usage': [],
        'cpu_usage': []
    }
    
    # Look for pytest benchmark results
    benchmark_dir = Path('.pytest_cache')
    if benchmark_dir.exists():
        for file in benchmark_dir.rglob('*.json'):
            data = load_json_file(str(file))
            if 'stats' in data:
                results['api_response_times'].append({
                    'test': data.get('name', 'Unknown'),
                    'mean': data['stats'].get('mean', 0),
                    'stddev': data['stats'].get('stddev', 0),
                    'min': data['stats'].get('min', 0),
                    'max': data['stats'].get('max', 0)
                })
    
    # Look for load test results
    load_test_dir = Path('load_test_results')
    if load_test_dir.exists():
        for file in load_test_dir.rglob('*.json'):
            data = load_json_file(str(file))
            if 'metrics' in data:
                results['api_response_times'].extend(data['metrics'].get('response_times', []))
                results['memory_usage'].extend(data['metrics'].get('memory_usage', []))
                results['cpu_usage'].extend(data['metrics'].get('cpu_usage', []))
    
    return results

def analyze_frontend_performance() -> Dict[str, Any]:
    """Analyze frontend performance test results"""
    results = {
        'render_times': [],
        'memory_usage': [],
        'bundle_size': [],
        'load_times': []
    }
    
    # Look for frontend performance results
    perf_dir = Path('performance-results')
    if perf_dir.exists():
        for file in perf_dir.rglob('*.json'):
            data = load_json_file(str(file))
            if 'render_times' in data:
                results['render_times'].extend(data['render_times'])
            if 'memory_usage' in data:
                results['memory_usage'].extend(data['memory_usage'])
            if 'bundle_size' in data:
                results['bundle_size'].append(data['bundle_size'])
    
    return results

def generate_html_report(backend_results: Dict[str, Any], frontend_results: Dict[str, Any]) -> str:
    """Generate HTML performance report"""
    html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Performance Test Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ background: #f5f5f5; padding: 20px; border-radius: 5px; }}
        .section {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }}
        .metric {{ display: inline-block; margin: 10px; padding: 10px; background: #f9f9f9; border-radius: 3px; }}
        .success {{ color: green; }}
        .warning {{ color: orange; }}
        .error {{ color: red; }}
        table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Performance Test Report</h1>
        <p>Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
    </div>
    
    <div class="section">
        <h2>Summary</h2>
        <div class="metric">
            <strong>Backend Tests:</strong> {len(backend_results['api_response_times'])} metrics
        </div>
        <div class="metric">
            <strong>Frontend Tests:</strong> {len(frontend_results['render_times'])} metrics
        </div>
    </div>
    
    <div class="section">
        <h2>Backend Performance</h2>
        <h3>API Response Times</h3>
        <table>
            <tr>
                <th>Test</th>
                <th>Mean (ms)</th>
                <th>Std Dev</th>
                <th>Min (ms)</th>
                <th>Max (ms)</th>
                <th>Status</th>
            </tr>
    """
    
    for test in backend_results['api_response_times'][:10]:  # Show top 10
        mean_ms = test['mean'] * 1000
        status_class = 'success' if mean_ms < 100 else 'warning' if mean_ms < 500 else 'error'
        status_text = 'Good' if mean_ms < 100 else 'Acceptable' if mean_ms < 500 else 'Slow'
        
        html += f"""
            <tr>
                <td>{test['test']}</td>
                <td>{mean_ms:.2f}</td>
                <td>{test['stddev'] * 1000:.2f}</td>
                <td>{test['min'] * 1000:.2f}</td>
                <td>{test['max'] * 1000:.2f}</td>
                <td class="{status_class}">{status_text}</td>
            </tr>
        """
    
    html += """
        </table>
    </div>
    
    <div class="section">
        <h2>Frontend Performance</h2>
        <h3>Render Times</h3>
    """
    
    if frontend_results['render_times']:
        avg_render = sum(frontend_results['render_times']) / len(frontend_results['render_times'])
        status_class = 'success' if avg_render < 16 else 'warning' if avg_render < 33 else 'error'
        status_text = 'Good' if avg_render < 16 else 'Acceptable' if avg_render < 33 else 'Slow'
        
        html += f"""
        <div class="metric">
            <strong>Average Render Time:</strong> <span class="{status_class}">{avg_render:.2f}ms ({status_text})</span>
        </div>
        """
    
    if frontend_results['bundle_size']:
        avg_bundle = sum(frontend_results['bundle_size']) / len(frontend_results['bundle_size'])
        status_class = 'success' if avg_bundle < 500 else 'warning' if avg_bundle < 1000 else 'error'
        status_text = 'Good' if avg_bundle < 500 else 'Acceptable' if avg_bundle < 1000 else 'Large'
        
        html += f"""
        <div class="metric">
            <strong>Average Bundle Size:</strong> <span class="{status_class}">{avg_bundle:.0f}KB ({status_text})</span>
        </div>
        """
    
    html += """
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            <li>Monitor API response times and optimize slow endpoints</li>
            <li>Consider implementing caching for frequently accessed data</li>
            <li>Optimize database queries and add indexes where needed</li>
            <li>Implement code splitting to reduce frontend bundle size</li>
            <li>Use lazy loading for images and non-critical components</li>
        </ul>
    </div>
</body>
</html>
    """
    
    return html

def main():
    """Main function"""
    print("Analyzing performance test results...")
    
    # Analyze results
    backend_results = analyze_backend_performance()
    frontend_results = analyze_frontend_performance()
    
    # Generate report
    html_report = generate_html_report(backend_results, frontend_results)
    
    # Write report
    with open('performance-report.html', 'w') as f:
        f.write(html_report)
    
    print("Performance report generated: performance-report.html")
    
    # Print summary to console
    print(f"\nBackend API tests: {len(backend_results['api_response_times'])}")
    print(f"Frontend render tests: {len(frontend_results['render_times'])}")
    
    if backend_results['api_response_times']:
        avg_response = sum(t['mean'] for t in backend_results['api_response_times']) / len(backend_results['api_response_times'])
        print(f"Average API response time: {avg_response * 1000:.2f}ms")
    
    if frontend_results['render_times']:
        avg_render = sum(frontend_results['render_times']) / len(frontend_results['render_times'])
        print(f"Average render time: {avg_render:.2f}ms")

if __name__ == "__main__":
    main()
