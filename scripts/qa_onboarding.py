#!/usr/bin/env python3
"""QA de l'onboarding client : authentification, persistance, reprise.

Ce que ce script vérifie contre un backend réellement démarré :
  1. l'onboarding refuse un appel SANS jeton (401) — il porte des données de cabinet ;
  2. la progression est créée puis relue pour CE compte ;
  3. marquer une étape est réellement persisté (relecture) ;
  4. la progression survit à une DÉCONNEXION / RECONNEXION ;
  5. deux cabinets ne partagent jamais leur progression ;
  6. le résumé annoncé par l'API correspond aux étapes réellement marquées
     (aucun chiffre décoratif).

Usage : python3 scripts/qa_onboarding.py [base_url]
"""
import json
import sys
import time
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4193").rstrip("/")
H = int(time.time())
R = []


def appel(methode, chemin, corps=None, jeton=None):
    donnees = json.dumps(corps).encode() if corps is not None else None
    req = urllib.request.Request(BASE + chemin, data=donnees, method=methode)
    req.add_header("Content-Type", "application/json")
    if jeton:
        req.add_header("Authorization", "Bearer " + jeton)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read().decode() or "{}")
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read().decode() or "{}")
        except Exception:
            return e.code, {}
    except Exception as e:
        return 0, {"erreur": str(e)}


def verifier(intitule, condition, detail=""):
    R.append((intitule, bool(condition), detail))
    print(f"  [{'OK ' if condition else 'ECHEC'}] {intitule}" + (f" — {detail}" if detail else ""))


def inscrire(etiquette):
    email = f"onboarding.{etiquette}.{H}@courtia.invalid"
    code, corps = appel("POST", "/api/auth/register", {
        "email": email, "password": "MotDePasseQA!2026",
        "firstName": "QA", "lastName": etiquette.upper()})
    return (email, corps.get("token")) if code == 201 else (None, None)


def connecter(email):
    code, corps = appel("POST", "/api/auth/login", {"email": email, "password": "MotDePasseQA!2026"})
    return corps.get("token") if code == 200 else None


def progression(jeton):
    code, corps = appel("GET", "/api/onboarding/gamified/progress", None, jeton)
    return code, corps


def main():
    print(f"=== QA ONBOARDING CONTRE {BASE} ===\n")

    print("1. sans jeton, l'onboarding est fermé")
    code, _ = progression(None)
    verifier("GET progress sans jeton -> 401", code == 401, f"HTTP {code}")

    print("\n2. progression initiale d'un nouveau cabinet")
    email_a, jeton_a = inscrire("alpha")
    if not jeton_a:
        print("  inscription impossible, arrêt")
        return 1
    code, p = progression(jeton_a)
    verifier("GET progress -> 200", code == 200, f"HTTP {code}")
    etapes = p.get("steps", [])
    verifier("des étapes sont proposées", len(etapes) > 0, f"{len(etapes)} étape(s)")
    verifier("aucune étape marquée au départ",
             p.get("summary", {}).get("completedSteps") == 0,
             f"completedSteps={p.get('summary', {}).get('completedSteps')}")
    if not etapes:
        return 1
    premiere = etapes[0]["key"]

    print("\n3. marquer une étape est persisté")
    code, _ = appel("POST", f"/api/onboarding/gamified/step/{premiere}/complete", {}, jeton_a)
    verifier("POST step/complete -> 200", code == 200, f"HTTP {code}")
    _, p2 = progression(jeton_a)
    marquee = [s for s in p2.get("steps", []) if s["key"] == premiere]
    verifier("l'étape est relue comme terminée", bool(marquee) and marquee[0].get("completed") is True)
    verifier("le résumé suit l'étape marquée",
             p2.get("summary", {}).get("completedSteps") == 1,
             f"completedSteps={p2.get('summary', {}).get('completedSteps')}")

    print("\n4. déconnexion / reconnexion")
    jeton_a2 = connecter(email_a)
    verifier("reconnexion -> jeton obtenu", bool(jeton_a2))
    _, p3 = progression(jeton_a2 or jeton_a)
    marquee3 = [s for s in p3.get("steps", []) if s["key"] == premiere]
    verifier("la progression survit à la reconnexion",
             bool(marquee3) and marquee3[0].get("completed") is True)

    print("\n5. étanchéité entre deux cabinets")
    email_b, jeton_b = inscrire("beta")
    _, pb = progression(jeton_b)
    verifier("le cabinet B démarre à zéro",
             pb.get("summary", {}).get("completedSteps") == 0,
             f"completedSteps={pb.get('summary', {}).get('completedSteps')}")
    verifier("B ne voit aucune étape validée par A",
             all(s.get("completed") is False for s in pb.get("steps", [])))

    print("\n=== BILAN ===")
    ok = sum(1 for _, c, _ in R if c)
    print(f"{ok}/{len(R)} contrôles au vert")
    for i, c, d in R:
        if not c:
            print(f"  ECHEC : {i} {d}")
    return 0 if ok == len(R) else 1


if __name__ == "__main__":
    sys.exit(main())
