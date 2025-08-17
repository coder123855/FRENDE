# Frende Frontend

AI-powered social media app to help users make new friends through AI and fun challenges.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## 🌍 Environment Variables

Copy `env.example` to `.env.local` and configure:

```bash
# API Configuration
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000

# Application Configuration
VITE_APP_NAME=Frende
VITE_APP_VERSION=1.0.0
```

## 🚀 Deployment

### Vercel Deployment

1. **Connect Repository**
   - Push code to GitHub
   - Connect repository to Vercel

2. **Configure Environment Variables**
   In Vercel dashboard, set:
   - `VITE_API_URL` - Your backend API URL
   - `VITE_WS_URL` - Your WebSocket URL
   - `VITE_APP_NAME` - Application name
   - `VITE_APP_VERSION` - Application version

3. **Deploy**
   - Vercel will automatically deploy on push to main branch
   - Preview deployments created for pull requests

### Build Configuration
- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📦 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm test` - Run tests
- `npm run test:coverage` - Run tests with coverage

## 🏗️ Project Structure

```
src/
├── components/     # React components
├── hooks/         # Custom React hooks
├── contexts/      # React contexts
├── lib/           # Utilities and configurations
├── services/      # API services
└── utils/         # Helper functions
```

## 🔧 Configuration Files

- `vite.config.js` - Vite configuration
- `vercel.json` - Vercel deployment configuration
- `tailwind.config.js` - Tailwind CSS configuration
- `jest.config.cjs` - Jest testing configuration
