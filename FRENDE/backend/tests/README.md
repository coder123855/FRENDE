# API Integration Tests

This directory contains comprehensive integration tests for the Frende API endpoints. The tests ensure proper HTTP request/response handling, authentication, validation, and error scenarios.

## Test Structure

```
tests/
├── conftest.py                    # Shared fixtures and configuration
├── test_api/                      # API integration tests
│   ├── test_auth.py              # Authentication endpoints
│   ├── test_users.py             # User profile endpoints
│   ├── test_matches.py           # Match management endpoints
│   ├── test_tasks.py             # Task management endpoints
│   ├── test_chat.py              # Chat endpoints
│   ├── test_match_requests.py    # Match request endpoints
│   ├── test_coin_rewards.py      # Coin reward endpoints
│   └── ...                       # Other API endpoint tests
├── test_ai.py                    # AI service unit tests
├── test_tasks.py                 # Task service unit tests
└── test_profile_parsing.py       # Profile parsing unit tests
```

## Running Tests

### Prerequisites

Install test dependencies:
```bash
pip install -r requirements.txt
```

### Run All Tests
```bash
pytest
```

### Run Specific Test Categories
```bash
# Run only API integration tests
pytest tests/test_api/

# Run only authentication tests
pytest tests/test_api/test_auth.py

# Run only unit tests
pytest tests/ -m "not api"

# Run tests with coverage
pytest --cov=. --cov-report=html
```

### Run Tests with Verbose Output
```bash
pytest -v
```

### Run Tests with Coverage Report
```bash
pytest --cov=. --cov-report=term-missing --cov-report=html
```

## Test Configuration

### Database Setup
- Tests use an in-memory SQLite database for isolation
- Each test gets a fresh database session
- Database is automatically cleaned up between tests

### Authentication
- Tests include both authenticated and unauthenticated scenarios
- JWT tokens are automatically generated for test users
- Authentication helpers are available in `conftest.py`

### Mocking
- External services (AI, file storage) are mocked
- Network calls are intercepted and mocked
- Test data is isolated and predictable

## Test Categories

### 1. Authentication Tests (`test_auth.py`)
- User registration with validation
- Login/logout functionality
- Token refresh and validation
- Password management
- Rate limiting
- Error scenarios

### 2. User Profile Tests (`test_users.py`)
- Profile CRUD operations
- Image upload and validation
- User search and filtering
- Settings management
- Statistics and analytics

### 3. Match Management Tests (`test_matches.py`)
- Match creation and status updates
- Match expiration handling
- Task and chat integration
- Statistics and reporting
- Participant validation

### 4. Task System Tests (`test_tasks.py`)
- Task generation and management
- Task completion workflow
- AI integration testing
- Progress tracking
- Analytics and recommendations

### 5. Chat System Tests (`test_chat.py`)
- Message sending and receiving
- Chat history and pagination
- Real-time features (typing, online status)
- Message editing and deletion
- Reporting and moderation

### 6. Match Request Tests (`test_match_requests.py`)
- Request creation and management
- Acceptance/rejection workflow
- Notification handling
- Statistics and history
- Authorization checks

### 7. Coin Reward Tests (`test_coin_rewards.py`)
- Coin balance management
- Award and deduction operations
- Transaction history
- Analytics and leaderboards
- Configuration management

## Test Patterns

### HTTP Status Code Testing
All endpoints are tested for:
- 200: Success responses
- 201: Created responses
- 400: Bad request errors
- 401: Unauthorized errors
- 403: Forbidden errors
- 404: Not found errors
- 422: Validation errors
- 429: Rate limit errors
- 500: Server errors

### Authentication Testing
- Valid token scenarios
- Invalid token scenarios
- Missing token scenarios
- Token expiration scenarios

### Authorization Testing
- Owner-only operations
- Participant-only operations
- Admin-only operations
- Cross-user access prevention

### Validation Testing
- Required field validation
- Data type validation
- Range and length validation
- Business rule validation

### Error Handling Testing
- Invalid input handling
- Database constraint violations
- External service failures
- Network timeouts
- Rate limiting

## Test Data Management

### Fixtures
- `test_user`: Basic test user
- `test_user2`: Second test user
- `test_match`: Active match between users
- `test_task`: Sample task for testing
- `authenticated_client`: HTTP client with auth token

### Helper Functions
- `create_test_user()`: Create users with custom data
- `get_auth_headers()`: Generate auth headers
- `assert_response_success()`: Validate success responses
- `assert_response_error()`: Validate error responses

## Best Practices

### Test Isolation
- Each test is independent
- Database state is reset between tests
- No shared state between test runs

### Test Naming
- Descriptive test names that explain the scenario
- Include expected outcome in test name
- Use consistent naming patterns

### Test Organization
- Group related tests in classes
- Use setup and teardown methods appropriately
- Keep tests focused and single-purpose

### Error Testing
- Test both success and failure scenarios
- Verify error messages and status codes
- Test edge cases and boundary conditions

### Performance
- Tests should run quickly (< 1 second each)
- Use mocking for slow operations
- Avoid unnecessary database operations

## Coverage Requirements

### Minimum Coverage
- 90% line coverage for API endpoints
- 85% branch coverage for complex logic
- 100% coverage for error handling paths

### Coverage Reports
- HTML coverage report in `htmlcov/`
- XML coverage report for CI/CD
- Terminal coverage summary

## Continuous Integration

### GitHub Actions
Tests are automatically run on:
- Pull requests
- Push to main branch
- Scheduled runs

### Pre-commit Hooks
- Run tests before commit
- Check coverage requirements
- Validate test structure

## Troubleshooting

### Common Issues

#### Database Connection Errors
```bash
# Ensure test database is properly configured
export TEST_DATABASE_URL="sqlite+aiosqlite:///:memory:"
```

#### Import Errors
```bash
# Ensure PYTHONPATH includes project root
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
```

#### Authentication Errors
```bash
# Check JWT secret configuration
export JWT_SECRET_KEY="test-secret-key"
```

#### Test Timeouts
```bash
# Increase timeout for slow tests
pytest --timeout=30
```

### Debug Mode
```bash
# Run tests with debug output
pytest -s -v --tb=long
```

### Test Database Inspection
```bash
# Run tests with database inspection
pytest --db-debug
```

## Contributing

### Adding New Tests
1. Follow existing test patterns
2. Use appropriate fixtures
3. Test both success and error scenarios
4. Add proper documentation
5. Ensure adequate coverage

### Test Maintenance
1. Update tests when API changes
2. Keep test data current
3. Review and refactor regularly
4. Monitor test performance
5. Update documentation

### Code Review
- All test changes require review
- Ensure tests are meaningful and maintainable
- Verify coverage requirements are met
- Check for test isolation and independence
