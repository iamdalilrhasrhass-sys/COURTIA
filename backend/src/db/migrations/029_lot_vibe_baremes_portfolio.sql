-- LOT VIBE — Barèmes commissions + Portfolio Health snapshot
-- Migration 029

-- Barèmes de commissions par compagnie + produit (tarifs officiels paramétrables)
CREATE TABLE IF NOT EXISTS commission_baremes (
  id SERIAL PRIMARY KEY,
  cabinet_id INTEGER,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  compagnie VARCHAR(120) NOT NULL,
  produit VARCHAR(120) NOT NULL,
  rate_percent DECIMAL(6,3) NOT NULL DEFAULT 0,
  rate_recurring_percent DECIMAL(6,3) DEFAULT 0,
  flat_fee_cents INTEGER DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(cabinet_id, user_id, compagnie, produit)
);

CREATE INDEX IF NOT EXISTS idx_commission_baremes_cabinet ON commission_baremes(cabinet_id);
CREATE INDEX IF NOT EXISTS idx_commission_baremes_user ON commission_baremes(user_id);
CREATE INDEX IF NOT EXISTS idx_commission_baremes_compagnie_produit ON commission_baremes(compagnie, produit);

-- Seed barèmes "Aurora, Novalia, Helios, Serenis, Atlas, Oria, Nivalis, Solenys"
INSERT INTO commission_baremes (cabinet_id, user_id, compagnie, produit, rate_percent, rate_recurring_percent, is_active)
SELECT NULL, NULL, compagnie, produit, taux, ROUND(taux * 0.6, 1), true
FROM (VALUES
  ('Aurora','Auto',12),('Aurora','Habitation',14),('Aurora','Santé',8),('Aurora','Prévoyance',18),('Aurora','RC Pro',16),
  ('Aurora','Flotte Auto',11),('Aurora','MRH',13),('Aurora','Cyber',20),('Aurora','Décennale',15),('Aurora','PJ',22),
  ('Novalia','Auto',11),('Novalia','Habitation',13),('Novalia','Santé',9),('Novalia','Prévoyance',17),('Novalia','RC Pro',15),
  ('Novalia','Flotte Auto',12),('Novalia','MRH',14),('Novalia','Cyber',19),('Novalia','Décennale',14),('Novalia','PJ',20),
  ('Helios','Auto',10),('Helios','Habitation',15),('Helios','Santé',7),('Helios','Prévoyance',16),('Helios','RC Pro',14),
  ('Helios','Flotte Auto',10),('Helios','MRH',12),('Helios','Cyber',18),('Helios','Décennale',13),('Helios','PJ',19),
  ('Serenis','Auto',13),('Serenis','Habitation',12),('Serenis','Santé',10),('Serenis','Prévoyance',19),('Serenis','RC Pro',17),
  ('Serenis','Flotte Auto',13),('Serenis','MRH',15),('Serenis','Cyber',21),('Serenis','Décennale',16),('Serenis','PJ',23),
  ('Atlas','Auto',12),('Atlas','Habitation',13),('Atlas','Santé',8),('Atlas','Prévoyance',17),('Atlas','RC Pro',18),
  ('Atlas','Flotte Auto',12),('Atlas','MRH',14),('Atlas','Cyber',22),('Atlas','Décennale',15),('Atlas','PJ',21),
  ('Oria','Auto',11),('Oria','Habitation',14),('Oria','Santé',9),('Oria','Prévoyance',16),('Oria','RC Pro',15),
  ('Oria','Flotte Auto',11),('Oria','MRH',13),('Oria','Cyber',19),('Oria','Décennale',14),('Oria','PJ',20),
  ('Nivalis','Auto',12),('Nivalis','Habitation',13),('Nivalis','Santé',8),('Nivalis','Prévoyance',18),('Nivalis','RC Pro',16),
  ('Nivalis','Flotte Auto',12),('Nivalis','MRH',14),('Nivalis','Cyber',20),('Nivalis','Décennale',17),('Nivalis','PJ',22),
  ('Solenys','Auto',10),('Solenys','Habitation',12),('Solenys','Santé',10),('Solenys','Prévoyance',15),('Solenys','RC Pro',13),
  ('Solenys','Flotte Auto',9),('Solenys','MRH',11),('Solenys','Cyber',17),('Solenys','Décennale',12),('Solenys','PJ',18)
) AS s(compagnie, produit, taux)
WHERE NOT EXISTS (
  SELECT 1 FROM commission_baremes b
  WHERE b.cabinet_id IS NULL AND b.user_id IS NULL
    AND b.compagnie = s.compagnie AND b.produit = s.produit
);

-- Snapshots santé portefeuille (calculé périodiquement)
CREATE TABLE IF NOT EXISTS portfolio_health_snapshots (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cabinet_id INTEGER,
  score INTEGER NOT NULL DEFAULT 0,
  total_clients INTEGER DEFAULT 0,
  total_contracts INTEGER DEFAULT 0,
  total_premium_cents BIGINT DEFAULT 0,
  no_renewal_count INTEGER DEFAULT 0,
  no_contact_90d_count INTEGER DEFAULT 0,
  churn_risk_count INTEGER DEFAULT 0,
  echeances_30d_count INTEGER DEFAULT 0,
  breakdown JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_health_user_created ON portfolio_health_snapshots(user_id, created_at DESC);
