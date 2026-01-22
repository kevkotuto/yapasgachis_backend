# 🚀 Guide d'Intégration Backend YapaGachis

**Date:** 2026-01-09
**Status:** ✅ Tous les modules créés et prêts à intégrer

---

## 📋 Résumé Exécutif

**8 nouveaux modules** ont été développés pour compléter le backend YapaGachis:

1. ✅ **Deal Options** - Variants de deals (chambres, tailles, etc.)
2. ✅ **Reviews Enhancement** - Avis pour deals
3. ✅ **Rewards & Points** - Système de récompenses
4. ✅ **Referral System** - Parrainage
5. ✅ **Store Hours** - Horaires d'ouverture
6. ✅ **Points of Sale (POS)** - Multiples emplacements
7. ✅ **Team Members** - Gestion d'équipe
8. ✅ **Media Gallery** - Galerie photos multi-upload

**Total de fichiers créés:** ~60 fichiers (repositories, services, controllers, routes, validators, DTOs)

---

## 🔧 Étapes d'Intégration

### Étape 1: Mettre à jour schema.prisma

Le fichier [prisma-additions.txt](./prisma-additions.txt) contient tous les nouveaux modèles Prisma.

**Actions:**
1. Ouvrir `/src/infrastructure/database/prisma/schema.prisma`
2. Copier le contenu de `prisma-additions.txt` **À LA FIN** du schema existant
3. Mettre à jour les relations dans les modèles existants:

```prisma
// Dans model Deal (ligne ~1211)
model Deal {
  // ... champs existants ...
  dealOptions  DealOption[]  // AJOUTER
}

// Dans model DealBooking (ligne ~1290)
model DealBooking {
  // ... champs existants ...
  optionId     String?       // AJOUTER
  dealOption   DealOption?   @relation(fields: [optionId], references: [id], onDelete: SetNull)  // AJOUTER
}

// Dans model User (ligne ~258)
model User {
  // ... champs existants ...
  rewards         UserRewards?      // AJOUTER
  referralCodes   ReferralCode[]    // AJOUTER
  referralsGiven  Referral[]        @relation("Referrer")     // AJOUTER
  referralsReceived Referral[]      @relation("Referred")     // AJOUTER
  teamMemberships TeamMember[]      // AJOUTER
  uploadedMedia   Media[]           // AJOUTER
}

// Dans model SupplierProfile (ligne ~XXX)
model SupplierProfile {
  // ... champs existants ...
  pointsOfSale    PointOfSale[]     // AJOUTER
  teamMembers     TeamMember[]      // AJOUTER
}

// Dans model SupplierStore (ligne ~XXX)
model SupplierStore {
  // ... champs existants ...
  hours           StoreHours?       // AJOUTER (one-to-one)
  specialClosures SpecialClosure[]  // AJOUTER
}
```

4. Créer et exécuter la migration:
```bash
npx prisma migrate dev --name add_new_modules
npx prisma generate
```

---

### Étape 2: Enregistrer les routes dans app.ts

Ouvrir `/src/app.ts` et ajouter:

```typescript
// ==================== IMPORTS DES NOUVELLES ROUTES ====================
import dealOptionRoutes from '@/api/v1/routes/deal-option.routes';
import rewardRoutes from '@/api/v1/routes/reward.routes';
import referralRoutes from '@/api/v1/routes/referral.routes';
import storeHoursRoutes from '@/api/v1/routes/store-hours.routes';
import pointOfSaleRoutes from '@/api/v1/routes/point-of-sale.routes';
import teamMemberRoutes from '@/api/v1/routes/team-member.routes';
import mediaGalleryRoutes from '@/api/v1/routes/media-gallery.routes';

// ==================== ENREGISTREMENT DES ROUTES ====================
// Ajouter après les routes existantes (après review, product, etc.)

app.use('/api/v1/deal-options', dealOptionRoutes);
app.use('/api/v1/rewards', rewardRoutes);
app.use('/api/v1/referrals', referralRoutes);
app.use('/api/v1/store-hours', storeHoursRoutes);
app.use('/api/v1/pos', pointOfSaleRoutes);
app.use('/api/v1/team-members', teamMemberRoutes);
app.use('/api/v1/media', mediaGalleryRoutes);
```

---

### Étape 3: Installer dépendances manquantes

```bash
# Pour le module Media Gallery (si pas déjà installé)
npm install multer @types/multer
```

---

### Étape 4: Configuration

#### A. Media Gallery - Upload Cloud

Le service Media Gallery utilise des placeholders pour Cloudinary/S3. Implémenter dans `/src/infrastructure/storage/`:

```typescript
// Exemple pour Cloudinary
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadToCloudinary(file: Express.Multer.File) {
  const result = await cloudinary.uploader.upload(file.path, {
    folder: 'yapasgachis',
    resource_type: 'auto',
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}
```

Puis mettre à jour [media-gallery.service.ts](src/core/services/media-gallery.service.ts:80-90):
```typescript
// Remplacer le mock upload par:
const uploadResult = await uploadToCloudinary(file);
```

#### B. Team Members - Envoi d'invitations

Implémenter l'envoi d'emails/SMS dans [team-member.service.ts](src/core/services/team-member.service.ts:60-80):

```typescript
// Exemple avec votre service de notification existant
await this.notificationService.sendEmail({
  to: email,
  subject: 'Invitation à rejoindre l\'équipe YapaGachis',
  template: 'team-invitation',
  data: {
    inviterName: supplier.storeName,
    role: translateRole(role),
    acceptLink: `${config.appUrl}/team/accept?token=${invitationToken}`,
  },
});
```

#### C. Rewards - Hooks automatiques

Ajouter des hooks dans les services existants pour attribuer automatiquement des points:

**Dans order.service.ts (après création commande):**
```typescript
// Après avoir créé la commande et le paiement
await this.rewardService.awardPoints({
  userId: order.userId,
  amount: Math.floor(order.totalAmount / 100), // 1 point = 100 FCFA
  type: PointTransactionType.EARNED,
  source: PointSource.PURCHASE,
  description: `Achat commande #${order.orderNumber}`,
  reference: order.id,
});
```

**Dans review.service.ts (après création avis):**
```typescript
// Après avoir créé l'avis
await this.rewardService.awardPoints({
  userId: review.userId,
  amount: 50,
  type: PointTransactionType.EARNED,
  source: PointSource.REVIEW,
  description: 'Avis laissé',
  reference: review.id,
});
```

**Dans donation.service.ts (après donation):**
```typescript
// Après validation de la donation
await this.rewardService.awardPoints({
  userId: donation.donorId,
  amount: Math.floor(donation.value / 100), // Points basés sur valeur
  type: PointTransactionType.EARNED,
  source: PointSource.DONATION,
  description: 'Donation effectuée',
  reference: donation.id,
});
```

#### D. Referral - Hook à l'inscription

Dans [auth.service.ts](src/core/services/auth.service.ts), après création d'un utilisateur:

```typescript
// Si l'utilisateur s'est inscrit avec un code de parrainage
if (referralCode) {
  await this.referralService.useReferralCode({
    code: referralCode,
    newUserId: newUser.id,
  });
}
```

---

### Étape 5: Tests recommandés

#### A. Tests unitaires

Créer des tests pour chaque service dans `/tests/unit/`:

```bash
npm run test:unit
```

Exemple pour rewards:
```typescript
// tests/unit/reward.service.test.ts
import { RewardService } from '@/core/services/reward.service';

describe('RewardService', () => {
  it('should award points for purchase', async () => {
    const result = await rewardService.awardPoints({
      userId: 'user-123',
      amount: 150,
      type: 'EARNED',
      source: 'PURCHASE',
      description: 'Test purchase',
    });

    expect(result.balance).toBe(150);
  });

  it('should upgrade tier when threshold reached', async () => {
    // ... test upgrade BRONZE → SILVER à 1000 points
  });
});
```

#### B. Tests d'intégration

Tester les endpoints avec Postman ou `/tests/e2e/`:

```bash
# 1. Deal Options
POST /api/v1/deal-options
GET  /api/v1/deal-options/deal/:dealId

# 2. Reviews
POST /api/v1/reviews
GET  /api/v1/reviews/deal/:dealId

# 3. Rewards
GET  /api/v1/rewards/me
POST /api/v1/rewards/daily-login

# 4. Referrals
POST /api/v1/referrals/code
POST /api/v1/referrals/use

# 5. Store Hours
POST /api/v1/store-hours
GET  /api/v1/store-hours/:storeId/is-open

# 6. POS
POST /api/v1/pos
GET  /api/v1/pos/nearest?latitude=5.314&longitude=-4.008

# 7. Team Members
POST /api/v1/team-members
GET  /api/v1/team-members/stats

# 8. Media Gallery
POST /api/v1/media/upload (multipart/form-data)
GET  /api/v1/media/gallery/PRODUCT/:productId
```

---

## 📊 Modules créés - Détail complet

### 1. Deal Options

**Fichiers:**
- `/src/core/interfaces/dtos/deal-option.dto.ts`
- `/src/core/repositories/deal-option.repository.ts`
- `/src/core/services/deal-option.service.ts`
- `/src/api/v1/controllers/deal-option.controller.ts`
- `/src/api/v1/validators/deal-option.validator.ts`
- `/src/api/v1/routes/deal-option.routes.ts`

**Endpoints:**
- `GET /api/v1/deal-options/deal/:dealId` - Liste options (public)
- `POST /api/v1/deal-options` - Créer (SUPPLIER_DEALS)
- `PUT /api/v1/deal-options/:id` - Modifier (SUPPLIER_DEALS)
- `DELETE /api/v1/deal-options/:id` - Supprimer (SUPPLIER_DEALS)
- `PATCH /api/v1/deal-options/deal/:dealId/reorder` - Réordonner (SUPPLIER_DEALS)

---

### 2. Reviews Enhancement

**Fichiers modifiés:**
- `/src/core/repositories/review.repository.ts` - Ajout `getDealReviews()`
- `/src/core/services/review.service.ts` - Ajout `getDealReviews()`
- `/src/api/v1/controllers/review.controller.ts` - Ajout controller
- `/src/api/v1/routes/review.routes.ts` - Ajout route

**Nouveaux endpoints:**
- `GET /api/v1/reviews/deal/:dealId` - Avis d'un deal

---

### 3. Rewards & Points System

**Fichiers:**
- `/src/core/interfaces/dtos/reward.dto.ts`
- `/src/core/repositories/reward.repository.ts`
- `/src/core/services/reward.service.ts`
- `/src/api/v1/controllers/reward.controller.ts`
- `/src/api/v1/validators/reward.validator.ts`
- `/src/api/v1/routes/reward.routes.ts`

**Endpoints:**
- `GET /api/v1/rewards/me` - Mon solde
- `GET /api/v1/rewards/transactions` - Historique
- `POST /api/v1/rewards/redeem` - Utiliser points
- `POST /api/v1/rewards/daily-login` - Réclamer quotidiens
- `GET /api/v1/rewards/tiers` - Infos tiers
- `GET /api/v1/rewards/expiring-soon` - Points expirants

**Configuration:**
- 1 point = 100 FCFA dépensés
- Tiers: BRONZE (0), SILVER (1000), GOLD (5000), PLATINUM (10000)
- Expiration: 12 mois
- Sources: PURCHASE, REFERRAL, DONATION, REVIEW, SIGNUP_BONUS, DAILY_LOGIN

---

### 4. Referral System

**Fichiers:**
- `/src/core/interfaces/dtos/referral.dto.ts`
- `/src/core/repositories/referral.repository.ts`
- `/src/core/services/referral.service.ts`
- `/src/api/v1/controllers/referral.controller.ts`
- `/src/api/v1/validators/referral.validator.ts`
- `/src/api/v1/routes/referral.routes.ts`

**Endpoints:**
- `POST /api/v1/referrals/code` - Créer code
- `GET /api/v1/referrals/my-codes` - Mes codes
- `POST /api/v1/referrals/use` - Utiliser code
- `GET /api/v1/referrals/validate/:code` - Valider (public)
- `GET /api/v1/referrals/stats` - Stats
- `GET /api/v1/referrals/history` - Historique

**Récompenses:**
- Parrain: 200 points
- Filleul: 100 points

---

### 5. Store Hours

**Fichiers:**
- `/src/core/interfaces/dtos/store-hours.dto.ts`
- `/src/core/repositories/store-hours.repository.ts`
- `/src/core/services/store-hours.service.ts`
- `/src/api/v1/controllers/store-hours.controller.ts`
- `/src/api/v1/validators/store-hours.validator.ts`
- `/src/api/v1/routes/store-hours.routes.ts`

**Endpoints:**
- `GET /api/v1/store-hours/:storeId` - Horaires (public)
- `GET /api/v1/store-hours/:storeId/is-open` - Ouvert ? (public)
- `POST /api/v1/store-hours` - Créer (SUPPLIER)
- `PUT /api/v1/store-hours/:storeId` - Modifier (SUPPLIER)
- `POST /api/v1/store-hours/:storeId/special-closure` - Fermeture exceptionnelle

---

### 6. Points of Sale (POS)

**Fichiers:**
- `/src/core/interfaces/dtos/point-of-sale.dto.ts`
- `/src/core/repositories/point-of-sale.repository.ts`
- `/src/core/services/point-of-sale.service.ts`
- `/src/api/v1/controllers/point-of-sale.controller.ts`
- `/src/api/v1/validators/point-of-sale.validator.ts`
- `/src/api/v1/routes/point-of-sale.routes.ts`

**Endpoints:**
- `GET /api/v1/pos/:id` - Détail (public)
- `GET /api/v1/pos/search` - Rechercher
- `GET /api/v1/pos/nearest` - Plus proches (géoloc)
- `POST /api/v1/pos` - Créer (SUPPLIER)
- `PUT /api/v1/pos/:id` - Modifier (SUPPLIER)
- `DELETE /api/v1/pos/:id` - Supprimer (SUPPLIER)

**Types:** MAIN, BRANCH, KIOSK, WAREHOUSE, PICKUP_POINT

---

### 7. Team Members

**Fichiers:**
- `/src/core/interfaces/dtos/team-member.dto.ts`
- `/src/core/repositories/team-member.repository.ts`
- `/src/core/services/team-member.service.ts`
- `/src/api/v1/controllers/team-member.controller.ts`
- `/src/api/v1/validators/team-member.validator.ts`
- `/src/api/v1/routes/team-member.routes.ts`

**Endpoints:**
- `POST /api/v1/team-members` - Inviter (SUPPLIER)
- `GET /api/v1/team-members` - Liste (SUPPLIER)
- `GET /api/v1/team-members/stats` - Stats (SUPPLIER)
- `PUT /api/v1/team-members/:id` - Modifier (SUPPLIER)
- `DELETE /api/v1/team-members/:id` - Supprimer (SUPPLIER)
- `POST /api/v1/team-members/accept-invitation` - Accepter

**Rôles:** MANAGER, CASHIER, STOCK_MANAGER, DELIVERY, SUPPORT, ADMIN

---

### 8. Media Gallery

**Fichiers:**
- `/src/core/interfaces/dtos/media-gallery.dto.ts`
- `/src/core/repositories/media-gallery.repository.ts`
- `/src/core/services/media-gallery.service.ts`
- `/src/api/v1/controllers/media-gallery.controller.ts`
- `/src/api/v1/validators/media-gallery.validator.ts`
- `/src/api/v1/routes/media-gallery.routes.ts`

**Endpoints:**
- `POST /api/v1/media/upload` - Upload (multipart)
- `GET /api/v1/media/gallery/:entityType/:entityId` - Galerie (public)
- `PUT /api/v1/media/:id` - Modifier métadonnées
- `DELETE /api/v1/media/:id` - Supprimer
- `POST /api/v1/media/bulk-delete` - Suppression multiple
- `PATCH /api/v1/media/:id/set-primary` - Définir principal
- `PATCH /api/v1/media/reorder/:entityType/:entityId` - Réordonner

**Limites:**
- Max 10 fichiers par upload
- Max 10MB par fichier
- Formats: JPEG, PNG, GIF, WEBP, MP4, PDF

---

## 🎯 Prochaines Étapes

### Immédiat (Aujourd'hui)
1. ✅ Intégrer schema Prisma (Étape 1)
2. ✅ Enregistrer routes dans app.ts (Étape 2)
3. ✅ Tester endpoint Deal Options (priorité frontend)

### Court terme (Cette semaine)
4. ⚙️ Configurer upload cloud (Cloudinary/S3)
5. ⚙️ Implémenter hooks rewards automatiques
6. 🧪 Tests E2E de tous les modules

### Moyen terme (Semaine prochaine)
7. 📱 Frontend développe les écrans (voir FRONTEND_DEVELOPMENT_SPEC.md)
8. 🔗 Intégration frontend-backend
9. 🐛 Bug fixes & optimisations

---

## 📚 Documentation Générée

- **[FRONTEND_DEVELOPMENT_SPEC.md](./FRONTEND_DEVELOPMENT_SPEC.md)** - Spécifications complètes pour Gemini avec données mockées
- **[prisma-additions.txt](./prisma-additions.txt)** - Modèles Prisma à ajouter
- **Ce fichier** - Guide d'intégration backend

---

## ✅ Checklist d'Intégration

Cocher au fur et à mesure:

### Backend
- [ ] Schema Prisma mis à jour
- [ ] Migration Prisma exécutée (`npx prisma migrate dev`)
- [ ] Routes enregistrées dans app.ts
- [ ] Multer installé (`npm install multer @types/multer`)
- [ ] Upload cloud configuré (Cloudinary/S3)
- [ ] Hooks rewards ajoutés (order, review, donation)
- [ ] Hook referral ajouté (auth register)
- [ ] Service d'invitation emails/SMS configuré
- [ ] Tests unitaires passent
- [ ] Tests E2E passent
- [ ] Documentation Swagger générée

### Frontend (Gemini)
- [ ] Options de deals (réservation chambres)
- [ ] Formulaire création d'avis
- [ ] Intégration fetch avis réels
- [ ] Écran récompenses & points
- [ ] Écran parrainage
- [ ] Gestion horaires vendeur
- [ ] Gestion POS vendeur
- [ ] Carte POS client
- [ ] Gestion équipe vendeur
- [ ] Galerie photos upload

---

## 🐛 Troubleshooting

### Erreur: "Cannot find module '@/core/repositories/deal-option.repository'"

**Cause:** TypeScript path alias non résolu

**Solution:**
```bash
# Vérifier tsconfig.json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}

# Rebuild
npm run build
```

---

### Erreur Prisma: "Field 'dealOptions' does not exist on model 'Deal'"

**Cause:** Migration non exécutée ou schema non à jour

**Solution:**
```bash
npx prisma generate
npx prisma migrate dev
```

---

### Erreur 500 sur upload: "Cannot read property 'buffer' of undefined"

**Cause:** Multer non configuré

**Solution:**
Vérifier que le middleware multer est appliqué dans la route upload

---

## 📞 Support

Pour toute question:
- Vérifier [CLAUDE.md](./CLAUDE.md) pour patterns du projet
- Consulter code existant (review.routes.ts, product.service.ts)
- Tester avec Postman/Swagger UI

---

**Bon déploiement! 🎉**

---

**Document créé par:** Claude Sonnet 4.5
**Date:** 2026-01-09
