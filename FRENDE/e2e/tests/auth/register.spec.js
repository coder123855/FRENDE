const { test, expect } = require('@playwright/test');
const TestHelper = require('../../utils/test-helpers');
const ApiHelper = require('../../utils/api-helpers');
const { testUsers } = require('../../fixtures/test-data');

test.describe('User Registration', () => {
  let apiHelper;

  test.beforeEach(async () => {
    apiHelper = new ApiHelper();
    await apiHelper.waitForBackend();
  });

  test('should successfully register a new user', async ({ page }) => {
    const newUser = {
      name: 'New User',
      email: 'newuser@test.com',
      password: 'TestPassword123!'
    };

    await TestHelper.registerUser(page, newUser);
    
    // Verify successful registration and login
    await TestHelper.assertAuthenticated(page);
    await expect(page.locator('[data-testid="user-name"]')).toContainText(newUser.name);
  });

  test('should show validation error for empty name', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');
    await page.click('[data-testid="register-button"]');
    
    // Verify validation error
    await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
  });

  test('should show validation error for invalid email format', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');
    await page.click('[data-testid="register-button"]');
    
    // Verify validation error
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format');
  });

  test('should show validation error for weak password', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'weak');
    await page.fill('[data-testid="confirm-password-input"]', 'weak');
    await page.click('[data-testid="register-button"]');
    
    // Verify validation error
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password must be at least 8 characters');
  });

  test('should show validation error for password mismatch', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'DifferentPassword123!');
    await page.click('[data-testid="register-button"]');
    
    // Verify validation error
    await expect(page.locator('[data-testid="confirm-password-error"]')).toContainText('Passwords do not match');
  });

  test('should show error for existing email', async ({ page }) => {
    // Create user via API first
    await apiHelper.createTestUser(testUsers.user1);
    
    // Try to register with same email
    await page.goto('/register');
    await page.fill('[data-testid="name-input"]', 'Different Name');
    await page.fill('[data-testid="email-input"]', testUsers.user1.email);
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');
    await page.click('[data-testid="register-button"]');
    
    // Verify error message
    await TestHelper.assertErrorMessage(page, 'Email already registered');
  });

  test('should show loading state during registration', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');
    await page.click('[data-testid="register-button"]');
    
    // Verify loading state
    await expect(page.locator('[data-testid="register-loading"]')).toBeVisible();
  });

  test('should prevent multiple registration attempts', async ({ page }) => {
    await page.goto('/register');
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');
    
    // Click register button multiple times
    await page.click('[data-testid="register-button"]');
    await page.click('[data-testid="register-button"]');
    await page.click('[data-testid="register-button"]');
    
    // Should only make one request
    await expect(page.locator('[data-testid="register-loading"]')).toBeVisible();
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.route('**/auth/register', route => route.abort());
    
    await page.goto('/register');
    await page.fill('[data-testid="name-input"]', 'Test User');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'TestPassword123!');
    await page.fill('[data-testid="confirm-password-input"]', 'TestPassword123!');
    await page.click('[data-testid="register-button"]');
    
    // Verify error handling
    await TestHelper.assertErrorMessage(page, 'Network error');
  });

  test('should navigate to login from registration page', async ({ page }) => {
    await page.goto('/register');
    await page.click('[data-testid="login-link"]');
    
    // Should navigate to login page
    await expect(page).toHaveURL('/login');
  });

  test('should validate form in real-time', async ({ page }) => {
    await page.goto('/register');
    
    // Start typing invalid email
    await page.fill('[data-testid="email-input"]', 'invalid');
    
    // Should show validation error immediately
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format');
    
    // Fix email
    await page.fill('[data-testid="email-input"]', 'valid@example.com');
    
    // Error should disappear
    await expect(page.locator('[data-testid="email-error"]')).not.toBeVisible();
  });
});
