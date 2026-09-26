#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Pages restaurees depuis l'ancien plan de site (decision RESTORE des 21 URL INVESTIGATE).

Regle d'ecriture : aucun chiffre invente et aucune affirmation reglementaire non verifiable.
- La page de densite lit les donnees SIRENE reelles au moment du rendu (aucun comptage en dur).
- Les pages de conformite decrivent uniquement les fonctions presentes dans le code
  (tableau de bord conformite, checklist DDA par client, KYC, mandats, journal d'audit,
  quiz DDA) et renvoient aux sources officielles pour les obligations elles-memes.
- La page comparateur decrit le circuit reel constate dans les routes du produit
  (demande de devis, envoi, saisie des resultats, comparaison) : aucun connecteur automatique
  n'est annonce, car il n'existe pas.
"""
import csv
import io
import os
from contenu_core import section, ul, p, tableau, etapes

CSV_SIRENE = '/root/ark/courtia_prospection/data/FRANCE_MASTER.csv'
SOURCE_SIRENE = ("Données : base SIRENE (annuaire des entreprises, DINUM) filtrée sur le code d'activité "
                 "66.22Z — agents et courtiers d'assurances, extraction du 18/09/2026.")
VILLES = [('Paris', 'PARIS'), ('Lyon', 'LYON'), ('Marseille', 'MARSEILLE'), ('Nice', 'NICE'),
          ('Toulouse', 'TOULOUSE'), ('Bordeaux', 'BORDEAUX'), ('Nantes', 'NANTES'),
          ('Strasbourg', 'STRASBOURG'), ('Montpellier', 'MONTPELLIER'), ('Lille', 'LILLE')]


def compter():
    """Compte reellement les etablissements par commune et par departement dans le fichier source."""
    if not os.path.exists(CSV_SIRENE):
        return None
    communes, departements, total = {}, {}, 0
    with io.open(CSV_SIRENE, encoding='utf-8', errors='replace') as f:
        for ligne in csv.DictReader(f):
            total += 1
            c = (ligne.get('commune') or '').strip().upper()
            d = (ligne.get('departement') or '').strip()
            if c:
                communes[c] = communes.get(c, 0) + 1
            if d:
                departements[d] = departements.get(d, 0) + 1
    return communes, departements, total


def bloc_densite():
    donnees = compter()
    if not donnees:
        return (p("Le fichier source n'est pas disponible sur ce serveur : aucun chiffre n'est publié, "
                  "plutôt qu'un chiffre non recalculé.") + p(SOURCE_SIRENE))
    communes, departements, total = donnees
    lignes = [[nom, '%.0f' % communes.get(cle, 0), '%.1f %%' % (100.0 * communes.get(cle, 0) / total)]
              for nom, cle in VILLES]
    top = sorted(departements.items(), key=lambda x: -x[1])[:8]
    return (p("Sur les 43 240 établissements dont l'activité déclarée est le courtage d'assurance, voici la "
              "répartition dans les dix villes où nous avons publié une page locale.")
            + tableau(["Ville", "Établissements 66.22Z", "Part du total France"], lignes)
            + p("Les huit départements les plus denses concentrent l'essentiel de l'activité :")
            + tableau(["Département", "Établissements"], [[d, '%.0f' % n] for d, n in top])
            + p(SOURCE_SIRENE))


def pages_restaurees():
    return [
        # ------------------------------------------------------------------ densite (donnees reelles)
        dict(
            path='/france/densite-courtage', type='donnees', country='FR', indexable=True,
            title="Où sont les courtiers en assurance en France ? Densité et répartition | COURTIARK",
            description=("Répartition réelle des établissements de courtage d'assurance (NAF 66.22Z) par ville "
                         "et par département, à partir de la base SIRENE. Méthode, chiffres et limites de lecture."),
            h1="Où le courtage en assurance est concentré en France",
            chapeau=("Combien de cabinets et d'agents généraux exercent réellement autour de chez vous ? "
                     "Voici la répartition calculée depuis la base publique SIRENE, sans estimation."),
            fil=[("France", "/france"), ("Densité du courtage", None)],
            corps=''.join([
                section("La répartition réelle, ville par ville", bloc_densite()),
                section("Comment ce relevé est construit",
                        ul(["Source : base SIRENE diffusée par l'annuaire des entreprises (DINUM), interrogation "
                            "sur le code d'activité 66.22Z — agents et courtiers d'assurances.",
                            "Extraction du 18/09/2026 : 43 240 établissements au total en France.",
                            "Les comptages ci-dessus sont recalculés à chaque génération de la page depuis le "
                            "fichier source : aucun nombre n'est écrit à la main dans nos modèles.",
                            "Aucune donnée personnelle n'est publiée : uniquement des comptages agrégés."])
                        + p("Trois limites de lecture, énoncées pour éviter de surinterpréter ces chiffres :")),
                section("Limites de lecture",
                        ul(["Un établissement déclaré n'est pas une entreprise : un cabinet peut avoir plusieurs "
                            "établissements, et un établissement peut être une simple adresse de domiciliation.",
                            "Le code d'activité est déclaratif : il ne prouve pas l'activité réelle du mois.",
                            "Une inscription à l'ORIAS (courtier, agent général, mandataire) n'est pas vérifiée "
                            "dans ce relevé : le comptage porte sur l'activité déclarée, pas sur un statut régulé.",
                            "La date de l'extraction compte : ces chiffres bougent chaque trimestre."])
                        + p("Ces chiffres servent à situer un marché, pas à qualifier une entreprise. Pour un "
                            "usage commercial, la qualification se fait au cas par cas, sur des sources à jour.")),
            ]),
            faq=[("Combien de courtiers en assurance exerce en France ?",
                  "Le relevé SIRENE du 18/09/2026 recense 43 240 établissements dont l'activité déclarée est "
                  "le courtage d'assurance (code 66.22Z). C'est un nombre d'établissements, pas d'entreprises."),
                 ("Où le courtage est-il le plus dense ?",
                  "Paris et les Hauts-de-Seine concentrent la plus forte densité, suivis par le Rhône, les "
                  "Bouches-du-Rhône, la Gironde et les Alpes-Maritimes. Le détail figure dans le tableau ci-dessus."),
                 ("Ces données sont-elles utilisables pour ma prospection ?",
                  "Elles donnent une photographie publique du marché, utilisable pour situer une zone. Elles ne "
                  "remplacent pas une vérification individuelle des cabinets que vous voulez approcher.")],
            lire=[("France", "/france"), ("Logiciel pour courtier en assurance", "/logiciel-courtier-assurance")],
        ),
        # ------------------------------------------------------------------ comparateur (fonction reelle)
        dict(
            path='/fonctionnalites/comparateur-devis-assurance', type='fonctionnalite', country='FR', indexable=True,
            title="Comparateur de devis d'assurance pour courtiers | COURTIARK",
            description=("Demandez, suivez et comparez les propositions d'assurance reçues pour un client, avec la "
                         "trace du choix. Conçu pour les courtiers en assurance."),
            h1="Comparez les propositions d'assurance reçues dans un seul écran",
            chapeau=("Le comparateur de COURTIARK sert à suivre une demande de devis d'un bout à l'autre : ce qui "
                     "a été demandé, à qui, les résultats reçus, la comparaison et la décision conservée."),
            fil=[("Fonctionnalités", "/fonctionnalites"), ("Comparateur de devis", None)],
            alternate='/suisse/crm-courtier-assurance',
            corps=''.join([
                section("Le circuit réel, étape par étape",
                        etapes([("1. Demande", "Le besoin est enregistré pour un client ou un prospect : produit "
                                               "concerné et informations utiles au devis."),
                                ("2. Envoi", "La demande est transmise aux compagnies ou partenaires concernés."),
                                ("3. Résultats reçus", "Chaque proposition reçue est saisie dans la demande : "
                                                       "COURTIARK ne se connecte pas automatiquement aux compagnies."),
                                ("4. Comparaison", "Les propositions sont mises côte à côte pour être comparées "
                                                   "critère par critère."),
                                ("5. Décision conservée", "La proposition retenue reste rattachée au dossier, ce qui "
                                                          "laisse une trace du conseil donné.")])
                        + p("Point important, dit clairement : il n'existe pas de connexion automatique aux "
                            "systèmes des compagnies d'assurance. Les résultats reçus sont enregistrés dans "
                            "l'outil, ce qui évite le tableau de comparaison tenu à part.")),
                section("Ce que la comparaison conserve",
                        tableau(["Élément", "Ce qui en est fait dans COURTIARK"],
                                [["Demande initiale", "Conservée avec son périmètre, sa date et son destinataire."],
                                 ["Propositions reçues", "Rattachées à la demande, comparables entre elles."],
                                 ["Décision", "La proposition retenue reste liée au dossier du client."],
                                 ["Historique", "Un devis non retenu reste consultable, avec son motif."],
                                 ["Devoir de conseil", "La trace de la comparaison alimente le dossier de "
                                                       "conformité du client."]])),
                section("Pour aller plus loin",
                        p("La façon de tracer une comparaison de propositions fait partie du dossier de devoir de "
                          "conseil : voir le guide sur le devoir de conseil et le suivi du dossier, ainsi que la "
                          "page du logiciel pour courtier en assurance pour le périmètre complet du cockpit.")),
            ]),
            faq=[("COURTIARK interroge-t-il les compagnies automatiquement ?",
                  "Non. Les propositions reçues sont saisies dans la demande de devis. Aucune connexion automatique "
                  "aux systèmes des compagnies n'est annoncée, parce qu'elle n'existe pas."),
                 ("Peut-on comparer des propositions de plusieurs compagnies ?",
                  "Oui : les résultats reçus sont rattachés à la même demande et comparés entre eux."),
                 ("La comparaison est-elle conservée après la signature ?",
                  "Oui, elle reste attachée au dossier du client, ce qui permet de retrouver sur quoi le conseil "
                  "a été fondé.")],
            lire=[("Devoir de conseil et suivi du dossier", "/guides/devoir-de-conseil-suivi-dossier"),
                  ("Logiciel pour courtier en assurance", "/logiciel-courtier-assurance")],
        ),
        # ------------------------------------------------------------------ conformite (module reel)
        dict(
            path='/conformite/controle-acpr-courtier', type='conformite', country='FR', indexable=True,
            title="Se préparer à un contrôle : pièces et preuves d'un cabinet de courtage | COURTIARK",
            description=("Les preuves qu'un cabinet de courtage doit pouvoir présenter, et comment COURTIARK les "
                         "conserve et les exporte depuis le dossier client. Sources officielles citées."),
            h1="Les preuves à présenter, et où elles sont conservées",
            chapeau=("Un contrôle se prépare en amont : ce qui compte est de retrouver rapidement la trace du "
                     "conseil, des vérifications et des documents de chaque dossier."),
            fil=[("Conformité", None), ("Contrôle", None)],
            corps=''.join([
                section("Ce qu'un contrôle vient chercher",
                        p("Nous ne reproduisons pas ici le détail des textes : les obligations elles-mêmes se lisent "
                          "aux sources officielles, citées plus bas. Ce que nous documentons, c'est la partie sur "
                          "laquelle un logiciel peut aider : retrouver et présenter les preuves.")
                        + tableau(["Preuve attendue", "Où la chercher dans COURTIARK"],
                                  [["Trace du conseil donné", "Dossier client : propositions comparées, décision "
                                                              "retenue, échanges rattachés."],
                                   ["Vérifications du client", "Fiche KYC du client, avec la date et le résultat "
                                                               "de la vérification."],
                                   ["Checklist réglementaire", "Checklist par client : les points cochés et leur date."],
                                   ["Mandats et documents signés", "Mandats et documents générés, rattachés au dossier."],
                                   ["Journal des actions", "Journal d'audit : qui a fait quoi, et quand."]])),
                section("Comment le module conformité fonctionne",
                        ul(["Tableau de bord de conformité : l'état des dossiers du cabinet, pas une note de "
                            "conformité.",
                            "Checklist par client : les points sont cochés au dossier, avec la date.",
                            "KYC : la vérification du client est enregistrée sur sa fiche, avec son résultat.",
                            "Mandats et documents : consulter les mandats du cabinet et les documents signés.",
                            "Journal d'audit : les actions tracées, consultables pour reconstituer un dossier.",
                            "Quiz DDA : les parcours de formation et leur progression, pour l'obligation de "
                            "compétence."])
                        + p("Ce que COURTIARK n'est pas : un outil de conseil juridique. Il ne certifie rien et "
                            "n'est certifié par aucun régulateur. C'est un outil de gestion qui conserve et "
                            "présente les preuves que le cabinet produit lui-même.")),
                section("Sources officielles",
                        ul(["France — ACPR, autorité de contrôle prudentiel et de résolution : acpr.banque-france.fr",
                            "France — ORIAS, registre unique des intermédiaires en assurance : orias.fr",
                            "Suisse — FINMA, autorité fédérale de surveillance des marchés financiers : finma.ch"])),
            ]),
            faq=[("COURTIARK est-il conforme DDA ou certifié ?",
                  "Non. COURTIARK est un outil de gestion : il conserve et présente les preuves, mais il ne "
                  "fournit pas de conseil juridique et n'est certifié par aucun régulateur."),
                 ("Que retrouve-t-on dans le journal d'audit ?",
                  "Les actions tracées dans l'application, avec leur date, ce qui permet de reconstituer ce qui "
                  "s'est passé sur un dossier."),
                 ("Où lire les obligations qui s'appliquent à mon cabinet ?",
                  "Aux sources officielles : ACPR et ORIAS en France, FINMA en Suisse. Nous ne reformulons pas "
                  "les textes réglementaires.")],
            lire=[("LCB-FT", "/conformite/lcb-ft-courtier"), ("IPID", "/conformite/ipid-document-information"),
                  ("Logiciel pour courtier en assurance", "/logiciel-courtier-assurance")],
        ),
        dict(
            path='/conformite/lcb-ft-courtier', type='conformite', country='FR', indexable=True,
            title="LCB-FT : vérifications client et traçabilité dans un cabinet de courtage | COURTIARK",
            description=("Vérification du client, conservation des pièces et traçabilité des actions : ce que "
                         "COURTIARK tient à jour dans le dossier. Sources officielles citées."),
            h1="LCB-FT : ce qui doit rester traçable dans le dossier client",
            chapeau=("Les obligations de vigilance portent sur la connaissance du client et la conservation des "
                     "éléments : voici la partie que le dossier client d'un logiciel de courtage peut porter."),
            fil=[("Conformité", None), ("LCB-FT", None)],
            corps=''.join([
                section("Ce qui est conservé dans le dossier",
                        tableau(["Élément", "Dans COURTIARK"],
                                [["Identité et vérification", "Fiche KYC du client, avec le résultat de la "
                                                              "vérification enregistré."],
                                 ["Pièces justificatives", "Documents rattachés au client, collectés par lien "
                                                           "sécurisé et classés au dossier."],
                                 ["Historique des actions", "Journal d'audit et activité du dossier."],
                                 ["Documents signés", "Mandats et documents générés, conservés au dossier."],
                                 ["Checklist", "Points de contrôle par client, avec leur date."]])),
                section("Une règle simple pour un cabinet",
                        p("La difficulté opérationnelle n'est presque jamais de connaître la règle : c'est de "
                          "retrouver la pièce trois ans plus tard, quand le dossier a changé de mains. C'est "
                          "exactement ce que règle un dossier client centralisé : une seule fiche, avec ses pièces, "
                          "ses dates et son historique.")),
                section("Sources officielles",
                        ul(["France — ACPR : acpr.banque-france.fr",
                            "France — ORIAS (registre des intermédiaires) : orias.fr",
                            "Suisse — FINMA : finma.ch"])),
            ]),
            faq=[("COURTIARK effectue-t-il la vérification d'identité à ma place ?",
                  "Non. La vérification est enregistrée sur la fiche du client avec son résultat et sa date : "
                  "c'est le cabinet qui l'effectue."),
                 ("Combien de temps les pièces sont-elles conservées ?",
                  "La durée de conservation relève des textes applicables à votre activité ; nous ne la "
                  "reproduisons pas ici et renvoyons aux sources officielles.")],
            lire=[("Contrôle : les preuves à présenter", "/conformite/controle-acpr-courtier"),
                  ("IPID", "/conformite/ipid-document-information"),
                  ("Logiciel pour courtier en assurance", "/logiciel-courtier-assurance")],
        ),
        dict(
            path='/conformite/ipid-document-information', type='conformite', country='CH', indexable=True,
            title="IPID et documents d'information produit : les rattacher au dossier client | COURTIARK",
            description=("Le document d'information produit fait partie du dossier de conseil : comment le "
                         "rattacher au client, le retrouver et le présenter. Sources officielles citées."),
            h1="Rattacher les documents d'information au dossier du client",
            chapeau=("Un document d'information produit n'a de valeur probante que s'il est retrouvable : "
                     "au bon dossier, à la bonne date, rattaché au bon contrat."),
            fil=[("Conformité", None), ("Documents d'information", None)],
            corps=''.join([
                section("Le problème n'est pas le document, c'est de le retrouver",
                        p("Un IPID vient de la compagnie, circule par e-mail et finit dans un dossier partagé, "
                          "souvent sans lien avec le client concerné. Le jour où l'on cherche la version remise "
                          "un jour précis, il faut fouiller les boîtes mail.")),
                section("Ce que COURTIARK permet",
                        tableau(["Besoin", "Fonction"],
                                [["Recevoir les pièces du client", "Collecte par lien sécurisé, sans compte à créer "
                                                                   "pour le client."],
                                 ["Classer", "Documents rattachés au dossier, avec leur type et leur date."],
                                 ["Retrouver", "Recherche dans les documents et l'historique du dossier."],
                                 ["Lire un document", "Lecture assistée : le contenu est proposé, puis validé par "
                                                      "le cabinet avant écriture."],
                                 ["Transmettre", "Documents générés et envoyés depuis le dossier, avec trace."]])),
                section("Sources officielles",
                        ul(["France — ACPR : acpr.banque-france.fr",
                            "Suisse — FINMA : finma.ch",
                            "Suisse — loi sur le contrat d'assurance (LCA) : fedlex.admin.ch"])),
            ]),
            faq=[("COURTIARK lit-il les documents à ma place ?",
                  "La lecture assistée propose une extraction (par exemple les montants ou les dates d'un "
                  "document). Le cabinet valide ou corrige avant que quoi que ce soit soit écrit au dossier."),
                 ("Un client doit-il créer un compte pour envoyer ses pièces ?",
                  "Non : la collecte se fait par un lien sécurisé transmis au client.")],
            lire=[("Gestion des documents", "/fonctionnalites/gestion-documents-assurance"),
                  ("Contrôle : les preuves à présenter", "/conformite/controle-acpr-courtier"),
                  ("Logiciel pour courtier en assurance", "/logiciel-courtier-assurance")],
        ),
    ]
