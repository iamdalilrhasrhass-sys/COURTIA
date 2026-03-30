# COURTIA - Roadmap d'Implémentation Complète

## Étape 1: Déploiement en Ligne ✅ PLANIFIÉ
**Status:** Structure prête, déploiement technique
**Tâches:**
- [ ] Créer repo GitHub
- [ ] Configurer Railway pour backend
  - Variables d'env: DB_* TELEGRAM_BOT_TOKEN, ANTHROPIC_API_KEY
  - Déploiement auto sur push vers main
  - URL: api.courtia.app
- [ ] Configurer Vercel pour frontend
  - Variables env: VITE_API_URL=https://api.courtia.app
  - Auto-déploiement
  - URL: app.courtia.app
- [ ] Tests de connexion API publique

## Étape 2: Questionnaire Onboarding ✅ STRUCTURE CRÉÉE
**Status:** Services et routes créés
**Fichiers:**
- `/backend/src/services/telegramService.js` - Service Telegram
- `/backend/src/routes/onboarding.js` - Routes onboarding
- `/database/` - Schéma mis à jour avec personal_profile

**Tâches restantes:**
- [ ] Intégrer routes au server.js
- [ ] Créer UI pour déclencher onboarding
- [ ] Webhook Telegram pour recevoir les réponses
- [ ] Parser les réponses et sauvegarder dans personal_profile

## Étape 3: Brief Automatique + Calendrier ✅ STRUCTURE CRÉÉE
**Status:** Composant React et schéma DB prêts
**Fichiers:**
- `/frontend/src/components/Calendar.jsx` - UI Calendrier
- `/backend/database/calendar_schema.sql` - Schéma DB

**Tâches restantes:**
- [ ] API endpoints: GET/POST /api/appointments
- [ ] Cron job pour vérifier RDV demain à 18h
- [ ] Envoyer brief Telegram via telegramService
- [ ] Intégrer Calendar dans App.jsx avec routing

## Étape 4: Relance Automatique ✅ SERVICE CRÉÉ
**Status:** Service de relance prêt
**Fichiers:**
- `/backend/src/services/reminderService.js` - Logic de relance

**Tâches restantes:**
- [ ] Créer cron job (lundi 9h chaque semaine)
- [ ] Endpoint API pour déclencher manuellement
- [ ] Tests de prioritisation des clients

## Étape 5: Page Calendrier ✅ COMPOSANT CRÉÉ
**Status:** Composant React complet
**Fichiers:**
- `/frontend/src/components/Calendar.jsx`

**Tâches restantes:**
- [ ] Ajouter au menu principal (App.jsx)
- [ ] Connecter aux endpoints API
- [ ] Reminder 24h avant RDV

## Étape 6: Amélioration Rapports ⏳ À FAIRE
**Status:** À implémenter
**Tâches:**
- [ ] Créer générateur PDF
- [ ] Template DDA (Document Demande d'Assurance)
- [ ] Template RGPD (Liste clients + données)
- [ ] Template ACPR (Audit Compliance)
- [ ] Endpoint: GET /api/reports/:type/pdf
- [ ] UI pour télécharger PDFs

## Étape 7: Responsive Mobile ⏳ À TESTER
**Status:** À ajuster
**Tâches:**
- [ ] Test iPhone 12/14/15
- [ ] Corriger breakpoints Tailwind
- [ ] Vérifier lisibilité texte
- [ ] Boutons touch-friendly (min 44px)
- [ ] Drawer navigation pour mobile

## Étape 8: Page Pricing Publique ⏳ À FAIRE
**Status:** À créer
**Tâches:**
- [ ] Créer route /pricing (public)
- [ ] Composant React Pricing
- [ ] 3 plans: Starter 99€, Pro 199€, Premium 399€
- [ ] Bouton "Demander une démo"
- [ ] Webhook pour notification Telegram à Dalil

---

## Architecture API Complète

### Onboarding
```
POST /api/onboarding/:clientId/start
  → Déclenche questionnaire Telegram
  
POST /api/onboarding/:clientId/responses
  → Sauvegarde les réponses
```

### Calendar
```
GET /api/appointments?date=2026-03-29
  → Liste RDV du jour
  
POST /api/appointments
  → Créer nouveau RDV
  
PUT /api/appointments/:id
  → Modifier RDV
  
DELETE /api/appointments/:id
  → Supprimer RDV
```

### Reminders
```
POST /api/reminders/weekly
  → Déclencher relance hebdo
  
GET /api/reminders/inactive-clients
  → Liste clients inactifs >60j
```

### Reports
```
GET /api/reports/dda/pdf
  → Générer PDF DDA
  
GET /api/reports/rgpd/pdf
  → Générer PDF RGPD
  
GET /api/reports/acpr/pdf
  → Générer PDF ACPR
```

---

## Cron Jobs Requis

1. **Chaque jour à 18h**: Vérifier RDV demain → Envoyer brief
2. **Chaque lundi 9h**: Récupérer clients inactifs → Envoyer relance
3. **Chaque semaine**: Nettoyer anciens records

---

## Priorité d'Implémentation

1. **URGENT**: Calendrier + Reminders (Étapes 3, 4, 5)
2. **IMPORTANT**: Rapports PDF (Étape 6)
3. **COURT TERME**: Responsive mobile (Étape 7)
4. **LONG TERME**: Page pricing (Étape 8)

---

## Checklist Déploiement

- [ ] Tous les endpoints API testés
- [ ] Telegram bot configuré
- [ ] Variables env configurées
- [ ] DB migrations exécutées
- [ ] Cron jobs en place
- [ ] SSL/HTTPS activé
- [ ] Tests de performance
- [ ] Monitoring en place
