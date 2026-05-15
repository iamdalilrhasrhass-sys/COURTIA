# COURTIA 120 — DIAGNOSTIC DNS COMPLET
*15 mai 2026*

## ÉTAT ACTUEL

| Domaine | IP actuelle | Cible | Statut |
|---------|------------|-------|--------|
| courtiark.fr | 2.57.91.91 (Hostinger) | 72.62.187.63 (VPS) | ❌ KO |
| www.courtiark.fr | CNAME→courtiark.fr | idem | ❌ KO |
| app.courtiark.fr | NXDOMAIN | 72.62.187.63 (VPS) | ❌ KO |
| api.courtiark.fr | 72.62.187.63 | 72.62.187.63 | ✅ OK |

## ARCHITECTURE CIBLE (CLAUDE.md)

- **courtiark.fr** → landing page
- **app.courtiark.fr** → application React (Vite, port 4173)
- **api.courtiark.fr** → API backend (Express, port 9998)

## NGINX CONFIG (VPS)
- `courtia-frontend` : sert courtiark.fr www.courtiark.fr → `/root/courtia/frontend/dist` (SSL)
- `courtia-app` : sert app.courtiark.fr → proxy_pass localhost:4173 (HTTP only, pas SSL)
- `courtia-api` : sert api.courtiark.fr → proxy_pass localhost:9998 (SSL)

## CORRECTIONS DNS À FAIRE CHEZ HOSTINGER

```
Type A — courtiark.fr → 72.62.187.63
Type A — www.courtiark.fr → 72.62.187.63
Type A — app.courtiark.fr → 72.62.187.63
Type A — api.courtiark.fr → 72.62.187.63 (déjà OK)
```

## CORRECTIONS NGINX NÉCESSAIRES
- `courtia-app` : ajouter SSL (Let's Encrypt) pour app.courtiark.fr
- `courtia-api` : déjà OK (SSL api.courtiark.fr)

## VÉRIFICATION POST-DNS
1. dig A courtiark.fr → doit retourner 72.62.187.63
2. curl https://courtiark.fr → 200 (landing/landing page)
3. curl https://app.courtiark.fr → 200 (app React)
4. curl https://api.courtiark.fr/api/health → 200

## NOTE
Le DNS étant géré chez Hostinger, la modification doit être faite manuellement
dans l'interface Hostinger. Impossible de le faire depuis le VPS.
