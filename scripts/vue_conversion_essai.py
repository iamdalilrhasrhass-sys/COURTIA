#!/usr/bin/env python3
"""Vue de conversion des essais — règles explicites, aucun score magique.

Un essai ne se résume pas à « trialing ». Cette vue classe chaque compte en essai
selon des SIGNAUX RÉELS, lisibles en base, et dit explicitement quand un signal
n'existe pas :

    SIGNAL                              SOURCE RÉELLE
    client créé                         clients.courtier_id (ou clients.user_id)
    document déposé                     documents.user_id
    prise en main terminée              users.onboarding_completed
    activité récente (<= 7 jours)       users.updated_at
    connexion                           NOT_TRACKED — audit_logs est vide et users
                                        n'a aucune colonne de dernière connexion ;
                                        on ne l'invente pas.
    contrat / devis                     NON ATTRIBUABLE — quotes n'a pas de colonne
                                        de propriétaire, on ne compte donc rien.

RÈGLES (dans l'ordre, la première qui s'applique gagne) :
    CONVERTED    abonnement réellement actif (subscription_status='active')
    EXPIRED      essai terminé (trial_ends_at dépassé)
    HIGH_INTENT  essai actif + au moins 1 client + (document ou prise en main faite)
    AT_RISK      essai actif, <= 3 jours restants et au plus 1 signal
    ENGAGED      essai actif + au moins 2 signaux
    LOW_USAGE    essai actif + 0 signal
    TRIAL_ACTIVE essai actif (regroupement des trois classes précédentes)

Usage : python3 scripts/vue_conversion_essai.py [--json]
"""

import argparse
import json
import os
import re
import subprocess
import sys

PG_DB = os.environ.get("COURTIA_PG_DB", "courtia_rebuild_9")

CLASSES = ("CONVERTED", "EXPIRED", "HIGH_INTENT", "AT_RISK", "ENGAGED", "LOW_USAGE")


def psql_json(requete):
    """Exécute une requête et renvoie une liste de dictionnaires (JSON Postgres)."""
    try:
        with open("/etc/courtia/backend.env", encoding="utf-8") as f:
            motdepasse = re.search(r"courtia:([^@]*)@", f.read())
        if not motdepasse:
            return None
        environnement = dict(os.environ, PGPASSWORD=motdepasse.group(1), PGHOST="127.0.0.1", PGUSER="courtia")
        resultat = subprocess.run(
            ["psql", "-d", PG_DB, "-tAc", requete], capture_output=True, text=True, timeout=40, env=environnement)
        if resultat.returncode != 0:
            return None
        sortie = resultat.stdout.strip()
        return json.loads(sortie) if sortie else []
    except Exception:
        return None


REQUETE_COMPTES = """
SELECT json_agg(t)::text FROM (
  SELECT u.id,
         u.email,
         u.plan,
         u.subscription_status,
         u.onboarding_completed,
         u.trial_ends_at,
         GREATEST(0, CEIL(EXTRACT(EPOCH FROM (u.trial_ends_at - NOW())) / 86400))::int AS jours_restants,
         (NOW() - u.updated_at) < INTERVAL '7 days'  AS actif_7j,
         COALESCE(c.nb, 0) AS clients,
         COALESCE(d.nb, 0) AS documents
  FROM users u
  LEFT JOIN (SELECT courtier_id AS uid, COUNT(*) AS nb FROM clients
              WHERE courtier_id IS NOT NULL GROUP BY courtier_id) c ON c.uid = u.id
  LEFT JOIN (SELECT user_id AS uid, COUNT(*) AS nb FROM documents
              WHERE user_id IS NOT NULL GROUP BY user_id) d ON d.uid = u.id
  WHERE u.subscription_status IN ('trialing', 'active')
  ORDER BY u.id
) t;
"""


def masquer(email):
    """Les comptes de vérification restent lisibles ; on masque par prudence."""
    email = email or ""
    if "@" not in email:
        return email
    local, domaine = email.split("@", 1)
    return f"{local[:2]}***@{domaine}"


def classer(compte):
    """Applique les règles, dans l'ordre. Renvoie (classe, signaux présents)."""
    signaux = []
    if compte.get("clients"):
        signaux.append(f"clients={compte['clients']}")
    if compte.get("documents"):
        signaux.append(f"documents={compte['documents']}")
    if compte.get("onboarding_completed"):
        signaux.append("prise_en_main=faite")
    if compte.get("actif_7j"):
        signaux.append("activite=7j")

    statut = compte.get("subscription_status")
    jours = compte.get("jours_restants") or 0

    if statut == "active":
        return "CONVERTED", signaux
    if comptes_expire(compte):
        return "EXPIRED", signaux
    if (compte.get("clients") or 0) > 0 and (compte.get("documents") or 0) > 0:
        return "HIGH_INTENT", signaux
    if (compte.get("clients") or 0) > 0 and compte.get("onboarding_completed"):
        return "HIGH_INTENT", signaux
    if jours <= 3 and len(signaux) <= 1:
        return "AT_RISK", signaux
    if len(signaux) >= 2:
        return "ENGAGED", signaux
    return "LOW_USAGE", signaux


def comptes_expire(compte):
    """L'essai est terminé : la base le dit (jours_restants <= 0 et fin passée)."""
    return (compte.get("subscription_status") == "trialing"
            and compte.get("trial_ends_at") is not None
            and (compte.get("jours_restants") or 0) <= 0)


def principal():
    analyseur = argparse.ArgumentParser()
    analyseur.add_argument("--json", action="store_true")
    options = analyseur.parse_args()

    comptes = psql_json(REQUETE_COMPTES)
    if comptes is None:
        print("Base injoignable : la vue de conversion ne peut pas être calculée.")
        return 1

    par_classe = {c: [] for c in CLASSES}
    for compte in comptes:
        classe, signaux = classer(compte)
        par_classe[classe].append({
            "id": compte["id"],
            "email": masquer(compte.get("email")),
            "plan": compte.get("plan"),
            "statut": compte.get("subscription_status"),
            "jours_restants": compte.get("jours_restants"),
            "signaux": signaux,
        })

    rapport = {
        "source": f"{PG_DB} (users + clients.courtier_id + documents.user_id)",
        "regles": "CONVERTED > EXPIRED > HIGH_INTENT > AT_RISK > ENGAGED > LOW_USAGE",
        "signaux_non_mesures": {
            "connexion": "NOT_TRACKED — audit_logs vide, aucune colonne de dernière connexion",
            "devis_contrats": "NON ATTRIBUABLE — la table quotes n'a pas de colonne de propriétaire",
            "usage_ARK": "NOT_TRACKED — aucun journal d'appels ARK en base",
        },
        "comptes": len(comptes),
        "par_classe": {c: len(par_classe[c]) for c in CLASSES},
        "detail": par_classe,
    }

    if options.json:
        print(json.dumps(rapport, ensure_ascii=False, indent=2))
        return 0

    print("VUE DE CONVERSION DES ESSAIS — règles explicites, signaux réels\n")
    print(f"  base lue : {rapport['source']}")
    print("  ATTENTION : si cette base est la base locale de vérification, les lignes")
    print("  affichées sont des COMPTES DE TEST — la distribution des classes prouve")
    print("  que les règles s'exécutent, elle ne mesure pas l'usage réel.\
")
    print(f"  comptes en essai ou actifs : {rapport['comptes']}")
    for classe in CLASSES:
        print(f"  {classe:12} {len(par_classe[classe])}")
    print("\n  Signaux non mesurés (jamais estimés) :")
    for nom, raison in rapport["signaux_non_mesures"].items():
        print(f"    - {nom:14} {raison}")
    print("\n  Détail :")
    for classe in CLASSES:
        for ligne in par_classe[classe]:
            print(f"    {classe:12} {ligne['email']:34} {ligne['statut']:9} "
                  f"{ligne['jours_restants']} j | {', '.join(ligne['signaux']) or 'aucun signal'}")
    return 0


if __name__ == "__main__":
    sys.exit(principal())
