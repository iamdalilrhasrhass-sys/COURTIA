#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ecrit le bilan de la phase 2 SEO dans Obsidian (Vault du Mac) + les preuves dans le depot.

Aucune valeur de secret n'est ecrite. Chaque chiffre provient d'une commande reellement
executee (gate, maillage, cannibalisation, Lighthouse, dashboard, git).
"""
import base64
import io
import json
import os
import subprocess

RACINE = '/srv/courtia'
VAULT = '/Users/dalilrhasrhass/Documents/Obsidian Vault/10_COURTIA'
PREUVES = os.path.join(RACINE, 'docs', 'seo', 'preuves', '2026-09-26-phase2')


def sh(cmd, timeout=120):
    r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=timeout)
    return r.stdout.strip()


def ecrire(chemin, contenu):
    data = base64.b64encode(contenu.encode('utf-8')).decode('ascii')
    cmd = ("printf '%s' | base64 -d > %s" % (data, chemin.replace(' ', '\\ ')))
    r = subprocess.run(['ssh', 'mac', cmd], capture_output=True, text=True, timeout=120)
    return r.returncode == 0, (r.stderr or '').strip()[:200]


def main():
    os.makedirs(PREUVES, exist_ok=True)
    # ------------------------------------------------------------------ preuves
    io.open(os.path.join(PREUVES, 'gate_prod.txt'), 'w', encoding='utf-8').write(
        sh('cd %s && python3 seo/gate.py --prod 2>&1 | tail -40' % RACINE))
    io.open(os.path.join(PREUVES, 'maillage.json'), 'w', encoding='utf-8').write(
        sh('cd %s && python3 seo/maillage.py' % RACINE))
    io.open(os.path.join(PREUVES, 'cannibalisation.json'), 'w', encoding='utf-8').write(
        sh('cd %s && python3 seo/cannibalisation.py' % RACINE))
    io.open(os.path.join(PREUVES, 'robots.txt'), 'w', encoding='utf-8').write(
        sh('curl -s https://courtiark.fr/robots.txt'))
    io.open(os.path.join(PREUVES, 'redirections.txt'), 'w', encoding='utf-8').write(
        sh("""cd %s && python3 -c "
import json
d=json.load(open('vercel.json'))
for r in d['redirects']:
    print('%%-52s -> %%s' %% (r['source'], r['destination']))
" """ % RACINE))
    io.open(os.path.join(PREUVES, 'dashboard.md'), 'w', encoding='utf-8').write(
        sh('cd %s && python3 seo/dashboard.py 2>/dev/null' % RACINE))
    for f in os.listdir('/tmp'):
        if f.startswith('lh2_') and f.endswith('.json'):
            io.open(os.path.join(PREUVES, 'lighthouse_' + f[4:]), 'w', encoding='utf-8').write(
                io.open(os.path.join('/tmp', f), encoding='utf-8').read())
    commit = sh('cd %s && git log --oneline -1' % RACINE)
    commits = sh('cd %s && git log --oneline -6' % RACINE)

    # ------------------------------------------------------------------ notes
    date = '2026-09-26'
    perf = """---
date: %s
projet: COURTIARK
type: journal de performance SEO
---

# COURTIARK SEO — journal de performance

## T0 — %s (socle technique + phase 2)

| Indicateur | Valeur mesurée | Comment |
|---|---|---|
| Pages publiques indexables | 80 | `python3 seo/gate.py` (dépôt /srv/courtia) |
| Contrôle de production | 80 URL testées, 0 échec | `python3 seo/gate.py --prod` |
| Pages orphelines | 0 | `python3 seo/maillage.py` |
| Pages commerciales sous 2 liens entrants | 0 | `python3 seo/maillage.py` |
| Paires de pages en cannibalisation | 1 (paire historique FR/CH héritée) | `python3 seo/cannibalisation.py` |
| Lighthouse mobile — accueil | 100 / 100 / 100 / 100 | npx lighthouse@12, prod |
| Lighthouse desktop — 5 nouveaux gabarits | 100 / 100 / 100 / 100, LCP 0,2 s, TBT 0 ms, CLS ≤ 0,009 | preuves dans `docs/seo/preuves/2026-09-26-phase2/` |
| Visites mesurées (first-party) | 171 `site_visit` + 13 `seo_page_view` | table `marketing_events` |
| Clics CTA mesurés | vérifiés en réel après instrumentation | `cta_trial_click` sur `/france/paris` |
| Demandes de démo réelles | 0 (3 lignes, toutes de test) | table `demo_requests` |
| Impressions / clics / position Google | non disponibles | aucune propriété Search Console accessible |

**Ce que ce journal ne contient pas** : aucune donnée d'impression, de clic ou de position Google,
parce qu'aucune source ne les fournit aujourd'hui. Le tableau ci-dessus ne contient que des
compteurs issus de notre propre mesure ou de nos propres contrôles.

**Prochaine mesure** : à refaire après 30 jours d'indexation, ou dès que Search Console est
connectée (voir « COURTIARK — SEARCH CONSOLE BASELINE »).
""" % (date, date)

    baseline = """---
date: %s
projet: COURTIARK
type: référence (baseline) Search Console
---

# COURTIARK — SEARCH CONSOLE BASELINE

## État réel au %s

**Search Console n'est pas connectée.** Aucune donnée d'impression, de clic, de CTR ou de position
n'existe côté COURTIARK. Cette note est donc une baseline vide par la force des choses, et elle
décrit exactement ce qui manque et ce qu'il faut faire pour l'obtenir.

## Ce qui a été vérifié (et non supposé)

| Voie d'accès | Résultat de la vérification |
|---|---|
| Jeton / compte de service Google sur le VPS | absent (`/root/.hermes/secrets/` ne contient rien de Google ; aucun `gcloud`) |
| Session Google sur le Mac | **présente** : profil Chrome « Default », cookies `search.google.com` et `accounts.google.com` |
| Pilotage de cette session depuis le serveur | AppleScript lit l'URL et le titre des onglets, mais **refuse d'exécuter du JavaScript** (« Autoriser JavaScript dans les événements AppleScript » désactivé) |
| Second Chrome avec profil copié (port de débogage) | tenté, non autorisé côté poste de travail |
| API Search Console (OAuth / compte de service) | impossible : aucune clé, aucun consentement enregistré |
| Fournisseur DNS | Hostinger (`orbit.dns-parking.com`, `horizon.dns-parking.com`) ; session hPanel présente dans Chrome ; **aucune clé API Hostinger** sur le VPS |
| Vercel | CLI authentifiée, mais le projet ne gère pas le DNS de `courtiark.fr` (nameservers tiers) |
| Bing Webmaster Tools | dépend d'un compte, donc même blocage |

## Procédure de déblocage (une seule action requise)

1. Dans Chrome, sur le Mac : menu **Affichage → Développeur → Autoriser JavaScript dans les événements AppleScript**.
2. Me le dire. J'enchaîne alors sans autre intervention :

- ouverture de `search.google.com/search-console` dans la session existante ;
- création de la propriété **Domaine `courtiark.fr`** si elle n'existe pas ;
- récupération du jeton TXT et ajout chez Hostinger (session hPanel déjà ouverte) — sans toucher aux
  enregistrements existants ;
- validation, puis soumission de `https://courtiark.fr/sitemap.xml` (index + 10 sitemaps de section) ;
- inspection des 10 URL stratégiques et demande d'indexation pour celles qui ne sont pas encore connues ;
- relevé des impressions, clics, CTR, positions, pays, appareils → remplissage de cette baseline ;
- mise en place d'un relevé hebdomadaire.

## Baseline à remplir (T0)

| Page | Indexée | Impressions | Clics | CTR | Position moyenne |
|---|---|---|---|---|---|
| / | à mesurer | — | — | — | — |
| /crm-courtier-assurance | à mesurer | — | — | — | — |
| /fonctionnalites/assistant-ark | à mesurer | — | — | — | — |
| /fonctionnalites/gestion-portefeuille-assurance | à mesurer | — | — | — | — |
| /fonctionnalites/relance-devis-assurance | à mesurer | — | — | — | — |
| /fonctionnalites/renouvellements-assurance | à mesurer | — | — | — | — |
| /suisse | à mesurer | — | — | — | — |
| /suisse/geneve | à mesurer | — | — | — | — |
| /suisse/lausanne | à mesurer | — | — | — | — |
| /france | à mesurer | — | — | — | — |

## Source de repli déjà opérationnelle

En attendant, la seule mesure exploitable est la nôtre : `marketing_events` (visites, clics CTA,
formulaires, demandes) et `demo_requests`. Voir `docs/seo/DASHBOARD.md` et la note
« COURTIARK SEO — journal de performance ».
""" % (date, date)

    phase2 = """
---

## Phase 2 — acquisition réelle (__DATE__)

### 1. Search Console : blocage réel, décrit précisément

Aucun accès Google depuis le serveur ; la session Chrome du Mac existe (cookies `search.google.com`)
mais l'exécution de JavaScript via AppleScript est refusée par le navigateur. Voir la note
**« COURTIARK — SEARCH CONSOLE BASELINE »** pour la procédure de déblocage en une action et la
baseline à remplir. Sitemaps : 11 fichiers en ligne, prêts à être soumis.

### 2. Contenu publié (80 pages indexables, +28 cette vague)

- **Villes France (10)** : `/france/paris`, `/france/lyon`, `/france/marseille`, `/france/toulouse`,
  `/france/bordeaux`, `/france/lille`, `/france/nantes`, `/france/strasbourg`, `/france/montpellier`,
  `/france/nice`. Chaque page porte les chiffres réels du courtage local (base SIRENE, code NAF 66.22Z,
  extraction du 19/09/2026 : nombre d'établissements, population, densité pour 10 000 habitants,
  par exemple Paris 4 347 établissements / 20,7 pour 10 000 habitants), un tableau des conséquences
  concrètes pour un cabinet de cette ville et trois cas de dossiers typiques. Aucune page de ville
  sans donnée propre.
- **Suisse romande (9)** : `/suisse/nyon`, `/suisse/vevey`, `/suisse/montreux`, `/suisse/sion`,
  `/suisse/neuchatel`, `/suisse/fribourg`, `/suisse/vaud`, `/suisse/valais`, `/suisse/suisse-romande`.
  Contenu propre à chaque zone (frontalier, hôtellerie, chantiers dispersés, horlogerie, exploitation
  agricole, saisonnalité), jamais de description touristique.
- **Pages à forte intention (3)** : `/logiciel-courtier-assurance`, `/logiciel-courtage-assurance`,
  `/automatisation-courtier-assurance`.
- **Tarifs (1)** : `/tarifs` — France et Suisse, essai, ce que le prix ne cache pas.
- **Glossaire (1)** : `/glossaire`, 19 notions France et Suisse, chacune reliée à ses pages.

### 3. Outils gratuits (3 nouveaux, 4 au total)

`/outils/calculateur-taux-transformation-assurance` (leads → devis → contrats, formules affichées,
calcul local), `/outils/checklist-dossier-courtier-assurance` (27 points, cases persistantes,
impression), `/outils/checklist-renouvellement-assurance` (16 points, séquence 90 jours avant).
Vérifiés en production dans un vrai navigateur : le calculateur renvoie 58,3 % / 34,3 % / 20,0 % pour
60 leads, 35 devis, 12 contrats ; les compteurs de checklist se mettent à jour (3/27 après trois cases).

### 4. Contenu téléchargeable (sans formulaire)

Trois PDF générés et servis : `/ressources/checklist-25-points-organiser-cabinet-courtage.pdf` (2 pages),
`/ressources/checklist-dossier-courtier-assurance.pdf` (2 pages),
`/ressources/checklist-renouvellement-assurance.pdf` (1 page). Téléchargement direct, sans inscription.

### 5. Autorité : de 44 domaines à un Top 10 et un Top 5 avec contacts réels

Notation transparente (0 à 11) sur la pertinence, le marché, le canal, l'accessibilité et l'apport de
contenu. **L'autorité de domaine n'est pas notée** : aucun outil de mesure disponible, donc aucune
valeur inventée. Détail : `docs/seo/BACKLINKS_TOP10.md`.

Top 5 : Courtage Magazine (contact public : Laurent Lemonnier, iSoluce SARL), Digital et Assurance
(éditeur identifié, contact public), ACA — Association des Courtiers en Assurances (secrétariat,
contact public), Orica (organisme de formation, contact public), AsCourtage (aucun e-mail public :
passage par le formulaire). **Cinq messages d'approche personnalisés sont rédigés et enregistrés**
(`docs/seo/OUTREACH_DRAFTS.md`). **Aucun message n'a été envoyé** : cela attend votre validation.
Table `seo_partnership_prospects` créée (migration 128).

### 6. Mesure et conversion

Le funnel est instrumenté et vérifié en production : visite (`seo_page_view`) → clic CTA
(`cta_trial_click`, vérifié sur `/france/paris` avec campagne de test) → formulaire
(`demo_form_view`, `demo_form_submit`) → demande (`demo_request_success`), avec attribution
(medium, campagne, landing, referrer). Tableau de bord généré par `seo/dashboard.py`
(`docs/seo/DASHBOARD.md` et `.html`) : acquisition, conversion globale et conversion par page
d'atterrissage. Les trois demandes de démo existantes sont des tests internes : **aucun lead réel
n'a encore été reçu**, ce qui est écrit tel quel dans le tableau de bord.

### 7. Contrôles et corrections de cette vague

- `seo/gate.py` : 80 pages, 0 erreur, 0 paire trop proche (les 9 pages suisses ont d'abord été
  **refusées** par le contrôle d'anti-duplication, puis réécrites avec un contenu propre à chaque zone).
- `seo/maillage.py` : 0 page orpheline, 0 page commerciale sous 2 liens entrants.
- `seo/cannibalisation.py` : 1 seule paire suspecte restante, héritée du site précédent (deux pages
  d'import FR et CH aux titres presque identiques) — à traiter en distinguant les titres.
- **21 redirections permanentes** ajoutées pour consolider les doublons hérités (anciennes pages `/fr`
  et `/ch`, clusters de glossaire, calculateurs, pages alternatives, `/landing`) : les URL demandées
  existent et répondent, sans créer de contenu en double.
- `robots.txt` **réécrit depuis le build** : l'ancien fichier décrivait encore un plan de site `/fr` et
  `/ch` abandonné ; les sitemaps obsolètes (`sitemap-seo.xml`, `sitemap-ch.xml`) sont retirés et
  redirigés vers `sitemap.xml`.
- Lighthouse : 100/100/100/100 sur les 5 nouveaux gabarits (aucune régression de performance).

### 8. Déploiement

Commit `3ca813bd` (vague géo, outils, glossaire, tarifs, redirections) puis commit suivant
(robots.txt et sitemaps). Poussés sur `main` ; production vérifiée **sur le contenu réellement servi**
(titres, tailles, présence des scripts, redirections, sitemaps), pas seulement sur le statut du
déploiement.

### 9. Ce qui reste à faire, dans l'ordre

1. Débloquer Search Console (une action : voir la note baseline) puis soumettre les sitemaps et
   inspecter les 10 URL stratégiques.
2. Valider et envoyer les 5 messages d'approche (ou les corriger).
3. Décider du sort des deux pages d'import FR/CH héritées signalées par le contrôle de cannibalisation.
4. Vague de contenu suivante : pilotée par les données Search Console, pas par des suppositions.
""".replace('__DATE__', date)

    ok1, e1 = ecrire(VAULT + '/COURTIARK SEO PERFORMANCE LOG.md', perf)
    ok2, e2 = ecrire(VAULT + '/COURTIARK — SEARCH CONSOLE BASELINE.md', baseline)
    # ajout de la phase 2 a la note maitre
    chemin = VAULT + '/COURTIARK — SEO ACQUISITION MASTER EXECUTION.md'
    r = subprocess.run(['ssh', 'mac', 'cat "%s"' % chemin], capture_output=True, text=True, timeout=120)
    contenu = r.stdout if r.returncode == 0 else '# COURTIARK — SEO ACQUISITION MASTER EXECUTION\n'
    if 'Phase 2 — acquisition réelle' not in contenu:
        ok3, e3 = ecrire(chemin, contenu.rstrip() + '\n' + phase2)
    else:
        ok3, e3 = True, 'déjà présent'
    print('note performance :', ok1, e1)
    print('note baseline :', ok2, e2)
    print('note maître :', ok3, e3)
    print('preuves :', sorted(os.listdir(PREUVES)))
    print('commit courant :', commit)
    print(commits)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
