const { test, expect } = require('@playwright/test');
const TestHelper = require('../../utils/test-helpers');
const ApiHelper = require('../../utils/api-helpers');
const { testUsers, testTasks } = require('../../fixtures/test-data');

test.describe('Task Completion System', () => {
  let apiHelper;

  test.beforeEach(async () => {
    apiHelper = new ApiHelper();
    await apiHelper.waitForBackend();
  });

  test('should display tasks for a match', async ({ page }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Create task via API
    await apiHelper.createTestTask(token1, match.id);
    
    // Login and navigate to chat
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto(`/chat/${match.id}`);
    
    // Should see task in chat
    await expect(page.locator('[data-testid="task-card"]')).toBeVisible();
    await expect(page.locator('text=Test task for E2E testing')).toBeVisible();
  });

  test('should complete task and award coins', async ({ page, context }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Create task via API
    const task = await apiHelper.createTestTask(token1, match.id);
    
    // Create second page for user2
    const page2 = await context.newPage();
    
    // Login both users
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await TestHelper.loginUser(page2, testUsers.user2.email, testUsers.user2.password);
    
    // Navigate to chat
    await page.goto(`/chat/${match.id}`);
    await page2.goto(`/chat/${match.id}`);
    
    // Complete task on both pages
    await TestHelper.completeTask(page, 'Test task for E2E testing');
    await TestHelper.completeTask(page2, 'Test task for E2E testing');
    
    // Should show completion success on both pages
    await TestHelper.assertSuccessMessage(page, 'Task completed successfully');
    await TestHelper.assertSuccessMessage(page2, 'Task completed successfully');
    
    // Should show coin reward notification
    await expect(page.locator('[data-testid="coin-reward-notification"]')).toBeVisible();
    await expect(page2.locator('[data-testid="coin-reward-notification"]')).toBeVisible();
  });

  test('should show task progress for incomplete tasks', async ({ page, context }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Create task via API
    await apiHelper.createTestTask(token1, match.id);
    
    // Create second page for user2
    const page2 = await context.newPage();
    
    // Login both users
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await TestHelper.loginUser(page2, testUsers.user2.email, testUsers.user2.password);
    
    // Navigate to chat
    await page.goto(`/chat/${match.id}`);
    await page2.goto(`/chat/${match.id}`);
    
    // Complete task on one page only
    await TestHelper.completeTask(page, 'Test task for E2E testing');
    
    // Should show progress indicator
    await expect(page.locator('[data-testid="task-progress"]')).toContainText('1/2 completed');
    await expect(page2.locator('[data-testid="task-progress"]')).toContainText('1/2 completed');
  });

  test('should replace task after expiration', async ({ page }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Create task with short expiration via API
    await apiHelper.createTestTask(token1, match.id);
    
    // Login and navigate to chat
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto(`/chat/${match.id}`);
    
    // Wait for task expiration (simulated)
    await page.waitForTimeout(2000);
    
    // Should show new task
    await expect(page.locator('[data-testid="task-replaced-notification"]')).toBeVisible();
  });

  test('should show task history', async ({ page }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Create and complete multiple tasks via API
    await apiHelper.createTestTask(token1, match.id);
    await apiHelper.createTestTask(token1, match.id);
    
    // Login and navigate to tasks page
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto('/tasks');
    
    // Should see task history
    await expect(page.locator('[data-testid="task-history"]')).toBeVisible();
    await expect(page.locator('[data-testid="completed-task"]')).toBeVisible();
  });

  test('should handle task submission with evidence', async ({ page, context }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Create task via API
    await apiHelper.createTestTask(token1, match.id);
    
    // Create second page for user2
    const page2 = await context.newPage();
    
    // Login both users
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await TestHelper.loginUser(page2, testUsers.user2.email, testUsers.user2.password);
    
    // Navigate to chat
    await page.goto(`/chat/${match.id}`);
    await page2.goto(`/chat/${match.id}`);
    
    // Submit task with evidence
    await page.click('[data-testid="submit-task-button"]');
    await page.fill('[data-testid="task-evidence-input"]', 'We completed the task together!');
    await page.click('[data-testid="confirm-submission-button"]');
    
    // Should show submission success
    await TestHelper.assertSuccessMessage(page, 'Task submitted successfully');
  });

  test('should show task statistics', async ({ page }) => {
    // Create test user
    const token = await apiHelper.createTestUser(testUsers.user1);
    await apiHelper.createUserProfile(token, testUsers.user1.profile);
    
    // Award some coins for completed tasks
    await apiHelper.awardCoins(token, 50, 'Completed tasks');
    
    // Login and navigate to tasks page
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto('/tasks');
    
    // Should see task statistics
    await expect(page.locator('[data-testid="tasks-completed"]')).toBeVisible();
    await expect(page.locator('[data-testid="coins-earned"]')).toBeVisible();
    await expect(page.locator('[data-testid="task-success-rate"]')).toBeVisible();
  });

  test('should handle task completion errors gracefully', async ({ page }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Create task via API
    await apiHelper.createTestTask(token1, match.id);
    
    // Login and navigate to chat
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto(`/chat/${match.id}`);
    
    // Simulate network error
    await page.route('**/matches/*/tasks/*/complete', route => route.abort());
    
    // Try to complete task
    await TestHelper.completeTask(page, 'Test task for E2E testing');
    
    // Should show error message
    await TestHelper.assertErrorMessage(page, 'Failed to complete task');
  });

  test('should prevent completing already completed tasks', async ({ page, context }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Create task via API
    await apiHelper.createTestTask(token1, match.id);
    
    // Create second page for user2
    const page2 = await context.newPage();
    
    // Login both users
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await TestHelper.loginUser(page2, testUsers.user2.email, testUsers.user2.password);
    
    // Navigate to chat
    await page.goto(`/chat/${match.id}`);
    await page2.goto(`/chat/${match.id}`);
    
    // Complete task on both pages
    await TestHelper.completeTask(page, 'Test task for E2E testing');
    await TestHelper.completeTask(page2, 'Test task for E2E testing');
    
    // Try to complete again
    await page.click('[data-testid="complete-task-button"]');
    
    // Should show already completed message
    await TestHelper.assertErrorMessage(page, 'Task already completed');
  });

  test('should show task expiration timer', async ({ page }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Create task via API
    await apiHelper.createTestTask(token1, match.id);
    
    // Login and navigate to chat
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto(`/chat/${match.id}`);
    
    // Should see expiration timer
    await expect(page.locator('[data-testid="task-expiration-timer"]')).toBeVisible();
  });

  test('should handle task replacement notification', async ({ page }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Create task via API
    await apiHelper.createTestTask(token1, match.id);
    
    // Login and navigate to chat
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto(`/chat/${match.id}`);
    
    // Simulate task replacement
    await page.evaluate(() => {
      // Trigger task replacement event
      window.dispatchEvent(new CustomEvent('taskReplaced', {
        detail: { newTask: 'New replacement task' }
      }));
    });
    
    // Should show replacement notification
    await expect(page.locator('[data-testid="task-replacement-notification"]')).toBeVisible();
  });
});
