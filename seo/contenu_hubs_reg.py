#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Hubs reglementaires France et Suisse (exigences §43-44 et §48).

Ces hubs ne reformulent PAS les textes : ils organisent les pages existantes, rappellent les sources
officielles et portent l'avertissement standard (§42). Aucune affirmation reglementaire y est ajoutee.
"""
from contenu_core import section, ul, p, tableau

DISCLAIMER = ("COURTIARK est un logiciel de gestion et ne remplace pas l'analyse juridique ou "
              "réglementaire adaptée à votre cabinet.")


def pages_hubs_reglementaires():
    return [
        dict(
            path='/ressources/reglementation-courtier-assurance-france', type='guide', country='FR', indexable=True,
            title="Réglementation du courtier en assurance en France : les repères | COURTIARK",
            description=("Les sujets réglementaires d'un cabinet de courtage en France — devoir de conseil, "
                         "documents, vérifications client, données personnelles — et où les lire aux sources "
                         "officielles."),
            h1="Réglementation du courtier en assurance en France : par où commencer",
            chapeau=("Un cabinet de courtage en France vit avec plusieurs obligations qui se recoupent : conseil, "
                     "traçabilité, vérification du client, protection des données. Voici la carte des sujets et "
                     "les sources officielles — sans reformuler les textes."),
            fil=[("Ressources", None), ("Réglementation France", None)],
            corps=''.join([
                section("Les quatre sujets qui reviennent le plus souvent",
                        tableau(["Sujet", "Ce que ça implique au quotidien", "Page et source"],
                                [["Devoir de conseil et information du client",
                                  "Conserver la trace du besoin exprimé, des propositions examinées et de la décision.",
                                  '<a href="/guides/devoir-de-conseil-suivi-dossier">Guide devoir de conseil</a> · ACPR'],
                                 ["Contrôle : pièces et preuves",
                                  "Pouvoir présenter rapidement le dossier de conseil d'un client.",
                                  '<a href="/conformite/controle-acpr-courtier">Contrôle et preuves</a> · ACPR'],
                                 ["Vigilance client (LCB-FT)",
                                  "Vérifier l'identité et conserver les éléments de vérification au dossier.",
                                  '<a href="/conformite/lcb-ft-courtier">LCB-FT</a> · ACPR'],
                                 ["Données personnelles",
                                  "Limiter les données collectées, tracer les accès, gérer les droits.",
                                  '<a href="/guides/donnees-clients-assurance-france-suisse">Données clients</a> · CNIL']])),
                section("Inscription et statut",
                        p("L'exercice de l'intermédiation suppose une inscription au registre des intermédiaires. "
                          "Nous ne reproduisons pas les conditions d'inscription : elles se lisent chez l'autorité.")
                        + p('<a href="https://www.orias.fr/" rel="noopener">ORIAS — registre unique des '
                            'intermédiaires en assurance</a>')),
                section("Ce que COURTIARK fait (et ne fait pas)",
                        ul(["Il conserve au dossier les éléments que le cabinet produit : pièces, vérifications, "
                            "trace du conseil, journal des actions.",
                            "Il ne dit pas ce que votre cabinet doit faire : cette lecture relève de votre "
                            "analyse, avec votre conseil habituel.",
                            "Il n'est certifié par aucun régulateur et ne porte aucun label de conformité."])
                        + p(DISCLAIMER)),
                section("Sources officielles France",
                        ul(["<a href=\"https://acpr.banque-france.fr/\" rel=\"noopener\">ACPR</a> — contrôle et "
                            "supervision des intermédiaires.",
                            "<a href=\"https://www.orias.fr/\" rel=\"noopener\">ORIAS</a> — registre des "
                            "intermédiaires.",
                            "<a href=\"https://www.legifrance.gouv.fr/\" rel=\"noopener\">Légifrance</a> — textes "
                            "consolidés.",
                            "<a href=\"https://www.cnil.fr/\" rel=\"noopener\">CNIL</a> — données personnelles.",
                            "<a href=\"https://eur-lex.europa.eu/\" rel=\"noopener\">EUR-Lex</a> — textes "
                            "européens (DDA)."])
                        + p("État de nos vérifications de liens : <a href=\"/sources\">page Sources</a>. "
                            "Légifrance et EUR-Lex refusent nos requêtes automatisées ; nous l'écrivons au lieu "
                            "d'afficher une vérification que nous n'avons pas faite.")),
                section("Aller plus loin",
                        p('<a href="/conformite/controle-acpr-courtier">Contrôle : les preuves à présenter</a> · '
                          '<a href="/conformite/lcb-ft-courtier">LCB-FT</a> · '
                          '<a href="/guides/devoir-de-conseil-suivi-dossier">Devoir de conseil</a> · '
                          '<a href="/ressources/reglementation-intermediaire-assurance-suisse">Réglementation '
                          'suisse</a>')),
            ]),
            faq=[("Ces pages remplacent-elles un conseil juridique ?",
                  "Non. Nous cartographions les sujets et renvoyons aux textes officiels ; l'analyse applicable à "
                  "votre cabinet demande un professionnel."),
                 ("Pourquoi ne pas recopier les obligations ?",
                  "Parce qu'un texte se lit dans sa version en vigueur. Une reformulation figée devient fausse.")],
            lire=[("Sources", "/sources"), ("Contrôle et preuves", "/conformite/controle-acpr-courtier"),
                  ("Politique éditoriale", "/politique-editoriale")],
        ),
        dict(
            path='/ressources/reglementation-intermediaire-assurance-suisse', type='guide', country='CH', indexable=True,
            title="Intermédiaire d'assurance en Suisse : repères et sources | COURTIARK",
            description=("Les sujets qui structurent l'activité d'un intermédiaire d'assurance en Suisse — "
                         "surveillance, information du client, documents, protection des données — et les sources "
                         "officielles."),
            h1="Intermédiaire d'assurance en Suisse : par où commencer",
            chapeau=("Côté suisse, le cadre repose sur la loi sur le contrat d'assurance, la surveillance des "
                     "intermédiaires et la protection des données. Voici la carte des sujets et les sources "
                     "officielles."),
            fil=[("Ressources", None), ("Réglementation Suisse", None)],
            corps=''.join([
                section("Les sujets qui structurent l'activité",
                        tableau(["Sujet", "Ce que ça implique au quotidien", "Source et page"],
                                [["Surveillance des intermédiaires",
                                  "Exercer sous surveillance et, selon les cas, s'enregistrer.",
                                  'FINMA · <a href="/suisse">App Suisse</a>'],
                                 ["Information du client et documents",
                                  "Remettre les documents d'information produit et conserver la trace de la remise.",
                                  '<a href="/conformite/ipid-document-information">Documents d\'information</a> · Fedlex'],
                                 ["Dossier client et traçabilité",
                                  "Retrouver ce qui a été remis, expliqué et validé.",
                                  '<a href="/fonctionnalites/gestion-documents-assurance">Documents au dossier</a>'],
                                 ["Protection des données",
                                  "Limiter les données, tracer les accès, respecter les droits des personnes.",
                                  'PFPDT · <a href="/guides/donnees-clients-assurance-france-suisse">Données clients</a>']])),
                section("France ou Suisse : ce qui change",
                        ul(["Le principe de fond ne change pas : un cabinet doit pouvoir démontrer ce qu'il a "
                            "conseillé et remis.",
                            "Ce qui change, c'est l'autorité, le vocabulaire et parfois le formalisme.",
                            "<a href=\"/ressources/reglementation-courtier-assurance-france\">Voir la page France</a> "
                            "pour la comparaison."])),
                section("Ce que COURTIARK fait (et ne fait pas)",
                        ul(["Le produit est conçu pour les usages suisses : grille en francs suisses, documents et "
                            "informations conformes aux usages locaux, cloisonnement des données par cabinet.",
                            "Il ne fournit aucune analyse réglementaire et n'est certifié par aucun régulateur."])
                        + p(DISCLAIMER)),
                section("Sources officielles Suisse",
                        ul(["<a href=\"https://www.finma.ch/\" rel=\"noopener\">FINMA</a> — surveillance des "
                            "marchés financiers (site accessible en navigateur ; nos requêtes automatisées y sont "
                            "refusées).",
                            "<a href=\"https://www.fedlex.admin.ch/\" rel=\"noopener\">Fedlex</a> — recueil "
                            "systématique du droit fédéral (LSA).",
                            "<a href=\"https://www.edoeb.admin.ch/\" rel=\"noopener\">PFPDT</a> — protection des "
                            "données."])
                        + p("État de nos vérifications : <a href=\"/sources\">page Sources</a>.")),
            ]),
            faq=[("Les règles suisses sont-elles couvertes par votre logiciel ?",
                  "Le produit porte les usages suisses (devise, marchés, documents). Nos pages décrivent ce que "
                  "l'outil fait ; elles ne tranchent pas les obligations, qui se lisent chez l'autorité."),
                 ("Où lire la loi sur le contrat d'assurance ?",
                  "Sur Fedlex, le recueil officiel du droit fédéral. Le lien figure ci-dessus.")],
            lire=[("Sources", "/sources"), ("Suisse", "/suisse"), ("Documents d'information", "/conformite/ipid-document-information")],
        ),
    ]
