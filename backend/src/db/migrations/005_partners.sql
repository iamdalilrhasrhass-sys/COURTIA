-- Migration: Création table partenaires
-- Module: Partenaires (Partner tracking)
CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  categorie VARCHAR(100),           -- mutuelle, grossiste, compagnie, prevoyance, niche
  type_partenaire VARCHAR(50),      -- porteur_risque, grossiste, mgas
  contact_nom VARCHAR(255),
  contact_email VARCHAR(255),
  contact_telephone VARCHAR(30),
  produit_principal VARCHAR(200),
  code_courtage VARCHAR(100),
  commission VARCHAR(100),
  extranet_url VARCHAR(500),
  extranet_login VARCHAR(255),
  statut VARCHAR(50) DEFAULT 'A_contacter',  -- A_contacter, Contacte, Dossier_envoye, En_analyse, Code_ouvert, Refuse, A_relancer
  documents_envoyes TEXT[],
  notes TEXT,
  date_contact TIMESTAMPTZ,
  date_relance TIMESTAMPTZ,
  priorite INTEGER DEFAULT 2,      -- 1=haute, 2=moyenne, 3=basse
  vague INTEGER DEFAULT 1,         -- 1/2/3 (plan de conquête)
  volume_potentiel VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les recherches par courtier
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_statut ON partners(statut);
CREATE INDEX IF NOT EXISTS idx_partners_categorie ON partners(categorie);
