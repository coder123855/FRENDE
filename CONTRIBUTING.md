# Contributing to Frende

Thank you for your interest in contributing to Frende! This document provides guidelines and information for contributors.

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Git

### Development Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/frende.git
   cd frende
   ```

2. **Set up the backend**
   ```bash
   cd FRENDE/backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Set up the frontend**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Run the development servers**
   ```bash
   # Backend (in one terminal)
   cd FRENDE/backend
   uvicorn main:app --reload
   
   # Frontend (in another terminal)
   cd FRENDE/frontend
   npm run dev
   ```

## 📝 Development Guidelines

### Code Style

#### Python (Backend)
- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/) style guide
- Use type hints for function parameters and return values
- Write docstrings for all public functions and classes
- Maximum line length: 88 characters (use Black formatter)

#### JavaScript/React (Frontend)
- Follow [Airbnb JavaScript Style Guide](https://github.com/airbnb/javascript)
- Use functional components with hooks
- Use TypeScript for new components (optional but recommended)
- Maximum line length: 80 characters

### Git Workflow

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, descriptive commit messages
   - Keep commits atomic and focused
   - Test your changes thoroughly

3. **Run tests**
   ```bash
   # Backend tests
   cd FRENDE/backend
   pytest
   
   # Frontend tests
   cd FRENDE/frontend
   npm test
   ```

4. **Submit a pull request**
   - Fill out the PR template
   - Include tests for new features
   - Update documentation as needed

### Testing

#### Backend Testing
- Write unit tests for all new functions
- Use pytest for testing
- Aim for at least 80% code coverage
- Test both success and error cases
- Run `pytest --cov=.` to check coverage locally
- Coverage reports are generated in `htmlcov/` directory

#### Frontend Testing
- Write tests for all React components
- Use Jest and React Testing Library
- Test user interactions and component behavior
- Mock external dependencies
- Maintain 80%+ test coverage
- Run `npm run test:coverage` to check coverage locally

### Documentation

- Update README.md for new features
- Add docstrings to Python functions
- Include JSDoc comments for JavaScript functions
- Update API documentation if endpoints change

## 🐛 Bug Reports

When reporting bugs, please include:

1. **Environment details**
   - Operating system
   - Python/Node.js versions
   - Browser (if frontend issue)

2. **Steps to reproduce**
   - Clear, step-by-step instructions
   - Expected vs actual behavior

3. **Additional context**
   - Error messages and stack traces
   - Screenshots (if applicable)
   - Console logs

## 💡 Feature Requests

When suggesting new features:

1. **Describe the problem**
   - What issue does this solve?
   - Who would benefit from this feature?

2. **Propose a solution**
   - How should this feature work?
   - Any technical considerations?

3. **Consider alternatives**
   - Are there existing solutions?
   - Could this be implemented differently?

## 🔧 Pull Request Process

1. **Fork the repository**
2. **Create a feature branch**
3. **Make your changes**
4. **Write/update tests**
5. **Update documentation**
6. **Run the test suite**
7. **Submit a pull request**

### PR Checklist

- [ ] Code follows style guidelines
- [ ] Tests pass locally
- [ ] Documentation is updated
- [ ] No console errors
- [ ] Feature is tested manually
- [ ] Commit messages are clear and descriptive

## 🏷️ Issue Labels

We use the following labels to categorize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to documentation
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `priority: high` - High priority issue
- `priority: low` - Low priority issue

## 📞 Getting Help

- **GitHub Issues**: For bug reports and feature requests
- **Discussions**: For questions and general discussion
- **Email**: support@frende.app for urgent issues

## 🎉 Recognition

Contributors will be recognized in:
- Project README.md
- Release notes
- GitHub contributors page

Thank you for contributing to Frende! 🚀 