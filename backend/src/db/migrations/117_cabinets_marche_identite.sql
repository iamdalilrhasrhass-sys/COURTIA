-- ============================================================================
-- 117 — LE MARCHÉ (pays, devise, identité réglementaire) APPARTIENT AU CABINET
--
-- POURQUOI CETTE MIGRATION
-- `cabinets` a été créée avec des DÉFAUTS DE COLONNE qui ressemblent à des
-- données :
--     country           DEFAULT 'France'
--     name              DEFAULT 'Cabinet COURTIA'
--     tutelle_authority DEFAULT 'ACPR'
-- Tout locataire créé — y compris un cabinet suisse — naissait donc « en
-- France », nommé « Cabinet COURTIA », sous tutelle ACPR. Comme l'application
-- lisait le marché dans `broker_profiles` (donc dans l'UTILISATEUR), le
-- propriétaire voyait « CH / CHF » et ses collaborateurs « FR / EUR » : deux
-- vérités pour un même cabinet (défaut P0 reproduit le 20/09/2026 sur le cabinet
-- c8bb6112-4ecf-4807-b01d-b8ca561d11db — cockpit « 7 450 CHF » pour l'un,
-- « 7 450 € » pour l'autre, grille de facturation française servie à un cabinet
-- suisse, document client refusé au commercial avec `orias_required`).
--
-- CE QUE FAIT CETTE MIGRATION (additive, idempotente, rejouable)
--   1. Ajoute sur `cabinets` les colonnes d'identité réglementaire qui
--      n'existaient que dans `broker_profiles` : registre_type, registre_numero,
--      uid, canton, telephone, adresse, ville, code_postal.
--   2. Recopie ces champs DEPUIS LE PROFIL DU PROPRIÉTAIRE (référent du
--      cabinet) quand la colonne du cabinet est vide — jamais l'inverse, jamais
--      d'écrasement d'une valeur déjà renseignée.
--   3. Corrige le PAYS du cabinet quand il n'est que le défaut de colonne
--      ('France' / 'FR' / vide) ET qu'un membre du cabinet est établi en Suisse
--      (pays CH/CHE/SUISSE ou registre FINMA) : le cabinet devient 'CH'.
--   4. Remplace le NOM gabarit « Cabinet COURTIA » par le nom réel saisi par le
--      propriétaire (`broker_profiles.cabinet` / `cabinet_name`) — c'est ce nom
--      qui s'imprime sur les documents clients et part dans les e-mails.
--   5. Retire les DÉFAUTS de colonne 'France' et 'ACPR' : un nouveau locataire
--      naît désormais SANS pays et SANS tutelle, et l'application les résout
--      depuis son référent (lib/marcheCabinet.js). Un défaut de colonne ne doit
--      jamais devenir une identité réglementaire.
--
-- RÉFÉRENT DU CABINET (même ordre de priorité que lib/porteeCabinet.js et
-- lib/marcheCabinet.js) : le propriétaire, à défaut le manager, puis le broker,
-- l'assistant, le lecteur, et enfin le membre le plus ancien. Il est recalculé
-- dans CHAQUE requête (aucune table temporaire) : le fichier peut donc être
-- exécuté aussi bien par le runner (une transaction par fichier) qu'à la main
-- avec `psql -f`.
--
-- CE QUE CETTE MIGRATION NE FAIT PAS
--   • Aucune donnée pilote n'est touchée (users, clients, contrats, documents) :
--     seules des colonnes d'identité de `cabinets`, et uniquement celles qui
--     sont vides ou gabarit.
--   • Aucune ligne n'est supprimée, aucune colonne renommée ni retypée.
--   • `broker_profiles` reste la fiche de la PERSONNE : elle n'est pas modifiée.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Colonnes d'identité du cabinet (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS registre_type   TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS registre_numero TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS uid             TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS canton          VARCHAR(2);
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS telephone       VARCHAR(40);
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS adresse         TEXT;
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS ville           VARCHAR(120);
ALTER TABLE cabinets ADD COLUMN IF NOT EXISTS code_postal     VARCHAR(12);

COMMENT ON COLUMN cabinets.country IS
  'Pays d''etablissement du CABINET (et non du collaborateur connecte) : il fixe la devise et l''identite reglementaire de TOUS les membres. Vide = non renseigne (resolu depuis le referent du cabinet), jamais ''France'' par defaut.';
COMMENT ON COLUMN cabinets.registre_type IS
  'Registre professionnel qui fait foi pour le cabinet (FINMA en Suisse, ORIAS en France).';
COMMENT ON COLUMN cabinets.registre_numero IS
  'Numero d''enregistrement dans registre_type, verifie a la source officielle — jamais repris d''un ancien courrier sans revalidation.';
COMMENT ON COLUMN cabinets.uid IS
  'Identifiant d''entreprise suisse (CHE-xxx.xxx.xxx) quand il existe.';
COMMENT ON COLUMN cabinets.canton IS
  'Canton suisse du siege (code a deux lettres), quand le cabinet est etabli en Suisse.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Corriger le PAYS quand il n'est que le défaut de colonne
--    2a. Cas suisse : le défaut persiste alors qu'un membre du cabinet est
--        établi en Suisse (pays CH/CHE/SUISSE ou registre FINMA).
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE cabinets c
   SET country = 'CH',
       updated_at = NOW()
 WHERE (c.country IS NULL OR btrim(c.country) = '' OR upper(btrim(c.country)) IN ('FRANCE', 'FR'))
   AND EXISTS (
         SELECT 1
           FROM cabinet_members cm
           JOIN broker_profiles bp ON bp.user_id = cm.user_id
          WHERE cm.cabinet_id = c.id
            AND cm.removed_at IS NULL
            AND (upper(btrim(COALESCE(bp.pays, ''))) IN ('CH', 'CHE', 'SUISSE', 'SWITZERLAND')
                 OR upper(btrim(COALESCE(bp.registre_type, ''))) LIKE '%FINMA%')
       );

--    2b. Cas général : pays vide ⇒ celui du référent du cabinet, sans invention.
WITH referent AS (
  SELECT DISTINCT ON (cm.cabinet_id)
         cm.cabinet_id, bp.pays
    FROM cabinet_members cm
    JOIN broker_profiles bp ON bp.user_id = cm.user_id
   WHERE cm.removed_at IS NULL
   ORDER BY cm.cabinet_id,
            CASE cm.role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 WHEN 'broker' THEN 2
                         WHEN 'assistant' THEN 3 WHEN 'viewer' THEN 4 ELSE 5 END,
            cm.created_at ASC
)
UPDATE cabinets c
   SET country = upper(btrim(r.pays)),
       updated_at = NOW()
  FROM referent r
 WHERE r.cabinet_id = c.id
   AND (c.country IS NULL OR btrim(c.country) = '')
   AND btrim(COALESCE(r.pays, '')) <> '';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Recopier l'identité réglementaire depuis le référent (uniquement si vide)
-- ─────────────────────────────────────────────────────────────────────────────
WITH referent AS (
  SELECT DISTINCT ON (cm.cabinet_id)
         cm.cabinet_id,
         bp.registre_type, bp.registre_numero, bp.uid, bp.canton,
         bp.telephone, bp.adresse, bp.ville, bp.code_postal
    FROM cabinet_members cm
    JOIN broker_profiles bp ON bp.user_id = cm.user_id
   WHERE cm.removed_at IS NULL
   ORDER BY cm.cabinet_id,
            CASE cm.role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 WHEN 'broker' THEN 2
                         WHEN 'assistant' THEN 3 WHEN 'viewer' THEN 4 ELSE 5 END,
            cm.created_at ASC
)
UPDATE cabinets c
   SET registre_type   = COALESCE(NULLIF(btrim(c.registre_type), ''),   NULLIF(btrim(r.registre_type), '')),
       registre_numero = COALESCE(NULLIF(btrim(c.registre_numero), ''), NULLIF(btrim(r.registre_numero), '')),
       uid             = COALESCE(NULLIF(btrim(c.uid), ''),             NULLIF(btrim(r.uid), '')),
       canton          = COALESCE(NULLIF(btrim(c.canton), ''),          NULLIF(btrim(r.canton), '')),
       telephone       = COALESCE(NULLIF(btrim(c.telephone), ''),       NULLIF(btrim(r.telephone), '')),
       adresse         = COALESCE(NULLIF(btrim(c.adresse), ''),         NULLIF(btrim(r.adresse), '')),
       ville           = COALESCE(NULLIF(btrim(c.ville), ''),           NULLIF(btrim(r.ville), '')),
       code_postal     = COALESCE(NULLIF(btrim(c.code_postal), ''),     NULLIF(btrim(r.code_postal), '')),
       updated_at      = NOW()
  FROM referent r
 WHERE r.cabinet_id = c.id
   AND (NULLIF(btrim(c.registre_type), '') IS NULL
     OR NULLIF(btrim(c.registre_numero), '') IS NULL
     OR NULLIF(btrim(c.uid), '') IS NULL
     OR NULLIF(btrim(c.canton), '') IS NULL
     OR NULLIF(btrim(c.telephone), '') IS NULL
     OR NULLIF(btrim(c.adresse), '') IS NULL
     OR NULLIF(btrim(c.ville), '') IS NULL
     OR NULLIF(btrim(c.code_postal), '') IS NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Remplacer le NOM gabarit par le nom réel du cabinet.
--    « Cabinet COURTIA » est un défaut de colonne, pas une identité : il
--    s'imprimait sur le PDF d'un cabinet suisse portant un autre nom.
-- ─────────────────────────────────────────────────────────────────────────────
WITH referent AS (
  SELECT DISTINCT ON (cm.cabinet_id)
         cm.cabinet_id,
         COALESCE(NULLIF(btrim(bp.cabinet), ''), NULLIF(btrim(bp.cabinet_name), '')) AS nom_reel
    FROM cabinet_members cm
    JOIN broker_profiles bp ON bp.user_id = cm.user_id
   WHERE cm.removed_at IS NULL
   ORDER BY cm.cabinet_id,
            CASE cm.role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 WHEN 'broker' THEN 2
                         WHEN 'assistant' THEN 3 WHEN 'viewer' THEN 4 ELSE 5 END,
            cm.created_at ASC
)
UPDATE cabinets c
   SET name = r.nom_reel,
       updated_at = NOW()
  FROM referent r
 WHERE r.cabinet_id = c.id
   AND r.nom_reel IS NOT NULL
   AND (c.name IS NULL OR upper(btrim(c.name)) = 'CABINET COURTIA');

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Plus de défaut de colonne qui fabrique une identité.
--    (Ré-exécutable : « DROP DEFAULT » sur une colonne sans défaut ne fait rien.)
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE cabinets ALTER COLUMN country DROP DEFAULT;
ALTER TABLE cabinets ALTER COLUMN tutelle_authority DROP DEFAULT;
