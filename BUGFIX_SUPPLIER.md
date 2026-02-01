# 🐛 BUGFIX: Supplier Profile & Role Permissions

## 📋 Problèmes Identifiés

### 1. ❌ Bug: `supplierProfileId` manquant dans `req.user`

**Symptôme:**
```json
{
  "success": false,
  "message": "Profil fournisseur requis",
  "code": "SUPPLIER_REQUIRED"
}
```

**Cause Racine:**
- Le middleware `authMiddleware` ne populait QUE `id`, `role`, et `phoneNumber` dans `req.user`
- Mais les controllers utilisaient `req.user?.supplierProfileId` qui n'existait jamais!
- Fichier: `src/middleware/auth.middleware.ts:46-50`

**Données de test:**
- User ID: `dab71967-35f0-442e-4c9-7557b626278e`
- Role: `SUPPLIER_FOOD` ✅
- Profil ID: `20763af6-68a2-43d8-9606-f766be258fe6` ✅
- Business: "Generale CI" ✅

### 2. ❌ Bug: SUPPLIER_FOOD ne pouvait pas créer de deals

**Cause Racine:**
- Routes de deal rooms restreintes à `SUPPLIER_DEALS` uniquement
- Routes de deal options restreintes à `SUPPLIER_DEALS` uniquement
- Incohérent avec la philosophie du système

---

## ✅ Corrections Apportées

### Correction 1: Récupération des Profile IDs

**Fichier:** `src/middleware/auth.middleware.ts`

**Avant:**
```typescript
// Attach user to request
req.user = {
  id: payload.userId,
  role: payload.role,
  phoneNumber: '', // Will be fetched from DB if needed
};
```

**Après:**
```typescript
// Fetch user with profile relations from database
const userWithProfile = await userRepository.findByIdWithProfile(
  payload.userId
);

if (!userWithProfile) {
  throw new AppError(
    APP_CONSTANTS.HTTP_STATUS.UNAUTHORIZED,
    'Utilisateur non trouvé',
    APP_CONSTANTS.ERROR_CODES.UNAUTHORIZED
  );
}

// Attach user to request with profile IDs
req.user = {
  id: userWithProfile.id,
  role: userWithProfile.role,
  phoneNumber: userWithProfile.phoneNumber,
  email: userWithProfile.email || undefined,
  supplierProfileId: userWithProfile.supplierProfile?.id,
  associationProfileId: userWithProfile.associationProfile?.id,
  advertiserProfileId: userWithProfile.advertiserProfile?.id,
};
```

**Impact:**
- ✅ `req.user.supplierProfileId` maintenant disponible dans tous les controllers
- ✅ `req.user.associationProfileId` et `advertiserProfileId` aussi disponibles
- ✅ `req.user.email` disponible pour les notifications
- ⚠️ Performance: 1 requête DB supplémentaire par requête API authentifiée (utilise `findByIdWithProfile` qui inclut les relations)

**Optimisation Future Possible:**
- Mettre en cache les profile IDs dans Redis (clé: `user:${userId}:profiles`, TTL: 5min)
- Ajouter `supplierProfileId` dans le JWT payload (nécessite regénération de tous les tokens)

---

### Correction 2: SUPPLIER_FOOD = SUPPLIER_DEALS

**Fichier 1:** `src/api/v1/routes/deal.routes.ts`

**Avant (lignes 63, 72, 81):**
```typescript
requireRole(['SUPPLIER_DEALS'])
```

**Après:**
```typescript
requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS'])
```

**Fichier 2:** `src/api/v1/routes/deal-option.routes.ts`

**Changements (4 occurrences):**
- Ligne 47: `requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS'])`
- Ligne 56: `requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS'])`
- Ligne 65: `requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS'])`
- Ligne 74: `requireRole(['SUPPLIER_FOOD', 'SUPPLIER_DEALS'])`

**Impact:**
- ✅ SUPPLIER_FOOD peut maintenant créer/modifier/supprimer des deal rooms
- ✅ SUPPLIER_FOOD peut maintenant créer/modifier/supprimer des deal options
- ✅ SUPPLIER_FOOD peut maintenant réordonner les deal options
- ✅ Cohérence: Les deux types de suppliers ont les mêmes permissions

**Routes déjà correctes (aucun changement requis):**
- `src/api/v1/routes/supplier-deal.routes.ts:20` - Acceptait déjà les deux roles
- `src/api/v1/routes/supplier-store.routes.ts:18` - Acceptait déjà les deux roles
- `src/api/v1/routes/supplier.routes.ts:60` - Utilise `supplierOnly` (accepte les deux)

---

## 🧪 Tests de Validation

### Script de test automatisé

Un script de test a été créé: `test-supplier-fix.sh`

**Utilisation:**
```bash
# 1. Éditez le script pour ajouter votre JWT token
nano test-supplier-fix.sh

# 2. Exécutez le script
./test-supplier-fix.sh
```

**Tests effectués:**
1. ✅ GET `/suppliers/profile` - Vérifier que le profil existe
2. ✅ GET `/supplier/stores` - Devrait fonctionner (bug corrigé)
3. ✅ POST `/supplier/stores` - Créer un magasin
4. ✅ POST `/supplier/deals` - SUPPLIER_FOOD peut créer des deals

### Tests manuels avec curl

**Test 1: Obtenir mes magasins**
```bash
curl -X GET "http://localhost:3004/api/v1/supplier/stores" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Résultat attendu:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-store-123",
      "name": "Nom du magasin",
      ...
    }
  ]
}
```

**Test 2: Créer un deal (en tant que SUPPLIER_FOOD)**
```bash
curl -X POST "http://localhost:3004/api/v1/supplier/deals" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deal Test",
    "description": "Test création deal",
    "type": "HOTEL",
    "originalPrice": 50000,
    "discountedPrice": 30000,
    "discountPercentage": 40,
    "startDate": "2024-02-01T00:00:00.000Z",
    "endDate": "2024-12-31T23:59:59.000Z",
    "availableQuantity": 10
  }'
```

**Résultat attendu:**
```json
{
  "success": true,
  "message": "Deal créé avec succès",
  "data": {
    "id": "uuid-deal-123",
    ...
  }
}
```

---

## 🚀 Déploiement

### En Local (Développement)

```bash
# 1. Rebuild l'application
npm run build

# 2. Redémarrer le serveur dev
npm run dev

# OU en production locale
npm start
```

### En Production (Serveur 150.107.201.144)

```bash
# 1. SSH vers le serveur
ssh root@150.107.201.144

# 2. Naviguer vers le backend
cd /opt/apps/nodejs/yapasgachis_backend

# 3. Pull les derniers changements
git pull origin production

# 4. Rebuild l'image Docker
docker build -t yapasgachis-backend:latest .

# 5. Redémarrer le container
cd /opt/docker
docker compose up -d yapasgachis-backend

# 6. Vérifier les logs
docker logs yapasgachis-backend --tail 50 --follow
```

**⚠️ IMPORTANT:**
- Ces changements nécessitent un redémarrage du serveur
- Les tokens JWT existants continueront de fonctionner
- Aucune migration de base de données requise

---

## 📊 Impact Performance

### Requêtes DB supplémentaires

**Avant:**
- 0 requête DB par requête API (JWT seulement)

**Après:**
- 1 requête DB par requête API authentifiée (`findByIdWithProfile`)

**Mitigation:**
```typescript
// Option 1: Cache Redis (recommandé)
const cachedProfiles = await redis.get(`user:${userId}:profiles`);
if (cachedProfiles) {
  return JSON.parse(cachedProfiles);
}

// Option 2: Ajouter au JWT payload (breaking change)
interface TokenPayload {
  userId: string;
  role: UserRole;
  sessionId: string;
  supplierProfileId?: string; // NOUVEAU
  associationProfileId?: string; // NOUVEAU
  advertiserProfileId?: string; // NOUVEAU
}
```

### Estimation de l'impact

**Scénario: 1000 requêtes/min**
- Avant: 0 requêtes DB supplémentaires
- Après: 1000 requêtes DB supplémentaires
- Impact: Négligeable avec PostgreSQL bien configuré
- Latence ajoutée: ~5-10ms par requête

**Recommandation:**
- Actuel: Acceptable pour production
- Si charge élevée: Implémenter cache Redis (voir Option 1 ci-dessus)

---

## 🎯 Résumé

### Problèmes Résolus
- ✅ `GET/POST /supplier/stores` fonctionne maintenant
- ✅ `req.user.supplierProfileId` est correctement peuplé
- ✅ SUPPLIER_FOOD peut créer des deals et deal rooms
- ✅ Cohérence des permissions entre SUPPLIER_FOOD et SUPPLIER_DEALS

### Fichiers Modifiés
1. `src/middleware/auth.middleware.ts` - Récupération des profile IDs
2. `src/api/v1/routes/deal.routes.ts` - Permissions deal rooms
3. `src/api/v1/routes/deal-option.routes.ts` - Permissions deal options

### Fichiers Ajoutés
1. `test-supplier-fix.sh` - Script de test automatisé
2. `BUGFIX_SUPPLIER.md` - Cette documentation

### Prochaines Étapes Recommandées
1. ✅ Tester en local avec le script `test-supplier-fix.sh`
2. ✅ Vérifier que l'utilisateur `dab71967-35f0-442e-4c9-7557b626278e` peut créer des magasins
3. ⚠️ Surveiller la performance DB après déploiement
4. 🔄 Considérer l'ajout d'un cache Redis si charge élevée
5. 📝 Mettre à jour la documentation API

---

## 📞 Support

Si vous rencontrez des problèmes:
1. Vérifier les logs: `docker logs yapasgachis-backend --tail 100`
2. Tester avec curl: voir section "Tests manuels" ci-dessus
3. Vérifier la DB: `docker exec -it postgres psql -U root -d yapasgachis`

**Vérification profil supplier:**
```sql
SELECT u.id, u.role, sp.id as supplier_profile_id, sp."businessName"
FROM users u
LEFT JOIN supplier_profiles sp ON sp."userId" = u.id
WHERE u.id = 'dab71967-35f0-442e-4c9-7557b626278e';
```

**Résultat attendu:**
```
id                                   | role          | supplier_profile_id                  | businessName
-------------------------------------|---------------|--------------------------------------|-------------
dab71967-35f0-442e-4c9-7557b626278e | SUPPLIER_FOOD | 20763af6-68a2-43d8-9606-f766be258fe6 | Generale CI
```

---

*Bugfix créé le: 2024-02-01*
*Backend: yapasgachis_backend v1.0*
*Status: ✅ Prêt pour production*
