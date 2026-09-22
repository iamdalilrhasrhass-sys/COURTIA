#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
inventaire_intentions.py — MESURE DE L'ÉCART ENTRE LES INTENTIONS DU MARCHÉ ET CE QUI EST PUBLIÉ.

Produit deux artefacts :
  - docs/seo/INTENTIONS.csv  : INTENTION, PAYS, FUNNEL, VALEUR_COMMERCIALE, PAGE_EXISTANTE, QUALITE,
    GAP, ACTION (matrice demandée par la mission) ;
  - /root/ark/seo_jev/etat_intentions.txt : l'état lisible à donner à TypeSafe/JEV pour trancher les
    cas ambigus (familles manquantes, fusion d'intentions, adéquation produit).

La qualité d'une page est MESURÉE (nombre de mots du fichier publié), jamais déclarée.
Aucune intention n'est inventée : la liste est celle des requêtes qu'un courtier formule réellement,
et chaque ligne dit si elle est couverte, partielle ou absente.
"""
import csv
import html
import os
import re
import sys

PUBLIC = "/srv/courtia/frontend/public"
SORTIE = "/srv/courtia/docs/seo"
ETAT = "/root/ark/seo_jev/etat_intentions.txt"

# (intention, pays, etape_funnel, valeur_commerciale 1-5, page existante ou "")
I = [
    # ── FR — cœur produit / CRM ────────────────────────────────────────────────
    ("CRM courtier assurance", "FR", "commercial", 5, "fr/crm-courtier-assurance"),
    ("CRM assurance", "FR", "commercial", 5, ""),
    ("logiciel courtier assurance", "FR", "commercial", 5, "fr/logiciel-courtier-assurance"),
    ("logiciel courtage assurance", "FR", "commercial", 5, ""),
    ("logiciel cabinet courtage", "FR", "commercial", 5, "fr/logiciel-gestion-cabinet-courtage"),
    ("CRM cabinet assurance", "FR", "commercial", 4, ""),
    ("logiciel gestion courtier", "FR", "commercial", 4, ""),
    ("logiciel intermédiaire assurance", "FR", "commercial", 4, ""),
    ("outil courtier assurance", "FR", "commercial", 4, ""),
    ("plateforme courtier assurance", "FR", "commercial", 4, ""),
    ("logiciel gestion clients assurance", "FR", "commercial", 4, "fr/crm-courtier-assurance"),
    ("logiciel gestion prospects assurance", "FR", "commercial", 4, ""),
    ("logiciel gestion portefeuille assurance", "FR", "commercial", 4, "fr/gestion-portefeuille-courtier"),
    # ── FR — gain de temps / productivité ──────────────────────────────────────
    ("gagner du temps courtier assurance", "FR", "informationnel", 4, "fr/gagner-du-temps-courtier-assurance"),
    ("productivité courtier assurance", "FR", "informationnel", 4, ""),
    ("organisation cabinet de courtage", "FR", "informationnel", 3, ""),
    ("réduire l'administratif assurance", "FR", "informationnel", 4, "fr/mesurer-temps-administratif-cabinet"),
    ("automatiser les tâches d'un courtier", "FR", "informationnel", 4, "fr/automatisation-courtier-assurance"),
    ("automatiser un cabinet de courtage", "FR", "informationnel", 4, "fr/automatisation-courtier-assurance"),
    ("centraliser l'activité d'un courtier", "FR", "informationnel", 3, ""),
    ("réduire la double saisie", "FR", "informationnel", 3, ""),
    ("prioriser les dossiers", "FR", "informationnel", 3, ""),
    ("prioriser les prospects", "FR", "informationnel", 3, ""),
    ("suivre ses relances clients", "FR", "informationnel", 4, "fr/relance-client-assurance"),
    ("automatiser le suivi client", "FR", "informationnel", 4, ""),
    ("automatiser les renouvellements", "FR", "informationnel", 4, "fr/gestion-portefeuille-courtier"),
    ("gestion des tâches cabinet", "FR", "informationnel", 3, ""),
    ("workflow courtier assurance", "FR", "informationnel", 3, ""),
    # ── FR — IA ───────────────────────────────────────────────────────────────
    ("IA courtier assurance", "FR", "commercial", 5, "fr/ia-courtier-assurance"),
    ("IA assurance", "FR", "informationnel", 4, ""),
    ("assistant IA courtier", "FR", "commercial", 4, "fr/ia-courtier-assurance"),
    ("CRM assurance IA", "FR", "commercial", 5, "fr/ia-courtier-assurance"),
    ("automatisation IA assurance", "FR", "commercial", 4, ""),
    ("IA prospection assurance", "FR", "commercial", 3, ""),
    ("IA relation client assurance", "FR", "informationnel", 3, ""),
    ("IA gestion documentaire assurance", "FR", "informationnel", 3, ""),
    ("IA analyse de dossiers", "FR", "informationnel", 3, ""),
    ("IA relance clients", "FR", "informationnel", 3, ""),
    ("IA cabinet de courtage", "FR", "informationnel", 3, ""),
    # ── FR — fonctionnalités ──────────────────────────────────────────────────
    ("logiciel gestion des prospects courtier", "FR", "commercial", 4, ""),
    ("logiciel gestion clients courtier", "FR", "commercial", 4, "fr/crm-courtier-assurance"),
    ("pipeline commercial courtier assurance", "FR", "commercial", 4, ""),
    ("relance client assurance", "FR", "commercial", 4, "fr/relance-client-assurance"),
    ("gestion des emails courtier", "FR", "commercial", 3, ""),
    ("gestion des appels courtier", "FR", "commercial", 3, ""),
    ("WhatsApp courtier assurance", "FR", "commercial", 3, ""),
    ("gestion documentaire courtier assurance", "FR", "commercial", 4, ""),
    ("gestion des tâches courtier", "FR", "commercial", 3, ""),
    ("gestion des rendez-vous courtier", "FR", "commercial", 3, ""),
    ("devis assurance courtier", "FR", "commercial", 5, "fr/logiciel-devis-courtier-assurance"),
    ("comparateur devis assurance courtier", "FR", "commercial", 4, "fr/comparateur-assurance-courtier"),
    ("suivi des renouvellements assurance", "FR", "commercial", 4, "fr/gestion-portefeuille-courtier"),
    ("gestion des commissions courtier", "FR", "commercial", 4, "fr/logiciel-gestion-cabinet-courtage"),
    ("logiciel facturation courtier", "FR", "commercial", 3, ""),
    ("logiciel gestion des leads assurance", "FR", "commercial", 3, ""),
    ("reporting cabinet courtage", "FR", "commercial", 3, "fr/logiciel-gestion-cabinet-courtage"),
    ("automatisations cabinet assurance", "FR", "commercial", 4, "fr/automatisation-courtier-assurance"),
    ("logiciel équipe cabinet courtage", "FR", "commercial", 3, ""),
    ("import portefeuille logiciel courtier", "FR", "commercial", 3, ""),
    ("logiciel conformité courtier assurance", "FR", "commercial", 4, ""),
    ("portail client assurance courtier", "FR", "commercial", 3, ""),
    ("signature électronique devis assurance", "FR", "commercial", 3, "fr/logiciel-devis-courtier-assurance"),
    # ── FR — métiers / branches ───────────────────────────────────────────────
    ("logiciel courtier RC Pro", "FR", "commercial", 4, "fr/logiciel-courtier-iard"),
    ("logiciel courtier santé", "FR", "commercial", 4, "fr/logiciel-courtier-sante"),
    ("logiciel courtier prévoyance", "FR", "commercial", 4, "fr/logiciel-courtier-prevoyance"),
    ("logiciel courtier auto", "FR", "commercial", 3, ""),
    ("logiciel courtier habitation", "FR", "commercial", 3, ""),
    ("logiciel courtier emprunteur", "FR", "commercial", 4, "fr/logiciel-courtier-emprunteur"),
    ("logiciel courtier entreprises", "FR", "commercial", 4, ""),
    ("logiciel courtier TPE PME", "FR", "commercial", 3, ""),
    ("logiciel courtier transport", "FR", "commercial", 3, ""),
    ("logiciel courtier flotte automobile", "FR", "commercial", 3, ""),
    ("logiciel courtier taxi VTC", "FR", "commercial", 2, ""),
    ("logiciel courtier décennale", "FR", "commercial", 3, ""),
    # ── FR — comparatifs ─────────────────────────────────────────────────────
    ("CRM spécialisé courtage vs CRM généraliste", "FR", "comparaison", 4, ""),
    ("CRM courtier vs Excel", "FR", "comparaison", 4, ""),
    ("automatisation vs gestion manuelle assurance", "FR", "comparaison", 3, ""),
    ("alternative à CourtiGo", "FR", "comparaison", 3, "fr/alternative-courtigo"),
    ("alternative à Lya", "FR", "comparaison", 3, "fr/alternative-lya"),
    ("alternative à Kase", "FR", "comparaison", 3, "fr/alternative-kase"),
    ("alternative à Oggo Data", "FR", "comparaison", 3, "fr/alternative-oggo-data"),
    # ── FR — guides ──────────────────────────────────────────────────────────
    ("comment choisir un CRM pour cabinet de courtage", "FR", "informationnel", 4, ""),
    ("comment structurer son pipeline commercial", "FR", "informationnel", 3, ""),
    ("comment automatiser ses relances clients", "FR", "informationnel", 4, ""),
    ("comment organiser ses renouvellements", "FR", "informationnel", 4, ""),
    ("comment centraliser ses dossiers clients", "FR", "informationnel", 3, ""),
    ("comment réduire la double saisie", "FR", "informationnel", 3, ""),
    ("comment mesurer son temps administratif", "FR", "informationnel", 3, "fr/mesurer-temps-administratif-cabinet"),
    ("comment intégrer l'IA dans un cabinet", "FR", "informationnel", 4, ""),
    ("comment structurer l'onboarding client", "FR", "informationnel", 3, ""),
    ("comment suivre ses prospects", "FR", "informationnel", 3, ""),
    # ── FR — outils gratuits ─────────────────────────────────────────────────
    ("diagnostic automatisation cabinet", "FR", "outil", 4, ""),
    ("calculateur coût administratif cabinet", "FR", "outil", 4, ""),
    ("calculateur ROI CRM courtier", "FR", "outil", 4, ""),
    ("score maturité digitale cabinet", "FR", "outil", 3, ""),
    ("audit productivité cabinet courtage", "FR", "outil", 3, ""),
    ("générateur checklist onboarding client", "FR", "outil", 3, ""),
    # ── FR — actifs citables ─────────────────────────────────────────────────
    ("cartographie des courtiers en assurance par région", "FR", "actif", 4, ""),
    ("observatoire digital du courtage", "FR", "actif", 3, ""),
    ("baromètre du temps administratif en cabinet", "FR", "actif", 3, ""),
    # ── CH — suisse romande ──────────────────────────────────────────────────
    ("CRM courtier assurance Suisse", "CH", "commercial", 5, "ch/crm-courtier-assurance-suisse"),
    ("logiciel courtier assurance Suisse", "CH", "commercial", 5, "ch/logiciel-courtier-assurance-suisse"),
    ("logiciel courtage Suisse", "CH", "commercial", 5, ""),
    ("CRM assurance Suisse", "CH", "commercial", 4, ""),
    ("IA courtier assurance Suisse", "CH", "commercial", 4, "ch/ia-courtier-assurance-suisse"),
    ("automatisation courtier Suisse", "CH", "commercial", 4, "ch/automatisation-courtier-assurance-suisse"),
    ("gestion cabinet courtage Suisse", "CH", "commercial", 4, "ch/gestion-commissions-courtier-assurance-suisse"),
    ("logiciel intermédiaire assurance Suisse", "CH", "commercial", 4, ""),
    ("registre FINMA intermédiaire assurance", "CH", "informationnel", 4, "ch/conformite-intermediaire-assurance-lsa-finma"),
    ("nLPD courtier assurance", "CH", "informationnel", 3, ""),
    ("tarifs logiciel courtier CHF", "CH", "commercial", 4, "ch/tarifs-logiciel-courtier-chf"),
    ("courtage romand logiciel", "CH", "commercial", 3, ""),
    ("logiciel courtier suisse romande", "CH", "commercial", 4, ""),
    ("gestion sinistres courtier Suisse", "CH", "commercial", 3, ""),
    ("devis assurance Suisse courtier", "CH", "commercial", 4, "ch/logiciel-devis-courtier-assurance-suisse"),
    ("prospection courtier assurance Suisse", "CH", "commercial", 4, "ch/logiciel-prospection-courtier-assurance-suisse"),
    # ── CH — alémanique / italienne (plan de localisation, pas de publication automatique) ──
    ("Versicherungsbroker Software (de-CH)", "CH-DE", "commercial", 4, ""),
    ("Broker Software Schweiz (de-CH)", "CH-DE", "commercial", 4, ""),
    ("programma broker assicurativo (it-CH)", "CH-IT", "commercial", 3, ""),
]


def mots(chemin):
    f = os.path.join(PUBLIC, chemin, "index.html")
    if not os.path.isfile(f):
        return None
    t = open(f, encoding="utf-8").read()
    t = re.sub(r"<script.*?</script>|<style.*?</style>", "", t, flags=re.S)
    return len(html.unescape(re.sub(r"<[^>]+>", " ", t)).split())


def main():
    os.makedirs(SORTIE, exist_ok=True)
    lignes = []
    for intention, pays, funnel, valeur, page in I:
        n = mots(page) if page else None
        nm = n or 0
        if page and n is None:
            qualite, gap = "PAGE DECLAREE ABSENTE", "Corriger la référence"
        elif page and nm >= 900:
            qualite, gap = f"{nm} mots — solide", "Aucun"
        elif page and nm >= 600:
            qualite, gap = f"{nm} mots — correcte", "Enrichissement possible"
        elif page and nm >= 400:
            qualite, gap = f"{nm} mots — faible", "Enrichir en priorité"
        elif page:
            qualite, gap = f"{nm} mots — très faible", "Enrichir en priorité"
        else:
            qualite, gap = "—", "Aucune page"
        action = ("COVERED" if page and nm >= 600 else
                  "ENRICHIR" if page else "A_ARBITRER")
        lignes.append({
            "INTENTION": intention, "PAYS": pays, "FUNNEL": funnel,
            "VALEUR_COMMERCIALE": valeur, "PAGE_EXISTANTE": page or "",
            "QUALITE": qualite, "GAP": gap, "ACTION": action,
        })
    with open(os.path.join(SORTIE, "INTENTIONS.csv"), "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(lignes[0].keys()))
        w.writeheader()
        w.writerows(lignes)

    couvertes = [l for l in lignes if l["ACTION"] == "COVERED"]
    enrichir = [l for l in lignes if l["ACTION"] == "ENRICHIR"]
    absentes = [l for l in lignes if l["ACTION"] == "A_ARBITRER"]
    print(f"INTENTIONS analysées : {len(lignes)}")
    print(f"  COVERED   : {len(couvertes)}")
    print(f"  ENRICHIR  : {len(enrichir)}")
    print(f"  A ARBITRER: {len(absentes)} (aucune page)")
    print(f"écrit : {SORTIE}/INTENTIONS.csv")

    # État lisible pour JEV
    L = []
    A = L.append
    A("MESURE DE L'ÉCART — intentions du marché du courtage d'assurance face à ce que COURTIA publie.")
    A("Chaque ligne : intention | pays | étape | valeur commerciale (1-5) | page publiée | mots mesurés.")
    A("")
    for l in lignes:
        A(f"- {l['INTENTION']} | {l['PAYS']} | {l['FUNNEL']} | valeur {l['VALEUR_COMMERCIALE']} | "
          f"{l['PAGE_EXISTANTE'] or 'AUCUNE PAGE'} | {l['QUALITE']}")
    A("")
    A("PAGES PUBLIÉES AUJOURD'HUI (indexables) : 45 en France, 12 en Suisse.")
    A("Produit réel : dossier client 360, contrats/échéances, devis et registre, relances suivies avec")
    A("brouillon à valider, collecte de pièces par lien, lecture assistée de pièces, commissions")
    A("(barèmes, import de relevés, états), documents générés, tâches/kanban, conformité par marché,")
    A("assistant IA (briefing, synthèse, priorisation, préparation d'appel, brouillons, veille, voix),")
    A("prospection (campagnes, boîte de réception, prospects), portail client, import de portefeuille,")
    A("multi-utilisateurs avec rôles et cloisonnement, pilotage (tableau de bord, reporting, objectifs,")
    A("santé du portefeuille, opportunités), intégrations e-mail/agenda/WhatsApp.")
    A("Ce qui n'existe PAS dans le produit : appels d'offres aux compagnies, gestion des mandats,")
    A("comptabilité générale, paie, comparateur grand public, palmarès d'assureurs, certification.")
    A("Contraintes : aucun accès Search Console ni analytics ; achat de liens interdit ; aucune")
    A("traduction automatique ; aucun chiffre de gain publié sans mesure.")
    open(ETAT, "w", encoding="utf-8").write("\n".join(L) + "\n")
    print(f"état JEV écrit : {ETAT} ({len(L)} lignes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
