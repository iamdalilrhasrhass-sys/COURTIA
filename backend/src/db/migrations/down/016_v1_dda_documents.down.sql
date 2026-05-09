DELETE FROM feature_flags WHERE key = 'v1_dda_documents';
DROP TABLE IF EXISTS document_activity_log;
DROP TABLE IF EXISTS documents_blob;
DROP TABLE IF EXISTS documents;
ALTER TABLE cabinets DROP COLUMN IF EXISTS dpa_signed_at;
ALTER TABLE cabinets DROP COLUMN IF EXISTS tutelle_authority;
