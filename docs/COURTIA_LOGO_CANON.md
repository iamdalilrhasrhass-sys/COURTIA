# COURTIA — Logo Canonique Aurora Bubble C

## Source officielle
Le logo canonique COURTIA est le fichier :

- `frontend/public/courtia-bubble-C-reference.html`

Ce fichier est identique au fichier fourni sur le bureau :

- `/Users/dalilrhasrhass/Desktop/courtia_bubble_C.html`

## Règle produit
Tout l'écosystème visuel COURTIA doit tourner autour de ce logo :

- bulle iridescente en forme de C,
- halo cosmique,
- membrane liquide,
- mousse subtile,
- verre / aurore,
- fond sombre profond,
- intelligence calme et premium.

## Implémentation React
Le composant React officiel est :

- `frontend/src/components/brand/CourtiaBubbleLogo.jsx`

Il reprend la structure SVG canonique : `C_PATH`, filtres liquides, gradients `iris1`, `iris2`, `iris3`, membrane, specular highlights, foam cluster et halo animé.

Les variantes autorisées sont :

- `CourtiaBubbleLogo` pour les grands usages,
- `CourtiaMiniLogo` pour navbar/sidebar/badges,
- `CourtiaLogoLoader` pour les loaders,
- `AuroraEmptyState` pour les états vides.

## Interdictions
- Ne pas revenir à l'ancien carré violet avec un simple `C`.
- Ne pas utiliser une lettre C plate sans membrane.
- Ne pas remplacer par un logo cartoon, pastel ou générique.
- Ne pas générer un nouveau logo sans repartir du fichier canonique.

## QA
Le fichier canonique a été comparé avec `cmp` au fichier fourni sur le bureau : identique.
