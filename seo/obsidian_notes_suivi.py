#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Complete les notes Obsidian de suivi (URL map, mots-cles, backlinks, deploiements)."""
import base64
import io
import json
import os
import re
import subprocess

VAULT = '/Users/dalilrhasrhass/Documents/Obsidian Vault/10_COURTIA'
RACINE = '/srv/courtia'
DATE = '2026-09-26'


def lire_note(nom):
    r = subprocess.run(['ssh', 'mac', 'cat "%s/%s"' % (VAULT, nom)], capture_output=True, text=True, timeout=120)
    if r.returncode == 0:
        return r.stdout
    r2 = subprocess.run(['ssh', 'mac', 'cat "%s/%s"' % (VAULT, nom.replace('—', '*'))],
                        capture_output=True, text=True, timeout=120, shell=False)
    return r2.stdout if r2.returncode == 0 else ''


def ecrire_note(nom, contenu):
    data = base64.b64encode(contenu.encode('utf-8')).decode('ascii')
    cmd = "printf '%s' | base64 -d > %s" % (data, ('"%s/%s"' % (VAULT, nom)))
    r = subprocess.run(['ssh', 'mac', cmd], capture_output=True, text=True, timeout=120)
    return r.returncode == 0, (r.stderr or '').strip()[:160]


def ajouter(nom, marqueur, section):
    contenu = lire_note(nom)
    if not contenu:
        contenu = '# %s\n' % nom.replace('.md', '')
    if marqueur in contenu:
        return True, 'section déjà présente'
    return ecrire_note(nom, contenu.rstrip() + '\n\n' + section.strip() + '\n')


def main():
    urls = subprocess.run(['bash', '-lc', "cd %s && python3 - <<'EOF'\nimport json\n"
                           "d=json.load(open('vercel.json'))\n"
                           "print(len(d['redirects']))\nEOF" % RACINE],
                          capture_output=True, text=True).stdout.strip()
    # extraire la liste des pages publiees depuis le sitemap local
    pages = []
    base = os.path.join(RACINE, 'frontend', 'public', 'sitemaps')
    for f in sorted(os.listdir(base)):
        contenu = io.open(os.path.join(base, f), encoding='utf-8').read()
        for u in re.findall(r'<loc>(.*?)</loc>', contenu):
            pages.append((f.replace('.xml', ''), u))
    lignes = '\n'.join('| `%s` | %s |' % (u.replace('https://courtiark.fr', ''), s) for s, u in pages)

    section_url = """
## Phase 2 — __DATE__ (mise à jour)

**__NPAGES__ pages publiques indexables**, réparties en __NSITEMAPS__ sitemaps de section (`/sitemap.xml` indexe le tout).

Nouvelles URL de cette vague :

- Villes France : `/france/paris`, `/france/lyon`, `/france/marseille`, `/france/toulouse`,
  `/france/bordeaux`, `/france/lille`, `/france/nantes`, `/france/strasbourg`, `/france/montpellier`,
  `/france/nice`
- Suisse romande : `/suisse/nyon`, `/suisse/vevey`, `/suisse/montreux`, `/suisse/sion`,
  `/suisse/neuchatel`, `/suisse/fribourg`, `/suisse/vaud`, `/suisse/valais`, `/suisse/suisse-romande`
- Intentions commerciales : `/logiciel-courtier-assurance`, `/logiciel-courtage-assurance`,
  `/automatisation-courtier-assurance`
- Outils : `/outils/calculateur-taux-transformation-assurance`,
  `/outils/checklist-dossier-courtier-assurance`, `/outils/checklist-renouvellement-assurance`
- Guide et ressources : `/guides/organiser-cabinet-courtage-25-points`, `/glossaire`, `/tarifs`,
  `/ressources/checklist-25-points-organiser-cabinet-courtage.pdf`,
  `/ressources/checklist-dossier-courtier-assurance.pdf`,
  `/ressources/checklist-renouvellement-assurance.pdf`

URL demandées sans page propre, servies en redirection permanente (une seule page canonique par
intention, pas de doublon) : `/crm-assurance`, `/gestion-portefeuille-assurance`,
`/logiciel-relance-devis-assurance`, `/logiciel-renouvellement-assurance`,
`/logiciel-gestion-documents-assurance`, `/crm-courtier-independant`, `/crm-cabinet-courtage`,
`/crm-assurance-suisse`, `/logiciel-courtier-suisse`, `/crm-courtier-geneve`, `/crm-courtier-lausanne`,
et les sept variantes `/guides/comment-...`.

Consolidation du plan de site précédent : 21 redirections permanentes (anciens `/fr` et `/ch`,
cluster de glossaire, calculateurs, pages alternatives, `/landing`, `/fr` → `/france`, `/ch` → `/suisse`).
Liste complète : `vercel.json` et `docs/seo/preuves/2026-09-26-phase2/redirections.txt`.

## Liste des URL publiées

| URL | Sitemap |
|---|---|
__LISTE__
""".replace('__DATE__', DATE).replace('__NPAGES__', str(len(pages))).replace('__NSITEMAPS__', str(len(set(s for s, _ in pages)))).replace('__LISTE__', lignes)

    section_kw = """
## Phase 2 — __DATE__ (mise à jour)

Intentions couvertes cette vague, une seule page par intention (contrôle automatique :
`seo/cannibalisation.py`) :

| Intention | Page canonique | Décision |
|---|---|---|
| logiciel courtier assurance | `/logiciel-courtier-assurance` | créée (périmètre, modules, critères de choix) |
| logiciel de courtage (flux devis → contrat → commission) | `/logiciel-courtage-assurance` | créée |
| automatisation cabinet de courtage | `/automatisation-courtier-assurance` | créée (ce qui s'automatise / ce qui reste humain) |
| tarifs logiciel courtier (FR et CH) | `/tarifs` | créée, remplace les deux pages tarifs héritées |
| crm assurance | `/crm-courtier-assurance` | **fusionnée** (redirection) — l'intention est identique |
| gestion de portefeuille assurance | `/fonctionnalites/gestion-portefeuille-assurance` | fusionnée |
| relance de devis / renouvellement / documents | pages `/fonctionnalites/*` | fusionnées |
| crm courtier indépendant / cabinet | `/solutions/*` | fusionnées |
| crm / logiciel courtier suisse | `/suisse/crm-courtier-assurance` | fusionnées |
| crm courtier Genève / Lausanne | `/suisse/geneve`, `/suisse/lausanne` | fusionnées |
| villes France (10) | `/france/<ville>` | créées avec données SIRENE réelles |
| Romandie (9 zones) | `/suisse/<zone>` | créées avec contenu propre à chaque zone |
| glossaire | `/glossaire` | créée ; ancien cluster `/fr/glossaire/*` fusionné |

Résultat du contrôle : **1 seule paire suspecte** reste, héritée du site précédent
(`/fr/import-portefeuille-courtier-assurance` et `/ch/import-portefeuille-courtier-assurance-suisse`,
titres presque identiques) — à distinguer lors de la prochaine vague.
""".replace('__DATE__', DATE)

    section_bl = """
## Phase 2 — __DATE__ (mise à jour : des prospects aux actions)

Les 44 domaines sont désormais notés (0 à 11) et documentés dans `docs/seo/BACKLINKS_TOP10.md`.
Notation fondée sur la pertinence courtage, le marché, le canal, l'accessibilité (e-mail
professionnel public) et l'apport de contenu. **Aucun indicateur d'autorité n'est inventé** :
nous n'avons pas d'outil de mesure d'autorité, donc la colonne reste « non mesurée ».

**Top 5 (priorité absolue), avec contacts réellement trouvés sur les sites :**

1. **Courtage Magazine** (FR, média courtage) — Laurent Lemonnier (gérant, iSoluce SARL),
   `bienvenue@isoluce.net` (mentions légales). Le média publie déjà des checklists pour cabinets
   (« Migration CRM courtier », « Fidélisation en assurance ») et a une rubrique « Gestion & Relation client ».
2. **Digital et Assurance** (FR, média digitalisation assurance) — Alexandre Pengloan (éditeur),
   contact public sur le site. Angle : ce qu'un cabinet mesure vraiment avant/après automatisation.
3. **ACA — Association des Courtiers en Assurances** (CH) — secrétariat, `secretariat@aca-courtiers.ch`.
   Angle : outils gratuits comme avantage membres.
4. **Orica** (FR, organisme de formation courtage) — `contact@orica.fr`.
   Angle : checklists utilisables en formation.
5. **AsCourtage** (FR, média/annuaire courtage) — aucun e-mail public : passage par le formulaire.

**Cinq messages personnalisés sont rédigés** dans `docs/seo/OUTREACH_DRAFTS.md`. Aucun envoi n'a été
effectué : la campagne attend votre validation. Aucun achat de lien, aucun annuaire spam, aucune
inscription sur plateforme d'avis (ces inscriptions demandent un compte et une validation par e-mail).

Table `seo_partnership_prospects` créée (migration 128) pour suivre les partenariats.
""".replace('__DATE__', DATE)

    section_dep = """
## Phase 2 — __DATE__ (mise à jour)

| Action | Commit | Vérification en production |
|---|---|---|
| Vague géo FR + CH, 3 outils, glossaire, tarifs, 21 redirections | `3ca813bd` | oui : 13 URL testées en contenu (titre, taille), redirections 308 vérifiées sur 9 cas |
| `robots.txt` réécrit depuis le build, sitemaps obsolètes retirés et redirigés | `5358a1b0` | oui : contenu du `robots.txt` servi, `/sitemap-seo.xml` et `/sitemap-ch.xml` → 308 vers `/sitemap.xml` |

Contrôles de production de cette vague :

- `python3 seo/gate.py --prod` : **80 URL testées, 0 échec** ;
- `python3 seo/maillage.py` : 0 page orpheline, 0 page commerciale sous 2 liens entrants ;
- Lighthouse (desktop) sur 5 nouveaux gabarits : **100/100/100/100**, LCP 0,2 s, TBT 0 ms, CLS ≤ 0,009 ;
- outils testés dans un vrai navigateur : calculateur (58,3 % / 34,3 % / 20,0 %) et checklists (compteurs) ;
- mesure vérifiée en réel : `seo_page_view` et `cta_trial_click` enregistrés dans `marketing_events`
  avec l'attribution de campagne ;
- PDF servis en `application/pdf` (43 ko, 52 ko, 45 ko).

**Rappel de méthode** : la production est validée sur le contenu réellement servi (titre, taille,
scripts, redirections, robots), jamais sur le seul statut du déploiement.
""".replace('__DATE__', DATE)

    for nom, marqueur, section in [
        ('COURTIARK_SEO_URL_MAP.md', 'Phase 2 — %s' % DATE, section_url),
        ('COURTIARK_SEO_KEYWORD_MAP.md', 'Phase 2 — %s' % DATE, section_kw),
        ('COURTIARK_SEO_BACKLINKS.md', 'Phase 2 — %s' % DATE, section_bl),
        ('COURTIARK_SEO_DEPLOYMENT_LOG.md', 'Phase 2 — %s' % DATE, section_dep),
    ]:
        ok, msg = ajouter(nom, marqueur, section)
        print('%-40s %s %s' % (nom, 'OK' if ok else 'ECHEC', msg))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
