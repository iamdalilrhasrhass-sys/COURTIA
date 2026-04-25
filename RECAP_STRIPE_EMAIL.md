# RECAP STRIPE + EMAIL — Intégration Stripe & Notifications

**Date** : Samedi 25 avril 2026  
**SHA** : `cd5f3a0` sur `main`  
**Build** : ✅ Frontend + Backend OK  

---

## Fichiers modifiés (11)

| Fichier | Action |
|---------|--------|
| `backend/server.js` | Stripe route décommentée (lignes 130, 136) |
| `backend/src/routes/stripe.js` | URLs françaises, subscription-status, webhooks deleted/failed, DB colonnes, email hook |
| `backend/src/services/emailService.js` | **NOUVEAU** — nodemailer avec Gmail, 4 templates métier |
| `backend/src/routes/clients.js` | Email notification après création client |
| `backend/package.json` | + nodemailer |
| `frontend/src/pages/Abonnement.jsx` | Boutons branchés à POST /api/stripe/create-checkout-session |
| `frontend/src/pages/PaiementSucces.jsx` | **NOUVEAU** — Page succès Stripe |
| `frontend/src/pages/PaiementAnnule.jsx` | **NOUVEAU** — Page annulation Stripe |
| `frontend/src/App.jsx` | Routes /paiement-succes + /paiement-annule |
| `frontend/src/components/Sidebar.jsx` | Fix "undefined undefined" → fallback robuste |

---

## Détail par phase

### Phase 1 — Backend Stripe
- Route `/api/stripe` ACTIVE ✅
- Endpoints :
  - `POST /api/stripe/create-checkout-session` — crée session Checkout Stripe
  - `POST /api/stripe/webhook` — webhook public Stripe
  - `GET /api/stripe/subscription-status` — vérifie abonnement actif
- Webhooks gérés : `checkout.session.completed`, `customer.subscription.deleted`, `invoice.payment_failed`
- Colonnes DB mises à jour : `plan`, `stripe_customer_id`, `stripe_subscription_id`

### Phase 2 — Frontend Abonnement
- Boutons d'abonnement connectés à l'API Stripe
- Redirection vers Stripe Checkout
- Pages succès/annulation créées avec BubbleCard design

### Phase 3 — Email Notifications
- `emailService.js` avec nodemailer + Gmail
- Templates : nouveau client, nouvel abonnement, échéance contrat
- Branché sur `clients.js` (création client) et `stripe.js` (webhook checkout)

### Phase 4 — Sidebar Fix
- `getInitials` + `getDisplayName` avec fallback chaîné
- Plus de "undefined undefined" — affiche email ou "Courtier" par défaut

---

## Variables à configurer par Dalil

### Sur Render (Backend)
```
STRIPE_SECRET_KEY=sk_live_xxx        ← depuis dashboard.stripe.com
STRIPE_WEBHOOK_SECRET=whsec_xxx      ← depuis dashboard.stripe.com > Webhooks
STRIPE_STARTER_PRICE_ID=price_xxx    ← après création produits Stripe
STRIPE_PRO_PRICE_ID=price_xxx
STRIPE_PREMIUM_PRICE_ID=price_xxx
EMAIL_USER=arkcourtia@gmail.com
EMAIL_PASSWORD=<App Password Gmail>  ← https://myaccount.google.com/apppasswords
```

### Sur Vercel (Frontend)
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
VITE_STRIPE_STARTER_PRICE_ID=price_xxx
VITE_STRIPE_PRO_PRICE_ID=price_xxx
VITE_STRIPE_PREMIUM_PRICE_ID=price_xxx
```

---

## Prochaines étapes

1. Dalil crée son compte Stripe → obtient les clés API
2. Créer les 3 produits/prix dans Stripe (39€, 79€, 129€)
3. Configurer le webhook Stripe → `https://courtia.onrender.com/api/stripe/webhook`
4. Générer l'App Password Gmail pour arkcourtia@gmail.com
5. Mettre toutes les variables d'env sur Render + Vercel
6. Tester un paiement en mode test Stripe
