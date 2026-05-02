# COURTIA — Secret Audit Report

Date: 2026-05-02

## Résumé
- P0: 0
- P1: 52
- P2: 3
- Valeurs masquées automatiquement (jamais affichées en clair).

## Détails

### `DEPLOYMENT-GUIDE.md`
- [P1] JWT Secret Assignment ligne 132 — `JWT_***ate`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.
- [P1] JWT Secret Assignment ligne 306 — `JWT_***et>`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.
- [P1] Database URL (inline) ligne 92 — `post***/db`
  - Action: Masquer l'URL, régénérer credentials si exposés.
- [P1] Database URL (inline) ligne 131 — `post***nce`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `DEPLOYMENT.md`
- [P1] JWT Secret Assignment ligne 27 — `JWT_***026`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.

### `DEPLOYMENT_REPORT.md`
- [P1] Anthropic API Key ligne 200 — `sk-a***KEY`
  - Action: Conserver backend-only et régénérer si exposée.
- [P1] JWT Secret Assignment ligne 199 — `JWT_***026`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.
- [P1] Database URL (inline) ligne 198 — `post***...`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `DEPLOY_NOW.md`
- [P1] JWT Secret Assignment ligne 38 — `JWT_***026`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.

### `DEPLOY_PRODUCTION.md`
- [P1] JWT Secret Assignment ligne 19 — `JWT_***ret`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.
- [P1] Database URL (inline) ligne 17 — `post***...`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `FINAL_STATUS.md`
- [P1] JWT Secret Assignment ligne 92 — `JWT_***026`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.
- [P1] Database URL (inline) ligne 242 — `post***...`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `GET_URLS.md`
- [P1] Database URL (inline) ligne 36 — `post***...`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `HEROKU_SETUP.md`
- [P1] Database URL (inline) ligne 43 — `post***ame`
  - Action: Masquer l'URL, régénérer credentials si exposés.
- [P1] Database URL (inline) ligne 57 — `post***ame`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `OPTION4_DEPLOYMENT.md`
- [P1] JWT Secret Assignment ligne 146 — `JWT_***ret`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.
- [P1] Database URL (inline) ligne 145 — `post***nce`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `OPTION4_FINAL_REPORT.md`
- [P1] JWT Secret Assignment ligne 226 — `JWT_***...`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.
- [P1] Database URL (inline) ligne 225 — `post***...`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `OPTION4_INSTALLATION_MANIFEST.md`
- [P1] JWT Secret Assignment ligne 127 — `JWT_***ere`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.
- [P1] Database URL (inline) ligne 126 — `post***nce`
  - Action: Masquer l'URL, régénérer credentials si exposés.
- [P1] Database URL (inline) ligne 312 — `post***ase`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `PHASE2_FINAL.md`
- [P1] Database URL (inline) ligne 42 — `post***nce`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `PHASE3_COMPLETE.md`
- [P1] Database URL (inline) ligne 375 — `post***nce`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `POSTGRESQL_SETUP.md`
- [P1] Database URL (inline) ligne 174 — `post***ame`
  - Action: Masquer l'URL, régénérer credentials si exposés.
- [P1] Database URL (inline) ligne 186 — `post***ame`
  - Action: Masquer l'URL, régénérer credentials si exposés.
- [P1] Database URL (inline) ligne 305 — `post***nce`
  - Action: Masquer l'URL, régénérer credentials si exposés.
- [P1] Database URL (inline) ligne 308 — `post***nce`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `PRODUCTION_DEPLOYMENT_GUIDE.md`
- [P1] Anthropic API Key ligne 51 — `sk-a***ERE`
  - Action: Conserver backend-only et régénérer si exposée.
- [P1] JWT Secret Assignment ligne 50 — `JWT_***026`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.
- [P1] Database URL (inline) ligne 49 — `post***éré`
  - Action: Masquer l'URL, régénérer credentials si exposés.
- [P1] Database URL (inline) ligne 175 — `post***nce`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `RECAP_STRIPE_EMAIL.md`
- [P1] Stripe Webhook Secret ligne 58 — `wh***`
  - Action: Créer un nouveau webhook secret et invalider l'ancien.

### `RENDER_FIX_INSTRUCTIONS.md`
- [P1] Database URL (inline) ligne 29 — `post***nce`
  - Action: Masquer l'URL, régénérer credentials si exposés.
- [P1] Database URL (inline) ligne 34 — `post***nce`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `STRIPE_SETUP_DALIL.md`
- [P1] Stripe Webhook Secret ligne 37 — `wh***`
  - Action: Créer un nouveau webhook secret et invalider l'ancien.
- [P1] Stripe Webhook Secret ligne 45 — `wh***`
  - Action: Créer un nouveau webhook secret et invalider l'ancien.

### `backend/PHASE3-VALIDATION.md`
- [P1] JWT Secret Assignment ligne 193 — `JWT_***026`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.

### `backend/README.md`
- [P1] JWT Secret Assignment ligne 205 — `JWT_***026`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.

### `backend/src/services/backupService.js`
- [P1] Database URL (inline) ligne 13 — `post***nce`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `deploy.sh`
- [P1] JWT Secret Assignment ligne 56 — `JWT_***.."`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.
- [P1] Database URL (inline) ligne 55 — `post***...`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `docker-compose.prod.yml`
- [P1] Database URL (inline) ligne 25 — `post***nce`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `docs/COURTIA_SECRET_ROTATION_RUNBOOK.md`
- [P2] Render API Key mention ligne 12 — `REND***EY``
  - Action: Vérifier l'usage et révoquer les anciennes valeurs.

### `docs/COURTIA_SECURITY_HARDENING.md`
- [P2] Render API Key mention ligne 26 — `REND***ate`
  - Action: Vérifier l'usage et révoquer les anciennes valeurs.

### `docs/COURTIA_STRIPE_TEST_ENV_SETUP.md`
- [P1] Stripe Test Key ligne 10 — `sk_t***xxx`
  - Action: Régénérer si exposée hors canal sécurisé.
- [P1] Stripe Webhook Secret ligne 11 — `wh***`
  - Action: Créer un nouveau webhook secret et invalider l'ancien.

### `docs/SETUP.md`
- [P1] JWT Secret Assignment ligne 163 — `JWT_***ion`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.
- [P1] JWT Secret Assignment ligne 433 — `JWT_***re"`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.

### `docs/TROUBLESHOOTING.md`
- [P1] JWT Secret Assignment ligne 109 — `JWT_***ere`
  - Action: Supprimer des docs/scripts publics et utiliser env manager.

### `inject_final.js`
- [P1] Database URL (inline) ligne 6 — `post***ire`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `scripts/courtia_secret_audit.py`
- [P2] Render API Key mention ligne 114 — `REND***^\s`
  - Action: Vérifier l'usage et révoquer les anciennes valeurs.

### `scripts/init-db.sh`
- [P1] Database URL (inline) ligne 98 — `post***AME`
  - Action: Masquer l'URL, régénérer credentials si exposés.

### `scripts/setup-postgres-macos.sh`
- [P1] Database URL (inline) ligne 49 — `post***nce`
  - Action: Masquer l'URL, régénérer credentials si exposés.

## Recommandations immédiates
- Traiter d'abord tous les P0.
- Révoquer/régénérer les secrets P1 avant Stripe test mode.
- Nettoyer les exemples historiques dans la documentation legacy.
