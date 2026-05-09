# Integration SMS

Le SMS COURTIA est volontairement en mode `Configuration requise` tant qu'aucun provider reel n'est configure.

## Providers

### Twilio

Variables:

- `SMS_PROVIDER=twilio`
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM`

### Gateway generique

Variables:

- `SMS_PROVIDER=generic`
- `SMS_GATEWAY_URL`
- `SMS_GATEWAY_TOKEN`

Payload envoye:

```json
{ "to": "+33612345678", "message": "Texte SMS" }
```

## Comportement attendu

- Sans configuration, aucun SMS n'est envoye.
- L'API retourne `configuration_required`.
- Le scheduler de relances ne plante pas et journalise le skip.
- Aucun numero complet ne doit etre logge.
