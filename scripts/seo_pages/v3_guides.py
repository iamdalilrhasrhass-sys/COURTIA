#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v3_guides.py — VAGUE 3, groupe « guides pratiques » (9 pages France).

Ces guides ne sont pas des articles génériques : chacun résout un problème précis d'un cabinet de
courtage, et chacun renvoie aux fonctions réelles du produit au lieu de rester théorique.
Justification JEV : Pass A (famille manquante : guides), Pass D (la concurrence reste dans un
vocabulaire de CRM générique), Pass E (red team France : les guides pratiques manquent).
"""
PAGES = {}

PAGES["fr/guide/choisir-crm-cabinet-courtage"] = dict(
    marche="FR",
    titre="Comment choisir un CRM pour un cabinet de courtage : la grille — COURTIA",
    description=(
        "Une grille de décision pour choisir un CRM dans un cabinet de courtage : les questions à "
        "poser, les réponses éliminatoires, et ce qu'il faut tester avant de signer."
    ),
    h1="Comment choisir un CRM pour un cabinet de courtage",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Guides", "/fr/guide/choisir-crm-cabinet-courtage")],
    maillage=[
        ("CRM courtier assurance", "/fr/crm-courtier-assurance", "ce que doit couvrir le dossier client"),
        ("Outil courtier assurance", "/fr/outil-courtier-assurance", "ce qu'un outil doit réunir"),
        ("Comparatif CRM spécialisé vs généraliste", "/fr/comparatif/crm-specialise-vs-crm-generaliste", "la comparaison détaillée"),
        ("Mesurer son temps administratif", "/fr/mesurer-temps-administratif-cabinet", "établir son besoin avant de choisir"),
    ],
    corps="""
<div class="section">
<h2>Pourquoi cette grille plutôt qu'un classement</h2>
<p>Les comparatifs de CRM se ressemblent parce qu'ils listent des fonctions. Or un cabinet ne choisit
pas un tableau de fonctionnalités : il choisit la façon dont son travail quotidien va se dérouler
pendant des années. Cette grille pose les questions dans l'ordre où elles éliminent.</p>
</div>

<h2>1. Questions éliminatoires (une réponse « non » suffit à écarter)</h2>
<ol>
<li><strong>Le dossier client contient-il les contrats et leurs échéances ?</strong> Si le contrat vit
ailleurs, le suivi des renouvellements retombera sur un second outil.</li>
<li><strong>Le devis vit-il dans le dossier ?</strong> Un devis hors dossier est un document, pas un
suivi commercial.</li>
<li><strong>Peut-on savoir ce qui manque à un dossier, et depuis quand ?</strong> Sans cela, les
pièces se réclament à l'aveugle.</li>
<li><strong>Les données sont-elles cloisonnées par cabinet et exportables ?</strong> C'est une
condition de sécurité, pas une option.</li>
<li><strong>Le prix appliqué est-il déterminé côté serveur ?</strong> Un prix manipulable depuis le
navigateur est une faille, pas une fonctionnalité.</li>
</ol>

<h2>2. Questions de travail réel</h2>
<table>
<tr><th>Question</th><th>Bonne réponse attendue</th></tr>
<tr><td>Que se passe-t-il quand un client ne répond pas ?</td><td>La relance est portée par le dossier, avec un message préparé à valider</td></tr>
<tr><td>Comment le cabinet sait-il quoi faire le matin ?</td><td>Une liste d'actions issue des données réelles, pas un rappel saisi à la main</td></tr>
<tr><td>Qui suit ce dossier ?</td><td>Un responsable visible</td></tr>
<tr><td>Que se passe-t-il si un indicateur ne peut pas être calculé ?</td><td>Il s'affiche vide (« — ») plutôt qu'un zéro trompeur</td></tr>
<tr><td>Comment un nouveau collaborateur comprend-il un dossier ?</td><td>Par son historique, sans demander à un collègue</td></tr>
</table>

<h2>3. Ce qu'il faut tester avant de signer</h2>
<ol>
<li>Importer un extrait réel (dix dossiers) et vérifier les échéances à moins de 90 jours.</li>
<li>Faire un devis complet, puis le relancer, comme si le client ne répondait pas.</li>
<li>Demander un dépôt de pièce depuis un téléphone, comme le ferait un client.</li>
<li>Faire produire un état de commissions sur une période réelle.</li>
<li>Vérifier ce que voit un collaborateur invité, et ce qu'il ne voit pas.</li>
</ol>

<h2>4. Les signaux d'alerte</h2>
<ul>
<li>Un éditeur qui ne montre pas l'interface avant l'essai.</li>
<li>Des gains chiffrés annoncés sans méthode de mesure.</li>
<li>Une migration facturée « au forfait » sans avoir vu les fichiers du cabinet.</li>
<li>Un outil qui ne dit jamais ce qu'il ne fait pas.</li>
</ul>

<h2>5. La décision se prend sur trois critères, pas vingt</h2>
<p>Le dossier client comme centre de gravité, le suivi des échéances et des pièces, la capacité à
travailler à plusieurs. Le reste — thème, notifications, intégrations — s'ajuste après.</p>
<p class="doux">Cette grille est utilisable même si vous ne choisissez pas COURTIA : c'est son
intérêt. Elle vient d'un éditeur, et elle le dit.</p>
""",
    faq=[
        ("Faut-il choisir un CRM spécialisé courtage ou un CRM généraliste ?",
         "Un CRM généraliste suit des contacts. Un CRM de courtage suit des contrats, des échéances, des devis, des pièces et des commissions. Si le suivi des renouvellements est central dans votre activité, la spécialisation devient déterminante."),
        ("Combien de temps prend un essai utile ?",
         "Assez longtemps pour couvrir un vrai dossier de bout en bout : devis, pièce manquante, relance, signature. Sept jours suffisent si le cabinet y met deux dossiers réels."),
        ("Que faire si deux outils sont équivalents ?",
         "Comparer la sortie : que se passe-t-il si le cabinet veut partir ? Export, compréhension des données, absence d'enfermement. C'est souvent là que la différence apparaît."),
    ],
)

PAGES["fr/guide/structurer-pipeline-courtier"] = dict(
    marche="FR",
    titre="Structurer un pipeline commercial de courtage : méthode — COURTIA",
    description=(
        "Comment structurer un pipeline dans un cabinet de courtage : étapes utiles, critères de "
        "sortie, relances associées, et pourquoi un pipeline trop fin ne sert à rien."
    ),
    h1="Structurer son pipeline commercial sans y passer ses journées",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Guides", "/fr/guide/structurer-pipeline-courtier")],
    maillage=[
        ("Prospects et clients", "/fr/gestion-prospects-clients-courtier-assurance", "l'outil derrière le pipeline"),
        ("Suivre ses prospects", "/fr/guide/suivre-prospects-courtier", "le suivi au quotidien"),
        ("Devis", "/fr/logiciel-devis-courtier-assurance", "l'étape où le pipeline se joue"),
        ("Relances", "/fr/relance-client-assurance", "ce qui empêche le pipeline de dormir"),
    ],
    corps="""
<div class="section">
<h2>Un pipeline n'est pas un tableau de vœux</h2>
<p>Un pipeline sert à répondre à trois questions : combien de dossiers sont en cours, à quelle étape,
et lequel n'a pas bougé. S'il ne répond pas à ces questions, c'est un décor. Beaucoup de cabinets
abandonnent leur pipeline parce qu'il demandait plus de saisie qu'il n'apportait d'information.</p>
</div>

<h2>Quatre étapes suffisent</h2>
<table>
<tr><th>Étape</th><th>Critère d'entrée</th><th>Critère de sortie</th></tr>
<tr><td>Contact établi</td><td>Un échange a eu lieu, le besoin est connu</td><td>Un devis peut être produit</td></tr>
<tr><td>Devis envoyé</td><td>Une proposition est partie</td><td>Réponse du client, ou relance due</td></tr>
<tr><td>Décision attendue</td><td>Le client a les éléments en main</td><td>Signature ou refus explicite</td></tr>
<tr><td>Client</td><td>Signature obtenue</td><td>Sortie du pipeline, entrée en portefeuille</td></tr>
</table>
<p>Deux règles : une étape doit correspondre à un fait vérifiable (et non à une impression), et chaque
étape doit avoir une action par défaut quand rien ne bouge.</p>

<h2>Les relances font partie du pipeline</h2>
<p>Un pipeline sans relance programmée est une photographie. La question à se poser pour chaque
étape : « si rien ne se passe dans X jours, que fait-on ? ». Si la réponse est « on verra », l'étape
n'apporte rien.</p>

<h2>La saisie minimale</h2>
<ol>
<li>Le contact et la provenance.</li>
<li>Le besoin tel qu'il est exprimé (une phrase, pas un roman).</li>
<li>Les éléments de situation utiles à la proposition.</li>
<li>La date du dernier échange.</li>
</ol>
<p>Tout le reste se déduit : l'état du devis vient du devis, l'échéance vient du contrat, la
commission vient du barème. Un pipeline qui demande de ressaisir ces éléments est un pipeline qui
sera abandonné.</p>

<h2>Ce qui fait vivre un pipeline</h2>
<p>Un point hebdomadaire court sur les dossiers immobiles, et rien d'autre. Vingt minutes par semaine
suffisent s'ils sont listés automatiquement ; deux heures si l'on doit les retrouver.</p>
""",
    faq=[
        ("Faut-il un CRM pour avoir un pipeline ?",
         "Non, mais il faut un endroit unique où l'état des dossiers est visible. C'est la fonction que remplit le pipeline dans un outil."),
        ("Combien d'étapes au maximum ?",
         "Au-delà de cinq ou six, les étapes deviennent indiscernables et les dossiers s'y accumulent sans distinction."),
        ("Comment mesurer la qualité du pipeline ?",
         "Par le nombre de dossiers sans action depuis plus de quinze jours. C'est un indicateur qui se calcule sans interprétation."),
    ],
)

PAGES["fr/guide/automatiser-relances-courtier"] = dict(
    marche="FR",
    titre="Automatiser les relances d'un cabinet de courtage — COURTIA",
    description=(
        "Automatiser les relances clients d'un cabinet de courtage : quelles relances, à quel moment, "
        "ce qui doit rester validé par un humain, et les erreurs à éviter."
    ),
    h1="Automatiser ses relances sans abîmer la relation client",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Guides", "/fr/guide/automatiser-relances-courtier")],
    maillage=[
        ("Relances clients", "/fr/relance-client-assurance", "le produit derrière la méthode"),
        ("Automatisation du cabinet", "/fr/automatisation-courtier-assurance", "les autres tâches automatisables"),
        ("Gestion documentaire", "/fr/gestion-documentaire-courtier-assurance", "la relance de pièces"),
        ("Organisation du cabinet", "/fr/organisation-cabinet-courtage", "les décisions préalables"),
    ],
    corps="""
<div class="section">
<h2>Ce qu'on peut automatiser sans risque</h2>
<ul>
<li><strong>Le rappel d'une échéance interne</strong> : « ce contrat arrive à échéance, préparez le
renouvellement ». Aucun risque, c'est un signal adressé au cabinet.</li>
<li><strong>La préparation d'un message</strong> : un brouillon écrit à partir du dossier, prêt à
valider. Le gain vient de la rédaction, pas de l'envoi.</li>
<li><strong>Le suivi d'une pièce attendue</strong> : savoir depuis quand elle est demandée, et à qui.</li>
<li><strong>La relance devenue inutile</strong> : si le dossier a bougé entre-temps, la relance doit
disparaître. Un client qui vient de répondre ne doit pas recevoir un rappel automatique.</li>
</ul>
</div>

<h2>Ce qui ne doit pas être automatique</h2>
<p>L'envoi d'un message au client sans relecture. Un message envoyé au mauvais moment — après une
réponse, après une réclamation, pendant un litige — coûte plus cher que le temps qu'il économise. La
règle simple : le produit prépare, le cabinet décide.</p>

<h2>Les quatre relances qui valent la peine</h2>
<table>
<tr><th>Relance</th><th>Déclencheur</th><th>Ce qui doit rester humain</th></tr>
<tr><td>Pièce manquante</td><td>Pièce demandée et non reçue</td><td>La décision d'insister ou non</td></tr>
<tr><td>Devis sans réponse</td><td>Proposition envoyée, pas de retour</td><td>Le contenu et le ton</td></tr>
<tr><td>Échéance de contrat</td><td>Date d'échéance à venir</td><td>La proposition de renouvellement</td></tr>
<tr><td>Dossier dormant</td><td>Aucun contact depuis des mois</td><td>L'opportunité d'un vrai échange, pas d'un rappel commercial</td></tr>
</table>

<h2>Comment vérifier que ça fonctionne</h2>
<ol>
<li>Comptez les relances faites ce mois-ci et combien ont reçu une réponse.</li>
<li>Vérifiez qu'aucune relance n'est partie après une réponse du client.</li>
<li>Regardez si le nombre de pièces en attente diminue réellement — pas seulement le nombre d'e-mails
envoyés.</li>
</ol>

<h2>L'erreur la plus fréquente</h2>
<p>Automatiser avant d'avoir centralisé. Si le dossier n'est pas unique, une relance automatique
relancera parfois l'ancien contact, ou deux fois la même personne. L'automatisation n'est saine
qu'après la centralisation.</p>
""",
    faq=[
        ("Peut-on envoyer des relances automatiquement au client ?",
         "Techniquement oui ; en pratique, un envoi sans relecture est risqué. COURTIA prépare les messages et laisse la décision au cabinet."),
        ("Faut-il relancer tout le monde ?",
         "Non. Relancer un client qui vient de répondre dégrade la relation. Le produit doit arrêter la relance dès que le dossier bouge."),
        ("Combien de relances avant de renoncer ?",
         "C'est une décision du cabinet. Le produit indique l'ancienneté ; il n'impose pas un nombre d'essais."),
    ],
)

PAGES["fr/guide/organiser-renouvellements-courtier"] = dict(
    marche="FR",
    titre="Organiser les renouvellements d'assurance : méthode cabinet — COURTIA",
    description=(
        "Organiser les renouvellements dans un cabinet de courtage : fenêtre de préparation, "
        "priorisation par enjeu, contenu du dossier de renouvellement, et suivi après échéance."
    ),
    h1="Organiser ses renouvellements au lieu de les découvrir",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Guides", "/fr/guide/organiser-renouvellements-courtier")],
    maillage=[
        ("Gestion de portefeuille", "/fr/gestion-portefeuille-courtier", "les échéances dans le produit"),
        ("Prioriser ses dossiers", "/fr/prioriser-dossiers-courtier-assurance", "l'ordre de traitement"),
        ("Comparer des propositions", "/fr/comparateur-assurance-courtier", "remettre en concurrence"),
        ("Renouvellements en Suisse", "/ch/gestion-portefeuille-assurance-suisse", "la version suisse"),
    ],
    corps="""
<div class="section">
<h2>La seule question qui compte : quand commence-t-on ?</h2>
<p>Un renouvellement traité la semaine de l'échéance est un renouvellement subi. Traité deux mois
avant, c'est une occasion commerciale : on a le temps de revoir les garanties, de comparer, de
proposer. La fenêtre de préparation est donc la décision structurante.</p>
</div>

<h2>Une fenêtre en trois temps</h2>
<table>
<tr><th>Moment</th><th>Ce que fait le cabinet</th></tr>
<tr><td>Trois mois avant</td><td>Repérer les échéances, identifier les dossiers à enjeu et ceux dont la situation a changé</td></tr>
<tr><td>Deux mois avant</td><td>Préparer le dossier de renouvellement, vérifier les pièces, éventuellement remettre en concurrence</td></tr>
<tr><td>Un mois avant</td><td>Présenter au client, obtenir la décision, préparer les documents</td></tr>
</table>
<p>Cette fenêtre doit être tenue par un système, pas par la mémoire : c'est exactement ce que produit
une échéance rattachée au contrat.</p>

<h2>Le dossier de renouvellement, en cinq pièces</h2>
<ol>
<li>Le contrat actuel : compagnie, prime, garanties principales.</li>
<li>Ce qui a changé dans la situation du client depuis un an.</li>
<li>Les sinistres de la période, s'il y en a eu.</li>
<li>Les pièces attendues et leur état.</li>
<li>La préconisation du courtier, avec son motif.</li>
</ol>

<h2>Prioriser quand il y a beaucoup d'échéances</h2>
<p>Deux critères suffisent : l'enjeu (prime, multi-équipement, ancienneté) et la fragilité (contrat
sans contact depuis longtemps, sinistralité, échéance oubliée l'an dernier). Le reste est du bruit
tant que ces deux-là ne sont pas traités.</p>

<h2>Après l'échéance</h2>
<p>Ce qui se perd souvent, c'est l'après : le contrat renouvelé doit être mis à jour, les documents
archivés, et la commission suivie. Un renouvellement non enregistré produit une échéance fausse
l'année suivante — et l'erreur se répète.</p>
""",
    faq=[
        ("À quelle date faut-il commencer ?",
         "Assez tôt pour avoir le temps de comparer et de faire décider le client : deux à trois mois avant l'échéance selon la complexité du contrat."),
        ("Faut-il remettre en concurrence tous les contrats ?",
         "Non. Le faire sur tout le portefeuille coûte cher en temps et dégrade la relation avec les compagnies. Le ciblage par enjeu est plus efficace."),
        ("Comment ne pas oublier un renouvellement ?",
         "En rattachant l'échéance au contrat, et en remontant les échéances à 30 et 90 jours dans la liste de travail."),
    ],
)

PAGES["fr/guide/centraliser-dossiers-clients"] = dict(
    marche="FR",
    titre="Centraliser ses dossiers clients : méthode pour un cabinet — COURTIA",
    description=(
        "Comment centraliser les dossiers clients d'un cabinet de courtage sans tout casser : "
        "inventaire, convention de nommage, ordre de migration, contrôles."
    ),
    h1="Centraliser ses dossiers clients : par où commencer, dans quel ordre",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Guides", "/fr/guide/centraliser-dossiers-clients")],
    maillage=[
        ("CRM courtier assurance", "/fr/crm-courtier-assurance", "le dossier unique dans le produit"),
        ("Import de portefeuille", "/fr/import-portefeuille-courtier-assurance", "la reprise des dossiers existants"),
        ("Gestion documentaire", "/fr/gestion-documentaire-courtier-assurance", "les pièces et documents"),
        ("Réduire la double saisie", "/fr/reduire-double-saisie-cabinet-courtage", "le premier gain visible"),
    ],
    corps="""
<div class="section">
<h2>Pourquoi centraliser avant tout le reste</h2>
<p>Toute amélioration ultérieure — automatisation, relances, pilotage — suppose que l'information soit
au même endroit. Centraliser n'est pas un projet informatique : c'est une décision d'organisation,
exécutable en quelques semaines.</p>
</div>

<h2>Étape 1 — L'inventaire (une demi-journée)</h2>
<p>Listez où vivent les informations aujourd'hui : boîte e-mail, dossiers partagés, agenda, tableur,
notes, ancien logiciel. Pour chaque source, notez ce qu'elle contient et si elle est encore utilisée.
La plupart des cabinets découvrent ainsi deux ou trois sources oubliées.</p>

<h2>Étape 2 — La règle de nommage (une heure, mais structurante)</h2>
<p>Une convention simple et tenue vaut mieux qu'une convention parfaite et abandonnée. Par exemple :
<em>type de document — client — date</em>. L'objectif n'est pas l'esthétique : c'est qu'un document
retrouvé dans trois ans soit identifiable sans ouvrir un dossier au hasard.</p>

<h2>Étape 3 — Le tri par priorité (pas par ancienneté)</h2>
<ol>
<li>D'abord les dossiers avec une échéance dans les 90 jours.</li>
<li>Ensuite les dossiers sans contact depuis longtemps.</li>
<li>Puis les dossiers avec des pièces manquantes.</li>
<li>Le reste suit, au fil de l'eau.</li>
</ol>
<p>Commencer par les dossiers les plus anciens est l'erreur classique : on y passe des semaines sans
effet visible, et la motivation tombe.</p>

<h2>Étape 4 — Les contrôles</h2>
<table>
<tr><th>Contrôle</th><th>Ce qu'il détecte</th></tr>
<tr><td>Dix dossiers tirés au hasard, comparés à la source</td><td>Une migration mal passée</td></tr>
<tr><td>Échéances à moins de 90 jours vérifiées une par une</td><td>Les erreurs qui coûtent un renouvellement</td></tr>
<tr><td>Pièces attendues, listées par ancienneté</td><td>Les demandes oubliées</td></tr>
</table>

<h2>Ce que la centralisation ne résout pas</h2>
<p>Elle ne décide pas de la qualité du conseil, ne remplace pas les échanges humains, et ne rend pas
propre un dossier qui n'a jamais été tenu. Elle rend simplement le travail possible : c'est déjà
beaucoup.</p>
""",
    faq=[
        ("Faut-il tout migrer d'un coup ?",
         "Non. La migration par priorité (échéances à 90 jours d'abord) évite de bloquer l'activité et donne des résultats visibles rapidement."),
        ("Que faire des documents anciens mal nommés ?",
         "Les rattacher au fil de l'eau, dossier par dossier, quand on les rouvre pour une raison réelle. Un archivage exhaustif coûte cher pour un bénéfice faible."),
        ("Combien de temps cela prend-il ?",
         "Nous ne promettons pas de durée : elle dépend de la qualité des données de départ. La page « changer de logiciel » décrit la méthode de contrôle."),
    ],
)

PAGES["fr/guide/integrer-ia-cabinet-courtage"] = dict(
    marche="FR",
    titre="Intégrer l'IA dans un cabinet de courtage : méthode — COURTIA",
    description=(
        "Comment intégrer l'IA dans un cabinet de courtage sans se tromper : par quelles tâches "
        "commencer, quelles garanties exiger, et ce qu'il ne faut jamais déléguer."
    ),
    h1="Intégrer l'IA dans un cabinet : commencer par les tâches sans risque",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Guides", "/fr/guide/integrer-ia-cabinet-courtage")],
    maillage=[
        ("IA pour courtier", "/fr/ia-courtier-assurance", "les usages réels dans le produit"),
        ("IA documentaire", "/fr/ia-gestion-documentaire-assurance", "la lecture des pièces"),
        ("Automatisation du cabinet", "/fr/automatisation-courtier-assurance", "sans IA, quand ça suffit"),
        ("Mesurer son temps administratif", "/fr/mesurer-temps-administratif-cabinet", "avant d'automatiser"),
    ],
    corps="""
<div class="section">
<h2>La bonne question n'est pas « quelle IA ? » mais « quelle tâche ? »</h2>
<p>Un cabinet n'a pas besoin d'IA : il a besoin de traiter plus vite des tâches qui ne demandent pas
de jugement. Le classement se fait sur trois critères : la tâche est répétitive, elle ne comporte pas
de décision, et son résultat est vérifiable par un humain en quelques secondes.</p>
</div>

<h2>Tâches où l'IA est saine, dans un cabinet</h2>
<table>
<tr><th>Tâche</th><th>Ce qu'elle apporte</th><th>Ce qui reste humain</th></tr>
<tr><td>Résumer un portefeuille ou une journée</td><td>Une vue d'ensemble sans lire trente dossiers</td><td>La décision de traiter ou non</td></tr>
<tr><td>Lire une pièce et en extraire les informations</td><td>Fin de la recopie</td><td>La confirmation de ce qui est retenu</td></tr>
<tr><td>Préparer un brouillon de message</td><td>Le temps de rédaction</td><td>Le contenu final envoyé</td></tr>
<tr><td>Préparer un appel</td><td>Les points saillants du dossier</td><td>La conduite de l'entretien</td></tr>
<tr><td>Signaler ce qui n'a pas bougé</td><td>Une vigilance continue</td><td>La décision de relancer</td></tr>
</table>

<h2>Les garanties à exiger d'un éditeur</h2>
<ol>
<li><strong>Cloisonnement par cabinet</strong> : vos données ne se mélangent pas à celles d'un autre.</li>
<li><strong>Aucune donnée de dossier pour entraîner un modèle public.</strong></li>
<li><strong>Rien d'envoyé au client sans validation humaine.</strong></li>
<li><strong>Le produit dit ce qu'il ne sait pas.</strong> Un outil qui affiche une valeur inventée
quand la donnée manque est disqualifiant dans ce métier.</li>
<li><strong>Traçabilité</strong> : savoir qui a produit quel document, et quand.</li>
</ol>

<h2>Ce qu'il ne faut jamais déléguer</h2>
<p>Le conseil, la décision de couverture, la validation d'un dossier, l'appréciation d'un risque.
Ces actes engagent la responsabilité du courtier. Une IA peut les <em>préparer</em> ; si elle les
décide, le dossier devient fragile au moment précis où il faudrait le défendre.</p>

<h2>Par où commencer, concrètement</h2>
<ol>
<li>Mesurer le temps administratif (quatre comptages, sans logiciel).</li>
<li>Automatiser d'abord sans IA : échéances, collecte de pièces, registre des devis.</li>
<li>Ajouter l'assistance là où elle remplace une lecture : synthèse, préparation d'appel, pièces.</li>
<li>Vérifier après un mois : moins de ressaisies, aucun envoi non validé, aucun dossier divergent.</li>
</ol>
""",
    faq=[
        ("L'IA peut-elle rédiger le compte rendu d'entretien ?",
         "Elle peut préparer une trame ou un brouillon, mais le compte rendu d'un conseil doit rester un écrit du courtier : c'est lui qui l'engage."),
        ("Faut-il une IA pour automatiser une échéance ?",
         "Non. Un rappel d'échéance est une règle de date. L'IA devient utile quand il faut comprendre un texte, pas quand il faut compter des jours."),
        ("Quel est le principal risque d'un projet IA en cabinet ?",
         "Commencer par la partie la plus visible (un assistant généraliste) plutôt que par la tâche la plus coûteuse en temps. Le résultat est impressionnant et le gain faible."),
    ],
)

PAGES["fr/guide/onboarding-client-courtier"] = dict(
    marche="FR",
    titre="Onboarding client dans un cabinet de courtage : la méthode — COURTIA",
    description=(
        "Structurer l'entrée d'un nouveau client dans un cabinet de courtage : ce qui est demandé, "
        "dans quel ordre, ce qui se déduit du dossier, et comment éviter l'aller-retour de pièces."
    ),
    h1="Onboarding client : demander une fois, dans le bon ordre",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Guides", "/fr/guide/onboarding-client-courtier")],
    maillage=[
        ("Gestion documentaire", "/fr/gestion-documentaire-courtier-assurance", "la collecte des pièces"),
        ("Espace client", "/fr/portail-client-courtier-assurance", "le dépôt par lien"),
        ("Devis", "/fr/logiciel-devis-courtier-assurance", "ce qui suit l'entrée en relation"),
        ("Réduire la double saisie", "/fr/reduire-double-saisie-cabinet-courtage", "la conséquence directe"),
    ],
    corps="""
<div class="section">
<h2>L'entrée d'un client, c'est la réputation du cabinet</h2>
<p>Les premières heures d'une relation donnent le ton. Un onboarding en trois allers-retours de pièces
laisse l'impression d'un cabinet mal organisé — alors que le conseil, lui, était bon. La méthode
consiste à demander les pièces <em>une fois</em>, dans un ordre qui ne bloque rien.</p>
</div>

<h2>Ce qui est demandé, et à quel moment</h2>
<table>
<tr><th>Moment</th><th>Ce qu'on demande au client</th><th>Pourquoi à ce moment-là</th></tr>
<tr><td>Premier échange</td><td>Les éléments de situation utiles au besoin exprimé</td><td>Ils conditionnent la préconisation</td></tr>
<tr><td>Après l'accord de principe</td><td>Les pièces administratives (identité, domicile)</td><td>Elles sont nécessaires à la souscription, pas avant</td></tr>
<tr><td>À la signature</td><td>Ce que la compagnie exige précisément</td><td>Évite de demander des pièces non nécessaires</td></tr>
</table>
<p>La règle : ne jamais demander une pièce « au cas où ». Chaque pièce inutile est une occasion de
faire attendre un dossier.</p>

<h2>Le test en trois questions</h2>
<ol>
<li>Combien de fois le client a-t-il dû envoyer quelque chose ? Si la réponse dépasse deux, il y a un
problème d'ordre des étapes.</li>
<li>A-t-il créé un compte, installé une application, retenu un mot de passe ? Chacun de ces points
est une friction.</li>
<li>Sait-il ce qui se passe ensuite ? Un client qui ne sait pas attend quoi de qui relance le
cabinet.</li>
</ol>

<h2>Ce que l'outil apporte</h2>
<ul>
<li><strong>Un dossier créé au premier contact</strong>, enrichi ensuite, jamais reconstruit.</li>
<li><strong>Le dépôt de pièces par lien</strong>, qui évite les allers-retours par e-mail.</li>
<li><strong>La trace de ce qui a été demandé et reçu</strong>, avec les dates.</li>
<li><strong>La conversion du prospect en client</strong> sans recopie.</li>
</ul>

<h2>L'erreur à éviter</h2>
<p>Collecter exhaustivement au premier contact. Un onboarding lourd décourage les clients à faible
enjeu et retarde les autres. Mieux vaut ouvrir le dossier, avancer, et compléter au fil des étapes
réelles.</p>
""",
    faq=[
        ("Faut-il demander toutes les pièces dès le départ ?",
         "Non. On demande ce qui est nécessaire au stade en cours : au-delà, chaque pièce supplémentaire retarde l'ensemble."),
        ("Le client peut-il déposer les pièces sans compte ?",
         "Oui, par lien. C'est un choix produit : la friction d'inscription fait échouer la collecte."),
        ("Comment savoir ce qui manque encore ?",
         "Le dossier indique les pièces demandées et non reçues, avec leur date de demande."),
    ],
)

PAGES["fr/guide/suivre-prospects-courtier"] = dict(
    marche="FR",
    titre="Suivre ses prospects dans un cabinet de courtage : méthode — COURTIA",
    description=(
        "Comment suivre les prospects d'un cabinet de courtage sans harceler : rythme de contact, "
        "motif de sortie, bascule vers le client, et ce qui doit être écrit."
    ),
    h1="Suivre ses prospects sans les harceler, et sans les oublier",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Guides", "/fr/guide/suivre-prospects-courtier")],
    maillage=[
        ("Prospects et clients", "/fr/gestion-prospects-clients-courtier-assurance", "le suivi dans le produit"),
        ("Structurer un pipeline", "/fr/guide/structurer-pipeline-courtier", "les étapes du parcours"),
        ("Prospection", "/ch/logiciel-prospection-courtier-assurance-suisse", "la version suisse"),
        ("Relances clients", "/fr/relance-client-assurance", "les relances côté client"),
    ],
    corps="""
<div class="section">
<h2>Deux échecs symétriques</h2>
<p>Relancer trop souvent fait fuir ; ne pas relancer fait disparaître. La différence n'est pas dans
la fréquence mais dans le <em>motif</em> de chaque contact : un message qui apporte un élément utile
— une échéance, une information, une comparaison — n'est pas un harcèlement.</p>
</div>

<h2>Un rythme simple, tenable</h2>
<table>
<tr><th>Après un devis</th><th>Contact</th><th>Contenu</th></tr>
<tr><td>J+3</td><td>Message court</td><td>Confirmer la réception, proposer de répondre aux questions</td></tr>
<tr><td>J+10</td><td>Appel ou message</td><td>Apporter un élément : une précision de garantie, une date</td></tr>
<tr><td>J+20</td><td>Décision</td><td>Classer le dossier : en attente d'un événement, ou clos</td></tr>
</table>
<p>Ce qui compte n'est pas le calendrier exact : c'est qu'il soit décidé, affiché, et que le dossier
en sorte par une décision et non par oubli.</p>

<h2>Ce qu'un motif de sortie doit contenir</h2>
<ol>
<li>La raison (prix, garantie, timing, choix d'un autre intermédiaire, silence).</li>
<li>La date du dernier contact.</li>
<li>Ce qui pourrait rouvrir le dossier (échéance, changement de situation).</li>
</ol>
<p>Un prospect clos avec un motif exploitable vaut mieux qu'un prospect « en cours » depuis deux
ans, qui pollue toutes les statistiques du cabinet.</p>

<h2>Ce qu'il faut écrire, ce qu'il ne faut pas</h2>
<p>Écrivez court : le besoin, la provenance, la date du dernier échange, les éléments de situation.
N'écrivez pas le récit des appels : personne ne le lira, et cela donne l'impression d'un dossier
tenu alors qu'il ne l'est pas.</p>

<h2>La bascule vers le client</h2>
<p>Le jour de la signature, rien ne doit être recréé : les devis, les échanges, les pièces déjà
reçues restent attachés au dossier. C'est la raison pour laquelle un suivi unique — le même objet
avant et après la signature — évite la double saisie et les pertes d'historique.</p>
""",
    faq=[
        ("Combien de fois relancer avant de classer ?",
         "C'est une décision du cabinet, mais elle doit être écrite. Un dossier qui reste « en cours » sans contact pendant six mois fausse la lecture du pipeline."),
        ("Faut-il un motif de perte obligatoire ?",
         "Oui, pour décider ensuite. Sans motif, un refus n'apprend rien et le même profil de client revient échouer."),
        ("Peut-on faire tout cela sans logiciel ?",
         "Oui, mais il faut un endroit unique. Le problème n'est pas la méthode : c'est de la tenir quand il y a trente dossiers ouverts."),
    ],
)
