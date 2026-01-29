# 🔑 Comptes de Test - YapaGachis Backend

Ce document récapitule tous les comptes de test disponibles pour le développement et les tests.

## ⚠️ ATTENTION - Format des Numéros de Téléphone

Les numéros ivoiriens ont **14 caractères** au format :
- `+225` (code pays) + `07` ou `05` (indicatif) + `XXXXXXXX` (8 chiffres)
- **Exemple correct:** `+2250720000101` (14 caractères)
- **Exemple incorrect:** `+22507200000101` (15 caractères - un zéro en trop)

---

## 📋 Seed de Base (`npm run prisma:seed`)

### 🔐 Credentials

#### Super Admin
- **Email:** `admin@yapasgachis.com`
- **Téléphone:** `+2250700000000`
- **Mot de passe:** `Admin@YapaGachis2024!`
- **Rôle:** SUPER_ADMIN

#### Client Démo
- **Email:** `client@demo.yapasgachis.com`
- **Téléphone:** `+2250701000001`
- **Mot de passe:** `Client@Demo2024!`
- **Rôle:** CLIENT
- **Localisation:** Marcory, Zone 4

#### Fournisseur Restaurant
- **Email:** `restaurant@demo.yapasgachis.com`
- **Téléphone:** `+2250702000001`
- **Mot de passe:** `Supplier@Demo2024!`
- **Rôle:** SUPPLIER_FOOD
- **Business:** Chez Tantine Marie (Restaurant)
- **Abonnement:** Pro
- **Localisation:** Cocody Angré

#### Fournisseur Hôtel (pour les deals)
- **Email:** `hotel@demo.yapasgachis.com`
- **Téléphone:** `+2250703000001`
- **Mot de passe:** `Supplier@Demo2024!`
- **Rôle:** SUPPLIER_DEALS
- **Business:** Hotel Palm Beach
- **Abonnement:** Premium
- **Localisation:** Plateau

#### Association
- **Email:** `association@demo.yapasgachis.com`
- **Téléphone:** `+2250704000001`
- **Mot de passe:** `Supplier@Demo2024!`
- **Rôle:** ASSOCIATION
- **Nom:** Espoir Solidaire
- **Localisation:** Abobo

---

## 📦 Seed Massif (`npm run prisma:seed:massive`) ⭐ **RECOMMANDÉ**

### 🔐 Credentials

#### Clients (10 comptes)
Format: `+2250710000XXXX` où XXXX va de 0051 à 0060

**Exemple:**
- **Téléphone:** `+22507100000051`
- **Email:** `client51@test.yapasgachis.com`
- **Mot de passe:** `Test1234!`
- **Rôle:** CLIENT

#### Fournisseurs (60+ comptes)
Format: `+2250720000XXXX` où XXXX commence à 0101

**Exemples:**
- **Téléphone:** `+2250720000101` ← ⚠️ ATTENTION: 14 caractères (4 zéros consécutifs)
- **Email:** `supplier101@test.yapasgachis.com`
- **Mot de passe:** `Test1234!`
- **Rôle:** SUPPLIER_FOOD ou SUPPLIER_DEALS

**Fournisseurs notables:**
- Fournisseur 101-110: Restaurants
- Fournisseur 111-120: Boulangeries
- Fournisseur 121-130: Supermarchés
- Fournisseur 131-140: Hôtels (avec chambres)
- Fournisseur 141-150: Beauté & Spa
- Fournisseur 151-160: Loisirs & Divertissement

#### Associations (5 comptes)
Format: `+225073000002X` où X va de 1 à 5

**Exemples:**
- **Téléphone:** `+2250730000021` ← ⚠️ ATTENTION: 14 caractères (5 zéros consécutifs)
- **Email:** `association21@test.yapasgachis.com`
- **Mot de passe:** `Test1234!`
- **Rôle:** ASSOCIATION
- **Noms:** Caritas Côte d'Ivoire, SOS Villages d'Enfants, Croix-Rouge Ivoirienne, etc.

---

## 🎯 Utilisation Rapide

### Pour tester rapidement (comptes seed de base)

```bash
# Fournisseur Restaurant
Phone: +2250702000001
Password: Supplier@Demo2024!

# Association
Phone: +2250704000001
Password: Supplier@Demo2024!
```

### Pour tester avec beaucoup de données (seed massif)

```bash
# 1. Reset la base de données
npm run prisma:reset

# 2. Lancer le seed massif
npm run prisma:seed:massive

# 3. Se connecter avec:
# Fournisseur (14 caractères - 4 zéros consécutifs)
Phone: +2250720000101
Password: Test1234!

# Association (14 caractères - 5 zéros consécutifs)
Phone: +2250730000021
Password: Test1234!
```

---

## 📱 Format d'Authentification

### Connexion par Téléphone
```json
POST /api/v1/auth/login
{
  "phoneNumber": "+2250702000001",
  "password": "Supplier@Demo2024!"
}
```

### Connexion par Email (avec OTP)
```json
POST /api/v1/auth/email-login
{
  "email": "restaurant@demo.yapasgachis.com",
  "password": "Supplier@Demo2024!"
}
```

---

## 🗺️ Répartition Géographique (Seed Massif)

Le seed massif crée des fournisseurs dans toutes les communes d'Abidjan:
- **Cocody:** ~8 magasins
- **Plateau:** ~6 magasins
- **Marcory:** ~8 magasins
- **Koumassi:** ~6 magasins
- **Abobo:** ~8 magasins
- **Adjamé:** ~6 magasins
- **Yopougon:** ~8 magasins
- **Treichville:** ~6 magasins
- **Port-Bouët:** ~6 magasins
- **Attécoubé:** ~6 magasins

---

## 💡 Conseils

1. **Pour le développement rapide:** Utilisez le seed de base avec les comptes `@demo.yapasgachis.com`
2. **Pour tester la carte et les filtres:** Utilisez le seed massif avec 60+ fournisseurs
3. **Pour tester les deals avec chambres:** Utilisez les comptes hôtels (seed massif fournisseurs 131-140)
4. **Pour tester les associations:** Utilisez les comptes associations des deux seeds

---

## 🔄 Changer de Seed

```bash
# Passer du seed de base au seed massif
npm run prisma:reset
npm run prisma:seed:massive

# Revenir au seed de base
npm run prisma:reset
npm run prisma:seed
```

---

## ⚠️ Important

- Tous les mots de passe sont **hashés avec bcrypt (12 rounds)**
- Les numéros de téléphone doivent être au format international: `+225...`
- Tous les comptes de test sont **vérifiés** (emailVerified, phoneVerified)
- Les tokens JWT expirent après 15 minutes (access) et 7 jours (refresh)

---

**Dernière mise à jour:** 2026-01-28
