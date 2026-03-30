#!/bin/bash

# Quick Auth Test - Phase 3

BASE_URL="http://localhost:3000"
EMAIL="qatester$(date +%s)@crm.test"
PASSWORD="TestPass123!"
FNAME="QA"
LNAME="Tester"

echo "🧪 QUICK AUTHENTICATION TEST"
echo "=============================="
echo ""

# Test 1: Health
echo "1️⃣  Health Check..."
HEALTH=$(curl -s -w "\n%{http_code}" $BASE_URL/api/health)
HTTP_CODE=$(echo "$HEALTH" | tail -1)
echo "   Status: $HTTP_CODE ✅"
echo ""

# Test 2: Register
echo "2️⃣  Register User..."
echo "   Email: $EMAIL"
REGISTER=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"firstName\":\"$FNAME\",\"lastName\":\"$LNAME\"}")

HTTP_CODE=$(echo "$REGISTER" | tail -1)
BODY=$(echo "$REGISTER" | head -n-1)

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ Registration successful - HTTP $HTTP_CODE"
  TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "   Token received: ${TOKEN:0:20}..."
else
  echo "   ❌ Registration failed - HTTP $HTTP_CODE"
  echo "   Response: $BODY"
fi
echo ""

# Test 3: Login
echo "3️⃣  Login..."
LOGIN=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")

HTTP_CODE=$(echo "$LOGIN" | tail -1)
BODY=$(echo "$LOGIN" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "   ✅ Login successful - HTTP $HTTP_CODE"
  TOKEN=$(echo "$BODY" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
  echo "   Token: ${TOKEN:0:20}..."
  
  # Test 4: List Clients with token
  echo ""
  echo "4️⃣  List Clients (with token)..."
  CLIENTS=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/clients" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json")
  
  HTTP_CODE=$(echo "$CLIENTS" | tail -1)
  if [ "$HTTP_CODE" = "200" ]; then
    echo "   ✅ Clients retrieved - HTTP $HTTP_CODE"
  else
    echo "   ❌ Failed - HTTP $HTTP_CODE"
  fi
else
  echo "   ❌ Login failed - HTTP $HTTP_CODE"
  echo "   Response: $BODY"
fi

echo ""
echo "=============================="
echo "✅ Test Complete"
