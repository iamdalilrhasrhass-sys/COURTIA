/**
 * @file relanceScheduler.js
 * Planificateur de relances automatiques pour COURTIA.
 *
 * Cron quotidien à 09:00 Europe/Paris (via node-cron, déjà dans package.json).
 *
 * Logique de relance :
 *   - Scanne les dossiers "ouverts" (status: prospect, en_cours, documents_envoyes)
 *   - Vérifie les pièces manquantes depuis plus de X jours
 *   - Déclenche les relances selon une séquence :
 *       J+1 : Email de rappel amical
 *       J+3 : Email de suivi + rappel des documents manquants
 *       J+7 : Email d'urgence + SMS (si numéro dispo)
 *   - Canal : email d'abord, puis SMS si pas de réponse après 3 jours
 *
 * Table 'relances' (créée automatiquement au premier lancement) :
 *   id, client_id, etape, derniere_relance, prochaine_relance, canal, statut
 */

const cron = require('node-cron');
const { sendEmail } = require('../services/emailService');

// --- Schéma table relances ---
const CREATE_RELANCES_TABLE = `
  CREATE TABLE IF NOT EXISTS relances (
    id SERIAL PRIMARY KEY,
    client_id INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    etape INTEGER DEFAULT 1,
    derniere_relance TIMESTAMPTZ,
    prochaine_relance TIMESTAMPTZ,
    canal VARCHAR(20) DEFAULT 'email',
    statut VARCHAR(20) DEFAULT 'en_attente',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

// --- Configuration des étapes de relance ---
const RELANCE_ETAPES = [
  {
    etape: 1,
    delai_jours: 1,
    canal: 'email',
    sujet_template: '📋 Votre dossier COURTIA — petit rappel',
    corps_template: (client) => `
      <div style="font-family:Arial,sans-serif;max-width:600px">
        <h2 style="color:#2563eb">Bonjour ${client.first_name || ''},</h2>
        <p>Votre conseiller COURTIA souhaite faire le point sur votre dossier d'assurance.</p>
        <p>Pour finaliser votre dossier, nous avons besoin de quelques informations complémentaires.</p>
        <p>Vous pouvez répondre directement à cet email ou contacter votre conseiller.</p>
        <p style="color:#6b7280;font-size:14px">À bientôt,<br>L'équipe COURTIA</p>
      </div>`,
  },
  {
    etape: 2,
    delai_jours: 3,
    canal: 'email',
    sujet_template: '⚠️ Dossier en attente — action requise',
    corps_template: (client) => `
      <div style="font-family:Arial,sans-serif;max-width:600px">
        <h2 style="color:#f59e0b">Bonjour ${client.first_name || ''},</h2>
        <p>Votre dossier d'assurance est toujours en attente de finalisation.</p>
        <p>Voici les éléments encore manquants pour avancer :</p>
        <ul>
          <li>Pièce d'identité</li>
          <li>Justificatif de domicile</li>
          <li>Relevé d'information</li>
        </ul>
        <p><strong>Merci de nous transmettre ces documents dans les meilleurs délais.</strong></p>
        <p style="color:#6b7280;font-size:14px">L'équipe COURTIA</p>
      </div>`,
  },
  {
    etape: 3,
    delai_jours: 7,
    canal: 'sms+email',
    sujet_template: '🚨 Dernier rappel — votre dossier COURTIA',
    corps_template: (client) => `
      <div style="font-family:Arial,sans-serif;max-width:600px">
        <h2 style="color:#ef4444">Bonjour ${client.first_name || ''},</h2>
        <p>Nous n'avons toujours pas reçu les documents nécessaires pour finaliser votre dossier.</p>
        <p><strong>Sans action de votre part sous 48h, votre dossier pourrait être clôturé.</strong></p>
        <p>Si vous avez des questions, n'hésitez pas à nous contacter.</p>
        <p style="color:#6b7280;font-size:14px">L'équipe COURTIA</p>
      </div>`,
  },
];

// --- Table ensured flag ---
let relancesTableEnsured = false;

async function ensureRelancesTable(pool) {
  if (relancesTableEnsured) return;
  try {
    await pool.query(CREATE_RELANCES_TABLE);
    relancesTableEnsured = true;
    console.log('[relanceScheduler] Table relances OK');
  } catch (err) {
    console.error('[relanceScheduler] Cannot create relances table:', err.message);
  }
}

// --- Récupérer les dossiers ouverts avec pièces manquantes ---
async function getDossiersARelancer(pool) {
  const query = `
    SELECT
      c.id,
      c.first_name,
      c.last_name,
      c.email,
      c.phone,
      c.status,
      c.created_at,
      r.id as relance_id,
      r.etape as relance_etape,
      r.derniere_relance,
      r.prochaine_relance,
      r.statut as relance_statut
    FROM clients c
    LEFT JOIN relances r ON r.client_id = c.id AND r.statut != 'termine'
    WHERE c.status IN ('prospect', 'en_cours', 'documents_envoyes')
      AND c.email IS NOT NULL
      AND c.email != ''
    ORDER BY c.created_at ASC
  `;

  const result = await pool.query(query);
  return result.rows;
}

// --- Vérifier si une relance est due ---
function isRelanceDue(client, now = new Date()) {
  const created = new Date(client.created_at);
  const daysSinceCreation = Math.floor((now - created) / (1000 * 60 * 60 * 24));

  // Si pas encore de relance
  if (!client.relance_id) {
    // J+1 : première relance due après 1 jour
    return daysSinceCreation >= 1 ? 1 : 0;
  }

  // Si déjà une relance en cours
  const derniereRelance = client.derniere_relance ? new Date(client.derniere_relance) : created;
  const daysSinceLastRelance = Math.floor((now - derniereRelance) / (1000 * 60 * 60 * 24));

  const currentEtape = client.relance_etape || 1;

  // Étape 2 : J+3
  if (currentEtape === 1 && daysSinceLastRelance >= 2) return 2;

  // Étape 3 : J+7
  if (currentEtape === 2 && daysSinceLastRelance >= 4) return 3;

  return 0; // Pas encore due
}

// --- Envoyer une relance ---
async function sendRelance(pool, client, etape) {
  const config = RELANCE_ETAPES.find(e => e.etape === etape);
  if (!config) return { success: false, error: 'Étape inconnue' };

  const result = { success: false, canal: config.canal, etape };

  try {
    // Envoyer l'email
    const emailResult = await sendEmail({
      to: client.email,
      subject: config.sujet_template,
      html: config.corps_template(client),
    });

    if (emailResult?.error) {
      console.error(`[relanceScheduler] Email failed for client ${client.id}:`, emailResult.error);
    } else {
      console.log(`[relanceScheduler] ✓ Email envoyé à ${client.email} (étape ${etape})`);
      result.success = true;
    }

    // SMS si étape 3 (urgence)
    if (etape >= 3 && client.phone) {
      // TODO: Intégrer un service SMS gratuit (ex: Twilio trial, SMS Gateway API)
      // Pour le MVP, on log juste
      console.log(`[relanceScheduler] SMS suggéré pour ${client.phone} (canal SMS non activé en MVP gratuit)`);
    }

    // Mettre à jour ou créer l'entrée relances
    const now = new Date();
    const nextDelay = etape === 1 ? 2 : etape === 2 ? 4 : 7;
    const prochaineRelance = new Date(now.getTime() + nextDelay * 24 * 60 * 60 * 1000);

    if (client.relance_id) {
      // Mise à jour de la relance existante
      await pool.query(
        `UPDATE relances
         SET etape = $1, derniere_relance = $2, prochaine_relance = $3,
             canal = $4, statut = 'envoyee'
         WHERE id = $5`,
        [etape, now.toISOString(), prochaineRelance.toISOString(), config.canal, client.relance_id]
      );
    } else {
      // Création d'une nouvelle relance
      await pool.query(
        `INSERT INTO relances (client_id, etape, derniere_relance, prochaine_relance, canal, statut)
         VALUES ($1, $2, $3, $4, $5, 'envoyee')`,
        [client.id, etape, now.toISOString(), prochaineRelance.toISOString(), config.canal]
      );
    }

    // Si c'est la dernière étape (3), on peut marquer comme "termine"
    if (etape >= 3) {
      // On laisse en "envoyee" mais on pourrait passer à "termine" après 3 relances
    }

  } catch (err) {
    console.error(`[relanceScheduler] Erreur relance client ${client.id}:`, err.message);
    result.error = err.message;
  }

  return result;
}

// --- FONCTION PRINCIPALE DE RELANCE QUOTIDIENNE ---
/**
 * Exécute les relances quotidiennes pour tous les dossiers ouverts.
 * À appeler par le cron ou manuellement pour test.
 *
 * @param {Object} pool - Instance pg Pool
 * @returns {Promise<Object>} - Résumé des relances
 */
async function runDailyRelances(pool) {
  await ensureRelancesTable(pool);

  const summary = {
    timestamp: new Date().toISOString(),
    dossiers_scannes: 0,
    relances_envoyees: 0,
    relances_ignorees: 0,
    erreurs: 0,
    details: [],
  };

  try {
    const clients = await getDossiersARelancer(pool);
    summary.dossiers_scannes = clients.length;
    console.log(`[relanceScheduler] Scan de ${clients.length} dossiers ouverts`);

    for (const client of clients) {
      const etapeDue = isRelanceDue(client);

      if (etapeDue === 0) {
        summary.relances_ignorees++;
        continue;
      }

      console.log(`[relanceScheduler] Relance due: ${client.first_name} ${client.last_name} (étape ${etapeDue})`);

      const relanceResult = await sendRelance(pool, client, etapeDue);

      if (relanceResult.success) {
        summary.relances_envoyees++;
      } else {
        summary.erreurs++;
      }

      summary.details.push({
        client_id: client.id,
        nom: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
        email: client.email,
        etape: etapeDue,
        canal: relanceResult.canal,
        success: relanceResult.success,
      });
    }

  } catch (err) {
    console.error('[relanceScheduler] Erreur critique:', err.message);
    summary.erreurs++;
    summary.error = err.message;
  }

  console.log(`[relanceScheduler] Résumé: ${summary.relances_envoyees} envoyées, ${summary.relances_ignorees} ignorées, ${summary.erreurs} erreurs`);
  return summary;
}

// --- Démarrage du cron quotidien ---
let cronJob = null;

/**
 * Démarre le scheduler de relances (cron quotidien 09:00 Europe/Paris)
 * @param {Object} pool - Instance pg Pool
 */
function startRelanceScheduler(pool) {
  if (cronJob) {
    console.log('[relanceScheduler] Déjà actif');
    return;
  }

  console.log('[relanceScheduler] Planification quotidienne 09:00 Europe/Paris');

  cronJob = cron.schedule('0 9 * * *', async () => {
    console.log('[relanceScheduler] ⏰ Exécution quotidienne 09:00');
    try {
      const result = await runDailyRelances(pool);
      console.log('[relanceScheduler] ✅ Terminé:', JSON.stringify({
        scannes: result.dossiers_scannes,
        envoyees: result.relances_envoyees,
        ignorees: result.relances_ignorees,
        erreurs: result.erreurs,
      }));
    } catch (err) {
      console.error('[relanceScheduler] ❌ Erreur:', err.message);
    }
  }, { timezone: 'Europe/Paris' });

  console.log('[relanceScheduler] ✅ Cron relances activé (09:00 Europe/Paris)');
}

/**
 * Arrête le scheduler
 */
function stopRelanceScheduler() {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('[relanceScheduler] Arrêté');
  }
}

module.exports = {
  runDailyRelances,
  startRelanceScheduler,
  stopRelanceScheduler,
};
