# Status Page

La page publique `/status` interroge `/api/status` et affiche uniquement des statuts non sensibles.

## Champs publics

- `frontend`
- `api`
- `database`
- `integrations`
- `maintenance`

## Integrations

Les modules non configures apparaissent en `configuration_required`:

- email transactionnel
- SMS
- Stripe
- Google
- WhatsApp Business
- Yousign

## Maintenance

Variables:

- `MAINTENANCE_MODE=true`
- `MAINTENANCE_MESSAGE="Message court"`

Aucun secret ne doit etre expose par cette route.
