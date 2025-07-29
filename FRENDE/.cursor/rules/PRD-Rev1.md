Product Requirements Document (PRD)
Product Name: Frende
 Version: 1.0 (MVP)
 Prepared By: [Your Name]
 Date: [Insert Date]

1. Product Overview
Goal:
 Build an AI-powered social media app to help users make new friends through GenAI and fun interactive challenges.
Target Users:
Students entering new schools (junior high to university)


Young people entering new communities


Anyone looking to form new friendships


Core Value Proposition:
 A fun, AI-enhanced app that matches friends with high compatibility and helps them break the ice, bond, and stay in touch via creative tasks.

2. Key Features
Feature
Description
Priority
Match Friends Slot
Users get 2 matching slots. Matching uses compatibility algorithm. Slots reset after bonding session (2 days or 50 coins earned).
High
AI-Generated Tasks
Tasks generated via Gemini 2.0 or placeholder logic. Based on profiles/shared interests or generic. Prioritized as text-based tasks.
High
Smart Chat Room
Appoints who starts chat. Auto sends message if user is inactive. Includes notification system and task submission mechanism.
High
Profile
Single profile text field with character limit (replaces previous 4-line input). Includes name, age, picture, and profession.
High


3. User Stories
As a User:
I want to make new friends who share my interests.


I want conversations to be fun and ice-breaking.


As the System:
I want to match users with high compatibility.


I want AI tasks to encourage bonding and keep the chat active.


I want to leverage gamification and behavioral psychology for retention.



4. User Flows
Friend Making Flow:
Open app → Use match slot → System matches user → Enter chat room


App appoints who starts → Default message sent if no action in 1 min


AI Tasks Flow:
App generates 5 tasks → e.g., "Tell your friend your favorite childhood show"


User clicks → submits → if both users submit, they earn coins → new task fills slot


Profile Flow:
User inputs PFP, name, age, gender, profession


Enter single text profile (interests/personality)



5. Technical Requirements
5.1 Tech Stack
Frontend
React + Vite (UI Framework)


Tailwind CSS (Styling)


shadcn/ui (Components)


Socket.IO (Real-time)


Vercel (Deployment)


Communication
Axios / Fetch API (REST)


Socket.IO (Real-time events)


AI Middleware
FastAPI (Python backend)


Google Gemini 2.0 API (AI tasks)


Custom prompt engineering (bonding focus)


Retry logic / error handling (httpx, etc.)


Backend
FastAPI (Core routing and logic)


OAuth (Authentication via fastapi-users)


Background tasks (Task regeneration)


FastAPI WebSocket (Real-time chat)


Database
PostgreSQL (Main database)


SQLAlchemy + Alembic (ORM & migrations)


Optional (Not for MVP)
Redis (Matchmaking queues)


PostHog / Sentry / PromptLayer (Monitoring)


5.2 Non-Functional Requirements
Requirement
Description
Performance
Load under 2s on mobile (3G).
Scalability
Up to 1,000 concurrent users without lag.
Security
Encrypt data at rest (PostgreSQL) and in transit (HTTPS/WSS).
Availability
99% uptime via Vercel (frontend) and Render (backend).
Responsiveness
Fully responsive across devices.
Offline Capability
Chat history and task list available offline (via service workers).
Maintainability
Modular codebase with linting and typed APIs.
Localization-ready
Vietnamese first, English second.
Monitoring
Errors captured with Sentry and backend logs.
Accessibility
WCAG AA compliant (keyboard nav, contrast).
Latency
Chat message roundtrip under 300ms.
AI Responsiveness
AI response time under 2s via async FastAPI call.


6. Design & UI
Design Guidelines:
Colors: Pastel, light themes, youth-focused


Typography: Rounded sans-serif fonts


Style: Friendly, bubbly, simple


Key Screens:
Home / Match Dashboard


Chat Screen (with tasks, coins)


Notifications


Profile Setup & Edit



7. MVP Clarifications & Implementation Notes
Area
Decision
Notes
In-App Store
Out of scope for MVP; coins still tracked
Make clear in UI that store is upcoming or disabled
AI Task Generation
Gemini 2.0 placeholder + support for generic + profile-based tasks
Define fallback logic in code
Profile Fields
One text field instead of 4-line input
Simpler, but limits matching precision
Notifications
Real-time notifications included
Use Socket.IO / service workers
Database
Only PostgreSQL; Redis excluded
Redis may be added later for scale
Authentication
OAuth only
Suggest Google OAuth only for MVP
Task Submission
Mechanism TBD
Options: tap-to-complete, emoji react, text box
Localization
i18n support built in; Vietnamese prioritized
Use react-i18next
Deployment
To be finalized
Suggest: Vercel (frontend), Railway/Render (backend)


8. Success Metrics
Metric
Definition
Target
User Engagement
% of users who open the app daily
30% DAU
Task Completion Rate
Avg. tasks completed per user
70%
Notifications CTR
% of users who tap push/in-app notifications
40%
AI Engagement
Conversations started with AI tasks
3–5 chats/user/day


9. Risks & Mitigation
Risk
Mitigation Strategy
No response in chat
Auto-message feature + task prompt to start interaction
Users don’t understand coin/task system
Include onboarding tutorial + tooltips
Gemini 2.0 API unavailability
Use fallback rules or predefined prompt logic
Users drop after 1 session
Gamify with streaks, achievements, and auto-reminders
Abuse / spam
Rate limiting + reporting system in future updates


