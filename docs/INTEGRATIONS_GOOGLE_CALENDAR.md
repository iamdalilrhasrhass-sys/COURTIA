# Intégration Google Agenda — COURTIA V1

## Endpoints
- `GET /api/integrations/google-calendar/status`
- `POST /api/integrations/google-calendar/connect`
- `GET /api/integrations/google-calendar/callback`
- `POST /api/integrations/google-calendar/disconnect`
- `POST /api/integrations/google-calendar/sync`
- `GET /api/integrations/google-calendar/events`

## Variables
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `ENCRYPTION_KEY`

## Fonctions métier
- synchroniser les prochains rendez-vous
- lier un événement à un client (matching email)
- afficher les RDV dans Dashboard et Morning Brief
- alimenter la timeline interactions client

## Limites V1
- pas de création d’événement depuis COURTIA (lecture/sync prioritaire)
- dépend de la configuration OAuth backend
