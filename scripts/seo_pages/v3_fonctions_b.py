#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v3_fonctions_b.py — VAGUE 4, groupe « fonctions du produit » (5 pages France, 2/2).

Sources : décisions TypeSafe réelles `passL_fonctionnalites` (22/09/2026) — tâches 0,74 ;
rendez-vous 0,78 ; Kanban 0,76 ; partenaires 0,84 ; formation 0,75. Chaque page décrit la fonction
telle qu'elle est réellement implémentée (vérifiée dans le code du produit), et dit aussi ce qu'elle
ne fait pas.
"""
PAGES = {}


def fpage(chemin=None, intention=None, liens=None, motscles=None, **kw):
    kw.pop("chemin", None)
    fil_silo = "Suisse" if kw.get("marche") == "CH" else "France"
    prefixe = "/ch" if kw.get("marche") == "CH" else "/fr"
    kw["fil"] = [("Accueil", "/"), (fil_silo, prefixe), (kw["h1"][:48], "/" + chemin.strip("/"))]
    kw["maillage"] = [(titre, "/" + url.strip("/"), "à lire aussi") for url, titre in (liens or [])]
    return kw


PAGES["fr/gestion-taches-cabinet-courtage"] = fpage(
    chemin="fr/gestion-taches-cabinet-courtage",
    intention="Le collaborateur qui doit dire, en fin de journée, ce qu'il a fait et ce qu'il reste.",
    liens=[("fr/logiciel-courtier-assurance", "Le logiciel de courtage, fonction par fonction"),
           ("fr/organisation-cabinet-courtage", "Organiser le travail du cabinet"),
           ("fr/prioriser-dossiers-courtier-assurance", "Prioriser les dossiers et les prospects"),
           ("fr/rendez-vous-courtier-assurance", "Les rendez-vous et l'agenda")],
    motscles=["gestion tâches cabinet courtage", "suivi des tâches courtier", "organisation travail cabinet assurance"],
    titre="Gestion des tâches d'un cabinet de courtage — COURTIA",
    description="Créer, échéancer et suivre les tâches du cabinet, rattachées aux clients et aux "
                "contrats : ce qui est à faire, pour qui, et quand.",
    h1="Des tâches rattachées au dossier, pas une liste qui vit à part",
    corps="""
<p>Dans un cabinet, ce qui se perd n'est pas le travail : c'est le <em>suivi</em> du travail. La même
demande arrive par téléphone, par mail et en réunion ; chaque personne la note dans son coin, et
personne ne sait ce qui a été fait.</p>
<h2>Ce que la gestion des tâches fait exactement</h2>
<ul>
<li><strong>Créer une tâche avec une échéance</strong> : la date est contrôlée à la saisie, pour éviter
les échéances impossibles qui polluent ensuite toutes les listes.</li>
<li><strong>La rattacher à un client ou à un dossier</strong> : la tâche n'est pas une note volante,
elle appartient à un dossier.</li>
<li><strong>La mettre à jour</strong> : état, contenu, échéance — le suivi se corrige au fil de
l'eau.</li>
<li><strong>Générer automatiquement certaines tâches</strong> : ce qui découle mécaniquement d'un
dossier le fait sans qu'on y pense.</li>
<li><strong>Supprimer ce qui ne sert plus</strong> : une liste propre est une liste utilisée.</li>
</ul>
<h2>Ce que cette fonction ne fait pas</h2>
<p>Elle ne décide pas des priorités à votre place, ne répartit pas le travail d'office et n'envoie pas
de rappel au client. Elle rend visible ce qui est à faire, par qui, et pour quand.</p>
<h2>Le critère qui compte</h2>
<p>La bonne question pour juger un outil n'est pas « combien de tâches je peux créer ? » mais « le
lundi matin, est-ce que je vois d'un coup d'œil ce qui est en retard, sans ouvrir trois dossiers ? ».
C'est à ce moment-là que se rattrape la semaine — pas le vendredi.</p>
""",
    faq=[
        ("Peut-on affecter une tâche à un collaborateur ?",
         "Oui, dans un cabinet à plusieurs : les tâches font partie du travail partagé de l'équipe."),
        ("Quelles tâches sont générées automatiquement ?",
         "Celles qui découlent mécaniquement d'un dossier — le cabinet garde la main sur ce qui est "
         "généré et sur ce qui reste manuel."),
        ("Les tâches sont-elles visibles depuis le dossier ?",
         "Oui : la tâche appartient au dossier, ce qui évite de se demander à quoi elle se rapporte."),
    ],
)

PAGES["fr/rendez-vous-courtier-assurance"] = fpage(
    chemin="fr/rendez-vous-courtier-assurance",
    intention="Le courtier qui doit replacer un rendez-vous et retrouver, plus tard, ce qui s'y est dit.",
    liens=[("fr/logiciel-courtier-assurance", "Le logiciel de courtage, fonction par fonction"),
           ("fr/dicter-compte-rendu-appel-assurance", "Dicter le compte rendu après un rendez-vous"),
           ("fr/gestion-taches-cabinet-courtage", "Les tâches du cabinet"),
           ("fr/relance-client-assurance", "Organiser les relances clients")],
    motscles=["rendez-vous courtier assurance", "agenda cabinet de courtage", "google calendar assurance"],
    titre="Rendez-vous et agenda d'un cabinet de courtage — COURTIA",
    description="Enregistrer les rendez-vous, voir l'agenda du jour et synchroniser son calendrier : "
                "les rendez-vous clients reliés aux dossiers.",
    h1="Les rendez-vous au même endroit que les dossiers",
    corps="""
<p>Un rendez-vous client n'est pas un créneau : c'est un moment du dossier, avec une préparation
avant et une décision après. Placé dans un agenda séparé, il perd les deux.</p>
<h2>Ce que le module rendez-vous fait exactement</h2>
<ul>
<li><strong>Enregistrer un rendez-vous</strong> avec sa date, son heure et sa durée.</li>
<li><strong>Voir l'agenda du jour</strong> : ce qui vient, dans l'ordre, sans ouvrir trois outils.</li>
<li><strong>Synchroniser avec Google Calendar</strong> : le calendrier que vous utilisez déjà peut
recevoir ces rendez-vous, par une autorisation que vous accordez explicitement.</li>
<li><strong>Modifier ou supprimer un rendez-vous</strong> quand la vie du cabinet change.</li>
</ul>
<h2>Ce que cette fonction ne fait pas</h2>
<p>Elle ne fixe pas de rendez-vous à votre place, ne propose pas de créneaux aux clients et n'ouvre
aucun accès à votre agenda personnel : la synchronisation repose sur une autorisation que vous
donnez, et que vous pouvez retirer.</p>
<h2>Préparer un rendez-vous en cinq minutes</h2>
<p>Un rendez-vous client se prépare avec trois informations : ce qui a changé depuis le dernier
échange, ce qui arrive à échéance dans les mois qui viennent, et ce qui reste en attente de sa part. Ces
trois éléments sont dans le dossier — à condition que le dossier soit tenu. La préparation n'est donc
pas un travail supplémentaire : c'est la conséquence d'un suivi à jour.</p>

<h2>La suite logique du rendez-vous</h2>
<p>Un rendez-vous utile produit deux choses : une tâche (ce qu'on a promis) et une trace (ce qui s'est
dit). C'est là que se joue le gain réel — pas dans le fait d'avoir un agenda de plus.</p>
""",
    faq=[
        ("Faut-il utiliser Google Calendar ?",
         "Non. La synchronisation est une option ; les rendez-vous vivent dans COURTIA et peuvent être "
         "recopiés dans votre calendrier si vous l'autorisez."),
        ("Les rendez-vous d'un collaborateur sont-ils visibles par les autres ?",
         "Les accès sont cloisonnés par cabinet et par rôle : chacun voit ce qui le concerne."),
        ("Le client peut-il prendre rendez-vous lui-même ?",
         "Non. La prise de rendez-vous reste une action du cabinet."),
    ],
)

PAGES["fr/pipeline-kanban-courtier-assurance"] = fpage(
    chemin="fr/pipeline-kanban-courtier-assurance",
    intention="Le courtier ou le responsable qui veut voir avancer ses opportunités, étape par étape.",
    liens=[("fr/logiciel-courtier-assurance", "Le logiciel de courtage, fonction par fonction"),
           ("fr/gestion-prospects-clients-courtier-assurance", "Gérer les prospects et les clients"),
           ("fr/guide/suivre-prospects-courtier", "Le guide pour suivre ses prospects"),
           ("fr/prioriser-dossiers-courtier-assurance", "Prioriser dossiers et prospects")],
    motscles=["pipeline courtier assurance", "kanban crm assurance", "suivi opportunités courtage"],
    titre="Pipeline visuel pour cabinet de courtage (Kanban) — COURTIA",
    description="Suivre les opportunités par étapes, avec des cartes affectées à un collaborateur : "
                "voir où en est chaque dossier sans réunion de suivi.",
    h1="Un pipeline qui se met à jour en travaillant, pas en réunion",
    corps="""
<p>Un pipeline utile ne se remplit pas pour lui-même : il se met à jour quand on avance sur le dossier.
Sinon il devient un second travail, tenu pendant quelques semaines puis abandonné.</p>
<h2>Ce que le suivi visuel fait exactement</h2>
<ul>
<li><strong>Des colonnes par étape</strong> : la progression du cabinet, telle qu'il la définit.</li>
<li><strong>Des cartes</strong> : une opportunité ou un dossier par carte.</li>
<li><strong>Une affectation</strong> : à qui appartient la carte, pour savoir qui relance et qui
décide.</li>
<li><strong>Un déplacement qui veut dire quelque chose</strong> : passer une carte à l'étape suivante
est une information, pas une décoration.</li>
</ul>
<p>Le suivi visuel fait partie des fonctions des offres supérieures ; le pipeline sous-jacent existe
dans tous les cas, avec les statuts de vos dossiers.</p>
<h2>Ce que ce n'est pas</h2>
<p>Ce n'est pas un outil de reporting financier, ni une prévision de production : une carte n'est pas
une commission. Et rien ne se déplace tout seul — un dossier n'avance pas parce qu'une date est
passée.</p>
<h2>Un pipeline utile en trois colonnes</h2>
<p>Beaucoup de cabinets tiennent un pipeline plus lisible avec trois ou quatre étapes réellement
utilisées (« à qualifier », « proposition envoyée », « en attente de décision », « signé ») plutôt
qu'avec dix colonnes qui ne servent qu'à justifier un logiciel.</p>
""",
    faq=[
        ("Le pipeline existe-t-il sur toutes les offres ?",
         "Le suivi des dossiers et leurs statuts existent partout ; la vue visuelle par colonnes fait "
         "partie des offres supérieures."),
        ("Les colonnes sont-elles imposées ?",
         "Non. Le cabinet définit ses étapes — l'outil les affiche, il ne les impose pas."),
        ("Peut-on affecter une carte à un collaborateur ?",
         "Oui, l'affectation fait partie du suivi, ce qui permet de savoir qui agit."),
    ],
)

PAGES["fr/partenaires-apporteurs-courtier-assurance"] = fpage(
    chemin="fr/partenaires-apporteurs-courtier-assurance",
    intention="Le cabinet qui travaille avec des apporteurs et veut savoir ce que chacun a réellement produit.",
    liens=[("fr/logiciel-courtier-assurance", "Le logiciel de courtage, fonction par fonction"),
           ("fr/gestion-commissions-courtier-assurance", "Les commissions"),
           ("fr/gestion-portefeuille-courtier", "Le portefeuille dans son ensemble"),
           ("fr/reporting-pilotage-cabinet-courtage", "Le pilotage du cabinet")],
    motscles=["apporteur affaires assurance", "partenaires courtage", "suivi partenariats courtier"],
    titre="Partenaires et apporteurs d'affaires d'un cabinet de courtage — COURTIA",
    description="Suivre les partenariats de courtage : qui apporte quoi, avec quel statut, et ce que "
                "cela représente réellement pour le cabinet.",
    h1="Suivre les apporteurs sans tenir un tableau à côté",
    corps="""
<p>Dès qu'un cabinet travaille avec un apporteur — un agent, un prescripteur, un confrère, un
partenaire d'un autre métier — trois questions reviennent : qui a apporté quoi, où en est chaque
dossier, et qu'est-ce que cela produit réellement ?</p>
<h2>Ce que le suivi des partenaires fait exactement</h2>
<ul>
<li><strong>Une fiche par partenaire</strong> : qui il est, ce qu'il apporte, avec quel statut.</li>
<li><strong>Un statut suivi</strong> : actif, en attente, arrêté — pour ne pas relancer indéfiniment
une relation terminée.</li>
<li><strong>Des statistiques</strong> : ce que chaque partenaire représente dans l'activité du
cabinet.</li>
<li><strong>Un rattachement aux dossiers</strong> : l'apport du partenaire se retrouve dans les
dossiers concernés, pas seulement dans un compteur.</li>
</ul>
<h2>Ce que cette fonction ne fait pas</h2>
<p>Elle n'établit pas de convention, ne calcule pas de rétrocession due à un tiers à votre place et ne
gère pas la facturation entre professionnels. Elle tient le suivi ; les engagements restent votre
affaire.</p>
<h2>Pourquoi c'est un sujet de marge, pas d'organisation</h2>
<p>Un apport mal suivi se paie deux fois : une fois en rétrocession versée sans base claire, une fois
en relation arrêtée faute de suivi. La visibilité sur ce que chaque partenaire apporte vaut souvent
plus que la fonction elle-même.</p>
""",
    faq=[
        ("Peut-on suivre plusieurs types de partenaires ?",
         "Oui : le suivi porte sur des partenaires de courtage, avec leur statut et leurs apports."),
        ("Le produit calcule-t-il les rétrocessions à verser ?",
         "Non. Il suit les partenaires et leur apport ; les engagements et les montants restent des "
         "décisions du cabinet."),
        ("Les partenaires ont-ils accès au dossier ?",
         "Non. L'accès au cabinet est cloisonné ; un partenaire n'entre pas dans l'outil du cabinet."),
    ],
)

PAGES["fr/formation-equipe-courtier-assurance"] = fpage(
    chemin="fr/formation-equipe-courtier-assurance",
    intention="Le responsable qui doit former un nouvel arrivant et faire monter l'équipe sans payer "
              "des sessions externes pour les bases.",
    liens=[("fr/logiciel-courtier-assurance", "Le logiciel de courtage, fonction par fonction"),
           ("fr/logiciel-courtier-equipe", "Travailler en équipe dans COURTIA"),
           ("fr/guide/dda-15h", "Le guide DDA 15 heures"),
           ("fr/guide/integrer-ia-cabinet-courtage", "Intégrer l'IA dans un cabinet")],
    motscles=["formation équipe courtage", "formation DDA intégrée", "monter en compétence cabinet assurance"],
    titre="Former son équipe de courtage dans l'outil — COURTIA",
    description="Un espace de formation intégré : cours, progression et cartes de révision, pour que "
                "l'équipe apprenne le métier et l'outil au même endroit.",
    h1="Apprendre le métier là où l'on travaille",
    corps="""
<p>Former un nouvel arrivant dans un cabinet de courtage repose souvent sur une personne : celle qui
explique, encore et toujours, les mêmes bases. Le résultat est doublement coûteux — et dépendant d'un
seul salarié.</p>
<h2>Ce que l'espace de formation fait exactement</h2>
<ul>
<li><strong>Des cours accessibles dans l'outil</strong>, avec une progression suivie par personne.</li>
<li><strong>Des cartes de révision</strong> pour revoir les points clés — et les partager entre
collaborateurs.</li>
<li><strong>Un suivi de progression</strong> : où en est chacun, sans tenir un tableur.</li>
<li><strong>Un parrainage</strong> : quand un cabinet recommande l'outil autour de lui.</li>
</ul>
<h2>Ce que cet espace n'est pas</h2>
<p>Ce n'est pas un organisme de formation certifié et cela ne remplace ni la formation obligatoire ni
l'obligation de compétence professionnelle : c'est un support interne, en complément des formations
réglementaires que le cabinet doit suivre.</p>
<h2>Le coût réel d'une formation interne improvisée</h2>
<p>Quand la formation des nouveaux arrivants repose sur une seule personne, ce n'est pas seulement son
temps qui est consommé : c'est celui de la personne formée, qui attend. Les trois coûts les plus
souvent constatés dans un cabinet :</p>
<ul>
<li><strong>La dépendance</strong> — la personne qui explique est la même qui détient la connaissance ;
son absence bloque l'arrivée du nouveau.</li>
<li><strong>La répétition</strong> — les mêmes questions reviennent à chaque arrivée, sur les mêmes
écrans et les mêmes réflexes du cabinet.</li>
<li><strong>L'irrégularité</strong> — ce qui est expliqué en mars n'est plus expliqué en septembre, et
les écarts d'usage s'installent sans que personne ne le décide.</li>
</ul>
<p>Un support accessible dans l'outil ne remplace pas l'accompagnement humain : il retire la répétition
et laisse l'accompagnement là où il a de la valeur — sur les cas réels, pas sur les bases.</p>

<h2>L'usage qui marche</h2>
<p>Deux usages concrets : le parcours d'arrivée (les bases, les écrans, les réflexes du cabinet) et le
rappel avant une échéance sensible — une session de révision avant un contrôle ou un temps fort de
renouvellements.</p>
""",
    faq=[
        ("La formation remplace-t-elle la formation obligatoire ?",
         "Non. C'est un support interne pour l'équipe, en complément des obligations de formation qui "
         "s'appliquent au cabinet."),
        ("Le responsable voit-il la progression de l'équipe ?",
         "Oui, la progression est suivie par personne dans l'outil."),
        ("Peut-on réutiliser les contenus ?",
         "Les cartes de révision peuvent être partagées entre collaborateurs."),
    ],
)
