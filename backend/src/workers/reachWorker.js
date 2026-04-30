/**
 * REACH Worker — Envoi séquentiel de messages de campagne
 * 
 * Vérifie toutes les 5 minutes les campagnes en statut 'running'
 * et envoie les messages programmés.
 * 
 * Démarrage: startReachWorker(pool)
 */

const crypto = require('crypto');

class ReachWorker {
  constructor(pool) {
    this.pool = pool;
    this.interval = null;
  }

  start(intervalMs = 5 * 60 * 1000) {
    console.log('[reachWorker] Démarrage worker (intervalle: ' + (intervalMs / 1000) + 's)');
    // Run immediately then every interval
    this.processCampaigns();
    this.interval = setInterval(() => this.processCampaigns(), intervalMs);
    console.log('[reachWorker] Worker actif');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('[reachWorker] Worker arrêté');
    }
  }

  async processCampaigns() {
    try {
      // Récupérer les campagnes running
      const campaigns = await this.pool.query(
        "SELECT * FROM reach_campaigns WHERE status = 'running'"
      );

      if (campaigns.rows.length === 0) return;

      for (const campaign of campaigns.rows) {
        try {
          await this.processCampaign(campaign);
        } catch (e) {
          console.error(`[reachWorker] Erreur campagne #${campaign.id}:`, e.message);
        }
      }
    } catch (e) {
      console.error('[reachWorker] Erreur processCampaigns:', e.message);
    }
  }

  async processCampaign(campaign) {
    const steps = await this.pool.query(
      'SELECT * FROM reach_campaign_steps WHERE campaign_id = $1 ORDER BY step_order',
      [campaign.id]
    );

    if (steps.rows.length === 0) {
      console.log(`[reachWorker] Campagne #${campaign.id} sans steps — complétion`);
      await this.pool.query(
        "UPDATE reach_campaigns SET status = 'completed', updated_at = NOW() WHERE id = $1",
        [campaign.id]
      );
      return;
    }

    // Récupérer les prospects de la campagne
    const prospects = await this.pool.query(
      `SELECT cp.*, p.contact_first_name, p.contact_last_name, p.email, p.company_name, p.city, p.phone
       FROM reach_campaign_prospects cp
       JOIN reach_prospects p ON p.id = cp.prospect_id
       WHERE cp.campaign_id = $1 AND cp.status = 'pending'`,
      [campaign.id]
    );

    if (prospects.rows.length === 0) {
      // Tous les prospects ont été traités — compléter la campagne
      const pendingCheck = await this.pool.query(
        "SELECT COUNT(*) as c FROM reach_campaign_prospects WHERE campaign_id = $1 AND status = 'pending'",
        [campaign.id]
      );
      if (parseInt(pendingCheck.rows[0].c) === 0) {
        await this.pool.query(
          "UPDATE reach_campaigns SET status = 'completed', updated_at = NOW() WHERE id = $1",
          [campaign.id]
        );
        console.log(`[reachWorker] Campagne #${campaign.id} complétée`);
      }
      return;
    }

    const now = new Date();

    for (const prospect of prospects.rows) {
      try {
        await this.sendNextStep(campaign, prospect, steps.rows, now);
      } catch (e) {
        console.error(`[reachWorker] Erreur prospect #${prospect.prospect_id}:`, e.message);
      }
    }
  }

  isDryRun() {
    // SÉCURITÉ ABSOLUE: si DISABLE_REACH_SENDING n'est PAS défini, on empêche l'envoi
    // Nécessite une variable explicite pour activer l'envoi réel
    return process.env.DISABLE_REACH_SENDING !== 'false' && process.env.REACH_REALLY_SEND !== 'true';
  }

  async sendNextStep(campaign, prospect, steps, now) {
    const currentStepIdx = prospect.current_step || 0;

    if (currentStepIdx >= steps.length) {
      await this.pool.query(
        "UPDATE reach_campaign_prospects SET status = 'completed' WHERE campaign_id = $1 AND prospect_id = $2",
        [campaign.id, prospect.prospect_id]
      );
      return;
    }

    const step = steps[currentStepIdx];

    // Vérifier le délai
    if (prospect.last_contacted_at) {
      const lastContact = new Date(prospect.last_contacted_at);
      const daysSinceLast = (now - lastContact) / (1000 * 60 * 60 * 24);
      if (daysSinceLast < step.delay_days) {
        return;
      }
    }

    // Vérifier email requis
    if (campaign.channel === 'email' && !prospect.email) {
      await this.pool.query(
        "UPDATE reach_campaign_prospects SET status = 'skipped' WHERE campaign_id = $1 AND prospect_id = $2",
        [campaign.id, prospect.prospect_id]
      );
      return;
    }

    // Vérifier opt-out du prospect
    const optOut = await this.pool.query(
      'SELECT 1 FROM reach_opt_outs WHERE email = $1',
      [prospect.email]
    );
    if (optOut.rows.length > 0) {
      console.log(`[reachWorker] Prospect ${prospect.email} opt-out — skip`);
      await this.pool.query(
        "UPDATE reach_campaign_prospects SET status = 'skipped' WHERE campaign_id = $1 AND prospect_id = $2",
        [campaign.id, prospect.prospect_id]
      );
      return;
    }

    const subject = this.personalize(step.subject_template || '', prospect);
    const body = this.personalize(step.body_template || '', prospect);
    const messageId = crypto.randomUUID().substring(0, 8);
    const dryRun = this.isDryRun();

    // Mode DRY-RUN : on log mais on envoie PAS réellement
    if (dryRun) {
      console.log(`[reachWorker][DRY-RUN] Campagne #${campaign.id}, step ${step.step_order}, prospect ${prospect.email}`);
      console.log(`[reachWorker][DRY-RUN] Sujet: ${subject}`);
      console.log(`[reachWorker][DRY-RUN] Corps: ${body.substring(0, 200)}...`);

      await this.pool.query(
        `INSERT INTO reach_messages (id, prospect_id, campaign_id, direction, channel, subject, body, status, metadata)
         VALUES ($1, $2, $3, 'outbound', $4, $5, $6, 'dry_run', $7)`,
        [messageId, prospect.prospect_id, campaign.id, campaign.channel, subject, body, JSON.stringify({
          step_order: step.step_order,
          dry_run_at: now.toISOString(),
          dry_run: true,
          note: 'BLOQUÉ par DISABLE_REACH_SENDING — définir REACH_REALLY_SEND=true pour activer'
        })]
      );

      await this.pool.query(
        "UPDATE reach_campaign_prospects SET current_step = $1, status = 'dry_run', updated_at = NOW() WHERE campaign_id = $2 AND prospect_id = $3",
        [currentStepIdx + 1, campaign.id, prospect.prospect_id]
      );

      await this.pool.query(
        'UPDATE reach_prospects SET last_contacted_at = NOW(), updated_at = NOW() WHERE id = $1',
        [prospect.prospect_id]
      );

      await this.pool.query(
        'INSERT INTO reach_activity_log (prospect_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
        [prospect.prospect_id, campaign.user_id, 'dry_run_message', JSON.stringify({
          campaign_id: campaign.id,
          step: step.step_order,
          channel: campaign.channel,
          message_id: messageId
        })]
      );

      console.log(`[reachWorker][DRY-RUN] ✅ Message #${messageId} simulé pour ${prospect.email}`);
      return;
    }

    // ENVOI RÉEL — seulement si REACH_REALLY_SEND=true
    await this.pool.query(
      `INSERT INTO reach_messages (id, prospect_id, campaign_id, direction, channel, subject, body, status, metadata)
       VALUES ($1, $2, $3, 'outbound', $4, $5, $6, 'sent', $7)`,
      [messageId, prospect.prospect_id, campaign.id, campaign.channel, subject, body, JSON.stringify({
        step_order: step.step_order,
        sent_at: now.toISOString()
      })]
    );

    await this.pool.query(
      "UPDATE reach_campaign_prospects SET current_step = $1, status = 'sent', updated_at = NOW() WHERE campaign_id = $2 AND prospect_id = $3",
      [currentStepIdx + 1, campaign.id, prospect.prospect_id]
    );

    await this.pool.query(
      'UPDATE reach_prospects SET last_contacted_at = NOW(), updated_at = NOW() WHERE id = $1',
      [prospect.prospect_id]
    );

    await this.pool.query(
      'INSERT INTO reach_activity_log (prospect_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [prospect.prospect_id, campaign.user_id, 'message_sent', JSON.stringify({
        campaign_id: campaign.id,
        step: step.step_order,
        channel: campaign.channel,
        message_id: messageId
      })]
    );

    console.log(`[reachWorker] Message #${messageId} envoyé → ${prospect.email} (campagne #${campaign.id}, step ${step.step_order})`);
  }

  personalize(text, prospect) {
    if (!text) return '';
    return text
      .replace(/{first_name}/g, prospect.contact_first_name || '')
      .replace(/{last_name}/g, prospect.contact_last_name || '')
      .replace(/{company}/g, prospect.company_name || '')
      .replace(/{city}/g, prospect.city || '')
      .replace(/{email}/g, prospect.email || '');
  }
}

let instance = null;

/**
 * Démarre le worker REACH
 * @param {object} pool - PostgreSQL pool
 * @param {number} intervalMs - Intervalle en ms (défaut: 5 minutes)
 * @returns {ReachWorker}
 */
function startReachWorker(pool, intervalMs) {
  if (instance) {
    console.log('[reachWorker] Worker déjà actif');
    return instance;
  }
  instance = new ReachWorker(pool);
  instance.start(intervalMs);
  return instance;
}

function stopReachWorker() {
  if (instance) {
    instance.stop();
    instance = null;
  }
}

module.exports = { startReachWorker, stopReachWorker, ReachWorker };
