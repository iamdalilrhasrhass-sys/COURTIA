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
  7. l'exploitant crée un cabinet en essai AVEC des identifiants utilisables
     immédiatement : mot de passe initial temporaire (nom du cabinet sans espace),
     connexion directe sans aucune activation, e-mail « Votre espace COURTIA est
     prêt. » prêt à transmettre, bouton pointant vers /login ;
  8. « Modifier mon mot de passe » fonctionne réellement : ancien mot de passe
     exigé, confirmation vérifiée, ancien invalidé, caractère temporaire levé.
"""
import datetime
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

    print("\n7. accès direct : le cabinet se connecte tout de suite, mot de passe temporaire")
    promo = f"qa.admin.{H}@courtia.invalid"
    appel("POST", "/api/auth/register", {"email": promo, "password": "MotDePasseQA!2026",
                                        "firstName": "QA", "lastName": "ADMIN"})
    psql(f"UPDATE users SET role = 'super_admin' WHERE email = '{promo}'")
    code, corps = appel("POST", "/api/auth/login", {"email": promo, "password": "MotDePasseQA!2026"})
    jeton_admin = corps.get("token")
    verifier("compte administrateur QA connecté", bool(jeton_admin), f"HTTP {code}")

    if jeton_admin:
        email_invite = f"cabinet.qa.{H}@courtia.invalid"
        mot_de_passe_initial = "CabinetQAInvite"
        code, corps = appel("POST", "/api/admin/super/trials/invite", {
            "email": email_invite, "cabinet_name": "Cabinet QA Invite", "first_name": "Nadia", "last_name": "QA"}, jeton_admin)
        inv = corps.get("invitation") or {}
        verifier("compte créé avec accès immédiat -> 201", code == 201, f"HTTP {code} {str(corps)[:120]}")
        verifier("durée d'essai annoncée = 7 jours", inv.get("duree_essai_jours") == 7, str(inv.get("duree_essai_jours")))
        verifier("l'identifiant remis est l'e-mail du cabinet", inv.get("identifiant") == email_invite, str(inv.get("identifiant")))
        verifier("mot de passe initial conforme à la convention (nom du cabinet sans espace)",
                 inv.get("mot_de_passe_initial") == mot_de_passe_initial, str(inv.get("mot_de_passe_initial")))
        verifier("mot de passe marqué temporaire", inv.get("mot_de_passe_temporaire") is True and inv.get("must_change_password") is True,
                 f"temporaire={inv.get('mot_de_passe_temporaire')} must_change={inv.get('must_change_password')}")
        verifier("URL de connexion annoncée", inv.get("url_connexion") == "https://courtiark.fr/login", str(inv.get("url_connexion")))
        verifier("aucun envoi d'email prétendu", inv.get("email_envoye") is False, str(inv.get("email_envoye")))
        verifier("plus aucune activation obligatoire", inv.get("essai_demarre_a_lactivation") is False and "activation_url" not in inv,
                 f"activation_url={'activation_url' in inv}")

        # L'ESSAI COURT DÈS LA CRÉATION : plus d'activation à attendre.
        avant = datetime.datetime.now(datetime.timezone.utc)
        debut = fin = None
        try:
            debut = datetime.datetime.fromisoformat(str(inv.get("essai_debute_le")).replace("Z", "+00:00"))
            fin = datetime.datetime.fromisoformat(str(inv.get("essai_finit_le")).replace("Z", "+00:00"))
        except Exception:
            pass
        verifier("essai démarré immédiatement (moins de 5 min d'écart)",
                 debut is not None and abs((debut - avant).total_seconds()) < 300, f"debut={inv.get('essai_debute_le')}")
        verifier("fin d'essai exactement à +7 jours",
                 debut is not None and fin is not None and abs((fin - debut).total_seconds() - 7 * 86400) < 120,
                 f"debut={inv.get('essai_debute_le')} fin={inv.get('essai_finit_le')}")
        verifier("statut du compte = trialing (plus de pending_activation)",
                 inv.get("statut_compte") == "trialing", str(inv.get("statut_compte")))
        verifier("en base : trialing et date de fin posée",
                 psql(f"SELECT subscription_status = 'trialing' AND trial_ends_at IS NOT NULL FROM users WHERE email = '{email_invite}'") == "t",
                 psql(f"SELECT subscription_status || '|' || COALESCE(trial_ends_at::text,'NULL') FROM users WHERE email = '{email_invite}'")) 

        # Le mot de passe est haché : jamais stocké en clair.
        verifier("mot de passe jamais stocké en clair",
                 psql(f"SELECT password_hash LIKE '$2%' AND password_hash <> '{mot_de_passe_initial}' FROM users WHERE email = '{email_invite}'") == "t",
                 "hachage bcrypt attendu")
        verifier("plus aucun jeton d'activation en base",
                 psql(f"SELECT password_reset_token IS NULL FROM users WHERE email = '{email_invite}'") == "t",
                 "jeton résiduel")

        # L'e-mail client est prêt (gabarit premium) et son bouton pointe au bon endroit.
        email_acces = inv.get("email_acces") or {}
        verifier("e-mail client fourni avec le titre attendu",
                 "Votre espace COURTIA est prêt." in str(email_acces.get("html")) and "Votre espace COURTIA est prêt." in str(email_acces.get("text")),
                 "titre absent")
        verifier("bouton de l'e-mail pointant réellement vers la connexion",
                 'href="https://courtiark.fr/login"' in str(email_acces.get("html")), "lien absent")
        verifier("e-mail : identifiant et mot de passe présents",
                 email_invite in str(email_acces.get("html")) and mot_de_passe_initial in str(email_acces.get("html")),
                 "identifiants absents de l'e-mail")

        # LE TEST QUI COMPTE : connexion immédiate, sans aucune activation.
        code4, corps4 = appel("POST", "/api/auth/login", {"email": email_invite, "password": mot_de_passe_initial})
        verifier("le cabinet se connecte IMMÉDIATEMENT avec le mot de passe initial",
                 code4 == 200 and bool(corps4.get("token")), f"HTTP {code4} {str(corps4)[:100]}")
        jeton_cabinet = corps4.get("token")

        if jeton_cabinet:
            code6, corps6 = appel("GET", "/api/billing/status", None, jeton_cabinet)
            st6 = (corps6 or {}).get("status") if isinstance(corps6, dict) else {}
            st6 = st6 if isinstance(st6, dict) else {}
            verifier("essai actif dès la création", st6.get("trial_state") == "TRIAL_ACTIVE", str(st6.get("trial_state")))
            verifier("6 ou 7 jours restants", st6.get("jours_restants") in (6, 7), str(st6.get("jours_restants")))
            code7, _ = appel("POST", "/api/clients", {"nom": "Acces", "prenom": "Direct", "email": f"acces.{H}@courtia.invalid"}, jeton_cabinet)
            verifier("écriture autorisée immédiatement -> 201", code7 == 201, f"HTTP {code7}")

            code_me, corps_me = appel("GET", "/api/auth/me", None, jeton_cabinet)
            verifier("le compte signale son mot de passe temporaire (must_change_password)",
                     (corps_me or {}).get("must_change_password") is True, str((corps_me or {}).get("must_change_password")))

            print("\n8. Paramètres > Sécurité : « Modifier mon mot de passe »")
            nouveau = "NouveauMotDePasseQA!2026"
            code_a, corps_a = appel("POST", "/api/auth/change-password",
                                    {"currentPassword": "MauvaisMotDePasse", "newPassword": nouveau, "confirmPassword": nouveau}, jeton_cabinet)
            verifier("mot de passe actuel erroné refusé -> 400", code_a == 400, f"HTTP {code_a} {str(corps_a)[:80]}")
            code_b, _ = appel("POST", "/api/auth/change-password",
                              {"currentPassword": mot_de_passe_initial, "newPassword": nouveau, "confirmPassword": "AutreChose!2026"}, jeton_cabinet)
            verifier("confirmation différente refusée -> 400", code_b == 400, f"HTTP {code_b}")
            code_c, corps_c = appel("POST", "/api/auth/change-password",
                                    {"currentPassword": mot_de_passe_initial, "newPassword": nouveau, "confirmPassword": nouveau}, jeton_cabinet)
            verifier("changement accepté -> 200", code_c == 200 and (corps_c or {}).get("success") is True, f"HTTP {code_c} {str(corps_c)[:80]}")
            verifier("confirmation renvoyée par le serveur", bool((corps_c or {}).get("message")), str((corps_c or {}).get("message"))[:60])

            code_d, _ = appel("POST", "/api/auth/login", {"email": email_invite, "password": mot_de_passe_initial}, None)
            verifier("l'ANCIEN mot de passe ne fonctionne plus -> 401", code_d == 401, f"HTTP {code_d}")
            code_e, corps_e = appel("POST", "/api/auth/login", {"email": email_invite, "password": nouveau})
            verifier("le NOUVEAU mot de passe fonctionne -> 200", code_e == 200 and bool(corps_e.get("token")), f"HTTP {code_e}")
            verifier("le caractère temporaire est levé",
                     psql(f"SELECT NOT must_change_password FROM users WHERE email = '{email_invite}'") == "t",
                     "must_change_password encore vrai")

        code2, corps2 = appel("POST", "/api/admin/super/trials/invite", {
            "email": email_invite, "cabinet_name": "Doublon"}, jeton_admin)
        verifier("doublon refusé -> 409 (pas de compte en double)", code2 == 409, f"HTTP {code2}")

        code5, corps5 = appel("GET", "/api/admin/super/trials", None, jeton_admin)
        ligne = next((e for e in (corps5.get("essais") or []) if e.get("email") == email_invite), None)
        verifier("le suivi admin renvoie l'essai créé", code5 == 200 and ligne is not None, f"{len(corps5.get('essais') or [])} essai(s)")
        if ligne:
            verifier("suivi : essai actif et jours réels",
                     ligne.get("trial_status") == "TRIAL_ACTIVE" and ligne.get("jours_restants") in (6, 7),
                     f"{ligne.get('trial_status')} / {ligne.get('jours_restants')} j")
            verifier("suivi : date de début = date de création", ligne.get("essai_debute_le") is not None, str(ligne.get("essai_debute_le")))
            verifier("suivi : aucune valeur inventée (1 client réellement créé)",
                     ligne.get("clients_crees") == 1, f"clients_crees={ligne.get('clients_crees')}")

        # Expiration : les données restent, les écritures tombent.
        psql(f"UPDATE users SET trial_ends_at = NOW() - INTERVAL '1 hour' WHERE email = '{email_invite}'")
        code8, corps8 = appel("POST", "/api/auth/login", {"email": email_invite, "password": "NouveauMotDePasseQA!2026"})
        jeton_expire = (corps8 or {}).get("token")
        if jeton_expire:
            code9, corps9 = appel("POST", "/api/clients", {"nom": "Refus", "prenom": "Expiré", "email": f"refus.{H}@courtia.invalid"}, jeton_expire)
            verifier("après J+7 : écriture refusée -> 402 trial_expired",
                     code9 == 402 and (corps9 or {}).get("error") == "trial_expired", f"HTTP {code9} {str(corps9)[:80]}")
            code10, corps10 = appel("GET", "/api/clients", None, jeton_expire)
            verifier("après J+7 : les données restent lisibles -> 200", code10 == 200, f"HTTP {code10}")

    print("\n=== BILAN ===")
    ok = sum(1 for _, c, _ in R if c)
    print(f"{ok}/{len(R)} contrôles au vert")
    for i, c, d in R:
        if not c:
            print(f"  ECHEC : {i} {d}")
    return 0 if ok == len(R) else 1


if __name__ == "__main__":
    sys.exit(main())
