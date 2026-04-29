/**
 * COURTIA REACH — Campaign Service
 * Gestion des campagnes de prospection.
 */

const { generateCampaigns } = require('./reachMockService');

async function getCampaigns(userId, pool) {
  try {
    const result = await pool.query(
      `SELECT c.*, COUNT(cp.id) as prospect_count
       FROM reach_campaigns c
       LEFT JOIN reach_campaign_prospects cp ON cp.campaign_id = c.id
       WHERE c.user_id = $1
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
      [userId]
    );
    return result.rows;
  } catch (err) {
    return generateCampaigns(userId);
  }
}

async function createCampaign(userId, { name, target_description, channel, steps }, pool) {
  try {
    const result = await pool.query(
      `INSERT INTO reach_campaigns (user_id, name, target_description, channel, status)
       VALUES ($1, $2, $3, $4, 'draft') RETURNING *`,
      [userId, name, target_description || '', channel || 'email']
    );
    const campaign = result.rows[0];
    if (steps && steps.length > 0) {
      for (let i = 0; i < steps.length; i++) {
        const s = steps[i];
        await pool.query(
          `INSERT INTO reach_campaign_steps (campaign_id, step_order, delay_days, channel, subject_template, body_template)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [campaign.id, i, s.delay_days || 0, s.channel || 'email', s.subject_template || '', s.body_template || '']
        );
      }
    }
    return campaign;
  } catch (err) {
    return { id: Date.now(), name, target_description, channel, status: 'draft', steps };
  }
}

async function addProspectsToCampaign(campaignId, prospectIds, pool) {
  try {
    for (const pid of prospectIds) {
      await pool.query(
        `INSERT INTO reach_campaign_prospects (campaign_id, prospect_id, status)
         VALUES ($1, $2, 'pending') ON CONFLICT DO NOTHING`,
        [campaignId, pid]
      );
    }
    return { success: true, added: prospectIds.length };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

function getCampaignTemplates() {
  return [
    {
      name: 'Garages locaux — Assurance Pro',
      target_description: 'Garages automobiles dans votre zone',
      channel: 'email',
      steps: [
        { delay_days: 0, subject_template: 'Vos véhicules clients sont-ils bien couverts ?',
          body_template: 'Bonjour,\n\nJe suis courtier spécialisé en assurance automobile pro.\nLes garages comme le vôtre ont souvent des lacunes RC Pro et Flotte Auto.\n\nAudit gratuit de 10 minutes ?\n\nCordialement,' },
        { delay_days: 2, subject_template: 'Petit rappel — audit assurance garage',
          body_template: 'Bonjour,\n\nPetite relance concernant ma proposition d\'audit assurance.\nC\'est gratuit, sans engagement, en 10 minutes.\n\nCordialement,' },
        { delay_days: 5, subject_template: 'Dernier message — économisez sur vos assurances pro',
          body_template: 'Bonjour,\n\nDernier message. Un courtier peut vous faire économiser 20 à 30%.\nJe reste disponible.\n\nCordialement,' },
      ],
    },
    {
      name: 'Taxis / VTC — Protection revenu + véhicule',
      target_description: 'Taxis et VTC indépendants',
      channel: 'email',
      steps: [
        { delay_days: 0, subject_template: 'Votre assurance couvre-t-elle votre perte de revenu ?',
          body_template: 'Bonjour,\n\nVotre véhicule est votre outil de travail. Un accident = perte de revenu.\n\nJe propose une couverture avec protection revenu incluse.\n\nÉchangeons 5 minutes ?\n\nCordialement,' },
        { delay_days: 2, subject_template: 'Relance — protection taxi/VTC',
          body_template: 'Bonjour,\n\nAvez-vous eu le temps de regarder ma proposition ?\nUne meilleure couverture vous protège en cas d\'arrêt.\n\nCordialement,' },
        { delay_days: 5, subject_template: 'Assurance taxi : comparez gratuitement',
          body_template: 'Bonjour,\n\nJe compare votre contrat en 5 minutes, gratuitement.\nSans engagement.\n\nCordialement,' },
      ],
    },
    {
      name: 'Artisans BTP — Décennale + RC Pro',
      target_description: 'Artisans du bâtiment',
      channel: 'email',
      steps: [
        { delay_days: 0, subject_template: 'Votre décennale est-elle vraiment adaptée ?',
          body_template: 'Bonjour,\n\nBeaucoup d\'artisans payent leur décennale 20 à 30% trop cher.\n\nAudit gratuit de 10 minutes ?\n\nCordialement,' },
        { delay_days: 2, subject_template: 'Relance — audit assurance artisan',
          body_template: 'Bonjour,\n\n10 minutes pour vérifier votre décennale ? Cela peut vous faire économiser des centaines d\'euros.\n\nCordialement,' },
        { delay_days: 5, subject_template: 'Décennale : économisez sans perdre en garanties',
          body_template: 'Bonjour,\n\nDernier message. Comparez votre décennale gratuitement.\n\nCordialement,' },
      ],
    },
  ];
}

module.exports = { getCampaigns, createCampaign, addProspectsToCampaign, getCampaignTemplates };
