-- SEED DÉMO COURTIA
-- Usage : psql -U postgres -h 127.0.0.1 -d crm_assurance -f seed-demo.sql
-- Compte : e2e@courtia.fr / TestE2E2026!

BEGIN;

-- NETTOYAGE (optionnel, commenter pour ajouter sans effacer)
-- DELETE FROM taches WHERE user_id = (SELECT id FROM users WHERE email = 'e2e@courtia.fr');
-- DELETE FROM quotes WHERE client_id IN (SELECT id FROM clients WHERE email LIKE '%test.fr');
-- DELETE FROM clients WHERE email LIKE '%test.fr';

-- CLIENTS (8)
INSERT INTO clients (first_name, last_name, email, phone, type, status, profession, city, courtier_id, risk_score, loyalty_score, bonus_malus, annees_permis, nb_sinistres_3ans, zone_geographique, situation_familiale, created_at, updated_at)
VALUES
  ('Sophie', 'Martin', 's.martin@test.fr', '0612345601', 'particulier', 'actif', 'Avocat', 'Paris', 4, 35, 85, 0.95, 15, 0, 'urbain', 'marie', NOW(), NOW()),
  ('Michel', 'Bernard', 'm.bernard@test.fr', '0612345602', 'particulier', 'actif', 'Artisan', 'Lyon', 4, 50, 70, 1.05, 20, 1, 'urbain', 'marie', NOW(), NOW()),
  ('Isabelle', 'Petit', 'i.petit@test.fr', '0612345603', 'particulier', 'prospect', 'Commercant', 'Marseille', 4, 60, 40, 1.15, 10, 2, 'urbain', 'celibataire', NOW(), NOW()),
  ('Philippe', 'Dubois', 'ph.dubois@test.fr', '0612345604', 'pro', 'actif', NULL, NULL, 4, 30, 95, 0.90, 25, 0, 'urbain', 'marie', NOW(), NOW()),
  ('Caroline', 'Leroy', 'c.leroy@test.fr', '0612345605', 'particulier', 'actif', 'Prof liberal', 'Bordeaux', 4, 45, 75, 1.00, 12, 1, 'urbain', 'marie', NOW(), NOW()),
  ('Thomas', 'Moreau', 't.moreau@test.fr', '0612345606', 'particulier', 'actif', 'Agriculteur', 'Tours', 4, 55, 60, 1.10, 18, 2, 'rural', 'celibataire', NOW(), NOW()),
  ('Nathalie', 'Fournier', 'n.fournier@test.fr', '0612345607', 'particulier', 'prospect', 'Cadre', 'Lille', 4, 25, 50, 0.85, 8, 0, 'urbain', 'marie', NOW(), NOW()),
  ('Eric', 'Girard', 'e.girard@test.fr', '0612345608', 'pro', 'actif', NULL, NULL, 4, 40, 90, 1.00, 22, 0, 'urbain', 'marie', NOW(), NOW());

-- CONTRATS (12)
INSERT INTO quotes (client_id, quote_data, status, created_at, updated_at)
VALUES
  (5, '{"type_contrat":"Auto","compagnie":"AXA","prime_annuelle":850,"date_effet":"2025-01-15","date_echeance":"2026-01-15"}', 'actif', NOW(), NOW()),
  (5, '{"type_contrat":"Habitation","compagnie":"Generali","prime_annuelle":1200,"date_effet":"2025-03-01","date_echeance":"2026-03-01"}', 'actif', NOW(), NOW()),
  (6, '{"type_contrat":"RC Pro","compagnie":"Allianz","prime_annuelle":2100,"date_effet":"2025-06-01","date_echeance":"2026-06-01"}', 'actif', NOW(), NOW()),
  (7, '{"type_contrat":"Auto","compagnie":"MAIF","prime_annuelle":720,"date_effet":"2025-05-10","date_echeance":"2026-05-10"}', 'actif', NOW(), NOW()),
  (8, '{"type_contrat":"RC Pro","compagnie":"AXA","prime_annuelle":4500,"date_effet":"2025-02-01","date_echeance":"2026-02-01"}', 'actif', NOW(), NOW()),
  (8, '{"type_contrat":"Flotte Auto","compagnie":"AXA","prime_annuelle":3200,"date_effet":"2025-02-01","date_echeance":"2026-02-01"}', 'actif', NOW(), NOW()),
  (9, '{"type_contrat":"Sante","compagnie":"MGEN","prime_annuelle":1800,"date_effet":"2025-09-01","date_echeance":"2026-09-01"}', 'actif', NOW(), NOW()),
  (9, '{"type_contrat":"Prevovance","compagnie":"Generali","prime_annuelle":960,"date_effet":"2025-09-01","date_echeance":"2026-09-01"}', 'actif', NOW(), NOW()),
  (10, '{"type_contrat":"RCE Exploitation","compagnie":"Groupama","prime_annuelle":2800,"date_effet":"2025-04-15","date_echeance":"2026-04-15"}', 'actif', NOW(), NOW()),
  (11, '{"type_contrat":"Auto","compagnie":"Matmut","prime_annuelle":650,"date_effet":"2025-07-01","date_echeance":"2026-07-01"}', 'actif', NOW(), NOW()),
  (11, '{"type_contrat":"Habitation","compagnie":"Matmut","prime_annuelle":980,"date_effet":"2025-07-01","date_echeance":"2026-07-01"}', 'actif', NOW(), NOW()),
  (12, '{"type_contrat":"RC Pro","compagnie":"Allianz","prime_annuelle":3500,"date_effet":"2025-10-01","date_echeance":"2026-10-01"}', 'actif', NOW(), NOW());

-- TÂCHES (6, dont 3 urgentes via status "haute")
INSERT INTO appointments (user_id, client_id, title, description, status, start_time, created_at)
VALUES
  (4, 5, 'Relancer Sophie Martin pour renouvellement Auto', 'Contrat auto arrive à échéance dans 30 jours. Proposer renouvellement ou nouveau devis.', 'haute', NOW() + INTERVAL '2 days', NOW()),
  (4, 6, 'Vérifier attestation RC Pro Michel Bernard', 'Michel a changé d activité. Vérifier que la garantie RC Pro couvre bien son nouveau statut.', 'a_faire', NOW() + INTERVAL '5 days', NOW()),
  (4, 7, 'Préparer devis Habitation pour Isabelle Petit', 'Isabelle a demandé un comparatif habitation. Préparer 2 options (MAIF et Generali).', 'a_faire', NOW() + INTERVAL '3 days', NOW()),
  (4, 8, 'Auditer flotte auto SARL Dubois - échéance J+30', 'Flotte de 5 véhicules à renouveler. Vérifier sinistralité et négocier prime groupe.', 'haute', NOW() + INTERVAL '1 day', NOW()),
  (4, 9, 'Appeler Caroline Leroy pour avenant Santé', 'Caroline veut ajouter son conjoint sur le contrat santé MGEN. Préparer avenant.', 'a_faire', NOW() + INTERVAL '4 days', NOW()),
  (4, 12, 'Transmettre dossier RC Pro Eric Girard au grossiste', 'Nouveau garage, besoin d une RC Pro adaptée. Transmettre au grossiste avec descriptif activité.', 'haute', NOW() + INTERVAL '0 days', NOW());

COMMIT;
