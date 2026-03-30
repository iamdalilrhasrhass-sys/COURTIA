# ⚡ QuickStart - CRM Assurance

Démarrage rapide en 5 minutes.

## 🚀 Étape 1: Initialiser PostgreSQL

```bash
# Créer la base de données
createdb crm_assurance

# Importer le schéma
psql crm_assurance < ~/Desktop/CRM-Assurance/database/schema.sql

# Vérifier l'import
psql crm_assurance -c "\dt"  # Devrait lister 15+ tables
```

## 🔧 Étape 2: Backend (Node.js API)

```bash
cd ~/Desktop/CRM-Assurance/backend

# Installer dépendances
npm install

# Configurer .env
cp .env.example .env
# Éditer .env avec tes credentials

# Lancer le serveur
npm run dev
# → http://localhost:3000
```

## 🎨 Étape 3: Frontend (React)

```bash
cd ~/Desktop/CRM-Assurance/frontend

# Installer dépendances
npm install

# Lancer le dev server
npm run dev
# → http://localhost:3001
```

## ✅ Vérifier que tout marche

1. **Frontend**: http://localhost:3001 (Page vide pour l'instant)
2. **API**: curl http://localhost:3000/api/health
3. **DB**: psql crm_assurance -c "SELECT COUNT(*) FROM users;"

---

## 📁 Fichiers importants

| Fichier | Objectif | Location |
|---------|----------|----------|
| schema.sql | Structure DB | `/database/schema.sql` |
| .env.example | Config variables | `/backend/.env.example` |
| ROADMAP.md | Timeline 11 phases | `/docs/ROADMAP.md` |
| ARCHITECTURE.md | Stack technique | `/docs/ARCHITECTURE.md` |
| PROJECT_STATUS.md | Suivi progrès | `/PROJECT_STATUS.md` |

---

## 🎯 Prochaines tâches (Phase 2)

1. [ ] Express server scaffold (`server.js`, middleware)
2. [ ] Database connection pool
3. [ ] JWT authentication (login/register)
4. [ ] CRUD Clients API
5. [ ] React routing + Zustand store
6. [ ] Client list page
7. [ ] Client detail page

→ Voir `/docs/ROADMAP.md` pour timeline complète

---

## 🆘 Troubleshooting

**PostgreSQL not found?**
```bash
brew install postgresql  # macOS
# ou installer depuis https://www.postgresql.org/download/
```

**Node.js not found?**
```bash
brew install node  # macOS
# ou https://nodejs.org
```

**Port already in use?**
```bash
# Changer port dans server.js et vite.config.js
# Ou: lsof -i :3000  (voir qui utilise le port)
```

---

## 📞 Support

- **Docs**: Lire `/docs/ARCHITECTURE.md`
- **Timeline**: Voir `/docs/ROADMAP.md`
- **Status**: Consulter `/PROJECT_STATUS.md`

---

**Created**: 26 Mars 2026  
**Status**: 🟢 Prêt pour Phase 2  
**Next**: Backend Express scaffold
