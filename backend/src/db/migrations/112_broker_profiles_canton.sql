-- 112_broker_profiles_canton.sql
--
-- Ajoute le canton à l'identité du cabinet.
--
-- Un cabinet suisse raisonne par canton (GE, VD, VS, NE, FR, JU…) : il n'y a
-- aucun champ pour le porter aujourd'hui, alors que l'offre suisse parle
-- d'échéanciers cantonaux et que l'adresse seule ne suffit pas à qualifier un
-- dossier. Migration ADDITIVE et IDEMPOTENTE : aucune donnée existante n'est
-- touchée, la colonne reste vide tant que le cabinet ne la renseigne pas.

ALTER TABLE broker_profiles
  ADD COLUMN IF NOT EXISTS canton VARCHAR(4);

COMMENT ON COLUMN broker_profiles.canton IS
  'Canton suisse du cabinet (GE, VD, VS, NE, FR, JU, BE, …). Vide pour un cabinet hors Suisse.';

-- Aucune valeur par défaut : on n'invente pas un canton.
