-- ============================================================
-- COURTIA — LOT 5 : Seed Insurance Providers
-- Idempotent : INSERT ... ON CONFLICT DO NOTHING
-- ============================================================

INSERT INTO insurance_providers (code, name, type, website, api_status, supported_products, metadata) VALUES
('april', 'April', 'grossiste', 'https://www.april.fr', 'not_available', 
  '["sante", "prevoyance", "emprunteur", "auto", "habitation", "voyage"]'::jsonb,
  '{"founded": 1988, "headquarters": "Lyon", "rating": "A"}'::jsonb
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO insurance_providers (code, name, type, website, api_status, supported_products, metadata) VALUES
('alptis', 'Alptis Assurances', 'grossiste', 'https://www.alptis.org', 'not_available',
  '["sante", "prevoyance", "emprunteur", "dependance"]'::jsonb,
  '{"founded": 1976, "headquarters": "Lyon", "rating": "A-"}'::jsonb
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO insurance_providers (code, name, type, website, api_status, supported_products, metadata) VALUES
('sollyazar', 'Solly Azar', 'grossiste', 'https://www.sollyazar.com', 'not_available',
  '["sante", "prevoyance", "auto", "moto", "habitation", "pno", "mrp"]'::jsonb,
  '{"founded": 1977, "headquarters": "Paris", "rating": "A"}'::jsonb
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO insurance_providers (code, name, type, website, api_status, supported_products, metadata) VALUES
('neoliane', 'Néoliane', 'grossiste', 'https://www.neoliane-sante.fr', 'not_available',
  '["sante", "prevoyance", "obseques", "dependance"]'::jsonb,
  '{"founded": 2010, "headquarters": "Paris", "specialty": "sante_individuelle"}'::jsonb
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO insurance_providers (code, name, type, website, api_status, supported_products, metadata) VALUES
('eca', 'ECA Assurances', 'grossiste', 'https://www.eca-assurances.com', 'not_available',
  '["sante", "prevoyance", "auto", "habitation", "mrp"]'::jsonb,
  '{"founded": 1996, "headquarters": "Paris"}'::jsonb
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO insurance_providers (code, name, type, website, api_status, supported_products, metadata) VALUES
('wazari', 'Wazari', 'grossiste', 'https://www.wazari.fr', 'not_available',
  '["emprunteur", "pret_immobilier"]'::jsonb,
  '{"specialty": "emprunteur", "digital_native": true}'::jsonb
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO insurance_providers (code, name, type, website, api_status, supported_products, metadata) VALUES
('assurone', 'AssurOne Group', 'grossiste', 'https://www.assurone.com', 'not_available',
  '["sante", "prevoyance", "auto", "habitation", "mrp", "rc_pro"]'::jsonb,
  '{"founded": 1983, "headquarters": "Neuilly-sur-Seine"}'::jsonb
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO insurance_providers (code, name, type, website, api_status, supported_products, metadata) VALUES
('assurimo', 'Assurimo', 'grossiste', 'https://www.assurimo.fr', 'not_available',
  '["pno", "habitation", "copropriete", "immeuble"]'::jsonb,
  '{"specialty": "immobilier", "headquarters": "Paris"}'::jsonb
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO insurance_providers (code, name, type, website, api_status, supported_products, metadata) VALUES
('swisslife', 'SwissLife', 'compagnie', 'https://www.swisslife.fr', 'not_available',
  '["sante", "prevoyance", "epargne", "retraite", "vie"]'::jsonb,
  '{"founded": 1857, "headquarters": "Zurich", "rating": "A+", "type_entity": "compagnie_vie"}'::jsonb
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO insurance_providers (code, name, type, website, api_status, supported_products, metadata) VALUES
('generali', 'Generali France', 'compagnie', 'https://www.generali.fr', 'not_available',
  '["sante", "prevoyance", "auto", "habitation", "vie", "epargne", "retraite", "rc_pro"]'::jsonb,
  '{"founded": 1831, "headquarters": "Paris", "rating": "A", "type_entity": "compagnie_iard_vie"}'::jsonb
)
ON CONFLICT (code) DO NOTHING;

-- ============================================================
-- FIN SEED PROVIDERS
-- ============================================================