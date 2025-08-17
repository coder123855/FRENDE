# End-to-End Tests for Frende Application

This directory contains comprehensive end-to-end (E2E) tests for the Frende application using Playwright. These tests simulate real user interactions and verify that the entire application works correctly as a cohesive system.

## Test Structure

```
e2e/
├── playwright.config.js          # Playwright configuration
├── package.json                  # E2E test dependencies
├── tests/                        # Test files
│   ├── auth/                     # Authentication flows
│   │   ├── login.spec.js         # User login tests
│   │   └── register.spec.js      # User registration tests
│   ├── matching/                 # Friend matching flows
│   │   └── user-matching.spec.js # User matching tests
│   ├── chat/                     # Chat functionality flows
│   │   └── chat-messaging.spec.js # Chat messaging tests
│   ├── tasks/                    # Task system flows
│   │   └── task-completion.spec.js # Task completion tests
│   └── integration/              # Complex multi-step flows
│       └── complete-user-journey.spec.js # Complete user journey tests
├── utils/                        # Test utilities
│   ├── global-setup.js           # Global test setup
│   ├── global-teardown.js        # Global test cleanup
│   ├── test-helpers.js           # UI test helpers
│   └── api-helpers.js            # API test helpers
└── fixtures/                     # Test data
    └── test-data.js              # Test data fixtures
```

## Prerequisites

1. **Node.js**: Version 18 or higher
2. **Python**: Version 3.8 or higher (for backend)
3. **Playwright**: Will be installed automatically

## Installation

1. Install E2E test dependencies:
```bash
cd e2e
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

3. Ensure backend dependencies are installed:
```bash
cd ../backend
pip install -r requirements.txt
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Tests in Headed Mode (with browser UI)
```bash
npm run test:headed
```

### Run Tests in Debug Mode
```bash
npm run test:debug
```

### Run Tests with UI Mode
```bash
npm run test:ui
```

### Run Specific Test File
```bash
npx playwright test tests/auth/login.spec.js
```

### Run Tests on Specific Browser
```bash
npx playwright test --project=chromium
```

### Run Tests in Parallel
```bash
npx playwright test --workers=4
```

## Test Categories

### 1. Authentication Tests (`tests/auth/`)
- **Login Tests**: Valid/invalid credentials, validation errors, session management
- **Registration Tests**: User registration, validation, duplicate email handling
- **Error Handling**: Network failures, validation errors, edge cases

### 2. Matching System Tests (`tests/matching/`)
- **User Matching**: Compatibility display, match requests, slot management
- **Match Requests**: Sending, accepting, rejecting friend requests
- **Slot System**: Purchasing slots, insufficient coins handling
- **Filtering**: Community and location-based filtering

### 3. Chat System Tests (`tests/chat/`)
- **Real-time Messaging**: Sending/receiving messages, chat history
- **WebSocket Features**: Typing indicators, online status, connection handling
- **Message Handling**: Long messages, empty messages, error scenarios
- **Auto-scroll**: Chat auto-scroll behavior

### 4. Task System Tests (`tests/tasks/`)
- **Task Display**: Task cards, progress indicators, expiration timers
- **Task Completion**: Completing tasks, coin rewards, task replacement
- **Task History**: Task statistics, completion tracking
- **Task Submission**: Evidence submission, validation

### 5. Integration Tests (`tests/integration/`)
- **Complete User Journey**: End-to-end friend making process
- **Profile Management**: Profile creation, picture upload, editing
- **Error Recovery**: Network failures, retry mechanisms
- **Multi-user Scenarios**: Multiple users interacting simultaneously

## Test Data Management

### Test Users
The tests use predefined test users with different profiles:
- **user1**: Software Engineer, Technology community
- **user2**: Data Scientist, Technology community  
- **user3**: Graphic Designer, Arts community

### Test Messages
Predefined test messages for chat functionality:
- Greetings, responses, questions, long messages

### Test Tasks
Sample tasks for testing task completion:
- Simple tasks, creative tasks, social tasks

## Test Utilities

### TestHelper Class
Provides common UI interaction methods:
- `loginUser()`: Login with credentials
- `registerUser()`: Register new user
- `createProfile()`: Create user profile
- `sendMessage()`: Send chat message
- `completeTask()`: Complete a task
- `purchaseSlot()`: Purchase additional slot

### ApiHelper Class
Provides API interaction methods:
- `createTestUser()`: Create test user via API
- `createTestMatch()`: Create match between users
- `createTestTask()`: Create test task
- `sendTestMessage()`: Send message via API
- `cleanupTestData()`: Clean up test data

## Configuration

### Playwright Configuration (`playwright.config.js`)
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Timeouts**: 30s test timeout, 5s expect timeout
- **Retries**: 2 retries in CI, 0 in development
- **Parallel Execution**: Enabled with configurable workers
- **Reporting**: HTML, JSON, and JUnit reports

### Environment Variables
- `E2E_BASE_URL`: Frontend application URL (default: http://localhost:3000)
- `CI`: Set to true in CI environment

## Test Reports

After running tests, reports are generated in:
- **HTML Report**: `playwright-report/index.html`
- **JSON Report**: `test-results/results.json`
- **JUnit Report**: `test-results/results.xml`

View HTML report:
```bash
npm run test:report
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Install dependencies
        run: |
          npm ci
          cd e2e && npm ci
      - name: Start backend
        run: cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 &
      - name: Start frontend
        run: npm run dev &
      - name: Run E2E tests
        run: cd e2e && npx playwright test
      - name: Upload test results
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: e2e/playwright-report/
```

## Best Practices

### Test Organization
1. **Group Related Tests**: Use `test.describe()` to group related tests
2. **Clear Test Names**: Use descriptive test names that explain the scenario
3. **Setup and Teardown**: Use `test.beforeEach()` for common setup
4. **Test Isolation**: Each test should be independent and not rely on other tests

### Test Data Management
1. **Use Fixtures**: Store test data in fixtures for reusability
2. **Clean Up**: Always clean up test data after tests
3. **Unique Data**: Use unique email addresses and usernames
4. **Realistic Data**: Use realistic test data that mimics real usage

### Error Handling
1. **Network Errors**: Test network failure scenarios
2. **Validation Errors**: Test form validation and error messages
3. **Edge Cases**: Test boundary conditions and edge cases
4. **Recovery**: Test error recovery and retry mechanisms

### Performance Considerations
1. **Parallel Execution**: Run tests in parallel when possible
2. **Resource Cleanup**: Clean up resources to prevent memory leaks
3. **Timeout Management**: Set appropriate timeouts for different operations
4. **Database Isolation**: Use separate test databases

## Troubleshooting

### Common Issues

1. **Backend Not Starting**
   - Check Python dependencies are installed
   - Verify database configuration
   - Check port availability

2. **Frontend Not Starting**
   - Check Node.js dependencies are installed
   - Verify Vite configuration
   - Check port 3000 is available

3. **Test Failures**
   - Check test data fixtures
   - Verify API endpoints are working
   - Check WebSocket connections

4. **Browser Issues**
   - Reinstall Playwright browsers: `npx playwright install`
   - Check browser compatibility
   - Verify browser permissions

### Debug Mode
Run tests in debug mode to step through test execution:
```bash
npm run test:debug
```

### Screenshots and Videos
Failed tests automatically generate:
- Screenshots: `test-results/screenshots/`
- Videos: `test-results/videos/`
- Traces: `test-results/traces/`

## Contributing

When adding new tests:

1. **Follow Naming Convention**: Use descriptive file and test names
2. **Add Test Data**: Update fixtures if new test data is needed
3. **Update Documentation**: Update this README if adding new test categories
4. **Test Coverage**: Ensure new features have adequate test coverage
5. **Performance**: Keep tests fast and efficient

## Test Coverage Goals

- **Authentication**: 100% coverage of login/registration flows
- **Matching**: 100% coverage of matching and request flows
- **Chat**: 100% coverage of messaging and real-time features
- **Tasks**: 100% coverage of task completion and rewards
- **Integration**: 100% coverage of complete user journeys
- **Error Handling**: 100% coverage of error scenarios
- **Performance**: Load testing for concurrent users
