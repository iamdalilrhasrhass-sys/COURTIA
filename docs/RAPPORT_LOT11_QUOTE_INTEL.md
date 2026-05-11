# LOT 11 — MULTI-PROVIDER QUOTE INTELLIGENCE

**Date:** 2026-05-11  
**Statut:** ✅ Complété  
**Différenciateur #5:** Mails compagnies sur mesure

---

## 🎯 Objectif

Générer automatiquement des mails/dossiers de demande de devis personnalisés pour chaque compagnie d'assurance, en respectant leur jargon, leurs pièces obligatoires et leur style de communication.

**Gain de temps estimé:** 15-20 min par demande de devis × N compagnies

---

## 📊 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      QUOTE REQUEST                               │
│  (client_id, insurance_type, criteria, budget)                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BRIEF BUILDER (ARK)                          │
│  Pour chaque provider sélectionné:                              │
│  - Récupère provider intelligence (style, pièces, catalogue)   │
│  - Récupère données client + documents disponibles              │
│  - Génère brief personnalisé via Claude                         │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
    ┌─────────┐     ┌─────────┐     ┌─────────┐
    │  APRIL  │     │ SOLLY   │     │NEOLIANE │
    │ Formel  │     │ Décon-  │     │Chaleur- │
    │ Direct  │     │ tracté  │     │  eux    │
    └────┬────┘     └────┬────┘     └────┬────┘
         │               │               │
         └───────────────┼───────────────┘
                         ▼
              ┌─────────────────┐
              │ PIECE CHECKER   │
              │ Missing docs?   │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │   DISPATCHER    │
              │  V1: dry-run    │
              │  V2: SMTP/SES   │
              └─────────────────┘
```

---

## 🗃️ Schéma Base de Données

### Table `provider_quote_briefs`

| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL | PK |
| broker_id | INTEGER | Courtier propriétaire |
| quote_request_id | INTEGER | Demande de devis liée |
| provider_id | INTEGER | Compagnie cible |
| subject | VARCHAR(300) | Objet du mail |
| body_html | TEXT | Corps HTML |
| body_plain | TEXT | Corps texte brut |
| missing_pieces | JSONB | Pièces manquantes |
| ai_confidence | NUMERIC | Score confiance 0-1 |
| ai_cost_usd | NUMERIC | Coût génération |
| status | VARCHAR | draft/ready/sent |

### Colonnes ajoutées à `insurance_providers`

| Colonne | Type | Description |
|---------|------|-------------|
| communication_style | TEXT | Style de comm (formel, décontracté...) |
| mandatory_documents | JSONB | Pièces obligatoires |
| product_catalog | JSONB | Catalogue produits par type |
| specific_fields | JSONB | Champs requis (codes, références) |
| response_time_hours | INTEGER | Délai réponse moyen |

---

## 🔌 API Endpoints

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/quote-intel/briefs` | Génère N briefs en parallèle |
| GET | `/api/quote-intel/briefs` | Liste les briefs (filtres) |
| GET | `/api/quote-intel/briefs/:id` | Détail d'un brief |
| PUT | `/api/quote-intel/briefs/:id` | Modifier subject/body |
| POST | `/api/quote-intel/briefs/:id/send` | Marquer envoyé |
| POST | `/api/quote-intel/briefs/:id/regenerate` | Relancer ARK |
| DELETE | `/api/quote-intel/briefs/:id` | Supprimer/Annuler |
| POST | `/api/quote-intel/check-pieces` | Vérifier pièces manquantes |
| GET | `/api/quote-intel/providers/:id/profile` | Profil intel provider |
| GET | `/api/quote-intel/stats` | Statistiques envois |

---

## 📝 Exemple: Brief April vs Solly Azar

### Pour APRIL (formel, technique)

```json
{
  "subject": "[APR-12345] - Demande de devis Auto - M. Dupont",
  "body_html": "<p>Madame, Monsieur,</p><p>Veuillez trouver ci-joint une demande de tarification Auto pour notre client <strong>M. Jean Dupont</strong>.</p><p><u>Pièces jointes :</u></p><ol><li>Carte grise</li><li>Relevé d'information</li><li>Pièce d'identité</li></ol><p>Code apporteur : APR-12345<br>Produit souhaité : April Auto Confort</p><p>Cordialement,</p>",
  "suggested_product": "April Auto Confort",
  "missing_pieces": ["justif_domicile"],
  "confidence": 0.92
}
```

### Pour SOLLY AZAR (dynamique, décontracté)

```json
{
  "subject": "🚗 Devis Auto - Jean Dupont",
  "body_html": "<p>Hey !</p><p>Nouvelle demande de devis Auto pour <strong>Jean Dupont</strong>.</p><p>Docs en PJ :<br>✅ CG<br>✅ RI<br>✅ CNI</p><p>Véhicule usage privé, besoin d'un retour rapide si possible !</p><p>Code courtier : SLY-7890</p><p>À+ !</p>",
  "suggested_product": "Solly Auto Confort",
  "missing_pieces": [],
  "confidence": 0.89
}
```

---

## 💰 Coûts Estimés

| Opération | Coût ARK |
|-----------|----------|
| Génération 1 brief | ~0.004 - 0.008 $ |
| Batch 5 providers | ~0.02 - 0.04 $ |
| 100 devis/mois (5 compagnies) | ~2 - 4 $ |

---

## 🏢 10 Providers Enrichis

| Code | Nom | Style | Pièces obligatoires |
|------|-----|-------|---------------------|
| april | April | Formel, technique | CG, RI, ID, justif |
| alptis | Alptis | Institutionnel, bienveillant | ID, justif, attestation sécu |
| sollyazar | Solly Azar | Dynamique, startup | CG, RI, ID, photo véhicule |
| neoliane | Néoliane | Chaleureux, familier | ID, justif, questionnaire santé |
| eca | ECA | Pragmatique, direct | ID, justif, RI, Kbis |
| wazari | Wazari | Digital native | ID, offre prêt, tableau amort. |
| assurone | AssurOne | Institutionnel, structuré | ID, justif, Kbis, bilan |
| assurimo | Assurimo | Expert immobilier | ID, titre propriété, bail |
| swisslife | SwissLife | Premium, haut de gamme | ID, justif, avis imposition |
| generali | Generali | Corporate, multi-branches | ID, justif, Kbis, attestation |

---

## 🚀 Prochaines Actions

### LOT 12 — Portail Client
- Espace client pour téléverser documents
- Signature électronique intégrée
- Suivi des demandes en temps réel

### Améliorations Quote Intel V2
- [ ] Envoi réel via SMTP/SES
- [ ] Webhooks réception réponses
- [ ] Templates éditables par provider
- [ ] Historique conversations par provider
- [ ] Score de réactivité providers

---

## 📁 Fichiers Créés

```
backend/
├── sql/
│   ├── migrations/
│   │   └── lot11_provider_intel.sql   # Migration table + colonnes
│   └── seeds/
│       └── provider_intel.sql         # Enrichissement 10 providers
└── src/
    ├── services/
    │   └── quoteIntel/
    │       ├── index.js               # Module exports
    │       ├── briefBuilder.js        # Génération briefs ARK
    │       ├── pieceChecker.js        # Vérification pièces
    │       └── dispatcher.js          # Envoi (V1 dry-run)
    └── routes/
        └── quoteIntel.js              # 10 routes API
```

---

**LOT 11 COMPLÉTÉ** ✅
