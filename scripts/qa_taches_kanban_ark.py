#!/usr/bin/env python3
"""Recette QA — tâches, pipeline (kanban) et bulle ARK.

Usage : python3 qa_taches_kanban_ark.py [base]

Couvre les régressions mesurées le 20/09/2026 :
  - création de tâche impossible (organizer_id NOT NULL) ;
  - tâche sans client créée mais invisible (JOIN interne sur clients) ;
  - toute mise à jour/suppression d'une tâche sans client renvoyait 404 ;
  - pipeline verrouillé pour tout le monde (feature 'kanban' absente des plans).
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


def inscrire(suffixe):
    email = f"qa.taches.{suffixe}.{H}@courtia.invalid"
    code, corps = appel("POST", "/api/auth/register", {
        "email": email, "password": "MotDePasseQA!2026", "firstName": "QA", "lastName": suffixe.upper()})
    return email, corps.get("token")


def main():
    print(f"=== QA TÂCHES / PIPELINE / ARK CONTRE {BASE} ===\n")
    email_a, jeton_a = inscrire("a")
    email_b, jeton_b = inscrire("b")
    if not (jeton_a and jeton_b):
        print("inscription impossible, arrêt")
        return 1
    code, corps = appel("POST", "/api/clients", {"nom": "Client Tâches A", "prenom": "Sacha",
                                                "email": f"client.taches.{H}@courtia.invalid"}, jeton_a)
    client_id = ((corps.get("client") or corps.get("data") or corps) or {}).get("id")
    print(f"cabinet A : client id={client_id}\n")

    print("1. tâche rattachée à un client")
    echeance = "2026-09-25T09:00:00.000Z"
    code, tache = appel("POST", "/api/taches", {
        "titre": "Rappeler le client pour l'avenant QA",
        "description": "Recette ARK 20/09/2026", "client_id": client_id,
        "echeance": echeance, "statut": "a_faire"}, jeton_a)
    tache_id = (tache or {}).get("id")
    verifier("création de tâche -> 201 (organizer_id non bloquant)", code == 201 and bool(tache_id),
             f"HTTP {code} id={tache_id}")

    print("\n2. tâche SANS client : créée ET visible (régression du JOIN interne)")
    code, sans_client = appel("POST", "/api/taches", {
        "titre": "Tâche sans client QA", "echeance": echeance, "statut": "a_faire"}, jeton_a)
    id_sans_client = (sans_client or {}).get("id")
    verifier("création sans client -> 201", code == 201 and bool(id_sans_client), f"HTTP {code} id={id_sans_client}")
    code, liste = appel("GET", "/api/taches", None, jeton_a)
    taches = liste if isinstance(liste, list) else (liste.get("data") or [])
    verifier("la tâche sans client apparaît dans la liste",
             any(t.get("id") == id_sans_client for t in taches), f"{len(taches)} tâche(s)")

    print("\n3. validations explicites (jamais un 500 de base)")
    code, corps = appel("POST", "/api/taches", {"titre": "Sans échéance"}, jeton_a)
    verifier("échéance absente -> 400 explicite", code == 400 and 'échéance' in str(corps.get('message', '')),
             f"HTTP {code} {str(corps.get('message'))[:70]}")
    code, corps = appel("POST", "/api/taches", {"echeance": echeance}, jeton_a)
    verifier("titre absent -> 400 explicite", code == 400, f"HTTP {code} {str(corps.get('message'))[:70]}")

    print("\n4. mettre à jour / terminer / supprimer, y compris sans client")
    code, corps = appel("PUT", f"/api/taches/{id_sans_client}", {"statut": "terminee"}, jeton_a)
    verifier("cocher une tâche sans client -> 200 (avant : 404)", code == 200, f"HTTP {code}")
    verifier("la mise à jour partielle garde le titre",
             (corps or {}).get("title") == "Tâche sans client QA", f"title={str((corps or {}).get('title'))[:40]}")
    code, corps = appel("PUT", f"/api/taches/{int(tache_id) if tache_id else 0}", {"statut": "terminee"}, jeton_a)
    verifier("cocher une tâche avec client -> 200", code == 200, f"HTTP {code}")

    print("\n5. isolation entre cabinets")
    code, _ = appel("PUT", f"/api/taches/{tache_id}", {"statut": "a_faire"}, jeton_b)
    verifier("un autre cabinet ne peut pas modifier la tâche -> 404", code == 404, f"HTTP {code}")
    code, _ = appel("DELETE", f"/api/taches/{tache_id}", None, jeton_b)
    verifier("un autre cabinet ne peut pas la supprimer -> 404", code == 404, f"HTTP {code}")
    code, _ = appel("POST", "/api/taches", {"titre": "intrusion", "client_id": client_id, "echeance": echeance}, jeton_b)
    verifier("rattacher le client d'un autre cabinet -> 403", code == 403, f"HTTP {code}")

    print("\n6. suppression réelle")
    code, corps = appel("DELETE", f"/api/taches/{tache_id}", None, jeton_a)
    verifier("suppression -> success", code == 200 and (corps or {}).get("success") is True, f"HTTP {code} {str(corps)[:60]}")
    code, liste = appel("GET", "/api/taches", None, jeton_a)
    taches = liste if isinstance(liste, list) else (liste.get("data") or [])
    verifier("la tâche supprimée n'est plus dans la liste", not any(t.get("id") == tache_id for t in taches),
             f"{len(taches)} tâche(s)")
    code, _ = appel("DELETE", f"/api/taches/{tache_id}", None, jeton_a)
    verifier("supprimer deux fois -> 404 (pas de faux succès)", code == 404, f"HTTP {code}")

    print("\n7. pipeline (kanban)")
    code, plateau = appel("GET", "/api/kanban", None, jeton_a)
    verifier("pipeline accessible à un compte en essai -> 200", code == 200, f"HTTP {code}")
    verifier("sans jeton, le pipeline reste fermé -> 401", appel("GET", "/api/kanban", None, None)[0] == 401)

    print("\n8. bulle ARK — contrat de réponse")
    verifier("ARK sans jeton -> 401", appel("POST", "/api/ark/chat", {"message": "Bonjour ARK"}, None)[0] == 401)
    code, corps = appel("POST", "/api/ark/chat", {"message": "Bonjour ARK"}, jeton_a)
    if code == 200:
        verifier("réponse ARK au format {reply}", isinstance(corps.get("reply"), str) and corps["reply"].strip() != "",
                 f"reply={str(corps.get('reply'))[:60]}")
    else:
        verifier("sans fournisseur IA : 503 explicite, aucune réponse inventée",
                 code == 503 and corps.get("error") == "configuration_required", f"HTTP {code}")
        verifier("aucun champ 'reply' fabriqué", not corps.get("reply"), f"reply={corps.get('reply')!r}")

    print("\n=== BILAN ===")
    ok = sum(1 for _, c, _ in R if c)
    print(f"{ok}/{len(R)} contrôles au vert")
    for i, c, d in R:
        if not c:
            print(f"  ECHEC : {i} {d}")
    return 0 if ok == len(R) else 1


if __name__ == "__main__":
    sys.exit(main())
