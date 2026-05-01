# COURTIA — Phase 7 SEO / Social

## 1. Objectif
Fiabiliser l'image de marque COURTIA quand le produit est partagé : title, description, Open Graph, Twitter Card, favicon, apple icon, manifest et image sociale.

## 2. Actions réalisées
- Ajout d'une image sociale PNG 1200x630 : `frontend/public/og-courtia.png`.
- Ajout des icônes PNG attendues par le manifest : `icon-192.png`, `icon-512.png`.
- Ajout d'une icône Apple PNG : `apple-touch-icon.png`.
- Mise à jour de `frontend/index.html` :
  - canonical `https://courtia.vercel.app/`
  - `theme-color`
  - manifest
  - Open Graph image PNG
  - Twitter image PNG
  - `og:image:alt` et `twitter:image:alt`
- Mise à jour de `frontend/public/manifest.json`.
- Mise à jour du texte bas de `og-courtia.svg` vers l'URL de production actuelle.

## 3. Décision URL
Les metas pointent vers `https://courtia.vercel.app/`, car `courtiark.fr` reste une tâche P1 DNS. Cela évite un aperçu social cassé tant que le domaine final n'est pas propagé.

## 4. Tests
| Test | Résultat | Preuve |
|---|---|---|
| Build frontend | OK | `npm run build` |
| Tests frontend | OK | `npm run test` : 29 tests passés |
| OG image | OK | `sips` : 1200x630 |
| Manifest icons | OK | `sips` : 192x192, 512x512 |
| Apple icon | OK | `sips` : 180x180 |
| Meta tags | OK | `rg` sur `frontend/index.html` |

## 5. Risques restants
- LinkedIn preview réel non testé via l'outil LinkedIn, mais l'asset PNG et les metas attendues sont présents.
- Quand `courtiark.fr` sera propagé, il faudra remplacer canonical, og:url et og:image par le domaine final.

## 6. Prochaine phase
Phase H : tests finaux et documentation finale.
