# COURTIA — Rapport QA

## QA Phase A — Production funnel Pro (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Vercel `/register?plan=pro` | ✅ OK | Browser in-app production | Page visible, titre Pro et CTA détectés |
| CTA Pro mobile/current viewport | ✅ OK | Screenshot production | `Activer mon essai Pro` visible dans le premier écran actuel |
| Bloc essai Pro | ✅ OK | Browser in-app production | `0 €`, `7 jours`, `annulation en ligne` visibles |
| Console Pro | ✅ OK | `tab.dev.logs` | 0 erreur |
| Vercel `/register` | ✅ OK | Browser in-app production | Funnel Starter premium visible |
| Vercel `/login` | ✅ OK | Browser in-app production | Page login visible, console 0 erreur |
| Login démo production | ✅ OK | Browser in-app production | Redirection vers `/dashboard` |
| Refresh dashboard | ✅ OK | Browser in-app production | Session conservée sur `/dashboard` |

### Décision Phase A
- P0 bloquant : non.
- Autorisation produit : passage à la landing premium 3D scroll.
- Limite restante : Admin Center à aligner séparément avec le backend `/api/admin/super/*`.

---

## QA Phase 3 — Auth / Pricing conversion (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Audit landing Python | ✅ OK | `python3 scripts/courtia_landing_audit.py` | Wording Pro et CTA valides |
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB non bloquant |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| `/register?plan=pro` local | ✅ OK | Browser in-app | “Activez votre cockpit Pro”, 0 EUR aujourd’hui, console 0 erreur |
| `/register?plan=pro` structure mobile | ✅ OK | Browser in-app | Panneau marque + essai compact + CTA visible dans le premier écran |
| `/register?plan=pro` CTA premier écran | ✅ OK | Browser in-app local | CTA “Activer mon essai Pro” visible sans scroll après compactage mobile |
| `/register` local | ✅ OK | Browser in-app | “Démarrez votre cockpit Starter”, 0 EUR aujourd’hui, 89 EUR HT/mois après essai |
| `/#pricing` local | ✅ OK | Browser in-app | Prix Pro premium, annulation en ligne visible, console 0 erreur |

## QA Phase 2 — Landing premium Codex (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Audit landing Python | ✅ OK | `python3 scripts/courtia_landing_audit.py` | 15 sections détectées, CTA valides, aucun ancien `C` texte |
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB non bloquant |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| `/` local | ✅ OK | Browser in-app `http://127.0.0.1:5174/` | Hero refait après rejet design, console 0 erreur |
| `/login` local | ✅ OK | Browser in-app | Page visible, console 0 erreur |
| `/register` local | ✅ OK | Browser in-app | Page visible, console 0 erreur |
| `/register?plan=pro` local | ✅ OK | Browser in-app | Badge Pro visible, console 0 erreur |
| Wording essai Pro | ✅ OK | Audit Python | `0 € aujourd’hui`, carte pour activer l’essai, annulation en ligne |

### Notes Phase 2
- Production non modifiée tant que le commit n’est pas poussé.
- Test production post-déploiement requis avant validation définitive Vercel.
- Admin Center non corrigé en Phase 2 : mismatch API documenté séparément.

## QA finale (1er mai 2026)

| Page | Desktop | Console | Logo | Erreurs | Statut |
|------|---------|---------|------|---------|--------|
| / (landing) | ✅ | 0 | ✅ | 0 | OK |
| /login | ✅ | 0 | ✅ | 0 | OK |
| /register?plan=pro | ✅ | 0 | ✅ | 0 | OK |
| /admin | ✅ (→login) | 0 | ✅ | 0 | Protégé |
| /admin/users | ✅ (→login) | 0 | ✅ | 0 | Protégé |
| /admin/system | ✅ (→login) | 0 | ✅ | 0 | Protégé |

### Routes backend testées
- `/api/health` → ✅ 200 OK
- `/api/admin/super/users` → ✅ 401 (protégé)
- `/api/admin/analytics` → ✅ 401 (protégé)

### Production
- Vercel : ✅ Déployé (courtia.vercel.app)
- VPS : ✅ PM2 online (courtia-api, hermes-gateway)
- API : ✅ Répond (health OK)
- DNS : ⚠️ courtiark.fr en parking Hostinger

### Console
- 0 erreur JavaScript sur toutes les pages testées

### Mobile responsive
- Landing : ✅ Pas de scroll horizontal
- Login : ✅ Formulaire lisible
- Register : ✅ Formulaire lisible

## QA Auth / Login (1er mai 2026)

| Test | Résultat | Preuve |
|---|---|---|
| Register nouvel utilisateur | ✅ OK | dalil.test.2026.01@courtia.fr créé, dashboard affiché |
| Login mauvais mot de passe | ✅ OK | "Email ou mot de passe incorrect." — message contextuel |
| Login bon mot de passe | ✅ OK | demo@courtia.fr → "Bonjour Test" — nouveau design premium |
| Dashboard après login | ✅ OK | Dashboard cockpit Aurora affiché |
| Refresh dashboard | ✅ OK | Utilisateur reste connecté |
| Console | ✅ OK | 0 erreur |
| Backend health | ✅ OK | PM2 online, API health OK |

### Problèmes restants
- P1 : DNS courtiark.fr non propagé
- P1 : Stripe LIVE non finalisé
- P2 : Tests admin E2E impossibles sans token super_admin
