# RAPPORT LOT 4 — Backend Module Documents Clients

**Date :** 2026-05-11  
**Module :** Gestion des documents clients  
**Statut :** ✅ Implémenté

---

## 1. Architecture

```
/root/courtia/
├── backend/
│   ├── sql/migrations/
│   │   └── lot4_documents.sql          # Migration 4 tables
│   ├── src/
│   │   ├── services/
│   │   │   ├── documentStorage.js      # Stockage local (compatible S3)
│   │   │   ├── documentAnalysis.js     # Analyse heuristique (stub Claude Vision)
│   │   │   └── documentLinks.js        # Génération liens collecte
│   │   └── routes/
│   │       └── clientDocuments.js      # 9+ routes API
│   └── server.js                       # Routeur monté sur /api
└── storage/
    └── documents/                      # Stockage fichiers (hors git)
```

---

## 2. Tables Créées

### `client_documents`
Documents uploadés par/pour les clients.

| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL | PK |
| client_id | INTEGER | FK clients |
| broker_id | INTEGER | FK users |
| document_type | VARCHAR(80) | carte_identite, rib, permis, etc. |
| original_filename | VARCHAR(255) | Nom original |
| storage_path | VARCHAR(500) | Chemin relatif stockage |
| mime_type | VARCHAR(100) | application/pdf, image/jpeg... |
| file_size_bytes | INTEGER | Taille |
| file_hash | VARCHAR(64) | SHA256 (déduplication) |
| status | VARCHAR(40) | received, validated, rejected, deleted |
| source | VARCHAR(40) | manual, collect_link, whatsapp, email |
| analysis_status | VARCHAR(40) | pending, analyzing, completed, failed |
| analysis_result | JSONB | Résultat analyse IA |
| ocr_text | TEXT | Texte extrait (OCR) |
| deleted_at | TIMESTAMP | Soft delete |

### `document_requests`
Demandes de collecte via lien sécurisé.

| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL | PK |
| client_id | INTEGER | FK clients |
| broker_id | INTEGER | FK users |
| token | VARCHAR(64) | Token unique URL-safe |
| status | VARCHAR(40) | pending, partial, completed, expired |
| requested_types | JSONB | ["carte_identite", "rib"] |
| expires_at | TIMESTAMP | Expiration du lien |
| reminder_count | INTEGER | Nombre de relances |

### `document_request_items`
Items individuels d'une demande.

| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL | PK |
| request_id | INTEGER | FK document_requests |
| document_type | VARCHAR(80) | Type demandé |
| status | VARCHAR(40) | pending, received, rejected |
| document_id | INTEGER | FK client_documents (quand reçu) |

### `document_transmissions`
Historique des envois aux compagnies.

| Colonne | Type | Description |
|---------|------|-------------|
| id | SERIAL | PK |
| client_id | INTEGER | FK clients |
| provider_name | VARCHAR(100) | Nom compagnie |
| channel | VARCHAR(40) | email, api, ftp, manual |
| document_ids | JSONB | [1, 2, 3] |
| status | VARCHAR(40) | pending, sent, confirmed, failed |
| proof | JSONB | Preuve d'envoi |

---

## 3. Routes API

### Routes Protégées (Auth JWT requis)

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/clients/:id/documents` | Upload documents (multipart) |
| GET | `/api/clients/:id/documents` | Liste documents client |
| GET | `/api/documents/:id` | Télécharger un document |
| DELETE | `/api/documents/:id` | Soft delete document |
| POST | `/api/documents/:id/analyze` | Relancer analyse |
| POST | `/api/clients/:id/document-request` | Créer lien collecte |
| POST | `/api/clients/:id/transmit-documents` | Envoyer à compagnie |
| GET | `/api/document-types` | Liste types disponibles |

### Routes Publiques (Collecte client)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/document-request/:token` | Valider lien collecte |
| POST | `/api/document-request/:token/upload` | Upload via lien (multipart) |

---

## 4. Exemples curl

### Upload document (auth)
```bash
curl -X POST http://localhost:9998/api/clients/42/documents \
  -H "Authorization: Bearer <JWT>" \
  -F "files=@/path/to/carte_identite.pdf" \
  -F "document_type=carte_identite"
```

### Liste documents
```bash
curl http://localhost:9998/api/clients/42/documents \
  -H "Authorization: Bearer <JWT>"
```

### Créer lien collecte
```bash
curl -X POST http://localhost:9998/api/clients/42/document-request \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "requestedTypes": ["carte_identite", "rib", "justificatif_domicile"],
    "expiresInHours": 72,
    "notes": "Documents pour souscription MRH"
  }'
```
**Réponse :**
```json
{
  "success": true,
  "request": {
    "id": 1,
    "token": "Abc123XyZ...",
    "url": "https://app.courtiark.fr/collect/Abc123XyZ...",
    "expiresAt": "2026-05-14T10:00:00Z"
  }
}
```

### Valider token (public)
```bash
curl http://localhost:9998/api/document-request/Abc123XyZ...
```

### Upload via lien (public)
```bash
curl -X POST http://localhost:9998/api/document-request/Abc123XyZ.../upload \
  -F "files=@/path/to/rib.pdf" \
  -F "document_type=rib"
```

### Transmettre à compagnie
```bash
curl -X POST http://localhost:9998/api/clients/42/transmit-documents \
  -H "Authorization: Bearer <JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "documentIds": [1, 2, 3],
    "providerName": "AXA France",
    "channel": "email"
  }'
```

---

## 5. Flux Documentés

### Flux 1 : Upload Manuel (Courtier)
```
Courtier → POST /api/clients/:id/documents (multipart)
         → Validation MIME + taille
         → Stockage local /storage/documents/<client_id>/<uuid>_filename
         → Analyse heuristique type document
         → INSERT client_documents
         → Réponse avec ID + analyse
```

### Flux 2 : Lien de Collecte (Client)
```
Courtier → POST /api/clients/:id/document-request
         → Génère token 32 chars URL-safe
         → INSERT document_requests + items
         → Retourne URL : https://app.courtiark.fr/collect/<token>

Client   → Reçoit lien par email/SMS/WhatsApp
         → GET /api/document-request/<token> (validation)
         → POST /api/document-request/<token>/upload (fichiers)
         → Stockage + analyse + lien à request_items
         → Statut mis à jour : partial → completed
```

### Flux 3 : WhatsApp (TODO)
```
[Architecture prête — intégration LOT ultérieur]
Client envoie document via WhatsApp
→ Webhook reçoit média
→ Télécharge fichier
→ Stocke avec source='whatsapp'
→ Lie au client (par numéro téléphone)
```

---

## 6. Sécurité

| Aspect | Implémentation |
|--------|----------------|
| Auth | JWT requis sur routes /api/clients/* |
| Ownership | Middleware vérifie client.user_id = broker |
| Token collecte | 32 chars crypto, expiration configurable |
| Rate limit | 30 req/15min sur routes publiques |
| Validation fichiers | MIME whitelist + taille max 25MB |
| Sanitization | Noms fichiers nettoyés (no path traversal) |
| Stockage | Hors webroot, chemins relatifs |
| Soft delete | deleted_at pour traçabilité |

---

## 7. Services

### documentStorage.js
- `save(buffer, {clientId, originalFilename, mimetype})` → storagePath, hash
- `getStream(storagePath)` → ReadStream
- `getBuffer(storagePath)` → Buffer
- `remove(storagePath)` → boolean
- `signedUrl(storagePath, expiresSec)` → URL (stub S3)
- `findByHash(hash, clientId)` → déduplication
- `validateFile(buffer, mimetype, filename)` → validation

### documentAnalysis.js (Stub LOT 6)
- `analyzeDocument(buffer, metadata)` → type, confidence, fields
- `detectTypeByFilename(filename)` → type
- `listDocumentTypes()` → liste types disponibles

### documentLinks.js
- `generateRequestToken()` → token 32 chars
- `createDocumentRequest(params)` → request + items
- `validateToken(token)` → valid/error + request
- `markItemReceived(requestId, type, docId)` → update status

---

## 8. Types de Documents Supportés

| Type | Label | Patterns détectés |
|------|-------|-------------------|
| carte_identite | Carte d'identité | cni, identite, id_card |
| passeport | Passeport | passeport, passport |
| permis_conduire | Permis de conduire | permis, licence |
| rib | RIB | rib, iban, bank |
| justificatif_domicile | Justificatif de domicile | domicile, facture, edf |
| carte_grise | Carte grise | carte_grise, immatriculation |
| avis_imposition | Avis d'imposition | imposition, impot, fiscal |
| bulletin_salaire | Bulletin de salaire | salaire, paie, fiche_paie |
| attestation_assurance | Attestation | attestation, certificat |
| releve_sinistres | Relevé d'informations | releve, sinistre, bonus_malus |
| kbis | Extrait KBIS | kbis, registre_commerce |
| autre | Autre document | (défaut) |

---

## 9. Prochaines Actions

| LOT | Module | Description |
|-----|--------|-------------|
| 5 | Comparateur | Moteur comparaison offres assurance |
| 6 | Claude Vision | OCR + extraction intelligente documents |
| 7 | WhatsApp | Réception documents via message |
| 8 | Email Parsing | Extraction pièces jointes emails entrants |

---

## 10. Dépendances Ajoutées

```json
{
  "uuid": "^9.x",
  "file-type": "^19.x"
}
```
(multer déjà présent)

---

## 11. Migration

Appliquer via psql :
```bash
psql -U postgres -d courtia -f backend/sql/migrations/lot4_documents.sql
```

Ou via script migrate.js (si configuré).

---

*Rapport généré automatiquement — LOT 4 Backend Documents Clients*
