-- 129 — Attribution des demandes de demonstration (premier et dernier contact) et marquage des tests.
-- Idempotent : peut etre rejoue sans effet de bord.

ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS session_id VARCHAR(64);
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS first_touch_source VARCHAR(120);
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS first_touch_medium VARCHAR(120);
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS first_touch_campaign VARCHAR(160);
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS first_touch_landing VARCHAR(255);
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS first_touch_referrer VARCHAR(255);
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS last_touch_source VARCHAR(120);
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS last_touch_medium VARCHAR(120);
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS last_touch_landing VARCHAR(255);
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT FALSE;

-- Les demandes deja enregistrees par nos propres essais ne doivent pas etre comptees comme des leads.
UPDATE demo_requests
   SET is_test = TRUE
 WHERE source IN ('test_ark_seo_20260926', 'test_seo_phase4_20260926', 'test_master_acquisition_20260926')
    OR message LIKE '%test_ark_seo_20260926%'
    OR message LIKE '%test_seo_phase4_20260926%';

CREATE INDEX IF NOT EXISTS idx_demo_requests_is_test ON demo_requests (is_test);
CREATE INDEX IF NOT EXISTS idx_demo_requests_session ON demo_requests (session_id);

COMMENT ON COLUMN demo_requests.is_test IS
  'Vrai pour les demandes issues de nos propres tests de recette : exclues des comptages business.';

-- Les essais internes anterieurs au marquage explicite doivent aussi etre exclus : ils portent
-- la mention « ne pas contacter » ou un nom de cabinet de test.
UPDATE demo_requests
   SET is_test = TRUE
 WHERE is_test = FALSE
   AND (company_name ILIKE '%(test)%'
        OR message ILIKE '%ne pas contacter%'
        OR message ILIKE '%Test technique%');
