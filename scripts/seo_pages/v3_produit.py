#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v3_produit.py — VAGUE 3, groupe « produit et fonctions » (9 pages France).

Chaque page répond à une intention retenue après les passes TypeSafe/JEV :
  Pass A (cartographie marché)   : famille manquante = entrées produit génériques
  Pass B (adéquation produit)    : fit >= 0,70 requis — prospects 0,86 ; documentaire 0,88 ;
                                   import 0,80 ; équipe 0,85 ; pilotage 0,73 ; portail 0,82 ;
                                   outil/plateforme 0,75
  Pass C (fusion d'intentions)   : « outil » et « plateforme » = intentions distinctes (merge=False) ;
                                   clients et prospects = une seule page (merge=True) ;
                                   « CRM assurance » et « logiciel de courtage » = fusionnés dans les
                                   pages existantes (aucune page créée pour ces synonymes)
  Pass D (content gap)           : la concurrence reste dans un vocabulaire de CRM générique — ces
                                   pages utilisent les objets réels du courtage
  Pass E (red team France)       : manque le plus grave = ces entrées produit
"""
from generate_seo_pillars import SITE

PAGES = {}

PAGES["fr/outil-courtier-assurance"] = dict(
    marche="FR",
    titre="Outil pour courtier d'assurance : ce qu'il doit réunir — COURTIA",
    description=(
        "Ce qu'un outil de courtier d'assurance doit réunir : dossier client, échéances, pièces, "
        "devis, relances, commissions. Et ce qu'il ne doit pas faire. COURTIA, essai 7 jours."
    ),
    h1="Outil pour courtier d'assurance : ce qu'il doit réunir pour tenir un portefeuille",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Outil courtier assurance", "/fr/outil-courtier-assurance")],
    maillage=[
        ("Logiciel courtier assurance", "/fr/logiciel-courtier-assurance", "le produit dans son ensemble"),
        ("CRM courtier assurance", "/fr/crm-courtier-assurance", "le dossier client au centre"),
        ("Gestion documentaire", "/fr/gestion-documentaire-courtier-assurance", "les pièces et les documents"),
        ("Gain de temps au cabinet", "/fr/gagner-du-temps-courtier-assurance", "ce qui se récupère réellement"),
    ],
    corps="""
<p>Un courtier n'a pas besoin de « plus d'outils » : il a besoin d'un endroit où le travail tient
debout. La question utile n'est donc pas « quel est le meilleur outil ? » mais « qu'est-ce qu'un
outil doit réunir pour qu'un portefeuille ne se perde pas entre un tableur, une boîte e-mail, un
agenda et une armoire de dossiers ? »</p>

<div class="section">
<h2>Les six choses qu'un outil de courtage doit réunir</h2>
<ol>
<li><strong>Le dossier client</strong> — coordonnées, situation, historique : la base de tout le
reste. Sans lui, chaque autre fonctionnalité devient une liste sans propriétaire.</li>
<li><strong>Les contrats et leurs échéances</strong> — compagnie, prime, date d'échéance, statut.
C'est ce qui alimente les renouvellements au lieu de les découvrir trop tard.</li>
<li><strong>Les pièces et les documents</strong> — ce que le client a transmis, ce qui manque, ce
qui a été remis. Un devoir de conseil se défend avec des pièces, pas avec des souvenirs.</li>
<li><strong>Les devis et leur suivi</strong> — l'état de chaque proposition, y compris celles qui
restent sans réponse : c'est là que se joue une partie du chiffre d'affaires.</li>
<li><strong>Les relances et les tâches</strong> — qui doit faire quoi, et quand. Un outil qui ne
porte pas l'action oblige à tenir un second système à côté.</li>
<li><strong>Les commissions et le pilotage</strong> — barèmes, relevés, états par période, et une
vue d'ensemble de l'activité.</li>
</ol>
</div>

<h2>Ce qu'un outil ne doit pas faire</h2>
<ul>
<li><strong>Décider à la place du courtier</strong> : le conseil, la couverture, la validation d'un
dossier engagent la responsabilité du cabinet, pas celle d'un logiciel.</li>
<li><strong>Inventer une donnée</strong> : quand l'information manque, un écran doit afficher un
tiret, pas une valeur plausible. Un indicateur faux est pire qu'un indicateur absent.</li>
<li><strong>Envoyer à l'aveugle</strong> : préparer un message et le laisser valider par un humain
n'est pas une limite technique, c'est une protection.</li>
<li><strong>Enfermer le cabinet</strong> : les données du cabinet doivent rester exportables et le
fonctionnement compréhensible sans formation de trois jours.</li>
</ul>

<h2>Avant / avec, sur une semaine ordinaire</h2>
<table>
<tr><th>Ce qui se passe</th><th>Avec plusieurs outils séparés</th><th>Avec un outil qui réunit</th></tr>
<tr><td>Un client appelle</td><td>Ouvrir messagerie, dossier, agenda</td><td>Une fiche, tout est là</td></tr>
<tr><td>Une échéance approche</td><td>Elle dépend d'un rappel posé à la main</td><td>Elle remonte dans les actions du jour</td></tr>
<tr><td>Une pièce manque</td><td>Relance écrite à la main, pièce classée à la main</td><td>Lien de dépôt, pièce rattachée au dossier</td></tr>
<tr><td>Un devis dort</td><td>Personne ne sait s'il a été relancé</td><td>Le registre porte l'état et la relance</td></tr>
<tr><td>Fin de mois</td><td>Tableur reconstitué</td><td>États calculés sur les données saisies</td></tr>
</table>

<h2>Comment choisir, concrètement</h2>
<ol>
<li>Listez les questions que vous vous posez chaque semaine et comptez combien d'outils il faut
ouvrir pour y répondre.</li>
<li>Vérifiez que le devis, la pièce et l'échéance vivent <em>dans le dossier</em> et non à côté.</li>
<li>Regardez ce qui se passe quand le client ne répond pas : l'outil porte-t-il l'action ?</li>
<li>Demandez à voir les écrans réels, pas une présentation.</li>
</ol>
<p class="doux">Cette page décrit ce qu'un outil doit réunir ; elle ne classe aucun éditeur et
n'avance aucun gain chiffré. La démonstration publique de COURTIA est ouverte et montre l'outil tel
qu'il est.</p>
""",
    faq=[
        ("Quelle différence entre un outil métier et un CRM classique ?",
         "Un CRM classique suit des contacts et des opportunités. Un outil de courtage suit des objets métier : contrats avec compagnie et échéance, devis à signer, pièces justificatives, commissions, obligations d'information."),
        ("Faut-il un outil si le cabinet tient déjà un tableur ?",
         "Cela dépend de ce que le tableur coûte en manipulations. La page « mesurer son temps administratif » propose quatre comptages pour le savoir avant de dépenser quoi que ce soit."),
        ("Un outil peut-il remplacer un collaborateur administratif ?",
         "Non. Il retire des manipulations et évite des oublis ; il ne remplace ni le jugement du courtier ni une présence au téléphone."),
    ],
)

PAGES["fr/gestion-prospects-clients-courtier-assurance"] = dict(
    marche="FR",
    titre="Gérer prospects et clients dans un cabinet de courtage — COURTIA",
    description=(
        "Suivre les prospects et les clients sans deux systèmes : pipeline de prospection, passage "
        "en client, dossier unique, historique conservé. COURTIA, essai 7 jours."
    ),
    h1="Gérer les prospects et les clients sans tenir deux mondes séparés",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Prospects et clients", "/fr/gestion-prospects-clients-courtier-assurance")],
    maillage=[
        ("Gestion des devis", "/fr/logiciel-devis-courtier-assurance", "ce qui suit le prospect jusqu'à la signature"),
        ("CRM courtier assurance", "/fr/crm-courtier-assurance", "le dossier client qui prend la suite"),
        ("Prospection", "/fr/guide/suivre-prospects-courtier", "la méthode pour ne pas perdre un prospect"),
        ("Relances clients", "/fr/relance-client-assurance", "les relances une fois le client acquis"),
    ],
    corps="""
<p>Beaucoup de cabinets gèrent les prospects dans un outil et les clients dans un autre. Le jour de
la signature, il faut recopier. Et plus tard, personne ne sait qui avait amené le dossier, ni ce qui
avait été promis pendant la phase de prospection.</p>

<div class="section">
<h2>Un seul dossier, deux états</h2>
<p>Dans COURTIA, un prospect n'est pas un objet à part : c'est une fiche client à un stade antérieur.
La conséquence est simple : quand la proposition est acceptée, <strong>le dossier continue</strong> —
il n'est pas recréé. L'historique des échanges, les devis envoyés et les pièces reçues restent
attachés au même endroit.</p>
</div>

<h2>Ce que la prospection fait dans le produit</h2>
<ul>
<li><strong>Campagnes et recherche de prospects</strong> — de quoi constituer une liste d'approche et
suivre ce qui a été fait.</li>
<li><strong>Boîte de réception des réponses</strong> — les retours sont regroupés pour être traités,
au lieu d'être dispersés dans une boîte mail générale.</li>
<li><strong>Pipeline</strong> — les étapes du parcours commercial : nouveau, contacté, rendez-vous,
devis, gagné ou perdu. L'état est visible, donc il est discutable en réunion.</li>
<li><strong>Passage en client</strong> — la signature transforme le prospect en client sans
ressaisie, et le dossier passe dans le suivi de portefeuille.</li>
</ul>

<h2>Avant / avec</h2>
<table>
<tr><th>Étape</th><th>Sans continuité</th><th>Avec un dossier unique</th></tr>
<tr><td>Un prospect arrive</td><td>Note personnelle, e-mail, ou tableur</td><td>Fiche avec sa provenance et son besoin</td></tr>
<tr><td>Un devis part</td><td>Document envoyé, suivi de mémoire</td><td>Le devis vit dans le dossier, avec son état</td></tr>
<tr><td>Le client signe</td><td>Recréation d'un dossier client</td><td>La même fiche devient cliente, historique inclus</td></tr>
<tr><td>Six mois plus tard</td><td>« Qui nous avait amené ce dossier ? »</td><td>L'historique répond</td></tr>
</table>

<h2>Le point à surveiller : ne pas confondre suivi et harcèlement</h2>
<p>Un pipeline n'autorise pas à relancer sans fin. COURTIA prépare les messages et laisse le cabinet
décider ; les relances ne partent pas seules. C'est une question de réputation, et cela protège
aussi le courtier d'un envoi mal placé.</p>
""",
    faq=[
        ("Peut-on importer un fichier de prospects existant ?",
         "Le produit gère des imports : c'est prévu pour ne pas recommencer à zéro. Le périmètre exact dépend de la structure du fichier, qui est vérifiée avant import."),
        ("Les prospects et les clients sont-ils cloisonnés par cabinet ?",
         "Oui. Les données sont cloisonnées par cabinet : un cabinet ne voit que ses données."),
        ("Que devient un prospect perdu ?",
         "Il reste dans l'historique avec son motif. C'est ce qui permet, plus tard, de comprendre pourquoi un profil de client ne signe pas."),
    ],
)

PAGES["fr/gestion-documentaire-courtier-assurance"] = dict(
    marche="FR",
    titre="Gestion documentaire du courtier : pièces, documents, traçabilité — COURTIA",
    description=(
        "Gestion des pièces et documents d'un cabinet de courtage : collecte par lien, rattachement "
        "au dossier, génération de documents, traçabilité. COURTIA, essai 7 jours."
    ),
    h1="Gestion documentaire : arrêter de courir après les pièces",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Gestion documentaire", "/fr/gestion-documentaire-courtier-assurance")],
    maillage=[
        ("IA documentaire", "/fr/ia-gestion-documentaire-assurance", "la lecture assistée des pièces"),
        ("Portail client", "/fr/portail-client-courtier-assurance", "ce que le client peut faire seul"),
        ("CRM courtier assurance", "/fr/crm-courtier-assurance", "le dossier auquel tout se rattache"),
        ("Conformité", "/fr/guide/devoir-de-conseil", "pourquoi la pièce compte autant que le conseil"),
    ],
    corps="""
<p>Dans un cabinet de courtage, une pièce manquante bloque tout : pas de souscription, pas de devis
complet, pas de dossier défendable. Le problème n'est pas de classer : c'est de <em>savoir</em> ce
qui manque, pour qui, et depuis quand.</p>

<div class="section">
<h2>Trois moments, trois réponses</h2>
<table>
<tr><th>Moment</th><th>Ce qui se passe sans outil</th><th>Ce que fait COURTIA</th></tr>
<tr><td>Le client doit fournir une pièce</td><td>Demande par e-mail, pièce reçue en désordre, classement manuel</td><td>Un lien de dépôt : le client transmet la pièce, elle se rattache au dossier</td></tr>
<tr><td>Une pièce arrive</td><td>Elle est relue et recopiée à la main dans le dossier</td><td>Lecture assistée : les informations utiles sont extraites, le courtier confirme</td></tr>
<tr><td>Un document doit être produit</td><td>On repart d'un ancien fichier et on réadapte</td><td>Génération depuis les données du dossier, puis trace de ce qui a été remis</td></tr>
</table>
</div>

<h2>Pourquoi la traçabilité n'est pas un luxe</h2>
<p>Un contrôle ne demande pas « avez-vous bien travaillé ? » mais « montrez ce qui a été présenté,
à quelle date, sur quelles informations ». Une pièce qui n'a pas de date ni de dossier rattaché ne
prouve rien. C'est la raison pour laquelle COURTIA rattache chaque document à un client, avec son
historique, plutôt que de le déposer dans un espace partagé générique.</p>

<h2>Ce que la gestion documentaire ne fait pas</h2>
<ul>
<li>Elle ne remplace pas un <strong>coffre-fort électronique à valeur probante légale</strong> :
COURTIA organise et trace, il ne délivre pas d'horodatage qualifié.</li>
<li>Elle ne décide pas de ce qui doit être conservé : les durées et obligations relèvent du cabinet
et, en Suisse, de la réglementation applicable au dossier client.</li>
<li>Elle n'envoie rien sans validation humaine.</li>
</ul>
<p class="doux">La page « IA documentaire » décrit précisément ce que la lecture assistée fait et ne
fait pas ; la page « portail client » montre ce que le client peut faire sans compte.</p>
""",
    faq=[
        ("Le client doit-il créer un compte pour déposer une pièce ?",
         "Non. Le dépôt se fait par un lien ; le client n'a pas de compte à créer. C'est volontaire : chaque étape imposée au client est une raison de ne pas envoyer la pièce."),
        ("Peut-on produire une attestation ou un courrier depuis le dossier ?",
         "Oui, des documents se génèrent depuis les données du dossier. Le contenu exact des modèles dépend du cabinet."),
        ("Les documents sont-ils cloisonnés par cabinet ?",
         "Oui, comme le reste des données : chaque cabinet n'accède qu'à ses propres dossiers."),
    ],
)

PAGES["fr/ia-gestion-documentaire-assurance"] = dict(
    marche="FR",
    titre="IA documentaire pour courtier : lire les pièces sans les recopier — COURTIA",
    description=(
        "Ce qu'une lecture assistée de documents fait réellement dans un cabinet de courtage : "
        "extraire les informations utiles d'une pièce, laisser le courtier confirmer. Sans promesse."
    ),
    h1="IA documentaire : lire une pièce, extraire l'utile, laisser confirmer",
    fil=[("Accueil", "/"), ("France", "/fr"), ("IA documentaire", "/fr/ia-gestion-documentaire-assurance")],
    maillage=[
        ("Gestion documentaire", "/fr/gestion-documentaire-courtier-assurance", "la collecte et la traçabilité des pièces"),
        ("IA pour courtier", "/fr/ia-courtier-assurance", "les autres usages de l'assistant"),
        ("CRM courtier assurance", "/fr/crm-courtier-assurance", "le dossier alimenté par les pièces"),
        ("Gain de temps", "/fr/gagner-du-temps-courtier-assurance", "ce que ce traitement remplace"),
    ],
    corps="""
<p>« IA documentaire » recouvre souvent deux choses très différentes : un outil qui
<strong>propose</strong> des informations à confirmer, et un outil qui écrit dans un dossier sans
que personne ne regarde. Le second est dangereux dans un métier où une erreur de date ou de montant
se retrouve devant un client.</p>

<div class="section">
<h2>Ce que la lecture assistée fait dans COURTIA</h2>
<ul>
<li><strong>Elle lit une pièce déposée</strong> — pièce d'identité, justificatif, relevé — reçue via
le lien de dépôt ou ajoutée au dossier.</li>
<li><strong>Elle en extrait les informations utiles</strong> — ce qui sert au dossier : identité,
dates, références, montants selon la nature de la pièce.</li>
<li><strong>Elle les présente au courtier</strong> pour confirmation ou correction. Rien n'est
considéré comme acquis sans ce passage.</li>
<li><strong>Elle évite la recopie</strong> — c'est le seul bénéfice revendiqué, et il est réel :
la ressaisie d'un même document dans trois champs différents disparaît.</li>
</ul>
</div>

<h2>Ce qu'elle ne fait pas</h2>
<ul>
<li>Elle ne <strong>valide</strong> pas l'authenticité d'un document : elle extrait, elle ne certifie pas.</li>
<li>Elle ne <strong>décide</strong> rien : ni une garantie, ni une acceptation, ni un tarif.</li>
<li>Elle ne remplace pas la lecture du courtier quand la pièce est ambiguë, illisible ou hors du cas
prévu : là, l'outil doit le dire au lieu de deviner.</li>
</ul>

<h2>Pourquoi confirmer reste la règle</h2>
<p>Dans le courtage, la valeur d'un dossier tient à la confiance qu'on peut lui accorder des années
plus tard. Une donnée extraite automatiquement mais non vérifiée introduit une faiblesse invisible ;
un clic de confirmation la supprime. Ce clic coûte quelques secondes, une erreur coûte un litige.</p>

<h2>Où cela se branche</h2>
<p>La lecture assistée n'est pas un outil isolé : elle alimente le dossier client, à côté de la
collecte de pièces et de la génération de documents. Voir
<a href="/fr/gestion-documentaire-courtier-assurance">la gestion documentaire</a> et
<a href="/fr/ia-courtier-assurance">les usages de l'assistant</a>.</p>
""",
    faq=[
        ("Les pièces sont-elles envoyées à un service externe ?",
         "Le traitement se fait dans le périmètre du cabinet, avec des prestataires techniques décrits dans les mentions relatives aux sous-traitants. Aucune donnée de dossier n'est utilisée pour entraîner un modèle public."),
        ("L'extraction est-elle fiable à 100 % ?",
         "Non, et aucun outil de ce type ne peut le promettre. C'est pourquoi chaque information extraite est présentée pour confirmation avant d'entrer dans le dossier."),
        ("Faut-il un volume important pour que ce soit utile ?",
         "L'intérêt apparaît dès qu'un même document doit être recopié dans plusieurs champs, ce qui arrive sur presque tous les dossiers."),
    ],
)

PAGES["fr/import-portefeuille-courtier-assurance"] = dict(
    marche="FR",
    titre="Changer de logiciel de courtage : reprendre son portefeuille — COURTIA",
    description=(
        "Reprendre un portefeuille existant dans un logiciel de courtage : ce qui s'importe, ce qui "
        "se vérifie, ce qui reste à la main. Méthode de migration sans interruption d'activité."
    ),
    h1="Changer de logiciel sans perdre son portefeuille",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Changement de logiciel", "/fr/import-portefeuille-courtier-assurance")],
    maillage=[
        ("Logiciel courtier assurance", "/fr/logiciel-courtier-assurance", "ce vers quoi on migre"),
        ("Gestion de portefeuille", "/fr/gestion-portefeuille-courtier", "ce qu'on doit retrouver après migration"),
        ("Gestion documentaire", "/fr/gestion-documentaire-courtier-assurance", "ce qui ne s'importe pas tout seul"),
        ("Changer de logiciel en Suisse", "/ch/import-portefeuille-courtier-assurance-suisse", "les mêmes questions dans le cadre suisse"),
    ],
    corps="""
<p>Ce qui bloque un changement de logiciel n'est jamais le logiciel : c'est la peur de perdre trois
ans de dossiers, ou de passer deux mois à ressaisir. Une migration se prépare comme un déménagement :
on sait ce qui part, ce qui reste, et ce qui arrivera cassé.</p>

<div class="section">
<h2>Ce qui s'importe</h2>
<ul>
<li><strong>Les clients</strong> — identité, coordonnées, situation, étiquettes utiles.</li>
<li><strong>Les contrats</strong> — compagnie, numéro, prime, date d'échéance, statut.</li>
<li><strong>Les échéances</strong> — c'est ce qui conditionne les renouvellements dès le premier
mois : sans elles, la migration n'apporte rien.</li>
<li><strong>Les commissions</strong> — barèmes et historique si la structure de départ le permet.</li>
</ul>
</div>

<h2>Ce qui ne s'importe pas tout seul</h2>
<ul>
<li><strong>Les documents mal nommés</strong> — un dossier de fichiers sans convention ne peut pas
être rattaché automatiquement : il se rattache au fil de l'eau, dossier par dossier.</li>
<li><strong>Les notes libres</strong> — un commentaire dans un champ « divers » de l'ancien outil
n'a pas d'équivalent : mieux vaut le savoir avant, pas après.</li>
<li><strong>Les automatisations maison</strong> — formules de tableur, rappels personnels : elles
n'ont pas de sens dans un outil qui porte ces fonctions nativement.</li>
</ul>

<h2>L'ordre qui évite les mauvaises surprises</h2>
<ol>
<li>Exporter l'ancien système <em>avant</em> de résilier quoi que ce soit, et archiver l'export.</li>
<li>Importer, puis contrôler sur un échantillon : 10 dossiers tirés au hasard, comparés ligne à ligne.</li>
<li>Vérifier en priorité les échéances à moins de 90 jours : c'est là que l'erreur coûte cher.</li>
<li>Faire tourner l'ancien et le nouveau en parallèle le temps d'un cycle de renouvellement partiel,
puis basculer.</li>
</ol>
<p class="doux">COURTIA ne facture pas de « frais de migration » : la reprise se fait avec le
cabinet, à partir de ses propres fichiers. Le délai dépend de la qualité des données de départ, et
nous ne promettons pas de durée sans avoir vu les fichiers.</p>
""",
    faq=[
        ("Faut-il arrêter l'ancien logiciel tout de suite ?",
         "Non. La méthode recommandée est de conserver l'export de l'ancien système et de vérifier l'import sur un échantillon avant toute résiliation."),
        ("Que se passe-t-il si un dossier est mal importé ?",
         "Il est corrigé à la main ; c'est pourquoi le contrôle se fait sur un échantillon de dix dossiers, en priorité sur ceux dont l'échéance approche."),
        ("Les documents de l'ancien outil suivent-ils ?",
         "Ils s'ajoutent au fil de l'eau lorsqu'ils sont mal structurés. Les documents déjà bien nommés et rattachables à un client peuvent être importés."),
    ],
)

PAGES["fr/logiciel-courtier-equipe"] = dict(
    marche="FR",
    titre="Faire travailler une équipe de courtage dans un seul outil — COURTIA",
    description=(
        "Plusieurs collaborateurs, des rôles distincts, des données cloisonnées par cabinet, des "
        "tâches affectées : ce que COURTIA permet réellement dans un cabinet de plusieurs personnes."
    ),
    h1="Plusieurs personnes dans le cabinet, un seul état des dossiers",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Travail en équipe", "/fr/logiciel-courtier-equipe")],
    maillage=[
        ("Gestion de cabinet", "/fr/logiciel-gestion-cabinet-courtage", "commissions, coûts et pilotage"),
        ("Reporting et pilotage", "/fr/reporting-pilotage-cabinet-courtage", "voir l'activité du cabinet"),
        ("Multi-agences", "/fr/logiciel-courtier-multi-agences", "plusieurs sites, une organisation"),
        ("CRM courtier assurance", "/fr/crm-courtier-assurance", "le dossier partagé"),
    ],
    corps="""
<p>À partir de deux personnes, la question n'est plus « où est le dossier ? » mais « qui le suit, et
où en est-il ? ». C'est un problème d'organisation, pas de logiciel — mais aucun logiciel ne peut le
résoudre s'il n'a pas été pensé pour plusieurs utilisateurs.</p>

<div class="section">
<h2>Ce qui change vraiment avec une équipe</h2>
<ul>
<li><strong>L'affectation</strong> — un dossier ou une tâche a un responsable visible. Sans cela, la
tâche est « à tout le monde », donc à personne.</li>
<li><strong>Les rôles</strong> — accès différenciés selon la fonction : tout le monde n'a pas à voir
ou à modifier tout.</li>
<li><strong>Le cloisonnement par cabinet</strong> — les données d'un cabinet ne sont pas visibles
depuis un autre. C'est une exigence de base, pas un argument commercial.</li>
<li><strong>Le suivi collectif</strong> — la file de travail du jour est partagée, ce qui permet de
répartir la charge au lieu de la subir.</li>
</ul>
</div>

<h2>Avant / avec, dans un cabinet de trois personnes</h2>
<table>
<tr><th>Situation</th><th>Sans outil partagé</th><th>Avec un état partagé</th></tr>
<tr><td>Un client appelle pour un dossier suivi par un collègue</td><td>« Il faut lui demander »</td><td>La fiche montre l'état, les échéances, les pièces</td></tr>
<tr><td>Une tâche est créée à l'oral</td><td>Oubliée une fois sur deux</td><td>Elle existe avec un responsable et une échéance</td></tr>
<tr><td>Un collaborateur part</td><td>Son portefeuille est à reconstituer</td><td>Les dossiers restent dans le cabinet</td></tr>
<tr><td>Un nouveau collaborateur arrive</td><td>Formation au bouche-à-oreille</td><td>Le dossier s'explique par son historique</td></tr>
</table>

<h2>Ce qu'un outil ne réglera pas</h2>
<p>Il ne dira pas qui doit faire quoi à la place du dirigeant, il ne remplace pas une réunion de
répartition, et il ne compense pas un cabinet qui n'a pas de règles de nommage ni de suivi commun.
Les fonctions d'équipe rendent l'organisation visible ; elles ne créent pas l'organisation.</p>
""",
    faq=[
        ("Combien d'utilisateurs sont possibles ?",
         "La grille prévoit plusieurs utilisateurs selon l'offre ; les rôles et le cloisonnement par cabinet sont prévus dans le produit."),
        ("Un collaborateur peut-il voir une fiche sans pouvoir la modifier ?",
         "Les rôles permettent de distinguer consultation et modification. Le périmètre exact se règle avec le cabinet."),
        ("Les données restent-elles au cabinet si un collaborateur part ?",
         "Oui : les dossiers appartiennent au cabinet, pas au compte d'un collaborateur."),
    ],
)

PAGES["fr/reporting-pilotage-cabinet-courtage"] = dict(
    marche="FR",
    titre="Piloter un cabinet de courtage : indicateurs réels, décisions utiles — COURTIA",
    description=(
        "Pilotage d'un cabinet de courtage : production, santé du portefeuille, opportunités, "
        "objectifs. Ce que les indicateurs calculent, et ce qu'ils refusent d'inventer."
    ),
    h1="Piloter un cabinet de courtage : voir l'activité, pas un tableau décoratif",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Pilotage du cabinet", "/fr/reporting-pilotage-cabinet-courtage")],
    maillage=[
        ("Gestion de cabinet", "/fr/logiciel-gestion-cabinet-courtage", "commissions et coûts"),
        ("Gestion de portefeuille", "/fr/gestion-portefeuille-courtier", "les contrats et leurs échéances"),
        ("Travail en équipe", "/fr/logiciel-courtier-equipe", "répartition et responsabilités"),
        ("Mesurer son temps administratif", "/fr/mesurer-temps-administratif-cabinet", "une mesure faite à la main"),
    ],
    corps="""
<p>Un tableau de bord n'a de valeur que s'il permet une décision. Trois questions méritent un
indicateur dans un cabinet de courtage : que se passe-t-il dans les 90 prochains jours, quels
dossiers décrochent, et où va l'activité.</p>

<div class="section">
<h2>Ce que le pilotage calcule dans COURTIA</h2>
<ul>
<li><strong>Le portefeuille</strong> — contrats actifs, primes, échéances à venir, répartition par
branche et par compagnie.</li>
<li><strong>La santé du portefeuille</strong> — un score calculé sur les dossiers réels, accompagné
des motifs : ce qui le fait baisser est affiché, pas seulement le chiffre.</li>
<li><strong>Les opportunités</strong> — des pistes de travail dans le portefeuille existant,
présentées comme telles et non comme un chiffre d'affaires à venir.</li>
<li><strong>Les objectifs</strong> — suivis sur les données saisies.</li>
<li><strong>La production et les commissions</strong> — par période, avec les états correspondants.</li>
<li><strong>L'usage</strong> — quels dossiers sont traités, quels dossiers dorment.</li>
</ul>
</div>

<h2>La règle qui rend un tableau crédible</h2>
<p>Un indicateur doit être <strong>calculé sur des données réellement présentes</strong>. Quand la
donnée manque, l'écran affiche un tiret plutôt qu'une valeur plausible ou zéro. C'est une règle que
COURTIA applique : un cabinet qui voit « — » comprend qu'il doit saisir quelque chose, alors qu'un
« 0 € » lui ferait croire à une activité nulle.</p>

<h2>Trois décisions qu'un pilotage doit permettre</h2>
<ol>
<li><strong>Réaffecter du temps</strong> : voir quels dossiers n'ont pas bougé depuis six mois.</li>
<li><strong>Anticiper un creux</strong> : regarder les échéances des 90 jours et les renouvellements
à préparer.</li>
<li><strong>Arbitrer une concentration</strong> : mesurer la part d'une branche ou d'une compagnie,
et décider si c'est voulu.</li>
</ol>

<h2>Ce que le pilotage ne fait pas</h2>
<p>Il ne fixe pas les objectifs à la place du dirigeant, il ne calcule pas la comptabilité du
cabinet, et il n'invente aucun chiffre de marché. Les indicateurs portent sur les données du
cabinet, et sur elles seules.</p>
""",
    faq=[
        ("D'où viennent les chiffres affichés ?",
         "Des données saisies dans le cabinet : clients, contrats, devis, tâches et commissions. Aucun jeu d'exemple n'est injecté dans un cabinet réel."),
        ("Le score de santé du portefeuille est-il un indice de marché ?",
         "Non. C'est un indicateur interne calculé sur les dossiers du cabinet, avec ses motifs affichés."),
        ("Peut-on exporter les états ?",
         "Le produit prévoit l'export des données du cabinet ; les états de commissions se produisent par période."),
    ],
)

PAGES["fr/portail-client-courtier-assurance"] = dict(
    marche="FR",
    titre="Ce que le client peut faire seul dans un cabinet de courtage — COURTIA",
    description=(
        "Espace client d'un cabinet de courtage : dépôt de pièces par lien, sans compte à créer. "
        "Ce que le client fait seul, ce qui reste au courtier, et pourquoi c'est ainsi."
    ),
    h1="Ce que le client fait seul, et ce qui doit rester au courtier",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Espace client", "/fr/portail-client-courtier-assurance")],
    maillage=[
        ("Gestion documentaire", "/fr/gestion-documentaire-courtier-assurance", "les pièces rattachées au dossier"),
        ("Relances clients", "/fr/relance-client-assurance", "quand le client ne répond pas"),
        ("CRM courtier assurance", "/fr/crm-courtier-assurance", "là où tout arrive"),
        ("Gain de temps", "/fr/gagner-du-temps-courtier-assurance", "l'effet sur la semaine du cabinet"),
    ],
    corps="""
<p>Un « espace client » mal conçu crée du travail au lieu d'en retirer : soit il impose une
inscription au client, soit il propose des fonctionnalités que personne n'utilise. Dans un cabinet,
une seule fonction suffit à changer le quotidien : <strong>permettre au client d'envoyer ce qu'on lui
demande, sans friction</strong>.</p>

<div class="section">
<h2>Le dépôt de pièces par lien</h2>
<p>Le cabinet envoie un lien. Le client ouvre le lien, transmet la pièce demandée — permis, relevé,
justificatif — et la pièce arrive dans son dossier. Aucun compte à créer, aucun mot de passe à
retenir, aucune application à installer.</p>
<p>Pourquoi ce choix : chaque étape imposée au client est une raison de reporter l'envoi. Un dépôt
en trois clics arrive le jour même ; un portail à créer attend la semaine suivante.</p>
</div>

<h2>Ce que le client peut faire, et ce qu'il ne fait pas</h2>
<table>
<tr><th>Action du client</th><th>Dans COURTIA</th><th>Pourquoi</th></tr>
<tr><td>Transmettre une pièce</td><td>Oui, par lien</td><td>C'est ce qui débloque le plus de dossiers</td></tr>
<tr><td>Consulter ses documents</td><td>Selon ce que le cabinet transmet</td><td>Le cabinet décide de ce qu'il met à disposition</td></tr>
<tr><td>Signer un document</td><td>Oui, via la signature électronique dans le parcours devis</td><td>Évite impression et scan</td></tr>
<tr><td>Prendre une décision de garantie ou de tarif</td><td>Non</td><td>Cela relève du conseil du courtier</td></tr>
<tr><td>Modifier son dossier</td><td>Non</td><td>Le dossier est tenu par le cabinet</td></tr>
</table>

<h2>Ce que cela change dedans</h2>
<p>Le cabinet n'a plus à réclamer trois fois la même pièce par e-mail, ni à la reclasser. Le temps
gagné n'est pas dans la démonstration : il est dans les relances qui n'ont plus lieu d'être. C'est
une des raisons pour lesquelles le dépôt de pièces arrive en tête des frictions mesurées au cabinet
(voir <a href="/fr/gagner-du-temps-courtier-assurance">où le temps se perd</a>).</p>
""",
    faq=[
        ("Le client a-t-il besoin d'un compte ?",
         "Non, pas pour déposer une pièce : le lien suffit. C'est un choix explicite pour retirer la friction à l'entrée."),
        ("Le lien est-il sécurisé ?",
         "Les liens de dépôt sont temporaires et rattachés à une demande précise du cabinet. Aucun accès n'est laissé ouvert après usage."),
        ("Peut-on l'utiliser pour un sinistre ?",
         "Le principe vaut pour toute pièce demandée. Le suivi de sinistre n'a pas de page dédiée sur ce site, faute de périmètre suffisant dans le produit."),
    ],
)

PAGES["fr/prioriser-dossiers-courtier-assurance"] = dict(
    marche="FR",
    titre="Prioriser ses dossiers dans un cabinet de courtage — COURTIA",
    description=(
        "Comment savoir par quoi commencer : échéances, devis sans réponse, pièces manquantes, "
        "dossiers dormants. Ce que COURTIA remonte réellement chaque matin."
    ),
    h1="Prioriser : décider chaque matin ce qui passe en premier",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Prioriser ses dossiers", "/fr/prioriser-dossiers-courtier-assurance")],
    maillage=[
        ("Gagner du temps", "/fr/gagner-du-temps-courtier-assurance", "le cluster complet"),
        ("Relances clients", "/fr/relance-client-assurance", "les actions qui en découlent"),
        ("Gestion de portefeuille", "/fr/gestion-portefeuille-courtier", "les échéances à 90 jours"),
        ("Organisation du cabinet", "/fr/organisation-cabinet-courtage", "l'organisation qui rend cela possible"),
    ],
    corps="""
<p>Dans un cabinet, le travail ne manque jamais : c'est l'ordre qui manque. On traite ce qui crie le
plus fort — l'appel du jour, l'e-mail urgent — et le dossier qui allait décrocher attend. Prioriser
n'est donc pas une question de motivation, mais d'information : il faut voir ce qui doit être traité
avant de choisir.</p>

<div class="section">
<h2>Les quatre familles d'urgences réelles</h2>
<ol>
<li><strong>Les échéances proches</strong> — un contrat à renouveler se prépare avant, pas le jour J.</li>
<li><strong>Les propositions sans réponse</strong> — un devis non relancé est un dossier en attente de
décision, pas un refus.</li>
<li><strong>Les pièces manquantes anciennes</strong> — plus une pièce attend, plus le dossier se
refroidit.</li>
<li><strong>Les dossiers dormants</strong> — ceux qu'on n'a pas touchés depuis des semaines, souvent
les plus rentables et les plus silencieux.</li>
</ol>
</div>

<h2>Ce que COURTIA remonte</h2>
<p>Le briefing du matin rassemble ces familles : échéances à venir, actions du jour, échéances à
30 jours, points d'attention détectés sur le portefeuille. L'écran de pilotage complète avec la santé
du portefeuille et les dossiers à traiter.</p>
<p>Chaque action affichée correspond à un dossier réel et à un élément vérifiable (date, montant,
pièce, état du devis). Aucun « score d'urgence » n'est inventé : l'ordre vient des données du
cabinet.</p>

<h2>Comment ça se passe concrètement</h2>
<table>
<tr><th>Moment</th><th>Sans système de priorisation</th><th>Avec les remontées du produit</th></tr>
<tr><td>8h30</td><td>Parcourir la boîte mail pour trouver par quoi commencer</td><td>La liste du jour est déjà constituée</td></tr>
<tr><td>En cours de journée</td><td>Une urgence chasse l'autre</td><td>Les actions non faites restent listées</td></tr>
<tr><td>Vendredi</td><td>« Qu'est-ce qu'on a oublié cette semaine ? »</td><td>Les dossiers sans mouvement sont visibles</td></tr>
</table>

<h2>La limite : prioriser n'est pas décider</h2>
<p>Le produit ne choisit pas à la place du courtier : il montre ce qui est en attente et pourquoi. La
décision — rappeler, renouveler, renoncer — reste humaine, et c'est normal : elle engage la relation
client.</p>
""",
    faq=[
        ("Comment l'ordre des actions est-il établi ?",
         "À partir des données du dossier : date d'échéance, état du devis, pièce attendue, dernier contact. Pas d'un score opaque."),
        ("Peut-on filtrer par collaborateur ?",
         "La file de travail est partagée et les tâches peuvent être affectées, ce qui permet de voir sa propre charge."),
        ("Cela remplace-t-il un agenda partagé ?",
         "Le produit gère les rendez-vous et le suivi ; l'agenda du cabinet reste utilisable en parallèle, notamment par l'intégration calendrier."),
    ],
)

PAGES["fr/organisation-cabinet-courtage"] = dict(
    marche="FR",
    titre="Organiser un cabinet de courtage : méthodes et outils — COURTIA",
    description=(
        "Organiser un cabinet de courtage : conventions de nommage, responsabilités, rituels "
        "hebdomadaires, suivi des dossiers. Ce qui se décide, et ce que l'outil vient soutenir."
    ),
    h1="Organiser un cabinet de courtage : décider d'abord, outiller ensuite",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Organisation du cabinet", "/fr/organisation-cabinet-courtage")],
    maillage=[
        ("Prioriser ses dossiers", "/fr/prioriser-dossiers-courtier-assurance", "la conséquence quotidienne"),
        ("Réduire la double saisie", "/fr/reduire-double-saisie-cabinet-courtage", "un des premiers gains"),
        ("Travail en équipe", "/fr/logiciel-courtier-equipe", "les fonctions qui soutiennent l'organisation"),
        ("Mesurer son temps administratif", "/fr/mesurer-temps-administratif-cabinet", "savoir où agir"),
    ],
    corps="""
<p>Aucun logiciel ne remplace une décision d'organisation. À l'inverse, une organisation décidée mais
non outillée se délite en trois semaines. Cette page traite la partie que le cabinet doit décider
lui-même — et celle que le produit vient soutenir.</p>

<div class="section">
<h2>Les cinq décisions à prendre avant de choisir un outil</h2>
<ol>
<li><strong>Qui est responsable d'un dossier ?</strong> Un dossier sans responsable n'a pas de
suite. La réponse doit être unique et visible.</li>
<li><strong>Que doit contenir un dossier complet ?</strong> Pièces obligatoires, informations de
situation, traces d'échange : sans cette liste, « dossier incomplet » ne veut rien dire.</li>
<li><strong>Quelles échéances regarde-t-on ?</strong> Un rituel hebdomadaire sur les 90 jours vaut
mieux qu'une surveillance de tous les contrats en permanence.</li>
<li><strong>Comment nomme-t-on les documents ?</strong> Une convention simple rend les pièces
retrouvables, même des années plus tard.</li>
<li><strong>Quels échanges passent par écrit ?</strong> Ce qui n'est pas écrit ne se restitue pas :
cela concerne surtout le conseil.</li>
</ol>
</div>

<h2>Les rituels qui tiennent</h2>
<table>
<tr><th>Rituel</th><th>Fréquence</th><th>Ce que le produit apporte</th></tr>
<tr><td>Tour des échéances à venir</td><td>Hebdomadaire</td><td>Liste des échéances à 30 et 90 jours</td></tr>
<tr><td>Tour des dossiers immobiles</td><td>Hebdomadaire</td><td>Dossiers sans action récente, avec dernier contact</td></tr>
<tr><td>Tour des pièces attendues</td><td>Hebdomadaire</td><td>Pièces manquantes par dossier, avec la date de demande</td></tr>
<tr><td>Point commissions</td><td>Mensuel</td><td>États par période, relevés importés</td></tr>
</table>

<h2>Ce que l'outil ne décidera pas</h2>
<p>Le niveau de rigueur du cabinet, la répartition des rôles, la manière de conseiller un client.
Un outil peut rendre une organisation <em>visible</em> ; il ne peut pas la rendre <em>volontaire</em>.
C'est la raison pour laquelle les pages de ce site décrivent des décisions avant de décrire des
fonctions.</p>
""",
    faq=[
        ("Faut-il un outil pour organiser un cabinet de deux personnes ?",
         "À deux, un accord oral peut suffire quelques mois, mais il ne se transmet pas. Le moment utile pour poser des règles écrites est souvent l'arrivée d'un troisième collaborateur."),
        ("Par quoi commencer si tout est en désordre ?",
         "Par les quatre comptages de la page « mesurer son temps administratif » : ils désignent le point d'entrée le plus rentable, sans dépense."),
        ("Un logiciel impose-t-il sa méthode ?",
         "Un bon outil propose un cadre (dossier, échéance, tâche, pièce) sans imposer le contenu du conseil ni l'organisation commerciale."),
    ],
)

PAGES["fr/reduire-double-saisie-cabinet-courtage"] = dict(
    marche="FR",
    titre="Réduire la double saisie dans un cabinet de courtage — COURTIA",
    description=(
        "Où la double saisie apparaît dans un cabinet de courtage, comment la mesurer, et ce qui la "
        "supprime réellement : collecte de pièces, lecture assistée, dossier unique."
    ),
    h1="Réduire la double saisie : la même donnée ne doit entrer qu'une fois",
    fil=[("Accueil", "/"), ("France", "/fr"), ("Réduire la double saisie", "/fr/reduire-double-saisie-cabinet-courtage")],
    maillage=[
        ("Organisation du cabinet", "/fr/organisation-cabinet-courtage", "les décisions qui précèdent"),
        ("Gestion documentaire", "/fr/gestion-documentaire-courtier-assurance", "la collecte qui évite la recopie"),
        ("IA documentaire", "/fr/ia-gestion-documentaire-assurance", "l'extraction assistée"),
        ("Gain de temps", "/fr/gagner-du-temps-courtier-assurance", "le cluster complet"),
    ],
    corps="""
<p>La double saisie ne se voit pas : chaque saisie prise isolément paraît anodine. C'est son
accumulation qui coûte — et surtout, c'est là que naissent les divergences. Deux champs saisis à deux
moments différents finissent par ne plus dire la même chose.</p>

<div class="section">
<h2>Où elle apparaît, presque toujours aux mêmes endroits</h2>
<ol>
<li><strong>La pièce reçue et le dossier</strong> — le client envoie un document, on recopie son
contenu dans la fiche.</li>
<li><strong>Le devis et le contrat</strong> — la proposition acceptée est ressaisie comme contrat.</li>
<li><strong>Le contrat et l'échéancier</strong> — la date d'échéance vit dans un agenda en plus du
dossier.</li>
<li><strong>Le relevé de commissions et le suivi d'activité</strong> — les montants sont recopiés du
relevé vers un tableur.</li>
<li><strong>Le message envoyé et la trace du dossier</strong> — ce qui a été dit au client n'est pas
reporté.</li>
</ol>
</div>

<h2>Ce qui la supprime vraiment</h2>
<table>
<tr><th>Point de double saisie</th><th>Ce que fait COURTIA</th></tr>
<tr><td>Pièce reçue</td><td>Dépôt par lien et lecture assistée : l'information est confirmée, pas recopiée</td></tr>
<tr><td>Devis accepté</td><td>Le devis vit dans le dossier ; le contrat s'y rattache</td></tr>
<tr><td>Échéance</td><td>Portée par le contrat, donc remontée sans second calendrier</td></tr>
<tr><td>Relevé de commissions</td><td>Import du relevé et états par période</td></tr>
<tr><td>Trace d'un échange</td><td>Rattachée au dossier, avec sa date</td></tr>
</table>

<h2>La méthode de mesure, en une heure</h2>
<p>Prenez cinq dossiers traités cette semaine. Pour chacun, comptez combien de fois une même
information a été écrite à deux endroits différents. Ce nombre — pas une durée — indique le niveau de
duplication du cabinet. Refaire ce comptage après trois semaines d'usage d'un outil unique est la
seule preuve honnête qu'une organisation a changé.</p>

<h2>Ce qu'il reste à saisir, et qui doit rester</h2>
<p>Tout n'est pas automatisable : le compte rendu d'un entretien, la justification d'un conseil, la
décision de couverture restent des écrits humains. Vouloir les automatiser produit des dossiers
défendables en apparence et fragiles en réalité.</p>
""",
    faq=[
        ("La lecture assistée supprime-t-elle toute saisie ?",
         "Non. Elle supprime la recopie d'informations déjà présentes dans une pièce ; le courtier confirme, et ce qui relève du jugement reste écrit à la main."),
        ("Comment savoir si le cabinet double-saisit beaucoup ?",
         "En comptant, sur cinq dossiers récents, combien d'informations ont été écrites deux fois. Le comptage suffit à décider."),
        ("L'import de portefeuille évite-t-il la double saisie initiale ?",
         "Oui, c'est son objet principal : repartir des dossiers existants au lieu de tout retaper."),
    ],
)
