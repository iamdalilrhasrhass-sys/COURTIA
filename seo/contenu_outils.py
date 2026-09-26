#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Outils gratuits supplementaires et contenu telechargeable.

Regles tenues :
- toutes les formules sont publiees sur la page ;
- aucun resultat n'est presente comme une promesse de gain ;
- aucune donnee saisie n'est transmise (traitement dans le navigateur) ;
- les checklists sont utilisables sans formulaire prealable.
"""
from contenu_core import section, ul, p, tableau, etapes


def _checklist(prefixe, sections_):
    """Construit une checklist accessible (fieldset/legend, cases nommees)."""
    blocs = []
    n = 0
    for titre, items in sections_:
        lignes = []
        for item in items:
            n += 1
            cid = f"{prefixe}-{n}"
            lignes.append(f'<li><input type="checkbox" id="{cid}"> <label for="{cid}">{item}</label></li>')
        blocs.append(f'<fieldset><legend>{titre}</legend><ul>{"".join(lignes)}</ul></fieldset>')
    return ''.join(blocs), n


DOSSIER_SECTIONS = [
    ("Identité et coordonnées", [
        "Identité du souscripteur vérifiée (pièce d'identité si le dossier l'exige)",
        "Coordonnées à jour : adresse, téléphone, e-mail professionnel",
        "Situation de famille connue et consignée",
        "Profession ou activité exacte, y compris les activités secondaires"]),
    ("Besoin et conseil", [
        "Besoins et exigences du client recueillis et écrits (pas seulement évoqués)",
        "Antécédents d'assurance et sinistres connus",
        "Conseil donné, avec sa motivation",
        "Réserves ou refus du client consignés"]),
    ("Pièces du dossier", [
        "Pièces demandées listées et rattachées au dossier",
        "Pièces reçues datées et classées",
        "Pièces manquantes signalées au client",
        "Documents illisibles redemandés"]),
    ("Devis et comparaison", [
        "Devis enregistrés avec leur date et leur assureur",
        "Options écartées identifiées et raisons notées",
        "Étape en cours du devis à jour (envoyé, relancé, accepté, refusé)"]),
    ("Souscription et signature", [
        "Décision du client consignée",
        "Documents signés conservés",
        "Date d'effet des garanties notée",
        "Informations précontractuelles transmises et traçables"]),
    ("Contrat et échéances", [
        "Contrat rattaché au client avec son échéance",
        "Conditions particulières connues",
        "Prélèvement et moyen de paiement vérifiés",
        "Date de premier avis enregistrée pour éviter un impayé"]),
    ("Suivi et renouvellement", [
        "Échéance visible dans le suivi du portefeuille",
        "Prochaine action planifiée (contact, point annuel)",
        "Évolution de la situation du client à réévaluer",
        "Historique des échanges accessible à un autre collaborateur"]),
]

RENOUV_SECTIONS = [
    ("Préparer (90 jours avant)", [
        "Tous les contrats à échéance identifiés",
        "Client contacté pour fixer un rendez-vous",
        "Dossier vérifié : pièces, coordonnées, situation",
        "Historique relu avant l'échange"]),
    ("Réévaluer avec le client", [
        "Situation actuelle confirmée (famille, activité, biens)",
        "Besoins nouveaux recensés",
        "Couverture actuelle expliquée au client",
        "Écarts entre la situation réelle et le contrat identifiés"]),
    ("Comparer et décider", [
        "Devis demandés là où c'est pertinent",
        "Comparaison expliquée, pas seulement chiffrée",
        "Recommandation écrite et motivée",
        "Décision du client consignée (reconduction, modification, résiliation)"]),
    ("Exécuter et tracer", [
        "Documents de résiliation ou d'avenant préparés",
        "Dates de fin et de début de garantie vérifiées (pas de trou de couverture)",
        "Pièces reçues classées dans le dossier",
        "Échéance suivante enregistrée"]),
]

LEADMAGNET_POINTS = [
    "Un seul endroit pour la fiche client : contacts, contrats, échéances, documents, historique.",
    "Une convention de nommage des dossiers, appliquée par tous",
    "Une règle écrite pour la première relance d'un devis",
    "Un responsable désigné par type de relance",
    "Une revue hebdomadaire des dossiers bloqués",
    "Les pièces attendues standardisées par type de dossier",
    "Un lien de dépôt pour que le client envoie ses documents sans compte",
    "La liste des pièces manquantes mise à jour à chaque réception",
    "Les échéances saisies au moment de la souscription, pas plus tard",
    "Une vue des échéances à 90 jours",
    "Une préparation de renouvellement démarrée 60 jours avant",
    "Un compte rendu consigné après chaque échange client",
    "Les décimales et les unités fixées une fois pour toutes (euros, francs, HT/TTC)",
    "Un import du portefeuille existant plutôt qu'une ressaisie",
    "Aucun dossier sans échéance ni sans prochaine action",
    "Les commissions suivies par dossier, pas en fin d'année",
    "Les accès nominatifs, jamais de compte partagé",
    "Les départs de collaborateur anticipés : rien ne doit vivre dans une seule tête",
    "Un contrôle mensuel des dossiers incomplets",
    "Une mesure simple de l'activité : devis en cours, gagnés, perdus",
    "Les données de santé exclues de toute prospection",
    "Une procédure claire d'opposition à la prospection",
    "Les documents exportables à tout moment (pas de dépendance à l'éditeur)",
    "Une revue de portefeuille annuelle planifiée",
    "Un point de sortie écrit : ce que fait le cabinet quand il change d'outil",
]


def pages_outils():
    P = []

    # ---------------------------------------------------- OUTIL 2 : taux de transformation
    P.append(dict(
        path='/outils/calculateur-taux-transformation-assurance', type='tool', country='FR', indexable=True,
        title="Calculateur de taux de transformation — courtier assurance | COURTIARK",
        description="Mesurez vos taux lead → devis, devis → contrat et global, et le nombre de devis non convertis. "
                    "Formules affichées, calcul dans votre navigateur, aucune donnée transmise.",
        h1="Calculateur de taux de transformation",
        chapeau="Trois chiffres suffisent pour savoir où votre cabinet perd des affaires : les leads entrants, les "
                "devis émis, les contrats signés sur la même période.",
        fil=[("Outils", "/outils"), ("Calculateur de taux de transformation", None)],
        corps='''
<div class="section">
  <div class="champ"><label for="t-leads">Leads entrants sur la période</label><input id="t-leads" type="number" min="0" max="100000" value="60"></div>
  <div class="champ"><label for="t-devis">Devis émis sur la même période</label><input id="t-devis" type="number" min="0" max="100000" value="35"></div>
  <div class="champ"><label for="t-contrats">Contrats signés sur la même période</label><input id="t-contrats" type="number" min="0" max="100000" value="12"></div>
  <button class="principal" type="button" id="t-calc">Calculer</button>
  <div class="resultat" id="t-resultat" aria-live="polite"><p class="note">Renseignez vos valeurs puis lancez le calcul.</p></div>
</div>
<script src="/js/outil-transformation.js" defer></script>
'''
        + section("Les formules utilisées",
                  tableau(["Indicateur", "Calcul"],
                          [["Lead → devis", "devis ÷ leads × 100"],
                           ["Devis → contrat", "contrats ÷ devis × 100"],
                           ["Taux global", "contrats ÷ leads × 100"],
                           ["Devis non convertis", "devis − contrats"]])
                  + p("Aucune valeur n'est envoyée : le calcul s'exécute dans votre navigateur.")
                  + p("L'hypothèse de récupération de 20 % affichée dans le résultat est un exemple explicite, "
                      "pas une performance mesurée chez nous.")),
        faq=[("Pourquoi suivre deux taux plutôt qu'un seul ?",
              "Parce qu'ils ne se corrigent pas de la même façon : un taux lead → devis faible indique un problème de "
              "qualification ou de réponse, un taux devis → contrat faible indique un problème de suivi ou de conseil."),
             ("Ces chiffres sont-ils envoyés quelque part ?", "Non : le calcul est local, rien n'est transmis ni enregistré.")],
        lire=[("Guide : ne plus oublier les relances", "/guides/comment-ne-plus-oublier-relances-courtier"),
              ("Relance de devis", "/fonctionnalites/relance-devis-assurance"),
              ("Calculateur de charge administrative", "/outils/calculateur-productivite-courtier")],
        cta_final=('/fonctionnalites/relance-devis-assurance', 'Piloter mes opportunités avec COURTIARK'),
    ))

    # ---------------------------------------------------- OUTIL 3 : checklist dossier
    corps_dossier, n_dossier = _checklist('dossier', DOSSIER_SECTIONS)
    P.append(dict(
        path='/outils/checklist-dossier-courtier-assurance', type='tool', country='FR', indexable=True,
        title="Checklist dossier courtier assurance — les points à ne pas manquer | COURTIARK",
        description="Une checklist de dossier client pour cabinet de courtage : identité, besoin, conseil, pièces, "
                    "devis, signature, contrat, suivi. Utilisable sans formulaire, imprimable.",
        h1="Checklist d'un dossier client en courtage d'assurance",
        chapeau=f"{n_dossier} points de contrôle, de l'ouverture du dossier au renouvellement. Cochez ce qui est fait : "
                "votre avancement est conservé dans votre navigateur, imprimable pour un contrôle interne.",
        fil=[("Outils", "/outils"), ("Checklist dossier", None)],
        corps=f'''
<div class="section">
  <p id="chk-resume" aria-live="polite" class="note"></p>
  <form id="chk-dossier">{corps_dossier}</form>
  <div class="cta">
    <button class="principal" type="button" id="chk-print">Imprimer / exporter en PDF</button>
    <button type="button" id="chk-reset">Réinitialiser</button>
  </div>
  <p class="note">Aucune donnée n'est transmise : les cases cochées restent dans votre navigateur (stockage local).</p>
</div>
<script src="/js/checklist-dossier.js" defer></script>
'''
        + section("Comment l'utiliser",
                  ul(["Une checklist n'est utile que si elle est relue : faites-en un contrôle mensuel par échantillon de dossiers.",
                      "Les points « conseil » et « pièces » sont ceux qui font défaut dans un audit interne.",
                      "Une case non cochée n'est pas une faute : c'est une action à planifier."]))
        + section("Ce que COURTIARK change",
                  p("Les points de cette checklist deviennent des données du dossier : les pièces manquantes remontent "
                    "d'elles-mêmes, les échéances sont visibles, et l'historique reste lisible par un autre collaborateur.")),
        faq=[("Puis-je imprimer la checklist vierge pour l'équipe ?", "Oui : le bouton d'impression produit une version papier ou PDF."),
             ("La checklist est-elle conservée d'une visite à l'autre ?", "Oui, dans votre navigateur (stockage local), sans envoi sur un serveur.")],
        lire=[("Checklist renouvellement", "/outils/checklist-renouvellement-assurance"),
              ("Gestion des documents", "/fonctionnalites/gestion-documents-assurance"),
              ("Guide : centraliser les documents clients", "/guides/centraliser-documents-clients-assurance")],
        cta_final=('/register', 'Centraliser mes dossiers dans COURTIARK'),
    ))

    # ---------------------------------------------------- OUTIL 4 : checklist renouvellement
    corps_renouv, n_renouv = _checklist('renouv', RENOUV_SECTIONS)
    P.append(dict(
        path='/outils/checklist-renouvellement-assurance', type='tool', country='FR', indexable=True,
        title="Checklist renouvellement assurance — préparer une échéance | COURTIARK",
        description="La séquence complète d'un renouvellement de contrat d'assurance : préparation, réévaluation avec "
                    "le client, comparaison, décision, exécution et traçabilité. Checklist interactive et imprimable.",
        h1="Checklist de renouvellement d'un contrat d'assurance",
        chapeau=f"{n_renouv} points, organisés dans l'ordre réel d'un renouvellement — de la préparation 90 jours avant "
                "à la trace laissée dans le dossier.",
        fil=[("Outils", "/outils"), ("Checklist renouvellement", None)],
        corps=f'''
<div class="section">
  <p id="renouv-resume" aria-live="polite" class="note"></p>
  <form id="chk-renouv">{corps_renouv}</form>
  <div class="cta">
    <button class="principal" type="button" id="renouv-print">Imprimer / exporter en PDF</button>
    <button type="button" id="renouv-reset">Réinitialiser</button>
  </div>
  <p class="note">Aucune donnée n'est transmise : les cases cochées restent dans votre navigateur.</p>
</div>
<script src="/js/checklist-renouvellement.js" defer></script>
'''
        + section("Le point le plus souvent oublié",
                  p("La vérification des dates de fin et de début de garantie lors d'un changement d'assureur. Un "
                    "chevauchement coûte au client, un trou de couverture peut lui coûter beaucoup plus."))
        + section("Repères par marché",
                  p('France : devoir de conseil et information précontractuelle (DDA), immatriculation ORIAS. '
                    'Suisse : cadre de la loi sur le contrat d\'assurance et exigences propres à l\'intermédiaire. '
                    'Détail et sources : <a href="/france">France</a> · <a href="/suisse">Suisse</a>.')),
        faq=[("Combien de temps avant l'échéance faut-il commencer ?",
              "La séquence de cette checklist suppose un démarrage environ 90 jours avant l'échéance : c'est ce qui permet "
              "de préparer le rendez-vous, de comparer et de décider sans précipitation."),
             ("La checklist remplace-t-elle un logiciel ?",
              "Non : elle sert de contrôle interne. Un outil rend ces points visibles en permanence, au lieu d'être relus "
              "ponctuellement.")],
        lire=[("Renouvellements", "/fonctionnalites/renouvellements-assurance"),
              ("Guide : automatiser les renouvellements", "/guides/automatiser-renouvellements-assurance"),
              ("Checklist dossier", "/outils/checklist-dossier-courtier-assurance")],
        cta_final=('/register', 'Suivre mes échéances dans COURTIARK'),
    ))

    # ---------------------------------------------------- LEAD MAGNET
    P.append(dict(
        path='/guides/organiser-cabinet-courtage-25-points', type='guide', country='FR', indexable=True,
        title="25 points pour organiser un cabinet de courtage | COURTIARK",
        description="Une checklist complète pour organiser un cabinet de courtage : dossiers, relances, pièces, "
                    "échéances, commissions, accès, mesure. Utilisable immédiatement, sans formulaire.",
        h1="25 points pour organiser un cabinet de courtage",
        chapeau="Cette liste est utilisable telle quelle, dès aujourd'hui, sans logiciel. Elle sert aussi de grille de "
                "contrôle si vous évaluez un outil de gestion.",
        fil=[("Guides", "/guides"), ("25 points pour organiser un cabinet", None)],
        corps=section("La liste",
                      '<ol>' + ''.join(f'<li>{x}</li>' for x in LEADMAGNET_POINTS) + '</ol>'
                      + p('<a class="principal" href="/ressources/checklist-25-points-organiser-cabinet-courtage.pdf">'
                          'Télécharger la version PDF (sans formulaire)</a>'))
        + section("Comment s'en servir",
                  etapes([("Aujourd'hui", "Cochez ce qui est déjà en place. Ne cherchez pas à tout corriger."),
                          ("Cette semaine", "Traitez les deux points qui bloquent le plus le suivi au quotidien."),
                          ("Ce mois", "Transformez trois points en règle écrite, connue de l'équipe."),
                          ("Ensuite", "Relisez la liste une fois par trimestre : elle vieillit avec le cabinet.")]))
        + section("Le point qui compte le plus",
                  p("Aucun dossier ne doit vivre dans la tête d'une seule personne. Tout le reste en découle : si "
                    "l'information est dans l'outil et datée, les relances, les échéances et les pièces suivent.")),
        faq=[("Faut-il un logiciel pour appliquer cette liste ?",
              "Non, la liste fonctionne avec un tableur. Un outil spécialisé rend simplement ces règles permanentes au "
              "lieu d'être des résolutions."),
             ("Le PDF demande-t-il mes coordonnées ?", "Non : le téléchargement est direct, sans formulaire.")],
        lire=[("Checklist dossier", "/outils/checklist-dossier-courtier-assurance"),
              ("Guide : organiser un portefeuille", "/guides/organiser-portefeuille-assurance"),
              ("Le CRM courtier assurance", "/crm-courtier-assurance")],
    ))
    return P
