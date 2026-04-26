# AUDIT CLAUDE — COURTIA v2.0 — 27 Avril 2026

Document original fourni par Claude (claude.ai) — audit terrain prod complet.

## BUGS CRITIQUES (🔴)

1. **Navigation client** — clic client → /dashboard au lieu de /clients/:id
2. **Création client** — "invalid input syntax for type integer" sur POST /api/clients
3. **Sidebar** — "undefined unde..." au lieu de first_name + last_name
4. **Route /analyses** — redirige vers /dashboard (route non montée)
5. **Prix obsolètes** — 39/79/129€ au lieu de 89/159/350€

## TARIFICATION DÉFINITIVE

| Plan | Prix mensuel | Cible |
|------|-------------|-------|
| L'Essentiel | 89€ HT | Solo / Petit cabinet |
| Le Cabinet | 159€ HT | Équipes jusqu'à 5 |
| Le Réseau | Sur devis (~350€) | Multi-agences |

Frais mise en service : import simple 250€, transfert CRM 350€, massif 400€+50€/tranche500, intégration grossistes 500€.

## ARCHITECTURE IA

- Vision → GPT-4o mini ($0.15/1M tokens)
- ARK Chat → Ollama Mistral 7B local (0€)
- Relances/résumés → DeepSeek V3 ($0.28/1M)
- Classification → Heuristiques locales (0€)
- WhatsApp → Baileys (0€)
- Email → Gmail SMTP (0€)

Coût total estimé : ~0.02€/mois pour 50 clients.

## DESIGN SYSTEM

- Fond principal : #f7f6f2 (crème)
- Sidebar : #0a0a0a (noir)
- Boutons : fond #0a0a0a, texte blanc
- Bordures : 0.5px solid ultra-fines
- Typographie : Inter/Satoshi, 700-800 weight titres
- Zéro emoji dans l'UI, zéro shadows lourdes, zéro couleurs criardes

## MESSAGE

"COURTIA gère vos dossiers de A à Z. Vous parlez au client, ARK fait le reste."
Ne jamais dire "CRM".

## STRATÉGIE COMMERCIALE

6 leviers : Amana Assurance (Toulouse, 3 mois gratuits), frais installation, partenariat grossistes Maxance/April/Axeo, programme ambassadeur, vidéo démo 90s, cold email 150/semaine.

Projection : M1 2 clients → M6 22 → M12 50-60. CA an1 ~55-65k€.

## RÈGLES ABSOLUES

- git email : iamdalilrhasrhass@gmail.com
- npm run build = 0 erreur avant push
- Un seul vercel.json : frontend/vercel.json
- DATABASE_URL toujours externe Render
- req.user.id (jamais req.user.courtier_id)
- Pool PostgreSQL dans server.js (req.app.locals.pool)
- CORS inclut https://courtia.vercel.app

## SCHÉMA DB RÉEL

Tables en production : users, clients, quotes, appointments, ark_conversations, messages, relances
Tables inexistantes : courtiers, contrats, taches
