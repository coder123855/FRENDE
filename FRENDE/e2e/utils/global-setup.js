const { spawn } = require('child_process');
const path = require('path');

async function globalSetup() {
  console.log('Starting backend server for E2E tests...');
  
  // Start backend server
  const backendProcess = spawn('python', ['-m', 'uvicorn', 'main:app', '--host', '0.0.0.0', '--port', '8000'], {
    cwd: path.join(__dirname, '../backend'),
    stdio: 'pipe',
    env: {
      ...process.env,
      DATABASE_URL: 'sqlite+aiosqlite:///./test_e2e.db',
      ENVIRONMENT: 'test',
      AI_API_KEY: 'test-key',
    }
  });

  // Wait for backend to be ready
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Backend server startup timeout'));
    }, 30000);

    backendProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log('Backend:', output);
      if (output.includes('Uvicorn running on')) {
        clearTimeout(timeout);
        resolve();
      }
    });

    backendProcess.stderr.on('data', (data) => {
      console.error('Backend error:', data.toString());
    });

    backendProcess.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });

  // Store process for cleanup
  global.backendProcess = backendProcess;
  
  console.log('Backend server started successfully');
}

module.exports = globalSetup;
