# COURTIA — Hotfix Portfolio Morning Brief

Date : 1er mai 2026

## 1. Problème production détecté

Le tour API production a confirmé :

- login demo : OK,
- `/api/auth/me` : OK,
- `/api/dashboard/stats` : OK,
- `/api/clients` : OK,
- `/api/contrats` : OK,
- `/api/taches` : OK,
- `/api/reach/dashboard` : OK,
- `/api/portfolio/morning-brief` : KO `500`.
- `/api/portfolio/health-score` : KO `500`.

Erreur retournée :

```text
column "generated_at" does not exist
column "health_score" does not exist
```

## 2. Cause

Le code du module portefeuille supposait que la table `portfolio_insights` possédait une colonne `generated_at`.

La base production semble avoir un schéma différent ou plus ancien, sans certaines colonnes attendues par le module Portfolio avancé.

## 3. Correction réalisée

- Ajout de `backend/src/utils/portfolioSchema.js`.
- Détection dynamique de la colonne temporelle disponible :
  - `generated_at`,
  - sinon `created_at`,
  - sinon `updated_at`,
  - sinon fallback `NOW()` / tri par `id`.
- Patch de `backend/src/routes/portfolio.js`.
- Patch de `backend/src/services/portfolioAnalyzer.js`.
- Patch complémentaire : détection de colonnes métier manquantes (`health_score`, `health_breakdown`, `raw_analysis`, totaux), messages d'erreur propres et fallback score local dans `MorningBrief`.
- Aucune migration DB appliquée.
- Aucun changement Stripe, auth, impersonation ou JWT.

## 4. Tests locaux

| Test | Résultat |
|---|---|
| `node -c backend/server.js` | OK |
| `node -c backend/src/routes/portfolio.js` | OK |
| `node -c backend/src/services/portfolioAnalyzer.js` | OK |
| `node -c backend/src/utils/portfolioSchema.js` | OK |
| `npm run build` | OK |
| `npm run test` | 33 tests OK |
| `python3 scripts/courtia_qa_audit.py` | 0 P0/P1 |

## 5. Limite production

Le VPS refuse l'accès SSH (`publickey,password`).

Tant que le backend VPS / PM2 n'est pas redéployé avec ce commit, la production peut continuer à retourner `500` sur `/api/portfolio/morning-brief`.
