# COURTIA — Phase C Auth / Funnel Final

Date : 1er mai 2026

## 1. Objectif

Renforcer le portail login/register sans toucher au backend, à Stripe, à la DB ou au flux JWT.

## 2. Changements

- Login renommé en `Accédez à votre cockpit COURTIA`.
- Register Starter renommé en `Activez votre cockpit Starter`.
- Register Pro conservé en `Activez votre cockpit Pro`.
- Ajout d’un traitement visuel plus premium sur la carte auth : halo, bordure Aurora, reflets doux.
- Bouton principal renforcé : gradient Aurora plus lumineux, ombre plus premium.
- Ajout d’un strip de valeur desktop : `0 €`, `7 jours`, `En ligne` côté register ; `ARK`, `Clients`, `Sécurisé` côté login.
- Le panneau essai 7 jours reste compact sur mobile pour conserver le CTA dans le premier écran.

## 3. Non fait volontairement

- Pas de checkout Stripe.
- Pas de champ SIRET / ORIAS obligatoire dans le formulaire actuel, car le backend `/auth/register` ne les accepte pas encore.
- Pas de collecte carte dans COURTIA.
- Pas de modification du stockage token/session.

## 4. Tests

| Test | Résultat |
|---|---:|
| Build frontend | OK |
| Tests Vitest | 29 OK |
| `/register?plan=pro` local | OK, CTA Pro visible, console 0 erreur |
| `/register` local | OK, Starter visible, console 0 erreur |
| `/login` local | OK, login visible, console 0 erreur |
| Scan messages techniques auth | OK |
| `/register?plan=pro` production | OK, CTA Pro visible, console 0 erreur |
| `/register` production | OK, Starter visible, console 0 erreur |
| `/login` production | OK, console 0 erreur |
| Login démo production | OK, redirection `/dashboard` |
| Refresh dashboard production | OK |

## 5. Risques restants

- Production auth validée après push.
- Billing / Onboarding P1 reste nécessaire pour SIRET, ORIAS, Stripe Checkout, webhooks, portail client et annulation en ligne réelle.
