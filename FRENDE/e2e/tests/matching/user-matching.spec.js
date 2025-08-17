const { test, expect } = require('@playwright/test');
const TestHelper = require('../../utils/test-helpers');
const ApiHelper = require('../../utils/api-helpers');
const { testUsers, testMatchScenarios } = require('../../fixtures/test-data');

test.describe('User Matching System', () => {
  let apiHelper;

  test.beforeEach(async () => {
    apiHelper = new ApiHelper();
    await apiHelper.waitForBackend();
  });

  test('should display compatible users for matching', async ({ page }) => {
    // Create test users with profiles
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    // Login and navigate to matching
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto('/matching');
    
    // Should see compatible users
    await expect(page.locator('[data-testid="user-card"]')).toBeVisible();
    await expect(page.locator(`text=${testUsers.user2.name}`)).toBeVisible();
  });

  test('should show compatibility score for users', async ({ page }) => {
    // Create test users with profiles
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    // Login and navigate to matching
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto('/matching');
    
    // Should see compatibility score
    await expect(page.locator('[data-testid="compatibility-score"]')).toBeVisible();
  });

  test('should send match request successfully', async ({ page }) => {
    // Create test users with profiles
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    // Login and navigate to matching
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto('/matching');
    
    // Send match request
    await TestHelper.sendMatchRequest(page, '[data-testid="user-card"]');
    
    // Verify success message
    await TestHelper.assertSuccessMessage(page, 'Request sent successfully');
  });

  test('should accept match request and create chat', async ({ page }) => {
    // Create test users with profiles
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    // Create match request via API
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Login as user2 and check for pending requests
    await TestHelper.loginUser(page, testUsers.user2.email, testUsers.user2.password);
    await page.goto('/matching');
    
    // Accept match request
    await TestHelper.acceptMatchRequest(page);
    
    // Should navigate to chat
    await expect(page).toHaveURL(/\/chat\/\d+/);
  });

  test('should reject match request', async ({ page }) => {
    // Create test users with profiles
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    // Create match request via API
    await apiHelper.createTestMatch(token1, token2);
    
    // Login as user2 and reject request
    await TestHelper.loginUser(page, testUsers.user2.email, testUsers.user2.password);
    await page.goto('/matching');
    
    await page.click('[data-testid="reject-request-button"]');
    await page.waitForSelector('[data-testid="request-rejected-success"]');
  });

  test('should show slot information and purchase option', async ({ page }) => {
    // Create test user
    const token = await apiHelper.createTestUser(testUsers.user1);
    await apiHelper.createUserProfile(token, testUsers.user1.profile);
    
    // Login and navigate to matching
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto('/matching');
    
    // Should see slot information
    await expect(page.locator('[data-testid="slots-remaining"]')).toBeVisible();
    await expect(page.locator('[data-testid="purchase-slot-button"]')).toBeVisible();
  });

  test('should purchase additional slot with coins', async ({ page }) => {
    // Create test user with coins
    const token = await apiHelper.createTestUser(testUsers.user1);
    await apiHelper.createUserProfile(token, testUsers.user1.profile);
    await apiHelper.awardCoins(token, 100, 'Test coins');
    
    // Login and navigate to matching
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto('/matching');
    
    // Purchase slot
    await TestHelper.purchaseSlot(page);
    
    // Verify success and updated slot count
    await TestHelper.assertSuccessMessage(page, 'Slot purchased successfully');
    await expect(page.locator('[data-testid="slots-remaining"]')).toContainText('3');
  });

  test('should show insufficient coins error when purchasing slot', async ({ page }) => {
    // Create test user without coins
    const token = await apiHelper.createTestUser(testUsers.user1);
    await apiHelper.createUserProfile(token, testUsers.user1.profile);
    
    // Login and navigate to matching
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto('/matching');
    
    // Try to purchase slot
    await page.click('[data-testid="purchase-slot-button"]');
    
    // Should show insufficient coins error
    await TestHelper.assertErrorMessage(page, 'Insufficient coins');
  });

  test('should filter users by community and location', async ({ page }) => {
    // Create test users with different communities
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user3);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user3.profile);
    
    // Login and navigate to matching
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto('/matching');
    
    // Filter by Technology community
    await page.selectOption('[data-testid="community-filter"]', 'Technology');
    await page.click('[data-testid="apply-filters-button"]');
    
    // Should only show technology users
    await expect(page.locator(`text=${testUsers.user2.name}`)).toBeVisible();
    await expect(page.locator(`text=${testUsers.user3.name}`)).not.toBeVisible();
  });

  test('should show no users available message', async ({ page }) => {
    // Create test user
    const token = await apiHelper.createTestUser(testUsers.user1);
    await apiHelper.createUserProfile(token, testUsers.user1.profile);
    
    // Login and navigate to matching
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto('/matching');
    
    // Should show no users message
    await expect(page.locator('[data-testid="no-users-message"]')).toBeVisible();
  });

  test('should handle match request errors gracefully', async ({ page }) => {
    // Create test users
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    // Login and navigate to matching
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto('/matching');
    
    // Simulate network error
    await page.route('**/match-requests/', route => route.abort());
    
    // Try to send match request
    await TestHelper.sendMatchRequest(page, '[data-testid="user-card"]');
    
    // Should show error message
    await TestHelper.assertErrorMessage(page, 'Network error');
  });

  test('should refresh matching page and show updated data', async ({ page }) => {
    // Create test user
    const token = await apiHelper.createTestUser(testUsers.user1);
    await apiHelper.createUserProfile(token, testUsers.user1.profile);
    
    // Login and navigate to matching
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto('/matching');
    
    // Refresh page
    await page.reload();
    
    // Should still show matching interface
    await expect(page.locator('[data-testid="matching-interface"]')).toBeVisible();
  });
});
