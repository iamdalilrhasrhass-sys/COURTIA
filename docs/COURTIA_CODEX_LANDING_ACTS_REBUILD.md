# COURTIA — Landing Aurora en 3 actes

Date : 1er mai 2026

## 1. Objectif

Remplacer l'impression de page SaaS empilée par une landing continue, cinématique, centrée sur la Bubble C officielle et l'aurore boréale COURTIA.

## 2. Changements réalisés

- Structure publique refondue en 3 grands actes :
  - promesse immédiate et activation Pro,
  - signaux portefeuille + ARK + cockpit,
  - conversion, tarifs, réassurance et FAQ.
- Ajout d'un sol perspectif Aurora et d'un rideau lumineux continu.
- Hero reconstruit comme scène produit avec Bubble C centrale, halo, orbites et signaux métier.
- Suppression de la sensation de grosses séparations entre sections.
- Tarifs et funnel maintenus avec `0 € aujourd’hui`, `7 jours`, `annulation en ligne`.
- Aucun changement backend, Stripe, DB, auth ou impersonation dans ce batch.

## 3. Tests

| Test | Résultat |
|---|---|
| `npm run build` | OK |
| `npm run test` | 33 tests OK |
| `python3 scripts/courtia_qa_audit.py` | 0 P0/P1 |
| Capture Chrome headless desktop local | OK |
| Capture Chrome headless mobile local | Partielle : Chrome headless ne déclenche pas fidèlement les media queries mobiles, mais le code a été renforcé contre l'overflow |

## 4. Risques restants

- Validation visuelle mobile réelle à faire dans l'in-app browser après déploiement Vercel.
- Bundle principal toujours supérieur à 500 kB, classé P2 performance.
- Backend VPS non redémarré faute d'accès SSH valide.
