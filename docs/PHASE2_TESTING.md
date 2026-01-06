# Guide de Test - Phase 2 : Fournisseurs & Produits

## 🎯 Endpoints Disponibles

### Fournisseurs (Suppliers)
- **19 endpoints** pour la gestion complète des profils fournisseurs
- Support de la géolocalisation et recherche par proximité
- Gestion des abonnements (FREE, BASIC, PREMIUM, ENTERPRISE)
- Statistiques détaillées

### Produits (Products)
- **14 endpoints** pour la gestion des produits anti-gaspillage
- Upload d'images (Cloudinary)
- Recherche avancée avec filtres multiples
- Géolocalisation et rayon de recherche
- Produits tendances et expirant bientôt

---

## 📋 Prérequis

1. **Services Docker démarrés** :
   ```bash
   npm run docker:up
   ```

2. **Base de données migrée** :
   ```bash
   npm run prisma:migrate
   ```

3. **Serveur démarré** :
   ```bash
   npm run dev
   ```

4. **Compte fournisseur créé** :
   - S'inscrire avec `role: "SUPPLIER"`
   - Vérifier l'OTP
   - Récupérer le token d'accès

---

## 🔐 Variables d'Environnement Requises

Ajouter dans votre `.env` :

```bash
# Cloudinary (pour l'upload d'images)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 🏪 Tests des Endpoints Fournisseurs

### 1. Créer un Profil Fournisseur

**POST** `http://localhost:3000/api/v1/suppliers/profile`

**Authentification** : Bearer Token (SUPPLIER)

```bash
curl -X POST http://localhost:3000/api/v1/suppliers/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Boulangerie du Plateau",
    "type": "RESTAURANT",
    "description": "Boulangerie artisanale proposant du pain frais et des pâtisseries",
    "address": "Rue du Commerce",
    "city": "Abidjan",
    "phoneNumber": "+2250701020304",
    "email": "contact@boulangerie-plateau.com"
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Profil fournisseur créé avec succès",
  "data": {
    "profile": {
      "id": "uuid",
      "businessName": "Boulangerie du Plateau",
      "type": "RESTAURANT",
      "subscriptionTier": "FREE",
      "latitude": 5.316667,
      "longitude": -4.016667
    }
  }
}
```

---

### 2. Obtenir Mon Profil Fournisseur

**GET** `http://localhost:3000/api/v1/suppliers/profile`

**Authentification** : Bearer Token (SUPPLIER)

```bash
curl http://localhost:3000/api/v1/suppliers/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 3. Mettre à Jour Mon Profil

**PUT** `http://localhost:3000/api/v1/suppliers/profile`

**Authentification** : Bearer Token (SUPPLIER)

```bash
curl -X PUT http://localhost:3000/api/v1/suppliers/profile \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "description": "Boulangerie artisanale depuis 2015. Pain au levain naturel.",
    "registrationNumber": "CI-ABJ-2015-12345",
    "bankAccountNumber": "CI00123456789"
  }'
```

---

### 4. Rechercher des Fournisseurs (Public)

**GET** `http://localhost:3000/api/v1/suppliers/search`

```bash
# Recherche simple
curl "http://localhost:3000/api/v1/suppliers/search?search=boulangerie"

# Recherche par type
curl "http://localhost:3000/api/v1/suppliers/search?type=RESTAURANT"

# Recherche par ville
curl "http://localhost:3000/api/v1/suppliers/search?city=Abidjan"

# Recherche avec pagination
curl "http://localhost:3000/api/v1/suppliers/search?page=1&limit=10"
```

---

### 5. Trouver des Fournisseurs à Proximité (Public)

**GET** `http://localhost:3000/api/v1/suppliers/nearby`

```bash
curl "http://localhost:3000/api/v1/suppliers/nearby?latitude=5.316667&longitude=-4.016667&radius=5&limit=20"
```

**Paramètres** :
- `latitude` : Latitude (requis)
- `longitude` : Longitude (requis)
- `radius` : Rayon en km (optionnel, défaut: 10)
- `limit` : Nombre de résultats (optionnel, défaut: 20)

---

### 6. Obtenir les Statistiques du Fournisseur

**GET** `http://localhost:3000/api/v1/suppliers/statistics`

**Authentification** : Bearer Token (SUPPLIER)

```bash
curl http://localhost:3000/api/v1/suppliers/statistics \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalProducts": 15,
      "activeProducts": 12,
      "totalOrders": 45,
      "totalRevenue": 125000,
      "avgRating": 4.5,
      "totalReviews": 28
    }
  }
}
```

---

### 7. Mettre à Jour l'Abonnement

**POST** `http://localhost:3000/api/v1/suppliers/subscription`

**Authentification** : Bearer Token (SUPPLIER)

```bash
curl -X POST http://localhost:3000/api/v1/suppliers/subscription \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tier": "PREMIUM",
    "durationMonths": 3
  }'
```

**Tiers disponibles** :
- `FREE` : 5 produits max
- `BASIC` : 20 produits max
- `PREMIUM` : 100 produits max
- `ENTERPRISE` : Illimité

---

### 8. Vérifier la Possibilité de Créer des Produits

**GET** `http://localhost:3000/api/v1/suppliers/can-create-products`

**Authentification** : Bearer Token (SUPPLIER)

```bash
curl http://localhost:3000/api/v1/suppliers/can-create-products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "allowed": true,
    "maxProducts": 5,
    "currentProducts": 2
  }
}
```

---

## 🛍️ Tests des Endpoints Produits

### 1. Créer un Produit

**POST** `http://localhost:3000/api/v1/products`

**Authentification** : Bearer Token (SUPPLIER)

```bash
curl -X POST http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Pain complet du jour",
    "description": "Pain complet bio, cuit le matin même. À consommer rapidement.",
    "category": "BAKERY",
    "originalPrice": 2000,
    "price": 1000,
    "quantity": 20,
    "unit": "unité",
    "expiresAt": "2025-01-08T20:00:00.000Z",
    "tags": ["bio", "pain", "sans-gluten"],
    "pickupLocation": "Boulangerie du Plateau, Rue du Commerce",
    "pickupInstructions": "Disponible de 15h à 19h"
  }'
```

**Catégories disponibles** :
- `BAKERY` : Boulangerie
- `FRUITS_VEGETABLES` : Fruits & Légumes
- `DAIRY` : Produits laitiers
- `MEAT_FISH` : Viandes & Poissons
- `PREPARED_MEALS` : Plats préparés
- `GROCERIES` : Épicerie
- `OTHER` : Autre

---

### 2. Obtenir un Produit par ID (Public)

**GET** `http://localhost:3000/api/v1/products/:id`

```bash
curl http://localhost:3000/api/v1/products/PRODUCT_ID
```

---

### 3. Mettre à Jour un Produit

**PUT** `http://localhost:3000/api/v1/products/:id`

**Authentification** : Bearer Token (SUPPLIER)

```bash
curl -X PUT http://localhost:3000/api/v1/products/PRODUCT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "price": 800,
    "quantity": 15,
    "status": "AVAILABLE"
  }'
```

**Statuts disponibles** :
- `AVAILABLE` : Disponible
- `SOLD_OUT` : Épuisé
- `EXPIRED` : Expiré
- `UNAVAILABLE` : Indisponible

---

### 4. Rechercher des Produits (Public)

**GET** `http://localhost:3000/api/v1/products/search`

```bash
# Recherche simple
curl "http://localhost:3000/api/v1/products/search?search=pain"

# Recherche par catégorie
curl "http://localhost:3000/api/v1/products/search?category=BAKERY"

# Recherche par fourchette de prix
curl "http://localhost:3000/api/v1/products/search?minPrice=500&maxPrice=2000"

# Recherche par réduction minimale
curl "http://localhost:3000/api/v1/products/search?minDiscount=30"

# Produits expirant dans les 24h
curl "http://localhost:3000/api/v1/products/search?expiresWithin=24"

# Recherche géolocalisée
curl "http://localhost:3000/api/v1/products/search?latitude=5.316667&longitude=-4.016667&radius=5"

# Tri par prix (asc/desc)
curl "http://localhost:3000/api/v1/products/search?sortBy=price&sortOrder=asc"

# Tri par réduction
curl "http://localhost:3000/api/v1/products/search?sortBy=discount&sortOrder=desc"

# Recherche combinée
curl "http://localhost:3000/api/v1/products/search?category=BAKERY&city=Abidjan&minDiscount=20&sortBy=expiry"
```

---

### 5. Obtenir les Produits Expirant Bientôt (Public)

**GET** `http://localhost:3000/api/v1/products/expiring-soon`

```bash
# Produits expirant dans les 24h (défaut)
curl "http://localhost:3000/api/v1/products/expiring-soon"

# Produits expirant dans les 6h
curl "http://localhost:3000/api/v1/products/expiring-soon?hours=6"

# Produits expirant dans les 48h
curl "http://localhost:3000/api/v1/products/expiring-soon?hours=48"
```

---

### 6. Obtenir les Produits Tendances (Public)

**GET** `http://localhost:3000/api/v1/products/trending`

```bash
# Top 10 produits tendances (défaut)
curl "http://localhost:3000/api/v1/products/trending"

# Top 20 produits tendances
curl "http://localhost:3000/api/v1/products/trending?limit=20"
```

---

### 7. Obtenir Mes Produits (en tant que Fournisseur)

**GET** `http://localhost:3000/api/v1/products/my-products`

**Authentification** : Bearer Token (SUPPLIER)

```bash
# Tous mes produits
curl "http://localhost:3000/api/v1/products/my-products" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Filtrer par statut
curl "http://localhost:3000/api/v1/products/my-products?status=AVAILABLE" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Filtrer par catégorie
curl "http://localhost:3000/api/v1/products/my-products?category=BAKERY" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Avec pagination
curl "http://localhost:3000/api/v1/products/my-products?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 8. Mettre à Jour le Stock

**PATCH** `http://localhost:3000/api/v1/products/:id/stock`

**Authentification** : Bearer Token (SUPPLIER)

```bash
# Ajouter du stock
curl -X PATCH http://localhost:3000/api/v1/products/PRODUCT_ID/stock \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "quantityChange": 10 }'

# Retirer du stock
curl -X PATCH http://localhost:3000/api/v1/products/PRODUCT_ID/stock \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "quantityChange": -5 }'
```

**Note** : Le statut du produit est automatiquement mis à jour :
- Si quantité = 0 → `SOLD_OUT`
- Si quantité > 0 et était `SOLD_OUT` → `AVAILABLE`

---

### 9. Upload d'Images de Produit

**POST** `http://localhost:3000/api/v1/products/:id/images`

**Authentification** : Bearer Token (SUPPLIER)

```bash
curl -X POST http://localhost:3000/api/v1/products/PRODUCT_ID/images \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -F "images=@/path/to/image1.jpg" \
  -F "images=@/path/to/image2.jpg"
```

**Contraintes** :
- Max 10 images par requête
- Taille max : 5MB par image
- Formats acceptés : JPEG, PNG, WebP, GIF
- Images optimisées automatiquement (1200x1200, qualité 80)

---

### 10. Supprimer une Image de Produit

**DELETE** `http://localhost:3000/api/v1/products/:id/images`

**Authentification** : Bearer Token (SUPPLIER)

```bash
curl -X DELETE http://localhost:3000/api/v1/products/PRODUCT_ID/images \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageUrl": "https://res.cloudinary.com/..."
  }'
```

---

### 11. Supprimer un Produit

**DELETE** `http://localhost:3000/api/v1/products/:id`

**Authentification** : Bearer Token (SUPPLIER)

```bash
curl -X DELETE http://localhost:3000/api/v1/products/PRODUCT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Note** : Toutes les images du produit sont automatiquement supprimées de Cloudinary.

---

## 📊 Exemples de Cas d'Usage Complets

### Cas 1 : Créer un Fournisseur et Ajouter des Produits

```bash
# 1. S'inscrire en tant que SUPPLIER
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+2250701020304",
    "firstName": "Jean",
    "lastName": "Kouassi",
    "password": "Password@123",
    "role": "SUPPLIER"
  }'

# 2. Vérifier l'OTP (récupérer le code dans les logs)
curl -X POST http://localhost:3000/api/v1/auth/verify-otp \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+2250701020304",
    "code": "123456",
    "purpose": "registration"
  }'

# 3. Sauvegarder le token
export TOKEN="eyJhbGciOiJIUzI1..."

# 4. Créer le profil fournisseur
curl -X POST http://localhost:3000/api/v1/suppliers/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "Restaurant Le Plateau",
    "type": "RESTAURANT",
    "description": "Restaurant proposant des plats africains",
    "address": "Avenue Chardy, Plateau",
    "city": "Abidjan"
  }'

# 5. Créer un produit
curl -X POST http://localhost:3000/api/v1/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Attiéké Poisson",
    "description": "Attiéké avec poisson braisé. Préparé le jour même.",
    "category": "PREPARED_MEALS",
    "originalPrice": 3000,
    "price": 1500,
    "quantity": 10,
    "expiresAt": "2025-01-08T20:00:00.000Z",
    "pickupLocation": "Restaurant Le Plateau",
    "pickupInstructions": "Disponible de 12h à 15h"
  }'
```

---

### Cas 2 : Client Recherchant des Produits à Proximité

```bash
# 1. Rechercher des produits dans un rayon de 5km
curl "http://localhost:3000/api/v1/products/search?latitude=5.316667&longitude=-4.016667&radius=5&sortBy=discount&sortOrder=desc"

# 2. Obtenir les détails d'un produit
curl "http://localhost:3000/api/v1/products/PRODUCT_ID"

# 3. Obtenir le profil du fournisseur
curl "http://localhost:3000/api/v1/suppliers/SUPPLIER_ID"
```

---

### Cas 3 : Gestion du Stock en Temps Réel

```bash
# 1. Vérifier le stock actuel
curl "http://localhost:3000/api/v1/products/PRODUCT_ID" \
  -H "Authorization: Bearer $TOKEN"

# 2. Réduire le stock après une vente (simulé)
curl -X PATCH http://localhost:3000/api/v1/products/PRODUCT_ID/stock \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "quantityChange": -3 }'

# 3. Ajouter du stock
curl -X PATCH http://localhost:3000/api/v1/products/PRODUCT_ID/stock \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "quantityChange": 5 }'
```

---

## 🚨 Gestion des Erreurs

### Erreur: Limite de Produits Atteinte

```json
{
  "success": false,
  "message": "Limite de produits atteinte pour votre abonnement",
  "code": "PRODUCT_LIMIT_REACHED"
}
```

**Solution** : Mettre à niveau l'abonnement

```bash
curl -X POST http://localhost:3000/api/v1/suppliers/subscription \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "tier": "BASIC", "durationMonths": 1 }'
```

---

### Erreur: Profil Fournisseur Non Trouvé

```json
{
  "success": false,
  "message": "Profil fournisseur non trouvé",
  "code": "PROFILE_NOT_FOUND"
}
```

**Solution** : Créer d'abord un profil fournisseur

---

### Erreur: Prix Invalide

```json
{
  "success": false,
  "message": "Le prix réduit doit être inférieur au prix original",
  "code": "INVALID_PRICE"
}
```

**Solution** : Vérifier que `price < originalPrice`

---

### Erreur: Upload Image Échoué

```json
{
  "success": false,
  "message": "Type de fichier non autorisé",
  "code": "INVALID_FILE_TYPE"
}
```

**Solution** : Utiliser uniquement JPEG, PNG, WebP ou GIF

---

## 📈 Métriques de Performance

### Géolocalisation
- Cache Redis : 7 jours
- API Nominatim : Rate limit 1 req/sec
- Calcul distance : Formule Haversine

### Upload d'Images
- Optimisation automatique : 1200x1200px
- Compression : Qualité 80
- Format auto : WebP si supporté
- CDN Cloudinary : Livraison globale

### Base de Données
- Index sur : supplierId, category, status
- Index géospatial : latitude, longitude
- Index full-text : name, description

---

## 🔄 Prochaines Étapes

Une fois les tests Phase 2 validés :

- **Phase 3** : Paiements & Commandes
  - Intégration Mobile Money
  - Panier et checkout
  - Suivi de commandes

Consultez [IMPLEMENTATION_ROADMAP.md](../IMPLEMENTATION_ROADMAP.md) pour plus de détails.

---

**Créé avec ❤️ pour l'Afrique** 🌍
