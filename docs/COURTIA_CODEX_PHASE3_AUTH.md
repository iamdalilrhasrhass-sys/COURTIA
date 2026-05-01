# COURTIA — Phase 3 Auth Premium

## 1. Objectif
Rendre le register/login plus premium et plus vendeur, sans casser l’auth validée en Phase 1 et sans coder Stripe.

## 2. Changements réalisés
- Titre register Pro remplacé par “Activez votre cockpit Pro”.
- Sous-titre register Pro orienté valeur : priorités, relances, portefeuille sous contrôle.
- CTA register Pro remplacé par “Activer mon essai Pro”.
- Ajout d’un panneau essai Pro : 0 EUR aujourd’hui, 7 jours, annulation en ligne.
- Mention claire : la carte sera demandée dans une étape de paiement sécurisée dédiée, pas collectée dans le formulaire COURTIA actuel.
- Login renommé “Ouvrez votre cockpit”.

## 3. Landing / Pricing polish associé
- Suppression de la transition visuelle trop brute entre sections.
- Pricing Pro rendu plus premium : badge “Offre la plus logique”, prix traité comme élément de valeur, phrase “moins de 6 EUR HT par jour”.
- Starter reste volontairement plus simple.
- Wording essai Pro conservé : 0 EUR aujourd’hui, 159 EUR HT/mois après l’essai, annulation en ligne.

## 4. Fichiers modifiés
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/LandingPublic.jsx`
- `docs/COURTIA_CODEX_PHASE3_AUTH.md`
- Documentation QA / changelog / design system mise à jour.

## 5. Tests
- `python3 scripts/courtia_landing_audit.py` : OK.
- `npm run build` : OK.
- `npm run test` : 29 tests OK.
- Browser local `/register?plan=pro` : nouveau titre, panneau essai, console 0 erreur.
- Browser local `/#pricing` : pricing Pro premium, annulation en ligne visible, console 0 erreur.

## 6. Non fait volontairement
- Pas de checkout Stripe.
- Pas de collecte carte dans COURTIA.
- Pas de SIRET / ORIAS dans le formulaire actuel, car le backend register ne les accepte pas encore.
- Ces champs restent dans la Phase Billing / Onboarding P1.

## 7. Risques restants
- Auth production à retester après push.
- Le flux billing réel devra passer par Stripe Checkout subscription, webhooks et portail client.
