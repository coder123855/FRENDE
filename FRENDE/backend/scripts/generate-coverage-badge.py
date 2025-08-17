#!/usr/bin/env python3

import json
import os
import re
from pathlib import Path

def get_coverage_percentage():
    """Read coverage data and return total percentage"""
    coverage_file = Path("coverage.json")
    
    if not coverage_file.exists():
        print("Coverage report not found. Run tests with coverage first.")
        return None
    
    with open(coverage_file, 'r') as f:
        coverage_data = json.load(f)
    
    # Calculate total coverage
    total_lines = 0
    covered_lines = 0
    
    for file_data in coverage_data.values():
        if isinstance(file_data, dict) and 'coverage' in file_data:
            for line_num, coverage in file_data['coverage'].items():
                total_lines += 1
                if coverage is not None and coverage > 0:
                    covered_lines += 1
    
    if total_lines == 0:
        return 0
    
    return round((covered_lines / total_lines) * 100, 1)

def get_badge_color(coverage):
    """Get badge color based on coverage percentage"""
    if coverage >= 90:
        return "brightgreen"
    elif coverage >= 80:
        return "green"
    elif coverage >= 70:
        return "yellow"
    elif coverage >= 60:
        return "orange"
    else:
        return "red"

def update_readme(coverage, badge_url):
    """Update README.md with coverage badge"""
    readme_path = Path("README.md")
    
    if not readme_path.exists():
        return
    
    with open(readme_path, 'r') as f:
        content = f.read()
    
    badge_markdown = f"![Coverage]({badge_url})"
    badge_regex = r'!\[Coverage\]\(https://img\.shields\.io/badge/coverage-\d+\.?\d*%25-\w+\)'
    
    if re.search(badge_regex, content):
        content = re.sub(badge_regex, badge_markdown, content)
    else:
        # Add badge after the title
        content = re.sub(r'^# (.+)$', r'# \1\n\n' + badge_markdown + '\n', content, flags=re.MULTILINE)
    
    with open(readme_path, 'w') as f:
        f.write(content)
    
    print("Updated README.md with coverage badge")

def main():
    coverage = get_coverage_percentage()
    
    if coverage is None:
        return
    
    color = get_badge_color(coverage)
    badge_url = f"https://img.shields.io/badge/coverage-{coverage}%25-{color}"
    
    print(f"Coverage: {coverage}%")
    print(f"Badge URL: {badge_url}")
    
    update_readme(coverage, badge_url)

if __name__ == "__main__":
    main()
