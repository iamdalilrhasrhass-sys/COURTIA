# COURTIA — Secret Rotation Checklist

Date : 2 mai 2026

## Priorité haute (à faire avant Stripe test mode)
- [ ] Régénérer `JWT_SECRET` production.
- [ ] Vérifier/régénérer `DATABASE_URL` credentials si partagés hors canal sécurisé.
- [ ] Révoquer/renouveler toute clé Render API utilisée dans des échanges techniques.
- [ ] Nettoyer les exemples de secrets trop réalistes dans docs/scripts historiques.

## Stripe (phase dédiée, non exécutée ici)
- [ ] Créer nouvelles clés `sk_test` dédiées COURTIA.
- [ ] Créer nouveau `whsec` par endpoint webhook officiel.
- [ ] Vérifier que seule l’API backend lit les secrets Stripe.

## IA Anthropic (phase dédiée, non exécutée ici)
- [ ] Générer clé `ANTHROPIC_API_KEY` dédiée backend.
- [ ] Interdire explicitement toute exposition en `VITE_*`.
- [ ] Mettre en place quota/rate-limit par org et par user.

## Bonnes pratiques de rotation
- [ ] Stockage secrets uniquement en env manager.
- [ ] Historique de rotation daté.
- [ ] Revocation plan documenté (J0/J+1/J+7).
- [ ] Test de non-régression après rotation (auth, health, portfolio, admin).

