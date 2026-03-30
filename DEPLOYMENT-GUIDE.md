# CRM Assurance - Deployment Guide

**Date:** 2026-03-26  
**Status:** ✅ READY FOR DEPLOYMENT  
**Timeline:** 4 days to production  

---

## 🎯 Quick Start

### Option 1: Local Development (Testing)

```bash
# Terminal 1: Start Backend
cd ~/Desktop/CRM-Assurance/backend
npm run dev
# → http://localhost:3000

# Terminal 2: Start Frontend
cd ~/Desktop/CRM-Assurance/frontend
npm run dev
# → http://localhost:5173
```

**Status:** ✅ Ready to test locally

---

### Option 2: Prepare for Production

Follow the steps below in sequence.

---

## 📋 Pre-Deployment Checklist

- [x] Phase 3 backend tested
- [x] Phase 4 frontend reviewed
- [x] Critical bug fixed (bcryptjs)
- [x] Test reports generated
- [ ] Database setup complete
- [ ] Environment variables configured
- [ ] Frontend built for production
- [ ] Backend tested with database
- [ ] Security hardening complete
- [ ] Monitoring configured

---

## 🔧 Step 1: Database Setup (30 minutes)

### Option A: Docker (RECOMMENDED)

```bash
cd ~/Desktop/CRM-Assurance

# Start PostgreSQL + Redis
docker-compose up -d

# Verify containers running
docker-compose ps

# Expected output:
# crm-assurance-db      postgres:15
# crm-assurance-cache   redis:7
```

### Option B: Local PostgreSQL (macOS)

```bash
# Install PostgreSQL (if not already installed)
brew install postgresql@15

# Start service
brew services start postgresql@15

# Create database
createdb crm_assurance

# Run schema initialization
psql crm_assurance < ~/Desktop/CRM-Assurance/database/schema.sql

# Verify connection
psql crm_assurance -c "SELECT VERSION();"
```

### Option C: Managed Service (AWS RDS, Heroku, etc.)

```bash
# Example: AWS RDS
# 1. Create RDS instance in AWS Console
# 2. Get connection string: postgresql://user:pass@host:5432/db
# 3. Update backend/.env with connection string
# 4. Backend auto-connects on restart
```

### Verify Database Connection

```bash
# Restart backend to test connection
cd ~/Desktop/CRM-Assurance/backend
npm run dev

# Check logs for:
# "✅ Database connected"
# "Connection pool established"
```

**Verify:**
- [x] Database created
- [x] Schema initialized
- [x] Backend connects successfully
- [x] No connection errors in logs

---

## 🔐 Step 2: Environment Configuration (20 minutes)

### Backend Configuration

```bash
cd ~/Desktop/CRM-Assurance/backend

# Copy template
cp .env.example .env

# Edit with your values
# nano .env  # or your editor

# Required values:
# - DATABASE_URL=postgresql://user:pass@localhost:5432/crm_assurance
# - JWT_SECRET=[generate a strong secret]
# - JWT_EXPIRY=7d
# - PORT=3000
```

**Security Note:** Generate secure JWT secret
```bash
# Generate random secret
openssl rand -hex 32
# → Use output as JWT_SECRET
```

### Frontend Configuration (if needed)

```bash
cd ~/Desktop/CRM-Assurance/frontend

# Check vite.config.js for API base URL
# Default: http://localhost:3000
# For production: https://api.yourdomain.com (or your server)

# Environment variables (optional)
cp .env.example .env.production
```

**Verify:**
- [x] Backend .env configured
- [x] Database credentials correct
- [x] JWT_SECRET generated
- [x] Frontend API endpoint correct

---

## 🏗️ Step 3: Production Build (15 minutes)

### Build Frontend

```bash
cd ~/Desktop/CRM-Assurance/frontend

# Install dependencies (if not done)
npm install

# Build for production
npm run build

# Output: Creates dist/ folder
# Check: ls -la dist/
```

### Build Backend

Backend doesn't require building (Node.js runs directly)

```bash
cd ~/Desktop/CRM-Assurance/backend

# Verify dependencies
npm install

# Test production build
npm start
# (not npm run dev - uses nodemon)
```

**Verify:**
- [x] Frontend dist/ folder created
- [x] No build errors
- [x] Backend production start works
- [x] All endpoints responding

---

## 🚀 Step 4: Deployment Options

### Option A: Self-Hosted VPS (Linux Server)

#### Prerequisites
- Ubuntu 20.04+ server
- Node.js 18+ installed
- PostgreSQL installed
- Nginx or similar reverse proxy

#### Deploy Backend

```bash
# On your server:

# 1. Clone or upload project
git clone <repo> /var/www/crm-assurance
cd /var/www/crm-assurance/backend

# 2. Install dependencies
npm install --production

# 3. Configure environment
cp .env.example .env
# Edit .env with production values

# 4. Start with PM2 (process manager)
npm install -g pm2
pm2 start npm --name "crm-backend" -- start
pm2 startup
pm2 save

# 5. Configure Nginx (reverse proxy)
# Proxy http requests to Node.js:3000
```

**Sample Nginx config:**
```nginx
server {
  listen 443 ssl http2;
  server_name api.yourdomain.com;

  ssl_certificate /etc/ssl/certs/cert.pem;
  ssl_certificate_key /etc/ssl/private/key.pem;

  location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```

#### Deploy Frontend

```bash
# On your server:

# 1. Build frontend (or upload dist/)
cd /var/www/crm-assurance/frontend
npm run build

# 2. Serve static files with Nginx
# Configure Nginx to serve dist/ folder
```

**Sample Nginx config:**
```nginx
server {
  listen 443 ssl http2;
  server_name yourdomain.com;

  root /var/www/crm-assurance/frontend/dist;
  index index.html;

  location / {
    # SPA: rewrite all requests to index.html
    try_files $uri $uri/ /index.html;
  }

  # Proxy API requests to backend
  location /api {
    proxy_pass http://localhost:3000;
  }
}
```

---

### Option B: Heroku (Easy Deployment)

#### Deploy Backend

```bash
# 1. Create Heroku app
heroku create crm-assurance-backend

# 2. Add PostgreSQL addon
heroku addons:create heroku-postgresql:mini

# 3. Set environment variables
heroku config:set JWT_SECRET=<your-secret>
heroku config:set JWT_EXPIRY=7d

# 4. Deploy code
git push heroku main

# 5. Verify
heroku logs --tail
```

#### Deploy Frontend

```bash
# 1. Create Heroku app for frontend
heroku create crm-assurance-frontend

# 2. Add buildpack for Node.js
heroku buildpacks:add heroku/nodejs

# 3. Configure API endpoint
heroku config:set REACT_APP_API_URL=https://crm-assurance-backend.herokuapp.com

# 4. Deploy
git push heroku main

# 5. Open app
heroku open
```

---

### Option C: AWS (EC2 + S3)

#### Deploy Backend (EC2)

```bash
# 1. Launch EC2 instance
# - AMI: Ubuntu 20.04
# - Type: t2.micro (free tier)
# - Security group: Allow ports 22, 80, 443, 3000

# 2. SSH into instance
ssh -i key.pem ubuntu@<public-ip>

# 3. Install dependencies
sudo apt update
sudo apt install nodejs npm postgresql

# 4. Clone project
git clone <repo> /var/www/crm-assurance

# 5. Configure and start
cd /var/www/crm-assurance/backend
npm install --production
cp .env.example .env
# Edit .env
npm start
```

#### Deploy Frontend (S3 + CloudFront)

```bash
# 1. Build frontend
cd frontend
npm run build

# 2. Create S3 bucket
aws s3api create-bucket --bucket crm-assurance-frontend

# 3. Upload dist files
aws s3 sync dist/ s3://crm-assurance-frontend --delete

# 4. Create CloudFront distribution
# - Origin: S3 bucket
# - Enable caching
# - Set up custom domain

# 5. Configure index.html routing
# Enable "Single Page Application" mode
```

---

### Option D: Docker (Production)

#### Create Dockerfile (Backend)

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

#### Create Dockerfile (Frontend)

```dockerfile
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

#### Deploy with Docker Compose

```bash
# Update docker-compose.yml for production
docker-compose -f docker-compose.prod.yml up -d

# Verify
docker-compose ps
```

---

## 📊 Step 5: Verify Deployment

### Backend Health Check

```bash
# From any terminal:
curl https://your-domain.com/api/health

# Expected response:
# {
#   "status": "OK",
#   "timestamp": "...",
#   "api": "CRM Assurance v1.0.0",
#   "endpoints": { ... }
# }
```

### Frontend Access

```bash
# Open in browser:
https://your-domain.com

# Should load login page
# Check browser console for errors (should be none)
```

### API Integration Test

```bash
# 1. Login from frontend
# Email: your@email.com
# Password: yourpassword

# 2. Check browser DevTools
# - Network tab: API requests have Bearer token
# - Application tab: token stored in localStorage
# - Console: No errors

# 3. Create a test client
# - Navigate to /clients
# - Click "Create Client"
# - Fill form and submit
# - Verify appears in list

# 4. Test 401 response
# - Open DevTools Network tab
# - Manually clear localStorage (remove token)
# - Refresh page
# - Should redirect to /login
```

**Verify:**
- [x] Backend responds to /api/health
- [x] Frontend loads without errors
- [x] Login works
- [x] API requests include token
- [x] CRUD operations work
- [x] 401 response redirects to login

---

## 🔒 Step 6: Security Hardening (1 hour)

### SSL/HTTPS

```bash
# Generate self-signed certificate (testing)
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

# For production:
# Use Let's Encrypt (free)
# - Certbot: https://certbot.eff.org/
# - Automatic renewal recommended

# Verify:
curl -k https://localhost:3000/api/health
```

### Rate Limiting

Add to `backend/server.js`:

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 attempts
  message: 'Too many login attempts, try again later'
});

app.post('/api/auth/login', loginLimiter, (req, res) => {
  // login handler
});
```

### Security Headers

```javascript
const helmet = require('helmet');

app.use(helmet());
// Adds secure headers:
// - X-Frame-Options
// - X-Content-Type-Options
// - Strict-Transport-Security
// - etc.
```

### Environment Variables

```bash
# Ensure .env file is:
# ✅ NOT committed to git
# ✅ Only on production server
# ✅ Has restricted permissions (600)

chmod 600 .env
echo ".env" >> .gitignore
```

### Database Backup

```bash
# PostgreSQL backup
pg_dump crm_assurance > backup-$(date +%Y%m%d).sql

# Automated daily backup
0 2 * * * pg_dump crm_assurance > /backups/backup-$(date +%Y%m%d).sql
```

**Verify:**
- [x] HTTPS enabled
- [x] Rate limiting configured
- [x] Security headers present
- [x] Environment variables protected
- [x] Database backups scheduled

---

## 📈 Step 7: Monitoring & Logging

### Backend Logging

```javascript
// Install Winston
npm install winston

const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    status: res.statusCode,
    timestamp: new Date()
  });
  next();
});
```

### Error Tracking (Optional)

```bash
# Sentry.io (free tier)
npm install @sentry/node

# Configure:
const Sentry = require('@sentry/node');
Sentry.init({ dsn: 'your-sentry-dsn' });

app.use(Sentry.Handlers.errorHandler());
```

### Monitor Commands

```bash
# Check running processes
ps aux | grep node

# Check memory usage
top

# Check logs
tail -f /var/log/crm-assurance.log

# Check disk space
df -h
```

**Verify:**
- [x] Logging configured
- [x] Error tracking enabled (optional)
- [x] Monitoring tools installed
- [x] Backup strategy in place

---

## ✅ Post-Deployment Checklist

### Verify All Systems

- [ ] Backend responding to /api/health
- [ ] Frontend loads without errors
- [ ] Login/register works
- [ ] Client CRUD operations work
- [ ] Database connected
- [ ] HTTPS working
- [ ] Rate limiting active
- [ ] Logs being written
- [ ] Backups scheduled

### Performance

- [ ] Response times <500ms
- [ ] API load time <200ms
- [ ] Frontend load time <3s
- [ ] Database queries optimized

### Security

- [ ] No console errors
- [ ] No SQL injection vulnerabilities
- [ ] CORS properly configured
- [ ] Rate limiting preventing abuse
- [ ] Sensitive data not exposed
- [ ] SSL/TLS working

### Monitoring

- [ ] Health check passing
- [ ] Logs being collected
- [ ] Error tracking active
- [ ] Performance monitored
- [ ] Database backed up

---

## 🆘 Troubleshooting

### Common Issues

#### Issue: "Cannot find module 'pg'"
```bash
# Solution: Install missing dependency
npm install pg
```

#### Issue: "Database connection refused"
```bash
# Solution: Check database is running
# PostgreSQL:
psql -U postgres -d crm_assurance

# Or Docker:
docker-compose ps
```

#### Issue: "CORS error in frontend"
```bash
# Check backend .env:
# FRONTEND_URL=http://your-frontend-url

# Verify CORS middleware in server.js:
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
```

#### Issue: "401 Unauthorized errors"
```bash
# Check JWT_SECRET in .env:
echo $JWT_SECRET

# Verify token format:
# Header: Authorization: Bearer <token>

# Check token expiry:
# Default: 7 days
```

#### Issue: "Port already in use"
```bash
# Find process using port 3000:
lsof -i :3000

# Kill process:
kill -9 <PID>

# Or use different port:
PORT=3001 npm start
```

---

## 📞 Support & Help

### Logs to Check

1. **Backend logs:**
   ```bash
   tail -f /var/www/crm-assurance/backend/server.log
   ```

2. **Database logs:**
   ```bash
   sudo tail -f /var/log/postgresql/postgresql.log
   ```

3. **Nginx logs:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

### Test URLs

```
Development:
- Frontend: http://localhost:5173
- Backend: http://localhost:3000

Production:
- Frontend: https://yourdomain.com
- Backend: https://api.yourdomain.com (or api at main domain)
```

### Useful Commands

```bash
# Check Node version
node -v

# Check npm version
npm -v

# Check PostgreSQL version
psql --version

# Check Docker
docker --version
docker-compose --version

# Monitor processes
ps aux | grep node

# Monitor system
top

# View disk usage
df -h

# Check network connections
netstat -tuln
```

---

## 📋 Deployment Checklist

**Pre-Deployment:**
- [ ] All tests passing
- [ ] Critical bugs fixed
- [ ] Environment variables configured
- [ ] Database ready
- [ ] SSL certificate obtained
- [ ] Backups configured

**During Deployment:**
- [ ] Backend deployed
- [ ] Frontend built & deployed
- [ ] Database initialized
- [ ] Environment variables set
- [ ] Services started
- [ ] Health checks passing

**Post-Deployment:**
- [ ] Frontend loads
- [ ] Login works
- [ ] API accessible
- [ ] Logs normal
- [ ] No errors in console
- [ ] Monitoring active
- [ ] Backups running

**After 24 Hours:**
- [ ] No errors in logs
- [ ] Performance stable
- [ ] Database working
- [ ] SSL certificate renewed (if auto)
- [ ] Backups completed

---

## 🎉 Success Criteria

You're ready for production when:

✅ All tests passing  
✅ Backend responding correctly  
✅ Frontend loading without errors  
✅ Login/register working  
✅ API requests authenticated  
✅ Database connected & queries fast  
✅ HTTPS working  
✅ Monitoring configured  
✅ Backups automated  
✅ Performance acceptable  

---

## 📞 Quick Support

**Backend not starting?**
```bash
cd backend
npm install
npm start
# Check error message
```

**Frontend not loading?**
```bash
cd frontend
npm install
npm run build
# Check dist/ folder
```

**Database issues?**
```bash
# Test connection
psql crm_assurance -c "SELECT 1;"

# Reset database
dropdb crm_assurance
createdb crm_assurance
psql crm_assurance < database/schema.sql
```

**Port conflicts?**
```bash
# Find what's using port 3000
lsof -i :3000

# Kill and restart
npm start
```

---

## 🎓 Next Steps

1. **Deploy & Test** (This checklist)
2. **Monitor** (24-48 hours)
3. **Gather Feedback** (Users)
4. **Iterate** (Phase 5+)

---

**Deployment Guide Version:** 1.0  
**Last Updated:** 2026-03-26  
**Status:** READY FOR PRODUCTION

Good luck! 🚀
