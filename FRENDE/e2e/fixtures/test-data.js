// Test user data for E2E tests
const testUsers = {
  user1: {
    name: 'Alice Johnson',
    email: 'alice.johnson@test.com',
    password: 'TestPassword123!',
    profile: {
      age: 25,
      profession: 'Software Engineer',
      profileText: 'I love coding, hiking, and meeting new people!',
      community: 'Technology',
      location: 'San Francisco'
    }
  },
  user2: {
    name: 'Bob Smith',
    email: 'bob.smith@test.com',
    password: 'TestPassword123!',
    profile: {
      age: 28,
      profession: 'Data Scientist',
      profileText: 'Passionate about AI, coffee, and board games.',
      community: 'Technology',
      location: 'New York'
    }
  },
  user3: {
    name: 'Carol Davis',
    email: 'carol.davis@test.com',
    password: 'TestPassword123!',
    profile: {
      age: 23,
      profession: 'Graphic Designer',
      profileText: 'Creative soul who loves art, music, and travel.',
      community: 'Arts',
      location: 'Los Angeles'
    }
  },
  invalidUser: {
    name: 'Invalid User',
    email: 'invalid@test.com',
    password: 'WrongPassword123!'
  }
};

// Test task data
const testTasks = {
  simpleTask: {
    description: 'Share your favorite movie with your friend',
    reward_coins: 10
  },
  creativeTask: {
    description: 'Create a short story together about a magical forest',
    reward_coins: 15
  },
  socialTask: {
    description: 'Plan a virtual coffee date and discuss your dreams',
    reward_coins: 20
  }
};

// Test message data
const testMessages = {
  greeting: 'Hello! Nice to meet you!',
  response: 'Hi there! Great to meet you too!',
  question: 'What do you like to do for fun?',
  answer: 'I love reading books and watching movies. How about you?',
  longMessage: 'This is a longer message to test how the chat handles messages with more content. It should wrap properly and display correctly in the chat interface.'
};

// Test profile picture data
const testImages = {
  validImage: {
    path: './fixtures/test-images/valid-profile.jpg',
    size: '320x320',
    format: 'JPEG'
  },
  largeImage: {
    path: './fixtures/test-images/large-image.jpg',
    size: '1024x1024',
    format: 'JPEG'
  },
  invalidFormat: {
    path: './fixtures/test-images/invalid-format.txt',
    size: '100x100',
    format: 'TXT'
  }
};

// Test match scenarios
const testMatchScenarios = {
  compatibleUsers: {
    user1: testUsers.user1,
    user2: testUsers.user2,
    expectedCompatibility: 'high'
  },
  differentCommunities: {
    user1: testUsers.user1,
    user2: testUsers.user3,
    expectedCompatibility: 'medium'
  }
};

// Test error scenarios
const testErrorScenarios = {
  invalidLogin: {
    email: 'nonexistent@test.com',
    password: 'wrongpassword',
    expectedError: 'Invalid credentials'
  },
  invalidRegistration: {
    name: '',
    email: 'invalid-email',
    password: 'short',
    expectedError: 'Validation error'
  },
  networkError: {
    scenario: 'offline',
    expectedError: 'Network error'
  }
};

// Test performance scenarios
const testPerformanceScenarios = {
  largeChatHistory: {
    messageCount: 100,
    expectedLoadTime: 3000 // ms
  },
  manyUsers: {
    userCount: 50,
    expectedLoadTime: 5000 // ms
  }
};

module.exports = {
  testUsers,
  testTasks,
  testMessages,
  testImages,
  testMatchScenarios,
  testErrorScenarios,
  testPerformanceScenarios
};
