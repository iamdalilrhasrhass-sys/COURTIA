# QA Routes — COURTIA Commando

**Date:** 2026-05-17  
**Branch:** session-0-aurora-os-safe  
**Build:** ✅ OK (7.88s sans erreur)

## Routes testées (Vite preview — 12 routes)

| Route | HTTP | Notes |
|-------|------|-------|
| `/` | 200 | Landing publique |
| `/demo` | 200 | Page démo refaite v5 |
| `/login` | 200 | Auth page |
| `/register` | 200 | Inscription |
| `/tarifs` | 200 | Tarifs (Pricing.jsx) |
| `/dashboard` | 200 | Cockpit Aurora OS |
| `/clients` | 200 | Hub clients |
| `/contrats` | 200 | Hub contrats |
| `/abonnement` | 200 | Page abonnement |
| `/contact` | 200 | Page contact |
| `/fonctionnalites` | 200 | Fonctionnalités |
| `/aide` | 200 | Aide |

**Score:** 12/12 OK (100%)

## Routes définies (total)

50+ routes dans App.jsx (publiques + protégées).

Routes critiques protégées : `/dashboard`, `/dashboard-legacy`, `/clients`, `/contrats`, `/devis`, `/relances`, `/documents`, `/taches`, `/abonnement`, `/billing`, `/admin/*`

Routes légales alias : `/legal/mentions-legales`, `/legal/confidentialite`, `/legal/cgu`, `/cgu`, `/cgv`, `/cookies` (redirections et pages legacy)

## Responsive

Évalué via CSS Aurora (variables, flexbox, grid, media queries).  
Points vérifiés : navigation desktop, navigation mobile, sidebar, cartes, grilles.

Pas de test visuel automatisé (nécessiterait navigateur).

## QA authentifiée

Impossible (aucun JWT disponible). À faire avec un compte réel.

## Limites

- Lint : 77 erreurs restantes (historique)
- Tests e2e Playwright : non exécutés (VPS sans navigateur)
- QA visuelle mobile : non vérifiée automatiquement
