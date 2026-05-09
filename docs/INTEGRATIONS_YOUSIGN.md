# COURTIA — Intégration Yousign

## Objectif

Yousign permet d’envoyer les documents métier DDA COURTIA à signer :

- FIC
- mandat de courtage
- devoir de conseil
- attestation / synthèse client

COURTIA conserve le statut et trace les événements, mais ne remplace pas la validation humaine du courtier.

## Variables d'environnement

```txt
YOUSIGN_API_KEY=
YOUSIGN_WEBHOOK_SECRET=
YOUSIGN_BASE_URL=https://api.yousign.app/v3
```

Sans `YOUSIGN_API_KEY` ou `YOUSIGN_WEBHOOK_SECRET`, les routes dégradent proprement en `configuration_required`.

## Routes

```txt
GET /api/documents/yousign/status
POST /api/documents/:id/send-to-sign
POST /api/documents/yousign/webhook
```

Le webhook est public mais signé. Toutes les autres routes nécessitent une session COURTIA.

## Statuts documents

```txt
generated
sent_to_sign
signed
refused
expired
archived
```

## Sécurité

- API key uniquement côté backend.
- Webhook vérifié par HMAC SHA-256.
- Aucun token Yousign exposé au frontend.
- Les événements sont stockés dans `yousign_webhook_events`.
- Les actions sont ajoutées à `document_activity_log`.

## Configuration Yousign

1. Créer une application Yousign.
2. Renseigner l’URL webhook :

```txt
https://api.courtiark.fr/api/documents/yousign/webhook
```

3. Configurer le secret webhook dans Render :

```txt
YOUSIGN_WEBHOOK_SECRET=<secret>
```

4. Configurer la clé API :

```txt
YOUSIGN_API_KEY=<clé>
```

5. Redéployer le backend.
6. Vérifier :

```bash
curl https://api.courtiark.fr/api/documents/yousign/status
```

La route status nécessite une authentification dans l’app, donc le test complet se fait depuis `/documents` ou une fiche client.

## Limites V1

- Signature simple par email.
- Pas encore de workflow multi-signataires avancé.
- Pas encore de positionnement visuel fin des champs de signature.
- Si l’API Yousign refuse un payload, COURTIA renvoie un 500/502 propre et conserve le document en `generated`.

