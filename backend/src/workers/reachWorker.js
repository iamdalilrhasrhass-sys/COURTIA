/**
 * REACH Worker — Envoi séquentiel de messages de campagne
 * 
 * Vérifie toutes les 5 minutes les campagnes en statut 'running'
 * et envoie les messages programmés.
 * 
 * Démarrage: startReachWorker(pool)
 */

const crypto = require('crypto');
const logger = require('../lib/logger');
const { sendEmail } = require('../services/emailService');
const { sendSMS } = require('../services/smsService');

class ReachWorker {
  constructor(pool) {
    this.pool = pool;
    this.interval = null;
  }

  start(intervalMs = 5 * 60 * 1000) {
    logger.info({ interval_seconds: intervalMs / 1000 }, 'reach worker starting');
    // Run immediately then every interval
    this.processCampaigns();
    this.interval = setInterval(() => this.processCampaigns(), intervalMs);
    logger.info({}, 'reach worker active');
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      logger.info({}, 'reach worker stopped');
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
          logger.warn({ error: e.message, campaign_id: campaign.id }, 'reach worker campaign failed');
        }
      }
    } catch (e) {
      logger.warn({ error: e.message }, 'reach worker process campaigns failed');
    }
  }

  async processCampaign(campaign) {
    const steps = await this.pool.query(
      'SELECT * FROM reach_campaign_steps WHERE campaign_id = $1 ORDER BY step_order',
      [campaign.id]
    );

    if (steps.rows.length === 0) {
      logger.info({ campaign_id: campaign.id }, 'reach campaign completed without steps');
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
        logger.info({ campaign_id: campaign.id }, 'reach campaign completed');
      }
      return;
    }

    const now = new Date();

    for (const prospect of prospects.rows) {
      try {
        await this.sendNextStep(campaign, prospect, steps.rows, now);
      } catch (e) {
        logger.warn({ error: e.message, prospect_id: prospect.prospect_id }, 'reach worker prospect failed');
      }
    }
  }

  /**
   * Vérifie si on est en mode dry-run (aucun envoi réel).
   * Trois mécanismes redondants :
   * 1. DISABLE_REACH_SENDING=true (explicite)
   * 2. REACH_DRY_RUN=true (explicite)
   * 3. REACH_REALLY_SEND !== 'true' (inverse)
   */
  isDryRun() {
    // SÉCURITÉ ABSOLUE: si DISABLE_REACH_SENDING n'est PAS défini, on empêche l'envoi
    // Nécessite une variable explicite pour activer l'envoi réel
    const disabled = process.env.DISABLE_REACH_SENDING !== 'false';
    const dryRun = process.env.REACH_DRY_RUN === 'true';
    const reallySend = process.env.REACH_REALLY_SEND === 'true';
    return disabled || dryRun || !reallySend;
  }

  /**
   * Barrière centrale de sécurité — vérifie TOUTES les conditions avant d'autoriser un envoi.
   * Retourne un objet { allowed: boolean, reason: string|null }.
   */
  async checkSendBarrier(campaign, prospect, step, now) {
    const prospectId = prospect.prospect_id;
    const userId = campaign.user_id;

    // 1) DRY-RUN global
    if (this.isDryRun()) {
      return { allowed: false, reason: 'DISABLE_REACH_SENDING ou REACH_DRY_RUN actif' };
    }

    // 2) Opt-out par email
    if (prospect.email) {
      const optOutEmail = await this.pool.query(
        'SELECT 1 FROM reach_opt_outs WHERE email = $1',
        [prospect.email]
      );
      if (optOutEmail.rows.length > 0) {
        return { allowed: false, reason: `Opt-out actif pour l'email ${prospect.email}` };
      }
    }

    // 3) Opt-out par prospect_id (vérification plus large)
    const optOutProspect = await this.pool.query(
      'SELECT 1 FROM reach_opt_outs WHERE prospect_id = $1',
      [prospectId]
    );
    if (optOutProspect.rows.length > 0) {
      return { allowed: false, reason: `Opt-out actif pour le prospect #${prospectId}` };
    }

    // 4) Opt-out via colonne prospect (si elle existe)
    try {
      const optOutCol = await this.pool.query(
        'SELECT opt_out FROM reach_prospects WHERE id = $1',
        [prospectId]
      );
      if (optOutCol.rows.length > 0 && optOutCol.rows[0].opt_out === true) {
        return { allowed: false, reason: `Prospect #${prospectId} marqué opt_out=true` };
      }
    } catch (e) {
      // Colonne opt_out peut ne pas exister — ignorer
    }

    // 5) Validation humaine requise
    try {
      const needsValidation = await this.pool.query(
        'SELECT human_validation_required FROM reach_prospects WHERE id = $1',
        [prospectId]
      );
      if (needsValidation.rows.length > 0 && needsValidation.rows[0].human_validation_required === true) {
        return { allowed: false, reason: `Prospect #${prospectId} nécessite validation humaine` };
      }
    } catch (e) {
      // Colonne peut ne pas exister
    }

    // 6) Limite quotidienne courtier (REACH_MAX_SENDS_PER_BROKER_PER_DAY)
    const maxBroker = parseInt(process.env.REACH_MAX_SENDS_PER_BROKER_PER_DAY) || 50;
    const brokerDay = await this.pool.query(
      `SELECT COUNT(*) as c FROM reach_send_log
       WHERE user_id = $1 AND sent_at > NOW() - INTERVAL '24 hours'`,
      [userId]
    );
    if (parseInt(brokerDay.rows[0].c) >= maxBroker) {
      return { allowed: false, reason: `Limite quotidienne courtier atteinte: ${brokerDay.rows[0].c}/${maxBroker}` };
    }

    // 7) Limite quotidienne prospect (REACH_MAX_SENDS_PER_CONTACT_PER_DAY)
    const maxContact = parseInt(process.env.REACH_MAX_SENDS_PER_CONTACT_PER_DAY) || 1;
    const contactDay = await this.pool.query(
      `SELECT COUNT(*) as c FROM reach_send_log
       WHERE prospect_id = $1 AND sent_at > NOW() - INTERVAL '24 hours'`,
      [prospectId]
    );
    if (parseInt(contactDay.rows[0].c) >= maxContact) {
      return { allowed: false, reason: `Limite quotidienne contact atteinte: ${contactDay.rows[0].c}/${maxContact}` };
    }

    // 8) Intervalle minimum entre contacts (REACH_MIN_HOURS_BETWEEN_CONTACTS)
    const minHours = parseInt(process.env.REACH_MIN_HOURS_BETWEEN_CONTACTS) || 48;
    if (prospect.last_contacted_at) {
      const hoursSinceLast = (now - new Date(prospect.last_contacted_at)) / (1000 * 60 * 60);
      if (hoursSinceLast < minHours) {
        return { allowed: false, reason: `Prospect déjà contacté il y a ${hoursSinceLast.toFixed(1)}h (min: ${minHours}h)` };
      }
    }

    // 9) Anti-doublon campagne : vérifier que ce prospect n'a pas déjà reçu ce step
    const duplicateCheck = await this.pool.query(
      `SELECT 1 FROM reach_messages
       WHERE prospect_id = $1 AND campaign_id = $2 AND metadata->>'step_order' = $3`,
      [prospectId, campaign.id, String(step.step_order)]
    );
    if (duplicateCheck.rows.length > 0) {
      return { allowed: false, reason: `Doublon détecté : step ${step.step_order} déjà envoyé à prospect #${prospectId} dans campagne #${campaign.id}` };
    }

    // 10) Vérifier canal autorisé (seulement email pour l'instant)
    const allowedChannels = ['email', 'sms', 'telegram'];
    if (!allowedChannels.includes(campaign.channel)) {
      return { allowed: false, reason: `Canal non autorisé: ${campaign.channel}` };
    }

    // 11) Vérifier email requis
    if (campaign.channel === 'email' && !prospect.email) {
      return { allowed: false, reason: 'Email requis pour le canal email mais absent' };
    }

    // 12) Rate limit : max 50 messages/heure/utilisateur
    const rateCheck = await this.pool.query(
      `SELECT COUNT(*) as c FROM reach_send_log
       WHERE user_id = $1 AND sent_at > NOW() - INTERVAL '1 hour'`,
      [userId]
    );
    if (parseInt(rateCheck.rows[0].c) >= 50) {
      return { allowed: false, reason: `Rate limit horaire atteint: ${rateCheck.rows[0].c}/50 messages/heure` };
    }

    return { allowed: true, reason: null };
  }

  /**
   * Enregistre un événement "would_send" dans les logs et l'activité.
   */
  async logWouldSend(campaign, prospect, step, reason, now) {
    const prospectId = prospect.prospect_id;
    const userId = campaign.user_id;
    const subject = this.personalize(step.subject_template || '', prospect);
    const body = this.personalize(step.body_template || '', prospect);

    logger.info({ campaign_id: campaign.id, step: step.step_order, prospect_id: prospectId, reason }, 'reach dry-run send blocked');

    // Insérer comme message dry_run pour traçabilité
    const result = await this.pool.query(
      `INSERT INTO reach_messages (prospect_id, campaign_id, direction, channel, subject, body, status, metadata)
       VALUES ($1, $2, 'outbound', $3, $4, $5, 'dry_run', $6) RETURNING id`,
      [prospectId, campaign.id, campaign.channel, subject, body, JSON.stringify({
        step_order: step.step_order,
        dry_run_at: now.toISOString(),
        dry_run: true,
        blocked_by: reason,
        would_send: true,
        note: `BLOQUÉ: ${reason}`
      })]
    );
    const dbId = result.rows[0].id;

    await this.pool.query(
      "UPDATE reach_campaign_prospects SET current_step = $1, status = 'dry_run' WHERE campaign_id = $2 AND prospect_id = $3",
      [step.step_order, campaign.id, prospectId]
    );

    await this.pool.query(
      'UPDATE reach_prospects SET last_contacted_at = NOW(), updated_at = NOW() WHERE id = $1',
      [prospectId]
    );

    await this.pool.query(
      'INSERT INTO reach_activity_log (prospect_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [prospectId, userId, 'blocked_send', JSON.stringify({
        campaign_id: campaign.id,
        step: step.step_order,
        channel: campaign.channel,
        reason: reason,
        would_send: true
      })]
    );

    logger.info({ event_id: dbId, campaign_id: campaign.id, prospect_id: prospectId }, 'reach dry-run event recorded');
  }

  async sendNextStep(campaign, prospect, steps, now) {
    const currentStepIdx = prospect.current_step || 0;
    const prospectId = prospect.prospect_id;

    if (currentStepIdx >= steps.length) {
      await this.pool.query(
        "UPDATE reach_campaign_prospects SET status = 'completed' WHERE campaign_id = $1 AND prospect_id = $2",
        [campaign.id, prospectId]
      );
      return;
    }

    const step = steps[currentStepIdx];

    // VÉRIFICATION CENTRALE : barrière de sécurité complète
    const barrier = await this.checkSendBarrier(campaign, prospect, step, now);
    if (!barrier.allowed) {
      if (barrier.reason.startsWith('DISABLE_REACH_SENDING') || barrier.reason.startsWith('REACH_DRY_RUN')) {
        // Mode dry-run : on log "would_send" avec le message complet
        await this.logWouldSend(campaign, prospect, step, barrier.reason, now);
      } else {
        // Autre blocage : on log et on passe au suivant
        logger.info({ prospect_id: prospectId, reason: barrier.reason }, 'reach send blocked');

        try {
          await this.pool.query(
            'INSERT INTO reach_activity_log (prospect_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
            [prospectId, campaign.user_id, 'blocked_send', JSON.stringify({
              campaign_id: campaign.id,
              step: step.step_order,
              reason: barrier.reason
            })]
          );
        } catch (e) {
          // Table peut ne pas exister
        }
      }
      return;
    }

    // TOUTES LES VÉRIFICATIONS PASSÉES — prêt à envoyer
    const subject = this.personalize(step.subject_template || '', prospect);
    const body = this.personalize(step.body_template || '', prospect);

    let delivery;
    if (campaign.channel === 'email') {
      delivery = await sendEmail({
        to: prospect.email,
        subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
      });
    } else if (campaign.channel === 'sms') {
      delivery = await sendSMS({
        to: prospect.phone,
        message: body,
      });
    } else {
      delivery = { success: false, error: 'channel_not_configured' };
    }

    if (!delivery?.success) {
      await this.logWouldSend(campaign, prospect, step, delivery?.error || 'configuration_required', now);
      return;
    }

    // ENVOI RÉEL — seulement si toutes les barrières sont levées
    const realResult = await this.pool.query(
      `INSERT INTO reach_messages (prospect_id, campaign_id, direction, channel, subject, body, status, metadata)
       VALUES ($1, $2, 'outbound', $3, $4, $5, 'sent', $6) RETURNING id`,
      [prospectId, campaign.id, campaign.channel, subject, body, JSON.stringify({
        step_order: step.step_order,
        sent_at: now.toISOString()
      })]
    );
    const realDbId = realResult.rows[0].id;

    // Logguer dans reach_send_log pour le rate limiting
    await this.pool.query(
      `INSERT INTO reach_send_log (campaign_id, prospect_id, user_id, channel, message_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [campaign.id, prospectId, campaign.user_id, campaign.channel, realDbId]
    );

    await this.pool.query(
      "UPDATE reach_campaign_prospects SET current_step = $1, status = 'sent' WHERE campaign_id = $2 AND prospect_id = $3",
      [currentStepIdx + 1, campaign.id, prospectId]
    );

    await this.pool.query(
      'UPDATE reach_prospects SET last_contacted_at = NOW(), updated_at = NOW() WHERE id = $1',
      [prospectId]
    );

    await this.pool.query(
      'INSERT INTO reach_activity_log (prospect_id, user_id, action, details) VALUES ($1, $2, $3, $4)',
      [prospectId, campaign.user_id, 'message_sent', JSON.stringify({
        campaign_id: campaign.id,
        step: step.step_order,
        channel: campaign.channel,
        message_id: realDbId
      })]
    );

    logger.info({ message_id: realDbId, campaign_id: campaign.id, step: step.step_order, prospect_id: prospectId }, 'reach message sent');
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
    logger.info({}, 'reach worker already active');
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
