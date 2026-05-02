# COURTIA — Secret Rotation Runbook

Date: 2 mai 2026

## 1) Objectif
Ce runbook décrit la rotation des secrets sensibles avant activation du tunnel Stripe test mode.
Il ne contient aucune valeur réelle.

## 2) Secrets concernés
- `JWT_SECRET`
- `DATABASE_URL`
- `RENDER_API_KEY` (si encore utilisé)
- `STRIPE_SECRET_KEY_TEST`
- `STRIPE_WEBHOOK_SECRET_TEST`
- `ANTHROPIC_API_KEY` (phase ultérieure)

## 3) Pré-requis
- Accès au gestionnaire de variables d'environnement (VPS/PM2, Vercel).
- Fenêtre de maintenance planifiée.
- Sauvegarde de la configuration actuelle (sans exporter les valeurs en clair dans le repo).

## 4) Procédure J0
1. Générer de nouvelles valeurs fortes.
2. Mettre à jour les variables d'environnement du backend officiel (`api.courtiark.fr`).
3. Redémarrer le service backend (`pm2 restart courtia-api`).
4. Vérifier:
   - `GET /api/health` -> 200
   - login demo -> 200
   - `/api/portfolio/morning-brief` -> 200
5. Mettre à jour, si nécessaire, les variables non sensibles côté frontend.
6. Révoquer les anciennes clés immédiatement après validation.

## 5) Procédure J+1
- Vérifier les logs backend:
  - absence d'erreurs auth massives,
  - absence d'erreurs DB de connexion,
  - absence de webhook Stripe invalide (quand test mode actif).
- Vérifier les endpoints critiques en lecture.

## 6) Procédure J+7
- Relancer l'audit automatique:
  - `python3 scripts/courtia_secret_audit.py`
- Revue manuelle des fichiers docs/scripts legacy.
- Clôturer les actions restantes dans `COURTIA_SECRET_ROTATION_CHECKLIST.md`.

## 7) Règles strictes
- Ne jamais committer `.env`.
- Ne jamais envoyer de clé en clair dans Slack/email/chat.
- Ne jamais stocker de secret dans le frontend.
- Ne jamais réutiliser des clés potentiellement exposées.

## 8) Plan de rollback
Si incident après rotation:
1. Restaurer la dernière configuration env validée (vault/secret manager).
2. Redémarrer backend.
3. Vérifier `GET /api/health`.
4. Ouvrir un incident de sécurité et analyser la cause.
