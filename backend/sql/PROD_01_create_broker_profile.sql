-- Créer le profil broker pour demo@courtia.fr si absent
INSERT INTO broker_profiles (user_id, cabinet, orias, telephone, adresse, ville, code_postal, created_at, updated_at)
SELECT 3, 'Cabinet de Courtage COURTIA', 'ORIAS-2026-001', '+33 1 23 45 67 89', '100 Avenue des Champs-Élysées', 'Paris', '75008', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM broker_profiles WHERE user_id = 3);
