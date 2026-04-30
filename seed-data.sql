-- ============================================================================
-- SCRIPT DE SEED POUR COURTIA — Données factices françaises réalistes
-- Courtier en assurance (courtier_id = 1)
-- Usage : PGPASSWORD=courtia2026secure psql -h 72.62.187.63 -U postgres -d crm_assurance -f /root/courtia/seed-data.sql
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. VÉRIFICATIONS PRÉALABLES — Éviter les doublons
-- ============================================================================
DO $$
DECLARE
    v_user_exists   BOOLEAN;
    v_clients_count INTEGER;
    v_prospects_count INTEGER;
    v_campaigns_count INTEGER;
    v_audiences_count INTEGER;
BEGIN
    SELECT EXISTS(SELECT 1 FROM users WHERE email = 'e2e@courtia.fr') INTO v_user_exists;
    SELECT COUNT(*) FROM clients INTO v_clients_count;
    SELECT COUNT(*) FROM reach_prospects INTO v_prospects_count;
    SELECT COUNT(*) FROM reach_campaigns INTO v_campaigns_count;
    SELECT COUNT(*) FROM reach_audiences INTO v_audiences_count;

    RAISE NOTICE 'État actuel : user e2e=% | clients=% | prospects=% | campaigns=% | audiences=%',
        v_user_exists, v_clients_count, v_prospects_count, v_campaigns_count, v_audiences_count;

    -- Ne pas exécuter si des données existent déjà (idempotence)
    IF v_user_exists OR v_clients_count > 0 OR v_prospects_count > 0 OR v_campaigns_count > 0 OR v_audiences_count > 0 THEN
        RAISE EXCEPTION 'ABORT — Des données seed existent déjà. Aucune insertion effectuée.';
    END IF;
END $$;

-- ============================================================================
-- 2. USER — Compte E2E pour tests automatisés
-- ============================================================================
INSERT INTO users (email, password_hash, first_name, last_name, role, plan, subscription_status, created_at, updated_at)
VALUES (
    'e2e@courtia.fr',
    '$2b$10$saQ1R/dakS5ZrkHA79Efiuhct5UQYJLc2Gk8NoOl3g4EmyeWEg4HG',
    'Test',
    'E2E',
    'courtier',
    'premium',
    'active',
    NOW(),
    NOW()
);

-- ============================================================================
-- 3. CLIENTS — 5 personnes physiques (particuliers, actifs)
-- ============================================================================
INSERT INTO clients (courtier_id, first_name, last_name, email, phone, company_name, type, status, city, notes, created_at, updated_at)
VALUES
(1, 'Sophie', 'Moreau',    'sophie.moreau@orange.fr',       '06 12 34 56 01', NULL, 'particulier', 'actif',  'Lyon',
 'Cliente depuis 2023. Assurée auto + habitation. Renouvellement en septembre.', NOW(), NOW()),

(1, 'Thomas', 'Lefebvre',  'thomas.lefebvre@free.fr',       '06 12 34 56 02', NULL, 'particulier', 'actif',  'Paris',
 'Jeune cadre. Recherche assurance emprunteur pour prêt immobilier en cours.', NOW(), NOW()),

(1, 'Caroline', 'Petit',   'caroline.petit@gmail.com',      '06 12 34 56 03', NULL, 'particulier', 'actif',  'Marseille',
 'Profession libérale (avocate). Assurance responsabilité civile pro à renégocier.', NOW(), NOW()),

(1, 'Nicolas', 'Roux',     'nicolas.roux@laposte.net',      '06 12 34 56 04', NULL, 'particulier', 'actif',  'Bordeaux',
 'Retraité. Multi-contrats : santé, prévoyance, habitation. Fidèle depuis 2018.', NOW(), NOW()),

(1, 'Émilie', 'Bernard',   'emilie.bernard@sfr.fr',         '06 12 34 56 05', NULL, 'particulier', 'actif',  'Toulouse',
 'Artisan coiffure. Assurance professionnelle + véhicule utilitaire.', NOW(), NOW());

-- ============================================================================
-- 4. PROSPECTS REACH — 3 entreprises cibles
-- ============================================================================
INSERT INTO reach_prospects (user_id, contact_first_name, contact_last_name, email, phone, company_name, city, category, niche, status, opportunity_score, created_at, updated_at)
VALUES
(1, 'Marc',    'Dupont',  'm.dupont@groupeaxiome.fr',     '01 44 56 78 90', 'Groupe Axiome Assurances',     'Paris 8e',
 'assurance', 'Courtage IARD — flottes auto, multirisques pro', 'new', 75, NOW(), NOW()),

(1, 'Laure',   'Chevalier', 'l.chevalier@banquebcp.fr',   '01 53 42 18 60', 'BCP Banque Privée',            'Lyon 2e',
 'banque', 'Banque privée — partenariat offres assurances dommages', 'new', 60, NOW(), NOW()),

(1, 'Antoine', 'Girard',  'a.girard@cabinetgirard.fr',    '04 91 67 23 45', 'Cabinet Girard & Associés',    'Marseille 6e',
 'cabinet de courtage', 'Courtage en réassurance — spécialité risques industriels', 'new', 85, NOW(), NOW());

-- ============================================================================
-- 5. CAMPAGNE REACH — Mode 'draft', 3 steps
-- ============================================================================
INSERT INTO reach_campaigns (user_id, name, target_description, channel, target_category, tone, status, created_at, updated_at, human_validation_required)
VALUES (
    1,
    'Prospection Assurance — Secteur Grand Sud',
    'Campagne de prospection automatisée vers les décideurs assurance, banque et courtage en région PACA et Auvergne-Rhône-Alpes.',
    'email',
    'assurance, banque, cabinet de courtage',
    'professionnel',
    'draft',
    NOW(),
    NOW(),
    TRUE
);

-- Récupérer l'ID de la campagne créée
DO $$
DECLARE
    v_campaign_id INTEGER;
BEGIN
    SELECT id INTO v_campaign_id FROM reach_campaigns WHERE name = 'Prospection Assurance — Secteur Grand Sud' ORDER BY created_at DESC LIMIT 1;

    -- Step 1 : Email de prise de contact (J0)
    INSERT INTO reach_campaign_steps (campaign_id, step_order, delay_days, channel, subject_template, body_template)
    VALUES (
        v_campaign_id, 1, 0, 'email',
        'Présentation — {{company_name}}',
        'Bonjour {{contact_first_name}},

Je me permets de vous contacter dans le cadre de notre activité de courtage en assurances professionnelles. Chez COURTIA, nous accompagnons les entreprises comme {{company_name}} dans l''optimisation de leurs contrats IARD et responsabilité civile.

Seriez-vous disponible pour un échange de 15 minutes la semaine prochaine ?

Bien cordialement,
Test E2E
Courtier en assurances — COURTIA
e2e@courtia.fr'
    );

    -- Step 2 : Relance suivi J+3
    INSERT INTO reach_campaign_steps (campaign_id, step_order, delay_days, channel, subject_template, body_template)
    VALUES (
        v_campaign_id, 2, 3, 'email',
        'Suivi — {{company_name}}',
        'Bonjour {{contact_first_name}},

Je fais suite à mon précédent message. Avez-vous eu l''occasion d''y jeter un œil ?

Chez COURTIA, nous proposons des solutions sur-mesure adaptées à votre activité dans le secteur {{target_category}}.

N''hésitez pas à me solliciter directement.

Cordialement,
Test E2E'
    );

    -- Step 3 : Relance finale J+7
    INSERT INTO reach_campaign_steps (campaign_id, step_order, delay_days, channel, subject_template, body_template)
    VALUES (
        v_campaign_id, 3, 7, 'email',
        'Dernière relance — {{company_name}}',
        'Bonjour {{contact_first_name}},

Je me permets une dernière relance concernant ma proposition de partenariat pour {{company_name}}.

Si ce n''est pas le bon moment, n''hésitez pas à m''indiquer une date ultérieure.

Bien cordialement,
Test E2E'
    );

    RAISE NOTICE 'Campagne REACH créée (id=%) avec 3 steps', v_campaign_id;
END $$;

-- ============================================================================
-- 6. AUDIENCE REACH — Cible secteur assurances et banques
-- ============================================================================
INSERT INTO reach_audiences (user_id, name, created_at)
VALUES (
    1,
    'Cibles prioritaires — Assurances & Banques Sud-Est',
    NOW()
);

-- ============================================================================
-- FIN — Commit si tout est OK
-- ============================================================================
COMMIT;

-- ============================================================================
-- VÉRIFICATION FINALE
-- ============================================================================
DO $$
DECLARE
    v_user_id      INTEGER;
    v_clients      INTEGER;
    v_prospects    INTEGER;
    v_campaigns    INTEGER;
    v_steps        INTEGER;
    v_audiences    INTEGER;
BEGIN
    SELECT id INTO v_user_id FROM users WHERE email = 'e2e@courtia.fr';
    SELECT COUNT(*) INTO v_clients FROM clients WHERE courtier_id = 1;
    SELECT COUNT(*) INTO v_prospects FROM reach_prospects WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_campaigns FROM reach_campaigns WHERE user_id = v_user_id;
    SELECT COUNT(*) INTO v_steps FROM reach_campaign_steps WHERE campaign_id = (SELECT id FROM reach_campaigns WHERE user_id = v_user_id LIMIT 1);
    SELECT COUNT(*) INTO v_audiences FROM reach_audiences WHERE user_id = v_user_id;

    RAISE NOTICE 'SUCCÈS — Données seed insérées :';
    RAISE NOTICE '  User e2e@courtia.fr : id=%', v_user_id;
    RAISE NOTICE '  Clients particuliers : %', v_clients;
    RAISE NOTICE '  Prospects REACH     : %', v_prospects;
    RAISE NOTICE '  Campagnes REACH     : %', v_campaigns;
    RAISE NOTICE '  Steps de campagne   : %', v_steps;
    RAISE NOTICE '  Audiences REACH     : %', v_audiences;
END $$;
