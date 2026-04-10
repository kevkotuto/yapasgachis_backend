# Backend TODO - Routes Manquantes pour YaPasGachis

> **Backend**: `/Users/adelboudalha/Documents/yapasgachis_backend`
> **Stack**: Express.js + TypeScript + Prisma (PostgreSQL) + Zod
> **Pattern**: Route → Validator → Controller → Service → Repository

---

## STATUT GLOBAL

| Fonctionnalité | Priorité | Status |
|---|---|---|
| Team Management | - | **EXISTE DÉJÀ** (`team-member.routes.ts` + `StoreStaff` model) |
| Validation pickup commande | HAUTE | A créer |
| Paramètres stock produit | HAUTE | A créer |
| Admin Dashboard | MOYENNE | A créer |
| Admin Users | MOYENNE | A créer |
| Admin Reports | BASSE | A créer |
| Donation Stats | HAUTE | A vérifier |

---

## 1. VALIDATION PICKUP COMMANDE

**Priorité**: HAUTE
**Frontend**: `app/seller/scanner.tsx` → Appelle `POST /orders/validate-pickup`

### Route à créer

**Fichier**: `src/api/v1/routes/order.routes.ts` (ajouter à l'existant)

```typescript
// Ajouter AVANT les routes /:id
router.post(
  '/validate-pickup',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(validatePickupSchema),
  orderController.validatePickup
);
```

### Validator

**Fichier**: `src/api/v1/validators/order.validator.ts` (ajouter)

```typescript
export const validatePickupSchema = z.object({
  body: z.object({
    pickupCode: z.string().min(1, 'Le code de retrait est requis'),
  }),
});
```

### Controller

**Fichier**: `src/api/v1/controllers/order.controller.ts` (ajouter méthode)

```typescript
validatePickup = asyncHandler(async (req: Request, res: Response) => {
  const { pickupCode } = req.body;
  const supplierId = req.user.supplierProfileId;

  const order = await orderService.validatePickupCode(pickupCode, supplierId);

  res.json({
    success: true,
    message: 'Commande validée avec succès',
    data: { order },
  });
});
```

### Service

**Fichier**: `src/core/services/order.service.ts` (ajouter méthode)

```typescript
async validatePickupCode(pickupCode: string, supplierId: string) {
  // 1. Trouver la commande par pickupCode
  const order = await orderRepository.findByPickupCode(pickupCode);

  if (!order) {
    throw new AppError(404, 'Commande introuvable avec ce code', 'ORDER_NOT_FOUND');
  }

  // 2. Vérifier que la commande appartient à ce supplier
  if (order.supplierId !== supplierId) {
    throw new AppError(403, 'Cette commande n\'appartient pas à votre boutique', 'FORBIDDEN');
  }

  // 3. Vérifier que la commande est en statut READY (prête pour retrait)
  if (order.status !== 'READY' && order.status !== 'CONFIRMED') {
    throw new AppError(400, `Commande en statut "${order.status}", retrait impossible`, 'ORDER_INVALID_STATUS');
  }

  // 4. Mettre à jour le statut
  const updatedOrder = await orderRepository.update(order.id, {
    status: 'COMPLETED',
    completedAt: new Date(),
  });

  logger.info('Order pickup validated', { orderId: order.id, pickupCode });

  return updatedOrder;
}
```

### Repository

**Fichier**: `src/core/repositories/order.repository.ts` (ajouter méthode)

```typescript
async findByPickupCode(pickupCode: string) {
  return prisma.order.findFirst({
    where: { pickupCode },
    include: {
      items: { include: { product: true } },
      client: { select: { id: true, firstName: true, lastName: true, phoneNumber: true } },
      store: true,
    },
  });
}
```

---

## 2. PARAMÈTRES STOCK PRODUIT

**Priorité**: HAUTE
**Frontend**: `app/seller/stock/[id].tsx` → Appelle `PUT /supplier/products/:id/settings`

### Prérequis Prisma

Vérifier que le model `Product` a les champs `minStock` et `maxStock`. Sinon, ajouter dans `schema.prisma` :

```prisma
model Product {
  // ... champs existants
  minStock    Int?    @default(5)
  maxStock    Int?    @default(20)
}
```

Puis : `npx prisma migrate dev --name add-stock-settings`

### Route

**Fichier**: `src/api/v1/routes/product.routes.ts` (ou `supplier-product.routes.ts`)

```typescript
// Route supplier pour modifier les paramètres stock
router.put(
  '/:id/settings',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  validate(updateProductSettingsSchema),
  productController.updateProductSettings
);
```

### Validator

```typescript
export const updateProductSettingsSchema = z.object({
  params: z.object({
    id: z.string().uuid('ID de produit invalide'),
  }),
  body: z.object({
    minStock: z.number().int().min(0).optional(),
    maxStock: z.number().int().min(1).optional(),
  }),
});
```

### Controller

```typescript
updateProductSettings = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const supplierId = req.user.supplierProfileId;
  const { minStock, maxStock } = req.body;

  const product = await productService.updateSettings(id, supplierId, { minStock, maxStock });

  res.json({
    success: true,
    message: 'Paramètres de stock mis à jour',
    data: { product },
  });
});
```

### Service

```typescript
async updateSettings(productId: string, supplierId: string, settings: { minStock?: number; maxStock?: number }) {
  // Vérifier que le produit appartient au supplier
  const product = await productRepository.findById(productId);
  if (!product || product.supplierId !== supplierId) {
    throw new AppError(404, 'Produit introuvable', 'PRODUCT_NOT_FOUND');
  }

  // Valider cohérence min < max
  const min = settings.minStock ?? product.minStock ?? 0;
  const max = settings.maxStock ?? product.maxStock ?? 20;
  if (min >= max) {
    throw new AppError(400, 'Le stock minimum doit être inférieur au maximum', 'INVALID_STOCK_SETTINGS');
  }

  return productRepository.update(productId, {
    minStock: settings.minStock,
    maxStock: settings.maxStock,
  });
}
```

---

## 3. TEAM MANAGEMENT - VÉRIFICATION

**Status**: Le backend a **déjà** `team-member.routes.ts` avec le model `StoreStaff`.

### Ce qui existe déjà

| Route | Méthode | Description |
|---|---|---|
| `/api/v1/supplier/team` | GET | Liste des membres |
| `/api/v1/supplier/team` | POST | Inviter un membre |
| `/api/v1/supplier/team/:id` | DELETE | Retirer un membre |

**Model Prisma `StoreStaff`** :
- `storeId`, `userId`, `role` (OWNER/MANAGER/CASHIER/STOCK_CLERK)
- `inviteStatus` (PENDING/ACCEPTED/REJECTED/EXPIRED/REVOKED)
- Permissions granulaires : `canManageProducts`, `canManageOrders`, `canViewStats`, etc.

### Action requise côté frontend

Le frontend (`app/seller/team/`) utilise actuellement des données mockées. Il faut :
1. Vérifier que les routes backend fonctionnent en prod (`GET /api/v1/supplier/team`)
2. Remplacer les mocks frontend par les vrais hooks (créer `hooks/queries/useTeam.ts` et `hooks/mutations/useTeam.ts`)
3. Adapter le format de réponse backend au format attendu par l'UI

**Tester en prod** :
```bash
curl -H "Authorization: Bearer <TOKEN>" https://api.yapasgachis.com/api/v1/supplier/team
```

---

## 4. DONATION STATS - VÉRIFICATION

**Frontend**: `app/(association)/index.tsx` → Appelle `GET /donations/stats`

### Vérifier si la route existe

```bash
curl -H "Authorization: Bearer <TOKEN>" https://api.yapasgachis.com/api/v1/donations/stats
```

### Si la route n'existe pas, créer :

**Route** dans `donation.routes.ts` :
```typescript
router.get(
  '/stats',
  authenticate,
  donationController.getDonationStats
);
```

**Controller** :
```typescript
getDonationStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const role = req.user.role;

  const stats = await donationService.getStats(userId, role);

  res.json({
    success: true,
    data: stats,
  });
});
```

**Service** :
```typescript
async getStats(userId: string, role: string) {
  if (role === 'ASSOCIATION') {
    const associationId = await this.getAssociationId(userId);
    const [totalDonations, totalBeneficiaries, pendingCount] = await Promise.all([
      prisma.donation.count({ where: { associationId } }),
      prisma.donation.aggregate({
        where: { associationId, status: 'COMPLETED' },
        _sum: { beneficiariesCount: true },
      }),
      prisma.donation.count({ where: { associationId, status: 'PENDING' } }),
    ]);

    return {
      totalDonations,
      totalBeneficiaries: totalBeneficiaries._sum.beneficiariesCount || 0,
      pendingDonations: pendingCount,
    };
  }

  // Pour les donateurs (CLIENT)
  const donations = await prisma.donation.count({ where: { donorId: userId } });
  const totalAmount = await prisma.donation.aggregate({
    where: { donorId: userId, type: 'FINANCIAL' },
    _sum: { amount: true },
  });

  return {
    totalDonations: donations,
    totalAmount: totalAmount._sum.amount || 0,
  };
}
```

---

## 5. ADMIN - DASHBOARD

**Priorité**: MOYENNE
**Frontend**: `app/(admin)/index.tsx`

### Route

**Fichier**: Créer `src/api/v1/routes/admin.routes.ts`

```typescript
import { Router } from 'express';
import { authenticate } from '@/middleware/auth.middleware';
import { requireRole } from '@/middleware/role-guard.middleware';
import adminController from '../controllers/admin.controller';

const router = Router();

router.use(authenticate);
router.use(requireRole(['ADMIN', 'SUPER_ADMIN']));

router.get('/dashboard', adminController.getDashboard);
router.get('/users', adminController.getUsers);
router.get('/reports', adminController.getReports);

export default router;
```

**Monter dans `app.ts`** :
```typescript
import adminRoutes from './api/v1/routes/admin.routes';
app.use(`/api/${config.app.apiVersion}/admin`, adminRoutes);
```

### Controller

**Fichier**: Créer `src/api/v1/controllers/admin.controller.ts`

```typescript
import { Request, Response } from 'express';
import { asyncHandler } from '@/middleware/error-handler.middleware';
import { prisma } from '@/infrastructure/database/prisma';

class AdminController {
  getDashboard = asyncHandler(async (req: Request, res: Response) => {
    const [
      totalUsers,
      totalOrders,
      totalRevenue,
      totalProducts,
      recentOrders,
      usersByRole,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { totalAmount: true } }),
      prisma.product.count(),
      prisma.order.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { client: { select: { firstName: true, lastName: true } } },
      }),
      prisma.user.groupBy({ by: ['role'], _count: true }),
    ]);

    res.json({
      success: true,
      data: {
        totalUsers,
        totalOrders,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
        totalProducts,
        recentOrders,
        usersByRole,
      },
    });
  });

  getUsers = asyncHandler(async (req: Request, res: Response) => {
    const { page = 1, limit = 20, role, status, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where: any = {};
    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phoneNumber: { contains: search as string } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, firstName: true, lastName: true, email: true,
          phoneNumber: true, role: true, status: true, createdAt: true,
          avatar: true,
        },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: users,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  });

  getReports = asyncHandler(async (req: Request, res: Response) => {
    const { startDate, endDate } = req.query;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate as string);
    if (endDate) dateFilter.lte = new Date(endDate as string);

    const [
      ordersByStatus,
      revenueByMonth,
      topProducts,
      topSuppliers,
    ] = await Promise.all([
      prisma.order.groupBy({
        by: ['status'],
        _count: true,
        where: dateFilter.gte ? { createdAt: dateFilter } : {},
      }),
      prisma.$queryRaw`
        SELECT
          DATE_TRUNC('month', "createdAt") as month,
          SUM("totalAmount") as revenue,
          COUNT(*)::int as orders
        FROM "Order"
        WHERE "status" = 'COMPLETED'
        ${dateFilter.gte ? prisma.$queryRaw`AND "createdAt" >= ${dateFilter.gte}` : prisma.$queryRaw``}
        GROUP BY DATE_TRUNC('month', "createdAt")
        ORDER BY month DESC
        LIMIT 12
      `,
      prisma.product.findMany({
        take: 10,
        orderBy: { orderCount: 'desc' },
        select: { id: true, title: true, orderCount: true, currentPrice: true },
      }),
      prisma.supplierProfile.findMany({
        take: 10,
        orderBy: { totalRevenue: 'desc' },
        select: { id: true, businessName: true, totalRevenue: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        ordersByStatus,
        revenueByMonth,
        topProducts,
        topSuppliers,
      },
    });
  });
}

export default new AdminController();
```

---

## 6. CHECKLIST DÉPLOIEMENT

Après avoir implémenté les routes :

```bash
# 1. Tester en local
cd ~/Documents/yapasgachis_backend
npm run dev

# 2. Tester les routes
curl -X POST http://localhost:3000/api/v1/orders/validate-pickup \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"pickupCode": "ABC123"}'

curl -X PUT http://localhost:3000/api/v1/supplier/products/<ID>/settings \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"minStock": 5, "maxStock": 20}'

curl http://localhost:3000/api/v1/supplier/team \
  -H "Authorization: Bearer <TOKEN>"

curl http://localhost:3000/api/v1/donations/stats \
  -H "Authorization: Bearer <TOKEN>"

curl http://localhost:3000/api/v1/admin/dashboard \
  -H "Authorization: Bearer <ADMIN_TOKEN>"

# 3. Migration Prisma si nécessaire
npx prisma migrate dev --name add-stock-settings

# 4. Déployer en production
npm run build
# Utiliser votre processus de déploiement habituel

# 5. Migration prod
npx prisma migrate deploy

# 6. Vérifier en prod
curl https://api.yapasgachis.com/api/v1/admin/dashboard \
  -H "Authorization: Bearer <ADMIN_TOKEN>"
```

---

## RÉSUMÉ DES FICHIERS À CRÉER/MODIFIER

### Nouveaux fichiers
| Fichier | Description |
|---|---|
| `src/api/v1/routes/admin.routes.ts` | Routes admin |
| `src/api/v1/controllers/admin.controller.ts` | Controller admin |

### Fichiers à modifier
| Fichier | Modification |
|---|---|
| `src/api/v1/routes/order.routes.ts` | Ajouter `POST /validate-pickup` |
| `src/api/v1/controllers/order.controller.ts` | Ajouter `validatePickup()` |
| `src/core/services/order.service.ts` | Ajouter `validatePickupCode()` |
| `src/core/repositories/order.repository.ts` | Ajouter `findByPickupCode()` |
| `src/api/v1/routes/product.routes.ts` | Ajouter `PUT /:id/settings` |
| `src/api/v1/controllers/product.controller.ts` | Ajouter `updateProductSettings()` |
| `src/app.ts` | Monter les routes admin |
| `prisma/schema.prisma` | Ajouter `minStock`/`maxStock` si absents |

### Fichiers déjà OK (rien à faire)
| Fichier | Raison |
|---|---|
| `src/api/v1/routes/team-member.routes.ts` | Team management existe déjà |
| `src/api/v1/controllers/team-member.controller.ts` | Déjà implémenté |
| Model `StoreStaff` | Déjà dans le schema Prisma |
