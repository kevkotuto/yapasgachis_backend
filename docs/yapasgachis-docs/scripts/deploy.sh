#!/bin/bash

# Script de deploiement de la documentation YapaGachis
# Deploie le build statique Next.js vers doc.yapasgachis.com via FTP

set -e

# Couleurs pour les logs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration FTP
FTP_HOST="doc.yapasgachis.com"
FTP_USER="kevine@doc.yapasgachis.com"
FTP_PASS="Ecolfa@961"

# Repertoire du script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUT_DIR="$PROJECT_DIR/out"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  YapaGachis Documentation Deployment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Verification de lftp
if ! command -v lftp &> /dev/null; then
    echo -e "${RED}Erreur: lftp n'est pas installe${NC}"
    echo -e "${YELLOW}Installez-le avec: brew install lftp${NC}"
    exit 1
fi

# Etape 1: Build
echo -e "${YELLOW}[1/3] Build du projet Next.js...${NC}"
cd "$PROJECT_DIR"
npm run build

if [ ! -d "$OUT_DIR" ]; then
    echo -e "${RED}Erreur: Le dossier 'out' n'existe pas apres le build${NC}"
    exit 1
fi

# Compter les fichiers
FILE_COUNT=$(find "$OUT_DIR" -type f | wc -l | tr -d ' ')
echo -e "${GREEN}Build termine: $FILE_COUNT fichiers generes${NC}"
echo ""

# Etape 2: Upload FTP
echo -e "${YELLOW}[2/3] Upload vers $FTP_HOST...${NC}"

lftp -e "
set ssl:verify-certificate no;
set net:timeout 30;
set net:max-retries 3;
mirror -R --verbose --delete --parallel=4 $OUT_DIR/ /;
quit
" -u "$FTP_USER","$FTP_PASS" "ftp://$FTP_HOST"

echo ""
echo -e "${GREEN}[3/3] Upload termine!${NC}"
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}Documentation deployee avec succes!${NC}"
echo -e "${BLUE}URL: https://doc.yapasgachis.com${NC}"
echo -e "${BLUE}========================================${NC}"
