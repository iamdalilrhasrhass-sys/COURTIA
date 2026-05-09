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
16. documents DDA : `/documents`, onglet `Documents DDA`
17. fiche client : générer une FIC si ORIAS renseigné, sinon vérifier message ORIAS propre
18. commissions : `/commissions`, état vide ou tableau lisible
19. fiche client : onglet `Commissions` visible et état propre
20. tentative `/admin` => refus propre
21. tentative `/admin/costs` => refus propre
22. logout

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

## Contrôles documents DDA

- `/parametres#conformite` affiche ORIAS / cabinet / téléphone
- `POST /api/documents/generate` refuse proprement sans ORIAS
- génération FIC OK avec ORIAS
- PDF téléchargeable via `/api/documents/:id/download`
- document visible dans `/documents`
- Yousign absent: bouton “Envoyer à signer” affiche un message configuration requise
- archivage propre via `/api/documents/:id/archive`
- audit log document généré / archivé

## Contrôles commissions

- `/commissions` charge sans casser le cockpit
- `GET /api/commissions/stats?year=2026` retourne agrégats ou état vide
- import CSV affiche un rapport importé / non rapproché
- export CSV génère un fichier local
- `/clients/:id` onglet `Commissions` affiche les commissions liées ou un état vide
- le feature flag `v1_commissions` désactivé renvoie un état “fonctionnalité désactivée” propre

## Contrôles WhatsApp Business

- `Paramètres > Intégrations` affiche WhatsApp Business en `Configuration requise` si les secrets Meta sont absents
- `GET /api/integrations/whatsapp/status` ne renvoie jamais de token en clair
- webhook Meta GET vérifie le challenge avec `WHATSAPP_VERIFY_TOKEN`
- webhook Meta POST refuse une signature `X-Hub-Signature-256` invalide
- fiche client: onglet `WhatsApp` affiche l'état de configuration et les threads liés
- envoi libre sans conversation récente est refusé avec `whatsapp_template_required`
- envoi via template utilise un template Meta approuvé

## Contrôles ARK V1 proactif

- feature flag `v1_ark_proactive` présent
- `POST /api/ark/morning-brief` retourne au maximum 5 recommandations actionnables
- si `ANTHROPIC_API_KEY` absent: réponse propre `mode=local_fallback` / configuration requise côté UI
- `GET /api/ark/recommendations` liste les cartes non expirées/non masquées
- `POST /api/ark/recommendations/:id/act` marque une carte comme traitée
- `POST /api/ark/recommendations/:id/dismiss` masque une carte
- `GET /api/ark/budget` retourne le budget courant sans exposer de secret
- Morning Brief affiche un badge `ARK mode local` ou `ARK IA prête`
- dépassement budget: API 402 propre, pas d’écran blanc

## Contrôles notifications / templates / recherche

- cloche notifications visible dans l’app connectée
- `GET /api/notifications` retourne `rows` et `unread` sans faux exemples
- `POST /api/notifications/read-all` marque les notifications comme lues
- Cmd+K ouvre la recherche globale
- `GET /api/search?q=sophie` retourne clients / contrats / actions si données disponibles
- Paramètres > Templates affiche les templates email / WhatsApp système
- `GET /api/templates` ne renvoie aucun secret et inclut `relance_echeance`
- Rapports affiche l’activité ARK et les signaux commissions si disponibles

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
