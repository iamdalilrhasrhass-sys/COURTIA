-- ============================================
-- ÉTAPE 2A: INSERT 40 CLIENTS (demo@courtia.fr)
-- ============================================
-- Tous les clients liés à courtier_id = 1 (demo@courtia.fr)
-- Champs assurance complets: bonus_malus, annees_permis, nb_sinistres_3ans, zone_geographique, profession, situation_familiale

INSERT INTO clients (
  courtier_id, first_name, last_name, email, phone, address, postal_code, city,
  date_of_birth, gender, status, created_at, updated_at,
  bonus_malus, annees_permis, nb_sinistres_3ans, zone_geographique, profession, situation_familiale,
  risk_score, loyalty_score
) VALUES

-- 1-5: Clients à faible risque (bonus-malus ≤0.80, zone rurale/périurbaine, expérience ≥10ans)
(1, 'Jean', 'Dupont', 'jean.dupont@email.com', '0601020304', '15 rue de la Paix', '77000', 'Melun', '1970-05-12', 'M', 'actif', NOW(), NOW(), 0.70, 18, 0, 'rural', 'Agriculteur', 'Marié(e)', 35, 85),
(1, 'Marie', 'Bernard', 'marie.bernard@email.com', '0612345678', '42 avenue du Commerce', '77200', 'Mitry-Mory', '1975-03-20', 'F', 'actif', NOW(), NOW(), 0.75, 15, 0, 'rural', 'Infirmière', 'Célibataire', 38, 80),
(1, 'Pierre', 'Moreau', 'pierre.moreau@email.com', '0698765432', '8 chemin des Champs', '77400', 'Lagny-sur-Marne', '1968-08-15', 'M', 'actif', NOW(), NOW(), 0.80, 20, 0, 'périurbain', 'Fonctionnaire', 'Marié(e)', 42, 75),
(1, 'Sophie', 'Laurent', 'sophie.laurent@email.com', '0611223344', '5 boulevard Victor', '77100', 'Meaux', '1972-11-08', 'F', 'actif', NOW(), NOW(), 0.65, 16, 1, 'rural', 'Retraité(e)', 'Marié(e)', 41, 72),
(1, 'Philippe', 'Fournier', 'philippe.fournier@email.com', '0687654321', '99 rue des Roses', '77500', 'Chelles', '1965-02-28', 'M', 'actif', NOW(), NOW(), 0.70, 22, 0, 'rural', 'Chauffeur', 'Marié(e)', 33, 88),

-- 6-15: Clients à risque moyen (bonus-malus 1.00-1.25, zone périurbaine, expérience 5-10ans)
(1, 'Isabelle', 'Garcia', 'isabelle.garcia@email.com', '0633445566', '77 rue Saint-Louis', '77600', 'Bussy-Saint-Georges', '1985-06-10', 'F', 'actif', NOW(), NOW(), 1.00, 8, 0, 'périurbain', 'Commerciante', 'Marié(e)', 50, 65),
(1, 'Claude', 'Martinez', 'claude.martinez@email.com', '0622334455', '12 impasse de la Fontaine', '77700', 'Serris', '1982-09-22', 'M', 'actif', NOW(), NOW(), 1.05, 7, 1, 'périurbain', 'Employé', 'Célibataire', 53, 60),
(1, 'Valérie', 'Rodriguez', 'valerie.rodriguez@email.com', '0676543210', '34 allée des Lilas', '77800', 'Villepinte', '1988-01-14', 'F', 'actif', NOW(), NOW(), 1.20, 9, 2, 'urbain', 'Infirmière', 'Divorcé(e)', 58, 55),
(1, 'Marc', 'Fernandez', 'marc.fernandez@email.com', '0605050505', '56 rue de Rivoli', '77100', 'Meaux', '1990-04-18', 'M', 'actif', NOW(), NOW(), 1.10, 6, 1, 'périurbain', 'Logisticien', 'Marié(e)', 52, 62),
(1, 'Nathalie', 'Lopez', 'nathalie.lopez@email.com', '0614141414', '88 avenue Montaigne', '77400', 'Lagny-sur-Marne', '1987-07-25', 'F', 'actif', NOW(), NOW(), 1.00, 8, 0, 'urbain', 'Manager', 'Marié(e)', 48, 70),

(1, 'Laurent', 'Gonzales', 'laurent.gonzales@email.com', '0690909090', '23 rue de la République', '77500', 'Chelles', '1983-10-30', 'M', 'actif', NOW(), NOW(), 1.25, 5, 2, 'urbain', 'Électricien', 'Célibataire', 60, 50),
(1, 'Carole', 'Hernandez', 'carole.hernandez@email.com', '0657575757', '45 boulevard de la Gare', '77600', 'Bussy-Saint-Georges', '1989-12-05', 'F', 'actif', NOW(), NOW(), 1.15, 7, 1, 'urbain', 'Architecte', 'Marié(e)', 54, 68),
(1, 'Denis', 'Castro', 'denis.castro@email.com', '0673737373', '67 avenue de la République', '77200', 'Mitry-Mory', '1986-03-12', 'M', 'actif', NOW(), NOW(), 1.05, 9, 0, 'périurbain', 'Plombier', 'Marié(e)', 50, 66),
(1, 'Martine', 'Delgado', 'martine.delgado@email.com', '0681818181', '19 rue des Acacias', '77700', 'Serris', '1984-05-20', 'F', 'actif', NOW(), NOW(), 1.20, 6, 3, 'urbain', 'Assistante', 'Divorcé(e)', 62, 48),
(1, 'Serge', 'Mendes', 'serge.mendes@email.com', '0669696969', '31 place de la Mairie', '77800', 'Villepinte', '1981-08-14', 'M', 'actif', NOW(), NOW(), 1.10, 8, 1, 'urbain', 'Mécanicien', 'Marié(e)', 55, 61),

-- 16-25: Clients à risque élevé (bonus-malus 1.50-1.75, zone urbaine, jeunes conducteurs <5ans)
(1, 'Audrey', 'Santos', 'audrey.santos@email.com', '0607070707', '40 rue du Faubourg', '77000', 'Melun', '1995-01-22', 'F', 'actif', NOW(), NOW(), 1.50, 4, 2, 'urbain', 'Assistante', 'Célibataire', 68, 42),
(1, 'Christophe', 'Oliveira', 'christophe.oliveira@email.com', '0618181818', '50 avenue des Champs', '77400', 'Lagny-sur-Marne', '1994-09-08', 'M', 'actif', NOW(), NOW(), 1.55, 3, 3, 'urbain', 'Développeur', 'Célibataire', 72, 38),
(1, 'Émilie', 'Teixeira', 'emilie.teixeira@email.com', '0642424242', '73 rue de la Paix', '77100', 'Meaux', '1996-11-15', 'F', 'actif', NOW(), NOW(), 1.60, 2, 4, 'urbain', 'Étudiante', 'Célibataire', 75, 35),
(1, 'Guillaume', 'Ferreira', 'guillaume.ferreira@email.com', '0650505050', '82 boulevard Saint-Germain', '77600', 'Bussy-Saint-Georges', '1993-04-03', 'M', 'actif', NOW(), NOW(), 1.70, 1, 5, 'urbain', 'Livreur', 'Célibataire', 80, 30),
(1, 'Stéphanie', 'Goncalves', 'stephanie.goncalves@email.com', '0663636363', '95 rue de Turenne', '77500', 'Chelles', '1997-06-18', 'F', 'actif', NOW(), NOW(), 1.65, 2, 3, 'urbain', 'Vendeuse', 'Célibataire', 74, 36),

(1, 'Fabien', 'Monteiro', 'fabien.monteiro@email.com', '0671717171', '61 avenue Foch', '77200', 'Mitry-Mory', '1998-08-25', 'M', 'actif', NOW(), NOW(), 1.75, 1, 4, 'urbain', 'Apprenti', 'Célibataire', 78, 32),
(1, 'Jennifer', 'Ribeiro', 'jennifer.ribeiro@email.com', '0655555555', '28 rue Saint-Antoine', '77700', 'Serris', '1999-02-10', 'F', 'actif', NOW(), NOW(), 1.60, 0, 3, 'urbain', 'Stagaire', 'Célibataire', 73, 37),
(1, 'Bruno', 'Coelho', 'bruno.coelho@email.com', '0679797979', '86 boulevard de la Chapelle', '77800', 'Villepinte', '1992-10-28', 'M', 'actif', NOW(), NOW(), 1.50, 4, 2, 'urbain', 'Plombier', 'Marié(e)', 67, 45),
(1, 'Mélissa', 'Sousa', 'melissa.sousa@email.com', '0683838383', '39 rue de Vaugirard', '77100', 'Meaux', '1996-07-12', 'F', 'actif', NOW(), NOW(), 1.55, 3, 3, 'urbain', 'Responsable RH', 'Marié(e)', 70, 40),
(1, 'Anthony', 'Dias', 'anthony.dias@email.com', '0691919191', '74 place des Vosges', '77400', 'Lagny-sur-Marne', '1994-12-20', 'M', 'actif', NOW(), NOW(), 1.70, 2, 5, 'urbain', 'Conducteur', 'Célibataire', 77, 33),

-- 26-35: Clients à très haut risque (bonus-malus >1.75)
(1, 'Roxane', 'Pinto', 'roxane.pinto@email.com', '0604040404', '16 avenue de Marsan', '77600', 'Bussy-Saint-Georges', '1997-03-09', 'F', 'actif', NOW(), NOW(), 1.80, 1, 6, 'urbain', 'Livreur', 'Célibataire', 82, 28),
(1, 'Dylan', 'Cardoso', 'dylan.cardoso@email.com', '0615151515', '48 rue Mouffetard', '77500', 'Chelles', '1998-11-17', 'M', 'actif', NOW(), NOW(), 1.85, 0, 7, 'urbain', 'Apprenti', 'Célibataire', 86, 25),
(1, 'Camille', 'Barbosa', 'camille.barbosa@email.com', '0647474747', '29 rue des Petits Carreaux', '77200', 'Mitry-Mory', '1999-05-22', 'F', 'actif', NOW(), NOW(), 1.90, 1, 5, 'urbain', 'Conductrice', 'Célibataire', 85, 26),
(1, 'Vincent', 'Lemos', 'vincent.lemos@email.com', '0665656565', '64 rue Mouffetard', '77700', 'Serris', '1996-09-30', 'M', 'actif', NOW(), NOW(), 1.95, 0, 8, 'urbain', 'Coursier', 'Célibataire', 88, 22),
(1, 'Patricia', 'Marques', 'patricia.marques@email.com', '0676767676', '35 rue de Rivoli', '77800', 'Villepinte', '1995-04-15', 'F', 'actif', NOW(), NOW(), 1.80, 2, 6, 'urbain', 'Conductrice', 'Divorcé(e)', 83, 30),

(1, 'Régis', 'Esteves', 'regis.esteves@email.com', '0684848484', '77 boulevard Saint-Denis', '77000', 'Melun', '1994-07-26', 'M', 'actif', NOW(), NOW(), 2.00, 1, 9, 'urbain', 'Chauffeur', 'Célibataire', 90, 20),
(1, 'Quentin', 'Correia', 'quentin.correia@email.com', '0693939393', '41 rue Réaumur', '77400', 'Lagny-sur-Marne', '1997-10-11', 'M', 'actif', NOW(), NOW(), 1.85, 0, 7, 'urbain', 'Livreur', 'Célibataire', 87, 23),
(1, 'Valéra', 'Silva', 'valera.silva@email.com', '0608080808', '52 rue Saint-Honoré', '77100', 'Meaux', '1998-01-05', 'F', 'actif', NOW(), NOW(), 1.90, 1, 6, 'urbain', 'Apprentie', 'Célibataire', 84, 28),
(1, 'Olivier', 'Pereira', 'olivier.pereira@email.com', '0629292929', '71 rue de Sèvres', '77600', 'Bussy-Saint-Georges', '1996-08-19', 'M', 'actif', NOW(), NOW(), 1.75, 2, 4, 'urbain', 'Ouvrier', 'Marié(e)', 81, 35),
(1, 'Karine', 'Rocha', 'karine.rocha@email.com', '0636363636', '44 boulevard des Invalides', '77500', 'Chelles', '1997-12-02', 'F', 'actif', NOW(), NOW(), 1.80, 1, 5, 'urbain', 'Conductrice', 'Célibataire', 82, 29),

-- 36-40: Clients inactifs ou résiliés (historiques)
(1, 'André', 'Blanchard', 'andre.blanchard@email.com', '0645454545', '14 rue des Boules', '77200', 'Mitry-Mory', '1960-06-11', 'M', 'résilié', NOW(), NOW(), 0.80, 25, 2, 'rural', 'Retraité(e)', 'Marié(e)', 45, 55),
(1, 'Rachel', 'Chevallier', 'rachel.chevallier@email.com', '0652525252', '23 avenue Montaigne', '77700', 'Serris', '1970-11-28', 'F', 'inactif', NOW(), NOW(), 1.30, 12, 3, 'périurbain', 'Agents', 'Marié(e)', 65, 40),
(1, 'Thierry', 'Girard', 'thierry.girard@email.com', '0660606060', '57 rue de Courcelles', '77800', 'Villepinte', '1975-02-14', 'M', 'résilié', NOW(), NOW(), 1.60, 8, 4, 'urbain', 'Employé', 'Divorcé(e)', 72, 35),
(1, 'Liliane', 'Hubert', 'liliane.hubert@email.com', '0667676767', '36 rue des Archives', '77000', 'Melun', '1962-09-03', 'F', 'inactif', NOW(), NOW(), 0.90, 20, 1, 'rural', 'Retraité(e)', 'Veuf(ve)', 38, 60),
(1, 'Roger', 'Leclerc', 'roger.leclerc@email.com', '0672727272', '63 rue de Bretagne', '77100', 'Meaux', '1958-04-21', 'M', 'résilié', NOW(), NOW(), 1.40, 28, 3, 'périurbain', 'Retraité(e)', 'Marié(e)', 55, 50);

-- Fin d'insertion: 40 clients ✅
