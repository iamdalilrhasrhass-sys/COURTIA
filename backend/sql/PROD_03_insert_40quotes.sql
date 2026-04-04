-- Insérer 40 quotes (contrats) pour les 40 clients (en utilisant les IDs insérés)
-- Les IDs clients doivent être connus après insertion PROD_02
INSERT INTO quotes (client_id, quote_data, status, created_at)
SELECT 
  CASE ROW_NUMBER() OVER (ORDER BY c.id)
    WHEN 1 THEN c.id WHEN 2 THEN c.id WHEN 3 THEN c.id WHEN 4 THEN c.id WHEN 5 THEN c.id
    WHEN 6 THEN c.id WHEN 7 THEN c.id WHEN 8 THEN c.id WHEN 9 THEN c.id WHEN 10 THEN c.id
    WHEN 11 THEN c.id WHEN 12 THEN c.id WHEN 13 THEN c.id WHEN 14 THEN c.id WHEN 15 THEN c.id
    WHEN 16 THEN c.id WHEN 17 THEN c.id WHEN 18 THEN c.id WHEN 19 THEN c.id WHEN 20 THEN c.id
    WHEN 21 THEN c.id WHEN 22 THEN c.id WHEN 23 THEN c.id WHEN 24 THEN c.id WHEN 25 THEN c.id
    WHEN 26 THEN c.id WHEN 27 THEN c.id WHEN 28 THEN c.id WHEN 29 THEN c.id WHEN 30 THEN c.id
    WHEN 31 THEN c.id WHEN 32 THEN c.id WHEN 33 THEN c.id WHEN 34 THEN c.id WHEN 35 THEN c.id
    WHEN 36 THEN c.id WHEN 37 THEN c.id WHEN 38 THEN c.id WHEN 39 THEN c.id WHEN 40 THEN c.id
  END,
  jsonb_build_object(
    'type', CASE ROW_NUMBER() OVER (ORDER BY c.id)
      WHEN 1 THEN 'Auto' WHEN 2 THEN 'Habitation' WHEN 3 THEN 'RC Pro' WHEN 4 THEN 'Mutuelle' WHEN 5 THEN 'Prévoyance'
      WHEN 6 THEN 'Auto' WHEN 7 THEN 'Habitation' WHEN 8 THEN 'RC Pro' WHEN 9 THEN 'Mutuelle' WHEN 10 THEN 'Prévoyance'
      WHEN 11 THEN 'Auto' WHEN 12 THEN 'Habitation' WHEN 13 THEN 'RC Pro' WHEN 14 THEN 'Mutuelle' WHEN 15 THEN 'Prévoyance'
      WHEN 16 THEN 'Auto' WHEN 17 THEN 'Habitation' WHEN 18 THEN 'RC Pro' WHEN 19 THEN 'Mutuelle' WHEN 20 THEN 'Prévoyance'
      WHEN 21 THEN 'Auto' WHEN 22 THEN 'Habitation' WHEN 23 THEN 'RC Pro' WHEN 24 THEN 'Mutuelle' WHEN 25 THEN 'Prévoyance'
      WHEN 26 THEN 'Auto' WHEN 27 THEN 'Habitation' WHEN 28 THEN 'RC Pro' WHEN 29 THEN 'Mutuelle' WHEN 30 THEN 'Prévoyance'
      WHEN 31 THEN 'Auto' WHEN 32 THEN 'Habitation' WHEN 33 THEN 'RC Pro' WHEN 34 THEN 'Mutuelle' WHEN 35 THEN 'Prévoyance'
      WHEN 36 THEN 'Auto' WHEN 37 THEN 'Habitation' WHEN 38 THEN 'RC Pro' WHEN 39 THEN 'Mutuelle' WHEN 40 THEN 'Prévoyance'
    END,
    'compagnie', CASE ROW_NUMBER() OVER (ORDER BY c.id) % 10
      WHEN 0 THEN 'AXA' WHEN 1 THEN 'Allianz' WHEN 2 THEN 'Generali' WHEN 3 THEN 'MMA' WHEN 4 THEN 'Groupama'
      WHEN 5 THEN 'Macif' WHEN 6 THEN 'Zurich' WHEN 7 THEN 'MAIF' WHEN 8 THEN 'Crédit Mutuel' ELSE 'Direct Assurance'
    END,
    'prime_annuelle', CASE ROW_NUMBER() OVER (ORDER BY c.id) % 5
      WHEN 0 THEN 420 WHEN 1 THEN 520 WHEN 2 THEN 750 WHEN 3 THEN 1200 ELSE 450
    END,
    'date_effet', CURRENT_DATE - INTERVAL '1 year',
    'date_echeance', CURRENT_DATE + INTERVAL '6 months'
  ),
  CASE ROW_NUMBER() OVER (ORDER BY c.id) % 5
    WHEN 0 THEN 'accepté' WHEN 1 THEN 'en attente' ELSE 'accepté'
  END,
  NOW()
FROM clients c
WHERE c.id IN (SELECT id FROM clients ORDER BY id DESC LIMIT 40)
ORDER BY c.id;
