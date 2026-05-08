# COURTIA — QA Production Funnel Pro

Date : 1er mai 2026

## 1. Objectif

Valider en production que le funnel Pro livré localement est bien disponible sur Vercel avant de relancer une nouvelle phase de refonte.

URL principale testée :
- `https://courtia.vercel.app/register?plan=pro`

## 2. Résultat

| Contrôle | Résultat | Preuve |
|---|---:|---|
| Page Pro visible | OK | Titre `Activez votre cockpit Pro` détecté |
| CTA Pro visible | OK | Bouton `Activer mon essai Pro` visible |
| Bloc essai | OK | `0 €`, `7 jours`, `annulation en ligne` visibles |
| Console Pro | OK | 0 erreur JavaScript |
| Register classique | OK | `Démarrez votre cockpit Starter` et CTA Starter visibles |
| Login | OK | Page login visible, console 0 erreur |
| Login démo | OK | Redirection vers `/dashboard` |
| Refresh dashboard | OK | Session conservée sur `/dashboard` |
| Ancien wording banal | OK | `Créer votre espace courtier` absent du funnel Pro |

## 3. Parcours testé

1. Ouverture de `/register?plan=pro`.
2. Vérification du titre Pro, du CTA, du bloc essai et de la console.
3. Ouverture de `/register`.
4. Vérification du funnel Starter premium.
5. Ouverture de `/login`.
6. Connexion avec le compte démo autorisé.
7. Vérification de la route `/dashboard`.
8. Refresh dashboard.

## 4. Console

Résultat : 0 erreur bloquante sur :
- `/register?plan=pro`
- `/register`
- `/login`
- `/dashboard`

## 5. Décision

P0 bloquant détecté : non.

Le funnel Pro est validé en production pour poursuivre la mission. Le prochain batch recommandé est la landing premium 3D scroll, puis l’harmonisation cockpit et Admin Center.

## 6. Limites

- Aucun code Stripe n’a été ajouté ou testé dans cette phase.
- La carte bancaire, SIRET et ORIAS restent en P1 Billing / Onboarding documenté.
- L’Admin Center reste à aligner séparément avec les routes backend `/api/admin/super/*`.
