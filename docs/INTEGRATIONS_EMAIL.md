# Intégrations Email (Gmail / Outlook) — COURTIA

## Statut V1

- architecture OAuth prête
- routes status/connect/callback/disconnect/sync en place
- UI Paramètres connectée
- token exchange complet serveur à finaliser selon tenant/cabinet

## Gmail

Routes:
- `GET /api/integrations/gmail/status`
- `POST /api/integrations/gmail/connect`
- `GET /api/integrations/gmail/callback`
- `POST /api/integrations/gmail/disconnect`
- `POST /api/integrations/gmail/sync`

Variables:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `ENCRYPTION_KEY`

## Outlook

Routes:
- `GET /api/integrations/outlook/status`
- `POST /api/integrations/outlook/connect`
- `GET /api/integrations/outlook/callback`
- `POST /api/integrations/outlook/disconnect`
- `POST /api/integrations/outlook/sync`

Variables:
- `OUTLOOK_CLIENT_ID`
- `OUTLOOK_CLIENT_SECRET`
- `OUTLOOK_REDIRECT_URI`
- `OUTLOOK_TENANT_ID`
- `ENCRYPTION_KEY`
