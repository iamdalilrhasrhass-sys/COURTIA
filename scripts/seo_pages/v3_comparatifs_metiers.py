#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v3_comparatifs_metiers.py — VAGUE 3, groupe « comparatifs et branches » (8 pages France).

Comparatifs : aucune affirmation sur un éditeur nommé, aucune fonctionnalité inventée chez un
concurrent. Ce sont des comparaisons de CATÉGORIES (spécialisé / généraliste / tableur / manuel) et
d'approches — la mission interdit le dénigrement et le fact-checking approximatif.

Branches : ajoute les segments absents (auto, habitation, entreprises, transport-flotte, décennale).
Chaque page décrit ce qui est spécifique à la branche et ce que le produit fait réellement
(contrats, échéances, pièces, renouvellements, commissions) — sans prétendre à une tarification ou à
une souscription automatique, qui n'existent pas dans le produit.
"""
PAGES = {}

# ── Comparatifs ───────────────────────────────────────────────────────────────

PAGES["fr/comparatif/crm-specialise-vs-crm-generaliste"] = dict(
    marche="FR",
    titre="CRM spécialisé courtage ou CRM généraliste : ce qui change — COURTIA",
    description=(
        "CRM spécialisé pour le courtage ou CRM généraliste : ce qui diffère réellement dans les "
        "objets suivis, les échéances, les pièces et les commissions. Comparaison de catégories."
    ),
    h1="CRM spécialisé courtage ou CRM généraliste : ce qui change vraiment",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Comparatifs", "/fr/comparatif/crm-specialise-vs-crm-generaliste")],
    maillage=[
        ("CRM courtier assurance", "/fr/crm-courtier-assurance", "la version spécialisée en détail"),
        ("Outil courtier assurance", "/fr/outil-courtier-assurance", "ce qu'un outil doit réunir"),
        ("Choisir un CRM", "/fr/guide/choisir-crm-cabinet-courtage", "la grille de décision"),
        ("CRM vs Excel", "/fr/comparatif/crm-courtier-vs-excel", "l'autre comparaison utile"),
    ],
    corps="""
<p>Cette page ne compare pas des éditeurs nommés : elle compare deux <strong>catégories</strong>. Les
deux peuvent convenir à un cabinet ; elles ne rendent pas le même service, et le choix dépend de ce
qui compte le plus dans l'activité.</p>

<h2>Ce que suit un CRM généraliste</h2>
<ul>
<li>Des <strong>contacts</strong> et des <strong>opportunités</strong>, avec des étapes de vente.</li>
<li>Des <strong>activités</strong> : appels, e-mails, rendez-vous.</li>
<li>Un <strong>pipeline</strong> commercial et des tableaux de bord d'activité.</li>
</ul>
<p>Dans le courtage, cela couvre la prospection. Ensuite, deux limites apparaissent : le contrat n'a
pas d'objet propre, et l'échéance n'existe pas.</p>

<h2>Ce que suit un outil spécialisé courtage</h2>
<table>
<tr><th>Objet</th><th>CRM généraliste</th><th>Outil de courtage</th></tr>
<tr><td>Contrat</td><td>Accessoire ou absent</td><td>Objet central : compagnie, prime, échéance, statut</td></tr>
<tr><td>Échéance et renouvellement</td><td>À recréer à la main</td><td>Porté par le contrat, remonte dans les actions</td></tr>
<tr><td>Pièces justificatives</td><td>Pièces jointes</td><td>Demandées, suivies, rattachées au dossier</td></tr>
<tr><td>Devis</td><td>Devis commercial</td><td>Proposition avec état, relance, signature</td></tr>
<tr><td>Commissions</td><td>Hors périmètre</td><td>Barèmes, relevés, états par période</td></tr>
<tr><td>Conseil et traçabilité</td><td>Notes libres</td><td>Documents et historique rattachés au dossier</td></tr>
</table>

<h2>Quand un CRM généraliste peut suffire</h2>
<ol>
<li>Le cabinet vend principalement des affaires qui n'ont pas de vie après la signature.</li>
<li>Le portefeuille est suivi dans un autre système, dédié.</li>
<li>Le besoin prioritaire est commercial, pas administratif.</li>
</ol>

<h2>Quand la spécialisation devient déterminante</h2>
<ol>
<li>Le portefeuille génère des échéances et des renouvellements chaque mois.</li>
<li>Des pièces justificatives conditionnent l'ouverture et la vie des dossiers.</li>
<li>Les commissions représentent une part significative du revenu.</li>
<li>Le cabinet doit pouvoir restituer ce qui a été présenté à un client, des années plus tard.</li>
</ol>

<h2>Le point de bascule</h2>
<p>La question n'est pas « quel CRM est le meilleur », mais : « combien d'outils faut-il ouvrir pour
répondre à une question simple sur un contrat ? ». Si la réponse est un seul, un généraliste bien
configuré peut tenir. Si la réponse en demande trois, le problème n'est pas le CRM : c'est l'absence
d'objets métier.</p>
""",
    faq=[
        ("Peut-on utiliser un CRM généraliste et un outil de gestion en parallèle ?",
         "C'est possible, mais cela recrée de la double saisie : les mêmes informations vivent à deux endroits et divergent. C'est exactement ce que la centralisation cherche à supprimer."),
        ("Un CRM généraliste est-il moins cher ?",
         "Souvent à l'abonnement, mais la comparaison utile inclut les outils ajoutés pour compenser (tableur de commissions, suivi d'échéances) et les manipulations qui en découlent."),
        ("COURTIA est-il un CRM ?",
         "COURTIA contient un dossier client complet — c'est sa partie CRM — et y ajoute les objets du courtage : contrats, échéances, devis, pièces, commissions, conformité."),
    ],
)

PAGES["fr/comparatif/crm-courtier-vs-excel"] = dict(
    marche="FR",
    titre="CRM courtier ou Excel : ce que le tableur ne peut pas tenir — COURTIA",
    description=(
        "Excel dans un cabinet de courtage : ce qu'il fait bien, où il casse, et ce qu'un outil métier "
        "apporte réellement. Comparaison honnête, sans mépris du tableur."
    ),
    h1="Excel ou un outil de gestion : le tableur n'est pas le problème",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Comparatifs", "/fr/comparatif/crm-courtier-vs-excel")],
    maillage=[
        ("Réduire la double saisie", "/fr/reduire-double-saisie-cabinet-courtage", "le premier effet visible"),
        ("Gestion de portefeuille", "/fr/gestion-portefeuille-courtier", "ce qui remonte automatiquement"),
        ("Choisir un CRM", "/fr/guide/choisir-crm-cabinet-courtage", "la grille de décision"),
        ("CRM spécialisé vs généraliste", "/fr/comparatif/crm-specialise-vs-crm-generaliste", "l'autre comparaison"),
    ],
    corps="""
<p>Un cabinet qui travaille sur Excel n'est pas mal organisé : il a souvent un tableur très bien
construit, que son auteur connaît par cœur. Le problème n'est pas l'outil, c'est ce qui dépend de sa
présence.</p>

<h2>Ce qu'un tableur fait très bien</h2>
<ul>
<li>Calculer : totaux, moyennes, répartitions, projections.</li>
<li>Être adaptable : une colonne se change en trente secondes.</li>
<li>Ne pas imposer de méthode : chacun organise ses colonnes comme il l'entend.</li>
</ul>

<h2>Les quatre points où il casse, dans un cabinet</h2>
<table>
<tr><th>Point de rupture</th><th>Ce qui se passe</th></tr>
<tr><td>Le suivi des dates</td><td>Une échéance n'est visible que si quelqu'un ouvre le fichier et trie</td></tr>
<tr><td>Le partage</td><td>Deux versions circulent, puis divergent, et personne ne sait laquelle est la bonne</td></tr>
<tr><td>Les pièces</td><td>Le tableur peut indiquer « pièce manquante », pas porter la pièce ni sa date</td></tr>
<tr><td>La mémoire du dossier</td><td>Un tableur garde des états, rarement l'historique d'un échange</td></tr>
</table>

<h2>Ce que le tableur ne peut pas porter, quel que soit son niveau</h2>
<ol>
<li><strong>Une action datée par dossier</strong> — être rappelé de rappeler, sans ouvrir de fichier.</li>
<li><strong>Un document rattaché</strong> — la pièce reçue, avec la date et le client.</li>
<li><strong>Un état de proposition</strong> — le devis envoyé, et le fait qu'il n'a pas répondu.</li>
<li><strong>Un cloisonnement</strong> — qui peut voir quoi, quand plusieurs personnes travaillent.</li>
</ol>

<h2>La transition qui ne se rate pas</h2>
<p>Un tableur n'est pas jeté : il est utilisé jusqu'au bout, y compris comme <em>source</em> de
l'import. La bonne méthode est de reprendre les lignes utiles, de vérifier les échéances à moins de
90 jours, et de garder le fichier archivé. Ce qui compte : ne pas faire cohabiter deux vérités.</p>

<h2>Le critère de décision, en une phrase</h2>
<p>Tant que le cabinet peut répondre à n'importe quelle question sur un dossier en ouvrant un seul
endroit, le tableur tient. Le jour où la réponse dépend de la personne qui répond, il ne tient plus.</p>
""",
    faq=[
        ("Faut-il supprimer tous les tableurs de la maison ?",
         "Non. Le tableur reste utile pour les calculs et les analyses ponctuelles. C'est le suivi quotidien des dossiers qui ne doit pas en dépendre."),
        ("Peut-on récupérer les données d'un tableur existant ?",
         "Oui, par import, après vérification de la structure des colonnes. Les échéances sont contrôlées en priorité."),
        ("Un cabinet d'une personne a-t-il besoin d'autre chose qu'Excel ?",
         "Cela dépend du volume et des pièces. Le test utile : compter combien d'endroits il faut ouvrir pour répondre à « où en est ce contrat ? »."),
    ],
)

PAGES["fr/comparatif/automatisation-vs-gestion-manuelle"] = dict(
    marche="FR",
    titre="Automatiser ou continuer à la main : la frontière utile — COURTIA",
    description=(
        "Ce qu'un cabinet de courtage peut automatiser sans risque, ce qui doit rester manuel, et "
        "comment choisir. Sans promesse de gain ni chiffre inventé."
    ),
    h1="Automatisation ou gestion manuelle : la frontière qui protège le cabinet",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Comparatifs", "/fr/comparatif/automatisation-vs-gestion-manuelle")],
    maillage=[
        ("Automatisation du cabinet", "/fr/automatisation-courtier-assurance", "ce qui est automatisable"),
        ("Automatiser ses relances", "/fr/guide/automatiser-relances-courtier", "le détail sur les relances"),
        ("Intégrer l'IA", "/fr/guide/integrer-ia-cabinet-courtage", "quand l'IA change quelque chose"),
        ("Organisation du cabinet", "/fr/organisation-cabinet-courtage", "les décisions préalables"),
    ],
    corps="""
<p>La question n'est pas « faut-il automatiser ? » mais « quoi, exactement ? ». Automatiser un geste
sans décision est toujours rentable ; automatiser une décision est toujours dangereux.</p>

<h2>La ligne de partage</h2>
<table>
<tr><th>Automatisable sans risque</th><th>Doit rester humain</th></tr>
<tr><td>Rappeler une date d'échéance</td><td>Décider de renouveler ou de remettre en concurrence</td></tr>
<tr><td>Rassembler les éléments d'un dossier</td><td>Apprécier un risque</td></tr>
<tr><td>Préparer un brouillon de message</td><td>Envoyer le message</td></tr>
<tr><td>Extraire une information d'une pièce</td><td>Confirmer qu'elle est juste et suffisante</td></tr>
<tr><td>Calculer des états de commissions</td><td>Interpréter un écart avec la compagnie</td></tr>
<tr><td>Signaler un dossier immobile</td><td>Décider de relancer ou de classer</td></tr>
</table>

<h2>Pourquoi la frontière est plus stricte dans l'assurance</h2>
<p>Un dossier de courtage peut être relu des années après. Ce qui a été recommandé, sur quelles
informations, à quelle date : ces éléments doivent être justifiables. Une automatisation qui produit
un écrit sans qu'un humain l'ait validé crée un dossier qui <em>paraît</em> complet et qui ne l'est
pas.</p>

<h2>Trois questions avant d'automatiser quelque chose</h2>
<ol>
<li>Si ça se déclenche au mauvais moment, quelle est la conséquence ? Si la réponse n'est pas
« aucune », il faut une validation.</li>
<li>Le résultat est-il vérifiable en quelques secondes ? Sinon, l'automatisation déplace le travail
au lieu de le supprimer.</li>
<li>Qui regarde quand ça se trompe ? Sans réponse, personne — et l'erreur s'installe.</li>
</ol>

<h2>Ce qu'on ne peut pas promettre</h2>
<p>Ni un nombre d'heures récupérées, ni un pourcentage. Ces chiffres dépendent du portefeuille, du
nombre de collaborateurs et des outils en place. Ce qui se mesure, c'est le nombre de manipulations
supprimées et le nombre d'oublis évités — et cela se constate sur ses propres dossiers.</p>
""",
    faq=[
        ("Peut-on automatiser les relances clients ?",
         "On peut automatiser leur préparation et leur suivi. L'envoi sans relecture est risqué : un message envoyé après une réponse du client dégrade la relation."),
        ("Faut-il de l'IA pour automatiser ?",
         "Non. La majorité des automatisations utiles sont des règles de date et de circulation d'information."),
        ("Comment savoir si l'automatisation fonctionne ?",
         "En comptant les manipulations supprimées et les oublis évités, pas en comptant les messages envoyés."),
    ],
)

# ── Branches ─────────────────────────────────────────────────────────────────

def _branche(cle, nom, titre, desc, h1, specifiques, pieces, tableau, faq, maillage):
    return dict(
        marche="FR", titre=titre, description=desc, h1=h1,
        fil=[("Accueil", "/"), ("France", "/fr"), (nom, f"/fr/{cle}")],
        maillage=maillage, corps=tableau, faq=faq,
    )


PAGES["fr/logiciel-courtier-auto"] = dict(
    marche="FR",
    titre="Logiciel pour courtier auto : contrats, flottes, échéances — COURTIA",
    description=(
        "Gérer un portefeuille auto dans un cabinet de courtage : multi-contrats par client, "
        "échéances, pièces (permis, carte grise), renouvellements. COURTIA, essai 7 jours."
    ),
    h1="Portefeuille auto : plusieurs véhicules, un seul dossier client",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Courtier auto", "/fr/logiciel-courtier-auto")],
    maillage=[
        ("Logiciel courtier assurance", "/fr/logiciel-courtier-assurance", "le produit dans son ensemble"),
        ("Transport et flotte", "/fr/logiciel-courtier-transport-flotte", "quand le risque est professionnel"),
        ("Gestion de portefeuille", "/fr/gestion-portefeuille-courtier", "échéances et renouvellements"),
        ("Gestion documentaire", "/fr/gestion-documentaire-courtier-assurance", "permis, carte grise, relevés"),
    ],
    corps="""
<p>Un client auto n'a pas « un contrat » : il a un véhicule principal, parfois un second, un jeune
conducteur rattaché, un changement de véhicule en cours d'année. Le dossier doit tenir tout cela sans
que le courtier ait à reconstituer l'historique à chaque appel.</p>

<div class="section">
<h2>Ce qui est spécifique au portefeuille auto</h2>
<ul>
<li><strong>Plusieurs contrats par client</strong> — un même foyer peut en avoir trois, avec des
échéances différentes.</li>
<li><strong>Les pièces qui conditionnent le dossier</strong> — permis, carte grise, relevé
d'information, justificatif de bonus : elles arrivent, manquent, ou changent.</li>
<li><strong>Les événements en cours d'année</strong> — changement de véhicule, déménagement,
ajout d'un conducteur : autant de raisons de reprendre le dossier.</li>
<li><strong>Les échéances rapprochées</strong> — un portefeuille auto génère beaucoup de
renouvellements, souvent sur les mêmes semaines.</li>
</ul>
</div>

<h2>Ce que COURTIA fait, concrètement</h2>
<table>
<tr><th>Situation</th><th>Sans outil dédié</th><th>Avec COURTIA</th></tr>
<tr><td>Le client appelle pour son second véhicule</td><td>Retrouver le contrat, vérifier l'échéance, chercher le permis</td><td>La fiche affiche tous ses contrats, leurs échéances et ses pièces</td></tr>
<tr><td>Le permis manque</td><td>Relancer par e-mail et classer à la main</td><td>Lien de dépôt, pièce rattachée au dossier</td></tr>
<tr><td>Un véhicule change</td><td>Note sur un post-it</td><td>Le dossier garde l'historique de l'opération</td></tr>
<tr><td>Échéance dans trois semaines</td><td>S'y reprendre depuis un agenda</td><td>Elle remonte dans les actions du jour</td></tr>
</table>

<h2>Ce que le produit ne fait pas</h2>
<p>COURTIA n'est pas un outil de tarification : il ne calcule pas de prime et ne compare pas des
tarifs d'assureurs. Il tient le portefeuille, les échéances, les pièces, les propositions et les
commissions. La tarification reste chez la compagnie ou dans l'outil que le cabinet utilise pour
cela.</p>
""",
    faq=[
        ("Peut-on gérer plusieurs véhicules pour un même client ?",
         "Oui : les contrats sont rattachés au client, chacun avec sa compagnie, sa prime et son échéance."),
        ("Les pièces propres à l'auto sont-elles gérées ?",
         "Les pièces se demandent, se déposent par lien et restent rattachées au dossier — permis, carte grise, relevé d'information."),
        ("Gère-t-il les flottes professionnelles ?",
         "Le suivi multi-contrats fonctionne ; pour le cas professionnel, voir la page transport et flotte."),
    ],
)

PAGES["fr/logiciel-courtier-habitation"] = dict(
    marche="FR",
    titre="Logiciel pour courtier habitation et MRH : suivi et échéances — COURTIA",
    description=(
        "Suivre un portefeuille habitation (MRH, propriétaire, locataire, PNO) dans un cabinet de "
        "courtage : multi-contrats, pièces, échéances et renouvellements. COURTIA, essai 7 jours."
    ),
    h1="Portefeuille habitation : MRH, PNO, proprio, locataire — sans confusion",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Courtier habitation", "/fr/logiciel-courtier-habitation")],
    maillage=[
        ("Logiciel courtier assurance", "/fr/logiciel-courtier-assurance", "le produit dans son ensemble"),
        ("Gestion de portefeuille", "/fr/gestion-portefeuille-courtier", "échéances et renouvellements"),
        ("Courtier IARD", "/fr/logiciel-courtier-iard", "le risque dommage de façon générale"),
        ("Gestion documentaire", "/fr/gestion-documentaire-courtier-assurance", "pièces et traçabilité"),
    ],
    corps="""
<p>L'habitation est une branche où le même client peut avoir plusieurs contrats aux logiques
différentes : sa résidence principale, un logement loué, une résidence secondaire. Le dossier doit
distinguer ces situations, parce que les pièces et les échéances ne sont pas les mêmes.</p>

<div class="section">
<h2>Ce qui est spécifique à l'habitation</h2>
<ul>
<li><strong>La qualité du client</strong> — propriétaire, locataire, bailleur : elle change ce qui est
demandé et ce qui doit être tracé.</li>
<li><strong>Les biens multiples</strong> — plusieurs adresses, parfois dans des régions différentes.</li>
<li><strong>Les pièces de situation</strong> — bail, état des lieux, attestation de copropriété selon
le cas.</li>
<li><strong>Les événements</strong> — déménagement, travaux, mise en location : autant de moments où
le contrat doit être revu.</li>
</ul>
</div>

<h2>Avant / avec, sur une semaine</h2>
<table>
<tr><th>Situation</th><th>Sans outil dédié</th><th>Avec COURTIA</th></tr>
<tr><td>Un client met son appartement en location</td><td>L'information reste dans un e-mail</td><td>Le dossier porte le changement et l'historique</td></tr>
<tr><td>Un bail doit être récupéré</td><td>Demande par mail, relance, classement</td><td>Lien de dépôt, pièce rattachée</td></tr>
<tr><td>Trois contrats, trois échéances</td><td>Trois rappels à poser soi-même</td><td>Les échéances remontent ensemble dans la liste du jour</td></tr>
<tr><td>Fin d'année</td><td>Tableur reconstitué</td><td>États de commissions par période</td></tr>
</table>

<h2>Ce que le produit ne fait pas</h2>
<p>Il ne produit pas de devis de prime calculée, ni d'expertise de sinistre. Il organise le suivi du
portefeuille, la collecte des pièces, la préparation des renouvellements et la traçabilité des
échanges. Pour le sinistre, le sujet n'a pas de page dédiée sur ce site : le périmètre produit n'est
pas suffisant pour en faire une promesse.</p>
""",
    faq=[
        ("Peut-on gérer un propriétaire bailleur avec plusieurs logements ?",
         "Oui : les contrats sont rattachés au client, chacun avec son bien, sa compagnie et son échéance."),
        ("Les attestations demandées par les locataires sont-elles gérées ?",
         "Les documents se génèrent depuis le dossier et ce qui a été remis reste tracé."),
        ("Et le PNO ?",
         "Le suivi est le même que pour les autres contrats de la branche : le type de garantie est une information du dossier, pas un objet à part."),
    ],
)

PAGES["fr/logiciel-courtier-entreprise"] = dict(
    marche="FR",
    titre="Logiciel pour courtier d'entreprise : risques pro, multi-sites — COURTIA",
    description=(
        "Suivre un portefeuille d'entreprises dans un cabinet de courtage : plusieurs contrats par "
        "site, échéances, pièces (liasses, effectifs), renouvellements. COURTIA, essai 7 jours."
    ),
    h1="Portefeuille d'entreprises : plusieurs contrats, plusieurs sites, un seul dossier",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Courtier entreprises", "/fr/logiciel-courtier-entreprise")],
    maillage=[
        ("Courtier IARD et risques pro", "/fr/logiciel-courtier-iard", "le risque professionnel"),
        ("Transport et flotte", "/fr/logiciel-courtier-transport-flotte", "les flottes professionnelles"),
        ("Décennale et construction", "/fr/logiciel-courtier-decennale", "les risques de chantier"),
        ("Gestion documentaire", "/fr/gestion-documentaire-courtier-assurance", "pièces et traçabilité"),
    ],
    corps="""
<p>Un client entreprise, c'est rarement un contrat : c'est un ensemble — multirisque des locaux,
flotte, responsabilité civile, prévoyance du dirigeant, parfois santé collective. Et cet ensemble
bouge : embauches, nouveaux sites, changements d'activité.</p>

<div class="section">
<h2>Ce qui est spécifique aux entreprises</h2>
<ul>
<li><strong>Plusieurs contrats liés</strong> — dont certains se renouvellent à des dates différentes.</li>
<li><strong>Des pièces qui dépendent de la vie de l'entreprise</strong> — effectifs, chiffre
d'affaires, surfaces, activité déclarée.</li>
<li><strong>Des interlocuteurs multiples</strong> — dirigeant, gestionnaire, comptable : le dossier
doit être lisible par plusieurs personnes.</li>
<li><strong>Un enjeu de renouvellement élevé</strong> — un contrat mal renouvelé se voit tout de suite.</li>
</ul>
</div>

<h2>Ce que COURTIA couvre</h2>
<table>
<tr><th>Besoin</th><th>Dans le produit</th></tr>
<tr><td>Voir tous les contrats d'un client entreprise</td><td>Fiche client avec l'ensemble des contrats, leurs échéances et leurs primes</td></tr>
<tr><td>Suivre les pièces de renouvellement</td><td>Demandes, dépôt par lien, rattachement au dossier</td></tr>
<tr><td>Préparer un rendez-vous</td><td>Préparation d'appel à partir du dossier, résumé du portefeuille</td></tr>
<tr><td>Suivre les commissions</td><td>Barèmes par partenaire, import de relevés, états par période</td></tr>
<tr><td>Travailler à plusieurs</td><td>Rôles, affectation, cloisonnement par cabinet</td></tr>
</table>

<h2>Ce qui reste dehors, et qui est assumé</h2>
<p>COURTIA n'est pas un outil de gestion des risques industriels, ni un logiciel de conformité
sectorielle spécialisée. Il ne produit ni audit de risque ni plan de prévention. Il tient le
portefeuille, les échéances, les pièces et les propositions — ce qui suffit à la majorité des
cabinets généralistes qui suivent des clients entreprises.</p>
""",
    faq=[
        ("Peut-on rattacher plusieurs sites à un même client ?",
         "Le portefeuille se structure par client et par contrat : plusieurs contrats d'un même client peuvent porter des lieux ou des objets différents."),
        ("Gère-t-il la santé collective ?",
         "Le contrat et son échéance sont suivis comme les autres. Le paramétrage détaillé des garanties collectives dépend du besoin du cabinet."),
        ("Peut-on avoir plusieurs interlocuteurs côté client ?",
         "Les coordonnées et l'historique du dossier permettent de savoir qui a échangé et quand."),
    ],
)

PAGES["fr/logiciel-courtier-transport-flotte"] = dict(
    marche="FR",
    titre="Logiciel courtier transport et flotte : suivi multi-véhicules — COURTIA",
    description=(
        "Suivre un portefeuille transport ou flotte : véhicules, échéances décalées, pièces "
        "d'exploitation, renouvellements groupés. COURTIA, essai 7 jours."
    ),
    h1="Transport et flotte : quand un client vaut trente échéances",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Transport et flotte", "/fr/logiciel-courtier-transport-flotte")],
    maillage=[
        ("Courtier entreprises", "/fr/logiciel-courtier-entreprise", "le portefeuille professionnel"),
        ("Courtier auto", "/fr/logiciel-courtier-auto", "le risque véhicule particulier"),
        ("Gestion de portefeuille", "/fr/gestion-portefeuille-courtier", "les échéances dans le produit"),
        ("Prioriser ses dossiers", "/fr/prioriser-dossiers-courtier-assurance", "l'ordre de traitement"),
    ],
    corps="""
<p>Dans le transport, un seul client peut représenter des dizaines de véhicules, avec des dates
d'effet décalées et des mises en circulation en cours d'année. Une échéance manquée sur une flotte ne
se rattrape pas comme sur un contrat auto isolé.</p>

<div class="section">
<h2>Les trois particularités d'un portefeuille flotte</h2>
<ol>
<li><strong>Le volume dans un seul dossier</strong> — beaucoup de véhicules, un interlocuteur, des
échéances réparties sur l'année.</li>
<li><strong>Les mouvements permanents</strong> — entrées et sorties de véhicules, remorques, matériel :
le dossier ne se fige jamais.</li>
<li><strong>Les pièces d'exploitation</strong> — permis par conducteur, cartes grises, attestations :
le suivi documentaire pèse plus qu'ailleurs.</li>
</ol>
</div>

<h2>Ce que le produit apporte, sans promesse tarifaire</h2>
<table>
<tr><th>Besoin</th><th>Dans COURTIA</th></tr>
<tr><td>Voir les échéances de tous les véhicules d'un client</td><td>Contrats rattachés au même dossier, avec leurs dates</td></tr>
<tr><td>Savoir ce qui arrive dans 30 ou 90 jours</td><td>Listes d'échéances et actions du jour</td></tr>
<tr><td>Récupérer les pièces attendues</td><td>Demandes suivies, dépôt par lien, rattachement au dossier</td></tr>
<tr><td>Suivre les commissions</td><td>Barèmes et états par période</td></tr>
<tr><td>Travailler le renouvellement groupé</td><td>Échéances triées par enjeu, préparées ensemble</td></tr>
</table>

<h2>Ce que le produit ne fait pas</h2>
<p>Il ne tarife pas, ne remplace pas un extranet de compagnie, et ne gère pas la gestion de parc
(carburant, entretien, amendes). Ces sujets appartiennent à d'autres outils. COURTIA tient le
portefeuille d'assurance et son administration.</p>
""",
    faq=[
        ("Peut-on suivre les entrées et sorties de véhicules ?",
         "Le dossier conserve l'historique des opérations ; les contrats et leurs échéances sont mis à jour au fil des mouvements."),
        ("Faut-il une offre spécifique pour les flottes ?",
         "Non : la logique du produit est le suivi multi-contrats par client, ce qui couvre une flotte comme un portefeuille multi-branches."),
        ("Et la prévoyance des conducteurs ?",
         "Elle se suit comme n'importe quel autre contrat du même client."),
    ],
)

PAGES["fr/logiciel-courtier-decennale"] = dict(
    marche="FR",
    titre="Logiciel courtier décennale et construction : suivi des dossiers — COURTIA",
    description=(
        "Suivre des dossiers de décennale et de risques de chantier dans un cabinet de courtage : "
        "pièces de souscription, échéances, renouvellements, historique. COURTIA, essai 7 jours."
    ),
    h1="Décennale : des dossiers lourds en pièces, à suivre sans les perdre",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Décennale et construction", "/fr/logiciel-courtier-decennale")],
    maillage=[
        ("Courtier entreprises", "/fr/logiciel-courtier-entreprise", "le portefeuille professionnel"),
        ("Courtier IARD et risques pro", "/fr/logiciel-courtier-iard", "le risque dommage"),
        ("Gestion documentaire", "/fr/gestion-documentaire-courtier-assurance", "les pièces de souscription"),
        ("Devis", "/fr/logiciel-devis-courtier-assurance", "les propositions et leur suivi"),
    ],
    corps="""
<p>La décennale est une branche où le dossier se juge sur ses pièces : activité déclarée, chiffre
d'affaires, qualifications, historique de sinistralité. Un dossier incomplet n'est pas « à compléter » :
il n'est pas présentable.</p>

<div class="section">
<h2>Ce qui est spécifique</h2>
<ul>
<li><strong>Des pièces déterminantes</strong> — et souvent nombreuses, dépendant du métier exercé.</li>
<li><strong>Des délais longs</strong> — la garantie porte sur dix ans : l'historique du dossier compte
plus que dans d'autres branches.</li>
<li><strong>Une souscription moins automatique</strong> — la proposition est souvent examinée au cas
par cas, d'où l'importance de la traçabilité de ce qui a été transmis.</li>
<li><strong>Des renouvellements à forts enjeux</strong> — un contrat perdu se remplace difficilement.</li>
</ul>
</div>

<h2>Ce que COURTIA apporte</h2>
<table>
<tr><th>Besoin</th><th>Dans le produit</th></tr>
<tr><td>Savoir ce qui manque avant de présenter un dossier</td><td>Pièces demandées, reçues, et depuis quand</td></tr>
<tr><td>Retrouver ce qui a été transmis il y a trois ans</td><td>Historique du dossier et documents rattachés</td></tr>
<tr><td>Préparer un renouvellement lourd</td><td>Échéances, éléments du contrat, préparation d'appel</td></tr>
<tr><td>Suivre la proposition</td><td>Registre des devis avec état et relance</td></tr>
</table>

<h2>Honnêteté sur le périmètre</h2>
<p>COURTIA n'est pas un outil d'analyse technique de risque, et ne prétend pas dire ce qui est
acceptable pour une compagnie. Il organise et trace le dossier — c'est déjà ce qui manque le plus
souvent quand un courtier cherche « où en est ce dossier ? ».</p>
""",
    faq=[
        ("Les pièces de décennale sont-elles suivies spécifiquement ?",
         "Les pièces se demandent, se déposent par lien et restent rattachées au dossier avec leur date : c'est le mécanisme utile pour ce type de dossier."),
        ("Peut-on garder dix ans d'historique ?",
         "L'historique du dossier est conservé tant que le cabinet le conserve ; la durée relève de ses obligations propres."),
        ("Le produit aide-t-il à préparer une proposition ?",
         "Le parcours de devis et la préparation d'appel à partir du dossier sont prévus ; l'analyse technique reste celle du courtier."),
    ],
)
