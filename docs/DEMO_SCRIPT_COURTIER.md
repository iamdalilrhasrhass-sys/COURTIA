# Script Démo Commercial COURTIA — 15 min

**Pour:** Dalil  
**Objectif:** Signer un premier courtier  
**Prix cible:** 159€ HT/mois (Pro ARK)

## Minutage

### 0:00 — Problème du courtier (2 min)
- "Combien de temps passes-tu à chercher des infos avant un RDV ?"
- "Combien de relances faites à la main ?"
- "Tu rates des opportunités cross-sell ?"
- ARK → assistant IA natif, pas un chatbot externe
- "Montre-moi ton écran, je te montre le cockpit"

### 2:00 — Cockpit (3 min)
- Dashboard: KPIs, Morning Brief ARK
- "ARK scanne ton portefeuille et te dit ce que tu dois faire aujourd'hui"
- Clients actifs, silencieux, échéances, opportunités
- **Point clé:** "Tout est calculé par ARK, pas saisi à la main"

### 5:00 — Fiche client + ARK Coach (4 min)
- Ouvrir Sophie Martin (ou autre client actif)
- Widget ARK: "Quelles actions pour ce client ?"
- Coach: cross-sell, risque résiliation, prime manquante
- **Point clé:** "ARK analyse et recommande, toi tu décides"

### 9:00 — Relances + Contrats (3 min)
- Liste contrats avec échéances
- Relances automatiques programmées
- ARK Négociateur: compare les offres pour renouvellement
- **Point clé:** "Le client reçoit les relances automatiquement, toi tu interviens que sur les gros deals"

### 12:00 — Valeur IA (2 min)
- ARK Voice: transcription RDV → fiche client
- ARK Email: parse les mails entrants, extrait les données
- Widget ARK embeddable (site vitrine)
- **Point clé:** "159€ HT/mois = le coût d'1h de ton temps. ARK t'en fait gagner 10"

### 14:00 — Prix + Conclusion (1 min)
- Pro ARK: 159€ HT/mois, essai 7 jours
- Starter: 89€ HT/mois (limité, pas d'ARK)
- "Tu veux tester 7 jours ? Je t'envoie l'accès."

## Préparation avant chaque démo

1. `curl -s http://localhost:9998/api/auth/login -d '{"email":"demo@courtia.fr","password":"CourtiaDemo2026!"}'` → récupérer token
2. Ouvrir `/dashboard` avec le token
3. Vérifier que les 8 clients sont visibles
4. Charger Sophie Martin en fiche client

## Notes techniques

- Login: `demo@courtia.fr` / `CourtiaDemo2026!`
- Toujours utiliser le compte démo, jamais le vrai compte admin
- Si l'API est lente, précharger les pages avant la démo
- ARK Demo (landing page) utilise Anthropic API — vérifier crédit avant

## Objections courantes

| Objection | Réponse |
|-----------|---------|
| "J'ai déjà un CRM" | "ARK n'est pas un CRM de plus, c'est un assistant qui se branche SUR ton CRM" |
| "Trop cher" | "159€ = 1h de ton temps. ARK t'en libère 10 par semaine" |
| "L'IA se trompe" | "ARK recommande, c'est TOI qui valides. Zéro automatisme" |
| "Pas le temps de former" | "0 formation. ARK s'adapte à tes habitudes, pas l'inverse" |
| "Mes données sont sensibles" | "Hébergé en France, aucun partage avec OpenAI/Google" |
