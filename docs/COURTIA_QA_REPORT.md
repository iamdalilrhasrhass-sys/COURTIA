# COURTIA — Rapport QA

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
