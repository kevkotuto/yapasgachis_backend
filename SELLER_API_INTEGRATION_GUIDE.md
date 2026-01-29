# Guide d'Intégration API - Section Seller Frontend

> 📱 Guide rapide pour intégrer les endpoints backend dans l'application Seller (Expo/React Native)

**Date**: 2026-01-29
**Backend**: YapaGachis API v1
**Base URL**: `https://api.yapasgachis.com/api/v1`

---

## 🚀 Quick Start

Toutes les routes sont **DÉJÀ IMPLÉMENTÉES** et prêtes à l'emploi. Aucune attente backend nécessaire.

### Headers Requis

```typescript
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json',
  // Pour upload multipart:
  // 'Content-Type': 'multipart/form-data'
};
```

### Gestion d'Erreurs

```typescript
interface ErrorResponse {
  success: false;
  message: string;
  code?: string;
  errors?: any[];
}

interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

---

## 📋 APIs par Catégorie

### 1. Staff Management (Gestion d'Équipe)

**Base**: `/api/v1/staff`

#### 1.1 Lister mes magasins où je suis staff

```typescript
GET /staff/my-stores

Response:
{
  "success": true,
  "data": [
    {
      "id": "store-uuid",
      "store": {
        "id": "store-uuid",
        "name": "Boulangerie centrale",
        "address": "123 Rue de la Paix",
        "city": "Abidjan"
      },
      "role": "MANAGER",
      "permissions": {
        "canManageProducts": true,
        "canManageOrders": true,
        "canViewStats": true,
        "canManageStaff": false,
        "canManageDeals": true,
        "canManageSettings": false
      },
      "isActive": true,
      "inviteStatus": "ACCEPTED"
    }
  ]
}
```

#### 1.2 Lister mes invitations en attente

```typescript
GET /staff/invitations

Response:
{
  "success": true,
  "data": [
    {
      "id": "invitation-uuid",
      "store": {
        "id": "store-uuid",
        "name": "Restaurant Le Gourmet"
      },
      "invitedBy": {
        "firstName": "Jean",
        "lastName": "Dupont"
      },
      "role": "CASHIER",
      "invitedAt": "2024-01-15T10:00:00Z",
      "inviteExpiresAt": "2024-01-22T10:00:00Z",
      "inviteToken": "abc123xyz"
    }
  ]
}
```

#### 1.3 Accepter une invitation

```typescript
POST /staff/invitations/:token/accept

Request: (aucun body nécessaire)

Response:
{
  "success": true,
  "message": "Invitation acceptée avec succès",
  "data": {
    "id": "staff-uuid",
    "storeId": "store-uuid",
    "role": "CASHIER",
    "permissions": {...}
  }
}
```

#### 1.4 Refuser une invitation

```typescript
POST /staff/invitations/:token/reject

Request: (aucun body nécessaire)

Response:
{
  "success": true,
  "message": "Invitation refusée"
}
```

#### 1.5 Inviter un membre dans mon magasin

```typescript
POST /staff/stores/:storeId/invite

Request:
{
  "userId": "user-uuid",  // OU "email" si user n'existe pas
  "email": "john@example.com",
  "role": "MANAGER",
  "permissions": {
    "canManageProducts": true,
    "canManageOrders": true,
    "canViewStats": true,
    "canManageStaff": false,
    "canManageDeals": true,
    "canManageSettings": false
  }
}

Response:
{
  "success": true,
  "message": "Invitation envoyée avec succès",
  "data": {
    "id": "staff-uuid",
    "inviteToken": "xyz789abc",
    "inviteExpiresAt": "2024-01-29T10:00:00Z"
  }
}
```

**Roles disponibles:**
- `MANAGER` - Gestionnaire (toutes permissions sauf settings)
- `CASHIER` - Caissier (gestion commandes uniquement)
- `INVENTORY` - Gestionnaire stock (produits et stock)
- `DELIVERY` - Livreur (commandes delivery uniquement)
- `CUSTOMER_SERVICE` - Service client
- `STAFF` - Employé générique

#### 1.6 Lister le personnel d'un magasin

```typescript
GET /staff/stores/:storeId
Query params: ?page=1&limit=20&role=MANAGER&isActive=true

Response:
{
  "success": true,
  "data": [
    {
      "id": "staff-uuid",
      "user": {
        "id": "user-uuid",
        "firstName": "Marie",
        "lastName": "Diallo",
        "email": "marie@example.com",
        "avatar": "https://..."
      },
      "role": "MANAGER",
      "permissions": {...},
      "isActive": true,
      "inviteStatus": "ACCEPTED",
      "acceptedAt": "2024-01-10T14:30:00Z",
      "lastActiveAt": "2024-01-28T09:15:00Z"
    }
  ],
  "pagination": {
    "total": 8,
    "page": 1,
    "limit": 20,
    "totalPages": 1
  }
}
```

#### 1.7 Récupérer mon rôle sur un magasin

```typescript
GET /staff/stores/:storeId/my-role

Response:
{
  "success": true,
  "data": {
    "role": "MANAGER",
    "permissions": {
      "canManageProducts": true,
      "canManageOrders": true,
      "canViewStats": true,
      "canManageStaff": false,
      "canManageDeals": true,
      "canManageSettings": false
    },
    "isActive": true
  }
}
```

#### 1.8 Modifier un membre du personnel

```typescript
PATCH /staff/stores/:storeId/members/:userId

Request:
{
  "role": "CASHIER",
  "permissions": {
    "canManageProducts": false,
    "canManageOrders": true,
    "canViewStats": false,
    "canManageStaff": false,
    "canManageDeals": false,
    "canManageSettings": false
  },
  "notes": "Affecté au service caisse"
}

Response:
{
  "success": true,
  "message": "Membre mis à jour avec succès",
  "data": {
    "id": "staff-uuid",
    "role": "CASHIER",
    "permissions": {...}
  }
}
```

#### 1.9 Supprimer un membre du personnel

```typescript
DELETE /staff/stores/:storeId/members/:userId

Response:
{
  "success": true,
  "message": "Membre supprimé avec succès"
}
```

---

### 2. Stock Movements (Mouvements de Stock)

**Base**: `/api/v1/supplier/stock-movements`

#### 2.1 Créer un mouvement de stock

```typescript
POST /supplier/stock-movements

Request:
{
  "productId": "product-uuid",
  "type": "ADJUSTMENT",  // IN, OUT, ADJUSTMENT, WASTE, RETURN
  "quantity": -5,  // Négatif pour sortie, positif pour entrée
  "reason": "EXPIRATION",  // SALE, EXPIRATION, DAMAGED, STOLEN, RESTOCK, etc.
  "notes": "5 produits expirés retirés du stock",
  "storeId": "store-uuid"  // optionnel
}

Response:
{
  "success": true,
  "message": "Mouvement de stock enregistré",
  "data": {
    "id": "movement-uuid",
    "productId": "product-uuid",
    "type": "ADJUSTMENT",
    "quantity": -5,
    "previousStock": 15,
    "newStock": 10,
    "reason": "EXPIRATION",
    "createdAt": "2024-01-28T14:30:00Z"
  }
}
```

**Types de mouvement:**
- `IN` - Entrée stock (réapprovisionnement)
- `OUT` - Sortie stock (vente)
- `ADJUSTMENT` - Ajustement manuel
- `WASTE` - Perte (expiration, casse)
- `RETURN` - Retour client

**Raisons courantes:**
- `SALE` - Vente (automatique)
- `EXPIRATION` - Produit expiré
- `DAMAGED` - Produit endommagé
- `STOLEN` - Vol
- `RESTOCK` - Réapprovisionnement
- `INVENTORY` - Inventaire physique
- `RETURN` - Retour client

#### 2.2 Lister les mouvements de stock

```typescript
GET /supplier/stock-movements
Query params:
  ?productId=product-uuid
  &storeId=store-uuid
  &type=OUT
  &startDate=2024-01-01
  &endDate=2024-01-31
  &page=1
  &limit=20

Response:
{
  "success": true,
  "data": [
    {
      "id": "movement-uuid",
      "product": {
        "id": "product-uuid",
        "title": "Pain au chocolat",
        "images": ["https://..."]
      },
      "type": "OUT",
      "quantity": -3,
      "previousStock": 15,
      "newStock": 12,
      "reason": "SALE",
      "orderId": "order-uuid",
      "performedBy": {
        "firstName": "Jean",
        "lastName": "Dupont"
      },
      "createdAt": "2024-01-28T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

#### 2.3 Historique stock d'un produit

```typescript
GET /supplier/stock-movements/products/:productId
Query params: ?page=1&limit=50&startDate=2024-01-01

Response:
{
  "success": true,
  "data": [
    {
      "id": "movement-uuid",
      "type": "IN",
      "quantity": 20,
      "previousStock": 5,
      "newStock": 25,
      "reason": "RESTOCK",
      "createdAt": "2024-01-28T08:00:00Z"
    },
    {
      "id": "movement-uuid-2",
      "type": "OUT",
      "quantity": -2,
      "previousStock": 25,
      "newStock": 23,
      "reason": "SALE",
      "orderId": "order-uuid",
      "createdAt": "2024-01-28T09:15:00Z"
    }
  ]
}
```

#### 2.4 Mouvements de stock d'un magasin

```typescript
GET /supplier/stock-movements/stores/:storeId
Query params: ?page=1&limit=20&type=WASTE

Response: (même format que 2.2)
```

---

### 3. Review Response (Réponses aux Avis)

**Base**: `/api/v1/reviews`

#### 3.1 Répondre à un avis client

```typescript
POST /reviews/:id/response

Request:
{
  "response": "Merci pour votre retour ! Nous sommes ravis que vous ayez apprécié nos produits."
}

Response:
{
  "success": true,
  "message": "Réponse ajoutée avec succès",
  "data": {
    "id": "review-uuid",
    "rating": 5,
    "comment": "Excellent produit !",
    "user": {
      "firstName": "Marie",
      "lastName": "K."
    },
    "supplierResponse": "Merci pour votre retour !...",
    "supplierRespondedAt": "2024-01-28T15:45:00Z",
    "supplierRespondedBy": "supplier-user-uuid"
  }
}
```

**Contraintes:**
- Max 1000 caractères
- Seul le supplier propriétaire peut répondre
- Une seule réponse par avis (modifier avec PUT si nécessaire)

#### 3.2 Modifier une réponse

```typescript
PUT /reviews/:id/response

Request:
{
  "response": "Merci beaucoup pour votre excellent retour !"
}

Response:
{
  "success": true,
  "message": "Réponse modifiée avec succès",
  "data": {...}
}
```

#### 3.3 Supprimer une réponse

```typescript
DELETE /reviews/:id/response

Response:
{
  "success": true,
  "message": "Réponse supprimée"
}
```

#### 3.4 Récupérer les avis de mes produits

```typescript
GET /reviews/product/:productId
Query params: ?page=1&limit=20&rating=5

Response:
{
  "success": true,
  "data": [
    {
      "id": "review-uuid",
      "user": {
        "firstName": "Marie",
        "lastName": "K.",
        "avatar": "https://..."
      },
      "rating": 5,
      "comment": "Excellent produit, très frais !",
      "images": ["https://..."],
      "isVerified": true,
      "helpful": 12,
      "supplierResponse": "Merci Marie !...",
      "supplierRespondedAt": "2024-01-28T15:00:00Z",
      "createdAt": "2024-01-27T14:30:00Z"
    }
  ],
  "pagination": {...},
  "stats": {
    "averageRating": 4.7,
    "totalReviews": 156,
    "ratingDistribution": {
      "5": 120,
      "4": 25,
      "3": 8,
      "2": 2,
      "1": 1
    }
  }
}
```

---

### 4. KYC Upload (Documents d'Identité)

**Base**: `/api/v1/suppliers`

#### 4.1 Upload documents KYC

```typescript
PUT /suppliers/profile
Content-Type: multipart/form-data

FormData:
{
  // Fichiers
  idCardFront: File,  // Photo recto carte d'identité
  idCardBack: File,   // Photo verso carte d'identité
  selfie: File,       // Photo selfie

  // Données JSON (stringified)
  kycData: JSON.stringify({
    idCardType: "CNI",  // CNI, PASSPORT, RESIDENCE_PERMIT
    idCardNumber: "CI20240001234",
    idCardExpiry: "2030-12-31"
  })
}

Response:
{
  "success": true,
  "message": "Documents KYC soumis avec succès",
  "data": {
    "kycStatus": "SUBMITTED",  // PENDING → SUBMITTED
    "idCardFront": "https://cloudinary.com/...",
    "idCardBack": "https://cloudinary.com/...",
    "selfie": "https://cloudinary.com/...",
    "idCardType": "CNI",
    "idCardNumber": "CI20240001234",
    "idCardExpiry": "2030-12-31T00:00:00Z"
  }
}
```

**KYC Status Flow:**
- `PENDING` - En attente soumission
- `SUBMITTED` - Documents soumis (en cours de vérification)
- `VERIFIED` - Vérifié par admin
- `REJECTED` - Rejeté (documents invalides)

**Formats acceptés:**
- JPEG, JPG, PNG, WebP, GIF
- Max 5MB par fichier
- 3 fichiers maximum

**React Native Exemple:**

```typescript
import * as ImagePicker from 'expo-image-picker';

const uploadKYC = async () => {
  const formData = new FormData();

  // Ajouter les images
  formData.append('idCardFront', {
    uri: idCardFrontUri,
    type: 'image/jpeg',
    name: 'id-front.jpg',
  } as any);

  formData.append('idCardBack', {
    uri: idCardBackUri,
    type: 'image/jpeg',
    name: 'id-back.jpg',
  } as any);

  formData.append('selfie', {
    uri: selfieUri,
    type: 'image/jpeg',
    name: 'selfie.jpg',
  } as any);

  // Ajouter les données
  formData.append('kycData', JSON.stringify({
    idCardType: 'CNI',
    idCardNumber: 'CI20240001234',
    idCardExpiry: '2030-12-31'
  }));

  const response = await fetch(`${API_URL}/suppliers/profile`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      // NE PAS mettre Content-Type, FormData le fait auto
    },
    body: formData,
  });

  return response.json();
};
```

---

### 5. Product Toggle Status

**Base**: `/api/v1/products`

#### 5.1 Toggle statut produit (ACTIVE ↔ DRAFT)

```typescript
PATCH /products/:id/toggle-status

Request: (aucun body nécessaire)

Response:
{
  "success": true,
  "message": "Statut du produit mis à jour",
  "data": {
    "id": "product-uuid",
    "status": "ACTIVE",  // ou "DRAFT"
    "title": "Pain au chocolat",
    "originalPrice": 500,
    "discountedPrice": 350,
    "quantity": 15
  }
}
```

**Product Status:**
- `DRAFT` - Brouillon (non visible par clients)
- `ACTIVE` - Actif (visible et achetable)
- `SOLD_OUT` - Épuisé (auto quand quantity = 0)
- `EXPIRED` - Expiré (auto quand expiryDate passée)

---

## 📊 Routes Supplémentaires Utiles

### Products

```typescript
// Mes produits
GET /products/my-products
  ?page=1&limit=20&status=ACTIVE&category=FOOD&storeId=store-uuid

// Créer produit
POST /products
{
  "title": "Pain au chocolat",
  "description": "Délicieux pain au chocolat artisanal",
  "category": "FOOD",
  "originalPrice": 500,
  "discountedPrice": 350,
  "quantity": 20,
  "expiryDate": "2024-02-01T18:00:00Z",
  "images": ["https://..."],
  "storeId": "store-uuid",
  "deliveryAvailable": true
}

// Modifier produit
PUT /products/:id
{ ...mêmes champs que POST }

// Supprimer produit
DELETE /products/:id

// Update stock
PATCH /products/:id/stock
{ "quantity": 15 }

// Upload images
POST /products/:id/images
FormData: { images: [File, File, ...] }

// Supprimer image
DELETE /products/:id/images
{ "imageUrl": "https://cloudinary.com/..." }
```

### Orders

```typescript
// Mes commandes
GET /orders/supplier-orders
  ?page=1&limit=20&status=PENDING&storeId=store-uuid&startDate=2024-01-01

// Accepter commande
POST /orders/:id/accept
{ "preparationTime": 15 }  // minutes

// Rejeter commande
POST /orders/:id/reject
{ "reason": "Stock insuffisant" }

// Marquer prêt
POST /orders/:id/ready

// Compléter commande
POST /orders/:id/complete

// Update statut
PATCH /orders/:id/status
{ "status": "PREPARING" }
```

### Stores

```typescript
// Mes magasins
GET /supplier/stores

// Créer magasin
POST /supplier/stores
{
  "name": "Boulangerie Centrale",
  "address": "123 Rue de la Paix",
  "city": "Abidjan",
  "commune": "Cocody",
  "phoneNumber": "+225070000000",
  "operatingHours": {
    "monday": { "open": "08:00", "close": "20:00", "closed": false },
    "tuesday": { "open": "08:00", "close": "20:00", "closed": false },
    ...
    "sunday": { "closed": true }
  },
  "deliveryEnabled": true,
  "pickupEnabled": true,
  "deliveryRadius": 5.0
}

// Stats magasin
GET /supplier/stores/:storeId/statistics

// Fermeture temporaire
POST /supplier/stores/:storeId/temporary-closure
{
  "isClosed": true,
  "reason": "Congés annuels",
  "closedUntil": "2024-02-15"
}

// Toggle actif/inactif
POST /supplier/stores/:storeId/toggle-active
```

### Wallet & Payout

```typescript
// Solde wallet
GET /supplier/wallet

// Transactions
GET /supplier/transactions
  ?page=1&limit=20&type=CREDIT&startDate=2024-01-01

// Demander retrait
POST /supplier/payout
{
  "amount": 50000,
  "payoutProviderId": "provider-uuid",
  "payoutMethod": "MOBILE_MONEY",
  "phoneNumber": "+225070000000"
}

// Historique retraits
GET /supplier/payouts
  ?page=1&limit=20&status=PENDING
```

---

## 🔐 Authentication & Roles

### Token Refresh

```typescript
POST /auth/refresh
{
  "refreshToken": "refresh-token-here"
}

Response:
{
  "success": true,
  "data": {
    "accessToken": "new-access-token",
    "refreshToken": "new-refresh-token",
    "expiresIn": 900  // 15 minutes
  }
}
```

### User Roles

- `SUPPLIER_FOOD` - Supplier alimentaire
- `SUPPLIER_DEALS` - Supplier deals/hébergements
- `CLIENT` - Client
- `ADMIN` - Administrateur

---

## 📝 Pagination Standard

Toutes les routes GET avec liste supportent :

```typescript
Query params:
  ?page=1         // Numéro de page (défaut: 1)
  &limit=20       // Items par page (défaut: 20, max: 100)
  &sortBy=createdAt  // Champ de tri
  &sortOrder=desc // asc ou desc

Response:
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 156,
    "page": 1,
    "limit": 20,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## ⚠️ Gestion d'Erreurs Communes

```typescript
// 400 Bad Request
{
  "success": false,
  "message": "Données invalides",
  "code": "VALIDATION_ERROR",
  "errors": [
    {
      "field": "email",
      "message": "Email invalide"
    }
  ]
}

// 401 Unauthorized
{
  "success": false,
  "message": "Token expiré",
  "code": "TOKEN_EXPIRED"
}

// 403 Forbidden
{
  "success": false,
  "message": "Accès refusé - Permissions insuffisantes",
  "code": "FORBIDDEN"
}

// 404 Not Found
{
  "success": false,
  "message": "Ressource non trouvée",
  "code": "NOT_FOUND"
}

// 409 Conflict
{
  "success": false,
  "message": "Le produit existe déjà",
  "code": "RESOURCE_EXISTS"
}

// 500 Server Error
{
  "success": false,
  "message": "Erreur serveur",
  "code": "INTERNAL_ERROR"
}
```

---

## 🔗 Ressources Supplémentaires

- **Swagger API**: `https://api.yapasgachis.com/api-docs`
- **Documentation complète**: `https://doc.yapasgachis.com`
- **Postman Collection**: `docs/YapaGachis_API.postman_collection.json`
- **Backend Status Report**: [BACKEND_IMPLEMENTATION_STATUS.md](BACKEND_IMPLEMENTATION_STATUS.md)

---

## 💡 Tips d'Intégration

### 1. Gestion du Token

```typescript
// Interceptor Axios
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Refresh token
      const newToken = await refreshAccessToken();
      error.config.headers.Authorization = `Bearer ${newToken}`;
      return axios(error.config);
    }
    return Promise.reject(error);
  }
);
```

### 2. Upload avec Progress

```typescript
const uploadWithProgress = async (formData: FormData) => {
  return axios.post(`${API_URL}/products/:id/images`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      const percent = Math.round(
        (progressEvent.loaded * 100) / progressEvent.total
      );
      setUploadProgress(percent);
    },
  });
};
```

### 3. Cache Strategy

```typescript
// React Query exemple
const useStoreStaff = (storeId: string) => {
  return useQuery({
    queryKey: ['staff', storeId],
    queryFn: () => fetchStoreStaff(storeId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};
```

---

**Dernière mise à jour**: 2026-01-29
**Version API**: v1
**Contact**: Backend Team - YapaGachis
