# Opportunités de Différenciation IA Native — COURTIA

> **Date :** 11 Mai 2026  
> **Auteur :** ARK (CTO COURTIA)  
> **Objectif :** Identifier les 10 GAPS du marché que personne ne traite bien

---

## 1. Contexte

Après analyse des 7 concurrents (Kase, Lya, OGGO, CourtiGo, SKY, Assurus, Cosoluce), **aucun acteur ne propose de vraie IA native intégrée**. Lya a de l'OCR, les autres n'ont rien.

Cette section identifie les opportunités concrètes où COURTIA peut créer une avance insurmontable.

---

## 2. Les 10 GAPS du Marché

---

### GAP #1 : Génération Automatique IPID Conforme

**Besoin courtier :**  
Créer un IPID (Insurance Product Information Document) conforme pour chaque produit souscrit prend 15-30 min de copier-coller et de mise en forme. Risque d'erreur élevé.

**Solution COURTIA :**  
ARK génère automatiquement l'IPID PDF conforme réglementation européenne à partir des données du contrat. Le courtier valide en 1 clic.

| Critère | Valeur |
|---------|--------|
| **Difficulté technique** | 3/5 |
| **Impact commercial** | 5/5 |
| **Lot d'intégration** | LOT 7-8 |
| **Technologie** | Claude API + PDF generation (React-PDF ou Puppeteer) |

---

### GAP #2 : Voice Intake Téléphonique

**Besoin courtier :**  
Le courtier reçoit un appel prospect. Pendant l'appel, il prend des notes désordonnées. Après l'appel, il doit créer la fiche client manuellement (10-15 min).

**Solution COURTIA :**  
ARK Voice transcrit l'appel en temps réel et crée automatiquement la fiche client structurée (nom, situation, besoins, budget) en 30 secondes post-appel.

| Critère | Valeur |
|---------|--------|
| **Difficulté technique** | 4/5 |
| **Impact commercial** | 5/5 |
| **Lot d'intégration** | LOT 11-12 (Q4) |
| **Technologie** | Whisper API + Claude structuration + WebRTC |

---

### GAP #3 : Surveillance Proactive Loi Hamon

**Besoin courtier :**  
Les clients peuvent résilier leur assurance auto/habitation à tout moment après 1 an (Loi Hamon). Le courtier devrait contacter les clients d'autres courtiers à l'anniversaire de leurs contrats. Personne ne le fait systématiquement.

**Solution COURTIA :**  
ARK Watch surveille les anniversaires des contrats concurrents (info donnée par les prospects) et alerte le courtier 1 mois avant : "M. Dupont peut résilier son contrat AXA le 15/06. Appelez-le maintenant."

| Critère | Valeur |
|---------|--------|
| **Difficulté technique** | 2/5 |
| **Impact commercial** | 5/5 |
| **Lot d'intégration** | LOT 8-9 |
| **Technologie** | CRON jobs + date calculation + notifications |

---

### GAP #4 : OCR Claude Vision Documents

**Besoin courtier :**  
Le client envoie une carte grise, un RIB, un permis par photo WhatsApp. Le courtier doit tout recopier manuellement. Erreurs de saisie fréquentes.

**Solution COURTIA :**  
ARK Vision lit les documents avec Claude Vision API et pré-remplit automatiquement les champs correspondants. Le courtier valide ou corrige.

| Critère | Valeur |
|---------|--------|
| **Difficulté technique** | 3/5 |
| **Impact commercial** | 5/5 |
| **Lot d'intégration** | LOT 9-10 |
| **Technologie** | Claude Vision API + structured extraction |

**Documents supportés :**
- Carte grise → immatriculation, marque, modèle, date 1ère mise en circulation
- RIB → IBAN, BIC, titulaire
- Carte d'identité / Permis → nom, prénom, date naissance, adresse
- Contrat concurrent → compagnie, numéro, garanties, date échéance
- Relevé d'information auto → bonus/malus, sinistres

---

### GAP #5 : Génération Email Compagnie avec Bon Ton

**Besoin courtier :**  
Chaque compagnie a ses codes, son ton, ses exigences de pièces jointes. Le courtier doit rédiger différemment pour AXA, Allianz, MAIF... Chronophage et source d'erreurs.

**Solution COURTIA :**  
ARK rédige automatiquement l'email adapté à la compagnie destinataire avec le bon ton, les bonnes pièces jointes, les bonnes formulations. Le courtier valide et envoie.

| Critère | Valeur |
|---------|--------|
| **Difficulté technique** | 3/5 |
| **Impact commercial** | 4/5 |
| **Lot d'intégration** | LOT 8-9 |
| **Technologie** | Claude API + company-specific prompts + email templates |

---

### GAP #6 : Morning Brief Quotidien

**Besoin courtier :**  
Le courtier arrive le matin, ouvre 5 onglets, lit ses mails, vérifie ses échéances, cherche quoi faire en premier. Perte de temps, décisions suboptimales.

**Solution COURTIA :**  
ARK génère un briefing quotidien personnalisé au login : "Aujourd'hui, 3 priorités : 1) Rappeler Mme Martin (contrat expire dans 7j, risque perte), 2) Envoyer devis famille Durand (attente depuis 4j), 3) Relancer sinistre Garage Petit (délai MACIF dépassé)."

| Critère | Valeur |
|---------|--------|
| **Difficulté technique** | 2/5 |
| **Impact commercial** | 5/5 |
| **Lot d'intégration** | LOT 6 (déjà en place) |
| **Technologie** | Claude API + contexte portefeuille + scoring priorité |

---

### GAP #7 : Smart Document Pipeline

**Besoin courtier :**  
Collecter les pièces du client, les vérifier, les renommer, les classer, les envoyer à la compagnie avec le bon mail. Processus manuel, erreurs, oublis.

**Solution COURTIA :**  
Pipeline automatisé : client upload → OCR Claude Vision → validation qualité → renommage automatique → classement dossier → génération mail compagnie avec pièces jointes → envoi en 1 clic.

| Critère | Valeur |
|---------|--------|
| **Difficulté technique** | 4/5 |
| **Impact commercial** | 5/5 |
| **Lot d'intégration** | LOT 10-11 |
| **Technologie** | Claude Vision + workflow engine + email API |

---

### GAP #8 : Compliance Auto-Gen (DDA + Devoir Conseil)

**Besoin courtier :**  
La réglementation DDA impose un questionnaire de découverte, une analyse des besoins, un devoir de conseil signé. Documents lourds à générer et faire signer.

**Solution COURTIA :**  
ARK génère automatiquement les documents conformes à partir des données collectées :
- Questionnaire découverte personnalisé
- Analyse des besoins synthétisée
- Devoir de conseil argumenté
- IPID produit
Envoi pour signature électronique intégré (Yousign).

| Critère | Valeur |
|---------|--------|
| **Difficulté technique** | 3/5 |
| **Impact commercial** | 5/5 |
| **Lot d'intégration** | LOT 8-9 |
| **Technologie** | Claude API + PDF generation + Yousign API |

---

### GAP #9 : Multi-Provider Quote Intelligence

**Besoin courtier :**  
Chaque compagnie a ses critères, ses exclusions, ses bonnes affaires. Le courtier doit connaître par cœur les spécificités de 20+ compagnies.

**Solution COURTIA :**  
ARK connaît les spécificités de chaque compagnie et recommande le bon provider selon le profil client :
- "Profil jeune conducteur → MAIF refusera, essayez Direct Assurance"
- "Bien immobilier > 500k€ → AXA a une offre spécifique Prestige"
- "Antécédents sinistres → Groupama accepte avec surprime 20%"

| Critère | Valeur |
|---------|--------|
| **Difficulté technique** | 3/5 |
| **Impact commercial** | 4/5 |
| **Lot d'intégration** | LOT 9-10 |
| **Technologie** | Claude API + knowledge base compagnies |

---

### GAP #10 : Portail Client Moderne

**Besoin courtier :**  
Les clients veulent accéder à leurs contrats, déclarer un sinistre, télécharger une attestation à 23h sans appeler le courtier.

**Solution COURTIA :**  
Portail client white-label moderne : 
- Consultation contrats
- Téléchargement attestations
- Déclaration sinistre guidée
- Chat avec ARK pour questions simples
- Prise de RDV en ligne

| Critère | Valeur |
|---------|--------|
| **Difficulté technique** | 3/5 |
| **Impact commercial** | 4/5 |
| **Lot d'intégration** | LOT 11-12 |
| **Technologie** | React frontend + API authentifiée + ARK chatbot |

---

## 3. Matrice Impact/Difficulté

```
Impact Commercial
       ▲
    5  │  ● Voice       ● Morning Brief    ● IPID Auto
       │  ● OCR Vision  ● Hamon Watch      ● Document Pipeline
       │                ● Compliance Auto
    4  │                ● Email Compagnie  ● Multi-Provider
       │                ● Portail Client
    3  │
       │
    2  │
       │
    1  │
       └──────────────────────────────────────────────► Difficulté
          1        2        3        4        5
```

**Quick Wins (Impact 5, Difficulté ≤3) :**
- Morning Brief (déjà fait)
- Hamon Watch
- IPID Auto
- OCR Vision
- Email Compagnie

---

## 4. Roadmap d'Intégration

| GAP | Lot | Timeline | Priorité |
|-----|-----|----------|----------|
| Morning Brief | LOT 6 | ✅ Fait | - |
| Hamon Watch | LOT 8 | Q2 2026 | P1 |
| IPID Auto | LOT 8 | Q2 2026 | P1 |
| OCR Vision | LOT 9 | Q2 2026 | P1 |
| Email Compagnie | LOT 9 | Q2 2026 | P2 |
| Compliance Auto | LOT 9 | Q2 2026 | P1 |
| Multi-Provider Intelligence | LOT 10 | Q3 2026 | P2 |
| Document Pipeline | LOT 10 | Q3 2026 | P2 |
| Portail Client | LOT 11 | Q3 2026 | P2 |
| Voice Intake | LOT 12 | Q4 2026 | P1 |

---

## 5. Avantage Compétitif Durable

Ces 10 fonctionnalités créent un **moat technologique** :

1. **Effet réseau données** — Plus COURTIA a de clients, mieux ARK comprend les patterns du métier
2. **Knowledge base compagnies** — Base de connaissance propriétaire sur les spécificités de chaque assureur
3. **Prompts métier affinés** — Des mois d'itération pour des prompts parfaitement adaptés au courtage
4. **Intégration native** — L'IA n'est pas un ajout, elle EST le produit
5. **Temps d'avance** — 12-18 mois minimum avant qu'un concurrent ne puisse répliquer

---

*Document confidentiel COURTIA — 11 Mai 2026*