#!/usr/bin/env python3
"""
Security alerts checker for CI/CD pipeline
Checks for critical vulnerabilities and triggers alerts
"""
import json
import os
import sys
from pathlib import Path
from typing import Dict, Any, List

def load_json_file(file_path: str) -> Dict[str, Any]:
    """Load JSON file safely"""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}

def get_severity_level(issue: Dict[str, Any]) -> str:
    """Get severity level from security issue"""
    severity = issue.get('severity', 'medium').lower()
    if severity in ['high', 'critical']:
        return 'high'
    elif severity in ['medium', 'moderate']:
        return 'medium'
    else:
        return 'low'

def check_critical_vulnerabilities() -> Dict[str, Any]:
    """Check for critical security vulnerabilities"""
    critical_issues = []
    high_issues = []
    medium_issues = []
    
    # Check Bandit results
    bandit_file = Path('bandit-report.json')
    if bandit_file.exists():
        data = load_json_file('bandit-report.json')
        if 'results' in data:
            for issue in data['results']:
                severity = get_severity_level(issue)
                if severity == 'high':
                    high_issues.append({
                        'tool': 'Bandit',
                        'issue': issue.get('issue_text', 'Unknown'),
                        'file': issue.get('filename', 'Unknown'),
                        'line': issue.get('line_number', 'Unknown'),
                        'severity': issue.get('severity', 'Unknown')
                    })
    
    # Check Safety results
    safety_file = Path('safety-report.json')
    if safety_file.exists():
        data = load_json_file('safety-report.json')
        if 'vulnerabilities' in data:
            for issue in data['vulnerabilities']:
                severity = get_severity_level(issue)
                if severity == 'high':
                    high_issues.append({
                        'tool': 'Safety',
                        'package': issue.get('package', 'Unknown'),
                        'version': issue.get('installed_version', 'Unknown'),
                        'vulnerability': issue.get('vulnerability_id', 'Unknown'),
                        'severity': issue.get('severity', 'Unknown')
                    })
    
    # Check pip-audit results
    pip_audit_file = Path('pip-audit-report.json')
    if pip_audit_file.exists():
        data = load_json_file('pip-audit-report.json')
        if 'vulnerabilities' in data:
            for issue in data['vulnerabilities']:
                severity = get_severity_level(issue)
                if severity == 'high':
                    high_issues.append({
                        'tool': 'pip-audit',
                        'package': issue.get('package', 'Unknown'),
                        'version': issue.get('installed_version', 'Unknown'),
                        'vulnerability': issue.get('vulnerability_id', 'Unknown'),
                        'severity': issue.get('severity', 'Unknown')
                    })
    
    # Check Semgrep results
    semgrep_file = Path('semgrep-report.json')
    if semgrep_file.exists():
        data = load_json_file('semgrep-report.json')
        if 'results' in data:
            for issue in data['results']:
                severity = get_severity_level(issue)
                if severity == 'high':
                    high_issues.append({
                        'tool': 'Semgrep',
                        'check_id': issue.get('check_id', 'Unknown'),
                        'file': issue.get('path', 'Unknown'),
                        'line': issue.get('start', {}).get('line', 'Unknown'),
                        'severity': issue.get('extra', {}).get('severity', 'Unknown')
                    })
    
    return {
        'critical': critical_issues,
        'high': high_issues,
        'medium': medium_issues,
        'total_high': len(high_issues),
        'total_critical': len(critical_issues)
    }

def generate_alert_message(vulnerabilities: Dict[str, Any]) -> str:
    """Generate alert message for vulnerabilities"""
    if vulnerabilities['total_critical'] > 0:
        return f"🚨 CRITICAL: {vulnerabilities['total_critical']} critical vulnerabilities found!"
    elif vulnerabilities['total_high'] > 0:
        return f"⚠️  HIGH: {vulnerabilities['total_high']} high severity vulnerabilities found!"
    else:
        return "✅ No critical or high severity vulnerabilities found."

def print_vulnerability_details(vulnerabilities: Dict[str, Any]):
    """Print detailed vulnerability information"""
    if vulnerabilities['high']:
        print("\n🔍 High Severity Vulnerabilities:")
        for i, issue in enumerate(vulnerabilities['high'][:5], 1):  # Show top 5
            print(f"  {i}. {issue['tool']}: {issue.get('issue', issue.get('package', 'Unknown issue'))}")
            if 'file' in issue:
                print(f"     File: {issue['file']}:{issue.get('line', 'Unknown')}")
            if 'package' in issue:
                print(f"     Package: {issue['package']} {issue.get('version', 'Unknown version')}")
            print()

def main():
    """Main function"""
    print("Checking for critical security vulnerabilities...")
    
    # Check vulnerabilities
    vulnerabilities = check_critical_vulnerabilities()
    
    # Generate alert message
    alert_message = generate_alert_message(vulnerabilities)
    print(alert_message)
    
    # Print details
    print_vulnerability_details(vulnerabilities)
    
    # Summary
    print(f"📊 Summary:")
    print(f"   Critical vulnerabilities: {vulnerabilities['total_critical']}")
    print(f"   High severity vulnerabilities: {vulnerabilities['total_high']}")
    print(f"   Medium severity vulnerabilities: {len(vulnerabilities['medium'])}")
    
    # Exit with error if critical or high vulnerabilities found
    if vulnerabilities['total_critical'] > 0 or vulnerabilities['total_high'] > 0:
        print("\n❌ Security check failed! Critical or high severity vulnerabilities found.")
        print("Please address these issues before proceeding with deployment.")
        sys.exit(1)
    else:
        print("\n✅ Security check passed! No critical or high severity vulnerabilities found.")

if __name__ == "__main__":
    main()
