-- ============================================
-- ÉTAPE 6A: UPDATE RISK SCORES (courtier_id = 1)
-- ============================================
-- Recalcule score_risque pour tous les clients avec formule DÉTAILLÉE
-- Base 50 + bonus-malus + sinistres*12 + expérience + zone
-- Clamped 0-100

UPDATE clients 
SET score_risque = GREATEST(0, LEAST(100, 
  50
  -- 1. Bonus-malus: ≤0.80→-15, ≤1.00→-5, ≤1.25→+5, ≤1.75→+15, >1.75→+25
  + CASE 
      WHEN bonus_malus <= 0.80 THEN -15
      WHEN bonus_malus <= 1.00 THEN -5
      WHEN bonus_malus <= 1.25 THEN 5
      WHEN bonus_malus <= 1.75 THEN 15
      ELSE 25
    END
  -- 2. Sinistres 3ans: +12 par sinistre
  + (COALESCE(nb_sinistres_3ans, 0) * 12)
  -- 3. Expérience: ≥10→-10, ≥5→-5, ≤2→+15
  + CASE
      WHEN annees_permis >= 10 THEN -10
      WHEN annees_permis >= 5 THEN -5
      WHEN annees_permis <= 2 THEN 15
      ELSE 0
    END
  -- 4. Zone: urbain→+10, periurbain→+3, rural→-5
  + CASE
      WHEN LOWER(zone_geographique) = 'urbain' THEN 10
      WHEN LOWER(zone_geographique) = 'periurbain' THEN 3
      WHEN LOWER(zone_geographique) = 'rural' THEN -5
      ELSE 0
    END
))
WHERE courtier_id = 1;

-- Log résultat
SELECT 
  id,
  CONCAT(first_name, ' ', last_name) AS nom,
  bonus_malus,
  annees_permis,
  nb_sinistres_3ans,
  zone_geographique,
  score_risque,
  CASE
    WHEN score_risque < 40 THEN '🟢 TRÈS BAS'
    WHEN score_risque < 50 THEN '🟢 BAS'
    WHEN score_risque < 60 THEN '🟡 MOYEN'
    WHEN score_risque < 75 THEN '🟠 ÉLEVÉ'
    ELSE '🔴 TRÈS ÉLEVÉ'
  END AS niveau_risque
FROM clients
WHERE courtier_id = 1
ORDER BY score_risque DESC
LIMIT 10;

-- Statistiques
SELECT
  COUNT(*) AS total_clients,
  ROUND(AVG(score_risque), 1) AS score_moyen,
  MIN(score_risque) AS score_min,
  MAX(score_risque) AS score_max,
  ROUND(STDDEV(score_risque), 1) AS écart_type,
  SUM(CASE WHEN score_risque < 40 THEN 1 ELSE 0 END) AS très_bas,
  SUM(CASE WHEN score_risque >= 40 AND score_risque < 50 THEN 1 ELSE 0 END) AS bas,
  SUM(CASE WHEN score_risque >= 50 AND score_risque < 60 THEN 1 ELSE 0 END) AS moyen,
  SUM(CASE WHEN score_risque >= 60 AND score_risque < 75 THEN 1 ELSE 0 END) AS élevé,
  SUM(CASE WHEN score_risque >= 75 THEN 1 ELSE 0 END) AS très_élevé
FROM clients
WHERE courtier_id = 1;
