# LOT 8 — ARK COMPOSE

> Génération automatique de documents de conformité (IPID, DDA, Devoir de Conseil)
> **Différenciateur #2 COURTIA** : Ce que les concurrents font en 15 minutes, COURTIA le fait en 30 secondes.

---

## 📋 Résumé Exécutif

ARK COMPOSE est un module de génération automatique de documents réglementaires obligatoires pour les courtiers en assurance :

| Document | Description | Obligation légale |
|----------|-------------|-------------------|
| **IPID** | Insurance Product Information Document | Règlement UE 2017/1469 |
| **DDA** | Document d'Information Distributeur | Art. L521-2 Code assurances |
| **Devoir de Conseil** | Recommandation personnalisée | Art. L520-1 Code assurances |

**Avantage concurrentiel** : Génération IA en 30 secondes vs 15 minutes chez Kase/Lya/CourtiGo.

---

## 🏗️ Architecture

```
/backend/src/services/compose/
├── templates/
│   ├── ipidTemplate.js      # Génération PDF IPID (2 pages)
│   ├── ddaTemplate.js       # Génération PDF DDA
│   └── devoirConseilTemplate.js  # Génération PDF Devoir de Conseil
├── composeAi.js             # Service IA (extraction besoins, recommandation)
└── composer.js              # Orchestrateur (génération + stockage)

/backend/src/routes/
└── compose.js               # 10 routes API REST

/storage/compliance/
└── {broker_id}/{client_id}/  # PDFs générés (hors webroot)
```

---

## 📚 Documents Générés

### 1. IPID (Insurance Product Information Document)

**Contenu standardisé :**
- ✅ Qu'est-ce qui est assuré ?
- ❌ Qu'est-ce qui n'est PAS assuré ?
- ⚠️ Restrictions de couverture
- 📋 Obligations de l'assuré
- 💰 Paiement (prime, fréquence, moyens)
- 📅 Durée et début de couverture
- 🔄 Comment résilier

**Charte graphique :**
- Fond blanc, accents COURTIA (#8B5CF6)
- Icônes colorées (vert ✓, rouge ✗, orange !)
- Mentions légales auto en footer

### 2. DDA (Document Information Distributeur)

**Sections obligatoires :**
1. Identité du distributeur (nom, SIRET, adresse)
2. Immatriculation ORIAS
3. Mode de rémunération (commissions/honoraires/mixte)
4. Liens avec compagnies / conflits d'intérêts
5. Procédure de réclamation
6. Autorité de contrôle (ACPR)
7. Assurance RCP + garantie financière

### 3. Devoir de Conseil

**Structure :**
1. Identification du client
2. Recueil des besoins et exigences (IA)
3. Recommandation personnalisée (IA)
4. Alternatives étudiées et raisons du rejet
5. Analyse et raisonnement (IA)
6. Attestation et signatures

---

## 🤖 Intelligence Artificielle

### Fonctions IA (composeAi.js)

| Fonction | Description | Schéma JSON |
|----------|-------------|-------------|
| `extractNeedsFromClient()` | Analyse données client → besoins structurés | `{ besoins[], situation, objectifs, contraintes_budget }` |
| `buildRecommendation()` | Génère recommandation argumentée | `{ recommended_product, reasoning[], alternatives[] }` |
| `generateIpidContent()` | Enrichit contenu IPID | `{ product, coverage, exclusions, premium }` |
| `enrichQuoteData()` | Complète données devis incomplet | `{ guarantees[], exclusions[], restrictions[] }` |

### Exemple sortie IA

```json
{
  "besoins": [
    { "type": "MRH", "description": "Protection habitation principale", "priority": "haute" }
  ],
  "situation": "Propriétaire appartement T3 Paris 15ème, sans sinistre récent",
  "objectifs": ["Protection patrimoine immobilier", "Couverture RC familiale"],
  "contraintes_budget": "Budget max 500€/an",
  "risques_identifies": ["Dégâts des eaux (immeuble ancien)", "Vol (RDC)"]
}
```

---

## 🔌 Routes API

| Méthode | Route | Description |
|---------|-------|-------------|
| `GET` | `/api/compose/documents` | Liste documents (filtres: client_id, type, status) |
| `GET` | `/api/compose/documents/:id` | Métadonnées document |
| `GET` | `/api/compose/documents/:id/download` | Télécharger PDF |
| `DELETE` | `/api/compose/documents/:id` | Supprimer document |
| `POST` | `/api/compose/ipid` | Générer IPID |
| `POST` | `/api/compose/dda` | Générer DDA |
| `POST` | `/api/compose/devoir-conseil` | Générer Devoir de Conseil |
| `POST` | `/api/compose/pack` | Générer les 3 en parallèle |
| `POST` | `/api/compose/documents/:id/sign` | Marquer signé |
| `GET` | `/api/compose/broker-profile` | Récupérer profil courtier |
| `PUT` | `/api/compose/broker-profile` | Mettre à jour profil |
| `GET` | `/api/compose/stats` | Statistiques génération |

---

## 📊 Flux de Génération

```
┌──────────────────────────────────────────────────────────────┐
│                      CLIENT REQUEST                          │
│              POST /api/compose/devoir-conseil                │
│              { client_id: 123, quote_id: 456 }               │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    1. RÉCUPÉRATION DONNÉES                   │
│  • Client (profil, situation, contracts)                     │
│  • Broker (profil DDA, ORIAS)                                │
│  • Quote (si fourni)                                         │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    2. ENRICHISSEMENT IA                      │
│  • extractNeedsFromClient() → besoins structurés             │
│  • buildRecommendation() → produit recommandé + raisons      │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    3. GÉNÉRATION PDF                         │
│  • Template PDFKit avec données enrichies                    │
│  • Hash SHA-256 pour intégrité                               │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    4. STOCKAGE                               │
│  • Fichier: /storage/compliance/{broker}/{client}/{uuid}.pdf │
│  • BDD: compliance_documents (métadonnées + content_data)    │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────┐
│                    5. RÉPONSE                                │
│  { id: 789, download_url: "/api/compose/documents/789/..." } │
└──────────────────────────────────────────────────────────────┘
```

---

## 💾 Exemple content_data (JSONB stocké)

```json
{
  "client": {
    "nom": "Dupont",
    "prenom": "Jean",
    "profession": "Cadre commercial"
  },
  "needs": {
    "besoins": [
      { "type": "MRH", "description": "Protection habitation", "priority": "haute" }
    ],
    "situation": "Propriétaire appartement Paris",
    "objectifs": ["Protection patrimoine", "RC famille"]
  },
  "recommendation": {
    "recommended_product": {
      "name": "Formule Confort+",
      "insurer": "MAIF",
      "premium": 420
    },
    "reasoning": [
      "Couverture complète adaptée à l'immobilier parisien",
      "Franchise raisonnable (150€)",
      "Excellente réputation sinistres"
    ],
    "confidence_score": 87
  },
  "broker": {
    "company_name": "Cabinet Martin",
    "orias_number": "12345678"
  },
  "generatedAt": "2026-05-11T10:30:00.000Z"
}
```

---

## 🗄️ Tables Créées

### compliance_documents
```sql
id, broker_id, client_id, quote_id
document_type ('ipid', 'dda', 'devoir_conseil')
status ('draft', 'generated', 'signed', 'archived')
version, storage_path, pdf_hash
ai_generated, ai_reasoning
content_data (JSONB)
signed_at, signed_by, signature_method, signature_proof
```

### broker_profile_settings
```sql
broker_id (unique), orias_number, company_name, siret
address, phone, email, website
remuneration_type, remuneration_details
conflicts_disclosure, complaints_handling
supervisor_name, supervisor_address
rcp_insurer, rcp_policy_number, rcp_coverage_amount
custom_branding (JSONB)
```

---

## 🔐 Sécurité

- ✅ Auth obligatoire (`verifyToken`)
- ✅ Filtrage par `broker_id` systématique
- ✅ Stockage PDF hors webroot (`/storage/compliance/`)
- ✅ Hash SHA-256 pour intégrité
- ✅ Pas d'exposition du chemin fichier dans l'API
- ✅ `/storage/` dans `.gitignore`

---

## 📈 Prochaines Actions

| LOT | Module | Description |
|-----|--------|-------------|
| **9** | Voice Intake | Dictée vocale → extraction données client |
| **10** | Doc Vision | OCR + analyse documents clients (CI, RIB, attestations) |
| **11** | E-Signature | Intégration Yousign pour signature PDF |
| **12** | Pack Client | Envoi pack complet par email/WhatsApp |

---

## 📝 Commits LOT 8

```
d8ec49c chore(db): migration compose (compliance_documents + broker_profile_settings)
d4bbc8c chore(deps): handlebars LOT 8
b63ab3e feat(compose): templates IPID/DDA/Devoir Conseil PDF
bb0b1bc feat(compose): service IA composeAi (extraction besoins, recommandation)
fe9368b feat(compose): orchestrateur composer + 10 routes API
```

---

*Généré le 2026-05-11 par ARK — CTO COURTIA*