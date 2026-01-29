# Guide des Logs Améliorés - YapaGachis Backend

## Vue d'ensemble

Les logs HTTP ont été améliorés pour fournir des informations détaillées sur chaque requête, notamment :
- Code de statut HTTP
- Durée de traitement
- Corps de la requête (sans données sensibles)
- Paramètres de requête
- Erreurs de validation détaillées

## Format des Logs

### Requêtes Réussies (2xx, 3xx)
```
2026-01-26 02:10:12 [info]: POST /api/v1/auth/register - 201 {
  "method": "POST",
  "url": "/api/v1/auth/register",
  "ip": "192.168.1.10",
  "statusCode": 201,
  "duration": "45ms",
  "body": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phoneNumber": "+221771234567",
    "password": "***REDACTED***"
  }
}
```

### Erreurs de Validation (422)
```
2026-01-26 02:10:12 [warn]: POST /api/v1/auth/register - 422 {
  "method": "POST",
  "url": "/api/v1/auth/register",
  "ip": "192.168.1.10",
  "statusCode": 422,
  "duration": "12ms",
  "body": {
    "firstName": "J",
    "lastName": "Doe",
    "email": "invalid-email",
    "phoneNumber": "123",
    "password": "***REDACTED***"
  },
  "error": "Erreur de validation",
  "validationErrors": [
    {
      "field": "body.firstName",
      "message": "String must contain at least 2 character(s)"
    },
    {
      "field": "body.email",
      "message": "Invalid email"
    },
    {
      "field": "body.phoneNumber",
      "message": "Invalid phone number format"
    }
  ]
}
```

### Erreurs Serveur (4xx, 5xx)
```
2026-01-26 02:10:12 [warn]: POST /api/v1/auth/login - 401 {
  "method": "POST",
  "url": "/api/v1/auth/login",
  "ip": "192.168.1.10",
  "statusCode": 401,
  "duration": "89ms",
  "body": {
    "phoneNumber": "+221771234567",
    "password": "***REDACTED***"
  },
  "error": "Identifiants invalides"
}
```

## Données Sensibles

Les champs suivants sont automatiquement masqués dans les logs :
- `password`, `newPassword`, `oldPassword`, `currentPassword`, `confirmPassword`
- `token`, `accessToken`, `refreshToken`
- `secret`, `apiKey`
- `creditCard`, `cvv`, `pin`, `otp`

Ces champs apparaîtront comme `"***REDACTED***"` dans les logs.

## Requêtes Lentes

Les requêtes prenant plus de 1 seconde génèrent un avertissement supplémentaire :
```
⚠️  Slow request: POST /api/v1/products/search took 1250ms
```

## Fichiers de Logs

Les logs sont stockés dans le dossier `logs/` :
- `combined-YYYY-MM-DD.log` : Tous les logs
- `error-YYYY-MM-DD.log` : Uniquement les erreurs
- `info-YYYY-MM-DD.log` : Logs informatifs
- `exceptions.log` : Exceptions non gérées
- `rejections.log` : Promesses rejetées non gérées

## Debugging des Erreurs 422

Pour déboguer une erreur 422 :

1. **Recherchez dans les logs** le timestamp de l'erreur
2. **Vérifiez le champ `validationErrors`** pour voir quels champs sont invalides
3. **Comparez avec `body`** pour voir les valeurs envoyées
4. **Corrigez le frontend** selon les règles de validation indiquées

### Exemple de Débogage

**Log d'erreur :**
```json
{
  "validationErrors": [
    {
      "field": "body.phoneNumber",
      "message": "Invalid phone number format. Expected: +[country code][number]"
    }
  ],
  "body": {
    "phoneNumber": "771234567"
  }
}
```

**Solution :** Le numéro de téléphone doit inclure l'indicatif pays avec le `+`
```javascript
// ❌ Incorrect
phoneNumber: "771234567"

// ✅ Correct
phoneNumber: "+221771234567"
```

## Filtrage des Logs

### Afficher uniquement les erreurs 422
```bash
grep "422" logs/combined-$(date +%Y-%m-%d).log
```

### Afficher les erreurs de validation
```bash
grep "Erreur de validation" logs/combined-$(date +%Y-%m-%d).log
```

### Afficher les requêtes lentes
```bash
grep "Slow request" logs/combined-$(date +%Y-%m-%d).log
```

### Filtrer par endpoint spécifique
```bash
grep "/api/v1/auth/register" logs/combined-$(date +%Y-%m-%d).log
```

## Intégration avec le Frontend

Lorsque vous recevez une erreur 422, utilisez le champ `errors` de la réponse :

```typescript
try {
  const response = await fetch('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (response.status === 422) {
    const errorData = await response.json();
    console.error('Validation errors:', errorData.errors);

    // errorData.errors est un tableau d'objets :
    // [{ field: "body.email", message: "Invalid email" }]

    // Afficher les erreurs dans le formulaire
    errorData.errors.forEach(err => {
      const fieldName = err.field.replace('body.', '');
      showFieldError(fieldName, err.message);
    });
  }
} catch (error) {
  console.error('Network error:', error);
}
```

## Métriques et Monitoring

Ces logs enrichis permettent de :
- Identifier les endpoints les plus lents
- Détecter les erreurs de validation fréquentes
- Analyser les patterns d'erreurs
- Améliorer l'UX en corrigeant les validations problématiques

## Configuration

Pour ajuster le niveau de détail des logs, modifiez `src/config/index.ts` :

```typescript
logging: {
  level: process.env.LOG_LEVEL || 'info', // debug, info, warn, error
  filePath: process.env.LOG_PATH || './logs',
}
```
