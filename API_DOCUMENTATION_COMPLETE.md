# 📚 Documentation API Complète - YapaGachis Backend

> **Plateforme panafricaine de lutte contre le gaspillage alimentaire**

## 🌍 Vue d'ensemble

### URLs de base
```
Production: https://api.yapasgachis.com/api/v1
Development: http://localhost:3000/api/v1
```

### Version actuelle
**API v1.0** - Dernière mise à jour: Janvier 2024

---

## 📋 Table des matières

1. [Structure des réponses](#structure-des-réponses)
2. [Authentication](#authentication)
3. [Codes d'erreur](#codes-derreur)
4. [Routes principales](#routes-principales)
   - [Auth & Utilisateurs](#auth--utilisateurs)
   - [Produits](#produits)
   - [Commandes](#commandes)
   - [Deals](#deals)
   - [Dons](#dons)
   - [Fournisseurs](#fournisseurs)
   - [Abonnements](#abonnements)
   - [Avis](#avis)
   - [Notifications](#notifications)
   - [Récompenses](#récompenses)
   - [Administration](#administration)

---

## 📦 Structure des réponses

### ✅ Réponse de succès

```json
{
  "success": true,
  "message": "Message descriptif de l'opération",
  "data": {
    // Données retournées
  }
}
```

### ❌ Réponse d'erreur

```json
{
  "success": false,
  "message": "Description de l'erreur",
  "code": "ERROR_CODE",
  "errors": [
    {
      "field": "nomDuChamp",
      "message": "Message d'erreur spécifique"
    }
  ]
}
```

### 📄 Pagination

```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 🔐 Authentication

### Méthodes d'authentification supportées

1. **Login par téléphone** : Téléphone + Mot de passe → JWT immédiat
2. **Login par email** : Email + Mot de passe → OTP → Vérification → JWT
3. **Google OAuth** : Google ID Token → JWT

### Format du token

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Durée de vie des tokens

- **Access Token**: 15 minutes
- **Refresh Token**: 7 jours

### Rôles utilisateur

| Rôle | Description |
|------|-------------|
| `CLIENT` | Client standard (achat de produits) |
| `SUPPLIER_FOOD` | Fournisseur de produits alimentaires |
| `SUPPLIER_DEALS` | Fournisseur de deals (hôtel, spa, etc.) |
| `ASSOCIATION` | Association (réception de dons) |
| `ADVERTISER` | Annonceur publicitaire |
| `ADMIN` | Administrateur |
| `SUPER_ADMIN` | Super administrateur |

---

## ⚠️ Codes d'erreur

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 422 | Erreur de validation des données |
| `UNAUTHORIZED` | 401 | Non authentifié |
| `FORBIDDEN` | 403 | Accès interdit |
| `NOT_FOUND` | 404 | Ressource non trouvée |
| `CONFLICT` | 409 | Ressource déjà existante |
| `INTERNAL_ERROR` | 500 | Erreur serveur interne |
| `PAYMENT_FAILED` | 400 | Échec du paiement |
| `INSUFFICIENT_STOCK` | 400 | Stock insuffisant |
| `INVALID_CREDENTIALS` | 401 | Identifiants invalides |
| `TOKEN_EXPIRED` | 401 | Token expiré |
| `INVALID_OTP` | 400 | Code OTP invalide |

---

## 🔑 Auth & Utilisateurs

### 1. Inscription

**`POST /auth/register`**

Créer un nouveau compte utilisateur.

**Rate limit**: 5 req/15min | **Auth**: Non

#### Request
```json
{
  "phoneNumber": "+221771234567",
  "email": "user@example.com",
  "firstName": "Adama",
  "lastName": "Diallo",
  "password": "MyP@ssw0rd123",
  "role": "CLIENT",
  "city": "Dakar",
  "language": "fr"
}
```

#### Validation
- `phoneNumber`: Format international (+XXX), 8-15 chiffres
- `password`: Min 8 car., 1 maj, 1 min, 1 chiffre, 1 spécial
- `language`: "fr" | "en" | "ar" | "es" | "bm"

#### Response Success (201)
```json
{
  "success": true,
  "message": "Inscription réussie. Un code OTP a été envoyé.",
  "data": {
    "user": {
      "id": "uuid",
      "phoneNumber": "+221771234567",
      "firstName": "Adama",
      "role": "CLIENT",
      "isPhoneVerified": false
    }
  }
}
```

#### Response Error (409)
```json
{
  "success": false,
  "message": "Ce numéro de téléphone est déjà enregistré",
  "code": "CONFLICT"
}
```

---

### 2. Connexion par téléphone

**`POST /auth/login`**

Connexion directe avec téléphone et mot de passe.

**Rate limit**: 5 req/15min | **Auth**: Non

#### Request
```json
{
  "phoneNumber": "+221771234567",
  "password": "MyP@ssw0rd123"
}
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "user": {
      "id": "uuid",
      "phoneNumber": "+221771234567",
      "email": "user@example.com",
      "firstName": "Adama",
      "lastName": "Diallo",
      "role": "CLIENT",
      "isPhoneVerified": true
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": 900
    }
  }
}
```

---

### 3. Connexion par email (Étape 1)

**`POST /auth/login/email`**

Initier la connexion par email (OTP envoyé).

#### Request
```json
{
  "email": "user@example.com",
  "password": "MyP@ssw0rd123"
}
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "Code de vérification envoyé à votre email",
  "data": {
    "requiresOTP": true
  }
}
```

---

### 4. Vérifier OTP Email (Étape 2)

**`POST /auth/verify-email-otp`**

Vérifier le code OTP et obtenir les tokens.

#### Request
```json
{
  "email": "user@example.com",
  "code": "123456",
  "purpose": "login"
}
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "user": { /* user object */ },
    "tokens": {
      "accessToken": "...",
      "refreshToken": "...",
      "expiresIn": 900
    }
  }
}
```

---

### 5. Vérifier OTP Téléphone

**`POST /auth/verify-otp`**

Vérifier le code OTP après inscription.

#### Request
```json
{
  "phoneNumber": "+221771234567",
  "code": "123456",
  "purpose": "registration"
}
```

---

### 6. Renvoyer OTP

**`POST /auth/resend-otp`** (Téléphone)
**`POST /auth/resend-email-otp`** (Email)

#### Request
```json
{
  "phoneNumber": "+221771234567",
  "purpose": "registration"
}
```

---

### 7. Mot de passe oublié

**`POST /auth/forgot-password`**

Initier la réinitialisation du mot de passe.

#### Request
```json
{
  "phoneNumber": "+221771234567"
}
```

---

### 8. Réinitialiser mot de passe

**`POST /auth/reset-password`**

#### Request
```json
{
  "phoneNumber": "+221771234567",
  "code": "123456",
  "newPassword": "NewP@ssw0rd456"
}
```

---

### 9. Changer mot de passe

**`POST /auth/change-password`**

**Auth**: Oui

#### Request
```json
{
  "currentPassword": "OldP@ssw0rd123",
  "newPassword": "NewP@ssw0rd456",
  "confirmPassword": "NewP@ssw0rd456"
}
```

---

### 10. Refresh Token

**`POST /auth/refresh-token`**

#### Request
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "accessToken": "new_token...",
    "expiresIn": 900
  }
}
```

---

### 11. Déconnexion

**`POST /auth/logout`**

**Auth**: Oui

---

### 12. Mon profil

**`GET /auth/me`**

**Auth**: Oui

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "phoneNumber": "+221771234567",
      "email": "user@example.com",
      "firstName": "Adama",
      "lastName": "Diallo",
      "role": "CLIENT",
      "isPhoneVerified": true,
      "isEmailVerified": true,
      "profileImage": "https://...",
      "city": "Dakar",
      "language": "fr",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

### 13. Connexion Google

**`POST /auth/google`**

#### Request
```json
{
  "idToken": "google_id_token",
  "role": "CLIENT",
  "language": "fr"
}
```

#### Response Success (200)
```json
{
  "success": true,
  "message": "Connexion Google réussie",
  "data": {
    "user": { /* user */ },
    "tokens": { /* tokens */ },
    "isNewUser": false
  }
}
```

---

### 14. Lier compte Google

**`POST /auth/google/link`**

**Auth**: Oui

---

### 15. Délier compte Google

**`POST /auth/google/unlink`**

**Auth**: Oui

---

## 🛍️ Produits

### 1. Rechercher des produits

**`GET /products/search`**

**Auth**: Non

#### Query Parameters
```
?search=pain
&category=BAKERY
&minPrice=500
&maxPrice=5000
&minDiscount=30
&city=Dakar
&latitude=14.6928
&longitude=-17.4467
&radius=10
&page=1
&limit=20
&sortBy=price
&sortOrder=asc
```

#### Paramètres disponibles

| Paramètre | Type | Description |
|-----------|------|-------------|
| `search` | string | Recherche textuelle |
| `category` | enum | Catégorie produit |
| `status` | enum | AVAILABLE, RESERVED, SOLD, EXPIRED |
| `supplierId` | uuid | ID du fournisseur |
| `minPrice` | number | Prix minimum XOF |
| `maxPrice` | number | Prix maximum XOF |
| `minDiscount` | number | Réduction minimum % (0-100) |
| `city` | string | Ville |
| `latitude` | number | Latitude (-90 à 90) |
| `longitude` | number | Longitude (-180 à 180) |
| `radius` | number | Rayon en km (1-100) |
| `expiresWithin` | number | Expire dans X heures (1-168) |
| `page` | number | Numéro de page |
| `limit` | number | Items par page (1-100) |
| `sortBy` | enum | price, discount, expiry, createdAt, distance |
| `sortOrder` | enum | asc, desc |

#### Catégories disponibles
- `FOOD_PREPARED` - Plats préparés
- `BAKERY` - Boulangerie
- `PASTRY` - Pâtisserie
- `GROCERIES` - Épicerie
- `FRUITS_VEGETABLES` - Fruits et légumes
- `MEAT_FISH` - Viande et poisson
- `DAIRY` - Produits laitiers
- `HOTEL_ROOM` - Chambres d'hôtel
- `SPA_WELLNESS` - Spa et bien-être
- `LEISURE` - Loisirs
- `TRANSPORT` - Transport
- `OTHER` - Autre

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "Pain complet Bio",
        "description": "Pain artisanal bio...",
        "category": "BAKERY",
        "originalPrice": 1500,
        "price": 1000,
        "discount": 33,
        "quantity": 10,
        "unit": "pièce",
        "status": "AVAILABLE",
        "expiresAt": "2024-01-16T18:00:00Z",
        "images": ["https://..."],
        "tags": ["bio", "artisanal"],
        "supplier": {
          "id": "uuid",
          "businessName": "Boulangerie Moderne",
          "city": "Dakar",
          "rating": 4.5
        },
        "distance": 2.3,
        "createdAt": "2024-01-15T08:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

### 2. Détails d'un produit

**`GET /products/:id`**

**Auth**: Non

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "uuid",
      "name": "Pain complet Bio",
      "description": "Pain artisanal bio fait maison avec farine complète...",
      "category": "BAKERY",
      "originalPrice": 1500,
      "price": 1000,
      "discount": 33,
      "quantity": 10,
      "unit": "pièce",
      "status": "AVAILABLE",
      "expiresAt": "2024-01-16T18:00:00Z",
      "images": ["https://cloudinary.com/..."],
      "tags": ["bio", "artisanal"],
      "pickupLocation": "123 Rue de Dakar",
      "pickupInstructions": "Sonnez à la porte principale",
      "supplier": {
        "id": "uuid",
        "businessName": "Boulangerie Moderne",
        "phoneNumber": "+221771234567",
        "address": "123 Rue de Dakar",
        "city": "Dakar",
        "rating": 4.5,
        "totalReviews": 120
      },
      "reviews": {
        "averageRating": 4.5,
        "totalReviews": 25,
        "distribution": {
          "5": 15,
          "4": 7,
          "3": 2,
          "2": 1,
          "1": 0
        }
      },
      "createdAt": "2024-01-15T08:00:00Z"
    }
  }
}
```

---

### 3. Produits expirant bientôt

**`GET /products/expiring-soon`**

**Auth**: Non

#### Query
```
?hours=24
```

---

### 4. Produits tendance

**`GET /products/trending`**

**Auth**: Non

#### Query
```
?limit=10
```

---

### 5. Créer un produit

**`POST /products`**

**Auth**: Oui | **Rôles**: SUPPLIER_FOOD, SUPPLIER_DEALS

#### Request
```json
{
  "name": "Pain complet Bio",
  "description": "Pain artisanal bio fait maison avec farine complète",
  "category": "BAKERY",
  "originalPrice": 1500,
  "price": 1000,
  "quantity": 10,
  "unit": "pièce",
  "expiresAt": "2024-01-16T18:00:00Z",
  "images": ["https://cloudinary.com/image1.jpg"],
  "tags": ["bio", "artisanal"],
  "pickupLocation": "123 Rue de Dakar",
  "pickupInstructions": "Sonnez à la porte principale"
}
```

#### Validation
- `name`: 3-200 caractères
- `description`: 10-2000 caractères (optionnel)
- `originalPrice`: > 0.01
- `price`: > 0.01 et < originalPrice
- `quantity`: >= 1
- `expiresAt`: Date future ISO 8601

#### Response Success (201)
```json
{
  "success": true,
  "message": "Produit créé avec succès",
  "data": {
    "product": {
      "id": "uuid",
      "name": "Pain complet Bio",
      "status": "PENDING_APPROVAL",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

---

### 6. Modifier un produit

**`PUT /products/:id`**

**Auth**: Oui | **Rôles**: SUPPLIER (propriétaire)

#### Request
```json
{
  "price": 800,
  "quantity": 15,
  "description": "Nouvelle description..."
}
```

---

### 7. Supprimer un produit

**`DELETE /products/:id`**

**Auth**: Oui | **Rôles**: SUPPLIER

---

### 8. Mettre à jour le stock

**`PATCH /products/:id/stock`**

**Auth**: Oui | **Rôles**: SUPPLIER

#### Request
```json
{
  "quantityChange": -5
}
```

---

### 9. Mes produits

**`GET /products/my-products`**

**Auth**: Oui | **Rôles**: SUPPLIER

#### Query
```
?status=AVAILABLE&category=BAKERY&page=1&limit=20
```

---

## 🛒 Commandes

### 1. Créer une commande

**`POST /orders`**

**Auth**: Oui | **Rôles**: CLIENT

#### Request
```json
{
  "items": [
    {
      "productId": "uuid",
      "quantity": 2
    }
  ],
  "deliveryAddress": "15 Rue des Almadies, Dakar",
  "deliveryCity": "Dakar",
  "deliveryPhone": "+221771234567",
  "deliveryMethod": "DELIVERY",
  "notes": "Livrer avant 18h SVP",
  "paymentProvider": "WAVE",
  "paymentPhoneNumber": "+221771234567"
}
```

#### Validation
- `items`: Au moins 1 produit
- `deliveryAddress`: 5-500 caractères
- `deliveryMethod`: "PICKUP" | "DELIVERY"
- `paymentProvider`: WAVE | ORANGE_MONEY | MTN_MONEY | MOOV_MONEY | STRIPE | PAYSTACK

#### Response Success (201)
```json
{
  "success": true,
  "message": "Commande créée avec succès",
  "data": {
    "order": {
      "id": "uuid",
      "orderNumber": "ORD-20240115-001",
      "status": "PENDING_PAYMENT",
      "items": [
        {
          "productId": "uuid",
          "productName": "Pain complet Bio",
          "quantity": 2,
          "unitPrice": 1000,
          "subtotal": 2000
        }
      ],
      "subtotal": 3500,
      "deliveryFee": 500,
      "total": 4000,
      "deliveryMethod": "DELIVERY",
      "createdAt": "2024-01-15T10:30:00Z"
    },
    "payment": {
      "transactionId": "txn_123456",
      "provider": "WAVE",
      "amount": 4000,
      "currency": "XOF",
      "status": "PENDING",
      "paymentUrl": "https://wave.com/pay/..."
    }
  }
}
```

#### Response Error (400)
```json
{
  "success": false,
  "message": "Stock insuffisant pour le produit Pain complet Bio",
  "code": "INSUFFICIENT_STOCK"
}
```

---

### 2. Détails d'une commande

**`GET /orders/:id`**

**Auth**: Oui

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "orderNumber": "ORD-20240115-001",
      "status": "DELIVERED",
      "items": [ /* items */ ],
      "subtotal": 3500,
      "deliveryFee": 500,
      "total": 4000,
      "client": {
        "firstName": "Adama",
        "phoneNumber": "+221771234567"
      },
      "supplier": {
        "businessName": "Boulangerie Moderne"
      },
      "payment": {
        "transactionId": "txn_123456",
        "provider": "WAVE",
        "status": "COMPLETED",
        "paidAt": "2024-01-15T10:35:00Z"
      },
      "timeline": [
        {
          "status": "PENDING_PAYMENT",
          "timestamp": "2024-01-15T10:30:00Z"
        },
        {
          "status": "PAID",
          "timestamp": "2024-01-15T10:35:00Z"
        },
        {
          "status": "DELIVERED",
          "timestamp": "2024-01-15T14:30:00Z"
        }
      ]
    }
  }
}
```

---

### 3. Mes commandes (Client)

**`GET /orders/my-orders`**

**Auth**: Oui | **Rôles**: CLIENT

#### Query
```
?status=DELIVERED&page=1&limit=20
```

---

### 4. Commandes reçues (Fournisseur)

**`GET /orders/supplier-orders`**

**Auth**: Oui | **Rôles**: SUPPLIER

---

### 5. Mettre à jour le statut

**`PATCH /orders/:id/status`**

**Auth**: Oui | **Rôles**: SUPPLIER

#### Request
```json
{
  "status": "PREPARING"
}
```

#### Transitions possibles
- PAID → PREPARING
- PREPARING → READY_FOR_PICKUP
- READY_FOR_PICKUP → IN_DELIVERY
- IN_DELIVERY → DELIVERED
- DELIVERED → COMPLETED

---

### 6. Annuler une commande

**`POST /orders/:id/cancel`**

**Auth**: Oui | **Rôles**: CLIENT

#### Request
```json
{
  "reason": "Je ne suis plus disponible"
}
```

---

### 7. Statistiques commandes (Client)

**`GET /orders/statistics`**

**Auth**: Oui | **Rôles**: CLIENT

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "totalOrders": 45,
    "totalSpent": 125000,
    "averageOrderValue": 2778,
    "statusBreakdown": {
      "COMPLETED": 40,
      "CANCELLED": 3,
      "IN_PROGRESS": 2
    }
  }
}
```

---

### 8. Statistiques fournisseur

**`GET /orders/supplier-statistics`**

**Auth**: Oui | **Rôles**: SUPPLIER

---

### 9. Statut paiement

**`GET /orders/payments/:transactionId/status`**

**Auth**: Oui

---

### 10. Fournisseurs de paiement

**`GET /orders/payments/providers`**

**Auth**: Non

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "providers": [
      {
        "slug": "wave",
        "name": "Wave",
        "type": "MOBILE_MONEY",
        "countries": ["SN", "CI", "ML", "BF"],
        "isActive": true,
        "logo": "https://...",
        "fees": {
          "percentage": 1,
          "fixed": 0
        }
      }
    ]
  }
}
```

---

## 💎 Deals

### 1. Rechercher des deals

**`GET /deals`**

**Auth**: Non

#### Query
```
?category=HOTEL_ROOM&city=Dakar&minDiscount=40
```

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Chambre Standard - 50% de réduction",
        "description": "Profitez de 50% de réduction...",
        "category": "HOTEL_ROOM",
        "originalPrice": 50000,
        "dealPrice": 25000,
        "discount": 50,
        "startDate": "2024-01-15T00:00:00Z",
        "endDate": "2024-01-31T23:59:59Z",
        "supplier": {
          "businessName": "Hôtel Teranga",
          "rating": 4.7
        },
        "status": "ACTIVE"
      }
    ]
  }
}
```

---

### 2. Détails d'un deal

**`GET /deals/:dealId`**

**Auth**: Non

---

### 3. Réserver un deal

**`POST /deals/:dealId/book`**

**Auth**: Oui

#### Request
```json
{
  "optionId": "uuid",
  "checkInDate": "2024-01-20T15:00:00Z",
  "checkOutDate": "2024-01-22T11:00:00Z",
  "numberOfGuests": 2,
  "specialRequests": "Chambre non-fumeur SVP",
  "paymentProvider": "WAVE",
  "paymentPhoneNumber": "+221771234567"
}
```

#### Response Success (201)
```json
{
  "success": true,
  "message": "Réservation créée avec succès",
  "data": {
    "booking": {
      "id": "uuid",
      "bookingNumber": "BOOK-20240115-001",
      "status": "PENDING_PAYMENT",
      "numberOfNights": 2,
      "pricePerNight": 25000,
      "totalPrice": 50000,
      "qrCode": "data:image/png;base64,..."
    },
    "payment": {
      "paymentUrl": "https://wave.com/pay/..."
    }
  }
}
```

---

### 4. Mes réservations

**`GET /deals/bookings/my-bookings`**

**Auth**: Oui

---

### 5. Annuler une réservation

**`POST /deals/bookings/:bookingId/cancel`**

**Auth**: Oui

---

### 6. Code QR de réservation

**`GET /deals/bookings/:bookingId/qr-code`**

**Auth**: Oui

---

### 7. Créer un deal (Fournisseur)

**`POST /supplier-deals`**

**Auth**: Oui | **Rôles**: SUPPLIER_DEALS

---

### 8. Mes deals (Fournisseur)

**`GET /supplier-deals`**

**Auth**: Oui | **Rôles**: SUPPLIER

---

### 9. Valider une réservation

**`POST /supplier-deals/bookings/validate`**

**Auth**: Oui | **Rôles**: SUPPLIER

#### Request
```json
{
  "bookingNumber": "BOOK-20240115-001"
}
```

---

## 🎁 Dons

### 1. Créer un don alimentaire

**`POST /donations/food`**

**Auth**: Oui | **Rôles**: SUPPLIER

#### Request
```json
{
  "items": [
    {
      "productId": "uuid",
      "quantity": 10
    }
  ],
  "pickupLocation": "123 Rue de Dakar",
  "pickupInstructions": "Entrée arrière du restaurant",
  "availableFrom": "2024-01-16T08:00:00Z",
  "availableUntil": "2024-01-16T18:00:00Z",
  "notes": "Pain de la veille encore consommable"
}
```

#### Response Success (201)
```json
{
  "success": true,
  "message": "Don créé avec succès",
  "data": {
    "donation": {
      "id": "uuid",
      "donationNumber": "DON-20240115-001",
      "type": "FOOD",
      "status": "PENDING_PICKUP",
      "totalEstimatedValue": 10000,
      "pickupLocation": "123 Rue de Dakar"
    }
  }
}
```

---

### 2. Créer un don financier

**`POST /donations/financial`**

**Auth**: Oui

#### Request
```json
{
  "amount": 10000,
  "associationId": "uuid",
  "message": "Pour aider les plus démunis",
  "isAnonymous": false,
  "paymentProvider": "WAVE",
  "paymentPhoneNumber": "+221771234567"
}
```

---

### 3. Mes dons

**`GET /donations/my-donations`**

**Auth**: Oui

#### Query
```
?type=FOOD&status=COMPLETED&page=1
```

---

### 4. Statistiques de mes dons

**`GET /donations/my-stats`**

**Auth**: Oui

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "totalDonations": 25,
    "totalFoodDonations": 15,
    "totalFinancialDonations": 10,
    "totalValueDonated": 250000,
    "impactStats": {
      "mealsSaved": 450,
      "co2Saved": 120,
      "peopleHelped": 200
    },
    "rewardPoints": 2500
  }
}
```

---

### 5. Annuler un don

**`POST /donations/:donationId/cancel`**

**Auth**: Oui

---

### 6. Générer reçu fiscal

**`POST /donations/:donationId/receipt`**

**Auth**: Oui

---

### 7. Planifier récupération (Association)

**`POST /donations/:donationId/schedule-pickup`**

**Auth**: Oui | **Rôles**: ASSOCIATION

#### Request
```json
{
  "pickupDate": "2024-01-16T10:00:00Z",
  "contactPerson": "Moussa Sow",
  "contactPhone": "+221771234567"
}
```

---

### 8. Confirmer récupération

**`POST /donations/:donationId/confirm-pickup`**

**Auth**: Oui | **Rôles**: ASSOCIATION

---

### 9. Dons disponibles (Association)

**`GET /associations/donations`**

**Auth**: Oui | **Rôles**: ASSOCIATION

---

## 🏪 Fournisseurs

### 1. Rechercher fournisseurs

**`GET /suppliers/search`**

**Auth**: Non

#### Query
```
?city=Dakar&category=BAKERY&page=1
```

---

### 2. Fournisseurs à proximité

**`GET /suppliers/nearby`**

**Auth**: Non

#### Query
```
?latitude=14.6928&longitude=-17.4467&radius=5
```

---

### 3. Profil fournisseur

**`GET /suppliers/:id`**

**Auth**: Non

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "supplier": {
      "id": "uuid",
      "businessName": "Boulangerie Moderne",
      "description": "Boulangerie artisanale depuis 1995...",
      "category": "BAKERY",
      "address": "123 Rue de Dakar",
      "city": "Dakar",
      "phoneNumber": "+221771234567",
      "rating": 4.5,
      "totalReviews": 120,
      "isVerified": true,
      "profileImage": "https://...",
      "location": {
        "latitude": 14.6928,
        "longitude": -17.4467
      },
      "subscription": {
        "tier": "PRO",
        "expiresAt": "2024-12-31T23:59:59Z"
      },
      "stats": {
        "totalProducts": 45,
        "activeProducts": 25,
        "totalOrders": 234,
        "completionRate": 95.5
      }
    }
  }
}
```

---

### 4. Créer profil fournisseur

**`POST /suppliers/profile`**

**Auth**: Oui | **Rôles**: SUPPLIER

#### Request
```json
{
  "businessName": "Boulangerie Moderne",
  "description": "Boulangerie artisanale...",
  "category": "BAKERY",
  "address": "123 Rue de Dakar",
  "city": "Dakar",
  "phoneNumber": "+221771234567",
  "businessRegistrationNumber": "SN123456789",
  "latitude": 14.6928,
  "longitude": -17.4467
}
```

---

### 5. Mon profil fournisseur

**`GET /suppliers/profile`**

**Auth**: Oui | **Rôles**: SUPPLIER

---

### 6. Mettre à jour profil

**`PUT /suppliers/profile`**

**Auth**: Oui | **Rôles**: SUPPLIER

---

### 7. Rechercher magasins

**`GET /stores`**

**Auth**: Non

---

### 8. Mes magasins

**`GET /supplier-stores`**

**Auth**: Oui | **Rôles**: SUPPLIER

---

### 9. Créer un magasin

**`POST /supplier-stores`**

**Auth**: Oui | **Rôles**: SUPPLIER

#### Request
```json
{
  "name": "Boulangerie Moderne - Plateau",
  "address": "123 Rue de Dakar",
  "city": "Dakar",
  "phoneNumber": "+221771234567",
  "latitude": 14.6928,
  "longitude": -17.4467,
  "isPrimary": true
}
```

---

## 💳 Abonnements

### 1. Plans d'abonnement

**`GET /subscriptions/plans`**

**Auth**: Non

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "plans": [
      {
        "id": "uuid",
        "name": "BASIC",
        "displayName": "Basique",
        "price": 0,
        "billingPeriod": "MONTHLY",
        "features": {
          "maxProducts": 10,
          "maxStores": 1,
          "analytics": false
        }
      },
      {
        "name": "PRO",
        "price": 15000,
        "features": {
          "maxProducts": -1,
          "maxStores": 3,
          "analytics": true,
          "prioritySupport": true
        }
      },
      {
        "name": "PREMIUM",
        "price": 35000,
        "features": {
          "maxProducts": -1,
          "maxStores": -1,
          "analytics": true,
          "sponsoredListings": true
        }
      }
    ]
  }
}
```

---

### 2. S'abonner

**`POST /subscriptions/subscribe`**

**Auth**: Oui | **Rôles**: SUPPLIER

#### Request
```json
{
  "planId": "uuid",
  "billingPeriod": "MONTHLY",
  "paymentProvider": "WAVE",
  "paymentPhoneNumber": "+221771234567",
  "promoCode": "LAUNCH2024"
}
```

---

### 3. Annuler abonnement

**`POST /subscriptions/cancel`**

**Auth**: Oui | **Rôles**: SUPPLIER

---

### 4. Limites d'abonnement

**`GET /subscriptions/limits`**

**Auth**: Oui | **Rôles**: SUPPLIER

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "plan": "PRO",
    "limits": {
      "maxProducts": -1,
      "currentProducts": 45,
      "maxStores": 3,
      "currentStores": 2
    },
    "subscription": {
      "status": "ACTIVE",
      "expiresAt": "2024-02-15T23:59:59Z",
      "daysRemaining": 15
    }
  }
}
```

---

### 5. Valider code promo

**`POST /subscriptions/promo-codes/validate`**

**Auth**: Oui | **Rôles**: SUPPLIER

#### Request
```json
{
  "code": "LAUNCH2024",
  "planId": "uuid"
}
```

---

## ⭐ Avis

### 1. Avis d'un produit

**`GET /reviews/product/:productId`**

**Auth**: Non

#### Query
```
?page=1&limit=20&sortBy=recent
```

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "rating": 5,
        "comment": "Excellent pain, très frais!",
        "user": {
          "firstName": "Adama",
          "profileImage": "https://..."
        },
        "helpful": 12,
        "verified": true,
        "createdAt": "2024-01-14T10:00:00Z"
      }
    ],
    "summary": {
      "averageRating": 4.5,
      "totalReviews": 45,
      "distribution": {
        "5": 25,
        "4": 15,
        "3": 3,
        "2": 1,
        "1": 1
      }
    }
  }
}
```

---

### 2. Avis d'un fournisseur

**`GET /reviews/supplier/:supplierId`**

**Auth**: Non

---

### 3. Avis d'un deal

**`GET /reviews/deal/:dealId`**

**Auth**: Non

---

### 4. Créer un avis

**`POST /reviews`**

**Auth**: Oui

#### Request
```json
{
  "targetType": "PRODUCT",
  "targetId": "uuid",
  "rating": 5,
  "comment": "Excellent produit, très frais!",
  "orderId": "uuid"
}
```

#### Validation
- `targetType`: "PRODUCT" | "SUPPLIER" | "DEAL"
- `rating`: 1-5
- `comment`: 10-1000 caractères (optionnel)

---

### 5. Mes avis

**`GET /reviews/my`**

**Auth**: Oui

---

### 6. Modifier un avis

**`PUT /reviews/:id`**

**Auth**: Oui

---

### 7. Supprimer un avis

**`DELETE /reviews/:id`**

**Auth**: Oui

---

### 8. Marquer comme utile

**`POST /reviews/:id/helpful`**

**Auth**: Oui

---

### 9. Signaler un avis

**`POST /reviews/:id/report`**

**Auth**: Oui

#### Request
```json
{
  "reason": "SPAM",
  "details": "Avis manifestement faux"
}
```

#### Raisons: SPAM | OFFENSIVE | FAKE | INAPPROPRIATE | OTHER

---

## 🔔 Notifications

### 1. Enregistrer token FCM

**`POST /notifications/device-token`**

**Auth**: Oui

#### Request
```json
{
  "token": "fcm_token_here",
  "platform": "android",
  "deviceId": "device_id"
}
```

---

### 2. Mes notifications

**`GET /notifications`**

**Auth**: Oui

#### Query
```
?isRead=false&page=1&limit=20
```

---

### 3. Nombre non lues

**`GET /notifications/unread-count`**

**Auth**: Oui

---

### 4. Marquer comme lue

**`PATCH /notifications/:id/read`**

**Auth**: Oui

---

### 5. Tout marquer comme lu

**`PATCH /notifications/read-all`**

**Auth**: Oui

---

### 6. Préférences notifications

**`GET /notifications/preferences`**

**Auth**: Oui

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "preferences": {
      "orderUpdates": true,
      "promotions": false,
      "newProducts": true,
      "donations": true,
      "emailNotifications": true,
      "pushNotifications": true
    }
  }
}
```

---

### 7. Mettre à jour préférences

**`PATCH /notifications/preferences`**

**Auth**: Oui

---

## 🎖️ Récompenses

### 1. Paliers de récompense

**`GET /rewards/tiers`**

**Auth**: Non

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "tiers": [
      {
        "name": "BRONZE",
        "minPoints": 0,
        "maxPoints": 999,
        "benefits": {
          "discountPercentage": 5,
          "prioritySupport": false
        }
      },
      {
        "name": "SILVER",
        "minPoints": 1000,
        "maxPoints": 4999,
        "benefits": {
          "discountPercentage": 10,
          "prioritySupport": true
        }
      },
      {
        "name": "GOLD",
        "minPoints": 5000,
        "benefits": {
          "discountPercentage": 15,
          "freeDelivery": true,
          "exclusiveDeals": true
        }
      }
    ]
  }
}
```

---

### 2. Mes récompenses

**`GET /rewards/me`**

**Auth**: Oui

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "currentPoints": 2450,
    "lifetimePoints": 3200,
    "tier": "SILVER",
    "nextTier": "GOLD",
    "pointsToNextTier": 2550,
    "benefits": {
      "discountPercentage": 10,
      "prioritySupport": true
    }
  }
}
```

---

### 3. Historique des points

**`GET /rewards/transactions`**

**Auth**: Oui

---

### 4. Échanger des points

**`POST /rewards/redeem`**

**Auth**: Oui

#### Request
```json
{
  "points": 500,
  "rewardType": "DISCOUNT_VOUCHER"
}
```

---

### 5. Points journaliers

**`POST /rewards/daily-login`**

**Auth**: Oui

---

### 6. Créer code de parrainage

**`POST /referrals/code`**

**Auth**: Oui

#### Request
```json
{
  "customCode": "ADAMA2024"
}
```

---

### 7. Valider code de parrainage

**`GET /referrals/validate/:code`**

**Auth**: Non

---

### 8. Utiliser code de parrainage

**`POST /referrals/use`**

**Auth**: Oui

---

### 9. Statistiques de parrainage

**`GET /referrals/stats`**

**Auth**: Oui

---

## 👨‍💼 Administration

### 1. Tableau de bord

**`GET /admin/dashboard/stats`**

**Auth**: Oui | **Rôles**: ADMIN

#### Response Success (200)
```json
{
  "success": true,
  "data": {
    "users": {
      "total": 15000,
      "newThisMonth": 450,
      "byRole": {
        "CLIENT": 12000,
        "SUPPLIER": 2500
      }
    },
    "orders": {
      "total": 45000,
      "thisMonth": 3500,
      "totalRevenue": 125000000
    },
    "products": {
      "total": 5600,
      "active": 3200,
      "pendingApproval": 45
    }
  }
}
```

---

### 2. Gérer utilisateurs

**`GET /admin/users`**

**Auth**: Oui | **Rôles**: ADMIN

---

### 3. Mettre à jour statut utilisateur

**`PATCH /admin/users/:id/status`**

**Auth**: Oui | **Rôles**: ADMIN

#### Request
```json
{
  "status": "SUSPENDED",
  "reason": "Violation des CGU"
}
```

---

### 4. Changer rôle utilisateur

**`PATCH /admin/users/:id/role`**

**Auth**: Oui | **Rôles**: ADMIN

---

### 5. Vérifier fournisseur

**`PATCH /admin/suppliers/:id/verify`**

**Auth**: Oui | **Rôles**: ADMIN

---

### 6. Modération produits

**`GET /admin/products/moderation`**

**Auth**: Oui | **Rôles**: ADMIN

---

### 7. Approuver produit

**`PATCH /admin/products/:id/approve`**

**Auth**: Oui | **Rôles**: ADMIN

---

### 8. Rejeter produit

**`PATCH /admin/products/:id/reject`**

**Auth**: Oui | **Rôles**: ADMIN

---

### 9. Avis signalés

**`GET /admin/reviews/reported`**

**Auth**: Oui | **Rôles**: ADMIN

---

### 10. Rapport financier

**`GET /admin/reports/financial`**

**Auth**: Oui | **Rôles**: ADMIN

---

### 11. Gérer paiements escrow

**`GET /admin/payments/escrow`**

**Auth**: Oui | **Rôles**: ADMIN

---

### 12. Libérer fonds

**`POST /admin/payments/escrow/:orderId/release`**

**Auth**: Oui | **Rôles**: ADMIN

---

### 13. Paramètres plateforme

**`GET /admin/settings`**

**Auth**: Oui | **Rôles**: ADMIN

---

### 14. KYC en attente

**`GET /admin/kyc/pending`**

**Auth**: Oui | **Rôles**: ADMIN

---

### 15. Réviser KYC

**`POST /admin/kyc/attempts/:attemptId/review`**

**Auth**: Oui | **Rôles**: ADMIN

---

## 📊 Modules complémentaires

### Associations
- `GET /associations` - Rechercher associations
- `POST /associations/register` - Inscription
- `GET /associations/me` - Mon profil
- `POST /associations/me/reports` - Créer rapport

### KYC
- `POST /kyc/submit` - Soumettre documents
- `GET /kyc/status` - Statut KYC

### Galerie média
- `POST /media-gallery/upload` - Upload média
- `GET /media-gallery/gallery/:entityType/:entityId` - Galerie
- `PATCH /media-gallery/:id/set-primary` - Média principal

### Points de vente
- `GET /pos/search` - Rechercher POS
- `POST /pos` - Créer POS
- `GET /pos/my` - Mes POS

### Équipe
- `POST /team-members` - Inviter membre
- `GET /team-members` - Mes membres
- `POST /team-members/accept-invitation` - Accepter

### Horaires magasin
- `GET /store-hours/:storeId` - Horaires
- `GET /store-hours/:storeId/is-open` - Ouvert maintenant?
- `POST /store-hours` - Créer horaires

### Carte
- `GET /map/markers` - Marqueurs carte

### Lieux sauvegardés
- `GET /saved-locations` - Mes lieux
- `POST /saved-locations` - Ajouter lieu
- `PATCH /saved-locations/:id/set-default` - Définir par défaut

### Mouvements de stock
- `POST /supplier/stock-movements` - Enregistrer mouvement
- `GET /supplier/stock-movements/products/:productId` - Historique

---

## 📝 Énumérations

### UserRole
```typescript
CLIENT | SUPPLIER_FOOD | SUPPLIER_DEALS | ASSOCIATION | ADVERTISER | ADMIN | SUPER_ADMIN
```

### ProductCategory
```typescript
FOOD_PREPARED | BAKERY | PASTRY | GROCERIES | FRUITS_VEGETABLES | MEAT_FISH | DAIRY |
HOTEL_ROOM | SPA_WELLNESS | LEISURE | TRANSPORT | OTHER
```

### OrderStatus
```typescript
PENDING_PAYMENT | PAID | PREPARING | READY_FOR_PICKUP | IN_DELIVERY |
DELIVERED | COMPLETED | CANCELLED | REFUNDED
```

### PaymentProvider
```typescript
WAVE | ORANGE_MONEY | MTN_MONEY | MOOV_MONEY | STRIPE | PAYSTACK
```

---

## 🚦 Rate Limiting

| Type | Limite | Fenêtre |
|------|--------|---------|
| Auth | 5 req | 15 min |
| Standard | 100 req | 15 min |
| API | 1000 req | 1 heure |

---

## 📤 Uploads

### Limites
- Taille max: 10 MB
- Images: JPG, JPEG, PNG, WEBP
- Vidéos: MP4, MOV
- Documents: PDF

---

## 🔗 Exemples de flux

### Flux Client: Inscription → Commande

```bash
# 1. Inscription
POST /auth/register
{
  "phoneNumber": "+221771234567",
  "firstName": "Adama",
  "password": "MyP@ssw0rd123"
}

# 2. Vérifier OTP
POST /auth/verify-otp
{
  "phoneNumber": "+221771234567",
  "code": "123456",
  "purpose": "registration"
}

# 3. Rechercher produits
GET /products/search?city=Dakar&category=BAKERY

# 4. Créer commande
POST /orders
{
  "items": [{"productId": "uuid", "quantity": 2}],
  "deliveryAddress": "...",
  "paymentProvider": "WAVE"
}

# 5. Laisser avis
POST /reviews
{
  "targetType": "PRODUCT",
  "targetId": "uuid",
  "rating": 5
}
```

### Flux Fournisseur: Profil → Produit

```bash
# 1. Login
POST /auth/login

# 2. Créer profil
POST /suppliers/profile
{
  "businessName": "Boulangerie Moderne",
  "category": "BAKERY"
}

# 3. S'abonner
POST /subscriptions/subscribe
{
  "planId": "uuid-pro",
  "paymentProvider": "WAVE"
}

# 4. Créer produit
POST /products
{
  "name": "Pain Bio",
  "price": 1000,
  "originalPrice": 1500
}

# 5. Gérer commandes
GET /orders/supplier-orders
PATCH /orders/:id/status
```

---

## 💡 Bonnes pratiques

### Gestion des erreurs
```javascript
try {
  const res = await fetch('/api/v1/products/search');
  const data = await res.json();

  if (!data.success) {
    if (data.code === 'UNAUTHORIZED') {
      // Redirect to login
    }
  }
} catch (error) {
  console.error('Network error:', error);
}
```

### Refresh token automatique
```javascript
async function refreshToken() {
  const refresh = localStorage.getItem('refreshToken');
  const res = await fetch('/api/v1/auth/refresh-token', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: refresh })
  });
  const data = await res.json();
  localStorage.setItem('accessToken', data.data.accessToken);
}
```

---

## 📞 Support

- **Documentation**: https://doc.yapasgachis.com
- **Email**: support@yapasgachis.com
- **Status**: https://status.yapasgachis.com

---

**Version API**: 1.0.0
**Dernière mise à jour**: Janvier 2024
**370+ endpoints disponibles**
