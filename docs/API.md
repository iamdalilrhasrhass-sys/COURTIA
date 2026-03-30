# 📡 API Documentation

**Backend**: Node.js/Express  
**Status**: ✅ Production-ready  
**Base URL**: `http://localhost:3000`  
**Authentication**: JWT Bearer token

---

## Table des matières

- [Authentication](#-authentication)
- [Clients](#-clients)
- [Error Handling](#-error-handling)
- [Rate Limits](#-rate-limits)
- [Examples](#-examples)

---

## 🔐 Authentication

### Register (Create Account)

**POST** `/api/auth/register`

Create a new user account.

**Request:**
```json
{
  "email": "dalil@example.com",
  "password": "SecurePass123!",
  "firstName": "Dalil",
  "lastName": "Rhasrhass"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "dalil@example.com",
    "firstName": "Dalil",
    "lastName": "Rhasrhass",
    "createdAt": "2026-03-26T10:04:00Z"
  }
}
```

**Error (400 Bad Request):**
```json
{
  "success": false,
  "error": "Email already exists"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"dalil@example.com",
    "password":"SecurePass123!",
    "firstName":"Dalil",
    "lastName":"Rhasrhass"
  }'
```

---

### Login (Get Token)

**POST** `/api/auth/login`

Authenticate and get JWT token.

**Request:**
```json
{
  "email": "dalil@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "expiresIn": 604800,
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "dalil@example.com",
      "firstName": "Dalil",
      "lastName": "Rhasrhass"
    }
  }
}
```

**cURL Example:**
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dalil@example.com","password":"SecurePass123!"}' \
  | jq -r '.data.token')

echo "Token: $TOKEN"
```

---

### Verify Token

**POST** `/api/auth/verify`

Check if token is valid.

**Headers:**
```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token is valid",
  "data": {
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "expiresAt": 1711421040
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/auth/verify \
  -H "Authorization: Bearer $TOKEN"
```

---

### Refresh Token

**POST** `/api/auth/refresh`

Get a new token before expiry.

**Headers:**
```
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Token refreshed",
  "data": {
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "expiresIn": 604800
  }
}
```

---

## 👥 Clients

### List Clients

**GET** `/api/clients`

Get all clients with pagination.

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | number | 1 | Page number (0-indexed) |
| limit | number | 10 | Results per page |
| search | string | - | Filter by name/email |
| status | string | - | Filter: active, prospect, inactive |
| sort | string | -createdAt | Sort field (prefix `-` for desc) |

**Headers:**
```
Authorization: Bearer $TOKEN
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "clients": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "firstName": "Jean",
        "lastName": "Dupont",
        "email": "jean@example.com",
        "phone": "+33612345678",
        "company": "SARL Dupont",
        "status": "active",
        "riskScore": 45,
        "loyaltyScore": 78,
        "totalContracts": 3,
        "createdAt": "2026-03-20T14:30:00Z",
        "updatedAt": "2026-03-26T09:15:00Z"
      }
    ],
    "pagination": {
      "page": 0,
      "limit": 10,
      "total": 24,
      "pages": 3
    }
  }
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/clients?page=0&limit=10&status=active" \
  -H "Authorization: Bearer $TOKEN"
```

---

### Get Client (Detail)

**GET** `/api/clients/:id`

Get specific client details.

**Parameters:**
| Name | Type | Description |
|------|------|-------------|
| id | uuid | Client ID |

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "Jean",
    "lastName": "Dupont",
    "email": "jean@example.com",
    "phone": "+33612345678",
    "company": "SARL Dupont",
    "address": "123 Rue de la Paix, 75000 Paris",
    "city": "Paris",
    "zipCode": "75000",
    "country": "FR",
    "status": "active",
    "riskScore": 45,
    "loyaltyScore": 78,
    "totalContracts": 3,
    "totalClaims": 1,
    "lastContact": "2026-03-26T09:15:00Z",
    "notes": "Client important, contact prioritaire",
    "tags": ["vip", "assurance-auto"],
    "createdAt": "2026-03-20T14:30:00Z",
    "updatedAt": "2026-03-26T09:15:00Z"
  }
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/clients/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $TOKEN"
```

---

### Create Client

**POST** `/api/clients`

Create new client.

**Request:**
```json
{
  "firstName": "Jean",
  "lastName": "Dupont",
  "email": "jean@example.com",
  "phone": "+33612345678",
  "company": "SARL Dupont",
  "address": "123 Rue de la Paix",
  "city": "Paris",
  "zipCode": "75000",
  "country": "FR",
  "status": "active",
  "notes": "Client important"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Client created",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "firstName": "Jean",
    "lastName": "Dupont",
    "email": "jean@example.com",
    ...
  }
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Jean",
    "lastName":"Dupont",
    "email":"jean@example.com",
    "phone":"+33612345678"
  }'
```

---

### Update Client

**PUT** `/api/clients/:id`

Update client information.

**Request:**
```json
{
  "firstName": "Jean-Pierre",
  "email": "jean.pierre@example.com",
  "status": "inactive"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Client updated",
  "data": { ... }
}
```

**cURL Example:**
```bash
curl -X PUT http://localhost:3000/api/clients/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Jean-Pierre",
    "status":"inactive"
  }'
```

---

### Delete Client

**DELETE** `/api/clients/:id`

Soft delete client (marks as deleted, data preserved for audit).

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Client deleted successfully"
}
```

**cURL Example:**
```bash
curl -X DELETE http://localhost:3000/api/clients/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer $TOKEN"
```

---

### Search Clients

**GET** `/api/clients/search`

Search clients by name, email, or phone.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| q | string | Yes | Search query |
| limit | number | No | Max results (default: 20) |

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "firstName": "Jean",
      "lastName": "Dupont",
      "email": "jean@example.com",
      "score": 0.95
    }
  ]
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/clients/search?q=jean&limit=5" \
  -H "Authorization: Bearer $TOKEN"
```

---

## ❌ Error Handling

### HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | OK | Request successful |
| 201 | Created | Resource created |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | No permission |
| 404 | Not Found | Resource not found |
| 500 | Server Error | Internal error |

### Error Response Format

```json
{
  "success": false,
  "error": "Email already exists",
  "code": "VALIDATION_ERROR",
  "timestamp": "2026-03-26T10:04:00Z"
}
```

### Common Errors

**Missing Token (401)**
```json
{
  "success": false,
  "error": "Authorization header missing",
  "code": "NO_TOKEN"
}
```

**Invalid Token (401)**
```json
{
  "success": false,
  "error": "Invalid or expired token",
  "code": "INVALID_TOKEN"
}
```

**Validation Error (400)**
```json
{
  "success": false,
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "email": "Invalid email format",
    "password": "Must be at least 8 characters"
  }
}
```

**Not Found (404)**
```json
{
  "success": false,
  "error": "Client not found",
  "code": "NOT_FOUND"
}
```

---

## ⏱️ Rate Limits

**Current**: Aucun rate limit (à implémenter Phase 5)

**Recommandé pour production:**
- 100 requests/minute par IP
- 1000 requests/heure par utilisateur

---

## 📋 Examples

### Complete Auth Flow

```bash
#!/bin/bash

API="http://localhost:3000"

# 1. Register
echo "📝 Registering user..."
REGISTER=$(curl -s -X POST "$API/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"TestPass123!",
    "firstName":"Test",
    "lastName":"User"
  }')

echo "$REGISTER" | jq '.'

# 2. Login
echo "🔐 Logging in..."
LOGIN=$(curl -s -X POST "$API/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"TestPass123!"
  }')

TOKEN=$(echo "$LOGIN" | jq -r '.data.token')
echo "Token: $TOKEN"

# 3. Create client
echo "👥 Creating client..."
curl -s -X POST "$API/api/clients" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName":"Jean",
    "lastName":"Dupont",
    "email":"jean@example.com"
  }' | jq '.'

# 4. List clients
echo "📋 Listing clients..."
curl -s "$API/api/clients?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.'

# 5. Verify token
echo "✅ Verifying token..."
curl -s "$API/api/auth/verify" \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## 🔄 Coming Soon (Phase 4+)

- Contracts API
- Claims/Sinistres API
- Prospects Pipeline API
- Appointments API
- Documents API
- Integrations API

---

**Last Updated**: 26 mars 2026  
**API Version**: 1.0.0
