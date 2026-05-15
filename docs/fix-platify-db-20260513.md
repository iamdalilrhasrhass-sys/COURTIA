# Fix Platify DB — 13 mai 2026 05:35

## Problème
Le DATABASE_URL dans `/root/platify-api/.env` contenait un mot de passe incorrect, rendant tous les endpoints DB inopérants (PrismaClientInitializationError).

## Cause des 148k redémarrages
Chaque requête entrante sur un endpoint DB déclenchait l'erreur Prisma → crash → PM2 restart → boucle infinie.

## Correction
- Backup : `/root/platify-api/.env.backup-20260513`
- Correction : mot de passe PostgreSQL aligné avec le vrai credentials du user `femyapp`
- Redémarrage : `pm2 restart platify-api --update-env`

## Vérification

| Test | Résultat |
|------|----------|
| GET /api/health | ✅ `{"status":"ok"}` |
| GET /api/scans/remaining + x-device-id | ✅ `{"remaining":1,"total":1,"isPremium":false}` |
| pm2 status | ✅ online, 0 unstable restarts |
| Logs | ✅ Propres (flushed) |

## Fichiers modifiés
- `/root/platify-api/.env` — DATABASE_URL corrigé
- `/root/platify-api/.env.backup-20260513` — backup avant correction

## Non touché
- snapfit-api
- Courtia, Femynia, Embyr, Meltbook
- Nginx
- DNS
- Certbot
