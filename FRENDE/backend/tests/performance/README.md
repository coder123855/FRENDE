# Performance Testing Suite

This directory contains comprehensive performance tests for the Frende application, focusing on chat and matching features.

## Overview

The performance testing suite includes:

- **WebSocket Performance Tests**: Connection management, message broadcasting, and real-time communication
- **Matching System Performance Tests**: Compatibility calculations, queue management, and match creation
- **Chat System Performance Tests**: Message persistence, history loading, and real-time updates
- **Frontend Performance Tests**: Component rendering, memory usage, and user interactions
- **Load Testing**: End-to-end performance testing with concurrent users

## Prerequisites

### Backend Dependencies

Install the required testing dependencies:

```bash
cd FRENDE/backend
pip install -r requirements-test.txt
```

### Frontend Dependencies

The frontend performance tests use standard Jest and React Testing Library dependencies that should already be installed.

## Running Performance Tests

### Backend Performance Tests

#### 1. WebSocket Performance Tests

```bash
# Run all WebSocket performance tests
pytest tests/performance/test_websocket_performance.py -v

# Run with benchmark reporting
pytest tests/performance/test_websocket_performance.py -v --benchmark-only

# Run specific test
pytest tests/performance/test_websocket_performance.py::TestWebSocketPerformance::test_connection_establishment_performance -v
```

#### 2. Matching System Performance Tests

```bash
# Run all matching performance tests
pytest tests/performance/test_matching_performance.py -v

# Run with benchmark reporting
pytest tests/performance/test_matching_performance.py -v --benchmark-only

# Run specific test
pytest tests/performance/test_matching_performance.py::TestMatchingPerformance::test_compatibility_calculation_performance -v
```

#### 3. Chat System Performance Tests

```bash
# Run all chat performance tests
pytest tests/performance/test_chat_performance.py -v

# Run with benchmark reporting
pytest tests/performance/test_chat_performance.py -v --benchmark-only

# Run specific test
pytest tests/performance/test_chat_performance.py::TestChatPerformance::test_message_persistence_performance -v
```

#### 4. Load Testing

```bash
# Run load test with default configuration
python tests/performance/load_test.py

# Run with custom configuration
python tests/performance/load_test.py --users 100 --duration 300
```

### Frontend Performance Tests

#### 1. Chat Component Performance Tests

```bash
# Run all chat component performance tests
npm test -- --testPathPattern="Chat.performance.test.jsx" --verbose

# Run specific test
npm test -- --testPathPattern="Chat.performance.test.jsx" --testNamePattern="should render chat component efficiently"
```

#### 2. Matching Component Performance Tests

```bash
# Run all matching component performance tests
npm test -- --testPathPattern="Matching.performance.test.jsx" --verbose

# Run specific test
npm test -- --testPathPattern="Matching.performance.test.jsx" --testNamePattern="should render matching component efficiently"
```

## Performance Metrics

### Backend Metrics

#### WebSocket Performance
- **Connection Establishment Time**: < 100ms per connection
- **Message Broadcasting Latency**: < 100ms average, < 300ms maximum
- **Concurrent Connections**: Support 1000+ concurrent connections
- **Memory Usage**: < 1MB per connection

#### Matching System Performance
- **Compatibility Calculation**: < 1 second for 100 calculations
- **Match Creation Throughput**: > 2 matches per second
- **Queue Processing**: < 30 seconds for 100 users
- **Cache Performance**: 2x+ speedup for cache hits

#### Chat System Performance
- **Message Persistence**: > 10 messages per second
- **History Loading**: < 1 second for 100 messages
- **Search Performance**: < 1 second for keyword search
- **Concurrent Messages**: > 1 message per second per user

### Frontend Metrics

#### Component Rendering
- **Empty Component**: < 50ms render time
- **Small Dataset (10 items)**: < 100ms render time
- **Large Dataset (100 items)**: < 300ms render time
- **Very Large Dataset (500 items)**: < 800ms render time

#### Memory Usage
- **Large Lists**: < 100MB increase for 1000 items
- **Component Updates**: < 50MB increase for 50 updates
- **Memory Leaks**: No significant memory leaks detected

#### User Interactions
- **Click Events**: < 10ms response time
- **Form Input**: < 10ms response time
- **State Updates**: < 50ms update time

## Load Testing Results

### Success Criteria
- **Response Time**: Average < 1 second, 95th percentile < 3 seconds
- **Throughput**: > 10 requests per second
- **Error Rate**: < 5%
- **Concurrent Users**: Support 1000+ concurrent users
- **Memory Usage**: < 500MB for 1000 users
- **CPU Usage**: < 80% under load

### Sample Results

```
LOAD TEST RESULTS
============================================================
Test Duration: 120.00 seconds
Total Users: 50
Total Requests: 1250
Successful Requests: 1187
Failed Requests: 63
Error Rate: 5.04%
Requests per Second: 10.42

Response Time Statistics:
  Average: 0.245s
  Median: 0.198s
  Minimum: 0.045s
  Maximum: 2.156s
  95th Percentile: 0.892s
  99th Percentile: 1.543s

System Metrics:
  Memory Usage: 156.78 MB
  CPU Usage: 45.23%
============================================================
```

## Configuration

### Backend Test Configuration

Edit `tests/performance/conftest.py` to modify test configurations:

```python
@pytest.fixture
def performance_test_config():
    return {
        "concurrent_users": [10, 50, 100, 500, 1000],
        "message_batch_sizes": [10, 50, 100, 500],
        "user_pool_sizes": [100, 500, 1000, 5000],
        "timeout_seconds": 30,
        "max_memory_mb": 512
    }
```

### Load Test Configuration

Edit `tests/performance/load_test.py` to modify load test parameters:

```python
config = LoadTestConfig(
    num_users=50,
    ramp_up_time=30,
    test_duration=120,
    max_concurrent_connections=25
)
```

### Frontend Test Configuration

Edit `src/utils/performance-test-utils.js` to modify frontend test parameters:

```javascript
export const performanceAssertions = {
  assertRenderTime: (metrics, maxAvgMs = 100) => {
    expect(metrics.average).toBeLessThan(maxAvgMs);
  }
};
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Ensure PostgreSQL is running
   - Check database connection settings
   - Verify test database exists

2. **Memory Issues**
   - Increase system memory limits
   - Reduce test dataset sizes
   - Check for memory leaks in application code

3. **Timeout Errors**
   - Increase timeout values in test configuration
   - Check system resources (CPU, memory, disk)
   - Verify network connectivity

4. **WebSocket Connection Issues**
   - Ensure WebSocket server is running
   - Check firewall settings
   - Verify WebSocket URL configuration

### Debug Mode

Run tests with debug output:

```bash
# Backend tests with debug
pytest tests/performance/ -v --log-cli-level=DEBUG

# Frontend tests with debug
npm test -- --verbose --detectOpenHandles
```

### Performance Profiling

Use profiling tools for detailed analysis:

```bash
# Python profiling
python -m cProfile -o profile.stats tests/performance/load_test.py
python -c "import pstats; pstats.Stats('profile.stats').sort_stats('cumulative').print_stats(20)"

# Memory profiling
python -m memory_profiler tests/performance/load_test.py
```

## Continuous Integration

### GitHub Actions

Add performance tests to CI pipeline:

```yaml
- name: Run Performance Tests
  run: |
    cd backend
    pip install -r requirements-test.txt
    pytest tests/performance/ -v --benchmark-only
    python tests/performance/load_test.py
```

### Performance Regression Testing

Set up automated performance regression testing:

1. **Baseline Establishment**: Run performance tests on known good commit
2. **Threshold Setting**: Define acceptable performance thresholds
3. **Automated Monitoring**: Run tests on every PR and main branch
4. **Alert System**: Notify team when performance degrades

## Best Practices

### Test Data Management
- Use realistic test data that matches production patterns
- Clean up test data after each test run
- Use database transactions for test isolation

### Resource Management
- Monitor system resources during tests
- Set appropriate timeouts and limits
- Use connection pooling for database tests

### Test Isolation
- Each test should be independent
- Clean up resources after each test
- Use unique identifiers for test data

### Performance Monitoring
- Monitor key metrics during tests
- Set up alerts for performance degradation
- Track performance trends over time

## Contributing

When adding new performance tests:

1. **Follow Naming Conventions**: Use descriptive test names
2. **Add Documentation**: Document test purpose and expected results
3. **Set Realistic Thresholds**: Base thresholds on actual requirements
4. **Include Cleanup**: Ensure proper resource cleanup
5. **Add to CI**: Include new tests in continuous integration

## Support

For issues with performance tests:

1. Check the troubleshooting section above
2. Review test logs and error messages
3. Verify system requirements and dependencies
4. Contact the development team for assistance
