#!/usr/bin/env python3
"""Recette QA — cycle de vie de l'essai COURTIA (7 jours → lecture seule → abonnement).

Usage : python3 scripts/qa_essai_cycle.py [base] [base_de_donnees]
        défauts : http://127.0.0.1:4193  courtia_qa_final

Ce script manipule DIRECTEMENT la base QA (jamais la production) pour forcer
l'expiration de l'essai : c'est la seule façon de prouver le comportement J+7
sans attendre sept jours. Chaque manipulation est annoncée.

Ce qui est prouvé :
  1. une inscription accorde un essai de 7 jours (statut serveur) ;
  2. pendant l'essai, les écritures métier passent ;
  3. essai expiré : /api/billing/status dit TRIAL_EXPIRED + lecture_seule ;
  4. les DONNÉES restent lisibles (aucune suppression, aucune perte) ;
  5. les écritures métier sont refusées en 402 « trial_expired » ;
  6. un abonnement actif rétablit les écritures et supprime le paywall ;
  7. l'invitation administrateur crée un essai de 7 jours sans transmettre de
     mot de passe (lien d'activation uniquement), et ce lien fonctionne.
"""
import json
import subprocess
import sys
import time
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4193").rstrip("/")
DB = sys.argv[2] if len(sys.argv) > 2 else "courtia_qa_final"
H = int(time.time())
R = []


def psql(sql):
    out = subprocess.run(["psql", "-d", DB, "-tAc", sql], capture_output=True, text=True)
    if out.returncode != 0:
        raise RuntimeError(f"psql a échoué : {out.stderr.strip()[:200]}")
    return out.stdout.strip()


def appel(methode, chemin, corps=None, jeton=None):
    donnees = json.dumps(corps).encode() if corps is not None else None
    req = urllib.request.Request(BASE + chemin, data=donnees, method=methode)
    req.add_header("Content-Type", "application/json")
    if jeton:
        req.add_header("Authorization", "Bearer " + jeton)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
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


def main():
    print(f"=== QA CYCLE D'ESSAI CONTRE {BASE} (base {DB}) ===\n")
    email = f"qa.essai.{H}@courtia.invalid"
    code, corps = appel("POST", "/api/auth/register", {
        "email": email, "password": "MotDePasseQA!2026", "firstName": "QA", "lastName": "ESSAI"})
    jeton = corps.get("token")
    if not jeton:
        print(f"inscription impossible (HTTP {code}), arrêt")
        return 1

    print("1. l'inscription accorde un essai de 7 jours")
    code, corps = appel("GET", "/api/billing/status", None, jeton)
    st = corps.get("status") or {}
    verifier("statut serveur accessible", code == 200, f"HTTP {code}")
    verifier("trial_state = TRIAL_ACTIVE", st.get("trial_state") == "TRIAL_ACTIVE", str(st.get("trial_state")))
    verifier("durée annoncée = 7 jours", st.get("duree_essai_jours") == 7, str(st.get("duree_essai_jours")))
    verifier("jours restants = 7", st.get("jours_restants") == 7, str(st.get("jours_restants")))
    verifier("lecture seule = False", st.get("lecture_seule") is False, str(st.get("lecture_seule")))
    fin = st.get("trial_end_at")
    if fin:
        import datetime
        d = datetime.datetime.fromisoformat(fin.replace("Z", "+00:00"))
        debut = datetime.datetime.fromisoformat(str(st.get("trial_start_at")).replace("Z", "+00:00"))
        verifier("la fin d'essai est 7 jours après le début",
                 abs((d - debut).total_seconds() - 7 * 86400) < 3600, f"{(d - debut).days} jour(s)")

    print("\n2. pendant l'essai, les écritures passent")
    code, corps = appel("POST", "/api/clients", {"nom": "Client Essai QA", "prenom": "Léa",
                                                "email": f"client.essai.{H}@courtia.invalid"}, jeton)
    client_id = ((corps.get("client") or corps.get("data") or corps) or {}).get("id")
    verifier("création de client autorisée -> 201", code == 201, f"HTTP {code}")

    print(f"\n3. forçage de l'expiration (QA uniquement, table users de {DB})")
    psql(f"UPDATE users SET trial_ends_at = NOW() - INTERVAL '2 hours' WHERE email = '{email}'")
    code, corps = appel("GET", "/api/billing/status", None, jeton)
    st = corps.get("status") or {}
    verifier("trial_state = TRIAL_EXPIRED", st.get("trial_state") == "TRIAL_EXPIRED", str(st.get("trial_state")))
    verifier("lecture_seule = True", st.get("lecture_seule") is True, str(st.get("lecture_seule")))
    verifier("jours restants = 0", st.get("jours_restants") == 0, str(st.get("jours_restants")))

    print("\n4. les données restent lisibles (aucune perte)")
    code, corps = appel("GET", "/api/clients", None, jeton)
    liste = corps if isinstance(corps, list) else (corps.get("data") or corps.get("clients") or [])
    verifier("lecture des clients toujours possible -> 200", code == 200, f"HTTP {code}")
    verifier("le client créé est toujours là", any(c.get("id") == client_id for c in liste), f"{len(liste)} client(s)")
    verifier("le compte existe toujours", bool(psql(f"SELECT 1 FROM users WHERE email = '{email}'")))

    print("\n5. les écritures métier sont refusées")
    code, corps = appel("POST", "/api/clients", {"nom": "Refusé", "prenom": "Après", "email": "refuse@courtia.invalid"}, jeton)
    verifier("création refusée -> 402 trial_expired",
             code == 402 and corps.get("error") == "trial_expired", f"HTTP {code} {str(corps.get('error'))}")
    verifier("la réponse dit lecture seule", corps.get("lecture_seule") is True, str(corps.get("lecture_seule")))
    code, corps = appel("POST", "/api/taches", {"titre": "Après expiration", "echeance": "2026-09-30T09:00:00.000Z"}, jeton)
    verifier("création de tâche refusée -> 402", code == 402 and corps.get("error") == "trial_expired", f"HTTP {code}")
    verifier("aucun client n'a été créé pendant la période expirée",
             psql(f"SELECT COUNT(*) FROM clients WHERE email='refuse@courtia.invalid'") == "0")

    print("\n6. un abonnement actif rétablit les écritures")
    psql(f"UPDATE users SET subscription_status = 'active' WHERE email = '{email}'")
    code, corps = appel("GET", "/api/billing/status", None, jeton)
    st = corps.get("status") or {}
    verifier("trial_state = SUBSCRIPTION_ACTIVE", st.get("trial_state") == "SUBSCRIPTION_ACTIVE", str(st.get("trial_state")))
    verifier("plus de lecture seule", st.get("lecture_seule") is False, str(st.get("lecture_seule")))
    code, corps = appel("POST", "/api/clients", {"nom": "Réactivé", "prenom": "Après", "email": f"reactif.{H}@courtia.invalid"}, jeton)
    verifier("écriture de nouveau autorisée -> 201", code == 201, f"HTTP {code}")

    print("\n7. invitation administrateur : essai créé sans mot de passe transmis")
    promo = f"qa.admin.{H}@courtia.invalid"
    appel("POST", "/api/auth/register", {"email": promo, "password": "MotDePasseQA!2026",
                                        "firstName": "QA", "lastName": "ADMIN"})
    psql(f"UPDATE users SET role = 'super_admin' WHERE email = '{promo}'")
    code, corps = appel("POST", "/api/auth/login", {"email": promo, "password": "MotDePasseQA!2026"})
    jeton_admin = corps.get("token")
    verifier("compte administrateur QA connecté", bool(jeton_admin), f"HTTP {code}")

    if jeton_admin:
        email_invite = f"cabinet.qa.{H}@courtia.invalid"
        code, corps = appel("POST", "/api/admin/super/trials/invite", {
            "email": email_invite, "cabinet_name": "Cabinet QA Invité", "first_name": "Nadia", "last_name": "QA"}, jeton_admin)
        inv = corps.get("invitation") or {}
        verifier("invitation créée -> 201", code == 201, f"HTTP {code} {str(corps)[:120]}")
        verifier("durée d'essai = 7 jours", inv.get("duree_essai_jours") == 7, str(inv.get("duree_essai_jours")))
        verifier("aucun envoi d'email prétendu", inv.get("email_envoye") is False, str(inv.get("email_envoye")))
        verifier("lien d'activation fourni", str(inv.get("activation_url", "")).endswith("token=" + str(inv.get("activation_url", "")).split("token=")[-1]) and "token=" in str(inv.get("activation_url")), "lien présent")
        champs_interdits = [k for k in inv.keys() if "password" in k.lower() or "secret" in k.lower()]
        verifier("aucun mot de passe dans la réponse", champs_interdits == [], f"champs: {champs_interdits}")
        code2, corps2 = appel("POST", "/api/admin/super/trials/invite", {
            "email": email_invite, "cabinet_name": "Doublon"}, jeton_admin)
        verifier("doublon refusé -> 409 (pas de compte en double)", code2 == 409, f"HTTP {code2}")
        # le lien d'activation fonctionne réellement
        token = str(inv.get("activation_url", "")).split("token=")[-1]
        if token:
            code3, corps3 = appel("POST", "/api/auth/reset-password", {"token": token, "password": "NouveauMotDePasseQA!2026"})
            verifier("le lien d'activation définit le mot de passe -> 200", code3 == 200, f"HTTP {code3} {str(corps3)[:80]}")
            code4, corps4 = appel("POST", "/api/auth/login", {"email": email_invite, "password": "NouveauMotDePasseQA!2026"})
            verifier("le cabinet invité peut se connecter", code4 == 200 and bool(corps4.get("token")), f"HTTP {code4}")
        code5, corps5 = appel("GET", "/api/admin/super/trials", None, jeton_admin)
        essais = corps5.get("essais") or []
        ligne = next((e for e in essais if e.get("email") == email_invite), None)
        verifier("le suivi admin renvoie l'essai créé", code5 == 200 and ligne is not None, f"{len(essais)} essai(s)")
        if ligne:
            verifier("suivi : statut et jours réels",
                     ligne.get("trial_status") == "TRIAL_ACTIVE" and ligne.get("jours_restants") in (6, 7),
                     f"{ligne.get('trial_status')} / {ligne.get('jours_restants')} j")
            verifier("suivi : aucune valeur inventée (clients mesurés)",
                     ligne.get("clients_crees") == 0, f"clients_crees={ligne.get('clients_crees')}")

    print("\n=== BILAN ===")
    ok = sum(1 for _, c, _ in R if c)
    print(f"{ok}/{len(R)} contrôles au vert")
    for i, c, d in R:
        if not c:
            print(f"  ECHEC : {i} {d}")
    return 0 if ok == len(R) else 1


if __name__ == "__main__":
    sys.exit(main())
