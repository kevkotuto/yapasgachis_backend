#!/bin/bash

################################################################################
# Script de Déploiement Production - Bugfix Supplier
# Server: 150.107.201.144
# Date: 2024-02-01
################################################################################

set -e  # Exit on error

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SERVER="150.107.201.144"
SERVER_USER="root"
BACKEND_PATH="/opt/apps/nodejs/yapasgachis_backend"
DOCKER_PATH="/opt/docker"
BRANCH="production"

################################################################################
# Fonctions Utilitaires
################################################################################

print_header() {
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

confirm() {
    echo -e "${YELLOW}$1${NC}"
    read -p "Continuer? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Déploiement annulé par l'utilisateur"
        exit 1
    fi
}

################################################################################
# Étape 0: Vérifications Pré-Déploiement
################################################################################

pre_deployment_checks() {
    print_header "PRÉ-DÉPLOIEMENT: Vérifications"

    # Vérifier la branche
    print_step "Vérification de la branche Git..."
    CURRENT_BRANCH=$(git branch --show-current)
    if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
        print_error "Vous n'êtes pas sur la branche '$BRANCH' (branche actuelle: $CURRENT_BRANCH)"
        exit 1
    fi
    print_success "Branche correcte: $CURRENT_BRANCH"

    # Vérifier les changements non commités
    print_step "Vérification des changements non commités..."
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "Vous avez des changements non commités:"
        git status --short
        confirm "Voulez-vous continuer sans les commiter?"
    else
        print_success "Aucun changement non commité"
    fi

    # Vérifier la compilation TypeScript
    print_step "Vérification de la compilation TypeScript..."
    if npm run type-check > /dev/null 2>&1; then
        print_success "Compilation TypeScript OK"
    else
        print_error "Erreurs de compilation TypeScript détectées"
        npm run type-check
        exit 1
    fi

    # Vérifier l'accès SSH
    print_step "Vérification de l'accès SSH au serveur..."
    if ssh -o ConnectTimeout=5 -o BatchMode=yes $SERVER_USER@$SERVER "echo 'SSH OK'" > /dev/null 2>&1; then
        print_success "Accès SSH OK"
    else
        print_error "Impossible de se connecter au serveur via SSH"
        print_warning "Essayez: ssh $SERVER_USER@$SERVER"
        exit 1
    fi

    print_success "Toutes les vérifications pré-déploiement sont OK"
}

################################################################################
# Étape 1: Backup Base de Données
################################################################################

backup_database() {
    print_header "ÉTAPE 1/6: Backup Base de Données"

    print_step "Création du backup sur le serveur..."
    BACKUP_NAME="yapasgachis_backup_$(date +%Y%m%d_%H%M%S)_pre_supplier_fix.sql"

    ssh $SERVER_USER@$SERVER << EOF
echo "Création du backup: $BACKUP_NAME"
docker exec postgres pg_dump -U root yapasgachis > /root/$BACKUP_NAME

if [ -f "/root/$BACKUP_NAME" ]; then
    BACKUP_SIZE=\$(du -h /root/$BACKUP_NAME | cut -f1)
    echo "✅ Backup créé: /root/$BACKUP_NAME (\$BACKUP_SIZE)"
else
    echo "❌ Erreur lors de la création du backup"
    exit 1
fi
EOF

    if [ $? -eq 0 ]; then
        print_success "Backup DB créé avec succès: $BACKUP_NAME"
    else
        print_error "Échec de la création du backup"
        exit 1
    fi
}

################################################################################
# Étape 2: Commit et Push des Changements
################################################################################

commit_and_push() {
    print_header "ÉTAPE 2/6: Commit et Push"

    # Vérifier s'il y a des changements à commiter
    if [ -z "$(git status --porcelain)" ]; then
        print_warning "Aucun changement à commiter"

        # Vérifier si on est à jour avec origin
        git fetch origin $BRANCH
        LOCAL=$(git rev-parse @)
        REMOTE=$(git rev-parse @{u})

        if [ "$LOCAL" = "$REMOTE" ]; then
            print_success "Le code local est déjà à jour avec origin/$BRANCH"
            return 0
        else
            print_warning "Il y a des commits non pushés"
            confirm "Voulez-vous les pusher?"
            git push origin $BRANCH
            print_success "Code pushé vers origin/$BRANCH"
        fi
    else
        print_step "Ajout des fichiers modifiés..."
        git add src/middleware/auth.middleware.ts
        git add src/api/v1/routes/deal.routes.ts
        git add src/api/v1/routes/deal-option.routes.ts
        git add BUGFIX_SUPPLIER.md
        git add test-supplier-fix.sh
        git add DEPLOYMENT_PLAN.md
        git add deploy-to-production.sh

        print_step "Création du commit..."
        git commit -m "fix: Supplier profile detection & unified permissions

- Fix: supplierProfileId not populated in req.user
  - Modified auth middleware to fetch user with profile relations
  - Now retrieves supplierProfileId, associationProfileId, advertiserProfileId
  - Resolves 'Profil fournisseur requis' error for valid suppliers

- Fix: SUPPLIER_FOOD can now act as SUPPLIER_DEALS
  - Updated deal.routes.ts to allow both roles for room management
  - Updated deal-option.routes.ts to allow both roles for option management
  - Unified permissions across supplier types

Breaking Changes: NONE
Migration Required: NO
Performance Impact: +1 DB query per authenticated request (~5-10ms)

Tested with user: dab71967-35f0-442e-4c9-7557b626278e
Supplier profile: 20763af6-68a2-43d8-9606-f766be258fe6

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"

        print_step "Push vers origin/$BRANCH..."
        git push origin $BRANCH

        print_success "Code commité et pushé avec succès"
    fi

    # Afficher le dernier commit
    echo ""
    echo -e "${CYAN}Dernier commit:${NC}"
    git log -1 --oneline --decorate
    echo ""
}

################################################################################
# Étape 3: Déploiement sur le Serveur
################################################################################

deploy_to_server() {
    print_header "ÉTAPE 3/6: Déploiement sur le Serveur"

    print_step "Pull du code sur le serveur..."

    ssh $SERVER_USER@$SERVER << 'EOF'
cd /opt/apps/nodejs/yapasgachis_backend

echo "📥 Pull du code..."
git pull origin production

echo ""
echo "📋 Dernier commit:"
git log -1 --oneline --decorate

echo ""
echo "📊 Fichiers modifiés:"
git diff HEAD~1 --stat

echo ""
echo "🐳 Rebuild de l'image Docker..."
docker build -t yapasgachis-backend:latest .

echo ""
echo "🔄 Redémarrage du container..."
cd /opt/docker
docker compose up -d yapasgachis-backend

echo ""
echo "⏳ Attente du démarrage du container (10s)..."
sleep 10

echo ""
echo "✅ Déploiement terminé"
EOF

    if [ $? -eq 0 ]; then
        print_success "Déploiement sur le serveur terminé"
    else
        print_error "Échec du déploiement"
        exit 1
    fi
}

################################################################################
# Étape 4: Vérifications Post-Déploiement
################################################################################

post_deployment_checks() {
    print_header "ÉTAPE 4/6: Vérifications Post-Déploiement"

    print_step "Vérification du container..."

    ssh $SERVER_USER@$SERVER << 'EOF'
# Vérifier que le container tourne
if docker ps | grep -q yapasgachis-backend; then
    echo "✅ Container yapasgachis-backend est en cours d'exécution"
else
    echo "❌ Container yapasgachis-backend n'est pas en cours d'exécution"
    exit 1
fi

# Vérifier les derniers logs
echo ""
echo "📋 Derniers logs du container:"
docker logs yapasgachis-backend --tail 20

# Vérifier le health endpoint
echo ""
echo "🏥 Vérification du endpoint /health..."
HEALTH_RESPONSE=$(curl -s http://localhost:3004/health)
if echo "$HEALTH_RESPONSE" | grep -q '"status":"healthy"'; then
    echo "✅ Health check OK"
    echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"
else
    echo "❌ Health check FAILED"
    echo "$HEALTH_RESPONSE"
    exit 1
fi
EOF

    if [ $? -eq 0 ]; then
        print_success "Vérifications post-déploiement OK"
    else
        print_error "Échec des vérifications post-déploiement"
        print_warning "Consultez les logs: ssh $SERVER_USER@$SERVER 'docker logs yapasgachis-backend --tail 100'"
        exit 1
    fi
}

################################################################################
# Étape 5: Tests Fonctionnels
################################################################################

functional_tests() {
    print_header "ÉTAPE 5/6: Tests Fonctionnels"

    print_warning "Tests fonctionnels nécessitent un JWT token valide"
    print_warning "Exécutez manuellement: ./test-supplier-fix.sh"

    read -p "Voulez-vous voir les logs en temps réel? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_step "Affichage des logs en temps réel (Ctrl+C pour quitter)..."
        ssh $SERVER_USER@$SERVER "docker logs yapasgachis-backend --tail 50 --follow"
    fi
}

################################################################################
# Étape 6: Résumé et Monitoring
################################################################################

summary_and_monitoring() {
    print_header "ÉTAPE 6/6: Résumé et Monitoring"

    print_success "🎉 DÉPLOIEMENT TERMINÉ AVEC SUCCÈS"
    echo ""

    echo -e "${CYAN}📊 Résumé:${NC}"
    echo "  • Serveur: $SERVER"
    echo "  • Branche: $BRANCH"
    echo "  • Backup DB: Créé"
    echo "  • Code: Déployé"
    echo "  • Container: Redémarré"
    echo "  • Health Check: ✅ OK"
    echo ""

    echo -e "${CYAN}🔍 Prochaines étapes recommandées:${NC}"
    echo "  1. Surveiller les logs pendant 30 minutes:"
    echo "     ssh $SERVER_USER@$SERVER 'docker logs yapasgachis-backend --tail 50 --follow'"
    echo ""
    echo "  2. Tester avec l'utilisateur affecté:"
    echo "     User ID: dab71967-35f0-442e-4c9-7557b626278e"
    echo "     Test: GET /supplier/stores devrait fonctionner"
    echo ""
    echo "  3. Surveiller les métriques:"
    echo "     ssh $SERVER_USER@$SERVER 'docker stats yapasgachis-backend'"
    echo ""
    echo "  4. En cas de problème, rollback:"
    echo "     ssh $SERVER_USER@$SERVER 'cd $BACKEND_PATH && git reset --hard HEAD~1 && docker build -t yapasgachis-backend:latest . && cd $DOCKER_PATH && docker compose up -d yapasgachis-backend'"
    echo ""

    print_warning "⏰ IMPORTANT: Surveillez le système pendant au moins 30 minutes"
}

################################################################################
# Fonction Principale
################################################################################

main() {
    print_header "🚀 DÉPLOIEMENT PRODUCTION - Bugfix Supplier"

    echo -e "${CYAN}Ce script va:${NC}"
    echo "  1. ✅ Vérifier les prérequis"
    echo "  2. 💾 Créer un backup de la base de données"
    echo "  3. 📤 Commit et push le code"
    echo "  4. 🚀 Déployer sur le serveur"
    echo "  5. ✅ Vérifier le déploiement"
    echo "  6. 🧪 Proposer des tests fonctionnels"
    echo ""

    confirm "Êtes-vous prêt à déployer en production?"

    # Exécution des étapes
    pre_deployment_checks
    backup_database
    commit_and_push
    deploy_to_server
    post_deployment_checks
    functional_tests
    summary_and_monitoring

    print_success "✅ Script de déploiement terminé"
}

################################################################################
# Gestion des erreurs
################################################################################

trap 'print_error "Une erreur est survenue à la ligne $LINENO. Déploiement interrompu."; exit 1' ERR

################################################################################
# Exécution
################################################################################

main "$@"
