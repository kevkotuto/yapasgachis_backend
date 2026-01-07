# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

YapaGachis Backend is a pan-African anti-food waste marketplace platform built with Express.js, TypeScript, PostgreSQL, and Redis. It's a multi-tenant system supporting 7 user roles (CLIENT, SUPPLIER_FOOD, SUPPLIER_DEALS, ASSOCIATION, ADVERTISER, ADMIN, SUPER_ADMIN) with features including product marketplace, donations, deals, subscriptions, and payments.

## Development Commands

```bash
# Installation
npm install
npm run prisma:generate        # Generate Prisma client
npm run prisma:migrate         # Run migrations
npm run prisma:seed            # Seed database

# Development
npm run dev                    # Start with hot reload (nodemon)
npm run prisma:studio          # Database UI

# Code Quality
npm run lint                   # ESLint check
npm run lint:fix               # Auto-fix linting
npm run format                 # Prettier formatting
npm run type-check             # TypeScript compilation check
npm run quality:full           # All checks + tests

# Testing
npm test                       # Run all tests
npm run test:unit              # Unit tests only
npm run test:integration       # Integration tests
npm run test:e2e               # End-to-end tests
npm run test:watch             # Watch mode
npm run test:coverage          # Coverage report

# Build & Deploy
npm run build                  # Compile TypeScript to dist/
npm start                      # Production start
npm run start:prod             # Production with NODE_ENV=production

# Docker
npm run docker:up              # Start PostgreSQL & Redis
npm run docker:down            # Stop services

# Background Jobs
npm run queue:worker           # Start BullMQ worker
npm run cron                   # Start cron jobs
```

## Architecture

**Layered Structure:**
```
API Layer (src/api/v1/)
  Routes → Controllers → Validators (Zod)
         ↓
Core Layer (src/core/)
  Services → Repositories → Models/Interfaces
         ↓
Infrastructure Layer (src/infrastructure/)
  Database (Prisma) | Redis | Payments | Messaging | Queue (BullMQ) | Storage | WebSocket
```

**Key Directories:**
- `src/api/v1/routes/` - Route definitions (20+ route files)
- `src/api/v1/controllers/` - Request handlers
- `src/api/v1/validators/` - Zod validation schemas
- `src/core/services/` - Business logic (auth, order, product, payment, notification, etc.)
- `src/core/repositories/` - Data access layer (14 repositories)
- `src/infrastructure/payment/` - Payment providers (Wave, Orange, MTN, Moov, Stripe, Paystack)
- `src/infrastructure/messaging/` - Email (SendGrid, Mailgun), SMS (Twilio, Africa's Talking), Push (FCM)
- `src/infrastructure/queue/` - BullMQ queues and processors
- `src/middleware/` - Auth, role guard, rate limit, error handling, validation
- `src/config/index.ts` - Centralized configuration (189 settings)

## TypeScript Path Aliases

```typescript
@/*               → src/*
@api/*            → src/api/*
@core/*           → src/core/*
@infrastructure/* → src/infrastructure/*
@middleware/*     → src/middleware/*
@utils/*          → src/utils/*
@config/*         → src/config/*
@types/*          → src/types/*
```

## Common Patterns

**Creating a new API endpoint:**
1. Define Zod schema in `src/api/v1/validators/`
2. Implement controller method in `src/api/v1/controllers/`
3. Add route to `src/api/v1/routes/`
4. Apply middleware: `authMiddleware`, `roleGuardMiddleware([...roles])`, `validationMiddleware(schema)`

**Adding a new service:**
1. Define DTOs in `src/core/interfaces/dtos/`
2. Create repository in `src/core/repositories/`
3. Create service in `src/core/services/`
4. Wire up controller → routes

**Database migrations:**
```bash
npx prisma migrate dev --name feature_name
npx prisma generate  # Regenerate client
```

**Error handling:**
```typescript
import { AppError } from '@/middleware/error-handler.middleware';
throw new AppError(400, 'User-friendly message', true);
```

## Authentication

- Phone-based login: Phone + Password → JWT issued
- Email-based login: Email + Password → OTP sent → Verify → JWT issued
- Google OAuth: Mobile sends idToken → Verify → JWT issued
- Tokens: Access (15min) + Refresh (7d), stored in HTTP-only cookies

## Key Configuration (src/config/index.ts)

- `jwt`: Access/refresh token secrets and expiration
- `rateLimit`: 100 requests/15min (5 for auth endpoints)
- `cache.ttl`: short (5min), medium (30min), long (24h)
- `business`: Commission rates, delivery fees, max distance
- `features`: Enable/disable websocket, notifications, analytics, graphql

## Testing

Tests are in `tests/` directory:
- `tests/unit/` - Service/utility unit tests
- `tests/integration/` - Repository + database tests
- `tests/e2e/` - Full API flow tests
- `tests/setup.ts` - Jest configuration and database reset

## API Documentation

- Swagger UI: `/api-docs` (when running)
- Base URL: `https://api.yapasgachis.com/api/v1`
- Health check: `GET /health`
- Documentation site: `https://doc.yapasgachis.com`

### Documentation Project (Next.js)

Located in `docs/yapasgachis-docs/`:
- Built with Next.js 16, shadcn/ui, Tailwind CSS
- Static export to `out/` folder
- Postman collection: `docs/YapaGachis_API.postman_collection.json`

**Build & Deploy:**
```bash
cd docs/yapasgachis-docs
npm run build  # Generates static files in out/
```

**FTP Deployment:**
- Host: doc.yapasgachis.com
- User: kevine@doc.yapasgachis.com
- Password: Ecolfa@961
- Upload the contents of `docs/yapasgachis-docs/out/` to the FTP root

## Important Notes

- All validation uses Zod schemas (not express-validator directly)
- Background jobs go through BullMQ (Redis-backed)
- Real-time features use Socket.io
- File uploads go to Cloudinary or AWS S3
- Logging via Winston with daily rotation to `logs/`
- Sentry for production error tracking
