# QA Checklist — COURTIA

## Comptes test

- Courtier e2e: `e2e@courtia.fr / courtia2026`
- Super admin: `dalil@repairebrise.fr / pass123`

## Parcours smoke courtier

1. landing `/` (CTA visible)
2. `/demo` (formulaire)
3. login e2e
4. dashboard
5. clients
6. clic bulle client → fiche client
7. contrats liés
8. tâches liées
9. rapports
10. paramètres (intégrations visibles)
11. onboarding `/onboarding`
12. import `/import`
13. billing `/billing`
14. morning brief
15. vérifier timeline interactions dans fiche client (onglet Activité)
16. tentative `/admin` => refus propre
17. tentative `/admin/costs` => refus propre
18. logout

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

## Contrôles intégrations

- `/parametres` affiche Google Agenda / WhatsApp / Gmail / Outlook
- statuts: connecté / non connecté / configuration requise cohérents
- aucun secret visible côté UI (tokens masqués côté API)

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
