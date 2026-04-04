-- ============================================
-- ÉTAPE 2B: INSERT 60 CONTRATS (courtier_id = 1)
-- ============================================
-- Numéros réalistes AXA-2024-XXXXX
-- Primes cohérentes par type assurance
-- Dates échelonnées sur 6 mois

INSERT INTO contracts (
  courtier_id, client_id, numero_contrat, type_contrat, statut,
  prime_annuelle, prime_mensuelle, date_debut, date_echeance,
  assureur, couverture_principale, notes, created_at, updated_at
) VALUES

-- Clients 1-5: Assurance Auto (Faible risque) + Habitation
(1, 1, 'AXA-2024-00001', 'Auto', 'actif', 450.00, 37.50, '2024-01-15', '2025-01-14', 'AXA', 'Tiers étendu', 'Clients premium', NOW(), NOW()),
(1, 1, 'AXA-2024-00002', 'Habitation', 'actif', 380.00, 31.67, '2024-01-15', '2025-01-14', 'AXA', 'Tous risques', 'Couverture complète', NOW(), NOW()),
(1, 2, 'AXA-2024-00003', 'Auto', 'actif', 480.00, 40.00, '2024-01-20', '2025-01-19', 'AXA', 'Tiers', 'Contrat standard', NOW(), NOW()),
(1, 2, 'AXA-2024-00004', 'Habitation', 'actif', 350.00, 29.17, '2024-01-20', '2025-01-19', 'AXA', 'Tous risques', 'Jeune famille', NOW(), NOW()),
(1, 3, 'AXA-2024-00005', 'Auto', 'actif', 420.00, 35.00, '2024-02-01', '2025-01-31', 'AXA', 'Tiers étendu', 'Senior actif', NOW(), NOW()),

(1, 3, 'AXA-2024-00006', 'Habitation', 'actif', 360.00, 30.00, '2024-02-01', '2025-01-31', 'AXA', 'Tous risques', 'Maison ancienne', NOW(), NOW()),
(1, 4, 'AXA-2024-00007', 'Auto', 'actif', 465.00, 38.75, '2024-02-10', '2025-02-09', 'AXA', 'Tiers étendu', '1 sinistre', NOW(), NOW()),
(1, 4, 'AXA-2024-00008', 'Habitation', 'actif', 375.00, 31.25, '2024-02-10', '2025-02-09', 'AXA', 'Tous risques', 'Immeuble ancien', NOW(), NOW()),
(1, 5, 'AXA-2024-00009', 'Auto', 'actif', 440.00, 36.67, '2024-02-15', '2025-02-14', 'AXA', 'Tiers étendu', 'Chauffeur expérimenté', NOW(), NOW()),
(1, 5, 'AXA-2024-00010', 'Habitation', 'actif', 340.00, 28.33, '2024-02-15', '2025-02-14', 'AXA', 'Tous risques', 'Petit logement', NOW(), NOW()),

-- Clients 6-15: Assurance Auto (Risque moyen) + Habitation + Santé
(1, 6, 'AXA-2024-00011', 'Auto', 'actif', 520.00, 43.33, '2024-03-01', '2025-02-28', 'AXA', 'Tiers', 'Risque moyen', NOW(), NOW()),
(1, 6, 'AXA-2024-00012', 'Habitation', 'actif', 390.00, 32.50, '2024-03-01', '2025-02-28', 'AXA', 'Tous risques', 'Petit résidence', NOW(), NOW()),
(1, 6, 'AXA-2024-00013', 'Santé', 'actif', 180.00, 15.00, '2024-03-01', '2025-02-28', 'Allianz', 'Complémentaire', 'Jeune adulte', NOW(), NOW()),
(1, 7, 'AXA-2024-00014', 'Auto', 'actif', 560.00, 46.67, '2024-03-05', '2025-03-04', 'AXA', 'Tiers', '1 sinistre 3ans', NOW(), NOW()),
(1, 7, 'AXA-2024-00015', 'Habitation', 'actif', 410.00, 34.17, '2024-03-05', '2025-03-04', 'AXA', 'Tous risques', 'Studio', NOW(), NOW()),

(1, 7, 'AXA-2024-00016', 'Santé', 'actif', 190.00, 15.83, '2024-03-05', '2025-03-04', 'Allianz', 'Complémentaire', 'Couverture standard', NOW(), NOW()),
(1, 8, 'AXA-2024-00017', 'Auto', 'actif', 640.00, 53.33, '2024-03-10', '2025-03-09', 'AXA', 'Tiers', '2 sinistres 3ans', NOW(), NOW()),
(1, 8, 'AXA-2024-00018', 'Habitation', 'actif', 450.00, 37.50, '2024-03-10', '2025-03-09', 'AXA', 'Tous risques', 'T2 urbain', NOW(), NOW()),
(1, 8, 'AXA-2024-00019', 'Santé', 'actif', 220.00, 18.33, '2024-03-10', '2025-03-09', 'Allianz', 'Complémentaire+', 'Couverture étendue', NOW(), NOW()),
(1, 9, 'AXA-2024-00020', 'Auto', 'actif', 550.00, 45.83, '2024-03-15', '2025-03-14', 'AXA', 'Tiers', 'Manager', NOW(), NOW()),

(1, 9, 'AXA-2024-00021', 'Habitation', 'actif', 420.00, 35.00, '2024-03-15', '2025-03-14', 'AXA', 'Tous risques', 'T3 périurbain', NOW(), NOW()),
(1, 9, 'AXA-2024-00022', 'Santé', 'actif', 200.00, 16.67, '2024-03-15', '2025-03-14', 'Allianz', 'Complémentaire', 'Cadre', NOW(), NOW()),
(1, 10, 'AXA-2024-00023', 'Auto', 'actif', 580.00, 48.33, '2024-03-20', '2025-03-19', 'AXA', 'Tiers', 'Jeune chauffeur', NOW(), NOW()),
(1, 10, 'AXA-2024-00024', 'Habitation', 'actif', 440.00, 36.67, '2024-03-20', '2025-03-19', 'AXA', 'Tous risques', 'T3 urbain', NOW(), NOW()),
(1, 10, 'AXA-2024-00025', 'Santé', 'actif', 210.00, 17.50, '2024-03-20', '2025-03-19', 'Allianz', 'Complémentaire', 'Famille jeune', NOW(), NOW()),

-- Clients 11-15 (suite): Contrats additionnels
(1, 11, 'AXA-2024-00026', 'Auto', 'actif', 620.00, 51.67, '2024-04-01', '2025-03-31', 'AXA', 'Tiers', 'Électricien, risque', NOW(), NOW()),
(1, 11, 'AXA-2024-00027', 'Habitation', 'actif', 460.00, 38.33, '2024-04-01', '2025-03-31', 'AXA', 'Tous risques', 'Maison périurbaine', NOW(), NOW()),
(1, 12, 'AXA-2024-00028', 'Auto', 'actif', 690.00, 57.50, '2024-04-05', '2025-04-04', 'AXA', 'Tiers', 'Architecte, urbain', NOW(), NOW()),
(1, 12, 'AXA-2024-00029', 'Habitation', 'actif', 520.00, 43.33, '2024-04-05', '2025-04-04', 'AXA', 'Tous risques', 'Appartement Paris', NOW(), NOW()),
(1, 13, 'AXA-2024-00030', 'Auto', 'actif', 560.00, 46.67, '2024-04-10', '2025-04-09', 'AXA', 'Tiers', 'Plombier, risque', NOW(), NOW()),

-- Clients 16-25: Assurance Auto (Risque élevé) - jeunes conducteurs
(1, 14, 'AXA-2024-00031', 'Auto', 'actif', 1200.00, 100.00, '2024-04-15', '2025-04-14', 'AXA', 'Tiers', 'Jeune 4ans, 2 sinistres', NOW(), NOW()),
(1, 14, 'AXA-2024-00032', 'Habitation', 'actif', 380.00, 31.67, '2024-04-15', '2025-04-14', 'AXA', 'Tous risques', 'Studio étudiant', NOW(), NOW()),
(1, 15, 'AXA-2024-00033', 'Auto', 'actif', 1300.00, 108.33, '2024-04-20', '2025-04-19', 'AXA', 'Tiers', 'Dev 3ans, 3 sinistres', NOW(), NOW()),
(1, 15, 'AXA-2024-00034', 'Habitation', 'actif', 400.00, 33.33, '2024-04-20', '2025-04-19', 'AXA', 'Tous risques', 'Colocation urbain', NOW(), NOW()),
(1, 16, 'AXA-2024-00035', 'Auto', 'actif', 1350.00, 112.50, '2024-05-01', '2025-04-30', 'AXA', 'Tiers', 'Jeune 2ans, 4 sinistres', NOW(), NOW()),

(1, 16, 'AXA-2024-00036', 'Habitation', 'actif', 420.00, 35.00, '2024-05-01', '2025-04-30', 'AXA', 'Tous risques', 'Logement étudiant', NOW(), NOW()),
(1, 17, 'AXA-2024-00037', 'Auto', 'actif', 1450.00, 120.83, '2024-05-05', '2025-05-04', 'AXA', 'Tiers', 'Apprenti 1an, 5 sinistres', NOW(), NOW()),
(1, 17, 'AXA-2024-00038', 'Habitation', 'actif', 450.00, 37.50, '2024-05-05', '2025-05-04', 'AXA', 'Tous risques', 'Petit logement', NOW(), NOW()),
(1, 18, 'AXA-2024-00039', 'Auto', 'actif', 1200.00, 100.00, '2024-05-10', '2025-05-09', 'AXA', 'Tiers', 'Livreur 4ans, 2 sinistres', NOW(), NOW()),
(1, 18, 'AXA-2024-00040', 'Habitation', 'actif', 380.00, 31.67, '2024-05-10', '2025-05-09', 'AXA', 'Tous risques', 'T2 marié', NOW(), NOW()),

(1, 19, 'AXA-2024-00041', 'Auto', 'actif', 1280.00, 106.67, '2024-05-15', '2025-05-14', 'AXA', 'Tiers', 'Manager 3ans, 3 sinistres', NOW(), NOW()),
(1, 19, 'AXA-2024-00042', 'Habitation', 'actif', 490.00, 40.83, '2024-05-15', '2025-05-14', 'AXA', 'Tous risques', 'T3 marié', NOW(), NOW()),
(1, 20, 'AXA-2024-00043', 'Auto', 'actif', 1400.00, 116.67, '2024-05-20', '2025-05-19', 'AXA', 'Tiers', 'Conducteur 2ans, 5 sinistres', NOW(), NOW()),
(1, 20, 'AXA-2024-00044', 'Habitation', 'actif', 520.00, 43.33, '2024-05-20', '2025-05-19', 'AXA', 'Tous risques', 'Petit house', NOW(), NOW()),
(1, 21, 'AXA-2024-00045', 'Auto', 'actif', 1500.00, 125.00, '2024-05-25', '2025-05-24', 'AXA', 'Tiers', 'Livreur 1an, 6 sinistres', NOW(), NOW()),

-- Clients 26-35: Assurance Auto (Très haut risque) - bonus-malus >1.75
(1, 22, 'AXA-2024-00046', 'Auto', 'actif', 1550.00, 129.17, '2024-06-01', '2025-05-31', 'AXA', 'Tiers', 'Livreur 1an, 6 sinistres', NOW(), NOW()),
(1, 22, 'AXA-2024-00047', 'Habitation', 'actif', 400.00, 33.33, '2024-06-01', '2025-05-31', 'AXA', 'Tous risques', 'Petit appartement', NOW(), NOW()),
(1, 23, 'AXA-2024-00048', 'Auto', 'actif', 1600.00, 133.33, '2024-06-05', '2025-06-04', 'AXA', 'Tiers', 'Apprenti 0an, 7 sinistres', NOW(), NOW()),
(1, 23, 'AXA-2024-00049', 'Habitation', 'actif', 420.00, 35.00, '2024-06-05', '2025-06-04', 'AXA', 'Tous risques', 'Studio urbain', NOW(), NOW()),
(1, 24, 'AXA-2024-00050', 'Auto', 'actif', 1650.00, 137.50, '2024-06-10', '2025-06-09', 'AXA', 'Tiers', 'Conductrice 0an, 8 sinistres', NOW(), NOW()),

(1, 24, 'AXA-2024-00051', 'Habitation', 'actif', 450.00, 37.50, '2024-06-10', '2025-06-09', 'AXA', 'Tous risques', 'T2 urbain', NOW(), NOW()),
(1, 25, 'AXA-2024-00052', 'Auto', 'actif', 1600.00, 133.33, '2024-06-15', '2025-06-14', 'AXA', 'Tiers', 'Conductrice 2ans, 6 sinistres', NOW(), NOW()),
(1, 25, 'AXA-2024-00053', 'Habitation', 'actif', 380.00, 31.67, '2024-06-15', '2025-06-14', 'AXA', 'Tous risques', 'Petit logement', NOW(), NOW()),
(1, 26, 'AXA-2024-00054', 'Auto', 'actif', 1700.00, 141.67, '2024-06-20', '2025-06-19', 'AXA', 'Tiers', 'Chauffeur 1an, 9 sinistres', NOW(), NOW()),
(1, 26, 'AXA-2024-00055', 'Habitation', 'actif', 470.00, 39.17, '2024-06-20', '2025-06-19', 'AXA', 'Tous risques', 'T2 urbain', NOW(), NOW()),

(1, 27, 'AXA-2024-00056', 'Auto', 'actif', 1550.00, 129.17, '2024-06-25', '2025-06-24', 'AXA', 'Tiers', 'Livreur 0an, 7 sinistres', NOW(), NOW()),
(1, 27, 'AXA-2024-00057', 'Habitation', 'actif', 490.00, 40.83, '2024-06-25', '2025-06-24', 'AXA', 'Tous risques', 'T3 urbain', NOW(), NOW()),
(1, 28, 'AXA-2024-00058', 'Auto', 'actif', 1620.00, 135.00, '2024-07-01', '2025-06-30', 'AXA', 'Tiers', 'Apprentie 1an, 6 sinistres', NOW(), NOW()),
(1, 28, 'AXA-2024-00059', 'Habitation', 'actif', 410.00, 34.17, '2024-07-01', '2025-06-30', 'AXA', 'Tous risques', 'Petit logement', NOW(), NOW()),
(1, 29, 'AXA-2024-00060', 'Auto', 'actif', 1480.00, 123.33, '2024-07-05', '2025-07-04', 'AXA', 'Tiers', 'Ouvrier 2ans, 4 sinistres', NOW(), NOW());

-- Fin d'insertion: 60 contrats ✅
