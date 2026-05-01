# COURTIA — Rapport QA Final Codex 2M

Date : 1er mai 2026

## Synthèse
- Build frontend : OK
- Tests frontend : OK, 29 tests passés
- Audit Python : OK, 0 P0/P1, 38 P2 documentés
- Backend health : OK, HTTP 200
- Landing / auth / dashboard / admin : validés en production
- SEO social : assets PNG servis en production

## Table finale

| Page | Desktop | Mobile | Console | Auth | Logo | Statut |
|---|---|---|---|---|---|---|
| `/` | OK | Partiel | 0 erreur | Public | Aurora | OK |
| `/login` | OK | Partiel | 0 erreur | Public | Aurora | OK |
| `/register` | OK | Partiel | 0 erreur | Public | Aurora | OK |
| `/register?plan=pro` | OK | Partiel | 0 erreur | Public | Aurora | OK |
| `/dashboard` | OK | Partiel | 0 erreur | Broker demo | Aurora | OK |
| `/clients` | OK Phase D | Partiel | 0 erreur Phase D | Broker demo | Aurora | OK Phase D |
| `/contrats` | OK Phase D | Partiel | 0 erreur Phase D | Broker demo | Aurora | OK Phase D |
| `/taches` | OK Phase D | Partiel | 0 erreur Phase D | Broker demo | Aurora | OK Phase D |
| `/rapports` | Corrigé local | Partiel | Build OK | Broker demo | Aurora | À retester prod après push |
| `/parametres` | Non retesté final | Partiel | Non retesté final | Rate limit final | Aurora | À retester |
| `/admin` | OK | Partiel | 0 erreur | Broker refusé | Aurora | Protégé |

## Parcours testés

| Test | Résultat | Preuve | Commentaire |
|---|---|---|---|
| Build frontend | OK | `npm run build` | Warning chunk > 500 kB connu |
| Tests frontend | OK | `npm run test` | 29 tests passés |
| Audit Python | OK | `python3 scripts/courtia_qa_audit.py` | 0 P0/P1, 38 P2 |
| Backend health | OK | `curl https://api.courtiark.fr/api/health` | HTTP 200 |
| Mauvais mot de passe UI | OK | Browser in-app | Message français : `Email ou mot de passe incorrect.` |
| Login demo UI | OK | Browser in-app | Redirection `/dashboard`, dashboard visible |
| Auth 429 | OK | Bundle prod | Message français présent dans le bundle Vercel |
| Admin broker | OK | Browser in-app | `Admin Center protégé`, console 0 erreur |
| SEO OG PNG | OK | `curl -I` | HTTP 200, `content-type: image/png` |
| Manifest / icons | OK | `curl` + `sips` | Icônes réelles servies |

## Incident de QA final
Les tests finaux répétés sur le compte demo ont déclenché la protection backend `429 too_many_attempts`.
Ce comportement est attendu côté sécurité. Le message frontend 429 a été corrigé dans le commit `2edad12`.

Impact :
- Le login demo a été validé avant le déclenchement du rate limit.
- Le dashboard a été validé après login.
- Les routes internes `/clients`, `/contrats`, `/taches` ont été validées en production en Phase D.
- `/rapports` a ensuite révélé un crash `AuroraEmptyState is not defined` ; le hotfix local ajoute les imports manquants et repasse build/tests.

## Risques restants
- Token super_admin absent : pas de test E2E propriétaire complet.
- Mobile complet toutes pages internes non exécuté avec viewport dédié.
- 38 P2 statiques restent à traiter progressivement.
- DNS `courtiark.fr` non propagé.
- Stripe LIVE / Billing non codé volontairement.
