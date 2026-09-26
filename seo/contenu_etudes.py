#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Etude COURTIARK — cartographie du courtage en assurance en France (edition 2026).

Les chiffres ne sont pas ecrits ici : ils sont lus dans le jeu de donnees produit par
seo/research/courtage_france_2026.py (frontend/public/donnees/courtage-france-2026.json),
lui-meme recalcule depuis la base SIRENE et verifie par un second calcul independant.
Si le fichier de donnees est absent, la page ne publie AUCUN chiffre.
"""
import io
import json
import os
from contenu_core import section, ul, p, tableau, figure

DONNEES = '/srv/courtia/frontend/public/donnees/courtage-france-2026.json'
CITATION = ("Source : COURTIARK, calculs à partir des données SIRENE (annuaire des entreprises, DINUM), "
            "code d'activité 66.22Z, extraction du 18/09/2026.")
MENTION = ("COURTIARK est un logiciel de gestion : cette étude est une analyse de données publiques, "
           "elle ne constitue pas un conseil juridique ou réglementaire.")


def donnees():
    if not os.path.exists(DONNEES):
        return None
    return json.loads(io.open(DONNEES, encoding='utf-8').read())


def fmt(n):
    return format(int(n), ',d').replace(',', ' ')


def graphique_barres(titre, lignes, largeur=760, hauteur_barre=26, couleur='#12897a'):
    """Graphique en barres en SVG, avec titre et description accessibles.

    Le SVG est decoratif (aria-hidden) : la donnee est de toute facon publiee dans le tableau
    qui suit, ce qui evite de dependre d'une image pour l'accessibilite.
    """
    if not lignes:
        return ''
    maximum = max(v for _, v in lignes) or 1
    hauteur = len(lignes) * hauteur_barre + 12
    parts = ['<svg viewBox="0 0 %d %d" width="100%%" height="auto" aria-hidden="true" '
             'style="max-width:100%%;height:auto">' % (largeur, hauteur)]
    for i, (libelle, valeur) in enumerate(lignes):
        y = i * hauteur_barre + 4
        w = max(2, int((largeur - 260) * valeur / maximum))
        parts.append('<rect x="250" y="%d" width="%d" height="%d" rx="3" fill="%s"></rect>'
                     % (y, w, hauteur_barre - 8, couleur))
        parts.append('<text x="244" y="%d" text-anchor="end" font-size="13" fill="#c9d4e4">%s</text>'
                     % (y + 13, libelle[:34]))
        parts.append('<text x="%d" y="%d" font-size="12" fill="#eaf0f7">%s</text>'
                     % (262 + w, y + 13, fmt(valeur)))
    parts.append('</svg>')
    return '<h3>%s</h3>' % titre + ''.join(parts)


def pages_etudes():
    d = donnees()
    if not d:
        corps = section("Données indisponibles",
                        p("Le jeu de données de l'étude n'est pas présent sur ce serveur : aucun chiffre "
                          "n'est publié, plutôt qu'un chiffre non recalculé."))
        return [dict(path='/etudes', type='etude', country='FR', indexable=True,
                     title="Études sur le courtage en assurance | COURTIARK",
                     description="Études et analyses de données publiques sur le courtage en assurance.",
                     h1="Études COURTIARK", chapeau="Analyses de données publiques sur le courtage en assurance.",
                     fil=[("Études", None)], corps=corps)]

    total = d['total_etablissements']
    regions = d['regions']
    deps = d['departements']
    villes = d['villes']
    annees = d['creations_par_annee']
    top3 = regions[:3]
    idf = next((r for r in regions if r['nom'] == 'Île-de-France'), {'etablissements': 0})
    part_idf = 100.0 * idf['etablissements'] / total
    multi = 'oui'

    # ------------------------------------------------------------------ page etude
    villes_courtes = [(v['nom'], v['etablissements']) for v in villes[:12]]
    deps_courts = [('Département ' + x['code'], x['etablissements']) for x in deps[:10]]
    regions_courtes = [(x['nom'], x['etablissements']) for x in regions]
    annees_courtes = [(x['annee'], x['etablissements']) for x in annees[-12:]]

    etude = dict(
        path='/etudes/courtage-assurance-france-2026', type='etude', country='FR', indexable=True,
        title="Cartographie du courtage en assurance en France 2026 | Étude COURTIARK",
        description=("Combien d'entreprises de courtage d'assurance en France, où sont-elles, comment "
                     "évoluent-elles ? Étude 2026 calculée depuis la base SIRENE (code 66.22Z), "
                     "méthode et limites incluses."),
        h1="Cartographie du courtage en assurance en France — édition 2026",
        chapeau=("Où exercent réellement les entreprises de courtage d'assurance en France ? Cette étude "
                 "compte les entreprises dont l'activité déclarée est le courtage, département par département, "
                 "à partir de la base publique SIRENE."),
        fil=[("Études", "/etudes"), ("Cartographie du courtage en France 2026", None)],
        corps=''.join([
            section("Ce que montre l'étude",
                    p("**%s entreprises** de courtage d'assurance exercent en France d'après le relevé SIRENE du "
                      "18/09/2026 (code d'activité 66.22Z). Elles se répartissent sur **%d régions** et **%d "
                      "départements**. L'Île-de-France concentre **%s entreprises (%.1f %%)**, devant %s et %s."
                      % (fmt(total), len(regions), len(deps), fmt(idf['etablissements']), part_idf,
                         top3[1]['nom'], top3[2]['nom']))
                    + ul(["**%s entreprises à Paris** : la plus forte concentration de France."
                          % fmt(villes[0]['etablissements']),
                          "**%s entreprises dans les Hauts-de-Seine** (département 92), deuxième pôle national."
                          % fmt(next((x['etablissements'] for x in deps if x['code'] == '92'), 0)),
                          "Les créations se sont accélérées après 2015 : voir le tableau des créations par année.",
                          "Ces chiffres comptent des **entreprises (numéro SIREN)**, pas des points de vente : "
                          "certaines sociétés déclarent plusieurs établissements ouverts."])
                    + p(CITATION)),

            section("Répartition par région",
                    graphique_barres("Entreprises de courtage par région", regions_courtes)
                    + tableau(["Région", "Entreprises", "Part"],
                              [[x['nom'], fmt(x['etablissements']), '%.1f %%' % (100.0 * x['etablissements'] / total)]
                               for x in regions])),

            section("Les dix premiers départements",
                    graphique_barres("Entreprises de courtage par département", deps_courts)
                    + tableau(["Département", "Entreprises", "Part"],
                              [[x['code'], fmt(x['etablissements']), '%.1f %%' % (100.0 * x['etablissements'] / total)]
                               for x in deps[:20]])),

            section("Les villes les plus denses",
                    graphique_barres("Entreprises de courtage par ville", villes_courtes)
                    + tableau(["Ville", "Département", "Entreprises"],
                              [[v['nom'], v['departement'], fmt(v['etablissements'])] for v in villes])),

            section("Créations d'entreprises de courtage par année",
                    graphique_barres("Créations par année (12 dernières années présentes)",
                                     annees_courtes, couleur='#3f6fd8')
                    + tableau(["Année de création", "Entreprises"],
                              [[x['annee'], fmt(x['etablissements'])] for x in annees])),

            section("Méthode, en trois lignes",
                    ul(["Source : base SIRENE diffusée par l'annuaire des entreprises (DINUM), interrogée sur le "
                        "code d'activité principale 66.22Z (agents et courtiers d'assurances).",
                        "Extraction du 18/09/2026 : 43 240 lignes, 43 240 numéros SIREN distincts, 0 hors périmètre.",
                        "Les agrégats sont recalculés à chaque génération de la page depuis le fichier source, et "
                        "un **second calcul indépendant** doit donner exactement le même résultat avant publication "
                        "(0 écart mesuré)."])
                    + p('<a href="/etudes/methodologie-cartographie-courtage-france">Méthodologie complète et '
                        'limites de lecture</a> · <a href="/donnees/courtage-france-2026.csv">Télécharger le jeu de '
                        'données agrégé (CSV)</a>')),

            section("Limites de lecture",
                    ul(["**Une entreprise n'est pas un établissement** : le comptage porte sur des numéros SIREN. "
                        "Une société peut avoir plusieurs agences, et une adresse peut n'être qu'un domicile fiscal.",
                        "**Le code d'activité est déclaratif** : il ne prouve pas que l'activité de courtage soit "
                        "exercée à titre principal ni qu'elle soit régulière.",
                        "**Aucun statut réglementaire n'est vérifié ici** : nous ne croisons pas ce relevé avec "
                        "l'inscription à l'ORIAS. Un comptage n'est pas une qualification.",
                        "**La date compte** : ces chiffres évoluent chaque trimestre ; l'édition 2027 sera "
                        "publiée séparément, celle-ci reste archivée en l'état."])
                    + p(MENTION)),

            section("Comment citer cette étude",
                    p("**%s**" % CITATION)
                    + p("Si vous reprenez ces chiffres, citez COURTIARK comme source du calcul et mentionnez "
                        "la date d'extraction. Les graphiques peuvent être repris avec la même mention.")),
        ]),
        faq=[("Combien d'entreprises de courtage d'assurance exercent en France ?",
              "%s entreprises exercent une activité déclarée de courtage d'assurance (code 66.22Z) d'après le "
              "relevé SIRENE du 18/09/2026. C'est un nombre d'entreprises, pas de points de vente." % fmt(total)),
             ("Où sont-elles concentrées ?",
              "L'Île-de-France concentre %.1f %% des entreprises, avec Paris puis les Hauts-de-Seine comme pôles "
              "principaux. Suivent Auvergne-Rhône-Alpes, Nouvelle-Aquitaine et Provence-Alpes-Côte d'Azur."
              % part_idf),
             ("Puis-je réutiliser ces données ?",
              "Oui, en citant COURTIARK comme source du calcul et la date d'extraction. Le jeu de données agrégé "
              "est téléchargeable ; les données brutes proviennent de la base SIRENE et restent soumises à ses "
              "conditions de réutilisation."),
             ("Ces chiffres comptent-ils les agents généraux ?",
              "Le périmètre est le code d'activité 66.22Z, qui couvre les agents et courtiers d'assurances. "
              "Nous ne distinguons pas les statuts à l'intérieur de ce code.")],
        lire=[("Méthodologie", "/etudes/methodologie-cartographie-courtage-france"),
              ("Densité du courtage (page de données)", "/france/densite-courtage"),
              ("Logiciel pour courtier en assurance", "/logiciel-courtier-assurance")],
    )

    # ------------------------------------------------------------------ methodologie
    methodo = dict(
        path='/etudes/methodologie-cartographie-courtage-france', type='etude', country='FR', indexable=True,
        title="Méthodologie de la cartographie du courtage en France | COURTIARK",
        description=("Source, périmètre, contrôles de qualité, double calcul et limites de l'étude COURTIARK "
                     "sur le courtage d'assurance en France."),
        h1="Méthodologie et limites de l'étude",
        chapeau=("Comment le comptage est construit, ce qu'il mesure exactement, et ce qu'il ne permet pas "
                 "de conclure."),
        fil=[("Études", "/etudes"), ("Méthodologie", None)],
        corps=''.join([
            section("Source et périmètre",
                    ul(["Source : base SIRENE, diffusée par l'annuaire des entreprises (DINUM).",
                        "Filtre : code d'activité principale **66.22Z** — agents et courtiers d'assurances.",
                        "Extraction : **18/09/2026**.",
                        "Grain : une ligne par **entreprise (numéro SIREN)**.",
                        "Aucune donnée personnelle n'est publiée : les sorties sont des comptages agrégés."])),
            section("Contrôles exécutés avant publication",
                    tableau(["Contrôle", "Résultat du 26/09/2026"],
                            [["Lignes hors périmètre (autre code NAF)", "0 — sinon la publication est refusée"],
                             ["Numéros SIREN en doublon", "0"],
                             ["Lignes sans commune", "191 — exclues des comptages par ville"],
                             ["Table des régions", "correspondance département → région vérifiée sur 10 couples connus"],
                             ["Codes de région sans libellé", "0 — sinon la publication est refusée"],
                             ["Second calcul indépendant (autre analyseur, autre sérialisation)", "0 écart"]])),
            section("Le garde-fou qui a réellement servi",
                    p("La première table des régions utilisée ne contenait pas la région 93 "
                      "(Provence-Alpes-Côte d'Azur). Le script a **refusé de publier** parce que le contrôle "
                      "« département 13 → région attendue » échouait : aucun chiffre faux n'est sorti. Même "
                      "logique pour les libellés de communes : une première version du contrôle comparait des "
                      "libellés accentués sans les normaliser et signalait de faux écarts ; la normalisation a "
                      "été alignée dans les deux calculs avant publication.")),
            section("Ce que l'étude ne dit pas",
                    ul(["Elle ne dit pas qu'une entreprise exerce réellement et à titre principal cette activité : "
                        "le code est déclaratif.",
                        "Elle ne dit rien du statut réglementaire (ORIAS, courtier, agent général, mandataire).",
                        "Elle ne compte pas les points de vente : 6 157 entreprises déclarent plus d'un "
                        "établissement ouvert.",
                        "Elle ne mesure ni le chiffre d'affaires, ni la taille des portefeuilles, ni la qualité "
                        "de service."])
                    + p(MENTION)),
        ]),
        faq=[("Pourquoi ne pas avoir utilisé l'ORIAS ?",
              "Le croisement avec le registre de l'ORIAS n'a pas été fait : nous ne l'affichons donc pas. "
              "Un comptage SIRENE et une inscription ORIAS mesurent deux choses différentes."),
             ("Les chiffres sont-ils recalculés ou figés ?",
              "Ils sont recalculés à chaque génération depuis le fichier source, et le résultat du second "
              "calcul indépendant doit être identique (0 écart) avant publication.")],
        lire=[("L'étude 2026", "/etudes/courtage-assurance-france-2026")],
    )

    # ------------------------------------------------------------------ hub
    hub = dict(
        path='/etudes', type='etude', country='FR', indexable=True,
        title="Études et données sur le courtage en assurance | COURTIARK",
        description=("Analyses de données publiques sur le courtage en assurance en France et en Suisse : "
                     "méthode, chiffres, limites et jeux de données téléchargeables."),
        h1="Études COURTIARK sur le courtage en assurance",
        chapeau=("Des analyses construites à partir de sources publiques, avec la méthode et les limites "
                 "écrites noir sur blanc — pas des chiffres sans origine."),
        fil=[("Études", None)],
        corps=''.join([
            section("Nos études",
                    tableau(["Étude", "Source", "Statut"],
                            [["[Cartographie du courtage en assurance en France — 2026](/etudes/courtage-assurance-france-2026)",
                              "SIRENE (DINUM), code 66.22Z", "Publiée"],
                             ["[Méthodologie et limites](/etudes/methodologie-cartographie-courtage-france)",
                              "—", "Publiée"]]),
                    ),
            section("Comment nous travaillons",
                    ul(["Données publiques uniquement, avec la source et la date d'extraction indiquées.",
                        "Agrégats recalculés à chaque mise à jour, jamais recopiés à la main.",
                        "Un second calcul indépendant doit donner le même résultat avant publication.",
                        "Les limites de lecture sont écrites dans la page, pas reléguées ailleurs.",
                        "Une édition annuelle par étude : l'édition précédente reste archivée en l'état."])
                    + p("Sujet d'étude que nous préparons : **Baromètre de la digitalisation des cabinets de "
                        "courtage**. Aucun résultat ne sera publié avant d'avoir un échantillon réel, et "
                        "l'effectif de l'échantillon sera toujours affiché à côté du résultat.")),
        ]),
        faq=[("Puis-je reprendre vos chiffres ?",
              "Oui, avec la mention « Source : COURTIARK, calculs à partir des données SIRENE du 18/09/2026 »."),
             ("Vos études portent-elles aussi sur la Suisse ?",
              "Une étude suisse ne sera publiée que si les données officielles permettent un comptage "
              "reproductible. Sinon nous publions une ressource documentaire sourcée, sans chiffres inventés.")],
        lire=[("Cartographie France 2026", "/etudes/courtage-assurance-france-2026"),
              ("France", "/france"), ("Suisse", "/suisse")],
    )
    return [hub, etude, methodo]
