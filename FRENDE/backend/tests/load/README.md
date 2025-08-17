# Load Testing Suite for Frende Application

This directory contains a comprehensive load testing suite designed to validate the performance and scalability of the Frende application under various load conditions.

## Overview

The load testing suite provides multiple testing approaches:

- **Single Load Tests**: Basic load testing with configurable parameters
- **Scenario-Based Tests**: Predefined realistic user behavior patterns
- **Distributed Load Tests**: Multi-machine testing for higher concurrency
- **Frontend Load Tests**: Browser-based performance testing
- **Comprehensive Test Suites**: Complete testing workflows

## Prerequisites

### Backend Dependencies

Install the required Python packages:

```bash
cd FRENDE/backend
pip install -r requirements-test.txt
```

Key dependencies:
- `pytest-benchmark`: Performance benchmarking
- `psutil`: System monitoring
- `aiohttp`: Async HTTP client
- `websockets`: WebSocket testing
- `faker`: Test data generation
- `locust`: Load testing framework (optional)
- `matplotlib`: Plot generation (optional)
- `seaborn`: Enhanced plotting (optional)

### Frontend Dependencies

For frontend load testing, ensure you have:
- Modern browser with Performance API support
- Node.js for running frontend tests

## Quick Start

### 1. Basic Load Test

Run a simple load test with 100 concurrent users:

```bash
cd FRENDE/backend/tests/load
python load_test_orchestrator.py --mode single --base-url http://localhost:8000
```

### 2. Scenario-Based Testing

Run a specific scenario:

```bash
python load_test_orchestrator.py --mode scenario --scenario "Peak Hour Simulation"
```

Run all scenarios:

```bash
python load_test_orchestrator.py --mode scenario
```

### 3. Distributed Testing

Run distributed load test:

```bash
python load_test_orchestrator.py --mode distributed
```

### 4. Complete Test Suite

Run the complete test suite:

```bash
python load_test_orchestrator.py --mode suite --config load_test_config.yaml
```

## Configuration

### Configuration File

The `load_test_config.yaml` file contains all test configurations:

```yaml
# Base configuration
base_url: "http://localhost:8000"
output_dir: "./load_test_results"
log_level: "INFO"

# Test modes: single, scenario, distributed, suite
test_mode: "scenario"

# Performance thresholds
performance_thresholds:
  response_time_p95_max_ms: 2000
  throughput_min_req_per_sec: 100
  error_rate_max_percent: 1.0
```

### Environment-Specific Configurations

Different configurations for development, staging, and production:

```yaml
environments:
  development:
    base_url: "http://localhost:8000"
    concurrent_users: 50
    duration_seconds: 180
    
  staging:
    base_url: "https://staging.frende.com"
    concurrent_users: 200
    duration_seconds: 600
    
  production:
    base_url: "https://frende.com"
    concurrent_users: 1000
    duration_seconds: 1800
```

## Test Scenarios

### Available Scenarios

1. **Peak Hour Simulation**
   - 500 concurrent users
   - 30-minute duration
   - Active user behavior pattern
   - Success criteria: P95 < 2s, throughput > 100 req/s

2. **Flash Crowd Simulation**
   - 1000 concurrent users
   - 15-minute duration
   - Sudden surge simulation
   - Success criteria: P95 < 3s, error rate < 5%

3. **Sustained Load Simulation**
   - 300 concurrent users
   - 60-minute duration
   - Extended load testing
   - Success criteria: P95 < 2.5s, throughput > 80 req/s

4. **Mixed Workload Simulation**
   - 400 concurrent users
   - 45-minute duration
   - Various user behavior patterns
   - Success criteria: P95 < 2.2s, error rate < 1.5%

5. **Stress Test**
   - 2000 concurrent users
   - 20-minute duration
   - Power user behavior
   - Success criteria: P95 < 5s, error rate < 10%

6. **Spike Test**
   - 800 concurrent users
   - 25-minute duration
   - Traffic spike simulation
   - Success criteria: P95 < 3.5s, error rate < 3%

### User Behavior Patterns

- **Casual User**: Light usage, longer think times
- **Active User**: Moderate usage, balanced activity
- **Power User**: Heavy usage, aggressive interactions
- **Chat-Focused User**: Intensive chat activity

## Running Tests

### Command Line Options

```bash
python load_test_orchestrator.py [OPTIONS]

Options:
  --config, -c          Configuration file path
  --base-url            Base URL for the application
  --mode                Test mode (single, scenario, distributed, suite)
  --scenario            Specific scenario name to run
  --output-dir          Output directory for results
  --log-level           Log level (DEBUG, INFO, WARNING, ERROR)
```

### Examples

#### Run Single Test
```bash
python load_test_orchestrator.py \
  --mode single \
  --base-url http://localhost:8000 \
  --output-dir ./results
```

#### Run Specific Scenario
```bash
python load_test_orchestrator.py \
  --mode scenario \
  --scenario "Peak Hour Simulation" \
  --base-url http://localhost:8000
```

#### Run with Custom Config
```bash
python load_test_orchestrator.py \
  --config custom_config.yaml \
  --mode suite
```

### Programmatic Usage

```python
from load_test_orchestrator import LoadTestOrchestrator, OrchestratorConfig

# Create configuration
config = OrchestratorConfig(
    base_url="http://localhost:8000",
    test_mode="scenario",
    output_dir="./results"
)

# Create orchestrator
orchestrator = LoadTestOrchestrator(config)

# Run test
await orchestrator.run_scenario_test("Peak Hour Simulation")

# Get results
results = orchestrator.getResults()
```

## Distributed Testing

### Setup

1. **Coordinator Node**: Runs the test orchestration
2. **Worker Nodes**: Execute the actual load tests
3. **Network Communication**: WebSocket-based coordination

### Configuration

```yaml
distributed_tests:
  - name: "Large Distributed Test"
    base_url: "http://localhost:8000"
    scenario_name: "Stress Test"
    nodes:
      - node_id: "coordinator"
        host: "localhost"
        port: 8001
        max_concurrent_users: 200
        is_coordinator: true
      - node_id: "node1"
        host: "localhost"
        port: 8002
        max_concurrent_users: 500
        is_coordinator: false
```

### Running Distributed Tests

1. Start worker nodes:
```bash
python distributed_load_test.py --node-id node1 --port 8002
```

2. Run coordinator:
```bash
python load_test_orchestrator.py --mode distributed
```

## Frontend Load Testing

### Browser-Based Testing

```javascript
import { FrontendLoadTest } from './frontend_load_test.js';

const loadTest = new FrontendLoadTest({
    baseUrl: 'http://localhost:3000',
    concurrentUsers: 50,
    durationSeconds: 300
});

// Start test
await loadTest.start();

// Get results
const results = loadTest.getResults();
console.log('Test completed:', results.summary);
```

### Metrics Collected

- **Response Times**: API call response times
- **Render Times**: Page rendering performance
- **Memory Usage**: Browser memory consumption
- **CPU Usage**: Browser CPU utilization
- **Network Info**: Connection quality metrics

## Monitoring and Metrics

### System Metrics

- **CPU Usage**: Processor utilization
- **Memory Usage**: RAM consumption
- **Disk I/O**: Storage performance
- **Network I/O**: Network throughput

### Application Metrics

- **Response Times**: P50, P95, P99 percentiles
- **Throughput**: Requests per second
- **Error Rates**: Failed request percentages
- **Active Connections**: Concurrent connections

### Database Metrics

- **Query Execution Times**: Database performance
- **Connection Pool Usage**: Database connections
- **Slow Queries**: Performance bottlenecks
- **Deadlocks**: Database contention

## Results and Reporting

### Output Structure

```
load_test_results/
├── reports/
│   ├── single_test_report_20241201_143022.html
│   ├── scenario_peak_hour_report_20241201_143022.html
│   └── comprehensive_report_20241201_143022.html
├── plots/
│   ├── single_test_plots_20241201_143022.png
│   ├── comprehensive_plots_20241201_143022.png
│   └── final_plots_20241201_143022.png
└── data/
    ├── single_test_20241201_143022.json
    ├── scenario_peak_hour_20241201_143022.json
    └── comprehensive_20241201_143022.json
```

### HTML Reports

Generated HTML reports include:
- **Executive Summary**: High-level test results
- **Performance Metrics**: Detailed performance data
- **Success Criteria Validation**: Pass/fail status
- **System Resource Usage**: CPU, memory, network
- **Error Analysis**: Failed requests and errors

### Performance Plots

Automatically generated plots show:
- **Response Time Trends**: Performance over time
- **Throughput Analysis**: Request rate patterns
- **Resource Utilization**: System resource usage
- **Error Rate Trends**: Error patterns over time

## Success Criteria

### Performance Thresholds

| Metric | Development | Staging | Production |
|--------|-------------|---------|------------|
| Response Time (P95) | < 3s | < 2s | < 1.5s |
| Throughput | > 50 req/s | > 100 req/s | > 200 req/s |
| Error Rate | < 5% | < 2% | < 1% |
| CPU Usage | < 90% | < 80% | < 70% |
| Memory Usage | < 95% | < 85% | < 75% |

### Validation Logic

Tests automatically validate against success criteria:

```python
def validate_scenario_result(result, criteria):
    validation = {}
    
    # Response time validation
    if result.get("response_time_p95", 0) <= criteria["response_time_p95"]:
        validation["response_time"] = True
    
    # Throughput validation
    if result.get("throughput", 0) >= criteria["throughput"]:
        validation["throughput"] = True
    
    # Error rate validation
    if result.get("error_rate", 1.0) <= criteria["error_rate"]:
        validation["error_rate"] = True
    
    return validation
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Ensure the application is running
   - Check base URL configuration
   - Verify network connectivity

2. **High Error Rates**
   - Check application logs
   - Verify database connectivity
   - Monitor system resources

3. **Memory Issues**
   - Reduce concurrent users
   - Increase system memory
   - Check for memory leaks

4. **Slow Response Times**
   - Optimize database queries
   - Check network latency
   - Monitor CPU usage

### Debug Mode

Enable debug logging:

```bash
python load_test_orchestrator.py --log-level DEBUG
```

### Performance Profiling

Use built-in profiling:

```python
import cProfile
import pstats

profiler = cProfile.Profile()
profiler.enable()

# Run load test
await orchestrator.run_scenario_test("Peak Hour Simulation")

profiler.disable()
stats = pstats.Stats(profiler)
stats.sort_stats('cumulative')
stats.print_stats(20)
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Load Testing
on: [push, pull_request]

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: 3.9
      
      - name: Install dependencies
        run: |
          pip install -r requirements-test.txt
      
      - name: Start application
        run: |
          # Start your application here
      
      - name: Run load tests
        run: |
          python tests/load/load_test_orchestrator.py \
            --mode scenario \
            --scenario "Peak Hour Simulation" \
            --base-url http://localhost:8000
      
      - name: Upload results
        uses: actions/upload-artifact@v2
        with:
          name: load-test-results
          path: load_test_results/
```

### Regression Testing

Automated regression testing:

```bash
# Run baseline tests
python load_test_orchestrator.py --mode scenario --output-dir baseline

# Run current tests
python load_test_orchestrator.py --mode scenario --output-dir current

# Compare results
python compare_results.py baseline current
```

## Best Practices

### Test Planning

1. **Start Small**: Begin with low concurrency and gradually increase
2. **Monitor Resources**: Watch CPU, memory, and network usage
3. **Test Realistic Scenarios**: Use realistic user behavior patterns
4. **Validate Results**: Always check against success criteria
5. **Document Findings**: Record performance baselines and improvements

### Performance Optimization

1. **Database Optimization**: Index frequently queried columns
2. **Caching**: Implement appropriate caching strategies
3. **Connection Pooling**: Optimize database connections
4. **Async Processing**: Use asynchronous operations where possible
5. **Resource Monitoring**: Monitor system resources during tests

### Test Data Management

1. **Realistic Data**: Use realistic test data
2. **Data Cleanup**: Clean up test data after tests
3. **Data Isolation**: Ensure test data doesn't affect production
4. **Data Volume**: Use appropriate data volumes for testing

## Support and Contributing

### Getting Help

- Check the troubleshooting section
- Review application logs
- Monitor system resources
- Consult performance documentation

### Contributing

1. Follow the existing code structure
2. Add comprehensive tests
3. Update documentation
4. Validate against success criteria
5. Test across different environments

### Extending the Framework

The load testing framework is designed to be extensible:

- Add new user behavior patterns
- Create custom scenarios
- Implement new metrics collection
- Add custom reporting formats

## License

This load testing suite is part of the Frende application and follows the same licensing terms.
