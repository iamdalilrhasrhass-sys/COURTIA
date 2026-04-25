# Idées d'Outils Différenciateurs — COURTIA

> Priorisation par impact × effort. Document stratégique produit — Version 1.0
> Chaque idée est conçue pour créer un fossé concurrentiel défendable et durable.

---

## 1. ARK Score™ — Score client en temps réel

**Description :**
ARK Score™ est un indicateur propriétaire qui synthétise la santé et la valeur d'un client courtier en un score unique de 0 à 1000. Il agrège en temps réel les données de sinistralité, fidélité, rentabilité des contrats, réactivité aux relances, score de paiement et potentiel de cross-sell. Le score se met à jour automatiquement à chaque interaction (appel, email, sinistre, paiement). Chaque collaborateur voit le score ARK de son client directement dans le CRM et la fiche client.

**Value Proposition :**
Les concurrents ne font que du segment RFM basique. ARK Score est un indicateur dynamique propriétaire qui transforme l'intuition en data. Le courtier peut prioriser ses efforts sur les clients à fort potentiel et anticiper les risques d'attrition avant qu'ils ne se matérialisent. C'est le « Credit Score » de l'assurance — un standard verrouillant.

**Complexité :** 3/5
**Impact :** 5/5
**Dépendances :** CRM existant, données sinistres et contrats, modèle ML léger déployé côté serveur, feed temps réel via webhook

**Mockup ASCII :**

```
┌─────────────────────────────────────────────────────┐
│  ██ Fiche Client — SARL DUPONT CONSTRUCTION         │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌──────────────────────────────────────────┐       │
│   │  ARK Score™                     █████████│       │
│   │  842/1000                        ████▉   │       │
│   │  Excellence           ▼ +12 pts ce mois  │       │
│   └──────────────────────────────────────────┘       │
│                                                      │
│   ▸ Contrats : 4  │  Sinistres : 1  │  Fidélité : 8a│
│   ▸ Reco : Upsell Auto → Flotte +2 véhicules         │
│   ▸ Risque : Attrition faible (3%)                    │
│                                                      │
│   [Voir historique ARK]   [Comparer au portefeuille] │
└─────────────────────────────────────────────────────┘
```

---

## 2. Renewal Radar — Détection des contrats à renégocier

**Description :**
Le Renewal Radar scanne automatiquement l'ensemble du portefeuille pour détecter les contrats arrivant à échéance dans les 90, 60 et 30 jours. Il les classe par priorité de renégociation selon le montant de prime, le risque de fuite estimé, l'historique de fidélité et l'écart de prix perçu par rapport au marché. Le système envoie des alertes push et emails aux collaborateurs concernés avec les arguments de renégociation pré-générés et une comparaison concurrentielle contextuelle.

**Value Proposition :**
Les cabinets concurrents utilisent des fichiers Excel obsolètes ou des relances manuelles. Renewal Radar automatise la chasse aux fuites de revenus et augmente le taux de rétention de 20 à 35 %. Le courtier ne laisse plus jamais passer une échéance — c'est un Assistant Renouvellement 24/7.

**Complexité :** 3/5
**Impact :** 5/5
**Dépendances :** Base contrats avec dates d'échéance, API compagnies pour comparatifs, module de notification (email/push)

**Mockup ASCII :**

```
┌─────────────────────────────────────────────────────┐
│  ██ Renewal Radar — Échéances à venir               │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌─────────────────────┬──────┬───────┬────────┐   │
│   │ Client              │ Prime│ Éché.│ Priorité│   │
│   ├─────────────────────┼──────┼───────┼────────┤   │
│   │ SARL DUPONT         │ 42k€ │ J-15 │ 🔴 CRIT │   │
│   │ Mme MARTIN          │ 8k€  │ J-22 │ 🟠 HAUTE│   │
│   │ SCI BEL AIR         │ 120k€│ J-45 │ 🟡 MOYEN│   │
│   │ SARL LEGRAND         │ 3k€  │ J-60 │ 🟢 BAS │   │
│   └─────────────────────┴──────┴───────┴────────┘   │
│                                                      │
│   ▸ [Générer arguments renégociation]                │
│   ▸ [Comparatif marché automatique]                  │
│   ▸ [Planifier relance client]                       │
└─────────────────────────────────────────────────────┘
```

---

## 3. Voix-vers-Fiche — Transcription automatique des appels

**Description :**
À la fin de chaque appel téléphonique avec un client, le système génère automatiquement un résumé structuré de l'échange, détecte les actions à prendre (envoi de document, relance, avenant), et met à jour la fiche client dans le CRM. Le courtier n'a plus à saisir de notes post-appel. La transcription complète reste accessible pour consultation juridique. Le système utilise un modèle de fine-tuning whisper/voice LLM adapté au vocabulaire assurantiel français.

**Value Proposition :**
Les courtiers passent 25 à 30 % de leur temps à saisir des notes après les appels. Voix-vers-Fiche élimine cette friction. Aucun concurrent français ne propose une transcription spécialisée assurance avec extraction automatique d'actions. C'est un gain de productivité massif ET une amélioration de la traçabilité.

**Complexité :** 4/5
**Impact :** 4/5
**Dépendances :** Système de téléphonie VoIP intégré, API de transcription (Whisper ou équivalent), modèle NLP pour extraction d'actions, RGPD compliant (stockage chiffré)

**Mockup ASCII :**

```
┌─────────────────────────────────────────────────────┐
│  ██ Résumé d'Appel — Généré automatiquement         │
├─────────────────────────────────────────────────────┤
│                                                      │
│   Client : SARL DUPONT CONSTRUCTION                  │
│   Agent : Marc C. (12 min 32s)                       │
│   ─────────────────────────────────────────────────  │
│                                                      │
│   SUJET : Sinistre dégât des eaux — Chantier Lyon 3 │
│                                                      │
│   ▸ Client signale infiltration toiture              │
│   ▸ Déclaration faite auprès d'AXA (sinistre #48291) │
│   ▸ Demande suivi sous 48h → MR le 25/04             │
│   ▸ En attente devis couvreur (M. Dupont envoie)     │
│                                                      │
│   [Mettre à jour fiche]   [Créer tâche suivi]         │
│   [Voir transcription complète]                      │
│                                                      │
│   ← Écouter l'appel                                  │
└─────────────────────────────────────────────────────┘
```

---

## 4. Email Triage — Classification des emails entrants

**Description :**
L'Email Triage analyse, classe et achemine automatiquement tous les emails entrants d'un cabinet de courtage. Il détecte la nature du message : sinistre, demande de devis, résiliation, réclamation, question contrat, ou spam. Chaque email est tagué, priorisé (urgent/normal/bas) et assigné au collaborateur compétent. Le système propose également des réponses pré-rédigées basées sur le contexte et l'historique du client.

**Value Proposition :**
Les cabinets reçoivent 50 à 150 emails par jour — le tri manuel est chronophage et source d'erreurs. Email Triage réduit le temps de traitement de 40 % et garantit qu'aucun sinistre ou résiliation ne passe entre les mailles du filet. C'est un concentrateur de flux qui transforme le chaos en pipeline organisé.

**Complexité :** 3/5
**Impact :** 4/5
**Dépendances :** Connecteur email (IMAP/Gmail/Outlook), modèle NLP de classification, règles de routage configurables, base de templates de réponse

**Mockup ASCII :**

```
┌─────────────────────────────────────────────────────┐
│  ██ Email Triage — Boîte classée intelligemment      │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌────────┬──────────────────────┬────────┬──────┐ │
│   │ Prio   │ Sujet                │ Nature │ À    │ │
│   ├────────┼──────────────────────┼────────┼──────┤ │
│   │ 🔴 URG │ Sinistre incendie   │ SINIST │ Marc │ │
│   │ 🟠 H   │ Demande devis auto   │ DEVIS  │ Léa  │ │
│   │ 🟡 N   │ Question franchise   │ INFO   │ Marc │ │
│   │ 🟢 B   │ Changement adresse   │ ADMIN  │ —    │ │
│   │ ⚫ SPAM│ Offre mutuelle        │ SPAM   │ —    │ │
│   └────────┴──────────────────────┴────────┴──────┘ │
│                                                      │
│   ▸ [Réponse rapide proposée]                        │
│   ▸ [Assigner manuellement]  [Règles de routage]     │
└─────────────────────────────────────────────────────┘
```

---

## 5. Dossier Sinistre Auto — Photo → fiche automatique

**Description :**
Le client prend en photo son véhicule endommagé et son constat amiable depuis son smartphone — le système extrait automatiquement les informations clés (plaques, dégâts visibles, coordonnées des parties, numéro de contrat) et crée une fiche sinistre pré-remplie dans le CRM. Le courtier n'a qu'à vérifier et valider. La photo est analysée par vision IA pour estimer la gravité des dégâts et suggérer une orientation (réparation / expertise).

**Value Proposition :**
Les concurrents exigent que le client envoie un email avec photos en pièces jointes, puis un assistant saisit manuellement les données. Dossier Sinistre Auto transforme un processus de 15-20 minutes en 30 secondes. L'IA visuelle réduit les erreurs de saisie et accélère l'orientation sinistre. Expérience client sans couture — le courtier devient le plus réactif du marché.

**Complexité :** 4/5
**Impact :** 4/5
**Dépendances :** Module mobile ou web responsive, API vision IA (fine-tunée sur les dégâts auto), OCR pour constat, workflow de validation courtier

**Mockup ASCII :**

```
┌─────────────────────────────────────────────────────┐
│  ██ Nouveau Sinistre — Photo → Fiche                │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌──────────────┐  ┌────────────────────────┐      │
│   │  📸 PHOTO     │  │ Données extraites :     │      │
│   │  véhicule     │  │ Plaque : AA-123-BB      │      │
│   │  endommagé    │  │ Marque : Renault        │      │
│   │     +         │  │ Dégâts : Aile AV G +    │      │
│   │  constat      │  │ Pare-chocs              │      │
│   │  [📎]         │  │ Gravité : Modérée ★★★  │      │
│   └──────────────┘  │ Orientation : Réparation │      │
│                      └────────────────────────┘      │
│                                                      │
│   ▸ Contrat associé : AUTO-48291-MARTIN              │
│   ▸ [Valider fiche]   [Modifier]   [Annuler]        │
└─────────────────────────────────────────────────────┘
```

---

## 6. Comparateur IA — Comparaison multi-compagnies en 5 secondes

**Description :**
Le courtier saisit les informations du client une seule fois — le système interroge simultanément les API de toutes les compagnies partenaires (AXA, Allianz, Generali, MMA, etc.) et retourne en moins de 5 secondes un tableau de comparaison complet : primes, garanties, franchises, exclusions, et un score de recommandation. L'IA peut suggérer la meilleure combinaison rapport garanties/prix selon le profil client.

**Value Proposition :**
Les comparateurs actuels (LesFurets, Assurland) sont orientés B2C et ne reflètent pas les grilles partenaires des courtiers. Le Comparateur IA est le premier outil B2B temps réel qui agrège les APIs compagnies dans un seul tableau comparatif. Le courtier gagne 10 minutes par devis et peut présenter un argumentaire concurrentiel imparable au client.

**Complexité :** 5/5
**Impact :** 5/5
**Dépendances :** APIs des compagnies partenaires (authentification OAuth), modèle de matching garanties, cache intelligent pour les grilles, UI comparative temps réel

**Mockup ASCII :**

```
┌─────────────────────────────────────────────────────┐
│  ██ Comparateur IA — SARL DUPONT CONSTRUCTION        │
├─────────────────────────────────────────────────────┤
│   Profil : Chantier Lyon 3 — 12 salariés            │
│   ─────────────────────────────────────────────────  │
│                                                      │
│   Compagnie      │ Prime │ Franch.│ Score │ Action  │
│   ───────────────┼───────┼───────┼───────┼────────  │
│   AXA Pro        │ 12k€  │ 500€  │ ★★★★ │ [Choisir]│
│   Allianz          │ 11k€  │ 800€  │ ★★★  │ [Choisir]│
│   Generali       │ 13k€  │ 300€  │ ★★★★ │ [Choisir]│
│   MMA              │ 10k€  │ 1000€ │ ★★   │ [Choisir]│
│   ────────────────────────────────────────────────  │
│                                                      │
│   🏆 Recommandation IA : AXA Pro — Meilleur rapport  │
│      garanties/prix pour ce profil chantier          │
│                                                      │
│   [Générer proposition]   [Exporter PDF]             │
└─────────────────────────────────────────────────────┘
```

---

## 7. Prospection Bulle — Carte de France interactive

**Description :**
Interface cartographique interactive où le courtier visualise en temps réel son portefeuille client sur une carte de France. Chaque client est représenté par une bulle dont la taille et la couleur indiquent le montant de prime et la santé du compte. Le courtier peut explorer des zones géographiques, filtrer par type de contrat, et identifier des clusters de prospects grâce à des données socio-démographiques enrichies (zones artisanales, zones commerciales, nouveaux permis de construire).

**Value Proposition :**
Aucun outil de courtage ne propose de visualisation géospatiale du portefeuille couplée à de la prospection intelligente. Prospection Bulle transforme la carte de France en terrain de jeu commercial. Le courtier repère instantanément où se concentrent ses meilleurs clients et où il DOIT prospecter. C'est Google Maps pour le développement commercial du cabinet.

**Complexité :** 4/5
**Impact :** 4/5
**Dépendances :** API cartographique (Mapbox/Leaflet), données géocodées des clients, sources open data (INSEE, SIRENE), module d'export de leads

**Mockup ASCII :**

```
┌─────────────────────────────────────────────────────┐
│  ██ Prospection Bulle — Carte de France interactive  │
├─────────────────────────────────────────────────────┤
│                                                      │
│                   ┌─\                                │
│                  ╱    ╲    ○ ○                       │
│                 │ ○   │     ○                        │
│                  ╲    ╱      ○ ○                     │
│                   └─╱        │                       │
│                    ●●        │           ○ ○         │
│                  ● ●●        │            ○          │
│                 ●    ●       │          ○ ○          │
│                ╱      ╲      │           │           │
│               │ ●●●●  │     ╱            │           │
│                ╲ ●●  ╱    ╱             │            │
│                 └───╱   ╱               │            │
│                                                      │
│   ● Portefeuille (48 clients)                        │
│   ○ Zone prospect (12 leads détectés)                │
│   ────────────────────────────────────────────────  │
│   ▸ Filtrer : [Pro] [Auto] [Santé] [Tous]          │
│   ▸ [Exporter leads zone]                           │
└─────────────────────────────────────────────────────┘
```

---

## 8. Dashboard Cabinet — Vue multi-collaborateurs

**Description :**
Tableau de bord centralisé qui donne au dirigeant du cabinet une vue d'ensemble en temps réel sur l'activité : chiffre d'affaires du jour/mois/année, nombre de sinistres ouverts, pipeline de devis en cours, objectifs individuels vs réalisés, productivité par collaborateur, taux de transformation, et ARK Score moyen du portefeuille. Chaque métrique est cliquable pour un drill-down détaillé.

**Value Proposition :**
Les cabinets de courtage gèrent leur activité à l'instinct ou via des exports Excel hebdomadaires. Dashboard Cabinet offre une vision temps réel de la santé du cabinet avec des KPIs actionnables. Le dirigeant peut identifier un collaborateur en sous-performance, un segment en perte de vitesse, ou un pic de sinistres avant que cela ne devienne critique.

**Complexité :** 3/5
**Impact :** 4/5
**Dépendances :** Agrégation CRM + comptable + sinistres, data warehouse léger, UI responsive

**Mockup ASCII :**

```
┌─────────────────────────────────────────────────────┐
│  ██ Dashboard Cabinet — Vue d'ensemble               │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────┐ │
│   │ CA Mensuel│ │ Sinistres│ │ Taux Trans│ │Score  │ │
│   │  142k€    │ │  23      │ │     68%   │ │ 751   │ │
│   │ ▲ +12%   │ │ ▲ +3     │ │   ■■■■▨   │ │ ▲ +5 │ │
│   └──────────┘ └──────────┘ └──────────┘ └───────┘ │
│                                                      │
│   Productivité Collaborateurs :                      │
│   Marc C.   ████████▨  82% obj. │ 34 dossiers    │
│   Léa B.    ██████████ 96% obj. │ 28 dossiers    │
│   Thomas K. ██████▨     65% obj. │ 19 dossiers    │
│                                                      │
│   ▸ [Voir détails]  [Exporter rapport]               │
└─────────────────────────────────────────────────────┘
```

---

## 9. ARK Briefing — Brief vocal quotidien

**Description :**
Chaque matin à 8h00, le courtier reçoit un briefing vocal personnalisé de 2 minutes généré par IA. Ce briefing résume : les échéances du jour, les sinistres urgents, les relances clients prioritaires, les opportunités détectées (devis en attente de signature, clients à recontacter), et l'état du portefeuille. Disponible en format audio (podcast) et texte. Le courtier peut répondre par commande vocale pour prendre des actions.

**Value Proposition :**
Alexa/Google Assistant ne sont pas adaptés au vocabulaire assurantiel français des courtiers. ARK Briefing est un assistant vocal spécialisé qui prépare le courtier avant même qu'il n'ouvre son ordinateur. C'est un gain de préparation de 15 minutes par jour et une réduction du stress — le courtier arrive briefé et organisé.

**Complexité :** 3/5
**Impact :** 3/5
**Dépendances :** Synthèse vocale (TTS), génération de contenu quotidienne depuis les données CRM, notification push/mobile, module de réponses vocales (optionnel)

**Mockup ASCII :**

```
┌─────────────────────────────────────────────────────┐
│  ██ ARK Briefing — Votre briefing du 25/04/2026     │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌──────────────────────────────────────────────┐  │
│   │  ▶ 00:00 ───■─────────────── 02:00            │  │
│   │  BRIEFING DU JOUR — AUDIO (2 min)             │  │
│   └──────────────────────────────────────────────┘  │
│                                                      │
│   📋 Résumé texte :                                 │
│   ▸ 3 échéances aujourd'hui (dont SARL DUPONT 42k€) │
│   ▸ 1 sinistre urgent — M. Martin, dégât des eaux  │
│   ▸ 4 devis en attente de signature (total 18k€)   │
│   ▸ Opportunité : cross-sell santé pour SCI BEL AIR │
│                                                      │
│   [Marquer comme lu]   [Répondre]                    │
└─────────────────────────────────────────────────────┘
```

---

## 10. RGPD Clean — Audit RGPD automatisé

**Description :**
Module de conformité RGPD qui scanne automatiquement l'ensemble des données clients stockées dans le CRM, les emails, les documents joints et les historiques d'appel. Il détecte les données obsolètes, les doublons, les consentements manquants, les durées de conservation dépassées, et les fichiers sensibles mal protégés. Génère un rapport de conformité avec des actions correctives priorisées et un historique d'audit exportable pour la CNIL.

**Value Proposition :**
La plupart des cabinets de courtage ne sont pas en conformité RGPD et ne le savent pas. Les audits manuels coûtent 5 000 à 15 000 €. RGPD Clean automatise la conformité à moindre coût, transforme un risque juridique en avantage commercial (argument de confiance client), et protège le cabinet des amendes CNIL pouvant aller jusqu'à 4 % du CA.

**Complexité :** 3/5
**Impact :** 3/5
**Dépendances :** Scan engine pour documents et bases de données, moteur de règles RGPD, module de rapport PDF, assistant de nettoyage semi-automatisé

**Mockup ASCII :**

```
┌─────────────────────────────────────────────────────┐
│  ██ RGPD Clean — Rapport de conformité               │
├─────────────────────────────────────────────────────┤
│                                                      │
│   Score de conformité : ███████▨▨▨  72/100          │
│                                                      │
│   ⚠ Problèmes détectés :                             │
│   ▸ 34 dossiers sans consentement explicite          │
│   ▸ 12 fichiers avec données > 5 ans non archivées  │
│   ▸ 8 doublons de contacts identifiés               │
│   ▸ 3 pièces jointes contenant des IBAN en clair    │
│                                                      │
│   Actions recommandées :                             │
│   [ ] Mettre à jour consentements (34) — Haute       │
│   [ ] Archiver dossiers obsolètes (12) — Haute       │
│   [ ] Fusionner doublons (8) — Moyenne               │
│   [ ] Chiffrer PJ sensibles (3) — Critique           │
│                                                      │
│   [Exporter rapport CNIL]   [Appliquer corrections]  │
└─────────────────────────────────────────────────────┘
```

---

## 11. Courtage Network — Place de marché de co-courtage

**Description :**
Plateforme de mise en relation entre courtiers pour le co-courtage et l'orientation de clients. Un courtier peut publier un dossier client pour lequel il n'a pas la compétence (ex. : un courtier auto qui reçoit une demande marine) et un autre courtier du réseau peut le reprendre avec partage de commission transparent. La plateforme gère les accords de rémunération, la traçabilité des échanges, la réputation des participants et les garanties de suivi.

**Value Proposition :**
Aujourd'hui, les courtiers refusent ou orientent leurs clients vers des confrères sans traçabilité ni rémunération. Courtage Network crée un marché secondaire liquide du courtage, monétise les « portes ouvertes » et permet à chaque cabinet d'élargir son offre sans recruter de spécialistes. C'est le Airbnb du courtage — une place de marché qui n'existe pas encore.

**Complexité :** 5/5
**Impact :** 5/5
**Dépendances :** Plateforme multi-tenant, système de réputation, moteur de matching courtier-profil, module juridique de commissionnement, comptabilité intégrée

**Mockup ASCII :**

```
┌─────────────────────────────────────────────────────┐
│  ██ Courtage Network — Dossiers disponibles           │
├─────────────────────────────────────────────────────┤
│                                                      │
│   ┌──────────┬───────────┬───────────┬────────────┐ │
│   │ Dossier  │ Branche   │ Commission│ Publié par │ │
│   ├──────────┼───────────┼───────────┼────────────┤ │
│   │ #4821    │ Marine    │ 35%       │ Cabinet A  │ │
│   │ #4819    │ Aviation  │ 30%       │ Cabinet B  │ │
│   │ #4815    │ Sport pro │ 25%       │ Cabinet C  │ │
│   │ #4808    │ Cyber     │ 40%       │ Cabinet D  │ │
│   └──────────┴───────────┴───────────┴────────────┘ │
│                                                      │
│   Votre profil : Pro / Auto / Santé                  │
│   ▸ [Prendre un dossier]   ▸ [Publier un dossier]   │
│   ▸ Mon historique commissions : 3 240 € ce mois    │
└─────────────────────────────────────────────────────┘
```

---

## 12. ARK Vocal Studio — Appels sortants avec suggestions en temps réel

**Description :**
Lors d'un appel sortant, le courtier voit apparaître en temps réel des suggestions contextuelles sur son écran : arguments de vente, opportunités de cross-sell détectées dans le profil client, réponses aux objections fréquentes, et scripts personnalisés. L'IA écoute la conversation (avec consentement), analyse le discours du client en temps réel, et affiche les meilleures répliques. Le système s'intègre directement au téléphone VoIP du cabinet.

**Value Proposition :**
Les solutions existantes (Gong, Chorus) sont orientées analyse post-appel et coûtent 10 000 €/an/agent. ARK Vocal Studio est un copilote temps réel accessible aux TPE/PME du courtage. Il double l'efficacité des appels sortants (prospection, relance, renégociation) et réduit le temps de formation des nouveaux courtiers de 40 %. Chaque appel devient une opportunité maximisée.

**Complexité :** 5/5
**Impact :** 4/5
**Dépendances :** VoIP intégrée, STT temps réel, LLM léger pour suggestions, consentement RGPD enregistré, cache profil client

**Mockup ASCII :**

```
┌─────────────────────────────────────────────────────┐
│  ██ ARK Vocal Studio — Appel en cours                │
├─────────────────────────────────────────────────────┤
│                                                      │
│   📞 M. DUPONT — SARL DUPONT CONSTRUCTION            │
│   ⏱ 03:24                                           │
│   ─────────────────────────────────────────────────  │
│                                                      │
│   Suggestions en temps réel :                        │
│                                                      │
│   🎯 Client dit : « On regarde les prix... »         │
│   ➜ Réponse : « Notre comparateur multi-            │
│      compagnies vous garantit le meilleur rapport    │
│      qualité/prix. Voulez-vous une simulation ? »   │
│                                                      │
│   💡 Cross-sell détecté : Flotte auto non couverte  │
│      → 3 véhicules utilitaire, prime estimée 4.2k€  │
│                                                      │
│   [Prochaine étape] [Argumentaire tarif] [Objection]│
│   [Prendre note vocale]                              │
└─────────────────────────────────────────────────────┘
```

---

## Matrice Impact × Effort

| Outil                        | Impact (1-5) | Effort (1-5) | Priorité         | Justification                                      |
|------------------------------|:------------:|:------------:|------------------|----------------------------------------------------|
| 1. ARK Score™                | 5            | 3            | **Haute**        | Difficile à copier, verrouille la relation client  |
| 2. Renewal Radar             | 5            | 3            | **Haute**        | ROI immédiat sur la rétention, faible effort       |
| 3. Voix-vers-Fiche           | 4            | 4            | **Haute**        | Productivité massive, dépendance technique gérable |
| 4. Email Triage              | 4            | 3            | **Haute**        | Faible effort pour gain quotidien important        |
| 5. Dossier Sinistre Auto     | 4            | 4            | **Haute**        | Expérience client différenciante, techno faisable  |
| 6. Comparateur IA            | 5            | 5            | **Moyenne**      | Très fort impact mais dépendant des APIs partenaires |
| 7. Prospection Bulle         | 4            | 4            | **Moyenne**      | Belle vitrine, nécessite données géocodées fiables |
| 8. Dashboard Cabinet         | 4            | 3            | **Haute**        | Faible effort, forte valeur pour le dirigeant      |
| 9. ARK Briefing              | 3            | 3            | **Moyenne**      | Nice-to-have, différenciant mais pas critique       |
| 10. RGPD Clean               | 3            | 3            | **Moyenne**      | Obligation légale, bon argument commercial         |
| 11. Courtage Network         | 5            | 5            | **Moyenne**      | Révolutionnaire mais le plus complexe à bâtir      |
| 12. ARK Vocal Studio         | 4            | 5            | **Moyenne**      | Très innovant, dépend fortement de la VoIP et STT  |

---

## Synthèse — Roadmap recommandée

**Phase 1 — Quick Wins (Mois 1-2) :**
ARK Score™ · Renewal Radar · Email Triage · Dashboard Cabinet

**Phase 2 — Différenciation cœur (Mois 3-5) :**
Voix-vers-Fiche · Dossier Sinistre Auto · Prospection Bulle · ARK Briefing

**Phase 3 — Écosystème & Moats (Mois 6-9) :**
Comparateur IA · RGPD Clean · ARK Vocal Studio · Courtage Network

---

*Document confidentiel — COURTIA SAS  ·  Stratégie Produit v1.0*
