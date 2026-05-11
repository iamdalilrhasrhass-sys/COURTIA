# Récap ultra complet — COURTIA / ARK V1
*(Sauvegardé le 9 Mai 2026)*

## 1. Point de départ
Au début, COURTIA était déjà une base solide, mais pas encore une V1 réellement vendable / démontrable.
Les problèmes principaux étaient :
- certaines briques étaient seulement “prêtes à connecter” ;
- le rôle admin Dalil avait une incohérence entre admin et super_admin ;
- PM2 pointait à un moment vers une mauvaise logique DB / ancien contexte ;
- certains modules étaient fonctionnels mais pas assez “no fake” ;
- l’import client pouvait casser les accents ;
- certains empty states React pouvaient planter ;
- ARK était encore trop proche d’un assistant “chat” au lieu d’un vrai moteur métier proactif ;
- l’identité Aurora / 3D / cockpit premium devait être renforcée partout.
Objectif : aller au bout de la V1, sans tourner en rond, jusqu’à une version démontrable à un courtier.

## 2. Modèle / mode utilisé dans Codex
- Modèle : 5.5
- Niveau d’intelligence : Très approfondi
- Objectif : Giga-prompts très cadrés avec validations obligatoires, migrations réversibles, design premium, admin Dalil vérifié à chaque étape.

## 3. Grande stratégie imposée
- Jamais de commit direct sur main sauf hotfix explicite.
- Tests complets (backend/frontend/build/lint).
- Jamais de faux actif pour Google, WhatsApp, Yousign, Stripe, SMS, email ou IA.
- Admin Dalil toujours vérifié.

## 4 à 16. PRs Livrées (Foundations à V1 Launch Ready)
- Feature flags, sécurité, Aurora UI.
- Onboarding, gestion d'équipe.
- Billing Stripe (webhook idempotent).
- Google Sync (Gmail/Calendar).
- Documents DDA / FIC / Mandat.
- Yousign API (Signature électronique).
- Commissions courtier.
- WhatsApp Business Cloud API.
- ARK V1 Proactif (score risque, recommandations, Morning Brief).
- Notifications, Cmd+K, Templates.
- Pages publiques juridiques et sécurité.
- Hardening Aurora UI (Cockpit).

## 17. Hotfix admin Dalil
- Incohérence admin/super_admin corrigée.
- Startup check DB / PM2 verrouillé sur `crm_assurance`.
- **Règle absolue :** `pm2 restart courtia-api --update-env` (jamais `reload`).

## 18 & 19. Sprint Fermeture V1 & Pré-démo
- Import CSV premium réparé (UTF-8, accents).
- Crash React sur Empty States corrigé.
- Quotas, observabilité, CGU/CGV structurées.
- Script démo préparé.

## 20. État actuel réel
- Frontend : `https://courtia.vercel.app` (READY)
- Backend : `https://api.courtiark.fr/api` (OK)
- DB : `crm_assurance`
- Admin Dalil : Validé.

## 21. Ce qu’ARK est devenu
Moteur métier proactif COURTIA. Ne ment pas : affiche "IA prête" ou "mode local". Prépare le terrain, le courtier décide.

## 22. Priorités post-Codex (Terrain)
1. Brancher les vraies clés (Resend, SMS, Anthropic, Stripe Prod).
2. **Tester avec un vrai courtier** (Import Excel, tests DDA/FIC, démonstration ARK).
3. Validation juridique des CGU/CGV/DPA.
4. Nettoyage technique post-feedback.

## 23. Verdict
**COURTIA V1 PRÉ-DÉMO CLIENT VALIDÉE.**
Le prochain cap : Démo avec un vrai courtier + vrai fichier client + retours terrain.