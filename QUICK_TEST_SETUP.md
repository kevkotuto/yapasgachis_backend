# 🚀 Configuration Rapide pour Tests

Guide ultra-rapide pour peupler la base de données avec des données massives de test.

## ⚡ Setup en 3 Commandes

```bash
# 1. Générer Prisma client
npm run prisma:generate

# 2. Appliquer les migrations
npm run prisma:migrate

# 3. Lancer le seed massif
npm run prisma:seed:massive
```

## 📊 Ce que vous obtenez

✅ **60+ fournisseurs** répartis dans tout Abidjan
✅ **75+ magasins** avec logos et couvertures
✅ **150+ produits** de toutes catégories
✅ **5 associations** avec dons disponibles
✅ **15+ deals** (hôtels avec rooms + autres)
✅ **21+ chambres d'hôtel** (3 types par hôtel)

## 🔑 Connexion Rapide

```
Client:
📧 client1@test.yapasgachis.com
📱 +22507100000001
🔐 Test1234!

Fournisseur:
📧 supplier1@test.yapasgachis.com
📱 +22507200000001
🔐 Test1234!

Association:
📧 association1@test.yapasgachis.com
📱 +22507300000001
🔐 Test1234!
```

## 🗺️ Couverture Géographique

Magasins distribués dans toutes les communes :
- Cocody, Plateau, Marcory
- Koumassi, Abobo, Adjamé
- Yopougon, Treichville, Port-Bouët, Attécoubé

## 🎯 Fonctionnalités Testables

### Carte
- [x] 60+ points sur la carte d'Abidjan
- [x] Filtres par commune/catégorie
- [x] Recherche par proximité

### Produits
- [x] Toutes catégories (plats, snacks, pâtisserie, etc.)
- [x] Prix réduits (30-70% de réduction)
- [x] Avec/sans livraison
- [x] Paniers surprises

### Deals & Bons Plans
- [x] Hôtels avec **gestion de chambres** (Standard, Supérieure, Suite)
- [x] Vêtements & Accessoires
- [x] Cosmétiques & Beauté
- [x] Meubles & Décoration
- [x] Fleurs
- [x] Spa & Wellness
- [x] Gym & Fitness
- [x] Restaurants gastronomiques
- [x] Bricolage & DIY

### Fournisseurs
- [x] Logos et images de couverture
- [x] Profils complets
- [x] Multi-magasins (pour Premium)

### Associations
- [x] 5 associations actives (Caritas, SOS Villages, Croix-Rouge, etc.)
- [x] Dons en cours (pending, scheduled, collected)

## 🔄 Reset Complet

Si besoin de repartir de zéro :

```bash
npm run prisma:reset
npm run prisma:seed:massive
```

## 📝 Documentation Complète

Voir [SEED_GUIDE.md](./SEED_GUIDE.md) pour plus de détails.

---

**C'est tout ! Votre base de données est prête pour les tests 🎉**
