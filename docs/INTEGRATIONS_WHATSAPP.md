# Intégration WhatsApp Business Cloud API — COURTIA

## Priorité produit

Pas de SMS en priorité.
Canal prioritaire: WhatsApp Business + ARK.

## Variables d'environnement

- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`

## Endpoints

Public webhook:
- `GET /api/integrations/whatsapp/webhook`
- `POST /api/integrations/whatsapp/webhook`

Authentifiés:
- `GET /api/integrations/whatsapp/status`
- `POST /api/integrations/whatsapp/configure`
- `POST /api/integrations/whatsapp/send`
- `GET /api/integrations/whatsapp/threads`
- `GET /api/integrations/whatsapp/templates`

## Stockage

- threads: `whatsapp_threads`
- historique: `client_interactions`
- liaison client par téléphone

## Sécurité

- token access jamais renvoyé (masqué)
- webhook protégé par verify token Meta
- logs sans secret

## Templates V1

- relance échéance
- demande pièces
- confirmation rendez-vous
- relance prospect
- suivi après appel
