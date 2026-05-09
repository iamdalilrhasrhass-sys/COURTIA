# Intégration WhatsApp Business Cloud API — COURTIA

## Priorité produit

Pas de SMS en priorité.
Canal prioritaire: WhatsApp Business + ARK.

## Variables d'environnement

- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `WHATSAPP_APP_SECRET`

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

- statut utilisateur: `integrations`
- compat dashboard: `whatsapp_threads`
- conversations V1: `whatsapp_conversations`
- messages V1: `whatsapp_messages`
- historique: `client_interactions`
- liaison client par téléphone

Feature flag:
- `v1_whatsapp_business`

## Sécurité

- token access jamais renvoyé (masqué)
- webhook protégé par verify token Meta
- webhook POST protégé par signature `X-Hub-Signature-256` avec `WHATSAPP_APP_SECRET`
- envoi libre uniquement si la fenêtre client 24h est ouverte
- hors fenêtre 24h, envoi via template Meta approuvé
- logs sans secret

## Templates V1

- relance échéance
- demande pièces
- confirmation rendez-vous
- relance prospect
- prise de contact

## Setup Meta

1. Créer l'application Meta Business.
2. Configurer le webhook sur `/api/integrations/whatsapp/webhook`.
3. Renseigner `WHATSAPP_VERIFY_TOKEN` puis vérifier le challenge.
4. Renseigner `WHATSAPP_APP_SECRET` pour vérifier les webhooks entrants.
5. Renseigner `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_BUSINESS_ACCOUNT_ID`.
6. Faire approuver les templates Meta listés ci-dessus.
7. Dans COURTIA, ouvrir `Paramètres > Intégrations`, renseigner le Phone Number ID et configurer.

Si une variable manque, l'interface affiche `Configuration requise` et aucune intégration n'est présentée comme active.
