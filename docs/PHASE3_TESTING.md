# Guide de Test - Phase 3 : Paiements & Commandes

## 🎯 Endpoints Disponibles

### Commandes (Orders)
- **10 endpoints** pour la gestion complète des commandes
- Paiement Mobile Money intégré (Wave, Orange Money, MTN, Moov)
- Suivi de statut en temps réel
- Statistiques détaillées

### Paiements (Payments)
- **4 fournisseurs** : Wave, Orange Money, MTN Mobile Money, Moov Money
- Détection automatique du fournisseur
- Simulation en développement, intégration réelle en production

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

4. **Comptes créés** :
   - Client avec token (pour passer des commandes)
   - Fournisseur avec profil et produits

---

## 💳 Tests des Paiements

### 1. Obtenir les Fournisseurs de Paiement Supportés (Public)

**GET** `http://localhost:3000/api/v1/orders/payments/providers`

```bash
curl http://localhost:3000/api/v1/orders/payments/providers
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "providers": [
      { "code": "WAVE", "name": "Wave" },
      { "code": "ORANGE", "name": "Orange Money" },
      { "code": "MTN", "name": "MTN Mobile Money" },
      { "code": "MOOV", "name": "Moov Money" }
    ]
  }
}
```

---

## 🛒 Tests des Commandes

### 1. Créer une Commande avec Paiement

**POST** `http://localhost:3000/api/v1/orders`

**Authentification** : Bearer Token (CLIENT)

```bash
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "productId": "PRODUCT_UUID_1",
        "quantity": 2
      },
      {
        "productId": "PRODUCT_UUID_2",
        "quantity": 1
      }
    ],
    "deliveryAddress": "Rue du Commerce, Plateau",
    "deliveryCity": "Abidjan",
    "deliveryPhone": "+2250701020304",
    "deliveryMethod": "DELIVERY",
    "notes": "Livraison entre 15h et 18h",
    "paymentProvider": "WAVE",
    "paymentPhoneNumber": "+2250701020304"
  }'
```

**Réponse attendue** :
```json
{
  "success": true,
  "message": "Commande créée avec succès",
  "data": {
    "order": {
      "id": "uuid",
      "userId": "uuid",
      "status": "CONFIRMED",
      "subtotal": 5000,
      "deliveryFee": 1000,
      "totalAmount": 6000,
      "deliveryMethod": "DELIVERY",
      "deliveryAddress": "Rue du Commerce, Plateau",
      "deliveryCity": "Abidjan",
      "items": [
        {
          "productId": "uuid",
          "quantity": 2,
          "price": 2000,
          "subtotal": 4000,
          "product": {
            "name": "Pain complet",
            "category": "BAKERY"
          }
        }
      ],
      "createdAt": "2025-01-07T...",
      "confirmedAt": "2025-01-07T..."
    },
    "payment": {
      "transactionId": "WAVE_1704646800_abc123",
      "status": "SUCCESS"
    }
  }
}
```

**Méthodes de livraison** :
- `PICKUP` : Retrait sur place (gratuit)
- `DELIVERY` : Livraison (1000 XOF)

**Fournisseurs de paiement** :
- `WAVE` : Wave
- `ORANGE` : Orange Money
- `MTN` : MTN Mobile Money
- `MOOV` : Moov Money

**Note** : Le stock des produits est automatiquement déduit après confirmation du paiement.

---

### 2. Obtenir une Commande par ID

**GET** `http://localhost:3000/api/v1/orders/:id`

**Authentification** : Bearer Token

```bash
curl http://localhost:3000/api/v1/orders/ORDER_UUID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

### 3. Obtenir Mes Commandes (Client)

**GET** `http://localhost:3000/api/v1/orders/my-orders`

**Authentification** : Bearer Token (CLIENT)

```bash
# Toutes mes commandes
curl "http://localhost:3000/api/v1/orders/my-orders" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Filtrer par statut
curl "http://localhost:3000/api/v1/orders/my-orders?status=CONFIRMED" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Avec pagination
curl "http://localhost:3000/api/v1/orders/my-orders?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Statuts de commande** :
- `PENDING` : En attente de paiement
- `CONFIRMED` : Confirmée (payée)
- `IN_TRANSIT` : En cours de livraison
- `COMPLETED` : Livrée
- `CANCELLED` : Annulée

---

### 4. Annuler une Commande (Client)

**POST** `http://localhost:3000/api/v1/orders/:id/cancel`

**Authentification** : Bearer Token (CLIENT)

```bash
curl -X POST http://localhost:3000/api/v1/orders/ORDER_UUID/cancel \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Je ne peux plus récupérer la commande"
  }'
```

**Contraintes** :
- Seulement les commandes `PENDING` ou `CONFIRMED` peuvent être annulées
- Le stock des produits est restauré automatiquement
- Les paiements ne sont pas remboursés automatiquement (à gérer manuellement)

---

### 5. Obtenir mes Statistiques de Commandes (Client)

**GET** `http://localhost:3000/api/v1/orders/statistics`

**Authentification** : Bearer Token (CLIENT)

```bash
curl http://localhost:3000/api/v1/orders/statistics \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalOrders": 12,
      "completedOrders": 8,
      "totalSpent": 45000,
      "averageOrderValue": 5625
    }
  }
}
```

---

## 🏪 Tests des Commandes Fournisseurs

### 6. Obtenir les Commandes du Fournisseur

**GET** `http://localhost:3000/api/v1/orders/supplier-orders`

**Authentification** : Bearer Token (SUPPLIER)

```bash
# Toutes les commandes
curl "http://localhost:3000/api/v1/orders/supplier-orders" \
  -H "Authorization: Bearer YOUR_SUPPLIER_TOKEN"

# Filtrer par statut
curl "http://localhost:3000/api/v1/orders/supplier-orders?status=CONFIRMED" \
  -H "Authorization: Bearer YOUR_SUPPLIER_TOKEN"

# Avec pagination
curl "http://localhost:3000/api/v1/orders/supplier-orders?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_SUPPLIER_TOKEN"
```

---

### 7. Mettre à Jour le Statut d'une Commande (Fournisseur)

**PATCH** `http://localhost:3000/api/v1/orders/:id/status`

**Authentification** : Bearer Token (SUPPLIER)

```bash
# Confirmer la commande
curl -X PATCH http://localhost:3000/api/v1/orders/ORDER_UUID/status \
  -H "Authorization: Bearer YOUR_SUPPLIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "CONFIRMED" }'

# Marquer en cours de livraison
curl -X PATCH http://localhost:3000/api/v1/orders/ORDER_UUID/status \
  -H "Authorization: Bearer YOUR_SUPPLIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "IN_TRANSIT" }'

# Marquer comme livrée
curl -X PATCH http://localhost:3000/api/v1/orders/ORDER_UUID/status \
  -H "Authorization: Bearer YOUR_SUPPLIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "COMPLETED" }'
```

**Transitions de statut valides** :
```
PENDING → CONFIRMED, CANCELLED
CONFIRMED → IN_TRANSIT, CANCELLED
IN_TRANSIT → COMPLETED, CANCELLED
COMPLETED → (aucune transition)
CANCELLED → (aucune transition)
```

---

### 8. Obtenir les Statistiques Fournisseur

**GET** `http://localhost:3000/api/v1/orders/supplier-statistics`

**Authentification** : Bearer Token (SUPPLIER)

```bash
curl http://localhost:3000/api/v1/orders/supplier-statistics \
  -H "Authorization: Bearer YOUR_SUPPLIER_TOKEN"
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "statistics": {
      "totalOrders": 45,
      "completedOrders": 32,
      "totalRevenue": 150000,
      "averageOrderValue": 4687.5
    }
  }
}
```

---

### 9. Vérifier le Statut d'un Paiement

**GET** `http://localhost:3000/api/v1/orders/payments/:transactionId/status`

**Authentification** : Bearer Token

```bash
curl http://localhost:3000/api/v1/orders/payments/WAVE_1704646800_abc123/status \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Réponse** :
```json
{
  "success": true,
  "data": {
    "payment": {
      "transactionId": "WAVE_1704646800_abc123",
      "status": "SUCCESS",
      "amount": 6000,
      "currency": "XOF",
      "provider": "WAVE",
      "message": "Paiement Wave simulé avec succès",
      "providerReference": "WAVE_REF_1704646800"
    }
  }
}
```

**Statuts de paiement** :
- `PENDING` : En attente
- `PROCESSING` : En cours de traitement
- `SUCCESS` : Réussi
- `FAILED` : Échoué
- `CANCELLED` : Annulé

---

## 📊 Cas d'Usage Complets

### Cas 1 : Client Passe une Commande

```bash
# 1. Se connecter en tant que CLIENT
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+2250701020304",
    "password": "Password@123"
  }'

# Sauvegarder le token
export CLIENT_TOKEN="eyJhbGciOiJIUzI1..."

# 2. Rechercher des produits disponibles
curl "http://localhost:3000/api/v1/products/search?city=Abidjan&status=AVAILABLE"

# 3. Créer une commande
curl -X POST http://localhost:3000/api/v1/orders \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      { "productId": "PRODUCT_1_UUID", "quantity": 2 },
      { "productId": "PRODUCT_2_UUID", "quantity": 1 }
    ],
    "deliveryAddress": "Rue du Commerce",
    "deliveryCity": "Abidjan",
    "deliveryPhone": "+2250701020304",
    "deliveryMethod": "DELIVERY",
    "paymentProvider": "WAVE",
    "paymentPhoneNumber": "+2250701020304"
  }'

# 4. Vérifier le statut du paiement
curl "http://localhost:3000/api/v1/orders/payments/TRANSACTION_ID/status" \
  -H "Authorization: Bearer $CLIENT_TOKEN"

# 5. Consulter mes commandes
curl "http://localhost:3000/api/v1/orders/my-orders" \
  -H "Authorization: Bearer $CLIENT_TOKEN"
```

---

### Cas 2 : Fournisseur Gère ses Commandes

```bash
# 1. Se connecter en tant que SUPPLIER
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+2250701020305",
    "password": "Password@123"
  }'

# Sauvegarder le token
export SUPPLIER_TOKEN="eyJhbGciOiJIUzI1..."

# 2. Consulter les commandes reçues
curl "http://localhost:3000/api/v1/orders/supplier-orders?status=CONFIRMED" \
  -H "Authorization: Bearer $SUPPLIER_TOKEN"

# 3. Mettre à jour le statut (prêt pour livraison)
curl -X PATCH http://localhost:3000/api/v1/orders/ORDER_UUID/status \
  -H "Authorization: Bearer $SUPPLIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "IN_TRANSIT" }'

# 4. Marquer comme livrée
curl -X PATCH http://localhost:3000/api/v1/orders/ORDER_UUID/status \
  -H "Authorization: Bearer $SUPPLIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "status": "COMPLETED" }'

# 5. Consulter les statistiques
curl "http://localhost:3000/api/v1/orders/supplier-statistics" \
  -H "Authorization: Bearer $SUPPLIER_TOKEN"
```

---

### Cas 3 : Client Annule une Commande

```bash
# 1. Consulter mes commandes
curl "http://localhost:3000/api/v1/orders/my-orders" \
  -H "Authorization: Bearer $CLIENT_TOKEN"

# 2. Annuler une commande (si encore CONFIRMED)
curl -X POST http://localhost:3000/api/v1/orders/ORDER_UUID/cancel \
  -H "Authorization: Bearer $CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Changement de plans"
  }'

# 3. Vérifier que le stock a été restauré
curl "http://localhost:3000/api/v1/products/PRODUCT_UUID"
```

---

## 🚨 Gestion des Erreurs

### Erreur : Stock Insuffisant

```json
{
  "success": false,
  "message": "Stock insuffisant pour \"Pain complet\". Disponible: 2",
  "code": "INSUFFICIENT_STOCK"
}
```

**Solution** : Réduire la quantité ou attendre le réapprovisionnement

---

### Erreur : Produit Expiré

```json
{
  "success": false,
  "message": "Le produit \"Pain complet\" a expiré",
  "code": "PRODUCT_EXPIRED"
}
```

**Solution** : Retirer le produit du panier

---

### Erreur : Transition de Statut Invalide

```json
{
  "success": false,
  "message": "Transition de statut invalide: COMPLETED → IN_TRANSIT",
  "code": "INVALID_STATUS_TRANSITION"
}
```

**Solution** : Vérifier les transitions valides selon le statut actuel

---

### Erreur : Commande Non Annulable

```json
{
  "success": false,
  "message": "Cette commande ne peut plus être annulée",
  "code": "CANNOT_CANCEL"
}
```

**Solution** : Les commandes `IN_TRANSIT` et `COMPLETED` ne peuvent pas être annulées

---

## 💡 Détection Automatique du Fournisseur

Le système détecte automatiquement le fournisseur Mobile Money selon le numéro :

**Côte d'Ivoire (+225)** :
- `07xx`, `08xx`, `09xx` → Orange Money
- `05xx`, `06xx` → MTN Mobile Money
- `01xx`, `02xx` → Moov Money
- Autres → Wave (par défaut)

Exemple :
```json
{
  "paymentPhoneNumber": "+2250701020304"
  // Détecté automatiquement comme Orange Money
}
```

---

## 📈 Calcul des Montants

### Sous-total
```
Sous-total = Σ (Prix × Quantité) pour chaque produit
```

### Frais de livraison
- **Retrait (PICKUP)** : 0 XOF
- **Livraison (DELIVERY)** : 1000 XOF

### Total
```
Total = Sous-total + Frais de livraison
```

Exemple :
```
Produit 1 : 2000 XOF × 2 = 4000 XOF
Produit 2 : 1500 XOF × 1 = 1500 XOF
Sous-total : 5500 XOF
Livraison : 1000 XOF
Total : 6500 XOF
```

---

## 🔒 Sécurité

### Validation des Commandes
- ✅ Vérification de la disponibilité des produits
- ✅ Validation du stock
- ✅ Vérification de la date d'expiration
- ✅ Calcul exact des montants

### Contrôle d'Accès
- ✅ Les clients ne voient que leurs propres commandes
- ✅ Les fournisseurs ne voient que les commandes contenant leurs produits
- ✅ Seuls les fournisseurs peuvent modifier les statuts

### Paiements
- ✅ Paiement sécurisé Mobile Money
- ✅ Vérification du statut en temps réel
- ✅ Cache Redis pour les transactions (24h)
- ✅ Logs détaillés pour l'audit

---

## 🔄 Prochaines Étapes

Une fois les tests Phase 3 validés :

- **Phase 4** : Donations & Associations
  - Dons alimentaires et financiers
  - Rapports d'utilisation des dons
  - Suivi de l'impact

Consultez [IMPLEMENTATION_ROADMAP.md](../IMPLEMENTATION_ROADMAP.md) pour plus de détails.

---

**Créé avec ❤️ pour l'Afrique** 🌍
