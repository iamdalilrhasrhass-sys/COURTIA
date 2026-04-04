-- ============================================
-- ÉTAPE 2C: INSERT 10 TÂCHES (courtier_id = 1)
-- ============================================
-- 3 haute priorité, 4 normale, 3 basse priorité
-- Liées à courtier_id = 1 (demo@courtia.fr)

INSERT INTO tasks (
  courtier_id, client_id, titre, description, priorite, statut,
  date_creation, date_echeance, assignee, created_at, updated_at
) VALUES

-- HAUTE PRIORITÉ (3 tâches)
(1, 14, 'Appel client urgence - Jean Dupont', 'Client en risque élevé, bonus-malus 1.75. Appel de relance pour ajustement contrat. URGENT - demain 10h', 'haute', 'en attente', NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), 'demo@courtia.fr', NOW(), NOW()),
(1, 15, 'Sinistre à traiter - Christophe Oliveira', '3 sinistres en 3 ans, bonus-malus 1.55. Demande indemnisation en cours. Appel pour complément dossier.', 'haute', 'en attente', NOW(), DATE_ADD(NOW(), INTERVAL 2 DAY), 'demo@courtia.fr', NOW(), NOW()),
(1, 23, 'Renouvellement urgent - Dylan Cardoso', 'Contrat expire dans 15 jours (15/07/2025). Client très risqué (bonus 1.85). Reconduction ou résiliation?', 'haute', 'en cours', NOW(), DATE_ADD(NOW(), INTERVAL 10 DAY), 'demo@courtia.fr', NOW(), NOW()),

-- PRIORITÉ NORMALE (4 tâches)
(1, 6, 'Audit contrats - Isabelle Garcia', 'Vérifier couvertures complémentaires (santé + habitation). Opportunité up-sell potentielle.', 'normale', 'en attente', NOW(), DATE_ADD(NOW(), INTERVAL 5 DAY), 'demo@courtia.fr', NOW(), NOW()),
(1, 10, 'Relance fidélisation - Nathalie Lopez', 'Client loyal (score 70/100). Proposer offre parrainage ou programme VIP.', 'normale', 'en attente', NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 'demo@courtia.fr', NOW(), NOW()),
(1, 18, 'Documentation manquante - Bruno Coelho', 'Dossier sinistre incomplet. Demander photos + devis. Délai: 10 jours.', 'normale', 'en cours', NOW(), DATE_ADD(NOW(), INTERVAL 10 DAY), 'demo@courtia.fr', NOW(), NOW()),
(1, 25, 'Actualisation données client - Patricia Marques', 'Email = invalide. Mettre à jour coordonnées + situation familiale (divorcée). ', 'normale', 'en attente', NOW(), DATE_ADD(NOW(), INTERVAL 8 DAY), 'demo@courtia.fr', NOW(), NOW()),

-- PRIORITÉ BASSE (3 tâches)
(1, 3, 'Envoi documentation - Pierre Moreau', 'Envoyer brochure produits complémentaires (épargne retraite, prévoyance). Pas urgent.', 'basse', 'en attente', NOW(), DATE_ADD(NOW(), INTERVAL 20 DAY), 'demo@courtia.fr', NOW(), NOW()),
(1, 9, 'Feedback satisfaction - Mélissa Sousa', 'Sondage : satisfaction couverture. Opportunité amélioration relation client.', 'basse', 'en attente', NOW(), DATE_ADD(NOW(), INTERVAL 15 DAY), 'demo@courtia.fr', NOW(), NOW()),
(1, 11, 'Archives - Serge Mendes', 'Archivage anciennes factures 2022. Nettoyage dossier administratif.', 'basse', 'complétée', NOW() - INTERVAL 30 DAY, NOW() - INTERVAL 5 DAY, 'demo@courtia.fr', NOW(), NOW());

-- Fin d'insertion: 10 tâches ✅
