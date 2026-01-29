# 📚 YapaGachis API - Documentation des Routes

> Base URL: `http://localhost:3000/api/v1` (développement)
> Production: `https://api.yapasgachis.com/api/v1`

## 📋 Table des matières

- [🔐 Authentification](#-authentification)
- [👤 Utilisateurs](#-utilisateurs)
- [🏪 Fournisseurs](#-fournisseurs)
- [📦 Produits](#-produits)
- [🏷️ Catégories](#️-catégories)
- [🛒 Commandes](#-commandes)
- [💰 Paiements](#-paiements)
- [💳 Providers de paiement](#-providers-de-paiement)
- [🏬 Magasins](#-magasins)
- [⏰ Horaires de magasin](#-horaires-de-magasin)
- [👥 Personnel de magasin](#-personnel-de-magasin)
- [💎 Deals & Offres](#-deals--offres)
- [🎁 Options de Deal](#-options-de-deal)
- [📅 Abonnements](#-abonnements)
- [🤝 Associations](#-associations)
- [💝 Dons](#-dons)
- [⭐ Avis](#-avis)
- [🔔 Notifications](#-notifications)
- [🎯 Publicité](#-publicité)
- [✅ KYC (Vérification)](#-kyc-vérification)
- [🗺️ Carte](#️-carte)
- [📍 Lieux enregistrés](#-lieux-enregistrés)
- [🔍 Historique de recherche](#-historique-de-recherche)
- [❤️ Magasins favoris](#️-magasins-favoris)
- [🎁 Parrainage](#-parrainage)
- [🏆 Récompenses](#-récompenses)
- [📊 Stock](#-stock)
- [💸 Paiements fournisseur](#-paiements-fournisseur)
- [📱 WhatsApp](#-whatsapp)
- [🖼️ Galerie média](#️-galerie-média)
- [⚙️ Administration](#️-administration)

---

## 🔐 Authentification

**Base:** `/api/v1/auth`

### Routes publiques

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/register` | Inscription (CLIENT) |
| POST | `/register/supplier` | Inscription fournisseur |
| POST | `/register/association` | Inscription association |
| POST | `/login/phone` | Connexion par téléphone + mot de passe |
| POST | `/login/email` | Connexion par email (envoie OTP) |
| POST | `/login/email/verify` | Vérifier OTP email |
| POST | `/login/google` | Connexion Google OAuth |
| POST | `/refresh-token` | Rafraîchir le token JWT |
| POST | `/forgot-password` | Mot de passe oublié |
| POST | `/reset-password` | Réinitialiser mot de passe |
| POST | `/verify-otp` | Vérifier OTP général |

### Routes protégées

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/logout` | Déconnexion | Tous |
| GET | `/me` | Profil utilisateur connecté | Tous |
| PATCH | `/update-profile` | Modifier profil | Tous |
| PATCH | `/change-password` | Changer mot de passe | Tous |

---

## 👤 Utilisateurs

**Base:** `/api/v1/users`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/` | Liste utilisateurs (paginée) | ADMIN, SUPER_ADMIN |
| GET | `/:id` | Détails utilisateur | ADMIN, SUPER_ADMIN, Soi-même |
| PATCH | `/:id` | Modifier utilisateur | ADMIN, SUPER_ADMIN, Soi-même |
| DELETE | `/:id` | Supprimer utilisateur | SUPER_ADMIN |
| PATCH | `/:id/status` | Modifier statut | ADMIN, SUPER_ADMIN |
| GET | `/:id/orders` | Historique commandes | Soi-même |
| GET | `/:id/addresses` | Adresses enregistrées | Soi-même |
| POST | `/:id/addresses` | Ajouter adresse | Soi-même |
| PATCH | `/payment-methods/:id` | Modifier méthode paiement | Soi-même |
| DELETE | `/payment-methods/:id` | Supprimer méthode paiement | Soi-même |

---

## 🏪 Fournisseurs

**Base:** `/api/v1/suppliers`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/` | Liste fournisseurs | Tous |
| GET | `/:id` | Détails fournisseur | Tous |
| PATCH | `/profile` | Modifier profil fournisseur | SUPPLIER_* |
| GET | `/profile` | Mon profil fournisseur | SUPPLIER_* |
| GET | `/stats` | Statistiques fournisseur | SUPPLIER_* |
| GET | `/dashboard` | Tableau de bord | SUPPLIER_* |
| GET | `/nearby` | Fournisseurs à proximité | Tous |

---

## 📦 Produits

**Base:** `/api/v1/products`

### Routes publiques

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Liste produits (avec filtres) |
| GET | `/:id` | Détails produit |
| GET | `/search` | Recherche produits |
| GET | `/nearby` | Produits à proximité |
| GET | `/expiring-soon` | Produits bientôt expirés |
| GET | `/category/:categoryId` | Produits par catégorie |
| GET | `/supplier/:supplierId` | Produits d'un fournisseur |

### Routes fournisseur

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/` | Créer produit | SUPPLIER_FOOD |
| PATCH | `/:id` | Modifier produit | SUPPLIER_FOOD |
| DELETE | `/:id` | Supprimer produit | SUPPLIER_FOOD |
| GET | `/my-products` | Mes produits | SUPPLIER_FOOD |
| PATCH | `/:id/status` | Modifier statut | SUPPLIER_FOOD |
| PATCH | `/:id/stock` | Modifier stock | SUPPLIER_FOOD |

---

## 🏷️ Catégories

**Base:** `/api/v1/categories`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/` | Liste catégories | Tous |
| GET | `/:id` | Détails catégorie | Tous |
| POST | `/` | Créer catégorie | ADMIN |
| PATCH | `/:id` | Modifier catégorie | ADMIN |
| DELETE | `/:id` | Supprimer catégorie | ADMIN |

---

## 🛒 Commandes

**Base:** `/api/v1/orders`

### Routes client

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/` | Créer commande | CLIENT |
| GET | `/` | Mes commandes | CLIENT |
| GET | `/:id` | Détails commande | CLIENT, SUPPLIER_* |
| PATCH | `/:id/cancel` | Annuler commande | CLIENT |
| POST | `/:id/review` | Laisser avis | CLIENT |
| GET | `/:id/track` | Suivi commande | CLIENT |

### Routes fournisseur

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/supplier/orders` | Commandes reçues | SUPPLIER_FOOD |
| PATCH | `/:id/status` | Modifier statut | SUPPLIER_FOOD |
| PATCH | `/:id/accept` | Accepter commande | SUPPLIER_FOOD |
| PATCH | `/:id/reject` | Refuser commande | SUPPLIER_FOOD |
| PATCH | `/:id/prepare` | Marquer en préparation | SUPPLIER_FOOD |
| PATCH | `/:id/ready` | Marquer prête | SUPPLIER_FOOD |

### Routes admin

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/admin/all` | Toutes les commandes | ADMIN |
| GET | `/admin/stats` | Statistiques | ADMIN |

---

## 💰 Paiements

**Base:** `/api/v1/payments` (routes dans orders)

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/orders/:id/pay` | Payer commande | CLIENT |
| GET | `/orders/:id/payment-status` | Statut paiement | CLIENT |
| POST | `/webhook/wave` | Webhook Wave | Public |
| POST | `/webhook/orange` | Webhook Orange Money | Public |
| POST | `/webhook/mtn` | Webhook MTN | Public |

---

## 💳 Providers de paiement

**Base:** `/api/v1/payment-providers`

### Routes publiques

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Liste providers actifs |
| GET | `/available` | Providers disponibles pour pays |

### Routes admin

**Base:** `/api/v1/admin/payment-providers`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/` | Tous les providers | ADMIN |
| POST | `/` | Créer provider | SUPER_ADMIN |
| PATCH | `/:id` | Modifier provider | ADMIN |
| PATCH | `/:id/toggle` | Activer/Désactiver | ADMIN |
| DELETE | `/:id` | Supprimer provider | SUPER_ADMIN |

---

## 🏬 Magasins

**Base:** `/api/v1/stores`

### Routes publiques

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Liste magasins |
| GET | `/:id` | Détails magasin |
| GET | `/nearby` | Magasins à proximité |
| GET | `/search` | Rechercher magasins |

### Routes fournisseur

**Base:** `/api/v1/supplier/stores`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/` | Créer magasin | SUPPLIER_DEALS |
| GET | `/` | Mes magasins | SUPPLIER_DEALS |
| PATCH | `/:id` | Modifier magasin | SUPPLIER_DEALS |
| DELETE | `/:id` | Supprimer magasin | SUPPLIER_DEALS |
| GET | `/:id/stats` | Statistiques magasin | SUPPLIER_DEALS |

---

## ⏰ Horaires de magasin

**Base:** `/api/v1/supplier/stores/:storeId/hours`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/` | Horaires magasin | Tous |
| POST | `/` | Définir horaires | SUPPLIER_DEALS |
| PATCH | `/:id` | Modifier horaire | SUPPLIER_DEALS |
| DELETE | `/:id` | Supprimer horaire | SUPPLIER_DEALS |

---

## 👥 Personnel de magasin

**Base:** `/api/v1/staff`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/invite` | Inviter employé | SUPPLIER_DEALS |
| GET | `/invitations` | Mes invitations | Tous |
| POST | `/invitations/:id/accept` | Accepter invitation | Tous |
| POST | `/invitations/:id/reject` | Refuser invitation | Tous |
| GET | `/stores/:storeId/staff` | Personnel magasin | SUPPLIER_DEALS |
| PATCH | `/stores/:storeId/staff/:id` | Modifier rôle | SUPPLIER_DEALS |
| DELETE | `/stores/:storeId/staff/:id` | Retirer employé | SUPPLIER_DEALS |

---

## 💎 Deals & Offres

**Base:** `/api/v1/deals`

### Routes publiques

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Liste deals actifs |
| GET | `/:id` | Détails deal |
| GET | `/search` | Rechercher deals |
| GET | `/nearby` | Deals à proximité |
| GET | `/category/:category` | Deals par catégorie |
| POST | `/:id/book` | Réserver deal (CLIENT) |
| GET | `/my-bookings` | Mes réservations (CLIENT) |

### Routes fournisseur

**Base:** `/api/v1/supplier/deals`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/` | Créer deal | SUPPLIER_DEALS |
| GET | `/` | Mes deals | SUPPLIER_DEALS |
| PATCH | `/:id` | Modifier deal | SUPPLIER_DEALS |
| DELETE | `/:id` | Supprimer deal | SUPPLIER_DEALS |
| GET | `/:id/bookings` | Réservations deal | SUPPLIER_DEALS |
| PATCH | `/:id/bookings/:bookingId` | Modifier réservation | SUPPLIER_DEALS |

### Routes admin

**Base:** `/api/v1/admin/deals`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/` | Tous les deals | ADMIN |
| PATCH | `/:id/approve` | Approuver deal | ADMIN |
| PATCH | `/:id/reject` | Rejeter deal | ADMIN |
| GET | `/pending` | Deals en attente | ADMIN |

---

## 🎁 Options de Deal

**Base:** `/api/v1/supplier/deals/:dealId/options`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/` | Créer option | SUPPLIER_DEALS |
| PATCH | `/:id` | Modifier option | SUPPLIER_DEALS |
| DELETE | `/:id` | Supprimer option | SUPPLIER_DEALS |

---

## 📅 Abonnements

**Base:** `/api/v1/subscriptions`

### Routes fournisseur

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/subscribe` | S'abonner | SUPPLIER_* |
| GET | `/my-subscription` | Mon abonnement | SUPPLIER_* |
| POST | `/cancel` | Annuler abonnement | SUPPLIER_* |
| GET | `/plans` | Plans disponibles | Tous |
| POST | `/upgrade` | Changer de plan | SUPPLIER_* |

### Routes admin

**Base:** `/api/v1/admin/subscriptions`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/` | Tous les abonnements | ADMIN |
| POST | `/plans` | Créer plan | ADMIN |
| PATCH | `/plans/:id` | Modifier plan | ADMIN |
| DELETE | `/plans/:id` | Supprimer plan | ADMIN |

---

## 🤝 Associations

**Base:** `/api/v1/associations`

### Routes publiques

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Liste associations |
| GET | `/:id` | Détails association |

### Routes association

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| PATCH | `/profile` | Modifier profil | ASSOCIATION |
| GET | `/dashboard` | Tableau de bord | ASSOCIATION |
| GET | `/donations` | Dons reçus | ASSOCIATION |

### Routes admin

**Base:** `/api/v1/admin/associations`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/` | Toutes associations | ADMIN |
| PATCH | `/:id/verify` | Vérifier association | ADMIN |
| PATCH | `/:id/status` | Modifier statut | ADMIN |

---

## 💝 Dons

**Base:** `/api/v1/donations`

### Routes client

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/` | Faire un don | CLIENT |
| GET | `/my-donations` | Mes dons | CLIENT |
| GET | `/:id` | Détails don | CLIENT |

### Routes fournisseur

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/food` | Don alimentaire | SUPPLIER_FOOD |
| GET | `/my-food-donations` | Mes dons alimentaires | SUPPLIER_FOOD |

### Routes association

**Base:** `/api/v1/associations/donations`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/` | Dons disponibles | ASSOCIATION |
| POST | `/:id/claim` | Réclamer don | ASSOCIATION |
| PATCH | `/:id/collect` | Marquer collecté | ASSOCIATION |
| PATCH | `/:id/distribute` | Marquer distribué | ASSOCIATION |

### Routes admin

**Base:** `/api/v1/admin/donations`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/` | Tous les dons | ADMIN |
| GET | `/stats` | Statistiques dons | ADMIN |

---

## ⭐ Avis

**Base:** `/api/v1/reviews`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/` | Créer avis | CLIENT |
| GET | `/product/:productId` | Avis produit | Tous |
| GET | `/supplier/:supplierId` | Avis fournisseur | Tous |
| PATCH | `/:id` | Modifier avis | CLIENT (auteur) |
| DELETE | `/:id` | Supprimer avis | CLIENT (auteur), ADMIN |
| POST | `/:id/reply` | Répondre (fournisseur) | SUPPLIER_* |

---

## 🔔 Notifications

**Base:** `/api/v1/notifications`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/` | Mes notifications | Tous |
| GET | `/unread-count` | Nombre non lues | Tous |
| PATCH | `/:id/read` | Marquer lue | Tous |
| PATCH | `/mark-all-read` | Tout marquer lu | Tous |
| DELETE | `/:id` | Supprimer notification | Tous |
| POST | `/preferences` | Préférences | Tous |
| POST | `/register-device` | Enregistrer device (FCM) | Tous |

---

## 🎯 Publicité

**Base:** `/api/v1/advertising`

### Routes annonceur

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/campaigns` | Créer campagne | ADVERTISER |
| GET | `/campaigns` | Mes campagnes | ADVERTISER |
| PATCH | `/campaigns/:id` | Modifier campagne | ADVERTISER |
| DELETE | `/campaigns/:id` | Supprimer campagne | ADVERTISER |
| GET | `/campaigns/:id/stats` | Statistiques | ADVERTISER |

### Routes admin

**Base:** `/api/v1/admin/advertising`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/campaigns` | Toutes campagnes | ADMIN |
| PATCH | `/campaigns/:id/approve` | Approuver | ADMIN |
| PATCH | `/campaigns/:id/reject` | Rejeter | ADMIN |
| GET | `/stats` | Statistiques globales | ADMIN |

---

## ✅ KYC (Vérification)

**Base:** `/api/v1/kyc`

### Routes fournisseur

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/submit` | Soumettre documents | SUPPLIER_* |
| GET | `/status` | Statut vérification | SUPPLIER_* |
| POST | `/resubmit` | Resoumettre | SUPPLIER_* |

### Routes admin

**Base:** `/api/v1/admin/kyc`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/pending` | KYC en attente | ADMIN |
| GET | `/:id` | Détails KYC | ADMIN |
| PATCH | `/:id/approve` | Approuver | ADMIN |
| PATCH | `/:id/reject` | Rejeter | ADMIN |
| GET | `/stats` | Statistiques | ADMIN |

---

## 🗺️ Carte

**Base:** `/api/v1/map`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/nearby-products` | Produits proches | Tous |
| GET | `/nearby-stores` | Magasins proches | Tous |
| GET | `/nearby-deals` | Deals proches | Tous |
| GET | `/search` | Recherche géographique | Tous |
| POST | `/geocode` | Géocoder adresse | Tous |
| POST | `/reverse-geocode` | Géocodage inversé | Tous |
| POST | `/calculate-distance` | Calculer distance | Tous |

---

## 📍 Lieux enregistrés

**Base:** `/api/v1/saved-locations`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/` | Mes lieux | Tous |
| POST | `/` | Ajouter lieu | Tous |
| PATCH | `/:id` | Modifier lieu | Tous |
| DELETE | `/:id` | Supprimer lieu | Tous |
| PATCH | `/:id/set-default` | Définir par défaut | Tous |

---

## 🔍 Historique de recherche

**Base:** `/api/v1/search`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/history` | Mon historique | Tous |
| POST | `/save` | Sauvegarder recherche | Tous |
| DELETE | `/history/:id` | Supprimer recherche | Tous |
| DELETE | `/history` | Vider historique | Tous |
| GET | `/suggestions` | Suggestions | Tous |
| GET | `/trending` | Tendances | Tous |

---

## ❤️ Magasins favoris

**Base:** `/api/v1/favorite-stores`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/` | Mes favoris | CLIENT |
| POST | `/` | Ajouter favori | CLIENT |
| DELETE | `/:storeId` | Retirer favori | CLIENT |
| GET | `/:storeId/is-favorite` | Vérifier si favori | CLIENT |

---

## 🎁 Parrainage

**Base:** `/api/v1/referrals`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/codes` | Créer code parrainage | Tous |
| GET | `/codes` | Mes codes | Tous |
| POST | `/use/:code` | Utiliser code | CLIENT |
| GET | `/stats` | Statistiques parrainage | Tous |
| GET | `/history` | Historique parrainages | Tous |
| PATCH | `/codes/:id` | Modifier code | Tous |
| DELETE | `/codes/:id` | Supprimer code | Tous |

**Récompenses:**
- Filleul: 100 points bonus
- Parrain: 200 points après 1er achat du filleul

---

## 🏆 Récompenses

**Base:** `/api/v1/rewards`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/` | Mes récompenses | Tous |
| GET | `/transactions` | Historique points | Tous |
| POST | `/redeem` | Utiliser points | Tous |
| GET | `/tiers` | Niveaux disponibles | Tous |
| POST | `/daily-login` | Réclamer points quotidiens | Tous |

**Gains de points:**
- 🎁 Inscription: 100 points
- 🛒 Achat: 1 point / 100 FCFA
- ⭐ Avis: 10 points
- 💝 Don: 2 points / 100 FCFA (double)
- 📅 Connexion quotidienne: 5 points
- 👥 Parrainage: 100 points (filleul) + 200 points (parrain)

**Niveaux:**
- 🥉 BRONZE (0+ pts): Accès de base
- 🥈 SILVER (1000+ pts): 5% réduction, livraison gratuite > 5000 FCFA
- 🥇 GOLD (5000+ pts): 10% réduction, livraison gratuite > 3000 FCFA
- 💎 PLATINUM (10000+ pts): 15% réduction, livraison gratuite

---

## 📊 Stock

**Base:** `/api/v1/supplier/stock-movements`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/` | Mouvements de stock | SUPPLIER_FOOD |
| POST | `/` | Enregistrer mouvement | SUPPLIER_FOOD |
| GET | `/product/:productId` | Mouvements produit | SUPPLIER_FOOD |
| GET | `/stats` | Statistiques stock | SUPPLIER_FOOD |

**Types de mouvement:**
- PURCHASE: Achat
- SALE: Vente
- ADJUSTMENT: Ajustement
- LOSS: Perte
- RETURN: Retour
- TRANSFER: Transfert

---

## 💸 Paiements fournisseur

**Base:** `/api/v1/supplier/payout`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/config` | Configuration paiement | SUPPLIER_* |
| POST | `/config` | Définir config | SUPPLIER_* |
| PATCH | `/config` | Modifier config | SUPPLIER_* |
| GET | `/history` | Historique paiements | SUPPLIER_* |
| POST | `/request` | Demander paiement | SUPPLIER_* |

---

## 📱 WhatsApp

**Base:** `/api/v1/whatsapp`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/send` | Envoyer message | ADMIN |
| POST | `/send-otp` | Envoyer OTP | Système |
| POST | `/webhook` | Webhook messages | Public |
| GET | `/status/:phone` | Statut WhatsApp | ADMIN |

---

## 🖼️ Galerie média

**Base:** `/api/v1/media`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| POST | `/upload` | Upload image | SUPPLIER_*, ASSOCIATION |
| DELETE | `/:id` | Supprimer image | SUPPLIER_*, ASSOCIATION |
| GET | `/product/:productId` | Images produit | Tous |
| GET | `/store/:storeId` | Images magasin | Tous |

---

## ⚙️ Administration

### Routes admin générales

**Base:** `/api/v1/admin`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/dashboard` | Tableau de bord | ADMIN |
| GET | `/stats` | Statistiques globales | ADMIN |
| GET | `/users` | Tous les utilisateurs | ADMIN |
| GET | `/analytics` | Analytics | ADMIN |

### Paramètres plateforme

**Base:** `/api/v1/admin/settings`

| Méthode | Route | Description | Rôles |
|---------|-------|-------------|-------|
| GET | `/` | Tous les paramètres | ADMIN |
| PATCH | `/:key` | Modifier paramètre | SUPER_ADMIN |
| GET | `/public` | Paramètres publics | Tous |

---

## 📝 Formats de réponse

### Succès
```json
{
  "success": true,
  "data": { ... },
  "message": "Opération réussie"
}
```

### Erreur
```json
{
  "success": false,
  "error": "Message d'erreur",
  "code": "ERROR_CODE"
}
```

### Liste paginée
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 🔑 Authentification

Toutes les routes protégées nécessitent un token JWT dans le header:

```
Authorization: Bearer <token>
```

Les tokens sont retournés lors de la connexion et ont une durée de vie de:
- Access token: 15 minutes
- Refresh token: 7 jours

---

## 🚀 Rate Limiting

- Routes publiques: 100 requêtes / 15 min
- Routes auth: 5 requêtes / 15 min
- Autres routes: 100 requêtes / 15 min par utilisateur

---

## 📌 Notes importantes

1. **WebSocket**: Disponible sur `/socket.io` pour notifications en temps réel
2. **Upload**: Limite de 10 MB par fichier
3. **Formats images**: JPEG, PNG, WebP
4. **Géolocalisation**: Latitude/longitude requises pour recherches géographiques
5. **Cache Redis**: TTL de 5 min (court), 30 min (moyen), 24h (long)

---

## 🔗 Documentation complète

- **Swagger**: http://localhost:3000/api-docs
- **Postman Collection**: `docs/YapaGachis_API.postman_collection.json`
- **Documentation site**: https://doc.yapasgachis.com

---

**Dernière mise à jour:** 26 janvier 2026
**Version API:** v1
**Contact:** support@yapasgachis.com
