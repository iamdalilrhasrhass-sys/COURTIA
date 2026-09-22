#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
authority_targets.py — CIBLES D'AUTORITÉ PRÉPARÉES (règle 22 de la mission).

Entre : docs/seo/AUTHORITY_TARGETS_bruts.csv (candidats réels relevés par recherche, avec leur domaine).
Sort : docs/seo/AUTHORITY_TARGETS.csv — cibles classées, avec type, audience, angle, actif COURTIA
approprié, accès public et priorité.

AUCUN CONTACT N'EST PRIS ET AUCUNE ADRESSE PRIVÉE N'EST PUBLIÉE : la colonne « accès_public » contient le
site public de l'organisation, rien d'autre. Les autorités de surveillance sont classées « veille » et non
« cible » : on ne sollicite pas un régulateur pour un lien.

Usage : python3 scripts/authority_targets.py
"""
import csv
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS = os.path.join(BASE, "docs", "seo")
SOURCE = os.path.join(DOCS, "AUTHORITY_TARGETS_bruts.csv")
CIBLE = os.path.join(DOCS, "AUTHORITY_TARGETS.csv")

# domaine -> (type retenu, audience, angle, actif, priorité, statut)
CLASSEMENT = {
    "franceassureurs.fr": ("fédération professionnelle", "assureurs et professionnels de l'assurance",
        "partager un actif de données publiques sur le courtage (cartographie SIRENE)",
        "cartographie des courtiers en France", 1, "cible"),
    "courtage-magazine.fr": ("média spécialisé courtage", "courtiers et cabinets",
        "un sujet de méthode (mesurer le temps administratif) plutôt qu'un argumentaire produit",
        "protocole de mesure + calculateur de temps", 1, "cible"),
    "newsassurancespro.com": ("média professionnel assurance", "professionnels de l'assurance",
        "données publiques mises en forme et datées", "cartographie des courtiers", 1, "cible"),
    "digital-et-assurance.com": ("média digitalisation assurance", "assureurs, courtiers, insurtechs",
        "retour d'expérience sur l'automatisation réellement possible dans un cabinet",
        "processus + calculateur", 1, "cible"),
    "ascourtage.fr": ("média/annuaire courtage", "courtiers",
        "ressource gratuite utile à leurs lecteurs (checklists)",
        "checklists du cabinet", 1, "cible"),
    "aca-courtiers.ch": ("association suisse de courtiers", "courtiers suisses",
        "ressource suisse : vocabulaire, journal de conseil, processus",
        "glossaire suisse + processus suisses", 1, "cible"),
    "vcw.ch": ("association professionnelle suisse", "intermédiaires d'assurance suisses",
        "contenus sur la traçabilité du conseil et l'organisation du cabinet",
        "glossaire suisse + conformité LSA/FINMA", 1, "cible"),
    "swiss-courtage.ch": ("acteur suisse du courtage", "courtiers romands",
        "libre accès à une méthode d'organisation, sans produit imposé",
        "processus suisses + checklists", 2, "cible"),
    "romandiecourtage.ch": ("acteur suisse du courtage", "courtiers romands",
        "ressource de méthode utilisable sans logiciel", "processus + checklists", 2, "cible"),
    "promaxis.ch": ("acteur suisse (automatisation)", "courtiers suisses",
        "comparaison méthodologique sur ce qui est automatisable et ce qui ne l'est pas",
        "page automatisation + limites", 2, "cible"),
    "medcourtage.ch": ("média courtage suisse", "courtiers francophones",
        "données et méthodes, sans démarche commerciale", "cartographie + protocole de mesure", 2, "cible"),
    "swissriskcare.ch": ("acteur assurance suisse", "professionnels suisses",
        "contenus sur le suivi des sinistres et la traçabilité", "processus sinistre (FR/CH)", 3, "cible"),
    "orica.fr": ("organisme de formation", "courtiers en formation",
        "supports libres d'accès pour les stagiaires", "checklists + glossaire + processus", 1, "cible"),
    "courtage-academy.com": ("formation courtage", "courtiers et nouveaux entrants",
        "outils gratuits utilisables en formation", "calculateurs + checklists", 1, "cible"),
    "fincup.fr": ("formation finance/assurance", "professionnels en formation",
        "ressource de méthode pour leurs modules", "processus + glossaire", 2, "cible"),
    "formations-obligatoires.fr": ("formation réglementaire", "courtiers soumis à formation",
        "contenus sur la traçabilité du devoir de conseil", "conformité + checklist audit", 2, "cible"),
    "consultys-assurances.com": ("consultant assurance", "cabinets de courtage",
        "méthode d'organisation et de mesure, sans produit", "protocole de mesure + calculateur", 2, "cible"),
    "sbc-consulting.fr": ("consultant courtage", "cabinets",
        "processus réutilisables", "bibliothèque de processus", 2, "cible"),
    "cabinetjulien.com": ("consultant", "cabinets d'assurance",
        "ressources gratuites", "checklists + glossaire", 3, "cible"),
    "babyloneconsulting.fr": ("consultant", "cabinets",
        "ressources gratuites", "checklists", 3, "cible"),
    "conseil.onlynnov.com": ("consultant", "cabinets",
        "ressources gratuites", "checklists", 3, "cible"),
    "cncef.org": ("organisme professionnel", "courtiers et intermédiaires",
        "méthode et traçabilité", "conformité + checklist audit", 2, "cible"),
    "planete-csca.fr": ("association d'anciens/parcours", "professionnels de l'assurance",
        "ressources de méthode", "processus + glossaire", 3, "cible"),
    "planetecscarh.fr": ("association professionnelle", "courtiers et RH assurance",
        "ressources de méthode", "processus + glossaire", 3, "cible"),
    "agence-api.ouest-france.fr": ("agence de presse régionale", "grand public régional",
        "données locales par département (source SIRENE)", "cartographie par région et département", 2, "cible"),
    "assureurpro.com": ("média/événement courtage", "courtiers",
        "données et méthodes", "cartographie + calculateur", 2, "cible"),
    "courtier.sollyazar.com": ("initiative courtier", "courtiers",
        "ressources utiles", "checklists", 3, "cible"),
    "acpr.banque-france.fr": ("autorité de surveillance", "—",
        "veille réglementaire uniquement : on ne sollicite pas un régulateur pour un lien", "—", 0, "veille"),
    "finma.ch": ("autorité de surveillance", "—",
        "veille réglementaire uniquement : on ne sollicite pas un régulateur pour un lien", "—", 0, "veille"),
    "rts.ch": ("média généraliste suisse", "grand public suisse",
        "à traiter seulement en cas de donnée suisse solide ; nous n'en avons pas encore", "—", 0, "veille"),
    "smabtp.fr": ("acteur assurance construction", "professionnels construction",
        "contenus de branche", "page décennale", 3, "veille"),
    "francetransactions.com": ("acteur transactions", "chroniqueurs/professionnels",
        "à qualifier avant toute démarche", "—", 0, "a qualifier"),
    "data.bnf.fr": ("base de données publique", "—", "aucun usage", "—", 0, "hors cible"),
    "facebook.com": ("réseau social", "—", "aucun usage", "—", 0, "hors cible"),
    "youtube.com": ("plateforme", "—", "aucun usage", "—", 0, "hors cible"),
    "podcast.ausha.co": ("plateforme de podcast", "—", "aucun usage", "—", 0, "hors cible"),
    "podcastics.com": ("plateforme de podcast", "—", "aucun usage", "—", 0, "hors cible"),
    "shows.acast.com": ("plateforme de podcast", "—", "aucun usage", "—", 0, "hors cible"),
    "antoinegandois.fr": ("podcast courtage", "courtiers et candidats",
        "épisode sur l'organisation d'un cabinet, apporté par la méthode et non par le produit",
        "protocole de mesure + processus", 2, "cible"),
    "jassuremonfutur.fr": ("podcast assurance", "nouveaux entrants et courtiers",
        "vocabulaire et méthodes d'organisation", "glossaire + processus", 2, "cible"),
    "kereis-solutions.com": ("acteur assurance (courtage)", "courtiers",
        "à qualifier : acteur du courtage, pas un média", "—", 0, "a qualifier"),
    "netvox-assurances.fr": ("courtier grossiste", "courtiers",
        "à qualifier : concurrent potentiel sur certaines offres", "—", 0, "a qualifier"),
    "codecourtage.fr": ("annuaire/formation", "courtiers",
        "à qualifier avant démarche", "—", 0, "a qualifier"),
}


def main():
    if not os.path.isfile(SOURCE):
        print("fichier source absent :", SOURCE)
        return 1
    brut = list(csv.DictReader(open(SOURCE, encoding="utf-8")))
    vus, lignes = set(), []
    for l in brut:
        d = l["domaine"]
        if d in vus:
            continue
        vus.add(d)
        typ, audience, angle, actif, prio, statut = CLASSEMENT.get(
            d, ("à qualifier", "", "à qualifier avant toute démarche", "", 0, "a qualifier"))
        lignes.append({"domaine": d, "type": typ, "audience": audience, "angle": angle,
                       "asset_courtia": actif, "acces_public": l["url_publique"],
                       "priorite": prio, "statut": statut,
                       "contact_engage": "non — aucune démarche sans autorisation"})
    lignes.sort(key=lambda x: (-x["priorite"], x["domaine"]))
    with open(CIBLE, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(lignes[0].keys()))
        w.writeheader(); w.writerows(lignes)
    cibles = [l for l in lignes if l["statut"] == "cible"]
    veille = [l for l in lignes if l["statut"] == "veille"]
    qualif = [l for l in lignes if l["statut"] == "a qualifier"]
    hors = [l for l in lignes if l["statut"] == "hors cible"]
    print(f"cibles d'autorité : {len(lignes)} domaines")
    print(f"  cibles retenues : {len(cibles)} (dont priorité 1 : {len([l for l in cibles if l['priorite'] == 1])})")
    print(f"  veille/à qualifier/hors cible : {len(veille)} / {len(qualif)} / {len(hors)}")
    print("  priorité 1 :", ", ".join(l["domaine"] for l in cibles if l["priorite"] == 1))
    print(f"  fichier : {CIBLE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
