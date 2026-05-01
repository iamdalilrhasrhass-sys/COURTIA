# COURTIA — Rapport P0 Login

## 1. Problème constaté
- **URL testée** : https://courtia.vercel.app/login
- **Email testé** : demo@courtia.fr
- **Message affiché** : "Une erreur est survenue. Vérifiez vos identifiants."
- **Impact** : Bloquant — impossible de se connecter avec le compte demo

## 2. Cause exacte
- **Cause réelle** : Le mot de passe du compte demo@courtia.fr (id=9) était inconnu/différent de TestCourtia2026!
- **Ce qui n'était PAS en cause** :
  - Backend → répondait correctement (401 "Invalid email or password")
  - API URL → correcte (le register fonctionnait)
  - CORS → pas d'erreur CORS
  - JWT → le backend renvoie bien un token
  - Redirection dashboard → fonctionne (testé avec nouveau compte)
  - DB → le compte demo existait bien (id=9, broker, trialing)
  - Frontend → le flux d'inscription/login fonctionnait parfaitement avec un nouveau compte
- **Preuve** : curl backend → 401 "Invalid email or password" ; inscription nouveau compte → succès immédiat

## 3. Tests effectués
- ✅ Test inscription nouveau compte (dalil.test.2026.01@courtia.fr) → succès, dashboard affiché
- ✅ Test login backend curl avec demo@courtia.fr avant reset → 401 (mot de passe incorrect)
- ✅ Test login backend curl après reset → 200, token reçu
- ✅ Test login frontend demo@courtia.fr après reset → succès, dashboard "Bonjour Test"
- ✅ Dashboard accessible après login
- ✅ Console : 0 erreur
- ✅ Refresh dashboard : utilisateur reste connecté
- ✅ DB : compte demo id=9, role=broker, plan=trial, status=trialing

## 4. Correction appliquée
- **Fichiers modifiés** : Aucun. Reset du password_hash en base de données uniquement.
- **Compte test réinitialisé** : demo@courtia.fr (id=9)
- **Rôle** : broker
- **Statut** : trialing (essai)
- **Mot de passe de test confirmé** : TestCourtia2026!

## 5. Résultats finaux
- ✅ Login production : fonctionne avec demo@courtia.fr / TestCourtia2026!
- ✅ Dashboard accessible : "Bonjour Test" après connexion
- ✅ Console : 0 erreur
- ✅ Backend health : online, API OK
- ✅ PM2 : courtia-api online, hermes-gateway online
- ✅ Vercel : déployé, accessible

## 6. Commandes importantes
```bash
# Health check
ssh root@72.62.187.63 "pm2 status && curl -s http://127.0.0.1:9998/api/health"

# Test login backend (avant correction)
curl -s -X POST http://127.0.0.1:9998/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@courtia.fr","password":"TestCourtia2026!"}'
# → 401 "Invalid email or password"

# Test login backend (après correction)
# → 200, token reçu, "Login successful"

# Build frontend
cd /root/courtia/frontend && npm run build

# Git
cd /root/courtia && git status --short
git add docs/
git commit -m "docs: document P0 login diagnosis and test account"
git push origin main
```

## 7. Commits
- **hash** : À venir (commit docs)
- **message** : docs: document P0 login diagnosis and test account

## 8. Reste à faire
- **P0** : Aucun
- **P1** : DNS courtiark.fr, Stripe LIVE, token super_admin pour tests admin E2E
- **P2** : Aurora finitions, mobile responsive complet

## 9. Conclusion honnête
- ✅ Login réparé : OUI
- ✅ Compte demo utilisable : OUI (demo@courtia.fr / TestCourtia2026!)
- ✅ Inscription utilisable : OUI (testé avec dalil.test.2026.01@courtia.fr)
- ✅ COURTIA testable par Dalil : OUI

**Cause réelle** : Simple mismatch de mot de passe sur le compte demo. Le flux d'authentification (register, login, JWT, redirection, dashboard, refresh) fonctionne parfaitement. Aucun bug code. Aucune correction de code nécessaire.
