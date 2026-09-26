#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Genere la version PDF du contenu telechargeable (charte claire, imprimable)."""
import io, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from contenu_outils import LEADMAGNET_POINTS, DOSSIER_SECTIONS, RENOUV_SECTIONS
from moteur import PRIX_FR, PRIX_CH, TRIAL_DAYS

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORTIE = os.path.join(RACINE, 'frontend', 'public', 'ressources')
CHROME = next((p for p in [
    '/root/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome'] if os.path.exists(p)), None)

CSS = """@page{size:A4;margin:18mm 16mm}
body{font:11pt/1.5 Helvetica,Arial,sans-serif;color:#111;margin:0}
h1{font-size:20pt;margin:0 0 4pt;color:#071C2C}
h2{font-size:13pt;margin:16pt 0 4pt;color:#071C2C;border-bottom:1px solid #ccc;padding-bottom:2pt}
h3{font-size:11pt;margin:10pt 0 2pt}
p,li{color:#222}
ol,ul{padding-left:16pt;margin:4pt 0}
li{margin:2pt 0}
.entete{border-bottom:3px solid #00D8FF;padding-bottom:8pt;margin-bottom:12pt}
.marque{font-weight:800;letter-spacing:.06em;color:#071C2C}
.note{font-size:9pt;color:#555}
.grille{columns:2;column-gap:14mm}
.pied{margin-top:14pt;border-top:1px solid #ccc;padding-top:6pt;font-size:9pt;color:#555}
fieldset{border:1px solid #ccc;border-radius:6px;padding:6pt 10pt;margin:6pt 0}
legend{font-weight:700;color:#071C2C;padding:0 4pt}
.c {list-style:none;padding-left:0}
.c li:before{content:"\\2610  ";color:#666}
"""

def page_html(titre, sous_titre, corps, pied_extra=''):
    return f"""<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><title>{titre}</title>
<style>{CSS}</style></head><body>
<div class="entete"><div class="marque">COURTIARK</div>
<h1>{titre}</h1><p class="note">{sous_titre}</p></div>
{corps}
<div class="pied">COURTIARK — CRM et cockpit IA pour courtiers en assurance. France (DDA · ORIAS · RGPD) et
Suisse (LSA · FINMA · nLPD). Essai de {TRIAL_DAYS} jours · France : {' · '.join(f"{n} {p} € HT/mois" for n, p in PRIX_FR)} ·
Suisse : {' · '.join(f"{n} {p} CHF HT/mois" for n, p in PRIX_CH)} · contact@courtiark.fr {pied_extra}</div>
</body></html>"""

def ecrire_pdf(nom, html):
    os.makedirs(SORTIE, exist_ok=True)
    src = f'/tmp/{nom}.html'
    io.open(src, 'w', encoding='utf-8').write(html)
    dst = os.path.join(SORTIE, f'{nom}.pdf')
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--no-sandbox',
                    f'--print-to-pdf={dst}', '--no-pdf-header-footer', f'file://{src}'],
                   capture_output=True, timeout=120)
    return dst

def main():
    # 1. 25 points
    liste = ''.join(f'<li>{x}</li>' for x in LEADMAGNET_POINTS)
    html = page_html("25 points pour organiser un cabinet de courtage",
                     "Liste de contrôle — utilisable sans logiciel · version téléchargeable",
                     f'<div class="grille"><ol>{liste}</ol></div>'
                     '<h2>Comment s\'en servir</h2><p>Cochez ce qui est déjà en place, traitez cette semaine les deux '
                     'points qui bloquent le plus le suivi au quotidien, puis transformez trois points en règle écrite. '
                     'Relisez la liste une fois par trimestre : elle vieillit avec le cabinet.</p>'
                     '<h2>Le point qui compte le plus</h2><p>Aucun dossier ne doit vivre dans la tête d\'une seule '
                     'personne : si l\'information est dans l\'outil et datée, les relances, les échéances et les pièces suivent.</p>')
    p1 = ecrire_pdf('checklist-25-points-organiser-cabinet-courtage', html)

    # 2. checklist dossier
    blocs = ''.join('<fieldset><legend>%s</legend><ul class="c">%s</ul></fieldset>' % (t, ''.join(f'<li>{i}</li>' for i in items))
                    for t, items in DOSSIER_SECTIONS)
    html2 = page_html("Checklist d'un dossier client en courtage d'assurance",
                      "Contrôle interne — de l'ouverture du dossier au renouvellement",
                      blocs + '<h2>Usage</h2><p>Une case non cochée n\'est pas une faute : c\'est une action à planifier. '
                      'Points de contrôle mensuel conseillés : conseil, pièces et échéances.</p>')
    p2 = ecrire_pdf('checklist-dossier-courtier-assurance', html2)

    # 3. checklist renouvellement
    blocs2 = ''.join('<fieldset><legend>%s</legend><ul class="c">%s</ul></fieldset>' % (t, ''.join(f'<li>{i}</li>' for i in items))
                     for t, items in RENOUV_SECTIONS)
    html3 = page_html("Checklist de renouvellement d'un contrat d'assurance",
                      "Séquence complète — préparation 90 jours avant l'échéance",
                      blocs2 + '<h2>Le point le plus souvent oublié</h2><p>Vérifier les dates de fin et de début de '
                      'garantie en cas de changement d\'assureur : un chevauchement coûte au client, un trou de couverture '
                      'peut lui coûter beaucoup plus.</p>')
    p3 = ecrire_pdf('checklist-renouvellement-assurance', html3)

    for f in (p1, p2, p3):
        print(os.path.relpath(f, RACINE), os.path.getsize(f), 'octets')

if __name__ == '__main__':
    raise SystemExit(main())
