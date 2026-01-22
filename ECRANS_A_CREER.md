# 📱 YapaGachis - Écrans Frontend à Créer

> **Pour Gemini:** Liste des écrans à développer avec maquettes fonctionnelles et données mockées
>
> **Important:** Utiliser UNIQUEMENT des données mockées (pas de fetch API pour l'instant)

---

## 🎯 Contexte

Tu dois créer des écrans React Native (Expo Router) pour YapaGachis.

**Ce qu'on veut:**
- ✅ Maquettes fonctionnelles avec données mockées
- ✅ UI/UX complète et interactive
- ✅ Validation formulaires
- ✅ States (loading, error, empty)
- ❌ **PAS de fetch API** (juste des mocks pour l'instant)

---

## 🚀 SPRINT 1 - URGENT (Cette semaine)

### 1️⃣ Sélection d'Options de Deals (Chambres d'hôtel, tailles, etc.)

**Écran:** Modifier `app/bon-plans/[id].tsx` (bottom sheet existant)

**Ce qui existe déjà:**
- Bottom sheet avec bouton "Réserver"
- Mock de 2 chambres hardcodées (lignes 15-34)

**Ce qu'il faut ajouter:**

**a) Transformer le bottom sheet en sélecteur d'options**
```typescript
// Quand l'utilisateur clique "Réserver":
// 1. Afficher liste des options (chambres) avec:
//    - Image de la chambre
//    - Titre (ex: "Studio pour 2 personnes")
//    - Prix
//    - Détails (capacité, taille, étage)
//    - Features (WiFi, Clim, etc.) en chips
//    - Stock disponible
// 2. L'utilisateur sélectionne une option (radio button)
// 3. Bouton "Continuer" devient actif
// 4. Affiche résumé avec prix de l'option choisie
```

**Mock à utiliser:**
```typescript
const DEAL_OPTIONS = [
  {
    id: "opt-1",
    title: "Studio pour 2 personnes",
    description: "Espace confortable avec cuisine équipée",
    price: 125000,
    capacity: "2 pers max",
    size: "28 m2",
    floor: "Étage supérieur",
    features: ["WiFi gratuit", "Climatisation", "Balcon"],
    imageUrl: "https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400",
    stock: 3
  },
  {
    id: "opt-2",
    title: "Appartement 1 chambre",
    description: "Grand espace familial",
    price: 155000,
    capacity: "4 pers max",
    size: "35 m2",
    floor: "Étage supérieur",
    features: ["WiFi gratuit", "Climatisation", "Cuisine équipée", "TV"],
    imageUrl: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=400",
    stock: 2
  }
];
```

**UI/UX:**
- Cards avec image à gauche, infos à droite
- Prix en gros caractères
- Features en chips horizontales
- Stock: Badge "X disponible(s)"
- Si stock = 0: Option grisée + "Épuisé"

---

### 2️⃣ Formulaire de Création d'Avis

**Nouveaux fichiers à créer:**
- `app/product/create-review.tsx`
- `app/bon-plans/create-review.tsx`

**UI complète:**

```
┌─────────────────────────────────┐
│  ← Évaluer le produit           │
├─────────────────────────────────┤
│                                 │
│  Quelle est votre note ?        │
│  ⭐⭐⭐⭐⭐                      │
│  (Tappable stars)               │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Votre commentaire       │   │
│  │ (min 20 caractères)     │   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
│  📸 Ajouter des photos (max 5)  │
│  [+] [+] [+] [+] [+]            │
│                                 │
│  ✓ Achat vérifié                │
│                                 │
│  ┌───────────────────────────┐ │
│  │   Publier mon avis        │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Fonctionnalités:**
1. **Étoiles cliquables** (1-5)
2. **Textarea**
   - Placeholder: "Décrivez votre expérience..."
   - Counter: "X/500 caractères"
   - Validation: min 20 caractères
3. **Upload photos**
   - Bouton [+] pour chaque slot
   - Max 5 photos
   - Preview avec croix pour supprimer
4. **Badge "Achat vérifié"** (grisé si pas vérifié)
5. **Bouton Publier**
   - Disabled si note vide ou commentaire < 20 caractères
   - Au clic: Afficher success modal "Merci ! Vous avez gagné 50 points"

**Mock données:**
```typescript
const [rating, setRating] = useState(0);
const [comment, setComment] = useState("");
const [photos, setPhotos] = useState<string[]>([]);
const isVerifiedPurchase = true; // Mock

const handleSubmit = () => {
  // Simuler création
  const newReview = {
    id: `review-${Date.now()}`,
    userName: "Vous",
    rating,
    comment,
    photos,
    isVerifiedPurchase,
    createdAt: new Date().toISOString()
  };

  // Afficher success toast/modal
  Alert.alert("Merci !", "Votre avis a été publié. Vous avez gagné 50 points ! 🎉");
  router.back();
};
```

---

### 3️⃣ Ajouter Interactions sur les Avis Existants

**Écrans à modifier:**
- `app/product/[id].tsx` (lignes 182-199)
- `app/product/reviews.tsx` (lignes 94-113)
- `app/bon-plans/[id].tsx`

**Dans chaque carte d'avis, ajouter:**

```
┌─────────────────────────────────┐
│ 👤 Albert Flores    ⭐ 4.5/5   │
│ il y a 3 jours                  │
│                                 │
│ Lorem ipsum dolor sit amet...   │
│                                 │
│ [👍 12 Utile]  [⚠️ Signaler]   │
│ [✏️ Modifier] [🗑️ Supprimer]   │ (si propriétaire)
└─────────────────────────────────┘
```

**Boutons à ajouter:**
1. **👍 Utile**
   - Compteur à côté
   - Toggle: Gris → Bleu quand cliqué
   - Mock: `helpfulCount++` au clic

2. **⚠️ Signaler**
   - Ouvre modal avec raisons:
     - Spam
     - Contenu inapproprié
     - Faux avis
     - Autre (avec champ texte)
   - Bouton "Confirmer"

3. **✏️ Modifier** (si c'est ton avis)
   - Ouvre formulaire pré-rempli

4. **🗑️ Supprimer** (si c'est ton avis)
   - Alert de confirmation
   - Supprime de la liste locale

**Mock condition propriétaire:**
```typescript
const currentUserId = "user-123"; // Mock
const isOwner = review.userId === currentUserId;
```

---

## 🎁 SPRINT 2 - IMPORTANT (Semaine prochaine)

### 4️⃣ Écran Récompenses & Points

**Fichier:** `app/profile/rewards.tsx` (UI existe, à améliorer)

**Ce qui existe déjà:**
- Card avec points mockés
- Barre de progression vers Platinum

**Ce qu'il faut améliorer:**

```
┌─────────────────────────────────┐
│  Mes Récompenses                │
├─────────────────────────────────┤
│                                 │
│  🏆 SILVER                      │
│  3,250 points                   │
│                                 │
│  ▓▓▓▓▓▓▓▓░░░░░ 63.5%           │
│  1,750 points pour GOLD         │
│                                 │
│  ⏰ 500 points expirent le 15 janv │
│                                 │
│  ┌───────────────────────────┐ │
│  │ 🎁 Réclamer mes 5 points  │ │
│  │    quotidiens             │ │ (si disponible)
│  └───────────────────────────┘ │
│                                 │
│  ┌─ Gagner ─┬─ Utiliser ─────┐ │
│  │                           │ │
│  │  Comment gagner des pts:  │ │
│  │  • 1pt = 100 FCFA achat   │ │
│  │  • 50pts par avis         │ │
│  │  • 5pts connexion/jour    │ │
│  │  • 200pts parrainage      │ │
│  │                           │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Features à ajouter:**

1. **Bouton "Réclamer points quotidiens"**
   - Visible si `canClaimDaily === true`
   - Au clic: +5 points, animation, disparaît
   - Réapparaît demain (mock avec `lastClaimed`)

2. **Alerte expiration**
   - Calculer points qui expirent dans < 30 jours
   - Afficher warning si > 0

3. **Onglets Gagner/Utiliser**
   - **Gagner:** Liste des moyens d'obtenir points
   - **Utiliser:** "100 points = 100 FCFA de réduction"

4. **Bouton "Historique"** → Vers écran suivant

**Mock:**
```typescript
const REWARDS_MOCK = {
  totalPoints: 3250,
  availablePoints: 2800,
  currentTier: "SILVER",
  nextTier: "GOLD",
  pointsToNextTier: 1750,
  tierProgress: 63.5,
  expiringPoints: 500,
  expiringDate: "2026-01-15",
  canClaimDaily: true,
  lastClaimed: null
};
```

---

### 5️⃣ Historique des Points

**Nouveau fichier:** `app/profile/rewards/history.tsx`

**UI:**
```
┌─────────────────────────────────┐
│  ← Historique des points        │
├─────────────────────────────────┤
│  📅 Janvier 2026                │
│                                 │
│  ┌───────────────────────────┐ │
│  │ +150 pts                  │ │
│  │ Achat commande #CMD-789   │ │
│  │ 9 jan • Solde: 3,250      │ │
│  │ ⏰ Expire le 9 jan 2027   │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ -500 pts                  │ │
│  │ Réduction utilisée        │ │
│  │ 8 jan • Solde: 3,100      │ │
│  └───────────────────────────┘ │
│                                 │
│  ┌───────────────────────────┐ │
│  │ +5 pts                    │ │
│  │ Connexion quotidienne     │ │
│  │ 8 jan • Solde: 3,105      │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Features:**
- FlatList avec transactions
- Couleur verte (+) / rouge (-)
- Icônes par source: 🛒 Achat, ⭐ Avis, 👥 Parrainage, 📅 Quotidien
- Date d'expiration si applicable
- Pull to refresh (mock)
- Infinite scroll (mock pagination)

**Mock:**
```typescript
const TRANSACTIONS = [
  { id: "1", amount: 150, type: "EARNED", source: "PURCHASE",
    description: "Achat commande #CMD-789", date: "2026-01-09",
    balance: 3250, expiresAt: "2027-01-09" },
  { id: "2", amount: -500, type: "REDEEMED", source: "PURCHASE",
    description: "Réduction appliquée", date: "2026-01-08",
    balance: 3100 },
  { id: "3", amount: 5, type: "EARNED", source: "DAILY_LOGIN",
    description: "Connexion quotidienne", date: "2026-01-08",
    balance: 3105 },
  { id: "4", amount: 50, type: "EARNED", source: "REVIEW",
    description: "Avis sur O'Takkos", date: "2026-01-07",
    balance: 3155 },
];
```

---

### 6️⃣ Écran Parrainage

**Fichier:** `app/profile/invite.tsx` (UI existe, à améliorer)

**Ce qui existe déjà:**
- Code de parrainage affiché
- Bouton partage (non fonctionnel)

**Ce qu'il faut améliorer:**

```
┌─────────────────────────────────┐
│  Parrainez vos amis             │
├─────────────────────────────────┤
│                                 │
│  Votre code de parrainage:      │
│  ┌─────────────────────────┐   │
│  │     ALBERT2026          │   │
│  │  [📋 Copier]            │   │
│  └─────────────────────────┘   │
│                                 │
│  🎁 Gagnez 200 points           │
│  🎁 Votre filleul gagne 100 pts │
│                                 │
│  Partager via:                  │
│  [WhatsApp] [SMS] [Email] [+]   │
│                                 │
│  ────────────────────────────   │
│                                 │
│  📊 Vos parrainages             │
│  • 3 parrainages réussis        │
│  • 2 en attente                 │
│  • 600 points gagnés            │
│                                 │
│  ────────────────────────────   │
│                                 │
│  👥 Personnes parrainées:       │
│                                 │
│  ✅ Marie Kouassi               │
│     +200 pts • 5 jan            │
│                                 │
│  ⏳ Jean Traoré                 │
│     En attente • 8 jan          │
│                                 │
└─────────────────────────────────┘
```

**Features à ajouter:**

1. **Copier le code**
   - Toast "Code copié !"

2. **Boutons partage**
   - WhatsApp: Ouvre avec message pré-rempli
   - SMS: Idem
   - Email: Idem
   - [+]: Share sheet natif

3. **Stats visuelles**
   - Cards avec icônes
   - Nombres en gros

4. **Liste parrainages**
   - Avatar + nom
   - Badge: "✅ Réussi" ou "⏳ En attente"
   - Points gagnés si réussi
   - Date

**Mock:**
```typescript
const REFERRAL_CODE = "ALBERT2026";
const SHARE_LINK = `https://yapasgachis.com/invite/${REFERRAL_CODE}`;
const SHARE_MESSAGE = `Rejoins YapaGachis avec mon code ${REFERRAL_CODE} et gagne 100 points ! ${SHARE_LINK}`;

const REFERRAL_STATS = {
  totalReferrals: 5,
  completedReferrals: 3,
  pendingReferrals: 2,
  totalRewardsEarned: 600
};

const REFERRAL_HISTORY = [
  { id: "1", name: "Marie Kouassi", avatar: "https://...",
    status: "COMPLETED", reward: 200, date: "2026-01-05" },
  { id: "2", name: "Jean Traoré", avatar: null,
    status: "PENDING", reward: null, date: "2026-01-08" }
];
```

**Partage WhatsApp:**
```typescript
import * as Linking from 'expo-linking';

const shareWhatsApp = () => {
  const url = `whatsapp://send?text=${encodeURIComponent(SHARE_MESSAGE)}`;
  Linking.openURL(url);
};
```

---

### 7️⃣ Ajouter Champ Code Parrainage à l'Inscription

**Fichier:** `app/(auth)/register.tsx` (ajouter un champ)

**Avant le bouton "S'inscrire", ajouter:**

```typescript
// Champ optionnel après mot de passe
<View style={styles.inputContainer}>
  <Text style={styles.label}>Code de parrainage (optionnel)</Text>
  <TextInput
    value={referralCode}
    onChangeText={setReferralCode}
    placeholder="Ex: ALBERT2026"
    autoCapitalize="characters"
    maxLength={20}
  />
  {referralCode && isValidating && (
    <ActivityIndicator size="small" />
  )}
  {referralCode && isCodeValid && (
    <Text style={styles.successText}>
      ✅ Code valide ! Vous gagnerez 100 points
    </Text>
  )}
  {referralCode && !isCodeValid && referralCode.length > 3 && (
    <Text style={styles.errorText}>
      ❌ Code invalide
    </Text>
  )}
</View>
```

**Mock validation:**
```typescript
const VALID_CODES = ["ALBERT2026", "MARIE2026", "TEST123"];

useEffect(() => {
  if (referralCode.length > 3) {
    setIsValidating(true);
    // Simuler délai API
    setTimeout(() => {
      setIsCodeValid(VALID_CODES.includes(referralCode.toUpperCase()));
      setIsValidating(false);
    }, 500);
  }
}, [referralCode]);
```

---

## 🏪 SPRINT 3 - GESTION VENDEUR (Dans 2 semaines)

### 8️⃣ Gestion Horaires Vendeur

**Nouveau fichier:** `app/seller/hours.tsx`

**UI:**
```
┌─────────────────────────────────┐
│  ← Horaires d'ouverture         │
├─────────────────────────────────┤
│                                 │
│  Lundi                 [Fermé]  │
│  ├ 08:00 - 12:30               │
│  ├ 14:00 - 18:00               │
│  └ [+ Ajouter créneau]          │
│                                 │
│  Mardi                 [Fermé]  │
│  └ 08:00 - 18:00               │
│                                 │
│  ...                            │
│                                 │
│  Dimanche              ✓ Fermé  │
│                                 │
│  ──────────────────────────     │
│                                 │
│  Fermetures exceptionnelles:    │
│  [+ Ajouter]                    │
│                                 │
│  🗓️ 15 jan 2026                │
│  Inventaire annuel              │
│  Toute la journée               │
│  [Supprimer]                    │
│                                 │
│  ┌───────────────────────────┐ │
│  │   Enregistrer             │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Features:**

1. **Pour chaque jour:**
   - Toggle "Fermé"
   - Si ouvert: Liste créneaux
   - Bouton "+ Ajouter créneau" → Time pickers (début/fin)
   - Supprimer créneau (swipe ou icône)

2. **Fermetures exceptionnelles:**
   - Bouton "+ Ajouter"
   - Modal avec:
     - Date picker
     - Raison (input)
     - Toggle "Toute la journée" ou horaires spécifiques
   - Liste des fermetures futures
   - Supprimer

3. **Validation:**
   - Créneaux ne se chevauchent pas
   - Heure fin > heure début

**Mock:**
```typescript
const [hours, setHours] = useState({
  MONDAY: { isClosed: false, slots: [
    { open: "08:00", close: "12:30" },
    { open: "14:00", close: "18:00" }
  ]},
  TUESDAY: { isClosed: false, slots: [{ open: "08:00", close: "18:00" }] },
  // ... autres jours
  SUNDAY: { isClosed: true, slots: [] }
});

const [closures, setClosures] = useState([
  { id: "1", date: "2026-01-15", reason: "Inventaire annuel", allDay: true }
]);
```

---

### 9️⃣ Gestion Points de Vente (POS)

**Fichiers à créer:**
- `app/seller/pos/index.tsx` (liste)
- `app/seller/pos/add.tsx` (créer)
- `app/seller/pos/[id].tsx` (modifier)

**a) Liste POS** (`index.tsx`):
```
┌─────────────────────────────────┐
│  ← Mes points de vente          │
│                      [+ Ajouter]│
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐   │
│  │ 🏢 MAIN                  │   │
│  │ YapaGachis - Marcory     │   │
│  │ Boulevard VGE, Marcory   │   │
│  │ ✅ Actif • Tout accepte  │   │
│  │ [Modifier] [Désactiver]  │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 🏪 BRANCH                │   │
│  │ YapaGachis - Koumassi    │   │
│  │ Rue des Jardins          │   │
│  │ ✅ Actif • Retrait only  │   │
│  │ [Modifier] [Désactiver]  │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

**b) Créer/Modifier POS** (`add.tsx` et `[id].tsx`):
```
┌─────────────────────────────────┐
│  ← Nouveau point de vente       │
├─────────────────────────────────┤
│                                 │
│  Nom *                          │
│  ┌─────────────────────────┐   │
│  │ YapaGachis - Marcory    │   │
│  └─────────────────────────┘   │
│                                 │
│  Type *                         │
│  ┌─────────────────────────┐   │
│  │ MAIN ▼                  │   │
│  └─────────────────────────┘   │
│  (MAIN, BRANCH, KIOSK, etc.)    │
│                                 │
│  Adresse *                      │
│  ┌─────────────────────────┐   │
│  │ Boulevard VGE...        │   │
│  └─────────────────────────┘   │
│                                 │
│  [Carte interactive]            │
│  📍 Placer le marqueur          │
│                                 │
│  Téléphone                      │
│  Email                          │
│                                 │
│  Ce point accepte:              │
│  ☑ Commandes                    │
│  ☑ Retrait sur place            │
│  ☑ Livraison                    │
│                                 │
│  Description                    │
│  Photos (max 5)                 │
│  Équipements: [Parking] [WiFi]  │
│                                 │
│  ┌───────────────────────────┐ │
│  │   Enregistrer             │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Features:**
- Type picker (MAIN, BRANCH, KIOSK, WAREHOUSE, PICKUP_POINT)
- Carte MapView avec marqueur draggable
- Toggles pour accepte commandes/retrait/livraison
- Upload photos (comme galerie)
- Chips équipements (ajout/suppression)

**Mock:**
```typescript
const POS_MOCK = [
  {
    id: "pos-1",
    name: "YapaGachis - Marcory",
    type: "MAIN",
    address: "Boulevard VGE, Marcory Remblais",
    latitude: 5.314,
    longitude: -4.0082,
    phoneNumber: "+225 07 12 34 56 78",
    email: "marcory@yapasgachis.com",
    isActive: true,
    acceptsOrders: true,
    acceptsPickup: true,
    acceptsDelivery: true,
    description: "Notre magasin principal",
    images: ["https://..."],
    amenities: ["Parking", "WiFi", "Climatisé"]
  }
];
```

---

### 🔟 Gestion Équipe Vendeur

**Fichiers à créer:**
- `app/seller/team/index.tsx` (liste)
- `app/seller/team/add.tsx` (inviter)

**a) Liste équipe** (`index.tsx`):
```
┌─────────────────────────────────┐
│  ← Mon équipe        [+ Inviter]│
├─────────────────────────────────┤
│  📊 5 membres • 1 en attente    │
│                                 │
│  [Tous] [Actifs] [En attente]  │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 👤 Marie Kouassi         │   │
│  │ MANAGER                  │   │
│  │ YapaGachis - Marcory     │   │
│  │ ✅ Actif • Vu à 08:15    │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 👤 Jean Traoré           │   │
│  │ CASHIER                  │   │
│  │ YapaGachis - Koumassi    │   │
│  │ ⏳ Invitation envoyée    │   │
│  │ [Renvoyer] [Annuler]     │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

**b) Inviter membre** (`add.tsx`):
```
┌─────────────────────────────────┐
│  ← Inviter un membre            │
├─────────────────────────────────┤
│                                 │
│  Email ou Téléphone *           │
│  ┌─────────────────────────┐   │
│  │ marie@example.com       │   │
│  └─────────────────────────┘   │
│                                 │
│  Prénom *                       │
│  Nom                            │
│                                 │
│  Rôle *                         │
│  ┌─────────────────────────┐   │
│  │ MANAGER ▼               │   │
│  └─────────────────────────┘   │
│                                 │
│  Point de vente (optionnel)     │
│  ┌─────────────────────────┐   │
│  │ Marcory ▼               │   │
│  └─────────────────────────┘   │
│                                 │
│  Permissions:                   │
│  ☑ Gérer les produits           │
│  ☑ Voir les commandes           │
│  ☐ Gérer les commandes          │
│  ☑ Gérer le stock               │
│  ☐ Voir les statistiques        │
│                                 │
│  ┌───────────────────────────┐ │
│  │   Envoyer l'invitation    │ │
│  └───────────────────────────┘ │
└─────────────────────────────────┘
```

**Features:**
- Rôles: MANAGER, CASHIER, STOCK_MANAGER, DELIVERY, SUPPORT, ADMIN
- Permissions checkboxes (8 options)
- POS picker (si plusieurs)
- Au submit: Success toast "Invitation envoyée à marie@example.com"

**Mock:**
```typescript
const TEAM_MEMBERS = [
  {
    id: "1",
    firstName: "Marie",
    lastName: "Kouassi",
    email: "marie@example.com",
    role: "MANAGER",
    posName: "YapaGachis - Marcory",
    status: "ACCEPTED",
    lastActive: "2026-01-09T08:15:00Z"
  },
  {
    id: "2",
    firstName: "Jean",
    lastName: "Traoré",
    email: "jean@example.com",
    role: "CASHIER",
    posName: "YapaGachis - Koumassi",
    status: "PENDING",
    invitedAt: "2026-01-08T00:00:00Z"
  }
];

const PERMISSIONS = [
  "manage_products",
  "view_orders",
  "manage_orders",
  "manage_stock",
  "process_payments",
  "view_analytics",
  "manage_team",
  "manage_settings"
];
```

---

## 📸 SPRINT 4 - GALERIE PHOTOS (Dans 3 semaines)

### 1️⃣1️⃣ Galerie Photos Vendeur

**Nouveau fichier:** `app/seller/photos.tsx`

**UI:**
```
┌─────────────────────────────────┐
│  ← Galerie photos    [+ Upload] │
├─────────────────────────────────┤
│                                 │
│  Grid 2 colonnes:               │
│  ┌──────┐ ┌──────┐             │
│  │ IMG1 │ │ IMG2 │             │
│  │ ⭐   │ │      │ (star = principale)
│  └──────┘ └──────┘             │
│  [⋮]      [⋮]    (menu actions)│
│                                 │
│  ┌──────┐ ┌──────┐             │
│  │ IMG3 │ │ IMG4 │             │
│  └──────┘ └──────┘             │
│                                 │
│  [Sélectionner plusieurs]       │
│                                 │
└─────────────────────────────────┘
```

**Features:**

1. **Upload**
   - Bouton "+ Upload"
   - Image picker (max 10)
   - Preview avant envoi
   - Progress bar (fake)

2. **Grid photos**
   - 2 colonnes
   - Badge ⭐ sur photo principale
   - Long press: Mode sélection

3. **Menu actions (⋮)**
   - Définir comme principale
   - Modifier légende
   - Supprimer

4. **Mode sélection multiple**
   - Checkboxes
   - Barre actions: Supprimer sélection

5. **Drag to reorder** (optionnel - si temps)

**Mock:**
```typescript
const GALLERY_MOCK = [
  {
    id: "media-1",
    url: "https://images.unsplash.com/photo-1...",
    thumbnailUrl: "https://...",
    isPrimary: true,
    caption: "Photo principale",
    sortOrder: 0
  },
  {
    id: "media-2",
    url: "https://...",
    thumbnailUrl: "https://...",
    isPrimary: false,
    caption: null,
    sortOrder: 1
  }
  // ... autres
];
```

---

## 🎨 DESIGN SYSTEM

### Couleurs YapaGachis
```typescript
const Colors = {
  primary: "#00A57F",     // Vert principal
  secondary: "#D4F571",   // Vert lime (badges)
  success: "#00A57F",
  warning: "#FFA500",
  error: "#E53935",
  textPrimary: "#000000",
  textSecondary: "#666666",
  background: "#FFFFFF",
  surface: "#F5F5F5",
  border: "#E0E0E0"
};
```

### Composants Réutilisables

**Card:**
```typescript
<View style={{
  backgroundColor: 'white',
  borderRadius: 12,
  padding: 16,
  borderWidth: 1,
  borderColor: Colors.border,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 4,
  elevation: 2
}}>
```

**Bouton Principal:**
```typescript
<TouchableOpacity style={{
  backgroundColor: Colors.primary,
  paddingVertical: 14,
  paddingHorizontal: 32,
  borderRadius: 8,
  alignItems: 'center'
}}>
  <Text style={{
    color: 'white',
    fontSize: 16,
    fontFamily: 'Ubuntu_700Bold'
  }}>Texte</Text>
</TouchableOpacity>
```

**Badge:**
```typescript
<View style={{
  backgroundColor: Colors.secondary,
  paddingHorizontal: 8,
  paddingVertical: 4,
  borderRadius: 4
}}>
  <Text style={{ fontSize: 12, fontWeight: 'bold' }}>Badge</Text>
</View>
```

**Input:**
```typescript
<TextInput
  style={{
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Ubuntu_400Regular'
  }}
  placeholderTextColor={Colors.textSecondary}
/>
```

---

## ✅ CHECKLIST PAR ÉCRAN

Avant de marquer un écran comme terminé:

- [ ] **UI complète** selon maquette
- [ ] **Données mockées** réalistes
- [ ] **States:**
  - [ ] Loading (skeleton ou spinner)
  - [ ] Error (message + retry)
  - [ ] Empty (illustration + texte)
- [ ] **Validation formulaire** (si applicable)
- [ ] **Animations** (fade, slide, scale)
- [ ] **Navigation** (retour, suivant)
- [ ] **Responsive** (testé sur plusieurs tailles)
- [ ] **Police:** Ubuntu (Regular, Medium, Bold)
- [ ] **Pas de shadows excessives** (user préférence)

---

## 🚦 PRIORITÉS

### Cette semaine (Sprint 1)
1. ✅ Sélection options deals
2. ✅ Formulaire création avis
3. ✅ Interactions sur avis

### Semaine prochaine (Sprint 2)
4. ✅ Écran récompenses amélioré
5. ✅ Historique points
6. ✅ Écran parrainage amélioré
7. ✅ Champ code inscription

### Dans 2 semaines (Sprint 3)
8. ✅ Gestion horaires
9. ✅ Gestion POS (liste + CRUD)
10. ✅ Gestion équipe

### Dans 3 semaines (Sprint 4)
11. ✅ Galerie photos vendeur

---

## 📝 NOTES IMPORTANTES

**Ce qu'on NE fait PAS pour l'instant:**
- ❌ Fetch API (utiliser mocks uniquement)
- ❌ Authentification réelle
- ❌ Upload fichiers réels (simuler avec image picker + fake progress)
- ❌ Paiements réels
- ❌ Notifications push

**Ce qu'on FAIT:**
- ✅ UI/UX complète et interactive
- ✅ Données mockées réalistes
- ✅ Validation formulaires
- ✅ Navigation entre écrans
- ✅ States (loading, error, empty)
- ✅ Animations fluides

**Rappel:**
- Police: **Ubuntu** (Regular, Medium, Bold)
- Éviter **trop de shadows** (préférence user)
- Couleur principale: **#00A57F**
- Border radius: **8-12px**

---

**Bon développement! 🚀**

---

**Document créé pour:** Gemini (développement frontend)
**Date:** 2026-01-09
**Version:** Maquettes fonctionnelles avec mocks
