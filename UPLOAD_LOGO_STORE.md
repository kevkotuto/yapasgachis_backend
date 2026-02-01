# 📸 Upload Logo/Images pour Point de Vente (Store)

## 🎯 Système de Stockage

**Provider:** O2Switch Media Server
**URL:** https://media.yapasgachis.com
**Stockage:** Les images sont stockées comme JSON arrays dans la DB (pas de table Media)

---

## 📋 Architecture

### 1. SupplierProfile (Logo du Fournisseur)
```prisma
model SupplierProfile {
  logo        String? // URL de l'image
  coverImage  String? // URL de l'image de couverture
  ...
}
```

### 2. SupplierStore (Images du Magasin/POS)
```prisma
model SupplierStore {
  images Json? @default("[]") // Array d'URLs: ["url1", "url2", ...]
  ...
}
```

---

## 🚀 SOLUTION: Upload Logo pour un Point de Vente

### Option 1: Via SupplierProfile (Logo Global) ⭐ RECOMMANDÉ

Ce logo s'applique à **TOUS** les magasins du fournisseur.

#### Étape 1: Upload l'image vers O2Switch

**Endpoint interne:** Service `MediaServerService`

```typescript
// Utiliser le service directement
import { MediaServerService } from '@/infrastructure/storage/media-server.service';

const mediaService = MediaServerService.getInstance();
const result = await mediaService.uploadFile(buffer, {
  folder: 'suppliers',
  filename: 'logo_generale_ci.jpg',
  mimetype: 'image/jpeg'
});

// Résultat:
{
  url: "https://media.yapasgachis.com/suppliers/logo_generale_ci.jpg",
  thumbnailUrl: "https://media.yapasgachis.com/suppliers/thumbnails/logo_generale_ci.jpg",
  filename: "logo_generale_ci.jpg",
  folder: "suppliers",
  mimetype: "image/jpeg",
  size: 245678
}
```

#### Étape 2: Mettre à jour le profil supplier

**Route:** `PUT /api/v1/suppliers/profile`

**Request:**
```bash
curl -X PUT "https://api.yapasgachis.com/api/v1/suppliers/profile" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logoUrl": "https://media.yapasgachis.com/suppliers/logo_generale_ci.jpg",
    "bannerUrl": "https://media.yapasgachis.com/suppliers/banner_generale_ci.jpg"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Profil fournisseur mis à jour avec succès",
  "data": {
    "profile": {
      "id": "20763af6-68a2-43d8-9606-f766be258fe6",
      "businessName": "Generale CI",
      "logo": "https://media.yapasgachis.com/suppliers/logo_generale_ci.jpg",
      "coverImage": "https://media.yapasgachis.com/suppliers/banner_generale_ci.jpg",
      ...
    }
  }
}
```

---

### Option 2: Via SupplierStore (Images Spécifiques au Magasin)

Chaque magasin peut avoir ses propres images.

#### Étape 1: Upload l'image vers O2Switch

```typescript
const result = await mediaService.uploadFile(buffer, {
  folder: 'suppliers', // ou 'products' selon le contexte
  filename: 'store_plateau_logo.jpg',
  mimetype: 'image/jpeg'
});
```

#### Étape 2: Créer ou mettre à jour le store

**Route création:** `POST /api/v1/supplier/stores`

```bash
curl -X POST "https://api.yapasgachis.com/api/v1/supplier/stores" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Generale CI - Plateau",
    "description": "Notre magasin du Plateau",
    "images": [
      "https://media.yapasgachis.com/suppliers/store_plateau_1.jpg",
      "https://media.yapasgachis.com/suppliers/store_plateau_2.jpg",
      "https://media.yapasgachis.com/suppliers/store_plateau_logo.jpg"
    ],
    "address": "15 Rue Vincens, Plateau",
    "city": "Abidjan",
    "operatingHours": {
      "monday": {"open": "08:00", "close": "20:00"},
      "tuesday": {"open": "08:00", "close": "20:00"},
      "wednesday": {"open": "08:00", "close": "20:00"},
      "thursday": {"open": "08:00", "close": "20:00"},
      "friday": {"open": "08:00", "close": "22:00"},
      "saturday": {"open": "09:00", "close": "22:00"},
      "sunday": {"open": "10:00", "close": "18:00"}
    },
    "deliveryEnabled": true,
    "pickupEnabled": true
  }'
```

**Route mise à jour:** `PUT /api/v1/supplier/stores/:storeId`

```bash
curl -X PUT "https://api.yapasgachis.com/api/v1/supplier/stores/STORE_UUID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "images": [
      "https://media.yapasgachis.com/suppliers/store_plateau_logo.jpg",
      "https://media.yapasgachis.com/suppliers/store_plateau_interior.jpg"
    ]
  }'
```

---

## 📡 API Routes Disponibles

### Upload Direct vers O2Switch Media Server

**⚠️ Note:** Il n'y a **PAS** de route API backend pour uploader directement.
Le service `MediaServerService` est utilisé **CÔTÉ SERVEUR** uniquement.

**Possibilités:**

#### A. Upload depuis le Backend (Recommandé)

Créer une nouvelle route dans le backend:

```typescript
// src/api/v1/routes/upload.routes.ts
router.post(
  '/upload/supplier-logo',
  authenticate,
  requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS']),
  upload.single('logo'), // Multer middleware
  async (req, res) => {
    const file = req.file;
    const mediaService = MediaServerService.getInstance();

    const result = await mediaService.uploadFile(file.buffer, {
      folder: 'suppliers',
      filename: `logo_${req.user.id}_${Date.now()}.jpg`,
      mimetype: file.mimetype
    });

    res.json({ success: true, data: result });
  }
);
```

#### B. Upload Direct depuis le Frontend (Client-Side)

Le frontend peut uploader **DIRECTEMENT** vers O2Switch:

```typescript
// Frontend (React Native / Expo)
const uploadLogo = async (imageUri: string) => {
  const formData = new FormData();
  formData.append('file', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'logo.jpg',
  });

  const response = await fetch('https://media.yapasgachis.com/upload/suppliers', {
    method: 'POST',
    headers: {
      'x-api-key': 'YOUR_MEDIA_SERVER_API_KEY',
    },
    body: formData,
  });

  const result = await response.json();
  // result.url = "https://media.yapasgachis.com/suppliers/logo.jpg"

  // Ensuite mettre à jour le profil
  await updateSupplierProfile({ logoUrl: result.url });
};
```

---

## 🔧 Configuration O2Switch Media Server

### Variables d'Environnement

```env
MEDIA_SERVER_BASE_URL=https://media.yapasgachis.com
MEDIA_SERVER_API_KEY=your_api_key_here
```

### Folders Disponibles

- `products` - Images de produits
- `users` - Photos de profil utilisateur
- `suppliers` - Logos et images des fournisseurs ⭐
- `associations` - Images des associations
- `deals` - Images des deals
- `misc` - Autres fichiers

---

## 📝 Workflow Complet (Exemple Pratique)

### Scénario: Ajouter un logo au magasin "Generale CI - Plateau"

#### 1. Upload l'image

**Option A - Via Backend API (À créer):**
```bash
curl -X POST "https://api.yapasgachis.com/api/v1/upload/supplier-logo" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "logo=@/path/to/logo.jpg"
```

**Option B - Direct vers O2Switch:**
```bash
curl -X POST "https://media.yapasgachis.com/upload/suppliers" \
  -H "x-api-key: YOUR_API_KEY" \
  -F "file=@/path/to/logo.jpg"
```

**Response:**
```json
{
  "url": "https://media.yapasgachis.com/suppliers/logo_123456789.jpg",
  "thumbnailUrl": "https://media.yapasgachis.com/suppliers/thumbnails/logo_123456789.jpg",
  "filename": "logo_123456789.jpg",
  "size": 245678
}
```

#### 2. Mettre à jour le store

```bash
curl -X PUT "https://api.yapasgachis.com/api/v1/supplier/stores/STORE_UUID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "images": ["https://media.yapasgachis.com/suppliers/logo_123456789.jpg"]
  }'
```

#### 3. Vérifier

```bash
curl -X GET "https://api.yapasgachis.com/api/v1/supplier/stores" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "store-uuid",
      "name": "Generale CI - Plateau",
      "images": ["https://media.yapasgachis.com/suppliers/logo_123456789.jpg"],
      ...
    }
  ]
}
```

---

## ✅ Résumé des Routes

| Action | Méthode | Route | Body |
|--------|---------|-------|------|
| **Upload image (direct)** | POST | `https://media.yapasgachis.com/upload/suppliers` | FormData avec `file` |
| **Mettre à jour logo supplier** | PUT | `/api/v1/suppliers/profile` | `{ "logoUrl": "..." }` |
| **Créer store avec images** | POST | `/api/v1/supplier/stores` | `{ "images": ["url1", "url2"] }` |
| **Mettre à jour store images** | PUT | `/api/v1/supplier/stores/:id` | `{ "images": ["url1", "url2"] }` |
| **Obtenir mes stores** | GET | `/api/v1/supplier/stores` | - |

---

## 🎯 Recommandation Finale

### Pour un Logo de Point de Vente (Store):

**Approche Recommandée:**

1. **Upload vers O2Switch** (direct ou via backend)
2. **Récupérer l'URL** de l'image uploadée
3. **Mettre à jour le SupplierProfile** avec `PUT /suppliers/profile` + `{ "logoUrl": "..." }`

**Pourquoi?**
- ✅ Un seul logo pour tous les magasins du fournisseur
- ✅ Plus simple à gérer
- ✅ Cohérence de la marque

**Alternative (Logo par magasin):**
- Utiliser le champ `images` de `SupplierStore`
- Chaque magasin peut avoir ses propres images/logo
- Plus flexible mais plus complexe

---

## 📞 Besoin d'Aide?

**Pour créer une route d'upload backend:**
```bash
# Créer le fichier
touch src/api/v1/routes/upload.routes.ts
touch src/api/v1/controllers/upload.controller.ts

# Ajouter la route dans app.ts
# app.use('/api/v1/upload', uploadRoutes);
```

**Configuration actuelle:**
- Media Server: ✅ Configuré
- O2Switch: ✅ Actif
- Routes upload: ⚠️ À créer si besoin

---

**Date:** 2024-02-01
**Version:** 1.0
**Status:** ✅ Documentation complète
