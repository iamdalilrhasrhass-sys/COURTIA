# Audit Platify / Snapfit — 13 mai 2026

## 1. ÉTAT ACTUEL PLATIFY

| Composant | Statut | Détail |
|-----------|--------|--------|
| **PM2** | ID 19, online | :3003, 87MB, 148k restarts, 8h uptime |
| **Codebase** | /root/platify-api | Express 5 + Prisma + Stripe, 1 fichier (src/index.js) |
| **Base de données** | platify | PostgreSQL, 3 tables (User=3 rows, Scan, _prisma_migrations) |
| **Stripe** | Live | Prix mensuel/annuel configurés, webhook actif |
| **Domaine** | platify.app | Cloudflare (104.21.73.81), page HTML statique |
| **API domaine** | api.platify.app | Nginx OK → :3003 mais DNS MANQUANT |
| **SSL** | ❌ Aucun | Pas de cert pour api.platify.app |
| **Endpoints DB** | ❌ CASSÉS | Erreur PrismaClientInitializationError : mot de passe DB faux |
| **Health** | ✅ | /api/health répond OK (pas de DB) |

### Architecture API actuelle

```
GET  /api/health            → OK (sans DB)
GET  /api/scans/remaining   → CASSÉ (Prisma auth failed)
POST /api/scans             → CASSÉ
POST /api/checkout/create   → CASSÉ (Stripe OK, DB auth failed avant)
POST /api/stripe/webhook    → OK (raw body, pas d'auth device)
```

### Problème critique : mot de passe DB

Le `.env` contient un mot de passe **incorrect** :
- Fichier : `/root/platify-api/.env`
- Erreur : `VotreBaseDeDonnees2026!` au lieu du vrai mot de passe
- Conséquence : TOUS les endpoints nécessitant la DB retournent une erreur Prisma
- Le process ne crash pas (Express 5 gère les erreurs async), mais l'API est inutilisable

## 2. ÉTAT ANCIEN SNAPFIT

| Composant | Statut | Détail |
|-----------|--------|--------|
| **PM2** | ID 18, online | :3001, 68MB, 4 restarts, 2h uptime |
| **Codebase** | /root/snapfit-api | Fastify + Supabase + Redis/BullMQ + AWS R2 + Anthropic + Gemini |
| **Fichiers** | 8 modules | server.ts, routes/scan.ts, routes/profile.ts, services/ai.ts, services/anthropic.ts, middleware/auth.ts, middleware/rateLimit.ts, workers/scanWorker.ts |
| **Base de données** | snapfit | PostgreSQL, 2 tables (profiles=0, scans=0) — VIDE |
| **Apps/** | VIDE | Dossiers landing/ et mobile/ existent mais 0 fichiers |
| **Supabase** | Migration | Schéma complet : profils, scans, enums, RLS |
| **Render** | Config | render.yaml : 2 services (web + worker) |
| **Ecosystem** | PM2 config | max_restarts: 10, restart_delay: 5s |
| **Domaine** | snapfit.app | AWS ELB (ap-southeast-1) — plus sous notre contrôle |
| **Domaine** | snapfit.xyz | 13.248.169.48 — plus sous notre contrôle |
| **Domaine** | snapfit.fr | EXPIRÉ (AFNIC NOT FOUND) |

### Dépendances Snapfit non présentes dans Platify
- Anthropic SDK (analyse IA)
- Google Gemini (vision IA)
- AWS S3/R2 (stockage images)
- BullMQ + Redis (file d'attente workers)
- Supabase (auth + DB)
- Fastify (framework HTTP)
- UUID

## 3. CAUSE DES 148K REDÉMARRAGES

### Diagnostic confirmé

```
Log pattern : 600KB/jour de la ligne "Platify API → :3003"
             = ~24 000 redémarrages/jour
             = 1 redémarrage toutes les 3.5 secondes
             × 6 jours (7-12 mai) = ~144 000 → correspond aux 148k
```

**Cause probable : crash en boucle déclenché par du trafic externe**

1. Le process démarre → `app.listen(3003)` OK → écrit "Platify API → :3003"
2. Une requête arrive sur un endpoint DB → Prisma tente de se connecter avec le mauvais mot de passe
3. L'erreur PrismaClientInitializationError est levée dans le middleware
4. Express 5 attrape l'erreur, mais le comportement exact dépend de la version
5. Le process crash → PM2 restart → retour étape 1

**La boucle s'est arrêtée il y a ~8h** (le process actuel tient). Probablement parce que :
- Le trafic qui déclenchait les requêtes DB a cessé
- Ou le process a été redémarré manuellement avec un environnement corrigé temporairement

**Le problème PERSISTE** : tout endpoint DB appelé aujourd'hui casse encore. L'API est un zombie — vivante mais incapable de servir les vrais endpoints.

## 4. CE QUI EST RÉUTILISABLE POUR PLATIFY

| Actif | Provenance | Valeur |
|-------|-----------|-------|
| **Schéma Supabase** | snapfit-api | Structure profiles + scans + enums → adapter en Prisma |
| **Logique AI** | snapfit-api/services/ | Anthropic + Gemini → réintégrer dans Platify |
| **Worker scan** | snapfit-api/workers/ | BullMQ pour analyse asynchrone → adapter |
| **Middleware auth** | snapfit-api/middleware/ | JWT auth → plus robuste que device-id seul |
| **Middleware rateLimit** | snapfit-api/middleware/ | Rate limiting → critique pour mobile |
| **DB snapfit** | PostgreSQL | Base vide → migrer le schéma dans platify |
| **Prix Stripe** | platify-api | Déjà configurés avec vrais price IDs |
| **Nginx api.platify.app** | /etc/nginx/ | Config prête, ne manque que le DNS |

## 5. CE QUI DOIT ÊTRE RENOMMÉ

| Actuel | Nouveau | Priorité |
|--------|---------|----------|
| PM2 `snapfit-api` (ID 18) | Supprimer après migration | 🟡 |
| DB `snapfit` | Fusionner dans DB `platify` | 🟡 |
| `/root/snapfit-api/` | Archiver après extraction du code utile | 🟡 |
| snapfit.app / snapfit.xyz | Abandonner (plus sous contrôle) | 🟢 |
| Process bash :8082 (/tmp) | Supprimer | 🟢 |

## 6. CE QUI DOIT RESTER EN ATTENTE

- **DNS api.platify.app** — nécessite Cloudflare (platify.app est chez Cloudflare)
- **DNS www.platify.app** — idem
- **Certbot** — après DNS api.platify.app
- **Nettoyage snapfit-api** — après migration du code utile
- **Apps mobiles** — après stabilisation de l'API

## 7. PLAN D'ACTION — ARCHITECTURE CIBLE MOBILE

```
┌─────────────────────────────────────────────────────┐
│                 ARCHITECTURE PLATIFY                 │
├─────────────────────────────────────────────────────┤
│                                                     │
│  https://platify.app          Page marketing (CF)   │
│  https://api.platify.app      API REST (VPS :3003)  │
│  https://app.platify.app      Web app (futur)       │
│                                                     │
│  App Android ──────────┐                            │
│                        ├──→ api.platify.app         │
│  App iOS ──────────────┘                            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Phase 1 : CORRECTIF URGENT (maintenant)
1. **Corriger le mot de passe DB** dans `/root/platify-api/.env`
2. **Redémarrer platify-api** → `pm2 restart platify-api`
3. **Vérifier** tous les endpoints DB

### Phase 2 : DNS + SSL
4. Cloudflare : ajouter `api A 72.62.187.63` et `www CNAME platify.app`
5. `certbot --nginx -d api.platify.app`

### Phase 3 : FUSION SNAPFIT → PLATIFY
6. Extraire le code utile de snapfit-api :
   - `services/ai.ts` + `services/anthropic.ts` → analyse nutritionnelle
   - `workers/scanWorker.ts` → traitement asynchrone
   - `middleware/rateLimit.ts` → rate limiting
   - `middleware/auth.ts` → JWT auth (remplacer device-id)
7. Créer le schéma Prisma complet (profiles, scans, recettes)
8. Migrer la DB snapfit → platify
9. Ajouter les endpoints : analyse photo, profil utilisateur, recettes

### Phase 4 : MOBILE
10. Créer l'app React Native (Expo) dans `/root/platify-app/`
11. Connecter à api.platify.app
12. Auth JWT + Profil + Scan + Abonnement Stripe
13. Préparer les builds Android (AAB) et iOS (IPA)

### Phase 5 : NETTOYAGE
14. Arrêter PM2 snapfit-api → `pm2 delete snapfit-api`
15. Archiver `/root/snapfit-api/`
16. Supprimer le serveur bash :8082
17. Supprimer la DB snapfit
