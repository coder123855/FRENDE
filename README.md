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

# Frontend
npm run test:coverage
```

## 📊 Current Progress

### ✅ Completed Features
- **Backend Infrastructure**: Database models, authentication, API structure
- **User Profile System**: Profile management, image upload, validation
- **Friend Matching System**: Compatibility algorithm, slot system, match requests
- **Real-time Chat**: WebSocket integration, message persistence
- **Frontend Components**: React components with Tailwind CSS
- **Testing**: Unit tests for components and hooks

### 🚧 In Progress
- **AI-Generated Tasks**: Gemini 2.0 integration for bonding activities
- **Advanced Matching**: Enhanced compatibility algorithms
- **Performance Optimization**: Bundle optimization and caching

### 📋 Planned Features
- **Mobile App**: React Native version
- **Advanced Analytics**: User behavior tracking
- **Social Features**: Friend groups and communities
- **Premium Features**: Advanced matching algorithms

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