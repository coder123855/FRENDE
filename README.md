# Frende - AI-Powered Friend Matching Platform

A modern web application that uses AI to help users find compatible friends through intelligent matching algorithms, real-time chat, and gamified bonding activities.

## 🚀 Features

### Core Functionality
- **Smart Friend Matching**: AI-powered compatibility algorithm based on interests, location, age, and community
- **Real-time Chat**: WebSocket-based chat rooms with typing indicators and online status
- **AI-Generated Tasks**: Gemini 2.0 powered bonding activities for matched friends
- **Profile Management**: Rich user profiles with image upload and customization
- **Slot System**: Gamified matching with coin-based slot purchases

### Technical Highlights
- **Backend**: FastAPI with SQLAlchemy, PostgreSQL, JWT authentication
- **Frontend**: React with Tailwind CSS, Socket.IO for real-time features
- **AI Integration**: Google Gemini 2.0 for task generation and compatibility analysis
- **Real-time**: WebSocket support for instant messaging and live updates
- **Testing**: Comprehensive unit tests with Jest and React Testing Library

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI
- **Database**: PostgreSQL with SQLAlchemy ORM
- **Authentication**: JWT with fastapi-users
- **Real-time**: WebSocket support
- **AI**: Google Gemini 2.0 API
- **Testing**: pytest

### Frontend
- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS with shadcn/ui components
- **Real-time**: Socket.IO client
- **HTTP Client**: Axios
- **Testing**: Jest with React Testing Library
- **Build Tool**: Vite

## 📁 Project Structure

```
FRENDE/
├── backend/                 # FastAPI backend
│   ├── api/                # API routes
│   ├── core/               # Core configuration
│   ├── models/             # SQLAlchemy models
│   ├── schemas/            # Pydantic schemas
│   ├── services/           # Business logic
│   └── alembic/            # Database migrations
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and API client
│   │   └── contexts/       # React contexts
│   └── tests/              # Frontend tests
└── tasks/                  # Project documentation
```

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Git
- Google Gemini API Key (for AI features)

### Environment Setup
1. **Get Google Gemini API Key**: Visit [Google AI Studio](https://makersuite.google.com/app/apikey) to get your API key
2. **Set up environment variables**: Copy `.env.example` files in both `backend/` and `frontend/` directories

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd FRENDE
   ```

2. **Set up Python environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your database and API keys
   ```

4. **Set up database**
   ```bash
   alembic upgrade head
   python init_db.py
   ```

5. **Run the backend**
   ```bash
   uvicorn main:app --reload
   ```

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your backend URL
   ```

3. **Run the frontend**
   ```bash
   npm run dev
   ```

4. **Run tests**
   ```bash
   npm test
   ```

## 🧪 Testing

### Backend Tests
```bash
cd backend
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

### Test Coverage
```bash
# Backend
pytest --cov=.
# View HTML coverage report
open htmlcov/index.html

# Frontend
npm run test:coverage
# View HTML coverage report
open coverage/lcov-report/index.html
```

### Coverage Requirements
- **Backend**: Minimum 80% coverage (branches, functions, lines, statements)
- **Frontend**: Minimum 80% coverage (branches, functions, lines, statements)
- Coverage reports are generated automatically in CI/CD
- Coverage thresholds are enforced in pull requests

## 🚀 Deployment

### Production Deployment
The app is configured for deployment on modern cloud platforms:

#### Backend Deployment (Render/Railway)
```bash
# Set environment variables
DATABASE_URL=postgresql://...
GEMINI_API_KEY=your_gemini_api_key
JWT_SECRET_KEY=your_jwt_secret

# Deploy using the provided configuration files
# - render.yaml (for Render)
# - railway.json (for Railway)
# - Dockerfile (for containerized deployment)
```

#### Frontend Deployment (Vercel)
```bash
# Set environment variables
VITE_API_URL=https://your-backend-url.com
VITE_WS_URL=wss://your-backend-url.com

# Deploy using Vercel CLI or GitHub integration
vercel --prod
```

### Environment Variables
See `.env.example` files in both `backend/` and `frontend/` directories for required environment variables.

### CI/CD Pipeline
The project includes GitHub Actions workflows for:
- Automated testing
- Code quality checks
- Deployment to staging and production
- Backup monitoring
- Security scanning

## 📊 Current Status: MVP Complete ✅

### ✅ Completed Features
- **Backend Infrastructure**: Complete FastAPI backend with PostgreSQL, authentication, and API structure
- **User Profile System**: Full profile management with image upload, 100-word bio limit, and validation
- **Friend Matching System**: AI-powered compatibility algorithm with slot system and match requests
- **Real-time Chat**: WebSocket integration with typing indicators and message persistence
- **AI-Generated Tasks**: Gemini 2.0 integration for bonding activities and task generation
- **Frontend Application**: Complete React frontend with responsive design and modern UI
- **Authentication System**: JWT-based authentication with secure token management
- **Testing**: Comprehensive unit tests for components, hooks, and API endpoints
- **Performance Optimization**: Bundle optimization, caching strategies, and PWA features
- **Error Handling**: Robust error handling with user-friendly messages
- **Rate Limiting**: Protection against API abuse with proper rate limiting

### 🚀 Ready for Production
The Frende MVP is now complete and ready for production deployment. All core features from the PRD have been implemented and tested.

### 📋 Future Enhancements
- **Mobile App**: React Native version for iOS and Android
- **Advanced Analytics**: User behavior tracking and insights
- **Social Features**: Friend groups, communities, and events
- **Premium Features**: Advanced matching algorithms and premium subscriptions
- **Internationalization**: Multi-language support
- **Advanced AI**: Enhanced AI features for better matching and task generation

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style and conventions
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini 2.0** for AI-powered features
- **FastAPI** for the robust backend framework
- **React** and **Vite** for the modern frontend
- **Tailwind CSS** for beautiful, responsive design
- **Socket.IO** for real-time communication

## 📞 Support

For support, email support@frende.app or create an issue in this repository.

---

**Made with ❤️ by the Frende Team** 