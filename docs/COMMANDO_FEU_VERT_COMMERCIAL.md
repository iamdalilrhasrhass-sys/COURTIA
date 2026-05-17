# FEU VERT COMMERCIAL — COURTIA

**Date:** 2026-05-17  
**Verdict:** 🟠 **FEU ORANGE**

## 1. Pourquoi FEU ORANGE ?

COURTIA est **montrable à un courtier en démo encadrée**, mais pas encore vendable à froid sans réserves.

Le produit a un shell professionnel, des pages produit honnêtes, un design premium. Mais les connecteurs backend (Whisper, Vapi, Brevo, Yousign, Pappers) ne sont pas branchés — les features IA/ARK sont des wrappers de démonstration.

En clair : en démarrant la démo sur le Morning Brief et en la guidant, un courtier voit un produit crédible. S'il clique partout seul, il tombera sur "À connecter".

## 2. Ce qui est PRÊT ✅

| Feature | Statut |
|---------|--------|
| Dashboard cockpit | ✅ Aurora OS shell |
| Gestion clients | ✅ CRUD complet |
| Gestion contrats | ✅ CRUD + comparateur |
| Relances | ✅ Pipeline |
| Devis | ✅ Fonctionnel |
| Documents (coffre) | ✅ Upload/download |
| Morning Brief | ✅ États vide/erreur/chargement |
| Abonnement / Tarifs | ✅ Starter 89€ / Pro 159€ / Cabinet sur devis |
| Commissions | ✅ Calculateur |
| Design system | ✅ Aurora dark premium |
| Tests unitaires | ✅ 39 tests, 4 suites |
| Routes QA | ✅ 12/12 OK |
| /demo | ✅ Page vitrine refaite |
| Pages produit (15) | ✅ Fallback transformé en vraies pages |

## 3. Ce qui IMPRESSIONNE 🌟

- Design Aurora OS — dark premium, cohérent, pas "template"
- Cockpit 5 hubs (Home, Clients, IA & ARK, Business, Cabinet)
- Pages produit honnêtes (pas de "connecté" mensonger)
- Morning Brief avec vrais états UX (vide, erreur, chargement)
- Tarifs alignés sur la stratégie (Pro 159€ mis en avant)
- Fallbacks propres sans crash

## 4. Ce qui est PARTIEL ⚠️

| Feature | État | Bloquant |
|---------|------|----------|
| ARK Coach | Partiel (wrapper) | Besoin clé OpenAI/DeepSeek |
| Cross-sell Intelligence | Partiel | Moteur à brancher |
| Lead Instant | À connecter | API externe |
| Campagnes SMS/Email | À connecter | Brevo/Twilio |
| Transcription RDV | À connecter | Clé Whisper |
| Email Parser IA | À connecter | LLM endpoint |
| Négociateur Compagnie | À connecter | Moteur règles |
| Veille Marché | À connecter | Agrégateur flux |
| Portail Client | À connecter | App frontend séparée |
| White-label | À connecter | Console admin réseau |
| API COURTIA | À connecter | Auth + docs |

## 5. Ce qu'il ne faut PAS promettre

- Intelligence ARK "live" sans API branchée
- Campagnes SMS/Email automatisées
- Portail client disponible immédiatement
- White-label prêt en 48h
- API publique documentée
- Transcription automatique des RDV
- "IA analyse votre portefeuille" tant que le endpoint LLM n'est pas connecté

## 6. Ce qui peut être VENDU maintenant

- Abonnement Pro (159€ HT/mois) pour CRM courtage
- Gestion clients + contrats + relances
- Dashboard cockpit
- Commissions
- "ARK arrivera dès activation du endpoint"
- Design premium + expérience fluide

## 7. Roadmap à présenter au client

1. **Sous 30 jours :** ARK Coach activé (clé LLM)
2. **Sous 60 jours :** Campagnes SMS/Email (Brevo)
3. **Sous 90 jours :** Portail Client, Transcription, Cross-sell avancé

## 8. Risques de démo

- Si le courtier clique "Lead Instant" → page "À connecter" (prévoir le discours)
- Si API backend down → Morning Brief affiche l'état erreur (c'est OK, c'est propre)
- Pas de données réelles → démo sur données demo seulement

## 9. Niveau de confiance

| Critère | Score |
|---------|-------|
| Design | 8/10 |
| UX navigation | 7/10 |
| Fonctionnalités réelles | 5/10 |
| Connecteurs IA | 2/10 |
| Stabilité | 8/10 |
| Honnêteté produit | 9/10 |
| **Global** | **6.5/10** |

## 10. Actions restantes pour signer un premier courtier

1. Provisionner un compte démo avec vraies données
2. Activer le endpoint LLM (DeepSeek/OpenAI) pour ARK Coach
3. Brancher Stripe Live pour les paiements Pro
4. Créer le script de démo 7 minutes
5. Test de bout en bout (inscription → dashboard → client → contrat → relance)
6. Certificat SSL API courtia.fr
7. DNS api.courtiark.fr et portail.courtiark.fr
8. Icônes PWA 192×192 et 512×512
9. CGV/RGPD validés par avocat
10. Page de statut /status pour monitoring

---

**Verdict final : 🟠 FEU ORANGE**
> COURTIA est prêt pour une démo encadrée à un courtier.  
> Le produit est crédible, le design est premium, les pages sont honnêtes.  
> Pour du self-serve ou de la vente à froid → pas encore. Il faut brancher 3-4 connecteurs clés.
