const { test, expect } = require('@playwright/test');
const TestHelper = require('../../utils/test-helpers');
const ApiHelper = require('../../utils/api-helpers');
const { testUsers, testMessages, testTasks } = require('../../fixtures/test-data');

test.describe('Complete User Journey', () => {
  let apiHelper;

  test.beforeEach(async () => {
    apiHelper = new ApiHelper();
    await apiHelper.waitForBackend();
  });

  test('should complete full user journey: registration to task completion', async ({ page, context }) => {
    // Step 1: User registration
    const newUser1 = {
      name: 'Journey User 1',
      email: 'journey1@test.com',
      password: 'TestPassword123!'
    };
    
    const newUser2 = {
      name: 'Journey User 2',
      email: 'journey2@test.com',
      password: 'TestPassword123!'
    };

    // Register both users
    await TestHelper.registerUser(page, newUser1);
    await page.goto('/logout');
    
    const page2 = await context.newPage();
    await TestHelper.registerUser(page2, newUser2);
    await page2.goto('/logout');

    // Step 2: Complete profiles
    await TestHelper.loginUser(page, newUser1.email, newUser1.password);
    await TestHelper.createProfile(page, {
      age: 25,
      profession: 'Software Engineer',
      profileText: 'I love coding and making new friends!',
      community: 'Technology',
      location: 'San Francisco'
    });

    await TestHelper.loginUser(page2, newUser2.email, newUser2.password);
    await TestHelper.createProfile(page2, {
      age: 28,
      profession: 'Data Scientist',
      profileText: 'Passionate about AI and meeting new people!',
      community: 'Technology',
      location: 'New York'
    });

    // Step 3: Navigate to matching
    await page.goto('/matching');
    await page2.goto('/matching');

    // Step 4: Send and accept match request
    await TestHelper.sendMatchRequest(page, '[data-testid="user-card"]');
    await TestHelper.acceptMatchRequest(page2);

    // Step 5: Navigate to chat
    await expect(page).toHaveURL(/\/chat\/\d+/);
    await expect(page2).toHaveURL(/\/chat\/\d+/);

    // Step 6: Send initial messages
    await TestHelper.waitForWebSocketConnection(page);
    await TestHelper.waitForWebSocketConnection(page2);

    await TestHelper.sendMessage(page, testMessages.greeting);
    await TestHelper.sendMessage(page2, testMessages.response);

    // Step 7: Complete a task together
    await TestHelper.completeTask(page, 'Test task for E2E testing');
    await TestHelper.completeTask(page2, 'Test task for E2E testing');

    // Step 8: Verify task completion and rewards
    await TestHelper.assertSuccessMessage(page, 'Task completed successfully');
    await TestHelper.assertSuccessMessage(page2, 'Task completed successfully');

    // Step 9: Check coin balance
    await page.goto('/profile');
    await page2.goto('/profile');

    await expect(page.locator('[data-testid="coin-balance"]')).toBeVisible();
    await expect(page2.locator('[data-testid="coin-balance"]')).toBeVisible();
  });

  test('should handle complete user journey with profile picture upload', async ({ page, context }) => {
    // Step 1: User registration
    const newUser = {
      name: 'Picture User',
      email: 'picture@test.com',
      password: 'TestPassword123!'
    };

    await TestHelper.registerUser(page, newUser);

    // Step 2: Upload profile picture
    await page.goto('/profile');
    await TestHelper.uploadProfilePicture(page, './fixtures/test-images/valid-profile.jpg');

    // Step 3: Complete profile
    await TestHelper.createProfile(page, {
      age: 26,
      profession: 'Designer',
      profileText: 'Creative designer who loves art and photography!',
      community: 'Arts',
      location: 'Los Angeles'
    });

    // Step 4: Verify profile picture is displayed
    await expect(page.locator('[data-testid="profile-picture"]')).toBeVisible();
    await expect(page.locator('[data-testid="profile-picture"]')).toHaveAttribute('src', /valid-profile/);

    // Step 5: Navigate to matching and verify picture appears
    await page.goto('/matching');
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible();
  });

  test('should complete user journey with slot purchase', async ({ page, context }) => {
    // Step 1: User registration and profile setup
    const newUser1 = {
      name: 'Slot User 1',
      email: 'slot1@test.com',
      password: 'TestPassword123!'
    };
    
    const newUser2 = {
      name: 'Slot User 2',
      email: 'slot2@test.com',
      password: 'TestPassword123!'
    };

    await TestHelper.registerUser(page, newUser1);
    await page.goto('/logout');
    
    const page2 = await context.newPage();
    await TestHelper.registerUser(page2, newUser2);
    await page2.goto('/logout');

    // Complete profiles
    await TestHelper.loginUser(page, newUser1.email, newUser1.password);
    await TestHelper.createProfile(page, {
      age: 24,
      profession: 'Student',
      profileText: 'Student looking for study buddies!',
      community: 'Education',
      location: 'Boston'
    });

    await TestHelper.loginUser(page2, newUser2.email, newUser2.password);
    await TestHelper.createProfile(page2, {
      age: 25,
      profession: 'Student',
      profileText: 'Also a student, would love to study together!',
      community: 'Education',
      location: 'Boston'
    });

    // Step 2: Award coins to user1 for slot purchase
    const token1 = await apiHelper.loginUser(newUser1.email, newUser1.password);
    await apiHelper.awardCoins(token1, 100, 'Welcome bonus');

    // Step 3: Purchase additional slot
    await page.goto('/matching');
    await TestHelper.purchaseSlot(page);

    // Step 4: Verify slot count increased
    await expect(page.locator('[data-testid="slots-remaining"]')).toContainText('3');

    // Step 5: Send match request
    await TestHelper.sendMatchRequest(page, '[data-testid="user-card"]');

    // Step 6: Accept match request
    await TestHelper.acceptMatchRequest(page2);

    // Step 7: Navigate to chat and verify connection
    await expect(page).toHaveURL(/\/chat\/\d+/);
    await expect(page2).toHaveURL(/\/chat\/\d+/);
  });

  test('should handle user journey with automatic greeting', async ({ page, context }) => {
    // Step 1: User registration and profile setup
    const newUser1 = {
      name: 'Greeting User 1',
      email: 'greeting1@test.com',
      password: 'TestPassword123!'
    };
    
    const newUser2 = {
      name: 'Greeting User 2',
      email: 'greeting2@test.com',
      password: 'TestPassword123!'
    };

    await TestHelper.registerUser(page, newUser1);
    await page.goto('/logout');
    
    const page2 = await context.newPage();
    await TestHelper.registerUser(page2, newUser2);
    await page2.goto('/logout');

    // Complete profiles
    await TestHelper.loginUser(page, newUser1.email, newUser1.password);
    await TestHelper.createProfile(page, {
      age: 27,
      profession: 'Teacher',
      profileText: 'Teacher who loves helping others learn!',
      community: 'Education',
      location: 'Chicago'
    });

    await TestHelper.loginUser(page2, newUser2.email, newUser2.password);
    await TestHelper.createProfile(page2, {
      age: 29,
      profession: 'Counselor',
      profileText: 'Counselor who enjoys supporting people!',
      community: 'Education',
      location: 'Chicago'
    });

    // Step 2: Create match and navigate to chat
    const token1 = await apiHelper.loginUser(newUser1.email, newUser1.password);
    const token2 = await apiHelper.loginUser(newUser2.email, newUser2.password);
    const match = await apiHelper.createTestMatch(token1, token2);

    await page.goto(`/chat/${match.id}`);
    await page2.goto(`/chat/${match.id}`);

    // Step 3: Wait for automatic greeting
    await TestHelper.waitForWebSocketConnection(page);
    await TestHelper.waitForWebSocketConnection(page2);

    // Step 4: Verify automatic greeting appears
    await expect(page.locator('[data-testid="automatic-greeting"]')).toBeVisible();
    await expect(page2.locator('[data-testid="automatic-greeting"]')).toBeVisible();

    // Step 5: Send conversation starter
    await page.click('[data-testid="conversation-starter-button"]');
    await expect(page.locator('[data-testid="conversation-starter-message"]')).toBeVisible();
  });

  test('should handle user journey with task rewards and statistics', async ({ page, context }) => {
    // Step 1: User registration and profile setup
    const newUser1 = {
      name: 'Task User 1',
      email: 'task1@test.com',
      password: 'TestPassword123!'
    };
    
    const newUser2 = {
      name: 'Task User 2',
      email: 'task2@test.com',
      password: 'TestPassword123!'
    };

    await TestHelper.registerUser(page, newUser1);
    await page.goto('/logout');
    
    const page2 = await context.newPage();
    await TestHelper.registerUser(page2, newUser2);
    await page2.goto('/logout');

    // Complete profiles
    await TestHelper.loginUser(page, newUser1.email, newUser1.password);
    await TestHelper.createProfile(page, {
      age: 30,
      profession: 'Engineer',
      profileText: 'Engineer who loves solving problems!',
      community: 'Technology',
      location: 'Seattle'
    });

    await TestHelper.loginUser(page2, newUser2.email, newUser2.password);
    await TestHelper.createProfile(page2, {
      age: 31,
      profession: 'Developer',
      profileText: 'Developer who enjoys coding and collaboration!',
      community: 'Technology',
      location: 'Seattle'
    });

    // Step 2: Create match and navigate to chat
    const token1 = await apiHelper.loginUser(newUser1.email, newUser1.password);
    const token2 = await apiHelper.loginUser(newUser2.email, newUser2.password);
    const match = await apiHelper.createTestMatch(token1, token2);

    await page.goto(`/chat/${match.id}`);
    await page2.goto(`/chat/${match.id}`);

    // Step 3: Complete multiple tasks
    await TestHelper.waitForWebSocketConnection(page);
    await TestHelper.waitForWebSocketConnection(page2);

    // Complete first task
    await TestHelper.completeTask(page, 'Test task for E2E testing');
    await TestHelper.completeTask(page2, 'Test task for E2E testing');

    // Wait for new task to appear
    await page.waitForSelector('[data-testid="task-card"]');
    await page2.waitForSelector('[data-testid="task-card"]');

    // Complete second task
    await TestHelper.completeTask(page, 'Test task for E2E testing');
    await TestHelper.completeTask(page2, 'Test task for E2E testing');

    // Step 4: Check task statistics
    await page.goto('/tasks');
    await page2.goto('/tasks');

    await expect(page.locator('[data-testid="tasks-completed"]')).toContainText('2');
    await expect(page2.locator('[data-testid="tasks-completed"]')).toContainText('2');

    await expect(page.locator('[data-testid="coins-earned"]')).toBeVisible();
    await expect(page2.locator('[data-testid="coins-earned"]')).toBeVisible();

    // Step 5: Check task history
    await expect(page.locator('[data-testid="task-history"]')).toBeVisible();
    await expect(page2.locator('[data-testid="task-history"]')).toBeVisible();
  });

  test('should handle user journey with error recovery', async ({ page, context }) => {
    // Step 1: User registration
    const newUser = {
      name: 'Error User',
      email: 'error@test.com',
      password: 'TestPassword123!'
    };

    await TestHelper.registerUser(page, newUser);

    // Step 2: Simulate network error during profile creation
    await page.goto('/profile');
    await page.route('**/users/profile', route => route.abort());

    await page.fill('[data-testid="age-input"]', '25');
    await page.fill('[data-testid="profession-input"]', 'Tester');
    await page.fill('[data-testid="profile-text-input"]', 'Testing error handling!');
    await page.selectOption('[data-testid="community-select"]', 'Technology');
    await page.selectOption('[data-testid="location-select"]', 'San Francisco');
    await page.click('[data-testid="save-profile-button"]');

    // Step 3: Verify error handling
    await TestHelper.assertErrorMessage(page, 'Network error');

    // Step 4: Retry with network restored
    await page.route('**/users/profile', route => route.continue());
    await page.click('[data-testid="retry-button"]');

    // Step 5: Verify successful profile creation
    await page.waitForSelector('[data-testid="profile-saved-success"]');

    // Step 6: Navigate to matching
    await page.goto('/matching');
    await expect(page.locator('[data-testid="matching-interface"]')).toBeVisible();
  });
});
