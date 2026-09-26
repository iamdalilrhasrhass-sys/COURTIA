
# SCORE AVANT

| Bloc | Score | Maximum |
|---|---|---|
| Technique / indexation | 19 | 20 |
| Autorite topique | 16 | 25 |
| Autorite externe | 5 | 25 |
| Entite / marque / confiance | 6,5 | 10 |
| CRO / produit | 10 | 10 |
| Mesure / acquisition | 7 | 10 |
| **TOTAL** | **63,5** | **100** |

# SCORE APRES

| Bloc | Score | Maximum | Ce qui a change |
|---|---|---|---|
| Technique / indexation | **19,5** | 20 | test HTML sans JS sur 16 pages, donnees structurees completes (captures + Dataset), audit des donnees structurees a 0 anomalie |
| Autorite topique | **21** | 25 | etude 2026 + methodologie + dataset, hubs reglementaires France et Suisse, pages presse/sources/politique editoriale, univers semantique de 36 sujets |
| Autorite externe | **5** | 25 | actifs prets et 22 cibles verifiees avec 20 messages personnalises ; aucun lien obtenu |
| Entite / marque / confiance | **7,5** | 10 | kit presse publie, transparence editoriale, marque unifiee ; `sameAs` vide et profils externes non crees |
| CRO / produit | **10** | 10 | inchange (deja complet) |
| Mesure / acquisition | **8** | 10 | attribution premier et dernier contact verifiee ; 0 lead reel |
| **TOTAL** | **71** | **100** | **+7,5 points** |

# DIFFERENCE, POINT PAR POINT

| Point gagne | Preuve |
|---|---|
| +0,5 technique | les 16 pages testees sont lisibles sans JavaScript, avec titre, description, H1, texte, liens, CTA et donnees structurees |
| +1 France | hub reglementaire France (sources officielles, avertissement standard, liens vers les 4 pages existantes) |
| +1 Suisse | hub reglementaire Suisse (FINMA, Fedlex, PFPDT) + documents d'information produit |
| +1 recherche | etude 2026 publiee avec double calcul independant a 0 ecart et dataset telechargeable |
| +1 entite | kit presse, page Sources, politique editoriale |
| +1 mesure | attribution session + premier et dernier contact verifiee en base sur une demande reelle de recette |
| +1,5 topique | etude + methodologie + Dataset + hubs comptaient deja partiellement dans le score avant (actifs en preparation) |
| +1 externe plancher | cibles qualifiees et messages prets entrent dans la tranche basse du bareme |

# RESULTATS TECHNIQUES

- 93 pages publiques indexables, gate local et production a 0 echec.
- 178 redirections testees en production, 178 conformes, 0 chaine, 0 destination morte.
- 10 sitemaps, 93 URL, XML valide.
- Audit des donnees structurees : 0 anomalie sur 9 pages representatives.
- Test HTML sans JavaScript : 16/16 conformes.
- Lighthouse mobile : 100/100/100/100 sur accueil, money page, demo, Geneve, outil (LCP 0,9 a 1,1 s).

# RESULTATS TOPIQUES

- France : hub + controle et preuves + LCB-FT + devoir de conseil (guide). Manque remuneration et transparence.
- Suisse : hub + documents d'information + page marche. Manque page dediee a la surveillance FINMA.
- Courtage operationnel : couvert (portefeuille, clients, devis, documents, relances, renouvellements,
  commissions, reporting, outils).
- Branches : sante, prevoyance, auto, multirisque professionnelle, RC professionnelle. Habitation et
  decennale absentes (pas de besoin produit verifie).
- Univers semantique : 36 sujets cartographies, 35 avec page (97 %).

# RECHERCHE ORIGINALE

43 240 entreprises de courtage d'assurance, 18 regions, 104 departements, 8 265 communes.
Double calcul independant : **0 ecart**. Dataset CSV et JSON publics.

# DIGITAL PR

- Cibles qualifiees : 22 (5 tier 1 : PLANETE CSCA, Sycra, La Tribune de l'Assurance, News Assurances Pro, ACA).
- Messages prets : 20, chacun avec un contenu reel du destinataire cite et ses deux relances.
- Envoyes : **0**. Reponses : **0**. Couverture : **0**.

# BACKLINKS

**Aucun lien live.** Le registre (`14_BACKLINK_LEDGER.csv`) est vide et l'ecrit explicitement : un lien
ne sera inscrit qu'apres verification HTTP de la page qui le porte.

# PROFILS SAAS

Statut **NOT_STARTED** pour Capterra, GetApp, G2, Appvizer, Trustpilot : la creation demande une
verification par e-mail avec une adresse officielle (action humaine). Descriptifs et captures prets.

# GSC

Position de `logiciel pour courtier en assurance` : **13,0** au T0. Aucun nouveau releve disponible
depuis (meme jour). Watchlist de 17 requetes et 16 pages en place, statut `PENDING_GOOGLE`.

# BUSINESS

| Indicateur | Valeur reelle |
|---|---|
| Leads organiques reels | **0** |
| Demandes de demonstration reelles | **0** (5 en base, toutes marquees de test) |
| Essais crees via le SEO | 0 |
| Clients | 0 |
| MRR SEO | non calculable (paiement non configure) |

# PRODUCTION

Commit `668d668d`, deploiement `Age`, alias `courtiark.fr`, gate production 93 URL / 0 echec.

# PENDING_GOOGLE

Indexation des 93 pages, lecture de `features-v2.xml`, retrait progressif des 1 065 pages locales
heritees, evolution des positions et du CTR.

# PENDING_EXTERNAL

Reponses des 22 cibles presse (aucun envoi), creation des profils annuaires, premier lead organique.

# BLOCKERS REELS

1. Paiement en ligne non configure cote serveur (`checkout_ready: false`) : aucun essai ne peut devenir
   client en libre-service, donc aucun MRR SEO calculable.
2. Aucune autorisation d'envoi pour les relations presse : 20 messages prets, non envoyes.
3. Donnees CrUX insuffisantes pour des Core Web Vitals terrain (`FIELD_DATA_INSUFFICIENT`).
4. Sources FINMA et Legifrance refusant nos requetes automatisees : verification faite en navigateur.

# 7 PROCHAINS JOURS (base sur des preuves)

1. Autorisation d'envoi -> premier lot de 5 messages (PLANETE CSCA, Courtage Magazine, ACA, Sycra, podcast).
2. Releve Search Console T+7 : indexation des 93 pages, position de la requete money, CTR des pages a
   forte impression.
3. Creation des profils Capterra et Appvizer (verification e-mail), puis `sameAs` mis a jour **apres**
   verification du profil live.
4. Suivi des reponses presse et des liens obtenus dans le registre.
5. Premier lead reel : documenter l'origine exacte (page, requete, campagne) des qu'il arrive.
