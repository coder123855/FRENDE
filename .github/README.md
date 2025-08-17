# Frende CI/CD Pipeline

This directory contains the GitHub Actions workflows for automated testing, building, and deployment of the Frende application.

## Overview

The CI/CD pipeline consists of multiple workflows that run automatically on code changes and provide comprehensive testing, security scanning, and deployment capabilities.

## Workflows

### 1. Frontend Tests (`frontend-tests.yml`)
- **Triggers**: Push/PR to main/develop branches affecting frontend files
- **Purpose**: Tests React components, API integration, and frontend performance
- **Features**:
  - Runs on Node.js 18.x and 20.x
  - Linting and type checking
  - Unit tests with coverage reporting
  - Performance tests
  - Build verification
  - Coverage upload to Codecov

### 2. Backend Tests (`backend-tests.yml`)
- **Triggers**: Push/PR to main/develop branches affecting backend files
- **Purpose**: Tests FastAPI endpoints, services, and database operations
- **Features**:
  - Runs on Python 3.9, 3.10, and 3.11
  - PostgreSQL and Redis services
  - Linting (flake8, black, isort)
  - Type checking (mypy)
  - Unit, integration, and API tests
  - Coverage reporting
  - Security scanning (bandit, safety, semgrep)

### 3. Performance Tests (`performance-tests.yml`)
- **Triggers**: Push/PR affecting performance/load test files, daily at 2 AM UTC
- **Purpose**: Performance and load testing
- **Features**:
  - Backend performance tests with pytest-benchmark
  - Load testing with custom scenarios
  - Frontend performance tests
  - Performance analysis and reporting
  - PR comments with performance results

### 4. Security Tests (`security-tests.yml`)
- **Triggers**: Push/PR affecting security-related files, daily at 3 AM UTC
- **Purpose**: Comprehensive security testing
- **Features**:
  - Authentication security tests
  - Input validation security tests
  - API security tests
  - Dependency vulnerability scanning
  - Static security analysis
  - Security alerts and notifications

### 5. Full Pipeline (`full-pipeline.yml`)
- **Triggers**: Push/PR to main/develop branches, manual dispatch
- **Purpose**: Complete CI/CD pipeline with quality gates
- **Features**:
  - Quality gates (file size, sensitive data checks)
  - Parallel test execution
  - Coverage thresholds (80% backend, 70% frontend)
  - Security vulnerability blocking
  - Build and packaging
  - Staging deployment (develop branch)
  - Production deployment (main branch)
  - Pipeline status reporting

## Quality Gates

The pipeline enforces several quality gates to ensure code quality:

### Coverage Requirements
- **Backend**: Minimum 80% line coverage
- **Frontend**: Minimum 70% line coverage

### Security Requirements
- No critical or high severity vulnerabilities
- All security tests must pass
- Dependency vulnerability scans must pass

### Code Quality
- All linting checks must pass
- Type checking must pass
- No large files (>50MB)
- No sensitive data in code

## Test Structure

### Backend Tests
```
FRENDE/backend/tests/
├── unit/                 # Unit tests
├── integration/          # Integration tests
├── test_api/            # API endpoint tests
├── performance/         # Performance tests
├── load/               # Load tests
└── security/           # Security tests
```

### Frontend Tests
```
FRENDE/frontend/src/
├── components/__tests__/  # Component tests
├── hooks/__tests__/       # Hook tests
├── utils/__tests__/       # Utility tests
└── tests/
    └── load/             # Load tests
```

## Environment Variables

The following environment variables are used in the CI/CD pipeline:

### Backend
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string
- `JWT_SECRET_KEY`: JWT signing key
- `ENVIRONMENT`: Environment name (test/staging/production)

### Frontend
- `VITE_API_BASE_URL`: Backend API base URL
- `VITE_WS_URL`: WebSocket server URL

## Artifacts

The pipeline generates and stores several artifacts:

### Test Results
- Coverage reports (HTML, XML, LCOV)
- Test results in various formats
- Performance test results
- Security scan reports

### Build Artifacts
- Frontend build files
- Backend deployment packages
- Docker images (if applicable)

### Reports
- Performance analysis reports
- Security analysis reports
- Pipeline status reports

## Monitoring and Notifications

### Slack Integration
- Security vulnerability alerts
- Pipeline failure notifications
- Deployment status updates

### GitHub Notifications
- PR comments with test results
- Issue creation for failed builds
- Status checks for branch protection

## Local Development

### Running Tests Locally

#### Backend
```bash
cd FRENDE/backend

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-test.txt

# Run all tests
pytest

# Run specific test types
pytest tests/unit/
pytest tests/integration/
pytest tests/security/
pytest tests/performance/

# Run with coverage
pytest --cov=. --cov-report=html
```

#### Frontend
```bash
cd FRENDE/frontend

# Install dependencies
npm install

# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run performance tests
npm run test:performance
```

### Running Security Scans Locally

#### Backend
```bash
cd FRENDE/backend

# Bandit security scan
bandit -r . -f json -o bandit-report.json

# Safety dependency scan
safety check --json --output safety-report.json

# pip-audit scan
pip-audit --format json --output pip-audit-report.json

# Semgrep scan
semgrep scan --config auto --json --output semgrep-report.json
```

## Troubleshooting

### Common Issues

1. **Tests Failing in CI but Passing Locally**
   - Check environment variables
   - Verify database/Redis connections
   - Check for timing issues in async tests

2. **Coverage Threshold Failures**
   - Add more test cases
   - Exclude non-testable code
   - Update coverage configuration

3. **Security Scan Failures**
   - Update vulnerable dependencies
   - Fix code security issues
   - Review false positives

4. **Performance Test Failures**
   - Check for resource constraints
   - Review test configuration
   - Optimize slow operations

### Debugging

1. **View Workflow Logs**
   - Go to GitHub Actions tab
   - Click on the failed workflow
   - Review step-by-step logs

2. **Download Artifacts**
   - Artifacts are available for 7-90 days
   - Download and analyze locally
   - Check coverage and test reports

3. **Re-run Workflows**
   - Use "Re-run jobs" feature
   - Check for flaky tests
   - Verify fixes

## Best Practices

### Code Quality
- Write comprehensive tests
- Maintain high coverage
- Follow linting rules
- Use type hints

### Security
- Regular dependency updates
- Security scan integration
- Input validation
- Authentication testing

### Performance
- Monitor test execution time
- Optimize slow operations
- Use appropriate test data
- Regular performance testing

### Deployment
- Test in staging first
- Use feature flags
- Monitor deployment health
- Rollback procedures

## Contributing

When contributing to the CI/CD pipeline:

1. **Test Changes Locally**
   - Run workflows locally first
   - Verify all tests pass
   - Check for regressions

2. **Update Documentation**
   - Update this README
   - Document new features
   - Update troubleshooting guides

3. **Follow Standards**
   - Use consistent naming
   - Follow YAML best practices
   - Add appropriate comments

4. **Security Review**
   - Review for security implications
   - Test with security scans
   - Validate environment variables

## Support

For issues with the CI/CD pipeline:

1. Check the troubleshooting section
2. Review workflow logs
3. Test locally to reproduce
4. Create an issue with details
5. Include relevant logs and artifacts
