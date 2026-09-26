# Definitions des statuts d'essai et de client (source de verite produit)

| Statut | Definition reelle | Ou le verifier |
|---|---|---|
| Essai cree | Un compte cabinet existe, la date de fin d'essai est posee. | `users.trial_started_at` / `trial_ends_at` (7 jours : `billingConfig.TRIAL_DAYS`, confirme par l'API `/api/billing/plans` -> `trial_days: 7`) |
| Essai active | Le cabinet a realise au moins une action metier reelle dans l'outil (client, contrat ou document cree) : l'essai a servi. | tables `clients`, `contrats`, `documents` pour le cabinet concerne |
| Essai expire | `trial_ends_at` depasse sans abonnement actif. | `users.trial_ends_at` compare a la date du jour |
| Essai converti | Un abonnement est actif apres l'essai. | `billing_subscriptions` / `subscriptions` avec statut actif |
| Client | Abonnement paye actif, montant reellement facture. | `billing_subscriptions` + `billing_invoices` |

**Le paiement en ligne n'est pas encore configure** : l'API publique renvoie
`stripe_configuration.checkout_ready = false` et `missing` liste les elements absents
(cle secrete, identifiants de tarif, secret de webhook). Tant que ce n'est pas fourni, aucun
essai ne peut devenir client en libre-service : la conversion se fait par contact direct.
Le MRR SEO ne peut donc pas etre calcule aujourd'hui, et n'est pas estime.
