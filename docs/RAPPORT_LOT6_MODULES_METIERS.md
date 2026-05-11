# RAPPORT LOT 6 — Modules Métier avec IA

**Date**: 2026-05-11  
**Auteur**: ARK (CTO COURTIA)  
**Version**: 1.0.0

---

## 📋 Résumé

Le LOT 6 implémente 3 modules métier essentiels pour les courtiers :
- **Devis** : Gestion complète du cycle de vie des devis avec IA
- **Relances** : Système de relances automatiques et manuelles
- **Opportunités** : Détection IA de cross-sell et reconquête

Total : **25 routes API** créées, **2 tables SQL**, **9 endpoints IA**.

---

## 🗂️ Modules Livrés

### 1. Module DEVIS (`/api/devis`)

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/devis` | GET | Liste des devis du courtier (filtres: status, client_id, product_type) |
| `/api/devis/:id` | GET | Détail d'un devis avec résultats fournisseurs |
| `/api/devis` | POST | Créer un nouveau devis |
| `/api/devis/:id` | PUT | Modifier un devis (critères, status, metadata) |
| `/api/devis/:id` | DELETE | Supprimer un devis |
| `/api/devis/:id/ai-prepare` | POST | **ARK** prépare checklist documents + questions client |
| `/api/devis/:id/ai-recommendation` | POST | **ARK** compare offres et recommande le meilleur |
| `/api/devis/:id/generate-proposal` | POST | **ARK** génère proposition client formatée |

**Table utilisée** : `quote_requests` (existante, colonne `metadata` ajoutée)

### 2. Module RELANCES (`/api/relances`)

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/relances` | GET | Liste des relances (filtres: status, client, type, priority) |
| `/api/relances/stats` | GET | KPIs : envoyées, taux réponse, par type/canal |
| `/api/relances/:id` | GET | Détail d'une relance |
| `/api/relances` | POST | Créer une relance manuelle |
| `/api/relances/:id` | PUT | Modifier une relance |
| `/api/relances/:id` | DELETE | Supprimer une relance |
| `/api/relances/:id/send` | POST | Marquer comme envoyée |
| `/api/relances/auto-generate` | POST | **ARK** scanne portefeuille → génère relances prioritaires |
| `/api/relances/:id/ai-content` | POST | **ARK** génère contenu personnalisé (email/SMS/WhatsApp) |

**Table** : `relances` (enrichie avec colonnes broker_id, priority, ai_generated, etc.)

### 3. Module OPPORTUNITÉS (`/api/opportunites`)

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/opportunites` | GET | Liste des opportunités (filtres: status, type, score_min) |
| `/api/opportunites/stats` | GET | KPIs : potentiel, taux conversion, par type/produit |
| `/api/opportunites/:id` | GET | Détail d'une opportunité avec contrats actuels |
| `/api/opportunites/:id` | PUT | Modifier statut (detected → contacted → converted) |
| `/api/opportunites/:id` | DELETE | Supprimer une opportunité |
| `/api/opportunites/detect` | POST | **ARK** scanne portefeuille → détecte opportunités cross-sell |
| `/api/opportunites/:id/ai-pitch` | POST | **ARK** génère argumentaire commercial personnalisé |

**Table** : `opportunites` (nouvelle)

---

## 🗄️ Base de Données

### Table `relances` (enrichie)

```sql
-- Colonnes ajoutées
broker_id INTEGER REFERENCES users(id)
quote_id INTEGER REFERENCES quotes(id)
quote_request_id INTEGER REFERENCES quote_requests(id)
type VARCHAR(50)
channel VARCHAR(30) DEFAULT 'email'
scheduled_at TIMESTAMP
sent_at TIMESTAMP
status VARCHAR(40) DEFAULT 'pending'
priority VARCHAR(20) DEFAULT 'medium'
subject VARCHAR(300)
content TEXT
ai_generated BOOLEAN DEFAULT false
ai_reasoning TEXT
response_received BOOLEAN DEFAULT false
response_at TIMESTAMP
metadata JSONB DEFAULT '{}'
updated_at TIMESTAMP DEFAULT NOW()
```

### Table `opportunites` (nouvelle)

```sql
CREATE TABLE opportunites (
  id SERIAL PRIMARY KEY,
  broker_id INTEGER NOT NULL REFERENCES users(id),
  client_id INTEGER NOT NULL REFERENCES clients(id),
  type VARCHAR(60),
  product_current VARCHAR(200),
  product_target VARCHAR(80),
  score INTEGER DEFAULT 50,
  estimated_revenue NUMERIC(10,2) DEFAULT 0,
  status VARCHAR(40) DEFAULT 'detected',
  reasoning TEXT,
  suggested_action TEXT,
  detected_at TIMESTAMP DEFAULT NOW(),
  contacted_at TIMESTAMP,
  converted_at TIMESTAMP,
  quote_request_id INTEGER REFERENCES quote_requests(id),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🤖 Endpoints IA (ARK)

### Schémas JSON Structurés

Chaque endpoint IA utilise `callArkStructured` avec des schémas JSON stricts :

#### 1. ai-prepare (Devis)
```json
{
  "checklist_documents": [
    { "document": "Pièce d'identité", "obligatoire": true, "raison": "KYC réglementaire" }
  ],
  "questions_client": [
    { "question": "Usage du véhicule ?", "importance": "haute", "contexte": "Tarification" }
  ],
  "points_attention": ["Client à risque aggravé"],
  "estimation_delai_jours": 3,
  "conseil_approche": "Appeler avant envoi email"
}
```

#### 2. ai-recommendation (Devis)
```json
{
  "recommandation_principale": {
    "provider_code": "axa",
    "provider_name": "AXA France",
    "prime_annuelle": 850,
    "score_global": 85,
    "raisons": ["Meilleur rapport qualité/prix", "Garanties complètes"]
  },
  "alternatives": [...],
  "analyse_comparative": "AXA propose la couverture la plus adaptée...",
  "argumentaire_client": "Cette solution vous offre..."
}
```

#### 3. auto-generate (Relances)
```json
{
  "relances": [
    {
      "client_id": 42,
      "client_name": "Martin Conseil",
      "type": "devis_sans_reponse",
      "priority": "high",
      "channel": "phone",
      "subject": "Suite à notre proposition",
      "reasoning": "Devis envoyé il y a 10 jours sans retour"
    }
  ],
  "analyse_globale": "5 relances prioritaires identifiées ce jour",
  "priorite_jour": [42, 15, 78]
}
```

#### 4. detect (Opportunités)
```json
{
  "opportunites": [
    {
      "client_id": 42,
      "type": "cross_sell",
      "product_current": "RC Pro",
      "product_target": "Cyber",
      "score": 85,
      "estimated_revenue": 1800,
      "reasoning": "Client exposé numériquement sans couverture Cyber",
      "suggested_action": "Proposer audit gratuit"
    }
  ],
  "potentiel_total": 25000,
  "analyse_portefeuille": "Portefeuille sous-équipé en Cyber et Prévoyance"
}
```

#### 5. ai-pitch (Opportunités)
```json
{
  "accroche": "Bonjour M. Martin, j'ai une bonne nouvelle...",
  "contexte_client": "Vous êtes client depuis 3 ans...",
  "arguments_cles": ["Protection complète", "Prime optimisée", "Démarche simplifiée"],
  "objections_anticipees": [
    { "objection": "Je suis déjà couvert", "reponse": "Vérifions ensemble les exclusions..." }
  ],
  "questions_decouverte": ["Comment gérez-vous vos données clients ?"],
  "closing": "Je vous propose un RDV de 15 min cette semaine"
}
```

---

## 📊 Exemples de Payloads

### Créer un devis
```bash
POST /api/devis
{
  "client_id": 42,
  "product_type": "auto",
  "criteria": {
    "vehicule": { "marque": "Renault", "modele": "Clio", "annee": 2022 },
    "conducteur": { "age": 35, "bonus": 0.50 }
  }
}
```

### Générer relances automatiques
```bash
POST /api/relances/auto-generate
{
  "max_relances": 10
}
```

### Détecter opportunités
```bash
POST /api/opportunites/detect
{
  "max_opportunites": 20,
  "force_rescan": false
}
```

---

## 🔐 Sécurité

- **Auth JWT** : Toutes les routes protégées par `verifyToken`
- **Filtrage broker_id** : Chaque requête filtre sur `broker_id = req.user.id`
- **SQL paramétré** : Aucune concaténation SQL, uniquement `$1, $2, ...`
- **Logging ARK** : Tous les appels IA loggés dans `ark_runs`

---

## 📈 Prochaines Actions (LOT 7+)

1. **Frontend** : Connecter les pages Devis.jsx, Relances.jsx, Opportunites.jsx aux vraies APIs
2. **Webhooks** : Notifier le courtier quand ARK détecte une opportunité haute priorité
3. **Cron nocturne** : Exécuter `opportunites/detect` et `relances/auto-generate` automatiquement
4. **Métriques** : Dashboard admin pour suivre l'utilisation des fonctionnalités IA
5. **Mobile** : Notifications push pour relances urgentes

---

## ✅ Checklist Livraison

- [x] Migration SQL `lot6_metiers.sql` appliquée
- [x] Table `relances` enrichie (17 colonnes ajoutées)
- [x] Table `opportunites` créée
- [x] Module `devis.js` — 8 routes
- [x] Module `relances.js` — 9 routes
- [x] Module `opportunites.js` — 7 routes
- [x] Routes montées dans `server.js`
- [x] Syntaxe validée (`node --check`)
- [x] Documentation complète

---

**LOT 6 TERMINÉ** ✅
