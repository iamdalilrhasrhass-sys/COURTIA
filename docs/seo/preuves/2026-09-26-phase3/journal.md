
---

## Search Console : connexion et premier relevé réel (26/09/2026)

**Search Console n'était pas inaccessible : la propriété existait déjà et était validée.**

| Élément | Valeur vérifiée |
|---|---|
| Propriété | `https://courtiark.fr/` (préfixe d'URL) |
| Compte | iamdalilrhasrhass@gmail.com |
| Création / validation | aucune nécessaire : propriété déjà validée |
| Voie d'accès | Chrome du Mac (session Google existante), piloté depuis le VPS |
| Retard du blocage | l'option « Autoriser JavaScript dans les événements AppleScript » était cochée mais Chrome n'appliquait la préférence qu'au démarrage ; le redémarrage n'avait pas eu lieu |
| Ce qui a été nécessaire | écrire la préférence au niveau du profil (Chrome la lit là, pas dans `account_values`) puis relancer Chrome, onglets restaurés à l'identique |

### Relevé T0 (fenêtre 25/06/2026 → 24/09/2026)

**15 clics · 382 impressions · CTR 3,9 % · position moyenne 12,3 · 17 requêtes · 67 pages · 58 pays.**

- La requête `courtia` (ancienne marque) porte **8 des 15 clics et 250 des 382 impressions** (position 5,6).
  C'est le premier levier mesuré : 250 impressions sur un nom que nous ne voulons plus porter comme marque principale.
- L'accueil capte 15 clics et 288 impressions ; **toutes les autres impressions vont à l'ancien plan `/fr` et `/ch`, avec 0 clic.**
- **Suisse : 9 clics pour 36 impressions. France : 5 clics pour 129 impressions.** La priorité donnée à la
  Suisse romande est confirmée par la mesure, pas par une intuition.
- Appareils : ordinateur 10 clics / 186 impressions, mobile 5 / 192.

### Sitemaps

| Sitemap | État |
|---|---|
| `/sitemap.xml` | **envoyé le 26/09/2026**, reconnu par Google comme « index de sitemaps », relu le jour même |
| `/sitemaps/france.xml` | envoyé, 11 URL |
| `/sitemaps/switzerland.xml` | envoyé, 13 URL |
| `/sitemaps/tools.xml` | envoyé, 5 URL |
| `/sitemaps/features.xml` | envoyé mais « impossible de récupérer le sitemap » côté Google, alors que le fichier répond 200 en XML valide (contrôle refait) : échec de récupération côté Google, à revérifier |
| `/sitemap-seo.xml` | ancien fichier (134 URL de l'ancien plan), supprimé et redirigé vers `/sitemap.xml` |

Les 10 sitemaps de section ont été contrôlés un par un : HTTP 200, XML valide, 80 URL au total.

### Indexation

**1 100 URL dans l'index** (essentiellement l'ancien plan de site) et **40 non indexées**, réparties en
5 motifs. Les URL concernées ont été relevées une par une :

| Motif | Pages | Correction appliquée |
|---|---|---|
| Détectée, actuellement non indexée | 27 | sitemap envoyé + 9 demandes d'indexation |
| Autre page avec balise canonique correcte | 7 | 7 redirections permanentes ajoutées (commit `c21701b7`), vérifiées en production en 308 |
| Explorée, actuellement non indexée | 3 | doublons consolidés par redirection |
| Soft 404 | 2 | pages héritées vides redirigées vers la page équivalente |
| Exclue par la balise noindex | 1 | comportement voulu (anciennes pages locales) |

### Inspection des 10 URL stratégiques

Les 10 URL ont été ouvertes dans l'outil d'inspection. **Aucune des nouvelles pages n'était indexée** ;
l'accueil est indexé (288 impressions, 15 clics). Pour les 9 pages non indexées, la demande d'indexation
a été déposée et Google a répondu à l'écran :
« Indexation demandée — Cette URL a été ajoutée à une file d'attente d'exploration prioritaire. »

### Groupes d'action issus des positions réelles

| Groupe | Requêtes | Action |
|---|---|---|
| A (1-3) | 0 | — |
| B (4-10) | `courtia` (position 5,6, 8 clics) | défendre : la marque historique convertit déjà |
| C (11-20) | `logiciel pour courtier en assurance` (position 13) | viser le top 10 : renforcer la page et son maillage |
| D (20+) | 15 requêtes, dont 7 locales (`courtier geneve` 76, `courtier assurance lausanne` 58, `courtier mulhouse` 22, `courtier cahors` 49, `courtier lannion` 40, `courtier libourne` 59, `courtier haguenau` 57) et `logiciel courtier iard` (10 impressions, position 59) | les pages locales existent déjà (France 10 villes, Suisse romande 9 zones) : la priorité est leur indexation, puis l'enrichissement des villes qui montrent une demande réelle |

### Tracking vérifié côté serveur le 26/09/2026

Événements observés en base après des visites contrôlées sur les pages statiques :
`seo_page_view`, `cta_demo_click`, `ark_demo_view`, `cta_trial_click`, `pricing_view`, `demo_form_view`,
`demo_form_submit`, `demo_request_success`, `demo_request_failure`.
Attribution conservée (medium, campagne, landing, referrer).

### Tableau de bord

`docs/seo/DASHBOARD.md` comporte désormais les quatre blocs demandés : SEARCH, INDEXATION, CONVERSION,
BUSINESS, plus la conversion par page d'atterrissage et le KPI par requête avec son groupe d'action.

### Relevé périodique

`python3 /root/ark/gsc_relever.py` ouvre les rapports dans le Chrome connecté et écrit un relevé
horodaté dans `/root/ark/gsc_releves.jsonl`. **Ce n'est pas une automatisation par API** (aucun jeton
Google n'existe) : c'est un relevé piloté par navigateur, documenté comme tel.

### Ce qui reste à faire

1. Laisser Google explorer : indexation des 80 pages (sitemap + 9 demandes déposées).
2. Revérifier `features.xml` chez Google (échec de récupération signalé).
3. Une fois les premières impressions sur les pages actuelles : traiter le groupe C puis le groupe D
   (renforcement de contenu et de maillage, jamais de démultiplication de pages).
4. Confirmer l'entité COURTIARK pour reprendre la main sur les 250 impressions du nom historique.
