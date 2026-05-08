#!/usr/bin/env python3
"""seed_demo_clients.py — Seed 10 demo clients for COURTIA.
Refuses to run against production unless --force-prod is passed.
Use --reset to delete previous demo data before seeding.
"""

import os
import sys
import argparse
import datetime
from pathlib import Path

import psycopg2
import psycopg2.extras

# ─── Guard: detect production ───
def is_production(dsn: str) -> bool:
    prod_indicators = [
        "render.com",
        "railway.app",
        "fly.dev",
        "aws.rds",
        "amazonaws.com",
        "vercel",
    ]
    dsn_lower = dsn.lower()
    return any(indicator in dsn_lower for indicator in prod_indicators)

# ─── Demo data ───
DEMO_CLIENTS = [
    {"prenom": "Emma", "nom": "Mercier", "email": "emma.mercier@demo.fr", "mobile": "0611223344", "status": "prospect", "type": "particulier", "risk_score": 25, "city": "Lyon"},
    {"prenom": "Nicolas", "nom": "Dupont", "email": "nicolas.dupont@demo.fr", "mobile": "0700112233", "status": "actif", "type": "particulier", "risk_score": 15, "city": "Paris"},
    {"prenom": "Sandrine", "nom": "Petit", "email": "sandrine.petit@demo.fr", "mobile": None, "status": "prospect", "type": "particulier", "risk_score": 40, "city": "Marseille"},
    {"prenom": "Alexandre", "nom": "Lefebvre", "email": "alex.lefebvre@demo.fr", "mobile": "0622334455", "status": "actif", "type": "pro", "risk_score": 20, "city": "Bordeaux"},
    {"prenom": "Mathilde", "nom": "Roux", "email": "mathilde.roux@demo.fr", "mobile": "0733445566", "status": "actif", "type": "particulier", "risk_score": 10, "city": "Lille"},
    {"prenom": "Guillaume", "nom": "Durand", "email": "guillaume.durand@demo.fr", "mobile": "0644556677", "status": "actif", "type": "pro", "risk_score": 25, "city": "Toulouse"},
    {"prenom": "Justine", "nom": "Moreau", "email": "justine.moreau@demo.fr", "mobile": "0755667788", "status": "prospect", "type": "particulier", "risk_score": 30, "city": "Nice"},
    {"prenom": "Marc", "nom": "Vincent", "email": "marc.vincent@demo.fr", "mobile": "0666778899", "status": "resilie", "type": "particulier", "risk_score": 65, "city": "Nantes"},
    {"prenom": "Amandine", "nom": "Schmitt", "email": "amandine.schmitt@demo.fr", "mobile": "0777889900", "status": "actif", "type": "particulier", "risk_score": 18, "city": "Strasbourg"},
    {"prenom": "Jean-Marc", "nom": "Poirier", "email": "jm.poirier@demo.fr", "mobile": None, "status": "a_risque", "type": "particulier", "risk_score": 88, "city": "Dijon"},
]

def main():
    parser = argparse.ArgumentParser(description="Seed COURTIA demo clients")
    parser.add_argument("--force-prod", action="store_true", help="Allow seeding production")
    parser.add_argument("--reset", action="store_true", help="Delete previous demo clients before seeding")
    parser.add_argument("--courtier-id", type=int, default=48, help="Courtier ID (default: 48)")
    args = parser.parse_args()

    dsn = os.environ.get("DATABASE_URL", "dbname=crm_assurance user=femyapp host=/var/run/postgresql")
    
    if is_production(dsn) and not args.force_prod:
        print("❌ PRODUCTION detected.")
        print("   Use --force-prod to seed production anyway.")
        sys.exit(1)

    conn = psycopg2.connect(dsn)
    cur = conn.cursor()

    courtier_id = args.courtier_id
    
    if args.reset:
        # Delete demo clients (those with demo.fr email)
        cur.execute(
            "DELETE FROM quotes WHERE client_id IN (SELECT id FROM clients WHERE email LIKE '%@demo.fr')"
        )
        cur.execute(
            "DELETE FROM appointments WHERE client_id IN (SELECT id FROM clients WHERE email LIKE '%@demo.fr')"
        )
        cur.execute(
            "DELETE FROM clients WHERE email LIKE '%@demo.fr'"
        )
        print(f"🗑️  Reset: removed previous demo clients.")

    count = 0
    for client in DEMO_CLIENTS:
        cur.execute(
            """INSERT INTO clients (first_name, last_name, email, mobile, status, type, risk_score, city, courtier_id, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON CONFLICT (email, courtier_id) DO NOTHING
            RETURNING id""",
            (
                client["prenom"], client["nom"], client["email"],
                client.get("mobile"), client["status"], client["type"],
                client["risk_score"], client["city"], courtier_id
            )
        )
        if cur.fetchone():
            count += 1

    conn.commit()
    cur.close()
    conn.close()
    
    print(f"✅ Seeded {count} demo clients for courtier #{courtier_id}.")
    if args.reset:
        print("   Previous demo data was deleted first.")

if __name__ == "__main__":
    main()
