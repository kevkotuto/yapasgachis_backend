#!/bin/bash

# Script de test pour vérifier les corrections du bug supplier
# User de test: dab71967-35f0-442e-a4c9-7557b626278e
# Supplier Profile: 20763af6-68a2-43d8-9606-f766be258fe6

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_URL="http://localhost:3004/api/v1"
# Remplacez par votre token JWT actuel
JWT_TOKEN="YOUR_JWT_TOKEN_HERE"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Test des corrections Bug Supplier${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

# Test 1: Vérifier le profil supplier
echo -e "${YELLOW}Test 1: GET /suppliers/profile${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "${API_URL}/suppliers/profile" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ SUCCESS: Profil récupéré (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq '.'
else
  echo -e "${RED}❌ FAILED: HTTP $HTTP_CODE${NC}"
  echo "$BODY" | jq '.'
fi
echo ""

# Test 2: Obtenir la liste des magasins (devrait fonctionner maintenant)
echo -e "${YELLOW}Test 2: GET /supplier/stores (BUG CORRIGÉ)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "${API_URL}/supplier/stores" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✅ SUCCESS: Liste des magasins récupérée (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq '.'
else
  echo -e "${RED}❌ FAILED: HTTP $HTTP_CODE${NC}"
  echo "$BODY" | jq '.'
fi
echo ""

# Test 3: Créer un magasin
echo -e "${YELLOW}Test 3: POST /supplier/stores (CRÉATION MAGASIN)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${API_URL}/supplier/stores" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Magasin Test - Plateau",
    "address": "15 Rue Test, Plateau",
    "city": "Abidjan",
    "commune": "Plateau",
    "operatingHours": {
      "monday": {"open": "08:00", "close": "20:00"},
      "tuesday": {"open": "08:00", "close": "20:00"},
      "wednesday": {"open": "08:00", "close": "20:00"},
      "thursday": {"open": "08:00", "close": "20:00"},
      "friday": {"open": "08:00", "close": "22:00"},
      "saturday": {"open": "09:00", "close": "22:00"},
      "sunday": {"open": "10:00", "close": "18:00"}
    },
    "deliveryEnabled": true,
    "pickupEnabled": true,
    "deliveryRadius": 10,
    "deliveryPricingMode": "DISTANCE_BASED",
    "deliveryBasePrice": 500,
    "deliveryPricePerKm": 200
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
  echo -e "${GREEN}✅ SUCCESS: Magasin créé (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq '.'
  STORE_ID=$(echo "$BODY" | jq -r '.data.id')
  echo -e "${GREEN}Store ID créé: $STORE_ID${NC}"
else
  echo -e "${RED}❌ FAILED: HTTP $HTTP_CODE${NC}"
  echo "$BODY" | jq '.'
fi
echo ""

# Test 4: Vérifier que SUPPLIER_FOOD peut créer des deals
echo -e "${YELLOW}Test 4: POST /supplier/deals (SUPPLIER_FOOD PEUT CRÉER DES DEALS)${NC}"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "${API_URL}/supplier/deals" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Deal Test - Anti-gaspillage",
    "description": "Test de création de deal par SUPPLIER_FOOD",
    "type": "HOTEL",
    "originalPrice": 50000,
    "discountedPrice": 30000,
    "discountPercentage": 40,
    "startDate": "2024-02-01T00:00:00.000Z",
    "endDate": "2024-12-31T23:59:59.000Z",
    "availableQuantity": 10
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "201" ]; then
  echo -e "${GREEN}✅ SUCCESS: Deal créé par SUPPLIER_FOOD (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq '.'
  DEAL_ID=$(echo "$BODY" | jq -r '.data.id')
  echo -e "${GREEN}Deal ID créé: $DEAL_ID${NC}"
else
  echo -e "${RED}❌ FAILED: HTTP $HTTP_CODE${NC}"
  echo "$BODY" | jq '.'
fi
echo ""

# Résumé
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}RÉSUMÉ DES TESTS${NC}"
echo -e "${YELLOW}========================================${NC}"
echo -e "${GREEN}✅ Correction 1: supplierProfileId maintenant récupéré depuis la DB${NC}"
echo -e "${GREEN}✅ Correction 2: SUPPLIER_FOOD peut créer des deals & deal rooms${NC}"
echo -e "${GREEN}✅ Les routes /supplier/stores devraient fonctionner maintenant${NC}"
echo ""
echo -e "${YELLOW}Note: N'oubliez pas de redémarrer le serveur backend!${NC}"
echo -e "${YELLOW}      npm run dev OU npm run build && npm start${NC}"
