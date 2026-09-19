#!/usr/bin/env python3
"""Parcours QA de bout en bout sur une base reconstruite à vide.

Ce que ce script prouve, dans l'ordre, contre un backend réellement démarré :
  1. inscription de deux cabinets distincts (201) ;
  2. connexion (200) et jeton exploitable ;
  3. route protégée sans jeton -> 401 ;
  4. création de données (client) dans chaque cabinet ;
  5. ISOLATION : A ne voit jamais les données de B, et réciproquement ;
  6. PERSISTANCE : après reconnexion, les données sont toujours là ;
  7. GET /api/status -> database "connected".

Le script ne fait aucune hypothèse sur l'environnement : il prend l'URL du
backend en argument (défaut http://127.0.0.1:4191) et crée des cabinets de test
aux adresses en `.invalid` (jamais de vraie adresse, jamais de vrai client).

Usage :
  python3 scripts/qa_parcours_client.py [base_url]

Aucun secret n'est affiché : les jetons restent en mémoire.
"""
import json
import sys
import time
import urllib.error
import urllib.request

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4191").rstrip("/")
HORODATAGE = int(time.time())
RESULTATS = []


def appel(methode, chemin, corps=None, jeton=None):
    donnees = json.dumps(corps).encode() if corps is not None else None
    requete = urllib.request.Request(BASE + chemin, data=donnees, method=methode)
    requete.add_header("Content-Type", "application/json")
    if jeton:
        requete.add_header("Authorization", "Bearer " + jeton)
    try:
        with urllib.request.urlopen(requete, timeout=30) as r:
            brut = r.read().decode()
            try:
                return r.status, json.loads(brut)
            except json.JSONDecodeError:
                return r.status, brut[:200]
    except urllib.error.HTTPError as e:
        brut = e.read().decode()
        try:
            return e.code, json.loads(brut)
        except json.JSONDecodeError:
            return e.code, brut[:200]
    except Exception as e:
        return 0, str(e)


def verifier(intitule, condition, detail=""):
    RESULTATS.append((intitule, bool(condition), detail))
    print(f"  [{'OK ' if condition else 'ECHEC'}] {intitule}" + (f" — {detail}" if detail else ""))
    return bool(condition)


def inscrire(etiquette):
    email = f"qa.{etiquette}.{HORODATAGE}@courtia.invalid"
    code, corps = appel("POST", "/api/auth/register", {
        "email": email, "password": "MotDePasseQA!2026",
        "firstName": "QA", "lastName": etiquette.upper(),
    })
    verifier(f"inscription {etiquette} -> 201", code == 201, f"HTTP {code}")
    if code != 201:
        print("     reponse :", corps)
        return None, None, None
    return email, corps.get("token"), corps.get("user", {}).get("id")


def connecter(etiquette, email):
    code, corps = appel("POST", "/api/auth/login", {"email": email, "password": "MotDePasseQA!2026"})
    verifier(f"connexion {etiquette} -> 200", code == 200, f"HTTP {code}")
    return corps.get("token") if code == 200 else None


def main():
    print(f"=== PARCOURS QA CONTRE {BASE} ===\n")
    print("0. état du service")
    code, statut = appel("GET", "/api/status")
    verifier("GET /api/status -> 200", code == 200, f"HTTP {code}")
    if isinstance(statut, dict):
        verifier("base de données connectée", statut.get("database") == "connected",
                 f"database={statut.get('database')}")

    print("\n1. inscription de deux cabinets")
    email_a, jeton_a, _ = inscrire("alpha")
    email_b, jeton_b, _ = inscrire("beta")
    if not (email_a and email_b):
        return 1

    print("\n2. route protégée sans jeton")
    code, _ = appel("GET", "/api/clients")
    verifier("GET /api/clients sans jeton -> 401", code == 401, f"HTTP {code}")

    print("\n3. reconnexion (le jeton doit être renouvelable)")
    jeton_a = connecter("alpha", email_a) or jeton_a
    jeton_b = connecter("beta", email_b) or jeton_b

    print("\n4. création de données dans chaque cabinet")
    nom_a = f"Cabinet Alpha {HORODATAGE}"
    nom_b = f"Cabinet Beta {HORODATAGE}"
    code, corps = appel("POST", "/api/clients", {"nom": nom_a, "prenom": "Client", "email": f"client.a.{HORODATAGE}@courtia.invalid"}, jeton_a)
    verifier("client créé dans le cabinet A -> 201", code == 201, f"HTTP {code}" + (f" {corps}" if code != 201 else ""))
    code, corps = appel("POST", "/api/clients", {"nom": nom_b, "prenom": "Client", "email": f"client.b.{HORODATAGE}@courtia.invalid"}, jeton_b)
    verifier("client créé dans le cabinet B -> 201", code == 201, f"HTTP {code}" + (f" {corps}" if code != 201 else ""))

    print("\n5. isolation entre cabinets")
    def noms(jeton):
        code, corps = appel("GET", "/api/clients", None, jeton)
        if code != 200 or not isinstance(corps, (list, dict)):
            return None, f"HTTP {code}"
        # l'API répond {data: [...]} ; on accepte aussi une liste nue ou {clients: [...]}
        if isinstance(corps, list):
            liste = corps
        elif isinstance(corps, dict):
            liste = corps.get("data") or corps.get("clients") or []
        else:
            liste = []
        return [c.get("nom") for c in liste if isinstance(c, dict)], None

    liste_a, err = noms(jeton_a)
    verifier("A voit ses données", liste_a is not None and nom_a in (liste_a or []), err or f"{len(liste_a or [])} client(s)")
    verifier("A ne voit JAMAIS les données de B", liste_a is not None and nom_b not in (liste_a or []))
    liste_b, err = noms(jeton_b)
    verifier("B voit ses données", liste_b is not None and nom_b in (liste_b or []), err or f"{len(liste_b or [])} client(s)")
    verifier("B ne voit JAMAIS les données de A", liste_b is not None and nom_a not in (liste_b or []))

    print("\n6. persistance après reconnexion")
    jeton_a2 = connecter("alpha (2e session)", email_a)
    liste_a2, _ = noms(jeton_a2 or jeton_a)
    verifier("les données de A survivent à une reconnexion",
             bool(liste_a2) and nom_a in liste_a2)

    print("\n=== BILAN ===")
    ok = sum(1 for _, c, _ in RESULTATS if c)
    print(f"{ok}/{len(RESULTATS)} contrôles au vert")
    for intitule, condition, detail in RESULTATS:
        if not condition:
            print(f"  ECHEC : {intitule} {detail}")
    return 0 if ok == len(RESULTATS) else 1


if __name__ == "__main__":
    sys.exit(main())
