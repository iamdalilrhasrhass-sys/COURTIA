# 🔧 Troubleshooting Guide

**Quick fixes for common issues**

---

## Table des matières

- [Backend Issues](#-backend-issues)
- [Frontend Issues](#-frontend-issues)
- [Database Issues](#-database-issues)
- [npm Issues](#-npm-issues)
- [Port Conflicts](#-port-conflicts)
- [Authentication Issues](#-authentication-issues)
- [Performance](#-performance)

---

## 🔙 Backend Issues

### Backend won't start

**Symptom**: `Cannot find module 'express'`

**Solution**:
```bash
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

### Error: ECONNREFUSED PostgreSQL

**Symptom**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
  at TCPConnectWrap.afterConnect [as oncomplete]
```

**Cause**: PostgreSQL not running or wrong host/port

**Solutions**:

1. **Start PostgreSQL (macOS)**:
```bash
brew services start postgresql
brew services list | grep postgresql
# Should show: postgresql started
```

2. **Check credentials in `.env`**:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=
DB_NAME=crm_assurance
```

3. **Verify database exists**:
```bash
psql -U postgres -l | grep crm_assurance
```

4. **Test connection directly**:
```bash
psql -U postgres -d crm_assurance -c "SELECT 1"
```

---

### Error: relation "users" does not exist

**Symptom**:
```
Error: relation "users" does not exist
```

**Cause**: Database schema not loaded

**Solution**:
```bash
# Load schema
psql -U postgres crm_assurance < database/schema.sql

# Verify tables
psql -U postgres crm_assurance -c "\dt"
# Should list 12+ tables
```

---

### JWT Error: Cannot read property 'sign' of undefined

**Symptom**:
```
TypeError: Cannot read property 'sign' of undefined
  at signJWT
```

**Cause**: JWT_SECRET not set in `.env`

**Solution**:
```bash
# Add to backend/.env
JWT_SECRET=your_random_secret_key_here
JWT_EXPIRY=7d

# Restart backend
npm run dev
```

---

### 500 Error: Internal Server Error

**Symptom**: Random `500` responses from API

**Check logs**:
```bash
# Kill backend
Ctrl+C

# Start with full output
node server.js

# Look for error messages
```

**Common causes**:
1. Database connection lost
2. Missing environment variable
3. Typo in code
4. Request validation failed

---

## 🎨 Frontend Issues

### Frontend won't start

**Symptom**: `Error: ENOENT: no such file or directory`

**Solution**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

### Blank page or 404

**Symptom**: Browser shows blank or `Cannot GET /`

**Cause**: Frontend not running on correct port

**Solution**:
```bash
# Check if frontend is running
npm run dev

# Should show:
# ➜  Local:   http://localhost:5173/

# Then open http://localhost:5173 in browser
```

---

### Cannot connect to backend

**Symptom**: 
```
GET http://localhost:3000/api/clients 404 (Not Found)
```

**Cause**: Backend not running or wrong URL

**Solution**:

1. **Start backend**:
```bash
cd backend
npm run dev
# Should show: http://localhost:3000
```

2. **Check frontend `.env`**:
```env
VITE_API_URL=http://localhost:3000
```

3. **Check CORS in backend `.env`**:
```env
FRONTEND_URL=http://localhost:5173
```

---

### Infinite loading spinner

**Symptom**: Page loading forever

**Possible causes**:
1. Backend not running
2. API endpoint not implemented
3. Token invalid/expired

**Debug**:
```bash
# Check network tab in browser DevTools
# Press F12 → Network

# Look for failed requests
# Check error status codes

# Verify backend is running
curl http://localhost:3000/health
# Should return {"status":"ok"}
```

---

## 🗄️ Database Issues

### Cannot create database

**Symptom**:
```
createdb: error: could not connect to database template1
```

**Cause**: PostgreSQL service not running

**Solution**:
```bash
# Start service
brew services start postgresql

# Then create database
createdb -U postgres crm_assurance
```

---

### Database locked

**Symptom**:
```
Error: could not obtain lock on relation
```

**Cause**: Another connection using the database

**Solution**:
```bash
# Find and kill idle connections
psql -U postgres -d crm_assurance -c "
  SELECT pid FROM pg_stat_activity 
  WHERE datname = 'crm_assurance' AND state = 'idle';
"

# Kill specific connection
SELECT pg_terminate_backend(pid);
```

---

### PostgreSQL password issues

**Symptom**: `FATAL: password authentication failed`

**Solution**:

1. **Reset PostgreSQL password**:
```bash
# Stop PostgreSQL
brew services stop postgresql

# Start in safe mode
postgres -D /usr/local/var/postgres

# In another terminal, connect as superuser
psql -U postgres

# Reset password
ALTER USER postgres WITH PASSWORD 'new_password';
\q
```

2. **Update `.env`**:
```env
DB_PASSWORD=new_password
```

---

## 📦 npm Issues

### npm install fails

**Symptom**:
```
npm ERR! code ERESOLVE
npm ERR! ERESOLVE unable to resolve dependency tree
```

**Solution**:
```bash
# Force legacy peer dependencies
npm install --legacy-peer-deps

# Or clear cache
npm cache clean --force
npm install
```

---

### Outdated packages

**Symptom**: Security warnings

```bash
# Fix vulnerabilities
npm audit fix

# Check remaining issues
npm audit

# Update all packages
npm update
```

---

### Missing dependencies

**Symptom**: `Cannot find module 'express'`

**Solution**:
```bash
# Reinstall all dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 🔌 Port Conflicts

### Port 3000 already in use (Backend)

**Symptom**:
```
Error: listen EADDRINUSE :::3000
```

**Solution 1**: Kill process using port
```bash
# Find process
lsof -i :3000

# Kill it
kill -9 <PID>

# Or more brutal
sudo killall -9 node
```

**Solution 2**: Use different port
```bash
# In backend/.env
PORT=3001

# Or command line
PORT=3001 npm run dev
```

---

### Port 5173 already in use (Frontend)

**Symptom**:
```
[vite] error when starting dev server:
Error: listen EADDRINUSE :::5173
```

**Solution**:
```bash
# Kill process
lsof -i :5173
kill -9 <PID>

# Or use different port
npm run dev -- --port 5174
```

---

## 🔐 Authentication Issues

### Login fails with 401

**Symptom**:
```
{"success":false,"error":"Invalid credentials"}
```

**Causes**:
1. Wrong email/password
2. User doesn't exist
3. Password reset needed

**Debug**:
```bash
# Check if user exists in database
psql -U postgres -d crm_assurance -c "
  SELECT id, email FROM users WHERE email='test@example.com';
"

# If not found, register again
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"TestPass123!",
    "firstName":"Test",
    "lastName":"User"
  }'
```

---

### Token expired error

**Symptom**:
```
{"success":false,"error":"Invalid or expired token","code":"INVALID_TOKEN"}
```

**Cause**: JWT token older than 7 days

**Solution**: Login again
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"test@example.com",
    "password":"TestPass123!"
  }'

# Copy the new token
# Use: Authorization: Bearer <new_token>
```

---

### CORS error in browser

**Symptom**:
```
Access to XMLHttpRequest blocked by CORS policy
No 'Access-Control-Allow-Origin' header
```

**Cause**: Frontend URL not in CORS whitelist

**Solution**: Update `backend/.env`
```env
FRONTEND_URL=http://localhost:5173,http://localhost:3001
```

**Then restart backend**:
```bash
Ctrl+C
npm run dev
```

---

## 🚀 Performance

### Slow database queries

**Symptom**: Listing clients takes >2s

**Check**:
```bash
# Are indices created?
psql -U postgres -d crm_assurance -c "\di"

# Count clients
psql -U postgres -d crm_assurance -c "SELECT COUNT(*) FROM clients;"

# If >1000, implement pagination (already done in API)
```

---

### High memory usage

**Symptom**: Node process using >500MB

**Cause**: Memory leak or large data load

**Solution**:
```bash
# Restart services
Ctrl+C (both terminals)
npm run dev (backend)
npm run dev (frontend)

# If persists, check for console.log statements
# Remove unnecessary logging in production
```

---

### Slow npm install

**Symptom**: Takes >10 minutes

**Solution**:
```bash
# Use faster registry
npm config set registry https://registry.npm.taobao.org

# Or clear cache
npm cache clean --force
npm install

# Revert registry when done
npm config set registry https://registry.npmjs.org/
```

---

## 🆘 Still having issues?

### 1. Check logs

**Backend logs:**
```bash
# Current terminal output shows all logs
# Or redirect to file:
npm run dev > backend.log 2>&1

# View log:
tail -f backend.log
```

**Frontend console:**
```bash
# Open browser DevTools
F12 → Console → Look for errors
```

---

### 2. Verify stack versions

```bash
node --version    # Should be 18+
npm --version     # Should be 8+
psql --version    # Should be 12+
```

---

### 3. Nuclear option - Start fresh

```bash
# Backend
cd backend
rm -rf node_modules package-lock.json
npm install
npm run dev

# Frontend (new terminal)
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

---

### 4. Check environment variables

**Backend `backend/.env` should have**:
- PORT
- DB_HOST, DB_PORT, DB_USER, DB_NAME
- JWT_SECRET
- FRONTEND_URL

**Frontend `frontend/.env` should have**:
- VITE_API_URL

---

### 5. Database reset (danger zone!)

```bash
# Only if stuck
dropdb -U postgres crm_assurance
createdb -U postgres crm_assurance
psql -U postgres crm_assurance < database/schema.sql

# Then restart backend
npm run dev
```

---

## 📞 Report an issue

If you find a new issue:
1. Document the error message
2. Note steps to reproduce
3. Include your environment (Node version, OS, etc.)
4. Check logs for stack trace
5. Create issue or contact support

---

**Last Updated**: 26 mars 2026  
**Maintained by**: ARK (Documentation Manager)
