#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contenu : guides, comparatifs, outils, pages de confiance, conversion (démo, contact)."""
import os
import subprocess

from contenu_core import section, ul, p, tableau, etapes, bascule, cta_direct

SRC_FR = ('<p class="note">Sources : <a href="https://www.orias.fr/" rel="nofollow noopener" target="_blank">orias.fr</a> · '
          '<a href="https://www.legifrance.gouv.fr/" rel="nofollow noopener" target="_blank">legifrance.gouv.fr</a> · '
          '<a href="https://www.cnil.fr/" rel="nofollow noopener" target="_blank">cnil.fr</a>. '
          'Contenu documentaire, sans valeur de conseil juridique.</p>')
SRC_CH = ('<p class="note">Sources : <a href="https://www.finma.ch/fr/" rel="nofollow noopener" target="_blank">finma.ch</a> · '
          '<a href="https://www.fedlex.admin.ch/fr/cc/internal-law" rel="nofollow noopener" target="_blank">fedlex.admin.ch</a>. '
          'Contenu documentaire, sans valeur de conseil juridique.</p>')

FORM_DEMO = r"""
<form id="form-demo" novalidate>
  <div class="champ"><label for="f-prenom">Prénom *</label><input id="f-prenom" name="first_name" autocomplete="given-name" required></div>
  <div class="champ"><label for="f-nom">Nom *</label><input id="f-nom" name="last_name" autocomplete="family-name" required></div>
  <div class="champ"><label for="f-cabinet">Cabinet *</label><input id="f-cabinet" name="company_name" autocomplete="organization" required></div>
  <div class="champ"><label for="f-email">E-mail professionnel *</label><input id="f-email" name="email" type="email" autocomplete="email" required></div>
  <div class="champ"><label for="f-tel">Téléphone</label><input id="f-tel" name="phone" inputmode="tel" autocomplete="tel"></div>
  <div class="champ"><label for="f-ville">Ville</label><input id="f-ville" name="city" autocomplete="address-level2"></div>
  <div class="champ"><label for="f-collab">Nombre de collaborateurs</label>
    <select id="f-collab" name="team_size"><option>1</option><option>2-5</option><option>6-10</option><option>11+</option></select></div>
  <div class="champ"><label for="f-message">Ce que vous cherchez à organiser</label><textarea id="f-message" name="message" rows="4"></textarea></div>
  <div class="champ"><label><input type="checkbox" id="f-consent" name="consent" required> J'accepte d'être recontacté au sujet de ma demande. *</label></div>
  <button class="principal" type="submit" id="btn-demo">Demander une démonstration</button>
  <p id="msg-demo" role="status" aria-live="polite" class="note"></p>
</form>
<script src="/js/formulaire-demo.js" defer></script>

"""

OUTIL_JS = r"""
<div class="section">
  <div class="champ"><label for="o-collab">Nombre de collaborateurs qui saisissent</label><input id="o-collab" type="number" min="1" max="50" value="3"></div>
  <div class="champ"><label for="o-dossiers">Nouveaux dossiers par mois</label><input id="o-dossiers" type="number" min="1" max="500" value="40"></div>
  <div class="champ"><label for="o-saisie">Minutes de saisie par dossier (création + mise à jour)</label><input id="o-saisie" type="number" min="1" max="120" value="18"></div>
  <div class="champ"><label for="o-relance">Minutes par relance (rédaction + suivi)</label><input id="o-relance" type="number" min="1" max="60" value="7"></div>
  <div class="champ"><label for="o-nbrel">Relances par mois</label><input id="o-nbrel" type="number" min="0" max="2000" value="90"></div>
  <div class="champ"><label for="o-docs">Minutes de recherche de documents par dossier</label><input id="o-docs" type="number" min="0" max="120" value="12"></div>
  <div class="champ"><label for="o-cout">Coût horaire chargé estimé (devise de votre marché)</label><input id="o-cout" type="number" min="0" max="500" value="45"></div>
  <button class="principal" type="button" id="o-calc">Calculer</button>
  <div class="resultat" id="o-resultat" aria-live="polite"><p class="note">Renseignez vos valeurs puis lancez le calcul.</p></div>
</div>
<script src="/js/outil-calculateur.js" defer></script>

"""

TRACK_JS = '<script src="/js/mesure.js" defer></script>'


def pages_ressources():
    P = []

    # ---------------------------------------------------------------- GUIDES
    P.append(dict(
        path='/guides/', type='hub', country='FR', indexable=True,
        title="Guides pratiques pour courtiers en assurance | COURTIARK",
        description="Des guides concrets pour organiser un cabinet de courtage : relances, renouvellements, documents clients, portefeuille, saisie manuelle.",
        h1="Guides pratiques pour cabinets de courtage",
        chapeau="Chaque guide part d'un problème de cabinet, décrit ce qui se passe quand rien n'est organisé, puis "
                "renvoie à la fonctionnalité de COURTIARK qui traite ce point.",
        fil=[("Guides", None)],
        corps=''.join([
            section("Les guides disponibles",
                    ul(['<a href="/guides/comment-ne-plus-oublier-relances-courtier">Ne plus oublier les relances</a>',
                        '<a href="/guides/automatiser-renouvellements-assurance">Automatiser les renouvellements</a>',
                        '<a href="/guides/centraliser-documents-clients-assurance">Centraliser les documents clients</a>',
                        '<a href="/guides/organiser-portefeuille-assurance">Organiser un portefeuille</a>',
                        '<a href="/guides/reduire-saisie-manuelle-courtier">Réduire la saisie manuelle</a>',
                        '<a href="/guides/automatiser-suivi-prospects-assurance">Automatiser le suivi des prospects</a>',
                        '<a href="/guides/devoir-de-conseil-suivi-dossier">Devoir de conseil : ce qu\'il faut pouvoir montrer</a>',
                        '<a href="/guides/donnees-clients-assurance-france-suisse">Données clients : France et Suisse</a>'])),
        ]),
        faq=[],
        lire=[("Fonctionnalités", "/fonctionnalites/"), ("Outils gratuits", "/outils/"), ("Comparatifs", "/comparatifs/")]))

    def guide(chemin, titre, description, h1, chapeau, sections, faq, lire):
        return dict(path=chemin, type='guide', country='FR', title=titre, description=description, h1=h1,
                    chapeau=chapeau, fil=[("Guides", "/guides/"), (h1[:44].rstrip(' :'), None)],
                    corps=''.join(sections), faq=faq, lire=lire)

    P.append(guide(
        '/guides/comment-ne-plus-oublier-relances-courtier',
        "Comment ne plus oublier une relance dans un cabinet de courtage | COURTIARK",
        "Méthode pratique pour qu'aucune relance ne dépende de la mémoire : où placer l'information, qui agit, à quelle fréquence, et comment le vérifier.",
        "Comment ne plus oublier une relance",
        p("Réponse courte : une relance ne s'oublie plus quand elle est rattachée à un dossier et qu'elle apparaît "
          "dans une liste de travail. Le problème n'est pas la mémoire des équipes, c'est l'absence de liste."),
        [section("Pourquoi les relances sont oubliées",
                 ul(["La demande n'est écrite nulle part : elle a été dite au téléphone.",
                     "Elle est écrite dans un fil d'e-mails, pas dans le dossier.",
                     "Elle est notée par une personne, pas par le cabinet.",
                     "Aucune revue régulière ne la fait remonter."])),
         section("La méthode en quatre points",
                 etapes([("1. Un endroit", "Toute demande au client vit dans le dossier, pas dans une boîte e-mail."),
                         ("2. Un responsable", "Chaque type de relance a une personne identifiée."),
                         ("3. Un délai", "Un délai de première relance est fixé et connu de tous."),
                         ("4. Une revue", "Une fois par semaine, la liste des dossiers sans action est relue.")]),
                 ),
         section("Ce que COURTIARK apporte",
                 ul(["Les relances sont rattachées au dossier concerné.",
                     "Les dossiers bloqués remontent dans les listes de travail (relances, tâches).",
                     "Le brief du matin met devant vous ce qui demande une action aujourd'hui.",
                     "La trace de la demande et de la réponse reste attachée au dossier."]))
         + section("Ce qui reste humain",
                   p("L'outil ne décide pas d'envoyer un message et ne contacte personne. Il rend visible ; c'est le "
                     "cabinet qui agit.")),
         ],
        [("Y a-t-il un nombre de relances à faire ?", "Non : c'est votre organisation qui fixe le délai et le nombre, l'outil les rend applicables et visibles."),
         ("Les relances sont-elles automatiques dans COURTIARK ?", "Non. Elles sont organisées et tracées ; l'envoi reste une action du cabinet."),
         ("Faut-il un outil pour ça ?", "Un tableur peut suffire si une seule personne relance. Au-delà, la liste doit être partagée et datée, ce qu'un fichier supporte mal.")],
        [("Relance de devis assurance", "/fonctionnalites/relance-devis-assurance"), ("Automatisation des relances", "/fonctionnalites/automatisation-relances")]))

    P.append(guide(
        '/guides/automatiser-renouvellements-assurance',
        "Automatiser les renouvellements d'assurance : méthode | COURTIARK",
        "Comment anticiper les échéances de contrats : repérer à l'avance, préparer le dossier, décider avec le client, consigner la décision.",
        "Automatiser les renouvellements d'assurance",
        p("Réponse courte : un renouvellement se gagne avant la date d'échéance. Cela suppose de voir les échéances "
          "à l'avance et de savoir, pour chaque dossier, s'il est complet et actif."),
        [section("Le cycle d'un renouvellement",
                 etapes([("J-90", "Le contrat apparaît dans la vue portefeuille comme échéance proche."),
                         ("J-60", "Le dossier est vérifié : pièces, informations, historique."),
                         ("J-30", "Le point avec le client est préparé et réalisé."),
                         ("J-0", "La décision est consignée : reconduction, modification, résiliation demandée par le client.")]),
                 ),
         section("Les pièges",
                 ul(["Le dossier incomplet qu'on découvre au moment du renouvellement.",
                     "Le contrat dont l'activité décroche : le client est plus exposé au départ.",
                     "L'échéance portée par un seul collaborateur qui part en vacances."])),
         section("Ce que COURTIARK fait et ne fait pas",
                 tableau(["Fait", "Ne fait pas"],
                         [["Affiche les échéances proches et les dossiers incomplets", "Négocier avec l'assureur"],
                          ["Conserve l'historique et les documents du dossier", "Produire un tarif d'assureur"],
                          ["Consigne la décision et la trace des échanges", "Se substituer au devoir de conseil"]])),
         section("Repères réglementaires",
                 p("En France, la résiliation obéit aux règles du contrat et au droit de la consommation ; en Suisse, "
                   "au régime de la LSA et aux conditions du contrat. Le cabinet doit pouvoir expliquer ce qu'il a "
                   "conseillé et quand. Ces repères sont documentaires.")
                 + SRC_FR),
         ],
        [("Puis-je voir les échéances à 90 jours ?", "Les échéances sont portées par les contrats et remontées dans la vue portefeuille et le brief du matin."),
         ("COURTIARK renégocie-t-il les contrats ?", "Non : il organise la préparation et la traçabilité."),
         ("Comment consigner la décision du client ?", "La décision et les échanges se consignent dans le dossier, qui garde l'historique.")],
        [("Renouvellements", "/fonctionnalites/renouvellements-assurance"), ("Guide : organiser un portefeuille", "/guides/organiser-portefeuille-assurance")]))

    P.append(guide(
        '/guides/centraliser-documents-clients-assurance',
        "Centraliser les documents clients en assurance | COURTIARK",
        "Comment arrêter de redemander trois fois la même pièce : liste des documents attendus, lien de dépôt, classement dans le dossier.",
        "Centraliser les documents clients",
        p("Réponse courte : un document se retrouve quand il est rattaché au dossier au moment où il arrive. Tout ce "
          "qui arrive par e-mail et finit dans un dossier local est un document perdu en puissance."),
        [section("Le coût invisible",
                 ul(["Relire des fils d'e-mails pour retrouver une pièce.",
                     "Redemander au client ce qu'il a déjà envoyé.",
                     "Découvrir une pièce manquante au moment d'un sinistre."])),
         section("La méthode",
                 etapes([("Une liste par dossier", "Les pièces attendues sont définies une fois pour toutes par type de dossier."),
                         ("Un lien de dépôt", "Le client dépose lui-même, sans compte à créer."),
                         ("Un classement automatique", "Le document arrive dans le bon dossier, à la bonne place."),
                         ("Une vérification", "Les documents illisibles ou incomplets sont signalés, pas devinés.")]),
                 ),
         section("Ce que COURTIARK fait",
                 ul(["Génère un lien de dépôt par demande.",
                     "Rattache le document au dossier concerné.",
                     "Permet à ARK de lire un document et d'en proposer les informations, après validation humaine.",
                     "Signale les pièces manquantes dans la liste des dossiers incomplets."]))
         + section("Données sensibles",
                   p("Les données de santé relèvent de catégories particulières. Elles ne servent jamais à de la "
                     "prospection dans COURTIARK, et l'accès reste limité aux utilisateurs du cabinet.")),
         ],
        [("Le client doit-il créer un compte ?", "Non : il dépose via un lien, sans compte ni installation."),
         ("Où sont stockés les documents ?", "Dans l'espace du cabinet, accessible aux seuls utilisateurs de ce cabinet."),
         ("ARK lit-il les documents automatiquement ?", "ARK peut les lire et proposer des informations ; rien n'est enregistré sans validation.")],
        [("Gestion des documents", "/fonctionnalites/gestion-documents-assurance"), ("Assistant ARK", "/fonctionnalites/assistant-ark")]))

    P.append(guide(
        '/guides/organiser-portefeuille-assurance',
        "Organiser un portefeuille d'assurance : la méthode | COURTIARK",
        "Comment structurer un portefeuille : inventaire, segmentation, échéances, dossiers incomplets, rythme de revue.",
        "Organiser un portefeuille d'assurance",
        p("Réponse courte : on ne pilote pas un portefeuille en le regardant. On le pilote en sachant combien de "
          "dossiers sont incomplets, combien d'échéances arrivent et combien de contrats décrochent."),
        [section("Les quatre questions à pouvoir poser",
                 ul(["Combien de dossiers sont incomplets, et de quoi manquent-ils ?",
                     "Quelles échéances arrivent dans les 90 jours ?",
                     "Quels contrats n'ont plus d'activité ?",
                     "Combien de devis sont en attente depuis plus de deux semaines ?"])),
         section("Structurer avant d'outiller",
                 p("Un inventaire (clients, contrats, échéances) précède toute segmentation. Segmenter un portefeuille "
                   "dont on ne connaît pas l'état revient à ranger un désordre.")),
         section("Ce que COURTIARK affiche",
                 tableau(["Indicateur", "Ce qu'il permet de décider"],
                         [["Dossiers incomplets", "Quelles pièces demander, à qui, cette semaine."],
                          ["Échéances proches", "Quels renouvellements préparer."],
                          ["Santé du portefeuille", "Quels contrats sont à risque de départ."],
                          ["Devis en attente", "Ce qu'il faut relancer immédiatement."]])),
         section("Le rythme",
                 etapes([("Quotidien", "Le brief du matin."),
                         ("Hebdomadaire", "Revue des dossiers bloqués."),
                         ("Mensuel", "Lecture du reporting d'activité.")])),
         ],
        [("Par où commencer ?", "Par l'inventaire : un import permet de partir d'un fichier existant plutôt que de tout ressaisir."),
         ("Faut-il tout nettoyer avant de démarrer ?", "Non. Le nettoyage se fait au fil de l'eau, en traitant les dossiers que l'outil fait remonter."),
         ("Combien de temps cela prend-il ?", "Cela dépend de la taille et de la qualité du fichier de départ ; nous ne donnons pas de chiffre non mesuré.")],
        [("Gestion de portefeuille", "/fonctionnalites/gestion-portefeuille-assurance"), ("Outils gratuits", "/outils/")]))

    P.append(guide(
        '/guides/reduire-saisie-manuelle-courtier',
        "Réduire la saisie manuelle dans un cabinet de courtage | COURTIARK",
        "Où part le temps de saisie, ce qu'on peut éviter sans risque, et ce qu'il ne faut surtout pas automatiser.",
        "Réduire la saisie manuelle",
        p("Réponse courte : la saisie diminue quand une information n'est demandée qu'une fois et qu'elle est lue "
          "depuis les documents existants. Automatiser sans contrôle, en revanche, crée des erreurs coûteuses."),
        [section("Ce qui se ressaisit tous les jours",
                 ul(["Les coordonnées du client, déjà présentes sur un devis ou une attestation.",
                     "Les références de contrat, déjà sur le document de l'assureur.",
                     "Les échéances, recopiées depuis un avis reçu.",
                     "Les informations véhicule, déjà sur la carte verte."])),
         section("Ce qu'on peut éviter sans risque",
                 ul(["La double saisie entre un fichier et le CRM (import).",
                     "La recopie d'un document lisible (lecture assistée puis validation).",
                     "La rédaction de messages répétitifs (modèles de messages)."])),
         section("Ce qu'il ne faut pas automatiser",
                 p("Écrire dans un dossier sans relecture, envoyer un message au client sans validation, ou décider "
                   "d'un conseil : ces trois-là doivent rester humains. COURTIARK impose la validation avant écriture.")),
         section("Mesurer avant d'affirmer",
                 p("Nous n'annonçons pas de pourcentage de temps gagné : cela dépend de votre organisation et nous "
                   "n'avons pas de mesure représentative.")
                 + '<p><a href="/outils/calculateur-productivite-courtier">Estimer la charge de votre cabinet</a></p>'),
         ],
        [("ARK saisit-il les informations à ma place ?", "ARK propose les informations lues dans un document ; vous validez ou corrigez avant écriture."),
         ("Puis-je importer mes données ?", "Oui, un import permet de démarrer depuis un fichier existant."),
         ("Combien de temps vais-je gagner ?", "Nous ne le chiffrons pas : cela dépend de votre organisation. L'outil rend la charge observable.")],
        [("Assistant ARK", "/fonctionnalites/assistant-ark"), ("Guide : centraliser les documents", "/guides/centraliser-documents-clients-assurance")]))

    P.append(guide(
        '/guides/automatiser-suivi-prospects-assurance',
        "Automatiser le suivi des prospects en assurance | COURTIARK",
        "Suivre les prospects sans harceler : séquences d'étapes, traçabilité des contacts, gestion des oppositions, passage au CRM.",
        "Automatiser le suivi des prospects",
        p("Réponse courte : ce qui se suit, c'est l'étape — pas l'envoi. Une séquence de contact organisée évite les "
          "oublis et les doublons, à condition de tracer les oppositions."),
        [section("Les erreurs classiques",
                 ul(["Deux collaborateurs contactent le même prospect.",
                     "Un prospect contacté trois fois la même semaine, puis jamais.",
                     "Aucune trace de l'opposition d'une personne à être recontactée."])),
         section("La méthode",
                 etapes([("Ciblage", "Définir la zone et la cible avant de constituer une liste."),
                         ("Séquence", "Fixer les étapes et les délais entre elles."),
                         ("Trace", "Enregistrer chaque contact et chaque réponse."),
                         ("Sortie", "Retirer de la séquence toute personne qui s'y oppose, et convertir un prospect intéressé en dossier client.")]),
                 ),
         section("Ce que COURTIARK permet",
                 ul(["Constituer des listes et des campagnes, avec une carte pour le repérage.",
                     "Suivre des séquences à étapes et une boîte de réception des réponses.",
                     "Rattacher le prospect devenu client au portefeuille, dans le même outil."])),
         section("Cadre des données de prospection",
                 p("Le respect des obligations de prospection (RGPD en France, LPD en Suisse) incombe au cabinet : "
                   "origine des données, information des personnes, droit d'opposition. L'outil fournit la trace, pas "
                   "la conformité.")
                 + SRC_CH),
         ],
        [("Les messages sont-ils envoyés automatiquement ?", "Non : les séquences organisent les étapes, l'envoi reste une action de l'équipe."),
         ("Puis-je retirer quelqu'un d'une séquence ?", "Oui, les oppositions se gèrent dans le module de prospection."),
         ("Un prospect qui signe entre-t-il dans le portefeuille ?", "Oui, le suivi reste dans le même outil.")],
        [("Prospection assurance", "/fonctionnalites/prospection-assurance"), ("Guide : réduire la saisie", "/guides/reduire-saisie-manuelle-courtier")]))

    P.append(guide(
        '/guides/devoir-de-conseil-suivi-dossier',
        "Devoir de conseil en assurance : ce qu'il faut pouvoir montrer | COURTIARK",
        "Comment documenter le suivi d'un dossier pour pouvoir expliquer, plus tard, ce qui a été conseillé et quand. Repères France (DDA) et Suisse (LSA).",
        "Devoir de conseil : ce qu'il faut pouvoir montrer",
        p("Réponse courte : un cabinet doit pouvoir reconstituer, pour un dossier donné, ce qui a été demandé, ce qui "
          "a été conseillé, quand, et sur quelles informations. Cela suppose un historique, pas une mémoire."),
        [section("Ce qu'un dossier défendable contient",
                 ul(["Les besoins exprimés par le client, consignés.",
                     "Les informations transmises et les documents reçus, datés.",
                     "Le conseil donné et sa justification.",
                     "Les échanges ultérieurs et les décisions prises.",
                     "Les pièces conservées et accessibles."])),
         section("Repères par marché",
                 tableau(["Marché", "Repères (documentaires)"],
                         [["France", "Le distributeur d'assurance doit recueillir les besoins et exigences, fournir une information précontractuelle et motiver son conseil (DDA). L'activité d'intermédiaire est immatriculée au registre unique (ORIAS)."],
                          ["Suisse", "L'intermédiaire d'assurance agit dans le cadre de la LSA ; selon son statut, des exigences d'inscription et d'information s'appliquent, sous surveillance prudentielle de la FINMA."]])
                 + SRC_FR + SRC_CH),
         section("Ce que COURTIARK met à disposition",
                 ul(["Un historique par dossier : devis, relances, échanges, documents.",
                     "Des documents rattachés à leur dossier et datés.",
                     "Une trace des écritures effectuées sur la fiche."])),
         section("Ce que COURTIARK ne fait pas",
                 p("Il ne délivre pas de conseil, ne vérifie pas votre conformité et ne remplace pas un audit. "
                   "Il organise le dossier — la responsabilité reste celle du cabinet.")),
         ],
        [("COURTIARK est-il un outil de conformité ?", "Non. Il organise le suivi et l'historique du dossier ; la conformité relève du cabinet."),
         ("Les échanges sont-ils horodatés ?", "Les actions enregistrées dans l'outil portent une date ; les documents déposés sont rattachés au dossier."),
         ("Faut-il tout conserver ?", "Les durées de conservation relèvent de votre analyse : l'outil conserve ce que vous y mettez.")],
        [("Guide : données clients France et Suisse", "/guides/donnees-clients-assurance-france-suisse"), ("Sécurité", "/securite")]))

    P.append(guide(
        '/guides/donnees-clients-assurance-france-suisse',
        "Données clients en assurance : France et Suisse | COURTIARK",
        "Ce qu'un cabinet doit garder en tête sur les données clients selon le marché : principes, données sensibles, hébergement, sous-traitants.",
        "Données clients : repères France et Suisse",
        p("Réponse courte : dans les deux pays, la donnée client doit servir au dossier et rien d'autre. Les données "
          "de santé, en particulier, ne doivent jamais alimenter de la prospection."),
        [section("Les principes communs",
                 ul(["Finalité : chaque donnée doit avoir une raison d'être dans le dossier.",
                     "Minimisation : ne conserver que ce qui est nécessaire.",
                     "Sécurité : accès limité à ceux qui en ont besoin.",
                     "Transparence : la personne doit savoir ce qui est traité et pourquoi."])),
         section("Différences de cadre",
                 tableau(["Marché", "Ce qui change"],
                         [["France", "RGPD appliqué sous le contrôle de la CNIL ; l'activité d'intermédiaire relève d'ORIAS."],
                          ["Suisse", "Cadre fédéral de protection des données ; l'activité d'intermédiaire relève de la LSA et de la surveillance prudentielle de la FINMA."]])
                 + SRC_FR + SRC_CH),
         section("Ce que COURTIARK fait de vos données",
                 ul(["Les données d'un cabinet ne sont pas revendues.",
                     "Un cabinet ne voit jamais les dossiers d'un autre (cloisonnement vérifié par tests d'isolation en production).",
                     "Les documents sont accessibles aux seuls utilisateurs du cabinet.",
                     "Les données de santé ne sont jamais utilisées pour de la prospection."])),
         section("Questions à poser à tout éditeur",
                 ul(["Où sont hébergées les données et qui y accède ?",
                     "Quels sous-traitants interviennent ?",
                     "Que se passe-t-il à la fin du contrat (export, suppression) ?",
                     "Comment les accès sont-ils tracés ?",
                     "Les réponses de COURTIARK à ces questions figurent sur la page Sécurité et la liste des sous-traitants."])),
         ],
        [("COURTIARK est-il certifié RGPD ?", "Il n'existe pas de certification « RGPD » délivrée à un logiciel. Nous documentons nos mesures sur la page Sécurité ; la responsabilité du traitement reste celle du cabinet."),
         ("Mes données sont-elles utilisées pour entraîner une IA ?", "Non : les informations restent dans l'espace du cabinet et servent le dossier ; aucune donnée client n'est utilisée pour alimenter un autre client."),
         ("Puis-je exporter mes données ?", "L'espace de travail permet d'exporter vos données ; le cadre exact est décrit dans les conditions et sur la page Sécurité.")],
        [("Sécurité", "/securite"), ("Confidentialité", "/confidentialite"), ("Sous-traitants", "/mentions-legales")]))

    # ---------------------------------------------------------------- COMPARATIFS
    P.append(dict(
        path='/comparatifs/', type='hub', country='FR', indexable=True,
        title="Comparatifs : choisir un outil pour un cabinet de courtage | COURTIARK",
        description="Comparatifs honnêtes : CRM assurance face à un CRM généraliste, tableur face à un outil dédié, logiciel métier face à un CRM générique.",
        h1="Comparatifs",
        chapeau="Ces comparatifs portent sur des usages, pas sur des marques : ce qui change quand on passe d'un "
                "tableur ou d'un CRM généraliste à un outil conçu pour le courtage d'assurance.",
        fil=[("Comparatifs", None)],
        corps=section("Les comparaisons disponibles",
                     ul(['<a href="/comparatifs/crm-assurance-vs-crm-generaliste">CRM assurance ou CRM généraliste</a>',
                         '<a href="/comparatifs/excel-vs-crm-courtier-assurance">Tableur ou CRM courtier</a>',
                         '<a href="/comparatifs/logiciel-metier-vs-crm-generaliste">Logiciel métier ou CRM générique</a>']))
        + section("Notre règle",
                  p("Nous ne publions aucune comparaison nominative sur un concurrent sans en avoir vérifié les faits "
                    "à la source. Les tableaux ci-dessous comparent des capacités génériques, pas des produits.")),
        faq=[],
        lire=[("Le CRM courtier assurance", "/crm-courtier-assurance"), ("Fonctionnalités", "/fonctionnalites/")]))

    def comparatif(chemin, titre, description, h1, chapeau, sections, faq, lire):
        return dict(path=chemin, type='comparatif', country='FR', title=titre, description=description, h1=h1,
                    chapeau=chapeau, fil=[("Comparatifs", "/comparatifs/"), (h1[:44].rstrip(' :'), None)],
                    corps=''.join(sections), faq=faq, lire=lire)

    P.append(comparatif(
        '/comparatifs/crm-assurance-vs-crm-generaliste',
        "CRM assurance ou CRM généraliste : ce qui change | COURTIARK",
        "Un CRM généraliste gère des contacts. Un CRM d'assurance gère des contrats, des échéances et des commissions. Comparaison par objet métier.",
        "CRM assurance ou CRM généraliste",
        "Réponse courte : un CRM généraliste sait suivre une relation. Un cabinet de courtage doit suivre des "
        "contrats, des échéances, des pièces et des commissions — autant d'objets qu'un CRM générique ne connaît pas.",
        [section("Comparaison par objet",
                 tableau(["Objet", "CRM généraliste", "COURTIARK (CRM courtage)"],
                         [["Contact / client", "Oui", "Oui, avec fiche client et historique"],
                          ["Contrat d'assurance", "Non (champ libre au mieux)", "Contrat rattaché au client, avec échéance"],
                          ["Échéance de renouvellement", "Non", "Vue portefeuille et brief du matin"],
                          ["Devis", "Au mieux une opportunité", "Registre des devis et suivi d'étape"],
                          ["Documents clients", "Pièces jointes génériques", "Collecte par lien, rangée dans le dossier"],
                          ["Commissions", "Non", "Suivi par dossier et calculateur"],
                          ["Repères de conformité", "Non", "Repères France et Suisse dans le suivi"]])),
         section("Quand un CRM généraliste suffit",
                 ul(["Si vous ne suivez qu'une relation commerciale sans objet contractuel.",
                     "Si votre portefeuille tient dans un carnet et que personne d'autre n'y touche.",
                     "Si vous n'avez aucune échéance à surveiller — ce qui est rare dans le courtage."])),
         section("Le coût réel d'un outil inadapté",
                 p("Ce n'est pas l'abonnement : c'est le temps passé à contourner les manques (tableurs parallèles, "
                   "rappels manuels, commissions reconstituées). C'est ce contournement que COURTIARK supprime."))],
        [("Puis-je garder mon CRM actuel et ajouter COURTIARK ?", "Techniquement oui ; en pratique, c'est la double saisie qui coûte cher. L'import permet de basculer sans tout ressaisir."),
         ("COURTIARK fait-il de la facturation ?", "Non : il organise le suivi du portefeuille et des contrats."),
         ("COURTIARK fait-il du marketing automation ?", "Il organise la prospection et les séquences de contact, sans envoi automatique.")],
        [("Fonctionnalités", "/fonctionnalites/"), ("Tableur ou CRM courtier", "/comparatifs/excel-vs-crm-courtier-assurance")]))

    P.append(comparatif(
        '/comparatifs/excel-vs-crm-courtier-assurance',
        "Tableur ou CRM courtier assurance : la vraie différence | COURTIARK",
        "Le tableur est gratuit et vous connaissez vos fichiers. Voici ce qu'il ne sait pas faire pour un portefeuille d'assurance.",
        "Tableur ou CRM courtier",
        "Réponse courte : un tableur stocke une information, il ne la fait pas remonter. Dans un cabinet de "
        "courtage, ce qui coûte cher n'est pas de stocker — c'est de ne pas voir venir.",
        [section("Ce que le tableur fait très bien",
                 ul(["Lister, trier, calculer.",
                     "Rester accessible à tous, sans abonnement.",
                     "S'adapter à une organisation personnelle."])),
         section("Ce qu'il ne fait pas",
                 tableau(["Attente", "Réalité du tableur", "Ce que fait COURTIARK"],
                         [["Voir les échéances qui arrivent", "Il faut trier et filtrer à la main, régulièrement", "La vue portefeuille et le brief du matin le font d'eux-mêmes"],
                          ["Savoir quels dossiers sont incomplets", "Non, sauf colonne tenue à jour manuellement", "Les dossiers incomplets remontent des données du produit"],
                          ["Retrouver un document", "Le fichier est ailleurs", "Documents rattachés au dossier, déposés par le client"],
                          ["Suivre une relance", "Il faut penser à écrire la date", "La relance est rattachée au dossier et lisible par l'équipe"],
                          ["Partager proprement", "Un fichier ouvert en même temps se dégrade", "Accès par cabinet, plusieurs utilisateurs, rôles"]])),
         section("Le vrai critère de décision",
                 p("Si une seule personne tient le fichier et qu'elle ne prend jamais de vacances, le tableur suffit. "
                   "Dès que plusieurs personnes dépendent de cette information, le fichier devient un point de rupture."))],
        [("Puis-je importer mon fichier existant ?", "Oui, un import permet de démarrer depuis un fichier plutôt que de tout ressaisir."),
         ("Le tableur n'est-il pas moins cher ?", "L'abonnement est un coût visible ; le contournement administratif est un coût invisible. À vous de fixer le seuil."),
         ("Puis-je continuer à exporter mes données ?", "Oui, l'espace de travail permet d'exporter vos données.")],
        [("Guide : organiser un portefeuille", "/guides/organiser-portefeuille-assurance"), ("CRM courtier assurance", "/crm-courtier-assurance")]))

    P.append(comparatif(
        '/comparatifs/logiciel-metier-vs-crm-generaliste',
        "Logiciel métier ou CRM générique : par où commencer | COURTIARK",
        "Beaucoup de cabinets hésitent entre un logiciel métier lourd et un CRM souple. Voici les questions qui tranchent réellement.",
        "Logiciel métier ou CRM générique",
        "Réponse courte : la question n'est pas la catégorie de l'outil, c'est de savoir si vos objets métier "
        "(contrats, échéances, commissions) y existent nativement.",
        [section("Les questions qui tranchent",
                 ul(["Mes contrats et leurs échéances existent-ils comme objets dans l'outil, ou seulement comme texte libre ?",
                     "Puis-je confier une pièce à mon client sans lui créer un compte ?",
                     "Puis-je savoir en trois secondes quels dossiers bloquent ?",
                     "Mes commissions se suivent-elles par dossier ?",
                     "Puis-je repartir avec mes données si je change d'outil ?"])),
         section("Les deux pièges symétriques",
                 bascule(ul(["Un logiciel lourd qu'on n'utilise qu'à moitié",
                             "Des champs obligatoires qui ne servent à personne",
                             "Des migrations coûteuses"]),
                         ul(["Un CRM souple où tout est à reconstruire",
                             "Des objets métier absents (contrats, échéances)",
                             "Une conformité non prise en compte"]),
                         titre_g='Logiciel métier figé', titre_d='CRM générique vide')),
         section("Notre position",
                 p("COURTIARK est un outil de gestion du courtage : il apporte les objets métier sans imposer un "
                   "paramétrage lourd. Nous ne prétendons pas remplacer un logiciel de tarification ni un outil "
                   "comptable."))],
        [("COURTIARK remplace-t-il un logiciel de tarification ?", "Non : il organise le suivi du cabinet, il ne produit pas de tarifs d'assureurs."),
         ("Est-ce un CRM générique configuré ?", "Non : les objets contrats, échéances, commissions et les repères de conformité sont natifs."),
         ("Puis-je essayer avant de m'engager ?", "Oui, l'essai dure 7 jours et ne demande pas de carte bancaire.")],
        [("CRM assurance ou CRM généraliste", "/comparatifs/crm-assurance-vs-crm-generaliste"), ("Fonctionnalités", "/fonctionnalites/")]))

    # ---------------------------------------------------------------- OUTILS
    P.append(dict(
        path='/outils/', type='hub', country='FR', indexable=True,
        title="Outils gratuits pour cabinets de courtage | COURTIARK",
        description="Des outils de calcul honnêtes pour un cabinet de courtage : charge administrative, hypothèses affichées, aucune donnée transmise.",
        h1="Outils gratuits",
        chapeau="Ces outils calculent à partir de vos valeurs et affichent leurs hypothèses. Rien n'est transmis, "
                "rien n'est enregistré, aucun résultat n'est présenté comme une promesse.",
        fil=[("Outils", None)],
        corps=section("Disponible aujourd'hui",
                     ul(['<a href="/outils/calculateur-productivite-courtier">Calculateur de charge administrative</a> — '
                         'estimez les heures de saisie, de relance et de recherche de documents de votre cabinet.']))
        + section("La règle de calcul",
                  p("Toutes les formules sont visibles sur la page de l'outil. Aucun pourcentage de gain n'est promis : "
                    "le calcul montre une charge, pas une économie.")),
        faq=[],
        lire=[("Guide : réduire la saisie manuelle", "/guides/reduire-saisie-manuelle-courtier"), ("Fonctionnalités", "/fonctionnalites/")]))

    P.append(dict(
        path='/outils/calculateur-productivite-courtier', type='tool', country='FR', indexable=True,
        title="Calculateur de charge administrative — courtier assurance | COURTIARK",
        description="Estimez les heures mensuelles de saisie, de relances et de recherche de documents de votre cabinet, à partir de vos propres valeurs. Formules affichées.",
        h1="Calculateur de charge administrative",
        chapeau="Estimez le temps que votre cabinet consacre chaque mois aux tâches administratives : saisie des "
                "dossiers, relances, recherche de documents.",
        fil=[("Outils", "/outils/"), ("Calculateur de charge", None)],
        corps=OUTIL_JS
        + section("Les formules utilisées",
                  tableau(["Poste", "Calcul"],
                          [["Saisie et mise à jour", "dossiers par mois × minutes de saisie ÷ 60"],
                           ["Relances", "relances par mois × minutes par relance ÷ 60"],
                           ["Recherche de documents", "dossiers par mois × minutes de recherche ÷ 60"],
                           ["Coût estimé", "heures totales × coût horaire chargé saisi"]])
                  + p("Le coût horaire chargé est une valeur que vous saisissez : salaire, charges et temps "
                      "indirect inclus. Nous ne l'estimons pas à votre place.")
                  + p("Ce calcul ne prétend pas que la totalité de cette charge est automatisable. Une partie des "
                      "tâches reste humaine : décider, conseiller, négocier.")
                  + p("Aucune donnée saisie n'est envoyée : le calcul s'exécute dans votre navigateur.")),
        faq=[("Ce calculateur envoie-t-il mes chiffres ?", "Non : le calcul est exécuté localement dans votre navigateur, aucune valeur n'est transmise."),
             ("Le résultat est-il une promesse d'économie ?", "Non. Il mesure une charge à partir de vos valeurs ; la part automatisable dépend de votre organisation.")],
        lire=[("Guide : réduire la saisie manuelle", "/guides/reduire-saisie-manuelle-courtier"),
              ("Fonctionnalités", "/fonctionnalites/"), ("Démo", "/demo/")]))

    # ---------------------------------------------------------------- CONFIANCE
    P.append(dict(
        path='/securite', type='trust', country='FR', indexable=True,
        title="Sécurité et cloisonnement des données | COURTIARK",
        description="Ce que COURTIARK met en place pour protéger les données d'un cabinet : cloisonnement vérifié en production, accès limités, sous-traitants documentés.",
        h1="Sécurité des données",
        chapeau="Un cabinet confie des données clients à son outil de gestion. Voici, sans vocabulaire commercial, ce "
                "qui est mis en place et ce qui ne l'est pas.",
        fil=[("Sécurité", None)],
        corps=''.join([
            section("Ce qui est en place",
                    ul(["Cloisonnement par cabinet : un cabinet ne peut pas lire les dossiers d'un autre. Ce comportement est vérifié par des tests d'isolation exécutés sur la production.",
                        "Accès nominatifs : un utilisateur n'accède qu'aux dossiers de son cabinet, selon son rôle.",
                        "Applications privées hors index : les routes de l'application (tableau de bord, dossiers, paramètres) sont exclues de l'indexation et des robots.",
                        "Journalisation des écritures sensibles sur les dossiers (action, date, utilisateur).",
                        "Connexion chiffrée (HTTPS) sur l'ensemble du service."])),
            section("Ce que nous ne prétendons pas",
                    ul(["COURTIARK n'affiche aucune certification de sécurité qu'il ne détient pas.",
                        "Nous ne garantissons pas une localisation d'hébergement que nous ne pouvons pas prouver ; la liste des sous-traitants techniques est publiée dans les mentions légales.",
                        "Les durées de conservation et la base légale du traitement relèvent de votre analyse en tant que responsable de traitement."])),
            section("Vos responsabilités et les nôtres",
                    tableau(["Sujet", "Cabinet", "COURTIARK"],
                            [["Base légale du traitement", "Décide et documente", "Fournit l'outil et les mesures techniques"],
                             ["Accès des utilisateurs", "Gère les comptes et les rôles", "Applique les rôles et le cloisonnement"],
                             ["Données de santé", "Limite leur usage au dossier", "Ne les utilise jamais pour la prospection"],
                             ["Sous-traitants", "Valide la liste", "Publie et maintient la liste"]])),
            section("Signaler un problème",
                    p('Un incident de sécurité présumé doit être signalé à <a href="mailto:contact@courtiark.fr">contact@courtiark.fr</a>. '
                      'Nous répondons et documentons ce qui peut l\'être.')),
        ]),
        faq=[("Mes données sont-elles cloisonnées ?", "Oui. Un cabinet ne voit que ses propres dossiers, et ce cloisonnement est vérifié par des tests d'isolation exécutés sur la production."),
             ("Où sont hébergées les données ?", "Chez des prestataires d'hébergement documentés dans les mentions légales. Nous ne revendiquons pas une localisation que nous ne pouvons pas prouver."),
             ("Les données de santé sont-elles protégées ?", "Elles ne sont jamais utilisées pour la prospection et l'accès reste limité aux utilisateurs du cabinet."),
             ("COURTIARK est-il certifié ISO 27001 ou équivalent ?", "Non, aucune certification de ce type n'est détenue ; nous ne l'affichons donc pas.")],
        lire=[("Confidentialité", "/confidentialite"), ("Mentions légales", "/mentions-legales"),
              ("Guide : données clients France et Suisse", "/guides/donnees-clients-assurance-france-suisse")]))

    P.append(dict(
        path='/a-propos', type='trust', country='FR', indexable=True,
        title="À propos de COURTIARK — CRM et cockpit IA pour courtiers | COURTIARK",
        description="COURTIARK est un CRM et cockpit IA pour cabinets de courtage en assurance, en France et en Suisse. Ce que nous faisons, ce que nous ne faisons pas.",
        h1="À propos de COURTIARK",
        chapeau="COURTIARK est un logiciel de gestion pour cabinets de courtage en assurance. Il est conçu pour un "
                "usage quotidien : suivre un portefeuille, ne pas manquer une échéance, retrouver une pièce, savoir quoi faire aujourd'hui.",
        fil=[("À propos", None)],
        corps=''.join([
            section("Ce que nous construisons",
                    ul(["Un CRM pour les objets du courtage : clients, contrats, échéances, devis, documents, commissions.",
                        "Un assistant, ARK, qui prépare le travail (lecture de document, synthèse, priorisation) et laisse la décision au cabinet.",
                        "Un cadre à deux marchés : France (DDA, ORIAS, RGPD) et Suisse (LSA, surveillance FINMA, protection des données)."])),
            section("Notre règle éditoriale et produit",
                    ul(["Aucun chiffre inventé : un indicateur qui ne peut pas être calculé reste vide.",
                        "Aucun avis client fabriqué, aucune note inventée.",
                        "Aucune promesse d'économie ou de conformité que nous ne pouvons pas prouver.",
                        "Aucune donnée client revendue ou utilisée pour un autre cabinet."])),
            section("Ce que nous ne faisons pas",
                    ul(["Nous ne produisons pas de tarifs d'assureurs.",
                        "Nous n'exerçons aucune activité d'intermédiation.",
                        "Nous ne remplaçons ni votre devoir de conseil, ni votre comptabilité, ni un audit de conformité."])),
            section("Nous écrire",
                    p('Questions, remarques, erreurs repérées sur ce site : <a href="mailto:contact@courtiark.fr">contact@courtiark.fr</a>. '
                      'Les corrections de contenu que nous publions sont listées dans le <a href="/changelog">journal des modifications</a>.')),
        ]),
        faq=[("COURTIARK est-il un courtier ?", "Non : COURTIARK est un éditeur de logiciel. Il n'exerce aucune activité d'intermédiation et ne détient aucun mandat d'assurance."),
             ("Combien de cabinets utilisent COURTIARK ?", "Nous ne publions pas de chiffre que nous ne pouvons pas vérifier publiquement. Des cabinets pilotes utilisent le produit.")],
        lire=[("Sécurité", "/securite"), ("Contact", "/contact"), ("Fonctionnalités", "/fonctionnalites/")]))

    P.append(dict(
        path='/mentions-legales', type='trust', country='FR', indexable=True,
        title="Mentions légales | COURTIARK",
        description="Mentions légales du service COURTIARK : éditeur, hébergement, sous-traitants techniques et conditions d'utilisation.",
        h1="Mentions légales",
        chapeau="Les informations d'édition et d'hébergement du service COURTIARK.",
        fil=[("Mentions légales", None)],
        corps=''.join([
            section("Éditeur",
                    ul(["Service édité sous la marque COURTIARK (produit historiquement nommé COURTIA).",
                        'Contact : <a href="mailto:contact@courtiark.fr">contact@courtiark.fr</a>',
                        "Les informations d'immatriculation de l'éditeur figurent dans le contrat de service transmis lors de la souscription.",
                        "Ce site ne publie pas de numéro d'immatriculation non vérifié."])),
            section("Hébergement et sous-traitants techniques",
                    p("Le service s'appuie sur des prestataires d'hébergement et de base de données, ainsi que sur des "
                      "prestataires d'envoi d'e-mails transactionnels et de paiement. La liste à jour est communiquée "
                      "sur demande et annexée au contrat ; elle mentionne la nature du traitement confié à chacun.")
                    + p("Nous ne publions pas de localisation d'hébergement que nous ne pouvons pas prouver, et nous "
                        "n'affirmons pas de conformité à un référentiel que nous ne détenons pas.")),
            section("Propriété intellectuelle",
                    p("Les contenus de ce site (textes, structure, visuels) sont protégés. Les données publiques "
                      "réutilisées (par exemple des référentiels officiels) sont citées avec leur source.")),
            section("Conditions",
                    p('Les conditions générales et la politique de confidentialité détaillent les engagements '
                      'réciproques : <a href="/confidentialite">confidentialité</a>.')),
        ]),
        faq=[],
        lire=[("Sécurité", "/securite"), ("Confidentialité", "/confidentialite"), ("Contact", "/contact")]))

    P.append(dict(
        path='/confidentialite', type='trust', country='FR', indexable=True,
        title="Confidentialité et traitement des données | COURTIARK",
        description="Quelles données COURTIARK traite, pour quoi, et quels sont vos droits. En clair, sans engagement que nous ne pouvons pas tenir.",
        h1="Confidentialité",
        chapeau="Ce que nous traitons quand vous visitez ce site, quand vous demandez une démonstration et quand "
                "vous utilisez le produit.",
        fil=[("Confidentialité", None)],
        corps=''.join([
            section("Visite du site",
                    ul(["Aucun traceur publicitaire n'est déposé par ce site.",
                        "Les mesures d'audience sont réalisées sans identifiant personnel et servent à savoir quelles pages sont consultées.",
                        "Aucune donnée n'est revendue."])),
            section("Demande de démonstration ou d'essai",
                    ul(["Les informations transmises (nom, cabinet, e-mail, téléphone) servent uniquement à répondre à votre demande.",
                        "Elles ne sont pas utilisées pour un autre usage, et vous pouvez demander leur suppression.",
                        "L'origine de la visite (source de campagne) est conservée de façon agrégée pour savoir ce qui fonctionne."])),
            section("Utilisation du produit",
                    ul(["Le cabinet est responsable du traitement des données de ses clients ; COURTIARK est son sous-traitant technique.",
                        "Les données d'un cabinet ne sont accessibles qu'à ses propres utilisateurs.",
                        "Les données de santé ne sont jamais utilisées pour de la prospection.",
                        "Les données restent exportables."])),
            section("Vos droits",
                    p('Vous pouvez demander l\'accès, la rectification ou la suppression des données vous concernant en écrivant à '
                      '<a href="mailto:contact@courtiark.fr">contact@courtiark.fr</a>.')),
        ]),
        faq=[("Utilisez-vous des cookies publicitaires ?", "Non, ce site n'intègre pas de traceur publicitaire tiers."),
             ("Mes données d'essai sont-elles supprimées à la fin de l'essai ?", "Non, elles restent consultables : un compte expiré passe en lecture seule, sans suppression.")],
        lire=[("Sécurité", "/securite"), ("Mentions légales", "/mentions-legales")]))

    # ---------------------------------------------------------------- CONVERSION
    P.append(dict(
        path='/demo/', type='convert', country='FR', indexable=True,
        title="Demander une démonstration de COURTIARK | CRM courtier assurance",
        description="Demandez une démonstration de COURTIARK : nous regardons votre organisation et montrons ce que l'outil traite concrètement. Essai 7 jours possible.",
        h1="Demander une démonstration",
        chapeau="Décrivez votre cabinet : nous revenons vers vous avec une proposition de créneau et une "
                "démonstration sur les cas qui vous concernent.",
        fil=[("Démonstration", None)],
        corps=section("Votre demande", FORM_DEMO)
        + section("Ce que nous ne ferons pas",
                  ul(["Vous inscrire à une liste de diffusion sans votre accord.",
                      "Vous appeler de façon répétée.",
                      "Vous promettre un gain chiffré que nous ne pouvons pas prouver."])),
        faq=[("Combien de temps dure une démonstration ?", "Environ trente minutes, sur vos cas d'usage."),
             ("Puis-je essayer sans démonstration ?", "Oui : l'essai de 7 jours est ouvert sans carte bancaire.")],
        lire=[("Essayer COURTIARK", "/register"), ("Fonctionnalités", "/fonctionnalites/")]))

    P.append(dict(
        path='/contact', type='trust', country='FR', indexable=True,
        title="Contacter COURTIARK | CRM et cockpit IA pour courtiers",
        description="Contacter COURTIARK : question sur le produit, demande de démonstration, sujet de sécurité ou de confidentialité.",
        h1="Contacter COURTIARK",
        chapeau="Une question sur le produit, une demande de démonstration ou un sujet de sécurité : écrivez-nous "
                "ou laissez vos coordonnées.",
        fil=[("Contact", None)],
        corps=section("Nous écrire",
                     p('Par e-mail : <a href="mailto:contact@courtiark.fr">contact@courtiark.fr</a> — c\'est le canal le plus direct '
                       'pour une question technique ou un signalement de sécurité.'))
        + section("Demander une démonstration", FORM_DEMO),
        faq=[],
        lire=[("Démonstration", "/demo/"), ("Sécurité", "/securite"), ("À propos", "/a-propos")]))

    # --- Journal des modifications : contenu construit depuis l'historique Git reel
    import subprocess as _sp
    try:
        _log = _sp.run(['git', 'log', '-24', '--pretty=format:%h|%ad|%s', '--date=format:%d/%m/%Y'],
                       cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                       capture_output=True, text=True, timeout=20).stdout.strip().split('\n')
    except Exception:
        _log = []
    _lignes = []
    for _l in _log:
        _p = _l.split('|')
        if len(_p) == 3:
            _lignes.append([_p[1], _p[2], _p[0]])
    P.append(dict(
        path='/changelog', type='trust', country='FR', indexable=bool(_lignes),
        title="Journal des modifications de COURTIARK | COURTIARK",
        description="Les changements publiés sur COURTIARK : corrections, nouvelles fonctions et évolutions du site public, avec leur date et leur identifiant de version.",
        h1="Journal des modifications",
        chapeau="Ce que nous publions, quand, et sous quel identifiant de version. Les entrées proviennent de "
                "l'historique réel du produit.",
        fil=[("Journal des modifications", None)],
        corps=section("Changements publiés",
                      tableau(["Date", "Changement", "Version"], _lignes) if _lignes
                      else p("L'historique n'est pas disponible pour cette génération."))
        + section("Comment lire ce journal",
                  ul(["Chaque ligne correspond à une modification réellement publiée sur la production.",
                      "La colonne « version » est l'identifiant du commit correspondant.",
                      "Les corrections de contenu de ce site y figurent aussi."])),
        faq=[],
        lire=[("À propos", "/a-propos"), ("Sécurité", "/securite")]))

    return P
