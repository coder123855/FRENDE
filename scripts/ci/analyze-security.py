#!/usr/bin/env python3
"""
Security test results analyzer for CI/CD pipeline
Generates HTML reports from security test data
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

def analyze_security_reports() -> Dict[str, Any]:
    """Analyze security test reports"""
    results = {
        'bandit_issues': [],
        'safety_issues': [],
        'pip_audit_issues': [],
        'semgrep_issues': [],
        'test_results': {
            'passed': 0,
            'failed': 0,
            'total': 0
        }
    }
    
    # Analyze Bandit results
    bandit_file = Path('bandit-report.json')
    if bandit_file.exists():
        data = load_json_file('bandit-report.json')
        if 'results' in data:
            results['bandit_issues'] = data['results']
    
    # Analyze Safety results
    safety_file = Path('safety-report.json')
    if safety_file.exists():
        data = load_json_file('safety-report.json')
        if 'vulnerabilities' in data:
            results['safety_issues'] = data['vulnerabilities']
    
    # Analyze pip-audit results
    pip_audit_file = Path('pip-audit-report.json')
    if pip_audit_file.exists():
        data = load_json_file('pip-audit-report.json')
        if 'vulnerabilities' in data:
            results['pip_audit_issues'] = data['vulnerabilities']
    
    # Analyze Semgrep results
    semgrep_file = Path('semgrep-report.json')
    if semgrep_file.exists():
        data = load_json_file('semgrep-report.json')
        if 'results' in data:
            results['semgrep_issues'] = data['results']
    
    return results

def get_severity_level(issue: Dict[str, Any]) -> str:
    """Get severity level from security issue"""
    severity = issue.get('severity', 'medium').lower()
    if severity in ['high', 'critical']:
        return 'high'
    elif severity in ['medium', 'moderate']:
        return 'medium'
    else:
        return 'low'

def generate_html_report(results: Dict[str, Any]) -> str:
    """Generate HTML security report"""
    
    # Count issues by severity
    high_issues = 0
    medium_issues = 0
    low_issues = 0
    
    for issue in results['bandit_issues']:
        if get_severity_level(issue) == 'high':
            high_issues += 1
        elif get_severity_level(issue) == 'medium':
            medium_issues += 1
        else:
            low_issues += 1
    
    for issue in results['safety_issues']:
        if get_severity_level(issue) == 'high':
            high_issues += 1
        elif get_severity_level(issue) == 'medium':
            medium_issues += 1
        else:
            low_issues += 1
    
    for issue in results['pip_audit_issues']:
        if get_severity_level(issue) == 'high':
            high_issues += 1
        elif get_severity_level(issue) == 'medium':
            medium_issues += 1
        else:
            low_issues += 1
    
    for issue in results['semgrep_issues']:
        if get_severity_level(issue) == 'high':
            high_issues += 1
        elif get_severity_level(issue) == 'medium':
            medium_issues += 1
        else:
            low_issues += 1
    
    total_issues = high_issues + medium_issues + low_issues
    
    # Determine overall status
    if high_issues > 0:
        overall_status = 'Critical'
        status_class = 'error'
    elif medium_issues > 5:
        overall_status = 'Warning'
        status_class = 'warning'
    else:
        overall_status = 'Good'
        status_class = 'success'
    
    html = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Security Test Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; }}
        .header {{ background: #f5f5f5; padding: 20px; border-radius: 5px; }}
        .section {{ margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }}
        .metric {{ display: inline-block; margin: 10px; padding: 10px; background: #f9f9f9; border-radius: 3px; }}
        .success {{ color: green; }}
        .warning {{ color: orange; }}
        .error {{ color: red; }}
        .high {{ background-color: #ffebee; border-left: 4px solid #f44336; }}
        .medium {{ background-color: #fff3e0; border-left: 4px solid #ff9800; }}
        .low {{ background-color: #e8f5e8; border-left: 4px solid #4caf50; }}
        table {{ width: 100%; border-collapse: collapse; margin: 10px 0; }}
        th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
        th {{ background-color: #f2f2f2; }}
        .issue {{ margin: 10px 0; padding: 10px; border-radius: 3px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>Security Test Report</h1>
        <p>Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</p>
        <div class="metric">
            <strong>Overall Status:</strong> <span class="{status_class}">{overall_status}</span>
        </div>
    </div>
    
    <div class="section">
        <h2>Summary</h2>
        <div class="metric">
            <strong>Total Issues:</strong> {total_issues}
        </div>
        <div class="metric">
            <strong>High Severity:</strong> <span class="error">{high_issues}</span>
        </div>
        <div class="metric">
            <strong>Medium Severity:</strong> <span class="warning">{medium_issues}</span>
        </div>
        <div class="metric">
            <strong>Low Severity:</strong> <span class="success">{low_issues}</span>
        </div>
    </div>
    
    <div class="section">
        <h2>Static Analysis Results</h2>
        
        <h3>Bandit Security Issues ({len(results['bandit_issues'])})</h3>
    """
    
    for issue in results['bandit_issues'][:10]:  # Show top 10
        severity = get_severity_level(issue)
        html += f"""
        <div class="issue {severity}">
            <strong>{issue.get('issue_text', 'Unknown Issue')}</strong><br>
            <strong>Severity:</strong> {issue.get('severity', 'Unknown')}<br>
            <strong>File:</strong> {issue.get('filename', 'Unknown')}:{issue.get('line_number', 'Unknown')}<br>
            <strong>Description:</strong> {issue.get('more_info', 'No description available')}
        </div>
        """
    
    html += f"""
        <h3>Dependency Vulnerabilities - Safety ({len(results['safety_issues'])})</h3>
    """
    
    for issue in results['safety_issues'][:10]:  # Show top 10
        severity = get_severity_level(issue)
        html += f"""
        <div class="issue {severity}">
            <strong>{issue.get('package', 'Unknown Package')}</strong><br>
            <strong>Version:</strong> {issue.get('installed_version', 'Unknown')}<br>
            <strong>Vulnerability:</strong> {issue.get('vulnerability_id', 'Unknown')}<br>
            <strong>Description:</strong> {issue.get('description', 'No description available')}
        </div>
        """
    
    html += f"""
        <h3>Dependency Vulnerabilities - pip-audit ({len(results['pip_audit_issues'])})</h3>
    """
    
    for issue in results['pip_audit_issues'][:10]:  # Show top 10
        severity = get_severity_level(issue)
        html += f"""
        <div class="issue {severity}">
            <strong>{issue.get('package', 'Unknown Package')}</strong><br>
            <strong>Version:</strong> {issue.get('installed_version', 'Unknown')}<br>
            <strong>Vulnerability:</strong> {issue.get('vulnerability_id', 'Unknown')}<br>
            <strong>Description:</strong> {issue.get('description', 'No description available')}
        </div>
        """
    
    html += f"""
        <h3>Semgrep Issues ({len(results['semgrep_issues'])})</h3>
    """
    
    for issue in results['semgrep_issues'][:10]:  # Show top 10
        severity = get_severity_level(issue)
        html += f"""
        <div class="issue {severity}">
            <strong>{issue.get('check_id', 'Unknown Check')}</strong><br>
            <strong>Severity:</strong> {issue.get('extra', {}).get('severity', 'Unknown')}<br>
            <strong>File:</strong> {issue.get('path', 'Unknown')}:{issue.get('start', {}).get('line', 'Unknown')}<br>
            <strong>Message:</strong> {issue.get('extra', {}).get('message', 'No message available')}
        </div>
        """
    
    html += """
    </div>
    
    <div class="section">
        <h2>Recommendations</h2>
        <ul>
            <li>Address all high severity issues immediately</li>
            <li>Update vulnerable dependencies to latest secure versions</li>
            <li>Review and fix code security issues identified by static analysis</li>
            <li>Implement security headers and CORS policies</li>
            <li>Regularly run security scans and update dependencies</li>
            <li>Consider implementing automated dependency vulnerability scanning</li>
        </ul>
    </div>
    
    <div class="section">
        <h2>Next Steps</h2>
        <ol>
            <li>Review high severity issues first</li>
            <li>Update vulnerable dependencies</li>
            <li>Fix code security issues</li>
            <li>Re-run security tests</li>
            <li>Document security improvements</li>
        </ol>
    </div>
</body>
</html>
    """
    
    return html

def main():
    """Main function"""
    print("Analyzing security test results...")
    
    # Analyze results
    results = analyze_security_reports()
    
    # Generate report
    html_report = generate_html_report(results)
    
    # Write report
    with open('security-analysis.html', 'w') as f:
        f.write(html_report)
    
    print("Security analysis report generated: security-analysis.html")
    
    # Print summary to console
    total_issues = len(results['bandit_issues']) + len(results['safety_issues']) + len(results['pip_audit_issues']) + len(results['semgrep_issues'])
    print(f"\nTotal security issues found: {total_issues}")
    print(f"Bandit issues: {len(results['bandit_issues'])}")
    print(f"Safety issues: {len(results['safety_issues'])}")
    print(f"pip-audit issues: {len(results['pip_audit_issues'])}")
    print(f"Semgrep issues: {len(results['semgrep_issues'])}")
    
    # Exit with error if high severity issues found
    high_issues = 0
    for issue in results['bandit_issues'] + results['safety_issues'] + results['pip_audit_issues'] + results['semgrep_issues']:
        if get_severity_level(issue) == 'high':
            high_issues += 1
    
    if high_issues > 0:
        print(f"\n❌ {high_issues} high severity issues found!")
        sys.exit(1)
    else:
        print("\n✅ No high severity issues found!")

if __name__ == "__main__":
    main()
