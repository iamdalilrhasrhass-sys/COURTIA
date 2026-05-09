# Webhooks & Automation Roadmap — COURTIA

## Statut actuel
- `POST /api/webhooks/incoming`: actif (secret optionnel `WEBHOOK_INCOMING_SECRET`)
- `POST /api/webhooks/outgoing/test`: actif (auth requis)
- Stockage minimal: `automation_webhook_events`

## Cas d'usage cibles (Make / Zapier)
1. Nouveau lead démo enregistré.
2. Nouvelle tâche critique créée.
3. Événement agenda important détecté.
4. Message WhatsApp entrant non traité.
5. Client à risque détecté par ARK.

## Contrat payload recommandé
```json
{
  "source": "courtia",
  "event_name": "lead.demo_request.created",
  "payload": {
    "id": 123,
    "created_at": "2026-05-09T10:00:00Z"
  }
}
```

## Sécurité
- Secret entrant en header: `x-courtia-webhook-secret`.
- Rotation du secret trimestrielle.
- Journalisation sans token ni données sensibles.

## Prochaines étapes
1. Ajouter signatures HMAC sortantes.
2. Ajouter retries exponentiels pour outgoing réels.
3. Ajouter dashboard admin “Webhook deliveries”.
4. Ajouter DLQ (dead-letter queue) pour échecs persistants.
