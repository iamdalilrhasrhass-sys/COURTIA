# COURTIA — Admin Center

## Routes API backend existantes
Toutes protégées par `verifyToken` + `superAdminGuard`.

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | /api/admin/users | Liste paginée des courtiers |
| GET | /api/admin/users/:id | Détail courtier + métriques |
| GET | /api/admin/analytics | MRR, signups, churn, ARK |
| GET | /api/admin/impersonation/logs | Historique impersonation |
| POST | /api/admin/impersonate/:userId | Démarrer impersonation |
| POST | /api/admin/impersonate/stop | Arrêter impersonation |
| GET | /api/admin/iobsp/pending | Demandes IOBSP en attente |
| PATCH | /api/admin/iobsp/:userId | Approuver/rejeter IOBSP |

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
- `AdminRoute.jsx` — Protection par rôle (vérifie /api/admin/analytics)
- `AdminLayout.jsx` — Layout avec sidebar admin
- `AdminSidebar.jsx` — Navigation admin sombre premium

## Protections
- Non connecté → redirection /login
- Broker (non super_admin) → redirection /app/dashboard
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
- Abonnements : données limitées à /api/admin/analytics
- Support : pas de système de tickets connecté
