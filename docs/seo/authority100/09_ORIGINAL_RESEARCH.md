# Recherche originale COURTIARK (26/09/2026)

## Actif n°1 — Cartographie du courtage en assurance en France, edition 2026

| Element | Valeur |
|---|---|
| Page | `/etudes/courtage-assurance-france-2026` |
| Methode | `/etudes/methodologie-cartographie-courtage-france` |
| Hub | `/etudes` |
| Script reproductible | `seo/research/courtage_france_2026.py` |
| Verification independante | `seo/research/verification_courtage_france_2026.py` (autre format, autre analyseur) |
| Ecart entre les deux calculs | **0** |
| Dataset telechargeable | `/donnees/courtage-france-2026.csv` et `.json` |
| Controles de qualite | 0 ligne hors code NAF, 0 SIREN en doublon, 191 lignes sans commune exclues des villes, table des regions verifiee sur 10 couples |
| Chiffres publies | 43 240 entreprises ; Ile-de-France 10 050 (23,2 %) ; Paris 4 347 ; 6 157 entreprises multi-etablissements |
| Limites publiees | entreprise != etablissement ; code declaratif ; statut reglementaire non verifie ; date d'extraction |

**Garde-fou qui a servi** : la premiere table des regions ne contenait pas la region 93 (PACA) ; le script
a refuse de publier tant que le controle « departement 13 -> region attendue » echouait. Aucun chiffre faux
n'est sorti.

## Actif n°2 — Le jeu de donnees lui-meme

Le CSV agrege (regions, departements, villes, categories, annees de creation) est telechargeable et
reutilisable avec mention de source. C'est l'actif qui peut etre cite par un tiers sans lui demander
de nous citer nommement dans un article entier.

## Actif n°3 — Outils gratuits citables

Quatre outils publics, sans compte : calculateur de productivite, calculateur de taux de transformation,
checklist de dossier (27 points), checklist de renouvellement (16 points). Les formules sont publiees sur
la page et aucun resultat n'est estime a la place du visiteur.

## Etude suisse : decision

**Non publiee.** Les donnees officielles verifiees a ce stade (FINMA, Fedlex) ne permettent pas un
comptage reproductible equivalent au SIRENE francais. Conformement a la regle « ne rien inventer »,
nous publions a la place des ressources documentaires sourcees (hubs France et Suisse) et nous
n'annoncons aucun chiffre suisse. Une edition suisse ne sera publiee que si la source le permet.

## Barometre de la digitalisation des cabinets

**Prepare, non publie.** Aucun resultat ne sera publie sans echantillon reel ; l'effectif de l'echantillon
sera affiche a cote de chaque resultat. Les questions prevues portent sur : taille du cabinet, outils
actuels, usage d'un CRM, dependance a Excel, gestion des documents, relances, renouvellements, charge
administrative, usage de l'IA, priorites des 12 prochains mois.
