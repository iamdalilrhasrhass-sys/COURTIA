# COURTIA — Rapport QA

## QA initiale (1er mai 2026, avant mission)

| Page | Desktop | Mobile | Console | Logo | Erreurs | Statut |
|------|---------|--------|---------|------|---------|--------|
| / | ✅ | ✅ | ✅ | ✅ | 0 | OK |
| /login | ✅ | ✅ | ✅ | ✅ | 0 | OK |
| /register | ✅ | ✅ | ✅ | ✅ | 0 | OK |
| /app/dashboard | ✅ | ⚠️ | ✅ | ✅ | 0 | OK |
| /admin | ❌ | ❌ | - | - | 404 | En construction |

### Routes backend testées
- `/api/health` → ✅ 200 OK
- `/api/admin/super/users` → ✅ 401 (protégé)
- `/api/admin/analytics` → ✅ 401 (protégé)

### Production
- Vercel : ✅ Déployé
- VPS : ✅ PM2 online
- API : ✅ Répond

*Ce rapport sera mis à jour après chaque batch.*
