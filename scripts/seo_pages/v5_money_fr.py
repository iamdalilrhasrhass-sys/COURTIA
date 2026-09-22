#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v5_money_fr.py — deux pages manquantes repérées par le contrôle qualité automatique.

Le contrôle `scripts/qa_seo.py` a trouvé deux liens internes sans cible publiée :
  - /fr/tarifs-logiciel-courtier (cité par la page d'entité, la page d'essai et le calculateur de ROI) ;
  - /fr/logiciel-courtier-renouvellements (cité par le cluster gagner du temps).

La grille tarifaire publiée ici reprend EXACTEMENT la grille du produit (frontend/src/market/
plansReference.js et backend/src/services/planService.js) : Starter 89 €/mois, Pro 159 €/mois, Cabinet sur
devis, aucun frais d'inscription. Aucun prix n'est inventé, aucune remise n'est annoncée.
"""
PAGES = {}


def fpage(chemin=None, intention=None, liens=None, motscles=None, **kw):
    kw.pop("chemin", None)
    kw["fil"] = [("Accueil", "/"), ("France", "/fr"), (kw["h1"][:44], "/" + chemin.strip("/"))]
    kw["maillage"] = [(titre, "/" + url.strip("/"), "à lire aussi") for url, titre in (liens or [])]
    return kw


PAGES["fr/tarifs-logiciel-courtier"] = fpage(
    chemin="fr/tarifs-logiciel-courtier",
    intention="Le responsable qui veut connaître le prix public avant de tester, et savoir ce qui est "
              "inclus sans avoir à demander un devis pour l'offre d'entrée.",
    liens=[("fr/evaluer-crm-courtier-assurance", "La grille pour évaluer un logiciel de courtage"),
           ("fr/demo-et-essai-gratuit", "Démonstration et essai gratuit"),
           ("fr/logiciel-courtier-assurance", "Le produit, fonction par fonction"),
           ("ch/tarifs-logiciel-courtier-chf", "Les tarifs en Suisse (CHF)")],
    motscles=["tarif logiciel courtier assurance", "prix crm courtage", "abonnement logiciel courtier"],
    titre="Tarifs du logiciel de courtage COURTIA — France (EUR)",
    description="La grille publique en France : Starter 89 €/mois, Pro 159 €/mois, Cabinet sur devis. "
                "Aucun frais d'inscription. Ce qui est inclus dans chaque offre, sans devis obligatoire.",
    h1="Tarifs : la grille publique en France",
    corps="""
<p>Cette page publie la grille telle qu'elle est appliquée dans le produit. Elle existe parce qu'un prix
d'entrée qui oblige à demander un devis n'aide personne à décider.</p>

<h2>France — montants mensuels hors taxes</h2>
<table>
<tr><th>Offre</th><th>Prix</th><th>Frais d'inscription</th><th>Pour qui</th><th>Contenu</th></tr>
<tr><td><strong>Starter</strong></td><td>89 € / mois</td><td>Aucun</td><td>Courtier indépendant</td>
<td>Cockpit de base · assistant ARK limité · relances essentielles · DDA et ORIAS conservés</td></tr>
<tr><td><strong>Pro</strong></td><td>159 € / mois</td><td>Aucun</td><td>Cabinet en croissance</td>
<td>Cockpit complet · assistant ARK au quotidien · opportunités du portefeuille · conformité DDA / RGPD</td></tr>
<tr><td><strong>Cabinet</strong></td><td>Sur devis</td><td>—</td><td>Équipe structurée</td>
<td>Tout le contenu de Pro · multi-utilisateurs · déploiement accompagné · support prioritaire</td></tr>
</table>
<p>Les montants sont mensuels et hors taxes. Aucune remise, aucune promotion et aucun tarif « à partir de »
n'est annoncé ici : ce sont les montants publics.</p>

<h2>Suisse — la grille est distincte</h2>
<p>Un cabinet suisse ne paie pas en euros et ne relève pas des mêmes référentiels : la grille suisse est
publiée séparément, en francs, avec ses propres offres
(<a href="/ch/tarifs-logiciel-courtier-chf">tarifs Suisse en CHF</a>).</p>

<h2>Ce que le prix comprend, et ce qu'il ne comprend pas</h2>
<ul>
<li><strong>Compris :</strong> l'accès au logiciel et aux fonctions de l'offre choisie, pendant la durée de
l'abonnement, pour le nombre d'utilisateurs prévu par l'offre.</li>
<li><strong>Non compris :</strong> les prestations d'accompagnement sur mesure, les développements
spécifiques, et tous les services tiers que vous choisissez par ailleurs (téléphonie, signature
électronique, outils de la compagnie).</li>
</ul>
<p>Les conditions contractuelles — durée, résiliation, données en fin de contrat — figurent dans les
conditions générales et sont accessibles depuis le site. Nous n'en résumons pas les termes ici, pour ne
pas les paraphraser de façon inexacte.</p>

<h2>Combien de temps dois-je récupérer pour que ce soit rentable ?</h2>
<p>C'est une question arithmétique, pas une promesse : le
<a href="/fr/outils/calculateur-roi-courtia">calculateur de retour sur investissement</a> divise
l'abonnement par votre coût horaire et affiche le nombre d'heures à récupérer par mois. Vous fixez
vous-même la part de temps administratif que vous jugez récupérable.</p>
""",
    faq=[
        ("Y a-t-il des frais d'inscription ?",
         "Non : aucun frais d'inscription n'est appliqué sur les offres Starter et Pro."),
        ("L'offre Cabinet est-elle vraiment sur devis ?",
         "Oui : elle dépend du nombre d'utilisateurs et du déploiement, d'où un devis plutôt qu'un montant "
         "unique."),
        ("Les prix peuvent-ils changer ?",
         "Une grille publique peut évoluer ; cette page publie la grille appliquée dans le produit. En cas "
         "de changement, les conditions de votre abonnement en cours restent celles de votre contrat."),
        ("Existe-t-il un essai gratuit ?",
         "Oui, un essai gratuit de 7 jours : voir la page "
         "<a href=\"/fr/demo-et-essai-gratuit\">démonstration et essai</a>."),
    ],
)

PAGES["fr/logiciel-courtier-renouvellements"] = fpage(
    chemin="fr/logiciel-courtier-renouvellements",
    intention="Le courtier qui veut arrêter de découvrir ses échéances et traiter les renouvellements par "
              "paliers.",
    liens=[("fr/gestion-portefeuille-courtier", "Le suivi de portefeuille"),
           ("fr/guide/organiser-renouvellements-courtier", "Guide : organiser ses renouvellements"),
           ("fr/workflows/renouvellement", "Processus : renouvellement par paliers"),
           ("fr/checklists/renouvellement", "Checklist de renouvellement"),
           ("fr/gain-de-temps/renouvellements-et-echeances", "Gagner du temps : renouvellements")],
    motscles=["logiciel renouvellements assurance", "gestion échéances contrats courtier", "suivi renouvellement portefeuille"],
    titre="Gestion des renouvellements et des échéances — COURTIA",
    description="Ce que le logiciel fait réellement sur les renouvellements : échéance portée par le "
                "contrat, vue par période, actions du jour, suivi des pièces et des propositions.",
    h1="Gestion des renouvellements : l'échéance vit sur le contrat, pas dans un agenda",
    corps="""
<p>Un renouvellement ne se joue pas le jour de l'échéance : il se joue à la qualité de ce qui a été
préparé avant. Ce qui change tout n'est donc pas un écran de plus, mais le fait que l'échéance soit
<strong>portée par le contrat lui-même</strong> — donc impossible à perdre dans une liste tenue à part.</p>

<h2>Ce que le produit fait réellement</h2>
<ul>
<li><strong>Échéance enregistrée sur le contrat</strong>, avec la compagnie, le numéro, la prime et le
statut : la date appartient au dossier, pas à un tableur.</li>
<li><strong>Vue par période</strong> : ce qui arrive à échéance dans le mois, le trimestre, l'année —
  c'est ce qui permet de connaître la charge avant la saison, et non pendant.</li>
<li><strong>Liste d'actions du matin</strong> : les dossiers à traiter remontent dans un brief, avec les
propositions sans réponse et les dossiers sans contact depuis longtemps.</li>
<li><strong>État des pièces et des propositions</strong> dans le dossier : ce qui a été demandé au client,
ce qui est reçu, ce qui attend une décision.</li>
<li><strong>Tâches rattachées</strong> : « appeler », « redemander l'attestation », « comparer » — chaque
action a une date et un responsable.</li>
</ul>

<h2>Ce que le produit ne fait pas</h2>
<p>Il n'appelle pas les clients, ne négocie pas avec la compagnie et ne décide pas si un contrat doit être
renouvelé à l'identique. Il ne calcule pas non plus de préavis : les délais dépendent des conditions de
chaque contrat et doivent être vérifiés au cas par cas.</p>

<h2>Comment ça se passe, concrètement</h2>
<ol>
<li>Un contrat est créé dans le dossier du client, avec son échéance.</li>
<li>Trois mois avant, le dossier apparaît dans la vue de période.</li>
<li>La préparation suit vos paliers : qualifier, demander, comparer, décider.</li>
<li>La nouvelle échéance est enregistrée après la décision — c'est cette saisie qui évite de recommencer
    l'an prochain sans trace.</li>
</ol>
<p>Le détail des paliers, utilisable même sans logiciel, est dans le
<a href="/fr/guide/organiser-renouvellements-courtier">guide des renouvellements</a> et le
<a href="/fr/workflows/renouvellement">processus de renouvellement</a>.</p>
""",
    faq=[
        ("Où sont stockées les échéances ?",
         "Sur le contrat, dans le dossier du client : c'est ce qui permet de les regrouper par période."),
        ("Le produit prévient-il automatiquement les clients ?",
         "Non : il prépare et fait remonter ; le cabinet décide du contact et de son moment."),
        ("Puis-je reprendre un portefeuille existant avec ses dates ?",
         "Oui, l'import de portefeuille reprend les contrats ; les dates d'échéance doivent figurer dans "
         "le fichier pour être exploitables."),
        ("Et les échéances déjà passées qu'on découvre ?",
         "Il faut les enregistrer aussi : sans date saisie, la même découverte se reproduce l'année "
         "suivante."),
    ],
)
