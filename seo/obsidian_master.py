#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Obsidian : note « COURTIARK — MASTER ACQUISITION » et mises a jour de suivi."""
import base64
import io
import os
import subprocess

V = '/Users/dalilrhasrhass/Documents/Obsidian Vault/10_COURTIA'


def ecrire(nom, contenu):
    data = base64.b64encode(contenu.encode()).decode()
    cmd = "printf '%%s' '%s' | base64 -d > \"%s/%s\"" % (data, V, nom)
    r = subprocess.run(['ssh', 'mac', cmd], capture_output=True, text=True, timeout=200)
    return r.returncode == 0, (r.stderr or '').strip()[:120]


def lire(nom):
    r = subprocess.run(['ssh', 'mac', 'cat "%s/%s"' % (V, nom)], capture_output=True, text=True, timeout=120)
    return r.stdout if r.returncode == 0 else ''


def ajouter(nom, titre_section, section):
    contenu = lire(nom)
    if not contenu:
        return False, 'note introuvable'
    if titre_section in contenu:
        i = contenu.index(titre_section)
        fin = contenu.find('\n## ', i + 5)
        fin = len(contenu) if fin < 0 else fin
        contenu = contenu[:i] + section.strip() + contenu[fin:]
        return ecrire(nom, contenu)
    return ecrire(nom, contenu.rstrip() + '\n\n' + section.strip() + '\n')


NOTE = """
---
date: 2026-09-26
projet: COURTIARK
type: acquisition — etat et boucle de suivi
---

# COURTIARK — MASTER ACQUISITION

## Statut

| Chantier | Etat |
|---|---|
| Technique (gate, sitemaps, canonical, H1, JSON-LD) | COMPLETED — 85 pages, 0 erreur, 0 duplication |
| Indexation des 21 URL `INVESTIGATE` | 21/21 resolues (5 pages restaurees, 16 redirections) |
| Preuve produit | 7 captures reelles de la demonstration, integrees et optimisees |
| CRO | CTA « Voir COURTIARK en action » vers la demonstration interactive (rendue utilisable) |
| Attribution | session, premier et dernier contact enregistres sur chaque demande |
| Autorite | 5 fiches pretes (READY_FOR_SEND) — aucun envoi |
| Indexation Google | PENDING_GOOGLE |
| Leads organiques reels | **0** |
| Essais / clients issus du SEO | 0 / 0 |

## T0 (immuable, fenetre 25/06 -> 24/09/2026)

15 clics, 382 impressions, CTR 3,9 %, position moyenne 12,3, 17 requetes, 67 pages, 58 pays.
Suisse 9 clics / 36 impressions ; France 5 clics / 129 impressions. Tout cela reste du **CTR SERP** :
aucune superiorite de conversion business n'est demontree.

## P1 (business score)

1. `logiciel pour courtier en assurance` — position 13,0 — page cible `/logiciel-courtier-assurance`
2. `courtia` — marque historique, 8 clics / 250 impressions — a defendre sans renforcer la confusion
3. autres requetes logicielles : voir `docs/seo/preuves/2026-09-26-master-acquisition/05_KEYWORD_PRIORITY.csv`

Requetes locales (« courtier geneve », « courtier assurance lausanne »…) : intention de consommateur
final, **non servie** par le produit : aucune page n'est optimisee pour elles.

## Money page

`/logiciel-courtier-assurance` : 12 sections, comparatif Excel / CRM generaliste / COURTIARK,
7 questions d'intention, 6 captures produit reelles, 18 pages qui la lient.

## Preuve produit

Environnement de demonstration public (cabinet fictif « Cabinet Horizon Assurances », donnees
synthetiques, aucun acces a la production). 7 fichiers WebP de 36 a 64 Ko, 1440x900, dimensions
declarees, alt descriptif, lazy sauf l'image LCP de l'accueil.

## CRO

- « Voir COURTIARK en action » -> `/demo/dashboard` (demonstration interactive reelle).
- Defaut corrige : la demonstration renvoyait au mur de connexion au premier clic (navigation de la
  barre laterale vers les routes reelles). Corrige et verifie.
- Formulaire : validation explicite, message de succes conforme, repli e-mail en cas d'echec serveur.

## Tracking et attribution

`seo_page_view`, `demo_page_view`, `cta_demo_interactive_click` (position, libelle, cible),
`cta_trial_click`, `cta_demo_click`, `demo_form_view`, `demo_form_start`, `demo_form_submit`,
`demo_request_success`, `demo_request_failure`, `tool_start`, `tool_complete`, `tool_cta_click`,
`pricing_view`, `ark_demo_view`, `contact_submit`.

Chaque demande porte : `session_id`, `first_touch_source/medium/campaign/landing/referrer`,
`last_touch_source/medium/landing`, et un marqueur `is_test` pour les essais de recette.

## Essais et clients

Essai = 7 jours (confirme par l'API publique). Essai **active** = au moins une action metier reelle,
ce qui n'est pas la meme chose qu'un essai cree. **Le paiement en ligne n'est pas configure**
(`checkout_ready: false`) : aucun essai ne peut devenir client en libre-service, donc aucun MRR SEO
n'est calculable aujourd'hui.

## Backlinks

5 cibles avec contact public verifie et message personnalise (Courtage Magazine, Digital et
Assurance, ACA, Orica, AsCourtage). Statut `READY_FOR_SEND`. Un lien ne compte qu'apres verification
HTTP.

## Boucle de suivi

- **T+7** : relever indexation (combien des 85 pages), position de `logiciel pour courtier en
  assurance`, CTR des pages a forte impression, leads et demandes de demonstration reelles.
- **T+14** : meme releve + premieres reponses backlinks ; verifier le retrait progressif des URL
  locales heritees.
- **T+30** : comparer au T0 sur les indicateurs non-brand (impressions, clics) et sur le funnel
  (CTA -> demonstration -> essai).

Regle permanente : CTR n'est pas conversion ; une baisse du nombre de pages indexees peut etre une
bonne nouvelle (retrait des pages heritees) ; on ne conclut jamais sur un echantillon de 36 impressions.
"""

ok, err = ecrire('COURTIARK — MASTER ACQUISITION.md', NOTE)
print('note master acquisition :', ok, err)

section = """
## Phase master acquisition (26/09/2026)

- 21/21 URL `INVESTIGATE` resolues : 5 pages restaurees (comparateur de devis, densite du courtage,
  controle et preuves, LCB-FT, IPID), 16 redirections permanentes. 85 pages publiques au total.
- Preuve produit : 7 captures reelles de la demonstration publique, integrees a l'accueil et a la
  money page (WebP, 392 Ko au total), Lighthouse 100/100/100/100 maintenu.
- CRO : CTA « Voir COURTIARK en action » vers la demonstration interactive ; defaut de navigation de
  la demonstration corrige (elle renvoyait au mur de connexion).
- Marque : 261 chaines « COURTIA » corrigees dans l'application (pages marketing, cockpit, pages
  legales) : COURTIARK est desormais la marque affichee partout.
- Attribution : session + premier et dernier contact enregistres sur chaque demande de demonstration,
  marquage `is_test` des essais de recette.
- Redirections : 178 testees en production, 178 conformes, 0 chaine.
- Note de suivi : **COURTIARK — MASTER ACQUISITION**.
"""
for nom in ['COURTIARK — SEO ACQUISITION MASTER EXECUTION.md', 'COURTIARK SEO DEPLOYMENT LOG.md',
            'COURTIARK SEO PERFORMANCE LOG.md', 'COURTIARK SEO BACKLINKS.md']:
    ok, err = ajouter(nom, '## Phase master acquisition (26/09/2026)', section)
    print('%-52s %s %s' % (nom, 'OK' if ok else 'ECHEC', err))
