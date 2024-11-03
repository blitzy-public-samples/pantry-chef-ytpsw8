# PantryChef Web Dashboard

## Overview

PantryChef Web Dashboard is a comprehensive React-based web application providing extended functionality for the PantryChef ecosystem. Built with Next.js and Redux, it offers advanced recipe management, pantry tracking, and analytics capabilities.

## 🔧 Prerequisites

- Node.js >= 16.0.0
- npm or yarn
- Docker and Docker Compose (for containerized deployment)
- Redis (for session management and caching)

## 🚀 Quick Start

1. Clone the repository and navigate to the web directory:
```bash
cd src/web
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## 🏗️ Project Structure

```
src/web/
├── components/         # Reusable React components
├── config/            # Application configuration
├── hooks/             # Custom React hooks
├── interfaces/        # TypeScript interfaces
├── pages/            # Next.js pages
├── public/           # Static assets
├── services/         # API services
├── store/            # Redux store configuration
├── styles/           # Global styles
├── tests/            # Test files
└── utils/            # Utility functions
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build production bundle
- `npm run start` - Start production server
- `npm run test` - Run test suite
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript checks
- `npm run format` - Format code with Prettier
- `npm run analyze` - Analyze bundle size
- `npm run clean` - Clean build artifacts

### Technology Stack

- **Framework**: Next.js 13.0.0
- **UI Library**: React 18.2.0
- **State Management**: Redux Toolkit 1.9.0
- **Real-time Communication**: Socket.IO Client 4.5.0
- **HTTP Client**: Axios 1.3.0
- **Styling**: TailwindCSS 3.2.0
- **Testing**: Jest 29.0.0 + React Testing Library
- **Type Checking**: TypeScript 4.9.0

## 🚢 Deployment

### Docker Deployment

1. Build and start containers:
```bash
docker-compose -f docker/docker-compose.yml up -d
```

2. Scale web service (optional):
```bash
docker-compose -f docker/docker-compose.yml up -d --scale web=3
```

### Production Configuration

The production environment uses:
- Nginx reverse proxy with TLS 1.3
- Redis for session management and caching
- Docker Swarm for container orchestration
- Health checks for high availability
- Automated failover and recovery

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| NEXT_PUBLIC_API_URL | Backend API URL | Yes |
| NEXT_PUBLIC_WS_URL | WebSocket server URL | Yes |
| REDIS_URL | Redis connection string | Yes |
| NODE_ENV | Environment (development/production) | Yes |

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- components/auth.test.tsx
```

### Test Structure

- `tests/components/` - Component tests
- `tests/hooks/` - Custom hook tests
- `tests/pages/` - Page component tests
- `tests/utils/` - Utility function tests
- `tests/store/` - Redux store tests
- `tests/services/` - API service tests

## 🔒 Security

- TLS 1.3 encryption for all traffic
- CSRF protection
- Rate limiting
- Security headers configuration
- JWT-based authentication
- XSS prevention
- Content Security Policy (CSP)

## 📈 Performance

### Optimization Techniques

- Code splitting and lazy loading
- Static page generation where possible
- Image optimization
- Redis caching layer
- CDN integration
- Bundle size optimization

### Monitoring

- Real-time performance metrics
- Error tracking
- User analytics
- Resource utilization monitoring
- API latency tracking

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

MIT License - see LICENSE file for details

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the technical documentation

## 🔄 CI/CD Pipeline

- Automated testing
- Code quality checks
- Security scanning
- Docker image building
- Automated deployment
- Performance monitoring

## 📚 Additional Resources

- [Technical Specification](../docs/technical-spec.md)
- [API Documentation](../docs/api-spec.md)
- [Contributing Guidelines](../docs/contributing.md)
- [Security Guidelines](../docs/security.md)