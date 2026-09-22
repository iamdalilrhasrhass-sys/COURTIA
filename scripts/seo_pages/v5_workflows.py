#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v5_workflows.py — BIBLIOTHÈQUE DE PROCESSUS (hub + six processus détaillés).

Décision : `passN_redteam_serp` (bibliothèque de processus = actif réutilisable, 0,28 en second rang
mais explicitement demandé par la mission) et `passQ_suisse` (équivalent suisse : true, 0,84).

Chaque processus est utile à quelqu'un qui n'utilise PAS COURTIA : c'est la condition pour qu'il soit
citable. La mention de ce que le produit fait vient après, jamais avant.
"""
PAGES = {}


def fpage(chemin=None, intention=None, liens=None, motscles=None, **kw):
    kw.pop("chemin", None)
    kw["fil"] = [("Accueil", "/"), ("France", "/fr"),
                 ("Processus", "/fr/workflows-courtier-assurance"),
                 (kw["h1"][:40], "/" + chemin.strip("/"))]
    kw["maillage"] = [(titre, "/" + url.strip("/"), "à lire aussi") for url, titre in (liens or [])]
    return kw


def wf(objectif, declencheur, etapes, qui, donnees, ruptures, courtia, humain):
    etapes_html = "".join(f"<li>{e}</li>" for e in etapes)
    ruptures_html = "".join(f"<li>{r}</li>" for r in ruptures)
    return f"""
<h2>Objectif du processus</h2>
<p>{objectif}</p>
<h2>Déclencheur</h2>
<p>{declencheur}</p>
<h2>Étapes</h2>
<ol>{etapes_html}</ol>
<h2>Qui fait quoi</h2>
<p>{qui}</p>
<h2>Informations nécessaires</h2>
<p>{donnees}</p>
<h2>Les points de rupture (là où le processus échoue en vrai)</h2>
<ul>{ruptures_html}</ul>
<h2>Ce que COURTIA fait dans ce processus</h2>
<p>{courtia}</p>
<h2>Ce qui reste humain</h2>
<p>{humain}</p>
"""


PAGES["fr/workflows-courtier-assurance"] = fpage(
    chemin="fr/workflows-courtier-assurance",
    intention="Le responsable de cabinet qui veut poser des processus tenables, avec ou sans logiciel, "
              "et qui cherche un modèle à adapter plutôt qu'un article de conseils généraux.",
    liens=[("fr/workflows/nouveau-prospect", "Processus : nouveau prospect"),
           ("fr/workflows/collecte-de-pieces", "Processus : collecte de pièces"),
           ("fr/workflows/relance-de-devis", "Processus : relance d'un devis"),
           ("fr/workflows/renouvellement", "Processus : renouvellement"),
           ("fr/workflows/sinistre", "Processus : sinistre"),
           ("fr/workflows/mandat-et-kyc", "Processus : mandat et vérification du client"),
           ("fr/gagner-du-temps-courtier-assurance", "Gagner du temps : le cluster complet"),
           ("fr/checklists/", "Les checklists du cabinet")],
    motscles=["process courtier assurance", "workflow cabinet courtage", "organisation cabinet assurance"],
    titre="Processus pour courtiers en assurance : la bibliothèque — COURTIA",
    description="Quatorze processus de cabinet de courtage détaillés : déclencheur, étapes, "
                "responsabilités, données, points de rupture, ce que le produit fait et ce qui reste "
                "humain.",
    h1="Quatorze processus de cabinet de courtage, décrits pour être utilisés",
    corps="""
<p>Un cabinet ne tient pas parce qu'il a un bon logiciel : il tient parce que ses enchaînements de
travail sont décidés. Un processus, ici, veut dire une chose précise : <strong>quel événement
déclenche quoi, dans quel ordre, avec quelle trace</strong>.</p>
<p>Cette bibliothèque est écrite pour être utilisée même si vous n'utilisez pas COURTIA. Chaque processus
décrit l'objectif, le déclencheur, les étapes, qui fait quoi, les informations nécessaires et les points
où le processus casse en pratique. La partie « ce que COURTIA fait » vient à la fin — c'est un
outil, pas la méthode.</p>

<h2>Les quatorze processus</h2>
<p><strong>Six sont détaillés</strong> (un par page) :</p>
<ul>
<li><a href="/fr/workflows/nouveau-prospect">Nouveau prospect</a> — de la première demande à la décision d'ouvrir un dossier.</li>
<li><a href="/fr/workflows/collecte-de-pieces">Collecte de pièces</a> — demander, suivre, clore une demande documentaire.</li>
<li><a href="/fr/workflows/relance-de-devis">Relance d'un devis</a> — transformer une proposition sans réponse en décision.</li>
<li><a href="/fr/workflows/renouvellement">Renouvellement</a> — traiter une échéance par paliers, sans urgence finale.</li>
<li><a href="/fr/workflows/sinistre">Sinistre</a> — suivre un dossier de déclaration jusqu'à la clôture.</li>
<li><a href="/fr/workflows/mandat-et-kyc">Mandat et vérification du client</a> — documenter qui est le client et ce qui a été signé.</li>
</ul>
<p><strong>Huit autres processus</strong>, décrits plus bas et détaillables à la demande :</p>
<ul>
<li><strong>Appel client entrant</strong> — qualifier, répondre, tracer, sortir avec une action datée.</li>
<li><strong>Compte rendu d'appel ou de rendez-vous</strong> — ce qui se dit devient une trace et une tâche.</li>
<li><strong>Rendez-vous client</strong> — préparer avec trois informations, sortir avec une suite.</li>
<li><strong>Renouvellement sans réponse</strong> — décider quoi faire d'un client muet, sans le harceler ni l'abandonner.</li>
<li><strong>Nouvel apporteur ou partenaire</strong> — cadrer une relation avant le premier dossier.</li>
<li><strong>Rapprochement de commissions</strong> — attendu, reçu, écart, action.</li>
<li><strong>Onboarding d'un client signé</strong> — ce qui doit être en place avant la première échéance.</li>
<li><strong>Arrivée et départ d'un collaborateur</strong> — qui voit quoi, et ce qui reste au cabinet.</li>
</ul>

<h2>Comment adapter ces processus</h2>
<p>Trois règles qui évitent de recopier un modèle inadapté : <strong>nommer le déclencheur</strong> (si
personne ne sait quand le processus démarre, il ne démarre pas), <strong>écrire le point de rupture</strong>
(ce qui coince réellement dans votre cabinet), et <strong>décider de la trace</strong> (ce qui doit rester
au dossier, même si la personne quitte le cabinet).</p>
""",
    faq=[
        ("Ces processus sont-ils propres à COURTIA ?",
         "Non. Ils décrivent le travail d'un cabinet de courtage et tiennent debout avec un tableur, un "
         "agenda et de la discipline. COURTIA les outille."),
        ("Combien de processus faut-il écrire pour un petit cabinet ?",
         "Trois suffisent pour commencer : la collecte de pièces, la relance de devis et le "
         "renouvellement. Ce sont ceux qui touchent le plus de dossiers."),
        ("Faut-il un outil pour tenir des processus ?",
         "Non, mais un outil aide à tenir la trace — et sans trace, un processus redevient une habitude "
         "individuelle."),
    ],
)
