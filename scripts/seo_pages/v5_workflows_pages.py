#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v5_workflows_pages.py — les six processus détaillés de la bibliothèque.

Chacun est utile sans COURTIA : la partie produit vient en fin de page, après la méthode.
"""
from v5_workflows import fpage, wf

PAGES = {}

PAGES["fr/workflows/nouveau-prospect"] = fpage(
    chemin="fr/workflows/nouveau-prospect",
    intention="Le courtier qui reçoit des demandes par plusieurs canaux et qui veut décider vite quoi en "
              "faire, sans laisser une demande sans réponse.",
    liens=[("fr/workflows-courtier-assurance", "La bibliothèque de processus"),
           ("fr/workflows/collecte-de-pieces", "Processus : collecte de pièces"),
           ("fr/gestion-prospects-clients-courtier-assurance", "Prospects et clients dans COURTIA"),
           ("fr/pipeline-kanban-courtier-assurance", "Le suivi visuel des opportunités")],
    motscles=["process nouveau prospect assurance", "qualification prospect courtier", "suivi demandes entrantes"],
    titre="Processus : traiter un nouveau prospect — bibliothèque courtier",
    description="Le processus complet d'un nouveau prospect en cabinet de courtage : déclencheur, "
                "étapes, responsabilités, données nécessaires, points de rupture, ce que le produit fait.",
    h1="Processus : nouveau prospect, de la première demande à la décision",
    corps=wf(
        objectif="Aucune demande entrante ne reste sans réponse ni sans trace, et chaque demande reçoit "
                 "une décision explicite : ouvrir un dossier, orienter, ou refuser.",
        declencheur="Un appel, un message, un formulaire, une recommandation, un passage au cabinet — "
                    "tout canal confondu.",
        etapes=[
            "<strong>Enregistrer la demande le jour même</strong>, avec le canal d'origine, le besoin "
            "exprimé et un moyen de contact.",
            "<strong>Qualifier en trois questions</strong> : de quoi s'agit-il, quand le besoin doit-il "
            "être couvert, qui décide ?",
            "<strong>Décider du statut</strong> : dossier à ouvrir, orientation vers un confrère, refus. "
            "Chaque statut a une trace.",
            "<strong>Fixer la prochaine action datée</strong>, même si cette action est « rappeler dans "
            "trois semaines ».",
            "<strong>Faire la première demande de pièces</strong> si le dossier s'ouvre, pour éviter "
            "l'aller-retour plus tard.",
        ],
        qui="Toute personne qui reçoit l'appel enregistre ; la qualification revient à celui qui ouvrira "
            "le dossier. Le point de contrôle est la fin de journée : ce qui est entré doit exister.",
        donnees="Nom, moyen de contact, canal d'origine, besoin, date souhaitée de couverture, statut, "
                "prochaine action datée.",
        ruptures=[
            "La demande arrive pendant un rendez-vous et n'est notée nulle part.",
            "Le prospect est enregistré mais sans prochaine action : il disparaît jusqu'à ce qu'il "
            "rappelle.",
            "Deux personnes rappellent le même prospect — ou aucune.",
            "Un canal (WhatsApp, formulaire, recommandation) échappe au suivi parce qu'il n'a pas d'endroit "
            "prévu.",
        ],
        courtia="Le prospect est enregistré dans le dossier, avec son canal d'origine et son statut. Le "
                "pipeline suit l'avancement par étapes, l'affectation indique qui agit, et les tâches "
                "rattachées portent la prochaine action. Les conversations WhatsApp reçues peuvent être "
                "rattachées au dossier.",
        humain="La qualification réelle, le conseil, et la décision de refuser un dossier : un prospect "
               "mal qualifié coûte plus cher que le temps passé à le qualifier.",
    ),
    faq=[
        ("Faut-il enregistrer aussi les prospects qu'on refuse ?",
         "Oui : la trace du refus évite le débat ultérieur et permet de reconnaître une demande qui "
         "revient."),
        ("Combien de temps garder un prospect sans réponse ?",
         "Il n'y a pas de règle universelle : ce qui compte est que la décision soit prise à l'avance, "
         "pas au cas par cas."),
        ("Le produit qualifie-t-il les prospects ?",
         "Non. Il enregistre le statut et l'action ; la qualification reste un jugement humain."),
    ],
)

PAGES["fr/workflows/collecte-de-pieces"] = fpage(
    chemin="fr/workflows/collecte-de-pieces",
    intention="Le cabinet qui court après les documents de ses clients et cherche un processus qui ne "
              "dépende pas de son insistance.",
    liens=[("fr/workflows-courtier-assurance", "La bibliothèque de processus"),
           ("fr/gain-de-temps/documents-et-pieces", "Gagner du temps : documents et pièces"),
           ("fr/gestion-documentaire-courtier-assurance", "La gestion documentaire"),
           ("fr/checklists/collecte-documentaire", "Checklist de collecte documentaire")],
    motscles=["process collecte pièces assurance", "demande documents client courtier", "suivi pièces manquantes"],
    titre="Processus : collecte de pièces — bibliothèque courtier",
    description="Le processus de collecte documentaire en cabinet de courtage : demande unique, état "
                "suivi, relances, clôture. Utile même sans logiciel.",
    h1="Processus : collecte de pièces, de la demande à la clôture",
    corps=wf(
        objectif="Savoir à tout moment, dossier par dossier, ce qui a été demandé, ce qui est reçu, ce qui "
                 "manque et qui doit relancer — sans recherche dans les boîtes mail.",
        declencheur="Une ouverture de dossier, une échéance proche, une souscription, un sinistre, une "
                    "mise à jour de situation.",
        etapes=[
            "<strong>Établir la liste exacte</strong> des pièces nécessaires, en fonction de la situation "
            "et non d'une liste générique.",
            "<strong>Envoyer une demande unique</strong> qui contient tout : pièce par pièce, avec la date "
            "de retour souhaitée.",
            "<strong>Marquer chaque pièce comme demandée</strong>, puis reçue ou manquante, dès la "
            "réception.",
            "<strong>Relancer sur l'état</strong>, pas sur la mémoire : uniquement les pièces encore "
            "manquantes, avec un rythme décidé à l'avance.",
            "<strong>Clore la demande</strong> explicitement quand tout est là — sinon elle reste ouverte "
            "et finit par être ignorée.",
        ],
        qui="Une personne est responsable de la demande et de son état, même si plusieurs relancent. Le "
            "transfert d'un dossier s'accompagne du transfert de l'état des pièces.",
        donnees="Liste des pièces attendues, date de demande, date de réception, état par pièce, "
                "responsable, historique des relances.",
        ruptures=[
            "La demande est envoyée au fil de l'eau, par plusieurs canaux, sans vue consolidée.",
            "Le cabinet ne sait pas qu'une pièce a été reçue parce qu'elle est arrivée sur une autre "
            "boîte mail.",
            "La relance est faite « au feeling », ce qui produit soit aucune relance, soit trois en deux "
            "jours.",
            "Une pièce reçue n'est rattachée à aucun dossier : elle est perdue alors qu'elle est arrivée.",
        ],
        courtia="La demande de pièces part par un lien transmis au client ; ce qui est déposé arrive dans "
                "le dossier, l'état se met à jour, et les pièces restées manquantes peuvent déclencher une "
                "relance préparée que le cabinet valide.",
        humain="La liste des pièces réellement nécessaires, la lecture de la situation du client, et le "
               "ton des relances — tout ne se demande pas de la même façon selon le contexte.",
    ),
    faq=[
        ("Le client peut-il déposer des pièces sans compte ?",
         "Oui, par un lien : le client n'a ni compte à créer ni application à installer."),
        ("Faut-il relancer automatiquement ?",
         "La relance peut être préparée automatiquement ; son envoi doit rester une décision du cabinet "
         "pour le ton et le moment."),
        ("Que faire des pièces reçues hors dossier ?",
         "Les rattacher au dossier dès la réception : une pièce sans dossier est une pièce perdue."),
    ],
)

PAGES["fr/workflows/relance-de-devis"] = fpage(
    chemin="fr/workflows/relance-de-devis",
    intention="Le courtier qui envoie des propositions et veut savoir, sans y penser, ce qui attend une "
              "réponse.",
    liens=[("fr/workflows-courtier-assurance", "La bibliothèque de processus"),
           ("fr/gain-de-temps/relances-et-suivi-client", "Gagner du temps : relances et suivi"),
           ("fr/guide/automatiser-relances-courtier", "Guide : automatiser ses relances"),
           ("fr/relance-client-assurance", "Les relances dans COURTIA")],
    motscles=["relance devis assurance", "suivi proposition courtier", "process relance commerciale"],
    titre="Processus : relancer un devis sans y penser — bibliothèque courtier",
    description="Le processus de relance d'une proposition en cabinet de courtage : statuts, rythme, "
                "motifs de clôture, ce qui est automatisable et ce qui reste humain.",
    h1="Processus : relance d'un devis, avec des règles décidées à l'avance",
    corps=wf(
        objectif="Aucune proposition ne meurt d'oubli : chaque proposition est en attente, acceptée, "
                 "refusée ou retirée — et un dossier sans réponse a une raison écrite.",
        declencheur="Envoi d'une proposition, ou absence de réponse après envoi.",
        etapes=[
            "<strong>Enregistrer la proposition avec sa date d'envoi</strong> et la décision attendue "
            "(renouvellement, nouveau contrat, arbitrage de garanties).",
            "<strong>Annoncer le rythme au client</strong> dès l'envoi : quand on rappellera, et pourquoi.",
            "<strong>Relancer une fois sur l'objet du devis</strong> (une question précise vaut mieux "
            "qu'un « avez-vous eu le temps de regarder ? »).",
            "<strong>Relancer une seconde fois avec une échéance</strong> : la date de fin de validité du "
            "tarif ou l'échéance du contrat actuel.",
            "<strong>Clore explicitement</strong> : accepté, refusé, retiré. Un devis laissé « en "
            "attente » fausse tous les suivis.",
        ],
        qui="Le courtier qui a envoyé la proposition relance ; la clôture est enregistrée par la même "
            "personne, dans le dossier.",
        donnees="Date d'envoi, décision attendue, date d'échéance, statut, historique des contacts.",
        ruptures=[
            "Le devis est envoyé depuis une boîte mail sans que le dossier soit mis à jour.",
            "La relance dépend du souvenir : elle a lieu deux jours après, ou jamais.",
            "Un devis refusé reste « en attente » et gonfle artificiellement l'activité.",
            "Le client a répondu « oui » par un canal non relevé, et le dossier ne le sait pas.",
        ],
        courtia="Les propositions sont conservées dans le dossier avec leur état, les modèles de messages "
                "évitent de tout réécrire, et la préparation d'une relance se fait depuis le dossier. "
                "Aucun message ne part sans validation.",
        humain="Le contenu de la relance, le moment choisi et la réponse aux objections : c'est du "
               "commerce, pas du traitement de données.",
    ),
    faq=[
        ("Combien de relances faut-il faire ?",
         "Il n'existe pas de nombre standard : ce qui compte est d'avoir décidé à l'avance ce qui se "
         "passe après chaque étape, et de clore."),
        ("Faut-il relancer par écrit ?",
         "L'écrit garde la trace ; l'appel fait avancer un dossier bloqué. Le processus doit prévoir les "
         "deux, selon l'enjeu."),
        ("Les relances partent-elles automatiquement ?",
         "Dans COURTIA, non : elles sont préparées, le cabinet valide. Une relance envoyée sans "
         "validation est un risque commercial."),
    ],
)

PAGES["fr/workflows/renouvellement"] = fpage(
    chemin="fr/workflows/renouvellement",
    intention="Le cabinet qui découvre ses échéances trop tard et veut les traiter par paliers.",
    liens=[("fr/workflows-courtier-assurance", "La bibliothèque de processus"),
           ("fr/gain-de-temps/renouvellements-et-echeances", "Gagner du temps : renouvellements"),
           ("fr/guide/organiser-renouvellements-courtier", "Guide : organiser ses renouvellements"),
           ("fr/checklists/renouvellement", "Checklist de renouvellement")],
    motscles=["process renouvellement assurance", "échéance contrat courtier", "gestion portefeuille renouvellements"],
    titre="Processus : renouvellement par paliers — bibliothèque courtier",
    description="Le processus de renouvellement en cabinet de courtage, découpé en paliers : repérer, "
                "qualifier, demander, comparer, verrouiller, archiver.",
    h1="Processus : renouvellement, du repérage à la nouvelle échéance",
    corps=wf(
        objectif="Traiter les échéances sans urgence finale, et ne pas perdre un client par défaut "
                 "d'attention au moment où il décide.",
        declencheur="Entrée d'un contrat dans une période d'échéance, définie par le cabinet (trois mois "
                    "par exemple).",
        etapes=[
            "<strong>J-90 — repérer</strong> : lister les contrats du trimestre, sans action commerciale. "
            "Objectif : connaître la charge.",
            "<strong>J-60 — qualifier</strong> : vérifier ce qui a changé depuis un an (situation, "
            "valeurs, effectifs, véhicules) et noter ce qu'il faut demander.",
            "<strong>J-45 — demander</strong> : envoyer la demande d'informations et de pièces, avec une "
            "date de retour.",
            "<strong>J-30 — comparer</strong> : propositions en main, arbitrage possible sans urgence.",
            "<strong>J-15 — verrouiller</strong> : traiter en priorité les dossiers sans retour ; ce sont "
            "eux qui coûtent un client.",
            "<strong>J-0 — archiver</strong> : enregistrer la nouvelle échéance, sinon le cycle suivant "
            "recommence sans trace.",
        ],
        qui="Un responsable par portefeuille, avec une vue consolidée par le responsable de cabinet. Le "
            "point de contrôle est le palier : si J-60 n'est pas fait, J-30 le devient par défaut.",
        donnees="Date d'échéance, données de situation, pièces attendues, propositions, décision, "
                "nouvelle date.",
        ruptures=[
            "Les échéances ne sont pas dans l'outil : elles sont dans la tête ou dans un tableur ancien.",
            "Le client est contacté une fois, puis plus rien jusqu'à la date limite.",
            "Le renouvellement se fait « à l'identique » sans vérifier si la situation a changé.",
            "La nouvelle date n'est pas enregistrée, et l'an prochain le même travail recommence à zéro.",
        ],
        courtia="Chaque contrat porte son échéance ; une vue par période montre la charge du trimestre ; "
                "la liste d'actions du matin fait remonter les dossiers à traiter ; l'état des pièces et "
                "des propositions est conservé dans le dossier.",
        humain="Le conseil donné au client, la négociation avec la compagnie, et l'arbitrage quand le "
               "client hésite entre deux options.",
    ),
    faq=[
        ("Pourquoi des paliers plutôt qu'un rappel unique ?",
         "Parce qu'un rappel unique transforme tout en urgence : les paliers étalent le travail et "
         "laissent le temps de la comparaison."),
        ("Que faire d'un client qui ne répond jamais ?",
         "Il doit avoir un statut explicite : le processus doit prévoir ce qui se passe après la dernière "
         "relance, pas le laisser « en cours »."),
        ("Ces paliers sont-ils adaptés à tous les contrats ?",
         "Non : un contrat d'entreprise se prépare plus tôt qu'un contrat auto. Les paliers se règlent par "
         "branche."),
    ],
)

PAGES["fr/workflows/sinistre"] = fpage(
    chemin="fr/workflows/sinistre",
    intention="Le courtier qui doit suivre un sinistre pendant des mois et retrouver l'historique au "
              "renouvellement.",
    liens=[("fr/workflows-courtier-assurance", "La bibliothèque de processus"),
           ("fr/gain-de-temps/sinistres-et-conformite", "Gagner du temps : sinistres et conformité"),
           ("fr/sinistres-courtier-assurance", "Le suivi des sinistres dans COURTIA"),
           ("fr/checklists/suivi-sinistre", "Checklist de suivi de sinistre")],
    motscles=["process sinistre assurance", "suivi déclaration sinistre", "gestion sinistre courtier"],
    titre="Processus : suivre un sinistre jusqu'à la clôture — bibliothèque courtier",
    description="Le processus de suivi d'un sinistre en cabinet de courtage : déclaration, pièces, "
                "instruction, clôture, trace au renouvellement.",
    h1="Processus : sinistre, de la déclaration à la clôture",
    corps=wf(
        objectif="Que le client soit suivi, que les pièces ne soient pas perdues, et que le dossier reste "
                 "lisible des mois plus tard — y compris au renouvellement.",
        declencheur="Annonce d'un sinistre par le client, quel que soit le canal.",
        etapes=[
            "<strong>Ouvrir le sinistre dans le dossier du client</strong>, avec la date, la nature et le "
            "contrat concerné.",
            "<strong>Déclarer ou accompagner la déclaration</strong> selon la répartition des rôles "
            "convenue avec l'assureur.",
            "<strong>Constituer le dossier de pièces</strong> : constat, photos, factures, documents "
            "demandés par la compagnie ou l'expert.",
            "<strong>Suivre l'état</strong> : en instruction, en attente de pièce, expertise, clôture — "
            "avec un responsable identifié.",
            "<strong>Tenir le client informé</strong> aux moments utiles, sans le laisser sans nouvelles "
            "pendant l'instruction.",
            "<strong>Clore explicitement</strong> et vérifier la suite : résiliation, franchise, "
            "répercussion sur la prime.",
        ],
        qui="Un responsable du dossier côté cabinet, l'expert et la compagnie côté assureur. Le client est "
            "informé par le cabinet.",
        donnees="Date et nature du sinistre, contrat concerné, pièces attendues et reçues, interlocuteur "
                "assureur, état, décision.",
        ruptures=[
            "Le sinistre vit dans la boîte mail : personne ne sait où en est le dossier.",
            "Une pièce demandée par l'expert n'est jamais réclamée au client.",
            "Le sinistre est oublié puis redécouvert au renouvellement, quand le client parle de sa prime.",
            "Le dossier reste « ouvert » des années après la clôture réelle.",
        ],
        courtia="Le sinistre est rattaché au client et au contrat, son état est suivi, les pièces "
                "conservées avec leur date, et une synthèse de la situation peut être préparée à partir "
                "des éléments saisis pour un échange avec le client ou l'assureur.",
        humain="L'appréciation de ce qui est couvert, la relation avec le client en situation difficile, "
               "et les échanges avec l'expert.",
    ),
    faq=[
        ("Qui déclare le sinistre à l'assureur ?",
         "Cela dépend de l'organisation convenue : le client, le cabinet, ou les deux. Le processus doit "
         "le dire explicitement."),
        ("Le cabinet peut-il voir l'avancement de l'instruction ?",
         "Il suit l'état du dossier côté cabinet ; l'instruction reste chez l'assureur, qui n'ouvre pas "
         "son système."),
        ("Pourquoi relier le sinistre au renouvellement ?",
         "Parce que c'est le moment où la question revient : un sinistre mal clos devient un argument de "
         "négociation — ou de départ."),
    ],
)

PAGES["fr/workflows/mandat-et-kyc"] = fpage(
    chemin="fr/workflows/mandat-et-kyc",
    intention="Le cabinet qui doit pouvoir montrer, dossier par dossier, qui est son client et ce qui a "
              "été signé.",
    liens=[("fr/workflows-courtier-assurance", "La bibliothèque de processus"),
           ("fr/conformite-courtier-assurance", "La conformité dans COURTIA"),
           ("fr/guide/dda-15h", "Guide : le devoir de conseil (DDA)"),
           ("fr/checklists/preparation-audit", "Checklist de préparation d'audit")],
    motscles=["mandat courtier assurance", "vérification client KYC", "conformité cabinet courtage"],
    titre="Processus : mandat et vérification du client — bibliothèque courtier",
    description="Le processus de mandat et de vérification d'identité en cabinet de courtage : ce qu'on "
                "vérifie, quand, ce qu'on conserve, et comment le retrouver.",
    h1="Processus : mandat et vérification du client, sans reconstitution",
    corps=wf(
        objectif="Pouvoir retrouver, pour un client donné, la preuve de son identité, du mandat signé et "
                 "de l'information qui lui a été donnée — sans chercher pendant une heure.",
        declencheur="Ouverture d'un dossier, signature d'un contrat, ou changement d'interlocuteur "
                    "principal.",
        etapes=[
            "<strong>Identifier la personne et l'entité</strong> : qui contracte, pour qui, et qui "
            "décide.",
            "<strong>Vérifier les éléments d'identité</strong> et conserver la pièce avec sa date de "
            "contrôle.",
            "<strong>Formaliser le mandat</strong> quand il est requis, et en conserver la trace "
            "(date, signataire, périmètre).",
            "<strong>Documenter l'information donnée</strong> au titre du devoir de conseil, avec les "
            "documents remis.",
            "<strong>Tenir la trace à jour</strong> en cas de changement : nouveau dirigeant, nouvelle "
            "adresse, nouvelle entité.",
        ],
        qui="Le courtier qui ouvre le dossier ; le responsable de cabinet contrôle l'état des dossiers, "
            "pas chaque pièce.",
        donnees="Identité et qualité du client, pièces de vérification, mandat, documents remis, dates.",
        ruptures=[
            "Les pièces existent mais dans un dossier partagé, sans lien avec le client.",
            "Le mandat a été signé mais n'est pas rattaché au dossier concerné.",
            "Un changement de dirigeant n'est jamais répercuté : les pièces en place ne correspondent "
            "plus.",
            "La vérification est faite, mais aucune date n'est enregistrée : impossible de démontrer "
            "quand.",
        ],
        courtia="Vérification des éléments d'identité suivie par dossier, suivi des mandats, checklist "
                "des points attendus au titre du devoir de conseil, et journal des opérations consultable "
                "après coup.",
        humain="La qualification des obligations applicables au cabinet et l'appréciation de ce qui est "
               "suffisant : le produit documente, il ne conseille pas juridiquement et ne certifie aucune "
               "conformité.",
    ),
    faq=[
        ("Le produit garantit-il la conformité du cabinet ?",
         "Non : il organise et conserve la trace des contrôles. La conformité dépend des obligations "
         "applicables et de leur application réelle."),
        ("Faut-il vérifier le client à chaque contrat ?",
         "Le périmètre relève des obligations du cabinet et de son activité ; le processus doit décider "
         "quand la vérification est refaite (nouvelle entité, changement de dirigeant)."),
        ("Où sont conservées les pièces de vérification ?",
         "Rattachées au dossier du client, avec leur date — c'est ce qui permet de répondre à un contrôle "
         "sans reconstitution."),
    ],
)
