# Task List: Frende Core Features Implementation

## Relevant Files

### Frontend Files
- `FRENDE/frontend/src/App.jsx` - Main app component, needs routing and layout updates
- `FRENDE/frontend/src/components/Chat.jsx` - Existing chat component, needs real-time integration
- `FRENDE/frontend/src/components/Profile.jsx` - New component for user profile management
- `FRENDE/frontend/src/components/Matching.jsx` - New component for friend matching interface
- `FRENDE/frontend/src/components/Tasks.jsx` - New component for AI-generated tasks
- `FRENDE/frontend/src/components/TaskCard.jsx` - New component for individual task display
- `FRENDE/frontend/src/components/ProfileForm.jsx` - New component for profile editing
- `FRENDE/frontend/src/components/ImageUpload.jsx` - New component for profile picture upload
- `FRENDE/frontend/src/components/ui/button.jsx` - Existing UI component
- `FRENDE/frontend/src/components/ui/card.jsx` - Existing UI component
- `FRENDE/frontend/src/components/ui/input.jsx` - Existing UI component
- `FRENDE/frontend/src/components/ui/avatar.jsx` - New UI component for profile pictures
- `FRENDE/frontend/src/components/ui/modal.jsx` - New UI component for dialogs
- `FRENDE/frontend/src/lib/api.js` - New API client for backend communication
- `FRENDE/frontend/src/lib/socket.js` - New Socket.IO client configuration
- `FRENDE/frontend/src/lib/auth.js` - New authentication utilities
- `FRENDE/frontend/src/hooks/useAuth.js` - New React hook for authentication
- `FRENDE/frontend/src/hooks/useSocket.js` - New React hook for Socket.IO
- `FRENDE/frontend/src/hooks/useTasks.js` - New React hook for task management
- `FRENDE/frontend/src/hooks/useMatching.js` - New React hook for matching logic
- `FRENDE/frontend/src/contexts/AuthContext.jsx` - New context for authentication state
- `FRENDE/frontend/src/contexts/TaskContext.jsx` - New context for task state
- `FRENDE/frontend/src/utils/validation.js` - New utility for form validation
- `FRENDE/frontend/src/utils/imageProcessing.js` - New utility for image handling

### Backend Files
- `FRENDE/backend/main.py` - Main FastAPI app, needs major expansion
- `FRENDE/backend/models/` - New directory for SQLAlchemy models
- `FRENDE/backend/models/user.py` - User model with profile data
- `FRENDE/backend/models/match.py` - Match model for friend connections
- `FRENDE/backend/models/task.py` - Task model for AI-generated tasks
- `FRENDE/backend/models/chat.py` - Chat message model
- `FRENDE/backend/schemas/` - New directory for Pydantic schemas
- `FRENDE/backend/schemas/user.py` - User request/response schemas
- `FRENDE/backend/schemas/match.py` - Match request/response schemas
- `FRENDE/backend/schemas/task.py` - Task request/response schemas
- `FRENDE/backend/schemas/chat.py` - Chat message schemas
- `FRENDE/backend/api/` - New directory for API routes
- `FRENDE/backend/api/auth.py` - Authentication endpoints
- `FRENDE/backend/api/users.py` - User profile endpoints
- `FRENDE/backend/api/matching.py` - Matching algorithm endpoints
- `FRENDE/backend/api/tasks.py` - Task management endpoints
- `FRENDE/backend/api/chat.py` - Chat endpoints
- `FRENDE/backend/services/` - New directory for business logic
- `FRENDE/backend/services/matching.py` - Compatibility algorithm service
- `FRENDE/backend/services/ai.py` - Gemini AI integration service
- `FRENDE/backend/services/tasks.py` - Task generation and management
- `FRENDE/backend/services/chat.py` - Chat room management
- `FRENDE/backend/core/` - New directory for core functionality
- `FRENDE/backend/core/config.py` - Application configuration
- `FRENDE/backend/core/database.py` - Database connection setup
- `FRENDE/backend/core/security.py` - JWT authentication utilities
- `FRENDE/backend/core/websocket.py` - WebSocket connection management
- `FRENDE/backend/alembic/` - New directory for database migrations
- `FRENDE/backend/alembic/env.py` - Alembic environment configuration
- `FRENDE/backend/alembic/versions/` - Migration files
- `FRENDE/backend/requirements.txt` - Updated with new dependencies

### Test Files
- `FRENDE/frontend/src/components/Profile.test.jsx` - Unit tests for Profile component
- `FRENDE/frontend/src/components/Matching.test.jsx` - Unit tests for Matching component
- `FRENDE/frontend/src/components/Tasks.test.jsx` - Unit tests for Tasks component
- `FRENDE/frontend/src/components/Chat.test.jsx` - Unit tests for Chat component
- `FRENDE/frontend/src/lib/api.test.js` - Unit tests for API client
- `FRENDE/frontend/src/hooks/useAuth.test.js` - Unit tests for auth hook
- `FRENDE/backend/tests/` - New directory for backend tests
- `FRENDE/backend/tests/test_matching.py` - Unit tests for matching service
- `FRENDE/backend/tests/test_ai.py` - Unit tests for AI service
- `FRENDE/backend/tests/test_tasks.py` - Unit tests for task service
- `FRENDE/backend/tests/test_chat.py` - Unit tests for chat service
- `FRENDE/backend/tests/test_api/` - New directory for API tests
- `FRENDE/backend/tests/test_api/test_auth.py` - API tests for authentication
- `FRENDE/backend/tests/test_api/test_users.py` - API tests for user endpoints
- `FRENDE/backend/tests/test_api/test_matching.py` - API tests for matching endpoints
- `FRENDE/backend/tests/test_api/test_tasks.py` - API tests for task endpoints
- `FRENDE/backend/tests/test_api/test_chat.py` - API tests for chat endpoints

### Notes

- Unit tests should typically be placed alongside the code files they are testing (e.g., `MyComponent.tsx` and `MyComponent.test.tsx` in the same directory).
- Use `npx jest [optional/path/to/test/file]` to run tests. Running without a path executes all tests found by the Jest configuration.
- Backend tests can be run with `pytest` from the backend directory.
- Database migrations should be created using `alembic revision --autogenerate -m "description"`.
- The matching algorithm will need to be implemented with placeholder logic initially, then enhanced with AI integration.
- Socket.IO integration should be implemented for real-time chat and task updates.
- Image upload functionality should include client-side cropping and validation.

## Tasks

- [ ] 1.0 Backend Infrastructure Setup
  - [x] 1.1 Set up database models and schemas for users, matches, tasks, and chat
  - [x] 1.2 Configure SQLAlchemy with PostgreSQL and create initial migrations
  - [x] 1.3 Implement JWT authentication with fastapi-users
  - [x] 1.4 Set up WebSocket support for real-time chat functionality
  - [x] 1.5 Create API route structure and basic CRUD endpoints
  - [x] 1.6 Implement configuration management and environment variables
  - [x] 1.7 Add CORS middleware and security headers
  - [x] 1.8 Set up logging and error handling middleware

- [ ] 2.0 User Profile System
  - [x] 2.1 Create user profile model with name, age, profession, and profile text fields
  - [x] 2.2 Implement profile picture upload with validation (320x320px, JPEG/PNG, <30MB)
  - [x] 2.3 Add client-side image cropping and circular display functionality
  - [x] 2.4 Create default avatar (gray silhouette) for users without profile pictures
  - [ ] 2.5 Implement profile editing form with validation (500 char limit for text)
  - [ ] 2.6 Add profile picture change functionality with proper cleanup
  - [ ] 2.7 Create profile display component with responsive design
  - [ ] 2.8 Implement profile data parsing for interests and keywords extraction

- [ ] 3.0 Friend Matching System
  - [ ] 3.1 Implement user slot system (2 slots per user, reset after 2 days or 50 coins)
  - [ ] 3.2 Create compatibility algorithm with community, location, interests, and age ranking
  - [ ] 3.3 Add predefined community and location selection options
  - [ ] 3.4 Implement matching queue and algorithm service
  - [ ] 3.5 Create match request and acceptance flow
  - [ ] 3.6 Add slot purchase functionality with coin system
  - [ ] 3.7 Implement match status tracking and expiration logic
  - [ ] 3.8 Create matching interface with user cards and compatibility display

- [ ] 4.0 AI-Generated Tasks System
  - [ ] 4.1 Integrate Gemini 2.0 API for task generation
  - [ ] 4.2 Create task model with completion tracking and rewards
  - [ ] 4.3 Implement task generation service with bonding-focused prompts
  - [ ] 4.4 Add task display as clickable cards/buttons or sidebar panel
  - [ ] 4.5 Implement task completion logic (both users must complete)
  - [ ] 4.6 Add task replacement after 1 day if not completed
  - [ ] 4.7 Create task history and progress tracking
  - [ ] 4.8 Implement coin reward system for completed tasks
  - [ ] 4.9 Add task submission and validation functionality

- [ ] 5.0 Smart Chat Room System
  - [ ] 5.1 Implement real-time chat with Socket.IO integration
  - [ ] 5.2 Create random conversation starter appointment system
  - [ ] 5.3 Add automatic greeting system with 1-minute timeout
  - [ ] 5.4 Implement default opening line: "Hello, my name is [name], I am shy and can't think of a cool opening line :( Wanna be friends?"
  - [ ] 5.5 Add task integration in chat room (task submission and notifications)
  - [ ] 5.6 Implement message persistence and chat history
  - [ ] 5.7 Add typing indicators and online status
  - [ ] 5.8 Create chat room UI with task panel integration
  - [ ] 5.9 Implement chat notifications and real-time updates

- [ ] 6.0 Frontend Application Structure
  - [ ] 6.1 Set up React Router for navigation between screens
  - [ ] 6.2 Create main layout with navigation and authentication state
  - [ ] 6.3 Implement authentication context and protected routes
  - [ ] 6.4 Add responsive design for mobile, tablet, and desktop
  - [ ] 6.5 Create loading states and error boundaries
  - [ ] 6.6 Implement offline capability for task list and chat history
  - [ ] 6.7 Add accessibility features (WCAG AA compliance)
  - [ ] 6.8 Create notification system for matches, tasks, and messages

- [ ] 7.0 API Integration and State Management
  - [ ] 7.1 Create API client with Axios for REST endpoints
  - [ ] 7.2 Implement Socket.IO client for real-time features
  - [ ] 7.3 Add authentication token management and refresh logic
  - [ ] 7.4 Create React hooks for API calls and state management
  - [ ] 7.5 Implement optimistic updates for better UX
  - [ ] 7.6 Add error handling and retry logic for API calls
  - [ ] 7.7 Create data caching for offline functionality
  - [ ] 7.8 Implement real-time synchronization between components

- [ ] 8.0 Testing and Quality Assurance
  - [ ] 8.1 Write unit tests for all React components
  - [ ] 8.2 Create integration tests for API endpoints
  - [ ] 8.3 Add end-to-end tests for critical user flows
  - [ ] 8.4 Implement test coverage reporting
  - [ ] 8.5 Add performance testing for chat and matching features
  - [ ] 8.6 Create load testing for concurrent users
  - [ ] 8.7 Add security testing for authentication and data validation
  - [ ] 8.8 Implement automated testing in CI/CD pipeline

- [ ] 9.0 Deployment and DevOps
  - [ ] 9.1 Set up Vercel deployment for frontend
  - [ ] 9.2 Configure Render/Railway deployment for backend
  - [ ] 9.3 Set up PostgreSQL database with proper security
  - [ ] 9.4 Configure environment variables and secrets management
  - [ ] 9.5 Implement health checks and monitoring
  - [ ] 9.6 Add logging and error tracking (Sentry)
  - [ ] 9.7 Set up CI/CD pipeline with automated testing
  - [ ] 9.8 Configure SSL certificates and security headers
  - [ ] 9.9 Implement backup and disaster recovery procedures

- [ ] 10.0 Performance and Optimization
  - [ ] 10.1 Optimize bundle size and implement code splitting
  - [ ] 10.2 Add service worker for offline functionality
  - [ ] 10.3 Implement image optimization and lazy loading
  - [ ] 10.4 Add caching strategies for API responses
  - [ ] 10.5 Optimize database queries and add indexes
  - [ ] 10.6 Implement rate limiting for API endpoints
  - [ ] 10.7 Add compression and CDN for static assets
  - [ ] 10.8 Monitor and optimize WebSocket connections
  - [ ] 10.9 Implement progressive web app features 