# Système de Parrainage - YaPasGachis

## ✅ Implémentation Complète

Le système de parrainage est maintenant **100% fonctionnel** pour tous les utilisateurs (nouveaux et existants).

---

## 🎯 Ce qui a été fait

### 1. Tables de Base de Données

✅ **Tables créées** dans [schema.prisma](src/infrastructure/database/prisma/schema.prisma:1964-2025):

- **`ReferralCode`** - Codes de parrainage des utilisateurs
  - `code` : Le code unique (ex: "KEVI7RE8")
  - `userId` : Propriétaire du code
  - `timesUsed` : Nombre d'utilisations
  - `maxUses` : Limite d'utilisations (optionnel)
  - `isActive` : Code actif/désactivé
  - `expiresAt` : Date d'expiration (optionnel)

- **`Referral`** - Historique des parrainages
  - `referrerId` : L'utilisateur qui parraine
  - `referredUserId` : L'utilisateur parrainé
  - `referralCodeId` : Le code utilisé
  - `status` : PENDING, COMPLETED, REWARDED, EXPIRED
  - `rewardEarned` : Récompense gagnée

### 2. Création Automatique à l'Inscription

✅ **Codes générés automatiquement** pour :
- Inscription par téléphone/email → [auth.service.ts:248-260](src/core/services/auth.service.ts:248-260)
- Inscription via Google OAuth → [auth.service.ts:829-842](src/core/services/auth.service.ts:829-842)

Le code est généré basé sur le prénom + caractères aléatoires (ex: "KEVI7RE8")

### 3. Codes pour les Comptes Existants

✅ **Script de migration exécuté** :
```bash
npx ts-node src/infrastructure/database/prisma/scripts/generate-missing-referral-codes.ts
```

**Résultat** : 26 codes créés pour tous les utilisateurs existants ✅

---

## 📡 API Endpoints

### Récupérer mon/mes code(s) de parrainage

```http
GET /api/v1/referrals/my-codes
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "codes": [
      {
        "id": "uuid",
        "code": "KEVI7RE8",
        "shareLink": "https://yapasgachis.com/invite/KEVI7RE8",
        "timesUsed": 0,
        "maxUses": null,
        "isActive": true,
        "expiresAt": null,
        "createdAt": "2026-01-26T..."
      }
    ]
  }
}
```

### Créer un code personnalisé

```http
POST /api/v1/referrals/code
Authorization: Bearer <token>
Content-Type: application/json

{
  "customCode": "MONAMIE",
  "maxUses": 10,
  "expiresAt": "2026-12-31T23:59:59Z"
}
```

### Utiliser un code de parrainage

```http
POST /api/v1/referrals/use
Authorization: Bearer <token>
Content-Type: application/json

{
  "code": "KEVI7RE8"
}
```

**Réponse :**
```json
{
  "success": true,
  "message": "Code de parrainage appliqué avec succès",
  "data": {
    "referral": {
      "id": "uuid",
      "referrerId": "uuid",
      "referredUserId": "uuid",
      "status": "PENDING",
      "createdAt": "2026-01-26T..."
    }
  }
}
```

### Statistiques de parrainage

```http
GET /api/v1/referrals/stats
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "totalReferrals": 5,
    "pendingReferrals": 2,
    "completedReferrals": 2,
    "rewardedReferrals": 1,
    "totalRewardsEarned": 200,
    "referralCodes": [...]
  }
}
```

### Historique des parrainages

```http
GET /api/v1/referrals/history?page=1&limit=20&status=COMPLETED
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "referrals": [
      {
        "id": "uuid",
        "referralCode": "KEVI7RE8",
        "referredUser": {
          "id": "uuid",
          "firstName": "Jean",
          "lastName": "Kouassi",
          "avatar": "..."
        },
        "status": "COMPLETED",
        "rewardEarned": 200,
        "completedAt": "2026-01-26T...",
        "createdAt": "2026-01-25T..."
      }
    ],
    "total": 5,
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalPages": 1
    }
  }
}
```

### Valider un code (public)

```http
GET /api/v1/referrals/validate/KEVI7RE8
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "referrer": {
      "id": "uuid",
      "firstName": "Kevine",
      "lastName": "Ghossoub",
      "avatar": "..."
    }
  }
}
```

### Modifier un code

```http
PATCH /api/v1/referrals/code/:codeId
Authorization: Bearer <token>
Content-Type: application/json

{
  "isActive": false,
  "maxUses": 5
}
```

### Supprimer un code

```http
DELETE /api/v1/referrals/code/:codeId
Authorization: Bearer <token>
```

---

## 🔄 Workflow du Parrainage

### 1. Partage du Code
```
Utilisateur A → Récupère son code → Partage à Utilisateur B
```

### 2. Utilisation du Code
```
Utilisateur B → S'inscrit → Utilise le code de A
→ Status: PENDING
→ Bonus: 100 points pour B
```

### 3. Premier Achat
```
Utilisateur B → Fait son 1er achat
→ Status: COMPLETED
```

### 4. Récompense
```
Utilisateur A → Reçoit 200 points
→ Status: REWARDED
```

---

## 💰 Récompenses par Défaut

Configurées dans [referral.service.ts](src/core/services/referral.service.ts):

- **Parrain** : 200 points (quand le filleul fait son 1er achat)
- **Filleul** : 100 points (dès l'utilisation du code)

---

## 🧪 Tests

### Tester pour votre compte

1. **Connectez-vous** avec votre compte
2. **Récupérez votre code** :
   ```bash
   curl -X GET http://localhost:3000/api/v1/referrals/my-codes \
     -H "Authorization: Bearer <votre-token>"
   ```

3. **Vérifiez** que vous avez un code (ex: "KEVI7RE8")

### Tester le parrainage complet

1. **Créez un nouveau compte** (Utilisateur B)
2. **Utilisez le code** d'un autre utilisateur (Utilisateur A)
3. **Faites une commande** avec le compte B
4. **Vérifiez** que A a reçu sa récompense

---

## 📂 Fichiers Modifiés/Créés

### Nouveaux Fichiers
- ✅ `src/infrastructure/database/prisma/scripts/generate-missing-referral-codes.ts`

### Fichiers Modifiés
- ✅ `src/infrastructure/database/prisma/schema.prisma` - Modèles + Enum
- ✅ `src/core/services/auth.service.ts` - Création auto des codes
- ✅ `src/app.ts` - Routes de parrainage

### Fichiers Existants (déjà présents)
- ✅ `src/core/services/referral.service.ts`
- ✅ `src/core/repositories/referral.repository.ts`
- ✅ `src/api/v1/controllers/referral.controller.ts`
- ✅ `src/api/v1/routes/referral.routes.ts`
- ✅ `src/api/v1/validators/referral.validator.ts`

---

## 🚀 Prochaines Étapes

### Frontend (à implémenter)

1. **Écran "Mon Code de Parrainage"**
   - Afficher le code avec bouton de copie
   - Bouton "Partager" (WhatsApp, SMS, etc.)
   - Compteur d'utilisations
   - Lien de partage généré

2. **Écran "Mes Filleuls"**
   - Liste des utilisateurs parrainés
   - Status de chaque parrainage
   - Total des récompenses gagnées

3. **Champ lors de l'inscription**
   - Input pour entrer un code de parrainage
   - Validation en temps réel
   - Affichage du bonus à recevoir

4. **Notifications**
   - "Nouveau filleul inscrit"
   - "Filleul a fait son 1er achat"
   - "Récompense reçue"

---

## ✅ État Actuel

- ✅ Base de données créée
- ✅ Codes générés pour tous les utilisateurs (26/26)
- ✅ Création automatique activée
- ✅ API complète fonctionnelle
- ✅ Validation et sécurité
- ⏳ Frontend à développer

---

**Système de parrainage 100% opérationnel côté backend !** 🎉
