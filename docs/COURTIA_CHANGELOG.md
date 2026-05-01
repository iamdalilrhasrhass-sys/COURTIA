# COURTIA — Changelog Mission 2M

## Batch 1 — Erreurs techniques (1er mai 2026)

**Commit** : ef7f4bb
**Message** : fix: replace remaining technical frontend errors with friendly French messages

### Fichiers modifiés (9)
- `frontend/src/stores/planStore.js`
- `frontend/src/stores/documentInboxStore.js`
- `frontend/src/stores/reachStore.js`
- `frontend/src/stores/authStore.js`
- `frontend/src/stores/browserPilotStore.js`
- `frontend/src/pages/PublicDocumentUpload.jsx`
- `frontend/src/pages/Documents.jsx`
- `frontend/src/pages/BrowserPilot.jsx`
- `frontend/src/components/Settings.jsx`

### Résumé
37 remplacements de `err.message` brut par des messages français contextualisés.
3 occurrences restantes avec fallback français sécurisé.

### Build : ✅ OK
### Production : ✅ Vercel OK

---

## Batch 0 — État de départ (1er mai 2026)
- Git clean ✅
- Build OK ✅
- Backend VPS online ✅
- PM2 online ✅
- API health OK ✅
