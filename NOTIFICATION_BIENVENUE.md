# Notification de Bienvenue 🎉

## ✅ Implémentation Complète

Chaque nouveau utilisateur reçoit maintenant automatiquement une **notification de bienvenue** (push + in-app) lors de son inscription.

---

## 🎯 Fonctionnalité

### Quand la notification est envoyée

La notification de bienvenue est envoyée automatiquement dans les cas suivants :

1. ✅ **Inscription par téléphone/email** → [auth.service.ts:263-280](src/core/services/auth.service.ts:263-280)
2. ✅ **Inscription via Google OAuth** → [auth.service.ts:867-884](src/core/services/auth.service.ts:867-884)

### Type de notification

- **Type** : `WELCOME` (défini dans l'enum `NotificationType`)
- **Canaux** :
  - ✅ **Push notification** (si l'utilisateur a un device token)
  - ✅ **In-app notification** (stockée dans la base de données)
  - ❌ **Email** (désactivé pour éviter le spam)

---

## 📬 Contenu de la Notification

### Message de bienvenue

```
Titre: "Bienvenue [Prénom] ! 🎉"

Message: "Merci de rejoindre YaPasGachis ! Découvrez des produits à prix
réduits près de chez vous et contribuez à réduire le gaspillage alimentaire."
```

### Données additionnelles

```json
{
  "action": "open_home",
  "timestamp": "2026-01-26T12:34:56.789Z"
}
```

L'action `open_home` permet au frontend de rediriger l'utilisateur vers la page d'accueil lorsqu'il clique sur la notification.

---

## 🔄 Flux Technique

### 1. Inscription de l'utilisateur
```
User → S'inscrit (téléphone/email ou Google)
     → Compte créé dans la DB
     → Code de parrainage généré
```

### 2. Envoi de la notification
```
notificationService.create({
  userId: user.id,
  type: 'WELCOME',
  title: 'Bienvenue [Prénom] ! 🎉',
  message: '...',
  priority: 'NORMAL',
  data: { action: 'open_home' },
  sendPush: true,      // ✅ Push activé
  sendRealtime: true,  // ✅ WebSocket activé
  sendEmail: false     // ❌ Email désactivé
})
```

### 3. Traitement
```
Notification créée dans la DB
     ↓
Préférences utilisateur vérifiées
     ↓
Push notification ajoutée à la queue BullMQ
     ↓
Notification envoyée via FCM (Firebase Cloud Messaging)
     ↓
WebSocket envoie la notification en temps réel
```

---

## 🎨 Personnalisation

### Modifier le message de bienvenue

Pour personnaliser le message, modifier le fichier [auth.service.ts](src/core/services/auth.service.ts) :

```typescript
await notificationService.create({
  userId: user.id,
  type: 'WELCOME' as any,
  title: `Bienvenue ${user.firstName} ! 🎉`,  // ← Personnaliser ici
  message: `Votre message personnalisé...`,    // ← Personnaliser ici
  priority: 'NORMAL' as any,
  data: {
    action: 'open_home',  // ← Changer l'action si besoin
    timestamp: new Date().toISOString(),
  },
  sendPush: true,
  sendRealtime: true,
  sendEmail: false,
});
```

### Messages de bienvenue selon le rôle

Pour envoyer des messages différents selon le rôle :

```typescript
let welcomeMessage = '';

switch (user.role) {
  case 'CLIENT':
    welcomeMessage = 'Découvrez des produits à prix réduits près de chez vous !';
    break;
  case 'SUPPLIER_FOOD':
    welcomeMessage = 'Commencez à vendre vos surplus et réduisez le gaspillage !';
    break;
  case 'ASSOCIATION':
    welcomeMessage = 'Commencez à recevoir des dons alimentaires !';
    break;
  default:
    welcomeMessage = 'Bienvenue sur YaPasGachis !';
}

await notificationService.create({
  userId: user.id,
  type: 'WELCOME' as any,
  title: `Bienvenue ${user.firstName} ! 🎉`,
  message: welcomeMessage,
  // ... reste de la config
});
```

---

## 🧪 Test

### Tester la notification de bienvenue

1. **Créer un nouveau compte** (téléphone/email ou Google)
2. **Vérifier dans la base de données** :
   ```sql
   SELECT * FROM notifications
   WHERE user_id = '<user_id>'
   AND type = 'WELCOME'
   ORDER BY created_at DESC
   LIMIT 1;
   ```

3. **Vérifier la réception** :
   - **In-app** : L'utilisateur voit la notification dans son centre de notifications
   - **Push** : L'utilisateur reçoit une notification push sur son appareil

### Via l'API

```bash
# Après inscription
GET /api/v1/notifications
Authorization: Bearer <token>
```

**Réponse attendue :**
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "WELCOME",
        "title": "Bienvenue John ! 🎉",
        "message": "Merci de rejoindre YaPasGachis ! ...",
        "read": false,
        "data": {
          "action": "open_home",
          "timestamp": "2026-01-26T..."
        },
        "createdAt": "2026-01-26T..."
      }
    ]
  }
}
```

---

## 📊 Métriques

### Logs disponibles

Les logs suivants sont générés pour chaque notification :

```
✅ Success: "Welcome notification sent" - userId: <id>
❌ Error: "Failed to send welcome notification" - userId: <id>, error: <message>
```

### Monitoring

Pour voir les notifications de bienvenue envoyées :

```sql
-- Nombre de notifications de bienvenue envoyées aujourd'hui
SELECT COUNT(*)
FROM notifications
WHERE type = 'WELCOME'
AND DATE(created_at) = CURRENT_DATE;

-- Notifications push envoyées
SELECT COUNT(*)
FROM notifications
WHERE type = 'WELCOME'
AND push_sent = true
AND DATE(created_at) = CURRENT_DATE;

-- Taux de lecture
SELECT
  COUNT(*) as total,
  SUM(CASE WHEN read = true THEN 1 ELSE 0 END) as read_count,
  ROUND(SUM(CASE WHEN read = true THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as read_rate
FROM notifications
WHERE type = 'WELCOME'
AND created_at > NOW() - INTERVAL '7 days';
```

---

## 🔧 Dépendances

### Services utilisés

- ✅ `notificationService` - Gestion des notifications
- ✅ `notificationQueue` (BullMQ) - Envoi asynchrone des push
- ✅ `notificationPreferencesService` - Vérification des préférences utilisateur
- ✅ `socketService` - Notifications en temps réel (WebSocket)
- ✅ FCM (Firebase Cloud Messaging) - Envoi des push notifications

### Configuration requise

Vérifier que ces variables d'environnement sont configurées :

```env
# Firebase Cloud Messaging (pour les push)
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Redis (pour la queue BullMQ)
REDIS_HOST=
REDIS_PORT=
REDIS_PASSWORD=
```

---

## 🚀 Prochaines Améliorations

### Suggestions

1. **Notification différée** : Envoyer la notification 5 minutes après l'inscription (après vérification du compte)
2. **Message personnalisé selon la localisation** : Mentionner les produits disponibles dans la ville
3. **Série de bienvenue** :
   - Jour 1 : Message de bienvenue
   - Jour 3 : "Découvrez votre premier produit"
   - Jour 7 : "Invitez vos amis avec votre code de parrainage"
4. **A/B Testing** : Tester différents messages pour optimiser l'engagement
5. **Notification email** : Activer l'email de bienvenue avec un guide d'utilisation

---

## ✅ État Actuel

- ✅ Notification envoyée à l'inscription par téléphone/email
- ✅ Notification envoyée à l'inscription Google OAuth
- ✅ Push notification activée
- ✅ In-app notification activée
- ✅ WebSocket en temps réel
- ✅ Logs et monitoring
- ✅ Gestion d'erreur (ne bloque pas l'inscription)
- ❌ Email de bienvenue (désactivé)

---

**Notification de bienvenue 100% opérationnelle !** 🎉

Les nouveaux utilisateurs reçoivent maintenant un accueil chaleureux dès leur inscription.
