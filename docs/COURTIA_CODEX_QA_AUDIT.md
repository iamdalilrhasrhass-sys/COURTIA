# COURTIA — Audit QA Python

- Date : 2026-05-02 00:08:12
- Statut : OK
- Fichiers scannés : 164

## Synthèse

- P0/P1 : 0
- P2 : 38

## Documentation

| Document | Statut |
|---|---|
| `COURTIA_CHANGELOG.md` | OK |
| `COURTIA_QA_REPORT.md` | OK |
| `COURTIA_REMAINING_TASKS.md` | OK |
| `COURTIA_AURORA_DESIGN_SYSTEM.md` | OK |
| `COURTIA_ADMIN_CENTER.md` | OK |
| `COURTIA_CODEX_PHASE5_ADMIN.md` | OK |

## Composants Aurora

| Composant | Statut |
|---|---|
| `CourtiaBubbleLogo.jsx` | OK |
| `CourtiaMiniLogo.jsx` | OK |
| `CourtiaLogoLoader.jsx` | OK |
| `AuroraButton.jsx` | OK |
| `AuroraCard.jsx` | OK |
| `AuroraBadge.jsx` | OK |
| `AuroraDivider.jsx` | OK |
| `AuroraPageHeader.jsx` | OK |
| `AuroraEmptyState.jsx` | OK |

## Pages attendues

| Page | Statut |
|---|---|
| `LandingPublic.jsx` | OK |
| `LoginPage.jsx` | OK |
| `Dashboard.jsx` | OK |
| `Clients.jsx` | OK |
| `ClientDetail.jsx` | OK |
| `Contrats.jsx` | OK |
| `Taches.jsx` | OK |
| `Rapports.jsx` | OK |
| `Parametres.jsx` | OK |
| `AdminOverview.jsx` | OK |

## Routes React détectées

`*`, `/`, `/abonnement`, `/academy`, `/academy/*`, `/admin`, `/admin/logs`, `/admin/subscriptions`, `/admin/support`, `/admin/system`, `/admin/users`, `/admin/users/:id`, `/analyses`, `/analytics`, `/billing`, `/browser-pilot`, `/capitia`, `/client/:id`, `/clients`, `/clients/:id`, `/clients/:id/edit`, `/clients/new`, `/contrats`, `/contrats/new`, `/dashboard`, `/documents`, `/landing`, `/login`, `/morning-brief`, `/onboarding`, `/paiement-annule`, `/paiement-succes`, `/parametres`, `/rapports`, `/reach`, `/reach/campaigns`, `/reach/campaigns/:id`, `/reach/inbox`, `/reach/map`, `/reach/prospects`, `/reach/prospects/:id`, `/reach/search`, `/reach/settings`, `/register`, `/taches`, `/tarifs`, `/upload/:token`

## Résultats détaillés

| Niveau | Catégorie | Fichier | Ligne | Détail |
|---|---|---|---:|---|
| P2 | Message technique | `frontend/src/components/ARKChatTab.jsx` | 100 | Motif technique détecté : `err\.message` |
| P2 | Loader générique | `frontend/src/components/ARKChatTab.jsx` | 172 | Motif loader générique : `\banimate-spin\b` |
| P2 | Loader générique | `frontend/src/components/AdminRoute.jsx` | 10 | Motif loader générique : `['\"]Loading(?:\.\.\.)?['\"]` |
| P2 | Loader générique | `frontend/src/components/AdminRoute.jsx` | 37 | Motif loader générique : `['\"]Loading(?:\.\.\.)?['\"]` |
| P2 | Loader générique | `frontend/src/components/Auth.jsx` | 106 | Motif loader générique : `['\"]Chargement\.\.\.['\"]` |
| P2 | Loader générique | `frontend/src/components/AuthPremium.jsx` | 78 | Motif loader générique : `['\"]Chargement\.\.\.['\"]` |
| P2 | Loader générique | `frontend/src/components/ClientDetail.jsx` | 156 | Motif loader générique : `\banimate-spin\b` |
| P2 | Loader générique | `frontend/src/components/ClientDetail.jsx` | 310 | Motif loader générique : `\banimate-spin\b` |
| P2 | Message technique | `frontend/src/components/ClientModal.jsx` | 144 | Motif technique détecté : `err\.message` |
| P2 | Loader générique | `frontend/src/components/Contrats.jsx` | 160 | Motif loader générique : `>\s*Chargement\.\.\.\s*<` |
| P2 | Loader générique | `frontend/src/components/LoadingSpinner.jsx` | 1 | Motif loader générique : `['\"]Chargement\.\.\.['\"]` |
| P2 | Loader générique | `frontend/src/components/Parametres.jsx` | 70 | Motif loader générique : `>\s*Chargement\.\.\.\s*<` |
| P2 | Message technique | `frontend/src/components/PaywallModal.jsx` | 33 | Motif technique détecté : `error\.message` |
| P2 | Loader générique | `frontend/src/components/PremiumButton.jsx` | 51 | Motif loader générique : `\banimate-spin\b` |
| P2 | Loader générique | `frontend/src/components/Settings.jsx` | 121 | Motif loader générique : `>\s*Chargement\.\.\.\s*<` |
| P2 | Loader générique | `frontend/src/components/Sidebar.jsx` | 93 | Motif loader générique : `['\"]Chargement\.\.\.['\"]` |
| P2 | Loader générique | `frontend/src/components/Taches.jsx` | 121 | Motif loader générique : `>\s*Chargement\.\.\.\s*<` |
| P2 | Loader générique | `frontend/src/pages/Academy.jsx` | 125 | Motif loader générique : `\banimate-spin\b` |
| P2 | Loader générique | `frontend/src/pages/AdminCostsDashboard.jsx` | 49 | Motif loader générique : `>\s*Chargement\.\.\.\s*<` |
| P2 | Loader générique | `frontend/src/pages/AdminOverview.jsx` | 19 | Motif loader générique : `['\"]Chargement\.\.\.['\"]` |
| P2 | Loader générique | `frontend/src/pages/AdminSubscriptions.jsx` | 18 | Motif loader générique : `['\"]Chargement\.\.\.['\"]` |
| P2 | Message technique | `frontend/src/pages/AdminSupport.jsx` | 57 | Motif technique détecté : `PostgreSQL` |
| P2 | Message technique | `frontend/src/pages/AdminSystem.jsx` | 111 | Motif technique détecté : `PostgreSQL` |
| P2 | Loader générique | `frontend/src/pages/Billing.jsx` | 31 | Motif loader générique : `\banimate-spin\b` |
| P2 | Loader générique | `frontend/src/pages/BrowserPilot.jsx` | 265 | Motif loader générique : `\banimate-spin\b` |
| P2 | Loader générique | `frontend/src/pages/ClientDetail.jsx` | 302 | Motif loader générique : `\banimate-spin\b` |
| P2 | Loader générique | `frontend/src/pages/ClientDetail.jsx` | 704 | Motif loader générique : `\banimate-spin\b` |
| P2 | Loader générique | `frontend/src/pages/ClientNew.jsx` | 138 | Motif loader générique : `\banimate-spin\b` |
| P2 | Loader générique | `frontend/src/pages/MyUsage.jsx` | 42 | Motif loader générique : `>\s*Chargement\.\.\.\s*<` |
| P2 | Loader générique | `frontend/src/pages/Onboarding.jsx` | 227 | Motif loader générique : `\banimate-spin\b` |
| P2 | Loader générique | `frontend/src/pages/Parametres.jsx` | 91 | Motif loader générique : `\banimate-spin\b` |
| P2 | Message technique | `frontend/src/pages/PublicDocumentUpload.jsx` | 71 | Motif technique détecté : `err\.message` |
| P2 | Loader générique | `frontend/src/pages/ReachDashboard.jsx` | 47 | Motif loader générique : `>\s*Chargement\.\.\.\s*<` |
| P2 | Loader générique | `frontend/src/pages/ReachProspectDetail.jsx` | 108 | Motif loader générique : `\banimate-spin\b` |
| P2 | Loader générique | `frontend/src/pages/ReachProspectDetail.jsx` | 158 | Motif loader générique : `\banimate-spin\b` |
| P2 | Loader générique | `frontend/src/pages/ReachProspectDetail.jsx` | 168 | Motif loader générique : `\banimate-spin\b` |
| P2 | Loader générique | `frontend/src/pages/ReachProspectDetail.jsx` | 300 | Motif loader générique : `\banimate-spin\b` |
| P2 | Loader générique | `frontend/src/pages/ReachSearch.jsx` | 92 | Motif loader générique : `\banimate-spin\b` |

## Limites

- L'audit statique ne remplace pas `npm run build`, `npm run test` ni la QA navigateur.
- Les P2 signalent des points à revoir manuellement, pas forcément des bugs bloquants.
