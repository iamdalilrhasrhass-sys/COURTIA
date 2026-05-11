# LOT 9 — Voice Intake (Rapport)

## Objectif
Transcription d'un appel audio + extraction IA des informations clés → fiche client pré-remplie.

**Différenciateur #3** : aucun CRM courtier français n'a ça.

## Architecture

```
audio upload (multipart)
    ↓
multer (mémoire, 25MB max)
    ↓
transcriber.saveAudioFile → /storage/voice/<broker>/<uuid>.<ext>
    ↓
intakeProcessor.processIntake (async)
    ├─ transcriber.transcribe (Whisper API OpenAI)
    │     → text, language, duration_s, cost_usd
    ├─ extractor.extractFromTranscript (arkEngine.callArkStructured)
    │     → { client, besoins, situation, objections, pieces_demandees, prochaine_action }
    └─ UPDATE voice_intakes (status='ready', extracted_data, suggested_*)

         puis quand le courtier clique "Appliquer" :

intakeProcessor.applyIntake
    ├─ INSERT/UPDATE clients (suggested_client)
    ├─ INSERT relances (besoins urgents)
    ├─ INSERT opportunites (cross-sell détecté)
    ├─ POST document-request (pieces_demandees)
    └─ UPDATE voice_intakes (status='applied', applied_at)
```

## Fichiers livrés

| Fichier | Taille | Rôle |
|---------|--------|------|
| `backend/sql/migrations/lot9_voice.sql` | 2.4K | Table `voice_intakes` + index |
| `backend/src/services/voice/transcriber.js` | 6.4K | Wrapper Whisper API |
| `backend/src/services/voice/extractor.js` | 9.9K | Extraction structurée ARK |
| `backend/src/services/voice/intakeProcessor.js` | 16K | Orchestrateur + applyIntake |
| `backend/src/routes/voice.js` | 7.3K | 9 routes API multipart |

## Routes API

- `POST /api/voice/upload` — multipart `audio`, lance traitement async, renvoie 202
- `GET /api/voice/intakes` — liste filtrée (status, limit, offset)
- `GET /api/voice/intakes/:id` — détails complet
- `GET /api/voice/intakes/:id/transcript` — texte transcrit seul
- `GET /api/voice/intakes/:id/audio` — stream du fichier audio
- `POST /api/voice/intakes/:id/reprocess` — relance extraction
- `POST /api/voice/intakes/:id/apply` — applique (crée client + actions)
- `DELETE /api/voice/intakes/:id` — supprime intake + audio
- `GET /api/voice/stats` — KPI courtier

## Schéma extracted_data (JSON)

```json
{
  "client": {
    "prenom": "Jean",
    "nom": "Dupont",
    "telephone": "+33612345678",
    "email": null,
    "date_naissance": "1985-03-12",
    "profession": "Cadre",
    "confidence": 0.92
  },
  "besoins": [
    { "type": "auto", "detail": "Renouvellement assurance auto", "urgence": "normale" }
  ],
  "situation_actuelle": "Propriétaire véhicule récent, 2 enfants",
  "objections": ["budget mensuel < 60€"],
  "pieces_demandees": [
    { "type": "carte_grise", "raison": "tarification auto" },
    { "type": "releve_information", "raison": "antécédents bonus/malus" }
  ],
  "prochaine_action": {
    "type": "envoi_devis",
    "detail": "Envoyer 3 devis comparatifs auto avant le 18/05",
    "deadline_iso": "2026-05-18T00:00:00Z"
  },
  "resume_court": "Cadre 41 ans, renouvellement auto, budget 60€/mois, devis attendus.",
  "confidence_globale": 0.88
}
```

## Coût estimé par intake

- Whisper (3 min audio) : 3 × 0,006 $ = **0,018 $**
- ARK extraction (transcript ~500 mots) : ~**0,01 $**
- **Total ≈ 3 centimes par appel traité**

Compare avec : 5-10 min de ressaisie manuelle du courtier = ~5-10 € de temps coûteux.

## Configuration

Variable d'env requise dans `.env` :
```
OPENAI_API_KEY=sk-...
```

Si absente, `/api/voice/upload` renvoie `503` propre (pas de crash).

## Prochaines étapes

- LOT 10 : Document Vision Pipeline (RIB, carte grise, attestation)
- LOT 11 : Multi-Provider Quote Intelligence (mails compagnies avec jargon adapté)

## Limites V1

- Pas de diarisation (qui parle quand) — V2 possible avec Whisper segments
- Pas de stockage chiffré audio — à ajouter LOT conformité
- Pas d'écran "Apply" frontend — sera créé dans LOT 14/15
