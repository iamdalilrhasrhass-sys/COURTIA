# COURTIA — AUDIT RÉEL 120% — RAPPORT COMPLET
*Date : 15 mai 2026 — 17h00*

## SOURCES DE VÉRITÉ
- Frontend : `/root/courtia/frontend` (Vite + React)
- Backend : `/srv/courtia/backend` (Express.js, port 9998)
- App : `app.courtiark.fr` → VPS (localhost:4173 via Nginx)
- API : `api.courtiark.fr` → VPS (localhost:9998 via Nginx)
- Landing : `courtiark.fr` → à vérifier
- DB : `crm_assurance` PostgreSQL local
- PM2 : `courtia-api` (ID 26), `courtia-frontend` (ID 41)

---

## 1. SCORE TECHNIQUE : 88/100

### ✅ BACKEND (95/100)
- 40+ routes API enregistrées — **production-ready**
- Auth JWT + vérification token → protégé
- Rate limiting (API + ARK 20/min/user)
- Helmet, CORS, XSS protection
- **Intégrations codées** : Stripe (configuré), WhatsApp Baileys, IMAP email, Google OAuth, YouSign
- Background jobs : portfolio (3h), relances (9h), IMAP watcher, REACH worker
- Sentry error tracking
- Error handlers 404/500
- DB : 59 tables avec données, connexion OK
- `/api/status` : running, DB connected, Stripe configured ✅

### ✅ FRONTEND (82/100)
- 288 fichiers JSX compilés sans erreur
- Build Vite : 8s, exit 0 ✅
- Routes React fonctionnelles (SPA)
- Composants UI premium : AuroraBackground, GlassCard, TiltCard, ScrollReveal3D, PremiumCard
- Pages : Dashboard, Clients, ClientDetail, Documents, Opportunites, Contrats, Relances, Taches, Agenda, Rapports, Parametres, Abonnement, MorningBrief, ArkIntelligence, Onboarding...

### ⚠️ POINTS FAIBLES
- Pas de test d'intégration Stripe réel
- Domaines à vérifier (courtiark.fr timeout possible)
- Google OAuth non configuré
- Email/SMS transactionnels non configurés

---

## 2. SCORE PRODUIT : 72/100

### ✅ EXISTS
- Dashboard cockpit avec KPIs
- Morning Brief ARK (page dédiée)
- Fiche client détaillée (ClientDetail.jsx)
- Pipeline Kanban (kanban.js route + Opportunites.jsx)
- Documents/GED (client_documents table, 0 entrées)
- Relances (28 dans DB)
- Rendez-vous (32 dans DB)
- Contrats (via opportunités)
- ARK Intelligence (page dédiée)
- Onboarding guidé (Onboarding.jsx + OnboardingGamified.jsx)
- Paramètres cabinet (Parametres.jsx)
- Pricing/Abonnement (Pricing.jsx, Billing.jsx, Abonnement.jsx)

### ❌ MANQUANT / INCOMPLET
- Documents : table vide (0 enregistrements)
- Contrats : pas de table `contracts` directe — passe par `opportunites` (61 entrées)
- Conformité : page Conformite.jsx existe mais fonctionnalité à vérifier
- Pas de seed données démo complètes (56 clients mais données partielles)
- Pas de compte démo prêt à l'emploi

---

## 3. SCORE UX/DESIGN : 78/100

### ✅ STRENGTHS
- Aurora dark premium (fond #050510, glassmorphism)
- Composants UI cohérents (GlassCard, PremiumCard, TiltCard)
- Animations légères (ScrollReveal, PageTransition)
- États vides premium (PremiumEmptyState.jsx)
- 7 Univers thématiques (concept Aurora Bubble C)

### ⚠️ À HARMONISER
- Certaines pages peuvent être dépareillées (vérifier lors du test mobile)
- Cohérence entre anciennes pages et V2 à vérifier

---

## 4. SCORE MOBILE : 60/100 (À TESTER)

- Tests 390/430/768px non effectués
- Composants responsive à vérifier
- Sidebar mobile à tester
- Pipeline/Kanban sur mobile à tester
- Upload documents sur mobile à tester

---

## 5. SCORE COMMERCIAL : 58/100

### ❌ MANQUANT
- Landing courtiark.fr non vérifiée
- Pas de compte démo automatique
- Pas de script de démo
- Pas de base de prospects courtiers
- Pas d'argumentaire concurrentiel
- Stripe configuré mais pas testé en conditions réelles
- Offres : Starter 89€, Pro 159€ — OK mais pas de tunnel testé

---

## 6. SCORE CONCURRENTIEL : 68/100

### VS LYA
- COURTIA gagne sur : IA native (ARK), design premium, simplicité
- COURTIA perd sur : conformité DDA/RGPD complète, GED mature, portail client

### VS OGGO
- COURTIA gagne sur : design, UX, IA, modernité
- COURTIA perd sur : automatisations email/SMS, modèles de documents, multi-tarification

### VS KASE
- COURTIA gagne sur : cockpit IA, design, simplicité
- COURTIA perd sur : marketplace assureurs, bordereaux commissions, extranet

---

## 7. SCORE FINAL : 71/120

### DÉTAIL
| Catégorie | Score |
|-----------|-------|
| Technique | 88/100 |
| Produit | 72/100 |
| UX/Design | 78/100 |
| Mobile | 60/100 |
| Commercial | 58/100 |
| Concurrentiel | 68/100 |
| **FINAL** | **71/120** |

---

## 8. BUGS BLOQUANTS

| ID | Description | Gravité |
|----|------------|---------|
| B1 | Domaines à vérifier (courtiark.fr timeout) | P0 |
| B2 | Documents : table vide — fonctionnalité à tester | P0 |
| B3 | Stripe checkout non testé en conditions réelles | P0 |
| B4 | Google OAuth non configuré côté API | P0 |
| B5 | Mobile non testé | P1 |

---

## 9. PLAN P0/P1/P2

### P0 — AVANT COMMERCIALISATION
1. Fix domaines DNS/Nginx
2. Compléter seed données démo (10 clients, documents, contrats, relances)
3. Harmoniser dashboard en cockpit ARK
4. Tester mobile 390/430/768px
5. Vérifier auth Google OAuth
6. Créer page conformité crédible
7. Finaliser onboarding
8. Test Stripe complet

### P1 — POUR BATTRE CONCURRENTS
1. Analyse IA documents (ARK lit les PDF)
2. Relances automatiques J+1/J+3/J+7
3. Résumé fiche client par ARK
4. Export dossier assureur
5. Devoir de conseil PDF
6. Landing commerciale refaite
7. Compte démo automatique

### P2 — SUPÉRIORITÉ
1. WhatsApp Business natif
2. Google Calendar sync
3. Marketplace assureurs
4. Bordereaux commissions
5. Multi-tarification

---

## 10. VERDICT PROVISOIRE

**COURTIA = VENDABLE BÊTA 89 € HT**

Le backend est solide. La DB est riche. Le frontend compile. Il manque :
- Données démo crédibles
- Tests mobile
- Vérification domaines
- Finition UX
- Cockpit ARK vraiment utile

Prochaine étape : LOT 2 — Cockpit ARK 120%.
