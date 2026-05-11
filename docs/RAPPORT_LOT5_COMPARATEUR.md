# COURTIA — LOT 5 : Backend Comparateur Multi-Compagnies

**Date** : 2026-05-11  
**Auteur** : ARK (CTO)  
**Status** : ✅ Livré

---

## 1. Résumé Exécutif

Le LOT 5 implémente le backend complet du comparateur multi-compagnies :
- **Gestion des providers** (compagnies/grossistes d'assurance)
- **Intégrations courtier** avec credentials chiffrés AES-256-GCM
- **Demandes de tarification** normalisées
- **Comparaison de devis** avec recommandation ARK
- **Architecture connector** pluggable pour futures APIs

---

## 2. Architecture Technique

### 2.1 Schéma Base de Données (6 tables)

```
insurance_providers          broker_integrations          integration_credentials
┌─────────────────┐         ┌────────────────────┐       ┌──────────────────────┐
│ id              │◄────────│ provider_id        │       │ id                   │
│ code (unique)   │         │ broker_id ────► users      │ integration_id ──────┼──►broker_integrations
│ name            │         │ status             │       │ credential_type      │
│ type            │         │ priority           │       │ encrypted_value      │
│ api_status      │         │ commission_rate    │       │ iv                   │
│ supported_products│       │ deposit_email      │       │ auth_tag             │
│ metadata        │         │ credentials_id     │       │ last_four            │
└─────────────────┘         └────────────────────┘       └──────────────────────┘

quote_requests               quote_results                quote_comparisons
┌─────────────────┐         ┌────────────────────┐       ┌──────────────────────┐
│ id              │◄────────│ request_id         │       │ id                   │
│ client_id ──► clients     │ provider_id        │       │ request_id ──────────┼──►quote_requests
│ broker_id ──► users       │ provider_code      │       │ recommendation (JSONB)
│ product_type    │         │ premium_annual     │       │ created_at           │
│ normalized_data │         │ coverage_summary   │       └──────────────────────┘
│ target_providers│         │ raw_response       │
│ status          │         │ source (api/manual)│
│ submitted_at    │         │ status             │
└─────────────────┘         └────────────────────┘
```

### 2.2 Service CryptoVault (AES-256-GCM)

Le vault chiffre les credentials API des courtiers :

```javascript
// Chiffrement
const encrypted = cryptoVault.encrypt('sk-api-key-secret')
// → { ciphertext, iv, authTag }

// Déchiffrement (interne uniquement)
const plaintext = cryptoVault.decrypt(encrypted)

// Masquage pour l'API (jamais le clair)
cryptoVault.maskValue('sk-api-key-secret')
// → "****cret"
```

**Sécurité** :
- Master key 256 bits dans `VAULT_MASTER_KEY` (env)
- IV unique par opération (12 bytes)
- Auth tag pour intégrité (16 bytes)
- Jamais de valeur en clair retournée via API

### 2.3 Connector Registry (Architecture Pluggable)

```
src/services/connectors/
├── index.js          # Registry + BaseConnector
├── april.js          # (futur) Connector April API
├── generali.js       # (futur) Connector Generali API
└── ...
```

**Interface Connector** :
```javascript
{
  code: string,
  name: string,
  type: 'grossiste' | 'compagnie',
  status: 'available' | 'manual_only',
  requestQuote(normalizedData, credentials) → Promise<QuoteResult>
}
```

**V1 : Mode Manuel** — Tous les connectors renvoient des instructions pour tarification manuelle.

---

## 3. API Routes

### 3.1 Providers (Public)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/insurance-providers` | Liste des providers |
| GET | `/api/insurance-providers/connectors` | Status des connectors |

### 3.2 Broker Integrations (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/broker-integrations` | Intégrations du courtier |
| POST | `/api/broker-integrations` | Créer intégration |
| PUT | `/api/broker-integrations/:id` | Modifier intégration |
| DELETE | `/api/broker-integrations/:id` | Supprimer intégration |
| POST | `/api/broker-integrations/:id/credentials` | Ajouter credential chiffré |
| DELETE | `/api/broker-integrations/:id/credentials/:credId` | Rotation credential |

### 3.3 Comparateur (Protected)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/comparator/quote-requests` | Liste demandes |
| POST | `/api/comparator/quote-request` | Créer demande tarif |
| GET | `/api/comparator/quote-request/:id` | Détails demande |
| POST | `/api/comparator/quote-request/:id/submit` | Soumettre aux providers |
| POST | `/api/comparator/quote-request/:id/manual-result` | Ajouter devis manuel |
| GET | `/api/comparator/quote-request/:id/results` | Liste résultats |
| POST | `/api/comparator/quote-request/:id/compare` | Générer recommandation ARK |

---

## 4. Flux Utilisateur

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. SETUP INTÉGRATIONS                                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│  Courtier → /broker-integrations (POST)                                     │
│  └── Ajoute April, Alptis, Generali...                                     │
│  └── /broker-integrations/:id/credentials (POST) → Chiffre clés API        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 2. DEMANDE DE TARIF                                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  Courtier → /comparator/quote-request (POST)                               │
│  └── normalized_data: { produit: "santé", date_naissance, regime... }      │
│  └── target_providers: ["april", "alptis", "generali"]                     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 3. SOUMISSION AUX PROVIDERS                                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│  /quote-request/:id/submit (POST)                                          │
│  └── V1: Mode manuel (connectors renvoient instructions)                   │
│  └── V2: API auto (connectors appellent APIs compagnies)                   │
│  └── Résultats stockés dans quote_results                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 4. SAISIE DEVIS MANUELS                                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│  Courtier → /quote-request/:id/manual-result (POST)                        │
│  └── premium_annual: 650€, provider_code: "april", coverage_summary...     │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ 5. COMPARAISON ARK                                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│  /quote-request/:id/compare (POST)                                         │
│  └── ARK analyse les résultats                                             │
│  └── Génère ranking + recommandation + insight texte                       │
│  └── Stocké dans quote_comparisons                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Providers Seedés (10)

| Code | Nom | Type | Produits |
|------|-----|------|----------|
| april | April | Grossiste | santé, prévoyance, emprunteur |
| alptis | Alptis Assurances | Grossiste | santé, prévoyance |
| sollyazar | Solly Azar | Grossiste | santé, auto, habitation, MRP |
| neoliane | Néoliane | Grossiste | santé, prévoyance |
| eca | ECA Assurances | Grossiste | santé, auto, habitation |
| wazari | Wazari | Grossiste | emprunteur |
| assurone | AssurOne Group | Grossiste | santé, RC pro |
| assurimo | Assurimo | Grossiste | PNO, copropriété |
| swisslife | SwissLife | Compagnie | vie, épargne, retraite |
| generali | Generali France | Compagnie | santé, auto, vie, RC pro |

---

## 6. Sécurité

### 6.1 Chiffrement Credentials

- **Algorithme** : AES-256-GCM
- **Master Key** : 32 bytes hex dans `VAULT_MASTER_KEY`
- **IV** : 12 bytes généré aléatoirement par opération
- **Auth Tag** : 16 bytes pour vérification intégrité

### 6.2 Accès API

- Providers : lecture publique (catalogue)
- Intégrations : authentifié + ownership vérifié
- Credentials : jamais retournés en clair (seulement `last_four`)

### 6.3 Recommandations Déploiement

```bash
# Générer une master key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Ajouter dans .env (JAMAIS commiter)
VAULT_MASTER_KEY=<clé_générée>
```

---

## 7. Mode V1 vs V2

| Aspect | V1 (Actuel) | V2 (Futur) |
|--------|-------------|------------|
| Tarification | Mode assisté manuel | API directes compagnies |
| Connectors | Stubs (instructions) | Implémentations réelles |
| Résultats | Saisie courtier | Auto-récupération |
| Temps réponse | Heures/jours | Minutes |

---

## 8. Fichiers Créés

```
backend/
├── sql/
│   ├── migrations/
│   │   └── lot5_comparateur.sql      # 6 tables
│   └── seeds/
│       └── insurance_providers.sql   # 10 providers
├── src/
│   ├── services/
│   │   ├── cryptoVault.js            # AES-256-GCM
│   │   └── connectors/
│   │       └── index.js              # Registry + 10 stubs
│   └── routes/
│       ├── insuranceProviders.js     # Routes providers + integrations
│       └── quotesComparator.js       # Routes comparateur
└── .env.example                       # + VAULT_MASTER_KEY
```

---

## 9. Prochaines Actions

1. **Frontend** : Page intégrations + UI comparateur
2. **Connectors V2** : Implémenter APIs April, Alptis (selon disponibilité)
3. **ARK avancé** : Analyse garanties, exclusions, rapport PDF
4. **Webhooks** : Notifications résultats async
5. **Historique** : Analytics comparaisons par courtier

---

## 10. Commandes Migration

```bash
# Appliquer migration
psql $DATABASE_URL -f backend/sql/migrations/lot5_comparateur.sql

# Seed providers
psql $DATABASE_URL -f backend/sql/seeds/insurance_providers.sql

# Vérifier
psql $DATABASE_URL -c "SELECT code, name, type FROM insurance_providers;"
```

---

**LOT 5 COMPLÉTÉ** ✅

*ARK — CTO COURTIA*