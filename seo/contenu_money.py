#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Money page : « logiciel pour courtier en assurance ».

Page cible unique de l'intention commerciale la plus proche du produit (position ~13 au T0).
Structure imposee par la mission : hero, 10 sections H2, comparatif Excel / CRM generaliste /
COURTIARK, FAQ orientee intention, CTA final. Aucune fonctionnalite inventee : chaque ligne du
comparatif correspond a une fonction presente dans l'application.
"""
from contenu_core import section, ul, p, tableau, etapes

TITRE = "Logiciel pour courtier en assurance | CRM IA COURTIARK"
DESCRIPTION = ("COURTIARK centralise clients, contrats, documents, renouvellements et relances dans un "
               "CRM IA conçu pour les courtiers en assurance, en France et en Suisse.")
H1 = "Le logiciel CRM conçu pour les courtiers en assurance"
CHAPEAU = ("Centralisez votre portefeuille, vos prospects, vos contrats, vos documents, vos relances et vos "
           "renouvellements dans un cockpit pensé pour le courtage en assurance.")

PRODUIT = [
    ['Gestion clients', 'Manuel', 'Configuration nécessaire', 'Fiche client métier : situation, contrats, historique'],
    ['Gestion du portefeuille', 'Manuel', 'Vue générique', 'Vue portefeuille, santé du portefeuille, brief du matin'],
    ['Contrats d’assurance', 'Manuel', 'Objets génériques à créer', 'Contrats, échéances et statuts du dossier'],
    ['Documents', 'Dossiers partagés', 'Stockage à configurer', 'Collecte par lien, classement par dossier, lecture assistée'],
    ['Relances', 'Rappels manuels', 'Tâches à paramétrer', 'Relances rattachées au dossier, avec trace'],
    ['Renouvellements', 'Manuel', 'Rappel générique', 'Échéances visibles en amont, préparation guidée'],
    ['Priorisation métier', 'Aucune', 'Tableaux de bord génériques', 'Brief du matin, dossiers à traiter, actions du jour'],
    ['Assistant ARK', 'Aucun', 'Extension IA à intégrer', 'Lecture de document, proposition avec origine, validation humaine'],
    ['France et Suisse', 'Non', 'Non', 'Repères DDA et ORIAS en France, LSA et surveillance FINMA côté suisse'],
    ['Devis et commissions', 'Manuel', 'Objets à créer', 'Registre des devis, suivi des commissions et rétrocessions'],
]


def pages_money():
    return [dict(
        path='/logiciel-courtier-assurance', type='money', country='FR', indexable=True,
        title=TITRE, description=DESCRIPTION, h1=H1, chapeau=CHAPEAU,
        fil=[("Logiciel pour courtier en assurance", None)],
        alternate='/suisse/crm-courtier-assurance',
        corps=''.join([
            section("Un CRM métier pour piloter votre cabinet de courtage",
                    p("Un logiciel généraliste sait gérer des contacts. Un cabinet de courtage a besoin de "
                      "gérer des dossiers d'assurance : un client, une situation, des contrats, des échéances, "
                      "des pièces, des devis à suivre et des renouvellements à préparer.")
                    + tableau(["Ce que votre cabinet gère", "Ce que COURTIARK en fait"],
                              [["Clients", "Fiche unique : coordonnées, situation, contrats, documents, historique."],
                               ["Prospects", "Recherche, campagnes, suivi des réponses, conversion en client."],
                               ["Contrats", "Contrats rattachés au client, avec leur échéance et leur statut."],
                               ["Dossiers", "Tout ce qui concerne un client au même endroit, y compris les pièces."],
                               ["Portefeuille", "Vue d'ensemble, santé du portefeuille et brief du matin."]])
                    + p("Le vocabulaire employé est celui du courtage, pas celui d'un CRM de vente générique.")),

            section("Suivez chaque opportunité, du prospect au contrat",
                    etapes([("1. Prospect", "Le contact entre dans le suivi, avec sa source."),
                            ("2. Qualification", "Le besoin est consigné, la suite est décidée."),
                            ("3. Devis", "Le devis est enregistré et son étape est tenue à jour."),
                            ("4. Relance", "Les devis sans suite remontent dans les actions du jour."),
                            ("5. Signature", "La décision du client est consignée, le contrat est rattaché."),
                            ("6. Renouvellement", "L'échéance est enregistrée et préparée en amont.")])
                    + p('Le détail de cette mécanique est décrit sur la page '
                        '<a href="/fonctionnalites/relance-devis-assurance">relance des devis</a>.')),

            section("Ne perdez plus vos relances ni vos renouvellements",
                    p("Une relance oubliée est une affaire perdue, pas un simple retard administratif. "
                      "COURTIARK organise les relances dans le dossier concerné et fait remonter les échéances "
                      "avant l'avis de l'assureur, sans envoyer de message à votre place.")
                    + ul(['Relances rattachées au dossier, avec la date et la trace de chaque demande.',
                          'Devis sans suite repérés dans les actions du jour.',
                          'Échéances visibles plusieurs semaines à l’avance.',
                          'Aucun envoi automatique au client : le cabinet garde la main.'])
                    + p('<a href="/fonctionnalites/relance-devis-assurance">Relance des devis</a> · '
                        '<a href="/fonctionnalites/renouvellements-assurance">Renouvellements</a> · '
                        '<a href="/fonctionnalites/automatisation-relances">Automatisation des relances</a>')),

            section("Centralisez les documents de vos clients",
                    p("Les pièces arrivent par e-mail, en photo, à moitié lisibles, et se perdent. "
                      "COURTIARK fournit un lien de dépôt : le client envoie ses documents sans créer de compte, "
                      "et chaque pièce est classée dans son dossier.")
                    + ul(['Dépôt par lien, sans compte client à créer.',
                          'Pièces classées par dossier, avec la date de réception.',
                          'Pièces manquantes identifiables d’un coup d’œil.',
                          'Lecture assistée par ARK, avec validation avant écriture.'])
                    + p('<a href="/fonctionnalites/gestion-documents-assurance">Gestion des documents</a>')),

            section("ARK vous aide à prioriser le travail du jour",
                    p("ARK n’est pas un chatbot décoratif : il travaille sur les données du cabinet. Il lit un "
                      "document déposé, propose les informations qu’il y trouve avec leur origine, et n’écrit "
                      "rien sans votre accord.")
                    + tableau(["Ce qu'ARK fait", "Ce qu'ARK ne fait pas"],
                              [["Lire une facture, une attestation ou un RIB et proposer les valeurs détectées",
                                "Décider d’un conseil ou d’une garantie"],
                               ["Comparer une pièce avec la fiche client et signaler un écart",
                                "Envoyer un message au client à votre place"],
                               ["Faire remonter les dossiers incomplets et les actions en attente",
                                "Modifier un contrat sans validation"]])
                    + p('<a href="/fonctionnalites/assistant-ark">Comment fonctionne ARK</a>')),

            section("Excel, CRM généraliste ou logiciel métier pour courtier ?",
                    p("Les trois peuvent coexister dans un cabinet. La question est de savoir ce que vous "
                      "acceptez de reconstruire à la main chaque semaine.")
                    + tableau(["Besoin du cabinet", "Excel", "CRM généraliste", "COURTIARK"], PRODUIT)
                    + p("Les mentions « manuel » et « configuration nécessaire » décrivent un usage courant : "
                        "un tableur ou un CRM généraliste peuvent couvrir un besoin, avec un paramétrage ou une "
                        "saisie de votre côté. Nous ne prétendons pas qu’aucun autre outil ne sait le faire.")
                    + p('<a href="/comparatifs/crm-assurance-vs-crm-generaliste">Comparatif détaillé CRM assurance ou '
                        'CRM généraliste</a> · <a href="/comparatifs/excel-vs-crm-courtier-assurance">Excel ou CRM courtier</a>')),

            section("À qui s’adresse COURTIARK ?",
                    tableau(["Profil", "Ce que COURTIARK change", "Page dédiée"],
                            [["Courtier indépendant", "Un portefeuille tenu sans tableur, avec des priorités claires.",
                              '<a href="/solutions/courtier-assurance-independant">Courtier indépendant</a>'],
                             ["Cabinet de courtage", "Plusieurs collaborateurs sur les mêmes dossiers, sans doublon.",
                              '<a href="/solutions/cabinet-courtage-assurance">Cabinet de courtage</a>'],
                             ["Équipe commerciale", "Devis, relances et objectifs suivis dans le même outil.",
                              '<a href="/solutions/equipe-commerciale-assurance">Équipe commerciale</a>'],
                             ["Réseau et structure multi-utilisateurs", "Rôles, cloisonnement par cabinet, reporting d’activité.",
                              '<a href="/solutions/reseau-courtage">Réseau de courtage</a>']])),

            section("COURTIARK en France et en Suisse",
                    p("Le vocabulaire et le cadre ne sont pas les mêmes : en France, l’activité d’intermédiaire "
                      "s’exerce sous un cadre européen transposé (DDA) avec immatriculation au registre unique "
                      "(ORIAS) ; en Suisse, elle relève de la loi sur le contrat d’assurance et d’exigences "
                      "propres à l’intermédiaire, sous surveillance prudentielle. Ce sont deux cadres "
                      "réglementaires distincts, pas deux labels du même produit.")
                    + p('<a href="/france">COURTIARK en France</a> · <a href="/suisse">COURTIARK en Suisse</a> · '
                        '<a href="/suisse/geneve">Genève</a> · <a href="/suisse/lausanne">Lausanne</a>')),

            section("Voir le produit",
                    p("Plutôt qu’une promesse, la démonstration publique : elle utilise des données de "
                      "démonstration, sans aucun client réel.")
                    + ul(['<a href="/demo-public">Ouvrir la démonstration publique</a> — tableau de bord, portefeuille, dossier client.',
                          '<a href="/fonctionnalites/gestion-portefeuille-assurance">Voir la page portefeuille</a> — ce que montre la vue d’ensemble.',
                          '<a href="/outils">Outils gratuits</a> — calculs et checklists utilisables sans compte.'])),
        ]),
        faq=[("Qu’est-ce qu’un logiciel pour courtier en assurance ?",
              "C’est un outil de gestion métier qui centralise les clients, les contrats, les échéances, les documents "
              "et les relances d’un cabinet de courtage, avec le vocabulaire et les obligations du courtage — ce qui le "
              "distingue d’un CRM de vente générique. Un tel outil ne remplace ni votre analyse ni votre conseil : il "
              "organise le suivi de ce que vous décidez."),
             ("Quelle différence entre un CRM généraliste et un CRM de courtage ?",
              "Les objets métier. Contrats, échéances, devis, commissions et pièces d’assurance existent nativement dans "
              "un CRM de courtage ; dans un CRM généraliste, ils sont représentés par des champs ou des objets à créer, "
              "avec un paramétrage à votre charge."),
             ("COURTIARK convient-il à un courtier indépendant ?",
              "Oui : l’offre démarre à un utilisateur, avec les mêmes objets métier qu’un cabinet. L’essai dure 7 jours "
              "et ne demande pas de carte bancaire ; à l’expiration, les données restent consultables."),
             ("Peut-on suivre les renouvellements dans COURTIARK ?",
              "Oui : chaque contrat porte son échéance, la vue portefeuille les fait remonter en amont, et la préparation "
              "d’un renouvellement suit une séquence documentée, disponible aussi sous forme de checklist gratuite."),
             ("COURTIARK fonctionne-t-il pour les cabinets en Suisse ?",
              "Oui, avec une facturation en francs suisses et des repères adaptés au marché suisse (loi sur le contrat "
              "d’assurance, surveillance prudentielle, protection des données). L’interface publique est en français ; "
              "la Suisse alémanique n’est pas encore servie dans sa langue, et nous ne l’annonçons pas comme disponible."),
             ("Que fait l’assistant ARK ?",
              "ARK lit un document déposé (facture, attestation, RIB), propose les informations détectées avec leur "
              "origine, les compare à la fiche client et attend votre validation avant toute écriture. Aucun message "
              "n’est envoyé au client par ARK.")],
        lire=[("Le CRM courtier assurance", "/crm-courtier-assurance"),
              ("Logiciel de courtage : le flux devis, contrat, commission", "/logiciel-courtage-assurance"),
              ("Automatisation : ce qui est possible", "/automatisation-courtier-assurance"),
              ("Tarifs France et Suisse", "/tarifs")],
        cta_final=('/demo', 'Demander une démonstration'),
    )]
