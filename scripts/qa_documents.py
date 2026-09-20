#!/usr/bin/env python3
"""Recette QA — documents : upload courtier, refus de type, refus de taille,
lien public de dépôt, lecture et persistance après reconnexion.

Usage : python3 qa_documents.py [base]   (défaut http://127.0.0.1:4193)
Aucune donnée personnelle réelle : domaine .invalid, fichiers de test locaux.
"""
import json
import sys
import time
import urllib.error
import urllib.request
import uuid

BASE = (sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:4193").rstrip("/")
H = int(time.time())
R = []


def appel(methode, chemin, corps=None, jeton=None, brut=None, entetes=None):
    donnees = brut if brut is not None else (json.dumps(corps).encode() if corps is not None else None)
    req = urllib.request.Request(BASE + chemin, data=donnees, method=methode)
    if brut is None:
        req.add_header("Content-Type", "application/json")
    for cle, valeur in (entetes or {}).items():
        req.add_header(cle, valeur)
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


def multipart(nom_fichier, contenu, mime, champs=None):
    frontiere = "----qa" + uuid.uuid4().hex
    morceaux = []
    for cle, valeur in (champs or {}).items():
        morceaux.append(
            f"--{frontiere}\r\nContent-Disposition: form-data; name=\"{cle}\"\r\n\r\n{valeur}\r\n".encode()
        )
    morceaux.append(
        f"--{frontiere}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{nom_fichier}\"\r\n"
        f"Content-Type: {mime}\r\n\r\n".encode() + contenu + b"\r\n"
    )
    morceaux.append(f"--{frontiere}--\r\n".encode())
    return b"".join(morceaux), f"multipart/form-data; boundary={frontiere}"


def verifier(intitule, condition, detail=""):
    R.append((intitule, bool(condition), detail))
    print(f"  [{'OK ' if condition else 'ECHEC'}] {intitule}" + (f" — {detail}" if detail else ""))


def inscrire():
    email = f"qa.documents.{H}@courtia.invalid"
    code, corps = appel("POST", "/api/auth/register", {
        "email": email, "password": "MotDePasseQA!2026", "firstName": "QA", "lastName": "DOCUMENTS"})
    return (email, corps.get("token")) if code == 201 else (None, None)


PDF = b"%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n"


def main():
    print(f"=== QA DOCUMENTS CONTRE {BASE} ===\n")
    email, jeton = inscrire()
    if not jeton:
        print("inscription impossible, arrêt")
        return 1

    print("1. client de test")
    code, corps = appel("POST", "/api/clients", {"nom": "Client QA Documents", "prenom": "Camille", "email": "client.qa@courtia.invalid"}, jeton)
    client_id = (corps.get("client") or corps.get("data") or corps).get("id")
    verifier("client créé", code in (200, 201) and client_id, f"HTTP {code} id={client_id}")
    if not client_id:
        return 1

    print("\n1bis. payload incomplet refusé proprement (pas d'erreur SQL)")
    code, corps = appel("POST", "/api/clients", {"nom": "SansPrenom", "email": "incomplet.qa@courtia.invalid"}, jeton)
    verifier("client sans prénom -> 400 explicite", code == 400, f"HTTP {code} {str(corps.get('message'))[:80]}")

    print("\n2. upload autorisé (PDF)")
    corps_mp, type_mp = multipart("piece-qa.pdf", PDF, "application/pdf", {"client_id": client_id, "category": "devis"})
    code, corps = appel("POST", "/api/document-inbox/upload", jeton=jeton, brut=corps_mp, entetes={"Content-Type": type_mp})
    doc_id = ((corps.get("data") or {}) or {}).get("id")
    verifier("upload PDF -> 201", code == 201, f"HTTP {code} {str(corps)[:120]}")
    verifier("document identifié", bool(doc_id), f"id={doc_id}")

    print("\n3. upload interdit (exécutable)")
    corps_mp, type_mp = multipart("malveillant.exe", b"MZ\x90\x00", "application/x-msdownload", {"client_id": client_id})
    code, corps = appel("POST", "/api/document-inbox/upload", jeton=jeton, brut=corps_mp, entetes={"Content-Type": type_mp})
    verifier("type interdit refusé", code >= 400, f"HTTP {code} {str(corps.get('message') or corps.get('error'))[:90]}")

    print("\n4. upload trop volumineux (21 Mo > 20 Mo)")
    corps_mp, type_mp = multipart("enorme.pdf", PDF + b"0" * (21 * 1024 * 1024), "application/pdf", {"client_id": client_id})
    code, corps = appel("POST", "/api/document-inbox/upload", jeton=jeton, brut=corps_mp, entetes={"Content-Type": type_mp})
    verifier("taille excessive refusée", code >= 400, f"HTTP {code} {str(corps.get('message') or corps.get('error'))[:90]}")

    print("\n5. upload sans jeton")
    corps_mp, type_mp = multipart("sans-jeton.pdf", PDF, "application/pdf", {"client_id": client_id})
    code, _ = appel("POST", "/api/document-inbox/upload", brut=corps_mp, entetes={"Content-Type": type_mp})
    verifier("upload sans jeton refusé (401)", code == 401, f"HTTP {code}")

    print("\n6. lecture et persistance côté cabinet")
    code, corps = appel("GET", f"/api/document-inbox/client/{client_id}", jeton=jeton)
    docs = (corps.get("data") or [])
    verifier("le document est relu", code == 200 and any(d.get("id") == doc_id for d in docs), f"{len(docs)} document(s)")
    code2, corps2 = appel("POST", "/api/auth/login", {"email": email, "password": "MotDePasseQA!2026"})
    jeton2 = corps2.get("token")
    code3, corps3 = appel("GET", f"/api/document-inbox/client/{client_id}", jeton=jeton2) if jeton2 else (0, {})
    verifier("persistance après reconnexion",
             any(d.get("id") == doc_id for d in (corps3.get("data") or [])),
             f"lecture HTTP {code3}")

    print("\n7. lien public de dépôt de pièces")
    code, corps = appel("POST", "/api/document-inbox/request", {
        "client_id": client_id,
        "required_docs": [{"type": "carte_grise", "label": "Carte grise"}],
        "message": "Merci de déposer la carte grise (test QA)",
        "recipient_email": "client.qa@courtia.invalid",
    }, jeton)
    jeton_lien = ((corps.get("data") or {}) or {}).get("token") or ((corps.get("data") or {}) or {}).get("public_token")
    verifier("demande de pièces créée", code == 201 and bool(jeton_lien), f"HTTP {code} lien={'oui' if jeton_lien else 'non'}")
    if jeton_lien:
        code, corps = appel("GET", f"/api/document-inbox/public/request/{jeton_lien}")
        verifier("le lien public s'ouvre", code == 200, f"HTTP {code}")
        corps_mp, type_mp = multipart("carte-grise-qa.pdf", PDF, "application/pdf", {})
        code, corps = appel("POST", f"/api/document-inbox/public/upload/{jeton_lien}", brut=corps_mp,
                            entetes={"Content-Type": type_mp})
        verifier("dépôt public accepté", code in (200, 201), f"HTTP {code} {str(corps)[:120]}")
        code, corps = appel("GET", f"/api/document-inbox/client/{client_id}", jeton=jeton)
        depot = [d for d in (corps.get("data") or [])]
        verifier("le dépôt est visible dans le cabinet", len(depot) >= 2, f"{len(depot)} document(s)")
    else:
        verifier("lien public obtenu", False, "aucun jeton renvoyé par /request")

    print("\n=== BILAN ===")
    ok = sum(1 for _, c, _ in R if c)
    print(f"{ok}/{len(R)} contrôles au vert")
    for i, c, d in R:
        if not c:
            print(f"  ECHEC : {i} {d}")
    return 0 if ok == len(R) else 1


if __name__ == "__main__":
    sys.exit(main())
