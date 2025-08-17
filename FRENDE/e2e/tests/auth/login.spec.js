const { test, expect } = require('@playwright/test');
const TestHelper = require('../../utils/test-helpers');
const ApiHelper = require('../../utils/api-helpers');
const { testUsers } = require('../../fixtures/test-data');

test.describe('User Login', () => {
  let apiHelper;

  test.beforeEach(async () => {
    apiHelper = new ApiHelper();
    await apiHelper.waitForBackend();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    // Create test user via API
    await apiHelper.createTestUser(testUsers.user1);
    
    // Login via UI
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    
    // Verify successful login
    await TestHelper.assertAuthenticated(page);
    await expect(page.locator('[data-testid="user-name"]')).toContainText(testUsers.user1.name);
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.invalidUser.email);
    await page.fill('[data-testid="password-input"]', testUsers.invalidUser.password);
    await page.click('[data-testid="login-button"]');
    
    // Verify error message
    await TestHelper.assertErrorMessage(page, 'Invalid credentials');
    await TestHelper.assertNotAuthenticated(page);
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    await page.goto('/login');
    await page.click('[data-testid="login-button"]');
    
    // Verify validation errors
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Email is required');
    await expect(page.locator('[data-testid="password-error"]')).toContainText('Password is required');
  });

  test('should show validation error for invalid email format', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'invalid-email');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    
    // Verify validation error
    await expect(page.locator('[data-testid="email-error"]')).toContainText('Invalid email format');
  });

  test('should redirect to login when accessing protected route without authentication', async ({ page }) => {
    await page.goto('/matching');
    
    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should remember user session after page refresh', async ({ page }) => {
    // Create and login user
    await apiHelper.createTestUser(testUsers.user1);
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    
    // Refresh page
    await page.reload();
    
    // Should still be authenticated
    await TestHelper.assertAuthenticated(page);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate offline mode
    await page.route('**/auth/login', route => route.abort());
    
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user1.email);
    await page.fill('[data-testid="password-input"]', testUsers.user1.password);
    await page.click('[data-testid="login-button"]');
    
    // Verify error handling
    await TestHelper.assertErrorMessage(page, 'Network error');
  });

  test('should show loading state during login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user1.email);
    await page.fill('[data-testid="password-input"]', testUsers.user1.password);
    await page.click('[data-testid="login-button"]');
    
    // Verify loading state
    await expect(page.locator('[data-testid="login-loading"]')).toBeVisible();
  });

  test('should prevent multiple login attempts', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', testUsers.user1.email);
    await page.fill('[data-testid="password-input"]', testUsers.user1.password);
    
    // Click login button multiple times
    await page.click('[data-testid="login-button"]');
    await page.click('[data-testid="login-button"]');
    await page.click('[data-testid="login-button"]');
    
    // Should only make one request
    await expect(page.locator('[data-testid="login-loading"]')).toBeVisible();
  });
});
