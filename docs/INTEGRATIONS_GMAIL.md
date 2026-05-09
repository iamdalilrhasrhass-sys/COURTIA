# Intégration Gmail — COURTIA V1

## Endpoints
- `GET /api/integrations/gmail/status`
- `POST /api/integrations/gmail/connect`
- `GET /api/integrations/gmail/callback`
- `POST /api/integrations/gmail/disconnect`
- `POST /api/integrations/gmail/sync`
- `POST /api/integrations/gmail/send`

## Variables requises
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `ENCRYPTION_KEY`

## Portée OAuth V1
- `gmail.readonly`
- `gmail.send`

## Fonctionnement
- OAuth initié depuis Paramètres > Intégrations
- callback backend effectue l’échange token
- sync récupère les emails récents et alimente la timeline client
- send permet l’envoi d’email depuis la fiche client

## Sécurité & RGPD
- tokens conservés uniquement backend (chiffrés)
- collecte limitée, pas d’aspiration massive
- désactivation possible via endpoint disconnect
