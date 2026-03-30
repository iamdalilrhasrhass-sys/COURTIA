# Architecture - CRM Révolutionnaire pour Courtiers Assurance

## 🏗️ Vue d'ensemble générale

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (React/Vite)                      │
│  Dashboard | Fiches Clients | Pipeline | Calendrier | Dash  │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS/REST API
┌──────────────────────▼──────────────────────────────────────┐
│               BACKEND (Node.js/Express)                      │
│  Auth | Clients API | Contracts | Claims | Appointments     │
└──────┬─────────┬──────────┬──────────┬───────────┬──────────┘
       │         │          │          │           │
       ▼         ▼          ▼          ▼           ▼
   [DATABASE]  [QUEUE]  [CACHE]   [WORKERS]   [WEBHOOKS]
   PostgreSQL  Bull/RQ  Redis     Node.js      Telegram
                                  Workers      WhatsApp
                                              Google
```

## 📊 Stack technique

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: PostgreSQL (+ PostGIS optionnel)
- **Queue**: Bull (Redis-backed job queue)
- **Cache**: Redis
- **Auth**: JWT + OAuth2
- **Upload**: AWS S3 ou local storage

### Frontend
- **Framework**: React 18
- **Build**: Vite
- **State**: Zustand
- **HTTP**: React Query + Axios
- **UI**: shadcn/ui + Tailwind
- **Calendar**: react-big-calendar
- **Drag & Drop**: react-dnd

### Integrations
- **Messaging**: Telegram Bot API, WhatsApp Business
- **Calendar**: Google Calendar API
- **Email**: Gmail API + SMTP
- **Documents**: Google Vision, Tesseract.js
- **Signature**: DocuSign API
- **Payments**: Stripe (future)

---

## 📁 Structure détaillée

```
CRM-Assurance/
├── backend/
│   ├── src/
│   │   ├── middleware/       (auth, validation, error handling)
│   │   ├── controllers/      (api endpoints)
│   │   ├── services/         (business logic)
│   │   ├── models/           (database models)
│   │   ├── integrations/     (telegram, whatsapp, google, ocr)
│   │   ├── workers/          (background jobs, cron)
│   │   └── utils/            (helpers, validators)
│   ├── tests/
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/       (UI components)
│   │   ├── pages/           (route pages)
│   │   ├── hooks/           (custom hooks)
│   │   ├── stores/          (zustand state)
│   │   ├── api/             (axios client)
│   │   └── App.jsx
│   ├── public/
│   └── vite.config.js
│
├── database/
│   ├── schema.sql           (all tables)
│   ├── migrations/          (versioned migrations)
│   ├── seeds/               (test data)
│   └── README.md
│
├── integrations/
│   ├── telegram/            (telegram bot)
│   ├── whatsapp/            (whatsapp integration)
│   ├── google/              (calendar, gmail, vision)
│   ├── ocr/                 (document extraction)
│   ├── docusign/            (e-signature)
│   └── README.md
│
├── automations/
│   ├── follow-ups.js        (relances prospects)
│   ├── appointments.js      (rappels RDV)
│   ├── alerts.js            (clients silencieux, etc)
│   ├── reports.js           (DDA, RGPD)
│   ├── commissions.js       (suivi temps réel)
│   └── README.md
│
├── docs/
│   ├── ARCHITECTURE.md      (ce fichier)
│   ├── API.md              (endpoints)
│   ├── DATABASE.md         (schema details)
│   ├── COMPLIANCE.md       (RGPD, DDA)
│   └── DEPLOYMENT.md
│
├── scripts/
│   ├── init-db.sh          (setup database)
│   ├── seed-test-data.js   (test data)
│   └── deploy.sh
│
├── docker-compose.yml       (local dev)
├── .gitignore
├── README.md
└── ROADMAP.md
```

---

## 🔐 Sécurité

- **Authentication**: JWT (access + refresh tokens)
- **HTTPS**: TLS 1.3
- **Data**: Encryption at rest (PG crypto) + transit
- **RGPD**: Anonymization, right to be forgotten, audit logs
- **DDA**: Document retention, compliance tracking
- **API Keys**: Rotation, scoped permissions
- **Passwords**: bcrypt (rounds: 10+)

---

## 📈 Performance

- **Caching**: Redis pour clients, contrats, prospects fréquemment accédés
- **Indexing**: PostgreSQL indices sur email, status, dates
- **Pagination**: Implémentée sur toutes les listes (50 items/page défaut)
- **CDN**: Assets static servis via CDN
- **Background Jobs**: Queue (Bull) pour opérations longues (OCR, rapports, emails)

---

## 🚀 Déploiement

### Développement local
```bash
docker-compose up -d  # PostgreSQL, Redis
npm install           # backend & frontend
npm run dev          # start both
```

### Production (recommandé)
- **Hosting**: AWS EC2 + RDS, GCP Cloud Run, ou Heroku
- **Container**: Docker (docker-compose) ou Kubernetes
- **CI/CD**: GitHub Actions, GitLab CI
- **Monitoring**: DataDog, New Relic, ou Prometheus

---

## 📋 Checklist Étapes suivantes

- [ ] Base de données initialisée ✅ (DONE)
- [ ] Backend API scaffold
- [ ] Frontend structure React
- [ ] Authentification JWT
- [ ] CRUD Clients
- [ ] Telegram Bot intégration
- [ ] WhatsApp intégration
- [ ] Google APIs (Calendar, Gmail)
- [ ] OCR & Document processing
- [ ] Background jobs (relances, rappels)
- [ ] Signature électronique
- [ ] Reports DDA/RGPD
- [ ] Tests unitaires & E2E
- [ ] Déploiement production

---

**Version**: 1.0.0  
**Last Updated**: 2026-03-26  
**Status**: 🟡 En cours de développement
