const { expect } = require('@playwright/test');

class TestHelper {
  /**
   * Login a user with provided credentials
   */
  static async loginUser(page, email, password) {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', email);
    await page.fill('[data-testid="password-input"]', password);
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/matching');
  }

  /**
   * Register a new user
   */
  static async registerUser(page, userData) {
    await page.goto('/register');
    await page.fill('[data-testid="name-input"]', userData.name);
    await page.fill('[data-testid="email-input"]', userData.email);
    await page.fill('[data-testid="password-input"]', userData.password);
    await page.fill('[data-testid="confirm-password-input"]', userData.password);
    await page.click('[data-testid="register-button"]');
    await page.waitForURL('/matching');
  }

  /**
   * Create a complete user profile
   */
  static async createProfile(page, profileData) {
    await page.goto('/profile');
    await page.fill('[data-testid="age-input"]', profileData.age.toString());
    await page.fill('[data-testid="profession-input"]', profileData.profession);
    await page.fill('[data-testid="profile-text-input"]', profileData.profileText);
    await page.selectOption('[data-testid="community-select"]', profileData.community);
    await page.selectOption('[data-testid="location-select"]', profileData.location);
    await page.click('[data-testid="save-profile-button"]');
    await page.waitForSelector('[data-testid="profile-saved-success"]');
  }

  /**
   * Send a message in chat
   */
  static async sendMessage(page, message) {
    await page.fill('[data-testid="message-input"]', message);
    await page.click('[data-testid="send-button"]');
    await page.waitForSelector(`text=${message}`);
  }

  /**
   * Complete a task
   */
  static async completeTask(page, taskDescription) {
    await page.click(`[data-testid="task-card"]:has-text("${taskDescription}")`);
    await page.click('[data-testid="complete-task-button"]');
    await page.waitForSelector('[data-testid="task-completed-success"]');
  }

  /**
   * Purchase a slot
   */
  static async purchaseSlot(page) {
    await page.click('[data-testid="purchase-slot-button"]');
    await page.click('[data-testid="confirm-purchase-button"]');
    await page.waitForSelector('[data-testid="slot-purchased-success"]');
  }

  /**
   * Send a match request
   */
  static async sendMatchRequest(page, userCardSelector) {
    await page.click(`${userCardSelector} [data-testid="send-request-button"]`);
    await page.waitForSelector('[data-testid="request-sent-success"]');
  }

  /**
   * Accept a match request
   */
  static async acceptMatchRequest(page) {
    await page.click('[data-testid="accept-request-button"]');
    await page.waitForURL(/\/chat\/\d+/);
  }

  /**
   * Upload a profile picture
   */
  static async uploadProfilePicture(page, imagePath) {
    await page.setInputFiles('[data-testid="profile-picture-input"]', imagePath);
    await page.click('[data-testid="crop-save-button"]');
    await page.waitForSelector('[data-testid="picture-uploaded-success"]');
  }

  /**
   * Wait for WebSocket connection
   */
  static async waitForWebSocketConnection(page) {
    await page.waitForFunction(() => {
      return window.socket && window.socket.connected;
    });
  }

  /**
   * Assert user is authenticated
   */
  static async assertAuthenticated(page) {
    await expect(page).toHaveURL(/\/matching|\/chat|\/profile|\/tasks/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  }

  /**
   * Assert user is not authenticated
   */
  static async assertNotAuthenticated(page) {
    await expect(page).toHaveURL(/\/login|\/register/);
  }

  /**
   * Wait for loading to complete
   */
  static async waitForLoadingComplete(page) {
    await page.waitForSelector('[data-testid="loading-spinner"]', { state: 'hidden' });
  }

  /**
   * Assert error message is displayed
   */
  static async assertErrorMessage(page, expectedMessage) {
    await expect(page.locator('[data-testid="error-message"]')).toContainText(expectedMessage);
  }

  /**
   * Assert success message is displayed
   */
  static async assertSuccessMessage(page, expectedMessage) {
    await expect(page.locator('[data-testid="success-message"]')).toContainText(expectedMessage);
  }
}

module.exports = TestHelper;
