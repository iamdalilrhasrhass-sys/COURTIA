# Roadmap - CRM Assurance 2026

## 🎯 Objectif Global
Plateforme complète de gestion clients, prospects et contrats pour courtiers en assurance français.  
**Deadline v1.0**: Fin avril 2026

---

## 📅 Phase 1: Fondations (Semaine 1-2) ⚙️

### Étape 1.1: Infrastructure & Base de données ✅
- [x] Structure dossiers projet
- [x] Schéma PostgreSQL complet
- [x] Backend package.json
- [x] Frontend package.json
- [ ] Docker-compose.yml (local dev)
- [ ] GitHub repository + .gitignore

### Étape 1.2: Backend API Scaffold (Semaine 2)
- [ ] Express server setup
- [ ] Database connection pool
- [ ] Error handling middleware
- [ ] CORS & security headers
- [ ] Environment variables (.env)
- [ ] Logger (winston/pino)

### Étape 1.3: Authentication (Semaine 2)
- [ ] JWT issuer/verifier
- [ ] Password hashing (bcrypt)
- [ ] Login endpoint (/auth/login)
- [ ] Register endpoint (/auth/register)
- [ ] Refresh token logic
- [ ] Protected routes middleware

---

## 📅 Phase 2: Fondations Frontend (Semaine 2-3)

### Étape 2.1: React Setup (Semaine 2)
- [ ] Vite + React template
- [ ] Tailwind + shadcn/ui setup
- [ ] React Router structure
- [ ] Zustand store (auth, clients, ui)
- [ ] Axios client (API base URL, interceptors)
- [ ] ESLint + Prettier config

### Étape 2.2: Layout & Navigation
- [ ] Main layout (sidebar, header, footer)
- [ ] Dashboard page (skeleton)
- [ ] Navigation structure
- [ ] Login/Register pages
- [ ] Protected routes

---

## 📅 Phase 3: CRUD Clients & Contrats (Semaine 3-4)

### Étape 3.1: Backend APIs
- [ ] GET /api/clients (list, paginated)
- [ ] GET /api/clients/:id (details)
- [ ] POST /api/clients (create)
- [ ] PUT /api/clients/:id (update)
- [ ] DELETE /api/clients/:id (soft delete)
- [ ] GET /api/contracts (by client)
- [ ] POST /api/contracts (create)
- [ ] PUT /api/contracts/:id (update)
- [ ] GET /api/claims (by client)

### Étape 3.2: Frontend Pages
- [ ] Clients list page (table, search, filter)
- [ ] Client detail page (scores, contacts, contrats, sinistres)
- [ ] Create/Edit client forms
- [ ] Contracts section (tab in client detail)
- [ ] Claims section (tab in client detail)
- [ ] Contract detail modal
- [ ] Claims detail modal

### Étape 3.3: Features
- [ ] Loyalty score calculation
- [ ] Risk score calculation
- [ ] Lifetime value tracking
- [ ] Contact history timeline
- [ ] Documents list per client

---

## 📅 Phase 4: Pipeline Prospects (Semaine 4-5)

### Étape 4.1: Backend
- [ ] GET /api/prospects (by stage)
- [ ] POST /api/prospects
- [ ] PUT /api/prospects/:id
- [ ] PUT /api/prospects/:id/stage (kanban update)
- [ ] Prospect automation triggers

### Étape 4.2: Frontend - Kanban Pipeline
- [ ] Drag-drop kanban (react-dnd)
- [ ] Stages: Prospection, Qualification, Proposition, Negotiation, Closed
- [ ] Visual indicators (value, source, days in stage)
- [ ] Add prospect modal
- [ ] Prospect detail panel
- [ ] Quick actions (call, email, whatsapp)

---

## 📅 Phase 5: Telegram & WhatsApp Integration (Semaine 5-6)

### Étape 5.1: Telegram Bot
- [ ] Bot token setup
- [ ] Webhook handler
- [ ] Commands: /start, /clients, /help
- [ ] Send relance messages
- [ ] Document upload handler
- [ ] Notification alerts

### Étape 5.2: WhatsApp Integration
- [ ] API setup (Twilio ou Meta Business)
- [ ] Send relance messages
- [ ] Document sharing
- [ ] Appointment reminders
- [ ] Notification alerts

### Étape 5.3: Follow-ups Automation
- [ ] Follow-up job queue (Bull)
- [ ] Prospect relance cron (daily 9am)
- [ ] Smart message templating
- [ ] Response tracking

---

## 📅 Phase 6: Calendrier & Rendez-vous (Semaine 6-7)

### Étape 6.1: Google Calendar Integration
- [ ] OAuth2 setup
- [ ] Create appointment → Google Calendar
- [ ] Read Google Calendar events
- [ ] Bidirectional sync
- [ ] Conflict detection

### Étape 6.2: Appointments Management
- [ ] Appointments table/calendar view
- [ ] Create appointment modal
- [ ] RDV detail page
- [ ] Reminder cron (24h before)
- [ ] Send brief to client & team

### Étape 6.3: Auto-Brief Generation
- [ ] Client history template
- [ ] Contract summary
- [ ] Loyalty score display
- [ ] Action items list
- [ ] PDF generation (puppeteer)
- [ ] Auto-send via email

---

## 📅 Phase 7: Documents & OCR (Semaine 7-8)

### Étape 7.1: Document Management
- [ ] Upload documents endpoint
- [ ] Document list by client
- [ ] Document viewer (PDF, images)
- [ ] Delete documents

### Étape 7.2: OCR & Extraction
- [ ] Google Vision API setup
- [ ] Document type classification (IA)
- [ ] Data extraction (names, dates, amounts)
- [ ] Validation & correction UI
- [ ] Structured data storage

### Étape 7.3: Telegram Document Handler
- [ ] Receive documents via Telegram
- [ ] Auto-OCR & classification
- [ ] Link to client automatically
- [ ] Confirmation to user

---

## 📅 Phase 8: Signature Électronique (Semaine 8-9)

### Étape 8.1: DocuSign Integration
- [ ] API setup
- [ ] Signature request creation
- [ ] Signature tracking
- [ ] Completion webhook handler
- [ ] Document storage integration

---

## 📅 Phase 9: Advanced Features (Semaine 9-10)

### Étape 9.1: Commission Tracking
- [ ] Commission dashboard
- [ ] Contract → commission calculation
- [ ] Payment tracking
- [ ] Timeline visualization
- [ ] Export reports

### Étape 9.2: Silent Client Alerts
- [ ] Cron job (daily)
- [ ] Detect 6-month no-contact
- [ ] Alert creation
- [ ] Auto-relance suggestion

### Étape 9.3: Compliance Reports
- [ ] DDA report generation (monthly)
- [ ] RGPD report generation (monthly)
- [ ] Audit logs
- [ ] PDF export with signature
- [ ] Email archive

---

## 📅 Phase 10: Polish & Testing (Semaine 10-11)

### Étape 10.1: Testing
- [ ] Unit tests (Jest)
- [ ] E2E tests (Playwright)
- [ ] Load testing
- [ ] Security audit

### Étape 10.2: Performance
- [ ] Database query optimization
- [ ] Caching strategy
- [ ] Frontend bundle analysis
- [ ] CDN setup for assets

### Étape 10.3: Documentation
- [ ] API documentation (OpenAPI/Swagger)
- [ ] User manual
- [ ] Admin guide
- [ ] Deployment guide

---

## 📊 Progress Tracker

| Phase | Description | Status | % | ETA |
|-------|-------------|--------|---|-----|
| 1 | Fondations | 🟢 40% | 40% | W2 |
| 2 | Frontend Setup | ⚪ 0% | 0% | W3 |
| 3 | CRUD Core | ⚪ 0% | 0% | W4 |
| 4 | Pipeline | ⚪ 0% | 0% | W5 |
| 5 | Messaging | ⚪ 0% | 0% | W6 |
| 6 | Calendrier | ⚪ 0% | 0% | W7 |
| 7 | Documents | ⚪ 0% | 0% | W8 |
| 8 | Signature | ⚪ 0% | 0% | W9 |
| 9 | Advanced | ⚪ 0% | 0% | W10 |
| 10 | Polish | ⚪ 0% | 0% | W11 |

**Global Progress**: 🟢 4% complete

---

## 🚀 Prochaines actions (Maintenant)
1. ✅ Structure projet créée
2. ✅ Schéma DB finalisé
3. → **Initialiser base de données PostgreSQL**
4. → **Créer scaffold backend Express**
5. → **Authentification JWT**

---

**Version**: 1.0.0  
**Last Updated**: 2026-03-26  
**PM**: ARK Assistant
