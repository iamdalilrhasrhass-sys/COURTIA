# RAPPORT LOT 10 — Document Vision Pipeline

**Date**: 2026-05-11  
**Auteur**: ARK (CTO COURTIA)  
**Statut**: ✅ Implémenté

---

## 1. Résumé

Le LOT 10 implémente un **pipeline d'extraction automatique de données** depuis des documents courants en assurance (RIB, carte grise, relevé d'information, attestation, pièce d'identité, justificatif de domicile) utilisant **Claude Vision**.

**Différenciateur #4** : Plus aucune ressaisie manuelle. Le courtier upload, ARK lit et extrait, le courtier valide.

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Document Upload                          │
│                  (client_documents)                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Type Detector                             │
│  • Heuristiques filename                                    │
│  • Pattern matching contenu                                 │
│  • Type déclaré vs détecté                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   PDF → Image                               │
│  • Conversion page 1 si PDF                                 │
│  • Claude Vision supporte PDF directement (fallback)        │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                Extractor Spécialisé                         │
│  • rib.js         → IBAN, BIC, titulaire                   │
│  • carteGrise.js  → immat, VIN, puissance, énergie         │
│  • releveInfo.js  → coefficient, sinistres                 │
│  • attestation.js → garanties, validité                    │
│  • pieceIdentite.js → nom, date naissance, n° pièce        │
│  • justifDomicile.js → adresse complète                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               Claude Vision (Sonnet 4.5)                    │
│  • Prompt spécialisé par type                              │
│  • JSON mode strict                                         │
│  • ~0.02 $ par document                                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Validation & Normalisation                     │
│  • Checksum IBAN                                            │
│  • Format VIN (17 car)                                      │
│  • Coefficient bonus/malus (0.50-3.50)                     │
│  • Dates expiration                                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     Apply to Client                         │
│  • RIB → payment_method JSONB                              │
│  • Carte grise → vehicles[] JSONB                          │
│  • Pièce ID → identity_info + date_naissance               │
│  • Relevé info → insurance_history JSONB                   │
│  • Attestation → current_insurance JSONB                   │
│  • Justif → address_info + adresse                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Types de Documents Supportés

| Type | Code | Champs Extraits |
|------|------|-----------------|
| **RIB** | `rib` | IBAN, BIC, titulaire, banque, agence, domiciliation |
| **Carte Grise** | `carte_grise` | Immat, VIN, marque, modèle, énergie, puissance, titulaire |
| **Relevé d'Information** | `releve_information` | Coefficient bonus/malus, sinistres[], compagnie |
| **Attestation Assurance** | `attestation_assurance` | Garanties[], validité, véhicule, compagnie |
| **Pièce d'Identité** | `piece_identite` | Nom, prénom, date naissance, n° pièce, expiration |
| **Justificatif Domicile** | `justif_domicile` | Adresse complète, code postal, ville, date émission |

---

## 4. API Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/api/docvision/extract/:documentId` | Lance l'extraction |
| `GET` | `/api/docvision/extractions` | Liste les extractions (filtres) |
| `GET` | `/api/docvision/extractions/:id` | Détail d'une extraction |
| `POST` | `/api/docvision/extractions/:id/apply` | Applique au client |
| `POST` | `/api/docvision/extractions/:id/reprocess` | Re-traite |
| `DELETE` | `/api/docvision/extractions/:id` | Supprime |
| `GET` | `/api/docvision/stats` | Statistiques |
| `GET` | `/api/docvision/types` | Types supportés |

---

## 5. Exemples de Réponse

### Extraction RIB
```json
{
  "success": true,
  "extraction": {
    "id": 42,
    "document_type": "rib",
    "fields": {
      "iban": "FR76 3000 6000 0112 3456 7890 189",
      "bic": "AGRIFRPP",
      "titulaire": "DUPONT JEAN",
      "banque": "Crédit Agricole",
      "agence": "Paris Opéra"
    },
    "confidence": 0.95,
    "warnings": [],
    "status": "completed"
  },
  "performance": {
    "latency_ms": 2340,
    "cost_usd": 0.018
  }
}
```

### Extraction Carte Grise
```json
{
  "fields": {
    "immatriculation": "AB-123-CD",
    "marque": "RENAULT",
    "modele": "CLIO",
    "vin": "VF1RFA00066123456",
    "energie": "ES",
    "puissance_fiscale": 5,
    "puissance_kw": 55,
    "mise_en_circulation": "2020-03-15",
    "genre": "VP",
    "places": 5,
    "titulaire_nom": "DUPONT",
    "titulaire_prenom": "JEAN"
  },
  "confidence": 0.92
}
```

---

## 6. Coût Estimé

| Modèle | Coût/document | Latence moyenne |
|--------|---------------|-----------------|
| Claude Sonnet 4.5 | ~0.015-0.025 $ | 2-4 secondes |
| Claude Haiku 4.5 (fallback) | ~0.005-0.010 $ | 1-2 secondes |

**Budget mensuel estimé** pour 500 extractions/mois : **~10-15 $**

---

## 7. Mapping vers Clients

Le système applique automatiquement les données extraites aux champs appropriés de la fiche client :

- **RIB** → `clients.payment_method` (JSONB)
- **Carte Grise** → `clients.vehicles[]` (JSONB array)
- **Pièce d'Identité** → `clients.identity_info` + `clients.date_naissance`
- **Relevé Information** → `clients.insurance_history` (JSONB)
- **Attestation** → `clients.current_insurance` (JSONB)
- **Justificatif** → `clients.address_info` + `clients.adresse`

---

## 8. Validations Automatiques

- **IBAN** : Checksum MOD 97, format FR, 27 caractères
- **BIC** : Format 8 ou 11 caractères, pays valide
- **VIN** : 17 caractères, pas de I/O/Q
- **Immatriculation** : Format AA-123-BB ou ancien format
- **Coefficient B/M** : Plage 0.50-3.50
- **Dates** : Format YYYY-MM-DD, vérification expiration
- **Code Postal** : 5 chiffres, plage valide

---

## 9. Fichiers Créés

```
backend/
├── sql/migrations/
│   └── lot10_doc_vision.sql
└── src/
    ├── routes/
    │   └── docvision.js           # 7 endpoints API
    └── services/
        ├── arkEngine.js           # +callArkVision()
        └── docvision/
            ├── typeDetector.js    # Détection type document
            ├── pdfToImage.js      # Conversion PDF
            ├── visionPipeline.js  # Orchestrateur
            └── extractors/
                ├── index.js
                ├── rib.js
                ├── carteGrise.js
                ├── releveInformation.js
                ├── attestation.js
                ├── pieceIdentite.js
                └── justifDomicile.js
```

---

## 10. Prochaines Étapes (LOT 11)

**Quote Intelligence Multi-Provider** : Comparaison automatique de devis auprès de plusieurs compagnies partenaires avec scoring IA.

---

## 11. Sécurité

- ✅ Auth obligatoire (`verifyToken`) sur toutes les routes
- ✅ Vérification `broker_id` sur chaque document/extraction
- ✅ Pas d'écriture client sans validation explicite (`apply` manuel ou `auto_apply`)
- ✅ Données sensibles (IBAN, n° pièce) stockées chiffrées en DB
- ✅ Logs complets pour audit

---

*LOT 10 Document Vision — Différenciateur métier COURTIA*
