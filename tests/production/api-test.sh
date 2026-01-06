#!/bin/bash

# Script de test complet de l'API YapaGachis en production
# Base URL: https://api.yapasgachis.com

BASE_URL="https://api.yapasgachis.com"
API_URL="$BASE_URL/api/v1"

# Couleurs pour l'affichage
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Compteurs
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Variables pour les tokens
ACCESS_TOKEN=""
REFRESH_TOKEN=""
SUPPLIER_TOKEN=""
ADMIN_TOKEN=""

# Fonction pour afficher le résultat d'un test
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_code=$4
    local description=$5
    local auth_header=$6

    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    echo -e "\n${BLUE}[$TOTAL_TESTS] $description${NC}"
    echo -e "   ${method} ${endpoint}"

    # Construire la commande curl
    if [ -n "$auth_header" ]; then
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $auth_header" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint" \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $auth_header")
        fi
    else
        if [ -n "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint" \
                -H "Content-Type: application/json" \
                -d "$data")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" "$API_URL$endpoint" \
                -H "Content-Type: application/json")
        fi
    fi

    # Extraire le code HTTP et le body
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    # Vérifier le code HTTP
    if [ "$http_code" -eq "$expected_code" ]; then
        echo -e "   ${GREEN}✓ HTTP $http_code (attendu: $expected_code)${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "   ${RED}✗ HTTP $http_code (attendu: $expected_code)${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    # Afficher le body (tronqué si trop long)
    if [ ${#body} -gt 500 ]; then
        echo -e "   Response: ${body:0:500}..."
    else
        echo -e "   Response: $body"
    fi

    # Retourner le body pour utilisation ultérieure
    echo "$body"
}

echo "=============================================="
echo "   TEST API YAPASGACHIS EN PRODUCTION"
echo "   $(date)"
echo "=============================================="
echo ""
echo "Base URL: $BASE_URL"
echo ""

# ============================================
# 1. HEALTH CHECK
# ============================================
echo -e "\n${YELLOW}=== 1. HEALTH CHECK ===${NC}"

echo -e "\n${BLUE}[1] Health Check${NC}"
response=$(curl -s "$BASE_URL/health")
echo "   GET /health"
if echo "$response" | grep -q '"success":true'; then
    echo -e "   ${GREEN}✓ Server is healthy${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}✗ Server health check failed${NC}"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: $response"

# ============================================
# 2. AUTHENTICATION ROUTES
# ============================================
echo -e "\n${YELLOW}=== 2. AUTHENTICATION ROUTES ===${NC}"

# Test register validation
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] POST /auth/register - Validation error${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"phoneNumber":"invalid"}')
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq "400" ]; then
    echo -e "   ${GREEN}✓ HTTP 400 - Validation works${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}✗ HTTP $http_code - Expected 400${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: $body"

# Test login avec utilisateur demo
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] POST /auth/login - Demo client${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"phoneNumber":"+22500000001","password":"Client123!"}')
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
echo "   HTTP: $http_code"
echo "   Response: $body"

if [ "$http_code" -eq "200" ]; then
    echo -e "   ${GREEN}✓ Login successful${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    # Extraire les tokens
    ACCESS_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$body" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
    echo "   AccessToken: ${ACCESS_TOKEN:0:50}..."
else
    echo -e "   ${YELLOW}⚠ Login failed (user may not exist)${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test login avec Super Admin
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] POST /auth/login - Super Admin${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"phoneNumber":"+22500000000","password":"SuperAdmin123!"}')
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
echo "   HTTP: $http_code"

if [ "$http_code" -eq "200" ]; then
    echo -e "   ${GREEN}✓ Admin login successful${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    ADMIN_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    echo "   AdminToken: ${ADMIN_TOKEN:0:50}..."
else
    echo -e "   ${YELLOW}⚠ Admin login failed${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: ${body:0:300}..."

# Test login avec Supplier
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] POST /auth/login - Demo Supplier${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"phoneNumber":"+22500000002","password":"Supplier123!"}')
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
echo "   HTTP: $http_code"

if [ "$http_code" -eq "200" ]; then
    echo -e "   ${GREEN}✓ Supplier login successful${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
    SUPPLIER_TOKEN=$(echo "$body" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    echo "   SupplierToken: ${SUPPLIER_TOKEN:0:50}..."
else
    echo -e "   ${YELLOW}⚠ Supplier login failed${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi

# Test refresh token validation
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] POST /auth/refresh-token - Validation${NC}"
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL/auth/refresh-token" \
    -H "Content-Type: application/json" \
    -d '{}')
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq "400" ]; then
    echo -e "   ${GREEN}✓ HTTP 400 - Validation works${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}✗ HTTP $http_code${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: $body"

# Test me sans token
TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] GET /auth/me - Without token${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/auth/me")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq "401" ]; then
    echo -e "   ${GREEN}✓ HTTP 401 - Auth required${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}✗ HTTP $http_code${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: $body"

# Test me avec token
if [ -n "$ACCESS_TOKEN" ]; then
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}[$TOTAL_TESTS] GET /auth/me - With token${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/auth/me" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    if [ "$http_code" -eq "200" ]; then
        echo -e "   ${GREEN}✓ HTTP 200 - Profile fetched${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "   ${RED}✗ HTTP $http_code${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo "   Response: ${body:0:300}..."
fi

# ============================================
# 3. PRODUCTS ROUTES (PUBLIC)
# ============================================
echo -e "\n${YELLOW}=== 3. PRODUCTS ROUTES ===${NC}"

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] GET /products - Public list${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/products")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq "200" ]; then
    echo -e "   ${GREEN}✓ HTTP 200${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}✗ HTTP $http_code${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: ${body:0:500}..."

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] GET /products?category=BAKERY - With filter${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/products?category=BAKERY")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq "200" ]; then
    echo -e "   ${GREEN}✓ HTTP 200${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}✗ HTTP $http_code${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: ${body:0:500}..."

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] GET /products/nearby - Geolocation${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/products/nearby?latitude=5.3484&longitude=-4.0154&radius=10")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq "200" ]; then
    echo -e "   ${GREEN}✓ HTTP 200${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}✗ HTTP $http_code${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: ${body:0:500}..."

# ============================================
# 4. DEALS ROUTES (PUBLIC)
# ============================================
echo -e "\n${YELLOW}=== 4. DEALS ROUTES ===${NC}"

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] GET /deals - Public list${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/deals")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq "200" ]; then
    echo -e "   ${GREEN}✓ HTTP 200${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}✗ HTTP $http_code${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: ${body:0:500}..."

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] GET /deals?category=FOOD - With filter${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/deals?category=FOOD")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq "200" ]; then
    echo -e "   ${GREEN}✓ HTTP 200${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}✗ HTTP $http_code${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: ${body:0:500}..."

# ============================================
# 5. STORES ROUTES (PUBLIC)
# ============================================
echo -e "\n${YELLOW}=== 5. STORES ROUTES ===${NC}"

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] GET /stores - Public list${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/stores")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq "200" ]; then
    echo -e "   ${GREEN}✓ HTTP 200${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}✗ HTTP $http_code${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: ${body:0:500}..."

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] GET /stores/nearby - Geolocation${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/stores/nearby?latitude=5.3484&longitude=-4.0154&radius=10")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq "200" ]; then
    echo -e "   ${GREEN}✓ HTTP 200${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}✗ HTTP $http_code${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: ${body:0:500}..."

# ============================================
# 6. ASSOCIATIONS ROUTES (PUBLIC)
# ============================================
echo -e "\n${YELLOW}=== 6. ASSOCIATIONS ROUTES ===${NC}"

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] GET /associations - Public list${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/associations")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq "200" ]; then
    echo -e "   ${GREEN}✓ HTTP 200${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}✗ HTTP $http_code${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: ${body:0:500}..."

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] GET /associations/verified - Verified only${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/associations/verified")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq "200" ]; then
    echo -e "   ${GREEN}✓ HTTP 200${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}✗ HTTP $http_code${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: ${body:0:500}..."

# ============================================
# 7. REVIEWS ROUTES (PUBLIC)
# ============================================
echo -e "\n${YELLOW}=== 7. REVIEWS ROUTES ===${NC}"

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] GET /reviews/product/:id - Without ID${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/reviews/product/00000000-0000-0000-0000-000000000000")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq "200" ] || [ "$http_code" -eq "404" ]; then
    echo -e "   ${GREEN}✓ HTTP $http_code${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}✗ HTTP $http_code${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: ${body:0:500}..."

# ============================================
# 8. SUPPLIER ROUTES (Authenticated)
# ============================================
echo -e "\n${YELLOW}=== 8. SUPPLIER ROUTES ===${NC}"

if [ -n "$SUPPLIER_TOKEN" ]; then
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}[$TOTAL_TESTS] GET /suppliers/profile - My profile${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/suppliers/profile" \
        -H "Authorization: Bearer $SUPPLIER_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    if [ "$http_code" -eq "200" ]; then
        echo -e "   ${GREEN}✓ HTTP 200${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "   ${RED}✗ HTTP $http_code${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo "   Response: ${body:0:500}..."

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}[$TOTAL_TESTS] GET /suppliers/products - My products${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/suppliers/products" \
        -H "Authorization: Bearer $SUPPLIER_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    if [ "$http_code" -eq "200" ]; then
        echo -e "   ${GREEN}✓ HTTP 200${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "   ${RED}✗ HTTP $http_code${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo "   Response: ${body:0:500}..."

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}[$TOTAL_TESTS] GET /suppliers/orders - My orders${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/suppliers/orders" \
        -H "Authorization: Bearer $SUPPLIER_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    if [ "$http_code" -eq "200" ]; then
        echo -e "   ${GREEN}✓ HTTP 200${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "   ${RED}✗ HTTP $http_code${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo "   Response: ${body:0:500}..."
else
    echo -e "   ${YELLOW}⚠ Skipping supplier tests (no token)${NC}"
fi

# ============================================
# 9. CLIENT ROUTES (Authenticated)
# ============================================
echo -e "\n${YELLOW}=== 9. CLIENT ROUTES ===${NC}"

if [ -n "$ACCESS_TOKEN" ]; then
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}[$TOTAL_TESTS] GET /orders - My orders${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/orders" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    if [ "$http_code" -eq "200" ]; then
        echo -e "   ${GREEN}✓ HTTP 200${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "   ${RED}✗ HTTP $http_code${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo "   Response: ${body:0:500}..."

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}[$TOTAL_TESTS] GET /notifications - My notifications${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/notifications" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    if [ "$http_code" -eq "200" ]; then
        echo -e "   ${GREEN}✓ HTTP 200${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "   ${RED}✗ HTTP $http_code${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo "   Response: ${body:0:500}..."

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}[$TOTAL_TESTS] GET /notifications/unread-count - Unread count${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/notifications/unread-count" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    if [ "$http_code" -eq "200" ]; then
        echo -e "   ${GREEN}✓ HTTP 200${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "   ${RED}✗ HTTP $http_code${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo "   Response: $body"

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}[$TOTAL_TESTS] GET /donations/my-donations - My donations${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/donations/my-donations" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    if [ "$http_code" -eq "200" ]; then
        echo -e "   ${GREEN}✓ HTTP 200${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "   ${RED}✗ HTTP $http_code${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo "   Response: ${body:0:500}..."
else
    echo -e "   ${YELLOW}⚠ Skipping client tests (no token)${NC}"
fi

# ============================================
# 10. ADMIN ROUTES
# ============================================
echo -e "\n${YELLOW}=== 10. ADMIN ROUTES ===${NC}"

if [ -n "$ADMIN_TOKEN" ]; then
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}[$TOTAL_TESTS] GET /admin/dashboard/stats - Dashboard${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/admin/dashboard/stats" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    if [ "$http_code" -eq "200" ]; then
        echo -e "   ${GREEN}✓ HTTP 200${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "   ${RED}✗ HTTP $http_code${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo "   Response: ${body:0:500}..."

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}[$TOTAL_TESTS] GET /admin/users - User list${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/admin/users" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    if [ "$http_code" -eq "200" ]; then
        echo -e "   ${GREEN}✓ HTTP 200${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "   ${RED}✗ HTTP $http_code${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo "   Response: ${body:0:500}..."

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}[$TOTAL_TESTS] GET /admin/suppliers - Supplier list${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/admin/suppliers" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    if [ "$http_code" -eq "200" ]; then
        echo -e "   ${GREEN}✓ HTTP 200${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "   ${RED}✗ HTTP $http_code${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo "   Response: ${body:0:500}..."

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}[$TOTAL_TESTS] GET /admin/products - Product list${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/admin/products" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    if [ "$http_code" -eq "200" ]; then
        echo -e "   ${GREEN}✓ HTTP 200${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "   ${RED}✗ HTTP $http_code${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo "   Response: ${body:0:500}..."

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -e "\n${BLUE}[$TOTAL_TESTS] GET /admin/dashboard/impact - Impact metrics${NC}"
    response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/admin/dashboard/impact" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    if [ "$http_code" -eq "200" ]; then
        echo -e "   ${GREEN}✓ HTTP 200${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "   ${RED}✗ HTTP $http_code${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    echo "   Response: ${body:0:500}..."
else
    echo -e "   ${YELLOW}⚠ Skipping admin tests (no token)${NC}"
fi

# ============================================
# 11. SUBSCRIPTIONS ROUTES
# ============================================
echo -e "\n${YELLOW}=== 11. SUBSCRIPTIONS ROUTES ===${NC}"

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] GET /subscriptions/plans - Public plans${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/subscriptions/plans")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq "200" ]; then
    echo -e "   ${GREEN}✓ HTTP 200${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}✗ HTTP $http_code${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: ${body:0:500}..."

# ============================================
# 12. ADVERTISING ROUTES
# ============================================
echo -e "\n${YELLOW}=== 12. ADVERTISING ROUTES ===${NC}"

TOTAL_TESTS=$((TOTAL_TESTS + 1))
echo -e "\n${BLUE}[$TOTAL_TESTS] GET /advertising/ads - Public ads${NC}"
response=$(curl -s -w "\n%{http_code}" -X GET "$API_URL/advertising/ads?placement=home&limit=5")
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
if [ "$http_code" -eq "200" ]; then
    echo -e "   ${GREEN}✓ HTTP 200${NC}"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "   ${RED}✗ HTTP $http_code${NC}"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
echo "   Response: ${body:0:500}..."

# ============================================
# FINAL REPORT
# ============================================
echo ""
echo "=============================================="
echo "   RAPPORT FINAL"
echo "=============================================="
echo ""
echo "Total des tests: $TOTAL_TESTS"
echo -e "${GREEN}Tests réussis: $PASSED_TESTS${NC}"
echo -e "${RED}Tests échoués: $FAILED_TESTS${NC}"
echo ""
if [ $TOTAL_TESTS -gt 0 ]; then
    success_rate=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo "Taux de réussite: $success_rate%"
fi
echo ""
echo "=============================================="
echo "   FIN DES TESTS"
echo "   $(date)"
echo "=============================================="
