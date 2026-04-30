-- Migration 008: REACH — Playbooks (modèles de campagnes réutilisables)

CREATE TABLE IF NOT EXISTS reach_playbooks (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  channel VARCHAR(20) DEFAULT 'email',
  steps JSONB NOT NULL DEFAULT '[]',
  category VARCHAR(100) DEFAULT 'general',
  is_public BOOLEAN DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reach_playbooks_user ON reach_playbooks (user_id);
CREATE INDEX IF NOT EXISTS idx_reach_playbooks_public ON reach_playbooks (is_public) WHERE is_public = true;

-- Seed: playbooks par défaut
INSERT INTO reach_playbooks (name, description, channel, steps, category, is_default, is_public) VALUES
(
  'Découverte assurance RC Pro',
  'Séquence de 3 relances pour prospecter les professionnels en RC Pro.',
  'email',
  '[{"step_order":1,"delay_days":0,"subject_template":"Optimisez votre RC Pro, {first_name}","body_template":"Bonjour {first_name},\n\nNous accompagnons les professionnels comme {company} dans la gestion de leur assurance RC Pro.\n\nPuis-je vous proposer un audit gratuit de votre contrat actuel ?\n\nCordialement,\n{user_name}"},{"step_order":2,"delay_days":5,"subject_template":"Suivi : votre RC Pro chez {company}","body_template":"Bonjour {first_name},\n\nJe fais suite à mon précédent message. Chez {company}, la RC Pro est un élément clé de votre activité.\n\nUn simple échange de 10 minutes permet souvent d''identifier des économies.\n\nBien cordialement,\n{user_name}"},{"step_order":3,"delay_days":10,"subject_template":"Dernière chance : audit gratuit RC Pro","body_template":"Bonjour {first_name},\n\nDernière relance concernant l''audit de votre contrat RC Pro.\n\nSi vous n''êtes pas intéressé, dites-le moi simplement. Sinon, je reste disponible pour un échange.\n\nCordialement,\n{user_name}"}]',
  'decouverte',
  true, true
),
(
  'Relance échéance Auto',
  'Séquence pour relancer les prospects avant échéance de leur contrat auto.',
  'email',
  '[{"step_order":1,"delay_days":0,"subject_template":"Votre échéance auto approche, {first_name}","body_template":"Bonjour {first_name},\n\nVotre contrat auto arrive à échéance. Chez COURTIA, nous pouvons vous proposer une comparaison personnalisée.\n\nSouhaitez-vous que je prépare une simulation ?\n\nCordialement,\n{user_name}"},{"step_order":2,"delay_days":7,"subject_template":"Économies possibles sur votre auto","body_template":"Bonjour {first_name},\n\nSaviez-vous que 1 conducteur sur 3 change d''assurance auto à échéance ?\n\nJe peux vous préparer une offre sur mesure sans engagement.\n\nBien cordialement,\n{user_name}"},{"step_order":3,"delay_days":14,"subject_template":"Offre exclusive : votre nouveau contrat auto","body_template":"Bonjour {first_name},\n\nVoici une offre que j''ai préparée spécialement pour vous. Comparez-la avec votre contrat actuel.\n\nContactez-moi pour en discuter.\n\nCordialement,\n{user_name}"}]',
  'echance',
  true, true
),
(
  'Prospection Multirisque Habitation',
  'Séquence pour contacter les prospects en MRH.',
  'email',
  '[{"step_order":1,"delay_days":0,"subject_template":"Protégez votre habitation avec COURTIA","body_template":"Bonjour {first_name},\n\nNous proposons des solutions d''assurance habitation adaptées à chaque profil.\n\nPuis-je vous faire un devis personnalisé ?\n\nCordialement,\n{user_name}"},{"step_order":2,"delay_days":7,"subject_template":"Votre simulation habitation prête","body_template":"Bonjour {first_name},\n\nSuite à notre échange, voici une simulation personnalisée pour votre habitation.\n\nN''hésitez pas à me solliciter pour toute question.\n\nBien cordialement,\n{user_name}"}]',
  'decouverte',
  true, true
);

-- Log
-- Note: log disabled — FK constraint on reach_activity_log.prospect_id
