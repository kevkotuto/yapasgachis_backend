# Guide de Test de l'API YapaGachis

## Configuration Requise

1. **Démarrer les services Docker** :
   ```bash
   npm run docker:up
   ```

2. **Générer le client Prisma** :
   ```bash
   npm run prisma:generate
   ```

3. **Exécuter les migrations** :
   ```bash
   npm run prisma:migrate
   ```

4. **Démarrer le serveur** :
   ```bash
   npm run dev
   ```

Le serveur devrait démarrer sur `http://localhost:3000`

## Tests des Endpoints Authentication

### 1. Health Check

**GET** `http://localhost:3000/health`

```bash
curl http://localhost:3000/health
```

**Réponse attendue** :
```json
{
  "success": true,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "uptime": 1.234,
  "environment": "development",
  "services": {
    "database": "healthy",
    "redis": "healthy"
  }
}
```

---

### 2. API Info

**GET** `http://localhost:3000/api/v1`

```bash
curl http://localhost:3000/api/v1
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "YapaGachis API",
  "version": "v1",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

---

### 3. Register (Inscription)

**POST** `http://localhost:3000/api/v1/auth/register`

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+225 0701020304",
    "firstName": "Jean",
    "lastName": "Dupont",
    "password": "Password@123",
    "email": "jean.dupont@example.com",
    "city": "Abidjan",
    "commune": "Cocody",
    "language": "fr"
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Inscription réussie. Veuillez vérifier votre téléphone pour le code OTP.",
  "data": {
    "user": {
      "id": "uuid",
      "phoneNumber": "+2250701020304",
      "firstName": "Jean",
      "lastName": "Dupont",
      "email": "jean.dupont@example.com",
      "role": "CLIENT",
      "status": "PENDING_VERIFICATION",
      "phoneVerified": false,
      "emailVerified": false
    }
  }
}
```

**Note** : Un code OTP sera affiché dans la console du serveur en mode développement.

---

### 4. Verify OTP (Vérification)

**POST** `http://localhost:3000/api/v1/auth/verify-otp`

```bash
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+225 0701020304",
    "code": "123456",
    "purpose": "registration"
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Numéro de téléphone vérifié avec succès",
  "data": {
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1...",
      "refreshToken": "eyJhbGciOiJIUzI1...",
      "expiresIn": 900
    }
  }
}
```

**Sauvegarder les tokens** pour les requêtes authentifiées suivantes !

---

### 5. Login (Connexion)

**POST** `http://localhost:3000/api/v1/auth/login`

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+225 0701020304",
    "password": "Password@123"
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "user": {
      "id": "uuid",
      "phoneNumber": "+2250701020304",
      "firstName": "Jean",
      "lastName": "Dupont",
      "role": "CLIENT",
      "status": "ACTIVE"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1...",
      "refreshToken": "eyJhbGciOiJIUzI1...",
      "expiresIn": 900
    }
  }
}
```

---

### 6. Get Current User (Me)

**GET** `http://localhost:3000/api/v1/auth/me`

**Authentification requise** : Bearer Token

```bash
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Réponse attendue** :
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "role": "CLIENT",
      "phoneNumber": ""
    }
  }
}
```

---

### 7. Resend OTP

**POST** `http://localhost:3000/api/v1/auth/resend-otp`

```bash
curl -X POST http://localhost:3000/api/v1/auth/resend-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+225 0701020304",
    "purpose": "registration"
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Un nouveau code OTP vous a été envoyé"
}
```

**Note** : Il y a un cooldown de 60 secondes entre chaque envoi.

---

### 8. Forgot Password

**POST** `http://localhost:3000/api/v1/auth/forgot-password`

```bash
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+225 0701020304"
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Un code de réinitialisation vous a été envoyé par SMS"
}
```

---

### 9. Reset Password

**POST** `http://localhost:3000/api/v1/auth/reset-password`

```bash
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+225 0701020304",
    "code": "123456",
    "newPassword": "NewPassword@456"
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Votre mot de passe a été réinitialisé avec succès"
}
```

---

### 10. Change Password

**POST** `http://localhost:3000/api/v1/auth/change-password`

**Authentification requise** : Bearer Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/change-password \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentPassword": "Password@123",
    "newPassword": "NewPassword@789",
    "confirmPassword": "NewPassword@789"
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Mot de passe modifié avec succès"
}
```

---

### 11. Refresh Token

**POST** `http://localhost:3000/api/v1/auth/refresh-token`

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh-token \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Token rafraîchi avec succès",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1...",
    "expiresIn": 900
  }
}
```

---

### 12. Logout

**POST** `http://localhost:3000/api/v1/auth/logout`

**Authentification requise** : Bearer Token

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Déconnexion réussie"
}
```

---

## Gestion des Erreurs

### Erreur de Validation

```json
{
  "success": false,
  "message": "Erreur de validation",
  "code": "VALIDATION_ERROR",
  "errors": {
    "body.phoneNumber": ["Numéro de téléphone invalide"]
  }
}
```

### Compte Déjà Existant

```json
{
  "success": false,
  "message": "Un compte existe déjà avec ce numéro de téléphone",
  "code": "CONFLICT"
}
```

### Identifiants Invalides

```json
{
  "success": false,
  "message": "Identifiants invalides",
  "code": "INVALID_CREDENTIALS"
}
```

### Token Expiré

```json
{
  "success": false,
  "message": "Token expiré. Veuillez vous reconnecter.",
  "code": "TOKEN_EXPIRED"
}
```

### Non Autorisé

```json
{
  "success": false,
  "message": "Token d'authentification manquant",
  "code": "UNAUTHORIZED"
}
```

---

## Flux Complet d'Authentification

### 1. Inscription

```bash
# 1. S'inscrire
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+225 0701020304",
    "firstName": "Test",
    "password": "Test@1234"
  }'

# 2. Vérifier l'OTP (récupérer le code dans les logs du serveur)
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+225 0701020304",
    "code": "CODE_FROM_CONSOLE",
    "purpose": "registration"
  }'
```

### 2. Connexion

```bash
# Se connecter
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+225 0701020304",
    "password": "Test@1234"
  }'
```

### 3. Utilisation des Endpoints Protégés

```bash
# Sauvegarder le token
export TOKEN="eyJhbGciOiJIUzI1..."

# Accéder aux endpoints protégés
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

---

## Outils de Test Recommandés

### Postman

1. Créer une collection "YapaGachis"
2. Ajouter une variable `{{baseUrl}}` = `http://localhost:3000/api/v1`
3. Ajouter une variable `{{accessToken}}` pour stocker le token
4. Importer les requêtes depuis ce document

### VS Code REST Client

Créer un fichier `api-tests.http` :

```http
### Health Check
GET http://localhost:3000/health

### Register
POST http://localhost:3000/api/v1/auth/register
Content-Type: application/json

{
  "phoneNumber": "+225 0701020304",
  "firstName": "Test",
  "password": "Test@1234"
}

### Login
POST http://localhost:3000/api/v1/auth/login
Content-Type: application/json

{
  "phoneNumber": "+225 0701020304",
  "password": "Test@1234"
}

### Get Me
GET http://localhost:3000/api/v1/auth/me
Authorization: Bearer {{accessToken}}
```

---

## Prochaines Étapes

Une fois l'authentification testée, vous pouvez commencer à développer :

- **Phase 2** : Fournisseurs & Produits
- **Phase 3** : Paiements & Commandes
- **Phase 4** : Donations
- **Phase 5** : Abonnements & Deals

Consultez [IMPLEMENTATION_ROADMAP.md](../IMPLEMENTATION_ROADMAP.md) pour plus de détails.

---

**Créé avec ❤️ pour l'Afrique** 🌍
