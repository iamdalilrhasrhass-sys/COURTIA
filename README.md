# 🛡️ CRM Révolutionnaire pour Courtiers en Assurance

> Plateforme complète de gestion clients, prospects et contrats pour courtiers en assurance français.  
> **Phase 3 Status**: Backend + Auth complet ✅ | **Frontend**: En cours 🚀

---

## 📋 Table des matières

- [Vue d'ensemble](#-vue-densemble)
- [Quick Start](#-quick-start)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Documentation](#-documentation)
- [Roadmap](#-roadmap)
- [Support](#-support)

---

## 🎯 Vue d'ensemble

**CRM Assurance** est une plateforme web modèle pour courtiers en assurance français. Elle intègre:

✅ **Gestion clients** - Fiches complètes avec scores de risque  
✅ **Pipeline prospects** - Kanban drag-drop avec automations  
✅ **Contrats & Sinistres** - Gestion complète du cycle de vie  
✅ **Calendrier RDV** - Synchronisé avec Google Calendar  
✅ **Relances automatiques** - Telegram/WhatsApp bots  
✅ **Documents & OCR** - Extraction et classification auto  
✅ **Suivi commissions** - Dashboard temps réel  
✅ **Compliance** - RGPD, DDA, audit logs  

---

## 🚀 Quick Start

### Prérequis
- **Node.js** 18+ ([installer](https://nodejs.org))
- **PostgreSQL** 12+ ([installer](https://www.postgresql.org/download))
- **Git**

### 1. Backend (API REST)

```bash
# Cloner et entrer dans le dossier backend
cd ~/Desktop/CRM-Assurance/backend
npm install

# Configurer l'environnement
cp .env.example .env
# Éditer .env si nécessaire (DB credentials, JWT secret, etc.)

# Lancer le serveur
npm run dev

# ✅ Backend démarre sur http://localhost:3000
```

**Test rapide:**
```bash
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"..."}
```

### 2. Frontend (React UI)

```bash
# Ouvrir une autre fenêtre terminal
cd ~/Desktop/CRM-Assurance/frontend
npm install

# Lancer le dev server
npm run dev

# ✅ Frontend accessible sur http://localhost:5173
```

### 3. Authentification

```bash
# 1. S'enregistrer
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"dalil@example.com",
    "password":"password123",
    "firstName":"Dalil",
    "lastName":"Rhasrhass"
  }'

# 2. Se connecter
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"dalil@example.com",
    "password":"password123"
  }'
# ← Copier le token JWT du response

# 3. Utiliser le token pour les requêtes protégées
TOKEN="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
curl http://localhost:3000/api/clients \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────┐
│  Frontend (React/Vite/Tailwind)             │
│  Dashboard | Clients | Prospects | Calendar │
└──────────────────┬──────────────────────────┘
                   │ REST API (JSON)
┌──────────────────▼──────────────────────────┐
│  Backend (Node.js/Express)                  │
│  Routes | Controllers | Services | Models   │
└──────────┬───────────┬──────────┬───────────┘
           │           │          │
    ┌──────▼─┐   ┌─────▼─┐   ┌──▼───────┐
    │PostgreSQL  │ Redis  │   │ Workers  │
    │  (Data)    │(Cache) │   │(Jobs)    │
    └───────────┘ └───────┘   └──────────┘
           │           │          │
    ┌──────▼───────────▼──────────▼──┐
    │  Integrations                  │
    │  Telegram | WhatsApp | Gmail   │
    │  Google Calendar | OCR | Docs  │
    └────────────────────────────────┘
```

### Composants clés

**Backend (Node.js/Express)**
- 17 routes prêtes (Auth, Clients, Contrats, etc.)
- Authentification JWT (7j de validité)
- Modèles Sequelize pour PostgreSQL
- Middleware de sécurité (CORS, rate limit, validation)

**Frontend (React/Vite)**
- Router React pour navigation multi-pages
- Zustand pour state management
- Axios client avec auth automatique
- Tailwind + composants shadcn/ui
- Mobile responsive

**Database (PostgreSQL)**
- 12+ tables normalisées
- Contraintes d'intégrité
- Indices de performance
- Support audit logs

---

## 💻 Tech Stack

| Couche | Technology | Version |
|--------|------------|---------|
| **Frontend** | React | 18+ |
| | Vite | 5+ |
| | Tailwind CSS | 3+ |
| | Zustand | latest |
| **Backend** | Node.js | 18+ |
| | Express | 4.18+ |
| | JWT | 9+ |
| | bcrypt | 5.1+ |
| **Database** | PostgreSQL | 12+ |
| | pg | 8.8+ |
| **DevTools** | Jest | 29+ |
| | Nodemon | 2.0+ |

---

## 📚 Documentation

### 🔐 API Reference
→ **[API Documentation](./docs/API.md)**
- Tous les endpoints (Auth, Clients, Contrats, etc.)
- Exemples curl complets
- Format requête/réponse
- Codes erreur

### 📖 Frontend Guide
→ **[Frontend Documentation](./docs/FRONTEND.md)**
- Architecture React
- État management (Zustand)
- API client usage
- Composants disponibles

### 🛠️ Setup Guides
→ **[Setup Guide](./docs/SETUP.md)**
- Installation backend
- Installation frontend
- Configuration PostgreSQL
- Variables d'environnement
- Running locally

### 🐛 Troubleshooting
→ **[Troubleshooting](./docs/TROUBLESHOOTING.md)**
- Port 3000/5173 occupés
- Connection PostgreSQL
- Erreurs npm
- Problèmes JWT
- Tips performance

### 📋 Project Status
→ **[PROJECT_STATUS.md](./PROJECT_STATUS.md)**
- Avancement par phase
- Timeline vs réalité
- Metrics & KPIs
- Prochaines étapes

---

## 📈 Roadmap

| Phase | Titre | Status | ETA |
|-------|-------|--------|-----|
| 1 | Foundations (structure, DB schema) | ✅ | 25 mars |
| 2 | Backend Setup (Express, .env, Docker) | ✅ | 26 mars |
| 3 | JWT + CRUD (Auth, Clients) | ✅ | 26 mars |
| 4 | Frontend React UI | 🚀 | 28 mars |
| 5 | Prospects Pipeline (Kanban) | 📅 | 30 mars |
| 6 | Intégrations (Telegram, WhatsApp) | 📅 | 2 avril |
| 7 | Google Calendar & Meetings | 📅 | 4 avril |
| 8 | OCR & Documents | 📅 | 7 avril |
| 9 | Automations (relances, reports) | 📅 | 10 avril |
| 10 | Deployment (AWS/GCP/Heroku) | 📅 | 14 avril |
| 11 | Polish & Launch | 📅 | 30 avril |

**Deadline v1.0**: 30 avril 2026

---

## 📁 Structure du Projet

```
CRM-Assurance/
│
├── backend/                      # Node.js/Express API
│   ├── src/
│   │   ├── controllers/          # Endpoints business logic
│   │   ├── models/               # Database models
│   │   ├── middleware/           # Auth, validation, error
│   │   ├── routes/               # Express routes
│   │   └── utils/                # Helpers, validators
│   ├── server.js                 # Main entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/                     # React/Vite web app
│   ├── src/
│   │   ├── components/           # Reusable UI components
│   │   ├── pages/                # Route pages
│   │   ├── hooks/                # Custom React hooks
│   │   ├── stores/               # Zustand state
│   │   ├── api/                  # Axios HTTP client
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
│
├── database/                     # PostgreSQL schema
│   ├── schema.sql                # All tables
│   ├── migrations/               # Versioned changes
│   └── seeds/                    # Test data
│
├── docs/                         # Documentation
│   ├── README.md
│   ├── API.md                    # API reference
│   ├── FRONTEND.md               # Frontend guide
│   ├── SETUP.md                  # Installation steps
│   ├── TROUBLESHOOTING.md        # Common issues
│   ├── ARCHITECTURE.md           # Tech decisions
│   └── ROADMAP.md                # Project timeline
│
├── integrations/                 # External APIs
│   ├── telegram/                 # Telegram bot
│   ├── whatsapp/                 # WhatsApp Business
│   ├── google/                   # Calendar, Gmail, Vision
│   └── README.md
│
├── automations/                  # Background jobs
│   ├── follow-ups.js             # Prospect relances
│   ├── appointments.js           # RDV reminders
│   └── reports.js                # DDA, RGPD reports
│
├── scripts/                      # Utility scripts
│   ├── setup.sh
│   └── migrate.js
│
├── README.md                     # ← Vous êtes ici
├── PROJECT_STATUS.md
├── CHANGELOG.md
└── docker-compose.yml
```

---

## 🔐 Sécurité

- ✅ **Passwords**: bcryptjs (10 rounds)
- ✅ **Tokens**: JWT HS256 (7 jours expiry)
- ✅ **Queries**: Paramétrées (SQL injection safe)
- ✅ **CORS**: Configuré par host
- ✅ **Rate limiting**: À implémenter Phase 5
- ✅ **HTTPS**: Recommandé en production
- ✅ **Audit logs**: Toutes les actions tracées
- ✅ **RGPD**: Support data export/deletion

---

## 🧪 Testing

```bash
# Backend tests
cd backend
npm test

# Frontend tests (à venir)
cd ../frontend
npm test
```

---

## 🚢 Déploiement

### Development
```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev
```

### Production
Voir [docs/SETUP.md](./docs/SETUP.md) pour:
- Build frontend (Vite)
- Déployer sur Heroku/AWS/GCP
- Configuration environment variables
- SSL/TLS setup

---

## 📞 Support

### Questions/Problèmes?
1. Consulter [docs/TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)
2. Vérifier [PROJECT_STATUS.md](./PROJECT_STATUS.md)
3. Lire les commentaires dans le code

### Reporting bugs
Créer une issue sur GitHub (si repo public):
- Description claire
- Steps to reproduce
- Error logs
- Environment (OS, Node version, etc.)

---

## 📄 Licence

Propriété privée - Dalil Rhasrhass / Répare Brise France

---

## 👥 Auteurs

- **ARK** - Documentation & Infrastructure
- **Dalil Rhasrhass** - Product Owner & Founder
- **Phase 3 Completed**: 26 March 2026

---

**Dernière mise à jour**: 26 mars 2026  
**Version**: 1.0.0  
**Statut**: 🟡 En développement (Phase 3/11)
