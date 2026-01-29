# Guide de Seeding - YapaGachis Backend

Ce guide explique comment utiliser les différents scripts de seeding pour peupler la base de données avec des données de test.

## 📦 Scripts Disponibles

### 1. Seed de Base (`prisma:seed`)
```bash
npm run prisma:seed
```

**Contenu :**
- 3 Plans d'abonnement (Basic, Pro, Premium)
- 1 Super Admin
- 1 Client de démo
- 2 Fournisseurs (Restaurant + Hôtel)
- 3 Produits
- 2 Deals
- 1 Association
- 2 Codes promo

**Usage :** Seed minimal pour démarrer le développement

---

### 2. Seed Massif (`prisma:seed:massive`) ⭐ **RECOMMANDÉ POUR TESTER**
```bash
npm run prisma:seed:massive
```

**Contenu :**
- 10 Clients de test
- **60+ Fournisseurs** répartis dans tous les quartiers d'Abidjan
- **75+ Magasins/Points de vente**
- **150+ Produits** de toutes catégories
- **5 Associations** avec dons disponibles
- **15+ Deals** incluant :
  - Hôtels avec gestion de chambres (3 types de chambres par hôtel)
  - Vêtements & Accessoires
  - Cosmétiques
  - Meubles
  - Fleurs
  - Spa & Wellness
  - Gym & Fitness
  - Restaurants
  - Bricolage

**Couverture géographique complète :**
- Cocody
- Plateau
- Marcory
- Koumassi
- Abobo
- Adjamé
- Yopougon
- Treichville
- Port-Bouët
- Attécoubé

**Usage :** Seed complet pour tester intensivement :
- La carte avec beaucoup de points
- Les filtres et recherches
- Les deals avec rooms
- Les associations et dons
- Les pages fournisseurs avec logos et couvertures

---

### 3. Seed Frontend (`prisma:seed:frontend`)
```bash
npm run prisma:seed:frontend
```

**Contenu :**
- Données spécifiques pour le développement frontend
- Quelques fournisseurs réels (O'takkos, Adagio)
- Produits et deals avec reviews
- Associations connues

**Usage :** Développement frontend avec données réalistes

---

### 4. Seed Complet (`prisma:seed:complete`)
```bash
npm run prisma:seed:complete
```

**Contenu :**
- Version complète avec reviews et bookings
- Fournisseurs avec rooms détaillées

**Usage :** Tests end-to-end complets

---

## 🚀 Utilisation Rapide

### Premier Setup
```bash
# 1. Installer les dépendances
npm install

# 2. Générer le client Prisma
npm run prisma:generate

# 3. Exécuter les migrations
npm run prisma:migrate

# 4. Lancer le seed massif (recommandé)
npm run prisma:seed:massive
```

### Reset et Re-seed
```bash
# Réinitialiser complètement la base de données
npm run prisma:reset

# Puis lancer le seed massif
npm run prisma:seed:massive
```

---

## 🔑 Credentials de Test

### Seed Massif
```
Clients:
- Email: client1@test.yapasgachis.com
- Phone: +22507100000001
- Password: Test1234!

Fournisseurs:
- Email: supplier1@test.yapasgachis.com
- Phone: +22507200000001
- Password: Test1234!

Associations:
- Email: association1@test.yapasgachis.com
- Phone: +22507300000001
- Password: Test1234!
```

### Seed de Base
```
Admin:
- Email: admin@yapasgachis.com
- Phone: +2250700000000
- Password: Admin@YapaGachis2024!

Client:
- Email: client@demo.yapasgachis.com
- Phone: +2250701000001
- Password: Client@Demo2024!

Fournisseur:
- Email: restaurant@demo.yapasgachis.com
- Phone: +2250702000001
- Password: Supplier@Demo2024!
```

---

## 📊 Données Générées (Seed Massif)

| Type | Quantité | Details |
|------|----------|---------|
| **Clients** | 10 | Répartis dans différentes communes |
| **Fournisseurs** | 60+ | Restaurants, Boulangeries, Supermarchés, Hôtels, Beauté, Loisirs |
| **Magasins** | 75+ | Couvre toutes les communes d'Abidjan |
| **Produits** | 150+ | Toutes catégories (plats préparés, snacks, pâtisserie, etc.) |
| **Associations** | 5 | Caritas, SOS Villages, Croix-Rouge, Banque Alimentaire, Espoir Solidaire |
| **Dons** | 15+ | En cours (pending, scheduled, collected) |
| **Deals** | 15+ | Hôtels avec rooms + autres catégories |
| **Chambres d'hôtel** | 21+ | 3 types par hôtel (Standard, Supérieure, Suite) |

---

## 🗺️ Répartition Géographique

Chaque commune d'Abidjan contient plusieurs magasins avec des coordonnées GPS réalistes :

- **Cocody** : ~8 magasins (Angré, Riviera, Deux Plateaux, etc.)
- **Plateau** : ~6 magasins (Centre-ville)
- **Marcory** : ~8 magasins (Zone 4, Biétry, etc.)
- **Koumassi** : ~6 magasins (Remblais, Grand Campement)
- **Abobo** : ~8 magasins (Anonkoua, Avocatier, etc.)
- **Adjamé** : ~6 magasins (Marché, Williamsville)
- **Yopougon** : ~8 magasins (Siporex, Niangon, etc.)
- **Treichville** : ~6 magasins (Zone 3, Zone 4)
- **Port-Bouët** : ~6 magasins (Vridi, Gonzagueville)
- **Attécoubé** : ~6 magasins (Agbéville, Santé)

---

## 🎯 Fonctionnalités Testables

### Avec le Seed Massif, vous pouvez tester :

#### 🗺️ Carte et Géolocalisation
- ✅ Affichage de 60+ points sur la carte
- ✅ Filtres par commune/quartier
- ✅ Recherche par proximité
- ✅ Clustering de markers

#### 🍽️ Produits
- ✅ Liste de produits variés
- ✅ Filtres par catégorie (10+ catégories)
- ✅ Produits avec/sans livraison
- ✅ Paniers surprises
- ✅ Dates d'expiration réalistes

#### 🎫 Deals & Bons Plans
- ✅ Deals d'hôtel avec sélection de chambres
- ✅ Deals de vêtements
- ✅ Deals de cosmétiques
- ✅ Deals de meubles
- ✅ Deals de services (spa, gym, restaurant)
- ✅ Système de réservation

#### 🏪 Pages Fournisseurs
- ✅ Logos et images de couverture
- ✅ Informations complètes
- ✅ Horaires d'ouverture
- ✅ Multi-magasins (pour Premium)
- ✅ Stats et ratings

#### 🤝 Associations & Dons
- ✅ 5 associations vérifiées
- ✅ Dons en cours de collecte
- ✅ Différents statuts de dons
- ✅ Zones de service

---

## 🐛 Dépannage

### Erreur de connexion Prisma
```bash
# Vérifier que PostgreSQL est démarré
npm run docker:up

# Vérifier la connexion
npm run prisma:studio
```

### Erreur "Table does not exist"
```bash
# Re-exécuter les migrations
npm run prisma:migrate
```

### Base de données corrompue
```bash
# Reset complet
npm run prisma:reset
npm run prisma:seed:massive
```

---

## 📝 Notes Importantes

1. **Performance** : Le seed massif prend 30-60 secondes selon votre machine
2. **Stockage** : ~50MB de données générées
3. **Images** : Les images sont hébergées sur Unsplash (URLs publiques)
4. **Coordonnées GPS** : Coordonnées réalistes d'Abidjan avec variation aléatoire
5. **Données de test** : Ne jamais utiliser en production !

---

## 🔄 Mise à Jour des Seeds

Pour modifier les données générées, éditez les fichiers :
- `src/infrastructure/database/prisma/seed.ts` (seed de base)
- `src/infrastructure/database/prisma/seed-massive-test-data.ts` (seed massif)
- `src/infrastructure/database/prisma/seed-frontend-data.ts` (seed frontend)

Puis relancez :
```bash
npm run prisma:seed:massive
```

---

## 📞 Support

En cas de problème avec les seeds, vérifiez :
1. Les logs de la console
2. La connexion à PostgreSQL
3. Les migrations Prisma
4. Les variables d'environnement (.env)

---

**Happy Seeding! 🌱**
