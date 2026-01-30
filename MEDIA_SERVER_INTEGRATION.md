# Intégration Media Server YapaGachis

## Vue d'ensemble

Le backend YapaGachis utilise maintenant un **microservice de média dédié** hébergé sur **O2Switch** avec stockage illimité au lieu de Cloudinary.

- **URL du service**: https://media.yapasgachis.com
- **Stockage**: Illimité (hébergement O2Switch)
- **Coût**: Gratuit (inclus dans l'abonnement O2Switch)

## Architecture

```
Backend API (api.yapasgachis.com)
       ↓
Media Server Service (src/infrastructure/storage/media-server.service.ts)
       ↓ HTTP + API Key
Media Server (media.yapasgachis.com)
       ↓
Stockage O2Switch (illimité)
```

## Configuration

### Variables d'environnement

Ajoutez ces variables dans votre `.env` :

```env
# Media Server (O2Switch - Stockage illimité)
MEDIA_SERVER_BASE_URL=https://media.yapasgachis.com
MEDIA_SERVER_API_KEY=yapasgachis_media_2024_secure_key_xK9mP2nQ
```

### Production

Sur le serveur de production (`/opt/apps/nodejs/yapasgachis_backend/.env`), ajoutez les mêmes variables.

## Endpoints du Media Server

### 1. Upload single file
```http
POST /upload/:folder
Headers: x-api-key: {API_KEY}
Body: multipart/form-data
  - file: File

Folders disponibles: products, users, suppliers, associations, deals, misc

Response:
{
  "success": true,
  "data": {
    "url": "https://media.yapasgachis.com/uploads/products/uuid.jpg",
    "thumbnailUrl": "https://media.yapasgachis.com/uploads/products/thumb_uuid.jpg",
    "filename": "uuid.jpg",
    "folder": "products",
    "mimetype": "image/jpeg",
    "size": 123456
  }
}
```

### 2. Upload multiple files
```http
POST /upload/:folder/multiple
Headers: x-api-key: {API_KEY}
Body: multipart/form-data
  - files[]: File[] (max 10)

Response:
{
  "success": true,
  "data": [
    {
      "url": "https://media.yapasgachis.com/uploads/products/uuid1.jpg",
      "thumbnailUrl": "...",
      "filename": "uuid1.jpg",
      "mimetype": "image/jpeg",
      "size": 123456
    }
  ]
}
```

### 3. Delete file
```http
DELETE /delete/:folder/:filename
Headers: x-api-key: {API_KEY}

Response:
{
  "success": true,
  "message": "Fichier supprimé"
}
```

### 4. List files
```http
GET /list/:folder
Headers: x-api-key: {API_KEY}

Response:
{
  "success": true,
  "data": [
    {
      "filename": "uuid.jpg",
      "url": "https://media.yapasgachis.com/uploads/products/uuid.jpg",
      "size": 123456,
      "createdAt": "2024-01-30T12:00:00Z"
    }
  ]
}
```

### 5. Storage stats
```http
GET /stats
Headers: x-api-key: {API_KEY}

Response:
{
  "success": true,
  "data": {
    "folders": {
      "products": {
        "files": 150,
        "size": 52428800,
        "sizeFormatted": "50 MB"
      }
    },
    "total": {
      "files": 300,
      "size": 104857600,
      "sizeFormatted": "100 MB"
    }
  }
}
```

### 6. Health check
```http
GET /health

Response:
{
  "success": true,
  "service": "YapaGachis Media Server",
  "timestamp": "2024-01-30T12:00:00Z",
  "storage": {
    "folders": ["products", "users", "suppliers", "associations", "deals", "misc"],
    "path": "/path/to/uploads"
  }
}
```

## Utilisation dans le code

### Upload d'images de produit

```typescript
import mediaServerService from '@/infrastructure/storage/media-server.service';

// Upload single
const result = await mediaServerService.uploadFile(buffer, {
  folder: 'products',
  filename: 'product-image.jpg',
  mimetype: 'image/jpeg'
});

console.log(result.url); // https://media.yapasgachis.com/uploads/products/uuid.jpg

// Upload multiple
const files = [
  { buffer: buffer1, filename: 'image1.jpg', mimetype: 'image/jpeg' },
  { buffer: buffer2, filename: 'image2.jpg', mimetype: 'image/jpeg' }
];

const results = await mediaServerService.uploadMultipleFiles(files, 'products');
```

### Suppression d'images

```typescript
// Delete single
const imageUrl = 'https://media.yapasgachis.com/uploads/products/uuid.jpg';
const fileInfo = mediaServerService.extractFileInfo(imageUrl);

if (fileInfo) {
  await mediaServerService.deleteFile(fileInfo.folder, fileInfo.filename);
}

// Delete multiple
const files = [
  { folder: 'products', filename: 'uuid1.jpg' },
  { folder: 'products', filename: 'uuid2.jpg' }
];

const { deleted, failed } = await mediaServerService.deleteMultipleFiles(files);
console.log(`${deleted} supprimés, ${failed} échecs`);
```

### Liste des fichiers

```typescript
const files = await mediaServerService.listFiles('products');

files.forEach(file => {
  console.log(`${file.filename} - ${file.size} bytes - ${file.url}`);
});
```

### Statistiques de stockage

```typescript
const stats = await mediaServerService.getStats();

console.log(`Total: ${stats.total.files} fichiers (${stats.total.sizeFormatted})`);
console.log(`Products: ${stats.folders.products.files} fichiers`);
```

## Optimisations automatiques

Le media server optimise automatiquement les images :

1. **Redimensionnement**: Max 1200x1200px
2. **Compression**: Qualité JPEG 85%
3. **Miniatures**: 300x300px (qualité 70%)
4. **Format**: Conversion automatique en JPEG (sauf GIF)

## Limites

- **Taille max par fichier**: 10 MB
- **Upload multiple**: Max 10 fichiers à la fois
- **Types acceptés**: JPEG, PNG, WebP, GIF, PDF

## Sécurité

- **Authentification**: API Key requise dans header `x-api-key`
- **CORS**: Configuré pour autoriser api.yapasgachis.com
- **Validation**: Types de fichiers et taille vérifiés

## Fichiers modifiés

### Nouveaux fichiers
- `src/infrastructure/storage/media-server.service.ts` - Service client pour le media server

### Fichiers modifiés
- `src/config/index.ts` - Ajout configuration mediaServer
- `src/core/services/product.service.ts` - Utilise mediaServerService au lieu de cloudinaryService
- `.env` - Ajout MEDIA_SERVER_BASE_URL et MEDIA_SERVER_API_KEY

## Migration depuis Cloudinary

Si vous avez des images existantes sur Cloudinary :

1. Les nouvelles images seront uploadées sur le media server
2. Les anciennes URLs Cloudinary continueront de fonctionner
3. Pour migrer complètement, créez un script pour télécharger et re-uploader les images

## Health Check

Le service media-server est inclus dans le health check du backend :

```typescript
const isHealthy = await mediaServerService.healthCheck();
```

## Dépannage

### Erreur 401 Unauthorized
- Vérifiez que `MEDIA_SERVER_API_KEY` est correctement configuré
- Vérifiez que l'API key du media server n'a pas changé

### Erreur de timeout
- Le media server prend max 30 secondes pour répondre
- Vérifiez que https://media.yapasgachis.com est accessible

### Upload échoue
- Vérifiez la taille du fichier (max 10MB)
- Vérifiez le type de fichier (images/PDF uniquement)
- Vérifiez les logs du media server

## Logs

Les opérations sont loggées avec Winston :

```
INFO: Media Server service initialized baseUrl=https://media.yapasgachis.com
INFO: File uploaded to media server folder=products filename=uuid.jpg
INFO: Multiple files uploaded to media server folder=products count=5
INFO: File deleted from media server folder=products filename=uuid.jpg
ERROR: Media server upload failed status=500 message=...
```

## Avantages vs Cloudinary

✅ **Stockage illimité** (vs limité chez Cloudinary)
✅ **Gratuit** (vs payant chez Cloudinary)
✅ **Contrôle total** sur les fichiers
✅ **Pas de vendor lock-in**
✅ **URL personnalisée** (media.yapasgachis.com)
✅ **Optimisation automatique** des images

## Support

Pour toute question, vérifiez :
1. Les logs du backend : `/opt/apps/nodejs/yapasgachis_backend/logs/`
2. Les logs du media server (via O2Switch)
3. La documentation du media server dans son repo
