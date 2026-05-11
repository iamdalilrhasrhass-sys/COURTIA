# Source de Vérité — Dépôt COURTIA

> **Date :** 11 Mai 2026  
> **Auteur :** ARK (CTO)  
> **Version :** 2.0 — Audit complet pré-refonte IA native

---

## 1. Dépôt Maître

| Champ | Valeur |
|-------|--------|
| **Chemin** | `/root/courtia` |
| **Branche active** | `main` |
| **Remote** | `origin → github.com/iamdalilrhasrhass-sys/COURTIA.git` |
| **Frontend URL** | `https://app.courtiark.fr` (Vercel) |
| **Backend URL** | `https://api.courtiark.fr/api` (Render) |
| **Dernier commit** | `c5fdb8c` - fix(backend): prevent startup crash on Render |

---

## 2. Copies Détectées (à ignorer)

| Chemin | Notes |
|--------|-------|
| `/root/courtia_new` | vercel.json pointe IP VPS (pas api.courtiark.fr) |
| `/root/courtia-repo` | Duplicat obsolète |
| `/root/courtia2` | Duplicat |
| `/root/courtia_fresh` | Duplicat |
| `/root/courtia_deploy_final_closure` | Duplicat |
| `/root/courtia-landing` | Landing only (3D) |

**⚠️ RÈGLE ABSOLUE : Travailler UNIQUEMENT dans `/root/courtia`**

---

## 3. État du Working Directory

### Fichiers non commités

| Métrique | Valeur |
|----------|--------|
| **Total fichiers modifiés** | 114 |
| **Backend modifiés** | ~35 |
| **Frontend modifiés** | ~50 |
| **Docs modifiés** | ~20 |
| **Extension Chrome** | ~5 |

### Risques identifiés

1. **114 fichiers non commités** — risque de perte si problème disque
2. **Branches locales multiples** — 11 branches locales (backup-30-avril-2026, chantier/finalisation-courtia, etc.)
3. **Pas de CI/CD robuste** — déploiement manuel Vercel/Render

---

## 4. Architecture Technique

### Stack

| Composant | Technologie | Version |
|-----------|-------------|---------|
| **Frontend** | React + Vite | 18.2 / 5.0 |
| **Styling** | TailwindCSS | 3.3.0 |
| **State** | Zustand | 4.5.7 |
| **Animation** | Framer Motion | 11.18.2 |
| **3D** | Three.js | 0.184.0 |
| **Backend** | Express.js | 4.18.0 |
| **Database** | PostgreSQL | via pg 8.20.0 |
| **IA** | Anthropic SDK | 0.80.0 |
| **Billing** | Stripe | 22.0.2 |
| **Email** | Nodemailer | 8.0.6 |
| **Auth** | JWT + bcrypt | - |

### Arborescence

```
/root/courtia/
├── frontend/           # React + Vite (212 fichiers JSX)
│   ├── src/
│   │   ├── pages/      # 72 pages
│   │   ├── components/ # 11,735 lignes total
│   │   ├── stores/     # 7 stores Zustand
│   │   └── lib/        # Utilitaires + ark/
│   └── dist/           # Build production
├── backend/            # Express (185 fichiers JS)
│   ├── src/
│   │   ├── routes/     # 47 routes
│   │   └── services/   # 97 services
│   └── migrations/     # SQL migrations
├── database/           # Schema PostgreSQL
├── docs/               # Documentation (60+ fichiers)
├── courtia-extension/  # Extension Chrome
├── hermes-agents/      # Agents autonomes (WIP)
├── growth/             # Acquisition leads
└── marketing/          # Vidéos + pitch
```

---

## 5. Composants ARK Existants

### Frontend (15 fichiers)

| Fichier | Description | État |
|---------|-------------|------|
| `ARKChatTab.jsx` | Chat IA dans onglet | ✅ Fonctionnel |
| `ARKDemo.jsx` | Démo ARK landing | ✅ |
| `ARKOrb.jsx` | Orbe animé | ✅ |
| `ArkDrawer.jsx` | Drawer latéral ARK | ✅ |
| `ArkInsightPanel.jsx` | Panel insights | ✅ |
| `ArkOrbSection.jsx` | Section orbe | ✅ |
| `ArkAuroraOrb.jsx` | Orbe landing | ✅ |

### Backend (4 services)

| Service | Description | État |
|---------|-------------|------|
| `arkAdvanced.js` | Génération réponses Claude Opus | ✅ |
| `arkProactiveService.js` | Alertes proactives + scoring churn | ✅ |
| `claudeService.js` | Client Claude générique | ✅ |
| `aiCostManager.js` | Suivi coûts API | ✅ |

### Route API ARK

- `POST /api/ark/chat` — Chat avec contexte client
- `GET /api/ark/proactive/:clientId` — Alertes proactives

---

## 6. Modules Présents vs Vision IA Native

### ✅ Présent et Fonctionnel

| Module | Routes | État |
|--------|--------|------|
| Dashboard | `/dashboard` | ✅ |
| Clients | `/clients`, `/client/:id` | ✅ |
| Contrats | `/contrats` | ✅ |
| Tâches | `/taches` | ✅ |
| Documents | `/documents` | ✅ |
| Commissions | `/commissions` | ✅ |
| Billing/Stripe | `/billing`, `/abonnement` | ✅ |
| Admin | `/admin/*` (7 pages) | ✅ |
| Analytics | `/analytics` | ✅ |
| Academy | `/academy` | ✅ |
| Reach (Outreach) | `/reach/*` (7 pages) | ✅ |
| Auth + JWT | `/login`, `/register` | ✅ |
| Pages légales | `/legal/*` (7 pages) | ✅ |

### ⚠️ Présent mais Incomplet

| Module | Problème |
|--------|----------|
| ARK Chat | Existe à `/capitia` (nom obscur), pas intégré partout |
| Morning Brief | Existe mais pas IA-driven |
| Browser Pilot | `/browser-pilot` mais service WIP |
| Partners | Dans Sidebar mais 404 (pas de route) |

### ❌ Absent (Vision IA Native)

| Module | Impact |
|--------|--------|
| `/devis` (Quotes) | **CRITIQUE** — Fonctionnalité clé courtage |
| `/relances` | Pas de vue unifiée relances |
| `/opportunites` | Pas de pipeline commercial |
| `/prospection` | Pas de module |
| `/assistant-ark` | ARK caché sous `/capitia` |
| ARK Bubble flottante | Pas de bulle IA omniprésente |
| ARK contextuel dans chaque page | Chaque page devrait avoir ARK |
| Onboarding guidé par ARK | Onboarding basique |

---

## 7. Dette Technique Identifiée

### Priorité HAUTE

| Problème | Impact | LOT |
|----------|--------|-----|
| 114 fichiers non commités | Perte données | LOT 1 |
| ARK non intégré aux pages | UX pauvre | LOT 3-4 |
| Route `/partners` 404 | Bug visible | LOT 2 |
| `/devis` inexistant | Feature critique manquante | LOT 5 |
| Styling non harmonisé (Tailwind + inline) | Maintenance | LOT 2 |

### Priorité MOYENNE

| Problème | Impact | LOT |
|----------|--------|-----|
| 157 tests (fragmentation) | Coverage non mesuré | LOT 15 |
| Pas de CI/CD | Déploiement risqué | LOT 16 |
| 11 branches locales | Confusion | LOT 1 |
| hermes-agents incomplet | Feature WIP | LOT 17 |

### Priorité BASSE

| Problème | Impact | LOT |
|----------|--------|-----|
| Extension Chrome WIP | Feature non critique | LOT 17 |
| Vidéos marketing absentes | Growth | LOT 17 |

---

## 8. Variables d'Environnement Requises

### Backend (.env)

```
DATABASE_URL          # PostgreSQL
JWT_SECRET            # Auth
ENCRYPTION_KEY        # Tokens intégrations
ANTHROPIC_API_KEY     # ARK
STRIPE_SECRET_KEY     # Billing
STRIPE_WEBHOOK_SECRET
RESEND_API_KEY        # Emails
GOOGLE_CLIENT_ID      # OAuth
GOOGLE_CLIENT_SECRET
TELEGRAM_BOT_TOKEN    # Notifs
```

### Frontend (.env)

```
VITE_API_URL          # https://api.courtiark.fr/api
VITE_PUBLIC_STRIPE_KEY
VITE_ENABLE_GROWTH_LEADS
VITE_BILLING_TEST_MODE
```

---

## 9. Règles de Travail

### Avant chaque LOT

```bash
cd /root/courtia
pwd  # DOIT afficher /root/courtia
git status  # Vérifier branche main
```

### Interdit

- ❌ Modifier `/root/courtia_new` ou autres copies
- ❌ `git add .` sans review
- ❌ `npm run build` sans tests
- ❌ Deploy sans smoke test

### Obligatoire

- ✅ Travailler dans `/root/courtia` uniquement
- ✅ Commits atomiques par lot
- ✅ Documentation dans `/docs/`
- ✅ Tests avant merge

---

## 10. Résumé Exécutif

| Métrique | Valeur |
|----------|--------|
| **Fichiers frontend** | 212 JSX |
| **Fichiers backend** | 185 JS |
| **Routes backend** | 47 |
| **Pages frontend** | 72 |
| **Composants ARK** | 15 fichiers |
| **Services backend** | 97 |
| **Tests existants** | 157 |
| **Fichiers non commités** | 114 |
| **Branches locales** | 11 |
| **État global** | 70% fonctionnel, 30% WIP/broken |

**Verdict : Base solide mais ARK doit devenir omniprésent pour atteindre la vision IA native.**

---
---

# PLAN D'EXÉCUTION COURTIA — IA Native ARK

> **17 Lots planifiés | 85-120h estimées | ~$50-80 API Anthropic**

---

## Vue d'Ensemble

| Phase | Lots | Durée | Priorité |
|-------|------|-------|----------|
| **Fondations** | LOT 1-4 | 20-25h | CRITIQUE |
| **Core Features** | LOT 5-8 | 30-40h | HAUTE |
| **Intégrations** | LOT 9-12 | 25-35h | MOYENNE |
| **Excellence** | LOT 13-17 | 35-45h | BASSE |

---

## LOT 1 — Stabilisation Git + Commit Initial

| Champ | Valeur |
|-------|--------|
| **Objectif** | Sécuriser les 114 fichiers non commités |
| **Fichiers** | Tous les fichiers modifiés (114) |
| **Durée** | 2-3h |
| **Dépendances** | Aucune |
| **Risques** | Merge conflicts, fichiers sensibles (.env) |
| **Livrables** | Tag v1.1.0-stable, 0 fichiers non commités |

---

## LOT 2 — Fix Bugs Bloquants + Routes Manquantes

| Champ | Valeur |
|-------|--------|
| **Objectif** | Corriger les 404 et incohérences UI |
| **Fichiers** | App.jsx, Sidebar.jsx, Partners.jsx, Devis.jsx |
| **Durée** | 3-4h |
| **Dépendances** | LOT 1 |
| **Risques** | Breaking changes dans le routeur |
| **Livrables** | Route /partners, stub /devis, 0 liens 404 |

---

## LOT 3 — ARK Bubble Flottante (Composant Global)

| Champ | Valeur |
|-------|--------|
| **Objectif** | Bulle ARK omniprésente sur toutes les pages |
| **Fichiers** | ArkBubble.jsx, ArkBubbleProvider.jsx, arkStore.js |
| **Durée** | 6-8h |
| **Dépendances** | LOT 2 |
| **Risques** | Performance animations, conflit z-index |
| **Livrables** | Bulle visible partout, drawer expandable |

---

## LOT 4 — ARK Contextuel par Page

| Champ | Valeur |
|-------|--------|
| **Objectif** | ARK comprend le contexte et propose actions pertinentes |
| **Fichiers** | contextExtractor.js, Dashboard.jsx, ClientDetail.jsx, Contrats.jsx, arkContextService.js |
| **Durée** | 8-10h |
| **Dépendances** | LOT 3 |
| **Risques** | Tokens API (contexte = plus de tokens), latence |
| **Livrables** | ARK contextuel sur Dashboard, ClientDetail, Contrats |

---

## LOT 5 — Module Devis Complet

| Champ | Valeur |
|-------|--------|
| **Objectif** | Créer le module devis avec génération IA |
| **Fichiers** | Devis.jsx, DevisNew.jsx, DevisDetail.jsx, quotes.js, quoteService.js, migrations/quotes.sql |
| **Durée** | 12-15h |
| **Dépendances** | LOT 4 |
| **Risques** | Complexité formulaires dynamiques, PDF generation |
| **Livrables** | Route /devis fonctionnelle, CRUD complet, ARK peut créer un devis |

---

## LOT 6 — Morning Brief IA-Driven

| Champ | Valeur |
|-------|--------|
| **Objectif** | Briefing quotidien généré par ARK |
| **Fichiers** | MorningBrief.jsx (refonte), morningBriefService.js |
| **Durée** | 6-8h |
| **Dépendances** | LOT 4 |
| **Risques** | Coût API si généré à chaque visite |
| **Livrables** | Briefing personnalisé, actions cliquables |

---

## LOT 7 — Module Relances Unifiées

| Champ | Valeur |
|-------|--------|
| **Objectif** | Vue consolidée de toutes les relances à faire |
| **Fichiers** | Relances.jsx, relanceStore.js, relances.js, relanceService.js |
| **Durée** | 8-10h |
| **Dépendances** | LOT 6 |
| **Risques** | Logique de priorité complexe |
| **Livrables** | Route /relances, liste triée par urgence, ARK suggère formulation |

---

## LOT 8 — Pipeline Opportunités

| Champ | Valeur |
|-------|--------|
| **Objectif** | Vue Kanban des opportunités commerciales |
| **Fichiers** | Opportunites.jsx, KanbanBoard.jsx, opportunities.js, migrations/opportunities.sql |
| **Durée** | 10-12h |
| **Dépendances** | LOT 7 |
| **Risques** | UX mobile Kanban |
| **Livrables** | Route /opportunites, drag-and-drop, stats conversion |

---

## LOT 9 — Intégrations Calendrier/Email

| Champ | Valeur |
|-------|--------|
| **Objectif** | Connecter Google Calendar, Gmail, Outlook |
| **Fichiers** | googleIntegrationService.js, outlookIntegrationService.js, Parametres.jsx |
| **Durée** | 10-12h |
| **Dépendances** | LOT 4 |
| **Risques** | OAuth scopes restrictifs, refresh tokens |
| **Livrables** | Google + Outlook connectés, RDV synchronisés |

---

## LOT 10 — WhatsApp + Telegram

| Champ | Valeur |
|-------|--------|
| **Objectif** | Messagerie multi-canal depuis COURTIA |
| **Fichiers** | whatsappBusinessService.js, telegramService.js, Messaging.jsx |
| **Durée** | 8-10h |
| **Dépendances** | LOT 7 |
| **Risques** | WhatsApp Business approval (24-48h) |
| **Livrables** | Envoi WhatsApp depuis fiche client, notifications Telegram |

---

## LOT 11 — OCR Documents + Extraction

| Champ | Valeur |
|-------|--------|
| **Objectif** | Extraction automatique données des documents |
| **Fichiers** | ocrService.js, documentExtractionService.js, Documents.jsx |
| **Durée** | 8-10h |
| **Dépendances** | LOT 5 |
| **Risques** | Qualité OCR sur scans |
| **Livrables** | OCR sur upload, extraction structurée, pré-remplissage |

---

## LOT 12 — E-Signature Yousign

| Champ | Valeur |
|-------|--------|
| **Objectif** | Signature électronique des documents |
| **Fichiers** | yousignService.js, esignature.js, SignatureModal.jsx |
| **Durée** | 6-8h |
| **Dépendances** | LOT 11 |
| **Risques** | Coût Yousign par signature |
| **Livrables** | Envoi signature, suivi statut temps réel |

---

## LOT 13 — Analytics Avancés

| Champ | Valeur |
|-------|--------|
| **Objectif** | Tableaux de bord exécutifs avec IA |
| **Fichiers** | AnalyticsExecutive.jsx, advancedAnalyticsService.js |
| **Durée** | 8-10h |
| **Dépendances** | LOT 8 |
| **Risques** | Performance requêtes agrégées |
| **Livrables** | Dashboard analytics, prédictions churn, export PDF |

---

## LOT 14 — Onboarding Guidé par ARK

| Champ | Valeur |
|-------|--------|
| **Objectif** | Parcours d'onboarding interactif |
| **Fichiers** | OnboardingWizard.jsx, ArkOnboardingGuide.jsx, onboardingService.js |
| **Durée** | 8-10h |
| **Dépendances** | LOT 9 |
| **Risques** | Abandon si trop long |
| **Livrables** | Onboarding 5 étapes max, ARK accompagne |

---

## LOT 15 — Tests + Coverage

| Champ | Valeur |
|-------|--------|
| **Objectif** | Atteindre 70% coverage |
| **Fichiers** | *.test.js, *.test.jsx, package.json |
| **Durée** | 10-12h |
| **Dépendances** | LOT 1-14 |
| **Risques** | Tests flaky |
| **Livrables** | Coverage backend >70%, frontend >50% |

---

## LOT 16 — CI/CD + Monitoring

| Champ | Valeur |
|-------|--------|
| **Objectif** | Pipeline déploiement automatisé |
| **Fichiers** | .github/workflows/*.yml, vercel.json |
| **Durée** | 6-8h |
| **Dépendances** | LOT 15 |
| **Risques** | Secrets GitHub |
| **Livrables** | CI sur chaque PR, deploy auto prod, alertes Sentry |

---

## LOT 17 — Polish + Extras

| Champ | Valeur |
|-------|--------|
| **Objectif** | Extension Chrome, vidéos marketing |
| **Fichiers** | courtia-extension/, marketing/videos/, hermes-agents/ |
| **Durée** | 10-15h |
| **Dépendances** | LOT 16 |
| **Risques** | Extension Chrome review lent |
| **Livrables** | Extension publiée, 1 vidéo marketing |

---

## Prochain LOT à Attaquer

**→ LOT 1 : Stabilisation Git**

Raison : 114 fichiers non commités = risque de perte. Aucune feature ne peut être développée sereinement sans base stable.

```bash
cd /root/courtia
git status
git diff --stat | head -50
```
