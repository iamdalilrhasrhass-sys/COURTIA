#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v3_fonctions_ch.py — VAGUE 4, fonctions côté SUISSE (2 pages).

Décisions TypeSafe réelles `passM_suisse_fonctions` (22/09/2026) :
  - sinistres Suisse : True 0,75 (correction d'un rejet antérieur fondé sur une description fausse du
    produit) ;
  - partenaires et apporteurs Suisse : True 0,71 ;
  - santé du portefeuille (0,63), tâches et équipe (0,68), voix/WhatsApp (False 0,47) : sous le seuil de
    0,70 appliqué pour créer une page — ces sujets ne donnent donc PAS de page suisse dédiée ;
  - stratégie retenue par le modèle : « une page suisse seulement là où il y a une substance suisse
    réelle » (1,0), pas de traduction systématique.

Substance suisse réelle utilisée ici : déclaration de sinistre et expertise côté assureur suisse,
coordination avec le courtier, pièces en allemand ou en italien selon la compagnie ; pour les
partenaires, le rôle des apporteurs, des courtiers grossistes et des prescripteurs, avec rétrocessions
en francs.
"""
PAGES = {}


def fpage(chemin=None, intention=None, liens=None, motscles=None, **kw):
    kw.pop("chemin", None)
    fil_silo = "Suisse" if kw.get("marche") == "CH" else "France"
    prefixe = "/ch" if kw.get("marche") == "CH" else "/fr"
    kw["fil"] = [("Accueil", "/"), (fil_silo, prefixe), (kw["h1"][:48], "/" + chemin.strip("/"))]
    kw["maillage"] = [(titre, "/" + url.strip("/"), "à lire aussi") for url, titre in (liens or [])]
    return kw


PAGES["ch/sinistres-courtier-assurance-suisse"] = fpage(
    marche="CH",
    chemin="ch/sinistres-courtier-assurance-suisse",
    intention="Le courtier suisse qui doit suivre une déclaration de sinistre, l'expertise et les "
              "pièces, souvent dans une autre langue que le français.",
    liens=[("ch/logiciel-courtier-assurance-suisse", "Le logiciel de courtage en Suisse"),
           ("ch/gestion-portefeuille-assurance-suisse", "Le portefeuille suisse"),
           ("ch/gestion-documentaire-courtier-assurance-suisse", "Les documents et les pièces"),
           ("ch/gestion-commissions-courtier-assurance-suisse", "Les commissions en francs")],
    motscles=["sinistre assurance suisse", "déclaration sinistre courtier suisse", "expertise sinistre assurance"],
    titre="Suivre un sinistre en Suisse — COURTIA",
    description="Déclarer et suivre les sinistres de vos clients suisses : état du dossier, pièces, "
                "coordination avec la compagnie, historique disponible à l'échéance.",
    h1="Suivre un sinistre suisse sans le sortir du dossier",
    corps="""
<p>En Suisse comme ailleurs, la difficulté d'un sinistre n'est pas la déclaration : c'est le suivi.
L'assureur instruit, l'expert peut être mandaté, des pièces circulent — parfois dans une autre langue
que celle du dossier — et le courtier reste l'interlocuteur du client pendant tout ce temps.</p>
<h2>Ce que le suivi d'un sinistre fait exactement</h2>
<ul>
<li><strong>Rattacher le sinistre au client et au contrat</strong> : le dossier suisse porte la
compagnie, l'échéance et la langue du contrat ; le sinistre s'y accroche.</li>
<li><strong>Suivre l'état réel</strong> : déclaré, en cours d'instruction, en attente de pièce, clos —
sans tenir une liste à part.</li>
<li><strong>Conserver les pièces ensemble</strong> : attestations, correspondance de la compagnie,
photos, constat, rapport d'expertise.</li>
<li><strong>Préparer la suite</strong> : une synthèse des éléments saisis, pour un échange avec le
client ou avec l'assureur.</li>
<li><strong>Retrouver l'historique à l'échéance</strong>, quand la discussion revient sur le montant ou
la couverture.</li>
</ul>
<h2>Particularités du contexte suisse</h2>
<p>Un cabinet romand travaille fréquemment avec des compagnies et des experts qui communiquent en
allemand ou en italien, et parfois avec des clients dont la police est rédigée dans une autre langue.
Le sinistre se suit donc comme les autres dossiers, mais les pièces conservées ne sont pas toujours en
français : les garder rattachées au dossier évite les recherches au moment où le client rappelle.</p>
<h2>Ce que le suivi ne fait pas</h2>
<p>Il ne déclare pas auprès de l'assureur à votre place, ne mandate pas d'expert et n'évalue pas
l'indemnisation : ce sont des actes de la compagnie et de l'expert. COURTIA tient le dossier côté
cabinet, et rien d'autre.</p>
""",
    faq=[
        ("Peut-on suivre un sinistre dont les pièces sont en allemand ?",
         "Oui : les pièces sont conservées telles quelles et rattachées au dossier, dans la langue où "
         "elles ont été reçues."),
        ("Le produit déclare-t-il le sinistre à l'assureur ?",
         "Non. La déclaration reste un acte du client et de la compagnie ; le cabinet suit le dossier."),
        ("Le sinistre est-il visible lors du renouvellement ?",
         "Oui : l'historique reste rattaché au dossier, ce qui permet d'en tenir compte au moment de "
         "l'échéance."),
    ],
)

PAGES["ch/partenaires-apporteurs-courtier-assurance-suisse"] = fpage(
    marche="CH",
    chemin="ch/partenaires-apporteurs-courtier-assurance-suisse",
    intention="Le cabinet suisse qui travaille avec des apporteurs, des grossistes ou des prescripteurs "
              "et veut savoir ce que chacun produit réellement, en francs.",
    liens=[("ch/logiciel-courtier-assurance-suisse", "Le logiciel de courtage en Suisse"),
           ("ch/gestion-commissions-courtier-assurance-suisse", "Les commissions en francs"),
           ("ch/gestion-cabinet-courtage-suisse", "La gestion du cabinet suisse"),
           ("fr/partenaires-apporteurs-courtier-assurance", "La version France du suivi des partenaires")],
    motscles=["apporteur assurance suisse", "courtier grossiste suisse", "rétrocession courtage suisse"],
    titre="Partenaires et apporteurs d'un cabinet suisse — COURTIA",
    description="Suivre les apporteurs, grossistes et prescripteurs de votre cabinet suisse : qui "
                "apporte quoi, avec quel statut, et ce que cela représente en francs.",
    h1="Suivre les apporteurs suisses sans tenir un tableau à part",
    corps="""
<p>Le courtage suisse fonctionne beaucoup par intermédiaires : un prescripteur, un courtier grossiste,
un confrère d'un autre canton, parfois un partenaire d'un autre métier. Dès qu'il y en a plus de deux,
la question n'est plus « qui est ce partenaire ? » mais « qu'est-ce qui vient de qui, et depuis
quand ? ».</p>
<h2>Ce que le suivi des partenaires fait exactement</h2>
<ul>
<li><strong>Une fiche par partenaire</strong> : le type de relation (apporteur, prescripteur, confrère,
grossiste), ce qu'il apporte et son statut.</li>
<li><strong>Un statut qui vit</strong> : actif, en attente, arrêté — pour ne pas relancer une relation
terminée.</li>
<li><strong>Des statistiques par partenaire</strong>, dans la devise du cabinet.</li>
<li><strong>Un rattachement aux dossiers</strong> : l'apport se retrouve dans le dossier concerné,
pas seulement dans un total.</li>
</ul>
<h2>Ce que ce suivi ne fait pas</h2>
<p>Il n'établit aucune convention entre professionnels, ne calcule pas la rétrocession due à un tiers et
ne gère pas de facturation entre entreprises. Les engagements restent au cabinet ; le suivi est ici.</p>
<h2>Pourquoi c'est un sujet de marge</h2>
<p>Un apporteur mal suivi coûte deux fois : une rétrocession versée sans base claire, et une relation
interrompue faute de visibilité sur ce qu'elle produit. Sur un marché où les volumes passent souvent par
quelques partenaires, cette visibilité se rembourse vite.</p>
""",
    faq=[
        ("Peut-on distinguer apporteurs, grossistes et prescripteurs ?",
         "Oui : chaque fiche partenaire porte son type de relation et son statut."),
        ("Les montants sont-ils en francs ?",
         "Oui, la devise du cabinet suisse est utilisée pour les montants et les statistiques."),
        ("Le partenaire a-t-il accès au dossier ?",
         "Non. L'accès au cabinet est cloisonné ; un partenaire n'entre pas dans votre outil."),
    ],
)
