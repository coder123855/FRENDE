#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Read coverage data
const coveragePath = path.join(__dirname, '../coverage/coverage-summary.json');

if (!fs.existsSync(coveragePath)) {
  console.error('Coverage report not found. Run tests with coverage first.');
  process.exit(1);
}

const coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
const totalCoverage = coverageData.total.lines.pct;

// Generate badge color based on coverage percentage
let color = 'red';
if (totalCoverage >= 90) {
  color = 'brightgreen';
} else if (totalCoverage >= 80) {
  color = 'green';
} else if (totalCoverage >= 70) {
  color = 'yellow';
} else if (totalCoverage >= 60) {
  color = 'orange';
}

// Generate badge URL
const badgeUrl = `https://img.shields.io/badge/coverage-${totalCoverage}%25-${color}`;

console.log(`Coverage: ${totalCoverage}%`);
console.log(`Badge URL: ${badgeUrl}`);

// Update README if it exists
const readmePath = path.join(__dirname, '../README.md');
if (fs.existsSync(readmePath)) {
  let readmeContent = fs.readFileSync(readmePath, 'utf8');
  
  // Replace or add coverage badge
  const badgeMarkdown = `![Coverage](${badgeUrl})`;
  const badgeRegex = /!\[Coverage\]\(https:\/\/img\.shields\.io\/badge\/coverage-\d+%25-\w+\)/;
  
  if (badgeRegex.test(readmeContent)) {
    readmeContent = readmeContent.replace(badgeRegex, badgeMarkdown);
  } else {
    // Add badge after the title
    readmeContent = readmeContent.replace(/^# (.+)$/m, `# $1\n\n${badgeMarkdown}\n`);
  }
  
  fs.writeFileSync(readmePath, readmeContent);
  console.log('Updated README.md with coverage badge');
}
