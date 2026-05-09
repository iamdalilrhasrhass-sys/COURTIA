# Intégration Google Agenda — COURTIA

## Objectif V1

- OAuth Google Calendar côté backend
- statut connexion dans `/parametres`
- sync événements vers `calendar_events`
- enrichissement timeline client + Dashboard + Morning Brief

## Variables d'environnement

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `ENCRYPTION_KEY`

Le callback doit pointer vers:
- `/api/integrations/google-calendar/callback`

## Endpoints

- `GET /api/integrations/google-calendar/status`
- `POST /api/integrations/google-calendar/connect`
- `GET /api/integrations/google-calendar/callback`
- `POST /api/integrations/google-calendar/disconnect`
- `POST /api/integrations/google-calendar/sync`
- `GET /api/integrations/google-calendar/events`

## Sécurité

- tokens jamais exposés au frontend
- tokens stockés chiffrés (`integrationSecrets` + `ENCRYPTION_KEY`)
- status et métadonnées seulement côté UI

## Test rapide

1. ouvrir `/parametres` > section Intégrations
2. cliquer `Connecter` sur Google Agenda
3. autoriser Google
4. revenir sur COURTIA
5. cliquer `Synchroniser`
6. vérifier Dashboard / Morning Brief / Fiche client (timeline)
