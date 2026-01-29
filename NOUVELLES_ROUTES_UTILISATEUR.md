# Documentation des Nouvelles Routes Utilisateur

## 📋 Résumé

Toutes les routes demandées ont été implémentées avec succès:

✅ Gestion du profil utilisateur (nom, email, téléphone, photo)
✅ Gestion des méthodes de paiement (Wave, Orange Money, etc.)
✅ Vérification de contacts en bulk
✅ Code de parrainage

---

## 🔄 Migration de la Base de Données

**IMPORTANT:** Avant de tester les routes, exécutez la migration SQL:

```bash
# Option 1: Via psql
psql yapasgachis < migration-user-payment-methods.sql

# Option 2: Via Prisma
npx prisma migrate deploy

# Option 3: Créer une migration Prisma manuellement
npx prisma migrate dev --name add_user_payment_methods
```

---

## 🛣️ Routes Implémentées

### Base URL
```
/api/v1/users
```

### 1️⃣ Gestion du Profil

#### Mettre à jour le profil
```http
PUT /api/v1/users/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean.dupont@example.com",
  "phoneNumber": "+2250701234567",
  "city": "Abidjan",
  "commune": "Marcory",
  "neighborhood": "Zone 4",
  "latitude": 5.3028,
  "longitude": -3.9772,
  "language": "fr"
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Profil mis à jour avec succès",
  "data": {
    "id": "uuid",
    "firstName": "Jean",
    "lastName": "Dupont",
    "email": "jean.dupont@example.com",
    "phoneNumber": "+2250701234567",
    "avatar": "https://...",
    "city": "Abidjan",
    "commune": "Marcory",
    "neighborhood": "Zone 4",
    "latitude": 5.3028,
    "longitude": -3.9772,
    "language": "fr",
    "role": "CLIENT",
    "status": "ACTIVE",
    "emailVerified": false,
    "phoneVerified": false,
    "createdAt": "2026-01-26T...",
    "updatedAt": "2026-01-26T..."
  }
}
```

**Notes:**
- Si l'email est modifié, `emailVerified` sera mis à `false`
- Si le téléphone est modifié, `phoneVerified` sera mis à `false`
- Tous les champs sont optionnels

---

#### Mettre à jour la photo de profil
```http
PUT /api/v1/users/avatar
Authorization: Bearer {token}
Content-Type: application/json

{
  "avatar": "https://cloudinary.com/image.jpg"
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Photo de profil mise à jour avec succès",
  "data": {
    "id": "uuid",
    "firstName": "Jean",
    "lastName": "Dupont",
    "avatar": "https://cloudinary.com/image.jpg"
  }
}
```

---

### 2️⃣ Code de Parrainage

#### Obtenir son code de parrainage
```http
GET /api/v1/users/referral-code
Authorization: Bearer {token}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "code": "YPG12345678",
    "shareUrl": "https://yapasgachis.com/invite/YPG12345678",
    "shareMessage": "Rejoins-moi sur YapaGachis et obtiens des réductions sur tes achats ! Utilise mon code: YPG12345678"
  }
}
```

---

### 3️⃣ Vérification de Contacts (Bulk)

#### Vérifier quels contacts sont sur YapaGachis
```http
POST /api/v1/users/contacts/check
Authorization: Bearer {token}
Content-Type: application/json

{
  "phoneNumbers": [
    "+2250701234567",
    "+2250709876543",
    "+2250701111111",
    "+2250702222222"
  ]
}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "contacts": [
      {
        "phoneNumber": "+2250701234567",
        "isOnPlatform": true,
        "userId": "uuid-1",
        "firstName": "Marie",
        "lastName": "Kouassi",
        "avatar": "https://..."
      },
      {
        "phoneNumber": "+2250709876543",
        "isOnPlatform": true,
        "userId": "uuid-2",
        "firstName": "Kouadio",
        "lastName": "Yao",
        "avatar": null
      },
      {
        "phoneNumber": "+2250701111111",
        "isOnPlatform": false
      },
      {
        "phoneNumber": "+2250702222222",
        "isOnPlatform": false
      }
    ],
    "summary": {
      "total": 4,
      "onPlatform": 2,
      "notOnPlatform": 2
    }
  }
}
```

**Notes:**
- Maximum 100 numéros par requête
- Seuls les utilisateurs avec le statut "ACTIVE" sont retournés
- Utile pour inviter ses contacts

---

### 4️⃣ Méthodes de Paiement

#### Lister ses méthodes de paiement
```http
GET /api/v1/users/payment-methods
Authorization: Bearer {token}
```

**Réponse:**
```json
{
  "success": true,
  "data": {
    "paymentMethods": [
      {
        "id": "uuid-1",
        "provider": "WAVE",
        "phoneNumber": "+2250701234567",
        "accountName": "Jean Dupont",
        "isDefault": true,
        "isActive": true,
        "isVerified": false,
        "createdAt": "2026-01-26T...",
        "updatedAt": "2026-01-26T..."
      },
      {
        "id": "uuid-2",
        "provider": "ORANGE_MONEY",
        "phoneNumber": "+2250709876543",
        "accountName": "Jean Dupont",
        "isDefault": false,
        "isActive": true,
        "isVerified": false,
        "createdAt": "2026-01-25T...",
        "updatedAt": "2026-01-25T..."
      }
    ],
    "total": 2
  }
}
```

---

#### Ajouter une méthode de paiement
```http
POST /api/v1/users/payment-methods
Authorization: Bearer {token}
Content-Type: application/json

{
  "provider": "WAVE",
  "phoneNumber": "+2250701234567",
  "accountName": "Jean Dupont",
  "isDefault": false
}
```

**Providers disponibles:**
- `WAVE`
- `ORANGE_MONEY`
- `MTN_MONEY`
- `MOOV_MONEY`

**Réponse:**
```json
{
  "success": true,
  "message": "Méthode de paiement ajoutée avec succès",
  "data": {
    "id": "uuid",
    "provider": "WAVE",
    "phoneNumber": "+2250701234567",
    "accountName": "Jean Dupont",
    "isDefault": false,
    "isActive": true,
    "isVerified": false,
    "createdAt": "2026-01-26T...",
    "updatedAt": "2026-01-26T..."
  }
}
```

---

#### Mettre à jour une méthode de paiement
```http
PUT /api/v1/users/payment-methods/{methodId}
Authorization: Bearer {token}
Content-Type: application/json

{
  "phoneNumber": "+2250701234567",
  "accountName": "Jean Dupont",
  "isDefault": true
}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Méthode de paiement mise à jour",
  "data": {
    "id": "uuid",
    "provider": "WAVE",
    "phoneNumber": "+2250701234567",
    "accountName": "Jean Dupont",
    "isDefault": true,
    "isActive": true,
    "isVerified": false,
    "createdAt": "2026-01-26T...",
    "updatedAt": "2026-01-26T..."
  }
}
```

---

#### Supprimer une méthode de paiement
```http
DELETE /api/v1/users/payment-methods/{methodId}
Authorization: Bearer {token}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Méthode de paiement supprimée"
}
```

**Note:** Suppression douce - `isActive` est mis à `false`

---

#### Définir une méthode de paiement par défaut
```http
POST /api/v1/users/payment-methods/{methodId}/default
Authorization: Bearer {token}
```

**Réponse:**
```json
{
  "success": true,
  "message": "Méthode de paiement par défaut définie",
  "data": {
    "id": "uuid",
    "provider": "WAVE",
    "phoneNumber": "+2250701234567",
    "accountName": "Jean Dupont",
    "isDefault": true,
    "isActive": true,
    "isVerified": false,
    "createdAt": "2026-01-26T...",
    "updatedAt": "2026-01-26T..."
  }
}
```

---

## 🧪 Tests

### Exemple avec cURL

#### 1. Se connecter
```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+2250701000001",
    "password": "Client@Demo2024!"
  }'
```

#### 2. Mettre à jour son profil
```bash
curl -X PUT http://localhost:3000/api/v1/users/profile \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "firstName": "Nouveau Prénom",
    "city": "Abidjan"
  }'
```

#### 3. Ajouter une méthode de paiement
```bash
curl -X POST http://localhost:3000/api/v1/users/payment-methods \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "provider": "WAVE",
    "phoneNumber": "+2250701234567",
    "accountName": "Jean Dupont",
    "isDefault": true
  }'
```

#### 4. Vérifier ses contacts
```bash
curl -X POST http://localhost:3000/api/v1/users/contacts/check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "phoneNumbers": ["+2250701000001", "+2250709999999"]
  }'
```

---

## 📁 Fichiers Créés/Modifiés

### Nouveaux fichiers:
1. `src/api/v1/validators/user.validator.ts` - Validateurs Zod
2. `src/core/interfaces/dtos/user.dto.ts` - DTOs TypeScript
3. `src/core/services/user.service.ts` - Service de gestion utilisateur
4. `src/api/v1/controllers/user.controller.ts` - Controller HTTP
5. `src/api/v1/routes/user.routes.ts` - Routes Express
6. `migration-user-payment-methods.sql` - Migration SQL
7. `NOUVELLES_ROUTES_UTILISATEUR.md` - Cette documentation

### Fichiers modifiés:
1. `src/infrastructure/database/prisma/schema.prisma` - Ajout du modèle `UserPaymentMethod`
2. `src/app.ts` - Enregistrement des routes `/api/v1/users`

---

## ⚠️ Notes Importantes

1. **Migration requise:** Exécutez la migration SQL avant de tester
2. **Authentification:** Toutes les routes nécessitent un token JWT valide
3. **Validation:** Toutes les entrées sont validées avec Zod
4. **Sécurité:**
   - Les emails et téléphones sont vérifiés pour éviter les doublons
   - Les méthodes de paiement sont liées à l'utilisateur
   - Seul le propriétaire peut modifier ses données

---

## 🎯 Prochaines Étapes

1. Exécuter la migration: `psql yapasgachis < migration-user-payment-methods.sql`
2. Régénérer le client Prisma: `npx prisma generate` ✅ (Déjà fait)
3. Redémarrer le serveur: `npm run dev`
4. Tester toutes les routes avec Postman/Thunder Client
5. Documenter dans Swagger (optionnel)

---

## 📞 Support

En cas de problème:
- Vérifier que la migration est bien appliquée
- Vérifier que le token JWT est valide
- Consulter les logs du serveur
- Vérifier les validations Zod dans les validators

---

**Date:** 2026-01-26
**Version:** 1.0.0
**Auteur:** Claude Sonnet 4.5
