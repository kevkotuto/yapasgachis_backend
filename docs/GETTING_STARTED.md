# Guide de Démarrage - YapaGachis Backend

Ce guide vous aidera à configurer et démarrer le projet YapaGachis Backend sur votre machine locale.

## Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Node.js** >= 18.0.0 ([Télécharger](https://nodejs.org/))
- **npm** >= 9.0.0 (inclus avec Node.js)
- **Docker Desktop** ([Télécharger](https://www.docker.com/products/docker-desktop/))
- **Git** ([Télécharger](https://git-scm.com/))

## Installation

### 1. Cloner le repository

```bash
git clone <repository-url>
cd yapasgachis_backend
```

### 2. Installer les dépendances

```bash
npm install
```

Cette commande va installer toutes les dépendances nécessaires listées dans `package.json`.

### 3. Configuration de l'environnement

#### Créer le fichier `.env`

```bash
cp .env.example .env
```

#### Modifier le fichier `.env`

Ouvrez le fichier `.env` et configurez les variables essentielles :

```env
# Application
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/yapasgachis?schema=public

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=votre-secret-jwt-super-securise
JWT_REFRESH_SECRET=votre-refresh-secret-super-securise

# Les autres variables peuvent rester commentées pour le développement local
```

> ⚠️ **Important**: Ne commitez JAMAIS le fichier `.env` dans Git. Il contient des informations sensibles.

## Démarrage avec Docker (Recommandé)

### 1. Démarrer les services Docker

```bash
npm run docker:up
```

Cette commande démarre :
- PostgreSQL sur le port 5432
- Redis sur le port 6379
- pgAdmin sur le port 5050 (interface web pour gérer PostgreSQL)
- Redis Commander sur le port 8081 (interface web pour gérer Redis)

### 2. Vérifier que les services sont démarrés

```bash
docker ps
```

Vous devriez voir 4 conteneurs en cours d'exécution.

### 3. Générer le client Prisma

```bash
npm run prisma:generate
```

Cette commande génère le client Prisma TypeScript basé sur le schéma défini.

### 4. Exécuter les migrations de base de données

```bash
npm run prisma:migrate
```

Cette commande :
- Crée les tables dans PostgreSQL
- Applique toutes les migrations
- Génère le client Prisma

### 5. (Optionnel) Peupler la base de données

```bash
npm run prisma:seed
```

Cette commande ajoute des données de test dans la base de données.

### 6. Démarrer le serveur de développement

```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

### 7. Tester l'API

Ouvrez votre navigateur ou utilisez curl :

```bash
# Health check
curl http://localhost:3000/health

# API info
curl http://localhost:3000/api/v1
```

Réponse attendue :
```json
{
  "success": true,
  "message": "YapaGachis API",
  "version": "v1",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Démarrage sans Docker

Si vous préférez installer PostgreSQL et Redis localement :

### 1. Installer PostgreSQL

**macOS (avec Homebrew):**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Téléchargez l'installateur depuis [postgresql.org](https://www.postgresql.org/download/windows/)

### 2. Créer la base de données

```bash
psql -U postgres
CREATE DATABASE yapasgachis;
\q
```

### 3. Installer Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**
```bash
sudo apt install redis-server
sudo systemctl start redis
```

**Windows:**
Utilisez WSL ou téléchargez depuis [redis.io](https://redis.io/download)

### 4. Suivre les étapes 3-7 de la section Docker

## Outils de Développement

### Prisma Studio

Interface graphique pour explorer et modifier vos données :

```bash
npm run prisma:studio
```

Ouvre sur `http://localhost:5555`

### pgAdmin (avec Docker)

Interface web pour PostgreSQL :
- URL: `http://localhost:5050`
- Email: `admin@yapasgachis.com`
- Mot de passe: `admin`

### Redis Commander (avec Docker)

Interface web pour Redis :
- URL: `http://localhost:8081`

## Commandes Utiles

### Développement

```bash
# Démarrer le serveur avec hot reload
npm run dev

# Vérifier le typage TypeScript
npm run type-check

# Linter le code
npm run lint

# Formatter le code
npm run format
```

### Base de données

```bash
# Créer une nouvelle migration
npm run prisma:migrate

# Réinitialiser la base de données (⚠️ supprime toutes les données)
npm run prisma:reset

# Ouvrir Prisma Studio
npm run prisma:studio

# Générer le client Prisma après modification du schéma
npm run prisma:generate
```

### Tests

```bash
# Lancer tous les tests
npm test

# Tests en mode watch
npm run test:watch

# Tests avec coverage
npm run test:coverage

# Tests unitaires seulement
npm run test:unit

# Tests d'intégration seulement
npm run test:integration
```

### Docker

```bash
# Démarrer les services
npm run docker:up

# Arrêter les services
npm run docker:down

# Voir les logs
npm run docker:logs
```

## Debugging

### VS Code

Créez `.vscode/launch.json` :

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Server",
      "runtimeArgs": [
        "-r",
        "ts-node/register",
        "-r",
        "tsconfig-paths/register"
      ],
      "args": ["${workspaceFolder}/src/server.ts"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

Appuyez sur F5 pour démarrer le debugging.

## Problèmes Courants

### Port déjà utilisé

Si le port 3000 est déjà utilisé :

```bash
# Trouver le processus
lsof -i :3000

# Tuer le processus
kill -9 <PID>

# Ou changer le port dans .env
PORT=3001
```

### Erreur de connexion à la base de données

1. Vérifiez que PostgreSQL est démarré :
   ```bash
   docker ps  # Si vous utilisez Docker
   # ou
   brew services list  # macOS
   sudo systemctl status postgresql  # Linux
   ```

2. Vérifiez la variable `DATABASE_URL` dans `.env`

### Erreur de connexion à Redis

1. Vérifiez que Redis est démarré :
   ```bash
   docker ps  # Si vous utilisez Docker
   # ou
   redis-cli ping  # Devrait retourner PONG
   ```

2. Vérifiez les variables Redis dans `.env`

### Erreur Prisma Client

```bash
# Régénérer le client
npm run prisma:generate
```

### Erreurs TypeScript

```bash
# Nettoyer et reconstruire
rm -rf dist node_modules
npm install
npm run build
```

## Prochaines Étapes

Maintenant que votre environnement est configuré :

1. Lisez la [Documentation de l'Architecture](./ARCHITECTURE.md)
2. Explorez le [Schéma Prisma](../src/infrastructure/database/prisma/schema.prisma)
3. Consultez le [Cahier des charges](../cahier_de_charge.md)
4. Commencez à développer les features !

## Support

Si vous rencontrez des problèmes :

1. Consultez les [Issues GitHub](https://github.com/yapasgachis/backend/issues)
2. Vérifiez la documentation
3. Demandez de l'aide à l'équipe

## Ressources

- [Documentation Node.js](https://nodejs.org/docs/)
- [Documentation TypeScript](https://www.typescriptlang.org/docs/)
- [Documentation Prisma](https://www.prisma.io/docs/)
- [Documentation Express](https://expressjs.com/)
- [Documentation Redis](https://redis.io/documentation)
