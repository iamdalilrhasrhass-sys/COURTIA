# Compte Démo — COURTIA

**Date:** 2026-05-17

## État

Aucun compte démo n'est provisionné actuellement.

## À créer

### 1. Compte démonstration
- **Rôle :** utilisateur standard (pas admin)
- **Plan :** Pro (159€ HT/mois)
- **Email :** demo@courtiark.fr (ou alias dédié)
- **Données :** pré-peupler avec les 8 compagnies fictives et des clients/contrats

### 2. Données nécessaires
- 8 compagnies fictives (Aurora Assurances, Novalia Courtage, Helios Protection, Serenis Risk, Atlas Assurances, Oria Garanties, Nivalis Pro, Solenys Assur)
- 15-20 clients fictifs (prospects, actifs, silencieux)
- 30 contrats répartis sur les compagnies
- Relances, tâches, opportunités ARK
- Historique de commissions

### 3. Scripts nécessaires
- Script SQL `seed_demo_account.sql` pour insérer les données
- Script `create_demo_user.js` pour créer le compte utilisateur

### 4. À éviter en démo
- Pages admin (`/admin/*`)
- Console développeur
- Logs système
- Erreurs console
- Tokens/API keys exposés
- Features marquées "À connecter" (sauf mention explicite)

### 5. Parcours de démo recommandé (7 minutes)
1. **Morning Brief** (1 min) — ARK analyse le portefeuille
2. **Clients** (1.5 min) — Fiche client 360°, contrats, scoring
3. **Contrats & Relances** (1.5 min) — Pipeline, échéances, actions
4. **IA & ARK** (1.5 min) — ARK Coach, Cross-sell, opportunités
5. **Business & Cabinet** (1.5 min) — Commissions, abonnement, équipe

### 6. Ce qu'il faut montrer
- Dashboard cockpit
- Fiche client enrichie ARK
- Relances et opportunités
- ARK Coach (recommandations)
- Module commissions
- Abonnement/Tarifs
- Design premium Aurora

### 7. Ce qu'il ne faut PAS promettre
- API temps réel (webhooks non finalisés)
- Campagnes SMS/Email (connecteurs à brancher)
- Portail Client (en développement)
- Transcription Whisper (pas de clé API)
- White-label réseau (console en développement)
