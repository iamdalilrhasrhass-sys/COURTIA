-- =============================================================
-- LOT 9 : VOICE INTAKE — Transcription appels → fiche client IA
-- Migration COURTIA
-- =============================================================

-- Table principale des intakes vocaux
CREATE TABLE IF NOT EXISTS voice_intakes (
  id SERIAL PRIMARY KEY,
  broker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id INTEGER REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Audio
  audio_storage_path VARCHAR(500),
  audio_duration_seconds INTEGER,
  audio_size_bytes INTEGER,
  
  -- Transcription
  transcript TEXT,
  transcript_language VARCHAR(10) DEFAULT 'fr',
  transcription_engine VARCHAR(50),
  transcription_cost_usd NUMERIC(10,6),
  
  -- Extraction IA
  extracted_data JSONB,
  suggested_client JSONB,
  suggested_needs JSONB,
  suggested_documents JSONB,
  suggested_next_action JSONB,
  
  -- Status et tracking
  status VARCHAR(40) DEFAULT 'pending',
  processed_at TIMESTAMP,
  applied_at TIMESTAMP,
  ai_cost_usd NUMERIC(10,6),
  total_latency_ms INTEGER,
  
  -- Meta
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour performances
CREATE INDEX IF NOT EXISTS idx_voice_broker ON voice_intakes(broker_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_voice_client ON voice_intakes(client_id);
CREATE INDEX IF NOT EXISTS idx_voice_status ON voice_intakes(status);

-- Commentaires
COMMENT ON TABLE voice_intakes IS 'LOT 9: Intakes vocaux (transcription appel → fiche client IA)';
COMMENT ON COLUMN voice_intakes.extracted_data IS 'JSON complet extrait par ARK (client, besoins, objections, etc)';
COMMENT ON COLUMN voice_intakes.suggested_client IS 'Suggestion de fiche client pré-remplie';
COMMENT ON COLUMN voice_intakes.suggested_needs IS 'Besoins identifiés pour devoir de conseil';
COMMENT ON COLUMN voice_intakes.suggested_documents IS 'Pièces à demander au client';
COMMENT ON COLUMN voice_intakes.suggested_next_action IS 'Prochaine action recommandée';

-- Statuts possibles:
-- pending    : Upload reçu, en attente traitement
-- processing : Transcription/extraction en cours
-- ready      : Prêt à être appliqué
-- applied    : Appliqué (client créé/mis à jour)
-- error      : Erreur durant traitement
-- cancelled  : Annulé par le courtier

SELECT 'LOT 9 Voice Intake migration applied' AS result;
