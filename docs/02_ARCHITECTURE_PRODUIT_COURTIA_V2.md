# Architecture Produit COURTIA V2

> **Date :** 10 Mai 2026
> **Contexte :** Refonte produit complète — cockpit intelligent pour courtiers en assurance
> **Fait suite à :** Inventaire réel + Benchmark concurrentiel

---

## 1. Les 7 Univers de COURTIA

COURTIA V2 s'organise en **7 univers** (remplaçant la sidebar plate actuelle) :

```
┌─────────────────────────────────────────────────┐
│                   COURTIA                        │
│         Le cockpit intelligent des courtiers     │
├─────────────────────────────────────────────────┤
│                                                  │
│  ▸ PILOTAGE    — Tableau de bord, Morning Brief │
│  ▸ PORTEFEUILLE — Clients, Contrats, Devis      │
│  ▸ ACTIONS     — Tâches, Relances, Opportunités │
│  ▸ ACQUISITION — Prospection, REACH, Partenaires│
│  ▸ ARK IA      — Assistant, Recommandations     │
│  ▸ CABINET     — Équipe, Paramètres, Abonnement │
│  ▸ RESSOURCES  — Academy, Aide, Feedback        │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 2. Modules par Univers

### 2.1 PILOTAGE 🎯

*Objectif : Donner au courtier une vision instantanée de son activité et le guider dans ses priorités.*

| Module | Route | Rôle | État actuel | Priorité |
|--------|-------|------|-------------|----------|
| **Tableau de bord** | `/dashboard` | KPIs, santé portefeuille, ARK priorities embed | ✅ Existe, à enrichir | 🔴 |
| **Morning Brief** | `/morning-brief` | Briefing quotidien ARK : urgent, relances, échéances | ✅ Existe (866 lignes) | 🔴 |
| **Rapports** | `/rapports` | Reporting cabinet, performance, production | ✅ Existe | 🟠 |
| **Analytics** | `/analytics` | BI avancée : prédictions, tendances | ✅ Existe (AnalyticsExecutive) | 🟡 |

### 2.2 PORTEFEUILLE 📊

*Objectif : Gérer l'intégralité du portefeuille clients, contrats et devis.*

| Module | Route | Rôle | État actuel | Priorité |
|--------|-------|------|-------------|----------|
| **Clients** | `/clients` | Liste, filtres, bulles premium | ✅ Existe | 🔴 |
| **Fiche client** | `/clients/:id` | Vue 360° augmentée ARK | ✅ Existe (ClientDetail) | 🔴 |
| **Contrats** | `/contrats` | Contrats actifs, échéances, documents | ✅ Existe | 🟠 |
| **Devis** | `/devis` | Création, suivi, transformation | ❌ **N'EXISTE PAS** | 🔴 CRITIQUE |
| **Documents** | `/documents` | GED cabinet | ✅ Existe | 🟡 |

### 2.3 ACTIONS ⚡

*Objectif : Transformer les données en actions concrètes.*

| Module | Route | Rôle | État actuel | Priorité |
|--------|-------|------|-------------|----------|
| **Tâches** | `/taches` | Todo list, Kanban, deadlines | ✅ Existe | 🟠 |
| **Relances** | `/relances` | Clients silencieux, devis à relancer, échéances | ❌ **N'EXISTE PAS** | 🔴 CRITIQUE |
| **Rendez-vous** | `/rendez-vous` | Agenda, RDV clients, rappels | ❌ Pas de page dédiée | 🟡 |
| **Opportunités** | `/opportunites` | Multi-équipement, cross-sell, devis non transformés | ❌ **N'EXISTE PAS** | 🔴 CRITIQUE |

### 2.4 ACQUISITION 🚀

*Objectif : Prospection, campagnes et croissance du cabinet.*

| Module | Route | Rôle | État actuel | Priorité |
|--------|-------|------|-------------|----------|
| **Prospection** | `/prospection` | Recherche de nouveaux clients | ❌ N'existe pas | 🟡 |
| **REACH** | `/reach` | Dashboard acquisition | ✅ Existe | 🟠 |
| **Partenaires** | `/partenaires` | Gestion partenariats, commissions | ❌ **Route 404** | 🔴 |
| **Commissions** | `/commissions` | Suivi commissions partenaires | ✅ Existe | 🟡 |

### 2.5 ARK IA 🤖

*Objectif : IA native intégrée à toute la plateforme.*

| Module | Route | Rôle | État actuel | Priorité |
|--------|-------|------|-------------|----------|
| **Assistant ARK** | `/assistant-ark` | Chat IA, questions métier | ⚠️ Existe en `/capitia` | 🔴 |
| **Recommandations** | *(intégré)* | Cartes ARK dans tous les écrans | ⚠️ Partiel (Morning Brief) | 🔴 |
| **Historique IA** | *(intégré)* | Traçabilité des actions ARK | ❌ N'existe pas | 🟡 |

### 2.6 CABINET ⚙️

*Objectif : Gestion administrative du cabinet.*

| Module | Route | Rôle | État actuel | Priorité |
|--------|-------|------|-------------|----------|
| **Équipe** | `/equipe` | Membres, rôles, invitations | ✅ Existe | 🟢 |
| **Paramètres** | `/parametres` | Configuration cabinet | ✅ Existe | 🟢 |
| **Abonnement** | `/abonnement` | Gestion plan, facturation | ✅ Existe | 🟢 |
| **Import** | `/import` | Import portefeuille | ✅ Existe | 🟡 |

### 2.7 RESSOURCES 📚

*Objectif : Aide, formation et feedback.*

| Module | Route | Rôle | État actuel | Priorité |
|--------|-------|------|-------------|----------|
| **Academy** | `/academy` | Formations, guides | ✅ Existe | 🟡 |
| **Aide** | `/aide` | Centre d'aide public | ✅ Existe | 🟡 |
| **Feedback** | *(bouton)* | Feedback utilisateur | ✅ Existe (FeedbackButton) | 🟢 |

---

## 3. Parcours Clés

### 3.1 Le Matin du Courtier

```
1. Login → /dashboard
2. Dashboard : Vue santé portefeuille (KPIs)
3. ARK : "Bonjour, 3 urgences aujourd'hui"
4. Clic → /morning-brief
5. Morning Brief : Priorités du jour, relances, échéances
6. Action : "Préparer relance Client X" → /clients/X
```

### 3.2 Traitement d'une Relance

```
1. Dashboard → Alerte ARK "Client Y silencieux depuis 45j"
2. Clic → /clients/Y
3. Fiche client : Résumé ARK → "Risque de perte : élevé"
4. ARK : "Suggérer un RDV de bilan"
5. Action : Créer tâche "Appeler Client Y" → /taches/new
```

### 3.3 Création d'un Devis

```
1. /clients/Z → "Nouveau devis"
2. ARK : "Client Z = Profil MRH. Produits suggérés : MRH Confort"
3. Formulaire devis pré-rempli
4. Génération PDF
5. Envoi client → Suivi dans /devis
```

### 3.4 Suivi d'une Échéance

```
1. Dashboard → Alerte "3 contrats à échéance ce mois"
2. Clic → /contrats?filter=echeance_proche
3. Par contrat : ARK → "Client A — Contrat Auto échéance 15 juin. Action suggérée : préparer avenant ou devis comparatif"
4. Action : Créer renouvellement → /devis/new?from_contract=X
```

### 3.5 Analyse Portefeuille

```
1. /rapports
2. Vue d'ensemble : clients actifs, contrats, primes, rétention
3. ARK : "Votre portefeuille est stable (+2% vs mois dernier). 8 clients à risque identifiés."
4. Drill-down : /analytics → répartition par branche, scoring
```

---

## 4. Rôle Exact de Chaque Écran

| Écran | Objectif métier | Données nécessaires | Actions principales | Présence ARK |
|-------|----------------|--------------------|--------------------| -------------|
| **Dashboard** | Piloter en un coup d'œil | KPIs, alertes, tâches urgentes | Naviguer vers Morning Brief, Clients, Tâches | Priorités du jour, score portefeuille |
| **Morning Brief** | Commencer la journée | Relances, échéances, opportunités, clients silencieux | Traiter chaque recommandation | Chaque carte = recommandation ARK |
| **Clients** | Lister et filtrer le portefeuille | 124+ clients, statuts, scores | Bulles premium, tableau, filtres, rechercher | Scoring visible sur chaque client |
| **Fiche Client** | Comprendre en < 20s | Identité, contrats, devis, historique, notes | Modifier, créer action, voir contrats | Résumé client, risque, opportunité, prochaine action |
| **Contrats** | Gérer les contrats actifs | Contrats, échéances, statuts | Filtrer, ouvrir, créer | Alertes échéance, recommandations renouvellement |
| **Devis** | Créer et suivre les devis | Devis en cours/signés/perdus | Créer, relancer, transformer en contrat | Score transformation, suggestions produits |
| **Tâches** | Organiser le travail | Tâches, deadlines, priorités | Créer, marquer fait, déléguer | Priorisation automatique |
| **Relances** | Ne rien oublier | Clients silencieux, devis non répondus | Relancer par email/téléphone/SMS | Détection automatique des relances nécessaires |
| **Opportunités** | Développer le portefeuille | Multi-équipement, cross-sell | Voir, qualifier, agir | Détection automatique des opportunités |
| **Rapports** | Piloter le cabinet | Indicateurs, graphiques, production | Consulter, exporter, partager | Commentaires ARK sur les tendances |
| **Assistant ARK** | Obtenir de l'aide IA | Contexte cabinet | Poser des questions, demander des actions | Cœur du module |

---

## 5. Priorités de Construction (LOT 6-14)

| LOT | Périmètre | Priorité |
|-----|-----------|----------|
| **LOT 6** | Sidebar accordéon 7 univers + layout | 🔴 Immédiat |
| **LOT 7** | Correction routes cassées (`/devis`, `/relances`, `/opportunites`, `/partenaires`, `/capitia→/assistant-ark`) | 🔴 Immédiat |
| **LOT 8** | Dashboard V2 + Morning Brief intégré | 🔴 Critique |
| **LOT 9** | Clients V2 (bulles premium + fiche augmentée ARK) | 🟠 Important |
| **LOT 10** | Contrats + Devis + Documents (pages vivantes) | 🟠 Important |
| **LOT 11** | Rapports + Tâches + Relances + Opportunités | 🟠 Important |
| **LOT 12** | Landing + Tarifs harmonisés | 🟡 Moyen |
| **LOT 13** | États vides, erreurs, loaders, responsive | 🟡 Moyen |
| **LOT 14** | QA finale + build + test visuel | 🟡 Moyen |

---

*Document suivant : Architecture IA Native ARK.*
