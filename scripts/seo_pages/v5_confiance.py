#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v5_confiance.py — CONFIANCE, MÉTHODE ET TRANSPARENCE (E-E-A-T) + page neutre d'évaluation.

Décisions : `passN_redteam_serp` — page de marque/entité true 0,96 (collision de marque mesurée : un
autre acteur nommé « CourtIA » apparaît sur la requête « CRM courtier assurance »), page comparative
honnête true 0,88, parcours d'essai true 0,83.

Règles tenues : aucune revendication de conformité, aucune certification inventée, aucun chiffre de
performance, aucune donnée client. Les limites du produit sont écrites explicitement.
"""
PAGES = {}


def fpage(chemin=None, intention=None, liens=None, motscles=None, **kw):
    kw.pop("chemin", None)
    kw["fil"] = [("Accueil", "/"), ("France", "/fr"), (kw["h1"][:44], "/" + chemin.strip("/"))]
    kw["maillage"] = [(titre, "/" + url.strip("/"), "à lire aussi") for url, titre in (liens or [])]
    return kw


PAGES["fr/courtia-logiciel-courtage-assurance"] = fpage(
    chemin="fr/courtia-logiciel-courtage-assurance",
    intention="La personne qui a vu le nom COURTIA dans un résultat et veut savoir de quel éditeur il "
              "s'agit, ce que le produit fait, sur quels marchés et à quel prix.",
    liens=[("fr/logiciel-courtier-assurance", "Le produit, fonction par fonction"),
           ("fr/methode-editoriale-courtia", "Notre méthode éditoriale"),
           ("fr/sources-courtia", "Nos sources"),
           ("fr/historique-corrections-courtia", "Historique des corrections"),
           ("fr/tarifs-logiciel-courtier", "Les tarifs publics")],
    motscles=["courtia", "courtia courtage", "éditeur logiciel courtier assurance"],
    titre="COURTIA : le logiciel de gestion pour courtiers en assurance — éditeur",
    description="COURTIA est un logiciel de gestion et cockpit d'assistance IA pour courtiers et cabinets "
                "de courtage, en France (EUR) et en Suisse (CHF). Qui édite, ce que fait le produit, "
                "quels marchés, quel prix.",
    h1="COURTIA : qui édite, pour qui, sur quels marchés",
    corps="""
<p>Ce nom apparaît dans les résultats de recherche à côté d'autres outils. Cette page existe pour lever
une ambiguïté simple : <strong>COURTIA, édité sur courtiark.fr, est un logiciel de gestion et un cockpit
d'assistance pour courtiers et cabinets de courtage en assurance</strong>, en France et en Suisse.</p>

<h2>Ce qu'est COURTIA</h2>
<ul>
<li><strong>Un logiciel de gestion de cabinet de courtage</strong> : dossier client, contrats et
échéances, devis et propositions, documents et pièces, commissions, sinistres, conformité, pilotage.</li>
<li><strong>Un cockpit d'assistance</strong> : relances préparées, priorités du jour, résumés et
extractions assistés — toujours validés par le cabinet.</li>
<li><strong>Deux marchés, deux cadres</strong> : France (EUR, ORIAS, DDA) et Suisse (CHF, FINMA, UID,
canton, nLPD) — les grilles et les référentiels diffèrent.</li>
</ul>

<h2>Ce que COURTIA n'est pas</h2>
<p>Ce n'est ni un comparateur grand public, ni un réseau d'apporteurs d'affaires, ni un cabinet de
courtage : l'éditeur ne vend aucune assurance et ne conseille aucun assuré. Ce n'est pas non plus une
place de marché entre courtiers, et aucun contenu de ce site ne constitue un conseil juridique ou
réglementaire.</p>

<h2>Marques et entités proches</h2>
<p>D'autres acteurs utilisent un nom proche. Pour éviter les confusions : l'éditeur de COURTIA publie sur
<strong>courtiark.fr</strong>, les contenus de ce site sont écrits par l'équipe produit, et le contact
éditorial comme commercial passe par <strong>contact@courtiark.fr</strong>. Si vous cherchez une autre
société portant un nom voisin, vous n'êtes pas sur le bon site.</p>

<h2>Comment vérifier ce que nous disons</h2>
<p>Trois moyens, sans compte et sans démarche commerciale : la
<a href="/fr/logiciel-courtier-assurance">description fonction par fonction</a>, la
<a href="/demo-public">démonstration publique</a> sur un cabinet fictif avec des données synthétiques, et
les <a href="/fr/demo-et-essai-gratuit">conditions de l'essai gratuit</a>. Notre
<a href="/fr/methode-editoriale-courtia">méthode éditoriale</a> et notre
<a href="/fr/historique-corrections-courtia">historique de corrections</a> sont également publics : nous
préférons montrer comment nous travaillons plutôt que d'affirmer une position que personne ne peut
contrôler.</p>
""",
    faq=[
        ("COURTIA vend-il des assurances ?",
         "Non. COURTIA est un logiciel : l'éditeur ne vend pas de contrat d'assurance et ne conseille pas "
         "les assurés."),
        ("Le produit fonctionne-t-il en Suisse ?",
         "Oui : les montants sont en francs, les référentiels suisses sont pris en compte (FINMA, UID, "
         "canton) et le produit ne revendique aucune conformité automatique."),
        ("Comment être sûr qu'il s'agit bien de cet éditeur ?",
         "Le domaine de référence est courtiark.fr et le contact est contact@courtiark.fr. Les mentions "
         "légales du site précisent l'éditeur."),
    ],
)

PAGES["fr/methode-editoriale-courtia"] = fpage(
    chemin="fr/methode-editoriale-courtia",
    intention="Le lecteur qui veut savoir sur quoi reposent les affirmations d'un éditeur de logiciel, et "
              "qui vérifie avant d'accorder sa confiance.",
    liens=[("fr/courtia-logiciel-courtage-assurance", "COURTIA : éditeur et périmètre"),
           ("fr/sources-courtia", "Nos sources"),
           ("fr/historique-corrections-courtia", "Historique des corrections"),
           ("fr/cartographie-courtiers-assurance-france", "Cartographie des courtiers (méthode et limites)")],
    motscles=["méthode éditoriale logiciel assurance", "sources contenu logiciel courtier", "transparence éditeur"],
    titre="Notre méthode éditoriale — COURTIA",
    description="Comment les contenus de COURTIA sont écrits, vérifiés, datés et corrigés : faits "
                "vérifiés dans le produit, sources identifiées, aucun chiffre inventé, corrections "
                "publiées.",
    h1="Comment nous écrivons ces pages",
    corps="""
<p>Ce site publie des contenus sur un marché où beaucoup d'affirmations ne peuvent pas être vérifiées :
« le meilleur », « n°1 », « +X heures par semaine ». Nous avons adopté six règles, et elles sont
contrôlables.</p>

<h2>1. Chaque fonction décrite a été vérifiée dans le produit</h2>
<p>Quand une page dit qu'une fonction existe, elle a été vérifiée dans le code du produit. Cette règle a
déjà produit deux corrections publiques : deux sujets avaient été écartés sur la base d'une description
inexacte de ce que fait le logiciel (voir l'<a href="/fr/historique-corrections-courtia">historique des
corrections</a>).</p>

<h2>2. Aucun chiffre de performance n'est publié</h2>
<p>Nous n'avons aucune mesure du temps des cabinets de courtage. Nous n'affichons donc ni heures
économisées, ni pourcentages de productivité, ni classements. Quand une page parle de gains de temps, elle
décrit des enchaînements de travail, jamais des minutes promises.</p>

<h2>3. Les seuls chiffres publiés viennent de sources identifiées</h2>
<p>La <a href="/fr/cartographie-courtiers-assurance-france">cartographie des courtiers</a> publie des
comptages réels issus de la base SIRENE (code d'activité 66.22Z) et de la population INSEE, avec la date
d'extraction, la méthode et les limites de lecture. Ces données sont réutilisables avec mention de la
source.</p>

<h2>4. Ce que le produit ne fait pas est écrit sur la page</h2>
<p>Chaque page produit se termine par ce que le logiciel ne fait pas : le produit ne déclare pas un
sinistre, ne calcule aucune indemnisation, ne délivre aucune attestation, ne produit aucun conseil
juridique et ne revendique aucune conformité automatique.</p>

<h2>5. Les limites sont explicites</h2>
<p>Les pages de méthode expliquent aussi leurs faiblesses : les chiffres par défaut des calculateurs sont
des hypothèses à corriger, la mesure organique n'est pas disponible pour nous, et nos contenus n'ont pas
de mesure de position à donner.</p>

<h2>6. Les corrections sont publiées</h2>
<p>Quand une erreur est constatée — dans un contenu, une donnée ou une fonction — elle est corrigée et
inscrite dans l'<a href="/fr/historique-corrections-courtia">historique des corrections</a>, avec sa
date. Un site qui ne montre aucune correction est un site qui n'en fait pas.</p>
""",
    faq=[
        ("Vos contenus sont-ils écrits par des experts du courtage ?",
         "Ils sont écrits et vérifiés par l'équipe produit de COURTIA, à partir du comportement réel du "
         "logiciel et de sources publiques identifiées. Nous ne revendiquons pas de qualification "
         "professionnelle en courtage, et nous le disons."),
        ("Qui vérifie ce que vous publiez ?",
         "Les affirmations sont vérifiées par mesure (fichiers publiés, code du produit, données "
         "sources), et les décisions de création ou de refus de pages sont arbitrées par un modèle de "
         "décision dont les seuils sont fixés dans nos scripts."),
        ("Recevez-vous de l'argent pour classer des concurrents ?",
         "Non. Nous ne publions aucun classement de logiciels concurrents et nous ne nommons aucun "
         "concurrent dans nos contenus."),
    ],
)

PAGES["fr/sources-courtia"] = fpage(
    chemin="fr/sources-courtia",
    intention="Le lecteur qui veut vérifier l'origine des données publiées avant de les reprendre.",
    liens=[("fr/cartographie-courtiers-assurance-france", "La cartographie des courtiers"),
           ("fr/methode-editoriale-courtia", "Notre méthode éditoriale"),
           ("fr/historique-corrections-courtia", "Historique des corrections"),
           ("fr/gagner-du-temps-courtier-assurance", "Le cluster gagner du temps")],
    motscles=["sources courtia", "données courtage france sources", "base sirene courtiers"],
    titre="Nos sources — COURTIA",
    description="Les sources utilisées par les contenus de COURTIA, avec date d'extraction, périmètre et "
                "conditions de réutilisation. Aucune donnée client, aucune donnée inventée.",
    h1="Nos sources, et ce qu'elles ne permettent pas de dire",
    corps="""
<p>Nous distinguons trois natures de contenu, et chacune a sa source : les données publiques, les
constatations produit, et l'analyse de marché.</p>

<h2>Données publiques utilisées</h2>
<table>
<tr><th>Source</th><th>Usage</th><th>Périmètre</th><th>Date</th></tr>
<tr><td>Base SIRENE (DINUM, data.gouv.fr), code d'activité NAF 66.22Z</td>
<td>Cartographie des établissements de courtage en France ; comptages par commune, département et région</td>
<td>Établissements, lieu d'activité</td><td>Extraction du 19/09/2026</td></tr>
<tr><td>Données de population INSEE</td><td>Calcul de densité pour 10 000 habitants sur les pages locales</td>
<td>Population communale</td><td>Même extraction</td></tr>
<tr><td>Pages comparatives et géographiques</td><td>Publient des comptages et des totaux calculés depuis ces deux sources</td>
<td>Voir la cartographie pour la méthode complète</td><td>19/09/2026</td></tr>
</table>
<p>Toute reprise de ces comptages doit mentionner la source et la date. Le détail par département ou
commune peut être transmis sur demande motivée à contact@courtiark.fr.</p>

<h2>Constatations produit</h2>
<p>Les descriptions fonctionnelles proviennent du code et du comportement du logiciel : elles peuvent être
vérifiées en créant un essai ou en consultant la démonstration publique. Aucune donnée client réelle n'est
utilisée : la démonstration repose sur un cabinet fictif et des données synthétiques, et nos captures le
mentionnent.</p>

<h2>Analyse de marché : ce que nous nous interdisons</h2>
<p>Nous n'attribuons aucun volume de recherche, aucune part de marché, aucune position et aucun
classement : nous n'avons pas accès à Search Console, à un outil de mesure de positions ou à un panel de
cabinets. Ce que nous publions sur le marché se limite à ce que des sources publiques permettent de
compter, avec leur date et leur périmètre.</p>

<h2>Comment signaler une erreur</h2>
<p>Une donnée erronée, une source mal citée, un chiffre obsolète : écrivez à contact@courtiark.fr. La
correction est publiée dans l'<a href="/fr/historique-corrections-courtia">historique des corrections</a>
avec sa date.</p>
""",
    faq=[
        ("Puis-je reprendre vos comptages dans un article ?",
         "Oui, avec mention de la source (base SIRENE, code NAF 66.22Z, extraction du 19/09/2026) et un "
         "lien vers la page. Le détail par commune est disponible sur demande."),
        ("Utilisez-vous des données de vos clients ?",
         "Non. Aucun contenu public n'utilise de donnée client : ni identité, ni portefeuille, ni "
         "statistique issue de comptes utilisateurs."),
        ("Vos pages sur le marché suisse reposent-elles sur des données ?",
         "Elles décrivent le cadre suisse et le produit ; nous n'avons pas de source publique suisse "
         "équivalente à SIRENE pour compter les intermédiaires, et nous ne l'inventons pas."),
    ],
)

PAGES["fr/historique-corrections-courtia"] = fpage(
    chemin="fr/historique-corrections-courtia",
    intention="Le lecteur qui veut savoir si un éditeur corrige réellement ce qu'il publie.",
    liens=[("fr/methode-editoriale-courtia", "Notre méthode éditoriale"),
           ("fr/sources-courtia", "Nos sources"),
           ("fr/sinistres-courtier-assurance", "Le suivi des sinistres (page issue d'une correction)"),
           ("fr/conformite-courtier-assurance", "La conformité (page issue d'une correction)")],
    motscles=["corrections courtia", "transparence contenu logiciel", "historique corrections"],
    titre="Historique des corrections — COURTIA",
    description="Les erreurs constatées dans nos contenus, nos données ou notre produit, et ce qui a été "
                "corrigé : corrections publiées avec leur date.",
    h1="Ce que nous avons corrigé, et pourquoi",
    corps="""
<p>Cette page recense les corrections constatées et appliquées. Elle existe parce qu'une publication sans
correction visible est une publication dont on ne peut pas évaluer la fiabilité.</p>

<h2>22 septembre 2026 — deux jugements fondés sur une description inexacte du produit</h2>
<p>Deux sujets — le <strong>suivi des sinistres</strong> et la <strong>conformité du cabinet</strong> —
avaient été écartés d'un plan éditorial parce qu'ils avaient été décrits comme absents du logiciel. La
vérification du code a montré l'inverse : le produit contient un module sinistres (déclaration, suivi,
résumé assisté) et un module conformité (checklist du devoir de conseil par client, vérification
d'identité, suivi des mandats, journal d'audit). Les deux sujets ont été réexaminés et publiés :
<a href="/fr/sinistres-courtier-assurance">suivi des sinistres</a>,
<a href="/fr/conformite-courtier-assurance">conformité</a>. Leçon retenue et inscrite dans notre méthode :
aucun arbitrage ne se prend sans vérifier d'abord ce que le produit fait réellement.</p>

<h2>22 septembre 2026 — une page affichait des nombres au format anglo-saxon</h2>
<p>Sur la page de données, le total et les pourcentages s'affichaient « 43,037 » et « 23.4 % ». Corrigé en
« 43 037 » et « 23,4 % », et vérifié sur la production. Un défaut de présentation sur une page de données
déscridibilise l'ensemble du travail : il a été traité comme un défaut, pas comme un détail.</p>

<h2>22 septembre 2026 — des pages perdaient leur contenu après régénération</h2>
<p>Les pages sont générées par script puis enrichies. Une régénération écrasait les blocs ajoutés ensuite :
les pages répondaient correctement mais sans certaines sections. Un contrôle de fin de passe vérifie
désormais la présence réelle des blocs attendus dans les fichiers publiés, et l'ordre des étapes est
imposé par un orchestrateur unique.</p>

<h2>22 septembre 2026 — le sitemap suisse ne déclarait pas toutes les pages suisses</h2>
<p>Le sitemap suisse était alimenté par une liste écrite à la main : 12 URL déclarées pour 21 pages
réellement publiées. Il est désormais régénéré depuis les fichiers, comme celui de France, avec un
contrôle qui exige zéro page manquante.</p>

<h2>22 septembre 2026 — un défaut produit visible sur une page publique</h2>
<p>La démonstration publique affichait « Score moyen undefined/100 » sur un écran d'analyse : un champ
manquait dans la réponse simulée. Corrigé, avec un test de non-régression et une contre-épreuve (retirer
les champs fait échouer le test), puis vérifié en production.</p>

<h2>Comment nous signaler une erreur</h2>
<p>Écrivez à contact@courtiark.fr en précisant la page et l'élément concerné. Toute correction constatée est
inscrite ici avec sa date : nous ne retirons pas silencieusement un contenu.</p>
""",
    faq=[
        ("Pourquoi publier vos erreurs ?",
         "Parce qu'un lecteur doit pouvoir juger la fiabilité d'un éditeur. Un historique vide signifie "
         "soit qu'on ne vérifie rien, soit qu'on cache."),
        ("Les corrections sont-elles datées ?",
         "Oui, chaque entrée porte sa date et la nature du défaut constaté."),
        ("Comment signaler une correction ?",
         "Par courriel à contact@courtiark.fr, en indiquant la page concernée."),
    ],
)

PAGES["fr/evaluer-crm-courtier-assurance"] = fpage(
    chemin="fr/evaluer-crm-courtier-assurance",
    intention="Le responsable de cabinet qui compare des solutions et cherche une grille de lecture neutre "
              "plutôt qu'un classement de fournisseurs.",
    liens=[("fr/logiciel-courtier-assurance", "Le produit, fonction par fonction"),
           ("fr/comparatif/crm-specialise-vs-crm-generaliste", "CRM spécialisé ou CRM généraliste"),
           ("fr/comparatif/crm-courtier-vs-excel", "CRM ou Excel"),
           ("fr/import-portefeuille-courtier-assurance", "La reprise d'un portefeuille existant")],
    motscles=["comment choisir crm courtier assurance", "évaluer logiciel courtage", "critères crm assurance"],
    titre="Comment évaluer un CRM pour courtier en assurance — COURTIA",
    description="Une grille de treize critères pour évaluer un logiciel de courtage, comment tester "
                "chacun, les questions à poser à un éditeur — et où COURTIA se situe, factuellement.",
    h1="Comment évaluer un CRM pour courtier en assurance",
    corps="""
<p>Aucun éditeur ne vous donnera une grille neutre : c'est pour cela que celle-ci commence par les
critères, puis indique honnêtement où se situe COURTIA — y compris là où ce n'est pas notre point fort.
Utilisez-la avec n'importe quelle solution, y compris la nôtre.</p>

<h2>Les treize critères, et comment les tester</h2>
<table>
<tr><th>Critère</th><th>Le test à faire réellement</th></tr>
<tr><td>Dossier client</td><td>Créer un client fictif avec trois contrats et vérifier ce qui se voit sans ouvrir de pièce jointe.</td></tr>
<tr><td>Prospects et pipeline</td><td>Enregistrer un prospect, le déplacer d'étape, et voir si une action datée existe.</td></tr>
<tr><td>Documents et pièces</td><td>Demander une pièce à un client de test : combien de manipulations pour lui et pour vous ?</td></tr>
<tr><td>Automatisation</td><td>Vérifier ce qui se déclenche seul et ce qui exige une validation : demandez la liste exacte.</td></tr>
<tr><td>IA</td><td>Demander quelle donnée est envoyée à quel service, et ce qui est fait du résultat.</td></tr>
<tr><td>Communications</td><td>Tester e-mail, appel, message : l'historique reste-t-il rattaché au dossier ?</td></tr>
<tr><td>Conformité</td><td>Demander comment se prouve, dossier par dossier, ce qui a été vérifié et quand.</td></tr>
<tr><td>Équipe et droits</td><td>Inviter un collaborateur de test et vérifier ce qu'il voit — et ce qu'il ne voit pas.</td></tr>
<tr><td>Reporting</td><td>Demander d'où vient chaque indicateur et ce qui s'affiche quand une donnée manque.</td></tr>
<tr><td>Intégrations</td><td>Lister les connexions réellement disponibles aujourd'hui, pas celles prévues.</td></tr>
<tr><td>Sécurité</td><td>Demander comment les accès sont cloisonnés et ce qui est journalisé.</td></tr>
<tr><td>Tarification</td><td>Demander le prix public, par utilisateur ou par cabinet, et ce qui compte comme utilisateur.</td></tr>
<tr><td>Migration</td><td>Demander comment repartir d'un fichier existant et ce qui est repris automatiquement.</td></tr>
</table>

<h2>Les cinq questions à poser à un éditeur</h2>
<ol>
<li>Que se passe-t-il si je veux partir dans deux ans ? (export, formats, délais)</li>
<li>Quelles fonctions sont incluses dans l'offre que je regarde, et lesquelles sont facturées en plus ?</li>
<li>Qui, chez vous, accède à mes données, et dans quel cadre ?</li>
<li>Quelles fonctions ne faites-vous pas, et à qui devrais-je m'adresser pour elles ?</li>
<li>Montrez-moi l'outil avec mes données, pas avec les vôtres.</li>
</ol>

<h2>Où COURTIA se situe, factuellement</h2>
<ul>
<li><strong>Couvert :</strong> dossier client, contrats et échéances, devis et propositions, documents et
collecte de pièces, relances préparées, commissions, sinistres, conformité (checklist, vérification
d'identité, mandats, journal d'audit), équipe et rôles, reporting, reprise de portefeuille par import,
synchronisation d'agenda, WhatsApp Business, extraction de données de documents, dictée de comptes rendus.</li>
<li><strong>Non couvert / partiel :</strong> comptabilité et facturation générale, émission de contrats à la
place d'un assureur, comparateur grand public, palmarès d'assureurs, gestion de flotte avec cartographie,
signature électronique intégrée de bout en bout.</li>
<li><strong>Marchés :</strong> France et Suisse (grilles et référentiels distincts, EUR et CHF).</li>
<li><strong>Essai :</strong> essai gratuit de 7 jours, et une démonstration publique consultable sans compte
sur un cabinet fictif.</li>
<li><strong>Ce que nous ne faisons pas :</strong> aucun classement de concurrents, aucune promesse
chiffrée de productivité, aucune certification de conformité revendiquée.</li>
</ul>
""",
    faq=[
        ("Cette grille avantage-t-elle COURTIA ?",
         "Elle nomme explicitement ce que COURTIA ne fait pas (comptabilité, émission de contrats, signature "
         "de bout en bout) et n'attribue aucun score. Les critères servent à interroger n'importe quel "
         "éditeur."),
        ("Peut-on l'utiliser pour comparer deux solutions concurrentes ?",
         "Oui : les tests sont décrits de façon à être reproduits sur chaque outil, sans citer de "
         "concurrent."),
        ("Combien de temps prend cette évaluation ?",
         "Une demi-journée suffit pour les treize critères si l'éditeur vous laisse un environnement "
         "d'essai avec vos propres données fictives."),
    ],
)

PAGES["fr/demo-et-essai-gratuit"] = fpage(
    chemin="fr/demo-et-essai-gratuit",
    intention="Le visiteur qui veut voir le produit avant de donner ses coordonnées ou de payer.",
    liens=[("fr/courtia-logiciel-courtage-assurance", "COURTIA : éditeur et périmètre"),
           ("fr/logiciel-courtier-assurance", "Le produit, fonction par fonction"),
           ("fr/tarifs-logiciel-courtier", "Les tarifs publics"),
           ("fr/evaluer-crm-courtier-assurance", "La grille d'évaluation")],
    motscles=["démo logiciel courtier assurance", "essai gratuit crm assurance", "tester logiciel courtage"],
    titre="Voir COURTIA : démonstration publique et essai gratuit — COURTIA",
    description="Ce que montre la démonstration publique (cabinet fictif, données synthétiques), ce que "
                "contient l'essai gratuit de 7 jours, et comment vérifier le produit sans engagement.",
    h1="Voir le produit avant de parler à quiconque",
    corps="""
<p>Il n'y a pas besoin de laisser un numéro pour regarder un logiciel. Cette page explique ce qui est
accessible sans compte, ce que contient l'essai, et ce qui se passe ensuite.</p>

<h2>Ce qui est consultable sans compte</h2>
<ul>
<li><strong>La démonstration publique</strong> : un cabinet fictif (« Cabinet Horizon Assurances ») avec
des données synthétiques — dossier client, contrats, échéances, devis, commissions, écrans d'analyse. Aucune
donnée client réelle n'y figure, et les captures publiées sur ce site le mentionnent.</li>
<li><strong>Les pages fonction par fonction</strong> : ce que chaque fonction fait, et ce qu'elle ne fait
pas.</li>
<li><strong>Les deux calculateurs</strong> : le
<a href="/fr/outils/calculateur-temps-administratif">temps administratif</a> et le
<a href="/fr/outils/calculateur-roi-courtia">retour sur investissement</a>, utilisables sans compte et sans
transmission de données.</li>
<li><strong>La grille d'évaluation</strong> : pour interroger n'importe quel éditeur, y compris nous.</li>
</ul>

<h2>Ce que contient l'essai gratuit</h2>
<p>L'essai gratuit dure 7 jours. Il sert à faire ce qu'aucune démonstration ne permet : créer vos propres
dossiers et voir si le produit tient votre façon de travailler. Trois conseils pour l'utiliser vraiment :</p>
<ol>
<li><strong>Apportez trois dossiers réels</strong> (avec des données de test ou anonymisées) : un dossier
simple, un dossier multi-contrats, un dossier en cours de renouvellement.</li>
<li><strong>Testez la fonction qui vous coûte le plus de temps</strong> aujourd'hui, pas la plus
impressionnante.</li>
<li><strong>Vérifiez la sortie</strong> : si vous décidez de ne pas continuer, ce que vous avez saisi doit
pouvoir sortir — posez la question avant de commencer.</li>
</ol>

<h2>Ce qui se passe à la fin de l'essai</h2>
<p>Les conditions précises de l'essai, de l'abonnement et de la résiliation sont écrites dans les
conditions générales et sur la <a href="/fr/tarifs-logiciel-courtier">page des tarifs</a>, offre par offre.
Nous ne faisons figurer ici aucune condition qui ne soit dans ces documents.</p>

<h2>Ce que nous ne promettons pas</h2>
<p>Ni gain de temps chiffré, ni résultat de classement, ni conformité automatique. Un logiciel change
l'organisation d'un cabinet ; il ne remplace ni le conseil ni la relation client, et le temps que vous
récupérerez dépend de votre cabinet — c'est vous qui l'estimez, avec les calculateurs.</p>
""",
    faq=[
        ("Faut-il un compte pour voir le produit ?",
         "Non : la démonstration publique et les calculateurs sont consultables sans compte."),
        ("La démonstration contient-elle des données réelles ?",
         "Non. Elle repose sur un cabinet fictif et des données synthétiques ; c'est indiqué dans la "
         "démonstration et dans les captures publiées."),
        ("Que deviennent mes données si je ne continue pas ?",
         "Les conditions applicables sont écrites dans les conditions générales et la page tarifs. Demandez "
         "les modalités d'export avant de commencer : c'est la bonne pratique, quel que soit l'éditeur."),
    ],
)
