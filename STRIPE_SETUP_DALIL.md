# Checklist Stripe — À faire par Dalil (15 minutes)

## Étape 1 — Créer le compte Stripe
- Aller sur https://stripe.com
- Email : arkcourtia@gmail.com
- SIRET : 899070205 (micro-entreprise RHASRHASS Dalil)
- Données légales sur https://www.pappers.fr/entreprise/rhasrhass-dalil-899070205
- Mot de passe suggéré : Champigny-89

## Étape 2 — Créer les 3 produits (abonnements)
Dans Stripe Dashboard → Produits → Nouveau produit :

**Produit 1 : COURTIA Starter**
- Prix : 39,00 € / mois (récurrent)
- Copier le price_xxx → `STRIPE_STARTER_PRICE_ID`

**Produit 2 : COURTIA Pro**
- Prix : 79,00 € / mois (récurrent)
- Copier le price_xxx → `STRIPE_PRO_PRICE_ID`

**Produit 3 : COURTIA Premium**
- Prix : 129,00 € / mois (récurrent)
- Copier le price_xxx → `STRIPE_PREMIUM_PRICE_ID`

## Étape 3 — Récupérer les clés API
Dans Stripe Dashboard → Développeurs → Clés API :
- Copier `sk_live_xxx` → `STRIPE_SECRET_KEY` (à mettre sur Render)
- Copier `pk_live_xxx` → `VITE_STRIPE_PUBLISHABLE_KEY` (à mettre sur Vercel)

## Étape 4 — Configurer le webhook Stripe
Dans Stripe Dashboard → Développeurs → Webhooks → Ajouter endpoint :
- **URL** : `https://courtia.onrender.com/api/stripe/webhook`
- **Événements à écouter :**
  - ✅ `checkout.session.completed`
  - ✅ `customer.subscription.deleted`
  - ✅ `invoice.payment_failed`
- Copier le **Signing Secret** `whsec_xxx` → `STRIPE_WEBHOOK_SECRET` (Render)

## Étape 5 — Variables d'environnement sur Render
Dashboard Render → courtia-backend → Environment → Ajouter :

| Variable | Valeur |
|----------|--------|
| `STRIPE_SECRET_KEY` | `sk_live_xxx` |
| `STRIPE_WEBHOOK_SECRET` | `whsec_xxx` |
| `STRIPE_STARTER_PRICE_ID` | `price_xxx` |
| `STRIPE_PRO_PRICE_ID` | `price_xxx` |
| `STRIPE_PREMIUM_PRICE_ID` | `price_xxx` |
| `EMAIL_USER` | `arkcourtia@gmail.com` |
| `EMAIL_PASSWORD` | *(App Password Gmail — voir étape 6)* |

→ Redémarrer le service après ajout.

## Étape 6 — Générer l'App Password Gmail
- Aller sur https://myaccount.google.com/apppasswords
- Connecté avec **arkcourtia@gmail.com** / Champigny-89
- Cliquer "Sélectionner l'application" → **Autre (nom personnalisé)**
- Entrer : **COURTIA**
- Cliquer "Générer"
- Copier le **mot de passe 16 caractères** affiché
- Mettre cette valeur dans `EMAIL_PASSWORD` sur Render (étape 5)

## Étape 7 — Variables d'environnement sur Vercel
Dashboard Vercel → courtia → Settings → Environment Variables → Ajouter :

| Variable | Valeur |
|----------|--------|
| `VITE_STRIPE_PUBLISHABLE_KEY` | `pk_live_xxx` |
| `VITE_STRIPE_STARTER_PRICE_ID` | `price_xxx` |
| `VITE_STRIPE_PRO_PRICE_ID` | `price_xxx` |
| `VITE_STRIPE_PREMIUM_PRICE_ID` | `price_xxx` |

→ Redéployer le projet après ajout.

## Étape 8 — Test paiement
1. Aller sur https://courtia.vercel.app/abonnement
2. Cliquer "Choisir Starter"
3. Redirigé vers Stripe Checkout → utiliser carte test :
   **4242 4242 4242 4242** — Date: **12/34** — CVC: **123**
4. Après paiement → redirigé vers `/paiement-succes`
5. Vérifier email reçu sur **arkcourtia@gmail.com**
6. Vérifier que le plan est mis à jour en base de données

### Carte de test Stripe
| Carte | Résultat |
|-------|----------|
| `4242 4242 4242 4242` | ✅ Paiement réussi |
| `4000 0000 0000 0002` | ❌ Décliné (fonds insuffisants) |
| `4000 0025 0000 3155` | ❌ 3D Secure requis |

---

## Résumé : ce qui est déjà codé et fonctionnel

- ✅ Route Stripe backend active (checkout + webhook + status)
- ✅ 3 webhooks Stripe gérés (completed, deleted, payment_failed)
- ✅ Pages PaiementSucces et PaiementAnnule avec BubbleCard
- ✅ Email notifs après création client (envoyé au courtier)
- ✅ Email notifs après abonnement (envoyé au courtier + arkcourtia@gmail.com)
- ✅ Sidebar corrigée (plus de "undefined undefined")
- ✅ Dashboard restauré depuis b345941

**Il ne manque que TON compte Stripe et les variables d'env.**
