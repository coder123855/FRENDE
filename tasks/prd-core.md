# Product Requirements Document (PRD): Frende Core Features

## 1. Introduction/Overview
Frende is an AI-powered social media app designed to help users make new friends through compatibility-based matching and AI-generated bonding tasks. The app targets students and young people entering new communities, providing a fun, guided way to break the ice and build meaningful connections. This PRD covers the core features for the MVP: Match Friends Slot, AI-Generated Tasks, Smart Chat Room, and Profile.

## 2. Goals
- Enable users to match with highly compatible new friends using a transparent, fair system.
- Facilitate bonding and conversation through engaging, AI-generated tasks.
- Ensure a smooth, guided chat experience that reduces social anxiety and encourages participation.
- Provide a simple, expressive profile system to support accurate matching.

## 3. User Stories
- As a new user, I want to match with people who share my interests and background so I can make friends easily in a new environment.
- As a user, I want the app to help start conversations and keep them engaging so I don’t feel awkward or lost.
- As a user, I want to complete fun tasks with my match to earn rewards and bond more quickly.
- As a user, I want to control my profile and see my progress in tasks and matches.

## 4. Functional Requirements
1. The system must provide each user with 2 friend matching slots. Slots are consumed when initiating a new match and reset after a bonding session (2 days or 50 coins earned).
2. Users can purchase additional slots with coins, but cannot exceed 2 slots at any time.
3. Matching must use a compatibility algorithm with the following ranking priorities:
   - Community (user-selectable from a set of options)
   - Location (user-selectable from a set of options)
   - Shared interests (hobbies, lifestyle, personality, keywords from profile text)
   - Age group
4. The system must allow users to select their community and location from predefined lists.
5. The system must parse profile text for interests and keywords to support matching.
6. The system must present AI-generated tasks (via Gemini 2.0 or placeholder logic) as clickable buttons/cards or in a panel/sidebar (final UI to follow design).
7. Both users must complete a task for it to be marked as done. If not completed within 1 day, the task is replaced.
8. Users must be able to view past/completed tasks.
9. The chat room must randomly appoint a user to start the conversation and notify both users. If the appointed user does not send an opening within 1 minute, a default opening line is sent automatically.
10. The default opening line must be: "Hello, my name is [user's name], I am shy and can't think of a cool opening line :( Wanna be friends?"
11. The greeting system cannot be disabled by users.
12. The chat room must support task submission and notifications.
13. The profile must include:
    - Name, age, profession fields
    - Profile text (max 500 characters)
    - Profile picture (320x320px, min 110x110px, 1:1 aspect, JPEG/PNG, <30MB)
    - In-app cropping/editing before upload, auto-resized to circular display
    - Default avatar (gray silhouette) if no picture uploaded
    - Ability to change profile picture at any time
14. The UI/UX must follow designs created in Lovable and provided to the development team.

## 5. Non-Goals (Out of Scope)
- Advanced monetization features beyond slot purchases
- Customization of default greetings
- Notification settings beyond basic task/chat notifications
- Features not explicitly listed in this PRD

## 6. Design Considerations (Optional)
- UI/UX will be designed in Lovable first; implementation must strictly follow those designs.
- Task UI may be presented as cards/buttons or in a sidebar/panel; final decision will be based on design review.
- All components must be mobile-friendly and accessible.

## 7. Technical Considerations (Tech Stack)

- **Frontend:**
  - React + Vite (modern, fast UI framework)
  - Tailwind CSS (utility-first styling)
  - shadcn/ui (pre-built UI components)
  - Socket.IO client (real-time chat and notifications)
  - Deployed on Vercel

- **Communication:**
  - Axios or Fetch API for RESTful API calls
  - Socket.IO for real-time events (chat, notifications, task updates)

- **AI Middleware:**
  - FastAPI (Python backend for API and AI integration)
  - Gemini 2.0 API (AI task generation, compatibility scoring)
  - Custom prompt engineering for bonding tasks
  - httpx for async API calls and error handling

- **Backend:**
  - FastAPI (core routing, business logic)
  - Background tasks for auto-generating and refreshing AI tasks
  - OAuth2/JWT authentication (via fastapi-users)
  - FastAPI WebSocket for real-time chat
  - Deployed on Render or Railway

- **Database:**
  - PostgreSQL (main relational database)
  - SQLAlchemy + Alembic (ORM and migrations)

- **Optional / Monitoring:**
  - Redis (for matchmaking queues, if scaling is needed)
  - Sentry, PostHog, or PromptLayer for monitoring and analytics (optional for MVP)

- **Security:**
  - All user data encrypted at rest (PostgreSQL) and in transit (HTTPS/WSS)

- **Localization:**
  - i18n support (e.g., react-i18next), Vietnamese prioritized

## 8. Success Metrics
- 30% Daily Active Users (DAU)
- 70% task completion rate
- 40% notification click-through rate
- 3-5 chats initiated per user per day

## 9. Open Questions
- Are there any additional profile fields required for future features?
- Should users be able to report or block matches?
- What is the process for updating the set of communities/locations?
- Are there any legal/privacy requirements for storing user data in target regions? 