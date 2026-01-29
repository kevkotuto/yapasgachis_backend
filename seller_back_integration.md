# Backend Requirements - Section Seller


---

## 📋 Table des Matières

1. [Routes Backend Manquantes](#1-routes-backend-manquantes)
2. [Routes Backend Existantes](#2-routes-backend-existantes)
3. [Modifications Backend Nécessaires](#3-modifications-backend-nécessaires)
4. [Priorités d'Implémentation](#4-priorités-dimplémentation)
5. [Modèles de Données](#5-modèles-de-données)

---

## 1. Routes Backend Manquantes

### 🔴 CRITIQUE - Staff Management

Le modèle `StoreStaff` existe dans le backend mais **aucune route n'est exposée**.

#### Routes à créer : `/api/v1/supplier/staff`

| Méthode | Endpoint | Description | Payload |
|---------|----------|-------------|---------|
| GET | `/supplier/staff` | Liste tous les membres d'équipe du supplier | Query: `?storeId=xxx` (optionnel) |
| POST | `/supplier/staff/invite` | Inviter un nouveau membre | `{ userId, storeId, role, permissions }` |
| GET | `/supplier/staff/:id` | Détail d'un membre | - |
| PUT | `/supplier/staff/:id` | Modifier permissions/rôle | `{ role, permissions, storeId }` |
| DELETE | `/supplier/staff/:id` | Supprimer un membre | - |
| POST | `/supplier/staff/accept-invite` | Accepter une invitation | `{ inviteToken }` |
| GET | `/supplier/staff/invitations` | Liste invitations en attente | - |

#### Payload Exemples

**POST `/supplier/staff/invite`**
```json
{
  "userId": "user-uuid",  // ou "email" pour inviter par email
  "email": "john@example.com",
  "storeId": "store-uuid",
  "role": "MANAGER",  // OWNER, MANAGER, CASHIER, STOCK_CLERK
  "permissions": {
    "canManageProducts": true,
    "canManageOrders": true,
    "canViewStats": true,
    "canManageStaff": false,
    "canManageDeals": true,
    "canManageSettings": false
  }
}
```

**PUT `/supplier/staff/:id`**
```json
{
  "role": "CASHIER",
  "storeId": "store-uuid",
  "permissions": {
    "canManageProducts": false,
    "canManageOrders": true,
    "canViewStats": false,
    "canManageStaff": false,
    "canManageDeals": false,
    "canManageSettings": false
  }
}
```

#### Modèle Existant à Utiliser

```typescript
model StoreStaff {
  id                  String   @id @default(uuid())
  storeId             String
  userId              String
  role                StoreStaffRole  // OWNER, MANAGER, CASHIER, STOCK_CLERK
  isActive            Boolean  @default(true)

  // Permissions
  canManageProducts   Boolean  @default(false)
  canManageOrders     Boolean  @default(false)
  canViewStats        Boolean  @default(false)
  canManageStaff      Boolean  @default(false)
  canManageDeals      Boolean  @default(false)
  canManageSettings   Boolean  @default(false)

  // Invitation
  invitedById         String?
  invitedAt           DateTime @default(now())
  acceptedAt          DateTime?
  inviteStatus        StoreStaffInviteStatus @default(PENDING)
  inviteToken         String?  @unique
  inviteExpiresAt     DateTime?

  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([storeId, userId])
}
```

#### Business Rules

1. **OWNER** :
   - Créé automatiquement lors de la création du store
   - Ne peut pas être supprimé
   - Full permissions

2. **MANAGER** :
   - Peut tout gérer sauf delete store et manage owner
   - Peut inviter d'autres membres

3. **CASHIER** :
   - Peut gérer uniquement les commandes
   - Read-only sur produits

4. **STOCK_CLERK** :
   - Peut gérer produits et stock
   - Read-only sur commandes

5. **Invitation** :
   - Token expire après 7 jours
   - Email envoyé avec lien d'invitation
   - Si user n'existe pas, créer compte temporaire

---

### 🟡 MOYENNE - Stock Movements

Routes pour tracker l'historique des mouvements de stock.

#### Routes à créer : `/api/v1/supplier/stock-movements`

| Méthode | Endpoint | Description | Query Params |
|---------|----------|-------------|--------------|
| GET | `/supplier/stock-movements` | Historique mouvements | `?productId, ?storeId, ?type, ?startDate, ?endDate` |
| POST | `/supplier/stock-movements` | Enregistrer mouvement manuel | `{ productId, type, quantity, reason }` |
| GET | `/supplier/stock-movements/summary` | Résumé par produit | `?storeId, ?period` |

#### Payload Exemples

**POST `/supplier/stock-movements`**
```json
{
  "productId": "product-uuid",
  "type": "ADJUSTMENT",  // INBOUND, OUTBOUND, ADJUSTMENT, RETURN, WASTE
  "quantity": -5,  // Négatif pour sortie, positif pour entrée
  "reason": "EXPIRATION",  // EXPIRATION, DAMAGED, STOLEN, RESTOCK, SALE, etc.
  "notes": "5 produits expirés retirés du stock",
  "storeId": "store-uuid"  // optionnel
}
```

**Response GET `/supplier/stock-movements`**
```json
{
  "data": [
    {
      "id": "movement-uuid",
      "productId": "product-uuid",
      "product": {
        "title": "Pain au chocolat",
        "images": ["url"]
      },
      "type": "OUTBOUND",
      "quantity": -3,
      "previousStock": 15,
      "newStock": 12,
      "orderId": "order-uuid",  // Si mouvement lié à une commande
      "reason": "SALE",
      "notes": null,
      "performedBy": {
        "id": "user-uuid",
        "firstName": "Jean",
        "lastName": "Dupont"
      },
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20
  }
}
```

#### Business Rules

1. **Auto-création** :
   - Mouvement OUTBOUND créé automatiquement lors d'une commande
   - Mouvement INBOUND créé lors de création/update produit

2. **Validation** :
   - Ne pas permettre stock négatif
   - Vérifier ownership du produit

3. **Historique** :
   - Immutable (pas de modification/suppression)
   - Pagination obligatoire

---

### 🟢 BASSE - Review Response

Permettre aux suppliers de répondre aux avis clients.

#### Routes à créer : `/api/v1/reviews`

| Méthode | Endpoint | Description | Payload |
|---------|----------|-------------|---------|
| POST | `/reviews/:id/response` | Répondre à un avis | `{ response: string }` |
| PUT | `/reviews/:id/response` | Modifier réponse | `{ response: string }` |
| DELETE | `/reviews/:id/response` | Supprimer réponse | - |

#### Payload Exemple

**POST `/reviews/:id/response`**
```json
{
  "response": "Merci pour votre retour ! Nous sommes ravis que vous ayez apprécié nos produits."
}
```

#### Modèle à Modifier

Ajouter au modèle `Review` existant :
```typescript
model Review {
  // ... champs existants

  // Nouveaux champs
  supplierResponse    String?
  supplierRespondedAt DateTime?
  supplierRespondedBy String?  // userId
}
```

---

## 2. Routes Backend Existantes

### ✅ Supplier Profile

**Base**: `/api/v1/suppliers`

| Endpoint | Méthode | Description | Status |
|----------|---------|-------------|--------|
| `/profile` | GET | Profil supplier auth | ✅ Existe |
| `/profile` | POST | Créer profil | ✅ Existe |
| `/profile` | PUT | Modifier profil | ✅ Existe |
| `/statistics` | GET | Stats supplier | ✅ Existe |
| `/subscription` | POST | Update subscription | ✅ Existe |
| `/can-create-products` | GET | Check limites plan | ✅ Existe |
| `/:id` | GET | Profil public | ✅ Existe |
| `/search` | GET | Recherche suppliers | ✅ Existe |
| `/nearby` | GET | Suppliers à proximité | ✅ Existe |

### ✅ Stores (Points de Vente)

**Base**: `/api/v1/supplier/stores`

| Endpoint | Méthode | Description | Status |
|----------|---------|-------------|--------|
| `/` | GET | Liste stores supplier | ✅ Existe |
| `/` | POST | Créer store | ✅ Existe |
| `/:storeId` | GET | Détail store | ✅ Existe |
| `/:storeId` | PUT | Modifier store | ✅ Existe |
| `/:storeId` | DELETE | Supprimer store | ✅ Existe |
| `/:storeId/statistics` | GET | Stats store | ✅ Existe |
| `/:storeId/temporary-closure` | POST | Fermeture temporaire | ✅ Existe |
| `/:storeId/toggle-active` | POST | Activer/désactiver | ✅ Existe |

### ✅ Products

**Base**: `/api/v1/products`

| Endpoint | Méthode | Description | Status |
|----------|---------|-------------|--------|
| `/my-products` | GET | Produits du supplier | ✅ Existe |
| `/` | POST | Créer produit | ✅ Existe |
| `/:id` | PUT | Modifier produit | ✅ Existe |
| `/:id` | DELETE | Supprimer produit | ✅ Existe |
| `/:id/stock` | PATCH | Update stock | ✅ Existe |
| `/:id/images` | POST | Upload images | ✅ Existe |
| `/:id/images` | DELETE | Supprimer image | ✅ Existe |
| `/bulk-update` | POST | Update bulk | ✅ Existe |

### ✅ Deals

**Base**: `/api/v1/supplier/deals` et `/api/v1/deals`

| Endpoint | Méthode | Description | Status |
|----------|---------|-------------|--------|
| `/supplier/deals` | GET | Deals du supplier | ✅ Existe |
| `/deals` | POST | Créer deal | ✅ Existe |
| `/deals/:id` | PUT | Modifier deal | ✅ Existe |
| `/deals/:id` | DELETE | Supprimer deal | ✅ Existe |
| `/deals/:id/toggle-pause` | POST | Pause/Resume | ✅ Existe |
| `/deals/:id/rooms` | POST | Créer room | ✅ Existe |
| `/deals/:id/rooms/:roomId` | PUT | Modifier room | ✅ Existe |
| `/deals/:id/rooms/:roomId` | DELETE | Supprimer room | ✅ Existe |
| `/supplier/deals/bookings` | GET | Bookings supplier | ✅ Existe |
| `/supplier/deals/bookings/validate` | POST | Valider booking (QR) | ✅ Existe |

### ✅ Orders

**Base**: `/api/v1/orders`

| Endpoint | Méthode | Description | Status |
|----------|---------|-------------|--------|
| `/supplier-orders` | GET | Commandes supplier | ✅ Existe |
| `/supplier-statistics` | GET | Stats commandes | ✅ Existe |
| `/:id/status` | PATCH | Update statut | ✅ Existe |
| `/:id/accept` | POST | Accepter commande | ✅ Existe |
| `/:id/reject` | POST | Rejeter commande | ✅ Existe |
| `/:id/ready` | POST | Marquer prêt | ✅ Existe |
| `/:id/complete` | POST | Compléter commande | ✅ Existe |

### ✅ Wallet & Payout

**Base**: `/api/v1/supplier`

| Endpoint | Méthode | Description | Status |
|----------|---------|-------------|--------|
| `/wallet` | GET | Solde wallet | ✅ Existe |
| `/transactions` | GET | Historique transactions | ✅ Existe |
| `/payout` | POST | Demande retrait | ✅ Existe |
| `/payouts` | GET | Historique retraits | ✅ Existe |

**Base**: `/api/v1/orders/payments`

| Endpoint | Méthode | Description | Status |
|----------|---------|-------------|--------|
| `/providers` | GET | Liste providers paiement | ✅ Existe |

### ✅ Analytics

**Base**: `/api/v1/supplier`

| Endpoint | Méthode | Description | Status |
|----------|---------|-------------|--------|
| `/analytics` | GET | Analytics détaillées | ✅ Existe |
| `/statistics` | GET | Stats générales | ✅ Existe |

---

## 3. Modifications Backend Nécessaires

### 🔧 Ajouts Mineurs aux Routes Existantes

#### 3.1 KYC Upload

**Endpoint existant**: `PUT /api/v1/suppliers/profile`

**Modification**: Accepter upload de fichiers pour KYC

```typescript
// Ajouter middleware multer
router.put(
  '/profile',
  authMiddleware,
  supplierOnly,
  uploadImages.fields([
    { name: 'idCardFront', maxCount: 1 },
    { name: 'idCardBack', maxCount: 1 },
    { name: 'selfiePhoto', maxCount: 1 },
    { name: 'logo', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  validate(updateSupplierProfileSchema),
  updateProfile
);
```

**Payload attendu**:
```json
{
  "kycData": {
    "idCardType": "CNI",
    "idCardNumber": "CI20240001234",
    "idCardExpiry": "2030-12-31"
  }
}
// + Files: idCardFront, idCardBack, selfiePhoto
```

#### 3.2 Store Hours Management

**Endpoint**: `PUT /api/v1/supplier/stores/:storeId`

**Modification**: Supporter format horaires détaillé

```typescript
// Format attendu
{
  "operatingHours": {
    "monday": { "open": "08:00", "close": "20:00", "closed": false },
    "tuesday": { "open": "08:00", "close": "20:00", "closed": false },
    "wednesday": { "open": "08:00", "close": "20:00", "closed": false },
    "thursday": { "open": "08:00", "close": "20:00", "closed": false },
    "friday": { "open": "08:00", "close": "20:00", "closed": false },
    "saturday": { "open": "09:00", "close": "18:00", "closed": false },
    "sunday": { "closed": true }
  }
}
```

#### 3.3 Product Toggle Status

**Vérifier l'existence**: `PATCH /api/v1/products/:id/toggle-status`

Si manquant, créer route qui toggle entre `ACTIVE` et `DRAFT`.

---

## 4. Priorités d'Implémentation

### 🔴 PHASE 1 - CRITIQUE (Semaine 1-2)

**Objectif**: Permettre workflow de base Produits + Commandes

1. **Aucune modification backend nécessaire** ✅
   - Toutes les routes existent déjà
   - Juste connecter le frontend

**Exception**: Si `PATCH /products/:id/toggle-status` manquant, le créer.

---

### 🟡 PHASE 2 - HAUTE (Semaine 3-4)

**Objectif**: Deal Rooms, Bookings, Stock

1. **Aucune modification backend nécessaire** ✅
   - Routes Rooms et Bookings existent
   - Routes Stock exist

---

### 🟠 PHASE 3 - MOYENNE (Semaine 5-6)

**Objectif**: Team, KYC, Payout, Reviews

#### À créer en priorité:

1. **Staff Management Routes** (2-3 jours)
   - Controller: `supplier-staff.controller.ts`
   - Service: `supplier-staff.service.ts`
   - Routes: `/api/v1/supplier/staff`
   - Validation: `supplier-staff.validator.ts`

2. **KYC Upload Enhancement** (1 jour)
   - Ajouter multer fields au PUT `/suppliers/profile`
   - Upload vers Cloudinary
   - Validation fichiers

3. **Stock Movements Routes** (2 jours)
   - Controller: `stock-movement.controller.ts`
   - Service: `stock-movement.service.ts`
   - Routes: `/api/v1/supplier/stock-movements`

4. **Review Response** (1 jour)
   - Ajouter champs au modèle Review
   - Routes réponse

---

### 🟢 PHASE 4 - BASSE (Semaine 7+)

**Objectif**: Polish, optimisations

1. **Analytics Avancées**
   - Endpoints additionnels si nécessaire

2. **Notifications Real-time**
   - WebSocket events pour staff

---

## 5. Modèles de Données

### Modèles Existants (à utiliser)

#### SupplierProfile
```typescript
{
  id: string
  userId: string
  businessName: string
  supplierType: SupplierType
  description?: string
  logo?: string
  coverImage?: string

  // KYC
  rccm?: string
  niu?: string
  legalDocuments?: string[]
  idCardFront?: string
  idCardBack?: string
  selfiePhoto?: string
  idCardType?: string
  idCardNumber?: string
  idCardExpiry?: DateTime
  kycStatus: string  // PENDING, SUBMITTED, VERIFIED, REJECTED

  // Subscription
  subscriptionTier: SubscriptionTier
  subscriptionPlanId?: string
  subscriptionActive: boolean

  // Stats
  totalSales: int
  totalRevenue: float
  averageRating?: float
  totalReviews: int
}
```

#### SupplierStore
```typescript
{
  id: string
  supplierId: string
  name: string
  description?: string
  images?: string[]
  address: string
  city: string
  commune?: string
  latitude: float
  longitude: float
  phoneNumber?: string
  email?: string
  operatingHours: Json  // {monday: {open, close}, ...}
  deliveryEnabled: boolean
  pickupEnabled: boolean
  deliveryRadius?: float
  acceptCashPayment: boolean
  payoutProviderId?: string
  isActive: boolean
  isTemporarilyClosed: boolean
  closureReason?: string
}
```

#### Product
```typescript
{
  id: string
  supplierId: string
  storeId?: string
  title: string
  description: string
  category: ProductCategory
  images: string[]
  originalPrice: float
  discountedPrice: float
  quantity: int
  quantityAvailable: int
  expiryDate?: DateTime
  status: ProductStatus  // DRAFT, ACTIVE, SOLD_OUT, EXPIRED
  pickupSlots?: Json
  deliveryAvailable: boolean
}
```

#### Deal
```typescript
{
  id: string
  supplierId: string
  storeId?: string
  title: string
  description: string
  category: DealCategory
  images: string[]
  originalPrice: float
  dealPrice: float
  status: DealStatus  // DRAFT, PENDING_APPROVAL, ACTIVE, PAUSED, EXPIRED
  availableFrom: DateTime
  availableUntil: DateTime
  totalQuantity: int
  quantityAvailable: int
  requiresBooking: boolean
  bookingMode: BookingMode  // SINGLE_DATE, DATE_RANGE
  includes?: string[]
  excludes?: string[]
  terms?: string
}
```

#### DealRoom
```typescript
{
  id: string
  dealId: string
  title: string
  description?: string
  price: float
  capacity?: string
  size?: string
  amenities?: string[]
  bedTypes?: string[]
  images?: string[]
  maxOccupancy?: int
  isAvailable: boolean
}
```

#### DealBooking
```typescript
{
  id: string
  dealId: string
  userId: string
  bookingNumber: string @unique
  quantity: int
  bookingDate: DateTime
  bookingSlot?: string
  bookingEndDate?: DateTime
  numberOfNights?: int
  unitPrice: float
  totalPrice: float
  status: BookingStatus  // PENDING, CONFIRMED, USED, CANCELLED
  validationCode: string @unique
  paymentMethod: PaymentMethod
}
```

#### Order
```typescript
{
  id: string
  orderNumber: string
  clientId: string
  supplierId: string
  storeId?: string
  status: OrderStatus
  deliveryMethod: DeliveryMethod
  subtotal: float
  deliveryFee: float
  commission: float
  supplierAmount: float
  total: float
  pickupCode?: string
  pickupSlot?: DateTime
  deliveryAddress?: string
  paymentMethod: PaymentMethod
}
```

---

### Modèles à Créer

#### StockMovement (si pas existant)

```typescript
model StockMovement {
  id              String              @id @default(uuid())
  productId       String
  product         Product             @relation(fields: [productId], references: [id])

  type            StockMovementType   // INBOUND, OUTBOUND, ADJUSTMENT, RETURN, WASTE
  quantity        Int                 // Négatif pour sortie
  previousStock   Int
  newStock        Int

  orderId         String?
  order           Order?              @relation(fields: [orderId], references: [id])

  supplierId      String
  supplier        SupplierProfile     @relation(fields: [supplierId], references: [id])

  storeId         String?
  store           SupplierStore?      @relation(fields: [storeId], references: [id])

  reason          String?             // SALE, EXPIRATION, DAMAGED, RESTOCK, etc.
  notes           String?

  performedById   String?
  performedBy     User?               @relation(fields: [performedById], references: [id])

  createdAt       DateTime            @default(now())

  @@index([productId])
  @@index([supplierId])
  @@index([storeId])
  @@index([createdAt])
}

enum StockMovementType {
  INBOUND      // Entrée stock (réassort)
  OUTBOUND     // Sortie stock (vente)
  ADJUSTMENT   // Ajustement manuel
  RETURN       // Retour client
  WASTE        // Perte (expiration, casse)
}
```

---

## 📝 Checklist Backend

### Routes à Créer

- [ ] **Staff Management** (CRITIQUE)
  - [ ] `GET /supplier/staff`
  - [ ] `POST /supplier/staff/invite`
  - [ ] `PUT /supplier/staff/:id`
  - [ ] `DELETE /supplier/staff/:id`
  - [ ] `POST /supplier/staff/accept-invite`
  - [ ] `GET /supplier/staff/invitations`

- [ ] **Stock Movements** (MOYENNE)
  - [ ] `GET /supplier/stock-movements`
  - [ ] `POST /supplier/stock-movements`
  - [ ] `GET /supplier/stock-movements/summary`

- [ ] **Review Response** (BASSE)
  - [ ] `POST /reviews/:id/response`
  - [ ] `PUT /reviews/:id/response`
  - [ ] `DELETE /reviews/:id/response`

### Modifications Routes Existantes

- [ ] **KYC Upload**
  - [ ] Ajouter multer fields à `PUT /suppliers/profile`
  - [ ] Upload Cloudinary pour KYC docs

- [ ] **Product Toggle Status** (vérifier)
  - [ ] Vérifier existence `PATCH /products/:id/toggle-status`
  - [ ] Créer si manquant

### Modèles à Créer/Modifier

- [ ] **StockMovement Model** (si pas existant)
- [ ] **Review Model** - Ajouter champs response
- [ ] **Notification Events** - Pour staff management

---

## 🎯 Résumé Exécutif

### Ce qui EXISTE déjà ✅
- **87+ endpoints** pour suppliers
- Routes complètes : Products, Deals, Stores, Orders, Wallet
- Modèles complets : SupplierProfile, Product, Deal, Order, etc.

### Ce qui MANQUE ❌
- **Staff Management** - Routes complètes (modèle existe)
- **Stock Movements** - Historique détaillé
- **Review Response** - Réponse aux avis

### Ce qui nécessite MODIFICATION 🔧
- **KYC Upload** - Ajout upload fichiers
- **Product Toggle** - Vérifier existence

### Estimation Temps Backend

| Tâche | Temps | Priorité |
|-------|-------|----------|
| Staff Management Routes | 2-3 jours | 🔴 HAUTE |
| Stock Movements Routes | 2 jours | 🟡 MOYENNE |
| KYC Upload Enhancement | 1 jour | 🟡 MOYENNE |
| Review Response | 1 jour | 🟢 BASSE |
| **TOTAL** | **6-7 jours** | - |

---

**Dernière mise à jour**: 2026-01-29
**Statut**: En attente implémentation backend
**Contact**: Informer l'utilisateur pour modifications backend
