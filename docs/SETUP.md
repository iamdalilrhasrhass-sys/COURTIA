# 🛠️ Setup Guide - Installation Complète

**Last Updated**: 26 mars 2026  
**Platform**: macOS (instructions peuvent varier sur Linux/Windows)

---

## Table des matières

- [Prerequisites](#-prerequisites)
- [PostgreSQL Setup](#-postgresql-setup)
- [Backend Setup](#-backend-setup)
- [Frontend Setup](#-frontend-setup)
- [Running Locally](#-running-locally)
- [Verify Installation](#-verify-installation)
- [Troubleshooting](#-troubleshooting)

---

## ✅ Prerequisites

Vous devez avoir installé:

- **Node.js** 18+ ([Download](https://nodejs.org))
- **npm** 8+ (inclus avec Node.js)
- **Git** ([Download](https://git-scm.com))
- **PostgreSQL** 12+ ([Download](https://www.postgresql.org))

### Check Installation

```bash
node --version
npm --version
git --version
psql --version
```

Expected output:
```
v18.x.x or higher
8.x.x or higher
git version 2.x.x or higher
psql (PostgreSQL) 12.x or higher
```

---

## 🗄️ PostgreSQL Setup

### 1. Start PostgreSQL Service

**macOS (Homebrew):**
```bash
# Start PostgreSQL
brew services start postgresql

# Verify running
brew services list | grep postgresql
# → postgresql started
```

**Linux (systemd):**
```bash
sudo systemctl start postgresql
```

**Windows:**
- Start PostgreSQL via Start Menu or Services

### 2. Create Database User (if needed)

```bash
# Login to PostgreSQL
psql -U postgres

# Inside psql:
CREATE USER crm_user WITH PASSWORD 'SecurePassword123!';
ALTER USER crm_user CREATEDB;
\q
```

### 3. Create Database

```bash
# Create database
createdb -U postgres crm_assurance

# Verify creation
psql -U postgres -l | grep crm_assurance
```

### 4. Load Schema

```bash
# Navigate to project
cd ~/Desktop/CRM-Assurance

# Load schema
psql -U postgres crm_assurance < database/schema.sql

# Verify tables created
psql -U postgres crm_assurance -c "\dt"
# Should show: users, clients, contracts, prospects, etc.
```

### 5. Verify Connection

```bash
# Test connection
psql -U postgres -d crm_assurance -c "SELECT version();"
# Should return PostgreSQL version
```

---

## 🔙 Backend Setup

### 1. Navigate to Backend Directory

```bash
cd ~/Desktop/CRM-Assurance/backend
```

### 2. Install Dependencies

```bash
npm install

# This installs:
# - express (web framework)
# - pg (PostgreSQL driver)
# - jsonwebtoken (JWT auth)
# - bcrypt (password hashing)
# - cors (cross-origin requests)
# - dotenv (environment variables)
# - nodemon (auto-reload in dev)
```

**Wait time**: 2-5 minutes depending on internet speed

### 3. Configure Environment Variables

**Create `.env` from template:**
```bash
cp .env.example .env
```

**Edit `.env` with your database credentials:**

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=
DB_NAME=crm_assurance

# JWT
JWT_SECRET=your_super_secret_key_change_in_production
JWT_EXPIRY=7d

# CORS
FRONTEND_URL=http://localhost:3001,http://localhost:5173

# Integrations (optional for Phase 4)
TELEGRAM_BOT_TOKEN=
WHATSAPP_API_KEY=
GOOGLE_API_KEY=
```

**Important**: 
- Change `JWT_SECRET` to a random strong string
- Match DB credentials with your PostgreSQL setup
- `FRONTEND_URL` includes both possible dev ports

### 4. Test Database Connection

```bash
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  user: 'postgres',
  password: '',
  host: 'localhost',
  port: 5432,
  database: 'crm_assurance'
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error('❌ Connection failed:', err);
  else console.log('✅ Database connected:', res.rows[0]);
  process.exit();
});
"
```

### 5. Start Backend Server

```bash
# Development mode (with auto-reload)
npm run dev

# Or: npm start (no auto-reload)
npm start
```

**Expected output:**
```
╔════════════════════════════════════════╗
║  ✅ CRM ASSURANCE BACKEND RUNNING    ║
║  🚀 http://localhost:3000             ║
║  📦 Node.js + Express + PostgreSQL   ║
║  🔐 JWT Authentication enabled       ║
╚════════════════════════════════════════╝

[2026-03-26T10:00:00.000Z] GET /health - 200 (45ms)
[2026-03-26T10:00:01.000Z] POST /api/auth/register - 201 (120ms)
```

**Success!** ✅ Backend is running.

---

## 🎨 Frontend Setup

**Open a NEW terminal window** (keep backend running in the other)

### 1. Navigate to Frontend Directory

```bash
cd ~/Desktop/CRM-Assurance/frontend
```

### 2. Install Dependencies

```bash
npm install

# This installs:
# - react (UI framework)
# - react-dom (React DOM)
# - react-router-dom (routing)
# - axios (HTTP client)
# - zustand (state management)
# - tailwindcss (styling)
# - vite (build tool)
```

**Wait time**: 2-5 minutes

### 3. Configure Environment Variables

**Create `.env`:**
```bash
cp .env.example .env
```

**Content (adjust if needed):**
```env
VITE_API_URL=http://localhost:3000
VITE_APP_NAME=CRM Assurance
```

### 4. Start Dev Server

```bash
npm run dev

# Expected output:
# VITE v5.0.0  ready in 234 ms
#
# ➜  Local:   http://localhost:5173/
# ➜  press h to show help
```

**Success!** ✅ Frontend is running on http://localhost:5173

---

## 🚀 Running Locally (Complete Setup)

### Terminal 1: Backend

```bash
cd ~/Desktop/CRM-Assurance/backend
npm run dev

# ✅ Listening on http://localhost:3000
```

### Terminal 2: Frontend

```bash
cd ~/Desktop/CRM-Assurance/frontend
npm run dev

# ✅ Running on http://localhost:5173
```

### Open in Browser

1. Go to **http://localhost:5173**
2. You should see the login page
3. Click "Register" to create an account
4. Login with your credentials
5. Explore the dashboard!

---

## ✅ Verify Installation

### 1. Health Check

```bash
# Backend health
curl http://localhost:3000/health
# Expected: {"status":"ok"}

# Frontend (visit in browser)
open http://localhost:5173
```

### 2. Database Check

```bash
# List tables
psql -U postgres -d crm_assurance -c "\dt"

# Count users
psql -U postgres -d crm_assurance -c "SELECT COUNT(*) FROM users;"

# Count clients
psql -U postgres -d crm_assurance -c "SELECT COUNT(*) FROM clients;"
```

### 3. Authentication Test

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"TestPass123!",
    "firstName":"Test",
    "lastName":"User"
  }'
# Expected: 201 Created with user data

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"TestPass123!"
  }'
# Expected: 200 OK with JWT token

# List clients (with token)
TOKEN="eyJ0eXAi..." # Copy from login response
curl http://localhost:3000/api/clients \
  -H "Authorization: Bearer $TOKEN"
# Expected: 200 OK with clients list
```

---

## 🐛 Troubleshooting

### Backend won't start

**Error**: `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solution**: PostgreSQL not running
```bash
# Start PostgreSQL
brew services start postgresql

# Verify
brew services list | grep postgresql
```

### Port already in use

**Error**: `Error: listen EADDRINUSE :::3000`

**Solution**: Kill process using port
```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>

# Or change port in .env
PORT=3001
```

### npm install fails

**Error**: `npm ERR! code ERESOLVE`

**Solution**: Force legacy peer deps
```bash
npm install --legacy-peer-deps
```

### Database connection error

**Error**: `Error: getaddrinfo ENOTFOUND localhost`

**Solution**: Check PostgreSQL running and credentials
```bash
# Verify PostgreSQL running
brew services list | grep postgresql

# Test connection
psql -U postgres -c "SELECT 1"

# Check database exists
psql -U postgres -l | grep crm_assurance
```

### JWT_SECRET not set

**Error**: `Cannot read property 'sign' of undefined`

**Solution**: Add JWT_SECRET to .env
```bash
echo "JWT_SECRET=your_secret_key_here" >> backend/.env
```

### CORS error in frontend

**Error**: `Access to XMLHttpRequest blocked by CORS`

**Solution**: Check FRONTEND_URL in backend .env
```env
# Should include localhost:5173
FRONTEND_URL=http://localhost:3001,http://localhost:5173
```

### npm outdated packages

**Warning**: `up to date` but old vulnerabilities

**Solution**: Update packages
```bash
npm audit fix
npm update
```

---

## 📋 Quick Checklist

- [ ] Node.js 18+ installed
- [ ] PostgreSQL 12+ installed & running
- [ ] Backend `.env` configured
- [ ] Frontend `.env` configured
- [ ] `npm install` completed in both directories
- [ ] Backend starts on http://localhost:3000
- [ ] Frontend starts on http://localhost:5173
- [ ] Can register new user
- [ ] Can login
- [ ] Can view clients list
- [ ] Database has tables

---

## 🚀 Next Steps

1. **Read API docs**: [docs/API.md](./API.md)
2. **Learn frontend structure**: [docs/FRONTEND.md](./FRONTEND.md)
3. **View project status**: [PROJECT_STATUS.md](../PROJECT_STATUS.md)
4. **Start Phase 4**: Frontend UI implementation

---

## 📞 Need Help?

1. Check [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
2. Review environment variables
3. Check backend/frontend logs
4. Verify database connection
5. Check Node.js/npm versions

---

**Last Updated**: 26 mars 2026  
**Author**: ARK (Documentation Manager)
