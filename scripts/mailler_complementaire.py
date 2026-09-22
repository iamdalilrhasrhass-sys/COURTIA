#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
mailler_complementaire.py — MAILLAGE À GRANDE ÉCHELLE (étape 6bis de scripts/seo_pipeline.py).

Trois actions mesurées sur les fichiers publiés :

1. PAGES ORPHELINES — comptées par les liens entrants internes. Trois pages n'en avaient aucun
   (grossiste, mandataire, tns) : une page sans lien entrant est une page que personne ne trouve, ni
   un visiteur ni un robot. On insère un bloc « Pour aller plus loin » sur des pages hôtes pertinentes.

2. PAGES SANS LIEN SORTANT — toute page indexable doit mener quelque part (au moins deux liens vers des
   pages du même silo). Vérifié sur les fichiers servis, pas dans l'intention.

3. DEUX FONCTIONS ÉCARTÉES PAR LE SEUIL — l'appel TypeSafe `passL_fonctionnalites` a placé l'extraction
   documentaire et les modèles d'e-mails à 0,62 (sous le seuil de 0,70 appliqué pour créer une page).
   Décision : ne pas créer de page, mais décrire ces deux fonctions réelles dans les pages existantes
   qui les portent déjà (IA documentaire, relances).

Idempotent par marqueur. Aucun contenu inventé : les descriptions reprennent le comportement réel des
modules du produit.
"""
import html
import os
import re
import sys

PUBLIC = "/srv/courtia/frontend/public"
MARQUEUR = "<!-- maillage-complementaire:jev-20260922 -->"
ANCRES = ['<div class="cta">', '<p><a class="cta"', "</main>", "<footer"]

# Pages hôtes → liens à ajouter (chemin cible, libellé, phrase de contexte)
HOSTS = {
    "fr": [
        ("fr/outils/", "Les trois outils gratuits",
         "mesurer le temps administratif, calculer un seuil de rentabilité, diagnostiquer l'automatisation"),
        ("fr/workflows-courtier-assurance", "La bibliothèque de processus",
         "quatorze enchaînements de travail détaillés, utilisables sans logiciel"),
        ("fr/checklists/", "Les checklists du cabinet",
         "onboarding, renouvellement, collecte documentaire, sinistre, organisation, contrôle"),
        ("fr/glossaire/", "Le glossaire du courtage",
         "quinze notions expliquées avec leur usage réel dans un cabinet"),
        ("fr/gagner-du-temps-courtier-assurance", "Gagner du temps : le cluster complet",
         "dix-huit tâches traitées une par une, du process manuel au process tenu"),
    ],
    "fr/logiciel-courtier-assurance": [
        ("fr/logiciel-courtier-grossiste", "Logiciel pour courtier grossiste",
         "le suivi de plusieurs apporteurs et de leurs portefeuilles"),
        ("fr/logiciel-courtier-mandataire", "Logiciel pour mandataire d'assurance",
         "le travail du mandataire, avec ses mandats et ses compagnies"),
        ("fr/logiciel-courtier-tns", "Logiciel pour courtier travaillant seul",
         "le cabinet à une personne, où le temps administratif se paie directement"),
    ],
    "fr/gestion-portefeuille-courtier": [
        ("fr/logiciel-courtier-grossiste", "Logiciel pour courtier grossiste",
         "quand le portefeuille est détenu par des apporteurs plutôt qu'en direct"),
        ("fr/logiciel-courtier-mandataire", "Logiciel pour mandataire d'assurance",
         "quand l'activité se fait sous mandat de compagnies"),
    ],
    "fr/organisation-cabinet-courtage": [
        ("fr/logiciel-courtier-tns", "Logiciel pour courtier travaillant seul",
         "quand il n'y a personne pour absorber l'administratif à votre place"),
    ],
}

# Fonctions réelles à décrire dans les pages qui les portent déjà (seuil 0,70 non atteint pour une page)
COMPLEMENTS = {
    "fr/ia-gestion-documentaire-assurance": """
<h2>Ce que l'extraction sait lire, concrètement</h2>
<p>Au-delà du tri, la lecture assistée d'un document extrait des données précises, que le courtier
vérifie avant de les appliquer au dossier :</p>
<ul>
<li><strong>Des documents d'identité et bancaires</strong> — un RIB, par exemple, pour éviter de
recopier un IBAN à la main, caractère par caractère.</li>
<li><strong>Des documents de véhicule</strong> — une carte grise, pour relever l'immatriculation, la
marque et le numéro de série sans ressaisie.</li>
<li><strong>Des pièces administratives courantes</strong> — selon les types reconnus par le produit.</li>
</ul>
<p>Le principe reste le même pour tous : le document est déposé, les données sont proposées, le
courtier applique. Une extraction n'écrit jamais dans un dossier sans validation, et le résultat est
conservé pour être relu.</p>
""",
    "fr/relance-client-assurance": """
<h2>Des modèles de messages, pour ne pas réécrire dix fois le même mail</h2>
<p>Une relance efficace dit la même chose à chaque fois : ce qui est attendu, pour quelle date, et ce
qui se passe ensuite. Le produit propose des modèles de messages, adaptés à l'objet du message, à
partir desquels la relance est préparée puis validée.</p>
<ul>
<li><strong>Des modèles par objet</strong> — demande de pièce, rappel d'échéance, réponse à une
demande de devis.</li>
<li><strong>Une préparation avant envoi</strong> — le message est proposé dans le dossier concerné, le
courtier relit et modifie avant que quoi que ce soit ne parte.</li>
<li><strong>Aucun envoi automatique</strong> — le déclenchement vient du cabinet, jamais d'une règle
qu'il n'a pas posée.</li>
</ul>
<p>C'est le point où un modèle fait gagner du temps sans déshumaniser : on garde la main sur les mots,
on arrête de les retaper.</p>
""",
}


def lire(chemin):
    p = os.path.join(PUBLIC, chemin, "index.html")
    return p, (open(p, encoding="utf-8").read() if os.path.isfile(p) else None)


def inserer(chemin, bloc):
    p, t = lire(chemin)
    if t is None:
        return f"absent : {chemin}"
    # Idempotence par contenu, pas par marqueur seul : une même page peut recevoir deux blocs
    # différents (liens entrants + correction des liens sortants).
    cle = MARQUEUR + bloc.replace(MARQUEUR, "").strip()[:40]
    if cle in t:
        return None
    ancre = next((a for a in ANCRES if a in t), None)
    if ancre is None:
        return f"point d'insertion introuvable : {chemin}"
    open(p, "w", encoding="utf-8").write(t.replace(ancre, bloc + ancre, 1))
    return None


def liens_sortants(t):
    return len(set(re.findall(r'href="(/fr/[^"#?]*|/ch/[^"#?]*|/)"', t)))


def main():
    problemes = []

    # 1. Pages orphelines : liens entrants sur des pages hôtes
    for hote, cibles in HOSTS.items():
        items = "\n".join(
            f'<li><a href="/{c}">{html.escape(lib)}</a> — {html.escape(ctx)}.</li>'
            for c, lib, ctx in cibles)
        bloc = (MARQUEUR + "\n<section>\n<h2>Pour aller plus loin</h2>\n<ul>\n"
                + items + "\n</ul>\n</section>\n")
        pb = inserer(hote, bloc)
        if pb:
            problemes.append(pb)
    print(f"pages hôtes traitées : {len(HOSTS)}")

    # 2. Pages sans lien sortant
    corrigees = []
    for silo in ("fr", "ch"):
        for racine, _d, fichiers in os.walk(os.path.join(PUBLIC, silo)):
            if "index.html" not in fichiers:
                continue
            t = open(os.path.join(racine, "index.html"), encoding="utf-8").read()
            if "noindex" in t or liens_sortants(t) >= 2:
                continue
            chemin = os.path.relpath(racine, PUBLIC).replace("\\", "/")
            hub = f"/{silo}"
            pilier = "/fr/logiciel-courtier-assurance" if silo == "fr" else "/ch/logiciel-courtier-assurance-suisse"
            bloc = (MARQUEUR + "\n<section>\n<h2>Pour aller plus loin</h2>\n<ul>\n"
                    f'<li><a href="{pilier}">Le produit dans son ensemble</a></li>\n'
                    f'<li><a href="{hub}">Toutes les pages {silo.upper()}</a></li>\n'
                    "</ul>\n</section>\n")
            pb = inserer(chemin, bloc)
            if pb:
                problemes.append(pb)
            else:
                corrigees.append(chemin)
    print(f"pages à moins de deux liens sortants corrigées : {len(corrigees)}")
    for c in corrigees:
        print("   ", c)

    # 3. Fonctions réelles décrites dans les pages qui les portent
    for page_cible, bloc in COMPLEMENTS.items():
        pb = inserer(page_cible, MARQUEUR + "\n" + bloc.strip() + "\n")
        if pb:
            problemes.append(pb)
    print(f"compléments de fonction insérés : {len(COMPLEMENTS)}")

    if problemes:
        print("PROBLÈMES :")
        for p in problemes:
            print("   ", p)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
