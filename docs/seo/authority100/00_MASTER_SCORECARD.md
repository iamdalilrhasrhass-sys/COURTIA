# Score interne autorite COURTIARK — 26/09/2026

Ce score est **interne**. Il ne vient d'aucun moteur et ne mesure pas un classement Google.
Il sert a savoir ou porter l'effort suivant. Un point n'est accorde que sur preuve verifiable.

## Resultat

| Bloc | Score | Maximum | Preuve principale |
|---|---|---|---|
| Technique / indexation | 19,5 | 20 | gate 93 pages contrôlées · 0 en erreur · 0 paire(s) trop proche(s) ; 10 sitemaps XML valides ; 0 anomalie canonical/H1/JSON-LD ; Lighthouse 100/100/100/100 |
| Autorite topique | 21 | 25 | 93 pages ; hubs France et Suisse ; 5 pages branches ; etude originale + methodologie + dataset |
| Autorite externe (domaine) | 5 | 25 | actifs et 20 messages prets ; **aucun lien obtenu** |
| Entite / marque / confiance | 7,5 | 10 | marque unifiee ; Organization + SoftwareApplication + Dataset ; /presse, /sources, /politique-editoriale ; **0 profil externe live** |
| CRO / produit | 10 | 10 | 7 captures reelles, demo publique utilisable, formulaire valide, mobile, CTA mesurables |
| Mesure / acquisition | 8 | 10 | Search Console + first-party + attribution premier/dernier contact ; **0 lead reel** |
| **TOTAL** | **71** | **100** | |

Dont **controllable en interne : 71/75**. Dont **externe : 5/25** (citations, medias, associations,
profils : rien n'est obtenu tant qu'un tiers n'a pas repondu).

## Detail des points, preuve par preuve

### Technique 19,5/20
- HTML statique lisible sans JavaScript : verifie sur 10 pages (test `25_HTML_SANS_JS.md`).
- Core Web Vitals laboratoire : LCP 0,9 a 1,1 s, TBT 0 ms, CLS 0. Donnees terrain : insuffisantes
  (`FIELD_DATA_INSUFFICIENT`), aucun echantillon CrUX exploitable a ce volume.
- Indexabilite : canonical auto-referente sur 100 % des pages, H1 unique, robots corrects.
- Sitemaps et canonical : 10 fichiers, 93 URL, XML valide, index a 10 enfants.
- Maillage interne : 0 page orpheline, 18 liens entrants vers la money page.
- Hygiene des redirections : 194 regles, tests en production 100 % conformes, 0 chaine.
- Donnees structurees : 0 anomalie (audit `seo/audit_donnees_structurees.py`), aucun avis ni prix fictif.
- Sante technique Search Console : causes des 40 pages non indexees traitees ; reste
  « Exploree actuellement non indexee » pour 9 pages dont l'indexation est en file. **-0,5**.

### Autorite topique 21/25
- France reglementaire : 4 pages sourcees + hub (ne reformule pas les textes) — **4/5** : il manque une
  page dediee a la remuneration et a la transparence.
- Suisse : hub + documents d'information + page marche — **3/5** : pas de page dediee a la surveillance
  FINMA ni au registre.
- Courtage operationnel : couvert (portefeuille, clients, devis, documents, relances, renouvellements,
  commissions, reporting, outils) — **5/5**.
- Branches : 5 pages (sante, prevoyance, auto, multirisque, RC pro) — **4/5** : habitation et decennale
  absentes, et aucune n'est encore ecrite comme un cas d'usage complet.
- Recherche originale et actifs citables : etude 2026 + methodologie + dataset telechargeable + 4 outils
  gratuits — **5/5**.

### Autorite externe 5/25
Les actifs sont prets et les cibles qualifiees, mais **aucun lien ni citation n'existe a ce jour**.
Conformement au bareme, ce bloc reste dans la tranche « actifs et approche prets » :
- profils et citations legitimes : 1/5 (kit presse publie, fiche annuaires non creee)
- liens editoriaux de niche : 1/5 (20 messages personnalises, aucun envoye)
- medias assurance : 1/5 (5 cibles tier 1 identifiees et verifiees)
- associations et signaux institutionnels : 1/5 (PLANETE CSCA, Sycra, ACA, CNCEF prepares)
- diversite et continuite : 1/5 (registre et watchlist en place, aucune donnee)

### Entite 7,5/10
- Coherence de marque : 261 chaines corrigees, aucun affichage « COURTIA » isole — **2/2**.
- Organization et donnees structurees : Organization + WebSite + SoftwareApplication (avec captures et
  prix reels) + Dataset — **1,5/2** : `sameAs` vide, a remplir seulement quand des profils existeront.
- Profils externes reels : **0/2** (aucun).
- Confiance et legal : securite, confidentialite, mentions, contact, sources — **2/2**.
- Transparence editoriale et presse : politique editoriale, sources, journal des versions, kit presse — **2/2**.

### CRO 10/10
7 captures produit reelles integrees, demonstration publique utilisable (defaut de navigation corrige),
formulaire valide avec message de succes, mobile sans debordement, CTA « Voir COURTIARK en action »
present sur toutes les pages.

### Mesure 8/10
Search Console exploitee, mesure first-party, attribution premier et dernier contact verifiee en base,
marquage des tests. **-2** : aucun lead, essai ou client reel, et l'attribution essai vers client n'est
pas instrumentee cote produit (le paiement n'est pas configure).

## Ce qui ferait monter le score

| Action | Bloc | Gain estime | Depend de |
|---|---|---|---|
| Reponses des 5 premiers messages (presse/associations) | Externe | +5 a +8 | tiers |
| 5 a 8 domaines referents pertinents obtenus | Externe | +8 a +12 | tiers |
| Profils annuaires live (Capterra, GetApp, G2, Appvizer) | Entite + externe | +3 a +5 | action humaine (email) |
| Pages remuneration/transparence et surveillance FINMA | Topique | +2 | interne |
| Premier lead organique reel et premier essai | Business | +2 mesure | trafic + offre |
| Donnees terrain CrUX exploitables | Technique | +0,5 | volume de trafic |

## Regle de lecture

Le score **peut baisser** si une preuve s'avere invalide. Il ne sera jamais arrondi a 100 : a ce jour,
un « 100/100 » exigerait des citations externes qui n'existent pas.
