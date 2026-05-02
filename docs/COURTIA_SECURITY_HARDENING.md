# COURTIA — Security Hardening

Date : 2 mai 2026

## Résumé
Posture sécurité renforcée sur les points critiques sans casser la prod.

## Ce qui a été renforcé
- JWT :
  - suppression des fallbacks faibles en production sur les routes/auth middlewares principaux,
  - centralisation via `backend/src/utils/jwtSecret.js`.
- Erreurs API :
  - suppression de plusieurs retours techniques bruts (`err.message`) sur routes critiques auth/dashboard/contrats/tâches,
  - messages fonctionnels côté API.
- Frontend :
  - aucune clé sensible ajoutée,
  - code-splitting routes secondaires pour limiter surface runtime.
- Secrets hygiene :
  - `.gitignore` étendu (env variants, clés, dumps),
  - script d’audit dédié `scripts/courtia_secret_audit.py`,
  - runbook de rotation `docs/COURTIA_SECRET_ROTATION_RUNBOOK.md`,
  - suppression du motif `sk_live` codé en dur dans `apiGatewayService`.

## Scan secrets (statique)
Commande utilisée :
`rg -n "sk_live|sk_test|whsec|ANTHROPIC_API_KEY|JWT_SECRET|DATABASE_URL|RENDER_API_KEY|private key|BEGIN RSA|BEGIN OPENSSH|password" ...`

Résultat :
- nombreuses occurrences historiques/documentaires et exemples,
- pas de nouvelle clé réelle injectée dans ce batch,
- aucun secret Stripe live codé en dur dans les services backend actifs.

## État actuel (mission Stripe test mode)
- P0 secret scan: levé.
- P1 restants: principalement docs legacy/samples historiques (rotation/documentation planifiée).

## Anti-vol réaliste
- Le frontend public reste inspectable par nature.
- La valeur défendable doit rester backend :
  - logique ARK,
  - scoring,
  - automatisations,
  - billing,
  - données.

## Recommandations immédiates
1. Garder repo privé + branch protection.
2. Activer secret scanning obligatoire.
3. Rotation des secrets potentiellement exposés historiquement (priorité JWT/DB/Render/Stripe).
4. Valider CORS prod strict (`courtia.vercel.app`).
5. Ajouter alerting sécurité (auth failures, rate-limit spikes, admin attempts).
