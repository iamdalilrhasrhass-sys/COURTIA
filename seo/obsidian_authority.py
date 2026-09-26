#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Obsidian : note « COURTIARK — AUTHORITY 100 MASTER » + mise a jour des notes de suivi."""
import base64
import io
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


def ajouter(nom, marqueur, section):
    contenu = lire(nom)
    if not contenu:
        return False, 'note introuvable'
    if marqueur in contenu:
        i = contenu.index(marqueur)
        fin = contenu.find('\n## ', i + 5)
        fin = len(contenu) if fin < 0 else fin
        return ecrire(nom, contenu[:i] + section.strip() + contenu[fin:])
    return ecrire(nom, contenu.rstrip() + '\n\n' + section.strip() + '\n')


NOTE = """
---
date: 2026-09-26
projet: COURTIARK
type: autorite — score interne et preuves
---

# COURTIARK — AUTHORITY 100 MASTER

## Score interne du 26/09/2026 : 71 / 100

Ce score est **interne** : il ne vient d'aucun moteur et ne mesure pas un classement. Il indique où
porter l'effort. Un point n'est accordé que sur preuve vérifiable.

| Bloc | Score | Maximum |
|---|---|---|
| Technique / indexation | 19,5 | 20 |
| Autorité topique | 21 | 25 |
| Autorité externe (domaine) | 5 | 25 |
| Entité / marque / confiance | 7,5 | 10 |
| CRO / produit | 10 | 10 |
| Mesure / acquisition | 8 | 10 |

Dont **contrôlable en interne : 71/75** et **externe : 5/25**. Aucun « 100/100 » n'est annoncé : il
faudrait des citations et des liens qui n'existent pas encore.

## Technique — 19,5/20

93 pages publiques, gate local et production à 0 échec, 178 redirections testées en production
(178 conformes, 0 chaîne), 10 sitemaps XML valides, audit des données structurées à 0 anomalie,
HTML lisible **sans JavaScript sur 16/16 pages testées**, Lighthouse mobile 100/100/100/100 sur
accueil, money page, démo, Genève et outil (LCP 0,9 à 1,1 s, TBT 0 ms, CLS 0).
Données terrain : `FIELD_DATA_INSUFFICIENT` (volume insuffisant).

## Topique — 21/25

- France : hub réglementaire + contrôle et preuves + LCB-FT + devoir de conseil. **Manque** rémunération/transparence.
- Suisse : hub + documents d'information + page marché. **Manque** page dédiée à la surveillance FINMA.
- Courtage opérationnel : couvert.
- Branches : santé, prévoyance, auto, multirisque pro, RC pro. Habitation et décennale absentes (aucun besoin produit vérifié).
- Recherche originale : étude 2026 + méthodologie + dataset + 4 outils citables.
- Univers sémantique : 36 sujets, 35 avec page (97 %).

## Recherche originale — l'actif n°1

**Cartographie du courtage en assurance en France, édition 2026** : 43 240 entreprises (SIRENE, code 66.22Z,
extraction du 18/09/2026), 18 régions, 104 départements, Île-de-France 10 050 (23,2 %), Paris 4 347,
6 157 entreprises multi-établissements. Script reproductible + **second calcul indépendant à 0 écart**.
CSV et JSON téléchargeables. Méthode et limites publiées dans la page.

Garde-fou qui a servi : la première table des régions ne contenait pas la région 93 ; le script a refusé
de publier, aucun chiffre faux n'est sorti. Deux contrôles ont aussi corrigé un écart de grain
(« établissement » → « entreprise ») entre l'étude et les pages villes, désormais alignées.

**Étude suisse : non publiée** (pas de comptage reproductible équivalent). **Baromètre digitalisation :
préparé, non publié** — aucun résultat sans échantillon réel, effectif toujours affiché.

## PR et autorité externe — 5/25

- Kit presse publié (`/presse`), politique éditoriale et page Sources.
- 22 cibles vérifiées (HTTP) avec score /100 ; 5 tier 1 : PLANETE CSCA, Sycra, La Tribune de l'Assurance,
  News Assurances Pro, ACA.
- **20 messages personnalisés prêts**, chacun citant un contenu réel du destinataire, avec relances J+5 et J+12.
- **Envoyés : 0. Réponses : 0. Couverture : 0. Backlinks live : 0** (registre vide, et il l'écrit).
- Profils annuaires (Capterra, GetApp, G2, Appvizer, Trustpilot) : `NOT_STARTED` — vérification e-mail = action humaine.

## Entité — 7,5/10

Marque unifiée (261 chaînes corrigées), Organization + WebSite + SoftwareApplication (captures réelles,
prix réels) + Dataset sur l'étude, pages Sources et politique éditoriale, kit presse.
`sameAs` **volontairement vide** : il ne sera rempli qu'après publication d'un profil réel.

## Mesure — 8/10

Search Console + mesure first-party + attribution `session_id` / premier et dernier contact, vérifiée en
base sur une demande réelle de recette. Tous les essais de recette sont marqués `is_test` (5 sur 5).
**0 lead organique réel, 0 essai SEO, 0 client, MRR non calculable.**

## Boucle de suivi

- **T+7** : indexation des 93 pages, position de « logiciel pour courtier en assurance », CTR des pages à
  forte impression, premier envoi presse si autorisé, profils annuaires.
- **T+14** : réponses presse, premiers liens (un lien ne compte qu'après vérification HTTP), retrait
  progressif des 1 065 pages locales héritées.
- **T+30** : comparaison au T0 sur les indicateurs non-brand, funnel CTA → démo → essai, recalcul du score.

## Fichiers de preuve

`srv/courtia/docs/seo/authority100/` (28 fichiers) : scorecard, univers sémantique, cartes réglementaires
France et Suisse, branches, cibles PR et file d'approche, registre de backlinks, graphe d'entité,
opportunités GSC, watchlist, funnel CRO, KPI business, recette et rapport final.
"""

ok, err = ecrire('COURTIARK — AUTHORITY 100 MASTER.md', NOTE)
print('note authority 100 :', ok, err)

section = """
## Phase autorite 100 (26/09/2026)

- Score interne **71/100** (contre 63,5 avant la phase), dont 71/75 contrôlable en interne.
- Etude originale publiee : cartographie du courtage en France 2026 (43 240 entreprises, double calcul a
  0 ecart), methodologie et jeu de donnees telechargeable.
- Hubs reglementaires France et Suisse publies ; pages `/presse`, `/sources` et `/politique-editoriale`.
- 20 messages de relations presse prets (22 cibles verifiees) : **aucun envoi**.
- Backlinks live : **0**. Profils annuaires : NON COMMENCES (verification e-mail = action humaine).
- 93 pages publiques ; gate production 93/0 ; 178 redirections conformes ; HTML lisible sans JavaScript
  sur 16/16 pages ; Lighthouse 100/100/100/100.
- Note complete : **COURTIARK — AUTHORITY 100 MASTER**.
"""
for nom in ['COURTIARK — MASTER ACQUISITION.md', 'COURTIARK SEO DEPLOYMENT LOG.md',
            'COURTIARK SEO PERFORMANCE LOG.md', 'COURTIARK_SEO_BACKLINKS.md']:
    ok, err = ajouter(nom, '## Phase autorite 100 (26/09/2026)', section)
    print('%-52s %s %s' % (nom, 'OK' if ok else 'ECHEC', err))
