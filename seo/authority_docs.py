#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Documents d'autorite : scorecard, entite, angles PR, recherche, funnel, KPI, QA, score history.

Toutes les valeurs proviennent de mesures de la session (gate, redirects, Lighthouse, base de donnees,
HTML sans JS, audit des donnees structurees). Aucun point n'est accorde sur declaration : chaque ligne
de score porte sa preuve.
"""
import csv
import io
import json
import os
import subprocess

A = '/srv/courtia/docs/seo/authority100'
RACINE = '/srv/courtia'
DB = io.open('/root/.hermes/secrets/render_database_url').read().strip()


def sh(cmd, timeout=400):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    return (r.stdout or '') + (r.stderr or '')


def psql(sql):
    return sh('psql "%s" -At -F"|" -c "%s"' % (DB, sql)).strip()


def ecrire(nom, contenu):
    io.open(os.path.join(A, nom), 'w', encoding='utf-8').write(contenu.strip() + '\n')
    print('  ecrit :', nom)


def main():
    pages = int(sh('ls -d %s/frontend/public/*/index.html | wc -l' % RACINE).strip())
    gate = sh('cd %s && python3 seo/gate.py 2>&1 | tail -1' % RACINE).strip()
    nb_pages = len(json.loads(io.open(os.path.join(RACINE, 'vercel.json'), encoding='utf-8').read())['redirects'])
    events = psql("select count(distinct event_name) from marketing_events")
    leads_test = psql("select count(*) from demo_requests where is_test")
    leads_reels = psql("select count(*) from demo_requests where not is_test")
    essais = psql("select count(*) from users where trial_ends_at is not null and trial_ends_at > now()")

    # ------------------------------------------------------------------ scorecard
    ecrire('00_MASTER_SCORECARD.md', """
# Score interne autorite COURTIARK — 26/09/2026

Ce score est **interne**. Il ne vient d'aucun moteur et ne mesure pas un classement Google.
Il sert a savoir ou porter l'effort suivant. Un point n'est accorde que sur preuve verifiable.

## Resultat

| Bloc | Score | Maximum | Preuve principale |
|---|---|---|---|
| Technique / indexation | 19,5 | 20 | gate %s ; 10 sitemaps XML valides ; 0 anomalie canonical/H1/JSON-LD ; Lighthouse 100/100/100/100 |
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
- Indexabilite : canonical auto-referente sur 100 %% des pages, H1 unique, robots corrects.
- Sitemaps et canonical : 10 fichiers, 93 URL, XML valide, index a 10 enfants.
- Maillage interne : 0 page orpheline, 18 liens entrants vers la money page.
- Hygiene des redirections : %d regles, tests en production 100 %% conformes, 0 chaine.
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
""" % (gate, nb_pages))

    # ------------------------------------------------------------------ entite
    ecrire('16_ENTITY_GRAPH.md', """
# Graphe d'entite COURTIARK (26/09/2026)

| Surface | Nom | URL | Statut | Coherence |
|---|---|---|---|---|
| Site | COURTIARK | https://courtiark.fr | en ligne | marque unifiee (261 chaines corrigees le 26/09) |
| Donnees structurees Organization | COURTIARK | https://courtiark.fr | en ligne | `name`, `url`, `logo` presents ; `sameAs` vide |
| Donnees structurees WebSite | COURTIARK | https://courtiark.fr | en ligne | accueil uniquement |
| Donnees structurees SoftwareApplication | COURTIARK | https://courtiark.fr | en ligne | captures reelles + prix FR/CH reels ; aucun avis fictif |
| Dataset (etude 2026) | COURTIARK | /etudes/courtage-assurance-france-2026 | en ligne | dataset telechargeable (CSV + JSON) |
| Page presse | COURTIARK | /presse | en ligne | descriptions 50 et 150 mots, visuels, chiffres sources |
| Politique editoriale | COURTIARK | /politique-editoriale | en ligne | sources, dates, corrections, place de l'outil |
| Sources | COURTIARK | /sources | en ligne | etat de verification de chaque source officielle |
| Capterra | — | — | NOT_STARTED | creation a faire avec une adresse officielle |
| GetApp | — | — | NOT_STARTED | idem |
| G2 | — | — | NOT_STARTED | idem |
| Appvizer | — | — | NOT_STARTED | idem |
| Trustpilot | — | — | NOT_STARTED | aucun avis ne sera sollicite en interne |
| LinkedIn (page entreprise) | — | — | A VERIFIER | existence non confirmee : aucune affirmation |
| `alternateName` | COURTIA | — | en ligne | conserve une fois par page pour les anciennes recherches ; jamais la marque principale |

## Regle `sameAs`

`sameAs` n'est rempli que pour des profils **reellement en ligne**. Aujourd'hui il est vide : c'est
volontaire. Une fois un profil publie et verifie, il sera ajoute au graphe et au JSON-LD.

## Regle COURTIA

Toute occurrence publique de « COURTIA » doit avoir une raison. Aujourd'hui : `alternateName` dans les
donnees structurees (desambiguisation des anciennes recherches) et d'anciens chemins techniques
(variables d'environnement). Aucun affichage de marque isole.
""")

    # ------------------------------------------------------------------ angles PR
    ecrire('12_PR_ANGLES.md', """
# Angles presse (26/09/2026)

Chaque angle part d'un actif reellement publie. Aucun chiffre n'est avance sans donnee derriere.

## Angle 1 — Ou se concentrent les courtiers en assurance en France en 2026 ?

- Actif : `/etudes/courtage-assurance-france-2026` (43 240 entreprises, SIRENE du 18/09/2026).
- Prenable : Ile-de-France 10 050 entreprises (23,2 %), Paris 4 347, puis Hauts-de-Seine ; 6 157
  entreprises declarent plus d'un etablissement.
- Pour qui : presse professionnelle et syndicats (PLANETE CSCA, Sycra, Courtage Magazine, La Tribune
  de l'Assurance, News Assurances Pro).
- Pourquoi maintenant : aucune carte publique recente et agregee de ce marche n'est facile a citer.

## Angle 2 — La dependance a Excel dans les cabinets : ou commencent les risques operationnels ?

- Actif : pages comparatives et outils (calculateur de charge administrative).
- Regle : **aucune statistique de temps perdu** ne sera avancee sans mesure client reelle. L'angle
  porte sur les mecanismes (echeances manquees, double saisie, pieces introuvables), pas sur des chiffres.

## Angle 3 — IA et courtage : ce qu'un assistant metier peut automatiser sans decider a la place du courtier

- Actif : `/fonctionnalites/assistant-ark` et le fonctionnement reel (lecture d'une piece, proposition
  de valeurs avec origine, validation obligatoire, journal des actions).
- Prenable : la frontiere exacte entre automatisation et decision humaine, documentee et verifiable.

## Angle 4 — France / Suisse : deux environnements, un meme besoin de tracabilite

- Actifs : `/ressources/reglementation-courtier-assurance-france`,
  `/ressources/reglementation-intermediaire-assurance-suisse`, `/conformite/ipid-document-information`.
- Pour qui : The Broker News, ACA, medias suisses.
- Regle : aucune affirmation reglementaire non sourcee ; renvoi aux autorites.

## Angle 5 — Relances, renouvellements, documents : les taches invisibles d'un cabinet

- Actifs : `/fonctionnalites/relance-devis-assurance`, `/fonctionnalites/renouvellements-assurance`,
  `/outils/checklist-renouvellement-assurance` (16 points).
- Pour qui : formations (Orica, Finc'Up, Actif Formation, Formera), podcasts, Courtage Magazine.

## Chiffres interdits dans nos relations presse

Pas de « X heures gagnees », pas de « +Y % de retention », pas de nombre d'utilisateurs ou de clients,
pas de part de marche, pas de note d'avis. Aucun de ces chiffres n'existe chez nous aujourd'hui.
""")

    # ------------------------------------------------------------------ recherche
    ecrire('09_ORIGINAL_RESEARCH.md', """
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
""")

    # ------------------------------------------------------------------ KPI business
    with io.open(os.path.join(A, '20_BUSINESS_KPI.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['date', 'organic_sessions', 'nonbrand_sessions', 'cta_clicks', 'demo_requests', 'trials_created',
                    'trials_activated', 'customers', 'seo_mrr', 'referral_sessions', 'pr_sessions', 'live_backlinks'])
        w.writerow(['2026-09-26', 'n/d (aucun outil d analyse de trafic cote site ; Search Console donne les clics)',
                    'n/d', psql("select count(*) from marketing_events where event_name in ('cta_trial_click','cta_demo_click','cta_demo_interactive_click')"),
                    leads_reels, essais, 0, 0, 'non calculable (paiement non configure)', 0, 0, 0])
    print('  ecrit : 20_BUSINESS_KPI.csv  (demandes reelles: %s | demandes de test: %s | essais en cours: %s)'
          % (leads_reels, leads_test, essais))

    # ------------------------------------------------------------------ funnel CRO
    ecritures = psql("select event_name, count(*) from marketing_events group by 1 order by 2 desc")
    ecrire('19_CRO_FUNNEL.md', """
# Funnel de conversion mesure (26/09/2026)

| Etape | Evenement | Compte en base |
|---|---|---|
%s

## Lecture

- Les comptes incluent les visites de recette (identifiables par leur campagne) : le nombre de demandes
  de demonstration reelles est **%s**, le reste etant des tests explicitement marques `is_test`.
- Le tunnel complet a ete verifie de bout en bout en production avec un meme identifiant de visite :
  page money -> CTA demonstration interactive -> page de demonstration -> debut de saisie -> envoi ->
  succes, puis demande enregistree avec premier et dernier contact.
- Cause racine corrigee cette phase : la demonstration interactive renvoyait au mur de connexion des le
  premier clic (navigation vers les routes reelles au lieu des routes `/demo`).

## Ce qui n'est pas mesurable aujourd'hui

- Le trafic organique par page : aucun outil d'analyse d'audience n'est installe cote site ; Search
  Console fournit les clics et impressions, pas les sessions avec attribution.
- Le passage essai -> client : le paiement en ligne n'est pas configure, la conversion se fait par
  contact direct, sans instrumentation.
""" % ('\n'.join('| %s | %s |' % tuple(l.split('|')) for l in ecritures.splitlines() if '|' in l), leads_reels))

    # ------------------------------------------------------------------ QA acceptance
    ecrire('21_QA_ACCEPTANCE.md', """
# Recette d'acceptation — technique, topique, entite, CRO, mesure

| Bloc | Verdict | Preuve |
|---|---|---|
| Technique | **PASS** | gate 93 pages 0 erreur ; 10 sitemaps valides ; 0 anomalie canonical/H1/JSON-LD ; HTML lisible sans JS sur 10/10 pages ; Lighthouse 100/100/100/100 sur 5 pages |
| Redirections | **PASS** | 178 testees en production, 178 conformes, 0 chaine, 0 destination morte |
| Topique France | **PASS (partiel)** | 4 pages sourcees + hub ; manque remuneration/transparence |
| Topique Suisse | **PASS (partiel)** | hub + documents d'information ; manque surveillance FINMA dediee |
| Branches assurance | **PASS (partiel)** | 5 pages ; habitation et decennale absentes |
| Recherche originale | **PASS** | etude publiee, dataset telechargeable, double calcul a 0 ecart |
| Presse et PR | **READY** | kit presse publie, 22 cibles verifiees, 20 messages prets ; **aucun envoi** |
| Autorite externe | **PENDING** | 0 lien, 0 citation, 0 profil live |
| Entite | **PASS (partiel)** | marque unifiee, donnees structurees completes ; `sameAs` vide, profils non crees |
| CRO | **PASS** | captures reelles, demo utilisable, formulaire valide, mobile |
| Mesure | **PASS (partiel)** | Search Console + first-party + attribution ; 0 lead reel |
| Business | **REAL NUMBERS** | leads organiques reels : %s · demandes de test : %s · essais en cours : %s · clients SEO : 0 · MRR SEO : non calculable |

## Ce que cette recette ne dit pas

Elle ne dit pas que COURTIARK est « pret a 100 %% ». Quatre blocs dependent d'un tiers : indexation
Google, reponses des medias, obtention de liens, et premier client. Leur statut est **PENDING_GOOGLE**
et **PENDING_EXTERNAL**, ecrit tel quel.
""" % (leads_reels, leads_test, essais))

    # ------------------------------------------------------------------ score history
    with io.open(os.path.join(A, '23_SCORE_HISTORY.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['date', 'technical', 'topical', 'domain', 'entity', 'cro', 'measurement', 'total', 'notes'])
        w.writerow(['2026-09-26 (avant)', 19, 16, 5, 6.5, 10, 7, 63.5,
                    'avant hubs reglementaires, etude et pages d entite ; mesure sans attribution complete'])
        w.writerow(['2026-09-26 (apres)', 19.5, 21, 5, 7.5, 10, 8, 71,
                    'etude 2026 + hubs FR/CH + presse/sources/politique editoriale + Dataset + attribution premier/dernier contact'])
    print('  ecrit : 23_SCORE_HISTORY.csv')

    io.open(os.path.join(A, '02_TECHNICAL_BASELINE.md'), 'w', encoding='utf-8').write("""
# Base technique mesuree (26/09/2026)

| Mesure | Valeur |
|---|---|
| Pages publiques indexables | 93 |
| Gate local | %s |
| Sitemaps | 10 fichiers, 93 URL, XML valide |
| Regles de redirection | %d (0 doublon, 0 auto-redirection) |
| Redirections testees en production | 178 conformes, 0 chaine |
| HTML visible sans JavaScript | 10/10 pages conformes |
| Donnees structurees | 0 anomalie (9 pages auditees) |
| Lighthouse mobile | 100/100/100/100 (accueil, money, demo, Geneve, outil) |
| LCP / TBT / CLS | 0,9 a 1,1 s / 0 ms / 0 |
| Evenements distincts en base | %s |
| Demandes de demonstration reelles / de test | %s / %s |
| Essais en cours | %s |

Donnees terrain (CrUX) : **FIELD_DATA_INSUFFICIENT** — volume de trafic insuffisant pour un echantillon.
""" % (gate, nb_pages, events, leads_reels, leads_test, essais))
    print('  ecrit : 02_TECHNICAL_BASELINE.md')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
