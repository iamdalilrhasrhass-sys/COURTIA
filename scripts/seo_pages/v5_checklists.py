#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v5_checklists.py — CHECKLISTS DU CABINET (hub + six listes réellement utilisables).

Règle 10 de la mission : des ressources gratuites, utilisables sans COURTIA, sans être des documents
juridiques présentés comme un conseil personnalisé. Chaque checklist est construite depuis une liste
d'éléments ; le rendu est identique pour toutes, seul le contenu change.

Aucun conseil juridique : les obligations renvoient aux textes et aux organismes compétents, et chaque
page le rappelle.
"""
PAGES = {}


def fpage(chemin=None, intention=None, liens=None, motscles=None, **kw):
    kw.pop("chemin", None)
    kw["fil"] = [("Accueil", "/"), ("France", "/fr"), ("Checklists", "/fr/checklists/"),
                 (kw["h1"][:38], "/" + chemin.strip("/"))]
    kw["maillage"] = [(titre, "/" + url.strip("/"), "à lire aussi") for url, titre in (liens or [])]
    return kw


def checklist(titre_section, pourquoi, items, contient, necontient_pas):
    lis = "".join(f"<li>{i}</li>" for i in items)
    return f"""
<h2>{titre_section}</h2>
<p>{pourquoi}</p>
<ul>{lis}</ul>
<h2>Ce que cette liste contient</h2>
<p>{contient}</p>
<h2>Ce qu'elle ne remplace pas</h2>
<p>{necontient_pas}</p>
"""


PAGES["fr/checklists/"] = fpage(
    chemin="fr/checklists/",
    intention="Le responsable de cabinet qui veut des listes de contrôle prêtes à l'emploi, utilisables "
              "avec n'importe quel outil.",
    liens=[("fr/checklists/onboarding-client", "Checklist : onboarding d'un client signé"),
           ("fr/checklists/renouvellement", "Checklist : renouvellement"),
           ("fr/checklists/collecte-documentaire", "Checklist : collecte documentaire"),
           ("fr/checklists/suivi-sinistre", "Checklist : suivi de sinistre"),
           ("fr/checklists/organisation-cabinet", "Checklist : organisation du cabinet"),
           ("fr/checklists/preparation-audit", "Checklist : préparation d'un contrôle"),
           ("fr/workflows-courtier-assurance", "Les processus détaillés"),
           ("fr/gagner-du-temps-courtier-assurance", "Gagner du temps au cabinet")],
    motscles=["checklist cabinet courtage", "liste de contrôle courtier assurance", "modèle checklist assurance"],
    titre="Checklists pour cabinet de courtage — COURTIA",
    description="Six checklists utilisables telles quelles : onboarding d'un client, renouvellement, "
                "collecte documentaire, suivi de sinistre, organisation du cabinet, préparation d'un "
                "contrôle.",
    h1="Six checklists pour tenir un cabinet de courtage",
    corps="""
<p>Une checklist fait une seule chose, mais elle la fait bien : elle empêche d'oublier ce qu'on sait déjà.
Ces six listes sont écrites pour être imprimées, recopiées ou adaptées — elles fonctionnent avec un
tableur, un agenda et de la discipline, sans logiciel particulier.</p>

<h2>Les six checklists</h2>
<ul>
<li><a href="/fr/checklists/onboarding-client">Onboarding d'un client signé</a> — ce qui doit être en place
avant la première échéance.</li>
<li><a href="/fr/checklists/renouvellement">Renouvellement</a> — le contrôle des paliers d'une échéance.</li>
<li><a href="/fr/checklists/collecte-documentaire">Collecte documentaire</a> — demander, suivre, clore.</li>
<li><a href="/fr/checklists/suivi-sinistre">Suivi de sinistre</a> — de la déclaration à la clôture.</li>
<li><a href="/fr/checklists/organisation-cabinet">Organisation du cabinet</a> — les points à vérifier une
fois par trimestre.</li>
<li><a href="/fr/checklists/preparation-audit">Préparation d'un contrôle</a> — ce qu'on vérifie avant,
plutôt que pendant.</li>
</ul>

<h2>Comment les utiliser</h2>
<p>Trois conseils, issus de la façon dont ces listes sont conçues : <strong>cochez au moment du travail</strong>
(une checklist remplie après coup ne prouve rien), <strong>datez chaque élément</strong> (la date est ce
qui rend la liste utile six mois plus tard), et <strong>supprimez ce qui ne vous concerne pas</strong> —
une liste trop longue n'est plus lue.</p>
<p>Aucune de ces listes n'est un document juridique et aucune ne remplace les obligations qui s'appliquent
à votre cabinet ni l'avis de vos organismes professionnels.</p>
""",
    faq=[
        ("Ces checklists sont-elles adaptées à la Suisse ?",
         "Elles sont générales dans leur structure ; les référentiels et obligations diffèrent selon le pays "
         "et le canton, et doivent être adaptés par le cabinet."),
        ("Puis-je les réutiliser dans mon cabinet ?",
         "Oui, librement. Le contenu est fourni pour être adapté : la valeur vient de votre adaptation, pas "
         "de la recopie."),
        ("Sont-elles intégrées à COURTIA ?",
         "Les mêmes points se retrouvent dans les fonctions correspondantes (pièces, sinistres, conformité), "
         "mais la liste est utilisable sans le produit."),
    ],
)

PAGES["fr/checklists/onboarding-client"] = fpage(
    chemin="fr/checklists/onboarding-client",
    intention="Le cabinet qui ouvre un nouveau dossier et veut éviter les oublis qui se paient plus tard.",
    liens=[("fr/checklists/", "Toutes les checklists"),
           ("fr/workflows/nouveau-prospect", "Processus : nouveau prospect"),
           ("fr/workflows/mandat-et-kyc", "Processus : mandat et vérification"),
           ("fr/guide/onboarding-client-courtier", "Guide : structurer l'onboarding client")],
    motscles=["checklist onboarding client assurance", "ouverture dossier courtier", "nouveau client cabinet courtage"],
    titre="Checklist : onboarding d'un client signé — COURTIA",
    description="Les points à vérifier à l'ouverture d'un dossier : identité, contrats, pièces, "
                "échéances, consentements, traçabilité.",
    h1="Checklist : ce qui doit être en place après la signature",
    corps=checklist(
        titre_section="La checklist",
        pourquoi="Un dossier bien ouvert se tient presque tout seul ; un dossier ouvert à moitié coûte du "
                 "temps à chaque échéance. Reprenez ces points une fois par dossier.",
        items=[
            "Identité et qualité du client enregistrées (personne physique ou morale, qui décide)",
            "Moyens de contact et canal préféré de chaque interlocuteur",
            "Contrats en place : compagnie, numéro, prime, date d'échéance, statut",
            "Pièces obtenues et pièces encore attendues, avec leur date de demande",
            "Historique du dossier précédent, si le client vient d'un autre cabinet",
            "Besoins exprimés et besoins écartés, avec la raison",
            "Documents remis au client, avec leur date",
            "Mandat et vérifications nécessaires, avec leur date de contrôle",
            "Échéances des 12 prochains mois notées au bon endroit",
            "Prochaine action planifiée, avec sa date et son responsable",
            "Accès internes : qui, dans le cabinet, voit ce dossier",
            "Points de vigilance : sinistres passés, résiliations, impayés",
        ],
        contient="Les points administratifs et de traçabilité d'une ouverture de dossier, du premier "
                 "contact à la première échéance.",
        necontient_pas="Aucune obligation légale n'est inventée ici : les vérifications d'identité, les "
                       "mandats et les informations à remettre relèvent des textes applicables à votre "
                       "activité et des consignes de vos organismes. Cette liste aide à ne pas oublier ; "
                       "elle ne dit pas ce que la loi exige.",
    ),
    faq=[
        ("Combien de temps prend cette checklist ?",
         "Elle se remplit au fil de l'ouverture : l'intérêt n'est pas de tout faire en une fois, mais de "
         "savoir ce qui reste à faire."),
        ("Faut-il la refaire à chaque nouveau contrat ?",
         "Non, mais deux points méritent une mise à jour : la situation du client et ses échéances."),
        ("Est-elle différente en Suisse ?",
         "La structure reste valable ; l'identifiant légal du client, le canton et le cadre d'intermédiation "
         "remplacent l'ORIAS."),
    ],
)

PAGES["fr/checklists/renouvellement"] = fpage(
    chemin="fr/checklists/renouvellement",
    intention="Le courtier qui prépare un renouvellement et veut vérifier qu'il n'oublie rien.",
    liens=[("fr/checklists/", "Toutes les checklists"),
           ("fr/workflows/renouvellement", "Processus : renouvellement"),
           ("fr/guide/organiser-renouvellements-courtier", "Guide : organiser ses renouvellements"),
           ("fr/gain-de-temps/renouvellements-et-echeances", "Gagner du temps : renouvellements")],
    motscles=["checklist renouvellement assurance", "échéance contrat courtier", "préparer renouvellement"],
    titre="Checklist : renouvellement d'un contrat — COURTIA",
    description="Le contrôle d'un renouvellement, palier par palier : situation, pièces, propositions, "
                "décision, nouvelle échéance.",
    h1="Checklist : les points à couvrir avant une échéance",
    corps=checklist(
        titre_section="La checklist",
        pourquoi="Un renouvellement se perd rarement sur la technique : il se perd sur un détail non vérifié, "
                 "une situation qui a changé et que personne n'a demandée.",
        items=[
            "Échéance confirmée, avec sa date exacte et le délai de préavis éventuel",
            "Situation du client vérifiée (activité, famille, effectifs, véhicules, valeurs)",
            "Pièces déjà au dossier et pièces à redemander",
            "Historique utile : sinistres, impayés, changements de garanties",
            "Ce qui a changé dans l'offre ou les conditions depuis un an",
            "Propositions demandées, avec leur date d'obtention",
            "Comparaison faite sur des critères écrits, pas de mémoire",
            "Conseil restitué au client, avec ses choix et ses renoncements",
            "Décision enregistrée, avec sa date",
            "Nouvelle échéance saisie — sinon le cycle suivant se reperd",
            "Documents remis au client et pièces classées au dossier",
            "Dossiers sans réponse traités avant la date limite",
        ],
        contient="Le contrôle de ce qui doit être vérifié autour d'une échéance, du repérage au classement.",
        necontient_pas="Elle ne fixe ni les délais de préavis ni les délais de résiliation applicables à "
                       "chaque contrat : ces délais dépendent des conditions du contrat et de la "
                       "réglementation, et doivent être vérifiés au cas par cas.",
    ),
    faq=[
        ("À quelle fréquence reprendre cette liste ?",
         "Une fois par échéance, et une fois par trimestre pour vérifier que rien n'a été oublié côté dates."),
        ("Que faire si le client ne répond pas ?",
         "Le dossier doit avoir un statut explicite : c'est le point où beaucoup de cabinets laissent une "
         "situation flottante."),
        ("La liste est-elle valable pour une entreprise ?",
         "Oui, avec plus d'anticipation : les dossiers d'entreprise se préparent généralement plus tôt."),
    ],
)

PAGES["fr/checklists/collecte-documentaire"] = fpage(
    chemin="fr/checklists/collecte-documentaire",
    intention="Le cabinet qui demande des pièces et veut s'assurer que rien ne se perd entre la demande "
              "et la réception.",
    liens=[("fr/checklists/", "Toutes les checklists"),
           ("fr/workflows/collecte-de-pieces", "Processus : collecte de pièces"),
           ("fr/gain-de-temps/documents-et-pieces", "Gagner du temps : documents et pièces"),
           ("fr/gestion-documentaire-courtier-assurance", "La gestion documentaire dans COURTIA")],
    motscles=["checklist collecte documents assurance", "demande pièces client", "suivi documents manquants"],
    titre="Checklist : collecte documentaire — COURTIA",
    description="Demander, suivre et clore une demande de pièces sans laisser de document en suspens.",
    h1="Checklist : collecter des pièces sans en perdre",
    corps=checklist(
        titre_section="La checklist",
        pourquoi="La collecte échoue rarement sur le premier envoi : elle échoue au milieu, quand une pièce "
                 "manque et que personne ne sait qu'elle manque.",
        items=[
            "Liste des pièces établie selon la situation réelle du client",
            "Demande unique envoyée, avec la date de retour souhaitée et le canal précisé",
            "Chaque pièce marquée « demandée », avec sa date",
            "Pièces reçues rattachées au dossier le jour de leur réception",
            "Pièces refusées ou illisibles signalées explicitement, avec la raison",
            "Relance faite sur la liste des pièces manquantes uniquement",
            "Date de dernière relance enregistrée",
            "Demande close explicitement quand tout est là",
            "Pièces sensibles limitées à ce qui est nécessaire",
            "Accès aux pièces limités aux personnes concernées",
            "Historique conservé : qui a demandé quoi, et quand",
        ],
        contient="Le suivi opérationnel d'une demande documentaire, de la liste initiale à la clôture.",
        necontient_pas="La durée de conservation des pièces et les règles de collecte de documents "
                       "sensibles relèvent de votre politique interne et des textes applicables : cette "
                       "liste organise le suivi, elle ne fixe pas ces règles.",
    ),
    faq=[
        ("Faut-il demander toutes les pièces dès le début ?",
         "Demander une liste inutilement longue fait perdre du temps au client et au cabinet. La liste "
         "se construit selon la situation."),
        ("Comment suivre les pièces reçues par un autre canal ?",
         "En les rattachant au dossier dès la réception : c'est la seule façon de savoir ce qui manque "
         "vraiment."),
        ("Que faire d'une pièce illisible ?",
         "La signaler comme manquante avec la raison : « reçue mais illisible » n'est pas « reçue »."),
    ],
)

PAGES["fr/checklists/suivi-sinistre"] = fpage(
    chemin="fr/checklists/suivi-sinistre",
    intention="Le courtier qui suit un sinistre et veut éviter les trous dans le dossier.",
    liens=[("fr/checklists/", "Toutes les checklists"),
           ("fr/workflows/sinistre", "Processus : suivre un sinistre"),
           ("fr/sinistres-courtier-assurance", "Le suivi des sinistres dans COURTIA"),
           ("fr/gain-de-temps/sinistres-et-conformite", "Gagner du temps : sinistres")],
    motscles=["checklist sinistre assurance", "suivi déclaration sinistre", "dossier sinistre courtier"],
    titre="Checklist : suivi d'un sinistre — COURTIA",
    description="Les points à vérifier pour ne pas laisser un sinistre en suspens et pouvoir le relire au "
                "renouvellement.",
    h1="Checklist : suivre un sinistre de bout en bout",
    corps=checklist(
        titre_section="La checklist",
        pourquoi="Un sinistre mal suivi ne se voit pas tout de suite : il se voit au renouvellement, quand "
                 "le client parle de sa prime ou change de cabinet.",
        items=[
            "Sinistre ouvert dans le dossier, avec date, nature et contrat concerné",
            "Responsable du dossier identifié côté cabinet",
            "Déclaration faite ou accompagnée, avec la date",
            "Pièces demandées par la compagnie ou l'expert, listées avec leur état",
            "Pièces reçues rattachées au dossier, avec leur date",
            "Interlocuteur assureur et expert notés",
            "État du dossier mis à jour à chaque étape (instruction, attente, expertise, clôture)",
            "Client informé aux moments utiles, avec la trace de l'échange",
            "Constat de clôture : décision, montants ou réserves, date",
            "Conséquences vérifiées : franchise, prime, garanties, résiliation éventuelle",
            "Dossier relisible au renouvellement suivant",
        ],
        contient="Le suivi administratif du sinistre côté cabinet, de l'ouverture à la clôture et à ses "
                 "conséquences.",
        necontient_pas="Elle n'indique aucun délai de déclaration, aucune règle d'indemnisation et aucune "
                       "obligation contractuelle : ces éléments dépendent du contrat et de la compagnie.",
    ),
    faq=[
        ("Qui déclare le sinistre ?",
         "Cela dépend de l'organisation convenue avec l'assureur et le client ; l'important est que la "
         "répartition soit écrite."),
        ("Faut-il garder le dossier après la clôture ?",
         "Oui, au moins pour la durée utile au renouvellement : c'est le moment où l'historique sert "
         "réellement."),
        ("Cette liste s'applique-t-elle en Suisse ?",
         "Oui dans sa structure, avec l'attention supplémentaire sur les pièces reçues dans une autre "
         "langue."),
    ],
)

PAGES["fr/checklists/organisation-cabinet"] = fpage(
    chemin="fr/checklists/organisation-cabinet",
    intention="Le responsable qui veut vérifier une fois par trimestre que son cabinet ne dérive pas.",
    liens=[("fr/checklists/", "Toutes les checklists"),
           ("fr/organisation-cabinet-courtage", "Organiser le travail du cabinet"),
           ("fr/gestion-taches-cabinet-courtage", "Les tâches du cabinet"),
           ("fr/reporting-pilotage-cabinet-courtage", "Le pilotage du cabinet")],
    motscles=["checklist organisation cabinet assurance", "audit interne courtier", "organisation cabinet courtage"],
    titre="Checklist : organisation du cabinet — COURTIA",
    description="Les points à vérifier une fois par trimestre pour garder un cabinet lisible : dossiers, "
                "échéances, données, accès, priorités.",
    h1="Checklist : ce qu'on vérifie une fois par trimestre",
    corps=checklist(
        titre_section="La checklist",
        pourquoi="Un cabinet ne se dégrade pas d'un coup : il dérive par petits écarts. Une vérification "
                 "trimestrielle coûte une heure et évite des mois de désordre.",
        items=[
            "Toutes les échéances du trimestre à venir sont connues et visibles",
            "Les propositions sans réponse sont listées et traitées",
            "Les demandes de pièces ouvertes sont relancées ou closes",
            "Les dossiers sans contact depuis longtemps sont identifiés",
            "Les accès des collaborateurs correspondent à leur rôle actuel",
            "Les départs et arrivées de collaborateurs ont été traités (droits, dossiers transférés)",
            "Les données de référence (compagnies, barèmes, modèles de messages) sont à jour",
            "Les doublons de dossiers clients sont identifiés",
            "Les indicateurs affichés reposent sur des données réellement saisies",
            "Les priorités de la semaine suivante peuvent être listées sans réunion de rattrapage",
        ],
        contient="Une revue de santé du cabinet : dossiers, échéances, accès, données, priorités.",
        necontient_pas="Elle ne remplace ni un contrôle de conformité, ni un audit de sécurité, ni la "
                       "vérification des obligations qui s'appliquent à votre activité.",
    ),
    faq=[
        ("Qui doit faire cette vérification ?",
         "Le responsable du cabinet, ou la personne qui détient la vue d'ensemble — pas chaque collaborateur "
         "isolément."),
        ("Combien de temps cela prend-il ?",
         "Une heure suffit si les données sont dans un outil ; sinon, la durée de la vérification est en "
         "elle-même une information sur l'organisation."),
        ("Faut-il la faire plus souvent ?",
         "Au début, oui : les trois premiers mois révèlent ce qui dérive chez vous. Ensuite, un trimestre "
         "suffit en général."),
    ],
)

PAGES["fr/checklists/preparation-audit"] = fpage(
    chemin="fr/checklists/preparation-audit",
    intention="Le cabinet qui veut vérifier ses dossiers avant un contrôle plutôt que pendant.",
    liens=[("fr/checklists/", "Toutes les checklists"),
           ("fr/conformite-courtier-assurance", "La conformité dans COURTIA"),
           ("fr/guide/audit-acpr", "Guide : se préparer à un audit ACPR"),
           ("fr/workflows/mandat-et-kyc", "Processus : mandat et vérification")],
    motscles=["préparation contrôle courtier", "audit cabinet courtage", "dossier conformité assurance"],
    titre="Checklist : préparer un contrôle dans un cabinet de courtage — COURTIA",
    description="Ce qu'un cabinet vérifie avant un contrôle : dossiers, traçabilité du conseil, pièces, "
                "mandats, journal des opérations.",
    h1="Checklist : préparer un contrôle sur ses propres dossiers",
    corps=checklist(
        titre_section="La checklist",
        pourquoi="Un contrôle se passe bien quand on peut montrer, dossier par dossier, ce qui a été fait et "
                 "quand. Cette liste sert à le vérifier avant, sur un échantillon.",
        items=[
            "Échantillon de dossiers choisi au hasard (par exemple 10), toutes situations confondues",
            "Pour chaque dossier : identité du client et pièces de vérification présentes",
            "Pour chaque dossier : trace de l'information donnée au client, avec sa date",
            "Pour chaque dossier : documents remis au client identifiables",
            "Mandats présents quand ils sont requis, avec leur date et leur périmètre",
            "Journal des opérations consultable sur la période concernée",
            "Écarts relevés lors de l'échantillon listés, avec un plan de correction daté",
            "Dossiers les plus anciens inclus dans l'échantillon, pas seulement les récents",
            "Pièces sensibles limitées à ce qui est nécessaire et accès restreints",
            "Origine des données et des indicateurs explicable si on vous interroge",
        ],
        contient="Une méthode d'auto-vérification par échantillon, inspirée de ce qu'un contrôle regarde en "
                 "pratique : la capacité à retrouver la preuve.",
        necontient_pas="Aucune liste des obligations applicables, aucun texte réglementaire et aucun conseil "
                       "juridique : cette page aide à s'organiser. Les obligations relèvent des textes et "
                       "des organismes compétents, et la qualification doit être faite par le cabinet ou son "
                       "conseil.",
    ),
    faq=[
        ("Pourquoi tirer un échantillon au hasard ?",
         "Parce qu'un contrôle fait de même : si l'on ne prépare que les dossiers « propres », l'échantillon "
         "révèle le reste."),
        ("Que faire des écarts constatés ?",
         "Les lister, les dater et les corriger avant le contrôle : un plan de correction vaut mieux qu'une "
         "promesse orale."),
        ("Cette checklist remplace-t-elle un conseil juridique ?",
         "Non. Elle organise une vérification interne ; la qualification des obligations doit être faite par "
         "le cabinet ou son conseil."),
    ],
)
