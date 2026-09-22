#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
desambiguiser_pages.py — DÉSAMBIGUÏSATION DES PAGES QUI SE CHEVAUCHENT (décisions JEV).

Source des décisions : appel TypeSafe réel `passI_cannibalisation` du 22/09/2026.

Le modèle a signalé un recouvrement pour cinq paires de pages. Le remède retenu n'est jamais la
suppression d'une page qui apporte quelque chose : il consiste à écrire explicitement le PÉRIMÈTRE de
chacune et à les relier entre elles. Deux exceptions près, assumées : on ne fusionne pas une page
d'entrée suisse dont le mot-clé (intermédiaire d'assurance) est un terme du marché local, ni un guide
qui porte une méthode — on les distingue.

Paires signalées et traitement :
  relances (0,64)            → périmètre croisé (produit ↔ méthode)
  CH pilier / intermédiaire  (0,61) → périmètre croisé (produit et offres ↔ vocabulaire et cadre)
  documentaire / IA doc.     (0,55) → périmètre croisé (collecte et trace ↔ extraction assistée)
  prospects / guide pipeline (0,53) → périmètre croisé (outil ↔ méthode)
  gain de temps / mesure     (0,50) → périmètre croisé (où le temps se perd ↔ comment le mesurer)

Le script est idempotent (marqueur) et n'écrit rien si le bloc est déjà présent.
"""
import os
import sys

PUBLIC = "/srv/courtia/frontend/public"
MARQUEUR = "<!-- perimetre:jev-20260922 -->"
ANCRES = ['<div class="cta">', '<p><a class="cta"', "</main>", "<footer"]

BLOCS = {
    "fr/relance-client-assurance": """
  <section>
    <h2>Périmètre de cette page</h2>
    <p>Cette page présente <strong>ce que le produit fait des relances</strong> : ce qui est suivi,
    ce qui est préparé, ce qui reste à valider. La méthode — quel rythme, quels motifs, quand arrêter —
    est traitée séparément dans <a href="/fr/guide/automatiser-relances-courtier">automatiser ses
    relances sans abîmer la relation client</a>.</p>
  </section>
""",
    "fr/guide/automatiser-relances-courtier": """
  <section>
    <h2>Périmètre de cette page</h2>
    <p>Cette page est une <strong>méthode</strong> : elle décide quoi relancer, à quel rythme et dans
    quel ordre, quel que soit l'outil. Ce que le produit fait concrètement de ces relances est décrit
    dans <a href="/fr/relance-client-assurance">les relances dans COURTIA</a>.</p>
  </section>
""",
    "ch/logiciel-courtier-assurance-suisse": """
  <section>
    <h2>Périmètre de cette page</h2>
    <p>Ici : <strong>le produit et les offres</strong> pour un cabinet suisse — ce qu'il fait, en
    francs suisses, avec la grille et la facturation locales. Le vocabulaire du marché et le cadre
    applicable (intermédiaire d'assurance, journal de conseil) sont traités dans
    <a href="/ch/logiciel-intermediaire-assurance-suisse">intermédiaire d'assurance : un logiciel qui
    parle le langage de la Suisse</a>.</p>
  </section>
""",
    "ch/logiciel-intermediaire-assurance-suisse": """
  <section>
    <h2>Périmètre de cette page</h2>
    <p>Ici : <strong>le vocabulaire et le cadre</strong> d'un cabinet suisse (preneur d'assurance,
    journal de conseil, UID, canton) et ce que cela change dans un dossier. La vue d'ensemble du
    produit, ses fonctions et ses offres sont sur <a href="/ch/logiciel-courtier-assurance-suisse">le
    logiciel de courtage en Suisse</a>.</p>
  </section>
""",
    "fr/gestion-documentaire-courtier-assurance": """
  <section>
    <h2>Périmètre de cette page</h2>
    <p>Ici : <strong>la collecte et la traçabilité</strong> — demander une pièce, la recevoir, la
    rattacher au dossier, tracer ce qui a été produit et remis. La lecture assistée d'une pièce
    (extraction et confirmation) est décrite sur <a href="/fr/ia-gestion-documentaire-assurance">IA
    documentaire</a>.</p>
  </section>
""",
    "fr/ia-gestion-documentaire-assurance": """
  <section>
    <h2>Périmètre de cette page</h2>
    <p>Ici : <strong>l'extraction assistée</strong> — ce qu'un outil peut lire dans une pièce et ce
    qu'il ne doit pas décider. Le mécanisme de collecte, de rattachement et de traçabilité des
    documents est décrit sur <a href="/fr/gestion-documentaire-courtier-assurance">la gestion
    documentaire</a>.</p>
  </section>
""",
    "fr/gestion-prospects-clients-courtier-assurance": """
  <section>
    <h2>Périmètre de cette page</h2>
    <p>Ici : <strong>ce que le produit fait</strong> du parcours prospect → client (fiche, pipeline,
    passage en client sans ressaisie). La méthode pour structurer ce pipeline et ses motifs de sortie
    est dans <a href="/fr/guide/structurer-pipeline-courtier">le guide du pipeline commercial</a>.</p>
  </section>
""",
    "fr/guide/structurer-pipeline-courtier": """
  <section>
    <h2>Périmètre de cette page</h2>
    <p>Ici : <strong>la méthode</strong> — combien d'étapes, quels critères de sortie, quel rythme de
    contact. L'outil qui porte ce pipeline au quotidien est décrit dans
    <a href="/fr/gestion-prospects-clients-courtier-assurance">gérer prospects et clients</a>.</p>
  </section>
""",
    "fr/gagner-du-temps-courtier-assurance": """
  <section>
    <h2>Périmètre de cette page</h2>
    <p>Ici : <strong>où le temps se perd</strong> et ce qui peut changer, poste par poste. Pour
    chiffrer votre propre situation avant d'agir, la méthode de mesure est sur
    <a href="/fr/mesurer-temps-administratif-cabinet">mesurer son temps administratif</a>.</p>
  </section>
""",
    "fr/mesurer-temps-administratif-cabinet": """
  <section>
    <h2>Périmètre de cette page</h2>
    <p>Ici : <strong>la mesure</strong> — quatre comptages faits à la main, sans outil. L'analyse des
    postes où le temps se perd, et ce qui peut être automatisé, est sur
    <a href="/fr/gagner-du-temps-courtier-assurance">gagner du temps en cabinet de courtage</a>.</p>
  </section>
""",
}

# Pages anciennes à enrichir (passe I : « enrichir les pages anciennes faibles », 0,54)
ALTERNATIVES = {
    "fr/alternative-courtigo": ("CourtiGo", "/fr/comparatif/crm-specialise-vs-crm-generaliste"),
    "fr/alternative-kase": ("Kase", "/fr/comparatif/crm-specialise-vs-crm-generaliste"),
    "fr/alternative-lya": ("Lya", "/fr/comparatif/crm-specialise-vs-crm-generaliste"),
    "fr/alternative-oggo-data": ("Oggo Data", "/fr/comparatif/crm-specialise-vs-crm-generaliste"),
}


def bloc_alternative(nom, lien):
    return f"""
  <section>
    <h2>Ce que cette page compare, et ce qu'elle ne compare pas</h2>
    <p>Cette page répond à une question précise : « j'utilise {nom} (ou je l'évalue), qu'est-ce qui
    change si je regarde COURTIA ? ». Elle décrit donc <strong>ce que fait COURTIA</strong> et les
    critères sur lesquels un cabinet peut comparer.</p>
    <p>Elle ne publie <strong>ni les tarifs, ni une liste de fonctionnalités de {nom}</strong> : nous
    ne pouvons pas vérifier l'offre d'un autre éditeur à une date donnée, et une comparaison bâtie sur
    des informations non vérifiées serait trompeuse. Pour comparer les catégories d'outils plutôt que
    les marques : <a href="{lien}">CRM spécialisé ou CRM généraliste</a>.</p>
    <p><strong>Comment comparer honnêtement, en une heure :</strong> reprenez les cinq questions
    éliminatoires de la page <a href="/fr/guide/choisir-crm-cabinet-courtage">comment choisir un CRM
    pour un cabinet de courtage</a> et posez-les aux deux outils, sur vos propres dossiers.</p>
  </section>
"""


def inserer(chemin, bloc):
    f = os.path.join(PUBLIC, chemin, "index.html")
    if not os.path.isfile(f):
        return f"fichier absent : {chemin}"
    html = open(f, encoding="utf-8").read()
    if MARQUEUR in html:
        return None
    ancre = next((a for a in ANCRES if a in html), None)
    if ancre is None:
        return f"aucun point d'insertion : {chemin}"
    html = html.replace(ancre, MARQUEUR + bloc + ancre, 1)
    open(f, "w", encoding="utf-8").write(html)
    return None


def main():
    problemes = []
    for chemin, bloc in BLOCS.items():
        erreur = inserer(chemin, bloc)
        if erreur:
            problemes.append(erreur)
    for chemin, (nom, lien) in ALTERNATIVES.items():
        erreur = inserer(chemin, bloc_alternative(nom, lien))
        if erreur:
            problemes.append(erreur)
    print(f"périmètres posés : {len(BLOCS)} page(s) | comparatifs enrichis : {len(ALTERNATIVES)} page(s)")
    if problemes:
        print("PROBLÈMES :")
        for p in problemes:
            print("   ", p)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
