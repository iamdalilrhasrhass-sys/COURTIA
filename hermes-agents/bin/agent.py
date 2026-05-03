#!/usr/bin/env python3
"""
HERMES Autonomous Agent — Branch Agent Runner
Run: python3 agent.py --branch 0
Uses Qwen 14B (local Ollama) for AI generation
"""
import os, sys, json, time, logging
from datetime import datetime
import requests
import psycopg2

# ── Config ──────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", "")
OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen2.5:14b"
LOG_DIR = "/root/hermes-agents/logs"

# ── Setup ────────────────────────────────────
os.makedirs(LOG_DIR, exist_ok=True)

def get_branch(numero: int) -> dict:
    """Fetch branch config from DB"""
    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()
    cur.execute("SELECT * FROM hermes_branches WHERE numero = %s", (numero,))
    cols = [d[0] for d in cur.description]
    row = cur.fetchone()
    cur.close(); conn.close()
    if not row: return None
    return dict(zip(cols, row))

def ollama(prompt: str, system: str = "") -> str:
    """Call local Qwen model"""
    payload = {
        "model": OLLAMA_MODEL,
        "prompt": prompt,
        "system": system or "Tu es HERMES, un agent IA autonome spécialisé en courtage d\'assurance.",
        "stream": False,
        "options": {"temperature": 0.3, "max_tokens": 2000}
    }
    try:
        r = requests.post(OLLAMA_URL, json=payload, timeout=120)
        return r.json().get("response", "")
    except Exception as e:
        return f"[OLLAMA ERROR] {e}"

def report(msg: str):
    """Log agent activity"""
    ts = datetime.now().isoformat()
    with open(f"{LOG_DIR}/agent.log", "a") as f:
        f.write(f"[{ts}] {msg}\n")
    print(f"[{ts}] {msg}")

# ── Agent Loop ───────────────────────────────
def run_cycle(branch: dict):
    bnum = branch["numero"]
    bname = branch["nom"]
    report(f"🤖 Agent B{bnum:02d} [{bname}] — cycle start")

    # Step 1: Self-assessment
    prompt = f"""Tu es l'agent autonome de la branche "{bname}".
Analyse ton état actuel et liste les 3 actions prioritaires à réaliser aujourd'hui.
Contexte: tu es un agent de courtage d'assurance."""
    thinking = ollama(prompt)
    report(f"B{bnum:02d} thinking: {thinking[:200]}...")

    # Step 2: Generate action plan
    plan_prompt = f"""Basé sur l'analyse ci-dessus, génère un plan d'action concret pour aujourd'hui.
Branche: {bname}
Objectif MRR: {branch.get('mrr_cible_12mois', 'N/A')}
Statut: {branch.get('statut', 'N/A')}"""
    plan = ollama(plan_prompt)
    report(f"B{bnum:02d} plan: {plan[:300]}...")

    report(f"🤖 Agent B{bnum:02d} — cycle done")
    return {"branch": bnum, "thinking": thinking, "plan": plan}

# ── Main ─────────────────────────────────────
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--branch", type=int, required=True)
    parser.add_argument("--all", action="store_true")
    args = parser.parse_args()

    if args.all:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()
        cur.execute("SELECT numero FROM hermes_branches WHERE statut = 'active'")
        branches = [r[0] for r in cur.fetchall()]
        cur.close(); conn.close()
        for b in branches:
            branch = get_branch(b)
            if branch:
                run_cycle(branch)
    else:
        branch = get_branch(args.branch)
        if branch:
            run_cycle(branch)
        else:
            print(f"Branch {args.branch} not found")
            sys.exit(1)
