# COURTIA — Audit Landing Phase 2

- Date : 2026-05-01 18:45:48
- Statut : OK
- Fichier landing : `frontend/src/pages/LandingPublic.jsx`

## Sections attendues

| Section | Marqueur | Statut |
|---|---|---|
| `hero` | Le cockpit IA des courtiers qui veulent reprendre le controle | OK |
| `credibilite` | CRM metier courtage | OK |
| `probleme` | Les courtiers ne manquent pas de clients | OK |
| `cout-invisible` | pertes invisibles | OK |
| `solution` | COURTIA transforme votre portefeuille en cockpit d'actions | OK |
| `ark` | ARK ne remplace pas le courtier | OK |
| `workflow` | Une journee plus claire | OK |
| `cockpit` | Apercu produit | OK |
| `fonctionnalites` | CRM clients | OK |
| `avant-apres` | Avant COURTIA | OK |
| `crm-metier` | CRM generaliste | OK |
| `pricing` | 159 EUR HT/mois | OK |
| `reassurance` | courtiers francais | OK |
| `faq` | COURTIA remplace-t-il | OK |
| `cta-final` | Reprenez le controle de votre portefeuille | OK |

## Anciens logos

- Aucun ancien `C` texte detecte dans les mockups cibles.

## CTA et routes

| Lien | Route valide |
|---|---|
| `/` | OK |
| `/login` | OK |
| `/register` | OK |
| `/register?plan=pro` | OK |
| `mailto:contact@courtiark.fr` | OK |

## CTA obligatoires

| CTA | Statut |
|---|---|
| `/register` | OK |
| `/register?plan=pro` | OK |
| `/login` | OK |

## Discours essai Pro

| Marqueur | Statut |
|---|---|
| 0 EUR aujourd'hui | OK |
| carte pour activer | OK |
| Annulation possible en ligne | OK |
| 159 EUR HT/mois | OK |

## Routes referencees

- Routes React detectees : *, /, /abonnement, /academy, /academy/*, /admin, /admin/logs, /admin/subscriptions, /admin/support, /admin/system, /admin/users, /admin/users/:id, /analyses, /analytics, /billing, /browser-pilot, /capitia, /client/:id, /clients, /clients/:id, /clients/:id/edit, /clients/new, /contrats, /contrats/new, /dashboard, /documents, /landing, /login, /morning-brief, /onboarding, /paiement-annule, /paiement-succes, /parametres, /rapports, /reach, /reach/campaigns, /reach/campaigns/:id, /reach/inbox, /reach/map, /reach/prospects, /reach/prospects/:id, /reach/search, /reach/settings, /register, /taches, /tarifs, /upload/:token
- References legacy `/app/*` dans la landing : aucune

## Problemes

- Aucun probleme statique bloquant detecte par ce script.

## Limites

- Ce rapport ne remplace pas le build Vite, les tests React ni la verification navigateur desktop/mobile.
