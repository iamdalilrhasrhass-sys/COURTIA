-- Insérer 10 appointments (tâches) pour les 10 premiers clients démo
INSERT INTO appointments (user_id, client_id, organizer_id, title, description, start_time, end_time, timezone, status, created_at, updated_at)
SELECT 
  3, c.id, 3,
  CASE ROW_NUMBER() OVER (ORDER BY c.id)
    WHEN 1 THEN 'Appeler M. Renaud — renouvellement auto'
    WHEN 2 THEN 'Envoyer devis mutuelle Mme Moreau'
    WHEN 3 THEN 'RDV cabinet M. Amara — RC Pro'
    WHEN 4 THEN 'Relancer Mme Moreau — devis habitation'
    WHEN 5 THEN 'Mettre à jour fiche M. Dubois'
    WHEN 6 THEN 'Préparation RDV Michel Tessier'
    WHEN 7 THEN 'Relancer Denis Masson — Auto expirant'
    WHEN 8 THEN 'Actualiser données Anne Collet'
    WHEN 9 THEN 'Proposer contrat voyages Jérôme Roussel'
    WHEN 10 THEN 'Envoyer newsletter VIP Simone Chevalier'
  END,
  CASE ROW_NUMBER() OVER (ORDER BY c.id)
    WHEN 1 THEN 'Contrat auto expire dans 15 jours. Proposer renouvellement et vérifier conditions'
    WHEN 2 THEN 'Devis mutuelle pour Isabelle Moreau à envoyer par email avec comparatif'
    WHEN 3 THEN 'Rencontre pour négocier RC Pro (prix compétitif)'
    WHEN 4 THEN 'Suivre devis habitation envoyé le mois dernier'
    WHEN 5 THEN 'Ajouter changement de situation familiale'
    WHEN 6 THEN 'Préparer propositions pour renouvellement contrats (1850€ RC Pro)'
    WHEN 7 THEN 'Auto expire dans 20 jours, envoyer relance'
    WHEN 8 THEN 'Mettre à jour adresse et téléphone'
    WHEN 9 THEN 'Opportunité cross-sell : assurance voyages'
    WHEN 10 THEN 'Envoyer lettre annuelle des nouvelles couvertures'
  END,
  NOW() + INTERVAL '3 days' + (ROW_NUMBER() OVER (ORDER BY c.id) || ' days')::interval,
  NOW() + INTERVAL '3 days' + (ROW_NUMBER() OVER (ORDER BY c.id) || ' days')::interval + INTERVAL '1 hour',
  'Europe/Paris',
  CASE ROW_NUMBER() OVER (ORDER BY c.id)
    WHEN 1 THEN 'planifié'
    WHEN 2 THEN 'en cours'
    WHEN 9 THEN 'terminé'
    ELSE 'planifié'
  END,
  NOW(),
  NOW()
FROM clients c
WHERE c.id IN (SELECT id FROM clients ORDER BY id DESC LIMIT 40)
ORDER BY c.id LIMIT 10;
