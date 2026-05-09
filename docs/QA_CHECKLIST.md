# QA Checklist — COURTIA

## Comptes test

- Courtier e2e: `e2e@courtia.fr / courtia2026`
- Super admin: `dalil@repairebrise.fr / pass123`

## Parcours smoke courtier

1. login e2e
2. dashboard
3. clients
4. clic bulle client → fiche client
5. contrats liés
6. tâches liées
7. rapports
8. paramètres
9. morning brief
10. tentative `/admin` => refus propre
11. tentative `/admin/costs` => refus propre
12. logout

## Parcours smoke admin

1. login Dalil
2. vérifier `/api/auth/me` role=`super_admin`
3. `/admin`
4. `/admin/costs`
5. `/admin/growth-leads`
6. logout

## Contrôles réseau

- aucun appel contenant `/api/api`
- `authMe429Responses = 0`
- `authLogin429Responses = 0`
- `networkErrors = 0`

## Responsive rapide

- desktop
- laptop
- tablet
- mobile

## Commandes

```bash
PREVIEW_URL="https://<preview>?_vercel_share=<token>" npm --prefix backend run qa:preview-smoke
npm --prefix backend run qa:prod-smoke
```
