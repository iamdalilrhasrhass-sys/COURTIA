# COURTIA — Render Deploy Fix

Date : 2 mai 2026

## 1) Contexte
Erreur reçue : deploy failed sur service Render `srv-d7561hsr85hc73a9c6i0` après commit `f1ce9d1`.

## 2) Vérifications effectuées
- `git show` du commit : modifications ciblées auth/error handler/login.
- Reproduction locale backend :
  - `npm install`
  - `node -c server.js`
  - `node -c src/controllers/authController.js`
  - `node -c src/middleware/errorHandler.js`
  - Résultat : OK
- Conclusion : pas de défaut syntaxique reproductible dans le code du commit.

## 3) Cause couverte côté code/config
Cause probable de fail déploiement Render monorepo :
- exécution potentielle à la racine sans script `start`/`build` adéquat.

Correction appliquée :
- `package.json` racine enrichi avec :
  - `postinstall`: installation deps backend prod
  - `build`: installation deps backend prod
  - `start`: lancement `node backend/server.js`

Objectif :
- rendre le repo déployable même si Render utilise la racine comme working dir.

## 4) Limite de validation
- Les logs Render du service `srv-d7561hsr85hc73a9c6i0` ne sont pas accessibles directement depuis Codex (dashboard authentifié).
- Une validation finale du statut deploy doit être faite dans Render dashboard.

## 5) Signal runtime observé (instance Render publique)
- `https://courtia.onrender.com/api/health` -> 200
- `POST /api/auth/register` -> 500 avec `getaddrinfo ENOTFOUND ...`
- Interprétation : instance active avec configuration DB invalide côté Render env (à corriger en dashboard).

## 6) Actions dashboard Render à exécuter
1. Ouvrir service `srv-d7561hsr85hc73a9c6i0`.
2. Vérifier Build/Start Command :
   - build : `npm run build` (ou `cd backend && npm install`)
   - start : `npm start` (ou `cd backend && node server.js`)
3. Vérifier `DATABASE_URL` (host résolvable).
4. Relancer un deploy manuel.
5. Vérifier logs de boot et `/api/health`.
