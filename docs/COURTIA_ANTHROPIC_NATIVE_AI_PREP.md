# COURTIA — Préparation IA Anthropic Native (Sans branchement)

Date : 2 mai 2026

## Décision
Cette phase prépare l’intégration Anthropic sans appel réel ni clé exposée.

## Principes
- Backend-only pour les appels IA.
- Aucune clé IA en frontend.
- Aucune logique prompt sensible côté client.
- Journalisation minimale sans données sensibles.
- Rate limiting et scopes de données obligatoires.

## Variables prévues (non renseignées ici)
- `ANTHROPIC_API_KEY`
- `ARK_MODEL`
- `ARK_MAX_TOKENS`
- `ARK_RATE_LIMIT`
- `ARK_DATA_SCOPE`

## Points d’intégration recommandés
- Services backend : `portfolioAnalyzer`, `reachScoringService`, `inboundProcessor` (déjà structurés autour d’un mode avec/sans clé).
- Endpoints ciblés :
  - brief portefeuille,
  - opportunités client,
  - signaux de relance,
  - enrichissement fiches client.

## Contrat UX ARK
- ARK propose, le courtier décide.
- Si donnée insuffisante : état vide intelligent (`portfolio_empty`, recommandation d’action).
- Si indisponible : fallback propre sans erreur technique brute côté UI.

## Sécurité et conformité
- Pas de prompt système en frontend.
- Pas de données carte/PII inutiles dans prompts.
- Traçabilité de version des prompts côté backend (fichier/profilage interne).
- Validation RGPD/juridique avant activation commerciale.

