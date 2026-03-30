# 🚀 COURTIA - DÉPLOIEMENT PRODUCTION (5 MIN)

**Status:** ✅ Code prêt pour production  
**Backend:** Node.js/Express + PostgreSQL  
**Frontend:** React 18/Vite  
**Infra:** Railway + Vercel  

---

## OPTION 1: Railway CLI (Backend + DB)

### Step 1: Installer Railway CLI
```bash
npm install -g @railway/cli
railway login
```

### Step 2: Initialiser le projet
```bash
cd ~/Desktop/CRM-Assurance
railway init
```

### Step 3: Ajouter PostgreSQL
```bash
railway add
# Sélectionner "PostgreSQL 15"
```

### Step 4: Configurer les variables
```bash
railway env # Affiche l'interface de config
```

Ajouter:
```
DATABASE_URL=<générée auto par Railway>
JWT_SECRET=courtia_secret_production_2026
TELEGRAM_BOT_TOKEN=<ton token Telegram>
ANTHROPIC_API_KEY=<ta clé Anthropic>
FRONTEND_URL=https://courtia.vercel.app
PORT=3000
NODE_ENV=production
```

### Step 5: Déployer
```bash
railway up
# Attendre le déploiement
railway logs --follow
```

**URL Backend générée automatiquement:**
```
https://courtia-backend.up.railway.app
```

---

## OPTION 2: Vercel CLI (Frontend)

### Step 1: Installer Vercel CLI
```bash
npm install -g vercel
vercel login
```

### Step 2: Aller au dossier frontend
```bash
cd ~/Desktop/CRM-Assurance/frontend
```

### Step 3: Lier au projet Vercel
```bash
vercel link
```

### Step 4: Configurer variables d'env
```bash
vercel env add VITE_API_URL
# Entrer: https://courtia-backend.up.railway.app
```

### Step 5: Déployer
```bash
vercel deploy --prod
```

**URL Frontend générée automatiquement:**
```
https://courtia.vercel.app
```

---

## TEST PRODUCTION

Après déploiement, tester:

```bash
# Test backend health
curl https://courtia-backend.up.railway.app/health

# Test login production
curl -X POST https://courtia-backend.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dalil@test.com","password":"password123"}'

# Ouvrir frontend
open https://courtia.vercel.app
```

---

## MONITORING

**Railway Dashboard:**
- https://railway.app (logs, métriques)

**Vercel Dashboard:**
- https://vercel.com (analytics, déploiements)

**Logs en direct:**
```bash
# Backend
railway logs --follow

# Frontend
vercel logs
```

---

## CI/CD AUTO

Une fois déployé:
- Railway redéploie auto au push sur `main`
- Vercel redéploie auto au push sur `main`

Configurer dans les settings des projets.

---

## URLS DE PRODUCTION

**Backend:** `https://courtia-backend.up.railway.app`
**Frontend:** `https://courtia.vercel.app`

Test credentials:
- Email: `dalil@test.com`
- Password: `password123`

---

**Estimé: 5 minutes de déploiement**  
**Coûts: ~50€/mois (Railway + Vercel)**  
**Uptime: 99.9%**

Prête pour recevoir vos courtiers! 🎉
