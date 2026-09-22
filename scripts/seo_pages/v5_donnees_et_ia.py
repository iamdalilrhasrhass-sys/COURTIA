#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
seo_pages/v5_donnees_et_ia.py — actif de données France (étendu) + approfondissement du cluster IA.

Décisions : `passR_redteam_final` — l'argument le plus solide contre nous est l'absence d'autorité externe
(0,67, à traiter par la campagne préparée, qui exige une autorisation) ; la prochaine action la plus utile
est arrivée à très faible confiance (0,12), donc arbitrée par règles explicites : davantage de données
publiques sourcées (règle 17 de la mission) et approfondissement du cluster IA (règle 5).

Le risque de sur-production signalé (0,61) est traité séparément : les paragraphes standard répétés entre
pages suisses sont remplacés par des formulations propres à chaque page (voir scripts/dedoublonner_suisse.py).

Aucune donnée inventée : la page de données lit le fichier SIRENE extrait le 19/09/2026 et les populations
INSEE du même relevé. Les populations ne sont disponibles que pour les communes déjà relevées ; les
communes sans population sont écartées plutôt que complétées par une estimation.
"""
import json
import os

PAGES = {}
SOURCE_DENSITE = "/root/ark/business/_mesures/densite_courtiers_fr.json"
SOURCE_INSEE = "/root/ark/business/_mesures/insee.json"


def fpage(chemin=None, intention=None, liens=None, motscles=None, **kw):
    kw.pop("chemin", None)
    kw["fil"] = [("Accueil", "/"), ("France", "/fr"), (kw["h1"][:44], "/" + chemin.strip("/"))]
    kw["maillage"] = [(titre, "/" + url.strip("/"), "à lire aussi") for url, titre in (liens or [])]
    return kw


def nfr(valeur):
    return f"{valeur:,}".replace(",", "\u202f")


def pfr(valeur):
    return f"{valeur:.1f}".replace(".", ",")


def tableau_communes():
    """Lit les données réelles : comptages par commune (SIRENE) et populations (INSEE)."""
    if not (os.path.isfile(SOURCE_DENSITE) and os.path.isfile(SOURCE_INSEE)):
        return None
    communes = json.load(open(SOURCE_DENSITE, encoding="utf-8"))["communes"]
    insee = json.load(open(SOURCE_INSEE, encoding="utf-8"))
    lignes = []
    for slug, info in insee.items():
        etab = communes.get(slug)
        pop = info.get("population")
        if not etab or not pop:
            continue
        lignes.append({
            "nom": info.get("nom") or slug.replace("-", " ").title(),
            "etab": etab, "pop": pop,
            "dep": info["departement"]["nom"], "region": info["region"]["nom"],
            "densite": etab / (pop / 10000),
        })
    lignes.sort(key=lambda x: -x["etab"])
    return lignes


def page_donnees():
    lignes = tableau_communes()
    if not lignes:
        return None
    top = lignes[:40]
    total_etab = sum(x["etab"] for x in lignes)
    corps_lignes = "\n".join(
        f"<tr><td>{x['nom']}</td><td>{x['dep']}</td><td>{x['region']}</td>"
        f"<td>{nfr(x['etab'])}</td><td>{nfr(x['pop'])}</td><td>{pfr(x['densite'])}</td></tr>"
        for x in top)
    plus_denses = sorted([x for x in lignes if x["pop"] >= 100000], key=lambda x: -x["densite"])[:8]
    liste_dense = ", ".join(f"{x['nom']} ({pfr(x['densite'])} pour 10 000 hab.)" for x in plus_denses)
    return fpage(
        chemin="fr/densite-courtage-grandes-villes-france",
        intention="Le professionnel, le journaliste ou le consultant qui veut savoir où le courtage est "
                  "réellement concentré en France, avec des chiffres sourcés et datés.",
        liens=[("fr/cartographie-courtiers-assurance-france", "La cartographie par région et département"),
               ("fr/sources-courtia", "Nos sources"),
               ("fr/methode-editoriale-courtia", "Notre méthode éditoriale"),
               ("fr/logiciel-courtier-assurance-paris", "Le courtage à Paris"),
               ("fr/logiciel-courtier-assurance-lyon", "Le courtage à Lyon")],
        motscles=["densité courtiers assurance france", "nombre de courtiers par ville", "statistiques courtage france"],
        titre="Densité du courtage dans les grandes villes de France (données sourcées)",
        description="Le nombre d'établissements de courtage et d'agents d'assurance dans les quarante "
                    "premières villes françaises, avec la population et la densité pour 10 000 habitants. "
                    "Source SIRENE et INSEE, extraction du 19/09/2026.",
        h1="Où le courtage est concentré en France : les quarante premières villes",
        corps=f"""
<p>Cette page complète la <a href="/fr/cartographie-courtiers-assurance-france">cartographie par région et
département</a> : elle descend au niveau de la commune, pour les quarante villes qui comptent le plus
d'établissements de courtage et d'agents d'assurance en France. Tous les chiffres proviennent de la base
SIRENE (code d'activité NAF 66.22Z) et des populations INSEE, extraction du 19 septembre 2026.</p>

<h2>Les quarante premières villes</h2>
<table>
<tr><th>Commune</th><th>Département</th><th>Région</th><th>Établissements</th><th>Population</th>
<th>Pour 10 000 hab.</th></tr>
{corps_lignes}
</table>
<p class="doux">Total mesuré sur les communes renseignées à la fois par SIRENE et par l'INSEE :
<strong>{nfr(total_etab)}</strong> établissements. Les communes sans population INSEE dans notre relevé sont
écartées plutôt qu'estimées : cette page ne contient donc aucune valeur reconstituée.</p>

<h2>Ce que la densité dit, et ce qu'elle ne dit pas</h2>
<p>La densité — nombre d'établissements pour 10 000 habitants — est un indicateur administratif. Elle ne
mesure pas la concurrence réelle : deux cabinets de la même ville peuvent viser des clientèles totalement
différentes, et un établissement n'est pas une entreprise (une structure avec trois implantations compte
trois fois). Les villes les plus denses de notre relevé, rapportées à leur population :
<strong>{liste_dense}</strong>.</p>
<p>Ce que la densité aide à faire : situer un marché local, préparer un argumentaire auprès d'un partenaire,
ou vérifier une intuition avant de s'installer — avec la source et la date, ce qui permet à quiconque de
refaire le calcul.</p>

<h2>Méthode, source et réutilisation</h2>
<ul>
<li><strong>Source :</strong> base SIRENE diffusée par la DINUM, filtrée sur le code d'activité NAF 66.22Z
(activités des agents et courtiers d'assurances) ; populations INSEE.</li>
<li><strong>Extraction :</strong> 19 septembre 2026, sur le fichier national complet.</li>
<li><strong>Réutilisation :</strong> libre avec mention de la source, de la date et un lien vers cette page.
Le détail par commune est disponible sur demande motivée à contact@courtiark.fr.</li>
<li><strong>Mise à jour :</strong> cette page sera réextraite à la prochaine publication de la base ; aucune
valeur plus récente que notre extraction n'est affichée.</li>
</ul>
""",
        faq=[
            ("Pourquoi seulement quarante villes ?",
             "Parce que ce sont les quarante communes qui comptent le plus d'établissements dans notre "
             "relevé ; au-delà, l'information devient moins utile pour une lecture d'ensemble."),
            ("Ces chiffres incluent-ils les agents généraux ?",
             "Le code NAF 66.22Z regroupe les activités des agents et courtiers d'assurances. La base ne "
             "distingue pas, dans notre extraction, les statuts d'exercice."),
            ("Puis-je citer ces chiffres dans un article ?",
             "Oui, avec la source (SIRENE, code NAF 66.22Z, extraction du 19/09/2026) et un lien vers cette "
             "page ou vers la cartographie."),
        ],
    )


BLOC_IA = """
<h2>Quatre usages réels, dans l'ordre où ils se présentent dans une journée</h2>
<p>La question « que fait l'IA dans un logiciel de courtage ? » trouve une réponse concrète en suivant une
journée de travail. Voici les quatre usages réellement implémentés, avec ce que chacun produit — et ce
qu'il ne produit pas.</p>
<ol>
<li><strong>Après un appel : la dictée plutôt que la saisie.</strong> Un enregistrement est déposé,
transcrit, et les éléments utiles sont extraits pour préparer la fiche. Le courtier relit, corrige et
applique : rien n'est écrit dans le dossier sans validation.</li>
<li><strong>À l'arrivée d'un document : l'extraction plutôt que la recopie.</strong> Les données d'un RIB ou
d'une carte grise sont lues et proposées, ce qui supprime la ressaisie — mais un IBAN mal lu reste un IBAN
faux si personne ne vérifie.</li>
<li><strong>Avant un rendez-vous : le résumé plutôt que la recherche.</strong> La situation du dossier peut
être résumée à partir des éléments saisis : échéances, échanges, propositions. Le résumé sert à préparer,
il ne remplace pas la lecture du dossier quand l'enjeu est élevé.</li>
<li><strong>En fin de journée : la liste d'actions plutôt que la mémoire.</strong> Les dossiers à traiter
remontent dans un brief (échéances, propositions sans réponse, dossiers sans contact). L'appréciation de la
priorité reste humaine — un client stratégique n'est pas un dossier à risque comme les autres.</li>
</ol>

<h2>Ce que nous ne ferons pas au nom de l'IA</h2>
<ul>
<li><strong>Décider à la place du courtier</strong> : aucune garantie n'est validée automatiquement, aucun
refus n'est prononcé par un modèle.</li>
<li><strong>Écrire dans un dossier sans contrôle</strong> : toute proposition passe par une validation
humaine, c'est une règle de conception, pas un réglage.</li>
<li><strong>Promettre des gains chiffrés</strong> : nous n'avons aucune mesure du temps des cabinets, donc
aucun pourcentage d'économie n'est annoncé.</li>
<li><strong>Envoyer des messages automatiquement</strong> : les relances sont préparées, le cabinet décide
de l'envoi et du moment.</li>
</ul>

<h2>Les trois questions à poser à n'importe quel éditeur qui parle d'IA</h2>
<ol>
<li><strong>Quelle donnée sort de mon cabinet, et vers quel service ?</strong> Une réponse vague est un
signal.</li>
<li><strong>Que se passe-t-il si le résultat est faux ?</strong> Si la réponse est « il est validé avant
application », c'est un bon signe ; si c'est « le modèle est fiable », c'est un mauvais signe.</li>
<li><strong>Puis-je refuser l'IA et continuer à travailler ?</strong> Un outil utilisable sans IA est un
outil dont l'IA est un ajout, pas une dépendance.</li>
</ol>
"""


def page_ia():
    """Enrichit le pilier IA existant plutôt que de créer une page de plus (la fusion était décidée)."""
    try:
        from generate_seo_pillars import PAGES as PILLERS
    except Exception:
        return None
    url = "fr/ia-courtier-assurance"
    if url not in PILLERS:
        return None
    definition = dict(PILLERS[url])
    definition["corps"] = definition["corps"] + "\n" + BLOC_IA
    return definition


if __name__ == "__main__" or True:
    p = page_donnees()
    if p:
        PAGES["fr/densite-courtage-grandes-villes-france"] = p
    ia = page_ia()
    if ia:
        PAGES["fr/ia-courtier-assurance"] = ia
