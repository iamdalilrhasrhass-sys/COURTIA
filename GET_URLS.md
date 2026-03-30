# 🔗 HOW TO GET YOUR PRODUCTION URLs

After running `./deploy.sh`, follow these steps to get the final URLs.

---

## 🚀 STEP 1: Deploy

```bash
cd ~/Desktop/CRM-Assurance
chmod +x deploy.sh
./deploy.sh
```

This pushes code to GitHub. Now Render and Vercel auto-build.

---

## 🔧 STEP 2: Configure Render (Backend)

Go to: https://dashboard.render.com

1. **Click "New +" → "Web Service"**
2. **Connect GitHub repository**
   - Select: `CRM-Assurance`
   - Select branch: `main`
3. **Configure build:**
   - Name: `crm-assurance-api`
   - Region: `Frankfurt` (EU)
   - Build command: `cd backend && npm install`
   - Start command: `cd backend && node server.js`
4. **Add environment variables:**
   ```
   NODE_ENV → production
   ANTHROPIC_API_KEY → sk-ant-...
   DATABASE_URL → postgresql://...
   JWT_SECRET → your-secret-key
   TELEGRAM_BOT_TOKEN → your-bot-token
   FRONTEND_URL → https://crm-assurance.vercel.app
   ```
5. **Click "Create Web Service"**
6. **Wait for build** (~3-5 minutes)

### ✅ Your Backend URL:
Once build completes, you'll see:

```
https://crm-assurance-api.onrender.com
```

**Save this URL!**

---

## 🎨 STEP 3: Configure Vercel (Frontend)

Go to: https://vercel.com/dashboard

1. **Click "Add New +" → "Project"**
2. **Import from GitHub:**
   - Select repository: `CRM-Assurance`
   - Select branch: `main`
3. **Configure:**
   - Framework: `React`
   - Build command: `cd frontend && npm run build`
   - Output directory: `frontend/dist`
4. **Add environment variable:**
   ```
   VITE_API_BASE_URL → https://crm-assurance-api.onrender.com
   ```
5. **Click "Deploy"**
6. **Wait for build** (~2-3 minutes)

### ✅ Your Frontend URL:
Once build completes, you'll see:

```
https://crm-assurance.vercel.app
```

**Save this URL!**

---

## 🗄️ STEP 4: Database Migration

Once backend is deployed, run the migration:

### Option A: Local Machine (if you have psql)

```bash
psql -U postgres -h your-render-db-host -d crm_assurance \
  -f database/migrations/001_option4_ai_cost_management.sql
```

### Option B: Via Render Console

1. Go to Render dashboard
2. Click on your PostgreSQL service
3. Click "Connect" → "External connection"
4. Copy connection string
5. Run migration locally:
   ```bash
   psql (your-connection-string) \
     -f database/migrations/001_option4_ai_cost_management.sql
   ```

### Option C: Manual (if automated fails)

1. Copy the SQL from `database/migrations/001_option4_ai_cost_management.sql`
2. Go to Render dashboard → PostgreSQL → Connect
3. Use psql shell or PgAdmin
4. Paste SQL and execute

---

## ✅ VERIFICATION

Test that everything works:

### 1. Backend Health Check
```bash
curl https://crm-assurance-api.onrender.com/health
```

Should return:
```json
{
  "status": "ok",
  "api": "crm-assurance-backend",
  "version": "1.0.0",
  "timestamp": "2026-03-30T10:00:00.000Z"
}
```

### 2. Frontend Loads
```bash
curl https://crm-assurance.vercel.app
```

Should return HTML page with React app.

### 3. Check Database Connected
```bash
curl https://crm-assurance-api.onrender.com/api/status
```

Should show `"database": "connected"`.

### 4. Test ARK Endpoint (requires token)
```bash
curl -X POST https://crm-assurance-api.onrender.com/api/ark/ask \
  -H "Authorization: Bearer {your-jwt-token}" \
  -H "Content-Type: application/json" \
  -d '{"question":"Hello"}'
```

Should return AI response.

### 5. Check Admin Dashboard
Visit in browser:
```
https://crm-assurance.vercel.app/admin/costs
```

Should show cost dashboard.

---

## 🎯 FINAL URLs

Once deployment is complete, you'll have:

### Production URLs
```
Backend:  https://crm-assurance-api.onrender.com
Frontend: https://crm-assurance.vercel.app
```

### Admin Dashboards
```
Costs:    https://crm-assurance.vercel.app/admin/costs
Usage:    https://crm-assurance.vercel.app/my-usage
```

### API Endpoints
```
POST   https://crm-assurance-api.onrender.com/api/ark/ask
GET    https://crm-assurance-api.onrender.com/api/ark/my-usage
POST   https://crm-assurance-api.onrender.com/api/ark/upgrade-tier
GET    https://crm-assurance-api.onrender.com/api/admin/costs
GET    https://crm-assurance-api.onrender.com/api/admin/costs/export
```

---

## 🔗 SHARE THESE URLs

Once live, these are what you need:

```
👥 Courtiers use:
https://crm-assurance.vercel.app

📊 Admin uses:
https://crm-assurance.vercel.app/admin/costs

🔌 Developers use:
https://crm-assurance-api.onrender.com (base API URL)
```

---

## 🛠 TROUBLESHOOTING DEPLOYMENT

### Build Failed on Render

**Check logs:**
1. Go to Render dashboard
2. Click on service
3. Click "Logs"
4. Look for error messages

**Common issues:**
- Missing dependencies: Run `npm install` locally first
- Wrong start command: Should be `cd backend && node server.js`
- Missing env vars: Add all required variables
- Database not set: Create PostgreSQL service first

### Build Failed on Vercel

**Check logs:**
1. Go to Vercel dashboard
2. Click on project
3. Click "Deployments"
4. Click failed build
5. See error

**Common issues:**
- React components missing: Install shadcn/ui components
- API URL wrong: Check VITE_API_BASE_URL
- Build path wrong: Should be `frontend/dist`

### Database Not Connecting

**Troubleshoot:**
1. Check DATABASE_URL format is correct
2. Verify PostgreSQL service is running (Render)
3. Verify user permissions
4. Test connection locally first

### API Calls Failing

**Troubleshoot:**
1. Check CORS is enabled in server.js
2. Check FRONTEND_URL matches deployment
3. Verify authorization headers
4. Check network tab in browser dev tools

---

## 📋 DEPLOYMENT CHECKLIST

- [ ] Run `./deploy.sh`
- [ ] Wait for Render build complete
- [ ] Wait for Vercel build complete
- [ ] Get backend URL from Render
- [ ] Get frontend URL from Vercel
- [ ] Run database migration
- [ ] Test backend health check
- [ ] Test frontend loads
- [ ] Test API endpoint
- [ ] Test admin dashboard
- [ ] Configure Telegram alerts
- [ ] Document URLs
- [ ] Share URLs with team
- [ ] Monitor first day usage

---

## 🎉 DONE!

Your Option 4 system is live and ready to serve courtiers!

**Backend URL:** https://crm-assurance-api.onrender.com  
**Frontend URL:** https://crm-assurance.vercel.app  

Share these with your team and users. ✅

---

**Need help?** Check OPTION4_DEPLOYMENT.md for detailed instructions.
