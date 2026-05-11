# LOT 7 — ARK Watch : Surveillance Proactive du Portefeuille

**Différenciateur #1 COURTIA** — Aucun CRM courtier français ne fait ça.

## 📋 Vue d'ensemble

ARK Watch est un système de surveillance proactive qui tourne en continu (cron + event-driven) pour détecter automatiquement les opportunités et alertes dans le portefeuille du courtier.

Le courtier ouvre son dashboard et voit son **Morning Brief** généré pendant la nuit.

## 🏗️ Architecture

```
backend/
├── sql/migrations/
│   └── lot7_arkwatch.sql              # Tables signaux + runs
├── src/services/arkWatch/
│   ├── detectors/                     # 8 détecteurs modulaires
│   │   ├── hamon.js                   # Loi Hamon (résiliation > 1 an)
│   │   ├── chatel.js                  # Préavis Chatel (60-75j)
│   │   ├── silence.js                 # Clients inactifs
│   │   ├── echeance.js                # Échéances 30/60/90j
│   │   ├── documentsExpired.js        # Pièces périmées
│   │   ├── documentsMissing.js        # Dossier incomplet
│   │   ├── crossSell.js               # Cross-sell (SQL+IA)
│   │   ├── reconquete.js              # Ex-clients (SQL+IA)
│   │   └── index.js                   # Orchestrateur
│   ├── runner.js                      # Coordinateur principal
│   └── index.js                       # Export module
├── src/routes/
│   └── arkWatch.js                    # 9 routes API
└── scripts/
    └── arkWatchCron.js                # Script cron standalone
```

## 🔍 Détecteurs Livrés

| Code | Nom | Type | Sévérité | Description |
|------|-----|------|----------|-------------|
| `hamon` | Loi Hamon | SQL pur | high | Contrats auto/habitation/santé > 1 an résiliables |
| `chatel` | Préavis Chatel | SQL pur | high | Échéance dans 60-75 jours, relance obligatoire |
| `echeance` | Échéance proche | SQL pur | medium | Contrats expirant dans 30/60/90 jours |
| `silence` | Silence anormal | SQL pur | medium | Clients sans contact > X jours selon profil |
| `documents_expired` | Doc expiré | SQL pur | medium | Permis, CG, RIB périmés |
| `documents_missing` | Doc manquant | SQL pur | low | Dossier incomplet selon type contrat |
| `cross_sell` | Cross-sell | SQL + ARK | medium | Opportunités vente croisée (auto→habitation...) |
| `reconquete` | Reconquête | SQL + ARK | low | Ex-clients résiliés 6-24 mois |

### Logique SQL vs SQL+IA

**SQL pur** (6 détecteurs) :
- Exécution rapide (<100ms)
- Pas de coût API
- Règles métier déterministes

**SQL + ARK IA** (2 détecteurs) :
- Pré-filtre SQL pour réduire les candidats
- ARK Claude pour scoring intelligent et reasoning
- Fallback SQL si timeout ou erreur API

## 📊 Tables SQL

### ark_watch_signals
```sql
CREATE TABLE ark_watch_signals (
  id SERIAL PRIMARY KEY,
  broker_id INTEGER NOT NULL REFERENCES users(id),
  client_id INTEGER REFERENCES clients(id),
  quote_id INTEGER REFERENCES quotes(id),
  signal_type VARCHAR(80) NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium',  -- high, medium, low
  score INTEGER DEFAULT 50,                -- 0-100
  title VARCHAR(300),
  description TEXT,
  suggested_action TEXT,
  estimated_value NUMERIC(10,2),
  status VARCHAR(40) DEFAULT 'new',        -- new, acknowledged, resolved
  detected_at TIMESTAMP,
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  dedup_key VARCHAR(200),                  -- clé unique pour éviter doublons
  metadata JSONB,
  UNIQUE(broker_id, dedup_key)             -- ON CONFLICT DO NOTHING
);
```

### ark_watch_runs
```sql
CREATE TABLE ark_watch_runs (
  id SERIAL PRIMARY KEY,
  broker_id INTEGER REFERENCES users(id),
  run_type VARCHAR(50),           -- 'cron', 'manual'
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(40),             -- 'running', 'completed', 'failed'
  signals_detected INTEGER,
  signals_by_type JSONB,
  errors INTEGER,
  error_details JSONB,
  duration_ms INTEGER
);
```

## 🛤️ Routes API (9)

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/ark-watch/signals` | Liste signaux (filtres: status, severity, type, client_id) |
| GET | `/api/ark-watch/signals/:id` | Détail d'un signal |
| POST | `/api/ark-watch/signals/:id/acknowledge` | Marquer comme vu |
| POST | `/api/ark-watch/signals/:id/resolve` | Marquer comme résolu |
| DELETE | `/api/ark-watch/signals/:id` | Supprimer (dismiss) |
| POST | `/api/ark-watch/run` | Déclencher manuellement |
| GET | `/api/ark-watch/stats` | KPIs (signaux actifs, valeur estimée) |
| GET | `/api/ark-watch/morning-brief` | Morning Brief complet |
| GET | `/api/ark-watch/runs` | Historique des runs |
| GET | `/api/ark-watch/detectors` | Liste des détecteurs |

## ⏰ Cron Script

```bash
# Exécution normale (production)
node scripts/arkWatchCron.js

# Mode dry-run (pas d'INSERT)
node scripts/arkWatchCron.js --dry-run

# Limiter à N courtiers
node scripts/arkWatchCron.js --limit=10

# Crontab suggérée (06h00 Europe/Paris)
0 6 * * * cd /srv/courtia/backend && node scripts/arkWatchCron.js >> /var/log/arkwatch.log 2>&1
```

## 🔄 Flux de fonctionnement

```
┌─────────────────────────────────────────────────────────────────┐
│  CRON 06h00 (ou déclenchement manuel)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Pour chaque courtier actif:                                   │
│  1. INSERT ark_watch_runs (status='running')                   │
│  2. Exécuter 8 détecteurs séquentiellement                     │
│  3. INSERT signaux en bulk (ON CONFLICT DO NOTHING)            │
│  4. UPDATE ark_watch_runs avec stats                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Courtier ouvre son dashboard                                   │
│  → GET /api/ark-watch/morning-brief                            │
│  → Voit ses signaux prioritaires du jour                       │
└─────────────────────────────────────────────────────────────────┘
```

## 📦 Exemple JSON Signal

```json
{
  "id": 42,
  "type": "hamon",
  "severity": "high",
  "score": 85,
  "title": "Loi Hamon : Auto résiliable (2 ans)",
  "description": "Jean Dupont — Contrat auto de 2 ans résiliable sans frais. Prime actuelle : 650€/an.",
  "suggested_action": "Proposer une comparaison tarifaire. Économie potentielle estimée : 78€/an.",
  "estimated_value": 78.00,
  "status": "new",
  "detected_at": "2026-05-11T06:00:00.000Z",
  "client": {
    "id": 123,
    "name": "Jean Dupont",
    "email": "jean.dupont@email.com"
  },
  "metadata": {
    "product_type": "Auto",
    "years_active": 2,
    "current_premium": 650,
    "anniversary_month": 7
  }
}
```

## 🔐 Déduplication

Chaque signal a une `dedup_key` unique par courtier :
- `hamon:{quote_id}:{month}` — Évite doublons mensuels Hamon
- `chatel:{quote_id}:{month}` — Évite doublons Chatel
- `silence:{client_id}:{week}` — Vérifie hebdomadairement
- `crosssell:{client_id}:{product}:{month}` — Une opportunité par produit/mois

La contrainte `UNIQUE(broker_id, dedup_key)` + `ON CONFLICT DO NOTHING` garantit zéro doublon.

## 🚀 Prochaines Actions (LOT 8)

- **Compose IPID/DDA** : Génération automatique documents réglementaires
- **Devoir de conseil** : Assistant IA pour conformité
- **Notifications push** : Alertes temps réel sur signaux critiques
- **Intégration calendar** : Création automatique de tâches depuis signaux

---

*Document généré le 2026-05-11 — LOT 7 ARK Watch v1.0*
