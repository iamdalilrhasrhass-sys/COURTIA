# Benchmark Concurrentiel CRM Courtage — COURTIA V2

> **Date :** 10 Mai 2026
> **Périmètre :** OGGO Data, CourtiGo, Kase, Lya Courtage, Assur3D + Références UX (Linear, Notion, Monday, HubSpot, Salesforce)
> **Document préparatoire à la refonte V2 IA native ARK**

---

## 1. Méthodologie

**Sources :**
- Sites publics des concurrents
- Pages fonctionnalités, tarifs, blogs, documentations
- Captures publiques
- Connaissance du marché du courtage français
- Analyse des références UX (utilisation directe des produits Linear, Notion, Monday, HubSpot, Salesforce)

**Limites :**
- Sites inaccessibles pour certains concurrents (timeout réseau) → analyse basée sur connaissance
- Tarifs exacts non vérifiables sans accès commercial
- Pas d'essai gratuit utilisé (contraintes légales)
- Certaines fonctionnalités IA sont déclaratives, non vérifiables en production

---

## 2. Tableau Comparatif Général

| Concurrent | Cible | Promesse | Modules principaux | IA visible | Design | Points forts | Points faibles | Opportunité COURTIA |
|---|---|---|---|---|---|---|---|---|
| **OGGO Data** | Indépendants → 50 collab. | Plateforme digitale tout-en-un | CRM, Contrats, Devis, Reporting, Conformité | ❌ Aucune | 6.5/10 (daté 2018) | Couverture métier, conformité | Zéro IA, design vieillot, pas de portail client | IA native + UX moderne + Portail client |
| **CourtiGo** | TPE/PME courtage | CRM nouvelle génération, simplicité | CRM, Contrats, Commissions, Reporting | ⚠️ OCR + assistant basique | 7.5/10 | UX moderne, onboarding rapide | Jeune acteur, profondeur fonctionnelle limitée, peu d'intégrations compagnies | IA agentique, intégrations ouvertes, offline |
| **Kase** | 5-200+ collab. | Leader historique ERP courtage | CRM, Contrats, Sinistres, Compta, Reporting | ❌ Aucune | 4/10 (très daté) | Profondeur fonctionnelle, base installée | UI archaïque, zéro mobile, zéro IA | UX de rupture, mobile-first, IA différenciante |
| **Lya Courtage** | 1-50 collab. | Solution moderne, cloud-native | CRM, Contrats, Devis, Documents | ✅ Lya IA (OCR, suggestions) | 8/10 | UX soignée, IA pragmatique, pricing clair | Profondeur fonctionnelle < Kase, niche limitée | Profondeur métier + IA avancée + Mobile |
| **Assur3D** | Spécialistes RC Décennale | Expert construction | RC Décennale, TRC | ❌ Aucune | 3/10 (utilitaire pur) | Expertise niche, données techniques | Marché restreint, UI obsolète, pas d'IA | Architecture modulaire généraliste |
| **HubSpot** | Tous secteurs | CRM modulaire gratuit→premium | CRM, Marketing, Sales, Service | ✅ Breeze AI | 8/10 | Freemium, écosystème, onboarding | Silos entre modules | Modularité + pricing progressif |
| **Salesforce** | Grands comptes | CRM tout-puissant | Tout + AppExchange | ✅ Einstein GPT | 6/10 (lourd) | Puissance, écosystème | Complexité, coût, UX lourde | ⚠️ Anti-modèle UX |
| **Linear** | Startups tech | Issue tracking hyper-rapide | Projets, Cycles | ❌ | 10/10 | Vitesse, Cmd+K, animations 60fps | Trop minimaliste pour non-tech | Navigation clavier, performance |
| **Notion** | Tout public | Workspace modulaire | Docs, DB, Wikis, Projets | ✅ Notion AI | 9/10 | Flexibilité, vues multiples | Overwhelm, pas sectoriel | Vues multiples (tableau/kanban/timeline) |
| **Monday** | PME | Gestion visuelle du travail | Boards, Automations, Dashboards | ✅ Monday AI | 8/10 | Onboarding gamifié, visuel | « Jouet », pricing par groupe | Onboarding joyeux, gamification |

---

## 3. Analyse Détaillée par Concurrent

### 3.1 OGGO Data

**Lien :** oggo.fr / ogdo-data.com
**Positionnement :** Plateforme digitale tout-en-un, digitaliser la gestion du cabinet
**Promesse :** CRM + contrats + devis + conformité centralisés

**Navigation :** Menu latéral fixe par modules métier. Recherche globale. Responsive desktop-first.

**Dashboard :** Widgets configurables (CA, contrats, commissions). Agenda intégré. Alertes échéances. Graphiques basiques.

**Clients :** Fiche complète. Historique interactions. Relances semi-auto. Import CSV.

**Contrats :** Cycle de vie complet. Calcul commissions automatique. Échéancier. Conformité DDA/LCB-FT.

**IA :** **Aucune.** Zéro assistant, zéro prédiction, zéro recommandation.

**Design :** 6.5/10. Sobre (bleu/blanc), professionnel mais daté visuellement. Pas de dark mode.

**Tarifs :** ~59-119 € HT/mois/utilisateur. Setup 500-1500 €.

**Forces :** Couverture métier complète. Conformité irréprochable. Base installée solide. Support personnalisé.

**Faiblesses :** Zéro IA. Design vieillissant. Pas de portail client. Pas de souscription digitale. API limitée.

**Leçon pour COURTIA :** L'absence totale d'IA chez le leader est une fenêtre d'opportunité majeure. Le design daté est un levier de conversion.

---

### 3.2 CourtiGo

**Lien :** courtigo.fr
**Positionnement :** CRM nouvelle génération, simplicité d'usage
**Promesse :** Remplacer les ERP vieillissants par un outil moderne et simple

**Navigation :** Barre latérale classique. Recherche globale. UX pensée pour usage quotidien rapide.

**Dashboard :** Personnalisable. Vue 360° portefeuille. Graphiques et jauges visuelles.

**Clients :** Fiche complète. Pipeline prospects. Relances auto. Import CSV. RGPD intégré.

**Contrats :** Saisie complète. Calcul commissions. Échéances. Génération documents.

**IA :** OCR + NLP (saisie depuis scan). Détection anomalies commissions. Segmentation prédictive (risque résiliation, cross-sell). Chatbot assistant. Workflows automatiques.

**Design :** 7.5/10. Épuré, moderne, onboarding soigné. Bonne identité visuelle.

**Tarifs :** ~49-129 € HT/mois/utilisateur. Essai gratuit 14-30 jours.

**Forces :** UX moderne (contraste avec Kase/OGGO). Automatisation native. Courbe d'apprentissage réduite.

**Faiblesses :** Profondeur fonctionnelle < Kase. Intégrations compagnies limitées. 100% cloud (pas offline). Personnalisation limitée.

**Leçon pour COURTIA :** CourtiGo montre que l'UX moderne attire. Mais leur « IA » est marketing → COURTIA doit faire une VRAIE IA agentique.

---

### 3.3 Kase

**Lien :** kase.fr / kase-solutions.com
**Positionnement :** Leader historique ERP courtage, on-premise → cloud progressif
**Promesse :** Couverture exhaustive de la chaîne de valeur courtage

**Navigation :** Menus arborescents. Grilles de données façon tableur. Navigation par modules rigides.

**Dashboard :** Fonctionnel mais sans modernité. Tableaux de bord comptables et reporting.

**Clients :** Fiche ultra-complète. Gestion multirisques. Historique exhaustif.

**Contrats :** Très complet. Sinistres. Comptabilité intégrée.

**IA :** **Aucune.** Automatisations basiques uniquement.

**Design :** 4/10. Interface dense, datée. Courbe d'apprentissage : plusieurs semaines. Pas mobile.

**Tarifs :** 150-400 €/mois. Sur devis. Coûts formation/migration additionnels.

**Forces :** Profondeur fonctionnelle inégalée. Base installée massive. Conformité ACPR/RGPD/LCB-FT.

**Faiblesses :** UI archaïque. Zéro mobile. Zéro IA. Déploiement long. Cher.

**Leçon pour COURTIA :** Kase est vulnérable sur l'UX et l'IA. Mais sa profondeur fonctionnelle reste la référence → COURTIA doit couvrir le métier sans la complexité.

---

### 3.4 Lya Courtage

**Lien :** lya-courtage.fr / lya.io
**Positionnement :** Solution moderne 100% cloud pour courtiers nouvelle génération
**Promesse :** Simplicité, beauté, accessibilité partout

**Navigation :** Onglets inspirés SaaS modernes. Vision 360° client. Mode sombre. Responsive.

**Dashboard :** Personnalisable. Design pastel soigné.

**Clients :** Fiche complète. Regroupement contrats + sinistres + documents sur un écran.

**Contrats :** Saisie guidée. Calcul commissions.

**IA :** **Module Lya IA** — Saisie auto depuis documents (OCR). Suggestions produits. Assistant conversationnel.

**Design :** 8/10. Épuré, codes pastels, moderne. Bonne UX mobile. Mises à jour régulières.

**Tarifs :** 80-250 €/mois. Transparent. Essai 14 jours.

**Forces :** UX moderne = argument de vente massif. IA pragmatique intégrée. Tarification claire. Communauté active.

**Faiblesses :** Profondeur fonctionnelle < Kase. Niche constructeurs pas couverte. Intégrations en construction. Dépendance cloud.

**Leçon pour COURTIA :** Lya est le concurrent le plus direct. Leur IA est concrète (OCR, assistant). COURTIA doit viser plus haut : IA prédictive + agentique + intégrée partout.

---

### 3.5 Assur3D

**Lien :** assur3d.com
**Positionnement :** Spécialiste RC Décennale et construction
**Promesse :** Expertise technique inégalée sur niche construction

**Navigation :** Formulaires longs, champs techniques. Pas de dashboard moderne.

**Dashboard :** Basique. Orienté reporting technique.

**Clients :** Fiche orientée chantier/ouvrage. Pas de CRM généraliste.

**Contrats :** RC Décennale, TRC, tous risques chantier. Formulaires compagnies.

**IA :** **Aucune.**

**Design :** 3/10. Utilitaire pur, pas d'effort UX. Pas mobile.

**Tarifs :** Sur devis. Élevé (niche captive).

**Forces :** Expertise métier inégalée sur sa niche. Formulaires compagnies. Relations historiques.

**Faiblesses :** Marché restreint. UI obsolète. Aucune innovation.

**Leçon pour COURTIA :** La niche peut être lucrative mais limite la croissance. COURTIA doit être généraliste avec une architecture modulaire.

---

### 3.6 Références UX (synthèse)

**Linear.app :** Vitesse, Cmd+K, animations 60fps, minimalisme extrême. → COURTIA doit viser la navigation clavier et la performance perçue.

**Notion :** Vues multiples (tableau, kanban, timeline, calendrier), IA contextuelle, flexibilité. → Les vues multiples sont parfaites pour un CRM courtage (contrats en tableau, tâches en kanban, échéances en timeline).

**Monday :** Onboarding gamifié, interface visuelle et colorée. → L'onboarding doit être joyeux, avec barre de progression et badges.

**HubSpot :** CRM gratuit → upsell progressif. Timeline client. → Modèle économique de référence. La timeline des interactions client est un must-have.

**Salesforce :** Puissance au prix de la complexité. → Anti-modèle. La puissance ne doit pas sacrifier l'UX.

---

## 4. Ce que COURTIA doit reprendre

| Élément | Source | Pourquoi |
|---------|--------|----------|
| Navigation Cmd+K | Linear | Vitesse perçue, productivité |
| Vues multiples (tableau/kanban/timeline) | Notion | Flexibilité parfaite pour le courtage |
| Onboarding gamifié | Monday | Rétention, time-to-value |
| Tarification transparente + freemium | HubSpot / Lya | Conversion, confiance |
| Timeline interactions client | HubSpot | Vue 360° indispensable |
| Vision 360° client | Lya Courtage | Standard UX moderne |
| Conformité irréprochable | OGGO / Kase | Obligatoire réglementaire |
| Profondeur fonctionnelle | Kase | Couverture métier minimale |

---

## 5. Ce que COURTIA doit éviter

- ❌ Interface datée style Kase / OGGO (menus arborescents, grilles tableur)
- ❌ Zéro IA réelle (comme OGGO, Kase, Assur3D)
- ❌ Silos entre modules (comme HubSpot Sales vs Service)
- ❌ « Sur devis » systématique (comme Kase, Assur3D)
- ❌ Complexité Salesforce (puissance au détriment de l'UX)
- ❌ 100% cloud sans offline (comme CourtiGo, Lya)
- ❌ IA gadget / marketing sans substance réelle

---

## 6. Ce que COURTIA doit faire mieux

| Axe | Ambition | Différenciation |
|-----|----------|-----------------|
| **IA native ARK** | Couche IA intégrée dans TOUS les écrans | Aucun concurrent n'a ça |
| **Morning Brief** | Briefing intelligent quotidien | Inexistant chez les concurrents |
| **Priorisation** | ARK dit quoi faire aujourd'hui | Remplace les listes passives |
| **Cockpit portefeuille** | Vue 360° augmentée par IA | Supérieur aux dashboards basiques |
| **Navigation accordéon** | 7 univers, lisibles, avec chevrons | Supérieur aux menus plats |
| **Design Aurora** | Sombre premium, bulles, halos | Design système unique |
| **Fiche client augmentée** | Résumé ARK + risques + opportunités | Au-delà de la fiche statique |
| **Actions recommandées** | ARK propose, le courtier décide | Remplace les TODO lists |
| **App mobile native** | iOS/Android pour courtiers terrain | Aucun concurrent n'est bon là-dessus |
| **Vidéo commerciale premium** | Démo produit cinématique | Marketing différenciant |

---

## 7. Matrice de Positionnement

```
IA avancée
    ▲
    │                    ★ COURTIA V2 (cible)
    │
    │              ● Lya Courtage (IA pragmatique)
    │
    │
    │                                        ■ HubSpot (Breeze AI)
    │                             ■ Notion AI
    │
    ├──────────────────────────────────────────────────► UX moderne
    │
    │     ● CourtiGo
    │
    │                        ● OGGO Data
    │
    │    ● Kase
    │ ● Assur3D
    │
    │                                         ■ Salesforce (Einstein)
    │
    ▼
IA absente
```

**Légende :** ● Concurrents courtiers | ■ Références SaaS | ★ Ambition COURTIA V2

---

## 8. Conclusion

**COURTIA ne doit pas copier les concurrents.** 

OGGO et Kase montrent qu'on peut dominer le marché avec un produit vieillissant — mais c'est une position héritée, pas une stratégie gagnante pour un nouvel entrant.

Lya Courtage montre que l'UX moderne et l'IA pragmatique séduisent les nouvelles générations de courtiers — mais leur IA reste superficielle et leur couverture fonctionnelle limitée.

**La fenêtre d'opportunité est réelle :**
1. Aucun concurrent n'a d'IA vraiment native et intégrée
2. Tous ont des interfaces datées ou simplement « correctes »
3. Aucun n'a de Morning Brief ou de priorisation intelligente
4. Aucun n'a de design système premium (Aurora)
5. Le marché attend une alternative moderne ET complète

**COURTIA doit comprendre les standards métier, puis les dépasser avec :**
- Une IA native (ARK) intégrée dans tous les écrans
- Un design premium Aurora (sombre, bulles, cockpit)
- Une navigation claire (accordéon 7 univers)
- Une expérience plus premium que tout ce qui existe

---
*Document rédigé le 10 Mai 2026 — Confidentiel COURTIA*
