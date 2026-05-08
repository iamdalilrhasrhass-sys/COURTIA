# COURTIA — Admin Center

## Routes API backend existantes
Le backend monte `adminSuperAdmin.js` sous `/api/admin/super`.
Les routes super admin réelles sont donc protégées par `verifyToken` + `superAdminGuard` sous ce préfixe.

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /api/admin/super/users | Liste paginée des courtiers |
| GET | /api/admin/super/users/:id | Détail courtier + métriques |
| GET | /api/admin/super/analytics | MRR, signups, churn, ARK |
| GET | /api/admin/super/impersonation/logs | Historique impersonation |
| POST | /api/admin/super/impersonate/:userId | Route backend existante, non exposée UI |
| POST | /api/admin/super/impersonate/stop | Route backend existante, non exposée UI |
| GET | /api/admin/super/iobsp/pending | Demandes IOBSP en attente |
| PATCH | /api/admin/super/iobsp/:userId | Approuver/rejeter IOBSP |

Les routes coûts restent séparées sous `/api/admin/costs`, car le backend `adminCosts.js` est monté volontairement sous `/api/admin`.

## Pages frontend admin

| Route | Composant | Statut |
|-------|-----------|--------|
| /admin | AdminOverview | ✅ Créé |
| /admin/users | AdminUsers | ✅ Créé |
| /admin/users/:id | AdminUserDetail | ✅ Créé |
| /admin/subscriptions | AdminSubscriptions | ✅ Créé |
| /admin/system | AdminSystem | ✅ Créé |
| /admin/logs | AdminLogs | ✅ Créé |
| /admin/support | AdminSupport | ✅ Créé |

## Composants créés
- `AdminRoute.jsx` — Protection par rôle (vérifie `/api/admin/super/analytics`)
- `AdminLayout.jsx` — Layout avec sidebar admin
- `AdminSidebar.jsx` — Navigation admin sombre premium
- `src/lib/adminApi.js` — Préfixe admin centralisé vers `/api/admin/super/*`

## Protections
- Non connecté → redirection /login
- Broker (non super_admin) → écran "Admin Center protégé" avec retour `/dashboard`
- Super admin → accès complet
- Vérification backend réelle (pas de confiance frontend seule)

## Rôles
- `broker` = utilisateur normal
- `admin` = support futur limité (non implémenté)
- `super_admin` = propriétaire complet COURTIA

## Impersonation
- **DÉSACTIVÉE** dans le frontend (composant désactivé)
- Routes backend existent mais non exposées dans l'UI admin
- Décision : ne pas réactiver sans audit de sécurité

## Limites restantes
- Pas de token super_admin pour tests E2E
- Abonnements : données limitées à `/api/admin/super/analytics`
- Support : pas de système de tickets connecté
