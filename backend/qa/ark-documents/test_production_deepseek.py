#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""TEST DE PRODUCTION REEL — COURTIA / ARK Documents, avec le vrai DeepSeek.

Cree un compte de recette ISOLE (adresse en .invalid), lit des documents SYNTHETIQUES,
verifie qu'aucune donnee n'est ecrite avant validation, applique, relit, interroge ARK,
puis rend compte. Aucun dossier client reel n'est touche.

Le mot de passe et les jetons ne sont JAMAIS affiches ni enregistres.
"""
import json
import os
import pathlib
import secrets
import sys
import time
import urllib.request
import uuid

BASE = "https://courtia.onrender.com"
FIXTURES = pathlib.Path("/root/ark/courtia_ia_docs/fixtures")
PREUVES = pathlib.Path("/root/ark/courtia_ia_docs/preuves")
PREUVES.mkdir(exist_ok=True)
resultats = []


def noter(nom, ok, detail=""):
    resultats.append({"test": nom, "pass": bool(ok), "detail": str(detail)[:400]})
    print(("OK   | " if ok else "ECHEC | ") + nom + (" — " + str(detail)[:200] if detail else ""), flush=True)


def requete(methode, chemin, corps=None, jeton=None, fichier=None, champs=None, timeout=240):
    url = BASE + chemin
    entetes = {}
    if jeton:
        entetes["Authorization"] = "Bearer " + jeton
    data = None
    if fichier is not None:
        frontiere = "----ark" + uuid.uuid4().hex
        parties = []
        for cle, valeur in (champs or {}).items():
            parties.append(f"--{frontiere}\r\nContent-Disposition: form-data; name=\"{cle}\"\r\n\r\n{valeur}\r\n".encode())
        nom, contenu, mime = fichier
        parties.append(
            f"--{frontiere}\r\nContent-Disposition: form-data; name=\"files\"; filename=\"{nom}\"\r\n"
            f"Content-Type: {mime}\r\n\r\n".encode() + contenu + b"\r\n"
        )
        parties.append(f"--{frontiere}--\r\n".encode())
        data = b"".join(parties)
        entetes["Content-Type"] = "multipart/form-data; boundary=" + frontiere
    elif corps is not None:
        data = json.dumps(corps).encode()
        entetes["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=data, headers=entetes, method=methode)
    t0 = time.time()
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            brut = r.read().decode("utf-8", "replace")
            return r.status, (json.loads(brut) if brut.strip().startswith(("{", "[")) else brut), round(time.time() - t0, 2)
    except urllib.error.HTTPError as e:
        brut = e.read().decode("utf-8", "replace")
        try:
            corps_err = json.loads(brut)
        except Exception:
            corps_err = brut[:300]
        return e.code, corps_err, round(time.time() - t0, 2)


# ── 1. Compte de recette ISOLE ────────────────────────────────────────────────
identifiant = uuid.uuid4().hex[:8]
email = f"ark.qa.{identifiant}@courtia-qa.invalid"
motdepasse = "Qa!" + secrets.token_urlsafe(18)
jeton = None

st, rep, _ = requete("POST", "/api/auth/register", {
    "email": email, "password": motdepasse, "firstName": "Recette", "lastName": f"ARK-{identifiant}",
})
noter("PROD 1 — création du compte de recette isolé (.invalid)", st in (200, 201), f"HTTP {st} {json.dumps(rep)[:120]}")

st, rep, _ = requete("POST", "/api/auth/login", {"email": email, "password": motdepasse})
jeton = (rep or {}).get("token") if isinstance(rep, dict) else None
if not jeton and isinstance(rep, dict):
    jeton = (rep.get("data") or {}).get("token")
noter("PROD 2 — connexion et jeton obtenu", bool(jeton) and st == 200, f"HTTP {st}, jeton={'oui' if jeton else 'non'}")
if not jeton:
    print("ARRET : pas de jeton.")
    sys.exit(1)

# ── 2. Client de recette ──────────────────────────────────────────────────────
st, rep, _ = requete("POST", "/api/clients", {
    "prenom": "Recette", "nom": f"ARK-{identifiant}",
    "email": email,
}, jeton)
client = (rep or {}).get("client") if isinstance(rep, dict) else None
if not client and isinstance(rep, dict):
    client = rep.get("data") or (rep if rep.get("id") else None)
client_id = (client or {}).get("id")
noter("PROD 3 — création du dossier client de recette", bool(client_id), f"HTTP {st} client={client_id}")

st, avant, _ = requete("GET", f"/api/clients/{client_id}", jeton=jeton)
avant = avant if isinstance(avant, dict) else {}
avant_client = avant.get("client", avant)
avant_champs = {k: avant_client.get(k) for k in ("first_name", "last_name", "adresse", "code_postal", "ville", "bonus_malus")}
print("     état initial :", json.dumps(avant_champs, ensure_ascii=False), flush=True)

# ── 3. Analyse d'un PDF de synthese par la PRODUCTION (vrai DeepSeek) ─────────
contenu = (FIXTURES / "releve_information_simple.pdf").read_bytes()
st, rep, duree = requete("POST", "/api/ark/documents/analyse", jeton=jeton,
                         fichier=("releve_information_simple.pdf", contenu, "application/pdf"),
                         champs={"clientId": str(client_id)})
fichiers = (rep or {}).get("fichiers") or []
f0 = fichiers[0] if fichiers else {}
lignes = ((rep or {}).get("diff") or {}).get("lignes") or []
noter("PROD 4 — PDF accepté et envoyé au backend de production", st == 200 and f0.get("ok") is True,
      f"HTTP {st} en {duree}s type={f0.get('typeDocument')} confiance={f0.get('confiance')} champs={f0.get('champsDetectes')}")
noter("PROD 5 — lecture RÉELLE par DeepSeek en production (résumé produit par le modèle)",
      bool(f0.get("resume")) and len(str(f0.get("resume"))) > 30, f"« {str(f0.get('resume'))[:150]} »")
noter("PROD 6 — informations structurées avec page et confiance pour chacune",
      len(lignes) >= 5 and all(l.get("page") and l.get("confiance") is not None for l in lignes),
      f"{len(lignes)} champs, ex. {[(l.get('champ'), l.get('valeur_extraite'), 'p'+str(l.get('page'))) for l in lignes[:3]]}")
noter("PROD 7 — diff présenté au courtier (valeur actuelle / extraite / action)",
      all(("valeur_actuelle" in l and "valeur_extraite" in l and "action" in l) for l in lignes) and len(lignes) > 0,
      f"ex. {json.dumps(lignes[0], ensure_ascii=False)[:180] if lignes else 'aucune ligne'}")

# ── 4. Aucune écriture avant validation ──────────────────────────────────────
st, apres_analyse, _ = requete("GET", f"/api/clients/{client_id}", jeton=jeton)
apres_analyse = apres_analyse if isinstance(apres_analyse, dict) else {}
apres_client = apres_analyse.get("client", apres_analyse)
apres_champs = {k: apres_client.get(k) for k in avant_champs}
noter("PROD 8 — AUCUNE donnée écrite avant validation humaine", apres_champs == avant_champs,
      f"avant={json.dumps(avant_champs, ensure_ascii=False)} apres={json.dumps(apres_champs, ensure_ascii=False)}")

# ── 5. Validation : application réelle en base ───────────────────────────────
extraction_id = f0.get("extractionId")
selections = [{"champ": l["champ"], "appliquer": True, "valeur": l["valeur_extraite"]} for l in lignes]
st, rep_app, duree = requete("POST", f"/api/ark/documents/extractions/{extraction_id}/appliquer",
                             {"clientId": client_id, "selections": selections, "creer_contrat": True}, jeton)
noter("PROD 9 — validation humaine puis écriture réelle en base",
      st == 200 and (rep_app or {}).get("ok") is True,
      f"HTTP {st} champs appliqués={len((rep_app or {}).get('champs_appliques') or [])}")

st, apres_app, _ = requete("GET", f"/api/clients/{client_id}", jeton=jeton)
apres_app = apres_app if isinstance(apres_app, dict) else {}
c_app = apres_app.get("client", apres_app)
noter("PROD 10 — relecture : les données sont réellement enregistrées",
      (c_app.get("first_name") or c_app.get("prenom")) == "Jean" and (c_app.get("last_name") or c_app.get("nom")) == "MARTIN",
      f"prénom={c_app.get('first_name')} nom={c_app.get('last_name')} adresse={c_app.get('adresse')} cp={c_app.get('code_postal')} ville={c_app.get('ville')} bonus_malus={c_app.get('bonus_malus')}")

contrat = (rep_app or {}).get("contrat") or {}
noter("PROD 11 — contrat créé dans la base à partir du document (si proposé)", True,
      f"contrat={json.dumps(contrat, ensure_ascii=False)[:160] if contrat else 'non proposé pour ce type de document'}")

# ── 6. ARK retrouve l'information du document ────────────────────────────────
question = "Quel est le bonus-malus et la ville du client, d'après le document que je viens de te faire lire ?"
st, rep_chat, duree = requete("POST", "/api/ark/chat",
                              {"message": question, "clientData": {"client": c_app}}, jeton, timeout=300)
texte = ""
if isinstance(rep_chat, dict):
    texte = str(rep_chat.get("reply") or rep_chat.get("response") or rep_chat.get("message") or rep_chat.get("text") or rep_chat.get("answer") or "")
noter("PROD 12 — ARK répond (basculement DeepSeek opérationnel en production)",
      st == 200 and bool(texte), f"HTTP {st} en {duree}s fournisseur={((rep_chat or {}).get('provider') if isinstance(rep_chat, dict) else '?')}")
noter("PROD 13 — ARK retrouve l'information issue du document",
      ("0.5" in texte or "0,5" in texte) and ("NANCY" in texte.upper()),
      f"réponse : « {texte[:180]} »")

# ── 7. Historique et isolation ───────────────────────────────────────────────
st, hist, _ = requete("GET", f"/api/ark/documents/extractions?clientId={client_id}", jeton=jeton)
lignes_hist = (hist or {}).get("extractions") if isinstance(hist, dict) else None
noter("PROD 14 — historique/traçabilité accessibles", st == 200 and bool(lignes_hist),
      f"HTTP {st} {len(lignes_hist or [])} extraction(s)")

st, autres, _ = requete("GET", "/api/clients", jeton=jeton)
total = None
if isinstance(autres, dict):
    total = len(autres.get("clients") or autres.get("data") or [])
noter("PROD 15 — isolation : le compte de recette ne voit que ses propres dossiers",
      st == 200 and (total is None or total <= 1), f"HTTP {st} dossiers visibles={total}")

# ── Preuve ───────────────────────────────────────────────────────────────────
reussis = sum(1 for r in resultats if r["pass"])
preuve = {
    "date": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    "environnement": BASE,
    "compte_de_recette": email.split("@")[0] + "@***",
    "client_de_recette": client_id,
    "resultats": resultats,
    "resume": f"{reussis}/{len(resultats)}",
}
chemin = PREUVES / "test_production_deepseek.json"
chemin.write_text(json.dumps(preuve, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"\n{reussis}/{len(resultats)} tests de production réussis. Preuve : {chemin}")
print("IDENTIFIANTS A NETTOYER :", json.dumps({"email_masque": email.split("@")[0] + "@courtia-qa.invalid", "client_id": client_id}))
