# COURTIA — Auth Funnel Final

Date : 2 mai 2026

## Objectif
Aligner `/login`, `/register`, `/register?plan=pro` avec l’univers Aurora premium et renforcer la conversion sans casser l’auth.

## Résultat
- Funnel Starter/Pro conservé et stable.
- Message duplicate email déjà en français + lien direct vers connexion.
- Wording pricing du funnel aligné en `/ mois` avec mention fiscale configurable.
- Micro-réassurance maintenue : `0 € aujourd’hui`, `7 jours`, `annulation en ligne`.

## Validation
- Login demo : OK
- Mauvais mot de passe : 401 propre
- Register duplicate : 409 propre
- Build frontend : OK
- Tests frontend : 33/33

## Limites
- Stripe checkout non branché (volontaire, phase dédiée).
- SIRET/ORIAS obligatoires non activés côté formulaire tant que backend billing/onboarding n’est pas connecté.

