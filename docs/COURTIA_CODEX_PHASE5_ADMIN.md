# COURTIA — Phase 5 Admin Center

## 1. Objectif
Stabiliser l'Admin Center pour éviter un faux cockpit admin : routes alignées avec le backend réel, accès broker refusé proprement, aucune route `/app/*`, aucune réactivation de l'impersonation.

## 2. Problème confirmé
Le frontend appelait :
- `/api/admin/analytics`
- `/api/admin/users`
- `/api/admin/impersonation/logs`

Le backend monte les routes super admin sous :
- `/api/admin/super/analytics`
- `/api/admin/super/users`
- `/api/admin/super/impersonation/logs`

Ce désalignement rendait l'Admin Center visuellement présent mais fonctionnellement fragile pour un vrai compte super_admin.

## 3. Corrections réalisées
- Ajout d'un client admin centralisé : `frontend/src/lib/adminApi.js`.
- Alignement des pages admin sur `/api/admin/super/*`.
- Correction de `AdminRoute.jsx` : vérification super_admin via `/api/admin/super/analytics`.
- Suppression de la redirection cassée `/app/dashboard`.
- Ajout d'un écran de refus propre pour les comptes broker connectés.
- Conservation stricte de l'impersonation désactivée côté UI : aucun bouton, aucun JWT, aucune reprise de session.
- Suppression de l'affichage brut `err.message` dans la vue overview admin.

## 4. Fichiers modifiés
- `frontend/src/lib/adminApi.js`
- `frontend/src/components/AdminRoute.jsx`
- `frontend/src/pages/AdminOverview.jsx`
- `frontend/src/pages/AdminUsers.jsx`
- `frontend/src/pages/AdminUserDetail.jsx`
- `frontend/src/pages/AdminSubscriptions.jsx`
- `frontend/src/pages/AdminSystem.jsx`
- `frontend/src/pages/AdminLogs.jsx`
- `docs/COURTIA_ADMIN_CENTER.md`
- `docs/COURTIA_CHANGELOG.md`
- `docs/COURTIA_QA_REPORT.md`
- `docs/COURTIA_REMAINING_TASKS.md`

## 5. Tests
| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | OK | `npm run test` | 29 tests passés |
| Scan routes admin frontend | OK | `rg` ciblé | Plus d'appel `/api/admin/analytics`, `/api/admin/users` ou `/api/admin/impersonation/logs` dans les pages admin actives |
| Scan route cassée | OK | `rg` ciblé | Plus de `/app/dashboard` dans `AdminRoute.jsx` |
| Backend health | OK | `curl https://api.courtiark.fr/api/health` | HTTP 200 |
| `/admin` local non connecté | OK | Browser in-app | Redirection vers `/login`, console 0 erreur |
| `/admin` production broker | OK | Browser in-app Vercel | Écran "Admin Center protégé", console 0 erreur |
| Endpoint super admin sans token | OK | `curl /api/admin/super/analytics` | HTTP 401 attendu |

## 6. Build
`npm run build` : OK.

## 7. Tests automatisés
`npm run test` : 29 tests passés.

## 8. Limites
- Aucun token super_admin réel disponible dans cette mission : les vues super_admin chargées avec données réelles restent à tester avec un compte propriétaire.
- Test broker production exécuté après déploiement Vercel : accès refusé propre.
- Les endpoints coûts `/api/admin/costs` restent séparés car le backend les monte volontairement sous `/api/admin`.

## 9. Prochaine phase
Phase F QA Python.
