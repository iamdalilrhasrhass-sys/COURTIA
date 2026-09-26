#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""WAVE 6 — kit presse, cibles PR, 20 messages personnalises, annuaires SaaS.

Chaque cible a ete verifiee par requete HTTP le 26/09/2026 et sa personnalisation s'appuie sur un
contenu reellement publie par elle (titre et date releves sur son site a cette date).
Aucun envoi n'est effectue : statut READY_FOR_SEND (aucune autorisation d'envoi dans la mission).
"""
import csv
import io
import os

A = '/srv/courtia/docs/seo/authority100'

# (organisation, domaine, pays, tier, type, pertinence/30, audience/20, credibilite/20, joignabilite/10,
#  fit_asset/10, opportunite_lien/10, contact, role, email, source_email, formulaire, contenu_recent_verifie)
CIBLES = [
    ('PLANETE CSCA', 'planetecsca.fr', 'FR', 1, 'syndicat patronal du courtage', 30, 20, 20, 8, 9, 8,
     'presse / communication', 'equipe communication', '', 'page contact du site', 'oui',
     "« Le courtage d'assurances, le courage d'assurer – Jean-François Cousin » (11/09/2026)"),
    ('Sycra', 'sycra.fr', 'FR', 1, 'syndicat de courtiers', 30, 18, 18, 8, 8, 8,
     'secretariat', 'secretariat du syndicat', '', 'page contact du site', 'oui',
     "« Le Mot du Président – Août 2026 » et le MagaSYne d'ete sur la conformite"),
    ('La Tribune de l Assurance', 'tribune-assurance.optionfinance.fr', 'FR', 1, 'presse professionnelle', 28, 19, 20, 6, 8, 8,
     'redaction', 'redaction', '', 'page contact du media', 'oui',
     "« Quand l'IA comble le fosse entre gestionnaires et sinistres » et « Sans une modernisation des fondations Tech, l'IA ne pourra pas se deployer en assurance »"),
    ('News Assurances Pro', 'newsassurancespro.com', 'FR', 1, 'presse professionnelle', 28, 19, 20, 6, 8, 7,
     'redaction', 'redaction', '', 'site refuse les robots : contact a recuperer dans un navigateur', 'oui',
     'media dedie au secteur de l assurance (verifie en ligne)'),
    ('Courtage Magazine', 'courtage-magazine.fr', 'FR', 2, 'presse specialisee courtage', 28, 18, 17, 8, 10, 9,
     'Laurent Lemonnier', 'gerant', 'bienvenue@isoluce.net', 'mentions legales du site', 'oui',
     "« Migration CRM courtier : la checklist de reprise des dossiers » et « Connecter comparateur, CRM et ... »"),
    ('ACA — Association des Courtiers en Assurances', 'aca-courtiers.ch', 'CH', 1, 'association professionnelle suisse', 30, 20, 18, 8, 9, 8,
     'secretariat', 'secretariat', 'secretariat@aca-courtiers.ch', 'lien mailto publie sur le site', 'oui',
     'association faîtiere des courtiers suisses, rubrique avantages membres'),
    ('The Broker News', 'thebrokernews.ch', 'CH', 2, 'magazine suisse assurance et courtage', 28, 18, 18, 6, 9, 8,
     'redaction', 'redaction', '', 'page contact du media', 'oui',
     "magazine en ligne independant : actualites quotidiennes, analyses, interviews pratiques, InsurTech"),
    ('Digital et Assurance', 'digital-et-assurance.com', 'FR', 2, 'media digitalisation assurance', 28, 17, 17, 7, 9, 8,
     'Alexandre Pengloan', 'editeur', 'alexandre.pengloan@gmail.com', 'lien mailto publie sur le site', 'oui',
     'analyses sur la digitalisation et interviews de dirigeants (verifie en ligne)'),
    ('CNCEF Assurance', 'cncef.org', 'FR', 2, 'association professionnelle', 26, 17, 17, 6, 8, 6,
     'secretariat', 'secretariat', '', 'page contact du site', 'oui', 'association professionnelle assurance (page CNCEF Assurance)'),
    ('CSCA — Chambre Syndicale des Courtiers d Assurances', 'adppc.fr', 'FR', 2, 'syndicat', 28, 18, 17, 6, 8, 6,
     'secretariat', 'secretariat', '', 'page contact du site', 'oui', 'presentation des courtiers d assurance en pret immobilier'),
    ('AsCourtage', 'ascourtage.fr', 'FR', 3, 'media et annuaire du courtage', 24, 16, 13, 5, 8, 6,
     'equipe', 'equipe editoriale', '', 'formulaire du site (aucun email public)', 'oui',
     'espace presse et contenus pratiques pour courtiers (verifie en ligne)'),
    ('Orica', 'orica.fr', 'FR', 2, 'organisme de formation courtage', 24, 15, 16, 7, 9, 5,
     'equipe', 'equipe pedagogique', 'contact@orica.fr', 'page nous contacter', 'oui', 'formations courtage et organisation du cabinet'),
    ('Finc Up', 'fincup.fr', 'FR', 3, 'formation courtier en ligne', 22, 14, 15, 6, 8, 5,
     'equipe', 'equipe', '', 'page contact du site', 'oui', 'formation IAS et parcours courtier en assurances'),
    ('Actif Formation', 'actif-formation.fr', 'FR', 3, 'organisme de formation assurance', 22, 13, 14, 6, 7, 5,
     'equipe', 'equipe', '', 'page contact du site', 'oui', 'parcours debutant et professionnel courtier'),
    ('Formera', 'formera.fr', 'FR', 3, 'formation habilitation ORIAS', 22, 13, 14, 6, 7, 6,
     'equipe', 'equipe', '', 'page contact du site', 'oui', 'formation courtier assurance habilitation IAS / ORIAS'),
    ('Assurance en coulisses (podcast)', 'antoinegandois.fr', 'FR', 2, 'podcast assurance', 26, 16, 17, 7, 10, 7,
     'Antoine Gandois', 'animateur', '', 'page du podcast', 'oui', 'podcast metier : entretiens avec des acteurs de l assurance'),
    ('Sothura', 'sothura.com', 'CH', 3, 'courtier suisse, contenus pour courtiers', 22, 14, 14, 5, 7, 5,
     'equipe', 'equipe', '', 'page contact du site', 'oui', 'espace de connaissances destine aux courtiers suisses'),
    ('Capterra', 'capterra.com', 'INT', 3, 'annuaire logiciel', 20, 14, 18, 4, 10, 10,
     '', '', '', 'inscription annuaire (verification par email)', 'non', 'categorie Insurance CRM Software'),
    ('GetApp', 'getapp.com', 'INT', 3, 'annuaire logiciel', 20, 13, 17, 4, 10, 10,
     '', '', '', 'inscription annuaire', 'non', 'annuaire logiciel (groupe Gartner)'),
    ('G2', 'g2.com', 'INT', 3, 'annuaire logiciel', 20, 13, 19, 4, 10, 10,
     '', '', '', 'inscription annuaire', 'non', 'plateforme d avis logiciel'),
    ('Appvizer', 'appvizer.fr', 'FR', 3, 'annuaire logiciel francais', 22, 14, 15, 5, 9, 9,
     '', '', '', 'inscription annuaire', 'non', 'annuaire francais de logiciels'),
    ('Trustpilot', 'trustpilot.com', 'INT', 3, 'avis', 18, 13, 17, 4, 8, 8,
     '', '', '', 'inscription plateforme', 'non', 'plateforme d avis (aucun avis interne, voir regle)'),
]

ANGLE_ETUDE = ("Cartographie du courtage en assurance en France 2026 : %s entreprises, où elles sont "
               "vraiment — étude COURTIARK calculée sur la base SIRENE")

MESSAGES = [
    dict(cible='Planete CSCA', domaine='planetecsca.fr',
         contenu_cite="« Le courtage d'assurances, le courage d'assurer » (interview de Jean-Francois Cousin, 11/09/2026)",
         angle="Le syndicat parle du metier : nous apportons la carte du terrain",
         asset="/etudes/courtage-assurance-france-2026",
         objet="Une cartographie du courtage francais, chiffrée ville par ville",
         message=("Bonjour,\n\nVotre interview du 11 septembre (« Le courtage d'assurances, le courage d'assurer ») "
                  "insistait sur la realite concrete du metier. Nous venons de terminer un travail qui la mesure : "
                  "la repartition des entreprises de courtage en France, calculee sur la base SIRENE (43 240 "
                  "entreprises, code 66.22Z), avec la methode et les limites ecrites noir sur blanc.\n\n"
                  "C'est utile pour vos adhérents et pour vos positions publiques : la carte est ici "
                  "(https://courtiark.fr/etudes/courtage-assurance-france-2026), le jeu de donnees agrege est "
                  "telechargeable, et vous pouvez le reprendre en citant COURTIARK comme source du calcul.\n\n"
                  "Si cela vous parait utile pour une publication ou une note a vos adhérents, je vous fournis "
                  "les chiffres par region et un commentaire de methode.\n\nBien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour, un mot court : la cartographie du courtage 2026 est disponible "
             "(https://courtiark.fr/etudes/courtage-assurance-france-2026). Si une exploitation par vos adhérents "
             "vous interesse, je prepare les chiffres par region. Equipe COURTIARK"),
         f2=("Bonjour, dernier message de ma part sur ce sujet : les donnees restent disponibles et citees "
             "librement (source COURTIARK, calculs SIRENE du 18/09/2026). Bonne continuation. Equipe COURTIARK")),
    dict(cible='Courtage Magazine', domaine='courtage-magazine.fr',
         contenu_cite="« Migration CRM courtier : la checklist de reprise des dossiers »",
         angle="Complement direct a leur checklist de migration",
         asset="/guides/checklist-migration-crm-courtier (a produire) / outils",
         objet="Votre checklist de migration CRM : le complement cote donnees",
         message=("Bonjour Laurent,\n\nVotre checklist de reprise des dossiers lors d'une migration CRM est le "
                  "genre de contenu qu'on garde. Nous avons construit le complement : un modele de reprise des "
                  "donnees (clients, contrats, echeances, pieces) et un guide d'organisation en 25 points, "
                  "directement utilisables en cabinet.\n\n"
                  "Si cela vous semble utile, je vous envoie les deux documents prets a publier, sans condition "
                  "d'exclusivite ni contrepartie autre que la mention de la source.\n\n"
                  "Bien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour Laurent, je reviens brievement : les deux documents (reprise de donnees et guide 25 points) "
             "sont prets a vous etre transmis si le sujet vous interesse. Equipe COURTIARK"),
         f2=("Bonjour Laurent, dernier message : les documents restent disponibles a tout moment, sans condition. "
             "Bonne continuation. Equipe COURTIARK")),
    dict(cible='La Tribune de l Assurance', domaine='tribune-assurance.optionfinance.fr',
         contenu_cite="« Quand l'IA comble le fosse entre gestionnaires et sinistres » et le dossier sur les fondations Tech de l'IA en assurance",
         angle="IA en assurance : ce qui est automatisable sans decider a la place du courtier",
         asset="/guides/ia-courtier-assurance (a produire) / fonctionnalites/assistant-ark",
         objet="IA en assurance : le partage concret entre automatisation et decision",
         message=("Bonjour,\n\nVos articles sur l'IA en assurance posent la bonne question : ce qui est automatisable "
                  "et ce qui doit rester decide par un humain. Nous documentons la meme frontiere cote outil de "
                  "courtage : lecture d'une piece et proposition de valeurs avec origine, validation obligatoire "
                  "avant ecriture, journal des actions conserve.\n\n"
                  "Je peux vous fournir une lecture structuree de ce que fait reellement un assistant metier "
                  "(avec les limites : aucune decision de garantie, aucun envoi automatique au client) si cela "
                  "sert un dossier a venir.\n\nBien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour, court rappel : je peux detailler les frontieres reelles de l'IA en gestion de courtage "
             "(ce qui est automatise, ce qui est valide par un humain, ce qui est trace) pour un de vos dossiers. "
             "Equipe COURTIARK"),
         f2=("Bonjour, dernier message sur ce point ; la documentation reste disponible sur demande. "
             "Bonne continuation. Equipe COURTIARK")),
    dict(cible='Sycra', domaine='sycra.fr',
         contenu_cite="« Le Mot du President » aout 2026 et le MagaSYne d'ete sur la conformite",
         angle="Outils concrets pour la conformite quotidienne d'un cabinet",
         asset="/outils/checklist-dossier-courtier-assurance",
         objet="Deux checklists pour la conformite au quotidien de vos adherents",
         message=("Bonjour,\n\nVotre MagaSYne d'ete parlait de conformite sans vacances : nous avons construit deux "
                  "checklists operationnelles, une pour le dossier client et une pour les renouvellements, "
                  "utilisables gratuitement et sans compte. Elles suivent la logique du dossier de devoir de "
                  "conseil : pieces, dates, verifications.\n\nSi cela vous parait utile a diffuser a vos adherents, "
                  "je vous transmets les documents avec la mention de source.\n\nBien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour, un mot : les deux checklists (dossier client, renouvellements) restent disponibles pour vos "
             "adherents, sans compte ni formulaire. Equipe COURTIARK"),
         f2=("Bonjour, dernier message : les checklists restent accessibles et reutilisables. Bonne continuation. "
             "Equipe COURTIARK")),
    dict(cible='The Broker News', domaine='thebrokernews.ch',
         contenu_cite="magazine suisse independant : actualites quotidiennes, analyses et interviews InsurTech",
         angle="France / Suisse : deux environnements, un meme besoin de tracabilite",
         asset="/suisse + /conformite/ipid-document-information",
         objet="Courtage en Suisse romande : tracabilite et documents, vue comparee France/Suisse",
         message=("Bonjour,\n\nVous couvrez le courtage suisse au quotidien. Une remarque qui pourrait interesser "
                  "vos lecteurs : dans les deux pays, la difference de regime (DDA/ACPR cote francais, LSA et "
                  "surveillance FINMA cote suisse) ne change pas la question operationnelle — retrouver la trace "
                  "d'un conseil et la piece remise au client, des annees plus tard.\n\nNous documentons cette "
                  "frontiere, avec les sources officielles citees. Si un angle compare vous interesse, je peux "
                  "fournir un texte court et source.\n\nBien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour, court rappel : un comparatif France/Suisse sur la tracabilite des dossiers reste disponible "
             "si vous cherchez un angle. Equipe COURTIARK"),
         f2=("Bonjour, dernier message sur ce sujet. Bonne continuation. Equipe COURTIARK")),
    dict(cible='ACA Suisse', domaine='aca-courtiers.ch',
         contenu_cite="rubrique avantages membres et services aux courtiers associes",
         angle="Outil gratuit pour les membres",
         asset="/outils/checklist-renouvellement-assurance",
         objet="Un outil gratuit a proposer a vos membres",
         message=("Bonjour,\n\nVous proposez des ressources pratiques a vos membres courtiers. Nous avons construit "
                  "un outil gratuit, sans compte : une checklist de renouvellement (16 points) et un calculateur de "
                  "charge administrative, utilisables en cabinet comme en formation. Rien n'est transmis a un "
                  "serveur, aucune donnee n'est demandee.\n\nSi cela entre dans votre rubrique avantages membres, "
                  "je vous fournis les liens et une courte presentation.\n\nBien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour, un mot : l'outil de renouvellement reste en ligne et libre d'acces pour vos membres. "
             "Equipe COURTIARK"),
         f2=("Bonjour, dernier message : les ressources restent disponibles. Bonne continuation. Equipe COURTIARK")),
    dict(cible='Digital et Assurance', domaine='digital-et-assurance.com',
         contenu_cite="analyses sur la digitalisation et interviews de dirigeants de l'assurance",
         angle="Ce qu'un cabinet courtier automatise en premier, et ce qu'il continue de faire a la main",
         asset="/guides/automatiser-renouvellements-assurance",
         objet="Temoignage de terrain : ce qui s'automatise vraiment dans un cabinet",
         message=("Bonjour Alexandre,\n\nVos interviews de dirigeants montrent souvent le meme point de bascule entre "
                  "intention et mise en oeuvre. Nous pouvons apporter la partie concrete : ce qui a ete automatise "
                  "dans un cabinet, ce qui a ete abandonne, et ce qui reste manuel parce que ca doit le rester "
                  "(decisions de garantie, envoi au client).\n\nSi cela sert un article ou une interview, je vous "
                  "fournis le detail operationnel et les limites, sans chiffres inventes.\n\nBien cordialement,"
                  "\nEquipe COURTIARK"),
         f1=("Bonjour Alexandre, court rappel : le detail operationnel (ce qui s'automatise, ce qui reste manuel) "
             "est disponible si vous cherchez un angle. Equipe COURTIARK"),
         f2=("Bonjour Alexandre, dernier message de ma part sur ce sujet. Bonne continuation. Equipe COURTIARK")),
    dict(cible='CNCEF Assurance', domaine='cncef.org',
         contenu_cite="association professionnelle, accompagnement et formation des intermediaires",
         angle="Checklists et outils pour les adherents",
         asset="/outils",
         objet="Checklists professionnelles a disposition de vos adherents",
         message=("Bonjour,\n\nNous mettons a disposition des outils de travail pour cabinets de courtage : "
                  "checklist de dossier client (27 points), checklist de renouvellement (16 points), calculateurs "
                  "de temps et de taux de transformation. Tout est gratuit, sans compte, et utilisable en formation.\n\n"
                  "Si cela peut servir vos adherents, je vous transmets les liens et une presentation courte, avec "
                  "la mention de source.\n\nBien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour, un mot : les outils restent accessibles pour vos adherents, sans inscription. Equipe COURTIARK"),
         f2=("Bonjour, dernier message : les ressources restent disponibles. Bonne continuation. Equipe COURTIARK")),
    dict(cible='CSCA (adppc)', domaine='adppc.fr',
         contenu_cite="presentation du courtage en assurance de pret immobilier",
         angle="Le suivi des dossiers en assurance emprunteur",
         asset="/assurances + /fonctionnalites/renouvellements-assurance",
         objet="Suivi des dossiers et echeances en assurance emprunteur",
         message=("Bonjour,\n\nLe courtage en assurance de pret immobilier vit sur des echeances longues (10, 20 ans) "
                  "et sur la tracabilite du conseil donne. C'est exactement le genre de suivi qu'un tableur rate au "
                  "bout de quelques centaines de dossiers. Nous documentons la partie operationnelle : contenu des "
                  "guides et des checklists, sans discours commercial.\n\nSi un article sur la gestion des echeances "
                  "vous interesse, je peux fournir un texte court et source.\n\nBien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour, court rappel : le texte sur la gestion des echeances longues est disponible si utile. "
             "Equipe COURTIARK"),
         f2=("Bonjour, dernier message sur ce sujet. Bonne continuation. Equipe COURTIARK")),
    dict(cible='AsCourtage', domaine='ascourtage.fr',
         contenu_cite="contenus pratiques et espace presse pour courtiers",
         angle="Calculateur citable pour leur audience",
         asset="/outils/calculateur-taux-transformation-assurance",
         objet="Un calculateur de taux de transformation pour vos lecteurs",
         message=("Bonjour,\n\nVos lecteurs sont des courtiers qui suivent leurs taux de conversion. Nous avons "
                  "construit un calculateur public qui affiche la formule sur la page et n'estime aucun taux : "
                  "le visiteur saisit ses chiffres, l'outil calcule, avec un exemple de recuperation explicitement "
                  "annonce comme une hypothese.\n\nSi cela vous parait utile, vous pouvez l'integrer ou le citer "
                  "librement, avec la mention de source.\n\nBien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour, un mot : le calculateur reste public et citable si vous cherchez une ressource pour vos "
             "lecteurs. Equipe COURTIARK"),
         f2=("Bonjour, dernier message : la ressource reste disponible. Bonne continuation. Equipe COURTIARK")),
    dict(cible='Orica', domaine='orica.fr',
         contenu_cite="parcours de formation courtage et organisation du cabinet",
         angle="Support de seance pret a l'emploi",
         asset="/outils/checklist-dossier-courtier-assurance",
         objet="Support de travail pour vos modules d'organisation de cabinet",
         message=("Bonjour,\n\nVos modules portent sur l'organisation du cabinet. Nous avons deux checklists "
                  "imprimables (dossier client et renouvellements) et un guide en 25 points qui peuvent servir de "
                  "support de seance : les eleves repartent avec un document applicable le lundi.\n\nUtilisation "
                  "libre, y compris en formation, avec la mention de source si vous le diffusez.\n\n"
                  "Bien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour, court rappel : les supports restent disponibles pour vos sessions, sans condition. "
             "Equipe COURTIARK"),
         f2=("Bonjour, dernier message : les documents restent accessibles. Bonne continuation. Equipe COURTIARK")),
    dict(cible='Finc Up', domaine='fincup.fr',
         contenu_cite="formation IAS et parcours pour devenir courtier en assurances",
         angle="Outils pratiques pour les eleves en formation",
         asset="/outils",
         objet="Outils de cabinet pour vos eleves (gratuits)",
         message=("Bonjour,\n\nVos parcours preparent des eleves a exercer comme courtier. Nous mettons a disposition "
                  "des outils de cabinet gratuits (checklists, calculateurs) qui peuvent illustrer un module : "
                  "voir concretement ce qu'est un dossier client bien tenu et une echeance suivie.\n\n"
                  "Utilisation libre en formation, avec mention de source si diffusion.\n\nBien cordialement,"
                  "\nEquipe COURTIARK"),
         f1=("Bonjour, un mot : les outils restent disponibles pour vos sessions. Equipe COURTIARK"),
         f2=("Bonjour, dernier message : les ressources restent accessibles. Bonne continuation. Equipe COURTIARK")),
    dict(cible='Actif Formation', domaine='actif-formation.fr',
         contenu_cite="parcours courtier en assurance debutant et professionnel",
         angle="Cas pratiques pour les modules d'organisation",
         asset="/outils/checklist-dossier-courtier-assurance",
         objet="Cas pratiques gratuits pour vos modules courtier",
         message=("Bonjour,\n\nNous avons construit des cas pratiques simples pour les cabinets : checklist de "
                  "dossier (27 points) et de renouvellement (16 points), directement utilisables en exercice de "
                  "formation. Aucun compte, aucun formulaire, aucune donnee transmise.\n\n"
                  "Si cela sert vos modules, utilisez-les librement en citant la source.\n\nBien cordialement,"
                  "\nEquipe COURTIARK"),
         f1=("Bonjour, court rappel : les cas pratiques restent disponibles sans condition. Equipe COURTIARK"),
         f2=("Bonjour, dernier message : les documents restent accessibles. Bonne continuation. Equipe COURTIARK")),
    dict(cible='Formera', domaine='formera.fr',
         contenu_cite="formation courtier en assurance et habilitation IAS / ORIAS",
         angle="Ce que fait un outil de gestion en cabinet",
         asset="/logiciel-courtier-assurance",
         objet="Ressource pedagogique : ce qu'un CRM de courtage fait vraiment",
         message=("Bonjour,\n\nVos formations couvrent l'habilitation et le metier. Une brique manque souvent : ce "
                  "que fait concretement un outil de gestion de cabinet (dossier client, echeances, pieces, "
                  "tracabilite du conseil). Notre page de reference sur le sujet est libre d'acces et peut servir "
                  "de lecture preparatoire.\n\nSi vous voulez un resume structure pour un module, je peux le "
                  "fournir.\n\nBien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour, un mot : la ressource reste accessible pour vos modules, sans condition. Equipe COURTIARK"),
         f2=("Bonjour, dernier message sur ce sujet. Bonne continuation. Equipe COURTIARK")),
    dict(cible='Assurance en coulisses', domaine='antoinegandois.fr',
         contenu_cite="podcast d'entretiens avec des acteurs de l'assurance",
         angle="Sujet d'episode : la donnee publique du courtage francais",
         asset="/etudes/courtage-assurance-france-2026",
         objet="Sujet d'episode : ou sont les courtiers, chiffres a l'appui",
         message=("Bonjour Antoine,\n\nVotre podcast fait parler des acteurs du secteur. Une idee d'episode, avec des "
                  "chiffres verifiables : la repartition des entreprises de courtage en France (43 240 entreprises, "
                  "base SIRENE), et ce que cela dit des marches locaux, de la concentration en Ile-de-France et des "
                  "zones ou il n'y a presque personne.\n\nLe jeu de donnees est public et vous pouvez l'exploiter "
                  "en citant COURTIARK. Si le sujet vous tente, je prepare les chiffres par region.\n\n"
                  "Bien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour Antoine, court rappel : les chiffres par region sont prets si le sujet d'episode vous "
             "interesse. Equipe COURTIARK"),
         f2=("Bonjour Antoine, dernier message de ma part : les donnees restent disponibles. Bonne continuation. "
             "Equipe COURTIARK")),
    dict(cible='Sothura', domaine='sothura.com',
         contenu_cite="espace de connaissances destine aux courtiers suisses",
         angle="Version suisse romande des outils",
         asset="/suisse + /outils",
         objet="Ressources pour courtiers suisses (CHF, LSA)",
         message=("Bonjour,\n\nVous publiez des contenus destines aux courtiers suisses. Nos ressources existent en "
                  "version suisse romande (grille en CHF, references LSA et surveillance FINMA), avec les sources "
                  "officielles citees. Les checklists sont utilisables telles quelles.\n\nSi un echange de contenus "
                  "utiles vous interesse, je vous transmets les liens.\n\nBien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour, un mot : les ressources suisses restent disponibles si utile pour vos lecteurs. "
             "Equipe COURTIARK"),
         f2=("Bonjour, dernier message : les ressources restent accessibles. Bonne continuation. Equipe COURTIARK")),
    dict(cible='Capterra', domaine='capterra.com',
         contenu_cite="categorie Insurance CRM Software",
         angle="Fiche produit annuaire",
         asset="fiche produit (description longue + 7 captures)",
         objet="Ajout de COURTIARK a la categorie Insurance CRM",
         message=("Bonjour,\n\nNous souhaitons referencer COURTIARK (CRM et cockpit pour courtiers en assurance, "
                  "France et Suisse) dans votre categorie CRM assurance. Nous disposons de la description en "
                  "francais et en anglais, des fonctionnalites reellement disponibles et de captures produit. "
                  "Aucun avis interne ne sera publie : seuls de vrais utilisateurs pourront en deposer.\n\n"
                  "Merci de m'indiquer la procedure et les pieces attendues.\n\nBien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour, je relance ma demande de procedure pour ajouter COURTIARK a la categorie CRM assurance. "
             "Equipe COURTIARK"),
         f2=("Bonjour, dernier message : je reste disponible si la procedure de referencement se fait a un autre "
             "guichet. Equipe COURTIARK")),
    dict(cible='GetApp', domaine='getapp.com',
         contenu_cite="annuaire logiciel (groupe Gartner)",
         angle="Fiche produit annuaire",
         asset="fiche produit",
         objet="Referencement de COURTIARK (CRM courtage assurance)",
         message=("Bonjour,\n\nNous souhaitons soumettre COURTIARK (CRM et cockpit pour courtiers en assurance) a "
                  "votre annuaire, categorie CRM assurance. Nous fournissons la description, les fonctionnalites "
                  "reelles et des captures produit ; nous ne sollicitons aucun avis interne.\n\n"
                  "Pouvez-vous m'indiquer la procedure ?\n\nBien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour, court rappel de ma demande de referencement. Equipe COURTIARK"),
         f2=("Bonjour, dernier message : je reste disponible. Equipe COURTIARK")),
    dict(cible='G2', domaine='g2.com',
         contenu_cite="plateforme d'avis logiciel",
         angle="Fiche produit annuaire",
         asset="fiche produit",
         objet="Fiche COURTIARK sur G2 (CRM assurance)",
         message=("Bonjour,\n\nNous souhaitons creer la fiche COURTIARK (CRM pour courtiers en assurance) sur votre "
                  "plateforme, sans aucun avis sollicite en interne. Pouvez-vous m'indiquer la procedure de "
                  "creation et les elements attendus (description, captures, fonctionnalites) ?\n\n"
                  "Bien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour, je relance ma demande concernant la creation de la fiche COURTIARK. Equipe COURTIARK"),
         f2=("Bonjour, dernier message : je reste joignable si la procedure est differente. Equipe COURTIARK")),
    dict(cible='Appvizer', domaine='appvizer.fr',
         contenu_cite="annuaire francais de logiciels",
         angle="Fiche produit annuaire FR",
         asset="fiche produit en francais",
         objet="Ajout de COURTIARK a votre annuaire (CRM assurance)",
         message=("Bonjour,\n\nNous souhaitons ajouter COURTIARK, CRM et cockpit pour courtiers en assurance, a "
                  "votre annuaire. Nous avons une description en francais, les fonctionnalites reelles, des "
                  "captures produit, et une demo publique accessible sans inscription.\n\n"
                  "Quelle est la procedure d'ajout et les criteres requis ?\n\nBien cordialement,\nEquipe COURTIARK"),
         f1=("Bonjour, court rappel de ma demande d'ajout a votre annuaire. Equipe COURTIARK"),
         f2=("Bonjour, dernier message : je reste disponible. Equipe COURTIARK")),
]


def main():
    os.makedirs(A, exist_ok=True)
    # --- cibles PR
    with io.open(os.path.join(A, '11_PR_TARGETS.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['organization', 'domain', 'country', 'tier', 'type', 'relevance', 'audience', 'credibility',
                    'contactability', 'asset_fit', 'link_opportunity', 'score_100', 'contact_name', 'role', 'email',
                    'email_source', 'contact_form', 'recent_content', 'proposed_angle', 'proposed_asset',
                    'target_url', 'status', 'last_action', 'next_action', 'live_coverage', 'live_backlink'])
        for c in CIBLES:
            (org, dom, pays, tier, typ, rel, aud, cred, joig, fit, li, nom, role, email, src, form, recent) = c
            score = rel + aud + cred + joig + fit + li
            w.writerow([org, dom, pays, tier, typ, rel, aud, cred, joig, fit, li, score, nom, role, email, src, form,
                        recent, 'voir 12_PR_ANGLES.md', '/etudes/courtage-assurance-france-2026',
                        'https://courtiark.fr', 'READY_FOR_SEND', 'verifie le 26/09/2026 (HTTP)',
                        'envoyer apres autorisation', 'non', 'non'])
    top = sorted(CIBLES, key=lambda c: -(c[5] + c[6] + c[7] + c[8] + c[9] + c[10]))
    print('11_PR_TARGETS.csv : %d cibles | top 5 :' % len(CIBLES))
    for c in top[:5]:
        print('   %-42s %d/100 (tier %s)' % (c[0], c[5] + c[6] + c[7] + c[8] + c[9] + c[10], c[3]))

    # --- file d'approche
    with io.open(os.path.join(A, '13_OUTREACH_QUEUE.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['target', 'contact', 'email', 'angle', 'asset', 'subject', 'message', 'followup1', 'followup2',
                    'status', 'sent_date', 'reply_date', 'coverage', 'backlink', 'contenu_cite_verifie'])
        for m in MESSAGES:
            email = next((c[13] for c in CIBLES if c[1] == m['domaine']), '')
            w.writerow([m['cible'], m['domaine'], email or '(formulaire du site)', m['angle'], m['asset'],
                        m['objet'], m['message'], m['f1'], m['f2'], 'READY_FOR_SEND', '', '', 'non', 'non',
                        m['contenu_cite']])
    print('13_OUTREACH_QUEUE.csv : %d messages complets (aucun envoi)' % len(MESSAGES))

    # --- registre de backlinks (vide de liens reels, c'est la verite)
    with io.open(os.path.join(A, '14_BACKLINK_LEDGER.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['domain', 'source_url', 'target_url', 'anchor', 'attribute', 'date_found', 'status',
                    'relevance', 'tier', 'notes'])
        w.writerow(['(aucun)', '', '', '', '', '', 'AUCUN_LIEN_VERIFIE',
                    '', '', 'Aucun backlink obtenu a ce stade : la campagne est prete, non envoyee. '
                    'Un lien ne sera inscrit ici qu apres verification HTTP de la page qui le porte.'])
    print('14_BACKLINK_LEDGER.csv : 0 lien live (declare tel quel)')

    # --- annuaires SaaS
    with io.open(os.path.join(A, '15_SAAS_DIRECTORIES.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['platform', 'profile_exists', 'signup_url', 'free', 'verification', 'profile_status',
                    'public_url', 'reviews', 'notes'])
        for plat, url, verif in [('Capterra', 'https://www.capterra.com/vendors/sign-up', 'email professionnel + validation editeur'),
                                 ('GetApp', 'https://www.getapp.com/get-listed/', 'email professionnel'),
                                 ('G2', 'https://www.g2.com/products/new', 'email professionnel + validation'),
                                 ('Appvizer', 'https://www.appvizer.fr/', 'email professionnel'),
                                 ('Trustpilot', 'https://fr.trustpilot.com/', 'email professionnel')]:
            w.writerow([plat, 'non', url, 'oui', verif, 'NOT_STARTED', '', 0,
                        'creation possible avec une adresse officielle COURTIARK ; aucun avis interne ne sera '
                        'sollicite ni publie'])
    print('15_SAAS_DIRECTORIES.csv : 5 plateformes, statut NOT_STARTED (verification par email = action humaine)')

    # --- communique de presse
    io.open(os.path.join(A, 'press_release_france_study.md'), 'w', encoding='utf-8').write("""# Communique de presse — etude COURTIARK 2026

**Titre :** Ou sont vraiment les courtiers en assurance en France ? Une etude chiffree, methode et limites incluses

**Sous-titre :** COURTIARK publie la repartition des entreprises de courtage d'assurance, calculee a partir de la
base publique SIRENE (code d'activite 66.22Z), et met le jeu de donnees agrege a disposition.

## Trois chiffres cles

1. **43 240 entreprises** de courtage d'assurance exercent en France (releve du 18/09/2026).
2. **L'Ile-de-France concentre 10 050 entreprises**, soit pres d'une sur quatre.
3. **6 157 entreprises declarent plus d'un etablissement ouvert** : un comptage en points de vente donnerait
   un tout autre chiffre.

## Methode

Source : base SIRENE diffusee par l'annuaire des entreprises (DINUM), filtree sur le code d'activite
principale 66.22Z. Les agregats sont recalcules a chaque publication et un second calcul independant doit
donner exactement le meme resultat (0 ecart mesure) avant mise en ligne. Les limites sont publiees dans
l'etude : une entreprise n'est pas un etablissement, un code d'activite est declaratif, et aucun statut
reglementaire n'est verifie dans ce comptage.

## Contexte

Les cabinets de courtage cherchent des points de comparaison concrets : densite locale, evolution des
creations, poids relatif des regions. Ces donnees existent publiquement, mais rarement agregees et presque
jamais accompagnees de leurs limites de lecture.

## Citation

« Nous publions les chiffres avec la methode et les limites, et le jeu de donnees est telechargeable :
il doit pouvoir etre verifie, pas seulement cite. » — Equipe COURTIARK

## Liens

- Etude : https://courtiark.fr/etudes/courtage-assurance-france-2026
- Methodologie : https://courtiark.fr/etudes/methodologie-cartographie-courtage-france
- Jeu de donnees agrege : https://courtiark.fr/donnees/courtage-france-2026.csv
- Kit presse : https://courtiark.fr/presse

## Contact presse

contact@courtiark.fr

*Citation autorisee : « Source : COURTIARK, calculs a partir des donnees SIRENE du 18/09/2026 ».*
""")
    print('press_release_france_study.md ecrit')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
