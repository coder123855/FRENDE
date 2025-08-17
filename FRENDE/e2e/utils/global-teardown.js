const fs = require('fs');
const path = require('path');

async function globalTeardown() {
  console.log('Cleaning up E2E test environment...');
  
  // Stop backend server
  if (global.backendProcess) {
    global.backendProcess.kill('SIGTERM');
    await new Promise(resolve => {
      global.backendProcess.on('close', resolve);
    });
  }
  
  // Clean up test database
  const testDbPath = path.join(__dirname, '../backend/test_e2e.db');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  
  // Clean up test uploads
  const testUploadsPath = path.join(__dirname, '../backend/uploads/test');
  if (fs.existsSync(testUploadsPath)) {
    fs.rmSync(testUploadsPath, { recursive: true, force: true });
  }
  
  console.log('E2E test environment cleanup completed');
}

module.exports = globalTeardown;
