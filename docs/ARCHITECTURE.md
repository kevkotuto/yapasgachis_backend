# Architecture YapaGachis Backend

## Vue d'ensemble

YapaGachis est construit sur une architecture en couches (Layered Architecture) avec une séparation claire des responsabilités. Le backend est conçu pour être scalable, maintenable et sécurisé.

## Stack Technologique

### Core
- **Runtime**: Node.js 18+
- **Langage**: TypeScript 5.3+
- **Framework**: Express.js 4.18+

### Base de données
- **SGBD**: PostgreSQL 14+
- **ORM**: Prisma 5.7+
- **Cache**: Redis 7+

### Infrastructure
- **Queue**: BullMQ (Redis-based)
- **WebSocket**: Socket.io 4.6+
- **File Storage**: Cloudinary / AWS S3
- **Monitoring**: Winston, Sentry

### Sécurité
- **Authentication**: JWT (Access + Refresh tokens)
- **Hashing**: bcrypt
- **Rate Limiting**: express-rate-limit + Redis
- **Validation**: Zod

## Architecture en Couches

```
┌─────────────────────────────────────────────┐
│           API Layer (Routes)                │
│     Routes, Controllers, Validators         │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│          Core Layer (Business)              │
│    Services, Repositories, Models           │
└──────────────────┬──────────────────────────┘
                   │
┌──────────────────▼──────────────────────────┐
│      Infrastructure Layer (External)        │
│  Database, Cache, Queue, Storage, APIs      │
└─────────────────────────────────────────────┘
```

### 1. API Layer (`src/api/`)

Responsable de la gestion des requêtes HTTP et de la validation des entrées.

**Composants**:
- **Routes**: Définition des endpoints
- **Controllers**: Gestion des requêtes/réponses
- **Validators**: Schémas de validation Zod

**Exemple**:
```typescript
// routes/auth.routes.ts
router.post('/login', authValidator.login, authController.login);

// controllers/auth.controller.ts
async login(req: Request, res: Response) {
  const result = await authService.login(req.body);
  res.json(result);
}

// validators/auth.validator.ts
const loginSchema = z.object({
  phoneNumber: phoneSchema,
  password: passwordSchema
});
```

### 2. Core Layer (`src/core/`)

Contient la logique métier de l'application.

**Composants**:
- **Services**: Logique métier
- **Repositories**: Accès aux données
- **Models**: Entités métier
- **Interfaces**: Contrats et DTOs

**Pattern Repository**:
```typescript
// repositories/user.repository.ts
export class UserRepository {
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({ where: { id } });
  }
}

// services/auth.service.ts
export class AuthService {
  constructor(private userRepo: UserRepository) {}

  async login(credentials: LoginDTO): Promise<AuthResponse> {
    const user = await this.userRepo.findByPhone(credentials.phoneNumber);
    // ... business logic
  }
}
```

### 3. Infrastructure Layer (`src/infrastructure/`)

Gestion des services externes et de l'infrastructure.

**Composants**:
- **Database**: Prisma, Redis clients
- **Queue**: BullMQ workers et queues
- **Payment**: Intégration Mobile Money, Stripe, etc.
- **Storage**: Cloudinary, S3
- **Messaging**: Email, SMS, Push notifications
- **Monitoring**: Logging, Sentry

**Factory Pattern (Payments)**:
```typescript
interface PaymentProvider {
  initiate(params: PaymentParams): Promise<PaymentResponse>;
  verify(reference: string): Promise<PaymentStatus>;
}

class OrangeMoneyProvider implements PaymentProvider { ... }
class MTNMoneyProvider implements PaymentProvider { ... }

class PaymentFactory {
  static getProvider(method: string): PaymentProvider {
    // Return appropriate provider
  }
}
```

## Patterns de Conception

### 1. Repository Pattern
Abstraction de l'accès aux données.

```typescript
class ProductRepository {
  async findNearby(lat: number, lng: number, radius: number) {
    // Geospatial query
  }
}
```

### 2. Service Layer Pattern
Encapsulation de la logique métier.

```typescript
class OrderService {
  async createOrder(data: CreateOrderDTO) {
    // Validate stock
    // Calculate pricing
    // Create order
    // Initiate payment
    // Send notifications
  }
}
```

### 3. Factory Pattern
Création dynamique d'objets (providers de paiement, stockage).

### 4. Singleton Pattern
Instance unique (Database, Redis).

### 5. Strategy Pattern
Différentes stratégies (notifications multi-canal).

## Flux de Données

### 1. Création de Commande

```
Client Request
    ↓
API Controller (validate)
    ↓
Order Service
    ├─→ Product Repository (check stock)
    ├─→ Pricing Service (calculate)
    ├─→ Payment Service (initiate)
    └─→ Notification Queue (enqueue)
    ↓
Response to Client
```

### 2. Traitement de Paiement

```
Payment Webhook
    ↓
Webhook Endpoint (verify signature)
    ↓
Payment Service
    ├─→ Update Order Status
    ├─→ Update Inventory
    └─→ Trigger Notification
    ↓
Queue Background Jobs
```

## Système de Cache

### Stratégie de Cache Multi-niveaux

```
1. Application Cache (LRU in-memory)
2. Redis Cache (distributed)
3. CDN Cache (static assets)
```

### Clés de Cache

```typescript
const CACHE_KEYS = {
  USER_PREFIX: 'user:',           // user:123
  PRODUCT_PREFIX: 'product:',     // product:456
  SESSION_PREFIX: 'session:',     // session:abc
  OTP_PREFIX: 'otp:',            // otp:+225xxxxxxxx
};
```

### TTL (Time To Live)

```
- Product listings: 5 minutes
- User sessions: 15 minutes
- Supplier profiles: 1 hour
- Static content: 24 hours
```

## Système de Queue

### Queues Disponibles

```typescript
const QUEUES = {
  EMAIL: 'email',
  SMS: 'sms',
  PUSH_NOTIFICATION: 'push-notification',
  IMAGE_PROCESSING: 'image-processing',
  PAYMENT: 'payment',
  ANALYTICS: 'analytics',
};
```

### Exemple de Job

```typescript
// Producer
await emailQueue.add('send-welcome-email', {
  userId: user.id,
  email: user.email
});

// Consumer/Worker
emailQueue.process('send-welcome-email', async (job) => {
  await sendWelcomeEmail(job.data);
});
```

## Sécurité

### 1. Authentification JWT

```
Access Token: 15 minutes (courte durée)
Refresh Token: 7 jours (stocké dans Redis)
```

### 2. Rate Limiting

```
- API endpoints: 100 req/min/user
- Auth endpoints: 5 req/min/IP
- Upload endpoints: 10 req/15min/user
- Payment endpoints: 20 req/hour/user
```

### 3. Validation des Données

Tous les inputs sont validés avec Zod avant traitement.

### 4. Sécurité des Paiements

- Vérification des signatures webhook
- Logs d'audit pour toutes les transactions
- Isolation des données sensibles
- Chiffrement des données PII

## Scalabilité

### 1. Horizontal Scaling

```yaml
# Docker Compose - Multiple API instances
services:
  api:
    deploy:
      replicas: 3
```

### 2. Database Scaling

- Connection pooling (Prisma)
- Read replicas (futurs)
- Indexes optimisés
- Query optimization

### 3. Redis Clustering

Configuration future pour haute disponibilité.

### 4. Queue Workers

Multiple workers en parallèle pour traitement rapide.

## Monitoring & Observability

### 1. Logging

```
Winston → Files (rotation journalière)
         → Console (development)
         → ELK Stack (production future)
```

### 2. Error Tracking

```
Sentry → Capture exceptions
       → Track performance
       → Alert on issues
```

### 3. Metrics

```
- Request duration
- Database query time
- Queue processing time
- Cache hit/miss ratio
```

### 4. Health Checks

```
GET /health
{
  "success": true,
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

## Performance

### 1. Database Optimization

- Indexes sur champs fréquemment interrogés
- Cursor-based pagination
- Sélection de champs spécifiques (Prisma select)
- Éviter N+1 queries

### 2. Caching Strategy

- Cache-aside pattern
- Cache invalidation on updates
- Geospatial caching pour recherches localisées

### 3. Background Processing

Toutes les opérations lourdes sont asynchrones:
- Envoi d'emails
- Traitement d'images
- Génération de rapports
- Analytics

## Déploiement

### Development

```bash
docker-compose up -d
npm run dev
```

### Production

```bash
docker build -t yapasgachis-api .
docker run -p 3000:3000 yapasgachis-api
```

### CI/CD

```
GitHub Actions → Build → Test → Deploy
```

## Prochaines Étapes

1. **Phase 1**: Authentication & Core APIs
2. **Phase 2**: Payment & Orders
3. **Phase 3**: Real-time features (WebSocket)
4. **Phase 4**: Analytics & Reporting
5. **Phase 5**: Microservices migration (si nécessaire)

## Ressources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
