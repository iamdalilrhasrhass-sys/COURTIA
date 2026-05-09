# Intégrations Email — COURTIA

## Gmail (actif V1)
Voir: [`docs/INTEGRATIONS_GMAIL.md`](./INTEGRATIONS_GMAIL.md)

## Outlook (architecture prête)
Routes présentes:
- `GET /api/integrations/outlook/status`
- `POST /api/integrations/outlook/connect`
- `GET /api/integrations/outlook/callback`
- `POST /api/integrations/outlook/disconnect`
- `POST /api/integrations/outlook/sync`

## Principes communs
- consentement explicite de l’utilisateur
- tokens OAuth côté backend uniquement
- synchronisation limitée aux besoins métier courtier
