# COURTIA — Landing 3D Repair

Date : 2 mai 2026

## 1. Problème constaté
- Perte de perception “3D premium” sur la landing.
- Ligne bleue intrusive visible au centre de la page (desktop), cassant la continuité visuelle.

## 2. Cause technique
- Le rail vertical `.soft-rail` était positionné plein centre (`left-1/2`) avec un gradient trop lumineux.
- La barre de progression scroll en haut était trop intense (2px + shadow forte).
- Les cartes premium manquaient de perspective nette au hover, ce qui aplatissait l’effet global.

## 3. Correction appliquée
- `LandingPublic.jsx` :
  - rail vertical déplacé hors centre (`left-[67%]`, affichage `xl` seulement),
  - opacité/blur du rail fortement réduits,
  - barre de progression réduite (`h-px`) et glow adouci,
  - ajout d’une profondeur 3D subtile (`depth-panel`, `parallax-stage`),
  - hero mockup animé en parallax léger lié au scroll.

## 4. Résultat visuel attendu
- Plus de “grosse ligne bleue” au centre.
- Lecture du storytelling conservée.
- Effet cockpit/3D restauré sans surcharge.
- Mobile conservé propre (pas de rail agressif, pas de scroll horizontal).

## 5. Validation technique
- Build frontend : OK
- Tests frontend : 33/33 OK
- Routes locales preview : `/`, `/login`, `/register`, `/register?plan=pro` → 200

## 6. Risques restants
- Vérification finale visuelle manuelle recommandée sur viewport mobile réel (in-app browser) après redeploy Vercel.
