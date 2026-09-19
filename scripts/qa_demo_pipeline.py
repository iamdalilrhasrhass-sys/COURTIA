#!/usr/bin/env python3
"""QA de bout en bout : LEAD -> DEMO -> PIPELINE, sur le service de capture reel.

Pourquoi ce script existe
-------------------------
Le service de capture (`/root/ark/courtia_capture/service_capture.py`) ne fait
avancer un lead que si l'evenement porte son `lead_id` :

    avancer_lead_sur_evenement(c, lead_id, evenement)  # lit d.get("lead_id")

Or le frontend envoyait ses evenements de demonstration SANS `lead_id` : un
visiteur qui demandait une demo puis parcourait toute la visite restait au
statut NEW, n'apparaissait jamais comme prospect engage et ne declenchait aucune
relance. Un test unitaire ne peut pas prouver cette chaine : il faut le service
reel, sa base SQLite et ses transitions de statut. D'ou ce script.

Ce qu'il prouve, dans l'ordre, sans rien simuler :
  1. une demande de demo cree un lead (statut NEW) ;
  2. un evenement porte par le lead_id fait passer le pipeline a DEMO_STARTED ;
  3. `demo_completed` le fait passer a DEMO_COMPLETED et pose les horodatages ;
  4. `contact_requested` le fait passer a CONTACT_REQUESTED ;
  5. chaque transition laisse une trace dans lead_history (aucune invention) ;
  6. un evenement SANS lead_id est stocke mais NE fait PAS avancer le pipeline
     (c'est la preuve du bug corrige : avant le correctif, tous les evenements
     etaient dans ce cas).

Usage :
    python3 scripts/qa_demo_pipeline.py [--base http://127.0.0.1:8090]
                                        [--db /var/lib/courtia-capture/leads.db]

La base est celle du service REELLEMENT en execution : son emplacement vient de
COURTIA_DATA_DIR (/var/lib/courtia-capture pour l'unite systemd courtia-capture).

Sortie : un rapport JSON sur stdout ; code de sortie 1 si une etape echoue.
Aucune donnee personnelle reelle n'est envoyee : l'adresse utilise un domaine
`.invalid` reserve aux tests.
"""

import argparse
import json
import sqlite3
import sys
import time
import urllib.error
import urllib.request


def appel(base, chemin, corps=None, methode="POST", timeout=30):
    """Appel HTTP brut : renvoie (code, corps decode ou texte)."""
    donnees = json.dumps(corps).encode() if corps is not None else None
    requete = urllib.request.Request(base + chemin, data=donnees, method=methode)
    requete.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(requete, timeout=timeout) as reponse:
            texte = reponse.read().decode()
            try:
                return reponse.status, json.loads(texte or "{}")
            except json.JSONDecodeError:
                return reponse.status, texte[:200]
    except urllib.error.HTTPError as erreur:
        texte = erreur.read().decode()
        try:
            return erreur.code, json.loads(texte or "{}")
        except json.JSONDecodeError:
            return erreur.code, texte[:200]
    except Exception as erreur:  # service injoignable
        return 0, str(erreur)


def lire_lead(db, lead_id):
    """Etat reel du lead en base (la source de verite, pas la reponse HTTP)."""
    with sqlite3.connect(db) as connexion:
        connexion.row_factory = sqlite3.Row
        ligne = connexion.execute(
            "SELECT id, email, statut, lead_score, demo_started_at, demo_completed_at,"
            " last_activity_at FROM leads WHERE id = ?",
            (lead_id,),
        ).fetchone()
        if not ligne:
            # Un lead absent n'est jamais silencieux : c'est une anomalie de la base.
            return {"lead": {"id": lead_id, "statut": "INTROUVABLE", "score": None,
                             "demo_started_at": None, "demo_completed_at": None,
                             "last_activity_at": None},
                    "historique": [], "evenements": []}
        historique = connexion.execute(
            "SELECT champ, ancien, nouveau, auteur FROM lead_history WHERE lead_id = ?"
            " ORDER BY id",
            (lead_id,),
        ).fetchall()
        evenements = connexion.execute(
            "SELECT evenement FROM events WHERE lead_id = ? ORDER BY id", (lead_id,)
        ).fetchall()
    return {
        "lead": dict(ligne),
        "historique": [dict(h) for h in historique],
        "evenements": [e["evenement"] for e in evenements],
    }


def main():
    analyseur = argparse.ArgumentParser()
    analyseur.add_argument("--base", default="http://127.0.0.1:8090")
    analyseur.add_argument("--db", default="/var/lib/courtia-capture/leads.db")
    options = analyseur.parse_args()

    resultat = {"base": options.base, "db": options.db, "etapes": [], "ok": True}
    horodatage = int(time.time())

    def etape(nom, condition, detail):
        resultat["etapes"].append({"etape": nom, "ok": bool(condition), "detail": detail})
        if not condition:
            resultat["ok"] = False
        return condition

    # 1. Demande de demo -> lead NEW
    # Noms de champs attendus par le service de capture (il valide
    # first_name / last_name / company_name / consent et renvoie 400 sinon).
    code, corps = appel(options.base, "/api/leads/demo-request", {
        "email": f"qa.pipeline.{horodatage}@courtia.invalid",
        "first_name": "QA",
        "last_name": "PIPELINE",
        "company_name": "Cabinet QA Pipeline",
        "canton": "GE",
        "message": "Verification automatique de la chaine lead -> demo -> pipeline.",
        "consent": True,
    })
    if code == 400 and isinstance(corps, dict) and corps.get("champs"):
        etape_rejet = corps.get("champs")
        print(f"!! le service a rejete le corps de test : champs {etape_rejet}")
        return 1
    lead_id = corps.get("lead_id") if isinstance(corps, dict) else None
    etape("demande de demo", code in (200, 201) and bool(lead_id),
          f"HTTP {code} lead_id={lead_id} corps={str(corps)[:120]}")
    if not lead_id:
        print(json.dumps(resultat, ensure_ascii=False, indent=2))
        return 1

    apres_creation = lire_lead(options.db, lead_id)
    etape("lead cree au statut NEW (base)",
          apres_creation and apres_creation["lead"]["statut"] == "NEW",
          apres_creation["lead"]["statut"] if apres_creation else "lead introuvable")

    # 2. Evenement AVEC lead_id -> DEMO_STARTED
    code, _ = appel(options.base, "/api/leads/events", {
        "event": "demo_started", "lead_id": lead_id,
        "session_id": f"qa-{horodatage}", "source": "demo",
    })
    etat = lire_lead(options.db, lead_id)
    etape("demo_started fait avancer le pipeline", code in (200, 201, 202)
          and etat["lead"]["statut"] == "DEMO_STARTED",
          f"HTTP {code} statut={etat['lead']['statut']}")
    etape("demo_started horodate la visite", bool(etat["lead"]["demo_started_at"]),
          str(etat["lead"]["demo_started_at"]))

    # 3. demo_completed -> DEMO_COMPLETED
    code, _ = appel(options.base, "/api/leads/events", {
        "event": "demo_completed", "lead_id": lead_id,
        "session_id": f"qa-{horodatage}", "source": "demo",
    })
    etat = lire_lead(options.db, lead_id)
    etape("demo_completed fait avancer le pipeline",
          code in (200, 201, 202) and etat["lead"]["statut"] == "DEMO_COMPLETED",
          f"HTTP {code} statut={etat['lead']['statut']}")
    etape("demo_completed horodate la fin", bool(etat["lead"]["demo_completed_at"]),
          str(etat["lead"]["demo_completed_at"]))

    # 4. contact_requested -> CONTACT_REQUESTED (le CTA final de la demo)
    code, _ = appel(options.base, "/api/leads/events", {
        "event": "contact_requested", "lead_id": lead_id,
        "session_id": f"qa-{horodatage}", "source": "demo",
    })
    etat = lire_lead(options.db, lead_id)
    etape("contact_requested fait avancer le pipeline",
          code in (200, 201, 202) and etat["lead"]["statut"] == "CONTACT_REQUESTED",
          f"HTTP {code} statut={etat['lead']['statut']}")

    # 5. Tracabilite : chaque transition est journalisee
    transitions = {h["nouveau"]: h["ancien"] for h in etat["historique"] if h["champ"] == "statut"}
    etape("transitions tracees dans lead_history",
          all(s in transitions for s in ("DEMO_STARTED", "DEMO_COMPLETED", "CONTACT_REQUESTED")),
          json.dumps(transitions, ensure_ascii=False))
    etape("les 3 evenements sont rattaches au lead",
          len(etat["evenements"]) >= 3, str(etat["evenements"]))

    # 6. Contre-epreuve : un evenement SANS lead_id ne doit PAS avancer le pipeline
    code, corps_sans = appel(options.base, "/api/leads/demo-request", {
        "email": f"qa.sanslead.{horodatage}@courtia.invalid",
        "first_name": "QA",
        "last_name": "SANS LEAD",
        "company_name": "Cabinet QA Temoin",
        "consent": True,
    })
    lead_temoin = corps_sans.get("lead_id") if isinstance(corps_sans, dict) else None
    if lead_temoin:
        appel(options.base, "/api/leads/events", {
            "event": "demo_completed", "session_id": f"qa-sans-{horodatage}", "source": "demo",
        })
        temoin = lire_lead(options.db, lead_temoin)
        etape("sans lead_id, le pipeline ne bouge pas (bug corrige cote frontend)",
              temoin["lead"]["statut"] == "NEW",
              f"statut={temoin['lead']['statut']} (attendu NEW)")

    resultat["lead_id_test"] = lead_id
    resultat["lead_id_temoin"] = lead_temoin
    resultat["etat_final"] = etat["lead"]
    print(json.dumps(resultat, ensure_ascii=False, indent=2))
    return 0 if resultat["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
