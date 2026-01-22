# 📱 YapaGachis Frontend Development Specification

> **Document pour Gemini:** Spécifications complètes des écrans et fonctionnalités frontend à développer avec données mockées

**Date:** 2026-01-09
**Backend Status:** ✅ Toutes les APIs sont créées et prêtes
**Frontend Status:** 🟡 Interfaces UI manquantes - À développer avec données mockées

---

## 🎯 Vue d'ensemble

Ce document liste **TOUTES** les fonctionnalités backend disponibles qui nécessitent des écrans frontend. Chaque module inclut :
- 📋 Routes API disponibles
- 🎨 Écrans à créer
- 📊 Structure des données mockées
- 🔄 Flux utilisateur

---

## 🚀 PRIORITÉ 1: MODULES URGENTS (Frontend attend)

### 1️⃣ **OPTIONS DE DEALS (Chambres, Tailles, Variants)**

#### 📋 Routes API disponibles
```typescript
// BASE: /api/v1/deal-options

// PUBLIC
GET    /deal/:dealId              // Liste des options d'un deal
GET    /:id                       // Détail d'une option
GET    /:id/availability          // Vérifier disponibilité

// SUPPLIER_DEALS
POST   /                          // Créer une option
PUT    /:id                       // Modifier une option
DELETE /:id                       // Supprimer une option
PATCH  /deal/:dealId/reorder      // Réordonner les options
```

#### 🎨 Écrans à créer

**1. Modal de sélection d'options (Utilisateur)**
- **Fichier:** `app/bon-plans/[id].tsx` (modifier existant)
- **Localisation:** Bottom sheet déjà présent, ajouter fetch API
- **Mockup:**
```typescript
const DEAL_OPTIONS_MOCK = [
  {
    id: "opt-1",
    dealId: "deal-123",
    title: "Studio pour 2 personnes",
    description: "Espace confortable avec cuisine équipée",
    price: 125000,
    capacity: "2 pers max",
    size: "28 m2",
    floor: "Étage supérieur",
    features: ["WiFi gratuit", "Climatisation", "Balcon"],
    imageUrl: "https://...",
    stock: 3,
    isActive: true,
    sortOrder: 0
  },
  {
    id: "opt-2",
    dealId: "deal-123",
    title: "Appartement 1 chambre",
    price: 155000,
    capacity: "4 pers max",
    size: "35 m2",
    floor: "Étage supérieur",
    features: ["WiFi gratuit", "Climatisation", "Cuisine équipée", "TV"],
    imageUrl: "https://...",
    stock: 2,
    isActive: true,
    sortOrder: 1
  }
];
```

**2. Gestion des options (Vendeur - SUPPLIER_DEALS)**
- **Fichiers nouveaux:**
  - `app/seller/deals/[id]/options.tsx` - Liste des options
  - `app/seller/deals/[id]/options/add.tsx` - Créer option
  - `app/seller/deals/[id]/options/[optionId].tsx` - Modifier option

- **Features:**
  - Liste avec drag-and-drop pour réordonner
  - Formulaire avec champs: titre, description, prix, capacité, taille, étage, features (chips multiples)
  - Upload image pour chaque option
  - Stock disponible
  - Toggle actif/inactif

---

### 2️⃣ **SYSTÈME D'AVIS (Reviews Enhancement)**

#### 📋 Nouvelles routes API
```typescript
// BASE: /api/v1/reviews

// Nouvelle route pour deals
GET    /deal/:dealId              // Avis d'un deal (pagination + stats)

// Routes existantes déjà disponibles
POST   /                          // Créer un avis
PUT    /:id                       // Modifier un avis
DELETE /:id                       // Supprimer un avis
POST   /:id/helpful               // Marquer utile
POST   /:id/report                // Signaler
GET    /product/:productId        // Avis d'un produit
GET    /supplier/:supplierId      // Avis d'un fournisseur
GET    /my                        // Mes avis
```

#### 🎨 Écrans à créer

**1. Formulaire de création d'avis**
- **Fichier:** `app/product/create-review.tsx` et `app/bon-plans/create-review.tsx`
- **Features:**
  - Sélection d'étoiles (1-5)
  - Textarea pour commentaire (min 20 caractères)
  - Upload photos (optionnel, max 5)
  - Validation: doit avoir acheté le produit/réservé le deal

- **Mock:**
```typescript
const CREATE_REVIEW_MOCK = {
  entityType: "PRODUCT", // ou "DEAL"
  entityId: "product-123",
  rating: 4.5,
  comment: "Très bon produit, frais et bien emballé !",
  images: ["https://...", "https://..."],
};

// Réponse API
const REVIEW_RESPONSE_MOCK = {
  id: "rev-456",
  userId: "user-123",
  userName: "Albert Flores",
  userAvatar: "https://...",
  rating: 4.5,
  comment: "Très bon produit...",
  images: ["https://..."],
  helpfulCount: 0,
  isVerifiedPurchase: true,
  createdAt: "2026-01-09T10:30:00Z",
  updatedAt: "2026-01-09T10:30:00Z"
};
```

**2. Intégration réelle dans écrans existants**
- **Fichiers à modifier:**
  - `app/product/[id].tsx` - Remplacer mock par fetch API `/reviews/product/:productId`
  - `app/product/reviews.tsx` - Fetch API avec pagination
  - `app/bon-plans/[id].tsx` - Fetch API `/reviews/deal/:dealId`

**3. Interactions sur avis (dans cartes d'avis)**
- Bouton "👍 Utile" avec compteur
- Bouton "⚠️ Signaler"
- Bouton "✏️ Modifier" (si propriétaire)
- Bouton "🗑️ Supprimer" (si propriétaire)

**Mock interactions:**
```typescript
// Marquer utile
POST /api/v1/reviews/:id/helpful
Response: { helpfulCount: 12 }

// Signaler
POST /api/v1/reviews/:id/report
Body: { reason: "SPAM" | "INAPPROPRIATE" | "FAKE" | "OTHER", details?: string }
Response: { success: true, message: "Avis signalé" }
```

---

## 🎯 PRIORITÉ 2: GAMIFICATION & ENGAGEMENT

### 3️⃣ **SYSTÈME DE RÉCOMPENSES & POINTS**

#### 📋 Routes API disponibles
```typescript
// BASE: /api/v1/rewards

GET    /me                        // Mon solde de points + tier
GET    /transactions              // Historique (pagination)
POST   /redeem                    // Utiliser des points
POST   /daily-login               // Réclamer 5 points quotidiens
GET    /tiers                     // Infos sur les tiers
GET    /expiring-soon             // Points qui vont expirer
```

#### 🎨 Écrans à créer

**1. Écran principal Récompenses**
- **Fichier:** `app/profile/rewards.tsx` (modifier existant - déjà UI mais mocké)
- **Features:**
  - Carte avec points actuels + barre de progression vers tier suivant
  - Badge du tier actuel (Bronze/Silver/Gold/Platinum)
  - Liste des points qui expirent bientôt
  - Bouton "Réclamer points quotidiens" (si disponible)
  - Onglets: "Gagner des points" / "Utiliser mes points"

**Mock données:**
```typescript
const USER_REWARDS_MOCK = {
  userId: "user-123",
  totalPoints: 3250,
  availablePoints: 2800, // Certains ont expiré
  lifetimePoints: 15000,
  currentTier: "SILVER",
  nextTier: "GOLD",
  pointsToNextTier: 1750,
  tierProgress: 63.5 // Pourcentage
};

const TIERS_INFO_MOCK = [
  {
    tier: "BRONZE",
    minPoints: 0,
    benefits: ["Points sur achats", "Accès communauté"],
    discountPercentage: 0,
    prioritySupport: false
  },
  {
    tier: "SILVER",
    minPoints: 1000,
    benefits: ["5% réduction", "Points bonus x1.2", "Support prioritaire"],
    discountPercentage: 5,
    prioritySupport: true
  },
  {
    tier: "GOLD",
    minPoints: 5000,
    benefits: ["10% réduction", "Points bonus x1.5", "Livraison gratuite >10000 XOF"],
    discountPercentage: 10,
    freeDeliveryThreshold: 10000,
    prioritySupport: true
  },
  {
    tier: "PLATINUM",
    minPoints: 10000,
    benefits: ["15% réduction", "Points bonus x2", "Livraison gratuite", "Accès VIP"],
    discountPercentage: 15,
    freeDeliveryThreshold: 0,
    prioritySupport: true
  }
];
```

**2. Historique des transactions**
- **Fichier:** `app/profile/rewards/history.tsx`
- **Mock:**
```typescript
const TRANSACTIONS_MOCK = [
  {
    id: "tx-1",
    amount: 150,
    type: "EARNED",
    source: "PURCHASE",
    description: "Achat commande #CMD-789",
    reference: "order-789",
    balance: 3250,
    expiresAt: "2027-01-09T00:00:00Z",
    createdAt: "2026-01-09T14:30:00Z"
  },
  {
    id: "tx-2",
    amount: -500,
    type: "REDEEMED",
    source: "PURCHASE",
    description: "Réduction appliquée sur commande #CMD-790",
    reference: "order-790",
    balance: 3100,
    createdAt: "2026-01-08T10:15:00Z"
  },
  {
    id: "tx-3",
    amount: 5,
    type: "EARNED",
    source: "DAILY_LOGIN",
    description: "Connexion quotidienne",
    balance: 3105,
    createdAt: "2026-01-08T08:00:00Z"
  },
  {
    id: "tx-4",
    amount: 50,
    type: "EARNED",
    source: "REVIEW",
    description: "Avis laissé sur O'Takkos",
    reference: "review-456",
    balance: 3155,
    createdAt: "2026-01-07T16:45:00Z"
  }
];
```

**3. Section "Utiliser mes points"**
- **Localisation:** Intégré dans `app/product/[id].tsx` et checkout
- **Features:**
  - Checkbox "Utiliser mes points" dans le panier
  - Calcul: 100 points = 100 FCFA de réduction
  - Affichage: "Vous économisez X FCFA"

---

### 4️⃣ **SYSTÈME DE PARRAINAGE**

#### 📋 Routes API disponibles
```typescript
// BASE: /api/v1/referrals

POST   /code                      // Générer code de parrainage
GET    /my-codes                  // Mes codes actifs
POST   /use                       // Utiliser un code
GET    /validate/:code            // Valider code (public)
GET    /stats                     // Stats de parrainage
GET    /history                   // Historique parrainages
```

#### 🎨 Écrans à créer

**1. Écran principal Parrainage**
- **Fichier:** `app/profile/invite.tsx` (modifier existant - UI présente mais mockée)
- **Features:**
  - Affichage du code de parrainage principal
  - Bouton "Partager" (WhatsApp, SMS, Email, Copy)
  - Lien de parrainage: `https://yapasgachis.com/invite/CODE123`
  - Stats: X parrainages réussis, Y points gagnés
  - Liste des personnes parrainées (historique)

**Mock données:**
```typescript
const REFERRAL_STATS_MOCK = {
  userId: "user-123",
  totalReferrals: 5,
  pendingReferrals: 2,
  completedReferrals: 3,
  totalRewardsEarned: 600, // 3 x 200 points
  referralCodes: [
    {
      id: "code-1",
      userId: "user-123",
      code: "ALBERT2026",
      shareLink: "https://yapasgachis.com/invite/ALBERT2026",
      timesUsed: 5,
      maxUses: null, // Illimité
      isActive: true,
      expiresAt: null,
      createdAt: "2025-12-01T00:00:00Z"
    }
  ]
};

const REFERRAL_HISTORY_MOCK = [
  {
    id: "ref-1",
    referralCode: "ALBERT2026",
    referredUser: {
      id: "user-456",
      firstName: "Marie",
      avatar: "https://..."
    },
    status: "COMPLETED",
    rewardEarned: 200,
    completedAt: "2026-01-05T10:00:00Z",
    createdAt: "2026-01-01T08:30:00Z"
  },
  {
    id: "ref-2",
    referralCode: "ALBERT2026",
    referredUser: {
      id: "user-789",
      firstName: "Jean",
      avatar: null
    },
    status: "PENDING",
    rewardEarned: null,
    completedAt: null,
    createdAt: "2026-01-08T14:20:00Z"
  }
];
```

**2. Écran d'inscription avec code de parrainage**
- **Fichier:** `app/(auth)/register.tsx` (ajouter champ optionnel)
- **Features:**
  - Champ texte "Code de parrainage (optionnel)"
  - Validation en temps réel avec API `/validate/:code`
  - Message: "✅ Code valide ! Vous et votre parrain recevrez 100 points"

---

## 🏪 PRIORITÉ 3: GESTION VENDEUR

### 5️⃣ **HORAIRES D'OUVERTURE**

#### 📋 Routes API
```typescript
// BASE: /api/v1/store-hours

GET    /:storeId                  // Horaires d'un magasin (public)
GET    /:storeId/is-open          // Est ouvert maintenant ? (public)
POST   /                          // Créer horaires (SUPPLIER)
PUT    /:storeId                  // Modifier horaires (SUPPLIER)
POST   /:storeId/special-closure  // Fermeture exceptionnelle
DELETE /:storeId/special-closure/:id
```

#### 🎨 Écrans à créer

**1. Gestion des horaires (Vendeur)**
- **Fichier:** `app/seller/hours.tsx` (existe déjà vide - à implémenter)
- **Features:**
  - Tableau 7 jours avec toggle "Fermé"
  - Pour chaque jour: ajouter créneaux (ex: 08:00-12:00, 14:00-18:00)
  - Section "Fermetures exceptionnelles"
  - Bouton "Ajouter fermeture" (date picker + raison)

**Mock données:**
```typescript
const STORE_HOURS_MOCK = {
  id: "hours-1",
  storeId: "store-123",
  hours: [
    {
      day: "MONDAY",
      isClosed: false,
      slots: [
        { open: "08:00", close: "12:30" },
        { open: "14:00", close: "18:00" }
      ]
    },
    {
      day: "TUESDAY",
      isClosed: false,
      slots: [{ open: "08:00", close: "18:00" }]
    },
    {
      day: "WEDNESDAY",
      isClosed: false,
      slots: [{ open: "08:00", close: "18:00" }]
    },
    {
      day: "THURSDAY",
      isClosed: false,
      slots: [{ open: "08:00", close: "18:00" }]
    },
    {
      day: "FRIDAY",
      isClosed: false,
      slots: [{ open: "08:00", close: "18:00" }]
    },
    {
      day: "SATURDAY",
      isClosed: false,
      slots: [{ open: "09:00", close: "13:00" }]
    },
    {
      day: "SUNDAY",
      isClosed: true,
      slots: []
    }
  ],
  timezone: "Africa/Abidjan",
  specialNotes: "Fermé les jours fériés",
  isCurrentlyOpen: true,
  nextOpenTime: null,
  createdAt: "2025-12-01T00:00:00Z",
  updatedAt: "2026-01-05T10:00:00Z"
};

const SPECIAL_CLOSURES_MOCK = [
  {
    id: "closure-1",
    storeId: "store-123",
    date: "2026-01-15T00:00:00Z",
    reason: "Inventaire annuel",
    allDay: true,
    from: null,
    to: null,
    createdAt: "2026-01-05T00:00:00Z"
  },
  {
    id: "closure-2",
    storeId: "store-123",
    date: "2026-02-01T00:00:00Z",
    reason: "Maintenance",
    allDay: false,
    from: "10:00",
    to: "14:00",
    createdAt: "2026-01-06T00:00:00Z"
  }
];
```

**2. Affichage horaires (Client - dans détails produit/magasin)**
- **Localisation:** `app/product/[id].tsx`, `app/store/[id].tsx`
- **Features:**
  - Badge "🟢 Ouvert" ou "🔴 Fermé"
  - Dropdown avec horaires de la semaine
  - Message: "Ouvre à 14:00" si fermé temporairement

---

### 6️⃣ **POINTS DE VENTE (POS)**

#### 📋 Routes API
```typescript
// BASE: /api/v1/pos

GET    /:id                       // Détail POS (public)
GET    /search                    // Recherche avec filtres
GET    /nearest                   // Plus proches (géoloc)
POST   /                          // Créer POS (SUPPLIER)
PUT    /:id                       // Modifier POS
DELETE /:id                       // Supprimer POS
PATCH  /:id/toggle-active         // Activer/désactiver
```

#### 🎨 Écrans à créer

**1. Liste des POS (Vendeur)**
- **Fichier:** `app/seller/pos/index.tsx` (existe mais vide)
- **Features:**
  - Cartes avec: nom, type, adresse, statut actif
  - Badge: MAIN, BRANCH, KIOSK, etc.
  - Bouton "Ajouter un point de vente"
  - Actions: Modifier, Désactiver, Supprimer

**2. Créer/Modifier POS**
- **Fichier:** `app/seller/pos/add.tsx` et `app/seller/pos/[id].tsx` (existent mais vides)
- **Formulaire:**
  - Nom du point de vente
  - Type (picker)
  - Adresse complète + carte interactive
  - Téléphone, Email
  - Toggles: Accepte commandes, Retrait, Livraison
  - Description
  - Upload images (max 5)
  - Équipements (chips: Parking, WiFi, Climatisé...)

**Mock données:**
```typescript
const POS_LIST_MOCK = [
  {
    id: "pos-1",
    supplierId: "supplier-123",
    name: "YapaGachis - Marcory",
    type: "MAIN",
    address: "Boulevard VGE, Marcory Remblais",
    city: "Abidjan",
    commune: "Marcory",
    neighborhood: "Remblais",
    latitude: 5.314,
    longitude: -4.0082,
    phoneNumber: "+225 07 12 34 56 78",
    email: "marcory@yapasgachis.com",
    isActive: true,
    acceptsOrders: true,
    acceptsPickup: true,
    acceptsDelivery: true,
    description: "Notre magasin principal à Marcory",
    images: ["https://...", "https://..."],
    amenities: ["Parking", "WiFi", "Climatisé"],
    createdAt: "2025-11-01T00:00:00Z",
    updatedAt: "2026-01-05T00:00:00Z"
  },
  {
    id: "pos-2",
    supplierId: "supplier-123",
    name: "YapaGachis - Koumassi",
    type: "BRANCH",
    address: "Rue des Jardins, Koumassi",
    city: "Abidjan",
    commune: "Koumassi",
    latitude: 5.282,
    longitude: -3.955,
    phoneNumber: "+225 07 98 76 54 32",
    email: null,
    isActive: true,
    acceptsOrders: true,
    acceptsPickup: true,
    acceptsDelivery: false,
    description: "Point de retrait uniquement",
    images: ["https://..."],
    amenities: ["WiFi"],
    createdAt: "2025-12-15T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z"
  }
];
```

**3. Carte des POS (Client)**
- **Fichier:** `app/map.tsx` (existe mais pas d'intégration POS)
- **Features:**
  - Marqueurs pour tous les POS actifs
  - Filtre: Type, Accepte commandes/retrait/livraison
  - Calcul de distance depuis position utilisateur
  - Clic sur marqueur → Bottom sheet avec détails + bouton "Itinéraire"

---

### 7️⃣ **GESTION D'ÉQUIPE**

#### 📋 Routes API
```typescript
// BASE: /api/v1/team-members

POST   /                          // Inviter membre (SUPPLIER)
GET    /                          // Liste membres
GET    /stats                     // Stats équipe
PUT    /:id                       // Modifier membre
DELETE /:id                       // Supprimer membre
POST   /accept-invitation         // Accepter invitation
POST   /decline-invitation        // Refuser invitation
GET    /activity-logs/:id         // Logs d'activité
```

#### 🎨 Écrans à créer

**1. Liste de l'équipe (Vendeur)**
- **Fichier:** `app/seller/team/index.tsx` (existe mais vide)
- **Features:**
  - Stats: X membres actifs, Y invitations en attente
  - Cartes membres avec: photo, nom, rôle, statut, dernier actif
  - Badge rôle: MANAGER, CASHIER, STOCK_MANAGER, etc.
  - Filtre par rôle et statut
  - Bouton "Inviter un membre"

**2. Inviter un membre**
- **Fichier:** `app/seller/team/add.tsx` (existe mais vide)
- **Formulaire:**
  - Email ou Numéro de téléphone
  - Prénom, Nom
  - Rôle (picker)
  - POS rattaché (optionnel)
  - Permissions (checkboxes multiples)

**Mock données:**
```typescript
const TEAM_MEMBERS_MOCK = [
  {
    id: "member-1",
    supplierId: "supplier-123",
    userId: "user-789",
    posId: "pos-1",
    posName: "YapaGachis - Marcory",
    email: "marie@example.com",
    phoneNumber: "+225 07 11 22 33 44",
    firstName: "Marie",
    lastName: "Kouassi",
    role: "MANAGER",
    permissions: ["manage_products", "view_orders", "manage_stock", "view_analytics"],
    isActive: true,
    invitationStatus: "ACCEPTED",
    invitedAt: "2025-12-01T00:00:00Z",
    acceptedAt: "2025-12-01T10:30:00Z",
    lastActiveAt: "2026-01-09T08:15:00Z",
    createdAt: "2025-12-01T00:00:00Z",
    updatedAt: "2026-01-05T00:00:00Z"
  },
  {
    id: "member-2",
    supplierId: "supplier-123",
    userId: null,
    posId: "pos-2",
    posName: "YapaGachis - Koumassi",
    email: "jean@example.com",
    phoneNumber: null,
    firstName: "Jean",
    lastName: "Traoré",
    role: "CASHIER",
    permissions: ["view_orders", "process_payments"],
    isActive: true,
    invitationStatus: "PENDING",
    invitedAt: "2026-01-08T00:00:00Z",
    acceptedAt: null,
    lastActiveAt: null,
    createdAt: "2026-01-08T00:00:00Z",
    updatedAt: "2026-01-08T00:00:00Z"
  }
];

const TEAM_STATS_MOCK = {
  totalMembers: 5,
  activeMembers: 4,
  pendingInvitations: 1,
  membersByRole: {
    MANAGER: 1,
    CASHIER: 2,
    STOCK_MANAGER: 1,
    DELIVERY: 1,
    SUPPORT: 0,
    ADMIN: 0
  }
};

const PERMISSIONS_OPTIONS = [
  { value: "manage_products", label: "Gérer les produits" },
  { value: "view_orders", label: "Voir les commandes" },
  { value: "manage_orders", label: "Gérer les commandes" },
  { value: "manage_stock", label: "Gérer le stock" },
  { value: "process_payments", label: "Traiter les paiements" },
  { value: "view_analytics", label: "Voir les statistiques" },
  { value: "manage_team", label: "Gérer l'équipe" },
  { value: "manage_settings", label: "Gérer les paramètres" }
];
```

---

### 8️⃣ **GALERIE PHOTOS**

#### 📋 Routes API
```typescript
// BASE: /api/v1/media

POST   /upload                    // Upload fichiers (multipart)
GET    /gallery/:entityType/:entityId  // Galerie (public)
PUT    /:id                       // Modifier métadonnées
DELETE /:id                       // Supprimer
POST   /bulk-delete               // Suppression multiple
PATCH  /:id/set-primary           // Définir comme principal
PATCH  /reorder/:entityType/:entityId // Réordonner
```

#### 🎨 Écrans à créer

**1. Galerie photos (Vendeur)**
- **Fichier:** `app/seller/photos.tsx` (existe mais vide)
- **Features:**
  - Grid de photos pour le magasin/profil
  - Upload multiple (drag & drop ou sélection)
  - Indicateur photo principale (étoile)
  - Drag & drop pour réordonner
  - Actions: Définir principale, Modifier légende, Supprimer
  - Sélection multiple pour suppression en masse

**2. Upload dans création/modification produit**
- **Fichiers:** `app/seller/products/add.tsx`, `app/seller/products/[id].tsx`
- **Features:**
  - Section "Photos du produit"
  - Upload jusqu'à 10 photos
  - Première photo = principale par défaut
  - Preview avec cropping optionnel
  - Limit: 10MB par fichier

**Mock données:**
```typescript
const MEDIA_GALLERY_MOCK = {
  entityType: "PRODUCT",
  entityId: "product-123",
  totalCount: 4,
  primaryMedia: {
    id: "media-1",
    entityType: "PRODUCT",
    entityId: "product-123",
    type: "IMAGE",
    url: "https://res.cloudinary.com/.../image1.jpg",
    thumbnailUrl: "https://res.cloudinary.com/.../image1_thumb.jpg",
    fileName: "tacos-pack.jpg",
    fileSize: 2456789,
    mimeType: "image/jpeg",
    width: 1920,
    height: 1080,
    isPrimary: true,
    sortOrder: 0,
    caption: "Pack Tacos XXL",
    altText: "Délicieux tacos XXL avec boisson",
    uploadedBy: "user-123",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-05T00:00:00Z"
  },
  media: [
    // ... tableau de tous les médias
  ]
};

const UPLOAD_RESPONSE_MOCK = {
  success: true,
  uploaded: [
    {
      id: "media-5",
      url: "https://res.cloudinary.com/.../new-image.jpg",
      thumbnailUrl: "https://res.cloudinary.com/.../new-image_thumb.jpg",
      fileName: "new-image.jpg",
      fileSize: 1234567,
      isPrimary: false,
      sortOrder: 4
    }
  ]
};
```

---

## 🔄 FLUX UTILISATEUR COMPLETS

### 📦 Réservation de Deal avec Options

**Étapes:**
1. Client visite `/bon-plans/[id]` → Voir deal hôtel
2. Clique "Réserver" → Bottom sheet s'ouvre
3. Bottom sheet fetch `GET /api/v1/deal-options/deal/:dealId` → Liste des chambres
4. Client sélectionne "Appartement 1 chambre - 155000 XOF"
5. Sélectionne dates dans calendrier
6. Clique "Réserver" → Redirection vers paiement
7. POST `/api/v1/deals/:dealId/book` avec `{ optionId, bookingDate, quantity, paymentMethod }`
8. Réponse contient QR code → Écran de confirmation

### 🎁 Flux Parrainage Complet

**Étapes:**
1. Utilisateur A visite `/profile/invite`
2. Clique "Générer mon code" → POST `/api/v1/referrals/code` → "ALBERT2026"
3. Partage lien `https://yapasgachis.com/invite/ALBERT2026` à Utilisateur B
4. Utilisateur B s'inscrit avec code → POST `/api/v1/referrals/use` avec `{ code, newUserId }`
5. Backend crée Referral avec status PENDING
6. Utilisateur B fait son 1er achat → Webhook déclenche completion
7. Backend:
   - Met à jour Referral → COMPLETED
   - Crée 2 PointTransaction: +200 pour A, +100 pour B
   - Envoie notifications
8. Utilisateur A voit dans `/profile/invite` historique: "Marie vous a rejoint - +200 pts"

### ⭐ Flux Avis Complet

**Étapes:**
1. Client termine achat/réservation
2. Reçoit notification "Laissez un avis et gagnez 50 points !"
3. Clique → `/product/create-review?productId=XXX`
4. Remplit formulaire (note, commentaire, photos)
5. POST `/api/v1/reviews` → Réponse avec review créé
6. Backend déclenche:
   - Création PointTransaction +50 points (source: REVIEW)
   - Notification au vendeur
7. Avis apparaît immédiatement dans `/product/[id]` (cache invalidé)

---

## 📊 TYPES TYPESCRIPT (Référence)

### Deal Options
```typescript
interface DealOption {
  id: string;
  dealId: string;
  title: string;
  description?: string;
  price: number;
  capacity?: string;
  size?: string;
  floor?: string;
  features?: string[];
  imageUrl?: string;
  stock: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}
```

### User Rewards
```typescript
type RewardTier = 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
type PointSource = 'PURCHASE' | 'REFERRAL' | 'DONATION' | 'REVIEW' | 'SIGNUP_BONUS' | 'DAILY_LOGIN' | 'ACHIEVEMENT';

interface UserRewards {
  userId: string;
  totalPoints: number;
  availablePoints: number;
  lifetimePoints: number;
  currentTier: RewardTier;
  nextTier?: RewardTier;
  pointsToNextTier?: number;
  tierProgress: number;
}

interface PointTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'EARNED' | 'REDEEMED' | 'EXPIRED' | 'BONUS';
  source: PointSource;
  description: string;
  reference?: string;
  balance: number;
  expiresAt?: string;
  createdAt: string;
}
```

### Referral
```typescript
interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  shareLink: string;
  timesUsed: number;
  maxUses?: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

interface Referral {
  id: string;
  referralCode: string;
  referredUser: {
    id: string;
    firstName: string;
    avatar?: string;
  };
  status: 'PENDING' | 'COMPLETED' | 'REWARDED' | 'EXPIRED';
  rewardEarned?: number;
  completedAt?: string;
  createdAt: string;
}
```

### Store Hours
```typescript
type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

interface TimeSlot {
  open: string; // "08:00"
  close: string; // "17:00"
}

interface DayHours {
  day: DayOfWeek;
  isClosed: boolean;
  slots: TimeSlot[];
}

interface StoreHours {
  id: string;
  storeId: string;
  hours: DayHours[];
  timezone: string;
  specialNotes?: string;
  isCurrentlyOpen: boolean;
  nextOpenTime?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Point of Sale
```typescript
type POSType = 'MAIN' | 'BRANCH' | 'KIOSK' | 'WAREHOUSE' | 'PICKUP_POINT';

interface PointOfSale {
  id: string;
  supplierId: string;
  name: string;
  type: POSType;
  address: string;
  city: string;
  commune: string;
  neighborhood?: string;
  latitude: number;
  longitude: number;
  phoneNumber?: string;
  email?: string;
  isActive: boolean;
  acceptsOrders: boolean;
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
  description?: string;
  images?: string[];
  amenities?: string[];
  distance?: number;
  createdAt: string;
  updatedAt: string;
}
```

### Team Member
```typescript
type TeamRole = 'MANAGER' | 'CASHIER' | 'STOCK_MANAGER' | 'DELIVERY' | 'SUPPORT' | 'ADMIN';

interface TeamMember {
  id: string;
  supplierId: string;
  userId?: string;
  posId?: string;
  posName?: string;
  email?: string;
  phoneNumber?: string;
  firstName: string;
  lastName?: string;
  role: TeamRole;
  permissions: string[];
  isActive: boolean;
  invitationStatus: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';
  invitedAt: string;
  acceptedAt?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Media
```typescript
type MediaType = 'IMAGE' | 'VIDEO' | 'DOCUMENT';
type MediaCategory = 'PRODUCT' | 'DEAL' | 'STORE' | 'PROFILE' | 'REVIEW' | 'KYC';

interface Media {
  id: string;
  entityType: MediaCategory;
  entityId: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  duration?: number;
  isPrimary: boolean;
  sortOrder: number;
  caption?: string;
  altText?: string;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 🎨 DESIGN GUIDELINES

### Couleurs YapaGachis
- **Primary:** `#00A57F` (Vert principal)
- **Secondary:** `#D4F571` (Vert lime - badges)
- **Success:** `#00A57F`
- **Warning:** `#FFA500`
- **Error:** `#E53935`
- **Text Primary:** `#000000`
- **Text Secondary:** `#666666`

### Composants UI recommandés
- **Cartes:** Border radius 12px, shadow légère
- **Boutons principaux:** Background primary, texte blanc, bold
- **Boutons secondaires:** Border primary, texte primary
- **Badges:** Background `#D4F571`, texte noir, small
- **Inputs:** Border gris clair, focus primary
- **Bottom Sheets:** Snap points `['50%', '75%']` ou `['60%', '85%']`

### Icônes (Ionicons)
- **Points:** `star`, `trophy`
- **Parrainage:** `people`, `share-social`
- **Horaires:** `time`, `calendar`
- **POS:** `location`, `storefront`
- **Équipe:** `people-circle`, `person-add`
- **Photos:** `camera`, `images`

---

## 📝 CHECKLIST POUR CHAQUE ÉCRAN

Avant de marquer un écran comme "terminé":

✅ **Données mockées** complètes et réalistes
✅ **Types TypeScript** définis
✅ **Loading states** (skeleton, spinner)
✅ **Error states** (retry, message d'erreur)
✅ **Empty states** (illustration + message)
✅ **Pull to refresh** (pour listes)
✅ **Pagination** (si applicable)
✅ **Validation formulaire** (avec messages)
✅ **Responsive** (testé sur différentes tailles)
✅ **Accessibilité** (labels, contraste, taille tactile)
✅ **Animations** (transitions fluides)

---

## 🚀 PRIORITÉS DE DÉVELOPPEMENT

### Sprint 1 (Urgent - 1 semaine)
1. Options de deals (réservation chambres)
2. Formulaire création d'avis
3. Intégration réelle des avis (fetch API)

### Sprint 2 (Important - 1 semaine)
4. Système récompenses & points (écran principal + historique)
5. Système parrainage (écran principal + historique)

### Sprint 3 (Gestion vendeur - 2 semaines)
6. Horaires d'ouverture (vendeur + affichage client)
7. Points de vente (CRUD vendeur + carte client)
8. Gestion d'équipe (invitations + liste)

### Sprint 4 (Média - 1 semaine)
9. Galerie photos (upload + gestion)

---

## 📞 SUPPORT & QUESTIONS

Pour toute question sur les APIs, consultez:
- **Swagger UI:** `https://api.yapasgachis.com/api-docs`
- **Documentation:** `https://doc.yapasgachis.com`

Bon développement! 🚀

---

**Dernière mise à jour:** 2026-01-09
**Version backend:** v1.0 (Toutes APIs prêtes)
**Document généré par:** Claude Sonnet 4.5
