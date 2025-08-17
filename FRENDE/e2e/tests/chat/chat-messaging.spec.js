const { test, expect } = require('@playwright/test');
const TestHelper = require('../../utils/test-helpers');
const ApiHelper = require('../../utils/api-helpers');
const { testUsers, testMessages } = require('../../fixtures/test-data');

test.describe('Chat Messaging System', () => {
  let apiHelper;

  test.beforeEach(async () => {
    apiHelper = new ApiHelper();
    await apiHelper.waitForBackend();
  });

  test('should send and receive messages in real-time', async ({ page, context }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Create second page for user2
    const page2 = await context.newPage();
    
    // Login both users
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await TestHelper.loginUser(page2, testUsers.user2.email, testUsers.user2.password);
    
    // Navigate to chat
    await page.goto(`/chat/${match.id}`);
    await page2.goto(`/chat/${match.id}`);
    
    // Wait for WebSocket connections
    await TestHelper.waitForWebSocketConnection(page);
    await TestHelper.waitForWebSocketConnection(page2);
    
    // Send message from user1
    await TestHelper.sendMessage(page, testMessages.greeting);
    
    // Verify message appears on both pages
    await expect(page.locator(`text=${testMessages.greeting}`)).toBeVisible();
    await expect(page2.locator(`text=${testMessages.greeting}`)).toBeVisible();
    
    // Send response from user2
    await TestHelper.sendMessage(page2, testMessages.response);
    
    // Verify response appears on both pages
    await expect(page.locator(`text=${testMessages.response}`)).toBeVisible();
    await expect(page2.locator(`text=${testMessages.response}`)).toBeVisible();
  });

  test('should display typing indicators', async ({ page, context }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Create second page for user2
    const page2 = await context.newPage();
    
    // Login both users
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await TestHelper.loginUser(page2, testUsers.user2.email, testUsers.user2.password);
    
    // Navigate to chat
    await page.goto(`/chat/${match.id}`);
    await page2.goto(`/chat/${match.id}`);
    
    // Wait for WebSocket connections
    await TestHelper.waitForWebSocketConnection(page);
    await TestHelper.waitForWebSocketConnection(page2);
    
    // Start typing on page2
    await page2.fill('[data-testid="message-input"]', 'Hello');
    
    // Should show typing indicator on page1
    await expect(page.locator('[data-testid="typing-indicator"]')).toBeVisible();
    
    // Stop typing (clear input)
    await page2.fill('[data-testid="message-input"]', '');
    
    // Typing indicator should disappear
    await expect(page.locator('[data-testid="typing-indicator"]')).not.toBeVisible();
  });

  test('should load chat history', async ({ page }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Send messages via API
    await apiHelper.sendTestMessage(token1, match.id, testMessages.greeting);
    await apiHelper.sendTestMessage(token2, match.id, testMessages.response);
    await apiHelper.sendTestMessage(token1, match.id, testMessages.question);
    
    // Login and navigate to chat
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto(`/chat/${match.id}`);
    
    // Should see all messages in history
    await expect(page.locator(`text=${testMessages.greeting}`)).toBeVisible();
    await expect(page.locator(`text=${testMessages.response}`)).toBeVisible();
    await expect(page.locator(`text=${testMessages.question}`)).toBeVisible();
  });

  test('should handle long messages properly', async ({ page, context }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Create second page for user2
    const page2 = await context.newPage();
    
    // Login both users
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await TestHelper.loginUser(page2, testUsers.user2.email, testUsers.user2.password);
    
    // Navigate to chat
    await page.goto(`/chat/${match.id}`);
    await page2.goto(`/chat/${match.id}`);
    
    // Wait for WebSocket connections
    await TestHelper.waitForWebSocketConnection(page);
    await TestHelper.waitForWebSocketConnection(page2);
    
    // Send long message
    await TestHelper.sendMessage(page, testMessages.longMessage);
    
    // Verify long message displays properly
    await expect(page.locator(`text=${testMessages.longMessage}`)).toBeVisible();
    await expect(page2.locator(`text=${testMessages.longMessage}`)).toBeVisible();
  });

  test('should show online status', async ({ page, context }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Create second page for user2
    const page2 = await context.newPage();
    
    // Login both users
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await TestHelper.loginUser(page2, testUsers.user2.email, testUsers.user2.password);
    
    // Navigate to chat
    await page.goto(`/chat/${match.id}`);
    await page2.goto(`/chat/${match.id}`);
    
    // Wait for WebSocket connections
    await TestHelper.waitForWebSocketConnection(page);
    await TestHelper.waitForWebSocketConnection(page2);
    
    // Should show online status for both users
    await expect(page.locator('[data-testid="online-status"]')).toContainText('Online');
    await expect(page2.locator('[data-testid="online-status"]')).toContainText('Online');
  });

  test('should handle message sending errors gracefully', async ({ page }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Login and navigate to chat
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto(`/chat/${match.id}`);
    
    // Simulate network error
    await page.route('**/matches/*/chat', route => route.abort());
    
    // Try to send message
    await TestHelper.sendMessage(page, testMessages.greeting);
    
    // Should show error message
    await TestHelper.assertErrorMessage(page, 'Failed to send message');
  });

  test('should prevent sending empty messages', async ({ page }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Login and navigate to chat
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto(`/chat/${match.id}`);
    
    // Try to send empty message
    await page.click('[data-testid="send-button"]');
    
    // Send button should be disabled
    await expect(page.locator('[data-testid="send-button"]')).toBeDisabled();
  });

  test('should handle WebSocket disconnection and reconnection', async ({ page }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Login and navigate to chat
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await page.goto(`/chat/${match.id}`);
    
    // Wait for WebSocket connection
    await TestHelper.waitForWebSocketConnection(page);
    
    // Simulate WebSocket disconnection
    await page.evaluate(() => {
      if (window.socket) {
        window.socket.disconnect();
      }
    });
    
    // Should show reconnecting message
    await expect(page.locator('[data-testid="reconnecting-message"]')).toBeVisible();
    
    // Wait for reconnection
    await TestHelper.waitForWebSocketConnection(page);
    
    // Should show connected status
    await expect(page.locator('[data-testid="connection-status"]')).toContainText('Connected');
  });

  test('should scroll to bottom when new messages arrive', async ({ page, context }) => {
    // Create test users and match
    const token1 = await apiHelper.createTestUser(testUsers.user1);
    const token2 = await apiHelper.createTestUser(testUsers.user2);
    
    await apiHelper.createUserProfile(token1, testUsers.user1.profile);
    await apiHelper.createUserProfile(token2, testUsers.user2.profile);
    
    const match = await apiHelper.createTestMatch(token1, token2);
    
    // Create second page for user2
    const page2 = await context.newPage();
    
    // Login both users
    await TestHelper.loginUser(page, testUsers.user1.email, testUsers.user1.password);
    await TestHelper.loginUser(page2, testUsers.user2.email, testUsers.user2.password);
    
    // Navigate to chat
    await page.goto(`/chat/${match.id}`);
    await page2.goto(`/chat/${match.id}`);
    
    // Wait for WebSocket connections
    await TestHelper.waitForWebSocketConnection(page);
    await TestHelper.waitForWebSocketConnection(page2);
    
    // Send multiple messages to create scroll
    for (let i = 0; i < 10; i++) {
      await TestHelper.sendMessage(page, `Message ${i + 1}`);
    }
    
    // Scroll up on page2
    await page2.evaluate(() => {
      const chatContainer = document.querySelector('[data-testid="chat-messages"]');
      chatContainer.scrollTop = 0;
    });
    
    // Send new message from page
    await TestHelper.sendMessage(page, 'New message at bottom');
    
    // Should auto-scroll to bottom on page2
    await page2.waitForFunction(() => {
      const chatContainer = document.querySelector('[data-testid="chat-messages"]');
      return chatContainer.scrollTop === chatContainer.scrollHeight;
    });
  });
});
