# Sitemaps — inventaire et investigation

## Inventaire (fichiers servis)

| URL | HTTP | Content-Type | URL | Taille | XML valide | Dans l'index |
|---|---|---|---|---|---|---|
| /sitemaps/assurances.xml | 200 | application/xml | 6 | 1008 | oui | oui |
| /sitemaps/comparatifs.xml | 200 | application/xml | 4 | 776 | oui | oui |
| /sitemaps/core.xml | 200 | application/xml | 7 | 1543 | oui | oui |
| /sitemaps/features-v2.xml | 200 | application/xml | 12 | 2014 | oui | oui |
| /sitemaps/france.xml | 200 | application/xml | 11 | 1618 | oui | oui |
| /sitemaps/resources.xml | 200 | application/xml | 11 | 1874 | oui | oui |
| /sitemaps/solutions.xml | 200 | application/xml | 5 | 900 | oui | oui |
| /sitemaps/switzerland.xml | 200 | application/xml | 13 | 2111 | oui | oui |
| /sitemaps/tools.xml | 200 | application/xml | 5 | 930 | oui | oui |
| /sitemaps/trust.xml | 200 | application/xml | 6 | 930 | oui | oui |
| **total** | | | **80** | | | |

Le manifeste actuel (gate) compte **80 URL indexables** : les **80** URL des sitemaps de section
correspondent exactement. L'index `/sitemap.xml` reference 10 fichiers.

## Ecart « 42 URL decouvertes » vs 80 pages

Search Console affichait « 42 » pour `/sitemap.xml` au moment ou Google l'a relu : ce nombre est le
compteur d'URL **deja lues** a cette date, pas le contenu du fichier. Depuis, trois sections ont ete
soumises separement et lues (france 11, switzerland 13, tools 5) et l'index a ete relu le 26/09.
Le comptage cote Google progresse par lectures successives ; il ne peut pas etre force.
Statut : **PENDING_GOOGLE**.

## features.xml — investigation complete

| Controle | features.xml | france.xml (accepte) |
|---|---|---|
| HTTP | 200 | 200 |
| Content-Type | application/xml | application/xml |
| Content-Length | 2014 | 1618 |
| Cache-Control | public, max-age=0, must-revalidate | identique |
| Content-Encoding | absent | absent |
| x-vercel-cache | HIT | HIT |
| BOM | aucun | aucun |
| Encodage | UTF-8 declare, ASCII effectif | identique |
| Fins de ligne | LF | LF |
| XML valide (xmllint) | oui | oui |
| Reponse a Googlebot | 200 application/xml | 200 application/xml |
| URL internes | 12/12 en 200, canonical propre, index/follow | 11/11 idem |

**Aucune difference technique n'explique l'echec** : il est cote Google (recuperation transitoire).
Solution appliquee conformement a la procedure : `features-v2.xml` regenere (meme contenu, 12 URL),
reference dans l'index a la place de l'ancien fichier, et `/sitemaps/features.xml` renvoie une
redirection permanente vers la nouvelle version. L'ancien fichier n'est pas supprime du depot
tant que Google n'a pas lu la nouvelle version.
