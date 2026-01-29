# Configuration du Rate Limiting

## Vue d'ensemble

Le système de rate limiting a été amélioré pour différencier les environnements et types de requêtes, offrant une expérience optimale en développement tout en maintenant la sécurité en production.

## Limiters Disponibles

### 1. `smartLimiter` (Recommandé - Utilisé par défaut)

Applique automatiquement le bon limiter selon la méthode HTTP:
- **GET, HEAD, OPTIONS** → `readLimiter`
- **POST, PUT, PATCH, DELETE** → `writeLimiter`

### 2. `readLimiter` - Lectures (GET)

Pour les endpoints de lecture seule:

| Environnement | Limite | Fenêtre |
|---------------|--------|---------|
| **Développement** | 2000 requêtes | 15 minutes |
| **Production** | 500 requêtes | 15 minutes |

**Utilisation:** Consultation de produits, listes, profils, reviews, etc.

### 3. `writeLimiter` - Écritures (POST/PUT/DELETE)

Pour les endpoints de modification:

| Environnement | Limite | Fenêtre |
|---------------|--------|---------|
| **Développement** | 500 requêtes | 15 minutes |
| **Production** | 100 requêtes | 15 minutes |

**Utilisation:** Création, mise à jour, suppression de ressources.

### 4. `authLimiter` - Authentification

Pour les endpoints d'authentification sensibles:

| Environnement | Limite | Fenêtre |
|---------------|--------|---------|
| **Développement** | 50 requêtes | 15 minutes |
| **Production** | 5 requêtes | 15 minutes |

**Utilisation:** Login, register, password reset, OTP.

**Note:** `skipSuccessfulRequests: true` → Seules les tentatives échouées comptent.

### 5. `uploadLimiter` - Uploads de fichiers

Pour les endpoints de téléchargement de fichiers:

| Environnement | Limite | Fenêtre |
|---------------|--------|---------|
| **Développement** | 100 uploads | 15 minutes |
| **Production** | 10 uploads | 15 minutes |

### 6. `paymentLimiter` - Paiements

Pour les opérations de paiement:

| Environnement | Limite | Fenêtre |
|---------------|--------|---------|
| **Développement** | 200 requêtes | 1 heure |
| **Production** | 20 requêtes | 1 heure |

### 7. `apiLimiter` - Général (Legacy)

Limiter général (non recommandé, utiliser `smartLimiter`):

| Environnement | Limite | Fenêtre |
|---------------|--------|---------|
| **Développement** | 1000 requêtes | 15 minutes |
| **Production** | 100 requêtes | 15 minutes |

## Configuration dans app.ts

```typescript
// Smart rate limiting appliqué globalement
app.use(`/api/${config.app.apiVersion}`, smartLimiter);

// Routes spécifiques avec authLimiter
app.use(`/api/${config.app.apiVersion}/auth`, authLimiter, authRoutes);
```

## Utilisation dans les Routes

### Routes de lecture (GET)
```typescript
import { readLimiter } from '@/middleware/rate-limit.middleware';

// Option 1: Utiliser smartLimiter (appliqué globalement)
router.get('/products', productController.list);

// Option 2: Override explicite
router.get('/products', readLimiter, productController.list);
```

### Routes d'authentification
```typescript
import { authLimiter } from '@/middleware/rate-limit.middleware';

router.post('/login', authLimiter, authController.login);
router.post('/register', authLimiter, authController.register);
```

### Routes de paiement
```typescript
import { paymentLimiter } from '@/middleware/rate-limit.middleware';

router.post('/checkout', paymentLimiter, orderController.checkout);
```

### Routes d'upload
```typescript
import { uploadLimiter } from '@/middleware/rate-limit.middleware';

router.post('/upload', uploadLimiter, uploadController.single);
```

## Réponses de Rate Limiting

Quand la limite est atteinte, l'API renvoie:

```json
{
  "success": false,
  "message": "Trop de requêtes, veuillez réessayer plus tard",
  "code": "TOO_MANY_REQUESTS"
}
```

**Headers de réponse:**
- `RateLimit-Limit` - Limite maximale
- `RateLimit-Remaining` - Requêtes restantes
- `RateLimit-Reset` - Timestamp de reset

## Variables d'environnement

```env
# Rate Limiting Configuration
RATE_LIMIT_WINDOW_MS=900000          # 15 minutes par défaut
RATE_LIMIT_MAX_REQUESTS=100          # Production default
AUTH_RATE_LIMIT_MAX=5                # Production auth limit
```

## Environnements

Le système détecte automatiquement l'environnement via `NODE_ENV`:

- **test** → Rate limiting complètement désactivé
- **development** → Limites très élevées (2000 GET, 500 POST, 50 auth)
- **production** → Limites strictes (500 GET, 100 POST, 5 auth)

## Résolution de problèmes

### Problème: "Trop de requêtes" pendant le développement

**Solution:** Vérifier que `NODE_ENV=development` est bien configuré.

```bash
# Vérifier l'environnement
echo $NODE_ENV

# Si vide, ajouter dans .env
NODE_ENV=development
```

### Problème: Navigation rapide entre produits bloquée

**Solution:** Le `smartLimiter` permet maintenant 2000 requêtes GET/15min en dev, ce qui devrait être largement suffisant.

### Problème: Tests qui échouent à cause du rate limiting

**Solution:** Les tests avec `NODE_ENV=test` bypass automatiquement le rate limiting.

## Métriques et Monitoring

Les rate limits sont tracés dans les logs avec le middleware de logging:

```typescript
[warn]: GET /api/v1/products/xxx - 429 {
  "error": "Trop de requêtes, veuillez réessayer plus tard"
}
```

## Recommandations

1. **Utiliser `smartLimiter` par défaut** - Il s'adapte automatiquement
2. **Appliquer `authLimiter` sur les routes sensibles** - Prévient le brute-force
3. **Utiliser `paymentLimiter` pour les paiements** - Prévient les abus
4. **Monitorer les logs 429** - Identifier les problèmes de rate limiting
5. **Ajuster les limites selon les besoins** - Via variables d'environnement

## Future améliorations

- [ ] Rate limiting par utilisateur authentifié (plus permissif)
- [ ] Rate limiting différencié par rôle (ADMIN > SUPPLIER > CLIENT)
- [ ] Système de tokens/credits pour utilisateurs premium
- [ ] Dashboard de monitoring des rate limits
- [ ] Whitelist IP pour partenaires API
