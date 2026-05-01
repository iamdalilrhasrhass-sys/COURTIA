# COURTIA — Hotfix Portfolio Schema Hardening

Date : 2 mai 2026

## 1. Objectif

Stabiliser le cockpit portefeuille pour une pré-commercialisation, même si la base VPS possède un schéma `portfolio_insights` plus ancien que le code applicatif.

## 2. Problèmes confirmés en production

| Endpoint | Résultat production | Cause visible |
|---|---|---|
| `/api/portfolio/morning-brief` | `500` | colonne `generated_at` absente |
| `/api/portfolio/health-score` | `500` | colonne `health_score` absente |

Les autres endpoints critiques testés avec le compte demo restent OK : login, `/auth/me`, dashboard stats, clients, contrats, tâches, Reach dashboard.

## 3. Correction réalisée

- Détection dynamique des colonnes réellement présentes sur `portfolio_insights`.
- Fallback temporel : `generated_at`, sinon `created_at`, sinon `updated_at`, sinon `NOW()` / tri par `id`.
- Fallback métriques : les routes ne sélectionnent plus `health_score`, `health_breakdown`, `raw_analysis`, `total_clients`, `total_contracts` ou `total_premium` si la colonne est absente.
- `/api/portfolio/health-score` recalcule le score à la volée si un insight ancien existe sans colonne `health_score`.
- `portfolioAnalyzer` persiste uniquement dans les colonnes disponibles.
- Admin Center super admin ne dépend plus obligatoirement de `generated_at` / `health_score`.
- Les erreurs portfolio renvoient un message propre, sans fuite SQL.
- Frontend `MorningBrief` affiche un score local estimé si l'API score est temporairement indisponible.

## 4. Sécurité / périmètre

- Aucune migration DB.
- Aucun changement Stripe.
- Aucune impersonation réactivée.
- Aucun JWT d'impersonation généré.
- Aucun secret exposé.

## 5. Tests locaux

| Test | Résultat |
|---|---|
| `node -c backend/server.js` | OK |
| `node -c backend/src/routes/portfolio.js` | OK |
| `node -c backend/src/routes/adminSuperAdmin.js` | OK |
| `node -c backend/src/services/portfolioAnalyzer.js` | OK |
| `node -c backend/src/utils/portfolioSchema.js` | OK |
| `npm run build` | OK |
| `npm run test` | 33 tests OK |
| `python3 scripts/courtia_qa_audit.py` | 0 P0/P1 |

## 6. Limite production

Le code est corrigé et poussé côté dépôt, mais le backend VPS doit être redéployé / redémarré avec ce commit pour supprimer les `500` API en production.

Tentative SSH :

```text
root@72.62.187.63: Permission denied (publickey,password).
```

Sans accès SSH/PM2 valide ou pipeline backend automatique confirmé, la correction backend ne peut pas être activée directement depuis cette session.
