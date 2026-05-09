# Intégrations Email (Gmail / Outlook) — COURTIA

## Statut V1

Gmail dispose d'un vrai flow OAuth backend prêt à connecter, d'une synchronisation légère des derniers messages, et d'un endpoint d'envoi depuis COURTIA. Outlook reste en architecture prête à connecter, avec état `configuration_required` ou `authorization_received` tant que l'échange Microsoft n'est pas activé.

Aucune intégration email n'est affichée comme connectée si les secrets ne sont pas présents.

## Gmail — variables

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` pour OAuth combiné Google Agenda + Gmail
- `GOOGLE_GMAIL_REDIRECT_URI` optionnel pour le flow Gmail séparé
- `ENCRYPTION_KEY` obligatoire pour chiffrer les tokens au repos

Callbacks attendus:

- OAuth combiné: `/api/integrations/google/oauth/callback`
- Gmail seul: `/api/integrations/gmail/callback`

## Gmail — scopes V1

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/gmail.modify`
- `https://www.googleapis.com/auth/gmail.send`

## Gmail — endpoints

- `GET /api/integrations/google/status`
- `GET /api/integrations/google/oauth/start`
- `GET /api/integrations/google/oauth/callback`
- `POST /api/integrations/google/disconnect`
- `GET /api/integrations/gmail/status`
- `POST /api/integrations/gmail/connect`
- `GET /api/integrations/gmail/callback`
- `POST /api/integrations/gmail/disconnect`
- `POST /api/integrations/gmail/sync`
- `POST /api/integrations/gmail/send`

## Gmail — comportement

- `sync` récupère les messages récents en metadata, extrait expéditeur/destinataire/sujet/snippet, puis tente de relier à un client par email.
- Les échanges sont visibles dans `client_interactions` et, si la migration V1 est appliquée, dans `email_threads` / `email_messages`.
- `send` envoie un email via Gmail API avec un message RFC 822 encodé base64url, puis trace l'envoi dans la timeline client.

## Outlook — endpoints préparés

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

## RGPD et sécurité

- connexion volontaire depuis l'utilisateur,
- tokens jamais exposés côté frontend,
- stockage minimal: aperçu, horodatage, sujet, IDs externes, participants,
- contenu complet non aspiré en masse en V1,
- déconnexion possible depuis `/parametres`,
- logs sans tokens ni secrets.
