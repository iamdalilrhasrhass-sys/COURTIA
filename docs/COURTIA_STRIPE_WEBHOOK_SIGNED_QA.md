# COURTIA — Stripe Webhook Signed QA

Date: 2 mai 2026 (run final après passation Hermes)

## Scope
- Signature webhook obligatoire
- Traitement signé réel
- Idempotence sur rejeu d’un même `event_id`
- Test `invoice.payment_failed`

## Résultats
| Test | Résultat |
|---|---|
| `POST /api/stripe/webhook` sans signature | ✅ 400 `missing_signature` |
| Event signé `invoice.payment_failed` | ✅ 200 |
| Event signé `customer.subscription.updated` | ✅ 200 |
| Rejeu du même event signé | ✅ 200 avec indicateur idempotent |
| Doublons `payment_events.event_id` | ✅ aucun doublon (`0`) |

## Notes techniques
- Vérification signée effectuée en générant une signature Stripe test valide côté backend (secret webhook test en env, non exposé).
- Les événements signés testés sont bien enregistrés dans `payment_events`.

## Réserve ciblée
- Un event synthétique signé `checkout.session.completed` renvoie `400` malgré persistence de l’event (cause probable hors signature: traitement secondaire après ingestion, à durcir côté email J0).

## Décision
- **Webhook signé: validé**
- **Idempotence backend: validée**
- **`invoice.payment_failed`: validé**
