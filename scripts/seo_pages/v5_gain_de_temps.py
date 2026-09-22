#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v5_gain_de_temps.py — HUB « GAGNER DU TEMPS » : le pilier existant devient un hub de cluster.

Pourquoi ce module n'écrit pas une nouvelle page : le pilier /fr/gagner-du-temps-courtier-assurance
existe depuis la vague 1 (831 mots, cinq postes de temps perdu, enchaînement concret, signaux, section
de périmètre). Le remplacer ferait perdre ce contenu validé. Ce module RÉCUPÈRE donc la définition
existante et lui AJOUTE la structure de hub : les quatre sources de temps perdu, les dix-huit tâches du
cluster rangées par famille, les liens vers les six pages de tâches, l'outil de mesure et la
bibliothèque de processus.

Décisions : `passA_market_map` (gain de temps = famille manquante n°2) et `passN_redteam_serp`.
Règle : aucun chiffre de temps inventé.
"""
from generate_seo_pillars import PAGES as PILLERS

URL = "fr/gagner-du-temps-courtier-assurance"

BLOC_CLUSTER = """
<h2>Le cluster complet : dix-huit tâches, six familles</h2>
<p>Les cinq postes ci-dessus décrivent où le temps part. Les pages ci-dessous prennent le problème tâche
par tâche, toujours avec la même grille : <strong>problème</strong>, <strong>process manuel</strong>,
<strong>process optimisé</strong>, <strong>automatisation possible</strong>, <strong>ce que COURTIA fait
réellement</strong>, et <strong>ce qui reste humain</strong>. Aucun gain chiffré n'est annoncé : nous
n'avons pas de mesure du temps des cabinets, et nous ne l'inventerons pas.</p>
<ul>
<li><a href="/fr/gain-de-temps/temps-administratif-et-double-saisie">Temps administratif et double saisie</a>
— saisie d'un contrat, ressaisie entre outils, classement d'une pièce.</li>
<li><a href="/fr/gain-de-temps/relances-et-suivi-client">Relances et suivi client</a>
— relance d'une pièce, relance d'un devis, suivi d'un prospect.</li>
<li><a href="/fr/gain-de-temps/documents-et-pieces">Documents et pièces</a>
— demander, retrouver, exploiter une pièce.</li>
<li><a href="/fr/gain-de-temps/renouvellements-et-echeances">Renouvellements et échéances</a>
— détecter une échéance, préparer un renouvellement, comparer des propositions.</li>
<li><a href="/fr/gain-de-temps/sinistres-et-conformite">Sinistres et conformité</a>
— suivre un sinistre, documenter le devoir de conseil, préparer un contrôle.</li>
<li><a href="/fr/gain-de-temps/commissions-et-pilotage">Commissions et pilotage</a>
— rapprocher les commissions, produire un reporting utile, décider par quoi commencer.</li>
</ul>

<h2>Deux principes qui évitent de se tromper de chantier</h2>
<p><strong>On n'automatise pas une étape qui exige un jugement à chaque exécution.</strong> Demander une
pièce est automatisable ; décider si la pièce est suffisante ne l'est pas. <strong>Ce qui se mesure
d'abord s'améliore mieux :</strong> c'est pourquoi les outils ci-dessous partent de vos propres
comptages et pas de nos hypothèses.</p>

<h2>Mesurer, puis décider</h2>
<ul>
<li><a href="/fr/mesurer-temps-administratif-cabinet">Le protocole de mesure</a> — une semaine de
relevés, sans logiciel spécifique.</li>
<li><a href="/fr/outils/calculateur-temps-administratif">Le calculateur de temps administratif</a> —
volume hebdomadaire et mensuel, coût estimé, hypothèses visibles et modifiables.</li>
<li><a href="/fr/outils/calculateur-roi-courtia">Le calculateur de retour sur investissement</a> —
vous choisissez la part de temps réellement récupérable, le calcul fait le reste.</li>
<li><a href="/fr/workflows-courtier-assurance">La bibliothèque de processus</a> — quatorze
enchaînements de travail détaillés, utiles même sans utiliser COURTIA.</li>
<li><a href="/fr/checklists/">Les checklists du cabinet</a> — onboarding client, renouvellement,
collecte documentaire, suivi de sinistre, préparation d'audit.</li>
</ul>
"""


def construire():
    """Retourne la définition du hub : pilier existant + bloc de cluster."""
    definition = dict(PILLERS[URL])
    definition["corps"] = definition["corps"] + "\n" + BLOC_CLUSTER
    definition["description"] = (
        "Où part réellement le temps dans un cabinet de courtage : cinq postes, dix-huit tâches "
        "traitées une par une, deux outils de mesure et une bibliothèque de processus. Aucun gain "
        "chiffré inventé.")
    return definition


PAGES = {URL: construire()}
