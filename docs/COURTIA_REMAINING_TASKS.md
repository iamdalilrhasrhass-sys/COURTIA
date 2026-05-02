# COURTIA — Tâches restantes

## Terminé
- [x] Phase 0 Codex — Audit reprise 2M documenté
- [x] Phase 1 Codex — Tests production avant recode documentés
- [x] Phase 2 Codex — Landing premium étendue, audit Python, build et tests locaux
- [x] Phase 3 Codex — Register Pro / pricing conversion premium sans toucher Stripe
- [x] Phase 3 Codex — Register Starter premium aligné avec le funnel Pro
- [x] Phase A Codex — Funnel Pro validé en production Vercel
- [x] Phase B Codex — Landing 3D scroll premium locale, build/test/audit OK
- [x] Phase B Codex — Landing 3D scroll validée en production Vercel
- [x] Phase C Codex — Auth / funnel final local, build/test OK
- [x] Phase C Codex — Auth / funnel final validé en production Vercel
- [x] Phase D Codex — Cockpit interne batch 1, build/test OK
- [x] Phase D Codex — Cockpit interne validé en production Vercel
- [x] Phase E Codex — Admin Center aligné localement sur `/api/admin/super/*`
- [x] Phase E Codex — Admin Center validé en production broker : refus propre, console 0 erreur
- [x] Phase F Codex — Audit QA Python ajouté, 0 P0/P1 détecté
- [x] Phase G Codex — SEO/social corrigé avec OG PNG, manifest et icônes réelles
- [x] Hotfix final — Message 429 auth propre en français
- [x] Phase H Codex — Rapport final et QA finale documentés
- [x] Hotfix final — `/rapports` réparé et logo canonique documenté
- [x] Stabilisation auth/session — une erreur API secondaire ne supprime plus automatiquement la session
- [x] Stabilisation auth/session — helpers token `courtia_token` / `token` harmonisés
- [x] Stabilisation auth/session — rate limit auth backend adouci sans supprimer la sécurité
- [x] Landing Aurora — refonte en 3 actes continus autour de la Bubble C officielle
- [x] Hotfix code — Morning Brief portfolio compatible avec schéma DB sans `generated_at`
- [x] Hotfix code — Portfolio schema hardening pour `generated_at` / `health_score` absents et fallback Morning Brief local
- [x] P0 Vercel — Deployment Failed diagnostiqué (import AuroraTransition manquant sur ancien commit) et production revenue en `Ready`
- [x] Batch 0 — Vérification état de départ
- [x] Batch 1 — Erreurs techniques supprimées (37 remplacements)
- [x] Batch 2 — Admin Center frontend (7 pages + 3 composants)
- [x] Batch 3 — Aurora (spinners, empty states)
- [x] Batch 4 — SEO / favicon / og:image
- [x] Batch 5 — QA desktop + production
- [x] Batch 6 — Rapport final
- [x] Documentation /docs/ (7 fichiers)
- [x] Telegram après chaque batch
- [x] Architecture billing/contrats/signature/micro-entreprise documentée
- [x] Landing 3D repair (rail central agressif atténué + profondeur restaurée)
- [x] Foundation Stripe test mode backend/frontend implémentée (onboarding, consentements, checkout session, webhook, status, portal)
- [x] Brouillons légaux minimum créés (`docs/legal-drafts/*`)
- [x] Migration SQL non destructive billing/legal créée (non appliquée prod auto)
- [x] Script d’audit secrets + runbook rotation ajoutés

## P0 — Bloquant plateforme complète
- [x] Login demo@courtia.fr — mot de passe réinitialisé, flux OK

- [x] Admin Center API mismatch — frontend aligné sur `/api/admin/super/*`, écran broker refusé propre, suppression de `/app/dashboard`.

- [x] Session frontend trop agressive sur tous les `401` — politique de session centralisée ajoutée.

- [x] P0 Vercel frontend — build failed corrigé dans l'historique ; déploiement production actuel `Ready` sur `1a749f1`.

- [x] Déployer le backend VPS / PM2 avec le hotfix Portfolio schema hardening.
- [x] Clôturer Render comme non-prod : DB `courtia-db` suspendue (billing), production backend officialisée sur VPS/PM2.

## P1 — Important
- [ ] DNS courtiark.fr → propager nameservers Hostinger
- [ ] Stripe LIVE → obtenir clés sk_live_ + whsec_ + Price IDs
- [ ] (Optionnel non-prod) Nettoyer/archiver le service Render `srv-d7561hsr85hc73a9c6i0` ou réactiver une DB Render uniquement si une stratégie Render est relancée.
- [ ] Stripe test mode — validation opérationnelle finale :
  - rejouer les webhooks signés via Stripe CLI/dashboard (idempotence réelle),
  - valider le scénario `invoice.payment_failed` en test contrôlé,
  - valider le rappel fin d’essai J5/J7 (orchestration email/job).
- [ ] Rotation opérationnelle des secrets :
  - révoquer/régénérer JWT secret prod,
  - régénérer credentials DB si exposition historique confirmée,
  - révoquer anciennes clés Render/Stripe éventuellement exposées,
  - nettoyer les anciennes docs legacy contenant des exemples sensibles.
- [ ] Légal/compliance avant encaissement live :
  - validation juriste des CGV/Privacy/DPA/Cookies/Mentions légales,
  - validation comptable du libellé fiscal (micro-entreprise / TVA),
  - publication versionnée des docs légales finales.
- [ ] Token super_admin → tests Admin Center E2E
- [x] Déployer / vérifier sur VPS le rate limit auth ajusté si le backend ne suit pas automatiquement `main`
- [x] Passer `portfolio/health-score` de fallback `503` à `200` avec score réel en production
- [x] Uniformiser les messages d'erreur API auth en français sur routes critiques (auth/dashboard/contrats/tâches)
- [x] AuroraPageHeader → Rapports, Paramètres
- [x] Message 429 auth rate limit à rendre plus clair côté interface
- [ ] Harmonisation profonde Rapports / Paramètres (batch final micro-interactions)
- [x] Stripe test mode + documents légaux (draft) implémentés côté code/docs

## P2 — Finition
- [ ] Résorber les 37 signaux P2 du rapport `COURTIA_CODEX_QA_AUDIT.md`
- [ ] AuroraDivider sur toutes les transitions
- [ ] AuroraButton → harmoniser toutes les pages
- [ ] Test mobile responsive complet (toutes les pages app)
- [ ] Valider visuellement la landing Vercel dans un vrai viewport mobile après déploiement
- [x] Compression og:image → PNG pour LinkedIn
- [ ] Vérifier apple-touch-icon rendu mobile
- [x] Optimiser le chunk frontend principal supérieur à 500 kB (code-splitting routes secondaires)
