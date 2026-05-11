# LOT 12 — Portail Client Self-Service

**Date** : 2026-05-11  
**Statut** : ✅ Implémenté  
**Auteur** : ARK (CTO COURTIA)

---

## 1. Vue d'ensemble

Le LOT 12 introduit un **portail client moderne** permettant aux clients des courtiers d'accéder à leur espace personnel sécurisé. Ce portail self-service offre une expérience premium qui différencie COURTIA de ses concurrents (Kase, Lya).

### Fonctionnalités principales

| Fonctionnalité | Description |
|----------------|-------------|
| **Authentification séparée** | JWT avec audience='client_portal', indépendant du JWT courtier |
| **Gestion des contrats** | Visualisation des contrats actifs (auto, habitation, santé, etc.) |
| **Documents** | Téléchargement attestations, IPID, CG, factures |
| **Upload pièces** | Upload des documents demandés par le courtier |
| **Signature électronique** | Click-to-sign pour devoir de conseil, mandat |
| **Demande de devis** | Formulaire de demande nouveau devis |
| **Messagerie sécurisée** | Canal de communication avec le courtier |

---

## 2. Architecture technique

### 2.1 Séparation des contextes d'authentification

```
┌─────────────────────────────────────────────────────────────┐
│                        COURTIA                               │
├─────────────────────────────┬───────────────────────────────┤
│     ESPACE COURTIER         │      PORTAIL CLIENT           │
│     (/api/portail/...)      │      (/api/portal/...)        │
├─────────────────────────────┼───────────────────────────────┤
│  JWT standard               │  JWT audience='client_portal' │
│  verifyToken middleware     │  verifyClientPortalToken      │
│  req.user (userId, email)   │  req.portalUser (clientId)    │
└─────────────────────────────┴───────────────────────────────┘
```

### 2.2 Tables de données

```sql
-- Comptes portail client
client_portal_accounts
  ├── client_id (FK clients)
  ├── broker_id (FK users)
  ├── email, password_hash
  ├── activation_token, reset_token
  └── status (pending, active, disabled)

-- Messages sécurisés
client_portal_messages
  ├── client_id, broker_id
  ├── sender (client|broker)
  └── body, attachments, read_at

-- Signatures électroniques
client_portal_signatures
  ├── compliance_document_id
  ├── signature_proof (JSON)
  └── ip_address, user_agent

-- Demandes de devis
client_portal_quote_requests
  ├── insurance_type
  ├── criteria (JSON)
  └── status, quote_id

-- Demandes de pièces
client_document_requests
  ├── document_type
  └── status (pending, fulfilled)
```

---

## 3. Flux d'invitation client

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│  COURTIER   │       │   API       │       │   CLIENT    │
└──────┬──────┘       └──────┬──────┘       └──────┬──────┘
       │                      │                     │
       │ POST /api/portail/   │                     │
       │ invitations          │                     │
       │─────────────────────>│                     │
       │                      │                     │
       │  {activation_link}   │                     │
       │<─────────────────────│                     │
       │                      │                     │
       │   Envoie lien via    │                     │
       │   WhatsApp/SMS/Email │                     │
       │──────────────────────────────────────────>│
       │                      │                     │
       │                      │  POST /api/portal/  │
       │                      │  auth/activate      │
       │                      │<────────────────────│
       │                      │                     │
       │                      │  JWT token (7j)     │
       │                      │────────────────────>│
       │                      │                     │
       │                      │  Client connecté    │
       │                      │  au portail         │
```

---

## 4. Routes API

### 4.1 Routes Courtier (`/api/portail/...`) — Protégées verifyToken

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/invitations` | Créer invitation portail |
| GET | `/accounts` | Lister comptes portail |
| GET | `/accounts/:id` | Détails compte |
| POST | `/accounts/:id/reinvite` | Régénérer token activation |
| DELETE | `/accounts/:id` | Désactiver compte |
| GET | `/messages?client_id=...` | Messages avec un client |
| POST | `/messages` | Envoyer message |
| GET | `/unread-count` | Nombre messages non lus |
| POST | `/document-requests` | Demander une pièce |
| GET | `/document-requests` | Lister demandes pièces |

### 4.2 Routes Client (`/api/portal/...`) — Auth séparée

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/auth/activate` | Public | Activer compte |
| POST | `/auth/login` | Public | Connexion |
| POST | `/auth/request-reset` | Public | Demande reset MDP |
| POST | `/auth/reset` | Public | Reset MDP |
| GET | `/me` | Token | Infos client |
| GET | `/contracts` | Token | Liste contrats |
| GET | `/documents` | Token | Liste documents |
| GET | `/documents/:id/download` | Token | Télécharger PDF |
| POST | `/documents/upload` | Token | Upload pièce |
| GET | `/document-requests` | Token | Pièces demandées |
| POST | `/signatures` | Token | Signer document |
| GET | `/messages` | Token | Messages courtier |
| POST | `/messages` | Token | Envoyer message |
| GET | `/quote-requests` | Token | Demandes devis |
| POST | `/quote-requests` | Token | Nouvelle demande |

---

## 5. Sécurité

### 5.1 Authentification

- **Mot de passe** : bcrypt 12 rounds
- **Token activation** : 32 bytes hex, expire 48h
- **Token reset** : 32 bytes hex, expire 1h
- **JWT** : 7 jours, audience='client_portal'

### 5.2 Audit trail

Chaque signature enregistre :
- Méthode (click_to_sign)
- Timestamp ISO 8601
- IP address
- User-Agent (tronqué 500 chars)
- Preuve JSON avec identifiants

### 5.3 Isolation des données

- `broker_id` filtré dans toutes les requêtes courtier
- `client_id` extrait du JWT pour routes client
- Impossible d'accéder aux données d'un autre courtier/client

---

## 6. Exemple de flux JSON

### 6.1 Création invitation

**Request:**
```json
POST /api/portail/invitations
{
  "client_id": 42,
  "email": "jean.dupont@email.com"
}
```

**Response:**
```json
{
  "success": true,
  "account": {
    "id": 1,
    "clientId": 42,
    "email": "jean.dupont@email.com",
    "status": "pending"
  },
  "activation": {
    "token": "a7f3c2...64 chars hex",
    "link": "https://app.courtiark.fr/portal/activate?token=a7f3c2...",
    "expiresAt": "2026-05-13T14:30:00.000Z",
    "expiresInHours": 48
  },
  "message": "Invitation créée. Envoyez le lien d'activation au client."
}
```

### 6.2 Activation par le client

**Request:**
```json
POST /api/portal/auth/activate
{
  "token": "a7f3c2...64 chars hex",
  "password": "MonMotDePasse123!"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIs...(JWT 7 jours)",
  "account": {
    "id": 1,
    "clientId": 42,
    "email": "jean.dupont@email.com",
    "name": "Jean Dupont"
  }
}
```

### 6.3 Signature click-to-sign

**Request:**
```json
POST /api/portal/signatures
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
{
  "compliance_document_id": 15
}
```

**Response:**
```json
{
  "success": true,
  "signature": {
    "id": 1,
    "documentId": 15,
    "signedAt": "2026-05-11T16:45:00.000Z"
  }
}
```

---

## 7. Fichiers créés

```
backend/
├── sql/migrations/
│   └── lot12_portail.sql           # 5 tables + index
├── src/services/portail/
│   ├── portalAuth.js               # Auth client séparée
│   └── portalInvite.js             # Gestion invitations
└── src/routes/
    ├── portail.js                  # 10 routes courtier
    └── portalClient.js             # 13 routes client
```

---

## 8. Prochaines évolutions (V2)

- [ ] **Envoi email automatique** : Intégration Resend/SendGrid pour invitation
- [ ] **Cookie httpOnly** : Alternative au localStorage pour JWT
- [ ] **Paiement Stripe** : Payer ses échéances depuis le portail
- [ ] **Notifications push** : Alertes nouveau message/document
- [ ] **Multi-factor auth** : SMS OTP pour sécurité renforcée
- [ ] **Design System Aurora** : LOT 13 — UI/UX premium

---

## 9. Résumé

Le LOT 12 ajoute un **portail client complet** avec :
- Authentification JWT séparée (audience client_portal)
- 10 routes courtier pour gérer invitations et messages
- 13 routes client self-service (contrats, docs, signatures, devis)
- Signature électronique click-to-sign avec audit trail
- Canal de messagerie sécurisé client ↔ courtier
- Système d'invitation par lien (WhatsApp/SMS/Email)

**COURTIA dispose désormais d'un portail client premium** qui positionne la plateforme au-dessus de la concurrence.