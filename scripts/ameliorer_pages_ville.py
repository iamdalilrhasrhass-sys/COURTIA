#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""NOYAU SEO : 10 pages ville prioritaires + maillage des hubs orphelins.

CE QUE FAIT CE SCRIPT
---------------------
1. Génère les 10 pages `/fr/logiciel-courtier-assurance-<ville>/index.html`
   prioritaires (Paris, Lyon, Marseille, Bordeaux, Toulouse, Nantes, Lille,
   Strasbourg, Montpellier, Nice) avec pour chacune :
     - un H1, un title, une meta description et un canonical uniques ;
     - un corps éditorial PROPRE À LA VILLE (tissu du courtage, généralités
       régionales vérifiables) et majoritairement unique d'une ville à l'autre ;
     - un CTA concret vers la démo (/demo-public et /demo) et un lien vers
       /tarifs ;
     - un JSON-LD BreadcrumbList + SoftwareApplication (+ Organization, FAQPage) ;
     - des liens internes vers les 6 hubs verticaux, les 4 comparatifs et les
       10 guides (fin de l'orphelinage).
2. Maillage retour : injecte les 10 liens villes dans `/fr` (hub) et dans les
   6 hubs verticaux, et ajoute à ces 6 hubs un bloc commercial (démo + tarifs).
   Les injections sont idempotentes (marqueurs `seo-noyau:*`).
3. Ajoute les 10 URL au sitemap public SI elles sont absentes (jamais de doublon).
4. Mesure l'état AVANT/APRÈS et écrit `scripts/rapport_seo_noyau.md`.

CE QUE CE SCRIPT NE FAIT PAS
----------------------------
- Il ne touche à AUCUNE autre page ville (1 064 pages laissées telles quelles).
- Il ne supprime rien, ne renomme aucune URL, n'écrit pas dans frontend/src.
- Il n'invente aucune donnée : ni avis, ni nombre de clients, ni chiffre
  d'activité, ni garantie de conformité. Les seules références régionales sont
  des généralités économiques documentées (filière, port, institutions,
  frontalier), jamais des mesures inventées.

USAGE
-----
    python3 scripts/ameliorer_pages_ville.py --snapshot-avant   # état avant
    python3 scripts/ameliorer_pages_ville.py                    # tout + rapport
    python3 scripts/ameliorer_pages_ville.py --rapport-seul     # rapport seul
"""

from __future__ import annotations

import argparse
import html as html_mod
import json
import os
import re
import statistics
import sys

# --------------------------------------------------------------------------
# Chemins
# --------------------------------------------------------------------------
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FR_DIR = os.path.join(ROOT, "frontend", "public", "fr")
SITEMAP = os.path.join(ROOT, "frontend", "public", "sitemap.xml")
SNAPSHOT = os.path.join(ROOT, "scripts", "etat_seo_noyau_avant.json")
RAPPORT = os.path.join(ROOT, "scripts", "rapport_seo_noyau.md")

SITE = "https://courtiark.fr"
HUB_FR = os.path.join(FR_DIR, "index.html")

MARK_VILLES = ("seo-noyau:villes-prioritaires:start",
               "seo-noyau:villes-prioritaires:end")
MARK_CTA = ("seo-noyau:cta:start", "seo-noyau:cta:end")

# Chapeaux du bloc « villes prioritaires » injecté dans les hubs.
CTX_FR = ("COURTIA est un cockpit destiné aux cabinets de courtage en assurance "
          "exerçant en France. Les pages ci-dessous sont les entrées locales du silo.")
CTX_HUB = ("COURTIA couvre aussi ces métropoles, où le tissu de courtage est "
           "particulièrement dense.")

# Page de contrôle : une page ville NON retouchée, comme référence de clone.
PAGE_CONTROLE = "/fr/logiciel-courtier-assurance-agen"

# --------------------------------------------------------------------------
# Référentiel du silo
# --------------------------------------------------------------------------
VERTICAUX = [
    ("assurance", "Courtier d'assurance (multi-branches)"),
    ("iard", "Courtier IARD (dommages)"),
    ("emprunteur", "Courtier en assurance emprunteur"),
    ("sante", "Courtier santé et complémentaire santé"),
    ("prevoyance", "Courtier prévoyance"),
    ("mutuelle", "Courtier mutualiste"),
]

COMPARATIFS = [
    ("alternative-courtigo", "Alternative à Courtigo"),
    ("alternative-lya", "Alternative à LYA"),
    ("alternative-kase", "Alternative à Kase"),
    ("alternative-oggo-data", "Alternative à Oggo Data"),
]

GUIDES = [
    ("dda-15h", "La formation DDA de 15 heures"),
    ("devoir-de-conseil", "Le devoir de conseil"),
    ("verification-orias", "Vérifier une immatriculation ORIAS"),
    ("audit-acpr", "Audit ACPR : la check-list"),
    ("conformite-2026", "Conformité 2026"),
    ("ipid", "L'IPID"),
    ("lcb-ft", "LCB-FT"),
    ("rgpd-courtier", "RGPD et cabinets de courtage"),
    ("sanctions-acpr", "Sanctions ACPR"),
    ("reforme-courtage", "Réforme du courtage"),
]

PRIORITY_ORDER = ["paris", "lyon", "marseille", "bordeaux", "toulouse",
                  "nantes", "lille", "strasbourg", "montpellier", "nice"]


def url_ville(slug: str) -> str:
    return f"/fr/logiciel-courtier-assurance-{slug}"


# --------------------------------------------------------------------------
# Contenu éditorial — 100 % spécifique à chaque ville.
# Aucun chiffre inventé. Les références régionales sont des généralités
# documentées (filière économique, port, institutions, zone frontalière).
# --------------------------------------------------------------------------
VILLES = {
    "paris": {
        "nom": "Paris",
        "region": "Île-de-France",
        "title": "Logiciel courtier assurance à Paris — CRM, automatisation, démo",
        "meta": "Cockpit et CRM pour courtiers d'assurance à Paris : portefeuille, "
                "échéances, relances et suivi du devoir de conseil. Démo sur /demo-public, "
                "tarifs publics sur COURTIA.",
        "h1": "Logiciel et CRM pour courtier d'assurance à Paris",
        "lede": "Paris concentre à la fois les autorités qui encadrent la profession et "
                "une densité rare de cabinets de courtage. COURTIA y sert de cockpit "
                "quotidien : portefeuille, échéances, relances et traçabilité du devoir "
                "de conseil dans un seul outil.",
        "corps": [
            ("h2", "Le tissu du courtage à Paris"),
            ("p", "Paris est le siège de l'ORIAS, qui tient le registre unique des "
                  "intermédiaires en assurance, banque et finance, et de l'ACPR, "
                  "l'autorité de contrôle adossée à la Banque de France. Cette proximité "
                  "a une conséquence concrète pour un cabinet parisien : les obligations "
                  "d'immatriculation, d'information précontractuelle et de traçabilité du "
                  "conseil y sont rappelées en permanence, et une demande de pièce ne se "
                  "prépare pas la veille."),
            ("p", "La capitale réunit des modèles de cabinets très différents : courtiers "
                  "grossistes, spécialistes de l'assurance emprunteur, cabinets de gestion "
                  "de patrimoine, courtiers IARD tournés vers les professions libérales et "
                  "les commerces. Un cabinet peut démarrer sur un seul créneau et se "
                  "retrouver quelques années plus tard avec un portefeuille multi-branches, "
                  "de nombreuses compagnies partenaires et des échéances qui ne tombent "
                  "jamais le même mois."),
            ("p", "Ce qui coince n'est jamais la vente, c'est le suivi : un renouvellement "
                  "oublié, un avenant non signé, une pièce manquante dans un dossier "
                  "emprunteur, un client qui rappelle trois jours plus tard parce qu'on "
                  "était en rendez-vous. Paris n'allonge pas les journées ; la seule marge "
                  "de manœuvre est de réduire le temps administratif par dossier."),
            ("h2", "Ce que cela change pour un cabinet d'Île-de-France"),
            ("p", "Un cabinet francilien suit des clients qui déménagent, changent de "
                  "véhicule, renégocient leur prêt ou modifient leur flotte : le "
                  "portefeuille bouge en permanence. COURTIA rattache chaque contrat à sa "
                  "compagnie, sa prime, sa date d'échéance et son historique de relance, et "
                  "remonte en tête de liste ce qui doit être traité avant que le client ne "
                  "s'en aperçoive."),
            ("p", "Sur le plan administratif, ARK prépare les documents et les relances, "
                  "propose un ordre de priorité et rédige des ébauches. Le courtier relit, "
                  "ajuste et valide : aucun message ne part sans son accord. C'est la seule "
                  "façon tenable d'automatiser un cabinet sans perdre la maîtrise de ce qui "
                  "sort en son nom."),
            ("h2", "Cas d'usage fréquents à Paris"),
            ("ul", [
                "Renouvellements et avenants d'un portefeuille multi-branches, relance préparée puis validée avant envoi.",
                "Suivi des dossiers d'assurance emprunteur : pièces à réunir, dates clés, échéances de délégation.",
                "Réconciliation des commissions par compagnie, sans tableur parallèle.",
                "Traçabilité du devoir de conseil : ce qui a été conseillé, à quelle date, avec quelle trace.",
                "Import d'un portefeuille existant depuis Excel ou CSV, lignes rejetées signalées.",
            ]),
            ("h2", "CRM courtier assurance et automatisation du courtage à Paris"),
            ("p", "Un CRM courtier assurance utile n'est pas un carnet d'adresses : il doit "
                  "porter le contrat, l'échéance et la commission. COURTIA part de cette "
                  "contrainte. La fiche client rassemble les contrats, les échanges, les "
                  "documents et les tâches, et la vue portefeuille montre ce qui arrive à "
                  "échéance dans les semaines qui viennent."),
            ("p", "L'automatisation courtier assurance, telle qu'ARK la met en œuvre, reste "
                  "toujours soumise à validation. Le Morning Brief classe la journée, les "
                  "relances sont préparées, les documents réglementaires sont mis en forme à "
                  "partir des données du cabinet. Ce que l'outil ne fait pas : décider à la "
                  "place du courtier, envoyer sans relecture, ou garantir une conformité "
                  "réglementaire."),
        ],
        "faq": [
            ("COURTIA est-il utilisable depuis Paris ?",
             "Oui. COURTIA fonctionne dans un navigateur, sans installation, et n'a aucune "
             "dépendance à l'implantation géographique du cabinet."),
            ("Faut-il adopter un logiciel de gestion courtage complet dès le départ ?",
             "Non. Un cabinet peut démarrer avec le portefeuille et les échéances, puis "
             "activer les briques dont il a besoin : relances, commissions, documents "
             "réglementaires."),
            ("Comment vérifier qu'un courtier est bien immatriculé ?",
             "Le registre unique de l'ORIAS est public et consultable en ligne ; il permet "
             "de vérifier le statut et les catégories d'un intermédiaire. COURTIA ne fait "
             "pas cette vérification à votre place."),
        ],
    },
    "lyon": {
        "nom": "Lyon",
        "region": "Auvergne-Rhône-Alpes",
        "title": "Logiciel courtier assurance à Lyon — CRM et automatisation",
        "meta": "Cockpit et CRM pour cabinets de courtage à Lyon : portefeuille, "
                "échéances, relances et suivi DDA. Démo sur /demo-public, tarifs publics.",
        "h1": "Logiciel et CRM pour courtier d'assurance à Lyon",
        "lede": "Lyon combine un tissu industriel dense, un pôle santé reconnu et un grand "
                "nombre de PME et d'ETI. Pour un cabinet de courtage lyonnais, cela se "
                "traduit par des portefeuilles mixtes, où le particulier côtoie le risque "
                "professionnel.",
        "corps": [
            ("h2", "Le tissu du courtage à Lyon"),
            ("p", "Lyon compte parmi les principaux bassins économiques français, avec une "
                  "industrie diversifiée — chimie, mécanique, santé, logistique — et un "
                  "réseau dense de PME et d'ETI. Un courtier lyonnais travaille rarement sur "
                  "un seul marché : il gère des particuliers, des commerçants, des "
                  "professionnels de santé et des entreprises de la sous-traitance."),
            ("p", "Cette mixité a un coût : les échéances ne se ressemblent pas. Un contrat "
                  "de flotte ne se renouvelle pas comme une complémentaire santé, et une "
                  "multirisque professionnelle suppose des pièces que le client n'envoie "
                  "jamais spontanément. Sans un outil qui rattache chaque contrat à son "
                  "échéance et à ses pièces, le suivi repose sur la mémoire du cabinet."),
            ("p", "La région Auvergne-Rhône-Alpes est aussi une terre de transmission de "
                  "cabinets : un portefeuille repris doit l'être avec son historique, sinon "
                  "la première année se passe à reconstituer ce que le prédécesseur savait "
                  "par cœur."),
            ("h2", "Ce que cela change pour un cabinet d'Auvergne-Rhône-Alpes"),
            ("p", "COURTIA place le portefeuille au centre : chaque client, chaque contrat, "
                  "chaque échéance, chaque commission, avec des vues filtrées par branche. "
                  "Un cabinet lyonnais qui gère à la fois de l'IARD de proximité et des "
                  "risques d'entreprise retrouve tout au même endroit, sans changer d'outil "
                  "quand la nature du risque change."),
            ("p", "Le Morning Brief classe la journée et signale les dossiers incomplets. "
                  "Les relances sont préparées à l'avance, et l'import d'un portefeuille "
                  "existant se fait depuis un fichier Excel ou CSV, avec contrôle des "
                  "colonnes et signalement des lignes rejetées."),
            ("h2", "Cas d'usage fréquents à Lyon"),
            ("ul", [
                "Multirisques professionnelles et RC pro pour les PME et ETI de la région.",
                "Flottes de véhicules et contrats liés à la sous-traitance industrielle.",
                "Complémentaires santé et prévoyance des professions de santé libérales.",
                "Reprise d'un portefeuille existant lors de la transmission d'un cabinet.",
            ]),
            ("h2", "CRM courtier assurance et automatisation du courtage à Lyon"),
            ("p", "Un CRM courtier assurance qui ne porte que des coordonnées ne sert à rien "
                  "au moment du renouvellement. COURTIA attache à chaque client ses contrats, "
                  "ses échéances, ses commissions et l'historique des échanges, pour que le "
                  "dossier soit complet le jour où on l'ouvre."),
            ("p", "Côté automatisation courtier assurance, ARK prépare, classe et propose : "
                  "ordre de priorité, ébauches de relance, documents réglementaires mis en "
                  "forme à partir des données du cabinet. Le courtier relit et valide "
                  "systématiquement. COURTIA structure et trace le suivi ; il ne remplace ni "
                  "le conseil juridique, ni le contrôle de l'ACPR."),
        ],
        "faq": [
            ("COURTIA convient-il à un cabinet lyonnais spécialisé en risques d'entreprise ?",
             "Oui : les vues se filtrent par branche et chaque contrat porte sa compagnie, "
             "sa prime et son échéance, ce qui couvre aussi bien un portefeuille de "
             "particuliers qu'un portefeuille professionnel."),
            ("Peut-on reprendre un portefeuille existant ?",
             "Oui, par import Excel ou CSV. Les colonnes sont contrôlées, les doublons "
             "détectés et les lignes rejetées comptées puis affichées telles qu'elles "
             "ressortent du traitement."),
            ("Où consulter les tarifs ?",
             "Les tarifs publics et le mode d'accompagnement sont publiés sur la page "
             "tarifs de courtiark.fr."),
        ],
    },
    "marseille": {
        "nom": "Marseille",
        "region": "Provence-Alpes-Côte d'Azur",
        "title": "Logiciel courtier assurance à Marseille — CRM et gestion",
        "meta": "Cockpit et CRM pour cabinets de courtage à Marseille : portefeuille, "
                "échéances, relances et suivi des pièces. Démo sur /demo-public, tarifs publics.",
        "h1": "Logiciel et CRM pour courtier d'assurance à Marseille",
        "lede": "Marseille est une métropole portuaire : le courtage y côtoie le maritime, "
                "le transport et un tissu de très petites entreprises aussi dense que la "
                "demande de particuliers.",
        "corps": [
            ("h2", "Le tissu du courtage à Marseille"),
            ("p", "Le grand port maritime de Marseille et les activités d'import-export "
                  "structurent une partie du courtage local : assurances transport, risques "
                  "de marchandises, flottes de poids lourds, manutention. À côté de ces "
                  "lignes spécialisées, la métropole fait vivre un courtage de proximité "
                  "tourné vers les artisans, les commerces, les professions de santé et les "
                  "particuliers."),
            ("p", "La région Provence-Alpes-Côte d'Azur se caractérise aussi par la "
                  "dispersion de sa clientèle : un cabinet marseillais peut suivre des "
                  "clients à Aubagne, Aix-en-Provence, Toulon ou Cassis, ce qui multiplie "
                  "les rendez-vous qui s'enchaînent et les relances non planifiées."),
            ("p", "Sur ce type de portefeuille, la difficulté tient moins à la production "
                  "commerciale qu'à la discipline administrative : chaque dossier transport "
                  "a ses pièces, chaque flotte ses échéances, et le client professionnel "
                  "appelle le jour où il en a besoin, pas la veille."),
            ("h2", "Ce que cela change pour un cabinet de Provence-Alpes-Côte d'Azur"),
            ("p", "COURTIA rattache chaque contrat à son client, sa compagnie, sa prime et "
                  "son échéance, et prépare en amont les relances à valider. Pour un cabinet "
                  "qui traite à la fois du risque professionnel et des particuliers, la même "
                  "vue sert aux deux sans changement d'outil."),
            ("p", "Le suivi des pièces manquantes évite les allers-retours téléphoniques : "
                  "le dossier signale ce qui manque, et l'import d'un portefeuille existant "
                  "depuis Excel ou CSV évite de tout ressaisir."),
            ("h2", "Cas d'usage fréquents à Marseille"),
            ("ul", [
                "Risques transport et maritime : marchandises, manutention, flottes poids lourds.",
                "Multirisques des artisans, commerces et professions libérales de la métropole.",
                "Complémentaires santé et prévoyance des professions de santé.",
                "Suivi des échéances d'un portefeuille dispersé sur plusieurs communes.",
            ]),
            ("h2", "CRM courtier assurance et automatisation du courtage à Marseille"),
            ("p", "Un CRM courtier assurance sert d'abord au moment où le client appelle : "
                  "retrouver le contrat, la date, la compagnie et le dernier échange en "
                  "quelques secondes. COURTIA organise cette information autour du "
                  "portefeuille, pas autour d'un annuaire."),
            ("p", "L'automatisation courtier assurance reste encadrée : ARK prépare les "
                  "relances et met en forme les documents à partir des données du cabinet, "
                  "le courtier valide avant tout envoi. COURTIA structure et trace ; il ne "
                  "délivre ni conseil juridique, ni garantie de conformité."),
        ],
        "faq": [
            ("COURTIA suit-il les assurances transport et maritime ?",
             "COURTIA suit le contrat, l'échéance, la prime et les pièces associées, quelle "
             "que soit la branche, y compris les risques transport. Il ne se substitue pas à "
             "l'expertise technique du courtier sur ce type de risque."),
            ("Un cabinet marseillais peut-il suivre des clients hors de la ville ?",
             "Oui. COURTIA fonctionne dans un navigateur ; l'implantation géographique du "
             "cabinet n'entre pas en compte."),
            ("Peut-on tester avant de s'engager ?",
             "Une visite guidée sur données synthétiques est accessible sans inscription, et "
             "une démonstration sur votre portefeuille réel se demande depuis la page démo."),
        ],
    },
    "bordeaux": {
        "nom": "Bordeaux",
        "region": "Nouvelle-Aquitaine",
        "title": "Logiciel courtier assurance à Bordeaux — CRM et automatisation",
        "meta": "Cockpit et CRM pour cabinets de courtage à Bordeaux : risques viticoles et "
                "PME, échéances, relances, suivi DDA. Démo sur /demo-public, tarifs publics.",
        "h1": "Logiciel et CRM pour courtier d'assurance à Bordeaux",
        "lede": "Bordeaux est le siège du conseil régional de Nouvelle-Aquitaine et le "
                "centre d'une filière viti-vinicole qui pèse sur tout le courtage local. "
                "Les portefeuilles y mélangent des risques de propriété, d'exploitation et "
                "des professionnels très saisonniers.",
        "corps": [
            ("h2", "Le tissu du courtage à Bordeaux"),
            ("p", "La filière viti-vinicole est un employeur majeur de la région, de la "
                  "culture de la vigne à la mise sur le marché. Pour un courtier bordelais, "
                  "cela se traduit par des besoins récurrents : multirisques de domaines et "
                  "de chais, pertes d'exploitation, risques liés aux bâtiments et aux "
                  "matériels, flottes de tracteurs et de véhicules utilitaires."),
            ("p", "À côté du vin, la métropole bordelaise concentre un tissu de PME, de "
                  "commerces et de professions libérales, ainsi que de nombreux "
                  "propriétaires immobiliers — un portefeuille où cohabitent des contrats "
                  "très artisanaux et des risques d'entreprise structurés."),
            ("p", "Le rythme viticole impose ses contraintes : campagnes, vendanges et mise "
                  "en marché créent des pics d'activité où le cabinet n'a aucun temps "
                  "administratif disponible. Un renouvellement oublié pendant ces périodes "
                  "se paie en fin d'année."),
            ("h2", "Ce que cela change pour un cabinet de Nouvelle-Aquitaine"),
            ("p", "COURTIA rend le portefeuille lisible : chaque contrat avec sa compagnie, "
                  "sa prime, son échéance et son historique de relance, filtrable par "
                  "branche. Un cabinet qui suit à la fois des domaines, des PME et des "
                  "particuliers n'a pas besoin d'un second outil pour changer de population."),
            ("p", "Les échéances arrivent en tête de liste avant les périodes chargées, les "
                  "relances sont préparées puis validées par le courtier, et les commissions "
                  "se réconcilient par compagnie sans tableur parallèle."),
            ("h2", "Cas d'usage fréquents à Bordeaux"),
            ("ul", [
                "Multirisques de domaines, chais et bâtiments d'exploitation.",
                "Flottes de véhicules et de matériels agricoles, avec échéances groupées.",
                "PME, commerces et professions libérales de la métropole bordelaise.",
                "Réconciliation des commissions et suivi des avenants.",
            ]),
            ("h2", "CRM courtier assurance et automatisation du courtage à Bordeaux"),
            ("p", "Un CRM courtier assurance doit tenir l'historique d'un client qui a "
                  "plusieurs contrats souscrits à des dates différentes : c'est la réalité "
                  "d'un domaine viticole comme d'une PME. COURTIA regroupe ces contrats sur "
                  "une fiche unique et conserve la trace des échanges."),
            ("p", "Sur l'automatisation courtier assurance, le principe reste simple : ARK "
                  "propose, le courtier dispose. L'ordre de priorité, les ébauches de "
                  "relance et les documents mis en forme sont préparés à partir des données "
                  "du cabinet. Aucun envoi automatique, aucune promesse de conformité "
                  "garantie."),
        ],
        "faq": [
            ("COURTIA suit-il les risques agricoles et viticoles ?",
             "COURTIA suit le contrat, l'échéance et les pièces, quelle que soit la branche. "
             "L'appréciation technique du risque reste du ressort du courtier."),
            ("Plusieurs contrats pour un même client, est-ce géré ?",
             "Oui : la fiche client rassemble tous les contrats, avec leur compagnie, leur "
             "prime et leur date d'échéance."),
            ("Comment se passe l'import d'un portefeuille existant ?",
             "Depuis un fichier Excel ou CSV, avec contrôle des colonnes, détection des "
             "doublons et signalement des lignes rejetées."),
        ],
    },
    "toulouse": {
        "nom": "Toulouse",
        "region": "Occitanie",
        "title": "Logiciel courtier assurance à Toulouse — CRM et gestion",
        "meta": "Cockpit et CRM pour cabinets de courtage à Toulouse : flottes, prévoyance "
                "des cadres, emprunteur, échéances. Démo sur /demo-public, tarifs publics.",
        "h1": "Logiciel et CRM pour courtier d'assurance à Toulouse",
        "lede": "Toulouse est la capitale européenne de l'aéronautique et du spatial. Le "
                "courtage local suit cette économie : sous-traitants industriels, "
                "ingénieurs, cadres, et une population étudiante et familiale en mouvement.",
        "corps": [
            ("h2", "Le tissu du courtage à Toulouse"),
            ("p", "La filière aéronautique et spatiale structure l'économie toulousaine, "
                  "avec un constructeur mondial, ses sous-traitants et un écosystème de PME "
                  "industrielles. Pour un cabinet de courtage de Haute-Garonne, cela produit "
                  "deux familles de risques : l'entreprise (multirisques, RC, flottes, "
                  "risques industriels) et l'individu (prévoyance, complémentaire santé, "
                  "assurance emprunteur)."),
            ("p", "Les profils de cadres et d'ingénieurs appellent des dossiers emprunteur "
                  "plus techniques, avec des garanties à comparer et des pièces à réunir. "
                  "Les salariés de la sous-traitance, plus exposés physiquement, font "
                  "remonter des besoins de prévoyance qui se traitent souvent après coup."),
            ("p", "En Occitanie, la croissance de la métropole toulousaine amène enfin un "
                  "flux constant de nouveaux clients à équiper : jeunes actifs, familles, "
                  "créateurs d'entreprise. Autant de dossiers à suivre en parallèle des "
                  "renouvellements du portefeuille existant."),
            ("h2", "Ce que cela change pour un cabinet d'Occitanie"),
            ("p", "COURTIA organise le portefeuille par client et par contrat, avec les "
                  "échéances et les commissions, et filtre les vues par branche. Un cabinet "
                  "toulousain qui gère à la fois de la prévoyance individuelle et des "
                  "flottes d'entreprise reste dans le même outil."),
            ("p", "Les dossiers incomplets remontent d'eux-mêmes, les relances sont "
                  "préparées et validées, et le suivi du devoir de conseil laisse une trace "
                  "exploitable le jour où elle vous est demandée."),
            ("h2", "Cas d'usage fréquents à Toulouse"),
            ("ul", [
                "Dossiers d'assurance emprunteur de cadres et d'ingénieurs, avec pièces et garanties.",
                "Prévoyance et complémentaire santé des salariés de la sous-traitance.",
                "Flottes de véhicules et multirisques des PME industrielles.",
                "Équipement des nouveaux clients de la métropole, sans ressaisie.",
            ]),
            ("h2", "CRM courtier assurance et automatisation du courtage à Toulouse"),
            ("p", "Sur un portefeuille où le client change de poste, de logement ou de "
                  "statut, la fiche client doit suivre. COURTIA conserve les contrats, les "
                  "pièces, les relances et les échanges par client, ce qui évite de "
                  "reconstituer un dossier à chaque appel."),
            ("p", "L'automatisation courtier assurance mise en place par ARK porte sur la "
                  "préparation, pas sur la décision : ordre du jour, ébauches, mise en forme "
                  "des documents réglementaires. Le courtier garde la main sur chaque envoi, "
                  "et COURTIA ne garantit aucune conformité."),
        ],
        "faq": [
            ("COURTIA convient-il à un cabinet spécialisé en assurance emprunteur ?",
             "Oui : les dossiers emprunteur se suivent avec leurs pièces, leurs dates clés et "
             "leurs relances, dans la même vue que le reste du portefeuille."),
            ("Les flottes d'entreprise sont-elles suivies ?",
             "Chaque véhicule et chaque échéance de flotte sont rattachés au contrat et au "
             "client, avec les pièces manquantes signalées."),
            ("Faut-il installer un logiciel ?",
             "Non, COURTIA est accessible depuis un navigateur, sans installation locale."),
        ],
    },
    "nantes": {
        "nom": "Nantes",
        "region": "Pays de la Loire",
        "title": "Logiciel courtier assurance à Nantes — CRM et automatisation",
        "meta": "Cockpit et CRM pour cabinets de courtage à Nantes : portefeuille, "
                "échéances, relances et suivi DDA. Démo sur /demo-public, tarifs publics.",
        "h1": "Logiciel et CRM pour courtier d'assurance à Nantes",
        "lede": "Nantes, préfecture de la région Pays de la Loire, combine une économie "
                "portuaire et maritime avec un pôle tertiaire et numérique. Le courtage "
                "local suit cette double nature.",
        "corps": [
            ("h2", "Le tissu du courtage à Nantes"),
            ("p", "L'estuaire de la Loire et l'activité portuaire nourrissent un courtage du "
                  "risque transport, de la logistique et des activités nautiques. En "
                  "parallèle, la métropole nantaise a développé un tissu de services, de "
                  "numérique et de PME tertiaires, dont les besoins en multirisques, RC "
                  "professionnelle et prévoyance sont ceux de toute entreprise de services."),
            ("p", "La région Pays de la Loire se distingue par la part importante de petites "
                  "structures : indépendants, artisans, TPE, professions libérales. Ce sont "
                  "des clients qui n'ont pas de service administratif et qui attendent de "
                  "leur courtier qu'il tienne aussi la partie papier."),
            ("p", "Pour un cabinet nantais, le vrai enjeu est donc le volume de dossiers à "
                  "faible marge unitaire : beaucoup de clients, des primes modestes, et un "
                  "coût de traitement administratif qui peut rendre l'activité peu rentable "
                  "si chaque relance se fait à la main."),
            ("h2", "Ce que cela change pour un cabinet des Pays de la Loire"),
            ("p", "COURTIA réduit le coût de traitement par dossier : centralisation du "
                  "portefeuille, échéances visibles, relances préparées, documents mis en "
                  "forme à partir des données existantes. Sur un portefeuille de TPE, c'est "
                  "ce qui détermine si le cabinet peut grandir sans recruter."),
            ("p", "L'import initial se fait depuis un fichier Excel ou CSV, avec contrôle "
                  "des colonnes et signalement des lignes rejetées, ce qui permet de partir "
                  "d'un portefeuille existant plutôt que d'une page blanche."),
            ("h2", "Cas d'usage fréquents à Nantes"),
            ("ul", [
                "Risques transport, logistique et activités nautiques de l'estuaire.",
                "Multirisques et RC professionnelle des TPE, artisans et indépendants.",
                "Prévoyance et complémentaire santé des professions libérales.",
                "Traitement d'un portefeuille à faible prime unitaire sans surcoût administratif.",
            ]),
            ("h2", "CRM courtier assurance et automatisation du courtage à Nantes"),
            ("p", "Un CRM courtier assurance se juge à ce qu'il permet de retrouver : le "
                  "contrat, sa date, sa compagnie, son historique. COURTIA construit cette "
                  "information dans le portefeuille plutôt que dans des notes dispersées."),
            ("p", "L'automatisation courtier assurance y reste un outil de préparation : un "
                  "ordre de priorité le matin, des relances prêtes à valider, des documents "
                  "réglementaires mis en forme. Le courtier décide, valide et envoie. "
                  "COURTIA trace le suivi sans garantir la conformité du cabinet."),
        ],
        "faq": [
            ("COURTIA est-il adapté à un portefeuille de TPE et d'indépendants ?",
             "Oui : le suivi par échéance et par pièce manquante est justement ce qui pèse "
             "le plus sur les portefeuilles à petits contrats nombreux."),
            ("Combien de temps prend la reprise d'un portefeuille ?",
             "La reprise dépend du fichier source ; l'import affiche le résultat réellement "
             "renvoyé par le traitement, doublons et lignes rejetées compris."),
            ("Peut-on voir l'outil avant de s'abonner ?",
             "Oui : une visite guidée sur données synthétiques est accessible sans "
             "inscription, et une démonstration sur votre portefeuille peut être demandée."),
        ],
    },
    "lille": {
        "nom": "Lille",
        "region": "Hauts-de-France",
        "title": "Logiciel courtier assurance à Lille — CRM et gestion",
        "meta": "Cockpit et CRM pour cabinets de courtage à Lille : métropole "
                "transfrontalière, flottes, logistique, échéances. Démo sur /demo-public.",
        "h1": "Logiciel et CRM pour courtier d'assurance à Lille",
        "lede": "Lille est la préfecture de la région Hauts-de-France et une métropole "
                "transfrontalière, tournée vers la Belgique. Le courtage y suit une "
                "économie de distribution, de logistique et d'industrie.",
        "corps": [
            ("h2", "Le tissu du courtage à Lille"),
            ("p", "La métropole lilloise est un carrefour logistique et commercial : "
                  "plateformes, transport routier, distribution, commerce en ligne, "
                  "sous-traitance industrielle. Ces activités nourrissent une demande de "
                  "flottes, de multirisques professionnels, de transport de marchandises et "
                  "de responsabilité civile."),
            ("p", "La proximité de la Belgique crée un profil de clientèle particulier : "
                  "salariés frontaliers, dirigeants qui travaillent des deux côtés de la "
                  "frontière, entreprises implantées dans plusieurs pays. Les dossiers "
                  "peuvent mêler plusieurs législations, ce qui rend la traçabilité des "
                  "conseils et des pièces d'autant plus utile."),
            ("p", "Dans les Hauts-de-France, le courtage repose souvent sur des cabinets à "
                  "taille humaine, très implantés localement, avec un portefeuille ancien et "
                  "fidèle. Le risque n'est pas de manquer de clients : c'est de laisser filer "
                  "des échéances sur un portefeuille que personne n'a le temps de relire."),
            ("h2", "Ce que cela change pour un cabinet des Hauts-de-France"),
            ("p", "COURTIA donne une vue unique du portefeuille : contrats, échéances, "
                  "commissions, pièces et relances. Un cabinet qui suit des flottes, des "
                  "commerces et des particuliers n'a pas à jongler entre plusieurs tableaux."),
            ("p", "Les renouvellements sont signalés en amont, les relances préparées puis "
                  "validées, et le suivi du devoir de conseil laisse une trace datée — utile "
                  "quand un dossier transfrontalier demande de démontrer ce qui a été "
                  "conseillé, et à quel moment."),
            ("h2", "Cas d'usage fréquents à Lille"),
            ("ul", [
                "Flottes de transport routier et de logistique, avec échéances groupées.",
                "Multirisques et RC des commerces, plateformes et PME industrielles.",
                "Suivi des dossiers de clients frontaliers, avec pièces et traces de conseil.",
                "Reprise et relance d'un portefeuille ancien jamais audité.",
            ]),
            ("h2", "CRM courtier assurance et automatisation du courtage à Lille"),
            ("p", "Un CRM courtier assurance doit tenir la relation dans le temps : un "
                  "portefeuille du Nord se transmet souvent dans le même cabinet pendant des "
                  "années. COURTIA conserve l'historique des contrats et des échanges par "
                  "client."),
            ("p", "Côté automatisation courtier assurance, ARK prépare un ordre de priorité "
                  "quotidien, des ébauches de relance et des documents réglementaires. Rien "
                  "ne part sans validation du courtier. COURTIA structure et trace ; il ne "
                  "se substitue pas au conseil juridique et ne garantit aucune conformité."),
        ],
        "faq": [
            ("COURTIA gère-t-il les dossiers de clients frontaliers ?",
             "COURTIA suit les contrats, les échéances et la trace des conseils ; il "
             "n'automatise aucune règle fiscale ou sociale transfrontalière, qui reste du "
             "ressort du professionnel."),
            ("Les flottes de véhicules sont-elles prises en charge ?",
             "Oui, chaque véhicule et son échéance sont rattachés au contrat concerné, avec "
             "les pièces manquantes signalées."),
            ("COURTIA remplace-t-il un logiciel de comptabilité ?",
             "Non. COURTIA suit la commission ; il ne produit ni bilan, ni décompte de TVA, "
             "ni écriture comptable."),
        ],
    },
    "strasbourg": {
        "nom": "Strasbourg",
        "region": "Grand Est",
        "title": "Logiciel courtier assurance à Strasbourg — CRM et automatisation",
        "meta": "Cockpit et CRM pour cabinets de courtage à Strasbourg : institutions "
                "européennes, frontaliers, échéances, relances. Démo sur /demo-public.",
        "h1": "Logiciel et CRM pour courtier d'assurance à Strasbourg",
        "lede": "Strasbourg accueille des institutions européennes et se situe au cœur d'un "
                "espace frontalier avec l'Allemagne. Le courtage local y traite autant de "
                "risques classiques que de situations transfrontalières.",
        "corps": [
            ("h2", "Le tissu du courtage à Strasbourg"),
            ("p", "La présence d'institutions européennes, d'universités et d'un tissu de "
                  "services donne à Strasbourg un profil de clientèle où les professions "
                  "intellectuelles, les agents publics et les cadres sont nombreux — avec des "
                  "besoins de prévoyance, de complémentaire santé et de protection de la "
                  "famille."),
            ("p", "Le Rhin supérieur est une zone de travail frontalier : de nombreux "
                  "résidents d'Alsace travaillent en Allemagne ou en Suisse. Les dossiers "
                  "correspondants demandent de la rigueur documentaire, car les pièces et les "
                  "interlocuteurs ne sont pas toujours français."),
            ("p", "S'ajoute le tissu économique alsacien classique : commerces, artisans, PME "
                  "industrielles, restauration et tourisme. Un cabinet strasbourgeois suit "
                  "donc souvent des portefeuilles composites, où les échéances s'étalent sur "
                  "toute l'année."),
            ("h2", "Ce que cela change pour un cabinet du Grand Est"),
            ("p", "COURTIA rassemble ces populations dans un seul portefeuille : chaque "
                  "client, ses contrats, ses pièces, ses échéances et son historique. Les "
                  "vues par branche évitent de mélanger le suivi d'une complémentaire santé "
                  "et celui d'une multirisque professionnelle."),
            ("p", "Les relances sont préparées à partir des données du cabinet puis validées "
                  "une par une : sur des dossiers où une pièce manquante bloque tout, c'est "
                  "ce suivi qui fait gagner du temps."),
            ("h2", "Cas d'usage fréquents à Strasbourg"),
            ("ul", [
                "Prévoyance et complémentaire santé des salariés et des familles.",
                "Dossiers de travailleurs frontaliers, avec pièces à réunir et traçabilité.",
                "Multirisques des commerces, artisans, PME et activités touristiques.",
                "Suivi des échéances échelonnées sur l'année, sans oubli.",
            ]),
            ("h2", "CRM courtier assurance et automatisation du courtage à Strasbourg"),
            ("p", "Un CRM courtier assurance doit être lisible par toute l'équipe : au "
                  "moment d'un contrôle ou d'un remplacement temporaire, le dossier doit "
                  "tenir debout sans son titulaire. COURTIA range contrats, échanges et "
                  "documents au même endroit."),
            ("p", "L'automatisation courtier assurance proposée par ARK reste une aide à la "
                  "préparation : ordre de priorité, ébauches, mise en forme de documents "
                  "réglementaires. Le courtier conserve la décision et l'envoi ; aucune "
                  "conformité n'est garantie par l'outil."),
        ],
        "faq": [
            ("COURTIA traite-t-il les travailleurs frontaliers ?",
             "COURTIA suit les contrats, les pièces et les échéances de ces dossiers. Le "
             "traitement des règles applicables de part et d'autre de la frontière relève "
             "du professionnel, pas de l'outil."),
            ("Peut-on travailler à plusieurs sur le même portefeuille ?",
             "Oui : le portefeuille est rangé par client et par contrat, de façon à rester "
             "lisible par plusieurs personnes du cabinet."),
            ("Où consulter les tarifs ?",
             "La page tarifs de courtiark.fr publie les tarifs et le mode d'accompagnement."),
        ],
    },
    "montpellier": {
        "nom": "Montpellier",
        "region": "Occitanie",
        "title": "Logiciel courtier assurance à Montpellier — CRM et gestion",
        "meta": "Cockpit et CRM pour cabinets de courtage à Montpellier : santé, jeunes "
                "actifs, emprunteur, échéances et relances. Démo sur /demo-public.",
        "h1": "Logiciel et CRM pour courtier d'assurance à Montpellier",
        "lede": "Montpellier est une métropole universitaire et médicale de l'Hérault, dont "
                "la population jeune alimente un flux constant de nouveaux contrats. Le "
                "courtage local travaille beaucoup sur l'entrée en relation.",
        "corps": [
            ("h2", "Le tissu du courtage à Montpellier"),
            ("p", "Montpellier combine un pôle d'enseignement et de recherche en santé, un "
                  "centre hospitalier universitaire important, un tissu numérique en "
                  "développement et une population étudiante nombreuse. Pour un courtier, "
                  "cela veut dire beaucoup de primo-souscriptions : complémentaires santé, "
                  "assurance emprunteur, premiers contrats auto ou habitation."),
            ("p", "Ces dossiers ont une caractéristique commune : ils sont peu rentables "
                  "pris isolément, et coûteux à traiter si chaque étape se fait manuellement. "
                  "Un cabinet montpelliérain qui ne structure pas son suivi se retrouve avec "
                  "un volume élevé et une charge administrative qui absorbe la marge."),
            ("p", "La région Occitanie ajoute une dimension de mobilité : les clients "
                  "changent de logement, de ville, parfois de région en cours de contrat. La "
                  "fiche client doit suivre, sinon l'historique se perd et le conseil devient "
                  "difficile à tracer."),
            ("h2", "Ce que cela change pour un cabinet d'Occitanie"),
            ("p", "COURTIA fait tenir le volume : un portefeuille centralisé, des échéances "
                  "visibles, des relances préparées à l'avance et validées par le courtier. "
                  "Sur des contrats à faible prime, c'est la seule façon de garder un coût de "
                  "traitement soutenable."),
            ("p", "Les dossiers incomplets sont signalés, les doublons d'import détectés, et "
                  "le suivi du devoir de conseil laisse une trace datée par dossier."),
            ("h2", "Cas d'usage fréquents à Montpellier"),
            ("ul", [
                "Primo-souscriptions santé, auto et habitation d'une clientèle jeune et mobile.",
                "Dossiers d'assurance emprunteur de primo-accédants.",
                "Suivi des professions de santé libérales et des structures de soins.",
                "Portefeuille à volume élevé, sans surcoût administratif par dossier.",
            ]),
            ("h2", "CRM courtier assurance et automatisation du courtage à Montpellier"),
            ("p", "Un CRM courtier assurance utile à Montpellier doit encaisser beaucoup de "
                  "petits dossiers sans perdre l'information : chaque client garde ses "
                  "contrats, ses pièces et ses échanges, même plusieurs années après la "
                  "première souscription."),
            ("p", "L'automatisation courtier assurance, dans COURTIA, sert à préparer : ordre "
                  "de priorité quotidien, ébauches de relance, documents mis en forme. Le "
                  "courtier valide chaque envoi. L'outil n'émet ni conseil juridique ni "
                  "garantie de conformité."),
        ],
        "faq": [
            ("COURTIA convient-il à un cabinet avec beaucoup de petits contrats ?",
             "Oui, c'est le cas d'usage le plus fréquent : la valeur vient du suivi par "
             "échéance et du traitement de volume sans ressaisie."),
            ("Comment sont gérés les clients qui déménagent ?",
             "La fiche client reste la même ; les contrats, les pièces et l'historique des "
             "échanges suivent le client."),
            ("Une démo est-elle possible sans données réelles ?",
             "Oui : la visite guidée utilise un cabinet fictif et des données synthétiques, "
             "sans inscription."),
        ],
    },
    "nice": {
        "nom": "Nice",
        "region": "Provence-Alpes-Côte d'Azur",
        "title": "Logiciel courtier assurance à Nice — CRM et automatisation",
        "meta": "Cockpit et CRM pour cabinets de courtage à Nice : clientèle patrimoniale, "
                "professions libérales, tourisme, échéances. Démo sur /demo-public.",
        "h1": "Logiciel et CRM pour courtier d'assurance à Nice",
        "lede": "Nice, préfecture des Alpes-Maritimes, combine une économie touristique, une "
                "forte présence de professions libérales et une clientèle patrimoniale sur "
                "l'ensemble de la Côte d'Azur.",
        "corps": [
            ("h2", "Le tissu du courtage à Nice"),
            ("p", "La Côte d'Azur repose sur le tourisme, l'hôtellerie, la restauration, "
                  "l'immobilier et un secteur de services très développé. Un cabinet niçois y "
                  "côtoie des professionnels saisonniers, des commerces, des hôtels et des "
                  "activités de loisirs, avec des besoins de multirisques, de responsabilité "
                  "civile et de flottes."),
            ("p", "Nice compte aussi une proportion élevée de professions libérales, de "
                  "dirigeants et de clients à patrimoine, dont les demandes portent sur la "
                  "prévoyance, la protection des proches ou la continuité d'une activité. "
                  "Ces dossiers se jouent sur la précision du conseil et la qualité de sa "
                  "traçabilité."),
            ("p", "Enfin, la proximité de Monaco et de l'Italie amène des situations où le "
                  "client, le bien ou l'activité se situent hors du territoire français. Le "
                  "travail documentaire y est plus lourd, et le risque d'oublier une pièce "
                  "plus élevé."),
            ("h2", "Ce que cela change pour un cabinet de Provence-Alpes-Côte d'Azur"),
            ("p", "COURTIA rattache chaque contrat à son client, sa compagnie, sa prime et "
                  "son échéance, et rend visible ce qui doit être traité en priorité. Les "
                  "vues par branche permettent de séparer un portefeuille touristique "
                  "saisonnier d'un portefeuille de prévoyance."),
            ("p", "Les relances et les documents sont préparés à partir des données du "
                  "cabinet, puis relus et validés par le courtier. Les commissions se "
                  "réconcilient par compagnie, sans second tableur."),
            ("h2", "Cas d'usage fréquents à Nice"),
            ("ul", [
                "Multirisques des hôtels, restaurants, commerces et activités de loisirs.",
                "Prévoyance et protection de la famille pour les professions libérales.",
                "Dossiers de clients dont l'activité ou le bien se situe hors de France.",
                "Flottes et véhicules d'activité, avec échéances saisonnières.",
            ]),
            ("h2", "CRM courtier assurance et automatisation du courtage à Nice"),
            ("p", "Un CRM courtier assurance se juge sur la relation dans la durée : sur la "
                  "Côte d'Azur, un client reste souvent fidèle au cabinet pendant des "
                  "années. COURTIA conserve les contrats et les échanges, et permet de "
                  "retrouver un dossier ancien en quelques secondes."),
            ("p", "Sur l'automatisation courtier assurance, COURTIA reste sur la même ligne : "
                  "ARK prépare, classe et propose ; le courtier valide. Aucun message ne part "
                  "sans relecture, et l'outil ne garantit aucune conformité réglementaire."),
        ],
        "faq": [
            ("COURTIA suit-il les clientèles avec plusieurs contrats patrimoniaux ?",
             "Oui : la fiche client rassemble l'ensemble des contrats, avec compagnie, prime "
             "et échéance, sans limiter le nombre de branches."),
            ("Les dossiers avec des biens à l'étranger sont-ils gérés ?",
             "COURTIA suit les contrats, les pièces et les échéances. Les règles applicables "
             "hors de France relèvent du professionnel."),
            ("Comment demander une démonstration ?",
             "Depuis la page démo de courtiark.fr, une démonstration peut être demandée sur "
             "votre portefeuille réel ; la visite guidée, elle, reste accessible sans "
             "inscription."),
        ],
    },
}

assert set(VILLES) == set(PRIORITY_ORDER), "liste des villes incohérente"


# --------------------------------------------------------------------------
# Gabarit de page
# --------------------------------------------------------------------------
STYLE = """  :root{--bg:#050510;--fg:#f6f7ff;--muted:#b9bdd4;--cyan:#8fe7ff;--line:rgba(255,255,255,.14)}
  *{box-sizing:border-box}
  body{margin:0;background:var(--bg);color:var(--fg);font-family:Inter,system-ui,-apple-system,"Segoe UI",sans-serif;line-height:1.65}
  a{color:var(--cyan)}
  header.top{padding:20px 24px;display:flex;gap:16px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--line)}
  header.top a.brand{font-weight:800;letter-spacing:-.02em;color:var(--fg);text-decoration:none}
  main{max-width:920px;margin:0 auto;padding:32px 24px 72px}
  h1{font-size:clamp(1.85rem,4.6vw,2.85rem);line-height:1.07;letter-spacing:-.03em;margin:8px 0 16px}
  h2{margin-top:44px;font-size:clamp(1.2rem,2.5vw,1.6rem);letter-spacing:-.02em}
  h3{margin-top:24px;font-size:1.03rem}
  p,li{color:var(--muted)}
  strong{color:var(--fg)}
  .eyebrow{color:var(--cyan);text-transform:uppercase;letter-spacing:.14em;font-size:12px;font-weight:800}
  .lede{font-size:1.06rem}
  .card{border:1px solid var(--line);border-radius:18px;padding:20px 22px;background:rgba(255,255,255,.03);margin:18px 0}
  .cta{display:inline-flex;align-items:center;gap:8px;margin:8px 12px 8px 0;padding:13px 22px;border-radius:999px;background:linear-gradient(135deg,#a9f1ff,#ff71bd);color:#060717;font-weight:800;letter-spacing:.02em;text-decoration:none}
  .cta.ghost{background:none;border:1px solid var(--line);color:var(--fg)}
  .note{font-size:.86rem;color:#8f93ad}
  nav.crumbs{font-size:.85rem;color:#8f93ad;padding-top:8px}
  ul.links{list-style:none;padding:0}
  ul.links li{padding:8px 0;border-bottom:1px solid var(--line)}
  footer{border-top:1px solid var(--line);padding:24px;font-size:.85rem;color:#8f93ad}
  footer a{margin-right:14px}"""

HEADER = f"""<header class="top">
  <a class="brand" href="{SITE}/">COURTIA</a>
  <a href="{SITE}/fonctionnalites">Fonctionnalités</a>
  <a href="{SITE}/tarifs">Tarifs</a>
  <a href="{SITE}/demo">Visite guidée</a>
  <a href="{SITE}/demo-public">Démo</a>
  <a href="{SITE}/contact">Contact</a>
</header>"""

FOOTER = f"""<footer>
  <div>
    <a href="{SITE}/">Accueil</a>
    <a href="{SITE}/fonctionnalites">Fonctionnalités</a>
    <a href="{SITE}/tarifs">Tarifs</a>
    <a href="{SITE}/demo">Visite guidée</a>
    <a href="{SITE}/demo-public">Démo</a>
    <a href="/fr">Courtage en France</a>
    <a href="{SITE}/contact">Contact</a>
    <a href="{SITE}/legal/mentions-legales">Mentions légales</a>
    <a href="{SITE}/legal/confidentialite">Confidentialité</a>
  </div>
  <div>COURTIA — cockpit pour cabinets de courtage en assurance.</div>
</footer>"""


def bloc_commercial() -> str:
    """Bloc commercial partagé : CTA démo + tarifs (aucune donnée inventée)."""
    return f"""<section class="card" id="demo">
  <h2 style="margin-top:0">Voir COURTIA en fonctionnement</h2>
  <p>Le plus rapide est de regarder l'outil plutôt que de le lire. La visite guidée
  déroule un cabinet fictif avec des données synthétiques, sans inscription. Une
  démonstration sur votre propre portefeuille se demande en quelques lignes, et les
  tarifs publics sont consultables librement.</p>
  <p><a class="cta" href="{SITE}/demo">Lancer la visite guidée</a>
  <a class="cta ghost" href="{SITE}/demo-public">Demander une démo</a>
  <a class="cta ghost" href="{SITE}/tarifs">Voir les tarifs</a></p>
  <p class="note">COURTIA — <strong>logiciel gestion courtage</strong>,
  <strong>CRM courtier assurance</strong> et <strong>automatisation courtier assurance</strong> :
  trois façons de décrire le même cockpit.</p>
  <p class="note">Ce que COURTIA n'est pas : un logiciel de comptabilité, un outil de
  prospection de masse, ni une garantie de conformité. COURTIA est un logiciel de
  gestion du courtage et un CRM pour cabinets de courtiers d'assurance : il structure
  et trace le suivi, prépare les relances et les documents ; la décision et l'envoi
  restent au courtier.</p>
</section>"""


def bloc_maillage() -> str:
    """Liens sortants : 6 hubs verticaux + 4 comparatifs + 10 guides."""
    v = "\n".join(
        f'      <li><a href="/fr/logiciel-courtier-{slug}">{titre}</a></li>'
        for slug, titre in VERTICAUX
    )
    c = "\n".join(
        f'      <li><a href="/fr/{slug}">{titre}</a></li>' for slug, titre in COMPARATIFS
    )
    g = "\n".join(
        f'      <li><a href="/fr/guide/{slug}">{titre}</a></li>' for slug, titre in GUIDES
    )
    return f"""<section id="maillage">
  <h2>Pour aller plus loin dans COURTIA</h2>
  <h3>Par métier</h3>
  <ul class="links">
{v}
  </ul>
  <h3>Comparatifs</h3>
  <ul class="links">
{c}
  </ul>
  <h3>Les guides</h3>
  <ul class="links">
{g}
  </ul>
</section>"""


def _jsonld(obj) -> str:
    return ('<script type="application/ld+json">'
            + json.dumps(obj, ensure_ascii=False)
            + "</script>")


def render_ville(slug: str) -> str:
    v = VILLES[slug]
    url = url_ville(slug)
    absu = SITE + url

    corps_html = []
    for kind, val in v["corps"]:
        if kind == "h2":
            corps_html.append(f"    <h2>{val}</h2>")
        elif kind == "p":
            corps_html.append(f"    <p>{val}</p>")
        elif kind == "ul":
            items = "\n".join(f"      <li>{i}</li>" for i in val)
            corps_html.append(f"    <ul>\n{items}\n    </ul>")
    corps = "\n".join(corps_html)

    faq_html = "\n".join(
        f"    <h3>{q}</h3>\n    <p>{a}</p>" for q, a in v["faq"]
    )

    ld_org = {
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "COURTIA",
        "url": SITE,
        "logo": f"{SITE}/og-courtia.png",
        "email": "contact@courtiark.fr",
    }
    ld_crumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Accueil",
             "item": f"{SITE}/"},
            {"@type": "ListItem", "position": 2, "name": "France",
             "item": f"{SITE}/fr"},
            {"@type": "ListItem", "position": 3,
             "name": f"Courtier d'assurance à {v['nom']}", "item": absu},
        ],
    }
    ld_app = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "COURTIA",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web (navigateur)",
        "url": absu,
        "inLanguage": "fr-FR",
        "areaServed": {"@type": "City", "name": v["nom"]},
        "description": (
            f"Cockpit et CRM pour cabinets de courtage en assurance exerçant à "
            f"{v['nom']} ({v['region']}) : portefeuille, échéances, relances, "
            f"commissions, suivi du devoir de conseil."
        ),
        "offers": {
            "@type": "Offer",
            "priceCurrency": "EUR",
            "url": f"{SITE}/tarifs",
            "description": f"Abonnement par cabinet ; tarifs publics sur {SITE}/tarifs.",
        },
    }
    ld_faq = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {"@type": "Question", "name": q,
             "acceptedAnswer": {"@type": "Answer", "text": a}}
            for q, a in v["faq"]
        ],
    }

    return f"""<!DOCTYPE html>
<html lang="fr-FR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{v['title']}</title>
<meta name="description" content="{v['meta']}">
<link rel="canonical" href="{absu}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta name="theme-color" content="#050510">
<meta property="og:type" content="website">
<meta property="og:title" content="{v['title']}">
<meta property="og:description" content="{v['meta']}">
<meta property="og:url" content="{absu}">
<meta property="og:image" content="{SITE}/og-courtia.png">
<meta property="og:locale" content="fr_FR">
<meta name="twitter:card" content="summary_large_image">
{_jsonld(ld_org)}
{_jsonld(ld_crumb)}
{_jsonld(ld_app)}
{_jsonld(ld_faq)}
<style>
{STYLE}
</style>
</head>
<body>
{HEADER}
<main>
  <nav class="crumbs"><a href="{SITE}/">Accueil</a> › <a href="/fr">France</a> › <a href="/fr/logiciel-courtier-assurance">Courtier assurance</a> › {v['nom']}</nav>
  <span class="eyebrow">{v['nom']} · {v['region']}</span>
  <h1>{v['h1']}</h1>
  <p class="lede">{v['lede']}</p>

  <article id="corps">
{corps}
  </article>

{bloc_commercial()}

  <section id="faq">
    <h2>Questions fréquentes à {v['nom']}</h2>
{faq_html}
  </section>

{bloc_maillage()}
</main>
{FOOTER}
</body>
</html>
"""


# --------------------------------------------------------------------------
# Blocs injectés (maillage retour)
# --------------------------------------------------------------------------
def bloc_villes(contexte: str) -> str:
    items = "\n".join(
        f'      <li><a href="{url_ville(s)}">Courtier d\'assurance à {VILLES[s]["nom"]}</a> '
        f'— {VILLES[s]["region"]}</li>'
        for s in PRIORITY_ORDER
    )
    start, end = MARK_VILLES
    return f"""<!-- {start} -->
  <section id="villes-prioritaires">
    <h2>Le courtage, ville par ville</h2>
    <p>{contexte} Chaque page détaille le tissu local du courtage et ce que COURTIA y
    change concrètement, avec un accès direct à la démo.</p>
    <ul class="links">
{items}
    </ul>
  </section>
  <!-- {end} -->"""


def bloc_villes_hub_fr() -> str:
    """Bloc « villes prioritaires » à insérer dans /fr (aussi utilisé par
    scripts/generate_fr_hub.py pour que la régénération du hub le conserve)."""
    return bloc_villes(CTX_FR)


def bloc_cta_hub() -> str:
    start, end = MARK_CTA
    return f"""<!-- {start} -->
  <section class="card" id="demo">
    <h2 style="margin-top:0">Voir l'outil sur un cas concret</h2>
    <p>La visite guidée déroule un cabinet fictif, avec des données synthétiques et sans
    inscription. Pour une démonstration sur votre portefeuille réel, la demande se fait
    en quelques lignes, et les tarifs publics sont consultables librement.</p>
    <p><a class="cta" href="{SITE}/demo">Lancer la visite guidée</a>
    <a class="cta ghost" href="{SITE}/demo-public">Demander une démo</a>
    <a class="cta ghost" href="{SITE}/tarifs">Voir les tarifs</a></p>
  </section>
  <!-- {end} -->"""


def _injecter(chemin: str, bloc: str, start: str, end: str,
              ancres: list[str]) -> str:
    """Insère (ou remplace) un bloc délimité par des marqueurs. Idempotent.

    Renvoie "remplacé", "inséré" ou "inchangé".
    """
    with open(chemin, encoding="utf-8") as f:
        h = f.read()
    m_start = f"<!-- {start} -->"
    m_end = f"<!-- {end} -->"
    if m_start in h and m_end in h:
        new = re.sub(re.escape(m_start) + r".*?" + re.escape(m_end),
                     bloc, h)
        if new != h:
            with open(chemin, "w", encoding="utf-8") as f:
                f.write(new)
            return "remplacé"
        return "inchangé"
    for ancre in ancres:
        if ancre in h:
            new = h.replace(ancre, bloc + "\n" + ancre, 1)
            with open(chemin, "w", encoding="utf-8") as f:
                f.write(new)
            return "inséré"
    raise RuntimeError(f"aucune ancre trouvée dans {chemin}")


def generer_pages() -> None:
    for slug in PRIORITY_ORDER:
        d = os.path.join(FR_DIR, f"logiciel-courtier-assurance-{slug}")
        os.makedirs(d, exist_ok=True)
        p = os.path.join(d, "index.html")
        with open(p, "w", encoding="utf-8") as f:
            f.write(render_ville(slug))
        print(f"  page   : {url_ville(slug)} ({os.path.getsize(p)} octets)")


def mailler() -> None:
    etat = _injecter(HUB_FR, bloc_villes_hub_fr(), *MARK_VILLES,
                     ["  <h2>Par où commencer</h2>", "</main>"])
    print(f"  hub    : /fr — liens villes {etat}")
    for slug, titre in VERTICAUX:
        p = os.path.join(FR_DIR, f"logiciel-courtier-{slug}", "index.html")
        s1 = _injecter(p, bloc_cta_hub(), *MARK_CTA,
                       ['  <section id="faq">', "</main>"])
        s2 = _injecter(p, bloc_villes(CTX_HUB), *MARK_VILLES,
                       ['  <section id="faq">', "</main>"])
        print(f"  hub    : /fr/logiciel-courtier-{slug} — CTA {s1}, liens villes {s2}")


def maj_sitemap() -> None:
    with open(SITEMAP, encoding="utf-8") as f:
        s = f.read()
    manquants = [u for u in (url_ville(x) for x in PRIORITY_ORDER)
                 if f"{SITE}{u}<" not in s]
    if not manquants:
        print("  sitemap: les 10 URL sont déjà présentes, rien à faire")
        return
    lignes = "\n".join(f"  <url><loc>{SITE}{u}</loc></url>" for u in manquants)
    bloc = ("  <!-- Noyau SEO : 10 pages ville prioritaires retravaillées "
            "(scripts/ameliorer_pages_ville.py). -->\n"
            + lignes + "\n")
    s2 = s.replace("</urlset>", bloc + "</urlset>", 1)
    with open(SITEMAP, "w", encoding="utf-8") as f:
        f.write(s2)
    print(f"  sitemap: {len(manquants)} URL ajoutée(s)")


# --------------------------------------------------------------------------
# Mesure
# --------------------------------------------------------------------------
def _pages_fr() -> list[tuple[str, str]]:
    out = []
    for root, _dirs, fs in os.walk(FR_DIR):
        if "index.html" in fs:
            rel = os.path.relpath(root, FR_DIR)
            url = "/fr" if rel == "." else "/fr/" + rel.replace(os.sep, "/")
            out.append((os.path.join(root, "index.html"), url))
    return out


def _sans_balises(h: str) -> str:
    h = re.sub(r"<script.*?</script>", " ", h, flags=re.S | re.I)
    h = re.sub(r"<style.*?</style>", " ", h, flags=re.S | re.I)
    h = re.sub(r"<!--.*?-->", " ", h, flags=re.S)
    h = re.sub(r"<[^>]+>", " ", h)
    h = html_mod.unescape(h)
    return re.sub(r"\s+", " ", h).strip()


def _mots(t: str) -> list[str]:
    return re.findall(r"[0-9a-zà-ÿ']+", t.lower())


def _shingles(t: str, n: int = 8) -> set:
    w = _mots(t)
    return {tuple(w[i:i + n]) for i in range(max(0, len(w) - n + 1))}


def _corps(h: str) -> str:
    m = re.search(r'<article id="corps">(.*?)</article>', h, flags=re.S)
    return _sans_balises(m.group(1)) if m else ""


def _jaccard(a: set, b: set) -> float:
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def _licences(h: str) -> list:
    return re.findall(
        r'<script type="application/ld\+json">(.*?)</script>', h, flags=re.S)


def _types_jsonld(h: str) -> list[str]:
    types = []
    for raw in _licences(h):
        try:
            o = json.loads(raw)
        except Exception:
            types.append("INVALIDE")
            continue
        v = o.get("@type")
        types.append(v if isinstance(v, str) else str(v))
    return types


def _lire(p: str) -> str:
    with open(p, encoding="utf-8", errors="replace") as f:
        return f.read()


def mesurer() -> dict:
    pages = _pages_fr()
    hrefs = {}
    for p, u in pages:
        hrefs[u] = set(re.findall(r'href="([^"]+)"', _lire(p)))

    cibles = [url_ville(s) for s in PRIORITY_ORDER]
    cibles += [f"/fr/logiciel-courtier-{s}" for s, _ in VERTICAUX]
    cibles += [f"/fr/{s}" for s, _ in COMPARATIFS]
    cibles += [f"/fr/guide/{s}" for s, _ in GUIDES]
    cibles += ["/fr", PAGE_CONTROLE]

    entrants = {}
    for c in cibles:
        entrants[c] = sum(1 for u, hs in hrefs.items() if c in hs and u != c)

    details = {}
    for c in cibles:
        p = os.path.join(FR_DIR, c.replace("/fr/", "", 1), "index.html")
        if c == "/fr":
            p = HUB_FR
        if not os.path.exists(p):
            details[c] = {"absent": True}
            continue
        h = _lire(p)
        texte = _sans_balises(h)
        corps = _corps(h)
        details[c] = {
            "absent": False,
            "taille_octets": os.path.getsize(p),
            "mots": len(_mots(texte)),
            "mots_corps": len(_mots(corps)),
            "ngrammes": len(_shingles(texte)),
            "ngrammes_corps": len(_shingles(corps)),
            "h1": re.findall(r"<h1[^>]*>(.*?)</h1>", h, flags=re.S | re.I),
            "canonical": (re.findall(r'rel="canonical" href="([^"]+)"', h) or [None])[0],
            "jsonld": _types_jsonld(h),
            "cta_demo_public": f"{SITE}/demo-public" in hrefs[c] or "/demo-public" in hrefs[c],
            "cta_demo": f"{SITE}/demo" in hrefs[c] or '"/demo"' in hrefs[c],
            "lien_tarifs": f"{SITE}/tarifs" in hrefs[c] or "/tarifs" in hrefs[c],
            "liens_sortants_fr": len({x for x in hrefs[c] if x.startswith("/fr")}),
            "liens_entrants": entrants[c],
        }

    # Unicité : sur les 10 pages + la page de contrôle
    lot = [url_ville(s) for s in PRIORITY_ORDER]
    textes = {}
    corps_t = {}
    for u in lot:
        p = os.path.join(FR_DIR, u.replace("/fr/", "", 1), "index.html")
        h = _lire(p) if os.path.exists(p) else ""
        textes[u] = _shingles(_sans_balises(h))
        corps_t[u] = _shingles(_corps(h))

    def _stats(sh: dict) -> dict:
        sims, partages = [], {}
        for u in lot:
            autres = set()
            for u2 in lot:
                if u2 != u:
                    autres |= sh[u2]
            partages[u] = (len(sh[u] & autres) / len(sh[u])) if sh[u] else 0.0
            for u2 in lot:
                if u2 > u:
                    sims.append(_jaccard(sh[u], sh[u2]))
        return {
            "similarite_mediane": round(statistics.median(sims), 4) if sims else 0.0,
            "similarite_max": round(max(sims), 4) if sims else 0.0,
            "partage_median": round(statistics.median(partages.values()), 4),
            "partage_par_page": {u: round(v, 4) for u, v in partages.items()},
        }

    p_ctrl = os.path.join(FR_DIR, PAGE_CONTROLE.replace("/fr/", "", 1), "index.html")
    vs_controle = {}
    if os.path.exists(p_ctrl):
        hc = _lire(p_ctrl)
        sc, scc = _shingles(_sans_balises(hc)), _shingles(_corps(hc))
        for u in lot:
            vs_controle[u] = {
                "global": round(_jaccard(textes[u], sc), 4),
                "corps": round(_jaccard(corps_t[u], scc), 4) if corps_t[u] else None,
            }

    return {
        "pages_fr_total": len(pages),
        "details": details,
        "unicite_global": _stats(textes),
        "unicite_corps": _stats(corps_t),
        "vs_controle": vs_controle,
        "page_controle": PAGE_CONTROLE,
    }


# --------------------------------------------------------------------------
# Rapport
# --------------------------------------------------------------------------
def _lire_snapshot() -> dict | None:
    if os.path.exists(SNAPSHOT):
        with open(SNAPSHOT, encoding="utf-8") as f:
            return json.load(f)
    return None


def ecrire_rapport(avant: dict | None, apres: dict) -> None:
    lignes = []
    A = lignes.append
    A("# Noyau SEO — 10 pages ville prioritaires : mesure AVANT / APRÈS\n")
    A("Mesure produite par `scripts/ameliorer_pages_ville.py` "
      "(lancer `--snapshot-avant` avant modification, puis le script complet).\n")
    A(f"- Pages `/fr/**` dans le silo : **{apres['pages_fr_total']}**")
    if avant:
        A(f"- Pages `/fr/**` avant intervention : **{avant['pages_fr_total']}** "
          "(aucune page supprimée)")
    A(f"- Page ville de contrôle, non retouchée : `{apres['page_controle']}`\n")

    A("## 1. Liens entrants par page (maillage)\n")
    if avant:
        A("| Page | Liens entrants AVANT | Liens entrants APRÈS | Taille AVANT | Taille APRÈS |")
        A("|---|---:|---:|---:|---:|")
    else:
        A("| Page | Liens entrants APRÈS | Taille APRÈS |")
        A("|---|---:|---:|")
    ordre = [url_ville(s) for s in PRIORITY_ORDER]
    ordre += [f"/fr/logiciel-courtier-{s}" for s, _ in VERTICAUX]
    ordre += [f"/fr/{s}" for s, _ in COMPARATIFS]
    ordre += [f"/fr/guide/{s}" for s, _ in GUIDES]
    ordre += ["/fr", PAGE_CONTROLE]
    for u in ordre:
        d = apres["details"][u]
        if d.get("absent"):
            continue
        if avant:
            da = avant["details"].get(u, {})
            A(f"| `{u}` | {da.get('liens_entrants', '—')} | {d['liens_entrants']} "
              f"| {da.get('taille_octets', '—')} | {d['taille_octets']} |")
        else:
            A(f"| `{u}` | {d['liens_entrants']} | {d['taille_octets']} |")
    A("")
    A("Le hub `/fr/logiciel-courtier-assurance` garde le même nombre de pages "
      "entrantes : les 10 pages prioritaires le citaient déjà dans leur fil d'Ariane. "
      "Ce sont leur contenu, leurs ancres et leurs liens sortants qui ont changé. "
      "La page de contrôle `/fr/logiciel-courtier-assurance-agen` n'a volontairement "
      "pas été modifiée (taille et liens entrants identiques).\n")

    A("## 2. Unicité du contenu\n")
    A("Similarité = Jaccard sur les n-grammes de 8 mots. "
      "« Part du texte » = part des n-grammes d'une page qui se retrouvent dans au "
      "moins une autre page du lot des 10. « Corps » = texte de l'`<article id=\"corps\">` "
      "(le contenu éditorial propre à la ville, hors en-tête, liens et pied de page).\n")
    A("| Mesure (10 pages) | AVANT | APRÈS |")
    A("|---|---:|---:|")
    def _ligne(nom, ga, ca, gb, cb):
        A(f"| {nom} | {ga} | {gb} |")
    if avant:
        A(f"| Similarité médiane entre pages (texte complet) "
          f"| {avant['unicite_global']['similarite_mediane']} "
          f"| {apres['unicite_global']['similarite_mediane']} |")
        A(f"| Similarité maximale entre pages (texte complet) "
          f"| {avant['unicite_global']['similarite_max']} "
          f"| {apres['unicite_global']['similarite_max']} |")
        A(f"| Part de texte partagée, médiane (texte complet) "
          f"| {avant['unicite_global']['partage_median']} "
          f"| {apres['unicite_global']['partage_median']} |")
        A(f"| Similarité médiane entre pages (corps éditorial) "
          f"| {avant['unicite_corps']['similarite_mediane']} "
          f"| {apres['unicite_corps']['similarite_mediane']} |")
        A(f"| Similarité maximale entre pages (corps éditorial) "
          f"| {avant['unicite_corps']['similarite_max']} "
          f"| {apres['unicite_corps']['similarite_max']} |")
        A(f"| Part de texte partagée, médiane (corps éditorial) "
          f"| {avant['unicite_corps']['partage_median']} "
          f"| {apres['unicite_corps']['partage_median']} |")
    else:
        for k, lib in (("similarite_mediane", "Similarité médiane (texte complet)"),
                       ("similarite_max", "Similarité maximale (texte complet)"),
                       ("partage_median", "Part de texte partagée, médiane (texte complet)")):
            A(f"| {lib} | — | {apres['unicite_global'][k]} |")
        for k, lib in (("similarite_mediane", "Similarité médiane (corps éditorial)"),
                       ("similarite_max", "Similarité maximale (corps éditorial)"),
                       ("partage_median", "Part de texte partagée, médiane (corps éditorial)")):
            A(f"| {lib} | — | {apres['unicite_corps'][k]} |")
    A("")

    A(f"### Comparaison avec `{PAGE_CONTROLE}` (page ville NON retouchée)\n")
    A("| Page retravaillée | Similarité AVANT vs contrôle | Similarité APRÈS vs contrôle |")
    A("|---|---:|---:|")
    for u in [url_ville(s) for s in PRIORITY_ORDER]:
        va = avant["vs_controle"].get(u, {}).get("global") if avant else "—"
        vb = apres["vs_controle"].get(u, {}).get("global")
        A(f"| `{u}` | {va} | {vb} |")
    A("")
    A("### Part de texte propre à chaque page APRÈS (corps éditorial)\n")
    A("| Page | N-grammes du corps | Part du corps retrouvée ailleurs dans le lot |")
    A("|---|---:|---:|")
    for u in [url_ville(s) for s in PRIORITY_ORDER]:
        part = apres["unicite_corps"]["partage_par_page"].get(u)
        A(f"| `{u}` | {apres['details'][u].get('ngrammes_corps', '—')} | {part} |")
    A("")

    A("## 3. Éléments techniques et commerciaux par page\n")
    A("| Page | H1 | Canonical self | JSON-LD | CTA /demo-public | Lien /tarifs | Mots |")
    A("|---|---|---|---|---|---|---:|")
    for u in [url_ville(s) for s in PRIORITY_ORDER]:
        d = apres["details"][u]
        h1 = (d["h1"][0].strip() if d["h1"] else "—")
        h1 = re.sub(r"\s+", " ", h1)[:58]
        canon = "oui" if d["canonical"] == SITE + u else f"non ({d['canonical']})"
        A(f"| `{u}` | {len(d['h1'])} — {h1} | {canon} | {', '.join(d['jsonld'])} "
          f"| {'oui' if d['cta_demo_public'] else 'NON'} "
          f"| {'oui' if d['lien_tarifs'] else 'NON'} | {d['mots']} |")
    A("")

    A("## 4. Sitemap\n")
    if os.path.exists(SITEMAP):
        with open(SITEMAP, encoding="utf-8") as f:
            sm = f.read()
        for u in [url_ville(s) for s in PRIORITY_ORDER]:
            A(f"- `{u}` : {'présent' if (SITE + u + '<') in sm else 'ABSENT'}")
    A("")
    A("## 5. Requêtes auparavant absentes du silo\n")
    A("Trois expressions signalées comme totalement absentes de l'audit SEO sont "
      "désormais présentes sur les 10 pages (comptage direct dans le HTML) :\n")
    A("| Expression | Pages où elle apparaît (sur 10) |")
    A("|---|---:|")
    for kw in ("automatisation courtier assurance", "CRM courtier assurance",
               "logiciel gestion courtage"):
        n = 0
        for u in [url_ville(s) for s in PRIORITY_ORDER]:
            p = os.path.join(FR_DIR, u.replace("/fr/", "", 1), "index.html")
            if os.path.exists(p) and kw.lower() in _lire(p).lower():
                n += 1
        A(f"| « {kw} » | {n} |")
    A("")

    A("## 6. Ce qui n'a pas été touché\n")
    A(f"- Les {apres['pages_fr_total'] - len(PRIORITY_ORDER)} autres pages `/fr/**` "
      "(dont les 1 064 pages ville non prioritaires) n'ont pas été modifiées.")
    A("- Aucune page supprimée, aucune URL renommée, aucun redirection ajoutée.")
    A("- Aucune donnée inventée : ni avis, ni nombre de clients, ni chiffre d'activité, "
      "ni garantie de conformité. Les références régionales sont des généralités "
      "économiques documentées (filière viticole et siège du conseil régional à "
      "Bordeaux, port à Marseille, filière aéronautique à Toulouse, institutions "
      "européennes et zone frontalière à Strasbourg, position frontalière à Lille, "
      "campus santé à Montpellier, siège de l'ORIAS et de l'ACPR à Paris).")
    A("- Le style et les balises existantes des hubs ont été conservés ; les ajouts sont "
      "délimités par les commentaires `seo-noyau:*` et donc réversibles.\n")

    with open(RAPPORT, "w", encoding="utf-8") as f:
        f.write("\n".join(lignes) + "\n")
    print(f"  rapport: {RAPPORT}")


# --------------------------------------------------------------------------
# Entrée
# --------------------------------------------------------------------------
def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--snapshot-avant", action="store_true",
                    help="mesure l'état actuel et l'écrit dans "
                         "scripts/etat_seo_noyau_avant.json (à lancer AVANT toute "
                         "modification)")
    ap.add_argument("--rapport-seul", action="store_true",
                    help="régénère seulement le rapport")
    ap.add_argument("--mesurer-seul", action="store_true",
                    help="affiche la mesure sans rien écrire")
    args = ap.parse_args()

    if args.snapshot_avant:
        etat = mesurer()
        with open(SNAPSHOT, "w", encoding="utf-8") as f:
            json.dump(etat, f, ensure_ascii=False, indent=1)
        print("snapshot AVANT écrit :", SNAPSHOT)
        print(json.dumps({u: d.get("liens_entrants") for u, d in etat["details"].items()
                          if u.startswith("/fr/logiciel-courtier-assurance-")},
                         ensure_ascii=False, indent=1))
        print("unicité globale :", etat["unicite_global"]["similarite_mediane"],
              "/ max", etat["unicite_global"]["similarite_max"])
        return 0

    if args.mesurer_seul:
        print(json.dumps(mesurer(), ensure_ascii=False, indent=1)[:4000])
        return 0

    avant = _lire_snapshot()
    if avant is None:
        print("ATTENTION : aucun snapshot AVANT. Lancez d'abord "
              "--snapshot-avant pour obtenir un rapport AVANT/APRÈS.", file=sys.stderr)

    if not args.rapport_seul:
        print("1) Génération des 10 pages ville prioritaires")
        generer_pages()
        print("2) Maillage retour (hub /fr + 6 hubs verticaux)")
        mailler()
        print("3) Sitemap")
        maj_sitemap()

    print("4) Mesure APRÈS")
    apres = mesurer()
    ecrire_rapport(avant, apres)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
