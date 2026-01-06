# YapaGachis Backend API

Backend API for YapaGachis - A pan-African anti-food waste marketplace platform.

## 🎯 Features

- **Multi-user System**: Clients, Food Suppliers, Deal Suppliers, Associations, Advertisers, Admins
- **Anti-Waste Marketplace**: Buy and sell unsold food items at reduced prices
- **Donations System**: Food and financial donations to NGOs
- **Deals Section**: Promotional offers for hotels, leisure, and services
- **Advertising Platform**: Integrated advertising system
- **Subscription Management**: Tiered subscriptions for suppliers (Basic/Pro/Premium)
- **Real-time Features**: WebSocket support for live updates
- **Payment Integration**: Mobile Money (Orange, MTN, Moov, Wave) + Cards (Stripe, Paystack)
- **Geolocation**: Location-based product search
- **Notifications**: Multi-channel (Push, SMS, Email)

## 🏗️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Cache**: Redis
- **Queue**: BullMQ
- **Real-time**: Socket.io
- **File Storage**: Cloudinary / AWS S3
- **Monitoring**: Winston, Sentry
- **Containerization**: Docker

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker & Docker Compose (for local development)
- PostgreSQL 14+ (or use Docker)
- Redis 7+ (or use Docker)

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone <repository-url>
cd yapasgachis_backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment setup

```bash
cp .env.example .env
```

Edit `.env` file with your configuration:

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/yapasgachis?schema=public
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
# ... other variables
```

### 4. Start services with Docker

```bash
npm run docker:up
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- pgAdmin on port 5050
- Redis Commander on port 8081

### 5. Generate Prisma Client

```bash
npm run prisma:generate
```

### 6. Run database migrations

```bash
npm run prisma:migrate
```

### 7. (Optional) Seed database

```bash
npm run prisma:seed
```

### 8. Start development server

```bash
npm run dev
```

The API will be available at: `http://localhost:3000`

## 📁 Project Structure

```
yapasgachis_backend/
├── src/
│   ├── api/v1/              # API routes, controllers, validators
│   ├── core/                # Business logic (services, repositories)
│   ├── infrastructure/      # External integrations (DB, queue, storage)
│   ├── middleware/          # Express middlewares
│   ├── utils/               # Utilities and helpers
│   ├── config/              # Configuration files
│   ├── types/               # TypeScript types
│   ├── cron/                # Scheduled jobs
│   ├── app.ts               # Express app setup
│   └── server.ts            # Server entry point
├── tests/                   # Test files
├── prisma/                  # Prisma schema and migrations
├── docs/                    # Documentation
├── scripts/                 # Utility scripts
├── docker-compose.yml       # Docker services
├── Dockerfile               # Production Dockerfile
├── Dockerfile.dev           # Development Dockerfile
├── tsconfig.json            # TypeScript configuration
├── package.json             # Dependencies and scripts
└── README.md                # This file
```

## 🛠️ Available Scripts

### Development
```bash
npm run dev                  # Start development server with hot reload
npm run build                # Build for production
npm run start                # Start production server
```

### Database
```bash
npm run prisma:generate      # Generate Prisma Client
npm run prisma:migrate       # Run migrations
npm run prisma:studio        # Open Prisma Studio
npm run prisma:seed          # Seed database
npm run prisma:reset         # Reset database
```

### Testing
```bash
npm test                     # Run all tests
npm run test:watch           # Run tests in watch mode
npm run test:coverage        # Generate coverage report
npm run test:unit            # Run unit tests
npm run test:integration     # Run integration tests
npm run test:e2e             # Run end-to-end tests
```

### Code Quality
```bash
npm run lint                 # Lint code
npm run lint:fix             # Lint and fix
npm run format               # Format code with Prettier
npm run type-check           # Check TypeScript types
```

### Docker
```bash
npm run docker:up            # Start Docker services
npm run docker:down          # Stop Docker services
npm run docker:logs          # View Docker logs
```

### Workers & Cron
```bash
npm run queue:worker         # Start background job worker
npm run cron                 # Start cron jobs
```

## 🔑 Environment Variables

See `.env.example` for all available environment variables.

Key variables:
- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_HOST`, `REDIS_PORT`: Redis configuration
- `JWT_SECRET`, `JWT_REFRESH_SECRET`: JWT secrets
- Payment provider credentials (Orange Money, MTN, Wave, Stripe, etc.)
- Messaging credentials (Twilio, SendGrid, Firebase)
- Storage credentials (Cloudinary, AWS S3)

## 📡 API Endpoints

### Health Check
```
GET /health
```

### API Base
```
GET /api/v1
```

### Authentication
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/verify-otp
POST /api/v1/auth/refresh-token
POST /api/v1/auth/logout
```

*(Full API documentation coming soon)*

## 🏛️ Architecture

### Layered Architecture
- **API Layer**: Routes, controllers, validators
- **Core Layer**: Business logic, services, repositories
- **Infrastructure Layer**: Database, cache, queues, external services

### Design Patterns
- Repository Pattern (data access)
- Service Layer Pattern (business logic)
- Factory Pattern (payment providers)
- Singleton Pattern (database connections)
- Strategy Pattern (notifications)

### Key Features
- Type-safe with TypeScript
- Clean Architecture principles
- SOLID principles
- Dependency Injection ready
- Error handling with custom errors
- Request validation with Zod
- Centralized logging
- Caching strategy
- Background job processing
- Rate limiting
- Security best practices

## 🧪 Testing

The project uses Jest for testing:

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- src/services/auth.service.test.ts
```

## 🐳 Docker Deployment

### Build production image

```bash
docker build -t yapasgachis-api .
```

### Run production container

```bash
docker run -p 3000:3000 \
  -e DATABASE_URL=postgresql://... \
  -e REDIS_HOST=redis \
  yapasgachis-api
```

### Docker Compose (production)

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## 🚦 Roadmap

- [ ] Authentication & Authorization (JWT)
- [ ] User Management (CRUD)
- [ ] Product Management
- [ ] Order System
- [ ] Payment Integration
- [ ] Donation System
- [ ] Notifications
- [ ] WebSocket real-time updates
- [ ] Admin Dashboard APIs
- [ ] Analytics & Reporting
- [ ] GraphQL API (optional)
- [ ] API Documentation (Swagger/OpenAPI)

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Follow TypeScript best practices
- Use ESLint and Prettier for formatting
- Write meaningful commit messages
- Add tests for new features
- Update documentation

## 📝 License

MIT License - see LICENSE file for details

## 👥 Team

YapaGachis Development Team

## 📧 Contact

For questions or support, contact: support@yapasgachis.com

---

**Made with ❤️ for Africa**
