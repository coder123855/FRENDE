# Frende - AI-Powered Social Media App

An AI-powered social media app to help users make new friends through AI-generated tasks and compatibility-based matching.

## 🚀 Features

- **Friend Matching**: Match users based on compatibility and shared interests
- **AI-Generated Tasks**: Fun challenges to help users bond and earn coins
- **Smart Chat Room**: Real-time messaging with conversation starters
- **Profile System**: User profiles with interests and preferences
- **Coin System**: Earn coins by completing tasks (MVP: tracking only)

## 🛠️ Tech Stack

### Frontend
- **Framework**: React + Vite
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui
- **Real-time**: Socket.IO (Client)
- **Deployment**: Vercel

### Backend
- **Framework**: FastAPI
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy + Alembic
- **Authentication**: OAuth
- **Real-time**: WebSocket/Socket.IO
- **AI Integration**: Gemini 2.0 API (placeholder)

## 📁 Project Structure

```
frende/
├── FRENDE/
│   ├── frontend/          # React frontend
│   │   ├── src/
│   │   ├── package.json
│   │   └── README.md
│   └── backend/           # FastAPI backend
│       ├── main.py
│       ├── requirements.txt
│       └── README.md
├── .gitignore
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Python (v3.8 or higher)
- PostgreSQL (for backend)

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd FRENDE/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd FRENDE/backend
   ```

2. Create and activate a virtual environment:
   ```bash
   # Windows
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   
   # macOS/Linux
   python -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Start the development server:
   ```bash
   uvicorn main:app --reload
   ```

5. The API will be available at [http://127.0.0.1:8000](http://127.0.0.1:8000)

## 🌐 API Documentation

Once the backend is running, you can access:
- **Interactive API docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **Alternative API docs**: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

## 📝 MVP Features

### Current Implementation
- ✅ Basic FastAPI backend setup
- ✅ React frontend with chat UI
- ✅ Virtual environment and dependency management

### Planned Features
- 🔄 User authentication (OAuth)
- 🔄 Database models and migrations
- 🔄 Real-time chat functionality
- 🔄 AI task generation system
- 🔄 User matching algorithm
- 🔄 Coin tracking system
- 🔄 Internationalization (Vietnamese/English)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions, please open an issue on GitHub. 