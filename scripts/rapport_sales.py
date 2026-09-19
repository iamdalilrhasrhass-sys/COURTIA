#!/usr/bin/env python3
"""Tableau de bord commercial COURTIA — chiffres RÉELS, ou NOT_TRACKED.

Règle : aucun zéro silencieux. Un indicateur se lit :
  - une VALEUR mesurée (avec sa source) ;
  - `NOT_TRACKED` quand rien ne mesure cet indicateur (et rien ne le laisse croire) ;
  - `0` seulement quand la mesure existe réellement et vaut zéro.

Sources lues (toutes réelles, aucune donnée inventée) :
  - base du service de capture   : /var/lib/courtia-capture/leads.db (leads, events)
  - base applicative             : Postgres (users, clients, quotes, documents,
                                   subscriptions, invoices)
  - machine commerciale suisse   : /root/ark/business/COURTIA_SWISS_SALES_MACHINE.jsonl
                                   et /root/ark/business/OUTBOUND_WAVE_002.jsonl
                                   (brouillons : jamais d'envoi)

Usage : python3 scripts/rapport_sales.py [--json]
"""

import argparse
import json
import os
import re
import sqlite3
import subprocess
import sys

CAPTURE_DB = os.environ.get("COURTIA_CAPTURE_DB", "/var/lib/courtia-capture/leads.db")
BASE = "/root/ark/business"
PG_DB = os.environ.get("COURTIA_PG_DB", "courtia_rebuild_9")


def lire_capture():
    """Compteurs mesurés dans la base du service de capture."""
    if not os.path.exists(CAPTURE_DB):
        return None
    with sqlite3.connect(CAPTURE_DB) as c:
        c.row_factory = sqlite3.Row
        statuts = dict(c.execute("SELECT statut, COUNT(*) FROM leads GROUP BY statut").fetchall())
        total = c.execute("SELECT COUNT(*) FROM leads").fetchone()[0]
        # Les comptes de test utilisent le domaine réservé .invalid : on les isole
        # pour ne jamais compter une vérification automatique comme un vrai prospect.
        qa = c.execute("SELECT COUNT(*) FROM leads WHERE email LIKE '%.invalid'").fetchone()[0]
        demo_started = c.execute("SELECT COUNT(*) FROM leads WHERE demo_started_at IS NOT NULL").fetchone()[0]
        demo_done = c.execute("SELECT COUNT(*) FROM leads WHERE demo_completed_at IS NOT NULL").fetchone()[0]
        ev_total = c.execute("SELECT COUNT(*) FROM events").fetchone()[0]
        ev_rattaches = c.execute("SELECT COUNT(*) FROM events WHERE lead_id IS NOT NULL").fetchone()[0]
        ev_noms = {r[0]: r[1] for r in c.execute(
            "SELECT evenement, COUNT(*) FROM events GROUP BY evenement ORDER BY 2 DESC").fetchall()}
    return {
        "leads_total": total,
        "leads_qa": qa,
        "leads_reels": total - qa,
        "statuts": statuts,
        "demo_started": demo_started,
        "demo_completed": demo_done,
        "evenements": ev_total,
        "evenements_rattaches": ev_rattaches,
        "evenements_noms": ev_noms,
    }


def psql(requete):
    """Lecture Postgres : renvoie la valeur scalaire, ou None si indisponible."""
    try:
        with open("/etc/courtia/backend.env", encoding="utf-8") as f:
            contenu = f.read()
        motdepasse = re.search(r"courtia:([^@]*)@", contenu)
        if not motdepasse:
            return None
        environnement = dict(os.environ, PGPASSWORD=motdepasse.group(1), PGHOST="127.0.0.1", PGUSER="courtia")
        resultat = subprocess.run(
            ["psql", "-d", PG_DB, "-tAc", requete],
            capture_output=True, text=True, timeout=30, env=environnement,
        )
        if resultat.returncode != 0:
            return None
        valeur = resultat.stdout.strip()
        return int(valeur) if valeur.lstrip("-").isdigit() else valeur
    except Exception:
        return None


def compter_jsonl(chemin):
    if not os.path.exists(chemin):
        return None
    with open(chemin, encoding="utf-8") as f:
        return sum(1 for ligne in f if ligne.strip())


def principal():
    analyseur = argparse.ArgumentParser()
    analyseur.add_argument("--json", action="store_true", help="sortie JSON brute")
    options = analyseur.parse_args()

    capture = lire_capture()
    rapport = {"sources": {"capture": CAPTURE_DB, "applicatif": PG_DB, "business": BASE}}

    def kpi(nom, valeur, source, note=None):
        rapport[nom] = {"valeur": valeur, "source": source}
        if note:
            rapport[nom]["note"] = note

    if capture is None:
        for nom in ("LEADS", "DEMO_STARTED", "DEMO_COMPLETED"):
            kpi(nom, "NOT_TRACKED", "base du service de capture illisible")
    else:
        kpi("LEADS", capture["leads_reels"], f"{CAPTURE_DB} (leads réels, comptes de test .invalid exclus)",
            f"{capture['leads_qa']} compte(s) de vérification automatique exclus")
        kpi("LEADS_PAR_STATUT", capture["statuts"], "base de capture")
        kpi("DEMO_STARTED", capture["demo_started"], "leads.demo_started_at non nul")
        kpi("DEMO_COMPLETED", capture["demo_completed_at"] if "demo_completed_at" in capture else capture["demo_completed"],
            "leads.demo_completed_at non nul")
        kpi("DEMO_BOOKED", capture["statuts"].get("MEETING_BOOKED", 0), "statut de lead MEETING_BOOKED")
        kpi("CONTACT_REQUESTED", capture["statuts"].get("CONTACT_REQUESTED", 0), "statut de lead CONTACT_REQUESTED")
        kpi("EVENEMENTS_TOTAL", capture["evenements"], "table events")
        kpi("EVENEMENTS_RATTACHES_A_UN_LEAD", capture["evenements_rattaches"], "events.lead_id non nul")
        kpi("EVENEMENTS_PAR_TYPE", capture["evenements_noms"], "table events")

    kpi("TRIAL", psql("SELECT COUNT(*) FROM users WHERE subscription_status='trialing' AND trial_ends_at > NOW()"),
        "users.subscription_status='trialing' et essai non expiré")
    kpi("TRIAL_COMBIEN_NON_QA", psql("SELECT COUNT(*) FROM users WHERE subscription_status='trialing' AND trial_ends_at > NOW() AND email NOT LIKE '%.invalid'"),
        "idem, hors comptes de vérification .invalid")
    kpi("CLIENTS_BASE_LOCALE_QA", psql("SELECT COUNT(*) FROM clients"),
        "base locale de QA — dossiers créés par les vérifications, pas des clients réels")
    kpi("CONTRATS", psql("SELECT COUNT(*) FROM quotes"), "table quotes (le contrat vit dans quotes)")
    kpi("DOCUMENTS", psql("SELECT COUNT(*) FROM documents"), "table documents")
    # ------------------------------------------------------------------ REVENU
    # Distinction VITALE entre du revenu et des fixtures de test. La base
    # interrogée ici est la base locale de QA : les lignes de `subscriptions`
    # créées par la vérification de la chaîne Stripe portent un identifiant
    # d'abonné de test (sub_test_*, sub_b*_) et NE SONT PAS du chiffre d'affaires.
    # La base de PRODUCTION n'est pas joignable (Render : database disconnected),
    # donc le revenu réel est NOT_TRACKED — jamais 0, jamais le chiffre local.
    est_fixture = ("provider_subscription_id LIKE 'sub_test%' "
                   "OR provider_subscription_id LIKE 'sub_b%'")
    kpi("ABONNEMENTS_ACTIFS_PRODUCTION", "NOT_TRACKED",
        "base de production injoignable (Render /api/status : database disconnected)")
    kpi("PAID_CUSTOMERS_PRODUCTION", "NOT_TRACKED",
        "impossible à mesurer sans la base de production")
    kpi("MRR_PRODUCTION", "NOT_TRACKED",
        "impossible à mesurer sans la base de production")
    kpi("ABONNEMENTS_LOCAUX_QA", psql(f"SELECT COUNT(*) FROM subscriptions WHERE status IN ('active','trialing') AND ({est_fixture})"),
        "base locale de QA — fixtures de test, PAS du revenu")
    kpi("PAID_CUSTOMERS_LOCAUX_QA_NE_PAS_CONFONDRE", psql(f"SELECT COUNT(*) FROM subscriptions WHERE status='active' AND ({est_fixture})"),
        "fixtures de la vérification locale de la chaîne Stripe (sub_test_*/sub_b*_)")
    kpi("MONTANT_FACTURES_LOCALES_QA_CENTIMES", psql("SELECT COALESCE(SUM(amount_cents),0) FROM invoices WHERE status='paid'"),
        "factures de TEST locales, PAS un MRR")
    kpi("PAIEMENTS_EN_ECHEC", psql("SELECT COUNT(*) FROM invoices WHERE status IN ('past_due','failed')"), "factures en échec (base locale)")
    kpi("PROSPECTS_SUISSE", compter_jsonl(f"{BASE}/COURTIA_SWISS_SALES_MACHINE.jsonl"),
        f"{BASE}/COURTIA_SWISS_SALES_MACHINE.jsonl (machine commerciale)")
    kpi("FILE_PRIORITAIRE_ROMANDIE", compter_jsonl(f"{BASE}/TOP_PRIORITY_ROMANDIE.jsonl"),
        f"{BASE}/TOP_PRIORITY_ROMANDIE.jsonl")
    kpi("DRAFTS_READY", compter_jsonl(f"{BASE}/OUTBOUND_WAVE_002.jsonl"),
        f"{BASE}/OUTBOUND_WAVE_002.jsonl (brouillons — jamais envoyés)")

    for nom in ("CONTACTED", "DELIVERED", "REPLIED", "POSITIVE"):
        kpi(nom, "NOT_TRACKED", "aucun envoi n'a eu lieu : aucun indicateur ne mesure cette étape")
    kpi("ENVOIS_COMMERCIAUX", 0, "aucun envoi autorisé — vérifié : les brouillons portent DRAFT_ONLY_NOT_SENT")

    if options.json:
        print(json.dumps(rapport, ensure_ascii=False, indent=2))
        return 0

    print("TABLEAU DE BORD COMMERCIAL COURTIA — valeurs mesurées ou NOT_TRACKED\n")
    for nom, contenu in rapport.items():
        if nom == "sources":
            continue
        valeur = contenu["valeur"]
        if isinstance(valeur, dict):
            valeur = ", ".join(f"{k}={v}" for k, v in valeur.items())
        print(f"  {nom:34} {valeur}")
        print(f"  {'':34} (source : {contenu['source']})")
        if contenu.get("note"):
            print(f"  {'':34} note : {contenu['note']}")
    return 0


if __name__ == "__main__":
    sys.exit(principal())
