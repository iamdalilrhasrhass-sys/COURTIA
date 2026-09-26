-- 127 — Base de contenu SEO publique (COURTIARK) et prospects d'autorité.
--
-- Objectif : disposer d'une base dédiée au contenu SEO (une ligne par page publique)
-- et d'un suivi des prospects de backlinks, au lieu de fichiers épars.
--
-- Idempotente : peut être rejouée sans erreur.

CREATE TABLE IF NOT EXISTS seo_pages (
  id SERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,                 -- chemin public, sans slash final ('' = accueil)
  page_type TEXT NOT NULL,                   -- home | money | feature | solution | geo | vertical | hub | guide | comparatif | tool | trust | convert
  country TEXT NOT NULL DEFAULT 'FR',        -- FR | CH
  region TEXT,
  department_or_canton TEXT,
  city TEXT,
  locale TEXT NOT NULL DEFAULT 'fr-FR',      -- fr-FR | fr-CH
  primary_keyword TEXT,
  secondary_keywords TEXT[],
  search_intent TEXT,                        -- transactionnel | informationnel | navigationnel | local
  persona TEXT,                              -- courtier independant | cabinet | equipe commerciale | reseau
  insurance_vertical TEXT,
  meta_title TEXT,
  meta_description TEXT,
  h1 TEXT,
  hero_subtitle TEXT,
  intro TEXT,
  pain_points TEXT[],
  benefits TEXT[],
  features TEXT[],
  use_cases TEXT[],
  local_context TEXT,
  regulatory_context TEXT,
  faq JSONB,
  cta_primary TEXT,
  cta_secondary TEXT,
  internal_links TEXT[],
  external_sources TEXT[],
  schema_type TEXT,                          -- SoftwareApplication, Service, Article, FAQPage, ...
  canonical_url TEXT,
  hreflang_group TEXT,
  content_hash TEXT,                         -- hash normalisé du contenu rendu (anti-duplication)
  semantic_embedding JSONB,                  -- réservé : empreinte sémantique lorsque l'architecture le permettra
  source_verified BOOLEAN NOT NULL DEFAULT FALSE,
  content_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  seo_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  indexable BOOLEAN NOT NULL DEFAULT FALSE,  -- n'est vrai qu'après passage du contrôle d'indexabilité
  published BOOLEAN NOT NULL DEFAULT FALSE,
  bytes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_seo_pages_type ON seo_pages (page_type, country);
CREATE INDEX IF NOT EXISTS idx_seo_pages_indexable ON seo_pages (indexable, published);
CREATE INDEX IF NOT EXISTS idx_seo_pages_hash ON seo_pages (content_hash);

CREATE TABLE IF NOT EXISTS backlink_prospects (
  id SERIAL PRIMARY KEY,
  domaine TEXT NOT NULL UNIQUE,
  url TEXT,
  type TEXT,                                 -- media | blog | logiciel | association | ecole | podcast | annuaire | comparateur
  pays TEXT,
  contact TEXT,
  email TEXT,
  source TEXT,                               -- d'ou vient l'information
  pertinence TEXT,                           -- priorite_1 | priorite_2 | priorite_3
  statut TEXT NOT NULL DEFAULT 'a_contacter',-- a_contacter | contacte | reponse | lien_obtenu | ecarte | bloque
  date_contact TIMESTAMPTZ,
  prochaine_action TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backlink_prospects_statut ON backlink_prospects (statut, pertinence);

COMMENT ON TABLE seo_pages IS 'Contenu SEO public COURTIARK : une ligne par page servie en HTML statique.';
COMMENT ON TABLE backlink_prospects IS 'Prospection d''autorite : aucun contact engage sans autorisation explicite.';
