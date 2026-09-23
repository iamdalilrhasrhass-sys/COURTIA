#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generateur des fixtures SYNTHETIQUES de test (aucune donnee reelle de client).

Toutes les personnes, societes, immatriculations et IBAN ci-dessous sont INVENTES
et doivent le rester : ils servent a mesurer la lecture de documents, pas a
representer qui que ce soit.
"""
import pathlib

from PIL import Image, ImageDraw, ImageFont

SORTIE = pathlib.Path(__file__).parent / "fixtures"
SORTIE.mkdir(exist_ok=True)


def creer_pdf(chemin, pages):
    """Construit un PDF valide, non compresse, une police Helvetica, N pages."""
    objets = []
    nb_pages = len(pages)
    # 1: catalogue, 2: pages, 3: police, ensuite: page + contenu par page
    ids_pages = [4 + 2 * i for i in range(nb_pages)]
    ids_contenus = [5 + 2 * i for i in range(nb_pages)]

    objets.append((1, "<< /Type /Catalog /Pages 2 0 R >>"))
    kids = " ".join(f"{i} 0 R" for i in ids_pages)
    objets.append((2, f"<< /Type /Pages /Kids [{kids}] /Count {nb_pages} >>"))
    objets.append((3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"))

    for i, texte in enumerate(pages):
        lignes = texte.split("\n")
        corps = ["BT", "/F1 12 Tf", "14 TL", "60 760 Td"]
        for ligne in lignes:
            echappe = ligne.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")
            corps.append(f"({echappe}) Tj T*")
        corps.append("ET")
        flux = "\n".join(corps)
        objets.append((ids_pages[i], f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] "
                                      f"/Resources << /Font << /F1 3 0 R >> >> /Contents {ids_contenus[i]} 0 R >>"))
        objets.append((ids_contenus[i], f"<< /Length {len(flux)} >>\nstream\n{flux}\nendstream"))

    objets.sort()
    sortie = bytearray(b"%PDF-1.4\n")
    offsets = {}
    for num, contenu in objets:
        offsets[num] = len(sortie)
        sortie += f"{num} 0 obj\n{contenu}\nendobj\n".encode("latin-1")
    debut_xref = len(sortie)
    total = max(offsets) + 1
    sortie += f"xref\n0 {total}\n".encode()
    sortie += b"0000000000 65535 f \n"
    for num in range(1, total):
        sortie += f"{offsets.get(num, 0):010d} 00000 n \n".encode()
    sortie += f"trailer\n<< /Size {total} /Root 1 0 R >>\nstartxref\n{debut_xref}\n%%EOF\n".encode()
    chemin.write_bytes(bytes(sortie))
    return chemin


def creer_image(chemin, lignes, taille=(1240, 1754)):
    img = Image.new("RGB", taille, "white")
    d = ImageDraw.Draw(img)
    try:
        police = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 26)
        petit = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
    except Exception:
        police = ImageFont.load_default()
        petit = police
    y = 80
    for i, ligne in enumerate(lignes):
        d.text((70, y), ligne, fill="black", font=police if i < 3 else petit)
        y += 44
    img.save(chemin)
    return chemin


# ── 1. Relevé d'information, une page ───────────────────────────────────────────
creer_pdf(SORTIE / "releve_information_simple.pdf", ["""RELEVE D'INFORMATIONS - DOCUMENT DE TEST (DONNEES FICTIVES)
Compagnie d'assurance : ASSURANCES FICTIVES SA
Numero de contrat : RI-2026-000001
Souscripteur : MARTIN Jean
Adresse du souscripteur : 12 rue des Essais, 75011 Paris
Vehicule : RENAULT CLIO - Immatriculation AA-123-BB
Periode couverte : du 2021-01-01 au 2026-01-01
Coefficient bonus/malus (CRM) : 0.50
Annee sans sinistre responsable : 5
Date d'emission du releve : 2026-02-10
Aucun sinistre enregistre sur la periode.
Document de test - aucune valeur reelle."""])

# ── 2. Relevé d'information multipage (page -> information) ────────────────────
creer_pdf(SORTIE / "releve_information_multipage.pdf", [
    """RELEVE D'INFORMATIONS - PAGE 1/3 - DOCUMENT DE TEST
Compagnie d'assurance : MUTUELLE FICTIVE
Souscripteur : DUPONT Claire
Date de naissance : 14/03/1985
Adresse : 8 avenue du Test, 69003 Lyon
Numero de contrat : RI-2026-000042""",
    """RELEVE D'INFORMATIONS - PAGE 2/3 (VEHICULE)
Vehicule : PEUGEOT 208 - Immatriculation CC-456-DD
Numero VIN : VF3TEST0000000001
Mise en circulation : 2019-06-15
Energie : essence
Puissance fiscale : 5 CV""",
    """RELEVE D'INFORMATIONS - PAGE 3/3 (SINISTRES ET COEFFICIENT)
Coefficient bonus/malus (CRM) : 1.25
Sinistres :
- 2024-04-12 - collision parking - responsabilite 100% - 1240 EUR
- 2023-09-02 - bris de glace - responsabilite 0% - 380 EUR
Document de test - aucune valeur reelle."""])

# ── 3. Contrat d'assurance auto ───────────────────────────────────────────────
creer_pdf(SORTIE / "contrat_auto.pdf", ["""CONTRAT D'ASSURANCE AUTOMOBILE - DOCUMENT DE TEST
Compagnie : ASSURANCES FICTIVES SA
Numero de police : PA-2026-998877
Assure : MARTIN Jean
Immatriculation : AA-123-BB
Date d'effet : 2026-01-01
Echeance annuelle : 2027-01-01
Prime annuelle TTC : 512.40 EUR
Franchise dommages : 300 EUR
Garanties : responsabilite civile, vol, incendie, bris de glace, assistance 0 km
Document de test - aucune valeur reelle."""])

# ── 4. RIB (image scannée simulée) ────────────────────────────────────────────
creer_image(SORTIE / "rib_scan.png", [
    "RELEVE D'IDENTITE BANCAIRE - DOCUMENT DE TEST",
    "BANQUE FICTIVE - 1 place du Test 75001 Paris",
    "Titulaire du compte : MARTIN Jean",
    "IBAN : FR7630004000030000000001234",
    "BIC : FICTFRPPXXX",
    "",
    "Document de test - aucune coordonnee bancaire reelle.",
])

# ── 5. Pièce d'identité (image, SPECIMEN) ─────────────────────────────────────
creer_image(SORTIE / "piece_identite_specimen.png", [
    "CARTE NATIONALE D'IDENTITE - SPECIMEN DE TEST",
    "Nom : MARTIN",
    "Prenom : Jean",
    "Date de naissance : 02/07/1980",
    "Lieu de naissance : TESTVILLE (75)",
    "Numero de piece : SPECIMEN-000000",
    "Date d'expiration : 2031-07-02",
    "",
    "Document de test - aucune valeur reelle.",
])

# ── 6. Fichiers invalides ─────────────────────────────────────────────────────
(SORTIE / "faux_pdf_piege.pdf").write_bytes(b"MZ\x90\x00\x03\x00\x00\x00ceci-n-est-pas-un-pdf")
(SORTIE / "fichier_vide.pdf").write_bytes(b"")
(SORTIE / "volumineux_20Mo.pdf").write_bytes(b"%PDF-1.4\n" + b"0" * (20 * 1024 * 1024))

print("fixtures ecrites :")
for f in sorted(SORTIE.iterdir()):
    print(f"  {f.name:38s} {f.stat().st_size:>10d} octets")
