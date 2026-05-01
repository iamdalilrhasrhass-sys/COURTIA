# COURTIA — Rapport QA

## QA Reprise architecture visuelle — Cockpit Aurora global (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| Shell privé Aurora | ✅ OK | Revue code | Aurore fixe + Bubble C canonique en filigrane |
| `/dashboard` non connecté | ✅ OK | In-app browser local | Redirection propre vers `/login?next=%2Fdashboard` |
| Landing locale | ✅ OK | In-app browser local | Hero et CTA détectés |
| Auth/backend/Stripe | ✅ OK | Revue diff | Aucun changement |

### Décision
- P0 bloquant : non.
- Prochaine étape recommandée : harmoniser les pages métier encore trop claires (`Clients`, `Contrats`, `Tâches`, `Rapports`, `Paramètres`) avec le shell Aurora.

---

## QA Reprise pages métier — Harmonisation Aurora cockpit (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| Pages métier | ✅ OK | Revue diff | Clients, Contrats, Tâches, Rapports, Paramètres alignés sur le shell |
| Auth/backend/Stripe | ✅ OK | Revue diff | Aucun changement |

### Décision
- P0 bloquant : non.
- Prochaine étape recommandée : QA production après déploiement Vercel, puis optimisation P2 du bundle.

---

## QA Reprise critique — Landing cinematic Aurora (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| Audit Python | ✅ OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1 |
| Ancien logo `>C<` | ✅ OK | `rg` ciblé | Aucun ancien logo texte dans la landing/mockups cibles |
| Liens cassés landing | ✅ OK | `rg` ciblé | Pas de `/contact`, pas de `/app/` dans la landing |
| Local `/` DOM | ✅ OK | In-app browser | Hero, CTA Pro, pricing et `0 €` détectés |
| Screenshot local | ⚠️ Partiel | In-app browser | Timeout CDP sur capture ; DOM, build et tests OK |
| Scène Aurora continue | ✅ OK | Revue code + build | Ciel Aurora fixe et Bubble C canonique en filigrane permanent |
| Logo performance | ✅ OK | Revue code | Animations internes désactivées quand `animated=false` |

### Décision
- P0 bloquant : non.
- Recommandation : pousser ce batch, puis valider Vercel production `/` après déploiement.

---

## QA Phase D — Cockpit interne (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| Browser local cockpit | ⚠️ Partiel | In-app browser | Login local bloqué par proxy Vite dev, pas par production |
| `/dashboard` production | ✅ OK | Browser in-app Vercel | Command Center visible, console 0 erreur |
| `/clients` production | ✅ OK | Browser in-app Vercel | Header Portefeuille clients visible, console 0 erreur |
| `/contrats` production | ✅ OK | Browser in-app Vercel | Header Portefeuille contrats visible, console 0 erreur |
| `/taches` production | ✅ OK | Browser in-app Vercel | Header Pilotage quotidien visible, console 0 erreur |

### Décision Phase D
- P0 local produit : non détecté par build/tests.
- Validation production cockpit : OK sur les routes principales.

---

## QA Phase C — Auth / Funnel final premium (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| `/register?plan=pro` local | ✅ OK | Browser in-app | Titre Pro, CTA Pro, console 0 erreur |
| `/register` local | ✅ OK | Browser in-app | Titre Starter, CTA Starter, console 0 erreur |
| `/login` local | ✅ OK | Browser in-app | Titre cockpit COURTIA, bouton login, console 0 erreur |
| `/register?plan=pro` production | ✅ OK | Browser in-app Vercel | CTA Pro visible, console 0 erreur |
| `/register` production | ✅ OK | Browser in-app Vercel | Starter visible, console 0 erreur |
| `/login` production | ✅ OK | Browser in-app Vercel | Login visible, console 0 erreur |
| Login démo production | ✅ OK | Browser in-app Vercel | `/dashboard`, refresh OK |
| Messages techniques auth | ✅ OK | `rg` ciblé | Pas de `err.message`, SQL, PostgreSQL, stack |

### Décision Phase C
- P0 bloquant : non.
- Prochaine étape : Phase D cockpit.

---

## QA Hotfix final — Rapports + logo canonique (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Logo canonique | ✅ OK | `cmp` | Le fichier Desktop est identique à la référence repo |
| Crash `/rapports` | ✅ Corrigé | Browser in-app production | Page visible après login demo, plus de page blanche |
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| Audit Python | ✅ OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1 |

---

## QA Phase H — Final (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend final | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend final | ✅ OK | `npm run test` | 29 tests passés |
| Audit Python final | ✅ OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1, 38 P2 |
| Backend health final | ✅ OK | `curl https://api.courtiark.fr/api/health` | HTTP 200 |
| Mauvais mot de passe UI | ✅ OK | Browser in-app | Message français propre |
| Login demo UI | ✅ OK | Browser in-app | Redirection `/dashboard` validée avant rate limit |
| Dashboard final | ✅ OK | Browser in-app | Page visible |
| Admin broker final | ✅ OK | Browser in-app | Accès refusé propre |
| Routes privées finales | ⚠️ Partiel | Browser in-app | Retest interrompu par rate limit après tentatives répétées ; Phase D prod validée |

---

## QA Hotfix final — Auth rate limit (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Message 429 auth | ✅ OK | Revue code `LoginPage.jsx` | Message français propre ajouté |
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |

---

## QA Phase G — SEO / Social (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| OG image PNG | ✅ OK | `sips` | 1200x630 |
| Manifest icons | ✅ OK | `sips` | 192x192 et 512x512 |
| Apple icon | ✅ OK | `sips` | 180x180 |
| Meta title | ✅ OK | `frontend/index.html` | `COURTIA — Le cockpit IA des courtiers` |
| Meta description | ✅ OK | `frontend/index.html` | Description courtier conforme |
| OG/Twitter image | ✅ OK | `frontend/index.html` | `https://courtia.vercel.app/og-courtia.png` |
| Production metas | ✅ OK | `curl https://courtia.vercel.app` | OG/Twitter PNG, manifest, canonical visibles |
| Production assets | ✅ OK | `curl -I` | OG PNG, icon 192, apple icon en HTTP 200 |

### Limite Phase G
- Preview LinkedIn réelle non testée dans l'outil LinkedIn.
- Metas volontairement pointées vers Vercel tant que le DNS `courtiark.fr` reste P1.

---

## QA Phase F — Audit Python (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Script QA Python | ✅ OK | `python3 scripts/courtia_qa_audit.py` | Rapport généré dans `docs/COURTIA_CODEX_QA_AUDIT.md` |
| P0/P1 statiques | ✅ OK | Audit Python | 0 P0/P1 |
| P2 statiques | ⚠️ À suivre | Audit Python | 38 signaux de finition : loaders génériques, `err.message`, libellés techniques admin |
| Composants Aurora | ✅ OK | Audit Python | Tous les composants requis détectés |
| Routes React | ✅ OK | Audit Python | Routes réelles listées, pas de P1 `/app/*` |
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |

### Décision Phase F
- P0 bloquant : non.
- P1 bloquant : non.
- Les P2 sont documentés comme finitions futures, pas comme blocage de livraison.

---

## QA Phase E — Admin Center aligné (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| Routes admin frontend | ✅ OK | `rg` ciblé | Pages actives alignées sur `/api/admin/super/*` |
| Route `/app/dashboard` | ✅ OK | `rg` ciblé | Suppression de la redirection cassée |
| Backend health | ✅ OK | `curl https://api.courtiark.fr/api/health` | HTTP 200 |
| `/admin` local non connecté | ✅ OK | Browser in-app | Redirection vers `/login`, console 0 erreur |
| `/admin` production broker | ✅ OK | Browser in-app Vercel | Écran "Admin Center protégé", console 0 erreur |
| Endpoint `/api/admin/super/analytics` sans token | ✅ OK | `curl` | HTTP 401 attendu |
| Impersonation | ✅ OK | Revue code | Aucun bouton ni JWT d'impersonation ajouté |

### Limites Phase E
- Test super_admin réel non exécuté : token super_admin absent.
- Non connecté en production non retesté dans une session vierge, car le navigateur in-app partage la session broker ; le code et le test local redirigent bien vers `/login`.

---

## QA Phase B — Landing 3D scroll premium (1er mai 2026)

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | ✅ OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | ✅ OK | `npm run test` | 29 tests passés |
| Audit landing Python | ✅ OK | `python3 scripts/courtia_landing_audit.py` | Sections, CTA, anciens logos, routes OK |
| Hero local | ✅ OK | Browser in-app | CTA visible, console 0 erreur |
| Pricing local | ✅ OK | Browser in-app | Starter et Pro retravaillés, console 0 erreur |
| Production `/` | ✅ OK | Browser in-app Vercel | Commit Phase B servi, hero visible, console 0 erreur |
| Production `/register?plan=pro` | ✅ OK | Browser in-app Vercel | CTA Pro et bloc 0 EUR visibles |
| Production `/register` | ✅ OK | Browser in-app Vercel | Funnel Starter visible |
| Production `/login` | ✅ OK | Browser in-app Vercel | Page login visible |
| Ancien logo texte | ✅ OK | Audit statique | Aucun `>C<` dans les mockups cibles |
| Liens landing | ✅ OK | Audit statique | `/register`, `/register?plan=pro`, `/login`, mailto |

### Décision Phase B
- P0 bloquant : non.
- Prochaine étape : Phase C Auth si finition funnel, ou Phase D cockpit si priorité plateforme interne.

---

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
