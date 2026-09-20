-- ============================================================================
-- 108 — IDENTITE PROFESSIONNELLE : DONNEES REGLEMENTAIRES REELLES PAR CABINET
--
-- POURQUOI CETTE MIGRATION
-- `broker_profiles` ne portait que les champs du courtage FRANCAIS : `orias`
-- (registre ORIAS), adresse, ville, code postal. Un cabinet SUISSE n'a pas de
-- numero ORIAS : il a un numero d'enregistrement FINMA et un UID (IDE/CH-ID).
-- Ranger un numero FINMA dans une colonne nommee `orias` afficherait au cabinet
-- une donnee fausse sous le mauvais libelle — ce que la consigne interdit.
--
-- On ajoute donc les champs qui existent reellement pour ces cabinets :
--   registre_type   : quel registre fait foi ('FINMA', 'ORIAS', ...)
--   registre_numero : le numero dans ce registre, tel que verifie a la source
--   uid             : identifiant d'entreprise suisse (CHE-...)
--   site_web        : site officiel verifie
--   pays            : code pays ISO a 2 lettres ('CH', 'FR')
--   langue          : langue de travail du contact ('fr', 'de', 'it', 'en')
--
-- Additive et idempotente : aucune colonne existante n'est renommee ni
-- supprimee, aucune donnee n'est reecrite.
-- ============================================================================

ALTER TABLE broker_profiles ADD COLUMN IF NOT EXISTS registre_type TEXT;
ALTER TABLE broker_profiles ADD COLUMN IF NOT EXISTS registre_numero TEXT;
ALTER TABLE broker_profiles ADD COLUMN IF NOT EXISTS uid TEXT;
ALTER TABLE broker_profiles ADD COLUMN IF NOT EXISTS site_web TEXT;
ALTER TABLE broker_profiles ADD COLUMN IF NOT EXISTS pays VARCHAR(2);
ALTER TABLE broker_profiles ADD COLUMN IF NOT EXISTS langue VARCHAR(2);

COMMENT ON COLUMN broker_profiles.registre_type IS
  'Registre professionnel qui fait foi pour ce cabinet (FINMA en Suisse, ORIAS en France).';
COMMENT ON COLUMN broker_profiles.registre_numero IS
  'Numero d''enregistrement dans registre_type, verifie a la source officielle — jamais repris d''un ancien courrier sans revalidation.';
COMMENT ON COLUMN broker_profiles.uid IS
  'Identifiant d''entreprise suisse (CHE-xxx.xxx.xxx) quand il existe.';
