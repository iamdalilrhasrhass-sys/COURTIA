-- 126_client_document_blobs.sql
--
-- POURQUOI CETTE MIGRATION (défaut mesuré le 23/09/2026, mission ARK documents) :
--   Le backend tourne sur Render, dont le disque est ÉPHÉMÈRE : un redéploiement
--   efface tout fichier écrit localement. Or le pipeline documentaire ne
--   conservait le fichier que par un chemin disque (`client_documents.storage_path`),
--   ce qui rendait toute analyse ou toute application ultérieure impossible après
--   un simple redéploiement — et empêchait de prouver ce qui avait été analysé.
--   La table `documents_blob` existante n'est pas réutilisable : sa clé étrangère
--   pointe vers `documents(id)` (documents générés), pas vers `client_documents`.
--
--   On stocke donc le contenu des pièces déposées, en base, lié au document client.
--   Aucune donnée de décision n'est ajoutée : cette table ne fait que rendre le
--   fichier durable et vérifiable (empreinte SHA-256 conservée).
--
-- Idempotente (IF NOT EXISTS) : rejouable.

CREATE TABLE IF NOT EXISTS client_document_blobs (
  client_document_id INTEGER PRIMARY KEY REFERENCES client_documents(id) ON DELETE CASCADE,
  content            BYTEA NOT NULL,
  mime_type          VARCHAR(128) NOT NULL,
  file_name          VARCHAR(512) NOT NULL,
  size_bytes         INTEGER NOT NULL,
  checksum           VARCHAR(64),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
