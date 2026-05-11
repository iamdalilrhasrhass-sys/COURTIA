# Architecture IA Native — ARK

> **Date :** 10 Mai 2026
> **Principe fondateur :** ARK n'est pas un chatbot. ARK est une couche d'intelligence native intégrée dans chaque écran de COURTIA.
> **Fait suite à :** Inventaire réel + Benchmark + Architecture Produit V2

---

## 1. Vision ARK

**ARK = Assistant de Recommandation pour Courtiers.**

ARK transforme les données brutes du cabinet en :
- **Priorités** : ce qu'il faut faire aujourd'hui
- **Recommandations** : ce qu'il faut faire pour chaque client
- **Alertes** : ce qui nécessite une attention immédiate
- **Explications** : pourquoi cette action est recommandée
- **Actions** : ce qui peut être fait concrètement

**Phrase directrice :** "ARK ne remplace pas le courtier. ARK l'arme pour prendre les bonnes décisions, plus vite."

---

## 2. Architecture Fonctionnelle ARK

```
┌─────────────────────────────────────────────────────────┐
│                    ARK — COUCHE IA NATIVE               │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ CONTEXT      │  │ RECOMMENDATION│  │ EXPLANATION  │  │
│  │ ENGINE       │  │ ENGINE       │  │ ENGINE        │  │
│  │              │  │              │  │               │  │
│  │ Comprend le  │→ │ Génère des   │→ │ Explique      │  │
│  │ contexte     │  │ recommandations│ │ pourquoi      │  │
│  │ (client,     │  │ actionnables  │  │ (données,     │  │
│  │  contrat,    │  │               │  │  risque,      │  │
│  │  historique) │  │               │  │  opportunité) │  │
│  └─────────────┘  └──────────────┘  └───────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              ACTION LAYER                        │   │
│  │                                                  │   │
│  │  Chaque recommandation → action concrète :       │   │
│  │  • Préparer relance    • Créer tâche             │   │
│  │  • Ouvrir fiche client • Générer résumé          │   │
│  │  • Créer devis         • Marquer comme traité    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 3. ARK Context Engine

ARK comprend le contexte de chaque élément du cabinet.

### 3.1 Données lues par ARK

| Source | Données | Utilisation |
|--------|---------|-------------|
| **Client** | Statut, type, ancienneté, dernière interaction, scoring | Score risque, score fidélité, détection silence |
| **Contrats** | Produits, échéances, primes, statuts | Alertes échéance, opportunités multi-équipement |
| **Devis** | Statut, montant, date envoi, suivi | Relances devis, taux transformation |
| **Tâches** | Priorité, deadline, statut | Priorisation, retards |
| **Historique** | Interactions passées, notes | Contexte relationnel |
| **Portefeuille** | Vue globale : volumes, tendances | Score santé cabinet |

### 3.2 Signaux analysés par ARK

| Signal | Détection | Action |
|--------|-----------|--------|
| Client silencieux | > 30j sans interaction | Recommander relance |
| Échéance proche | < 30j avant échéance contrat | Alerter renouvellement |
| Devis non transformé | > 15j sans réponse | Suggérer relance devis |
| Risque de perte | Scoring bas + silence | Alerter risque |
| Opportunité cross-sell | Client mono-produit | Suggérer multi-équipement |
| Tâche en retard | Deadline dépassée | Escalader priorité |
| Contrat à renouveler | Échéance imminente | Préparer avenant ou devis |
| Anomalie commission | Écart attendu vs perçu | Alerter vérification |

---

## 4. ARK Recommendation Engine

### 4.1 Types de recommandations

| Type | Exemple | Priorité | Où |
|------|---------|----------|-----|
| **URGENTE** | "3 contrats arrivent à échéance cette semaine" | 🔴 Haute | Dashboard, Morning Brief |
| **RELANCE** | "Client Martin silencieux depuis 45 jours" | 🟠 Moyenne | Relances, Fiche Client |
| **OPPORTUNITÉ** | "Client Dubois éligible Prévoyance (non équipé)" | 🟠 Moyenne | Opportunités, Fiche Client |
| **DEVIS** | "Devis 247 non signé depuis 20 jours" | 🟡 Basse | Devis, Relances |
| **TÂCHE** | "8 tâches en retard cette semaine" | 🔴 Haute | Dashboard, Tâches |
| **SCORE** | "Score portefeuille : 82% (-3% vs mois dernier)" | 🟡 Info | Dashboard, Rapports |

### 4.2 Format d'une recommandation

Chaque carte de recommandation ARK contient :

```
┌─────────────────────────────────────────┐
│ 🔴 URGENT                                │
│                                          │
│ Contrat Auto — Client Moreau             │
│ Échéance : 15 juin 2026 (J-35)           │
│                                          │
│ Impact : 2 400 € de prime annuelle       │
│ Risque : Résiliation sans renouvellement │
│                                          │
│ [📋 Préparer renouvellement]             │
│ [👤 Voir fiche client]                   │
│ [💡 Expliquer avec ARK]                  │
└─────────────────────────────────────────┘
```

---

## 5. ARK Explanation Layer

### 5.1 Pourquoi expliquer ?

ARK ne doit jamais dire "Faites ceci" sans expliquer pourquoi.

- 🚫 "Relancez le client Dupont"
- ✅ "Le client Dupont n'a pas eu d'interaction depuis 47 jours. Son dernier contrat arrive à échéance dans 60 jours. ARK détecte un risque de perte de 72%. Une relance téléphonique est recommandée."

### 5.2 Format d'explication

Chaque recommandation propose un bouton **"💡 Expliquer avec ARK"** qui affiche :

```
ANALYSE ARK
───────────
Client : Dupont Jean
Dernière interaction : 3 mars 2026 (47j)
Contrat actif : MRH Confort (échéance 15 juillet 2026)
Score risque : 72% (élevé)

Pourquoi cette alerte ?
• Silence > 30j → hausse du risque de perte
• Échéance dans 60j → fenêtre de renouvellement
• Aucun devis en cours → pas d'action proactive détectée

Recommandation :
• Appeler le client pour un bilan
• Proposer une révision de garantie
• Envoyer un devis comparatif MRH
```

---

## 6. ARK Action Layer

Chaque recommandation ARK se traduit en actions concrètes.

### 6.1 Actions disponibles

| Action | Déclencheur | Résultat |
|--------|-------------|----------|
| **Préparer relance** | Client silencieux, devis non répondus | Ouvre un template de message |
| **Créer tâche** | Toute recommandation | Crée une tâche liée au client |
| **Voir fiche client** | Contexte client | Navigation vers /client/:id |
| **Générer résumé** | Fiche client | Résumé ARK du client |
| **Créer devis** | Opportunité cross-sell | Ouvre le formulaire devis |
| **Marquer comme traité** | Action terminée | Masque la recommandation |
| **Programmer rappel** | Échéance, relance | Crée un rappel agenda |
| **Envoyer email** | Relance client | Ouvre l'éditeur d'email |

---

## 7. ARK UI Components

Composants React natifs ARK à créer :

| Composant | Usage | Emplacement |
|-----------|-------|-------------|
| **ArkInsightCard** | Carte de recommandation avec priorité, contexte, actions | Dashboard, Morning Brief, Fiche Client |
| **ArkPriorityBadge** | Badge de priorité (urgent/haute/moyenne/info) | Sur chaque carte ARK |
| **ArkRecommendationRow** | Ligne de recommandation compacte | Sidebar, notifications |
| **ArkExplainDrawer** | Panneau d'explication ARK (slide de droite) | Sur clic "Expliquer" |
| **ArkMorningBriefPanel** | Panneau complet du Morning Brief | /morning-brief |
| **ArkClientSummary** | Résumé ARK d'un client | Fiche client |
| **ArkContractAlert** | Alerte échéance/renouvellement | Dashboard, Contrats |
| **ArkPortfolioScore** | Jauge de santé du portefeuille | Dashboard, Rapports |
| **ArkActionButton** | Bouton d'action ARK stylisé | Partout |
| **ArkEmptyState** | État vide avec suggestion ARK | Pages vides |

---

## 8. ARK V1 — Version Réaliste Immédiate

### 8.1 Ce que ARK V1 fait (côté frontend)

ARK V1 fonctionne avec des **règles métier intelligentes** simulées côté frontend si le backend IA est incomplet :

1. **Priorisation** : Classement des tâches par deadline + type (lib/priorities.js)
2. **Scoring** : Score client basé sur ancienneté, interactions, contrats (lib/scoring.js)
3. **Recommandations** : Règles conditionnelles (si silence > 30j → alerter)
4. **Morning Brief** : Synthèse quotidienne générée (déjà en place dans MorningBrief.jsx)
5. **Explications** : Templates d'explication générés dynamiquement
6. **Actions** : Boutons d'action liés aux recommandations

### 8.2 Limites assumées de la V1

- Pas d'IA générative réelle (pas de LLM en production)
- Pas de lecture de documents
- Pas de traitement automatique
- Pas d'apprentissage continu
- Explications basées sur des templates, pas du NLG

### 8.3 Pourquoi c'est acceptable

- Aucun concurrent n'a d'IA réelle non plus
- Les règles métier bien conçues donnent l'illusion d'intelligence
- L'UX prime sur la technologie
- La V1 crédible prépare le terrain pour une V2 avec IA réelle

---

## 9. ARK V2 — Future (Backend IA Réel)

Quand le backend IA sera prêt :

| Capacité | Description |
|----------|-------------|
| **RAG documentaire** | Lire et analyser les documents (contrats, relevés) |
| **NLG** | Génération de textes naturels (résumés, emails) |
| **Prédictions** | Scoring avancé (ML) : risque résiliation, probabilité conversion |
| **Automatisations** | Actions déclenchées automatiquement (relances programmées) |
| **Comparaison offres** | Analyse comparative des produits |
| **Conformité** | Vérification automatique DDA, LCB-FT |
| **Reporting auto** | Génération de rapports périodiques |
| **Voix** | Interface vocale pour courtiers nomades |

---

## 10. Intégration ARK dans les Écrans

### 10.1 Dashboard

```
┌─────────────────────────────────────────────────────┐
│  DASHBOARD                                           │
│                                                       │
│  ┌─── KPIs ──────────────────────────────────────┐  │
│  │ 124 clients   312 contrats   2 400k€ CA        │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─── PRIORITÉS ARK ─────────────────────────────┐  │
│  │ 🔴 3 contrats à échéance cette semaine          │  │
│  │ 🟠 5 clients silencieux > 30j                   │  │
│  │ 🟠 2 devis à relancer                           │  │
│  │ [📋 Voir le Morning Brief]                      │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─── ACTIVITÉ RÉCENTE ──────────────────────────┐  │
│  │ ...                                              │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 10.2 Fiche Client

```
┌─────────────────────────────────────────────────────┐
│  FICHE CLIENT — Jean Dupont                          │
│                                                       │
│  ┌─── IDENTITÉ ──────────────────────────────────┐  │
│  │ Jean Dupont • Particulier • Paris • Actif      │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─── RÉSUMÉ ARK ────────────────────────────────┐  │
│  │ 3 contrats actifs (Auto, MRH, Santé)            │  │
│  │ Score fidélité : 85%  •  Score risque : 12%    │  │
│  │ Prochaine action : Renouvellement Auto (J-60)  │  │
│  │ Opportunité : Prévoyance non souscrite          │  │
│  │ [💡 Expliquer] [📋 Créer devis Prévoyance]     │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─── CONTRATS ──────────────────────────────────┐  │
│  │ MRH Confort • 480€/an • Échéance 15/07/2026   │  │
│  │ ...                                              │  │
│  └────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

---

## 11. Règles de Cohérence ARK

1. **Toujours expliquer** — jamais de recommandation sans justification
2. **Toujours proposer une action** — pas de constat sans suite
3. **Priorité visible** — urgent ≠ important, le signaler clairement
4. **Humilité** — ARK conseille, le courtier décide
5. **Transparence** — ARK montre ses sources (données, règles)
6. **Non-intrusif** — ARK apparaît dans le contexte, pas en popup agressif

---

*Document suivant : Design System Aurora Bubble C.*
