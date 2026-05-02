# COURTIA — Rapport QA

## QA Déploiement final test mode (2 mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Push main | ✅ OK | `git push origin HEAD:main` | `fcf70c3` en production git |
| Frontend Vercel | ✅ OK | `curl -I https://courtia.vercel.app` | HTTP/2 200 |
| Routes Vercel critiques | ✅ OK | `curl -I / /login /register?plan=pro /onboarding /billing /import` | HTTP 200 |
| Backend VPS PM2 | ✅ OK | `pm2 restart courtia-api --update-env` | process `online` |
| API health local VPS | ✅ OK | `curl -i http://127.0.0.1:9998/api/health` | HTTP 200 |
| API health public | ✅ OK | `curl -i https://api.courtiark.fr/api/health` | HTTP 200 |
| Migrations billing/import | ✅ OK | `psql -f 20260502_billing_legal_foundation.sql` + `20260502_import_jobs.sql` | tables présentes |
| Billing plans | ✅ OK | `GET /api/billing/plans` | 200 |
| Billing onboarding | ✅ OK | `POST /api/billing/onboarding` | 200 |
| Legal acceptance | ✅ OK | `POST /api/billing/legal-acceptance` | 200 (`acceptance_id`) |
| Checkout starter/pro | ⚠️ Bloqué proprement | `POST /api/billing/create-checkout-session` | `billing_test_mode_not_configured` |
| Premium | ✅ OK | `POST /api/billing/create-checkout-session` | 409 `premium_contact_required` |
| Customer portal | ⚠️ Bloqué proprement | `POST /api/billing/create-portal-session` | `billing_test_mode_not_configured` |
| Webhook sans signature | ⚠️ Stripe non configuré | `POST /api/stripe/webhook` | 200 `stripe_not_configured` |
| Webhook signé | ❌ Non testé | n/a | secret test non configuré |
| Idempotence webhook | ❌ Non prouvée | n/a | pas d’event signé traité |
| Import preview + commit | ✅ OK | `/api/imports/preview` + `/api/imports/commit` | succès runtime confirmé |
| Import history | ✅ OK | `/api/imports/history` | historique présent |
| Admin billing anon/broker | ✅ OK | `/api/admin/super/billing` | 401 / 403 propres |
| Build frontend | ✅ OK | `npm run build` | succès |
| Tests frontend | ✅ OK | `npm run test` | 33/33 |
| Syntax backend | ✅ OK | `node -c` routes/services billing+import | succès |
| QA Python | ✅ OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1 |
| Secret audit | ✅ P0=0 | `python3 scripts/courtia_secret_audit.py` | P1 legacy restants |

### Décision (run final test mode)
- Déploiement app/api: **OK**
- Stripe test mode complet signé: **NON** (variables `_TEST` absentes + webhooks signés non prouvés)
- Import portefeuille V1 CSV: **OUI** (preview + commit validés)

## QA Finalisation Stripe / Branding / Import V1 (2 mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Build vert |
| Tests frontend | ✅ OK | `npm run test` | 33/33 |
| Syntax backend billing/stripe/import | ✅ OK | `node -c` ciblé | routes/services OK |
| QA Python | ✅ OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1, 37 P2 |
| Secret audit | ✅ P0=0 | `python3 scripts/courtia_secret_audit.py` | P1 legacy docs toujours présents |
| API prod health | ✅ OK | `curl -i https://api.courtiark.fr/api/health` | HTTP 200 |
| Front prod health | ✅ OK | `curl -I https://courtia.vercel.app` | HTTP/2 200 |
| Billing plans | ✅ OK | `GET /api/billing/plans` | 200 + starter/pro/premium |
| Billing status anon | ✅ OK | `GET /api/billing/status` | 401 propre |
| Billing status auth | ✅ OK | `GET /api/billing/status` | 200 |
| Onboarding billing | ✅ OK | `POST /api/billing/onboarding` | 200 |
| Legal acceptance (`accepted_*`) | ⚠️ KO deploy actuel | `POST /api/billing/legal-acceptance` | 400 sur backend prod actuel (patch compatibilité ajouté dans repo) |
| Checkout Starter | ⚠️ Partiel | `POST /api/billing/create-checkout-session` | bloqué sans acceptance id dans test actuel |
| Checkout Pro | ✅ OK (deploy actuel) | `POST /api/billing/create-checkout-session` | 200 + checkout URL |
| Premium sur devis | ✅ OK | `POST /api/billing/create-checkout-session` | 409 `premium_contact_required` |
| Customer Portal | ✅ OK | `POST /api/billing/create-portal-session` | 200 + URL |
| Webhook sans signature | ✅ OK | `POST /api/stripe/webhook` | 400 `missing_signature` |
| Admin billing anon/broker | ✅ OK | `/api/admin/super/billing` | 401 / 403 propres |
| Variables `_TEST` VPS | ⚠️ manquantes | vérif backend VPS | `_TEST` absentes, fallback historique utilisait clé live |
| Guard test-only (repo) | ✅ ajouté | `stripeService` / `planService` | test mode n’accepte plus fallback live |

### Décision
- Tunnel Stripe test: **partiel opérationnel** sur backend déployé actuel.
- Le repo est durci pour forcer un vrai test mode (`*_TEST`) après prochain déploiement backend.
- Action impérative avant validation “Stripe test complet”: renseigner les variables `_TEST` sur VPS + redeploy backend + rejouer QA checkout/webhooks signés.

## QA Pré-live légal / TVA / branding (2 mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | 1878 modules, build vert |
| Tests frontend | ✅ OK | `npm run test` | 33/33 |
| Syntax backend billing | ✅ OK | `node -c server.js` + routes/services billing | Aucun défaut syntaxe |
| API prod health | ✅ OK | `curl -i https://api.courtiark.fr/api/health` | HTTP 200 |
| Front prod health | ✅ OK | `curl -I https://courtia.vercel.app` | HTTP/2 200 |
| QA Python | ✅ OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1, 36 P2 |
| Secret audit | ⚠️ P1 legacy docs | `python3 scripts/courtia_secret_audit.py` | P0=0, P1=52, P2=3 |
| Wording fiscal visible | ✅ OK | Revue landing/auth/billing | HT + TTC + mention TVA en vigueur |
| Mention R’ASSUREZ VOUS en légal | ✅ Absente | `rg` docs/legal-drafts | Non détectée dans CGV/mentions COURTIA |
| Mention `TVA non applicable art. 293 B` active | ✅ Supprimée | `rg` docs/frontend | Non détectée dans wording actif |

### Décision
- Version pré-live cohérente livrée (juridique/fiscal/branding).
- Validation juriste + comptable reste obligatoire avant publication contractuelle finale et avant Stripe live.

## QA Stripe Test Mode + Légal (2 mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | 1877 modules, build vert |
| Tests frontend | ✅ OK | `npm run test` | 33/33 |
| Syntax backend billing | ✅ OK | `node -c` (billing/stripe/services/email/admin) | Aucun défaut syntaxe |
| API prod health | ✅ OK | `curl -i https://api.courtiark.fr/api/health` | HTTP 200 |
| Front prod health | ✅ OK | `curl -I https://courtia.vercel.app` | HTTP/2 200 |
| QA Python | ✅ OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1, 36 P2 |
| Secret audit | ⚠️ Action requise | `python3 scripts/courtia_secret_audit.py` | P0 levé, P1 legacy docs encore présents |
| Billing plans API public | ✅ OK | `GET /api/billing/plans` | HTTP 200 après redeploy VPS |
| Billing onboarding/consent | ✅ OK | `POST /api/billing/onboarding`, `POST /api/billing/legal-acceptance` | HTTP 200 en auth demo |
| Billing checkout Pro | ✅ OK | `POST /api/billing/create-checkout-session` | HTTP 200 + URL checkout |
| Billing checkout Premium | ✅ OK | `POST /api/billing/create-checkout-session` | HTTP 409 `premium_contact_required` |
| Billing portal | ✅ OK | `POST /api/billing/create-portal-session` | HTTP 200 + URL portal |
| Stripe webhook sans signature | ✅ OK | `POST /api/stripe/webhook` | HTTP 400 `missing_signature` |
| Admin billing non autorisé | ✅ OK | `/api/admin/super/billing` | 401 sans auth, 403 broker |
| Stripe E2E test mode | ⚠️ Partiel | Revue code + endpoints implémentés | Nécessite variables Stripe test + webhook dashboard pour validation complète |

### Détails Stripe test mode
- Endpoints implémentés:
  - `GET /api/billing/plans`
  - `POST /api/billing/onboarding`
  - `POST /api/billing/legal-acceptance`
  - `POST /api/billing/create-checkout-session`
  - `GET /api/billing/status`
  - `POST /api/billing/create-portal-session`
  - `POST /api/billing/cancel-trial`
  - `POST /api/billing/webhook`
- Idempotence webhook basée sur `payment_events.event_id` (unique).
- En cas d’env manquante Stripe: erreurs propres `billing_test_mode_not_configured`.

### Décision
- Socle Stripe test mode prêt côté code.
- Validation juridique/comptable encore obligatoire avant live.

## QA Mission Finale 500% (2 mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Code-splitting actif, build vert |
| Tests frontend | ✅ OK | `npm run test` | 33/33 |
| QA Python | ✅ OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1, 37 P2 |
| API health prod | ✅ OK | `curl -i https://api.courtiark.fr/api/health` | HTTP 200 |
| Frontend prod | ✅ OK | `curl -I https://courtia.vercel.app` | HTTP/2 200 |
| Login demo | ✅ OK | `POST /api/auth/login` | HTTP 200 |
| Mauvais mot de passe | ✅ OK | `POST /api/auth/login` | HTTP 401 |
| Auth me | ✅ OK | `GET /api/auth/me` | HTTP 200 |
| Dashboard stats | ✅ OK | `GET /api/dashboard/stats` | HTTP 200 |
| Clients/Contrats/Tâches | ✅ OK | `GET /api/clients|contrats|taches` | HTTP 200 |
| Portfolio endpoints | ✅ OK | `GET /api/portfolio/morning-brief|health-score` | HTTP 200 |
| Admin broker | ✅ OK | `GET /api/admin/super/analytics` | HTTP 403 |

### Décision
- Socle technique stable pour démo commerciale.
- P0/P1 bloquant non détecté sur la chaîne officielle Vercel + VPS.
- Stripe test mode et validation juridique restent la prochaine phase.

## QA Clôture Render (2 mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Backend prod officiel | ✅ OK | `curl -i https://api.courtiark.fr/api/health` | HTTP 200 |
| Frontend prod officiel | ✅ OK | `curl -I https://courtia.vercel.app` | HTTP/2 200 |
| Render DB | ⚠️ Suspendue | Dashboard Render (`courtia-db`) | Plan free expiré, suspension billing (`expiresAt 2026-04-29`) |
| Render auth DB dépendant | ⚠️ KO attendu | `POST https://courtia.onrender.com/api/auth/register` | `getaddrinfo ENOTFOUND` (DB Render non disponible) |
| Dépendance frontend prod à Render | ✅ Non | `rg "onrender.com" frontend` | Aucune référence dans le frontend |

### Décision infra
- Render est classé non-prod / secondaire.
- Le backend officiel de production est `https://api.courtiark.fr` (VPS/PM2).
- Le frontend officiel de production est `https://courtia.vercel.app`.
- Le P0 Render est clôturé par décision d'architecture infra, sans réactivation de la DB Render.

## QA Mission unique — Render + Landing 3D + Architecture billing (2 mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Git état de départ | ✅ OK | `git status --short` | Worktree clean au lancement |
| Commit Render ciblé | ✅ OK | `git show f1ce9d1...` | Diff confirmé sur auth/errorHandler/login |
| Backend syntax (Render scope) | ✅ OK | `node -c server.js`, `authController.js`, `errorHandler.js` | Aucun défaut syntaxe |
| Root start simulation | ✅ Corrigé | `npm start` échouait avant patch racine | Scripts root ajoutés pour compatibilité Render |
| Front build après fix Render | ✅ OK | `npm run build` | Succès |
| Front tests après fix Render | ✅ OK | `npm run test` | 33/33 |
| Landing 3D build | ✅ OK | `npm run build` | Succès |
| Landing 3D tests | ✅ OK | `npm run test` | 33/33 |
| Routes preview locales | ✅ OK | `vite preview` + curl | `/`, `/login`, `/register`, `/register?plan=pro` en 200 |
| Render endpoint observable | ⚠️ Partiel | `https://courtia.onrender.com/api/health` | Health 200, mais logs Render non accessibles via Codex |
| Register Render observable | ⚠️ Partiel | `POST /api/auth/register` | Retour 500 `ENOTFOUND` sur host DB côté instance Render actuelle |

### Décision
- Correctif code/deploy Render appliqué côté repo.
- Validation finale du statut “Deploy Success” Render requiert le log dashboard du service `srv-d7561hsr85hc73a9c6i0` (non exposé à Codex).
- Landing 3D réparée sans régression build/tests.

## QA Functional Readiness — Démo commerciale (2 mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Git local | ✅ OK | `git status --short` | Worktree propre avant patch |
| Build frontend | ✅ OK | `npm run build` | Build Vite en succès |
| Tests frontend | ✅ OK | `npm run test` | 33/33 passés |
| Syntax backend local | ✅ OK | `node -c` ciblé | server + routes/services clés OK |
| PM2 VPS | ✅ OK | `pm2 status` | `courtia-api` online |
| Health local VPS | ✅ OK | `GET /api/health` | HTTP 200 |
| Health public | ✅ OK | `GET https://api.courtiark.fr/api/health` | HTTP 200 |
| Morning brief local | ✅ OK | endpoint tokenisé | HTTP 200 |
| Health score local | ✅ OK | endpoint tokenisé | HTTP 200 |
| Morning brief public | ✅ OK | endpoint tokenisé | HTTP 200 |
| Health score public | ✅ OK | endpoint tokenisé | HTTP 200 |
| Login demo API | ✅ OK | `POST /api/auth/login` | HTTP 200 |
| Mauvais mot de passe | ✅ OK | `POST /api/auth/login` | HTTP 401 propre |
| Register email existant | ✅ OK | `POST /api/auth/register` | HTTP 409 message propre |
| Register nouvel email | ✅ OK | `POST /api/auth/register` | HTTP 201 |
| Auth me | ✅ OK | `GET /api/auth/me` | HTTP 200 |
| Dashboard stats | ✅ OK | `GET /api/dashboard/stats` | HTTP 200 |
| Clients | ✅ OK | `GET /api/clients` | HTTP 200 |
| Contrats | ✅ OK | `GET /api/contrats` | HTTP 200 |
| Tâches | ✅ OK | `GET /api/taches` | HTTP 200 |
| Admin non connecté | ✅ OK | `GET /api/admin/super/analytics` | HTTP 401 propre |
| Admin broker | ✅ OK | endpoint tokenisé | HTTP 403 propre |
| QA audit Python | ✅ OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1, 38 P2 |

### Décision
- P0 fonctionnel : fermé.
- P1 portfolio health-score : fermé (endpoint maintenant `200` au lieu de `503` fallback).
- Plateforme prête pour démo commerciale (avec limites P1/P2 documentées).

## QA P0 — Backend VPS / PM2 redeploy portfolio (2 mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| SSH VPS + PM2 actif | ✅ OK | `ssh -i ~/.ssh/courtia_vps`, `pm2 status` | Process `courtia-api` trouvé sur `/srv/courtia/backend` |
| Alignement code VPS | ✅ OK | `git reset --hard origin/main` sur clone de référence | Commit source `bc09e93` (inclut `1a749f1`) |
| Sync backend runtime | ✅ OK | `rsync` vers `/srv/courtia/backend` | `.env` préservé |
| Dépendances backend | ✅ OK | `npm install --omit=dev` | Installation propre |
| Syntax checks backend | ✅ OK | `node -c` ciblé | server + routes/services portfolio/admin OK |
| PM2 restart | ✅ OK | `pm2 restart courtia-api` | Process online après restart |
| API health local VPS | ✅ OK | `GET /api/health` | HTTP 200 |
| Portfolio morning-brief local | ✅ OK | `GET /api/portfolio/morning-brief` | HTTP 200, réponse fallback propre |
| Portfolio health-score local | ✅ Sans 500 | `GET /api/portfolio/health-score` | HTTP 503 fallback métier propre, pas de fuite SQL |
| API health publique | ✅ OK | `GET https://api.courtiark.fr/api/health` | HTTP 200 |
| Portfolio morning-brief public | ✅ OK | endpoint public + token demo | HTTP 200 |
| Portfolio health-score public | ✅ Sans 500 | endpoint public + token demo | HTTP 503 fallback propre |

### Décision
- P0 demandé résolu : plus d'erreur 500 sur les endpoints portfolio ciblés.
- Reste fonctionnel à suivre (non bloquant P0) : disponibilité du `health-score` en 200 quand une analyse portefeuille est générée.

## QA P0 — Vercel Deployment Failed (2 mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Historique Vercel `ERROR` | ✅ Cause trouvée | `vercel api /v6/deployments?...state=ERROR` | Fail sur commit `7294a43` |
| Log build failed | ✅ Cause exacte | `vercel inspect ... --logs` | Import non résolu `AuroraTransition` depuis `LandingPublic.jsx` |
| Rebuild local strict | ✅ OK | `npm ci && npm run build` | Build frontend reproduit en succès |
| Tests frontend | ✅ OK | `npm run test` | 33 tests passés |
| Déploiement production actuel | ✅ Ready | `dpl_46a3j754h6h6HWzXUJLKFigea93T` | Commit `1a749f1` en production |
| Routes frontend critiques | ✅ OK | `curl -I` | `/`, `/login`, `/register?plan=pro`, `/dashboard` -> 200 |
| API login de contrôle | ✅ OK | `POST /api/auth/login`, `GET /api/auth/me` | 200/200 |

### Décision
- P0 Vercel frontend : résolu.
- Aucun changement code produit nécessaire dans ce batch (diagnostic + preuve).
- P0 restant global hors Vercel : backend VPS/PM2 portefeuille à redéployer.

## QA Hotfix portfolio schema — Pré-commercialisation (2 mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Tour API production | ⚠️ P0 backend VPS | `/api/portfolio/morning-brief`, `/api/portfolio/health-score` | `generated_at` et `health_score` absents du schéma VPS |
| Login demo API | ✅ OK | `POST /api/auth/login` | Status 200, token présent non affiché |
| Auth me API | ✅ OK | `GET /api/auth/me` | Status 200 |
| Dashboard stats API | ✅ OK | `GET /api/dashboard/stats` | Status 200 |
| Clients / contrats / tâches | ✅ OK | API production | Status 200 |
| Admin broker | ✅ OK | `/api/admin/super/analytics` | Status 403 propre |
| Syntax backend | ✅ OK | `node -c` ciblé | server, portfolio, admin, analyzer, util OK |
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 33 tests passés |
| Audit Python | ✅ OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1 |

### Décision
- P0 code corrigé dans le dépôt : oui.
- P0 production supprimé : non, tant que le VPS / PM2 n'est pas redéployé avec ce commit.
- Mitigation frontend : `MorningBrief` affiche un score local estimé si l'API portfolio score est indisponible.

## QA Hotfix portfolio — Morning Brief (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Tour API production | ⚠️ P0 détecté | `/api/portfolio/morning-brief` | `500 column "generated_at" does not exist` |
| Login demo API | ✅ OK | `POST /api/auth/login` | Status 200, token présent non affiché |
| Auth me API | ✅ OK | `GET /api/auth/me` | Status 200 |
| Dashboard stats API | ✅ OK | `GET /api/dashboard/stats` | Status 200 |
| Clients / contrats / tâches | ✅ OK | API production | Status 200 |
| Reach dashboard | ✅ OK | API production | Status 200 |
| Admin broker | ✅ OK | `GET /api/admin/super/analytics` | Status 403 propre |
| Syntax backend | ✅ OK | `node -c` ciblé | server, route, service, util OK |
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 33 tests passés |
| Audit Python | ✅ OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1 |

### Décision
- P0 code identifié et corrigé localement.
- P0 production restant tant que le VPS / PM2 n'est pas redéployé avec le correctif.

---

## QA Landing Aurora — 3 actes continus (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 33 tests passés |
| Audit Python | ✅ OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1, 38 P2 |
| Desktop local | ✅ OK | Chrome headless screenshot | Hero, CTA, Bubble C et scène cockpit visibles |
| Mobile local | ⚠️ Partiel | Chrome headless screenshot | Outil headless ne déclenche pas fidèlement le rendu mobile ; CSS renforcé contre l'overflow |
| Stripe / auth / backend | ✅ Non touché | Revue diff | Aucun checkout, aucune DB, aucune impersonation |

### Décision
- P0 bloquant : non détecté par build/tests/audit.
- À vérifier après push : rendu Vercel réel dans l'in-app browser mobile et desktop.

---

## QA Stabilisation auth/session — Pré-commercialisation (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Test unitaire session policy | ✅ OK | `npm run test -- src/api/sessionPolicy.test.js` | 4 tests passés |
| Tests frontend complets | ✅ OK | `npm run test` | 33 tests passés |
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Syntax backend | ✅ OK | `node -c backend/server.js` | Aucun output, exit 0 |
| Audit Python | ✅ OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1, 38 P2 |
| Stripe / impersonation | ✅ Non touché | Revue diff | Aucun checkout, aucune génération JWT impersonation |

### Décision
- P0 session frontend identifié : corrigé localement.
- P0 commercialisation restant : aucun nouveau P0 détecté par build/tests/audit.
- Point de vigilance : déployer le backend sur VPS/PM2 si le rate limit backend n'est pas auto-déployé depuis `main`.

---

## QA Reprise architecture visuelle — Cockpit Aurora global (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| Shell privé Aurora | ✅ OK | Revue code | Aurore fixe + Bubble C canonique en filigrane |
| `/dashboard` non connecté | ✅ OK | In-app browser local | Redirection propre vers `/login?next=%2Fdashboard` |
| Landing locale | ✅ OK | In-app browser local | Hero et CTA détectés |
| Auth/backend/Stripe | ✅ OK | Revue diff | Aucun changement |

### Décision
- P0 bloquant : non.
- Prochaine étape recommandée : harmoniser les pages métier encore trop claires (`Clients`, `Contrats`, `Tâches`, `Rapports`, `Paramètres`) avec le shell Aurora.

---

## QA Reprise pages métier — Harmonisation Aurora cockpit (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| Pages métier | ✅ OK | Revue diff | Clients, Contrats, Tâches, Rapports, Paramètres alignés sur le shell |
| Auth/backend/Stripe | ✅ OK | Revue diff | Aucun changement |

### Décision
- P0 bloquant : non.
- Prochaine étape recommandée : QA production après déploiement Vercel, puis optimisation P2 du bundle.

---

## QA Reprise critique — Landing cinematic Aurora (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| Audit Python | ✅ OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1 |
| Ancien logo `>C<` | ✅ OK | `rg` ciblé | Aucun ancien logo texte dans la landing/mockups cibles |
| Liens cassés landing | ✅ OK | `rg` ciblé | Pas de `/contact`, pas de `/app/` dans la landing |
| Local `/` DOM | ✅ OK | In-app browser | Hero, CTA Pro, pricing et `0 €` détectés |
| Screenshot local | ⚠️ Partiel | In-app browser | Timeout CDP sur capture ; DOM, build et tests OK |
| Scène Aurora continue | ✅ OK | Revue code + build | Ciel Aurora fixe et Bubble C canonique en filigrane permanent |
| Logo performance | ✅ OK | Revue code | Animations internes désactivées quand `animated=false` |

### Décision
- P0 bloquant : non.
- Recommandation : pousser ce batch, puis valider Vercel production `/` après déploiement.

---

## QA Phase D — Cockpit interne (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| Browser local cockpit | ⚠️ Partiel | In-app browser | Login local bloqué par proxy Vite dev, pas par production |
| `/dashboard` production | ✅ OK | Browser in-app Vercel | Command Center visible, console 0 erreur |
| `/clients` production | ✅ OK | Browser in-app Vercel | Header Portefeuille clients visible, console 0 erreur |
| `/contrats` production | ✅ OK | Browser in-app Vercel | Header Portefeuille contrats visible, console 0 erreur |
| `/taches` production | ✅ OK | Browser in-app Vercel | Header Pilotage quotidien visible, console 0 erreur |

### Décision Phase D
- P0 local produit : non détecté par build/tests.
- Validation production cockpit : OK sur les routes principales.

---

## QA Phase C — Auth / Funnel final premium (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| `/register?plan=pro` local | ✅ OK | Browser in-app | Titre Pro, CTA Pro, console 0 erreur |
| `/register` local | ✅ OK | Browser in-app | Titre Starter, CTA Starter, console 0 erreur |
| `/login` local | ✅ OK | Browser in-app | Titre cockpit COURTIA, bouton login, console 0 erreur |
| `/register?plan=pro` production | ✅ OK | Browser in-app Vercel | CTA Pro visible, console 0 erreur |
| `/register` production | ✅ OK | Browser in-app Vercel | Starter visible, console 0 erreur |
| `/login` production | ✅ OK | Browser in-app Vercel | Login visible, console 0 erreur |
| Login démo production | ✅ OK | Browser in-app Vercel | `/dashboard`, refresh OK |
| Messages techniques auth | ✅ OK | `rg` ciblé | Pas de `err.message`, SQL, PostgreSQL, stack |

### Décision Phase C
- P0 bloquant : non.
- Prochaine étape : Phase D cockpit.

---

## QA Hotfix final — Rapports + logo canonique (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Logo canonique | ✅ OK | `cmp` | Le fichier Desktop est identique à la référence repo |
| Crash `/rapports` | ✅ Corrigé | Browser in-app production | Page visible après login demo, plus de page blanche |
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| Audit Python | ✅ OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1 |

---

## QA Phase H — Final (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend final | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend final | ✅ OK | `npm run test` | 29 tests passés |
| Audit Python final | ✅ OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1, 38 P2 |
| Backend health final | ✅ OK | `curl https://api.courtiark.fr/api/health` | HTTP 200 |
| Mauvais mot de passe UI | ✅ OK | Browser in-app | Message français propre |
| Login demo UI | ✅ OK | Browser in-app | Redirection `/dashboard` validée avant rate limit |
| Dashboard final | ✅ OK | Browser in-app | Page visible |
| Admin broker final | ✅ OK | Browser in-app | Accès refusé propre |
| Routes privées finales | ⚠️ Partiel | Browser in-app | Retest interrompu par rate limit après tentatives répétées ; Phase D prod validée |

---

## QA Hotfix final — Auth rate limit (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Message 429 auth | ✅ OK | Revue code `LoginPage.jsx` | Message français propre ajouté |
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |

---

## QA Phase G — SEO / Social (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| OG image PNG | ✅ OK | `sips` | 1200x630 |
| Manifest icons | ✅ OK | `sips` | 192x192 et 512x512 |
| Apple icon | ✅ OK | `sips` | 180x180 |
| Meta title | ✅ OK | `frontend/index.html` | `COURTIA — Le cockpit IA des courtiers` |
| Meta description | ✅ OK | `frontend/index.html` | Description courtier conforme |
| OG/Twitter image | ✅ OK | `frontend/index.html` | `https://courtia.vercel.app/og-courtia.png` |
| Production metas | ✅ OK | `curl https://courtia.vercel.app` | OG/Twitter PNG, manifest, canonical visibles |
| Production assets | ✅ OK | `curl -I` | OG PNG, icon 192, apple icon en HTTP 200 |

### Limite Phase G
- Preview LinkedIn réelle non testée dans l'outil LinkedIn.
- Metas volontairement pointées vers Vercel tant que le DNS `courtiark.fr` reste P1.

---

## QA Phase F — Audit Python (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Script QA Python | ✅ OK | `python3 scripts/courtia_qa_audit.py` | Rapport généré dans `docs/COURTIA_CODEX_QA_AUDIT.md` |
| P0/P1 statiques | ✅ OK | Audit Python | 0 P0/P1 |
| P2 statiques | ⚠️ À suivre | Audit Python | 38 signaux de finition : loaders génériques, `err.message`, libellés techniques admin |
| Composants Aurora | ✅ OK | Audit Python | Tous les composants requis détectés |
| Routes React | ✅ OK | Audit Python | Routes réelles listées, pas de P1 `/app/*` |
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |

### Décision Phase F
- P0 bloquant : non.
- P1 bloquant : non.
- Les P2 sont documentés comme finitions futures, pas comme blocage de livraison.

---

## QA Phase E — Admin Center aligné (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| Routes admin frontend | ✅ OK | `rg` ciblé | Pages actives alignées sur `/api/admin/super/*` |
| Route `/app/dashboard` | ✅ OK | `rg` ciblé | Suppression de la redirection cassée |
| Backend health | ✅ OK | `curl https://api.courtiark.fr/api/health` | HTTP 200 |
| `/admin` local non connecté | ✅ OK | Browser in-app | Redirection vers `/login`, console 0 erreur |
| `/admin` production broker | ✅ OK | Browser in-app Vercel | Écran "Admin Center protégé", console 0 erreur |
| Endpoint `/api/admin/super/analytics` sans token | ✅ OK | `curl` | HTTP 401 attendu |
| Impersonation | ✅ OK | Revue code | Aucun bouton ni JWT d'impersonation ajouté |

### Limites Phase E
- Test super_admin réel non exécuté : token super_admin absent.
- Non connecté en production non retesté dans une session vierge, car le navigateur in-app partage la session broker ; le code et le test local redirigent bien vers `/login`.

---

## QA Phase B — Landing 3D scroll premium (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| Audit landing Python | ✅ OK | `python3 scripts/courtia_landing_audit.py` | Sections, CTA, anciens logos, routes OK |
| Hero local | ✅ OK | Browser in-app | CTA visible, console 0 erreur |
| Pricing local | ✅ OK | Browser in-app | Starter et Pro retravaillés, console 0 erreur |
| Production `/` | ✅ OK | Browser in-app Vercel | Commit Phase B servi, hero visible, console 0 erreur |
| Production `/register?plan=pro` | ✅ OK | Browser in-app Vercel | CTA Pro et bloc 0 EUR visibles |
| Production `/register` | ✅ OK | Browser in-app Vercel | Funnel Starter visible |
| Production `/login` | ✅ OK | Browser in-app Vercel | Page login visible |
| Ancien logo texte | ✅ OK | Audit statique | Aucun `>C<` dans les mockups cibles |
| Liens landing | ✅ OK | Audit statique | `/register`, `/register?plan=pro`, `/login`, mailto |

### Décision Phase B
- P0 bloquant : non.
- Prochaine étape : Phase C Auth si finition funnel, ou Phase D cockpit si priorité plateforme interne.

---

## QA Phase A — Production funnel Pro (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Vercel `/register?plan=pro` | ✅ OK | Browser in-app production | Page visible, titre Pro et CTA détectés |
| CTA Pro mobile/current viewport | ✅ OK | Screenshot production | `Activer mon essai Pro` visible dans le premier écran actuel |
| Bloc essai Pro | ✅ OK | Browser in-app production | `0 €`, `7 jours`, `annulation en ligne` visibles |
| Console Pro | ✅ OK | `tab.dev.logs` | 0 erreur |
| Vercel `/register` | ✅ OK | Browser in-app production | Funnel Starter premium visible |
| Vercel `/login` | ✅ OK | Browser in-app production | Page login visible, console 0 erreur |
| Login démo production | ✅ OK | Browser in-app production | Redirection vers `/dashboard` |
| Refresh dashboard | ✅ OK | Browser in-app production | Session conservée sur `/dashboard` |

### Décision Phase A
- P0 bloquant : non.
- Autorisation produit : passage à la landing premium 3D scroll.
- Limite restante : Admin Center à aligner séparément avec le backend `/api/admin/super/*`.

---

## QA Phase 3 — Auth / Pricing conversion (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Audit landing Python | ✅ OK | `python3 scripts/courtia_landing_audit.py` | Wording Pro et CTA valides |
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB non bloquant |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| `/register?plan=pro` local | ✅ OK | Browser in-app | “Activez votre cockpit Pro”, 0 EUR aujourd’hui, console 0 erreur |
| `/register?plan=pro` structure mobile | ✅ OK | Browser in-app | Panneau marque + essai compact + CTA visible dans le premier écran |
| `/register?plan=pro` CTA premier écran | ✅ OK | Browser in-app local | CTA “Activer mon essai Pro” visible sans scroll après compactage mobile |
| `/register` local | ✅ OK | Browser in-app | “Démarrez votre cockpit Starter”, 0 EUR aujourd’hui, 89 EUR HT/mois après essai |
| `/#pricing` local | ✅ OK | Browser in-app | Prix Pro premium, annulation en ligne visible, console 0 erreur |

## QA Phase 2 — Landing premium Codex (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Audit landing Python | ✅ OK | `python3 scripts/courtia_landing_audit.py` | 15 sections détectées, CTA valides, aucun ancien `C` texte |
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB non bloquant |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| `/` local | ✅ OK | Browser in-app `http://127.0.0.1:5174/` | Hero refait après rejet design, console 0 erreur |
| `/login` local | ✅ OK | Browser in-app | Page visible, console 0 erreur |
| `/register` local | ✅ OK | Browser in-app | Page visible, console 0 erreur |
| `/register?plan=pro` local | ✅ OK | Browser in-app | Badge Pro visible, console 0 erreur |
| Wording essai Pro | ✅ OK | Audit Python | `0 € aujourd’hui`, carte pour activer l’essai, annulation en ligne |

### Notes Phase 2
- Production non modifiée tant que le commit n’est pas poussé.
- Test production post-déploiement requis avant validation définitive Vercel.
- Admin Center non corrigé en Phase 2 : mismatch API documenté séparément.

## QA finale (1er mai 2026)

| Page | Desktop | Console | Logo | Erreurs | Statut |
|------|---------|---------|------|---------|--------|
| / (landing) | ✅ | 0 | ✅ | 0 | OK |
| /login | ✅ | 0 | ✅ | 0 | OK |
| /register?plan=pro | ✅ | 0 | ✅ | 0 | OK |
| /admin | ✅ (→login) | 0 | ✅ | 0 | Protégé |
| /admin/users | ✅ (→login) | 0 | ✅ | 0 | Protégé |
| /admin/system | ✅ (→login) | 0 | ✅ | 0 | Protégé |

### Routes backend testées
- `/api/health` → ✅ 200 OK
- `/api/admin/super/users` → ✅ 401 (protégé)
- `/api/admin/analytics` → ✅ 401 (protégé)

### Production
- Vercel : ✅ Déployé (courtia.vercel.app)
- VPS : ✅ PM2 online (courtia-api, hermes-gateway)
- API : ✅ Répond (health OK)
- DNS : ⚠️ courtiark.fr en parking Hostinger

### Console
- 0 erreur JavaScript sur toutes les pages testées

### Mobile responsive
- Landing : ✅ Pas de scroll horizontal
- Login : ✅ Formulaire lisible
- Register : ✅ Formulaire lisible

## QA Auth / Login (1er mai 2026)

| Test | Résultat | Preuve |
|---|---|---|
| Register nouvel utilisateur | ✅ OK | dalil.test.2026.01@courtia.fr créé, dashboard affiché |
| Login mauvais mot de passe | ✅ OK | "Email ou mot de passe incorrect." — message contextuel |
| Login bon mot de passe | ✅ OK | demo@courtia.fr → "Bonjour Test" — nouveau design premium |
| Dashboard après login | ✅ OK | Dashboard cockpit Aurora affiché |
| Refresh dashboard | ✅ OK | Utilisateur reste connecté |
| Console | ✅ OK | 0 erreur |
| Backend health | ✅ OK | PM2 online, API health OK |

### Problèmes restants
- P1 : DNS courtiark.fr non propagé
- P1 : Stripe LIVE non finalisé
- P2 : Tests admin E2E impossibles sans token super_admin
