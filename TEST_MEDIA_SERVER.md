# Test du Media Server

## Status actuel

✅ **Media Server opérationnel**: https://media.yapasgachis.com
✅ **Health Check**: OK
✅ **Stockage**: 0 fichiers (prêt à recevoir)

## Test rapide via cURL

### 1. Health Check
```bash
curl -H "x-api-key: yapasgachis_media_2024_secure_key_xK9mP2nQ" \
  https://media.yapasgachis.com/health
```

### 2. Upload une image de test
```bash
curl -X POST \
  -H "x-api-key: yapasgachis_media_2024_secure_key_xK9mP2nQ" \
  -F "file=@/path/to/image.jpg" \
  https://media.yapasgachis.com/upload/products
```

### 3. Lister les fichiers
```bash
curl -H "x-api-key: yapasgachis_media_2024_secure_key_xK9mP2nQ" \
  https://media.yapasgachis.com/list/products
```

### 4. Voir les stats
```bash
curl -H "x-api-key: yapasgachis_media_2024_secure_key_xK9mP2nQ" \
  https://media.yapasgachis.com/stats
```

### 5. Supprimer un fichier
```bash
curl -X DELETE \
  -H "x-api-key: yapasgachis_media_2024_secure_key_xK9mP2nQ" \
  https://media.yapasgachis.com/delete/products/filename.jpg
```

## Test depuis le backend

### Option 1: Via l'API de produits (recommandé)

1. Créer un produit via Postman/Insomnia
2. Upload des images via `POST /api/v1/products/:id/images`

```http
POST https://api.yapasgachis.com/api/v1/products/:productId/images
Headers:
  Authorization: Bearer YOUR_JWT_TOKEN
Body: multipart/form-data
  - images[]: File[] (1-10 images)
```

### Option 2: Test direct du service

Créez un fichier `test-media-upload.ts` :

```typescript
import mediaServerService from '@/infrastructure/storage/media-server.service';
import fs from 'fs';

async function testMediaUpload() {
  try {
    // Lire une image de test
    const buffer = fs.readFileSync('./test-image.jpg');

    // Upload
    console.log('Uploading image...');
    const result = await mediaServerService.uploadFile(buffer, {
      folder: 'products',
      filename: 'test-product.jpg',
      mimetype: 'image/jpeg'
    });

    console.log('✅ Upload réussi!');
    console.log('URL:', result.url);
    console.log('Thumbnail:', result.thumbnailUrl);
    console.log('Filename:', result.filename);
    console.log('Size:', result.size, 'bytes');

    // Lister les fichiers
    console.log('\nListing files...');
    const files = await mediaServerService.listFiles('products');
    console.log(`✅ ${files.length} fichiers trouvés`);

    // Stats
    console.log('\nStorage stats...');
    const stats = await mediaServerService.getStats();
    console.log('✅ Total:', stats.total.sizeFormatted);

    // Health check
    console.log('\nHealth check...');
    const isHealthy = await mediaServerService.healthCheck();
    console.log('✅ Health:', isHealthy ? 'OK' : 'FAILED');

    // Cleanup (optional)
    const fileInfo = mediaServerService.extractFileInfo(result.url);
    if (fileInfo) {
      await mediaServerService.deleteFile(fileInfo.folder, fileInfo.filename);
      console.log('✅ Fichier supprimé');
    }
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

testMediaUpload();
```

Exécuter:
```bash
npx ts-node test-media-upload.ts
```

## Vérification de l'intégration

### 1. Configuration
```bash
# Vérifier que les variables sont définies
grep MEDIA_SERVER .env
```

Devrait afficher:
```
MEDIA_SERVER_BASE_URL=https://media.yapasgachis.com
MEDIA_SERVER_API_KEY=yapasgachis_media_2024_secure_key_xK9mP2nQ
```

### 2. TypeScript compilation
```bash
npm run type-check
```
Devrait passer sans erreur.

### 3. Démarrer le serveur
```bash
npm run dev
```

### 4. Test via Postman

**Collection Postman:**

1. **Login**
```http
POST https://api.yapasgachis.com/api/v1/auth/phone/login
Body:
{
  "phone": "+221XXXXXXXXX",
  "password": "your-password"
}
```

2. **Créer un produit**
```http
POST https://api.yapasgachis.com/api/v1/products
Headers:
  Authorization: Bearer {ACCESS_TOKEN}
Body:
{
  "name": "Produit Test",
  "category": "BAKERY",
  "originalPrice": 5000,
  "price": 3000,
  "quantity": 10,
  "expiresAt": "2024-02-15T18:00:00Z"
}
```

3. **Upload images**
```http
POST https://api.yapasgachis.com/api/v1/products/{PRODUCT_ID}/images
Headers:
  Authorization: Bearer {ACCESS_TOKEN}
Body: form-data
  - images: [File1, File2, File3]
```

Réponse attendue:
```json
{
  "success": true,
  "message": "Images téléchargées avec succès",
  "data": {
    "imageUrls": [
      "https://media.yapasgachis.com/uploads/products/uuid1.jpg",
      "https://media.yapasgachis.com/uploads/products/uuid2.jpg",
      "https://media.yapasgachis.com/uploads/products/uuid3.jpg"
    ],
    "count": 3
  }
}
```

4. **Vérifier le produit**
```http
GET https://api.yapasgachis.com/api/v1/products/{PRODUCT_ID}
```

Les images devraient être dans le champ `images`.

5. **Supprimer une image**
```http
DELETE https://api.yapasgachis.com/api/v1/products/{PRODUCT_ID}/images
Headers:
  Authorization: Bearer {ACCESS_TOKEN}
Body:
{
  "imageUrl": "https://media.yapasgachis.com/uploads/products/uuid1.jpg"
}
```

## Troubleshooting

### Erreur: "Media Server service initialized" n'apparaît pas dans les logs

Vérifiez que le service est bien importé quelque part. Ajoutez dans `src/index.ts`:

```typescript
import mediaServerService from '@/infrastructure/storage/media-server.service';
```

### Erreur: Cannot find module 'form-data'

Installez la dépendance:
```bash
npm install form-data
npm install -D @types/form-data
```

### Erreur: 401 Unauthorized

Vérifiez que l'API key est correcte dans `.env`.

### Erreur: ECONNREFUSED

Le media server n'est pas accessible. Vérifiez:
- https://media.yapasgachis.com est en ligne
- Le firewall n'bloque pas les connexions

## Prochaines étapes

1. ✅ Tester l'upload d'images via l'API
2. ✅ Vérifier que les images s'affichent correctement
3. ✅ Tester la suppression d'images
4. 📝 Migrer les images existantes depuis Cloudinary (optionnel)
5. 🚀 Déployer en production avec la nouvelle configuration

## Production Deployment

1. SSH sur le serveur:
```bash
ssh root@150.107.201.144
```

2. Naviguer vers le backend:
```bash
cd /opt/apps/nodejs/yapasgachis_backend
```

3. Éditer le .env:
```bash
nano .env
```

Ajouter:
```env
MEDIA_SERVER_BASE_URL=https://media.yapasgachis.com
MEDIA_SERVER_API_KEY=yapasgachis_media_2024_secure_key_xK9mP2nQ
```

4. Rebuild et restart:
```bash
docker build -t yapasgachis-backend:latest .
cd /opt/docker
docker compose up -d yapasgachis-backend
docker logs yapasgachis-backend --tail 50
```

5. Vérifier les logs pour "Media Server service initialized"
