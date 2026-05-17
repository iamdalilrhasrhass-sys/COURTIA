# LINT ERRORS — COURTIA

**Date:** 2026-05-17  
**Commit:** b5312d4  
**Erreurs:** 77 (164 warnings)

## Breakdown

- 66 no-unused-vars (variables, imports, catch vars inutiliées)
- 6 Parsing errors (2  fichiers .jsx — "Unexpected token React")
- 3 no-empty (blocs catch vides)
- 1 no-dupe-keys ('margin')
- 1 react/no-create-component-during-render

## Pourquoi pas corriger maintenant

Les tentatives sed/patch ont introduit plus d'erreurs que corrigé (jusqu'à 180).  
Les no-unused-vars sont dans ~40 fichiers historiques — les toucher sans casser le build demande un audit fichier par fichier.

## Plan correctif

1. Après Playwright et QA réelle, planifier une passe eslint --fix + tests unitaires pour confirmer  
2. Priorité sur les erreurs des pages visibles par le courtier (pas les internes)  
3. Corriger en premier : Parsing errors, no-empty, no-dupe-keys

## Impact commercial

Aucun. Les 77 erreurs sont silencieuses (unused vars/empty blocks).  
Le build passe, les tests passent, le produit fonctionne.
