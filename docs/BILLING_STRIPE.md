# COURTIA V1 — Billing Stripe self-serve

COURTIA utilise Stripe Checkout pour les abonnements et Stripe Customer Portal pour la gestion self-serve. COURTIA ne collecte jamais de numéro de carte côté application.

## Plans V1

La grille de référence est le CODE (`backend/src/services/planService.js`, catalogue
`PLANS` / `PLANS_CH`) ; la base (`billing_plans`) et les pages publiques en dérivent.

| Plan (code) | Prix HT/mois | Marché | Checkout |
| --- | ---: | --- | --- |
| Starter (`starter`) | 89 € | FR | Oui |
| Pro (`pro`) | 159 € | FR | Oui |
| Cabinet (`cabinet`) | Sur devis | FR | Non, contact commercial |
| Indépendant (`independant`) | 199 CHF | CH | Oui (frais de setup 490 CHF hors Stripe) |
| Cabinet (`cabinet_ch`) | 349 CHF | CH | Oui (frais de setup 990 CHF hors Stripe) |
| Sur-Mesure (`cabinet_ch_sur_devis`) | Sur devis | CH | Non, contact commercial |
| `premium` | alias hérité de `cabinet` | FR | Non |

> Les montants de ce tableau ne sont PAS une source : `GET /api/billing/plans` sert
> la grille du marché du cabinet, et le checkout n'accepte que les codes de ce marché.
> Les frais d'installation suisses ne sont pas facturés par Stripe aujourd'hui (aucun
> price ID dédié) : c'est une décision commerciale à trancher, pas une donnée inventée.

## Variables d'environnement

Backend :

```bash
BILLING_MODE=test
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_STARTER=
STRIPE_PRICE_PRO=
STRIPE_PRICE_CABINET=
STRIPE_CUSTOMER_PORTAL_RETURN_URL=https://courtia.vercel.app/billing
```

Overrides optionnels en mode test :

```bash
STRIPE_SECRET_KEY_TEST=
STRIPE_WEBHOOK_SECRET_TEST=
STRIPE_STARTER_PRICE_ID_TEST=
STRIPE_PRO_PRICE_ID_TEST=
STRIPE_CABINET_PRICE_ID_TEST=
```

Politique d'impayé et exploitation (audit Stripe du 22/09/2026) :

```bash
# Délai toléré après un échec de paiement, en jours. NON DÉFINI PAR DÉFAUT :
# sans valeur, un impayé reste toléré sans limite (comportement historique).
# AUCUNE durée commerciale n'est choisie par le code — la valeur reste à décider.
BILLING_GRACE_DAYS=

# Exécution planifiée de la réconciliation Stripe -> base (cron). Vide = aucune
# exécution automatique ; la route d'administration reste disponible.
BILLING_RECONCILIATION_CRON=
```

Frontend :

```bash
VITE_PUBLIC_STRIPE_KEY=
```

## Routes backend

- `GET /api/billing/plans` : plans publics + statut de configuration Stripe.
- `GET /api/billing/status` : abonnement courant du cabinet/utilisateur.
- `POST /api/billing/checkout-session` : crée une Checkout Session Stripe.
- `POST /api/billing/portal-session` : crée une session Customer Portal.
- `POST /api/billing/stripe-webhook` : webhook Stripe signé.

Routes historiques conservées :

- `POST /api/billing/create-checkout-session`
- `POST /api/billing/checkout`
- `POST /api/billing/create-portal-session`
- `POST /api/billing/portal`
- `POST /api/billing/webhook`

## Dégradation propre

Si Stripe n'est pas configuré, l'API renvoie `stripe_configuration_required` ou `stripe_price_configuration_required` avec la liste des variables manquantes. L'UI affiche un état premium “Configuration Stripe requise” au lieu de planter.

## Webhooks gérés

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

Les événements sont idempotents via `payment_events.event_id`. Les tables V1 `billing_subscriptions` et `billing_invoices` servent de vue durable pour la V1 self-serve.

### Garanties du traitement (audit Stripe du 22/09/2026)

- **Un seul point d'écriture de l'état d'abonnement** :
  `backend/src/services/billingSubscriptionState.js`, utilisé par le webhook ET par
  la réconciliation. Deux copies des mêmes règles finissaient par diverger.
- **Plan jamais deviné** : le code de plan vient des métadonnées posées par notre
  Checkout, sinon du price ID (les grilles FR et CH ont des prix distincts, donc la
  déduction est sans ambiguïté). Si aucun plan n'est identifiable, l'événement est
  acquitté mais AUCUNE écriture n'a lieu — un plan inventé donnerait des droits qui
  ne correspondent à aucun achat.
- **Rattachement sans métadonnées** : l'abonnement est rattaché au propriétaire du
  cabinet identifié par le client Stripe (seul rattachement non ambigu).
- **Événements en retard** : `subscriptions.last_event_created_at` mémorise le dernier
  événement appliqué ; un événement plus ancien n'écrase ni l'abonnement ni les droits.
- **Impayé daté** : `subscriptions.past_due_since` est posée au premier `past_due` et
  effacée à la régularisation. La garde d'écriture s'appuie dessus (`BILLING_GRACE_DAYS`).
- **Défaut sûr** : si la base est injoignable, le webhook répond 500 (Stripe rejoue) et
  la garde d'écriture laisse passer — une panne d'infrastructure ne doit fermer aucun
  cabinet, ni en essai ni payant.

## Réconciliation Stripe -> base

Le webhook reste le mécanisme principal ; il n'était pas réparable jusqu'ici.

- `POST /api/admin/super/billing/reconciliation` (Super Admin) : compare l'état Stripe
  réel à la base et corrige la base. Parse : idempotente (comparaison de valeurs avant
  écriture), non destructive (aucune suppression ; une ligne en base absente de Stripe
  est SIGNALÉE), lecture seule chez Stripe.
- `GET /api/admin/super/billing/reconciliation/runs` : les 20 derniers rapports.
- Les rapports sont conservés dans `billing_reconciliation_runs` (migration 125).
- Réponse 503 explicite si Stripe n'est pas configuré : rien de simulé.

## Sécurité

- Webhook signé avec `STRIPE_WEBHOOK_SECRET` avant traitement.
- Raw body préservé pour `/api/billing/webhook` et `/api/billing/stripe-webhook`.
- Aucun secret Stripe exposé côté front.
- Aucun numéro de carte stocké par COURTIA.
