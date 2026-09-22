#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
enrichir_pages_metier.py — ENRICHISSEMENT DES PAGES MÉTIER LES PLUS FAIBLES.

Levier JEV (passe I : « enrichir les pages anciennes faibles », 0,54). Les pages métier publiées en
vague 1 s'arrêtaient entre 469 et 620 mots pour les plus courtes, sans dire ce qui est spécifique à
la branche dans le travail du cabinet. On ajoute à chacune une section « ce qui est spécifique » :
des situations réelles de la branche et ce que le produit y apporte, sans promesse de tarification ni
de souscription automatique (qui n'existent pas dans le produit).

Idempotent (marqueur).
"""
import os
import sys

PUBLIC = "/srv/courtia/frontend/public"
MARQUEUR = "<!-- metier-enrichi:jev-20260922 -->"
ANCRES = ['<div class="cta">', '<p><a class="cta"', "</main>", "<footer"]

PAGES = {
    "fr/logiciel-courtier-mutuelle": """
<h2>Ce qui est spécifique à un portefeuille mutualiste</h2>
<p>Un cabinet qui travaille avec des mutuelles suit souvent des adhérents plutôt que des clients
classiques : la relation passe par une structure collective, mais le dossier, lui, reste individuel —
contrats, ayants droit, échéances, pièces. Ce qui change dans le travail quotidien :</p>
<ul>
<li><strong>Plusieurs personnes sur un même dossier</strong> — l'adhérent, ses ayants droit, parfois
l'employeur ou la structure : savoir qui est couvert par quoi devient une question fréquente.</li>
<li><strong>Des échéances liées au contrat collectif</strong> — les dates ne sont pas forcément
alignées sur celles des contrats individuels du même client.</li>
<li><strong>Des pièces de situation à renouveler</strong> — attestations, justificatifs d'ayants
droit, changements de situation familiale.</li>
<li><strong>Une exigence de traçabilité</strong> — ce qui a été présenté et remis doit pouvoir être
restitué, comme dans les autres branches.</li>
</ul>
<p>COURTIA tient l'ensemble dans le même dossier : contrats et échéances avec la devise du marché,
pièces suivies et datées, propositions avec leur état, commissions par partenaire. Le produit
n'intervient ni dans la gestion des adhésions collectives ni dans la tarification, qui restent chez la
mutuelle.</p>
""",
    "fr/logiciel-courtier-sante": """
<h2>Ce qui est spécifique à la santé</h2>
<p>La santé est une branche où le dossier vit longtemps et bouge souvent : changement de situation,
arrivée d'un enfant, passage d'un statut à un autre, résiliation pour cause d'embauche. Trois
caractéristiques pèsent dans le quotidien du cabinet :</p>
<ul>
<li><strong>Des événements déclencheurs</strong> — une mutation, un mariage, une naissance sont
autant de moments où le contrat doit être revu ; ils se découvrent s'ils sont rattachés au dossier.</li>
<li><strong>Des pièces sensibles</strong> — la santé est une donnée personnelle particulière : la
limiter au nécessaire et la limiter en accès n'est pas un détail.</li>
<li><strong>Des échéances et des résiliations</strong> — un contrat santé se perd souvent par oubli
de formalité, pas par insatisfaction.</li>
</ul>
<p>COURTIA apporte le dossier unique, l'historique daté, la collecte de pièces par lien et le suivi
des échéances, avec les accès limités aux personnes concernées. Il ne calcule aucune prestation et
ne se substitue pas aux outils de la complémentaire santé.</p>
""",
    "fr/logiciel-courtier-multi-agences": """
<h2>Ce qui est spécifique à une structure multi-agences</h2>
<p>Dès qu'un cabinet a plusieurs sites, le problème change de nature : ce n'est plus « où est le
dossier » mais « qui fait quoi, où, et avec quel accès ». Quatre sujets structurent la vie d'une
structure multi-agences :</p>
<ul>
<li><strong>La répartition des portefeuilles</strong> — chaque agence, chaque collaborateur doit
savoir ce qui lui revient, sans que le client change d'interlocuteur à chaque appel.</li>
<li><strong>Les accès différenciés</strong> — tous les sites n'ont pas à voir tous les dossiers :
les rôles et le cloisonnement ne sont pas une option.</li>
<li><strong>Le pilotage consolidé</strong> — comparer l'activité des sites suppose des indicateurs
calculés de la même façon partout, sur les données réellement saisies.</li>
<li><strong>La continuité</strong> — le départ d'un collaborateur ou la fermeture d'un site ne doit
pas faire disparaître l'historique des dossiers.</li>
</ul>
<p>COURTIA est prévu pour plusieurs utilisateurs par cabinet, avec des rôles et des données
cloisonnées par cabinet, des tâches affectées et un pilotage commun. Une agence ne voit que ce qui la
concerne ; la direction voit l'ensemble.</p>
""",
}


def main():
    poses, problemes = [], []
    for chemin, bloc in PAGES.items():
        f = os.path.join(PUBLIC, chemin, "index.html")
        if not os.path.isfile(f):
            problemes.append(f"absent : {chemin}")
            continue
        html = open(f, encoding="utf-8").read()
        if MARQUEUR in html:
            continue
        ancre = next((a for a in ANCRES if a in html), None)
        if ancre is None:
            problemes.append(f"point d'insertion introuvable : {chemin}")
            continue
        html = html.replace(ancre, MARQUEUR + bloc + ancre, 1)
        open(f, "w", encoding="utf-8").write(html)
        poses.append(chemin)
    print(f"pages métier enrichies : {len(poses)}")
    for p in poses:
        print("   ", p)
    if problemes:
        print("PROBLÈMES :")
        for p in problemes:
            print("   ", p)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
