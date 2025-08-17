const axios = require('axios');

class ApiHelper {
  constructor(baseURL = 'http://localhost:8000') {
    this.baseURL = baseURL;
    this.client = axios.create({
      baseURL,
      timeout: 10000,
    });
  }

  /**
   * Create a test user via API
   */
  async createTestUser(userData) {
    const response = await this.client.post('/auth/register', {
      name: userData.name,
      email: userData.email,
      password: userData.password,
    });
    return response.data;
  }

  /**
   * Login a user and get access token
   */
  async loginUser(email, password) {
    const response = await this.client.post('/auth/login', {
      email,
      password,
    });
    return response.data.access_token;
  }

  /**
   * Create a user profile via API
   */
  async createUserProfile(token, profileData) {
    const response = await this.client.put('/users/profile', profileData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  /**
   * Create a test match between two users
   */
  async createTestMatch(token1, token2) {
    // Create match request
    const user2Response = await this.client.get('/users/me', {
      headers: { Authorization: `Bearer ${token2}` }
    });
    
    const matchRequest = await this.client.post('/match-requests/', {
      recipient_id: user2Response.data.id,
    }, {
      headers: { Authorization: `Bearer ${token1}` }
    });

    // Accept match request
    const match = await this.client.post(`/match-requests/${matchRequest.data.id}/accept`, {}, {
      headers: { Authorization: `Bearer ${token2}` }
    });

    return match.data;
  }

  /**
   * Create a test task for a match
   */
  async createTestTask(token, matchId) {
    const response = await this.client.post(`/matches/${matchId}/tasks`, {
      description: 'Test task for E2E testing',
      reward_coins: 10,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  /**
   * Send a test message in chat
   */
  async sendTestMessage(token, matchId, message) {
    const response = await this.client.post(`/matches/${matchId}/chat`, {
      content: message,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  /**
   * Get user's coin balance
   */
  async getCoinBalance(token) {
    const response = await this.client.get('/users/coins', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.balance;
  }

  /**
   * Award coins to a user
   */
  async awardCoins(token, amount, reason) {
    const response = await this.client.post('/users/coins/award', {
      amount,
      reason,
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(token) {
    try {
      // Delete user's matches
      const matches = await this.client.get('/matches', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      for (const match of matches.data) {
        await this.client.delete(`/matches/${match.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      // Delete user's match requests
      const requests = await this.client.get('/match-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      for (const request of requests.data) {
        await this.client.delete(`/match-requests/${request.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.warn('Error during cleanup:', error.message);
    }
  }

  /**
   * Wait for backend to be ready
   */
  async waitForBackend() {
    let retries = 30;
    while (retries > 0) {
      try {
        await this.client.get('/health');
        return;
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error('Backend not ready after 30 retries');
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }
}

module.exports = ApiHelper;
