-- Migration 128 : notation des prospects d'autorite et suivi des partenariats (COURTIARK)
-- But : passer de 44 domaines « a_contacter » a une liste notee, avec le contact reel
-- identifie et la raison du contact. Aucune autorite de domaine n'est inventee : la colonne
-- 'autorite' reste nulle tant qu'aucun outil de mesure n'est disponible.

ALTER TABLE backlink_prospects ADD COLUMN IF NOT EXISTS score integer;
ALTER TABLE backlink_prospects ADD COLUMN IF NOT EXISTS canal text;
ALTER TABLE backlink_prospects ADD COLUMN IF NOT EXISTS contact_nom text;
ALTER TABLE backlink_prospects ADD COLUMN IF NOT EXISTS contact_email text;
ALTER TABLE backlink_prospects ADD COLUMN IF NOT EXISTS canal_contact text;
ALTER TABLE backlink_prospects ADD COLUMN IF NOT EXISTS raison_contact text;
ALTER TABLE backlink_prospects ADD COLUMN IF NOT EXISTS actif_propose text;
ALTER TABLE backlink_prospects ADD COLUMN IF NOT EXISTS autorite text DEFAULT 'non mesuree';
ALTER TABLE backlink_prospects ADD COLUMN IF NOT EXISTS rang integer;

CREATE TABLE IF NOT EXISTS seo_partnership_prospects (
  id serial PRIMARY KEY,
  organisation text NOT NULL,
  pays text,
  type_acteur text,
  site text,
  contact_nom text,
  contact_email text,
  canal_contact text,
  complementarite text,
  actif_propose text,
  statut text DEFAULT 'a_contacter',
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS seo_partnership_prospects_site_uidx ON seo_partnership_prospects (site);
