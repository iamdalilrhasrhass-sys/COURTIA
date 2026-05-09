# Intégration Google Agenda — COURTIA

## Statut V1

Google Agenda est prêt à connecter via OAuth côté backend. Si les secrets Google ne sont pas configurés, COURTIA renvoie un état propre `configuration_required` et l'UI affiche une connexion requise sans casser l'application.

## Valeur métier

- synchroniser les prochains rendez-vous courtier,
- relier un événement à une fiche client par email invité,
- afficher les RDV dans Dashboard et Morning Brief,
- alimenter la timeline client,
- préparer un RDV avec ARK à partir du contexte client.

## Variables d'environnement

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` pour OAuth combiné Google Agenda + Gmail
- `GOOGLE_CALENDAR_REDIRECT_URI` optionnel pour le flow Agenda séparé
- `ENCRYPTION_KEY` obligatoire pour chiffrer les tokens au repos

Callbacks attendus:

- OAuth combiné: `/api/integrations/google/oauth/callback`
- Agenda seul: `/api/integrations/google-calendar/callback`

## Scopes V1

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/calendar`

## Endpoints

- `GET /api/integrations/google/status`
- `GET /api/integrations/google/oauth/start`
- `GET /api/integrations/google/oauth/callback`
- `POST /api/integrations/google/disconnect`
- `GET /api/integrations/google-calendar/status`
- `POST /api/integrations/google-calendar/connect`
- `GET /api/integrations/google-calendar/callback`
- `POST /api/integrations/google-calendar/disconnect`
- `POST /api/integrations/google-calendar/sync`
- `POST /api/integrations/calendar/sync`
- `GET /api/integrations/google-calendar/events`
- `GET /api/integrations/calendar/events`

## Stockage

- `integrations` garde le statut et les tokens chiffrés pour compatibilité avec l'architecture existante.
- `oauth_tokens` garde un miroir OAuth V1 chiffré.
- `calendar_events` garde les événements synchronisés.
- `client_interactions` reçoit une interaction `google_calendar` lorsqu'un événement est lié à un client.

## Sécurité

- aucun token n'est renvoyé au frontend,
- les tokens sont chiffrés avec `ENCRYPTION_KEY`,
- les callbacks valident un `state` signé et expirant,
- la déconnexion supprime les tokens stockés côté COURTIA,
- si Google ou le chiffrement manque, l'API dégrade proprement.

## Test rapide

1. ouvrir `/parametres` puis `Intégrations`,
2. connecter Google Agenda ou utiliser le flow Google combiné,
3. autoriser Google,
4. cliquer `Synchroniser`,
5. vérifier Dashboard, Morning Brief et la timeline fiche client.
