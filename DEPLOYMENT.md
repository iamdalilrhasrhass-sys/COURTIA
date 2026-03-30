# 🚀 COURTIA - Déploiement Production

## Backend sur Railway

### 1. Créer un compte Railway
```bash
npm install -g @railway/cli
railway login
```

### 2. Initialiser le projet
```bash
cd ~/Desktop/CRM-Assurance
railway init
```

### 3. Ajouter PostgreSQL
```bash
railway add # Sélectionner PostgreSQL
```

### 4. Configurer les variables d'env
```
DATABASE_URL=<PostgreSQL URL>
TELEGRAM_BOT_TOKEN=<ton token>
ANTHROPIC_API_KEY=sk-ant-...
JWT_SECRET=courtia_secret_key_2026
PORT=3000
NODE_ENV=production
```

### 5. Déployer
```bash
railway up
railway logs
```

### 6. Obtenir l'URL
```bash
railway env
# URL sera: https://courtia-backend-production.up.railway.app
```

---

## Frontend sur Vercel

### 1. Créer un compte Vercel
- https://vercel.com

### 2. Connecter le repo GitHub
```bash
cd frontend
vercel link
```

### 3. Configurer variables d'env
```
VITE_API_URL=https://courtia-backend-production.up.railway.app
```

### 4. Déployer
```bash
vercel deploy --prod
```

### 5. Obtenir l'URL
```
https://courtia.vercel.app
```

---

## ✅ Tests Production

```bash
# Test API health
curl https://courtia-backend-production.up.railway.app/health

# Test login
curl -X POST https://courtia-backend-production.up.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@courtia.fr","password":"demo2026"}'

# Test ARK
curl -X POST https://courtia-backend-production.up.railway.app/api/ark/chat \
  -H "Authorization: Bearer TOKEN" \
  -d '{"clientData":...}'
```

---

## 📊 Monitoring

- Railway Dashboard: https://railway.app
- Vercel Analytics: https://vercel.com/analytics
- Logs Backend: `railway logs --follow`
- Logs Frontend: Vercel Console

---

## 🔄 CI/CD

Railway redéploie automatiquement quand on push sur main.
Vercel redéploie quand on merge une PR.

Configure auto-redeploy dans les settings.

---

## 💾 Backups

PostgreSQL sur Railway crée des backups auto.
Export manuel: `railway db:backup`

---

**URLs de production:**
- Frontend: https://courtia.vercel.app
- Backend API: https://courtia-backend-production.up.railway.app
- Pricing: https://courtia.vercel.app/pricing
