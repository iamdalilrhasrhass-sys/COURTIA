# 🗄️ PostgreSQL Setup Guide

**Status**: Docker not available - Using local PostgreSQL  
**Alternative**: Cloud database (AWS RDS, Heroku)

---

## Option 1: Local PostgreSQL (RECOMMENDED FOR DEV)

### Step 1: Install PostgreSQL

**macOS (Homebrew)**:
```bash
# Install PostgreSQL 15
brew install postgresql@15

# Start service
brew services start postgresql@15

# Verify installation
psql --version
# Expected: psql (PostgreSQL) 15.x
```

**Linux (Ubuntu/Debian)**:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib postgresql-15

# Start service
sudo systemctl start postgresql

# Verify
psql --version
```

**Windows**:
1. Download: https://www.postgresql.org/download/windows/
2. Run installer (accept defaults)
3. Remember password for postgres user
4. Verify: Open Command Prompt → `psql --version`

---

### Step 2: Create Database & User

```bash
# Login as postgres user
psql -U postgres

# Create database
CREATE DATABASE crm_assurance;

# Create user (optional, for security)
CREATE USER crm_user WITH PASSWORD 'your_secure_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE crm_assurance TO crm_user;

# Exit
\q
```

---

### Step 3: Import Schema

```bash
# From project root
psql -U postgres -d crm_assurance < database/schema.sql

# Verify tables were created
psql -U postgres -d crm_assurance -c "\dt"

# Expected: 15+ tables listed
```

---

### Step 4: Update Backend .env

```bash
cd backend
cp .env.example .env
```

**Edit .env**:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=crm_assurance
DB_USER=postgres
DB_PASSWORD=password_from_step_2
```

---

### Step 5: Verify Connection

```bash
cd backend
npm run dev

# Check logs for:
# "✅ Database connected successfully"
```

---

## Option 2: AWS RDS PostgreSQL (PRODUCTION)

### Step 1: Create RDS Instance

1. Go to AWS Console → RDS
2. Create database → PostgreSQL 15
3. Instance: db.t3.micro (free tier eligible)
4. Storage: 20GB gp2
5. Username: `postgres`
6. Password: Generate strong password
7. Public: Yes (for dev)
8. Security group: Allow inbound 5432

### Step 2: Get Connection String

```
Endpoint: your-db.123456789.us-east-1.rds.amazonaws.com
Port: 5432
Database: postgres
```

### Step 3: Create crm_assurance Database

```bash
psql -h your-db.123456789.us-east-1.rds.amazonaws.com \
     -U postgres \
     -c "CREATE DATABASE crm_assurance;"
```

### Step 4: Import Schema

```bash
psql -h your-db.123456789.us-east-1.rds.amazonaws.com \
     -U postgres \
     -d crm_assurance \
     < database/schema.sql
```

### Step 5: Update .env

```
DB_HOST=your-db.123456789.us-east-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=crm_assurance
DB_USER=postgres
DB_PASSWORD=your_password
```

---

## Option 3: Heroku PostgreSQL (EASIEST FOR PRODUCTION)

### Step 1: Create Heroku App

```bash
heroku login
heroku create your-crm-app
heroku addons:create heroku-postgresql:hobby-dev
```

### Step 2: Get Connection String

```bash
heroku config:get DATABASE_URL
# Output: postgresql://user:password@host:port/dbname
```

### Step 3: Import Schema

```bash
heroku pg:psql < database/schema.sql
```

### Step 4: Update .env

```bash
DATABASE_URL=postgresql://user:password@host:port/dbname
```

---

## Option 4: MongoDB Alternative (NO SQL)

If you want to ditch PostgreSQL entirely:

### Step 1: Create MongoDB Atlas Account

https://www.mongodb.com/cloud/atlas

### Step 2: Create Cluster

- Provider: AWS
- Region: eu-west-1 (closest to France)
- Tier: M0 (free)

### Step 3: Get Connection String

```
mongodb+srv://user:password@cluster.mongodb.net/crm_assurance
```

### Step 4: Update .env

```
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/crm_assurance
```

### Step 5: Update Backend

```javascript
// In server.js, replace PostgreSQL connection with MongoDB
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI);
```

---

## ✅ VERIFICATION CHECKLIST

After setup, verify:

```bash
# 1. Can connect
psql -U postgres -d crm_assurance -c "SELECT 1;"
# Expected: 1 row returned

# 2. Check tables
psql -U postgres -d crm_assurance -c "\dt"
# Expected: 15+ tables (users, clients, contracts, etc.)

# 3. Check indexes
psql -U postgres -d crm_assurance -c "\di"
# Expected: Multiple indexes created

# 4. Count rows (should be 0 - empty DB)
psql -U postgres -d crm_assurance -c "SELECT COUNT(*) FROM users;"
# Expected: 0

# 5. Backend connection
cd backend && npm run dev
# Look for: "✅ Database connected successfully"
```

---

## 🚨 TROUBLESHOOTING

### Can't Connect to PostgreSQL
```bash
# Check if service is running
brew services list                    # macOS
sudo systemctl status postgresql      # Linux
# Should show "active (running)" or "started"

# If not running:
brew services start postgresql@15     # macOS
sudo systemctl start postgresql       # Linux
```

### Port 5432 Already In Use
```bash
# Find what's using it
lsof -i :5432

# Kill process
kill -9 <PID>

# Or change port in .env
DB_PORT=5433
```

### Wrong Password
```bash
# Reset postgres password
sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'new_password';"

# Update .env
DB_PASSWORD=new_password
```

### Schema Import Failed
```bash
# Check if schema.sql is readable
file database/schema.sql

# Try importing step by step
psql -U postgres -d crm_assurance < database/schema.sql 2>&1 | head -20

# Look for error message
```

### Connection Timeout
```bash
# Verify connection string
echo "postgresql://postgres:password@localhost:5432/crm_assurance"

# Test with psql
psql postgresql://postgres:password@localhost:5432/crm_assurance

# If remote DB, check:
# - Security group allows inbound 5432
# - Host is correct (no typos)
# - Network allows outbound to AWS/Heroku
```

---

## 🔐 SECURITY BEST PRACTICES

### 1. Use Strong Passwords
```bash
# Generate with openssl
openssl rand -base64 32
# Use this in DB_PASSWORD
```

### 2. Never Commit .env
```bash
# .env is in .gitignore
# But verify:
cat .gitignore | grep "\.env"
# Should show: ".env"
```

### 3. Use RDS/Heroku for Production
```bash
# NOT local PostgreSQL on production server
# AWS RDS is:
# - Automated backups ✅
# - Automatic patching ✅
# - Multi-AZ redundancy ✅
# - Read replicas ✅
```

### 4. Restrict Database Access
```bash
# PostgreSQL authentication
# - Only allow local connections (dev)
# - AWS security groups (production)
# - Heroku handles this automatically
```

---

## 📊 DATABASE SIZING

### Free Tier Limits:
```
AWS RDS:      20GB, t3.micro
Heroku:       10,000 rows, ~100MB
Local:        Unlimited
```

### When to Upgrade:
```
Free tier limit: 10,000 rows
Our growth:      500 brokers × 200 clients = 100,000 rows
Upgrade to:      AWS RDS db.t3.small (~$25/month)
```

---

## 🔄 BACKUP & RESTORE

### Local PostgreSQL

**Backup**:
```bash
pg_dump -U postgres -d crm_assurance > backup.sql
```

**Restore**:
```bash
psql -U postgres -d crm_assurance < backup.sql
```

### AWS RDS

**Backup**: Automatic (7-day retention)  
**Restore**: Click "Restore to Point in Time"

### Heroku PostgreSQL

**Backup**: Automatic (7-day retention)  
**Restore**:
```bash
heroku pg:backups:restore BACKUP_ID
```

---

## 🚀 NEXT STEPS

After PostgreSQL is running:

1. ✅ Database initialized
2. ✅ Schema imported (15+ tables)
3. → Start backend: `cd backend && npm run dev`
4. → Start frontend: `cd frontend && npm run dev`
5. → Go to http://localhost:3001

---

**Expected time**: 15-30 minutes  
**Status**: Choose one option above and report when ready!

