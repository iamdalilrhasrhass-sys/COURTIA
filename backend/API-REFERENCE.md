# 🔌 CRM Assurance - API Reference for Frontend

**Base URL:** `http://localhost:3000`  
**Authentication:** Bearer token in `Authorization` header  
**Format:** JSON

---

## 🔑 Authentication

### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!",
  "firstName": "John",
  "lastName": "Doe"
}
```
**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "broker"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "Password123!"
}
```
**Response (200):**
```json
{
  "message": "Login successful",
  "user": { ... },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 👥 Clients

### List Clients
```http
GET /api/clients?limit=50&offset=0
Authorization: Bearer <token>
```
**Response:**
```json
{
  "clients": [
    {
      "id": 1,
      "first_name": "Alice",
      "last_name": "Johnson",
      "email": "alice@example.com",
      "phone": "+33612345678",
      "company_name": "TechCorp",
      "status": "actif",
      "type": "individual",
      "risk_score": 45,
      "loyalty_score": 80,
      "created_at": "2026-03-26T10:00:00Z",
      "updated_at": "2026-03-26T10:00:00Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0,
    "total": 5
  }
}
```

### Create Client
```http
POST /api/clients
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Bob",
  "lastName": "Smith",
  "email": "bob@example.com",
  "phone": "+33687654321",
  "company": "InsuranceCorp",
  "status": "actif",
  "type": "individual",
  "riskScore": 50,
  "loyaltyScore": 50
}
```
**Response (201):**
```json
{
  "message": "Client created successfully",
  "client": { ... }
}
```

### Get Client
```http
GET /api/clients/:id
Authorization: Bearer <token>
```

### Update Client
```http
PUT /api/clients/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "Bob",
  "lastName": "Smith Updated",
  "status": "inactif"
}
```

### Delete Client
```http
DELETE /api/clients/:id
Authorization: Bearer <token>
```

---

## 📋 Contracts

### List All Contracts
```http
GET /api/contracts?limit=50&offset=0&status=actif&type=habitation
Authorization: Bearer <token>
```

### Get Contracts by Client
```http
GET /api/clients/:clientId/contracts?limit=50&offset=0
Authorization: Bearer <token>
```

### Create Contract
```http
POST /api/contracts
Authorization: Bearer <token>
Content-Type: application/json

{
  "clientId": 1,
  "contractNumber": "CNT-2026-001",
  "type": "habitation",
  "startDate": "2026-01-01",
  "endDate": "2027-01-01",
  "annualPremium": 1200,
  "status": "actif",
  "insurer": "AXA"
}
```
**Response (201):**
```json
{
  "message": "Contract created successfully",
  "contract": {
    "id": 1,
    "client_id": 1,
    "contract_number": "CNT-2026-001",
    "type": "habitation",
    "start_date": "2026-01-01",
    "end_date": "2027-01-01",
    "annual_premium": 1200,
    "status": "actif",
    "insurer": "AXA",
    "created_at": "2026-03-26T10:00:00Z"
  }
}
```

### Get Contract
```http
GET /api/contracts/:id
Authorization: Bearer <token>
```

### Update Contract
```http
PUT /api/contracts/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "annualPremium": 1500,
  "status": "suspendu"
}
```

### Delete Contract
```http
DELETE /api/contracts/:id
Authorization: Bearer <token>
```

---

## 🎯 Prospects & Kanban Pipeline

### Available Stages
```
nouveau      → New leads
contact      → Initial contact made
devis        → Quote provided
negotiation  → Under negotiation
gain         → Won deals
perdu        → Lost opportunities
```

### List All Prospects
```http
GET /api/prospects?limit=50&offset=0&stage=nouveau&source=web
Authorization: Bearer <token>
```

### Get Prospects by Stage (Kanban Column)
```http
GET /api/prospects/stage/contact?limit=50&offset=0
Authorization: Bearer <token>
```
**Response:**
```json
{
  "stage": "contact",
  "prospects": [
    {
      "id": 1,
      "first_name": "Jane",
      "last_name": "Prospect",
      "email": "jane@test.com",
      "phone": "+33645678901",
      "company_name": "ProspectCorp",
      "stage": "contact",
      "source": "web",
      "estimated_value": 5000,
      "created_at": "2026-03-26T10:00:00Z"
    }
  ]
}
```

### Get Pipeline Summary (Kanban Overview)
```http
GET /api/prospects/pipeline/summary
Authorization: Bearer <token>
```
**Response:**
```json
{
  "stages": [
    {
      "stage": "nouveau",
      "count": 10,
      "total_value": 50000
    },
    {
      "stage": "contact",
      "count": 8,
      "total_value": 40000
    },
    {
      "stage": "devis",
      "count": 5,
      "total_value": 30000
    },
    {
      "stage": "negotiation",
      "count": 3,
      "total_value": 20000
    },
    {
      "stage": "gain",
      "count": 2,
      "total_value": 15000
    },
    {
      "stage": "perdu",
      "count": 1,
      "total_value": 5000
    }
  ],
  "availableStages": ["nouveau", "contact", "devis", "negotiation", "gain", "perdu"]
}
```

### Create Prospect
```http
POST /api/prospects
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Prospect",
  "email": "john@test.com",
  "phone": "+33612345678",
  "company": "TargetCorp",
  "stage": "nouveau",
  "source": "appel",
  "value": 10000
}
```

### Get Prospect
```http
GET /api/prospects/:id
Authorization: Bearer <token>
```

### Update Prospect
```http
PUT /api/prospects/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "value": 15000,
  "source": "salon"
}
```

### Move Prospect in Kanban (Drag & Drop)
```http
PUT /api/prospects/:id/move/devis
Authorization: Bearer <token>
```
**Response (200):**
```json
{
  "message": "Prospect moved to devis",
  "prospect": {
    "id": 1,
    "stage": "devis",
    "stage_updated_at": "2026-03-26T10:30:00Z",
    ...
  }
}
```

### Delete Prospect
```http
DELETE /api/prospects/:id
Authorization: Bearer <token>
```

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "error": "Email, password, firstName, and lastName are required"
}
```

### 401 Unauthorized
```json
{
  "error": "Invalid token",
  "details": "jwt expired"
}
```

### 404 Not Found
```json
{
  "error": "Client not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Database error message"
}
```

---

## 🔐 Authentication Header

All protected endpoints require:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Token is valid for 7 days from creation.

---

## 📊 Query Parameters

### Pagination
```
?limit=50&offset=0    # 50 items per page, starting at offset 0
```

### Filtering
```
# Clients
?status=actif&type=individual

# Contracts
?status=actif&type=habitation

# Prospects
?stage=contact&source=web&search=John
```

---

## 🚀 Ready for Integration

Frontend team can now:
1. Register/login users
2. Manage clients (CRUD)
3. Manage contracts (CRUD)
4. Manage prospects in Kanban pipeline
5. Move prospects between stages
6. View pipeline summary

**All endpoints tested and production-ready!** ✅
