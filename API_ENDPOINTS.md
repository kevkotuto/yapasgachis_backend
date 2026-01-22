# 🔌 YapaGachis - Liste Complète des APIs

**Base URL:** `https://api.yapasgachis.com/api/v1`

---

## 🆕 NOUVELLES APIS (2026-01-09)

### 1️⃣ Deal Options `/deal-options`

| Méthode | Endpoint | Auth | Rôle | Description |
|---|---|---|---|---|
| GET | `/deal/:dealId` | - | Public | Liste des options d'un deal |
| GET | `/:id` | - | Public | Détail d'une option |
| GET | `/:id/availability` | - | Public | Vérifier disponibilité |
| POST | `/` | ✅ | SUPPLIER_DEALS | Créer une option |
| PUT | `/:id` | ✅ | SUPPLIER_DEALS | Modifier une option |
| DELETE | `/:id` | ✅ | SUPPLIER_DEALS | Supprimer une option |
| PATCH | `/deal/:dealId/reorder` | ✅ | SUPPLIER_DEALS | Réordonner les options |

---

### 2️⃣ Reviews Enhancement `/reviews`

| Méthode | Endpoint | Auth | Rôle | Description |
|---|---|---|---|---|
| **GET** | **/deal/:dealId** | - | Public | **NOUVEAU:** Avis d'un deal |

*Note: Routes existantes (product/:productId, supplier/:supplierId, POST /, PUT /:id, DELETE /:id, POST /:id/helpful, POST /:id/report) toujours disponibles*

---

### 3️⃣ Rewards & Points `/rewards`

| Méthode | Endpoint | Auth | Rôle | Description |
|---|---|---|---|---|
| GET | `/me` | ✅ | User | Mon solde de points + tier |
| GET | `/transactions` | ✅ | User | Historique (pagination) |
| POST | `/redeem` | ✅ | User | Utiliser des points |
| POST | `/daily-login` | ✅ | User | Réclamer 5 points quotidiens |
| GET | `/tiers` | - | Public | Infos sur les tiers |
| GET | `/expiring-soon` | ✅ | User | Points qui vont expirer |
| POST | `/admin/award` | ✅ | ADMIN | Attribuer des points (admin) |

**Configuration:**
- 1 point = 100 FCFA dépensés
- Tiers: BRONZE (0), SILVER (1000), GOLD (5000), PLATINUM (10000)
- Expiration: 12 mois
- Points quotidiens: 5 points/jour

---

### 4️⃣ Referral System `/referrals`

| Méthode | Endpoint | Auth | Rôle | Description |
|---|---|---|---|---|
| POST | `/code` | ✅ | User | Créer un code de parrainage |
| GET | `/my-codes` | ✅ | User | Mes codes actifs |
| POST | `/use` | ✅ | User | Utiliser un code |
| GET | `/validate/:code` | - | Public | Valider un code |
| GET | `/stats` | ✅ | User | Statistiques de parrainage |
| GET | `/history` | ✅ | User | Historique parrainages |

**Récompenses:**
- Parrain: 200 points
- Filleul: 100 points
- Déclencheur: Premier achat du filleul

---

### 5️⃣ Store Hours `/store-hours`

| Méthode | Endpoint | Auth | Rôle | Description |
|---|---|---|---|---|
| GET | `/:storeId` | - | Public | Horaires d'un magasin |
| GET | `/:storeId/is-open` | - | Public | Est ouvert maintenant ? |
| POST | `/` | ✅ | SUPPLIER | Créer horaires |
| PUT | `/:storeId` | ✅ | SUPPLIER | Modifier horaires |
| POST | `/:storeId/special-closure` | ✅ | SUPPLIER | Ajouter fermeture exceptionnelle |
| DELETE | `/:storeId/special-closure/:id` | ✅ | SUPPLIER | Supprimer fermeture |

---

### 6️⃣ Points of Sale (POS) `/pos`

| Méthode | Endpoint | Auth | Rôle | Description |
|---|---|---|---|---|
| GET | `/:id` | - | Public | Détail d'un POS |
| GET | `/search` | - | Public | Rechercher POS (filtres) |
| GET | `/nearest` | - | Public | Plus proches (géoloc) |
| GET | `/supplier/:supplierId` | - | Public | POS d'un fournisseur |
| POST | `/` | ✅ | SUPPLIER | Créer un POS |
| PUT | `/:id` | ✅ | SUPPLIER | Modifier un POS |
| DELETE | `/:id` | ✅ | SUPPLIER | Supprimer un POS |
| PATCH | `/:id/toggle-active` | ✅ | SUPPLIER | Activer/désactiver |

**Types POS:** MAIN, BRANCH, KIOSK, WAREHOUSE, PICKUP_POINT

**Recherche:**
```
GET /api/v1/pos/search?city=Abidjan&commune=Marcory&type=BRANCH
GET /api/v1/pos/nearest?latitude=5.314&longitude=-4.008&radius=5
```

---

### 7️⃣ Team Members `/team-members`

| Méthode | Endpoint | Auth | Rôle | Description |
|---|---|---|---|---|
| POST | `/` | ✅ | SUPPLIER | Inviter un membre |
| GET | `/` | ✅ | SUPPLIER | Liste des membres |
| GET | `/stats` | ✅ | SUPPLIER | Statistiques équipe |
| GET | `/:id` | ✅ | SUPPLIER | Détail d'un membre |
| PUT | `/:id` | ✅ | SUPPLIER | Modifier un membre |
| DELETE | `/:id` | ✅ | SUPPLIER | Supprimer un membre |
| POST | `/accept-invitation` | ✅ | User | Accepter une invitation |
| POST | `/decline-invitation` | ✅ | User | Refuser une invitation |
| GET | `/activity-logs/:id` | ✅ | SUPPLIER | Logs d'activité membre |

**Rôles:** MANAGER, CASHIER, STOCK_MANAGER, DELIVERY, SUPPORT, ADMIN

---

### 8️⃣ Media Gallery `/media`

| Méthode | Endpoint | Auth | Rôle | Description |
|---|---|---|---|---|
| POST | `/upload` | ✅ | User | Upload fichiers (multipart) |
| GET | `/gallery/:entityType/:entityId` | - | Public | Galerie complète |
| GET | `/:id` | - | Public | Détail d'un média |
| PUT | `/:id` | ✅ | Owner | Modifier métadonnées |
| DELETE | `/:id` | ✅ | Owner | Supprimer un média |
| POST | `/bulk-delete` | ✅ | Owner | Suppression multiple |
| PATCH | `/:id/set-primary` | ✅ | Owner | Définir comme principal |
| PATCH | `/reorder/:entityType/:entityId` | ✅ | Owner | Réordonner médias |

**Types:** IMAGE, VIDEO, DOCUMENT
**Catégories:** PRODUCT, DEAL, STORE, PROFILE, REVIEW, KYC

**Upload:**
```bash
POST /api/v1/media/upload
Content-Type: multipart/form-data

{
  "entityType": "PRODUCT",
  "entityId": "product-123",
  "files": [File, File, ...],
  "isPrimary": false
}
```

**Limites:**
- Max 10 fichiers/upload
- Max 10MB/fichier
- Formats: JPEG, PNG, GIF, WEBP, MP4, PDF

---

## 📦 APIS EXISTANTES (Déjà disponibles)

### Authentication `/auth`
- POST `/register` - Inscription
- POST `/login` - Connexion
- POST `/refresh-token` - Rafraîchir token
- POST `/logout` - Déconnexion
- POST `/verify-otp` - Vérifier OTP
- POST `/resend-otp` - Renvoyer OTP
- GET `/me` - Mon profil

### Products `/products`
- GET `/` - Liste produits
- GET `/:id` - Détail produit
- POST `/` - Créer produit (SUPPLIER)
- PUT `/:id` - Modifier produit (SUPPLIER)
- DELETE `/:id` - Supprimer produit (SUPPLIER)
- PATCH `/:id/stock` - Mettre à jour stock (SUPPLIER)

### Deals `/deals`
- GET `/` - Liste deals
- GET `/:dealId` - Détail deal
- POST `/:dealId/book` - Réserver un deal
- GET `/bookings/my-bookings` - Mes réservations
- POST `/bookings/:bookingId/cancel` - Annuler réservation
- GET `/bookings/:bookingId/qr-code` - QR code réservation

### Supplier Deals `/supplier-deals`
- GET `/` - Mes deals (SUPPLIER_DEALS)
- POST `/` - Créer deal (SUPPLIER_DEALS)
- PUT `/:dealId` - Modifier deal (SUPPLIER_DEALS)
- DELETE `/:dealId` - Supprimer deal (SUPPLIER_DEALS)
- POST `/:dealId/toggle-pause` - Pause/reprendre (SUPPLIER_DEALS)
- GET `/bookings` - Réservations reçues (SUPPLIER_DEALS)
- POST `/bookings/validate` - Valider QR code (SUPPLIER_DEALS)

### Orders `/orders`
- POST `/` - Créer commande
- GET `/my-orders` - Mes commandes
- GET `/:id` - Détail commande
- POST `/:id/cancel` - Annuler commande

### Donations `/donations`
- POST `/` - Créer donation
- GET `/my-donations` - Mes donations
- GET `/available` - Donations disponibles (ASSOCIATION)
- POST `/:id/claim` - Réclamer donation (ASSOCIATION)

### Reviews `/reviews`
- POST `/` - Créer avis
- GET `/product/:productId` - Avis produit
- GET `/supplier/:supplierId` - Avis fournisseur
- GET `/deal/:dealId` - Avis deal (NOUVEAU)
- GET `/my` - Mes avis
- PUT `/:id` - Modifier avis
- DELETE `/:id` - Supprimer avis
- POST `/:id/helpful` - Marquer utile
- POST `/:id/report` - Signaler avis

### Subscriptions `/subscriptions`
- GET `/plans` - Plans disponibles
- POST `/subscribe` - S'abonner
- POST `/cancel` - Annuler abonnement
- POST `/renew` - Renouveler
- GET `/limits` - Limites du plan
- POST `/promo-codes/validate` - Valider code promo

### Notifications `/notifications`
- GET `/` - Mes notifications
- POST `/:id/read` - Marquer lue
- PUT `/settings` - Paramètres notifications

### KYC `/kyc`
- POST `/submit` - Soumettre documents
- GET `/status` - Statut KYC

### Admin Routes
- Toutes les routes `/admin/*` pour gestion plateforme

---

## 🔑 Authentification

### Headers requis
```
Authorization: Bearer <access_token>
```

### Rôles disponibles
- `CLIENT` - Client standard
- `SUPPLIER_FOOD` - Fournisseur alimentaire
- `SUPPLIER_DEALS` - Fournisseur bons plans
- `ASSOCIATION` - Association
- `ADVERTISER` - Annonceur
- `ADMIN` - Administrateur
- `SUPER_ADMIN` - Super administrateur

---

## 📄 Formats de Réponse

### Success
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "User-friendly error message",
    "details": { ... }
  }
}
```

### Pagination
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## 🧪 Tests avec cURL

### Obtenir mes points
```bash
curl -X GET https://api.yapasgachis.com/api/v1/rewards/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Créer un code de parrainage
```bash
curl -X POST https://api.yapasgachis.com/api/v1/referrals/code \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"customCode": "ALBERT2026"}'
```

### Rechercher POS proches
```bash
curl -X GET "https://api.yapasgachis.com/api/v1/pos/nearest?latitude=5.314&longitude=-4.008&radius=5"
```

### Upload images
```bash
curl -X POST https://api.yapasgachis.com/api/v1/media/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "entityType=PRODUCT" \
  -F "entityId=product-123" \
  -F "files=@image1.jpg" \
  -F "files=@image2.jpg"
```

---

## 📊 Rate Limiting

- **Général:** 100 requêtes / 15 minutes
- **Auth:** 5 requêtes / 15 minutes
- **Upload:** 20 requêtes / 15 minutes

---

## 🌍 Environnements

| Env | Base URL | Swagger |
|---|---|---|
| **Production** | `https://api.yapasgachis.com/api/v1` | [/api-docs](https://api.yapasgachis.com/api-docs) |
| **Staging** | `https://api-staging.yapasgachis.com/api/v1` | [/api-docs](https://api-staging.yapasgachis.com/api-docs) |
| **Local** | `http://localhost:3000/api/v1` | [/api-docs](http://localhost:3000/api-docs) |

---

**Dernière mise à jour:** 2026-01-09
**Version:** v1.0
**Documentation complète:** https://doc.yapasgachis.com
