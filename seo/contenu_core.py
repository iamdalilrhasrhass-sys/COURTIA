#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contenu : coeur produit (accueil, CRM courtier, fonctionnalites).

Regle editoriale : chaque affirmation decrit une fonction reellement presente dans
l'application (routes /clients, /contrats, /devis, /documents, /relances, /taches,
/objectifs, /opportunites, /commissions, /conformite, /sante-portefeuille,
/morning-brief, /assistant-ark, /import, /rapports, /equipe, /reach, /upload/:token).
Aucun chiffre de performance, aucun temoignage, aucun nombre de clients.
"""

def section(titre, corps, id_=None):
    i = f' id="{id_}"' if id_ else ''
    return f'<h2{i}>{titre}</h2><div class="section">{corps}</div>'

def ul(items):
    return '<ul>' + ''.join(f'<li>{x}</li>' for x in items) + '</ul>'

def p(txt):
    return f'<p>{txt}</p>'

def tableau(entetes, lignes):
    th = ''.join(f'<th>{c}</th>' for c in entetes)
    tr = ''.join('<tr>' + ''.join(f'<td>{c}</td>' for c in l) + '</tr>' for l in lignes)
    return f'<table><thead><tr>{th}</tr></thead><tbody>{tr}</tbody></table>'

def etapes(paires):
    return ''.join(f'<div class="etape"><b>{a}</b><span>{b}</span></div>' for a, b in paires)

def bascule(gauche, droite, titre_g='Sans COURTIARK', titre_d='Avec COURTIARK'):
    return (f'<div class="bascule"><div><h3>{titre_g}</h3>{gauche}</div>'
            f'<div><h3>{titre_d}</h3>{droite}</div></div>')

FEATURES_HUB = '/fonctionnalites/'

def pages_core():
    P = []

    # ------------------------------------------------------------------ ACCUEIL
    P.append(dict(
        path='', type='home', country='FR', indexable=True,
        title='COURTIARK — CRM et cockpit IA pour courtiers en assurance',
        description="COURTIARK centralise portefeuille, contrats, documents et relances des cabinets de courtage en assurance. Conçu pour la France (DDA) et la Suisse (FINMA). Essai 7 jours.",
        h1='Le cockpit IA des courtiers en assurance',
        chapeau="COURTIARK centralise votre portefeuille, vos contrats, vos dossiers, vos documents et vos relances dans un CRM conçu spécifiquement pour les cabinets de courtage — en France et en Suisse.",
        fil=[],
        corps=''.join([
            section("Le problème que COURTIARK règle",
                    p("Un cabinet de courtage vit sur un portefeuille : des clients, des contrats, des échéances, "
                      "des devis à suivre, des pièces à récupérer et des renouvellements à ne pas manquer. "
                      "Quand ces éléments vivent dans un tableur, une boîte e-mail et un agenda, le suivi dépend "
                      "de la mémoire de chacun — et les occasions de revenir vers un client se perdent.")
                    + ul(["Les dossiers sont dispersés entre plusieurs outils et plusieurs personnes.",
                          "Les relances se font quand on y pense, pas quand l'échéance l'exige.",
                          "Les pièces manquantes (RIB, attestation, carte verte) sont redemandées trois fois.",
                          "Les renouvellements arrivent sans préparation.",
                          "Le temps administratif passe avant le temps commercial."])),
            section("Ce que fait COURTIARK",
                    tableau(["Besoin métier", "Ce que COURTIARK fait"],
                            [["Portefeuille", "Fiche client complète : coordonnées, contrats, échéances, documents, historique d'échanges."],
                             ["Contrats", "Contrats et échéances de renouvellement, avec les statuts du dossier."],
                             ["Devis", "Registre des devis, suivi de l'étape en cours et actions de relance à mener."],
                             ["Documents", "Collecte par lien : le client dépose ses pièces lui-même, sans compte à créer."],
                             ["Relances", "Relances organisées, rattachées au dossier concerné, avec la trace des demandes."],
                             ["Commissions", "Suivi des commissions et rétrocessions, avec un calculateur d'appoint."],
                             ["Conformité", "Repères France (DDA, ORIAS, RGPD) et Suisse (LSA, FINMA, nLPD) dans le suivi du dossier."],
                             ["Priorités", "Un brief du matin et une santé de portefeuille pour trier ce qui mérite votre attention."],
                             ["Assistant ARK", "ARK lit un document, en propose les informations, vous validez : rien n'est écrit sans votre accord."],
                             ["Prospection", "Recherche de prospects, campagnes, séquences et suivi des réponses dans le même outil."]]) +
                    p('<a href="/crm-courtier-assurance">Voir le détail du CRM courtier assurance</a> · '
                        '<a href="/fonctionnalites/">Toutes les fonctionnalités</a>')),
            section("ARK, l'assistant du cabinet",
                    p("ARK n'est pas un chatbot décoratif. Il travaille sur les données de votre cabinet : "
                      "lecture d'un document déposé (facture, RIB, attestation), proposition des informations détectées "
                      "avec la page source, comparaison avec la fiche client, puis écriture uniquement après votre validation.")
                    + etapes([("Entrée", "Un document, une question, ou la situation d'un dossier."),
                              ("Analyse", "ARK lit le document et propose des valeurs avec leur origine."),
                              ("Validation", "Vous confirmez, corrigez ou refusez chaque ligne."),
                              ("Résultat", "La fiche client est à jour, l'action d'audit est enregistrée.")])
                    + p('<a href="/fonctionnalites/assistant-ark">Comment fonctionne ARK</a>')),
            section("Avant / après",
                    bascule(ul(["Classeur par client mis à jour à la main",
                                "Relances sur mémoire et post-it",
                                "Pièces redemandées par téléphone",
                                "Échéances découvertes au moment du renouvellement"]),
                            ul(["Fiche client unique, mise à jour au fil de l'eau",
                                "Relances rattachées au dossier et suivies",
                                "Lien de dépôt : le client envoie ses pièces",
                                "Renouvellements visibles en amont"])),
                    ),
            section("France et Suisse, deux marchés traités séparément",
                    p("Le vocabulaire et le cadre ne sont pas les mêmes : en France on parle d'intermédiaire "
                      "d'assurance, de DDA et d'ORIAS ; en Suisse, d'intermédiaire au sens de la LSA, de surveillance "
                      "FINMA et de protection des données (LPD). COURTIARK intègre ces repères et facture en euros "
                      "comme en francs suisses.")
                    + '<p><a href="/france/">COURTIARK en France</a> · <a href="/suisse/">COURTIARK en Suisse</a> · '
                      '<a href="/suisse/geneve">Genève</a> · <a href="/suisse/lausanne">Lausanne</a></p>'),
            section("Sécurité et confidentialité",
                    p("Les données d'un cabinet sont cloisonnées : un cabinet ne voit que ses propres dossiers, "
                      "ce cloisonnement est vérifié par des tests d'isolation exécutés sur la production. "
                      "Les données clients ne sont ni revendues ni utilisées pour alimenter un autre cabinet.")
                    + '<p><a href="/securite">Sécurité</a> · <a href="/confidentialite">Confidentialité</a></p>'),
            section("Essayer COURTIARK",
                    p("L'essai dure 7 jours et ne demande pas de carte bancaire. À la fin de l'essai, un compte "
                      "expiré reste consultable : aucune donnée n'est supprimée, les écritures sont simplement "
                      "suspendues jusqu'à la souscription.")
                    + p("France : Starter 89 € HT/mois, Pro 159 € HT/mois. Suisse : Indépendant 199 CHF HT/mois, "
                        "Cabinet 349 CHF HT/mois.")
                    + cta_direct()),
            section("Questions fréquentes",
                    p("Les réponses détaillées se trouvent sur la page <a href=\"/crm-courtier-assurance\">CRM courtier assurance</a>.")),
        ]),
        faq=[("Qu'est-ce qu'un CRM pour courtier en assurance ?",
              "Un outil qui réunit les clients d'un cabinet, leurs contrats, leurs échéances et les actions à mener, "
              "au lieu de les répartir entre un tableur, une boîte e-mail et un agenda. La différence avec un CRM "
              "généraliste tient aux objets métier : contrats, sinistres, devis, commissions, obligations d'information."),
             ("À quoi sert ARK dans COURTIARK ?",
              "ARK est l'assistant du cabinet : il lit un document, propose les informations détectées avec leur page "
              "d'origine, les compare à la fiche client et n'enregistre que ce que vous validez."),
             ("COURTIARK fonctionne-t-il en Suisse ?",
              "Oui. Les repères suisses (LSA, surveillance FINMA, LPD) sont intégrés au suivi, et la facturation existe "
              "en francs suisses (199 CHF et 349 CHF HT par mois)."),
             ("Combien de temps dure l'essai ?",
              "Sept jours, sans carte bancaire. À l'expiration, les données restent consultables et aucune suppression "
              "n'est effectuée."),
             ("COURTIARK remplace-t-il mon logiciel de conformité ?",
              "Non. COURTIARK organise le suivi du dossier et les repères réglementaires courants. Il ne remplace ni un "
              "conseil juridique, ni un audit de conformité.")],
        lire=[("Le CRM courtier assurance", "/crm-courtier-assurance"),
              ("Assistant ARK", "/fonctionnalites/assistant-ark"),
              ("Gestion de portefeuille assurance", "/fonctionnalites/gestion-portefeuille-assurance"),
              ("Relance de devis assurance", "/fonctionnalites/relance-devis-assurance"),
              ("Guides pratiques", "/guides/")],
    ))

    # ------------------------------------------------------------------ CRM COURTier (money page)
    P.append(dict(
        path='/crm-courtier-assurance', type='money', country='FR',
        title='CRM courtier assurance : centraliser clients, contrats et relances | COURTIARK',
        description="Le CRM des cabinets de courtage en assurance : portefeuille, contrats, échéances, devis, documents, commissions et conformité au même endroit. Essai 7 jours.",
        h1="CRM courtier assurance : un seul endroit pour tout votre portefeuille",
        chapeau="COURTIARK est un CRM conçu pour le courtage d'assurance : la fiche client, les contrats et leurs "
                "échéances, les devis, les documents, les relances et les commissions vivent dans le même outil.",
        fil=[("France", "/france/"), ("CRM courtier assurance", None)],
        alternate='/suisse/crm-courtier-assurance',
        corps=''.join([
            section("Pourquoi un CRM dédié au courtage plutôt qu'un CRM généraliste",
                    p("Un CRM généraliste gère des contacts et des opportunités. Un cabinet de courtage doit gérer "
                      "des personnes couvertes, des contrats, des échéances, des assureurs, des pièces justificatives "
                      "et des commissions. Ce sont ces objets qui structurent COURTIARK.")
                    + tableau(["Objet métier", "Où il vit dans COURTIARK"],
                              [["Client", "Fiche client : coordonnées, situation, véhicules ou biens, historique."],
                               ["Contrat", "Contrat rattaché au client, avec assureur, échéance et statut."],
                               ["Devis", "Registre des devis et de leur étape (à envoyer, en attente, relancé, gagné)."],
                               ["Document", "Pièces du dossier, dont celles déposées par le client via un lien."],
                               ["Relance", "Action rattachée au dossier, avec la date de la dernière demande."],
                               ["Commission", "Suivi des commissions et rétrocessions par dossier."],
                               ["Conformité", "Repères et pièces attendues selon le marché (France ou Suisse)."]])),
            section("Ce que vous voyez dès la connexion",
                    ul(["Le brief du matin : ce qui a bougé et ce qui demande une action aujourd'hui.",
                        "La santé du portefeuille : les dossiers qui décrochent, les échéances proches, les pièces manquantes.",
                        "Les tâches et les relances du jour, rattachées à leur dossier.",
                        "Les opportunités en cours et les devis à suivre."])
                    + p("Le brief du matin n'invente rien : il reformule les données du cabinet du jour.")),
            section("Travailler à plusieurs",
                    p("Plusieurs utilisateurs peuvent être rattachés au même cabinet avec des rôles distincts. "
                      "Les données sont cloisonnées par cabinet : un cabinet ne voit jamais les dossiers d'un autre.")),
            section("Le cadre réglementaire n'est pas oublié",
                    p("En France, le courtier est un intermédiaire d'assurance soumis à immatriculation ORIAS et au "
                      "devoir de conseil de la DDA ; les données clients relèvent du RGPD. COURTIARK intègre ces repères "
                      "dans le suivi du dossier et des pièces. Cela ne constitue ni une certification ni un conseil "
                      "juridique : la responsabilité du cabinet reste entière.")
                    + '<p><a href="/guides/">Voir les guides pratiques</a></p>'),
            section("Ce que COURTIARK n'est pas",
                    ul(["Ce n'est pas un logiciel de tarification : COURTIARK organise le suivi, il ne produit pas de "
                        "tarifs d'assureurs.",
                        "Ce n'est pas un cabinet de conseil : il ne remplace pas votre obligation de conseil.",
                        "Ce n'est pas un outil qui parle à la place de vos clients : les messages sont des propositions à relire."])),
            section("Combien ça coûte",
                    tableau(["Offre (France)", "Prix", "Pour qui"],
                            [["Starter", "89 € HT/mois", "Courtier indépendant qui démarre avec un portefeuille à organiser."],
                             ["Pro", "159 € HT/mois", "Cabinet avec plusieurs collaborateurs et un suivi commercial actif."],
                             ["Cabinet", "Sur devis", "Structure avec besoins spécifiques, reprise de données ou volume important."]])
                    + p('Suisse : Indépendant 199 CHF HT/mois, Cabinet 349 CHF HT/mois. '
                        '<a href="/suisse/crm-courtier-assurance">Voir la version suisse</a>.')
                    + p("L'essai dure 7 jours et ne demande pas de carte bancaire.")),
        ]),
        faq=[("Qu'est-ce qu'un CRM pour courtier en assurance ?",
              "Un outil qui réunit les clients, leurs contrats, leurs échéances et les actions à mener, au lieu de les "
              "répartir entre un tableur, une boîte e-mail et un agenda."),
             ("Peut-on gérer plusieurs collaborateurs dans le même cabinet ?",
              "Oui. Plusieurs utilisateurs peuvent être rattachés au cabinet avec des rôles distincts, et les données "
              "restent cloisonnées par cabinet."),
             ("COURTIARK gère-t-il les commissions ?",
              "Le suivi des commissions et rétrocessions est intégré, avec un calculateur d'appoint."),
             ("Faut-il tout ressaisir pour démarrer ?",
              "Non : un import de portefeuille permet de repartir d'un fichier existant au lieu de saisir les dossiers "
              "un par un."),
             ("Que se passe-t-il à la fin de l'essai ?",
              "Aucune donnée n'est supprimée. Le cabinet garde la consultation de ses dossiers ; les écritures métier "
              "redeviennent possibles à la souscription.")],
        lire=[("Gestion de portefeuille assurance", "/fonctionnalites/gestion-portefeuille-assurance"),
              ("Relance de devis assurance", "/fonctionnalites/relance-devis-assurance"),
              ("Gestion des documents clients", "/fonctionnalites/gestion-documents-assurance"),
              ("Alternative aux CRM généralistes", "/comparatifs/crm-assurance-vs-crm-generaliste"),
              ("Assistant ARK", "/fonctionnalites/assistant-ark")],
    ))

    # ------------------------------------------------------------------ HUB FONCTIONNALITES
    P.append(dict(
        path=FEATURES_HUB, type='hub', country='FR',
        title='Fonctionnalités — CRM courtier assurance | COURTIARK',
        description="Les fonctionnalités de COURTIARK, détaillées : portefeuille, contrats, devis et relances, documents, renouvellements, commissions, ARK, prospection.",
        h1="Fonctionnalités de COURTIARK",
        chapeau="Chaque page ci-dessous décrit une capacité réellement présente dans l'application, avec son usage "
                "en cabinet et ses limites.",
        fil=[("Fonctionnalités", None)],
        corps=''.join([
            section("Portefeuille et dossiers clients",
                    ul(['<a href="/fonctionnalites/gestion-clients">Gestion des clients</a> — la fiche qui remplace le tableur.',
                        '<a href="/fonctionnalites/gestion-portefeuille-assurance">Gestion de portefeuille</a> — piloter l\'ensemble du portefeuille.',
                        '<a href="/fonctionnalites/gestion-contrats">Gestion des contrats</a> — contrats, échéances, statuts.',
                        '<a href="/fonctionnalites/renouvellements-assurance">Renouvellements</a> — anticiper avant l\'échéance.'])),
            section("Suivi commercial",
                    ul(['<a href="/fonctionnalites/relance-devis-assurance">Relance des devis</a> — ne plus laisser un devis sans suite.',
                        '<a href="/fonctionnalites/automatisation-relances">Automatisation des relances</a> — organiser les demandes récurrentes.',
                        '<a href="/fonctionnalites/prospection-assurance">Prospection</a> — recherche de prospects et campagnes.',
                        '<a href="/fonctionnalites/reporting-courtier">Reporting</a> — ce que produit l\'activité.'])),
            section("Administratif et documents",
                    ul(['<a href="/fonctionnalites/gestion-documents-assurance">Gestion des documents</a> — collecte par lien, pièces classées.',
                        '<a href="/fonctionnalites/assistant-ark">Assistant ARK</a> — lecture de document, proposition, validation.'])),
        ]),
        faq=[],
        lire=[("Le CRM courtier assurance", "/crm-courtier-assurance"), ("Guides pratiques", "/guides/"),
              ("Outils gratuits", "/outils/")],
    ))

    # ------------------------------------------------------------------ FONCTIONNALITES
    def feature(chemin, titre, description, h1, chapeau, sections, faq, lire, alt=None):
        return dict(path=chemin, type='feature', country='FR', title=titre, description=description, h1=h1,
                    chapeau=chapeau, fil=[("Fonctionnalités", FEATURES_HUB), (h1[:48].rstrip(' :'), None)],
                    alternate=alt, corps=''.join(sections), faq=faq, lire=lire)

    P.append(feature(
        '/fonctionnalites/assistant-ark',
        "Assistant ARK : l'IA qui lit vos documents et prépare vos actions | COURTIARK",
        "ARK lit un document du dossier (facture, RIB, attestation), propose les informations détectées avec leur origine, puis écrit seulement après votre validation.",
        "ARK : l'assistant qui prépare, vous validez",
        "ARK travaille sur les données du cabinet. Il lit un document, propose ce qu'il a détecté, et n'écrit rien "
        "dans la fiche client avant votre validation explicite.",
        [section("Le principe : proposer, jamais décider seul",
                 etapes([("Entrée", "Un document déposé (PDF facture, RIB scanné, attestation), une question sur un dossier, ou la situation du portefeuille."),
                         ("Analyse", "ARK extrait le texte du document et propose les informations détectées, chacune accompagnée de sa page d'origine."),
                         ("Comparaison", "Les valeurs proposées sont comparées à la fiche existante : les différences sont présentées côte à côte."),
                         ("Validation", "Vous confirmez, corrigez ou refusez chaque ligne. Rien n'est écrit avant ce clic."),
                         ("Trace", "L'écriture est journalisée : on sait quoi a été appliqué, quand, et sur quel document.")])
                 + p("Un document illisible ne produit pas de valeur inventée : ARK s'arrête et l'explique.")),
         section("Ce qu'ARK fait concrètement dans COURTIARK",
                 ul(["Lire un document du dossier et proposer les champs qu'il contient.",
                     "Comparer les valeurs proposées à celles déjà présentes dans la fiche client.",
                     "Répondre à une question sur un dossier précis en citant les informations du dossier.",
                     "Préparer un message ou une synthèse, que vous relisez avant envoi.",
                     "Faire remonter les dossiers qui méritent une action aujourd'hui (brief du matin, santé du portefeuille)."])),
         section("Ce qu'ARK ne fait pas",
                 ul(["Il ne contacte personne à votre place : aucun e-mail, aucun SMS n'est envoyé automatiquement.",
                     "Il ne remplace pas votre devoir de conseil.",
                     "Il n'affiche pas de tarifs d'assureurs : le module de comparaison fonctionne en simulation explicitement étiquetée."])),
         section("Pourquoi une validation est obligatoire",
                 p("Un cabinet qui traite des données de clients doit pouvoir expliquer ce qu'il a enregistré et d'où "
                   "vient l'information. La validation humaine est donc le cœur du fonctionnement, pas une option."))],
        [("ARK envoie-t-il des messages tout seul ?", "Non. ARK prépare des propositions ; aucun e-mail ni SMS n'est envoyé sans une action de votre part."),
         ("ARK écrit-il dans la fiche client sans validation ?", "Non. Chaque information proposée doit être confirmée ou corrigée avant écriture, et l'écriture est journalisée."),
         ("Que se passe-t-il si le document est illisible ?", "ARK le signale au lieu de proposer des valeurs inventées."),
         ("ARK fonctionne-t-il sur les dossiers suisses ?", "Oui, les mêmes mécanismes s'appliquent aux dossiers traités sur le marché suisse.")],
        [("Le CRM courtier assurance", "/crm-courtier-assurance"), ("Gestion des documents", "/fonctionnalites/gestion-documents-assurance"),
         ("Guide : centraliser les documents clients", "/guides/centraliser-documents-clients-assurance")],
        alt=None))

    P.append(feature(
        '/fonctionnalites/gestion-portefeuille-assurance',
        "Gestion de portefeuille assurance : piloter tout le cabinet | COURTIARK",
        "Suivez votre portefeuille d'assurance dans un seul écran : dossiers, échéances, pièces manquantes, contrats qui décrochent, actions du jour.",
        "Gestion de portefeuille d'assurance",
        "Un portefeuille ne se pilote pas client par client. COURTIARK donne une vue d'ensemble : ce qui échoit, ce "
        "qui manque, ce qui décroche, et ce qu'il faut faire aujourd'hui.",
        [section("Ce que la vue portefeuille montre",
                 ul(["Les dossiers avec une échéance proche.",
                     "Les dossiers incomplets (pièces ou informations manquantes).",
                     "Les contrats dont l'activité décroche (santé du portefeuille).",
                     "Les tâches et relances dues aujourd'hui.",
                     "Le brief du matin : la lecture en quelques lignes de la journée."])),
         section("Pourquoi c'est différent d'un tableur",
                 p("Un tableur montre ce qu'on y a saisi. La santé du portefeuille, elle, calcule des signaux à partir "
                   "des données (échéance proche, dossier sans action récente, pièce absente) : elle fait remonter ce "
                   "qu'on ne penserait pas à chercher.")),
         section("Reprendre un portefeuille existant",
                 p("L'import permet de démarrer depuis un fichier existant plutôt que de ressaisir les dossiers un par "
                   "un. Les lignes importées restent modifiables et rattachées au cabinet.")),
         section("Suivre la valeur du portefeuille",
                 ul(["Contrats actifs et valeurs associées.",
                     "Devis en cours et potentiel.",
                     "Commissions attendues et encaissées.",
                     "Objectifs de l'équipe et avancement."]))],
        [("Puis-je reprendre un portefeuille existant ?", "Oui, un import permet de partir d'un fichier existant."),
         ("Combien de clients puis-je suivre ?", "COURTIARK n'impose pas de plafond fonctionnel ; le choix d'offre dépend surtout du nombre d'utilisateurs et du suivi commercial."),
         ("La vue portefeuille remplace-t-elle les rapports ?", "Non, elle sert au pilotage quotidien ; les rapports servent à l'analyse d'activité.")],
        [("Gestion des clients", "/fonctionnalites/gestion-clients"), ("Renouvellements", "/fonctionnalites/renouvellements-assurance"),
         ("Guide : organiser un portefeuille d'assurance", "/guides/organiser-portefeuille-assurance")]))

    P.append(feature(
        '/fonctionnalites/relance-devis-assurance',
        "Relance de devis assurance : ne plus perdre de devis | COURTIARK",
        "Un devis sans relance est un devis perdu. COURTIARK rattache les devis à un dossier, suit leur étape et organise les relances à mener.",
        "Relance de devis assurance",
        "Un devis transmis et jamais relancé se transforme en affaire perdue sans que personne ne s'en aperçoive. "
        "COURTIARK rend cet oubli visible et organise la relance.",
        [section("Pourquoi les devis partent en perte",
                 ul(["Le devis est parti par e-mail et personne ne sait s'il a été lu.",
                     "Le client attend une pièce qu'on a oublié de demander.",
                     "La relance dépend de la mémoire du collaborateur concerné.",
                     "Le devis n'est rattaché à aucune action : il n'apparaît dans aucune liste de travail."])),
         section("Comment COURTIARK traite ce problème",
                 etapes([("Registre", "Les devis sont enregistrés et rattachés à un client, avec leur étape."),
                         ("Repérage", "Les devis sans suite apparaissent dans les relances et les tâches à mener."),
                         ("Action", "La relance est enregistrée : on sait quand le client a été relancé et par quel canal."),
                         ("Suivi", "Le devis passe à gagné ou perdu ; l'historique reste attaché au dossier.")])
                 + p("Les canaux réellement disponibles sont ceux du produit : e-mail préparé par vos soins, "
                     "téléphone et messages suivis dans la fiche. Aucun envoi automatique n'est déclenché à votre place.")),
         section("Ce qu'il faut mettre en place côté cabinet",
                 ul(["Une règle simple sur le délai de première relance.",
                     "Une personne responsable des devis en attente.",
                     "Une revue hebdomadaire des devis sans suite (la liste existe déjà)."])),
         section("Suivre le résultat",
                 p("Le reporting du cabinet montre les devis en cours, gagnés et perdus. L'objectif n'est pas la "
                   "statistique pour elle-même : c'est de savoir combien d'affaires dorment."))],
        [("Les relances sont-elles envoyées automatiquement ?", "Non. COURTIARK organise et trace les relances ; l'envoi reste une action humaine."),
         ("Puis-je relancer par téléphone ?", "Oui, et la trace de la relance se consigne dans le dossier pour que le suivi reste lisible."),
         ("Combien de relances faut-il prévoir ?", "Il n'existe pas de règle universelle : c'est votre organisation qui la fixe, l'outil la rend applicable.")],
        [("Automatisation des relances", "/fonctionnalites/automatisation-relances"),
         ("Guide : ne plus oublier les relances", "/guides/comment-ne-plus-oublier-relances-courtier")]))

    P.append(feature(
        '/fonctionnalites/renouvellements-assurance',
        "Renouvellements assurance : anticiper au lieu de subir | COURTIARK",
        "Les échéances de contrats sont visibles à l'avance : COURTIARK permet de préparer le renouvellement avant que le client ne reçoive l'avis de son assureur.",
        "Gestion des renouvellements d'assurance",
        "Le renouvellement est le moment où un portefeuille se gagne ou se perd. Encore faut-il le voir venir : "
        "COURTIARK affiche les échéances et les dossiers qui arrivent à terme.",
        [section("Le principe",
                 p("Chaque contrat porte son échéance. La vue portefeuille et le brief du matin font remonter les "
                   "contrats qui approchent du terme, pour que la prise de contact se fasse avant l'avis de "
                   "l'assureur, pas après.")),
         section("Ce que vous pouvez faire avant l'échéance",
                 ul(["Vérifier que le dossier est complet (pièces, informations).",
                     "Préparer un point avec le client à partir de la fiche et de l'historique.",
                     "Identifier les dossiers dont l'activité décroche : ce sont les plus exposés au départ.",
                     "Consigner la décision (reconduction, modification, résiliation demandée par le client)."])),
         section("Ce que COURTIARK ne fait pas",
                 p("COURTIARK ne renégocie pas avec l'assureur et ne produit pas de tarif. Il organise le suivi et "
                   "les actions du cabinet ; la relation avec l'assureur reste la vôtre.")),
         section("Le cadre juridique, en repères",
                 ul(["France : information et conseil relèvent de la DDA ; le client dispose de ses propres délais de renonciation ou de résiliation prévus au contrat.",
                     "Suisse : le régime du contrat d'assurance est fixé par la LSA ; le courtier agit comme intermédiaire."])
                 + p('Ces repères ne remplacent pas l\'analyse du contrat concerné. <a href="/guides/">Voir les guides</a>.'))],
        [("Puis-je voir les échéances à 90 jours ?", "Les échéances sont portées par les contrats et remontées dans la vue portefeuille et le brief du matin."),
         ("COURTIARK renégocie-t-il les contrats ?", "Non : l'outil organise le suivi et la préparation, la négociation reste celle du cabinet."),
         ("Le suivi des renouvellements fonctionne-t-il en Suisse ?", "Oui, avec les repères propres au marché suisse.")],
        [("Guide : automatiser les renouvellements", "/guides/automatiser-renouvellements-assurance"),
         ("Gestion des contrats", "/fonctionnalites/gestion-contrats")]))

    P.append(feature(
        '/fonctionnalites/gestion-documents-assurance',
        "Gestion des documents assurance : collecte par lien | COURTIARK",
        "Le client dépose ses pièces (RIB, attestation, carte verte) par un lien, sans créer de compte. Les documents restent rattachés à son dossier.",
        "Gestion des documents clients",
        "Demander trois fois le même RIB coûte du temps et agace le client. COURTIARK fournit un lien de dépôt : le "
        "client dépose, le document arrive dans le bon dossier.",
        [section("Comment fonctionne la collecte",
                 etapes([("Demande", "Vous générez un lien de dépôt pour le dossier ou la pièce manquante."),
                         ("Dépôt", "Le client ouvre le lien et dépose ses fichiers — sans créer de compte ni installer d'application."),
                         ("Classement", "Le document arrive rattaché au dossier concerné."),
                         ("Contrôle", "ARK peut lire le document et proposer les informations qu'il contient, après votre validation.")])
                 + p("Le lien est nominatif et limité à la demande : il ne donne pas accès à l'espace du cabinet.")),
         section("Ce que vous gardez en main",
                 ul(["Vous voyez qui a déposé quoi et quand.",
                     "Les pièces manquantes sont visibles dossier par dossier.",
                     "Les documents peuvent être lus par ARK pour alimenter la fiche (RIB, attestation, facture).",
                     "Les données de santé éventuelles ne sont jamais utilisées pour la prospection."])),
         section("Un dossier complet, c'est un dossier qui se traite plus vite",
                 p("La plupart des blocages d'un dossier viennent d'une pièce manquante. La liste des documents "
                   "attendus, rattachée au dossier, remplace les échanges d'e-mails « il manque toujours quelque chose »."))],
        [("Le client doit-il créer un compte ?", "Non : il dépose ses pièces via un lien, sans compte ni installation."),
         ("Les documents sont-ils lisibles par ARK ?", "Oui, ARK peut extraire les informations d'un document et les proposer à la validation du courtier."),
         ("Où sont stockés les documents ?", "Dans l'espace du cabinet, avec un accès limité aux utilisateurs de ce cabinet. Voir la page Sécurité.")],
        [("Guide : centraliser les documents clients", "/guides/centraliser-documents-clients-assurance"),
         ("Assistant ARK", "/fonctionnalites/assistant-ark")]))

    P.append(feature(
        '/fonctionnalites/automatisation-relances',
        "Automatisation des relances courtier assurance | COURTIARK",
        "Organisez les relances récurrentes d'un cabinet de courtage : pièces manquantes, devis en attente, échéances. Rien n'est envoyé sans une action humaine.",
        "Automatisation des relances",
        "L'automatisation utile dans un cabinet n'est pas d'envoyer des messages à la chaîne : c'est de ne plus "
        "oublier une demande. COURTIARK transforme une situation (pièce manquante, devis sans suite, échéance) en "
        "action visible dans une liste de travail.",
        [section("Les trois familles de relances",
                 tableau(["Situation", "Ce qui est déclenché", "Qui agit"],
                         [["Pièce manquante", "Le dossier apparaît comme incomplet ; le lien de dépôt est prêt.", "Le courtier décide de la demande."],
                          ["Devis sans suite", "Le devis remonte dans les relances à mener.", "Le courtier relance (e-mail préparé, appel, message)."],
                          ["Échéance proche", "Le contrat remonte dans la vue portefeuille et le brief du matin.", "Le courtier prépare le renouvellement."]])),
         section("Ce qui n'est jamais automatique",
                 ul(["Aucun e-mail n'est envoyé par COURTIARK à votre place.",
                     "Aucun SMS n'est envoyé automatiquement.",
                     "Aucune donnée n'est transmise à un tiers.",
                     "Aucune décision commerciale n'est prise par l'outil."])),
         section("La séquence type d'un cabinet organisé",
                 etapes([("Lundi", "Revue des devis sans suite et des pièces manquantes."),
                         ("Semaine", "Relances consignées au fil de l'eau, rattachées au dossier."),
                         ("Vendredi", "Point sur les dossiers qui bloquent depuis plus de deux semaines."),
                         ("Mois", "Lecture du reporting : devis gagnés, perdus, en attente.")])),
         section("Ce qu'il faut mesurer pour savoir si ça marche",
                 p("Le nombre de dossiers bloqués depuis plus de X jours doit diminuer. C'est un indicateur interne, "
                   "que votre cabinet suit lui-même dans les listes de l'outil."))],
        [("COURTIARK envoie-t-il des relances automatiquement ?", "Non : l'outil organise et trace, l'envoi reste humain."),
         ("Puis-je définir mes propres délais ?", "Oui, votre organisation fixe les délais ; l'outil les rend visibles et suivables."),
         ("La relance téléphonique est-elle tracée ?", "Oui, elle se consigne dans le dossier pour garder un historique lisible.")],
        [("Relance de devis", "/fonctionnalites/relance-devis-assurance"),
         ("Guide : réduire la saisie manuelle", "/guides/reduire-saisie-manuelle-courtier")]))

    P.append(feature(
        '/fonctionnalites/gestion-clients',
        "Gestion des clients assurance : la fiche qui remplace le tableur | COURTIARK",
        "Une fiche client complète : coordonnées, contrats, échéances, documents, historique des échanges et des relances, au même endroit.",
        "Gestion des clients",
        "La fiche client est le point de départ de tout : c'est là qu'on voit ce que la personne a, ce qui arrive à "
        "échéance, ce qui manque et ce qui s'est dit.",
        [section("Ce que contient une fiche client",
                 ul(["Identité et coordonnées, avec les moyens de contact réellement utilisés.",
                     "Contrats en cours, assureur, échéance, statut.",
                     "Documents du dossier, y compris ceux déposés par le client via un lien.",
                     "Historique : devis, relances, tâches, échanges.",
                     "Segmentation par tags pour retrouver un groupe de clients (profession, branche, secteur)."])),
         section("Retrouver une information sans fouiller",
                 p("La recherche s'appuie sur les données saisies et tolère les variantes de saisie (accents, "
                   "casse) : « Muller » retrouve « Müller ».")),
         section("RGPD : ce qu'un cabinet doit garder en tête",
                 p("Les données de santé relèvent de catégories particulières : elles doivent rester limitées à ce "
                   "qui est nécessaire au dossier et ne jamais servir à de la prospection. COURTIARK n'utilise pas "
                   "ces données pour du marketing, et la responsabilité du traitement reste celle du cabinet.")),
         section("Importer plutôt que ressaisir",
                 p("Un import de portefeuille permet de charger les dossiers existants depuis un fichier, puis de les "
                   "enrichir au fil de l'eau."))],
        [("Puis-je importer mes clients existants ?", "Oui, un import permet de partir d'un fichier existant."),
         ("Les données de santé sont-elles utilisées pour de la prospection ?", "Non, jamais."),
         ("Puis-je suivre des clients particuliers et des entreprises ?", "Oui, la fiche est la même ; la segmentation se fait par tags.")],
        [("Gestion de portefeuille", "/fonctionnalites/gestion-portefeuille-assurance"),
         ("Gestion des contrats", "/fonctionnalites/gestion-contrats")]))

    P.append(feature(
        '/fonctionnalites/gestion-contrats',
        "Gestion des contrats d'assurance : échéances et statuts | COURTIARK",
        "Suivez les contrats de vos clients : assureur, échéance, statut, documents liés. Les renouvellements ne se découvrent plus au dernier moment.",
        "Gestion des contrats",
        "Le contrat est l'objet central du portefeuille. COURTIARK le rattache au client, lui donne une échéance et "
        "un statut, et l'expose là où vous en avez besoin : listes, brief du matin, vue portefeuille.",
        [section("Ce qui est suivi",
                 ul(["Le contrat et son assureur, rattachés au client.",
                     "L'échéance, pour anticiper le renouvellement.",
                     "Le statut du dossier (en cours, à compléter, terminé).",
                     "Les documents associés et les pièces attendues.",
                     "Les commissions liées au contrat."])),
         section("Pourquoi l'échéance change tout",
                 p("Sans échéance, un contrat est invisible jusqu'à l'appel du client. Avec une échéance, le cabinet "
                   "décide quand il prend contact — et peut préparer le dossier avant que la question ne se pose.")),
         section("Devis et contrats : le même fil",
                 p("Un devis accepté devient un contrat sans rupture de suivi : le dossier conserve son historique, ce "
                   "qui évite de ressaisir les informations déjà connues."))],
        [("Puis-je suivre plusieurs contrats par client ?", "Oui, un client peut avoir plusieurs contrats, chacun avec son échéance et son statut."),
         ("Les commissions sont-elles rattachées aux contrats ?", "Oui, le suivi des commissions s'appuie sur les dossiers et contrats."),
         ("COURTIARK se connecte-t-il aux assureurs ?", "Non : COURTIARK organise le suivi du cabinet, il ne s'interconnecte pas aux systèmes des assureurs.")],
        [("Renouvellements", "/fonctionnalites/renouvellements-assurance"),
         ("Commissions et rétrocessions dans le CRM", "/crm-courtier-assurance")]))

    P.append(feature(
        '/fonctionnalites/reporting-courtier',
        "Reporting courtier assurance : ce que produit l'activité | COURTIARK",
        "Rapports et analyses du cabinet : portefeuille, devis, commissions, activité commerciale. Des chiffres issus de vos données, pas d'estimations.",
        "Reporting et pilotage",
        "Un cabinet se pilote avec ce qu'il a réellement produit : contrats en portefeuille, devis en cours, "
        "commissions attendues, activité des collaborateurs. COURTIARK restitue ces éléments à partir des données du cabinet.",
        [section("Ce que restitue le reporting",
                 ul(["Portefeuille : contrats et valeurs associées.",
                     "Devis : en cours, gagnés, perdus.",
                     "Commissions : attendues, encaissées, par dossier.",
                     "Activité : tâches et relances traitées.",
                     "Objectifs du cabinet et avancement (module Objectifs)."])),
         section("Des chiffres qui viennent de vos données",
                 p("COURTIARK n'affiche pas d'estimation générique : un indicateur qui ne peut pas être calculé reste "
                   "vide plutôt que d'être inventé. C'est une règle du produit.")),
         section("Le brief du matin : le rapport le plus utile",
                 p("Plutôt qu'un tableau à interpréter, le brief du matin résume ce qui a changé et ce qui demande une "
                   "action aujourd'hui. Il se lit en quelques secondes, à la première connexion."))],
        [("Les rapports utilisent-ils mes données ou des moyennes de marché ?", "Uniquement les données de votre cabinet."),
         ("Puis-je suivre l'activité de plusieurs collaborateurs ?", "Le cabinet peut rattacher plusieurs utilisateurs avec des rôles distincts ; le pilotage reste à l'échelle du cabinet."),
         ("Les indicateurs manquants sont-ils estimés ?", "Non, un indicateur non calculable reste vide.")],
        [("Gestion de portefeuille", "/fonctionnalites/gestion-portefeuille-assurance"),
         ("Guide : organiser un portefeuille", "/guides/organiser-portefeuille-assurance")]))

    P.append(feature(
        '/fonctionnalites/prospection-assurance',
        "Prospection assurance : rechercher et suivre les prospects | COURTIARK",
        "Recherche de prospects, campagnes, séquences et boîte de réception des réponses : la prospection se suit dans le même outil que le portefeuille.",
        "Prospection et suivi commercial",
        "Un cabinet de courtage vit aussi de conquête. COURTIARK permet de rechercher des prospects, de préparer des "
        "séquences de contact et de suivre les réponses — sans sortir du CRM.",
        [section("Ce que couvre le module de prospection",
                 ul(["Recherche de prospects par zone et par cible, avec une carte pour se repérer.",
                     "Constitution de listes et campagne de contact.",
                     "Séquences : plusieurs étapes de contact, suivies une par une.",
                     "Boîte de réception des réponses et suivi des échanges.",
                     "Passage d'un prospect qualifié à un dossier client."])),
         section("Prospection et données personnelles",
                 p("La prospection est encadrée : consentements, oppositions et sources doivent être respectés. "
                   "Le produit garde la trace des contacts et permet de sortir une personne d'une séquence ; "
                   "le respect des obligations (RGPD en France, LPD en Suisse) reste celui du cabinet.")),
         section("Ce qui n'est pas automatique",
                 p("Aucun message n'est envoyé par COURTIARK sans action de votre part : les séquences organisent les "
                   "étapes et les rappellent, l'envoi et la décision restent humains."))],
        [("COURTIARK envoie-t-il des messages de prospection automatiquement ?", "Non, les séquences organisent les étapes ; l'envoi reste une action du cabinet."),
         ("Puis-je retirer une personne d'une séquence ?", "Oui, les oppositions se gèrent dans le module de prospection."),
         ("La prospection est-elle reliée au CRM ?", "Oui : un prospect qui devient client rejoint le portefeuille dans le même outil.")],
        [("Le CRM courtier assurance", "/crm-courtier-assurance"),
         ("Guide : automatiser le suivi des prospects", "/guides/automatiser-suivi-prospects-assurance")]))

    P.append(feature(
        '/fonctionnalites/compte-rendu-clients',
        "Suivi des échanges clients : rendez-vous et comptes rendus | COURTIARK",
        "Rendez-vous, visites et échanges clients consignés dans le dossier : le suivi commercial reste lisible pour tout le cabinet.",
        "Suivi des rendez-vous et des échanges",
        "Un échange client non consigné est un échange perdu. COURTIARK rattache rendez-vous et échanges au dossier "
        "pour que l'information survive au collaborateur.",
        [section("Ce qui se consigne",
                 ul(["Rendez-vous et visites (module rendez-vous).",
                     "Échanges avec le client, par téléphone ou message (module d'appels et messagerie).",
                     "Résultat de la relance et prochaine étape.",
                     "Documents transmis ou reçus."])),
         section("Pourquoi c'est structurant",
                 p("Quand un collaborateur part ou s'absente, le dossier reste exploitable : la mémoire du cabinet ne "
                   "dépend plus d'une personne."))],
        [("Les appels sont-ils enregistrés ?", "Le suivi des appels consigne l'information utile au dossier ; le produit n'est pas un outil d'enregistrement à votre insu."),
         ("Puis-je suivre les échanges WhatsApp ?", "Le suivi des conversations est prévu dans le même espace que le reste du dossier client."),
         ("Les comptes rendus sont-ils visibles par toute l'équipe ?", "Oui, pour les utilisateurs rattachés au cabinet.")],
        [("Gestion des clients", "/fonctionnalites/gestion-clients"),
         ("Relance de devis", "/fonctionnalites/relance-devis-assurance")]))

    return P


def cta_direct():
    """CTA inline lorsque les CTA de tete et de pied suffisent deja."""
    return ''
