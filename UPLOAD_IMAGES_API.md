# 📸 API Upload d'Images - Documentation Complète

## ✅ RÉPONSE : Oui, le backend a des routes d'upload!

Le backend utilise **O2Switch Media Server** pour stocker les images. Les fichiers sont uploadés via le backend (pas directement depuis le frontend).

---

## 🎯 Routes d'Upload Disponibles

### 1. Upload Images de Produits ✅ (Existant)

**Route:** `POST /api/v1/products/:productId/images`

**Multipart Fields:** `images` (jusqu'à 10 fichiers, max 5MB chacun)

**Exemple:**
```bash
curl -X POST "https://api.yapasgachis.com/api/v1/products/PRODUCT_ID/images" \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "images=@photo1.jpg" \
  -F "images=@photo2.jpg" \
  -F "images=@photo3.jpg"
```

**Response:**
```json
{
  "success": true,
  "message": "Images téléchargées avec succès",
  "data": {
    "imageUrls": [
      "https://media.yapasgachis.com/products/photo1_123.jpg",
      "https://media.yapasgachis.com/products/photo2_456.jpg",
      "https://media.yapasgachis.com/products/photo3_789.jpg"
    ]
  }
}
```

---

### 2. Upload Images de Magasins (Stores) 🆕 (Nouveau!)

**Route:** `POST /api/v1/supplier/stores/:storeId/images`

**Multipart Fields:** `images` (jusqu'à 10 fichiers, max 5MB chacun)

**Exemple:**
```bash
curl -X POST "https://api.yapasgachis.com/api/v1/supplier/stores/STORE_ID/images" \
  -H "Authorization: Bearer YOUR_JWT" \
  -F "images=@logo.jpg" \
  -F "images=@facade.jpg" \
  -F "images=@interieur.jpg"
```

**Response:**
```json
{
  "success": true,
  "message": "Images téléchargées avec succès",
  "data": {
    "imageUrls": [
      "https://media.yapasgachis.com/suppliers/logo_123.jpg",
      "https://media.yapasgachis.com/suppliers/facade_456.jpg",
      "https://media.yapasgachis.com/suppliers/interieur_789.jpg"
    ]
  }
}
```

---

### 3. Supprimer une Image de Magasin 🆕 (Nouveau!)

**Route:** `DELETE /api/v1/supplier/stores/:storeId/images`

**Body:**
```json
{
  "imageUrl": "https://media.yapasgachis.com/suppliers/logo_123.jpg"
}
```

**Exemple:**
```bash
curl -X DELETE "https://api.yapasgachis.com/api/v1/supplier/stores/STORE_ID/images" \
  -H "Authorization: Bearer YOUR_JWT" \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://media.yapasgachis.com/suppliers/logo_123.jpg"}'
```

**Response:**
```json
{
  "success": true,
  "message": "Image supprimée avec succès"
}
```

---

## 🔧 Comment ça fonctionne?

### Workflow Backend

```
1. Frontend → Envoie fichier(s) via multipart/form-data
                ↓
2. Backend → Middleware Multer reçoit les fichiers
                ↓
3. Backend → Stocke en mémoire (buffer)
                ↓
4. Backend → Appelle MediaServerService.uploadMultipleFiles()
                ↓
5. O2Switch Media Server → Reçoit et stocke les fichiers
                ↓
6. O2Switch → Retourne les URLs
                ↓
7. Backend → Stocke les URLs dans la DB (champ JSON)
                ↓
8. Backend → Retourne les URLs au frontend
```

### Avantages de cette Approche

✅ **Sécurité:** Le frontend ne connaît pas l'API key O2Switch
✅ **Validation:** Le backend valide les fichiers (type, taille)
✅ **Authentification:** Seuls les utilisateurs authentifiés peuvent upload
✅ **Authorization:** Seul le propriétaire du magasin peut uploader
✅ **Logs:** Toutes les opérations sont loggées
✅ **Error Handling:** Gestion centralisée des erreurs

---

## 📋 Formats de Fichiers Acceptés

### Images
- `image/jpeg` (JPG/JPEG)
- `image/png` (PNG)
- `image/webp` (WebP)
- `image/gif` (GIF)

### Limites
- **Taille par fichier:** 5MB maximum
- **Nombre de fichiers:** 10 maximum par requête

---

## 🎨 Utilisation depuis React Native / Expo

### Upload d'images de magasin

```typescript
import * as ImagePicker from 'expo-image-picker';

const uploadStoreImages = async (storeId: string) => {
  // 1. Sélectionner les images
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    quality: 0.8,
  });

  if (result.canceled) return;

  // 2. Créer le FormData
  const formData = new FormData();
  result.assets.forEach((asset, index) => {
    formData.append('images', {
      uri: asset.uri,
      type: 'image/jpeg',
      name: `store_${index}.jpg`,
    } as any);
  });

  // 3. Envoyer au backend
  const response = await fetch(
    `https://api.yapasgachis.com/api/v1/supplier/stores/${storeId}/images`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    }
  );

  const data = await response.json();

  if (data.success) {
    console.log('Images uploadées:', data.data.imageUrls);
    // Les URLs sont maintenant disponibles!
  }
};
```

### Afficher les images du magasin

```typescript
import { Image } from 'react-native';

const StoreImages = ({ store }) => {
  const images = store.images || [];

  return (
    <View>
      {images.map((imageUrl, index) => (
        <Image
          key={index}
          source={{ uri: imageUrl }}
          style={{ width: 200, height: 200 }}
          resizeMode="cover"
        />
      ))}
    </View>
  );
};
```

---

## 🔐 Authentification Requise

Toutes les routes d'upload nécessitent:

1. **JWT Token** dans le header `Authorization: Bearer <token>`
2. **Role SUPPLIER** (SUPPLIER_FOOD ou SUPPLIER_DEALS)
3. **Profil Supplier** créé (supplierProfileId dans le token)

---

## 📊 Stockage des Images dans la DB

### SupplierStore Model

```prisma
model SupplierStore {
  id     String @id @default(uuid())
  images Json?  @default("[]") // Array d'URLs
  ...
}
```

**Format JSON:**
```json
{
  "images": [
    "https://media.yapasgachis.com/suppliers/logo.jpg",
    "https://media.yapasgachis.com/suppliers/facade.jpg",
    "https://media.yapasgachis.com/suppliers/interieur.jpg"
  ]
}
```

---

## 🛠️ Autres Routes d'Upload Disponibles

### Upload Avatar (User Profile)

**Route:** À créer (pattern similaire)
**Middleware:** `uploadAvatar` (max 2MB)

### Upload Banner (Supplier Profile)

**Route:** À créer (pattern similaire)
**Middleware:** `uploadBanner` (max 5MB)

### Upload KYC Documents

**Route:** `PUT /api/v1/suppliers/profile`
**Middleware:** `uploadKycDocuments`
**Fields:** `idCardFront`, `idCardBack`, `selfie`

---

## 📝 Fichiers Modifiés (Nouvelles Routes)

1. **Routes:** [src/api/v1/routes/supplier-store.routes.ts](src/api/v1/routes/supplier-store.routes.ts)
   - Ajouté: `POST /:storeId/images` (upload)
   - Ajouté: `DELETE /:storeId/images` (delete)

2. **Controller:** [src/api/v1/controllers/supplier-store.controller.ts](src/api/v1/controllers/supplier-store.controller.ts)
   - Ajouté: `uploadImages()` method
   - Ajouté: `deleteImage()` method

3. **Service:** [src/core/services/supplier-store.service.ts](src/core/services/supplier-store.service.ts)
   - Ajouté: `uploadImages()` method
   - Ajouté: `deleteImage()` method

---

## ✅ Tests

### Test Upload

```bash
# 1. Créer un store
STORE_ID=$(curl -X POST "https://api.yapasgachis.com/api/v1/supplier/stores" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Store","address":"123 Rue Test","city":"Abidjan",...}' \
  | jq -r '.data.id')

# 2. Upload images
curl -X POST "https://api.yapasgachis.com/api/v1/supplier/stores/$STORE_ID/images" \
  -H "Authorization: Bearer $JWT" \
  -F "images=@logo.jpg" \
  -F "images=@photo.jpg"

# 3. Vérifier
curl -X GET "https://api.yapasgachis.com/api/v1/supplier/stores" \
  -H "Authorization: Bearer $JWT" \
  | jq '.data[0].images'
```

---

## 🚀 Déploiement

Les changements sont **prêts à être déployés**:

```bash
# 1. Commit et push
git add .
git commit -m "feat: Add image upload routes for supplier stores"
git push origin production

# 2. Déployer sur serveur
ssh root@150.107.201.144
cd /opt/apps/nodejs/yapasgachis_backend
git pull origin production
docker build -t yapasgachis-backend:latest .
cd /opt/docker
docker compose up -d yapasgachis-backend
```

---

## 🎯 Résumé

| Feature | Status | Route |
|---------|--------|-------|
| **Upload images produits** | ✅ Existant | `POST /products/:id/images` |
| **Upload images stores** | 🆕 Nouveau | `POST /supplier/stores/:id/images` |
| **Supprimer image store** | 🆕 Nouveau | `DELETE /supplier/stores/:id/images` |
| **Upload KYC docs** | ✅ Existant | `PUT /suppliers/profile` |
| **Media Server (O2Switch)** | ✅ Configuré | `https://media.yapasgachis.com` |

---

**Date:** 2024-02-01
**Version:** 1.0
**Status:** ✅ Prêt pour production
