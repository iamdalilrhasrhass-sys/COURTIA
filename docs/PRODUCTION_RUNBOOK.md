# Production Runbook — COURTIA

## Déploiement standard

1. merge PR vers `main`
2. attendre Vercel `READY`
3. vérifier commit actif
4. lancer smoke prod

## Commandes utiles

```bash
vercel inspect https://courtia.vercel.app --timeout=120s
npm --prefix backend run qa:prod-smoke
pm2 restart courtia-api --update-env
```

Pour tout changement d'environnement backend, utiliser uniquement `pm2 restart courtia-api --update-env`. Ne pas utiliser `pm2 reload` pour propager des variables.

## Rollback

1. identifier dernier déploiement stable
2. promouvoir/redéployer ce commit via Vercel
3. rerun smoke prod

## Vérifications post-déploiement

- login e2e OK
- login Dalil + role super_admin
- `/admin` + `/admin/costs` + `/admin/growth-leads`
- `/parametres` section Intégrations visible
- `/parametres` section Conformité DDA visible
- `/documents` onglet Documents DDA visible
- `/clients/:id` onglet Activité (timeline interactions) OK
- `/clients/:id` onglet Documents : génération FIC OK si ORIAS renseigné
- `/billing` + `/onboarding` + `/import` OK
- logout OK
- `/api/api = 0`
- `auth 429 = 0`

## Variables intégrations (prod)

- `VITE_INTEGRATIONS_API_ENABLED=true` (front) pour activer les appels intégrations
- `ENCRYPTION_KEY`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET`, `OUTLOOK_REDIRECT_URI`, `OUTLOOK_TENANT_ID`
- `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WEBHOOK_INCOMING_SECRET` (si automatisations Make/Zapier activées)

## Variables frontend (Vercel)

- `VITE_API_URL`
- `VITE_APP_URL`
- `VITE_PUBLIC_STRIPE_KEY`
- `VITE_INTEGRATIONS_API_ENABLED`

## Promotion admin (propre)

- utiliser script/route backend prévue, jamais de hardcode front
- vérifier ensuite via `/api/auth/me`

## Si 429 auth apparaît

- lire `Retry-After` sur `POST /api/auth/login`
- attendre la fenêtre
- relancer un unique smoke complet

## Si `/api/api` réapparaît

- vérifier `buildApiUrl` frontend (`frontend/src/api/sessionPolicy.js`)
- relancer tests unitaires frontend + smoke

## Documents DDA

- feature flag : `v1_dda_documents`
- migration : `016_v1_dda_documents.sql`
- rollback : `down/016_v1_dda_documents.down.sql`
- prérequis utilisateur : ORIAS dans Paramètres > Conformité
- stockage V1 : table `documents_blob`
- signature électronique : Yousign activable via `YOUSIGN_API_KEY` + `YOUSIGN_WEBHOOK_SECRET`

Si la génération échoue :

1. vérifier ORIAS cabinet/courtier
2. vérifier tables `documents`, `documents_blob`, `document_activity_log`
3. vérifier `audit_log`
4. relancer `npm --prefix backend test -- documentDdaService.test.js --runInBand`

## Yousign

- feature flag : `v1_yousign_signature`
- migration : `017_v1_yousign_signature.sql`
- rollback : `down/017_v1_yousign_signature.down.sql`
- webhook : `/api/documents/yousign/webhook`

Si Yousign affiche “configuration requise” :

1. vérifier `YOUSIGN_API_KEY`
2. vérifier `YOUSIGN_WEBHOOK_SECRET`
3. vérifier l’URL webhook dans Yousign
4. relancer `npm --prefix backend test -- yousignService.test.js --runInBand`

## Commissions

- feature flag : `v1_commissions`
- migration : `018_v1_commissions.sql`
- rollback : `down/018_v1_commissions.down.sql`
- page : `/commissions`
- fiche client : onglet `Commissions`
- API principale : `/api/commissions`
- saisie par contrat : `/api/contracts/:id/commissions`

Si la page commissions est vide :

1. vérifier que le contrat existe dans `quotes`
2. vérifier que le client du contrat appartient au courtier connecté
3. vérifier le format CSV (`compagnie,contrat_ref,periode,montant_attendu,montant_recu,statut,notes`)
4. relancer `npm --prefix backend test -- commissionService.test.js --runInBand`

## WhatsApp Business

- feature flag : `v1_whatsapp_business`
- migration : `019_v1_whatsapp_business.sql`
- rollback : `down/019_v1_whatsapp_business.down.sql`
- variables : `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_APP_SECRET`
- intégrations : `/api/integrations/whatsapp/*`
- fiche client : onglet `WhatsApp`

Si WhatsApp affiche “configuration requise” :

1. vérifier `WHATSAPP_ACCESS_TOKEN`
2. vérifier `WHATSAPP_PHONE_NUMBER_ID`
3. vérifier `WHATSAPP_APP_SECRET`
4. vérifier le webhook Meta et son verify token
5. relancer `npm --prefix backend test -- whatsappBusinessService.test.js --runInBand`

## ARK V1 proactif

- feature flag : `v1_ark_proactive`
- migration : `020_v1_ark_proactive.sql`
- rollback : `down/020_v1_ark_proactive.down.sql`
- routes principales :
  - `POST /api/ark/morning-brief`
  - `GET /api/ark/recommendations`
  - `POST /api/ark/recommendations/:id/act`
  - `POST /api/ark/recommendations/:id/dismiss`
  - `POST /api/ark/rewrite`
  - `GET /api/ark/budget`
- variables optionnelles : `ANTHROPIC_API_KEY`, `ARK_DEFAULT_MODEL`, `ARK_LIGHT_MODEL`
- si `ANTHROPIC_API_KEY` manque : ARK passe en fallback déterministe, sans erreur façade

Si ARK renvoie `ark_budget_exceeded` :

1. vérifier `ark_budgets.current_spend_micro_eur`
2. vérifier `ark_budgets.hard_cap_micro_eur`
3. décider d’un override admin ou attendre le reset mensuel
4. relancer `npm --prefix backend test -- arkProactiveService.test.js --runInBand`

## Notifications / Templates / Cmd+K

- feature flag : `v1_notifications_search_reporting`
- migration : `021_v1_notifications_search_reporting.sql`
- rollback : `down/021_v1_notifications_search_reporting.down.sql`
- routes principales :
  - `GET /api/notifications`
  - `POST /api/notifications/:id/read`
  - `POST /api/notifications/read-all`
  - `GET /api/templates`
  - `POST /api/templates`
  - `PATCH /api/templates/:id`
  - `GET /api/search?q=...`
- UI :
  - cloche notifications dans le cockpit
  - Cmd+K global relié à la recherche backend
  - Paramètres > Templates
  - Rapports enrichis ARK / commissions

Si Cmd+K ne remonte pas de résultats :

1. vérifier `feature_flags.v1_notifications_search_reporting`
2. vérifier `GET /api/search?q=<terme>` connecté
3. vérifier que les tables `clients`, `quotes`, `documents` existent
4. relancer `npm --prefix backend test -- searchService.test.js templateService.test.js --runInBand`

## Pages publiques confiance

Routes publiques à vérifier après déploiement :

- `/securite`
- `/rgpd`
- `/changelog`
- `/roadmap`
- `/aide`
- `/status`
- `/contact`
- `/legal/confidentialite`
- `/legal/conditions-utilisation`

Points de contrôle :

1. pages accessibles sans authentification
2. rendu Aurora Bubble C cohérent avec la landing
3. textes sans promesse de conformité automatique complète
4. intégrations présentées comme activables/configurables si secrets absents
5. footer marketing avec liens sécurité, RGPD, aide et status

Docs associées :

- `docs/SECURITY_OVERVIEW.md`
- `docs/RGPD_DPA.md`
- `docs/HELP_CENTER.md`

## Contrôle admin Dalil / super_admin

- super_admin doit être accepté comme rôle admin complet.
- /api/auth/me doit retourner role=super_admin.
- /admin et /admin/costs doivent être granted.
- Ne jamais hardcoder un email pour contourner l'accès admin.
- En production, PM2 doit pointer vers la DB crm_assurance.
- Vérifier avec pm2 env courtia-api après chaque changement d'environnement.
