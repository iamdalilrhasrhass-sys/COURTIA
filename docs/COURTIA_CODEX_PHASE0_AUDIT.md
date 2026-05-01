# COURTIA — Audit Phase 0 Codex 2M

Date : 1er mai 2026
Base auditee : `origin/main` a `475f305`
Worktree local : `/Users/dalilrhasrhass/Documents/Codex/courtia-origin-main`

## 1. Etat Git

- Worktree audite : clean.
- Dernier commit audite : `475f305 docs: document auth premium redesign and P0 login resolution`.
- Branche de travail locale creee apres audit : `codex/courtia-2m`.
- Note importante : le clone Desktop historique `/Users/dalilrhasrhass/Desktop/DOC'S/01_COURTIA_ARK/COURTIA` etait diverge de `origin/main` et non clean. Il n'est pas utilise pour la suite.
- Acces `/root/courtia` : indisponible depuis cette session locale.
- SSH VPS `root@72.62.187.63` : refuse (`publickey,password`), y compris avec la cle locale `courtia_vps`.

## 2. Build, Syntaxe, Tests

| Verification | Resultat | Preuve |
|---|---:|---|
| `git status --short` | OK | aucun fichier modifie avant rapport |
| `git log --oneline -15` | OK | dernier commit `475f305` |
| `frontend npm ci` | OK | dependances installees proprement |
| `frontend npm run build` | OK | build Vite OK, 1884 modules |
| `backend node -c server.js` | OK | syntaxe valide |
| `frontend npm run test` | OK | 1 fichier, 29 tests passes |

Warnings :
- Frontend : chunk principal `536.28 kB`, a optimiser par code-splitting.
- Frontend audit prod deps : 2 vulnerabilites (`follow-redirects` moderate, `lodash` high).
- Backend audit prod deps : 8 vulnerabilites, dont `xlsx`, `imap-simple`, `tar`, `@anthropic-ai/sdk`.

## 3. Production connue

| URL | Status HTTP | Commentaire |
|---|---:|---|
| `https://courtia.vercel.app/` | 200 | index Vercel servi |
| `https://courtia.vercel.app/login` | 200 | index Vercel servi |
| `https://courtia.vercel.app/register` | 200 | index Vercel servi |
| `https://courtia.vercel.app/register?plan=pro` | 200 | index Vercel servi |
| `https://courtia.vercel.app/dashboard` | 200 | index Vercel servi |
| `https://courtia.vercel.app/app/dashboard` | 200 | index Vercel servi, mais route React inexistante |
| `https://courtia.vercel.app/admin` | 200 | index Vercel servi |
| `https://api.courtiark.fr/api/health` | 200 | backend health OK |
| `https://api.courtiark.fr/health` | 200 | backend health OK |
| `https://courtia.vercel.app/api/health` | 200 | rewrite/proxy API OK |

Important : un 200 Vercel sur une route SPA ne prouve pas que la route React existe. Le code React ne declare pas `/app/dashboard`.

## 4. Routes reelles verifiees

Routes publiques React :
- `/`
- `/login`
- `/register`
- `/landing`
- `/tarifs`
- `/upload/:token`
- `/onboarding`

Routes privees React :
- `/dashboard`
- `/clients`
- `/clients/new`
- `/client/:id`
- `/clients/:id`
- `/clients/:id/edit`
- `/contrats`
- `/contrats/new`
- `/taches`
- `/rapports`
- `/parametres`
- `/academy`
- `/academy/*`
- `/documents`
- `/browser-pilot`
- `/morning-brief`
- `/capitia`
- `/analytics`
- `/analyses`
- `/abonnement`
- `/billing`
- `/paiement-succes`
- `/paiement-annule`
- `/reach`
- `/reach/search`
- `/reach/prospects`
- `/reach/prospects/:id`
- `/reach/campaigns`
- `/reach/campaigns/:id`
- `/reach/inbox`
- `/reach/map`
- `/reach/settings`

Routes Admin React :
- `/admin`
- `/admin/users`
- `/admin/users/:id`
- `/admin/subscriptions`
- `/admin/system`
- `/admin/logs`
- `/admin/support`

Routes demandees mais non declarees :
- `/app/dashboard`
- `/app/clients`
- `/app/contrats`
- `/app/taches`
- `/app/rapports`
- `/app/settings`
- `/settings`

Correspondances actuelles :
- `/app/dashboard` doit devenir `/dashboard` ou etre ajoute en alias.
- `/app/settings` correspond aujourd'hui a `/parametres`.

## 5. Probleme Admin `/api/admin/analytics` vs `/api/admin/super/*`

Le backend monte deux familles Admin :

```js
app.use('/api/admin', verifyToken, adminCostsRouter)
app.use('/api/admin/super', adminSuperAdminRouter)
```

Les routes `adminCostsRouter` exposent seulement :
- `/api/admin/costs`
- `/api/admin/costs/by-user`
- `/api/admin/costs/export`
- `/api/admin/quota-status/:userId`

Les routes proprietaires super admin exposent en realite sous `/api/admin/super/*` :
- `/api/admin/super/users`
- `/api/admin/super/users/:id`
- `/api/admin/super/analytics`
- `/api/admin/super/impersonation/logs`
- `/api/admin/super/iobsp/pending`
- `/api/admin/super/iobsp/:userId`

Or le frontend Admin appelle :
- `/api/admin/analytics`
- `/api/admin/users`
- `/api/admin/users/:id`
- `/api/admin/impersonation/logs`

Impact :
- Sans token, les deux familles repondent 401, ce qui masque le probleme.
- Avec un token super_admin valide, `/api/admin/analytics` passera le premier `verifyToken`, puis ne trouvera aucune route dans `adminCostsRouter`, et ne matchera pas `/api/admin/super`.
- Resultat probable : AdminRoute refusera l'acces ou les pages Admin afficheront des etats vides/erreur meme pour un super_admin valide.
- Correction recommandee en Phase 5 : aligner le frontend sur `/api/admin/super/*` ou remonter le routeur super admin sous `/api/admin`. Ne pas reactiver l'impersonation.

## 6. Impersonation

Etat verifie :
- Le service `backend/src/services/impersonationService.js` est un stub securise.
- `startImpersonation` jette une erreur 501.
- Aucun JWT d'impersonation n'est genere.
- Aucune session d'impersonation reelle n'est ouverte.

Decision :
- Ne pas reactiver l'impersonation.
- Ne pas generer de JWT d'impersonation.
- Les routes peuvent rester visibles comme logs historiques, mais les actions actives doivent rester bloquees.

## 7. Identite visuelle Aurora

Composants existants :
- `CourtiaBubbleLogo`
- `CourtiaMiniLogo`
- `CourtiaLogoLoader`
- `CourtiaWordmark`
- `AuroraButton`
- `AuroraCard`
- `AuroraDivider`
- `AuroraEmptyState`
- `AuroraPageHeader`
- `AuroraBackground`
- `AuroraHalo`
- `AuroraTransition`

Ancien logo restant :
- `frontend/src/components/FloatingProductMockup.jsx` : lettre `C` dans un carre degrade.
- `frontend/src/components/DashboardMockup.jsx` : lettre `C` dans un carre degrade.

Conclusion :
- La marque Aurora est installee.
- Le fil visuel est bon sur landing/auth/dashboard.
- Des incoherences restent sur les mockups, Reach, Billing/Pricing, Academy et quelques pages metier historiques.

## 8. Scores pages

| Page | Visuel /10 | Business /10 | Confiance /10 | Observations |
|---|---:|---:|---:|---|
| Landing | 8.5 | 8.5 | 8 | Longue, premium, claire ; ancien C dans mockup, lien `/contact` non declare |
| Login | 8 | 8 | 8 | Premium, sombre, coherent ; a retester en E2E |
| Register | 8 | 8 | 8 | Plan Pro visible, essai 7 jours OK |
| Dashboard | 8 | 7.5 | 6.5 | Cockpit convaincant, mais chiffres hardcodes |
| Clients | 7.5 | 7.5 | 7 | Bonne table, harmonisation encore partielle |
| Fiche client | 7.5 | 8 | 6.5 | Riche metier, fichier tres lourd |
| Contrats | 7.2 | 7 | 7 | Fonctionnel, a rendre plus cockpit |
| Taches | 7.2 | 7 | 7 | Utile, style encore mixte |
| Rapports | 7 | 7 | 6.5 | Potentiel executive, narration a renforcer |
| Parametres | 6.8 | 6.5 | 7 | Propre mais pas encore premium |
| ARK Reach | 7 | 7.5 | 6.5 | Parcours present, style violet historique par endroits |
| Admin | 6 | 7 | 4 | UI presente, routes API probablement cassees |

## 9. P0, P1, P2

### P0

1. Verifier login demo en Phase 1.
   - Si `demo@courtia.fr` / `TestCourtia2026!` ne fonctionne pas, stopper la refonte et corriger l'auth avant tout.

2. Corriger ou confirmer Admin Center avant de le declarer pret.
   - Mismatch actuel : frontend `/api/admin/*`, backend super admin `/api/admin/super/*`.
   - Redirection interdite actuelle : `AdminRoute` redirige vers `/app/dashboard`, route React absente.

3. Ne pas baser les tests ou la documentation sur `/app/*`.
   - Les routes reelles sont `/dashboard`, `/clients`, `/contrats`, `/taches`, `/rapports`, `/parametres`.

### P1

1. Supprimer les deux anciens logos `C` dans les mockups landing.
2. Remplacer les chiffres hardcodes visibles dans le Dashboard par des donnees reelles ou des etats explicitement vides.
3. Harmoniser les endpoints Admin frontend vers `/api/admin/super/*`.
4. Ajouter une route ou retirer le CTA `/contact` de la landing.
5. Finaliser DNS `courtiark.fr`.
6. Obtenir un token ou compte `super_admin` pour QA Admin E2E.
7. Corriger les messages techniques restants cote frontend (`err.message`, `error.message`, console errors visibles).
8. Traiter les vulnerabilites npm sans modification breaking non maitrisee.

### P2

1. Code splitting frontend pour reduire le chunk principal.
2. Harmonisation Aurora sur Reach, Academy, Billing/Pricing et pages historiques.
3. Tests responsive complets sur toutes les pages metier.
4. OG image PNG pour compatibilite LinkedIn si le SVG preview est mal rendu.
5. Nettoyage des composants candidats inutilises apres verification d'usage.
6. Renforcer les docs pour distinguer `courtia.vercel.app`, `courtiark.fr` et `api.courtiark.fr`.

## 10. Plan recommande

Batch 1 : Tests reels avant recode
- Landing, login, mauvais mot de passe, register, register Pro, dashboard refresh, admin refuse.
- Utiliser les routes reelles, pas `/app/*`, sauf pour documenter leur absence.

Batch 2 : Landing
- Supprimer anciens logos `C`.
- Verifier CTA et routes.
- Garder l'univers Aurora sans surcharger.

Batch 3 : Auth
- Retester login/register.
- Garder messages francais propres.
- Ne pas casser le stockage `courtia_token`.

Batch 4 : Plateforme interne
- Dashboard : supprimer hardcodes trompeurs.
- Pages metier : harmoniser Aurora, loaders, empty states, erreurs.

Batch 5 : Admin/Securite percue
- Aligner endpoints `/api/admin/super/*`.
- Corriger redirection `/app/dashboard`.
- Tester refus broker et non connecte.
- Ne pas reactiver impersonation.

Batch 6 : QA Python
- Generer `docs/COURTIA_CODEX_QA_AUDIT.md`.
- Scanner logos, routes, messages techniques, loaders, TODO/FIXME, docs.

Batch 7 : SEO / marque
- Verifier favicon, apple touch icon, OG/Twitter.
- Ne pas toucher Stripe.

Batch 8 : Tests finaux
- Build, tests, routes, backend health, login, admin.
- SSH VPS seulement si acces disponible.

Batch 9 : Documentation finale
- Mettre a jour changelog, QA, remaining tasks, design system, admin center et rapport final Codex.

## 11. Conclusion Phase 0

COURTIA est plus avance que le premier clone local ne le montrait. La base distante `475f305` contient deja une landing premium, un auth premium, un dashboard Aurora, un Admin Center frontend et des docs importantes.

Le risque principal n'est pas la landing ni le login a ce stade : c'est l'ecart entre ce que les docs declarent comme admin pret et ce que le code montre pour les endpoints Admin. La Phase 1 doit verifier l'auth reel, puis la Phase 5 devra corriger proprement l'Admin Center sans toucher Stripe ni reactiver l'impersonation.

