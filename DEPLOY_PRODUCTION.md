# COURTIA - Déploiement Production

## Railway Backend

```bash
# 1. Login Railway
railway login

# 2. Lier le projet
cd ~/Desktop/CRM-Assurance
railway init --name courtia-backend

# 3. Ajouter PostgreSQL
railway add --service postgresql

# 4. Variables d'env
railway variables set DATABASE_URL=postgresql://...
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=courtia_prod_secret
railway variables set ANTHROPIC_API_KEY=sk-ant-...

# 5. Deploy
cd backend
railway up

# 6. URL générée
railway domains
# → https://courtia-backend.up.railway.app
```

## Vercel Frontend

```bash
# 1. Login
vercel login

# 2. Link project
cd ~/Desktop/CRM-Assurance/frontend
vercel link

# 3. Deploy
vercel deploy --prod

# 4. Configure env
vercel env add VITE_API_URL https://courtia-backend.up.railway.app

# 5. Redeploy
vercel deploy --prod

# 6. URL générée
# → https://courtia.vercel.app
```

## Post-Deploy

```bash
# Update CORS in backend with Vercel URL
# Restart backend
```

---

**URLs Finales:**
- Backend: https://courtia-backend.up.railway.app
- Frontend: https://courtia.vercel.app
