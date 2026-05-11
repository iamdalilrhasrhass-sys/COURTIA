/**
 * Voice Intake Processor — Orchestrateur principal
 * LOT 9: Voice Intake
 * 
 * Coordonne transcription + extraction + suggestions
 * @module voice/intakeProcessor
 */

const pool = require('../../db')
const logger = require('../../lib/logger')
const transcriber = require('./transcriber')
const extractor = require('./extractor')

/**
 * Traite un intake vocal complet (transcription + extraction)
 * @param {Object} params
 * @param {number} params.brokerId - ID du courtier
 * @param {string} params.audioPath - Chemin relatif du fichier audio (storage/voice/...)
 * @param {number} [params.audioSize] - Taille en bytes
 * @param {Object} [params.options]
 * @param {string} [params.options.language='fr'] - Langue de transcription
 * @returns {Promise<Object>} Intake complet avec suggestions
 */
async function processIntake({ brokerId, audioPath, audioSize = 0, options = {} }) {
  const t0 = Date.now()
  const { language = 'fr' } = options
  let intakeId = null

  try {
    // 1. Créer l'entrée en BDD (status=processing)
    const insertResult = await pool.query(
      `INSERT INTO voice_intakes 
        (broker_id, audio_storage_path, audio_size_bytes, status, metadata, created_at)
       VALUES ($1, $2, $3, 'processing', $4, NOW())
       RETURNING id`,
      [brokerId, audioPath, audioSize, JSON.stringify({ language })]
    )
    intakeId = insertResult.rows[0].id

    logger.info({ intakeId, brokerId, audioPath }, 'Intake vocal créé - traitement démarré')

    // 2. Transcription Whisper
    const absoluteAudioPath = transcriber.getAudioAbsolutePath(audioPath)
    
    let transcriptionResult
    try {
      transcriptionResult = await transcriber.transcribe(absoluteAudioPath, {
        language,
        filePath: audioPath,
        fileSize: audioSize
      })
    } catch (transcErr) {
      // Erreur transcription (API indisponible, etc.)
      await pool.query(
        `UPDATE voice_intakes 
         SET status = 'error', 
             metadata = metadata || $1,
             processed_at = NOW()
         WHERE id = $2`,
        [JSON.stringify({ error: transcErr.message, stage: 'transcription' }), intakeId]
      )
      throw transcErr
    }

    // 3. Mettre à jour avec transcription
    await pool.query(
      `UPDATE voice_intakes 
       SET transcript = $1, 
           transcript_language = $2, 
           transcription_engine = $3,
           transcription_cost_usd = $4,
           audio_duration_seconds = $5
       WHERE id = $6`,
      [
        transcriptionResult.text,
        transcriptionResult.language,
        transcriptionResult.engine,
        transcriptionResult.cost_usd,
        transcriptionResult.duration_s,
        intakeId
      ]
    )

    // 4. Extraction IA des données
    let extractionResult
    try {
      extractionResult = await extractor.extractFromTranscript(transcriptionResult.text, {
        userId: brokerId
      })
    } catch (extractErr) {
      // Erreur extraction - on garde quand même la transcription
      await pool.query(
        `UPDATE voice_intakes 
         SET status = 'error', 
             metadata = metadata || $1,
             processed_at = NOW(),
             total_latency_ms = $2
         WHERE id = $3`,
        [
          JSON.stringify({ error: extractErr.message, stage: 'extraction' }),
          Date.now() - t0,
          intakeId
        ]
      )
      throw extractErr
    }

    // 5. Construire les suggestions
    const suggestedClient = extractor.buildSuggestedClient(extractionResult.data)
    const suggestedNeeds = extractor.buildSuggestedNeeds(extractionResult.data)
    const suggestedDocuments = extractor.buildSuggestedDocuments(extractionResult.data)
    const suggestedNextAction = extractor.buildSuggestedNextAction(extractionResult.data)

    // 6. Mettre à jour en BDD avec tout
    const totalLatencyMs = Date.now() - t0
    const totalCost = (transcriptionResult.cost_usd || 0) + (extractionResult.costUsd || 0)

    await pool.query(
      `UPDATE voice_intakes 
       SET status = 'ready',
           extracted_data = $1,
           suggested_client = $2,
           suggested_needs = $3,
           suggested_documents = $4,
           suggested_next_action = $5,
           ai_cost_usd = $6,
           total_latency_ms = $7,
           processed_at = NOW()
       WHERE id = $8`,
      [
        JSON.stringify(extractionResult.data),
        JSON.stringify(suggestedClient),
        JSON.stringify(suggestedNeeds),
        JSON.stringify(suggestedDocuments),
        JSON.stringify(suggestedNextAction),
        extractionResult.costUsd,
        totalLatencyMs,
        intakeId
      ]
    )

    logger.info({
      intakeId,
      brokerId,
      latencyMs: totalLatencyMs,
      transcriptionCost: transcriptionResult.cost_usd,
      extractionCost: extractionResult.costUsd,
      totalCost,
      confidence: extractionResult.data.confidence_globale
    }, 'Intake vocal traité avec succès')

    // 7. Retourner le résultat complet
    return {
      id: intakeId,
      broker_id: brokerId,
      status: 'ready',
      audio: {
        path: audioPath,
        size_bytes: audioSize,
        duration_seconds: transcriptionResult.duration_s
      },
      transcript: transcriptionResult.text,
      transcript_language: transcriptionResult.language,
      extracted_data: extractionResult.data,
      suggested_client: suggestedClient,
      suggested_needs: suggestedNeeds,
      suggested_documents: suggestedDocuments,
      suggested_next_action: suggestedNextAction,
      costs: {
        transcription_usd: transcriptionResult.cost_usd,
        extraction_usd: extractionResult.costUsd,
        total_usd: totalCost
      },
      latency_ms: totalLatencyMs
    }

  } catch (err) {
    logger.error({ intakeId, brokerId, error: err.message }, 'Erreur traitement intake vocal')
    throw err
  }
}

/**
 * Applique un intake : crée/met à jour le client et les actions
 * @param {Object} params
 * @param {number} params.intakeId - ID de l'intake
 * @param {number} params.brokerId - ID du courtier
 * @param {Object} [params.options]
 * @param {boolean} [params.options.createClient=true] - Créer le client
 * @param {boolean} [params.options.createNeeds=true] - Créer les relances/opportunités
 * @param {number} [params.options.existingClientId] - ID client existant à mettre à jour
 * @returns {Promise<{ clientId: number|null, actionsAppliquees: string[] }>}
 */
async function applyIntake({ intakeId, brokerId, options = {} }) {
  const { 
    createClient = true, 
    createNeeds = true,
    existingClientId = null 
  } = options

  // Récupérer l'intake
  const intakeRes = await pool.query(
    `SELECT * FROM voice_intakes WHERE id = $1 AND broker_id = $2`,
    [intakeId, brokerId]
  )

  if (intakeRes.rows.length === 0) {
    throw new Error('Intake non trouvé ou non autorisé')
  }

  const intake = intakeRes.rows[0]

  if (intake.status !== 'ready') {
    throw new Error(`Intake non prêt (status: ${intake.status})`)
  }

  const actionsAppliquees = []
  let clientId = existingClientId || intake.client_id

  // 1. Créer ou mettre à jour le client
  if (createClient && intake.suggested_client) {
    const sc = intake.suggested_client

    if (clientId) {
      // Mise à jour client existant
      await pool.query(
        `UPDATE clients SET
           prenom = COALESCE(NULLIF($1, ''), prenom),
           nom = COALESCE(NULLIF($2, ''), nom),
           email = COALESCE(NULLIF($3, ''), email),
           telephone = COALESCE(NULLIF($4, ''), telephone),
           date_naissance = COALESCE($5::date, date_naissance),
           adresse = COALESCE(NULLIF($6, ''), adresse),
           profession = COALESCE(NULLIF($7, ''), profession),
           notes = CONCAT(COALESCE(notes, ''), E'\\n\\n[Voice Intake] ', $8),
           updated_at = NOW()
         WHERE id = $9 AND user_id = $10`,
        [
          sc.prenom, sc.nom, sc.email, sc.telephone,
          sc.date_naissance, sc.adresse, sc.profession,
          sc.notes || '',
          clientId, brokerId
        ]
      )
      actionsAppliquees.push(`client_updated:${clientId}`)
    } else if (sc.nom || sc.prenom || sc.telephone) {
      // Création nouveau client
      const insertRes = await pool.query(
        `INSERT INTO clients 
           (user_id, prenom, nom, email, telephone, date_naissance, adresse, profession, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8, $9, NOW())
         RETURNING id`,
        [
          brokerId,
          sc.prenom || '',
          sc.nom || '',
          sc.email || '',
          sc.telephone || '',
          sc.date_naissance,
          sc.adresse || '',
          sc.profession || '',
          `[Voice Intake] ${sc.notes || ''}`
        ]
      )
      clientId = insertRes.rows[0].id
      actionsAppliquees.push(`client_created:${clientId}`)
    }
  }

  // 2. Créer les opportunités/relances basées sur les besoins
  if (createNeeds && intake.suggested_needs && clientId) {
    const needs = Array.isArray(intake.suggested_needs) ? intake.suggested_needs : []
    
    for (const need of needs) {
      // Créer une opportunité
      try {
        await pool.query(
          `INSERT INTO opportunites 
             (user_id, client_id, type_assurance, description, statut, priorite, source, created_at)
           VALUES ($1, $2, $3, $4, 'nouveau', $5, 'voice_intake', NOW())
           ON CONFLICT DO NOTHING`,
          [
            brokerId,
            clientId,
            need.type_assurance || 'autre',
            need.detail || '',
            need.urgence === 'haute' ? 'haute' : (need.urgence === 'basse' ? 'basse' : 'normale')
          ]
        )
        actionsAppliquees.push(`opportunite_created:${need.type_assurance}`)
      } catch (e) {
        logger.warn({ error: e.message }, 'Erreur création opportunité depuis intake')
      }
    }
  }

  // 3. Créer une tâche pour la prochaine action
  if (intake.suggested_next_action && clientId) {
    const action = intake.suggested_next_action
    const typeMapping = {
      'rappel': 'call',
      'envoi_devis': 'email',
      'rdv': 'meeting',
      'envoi_documents': 'email'
    }
    
    try {
      await pool.query(
        `INSERT INTO taches 
           (user_id, client_id, type, titre, description, echeance, statut, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'a_faire', NOW())`,
        [
          brokerId,
          clientId,
          typeMapping[action.type] || 'call',
          `[Voice Intake] ${action.type === 'rappel' ? 'Rappeler' : action.type === 'envoi_devis' ? 'Envoyer devis' : action.type === 'rdv' ? 'Planifier RDV' : 'Envoyer documents'}`,
          action.detail || '',
          action.deadline_iso || null
        ]
      )
      actionsAppliquees.push(`tache_created:${action.type}`)
    } catch (e) {
      logger.warn({ error: e.message }, 'Erreur création tâche depuis intake')
    }
  }

  // 4. Mettre à jour l'intake avec le client lié et le statut
  await pool.query(
    `UPDATE voice_intakes 
     SET client_id = $1, 
         status = 'applied', 
         applied_at = NOW(),
         metadata = metadata || $2
     WHERE id = $3`,
    [clientId, JSON.stringify({ actions: actionsAppliquees }), intakeId]
  )

  logger.info({
    intakeId,
    clientId,
    actionsCount: actionsAppliquees.length,
    actions: actionsAppliquees
  }, 'Intake vocal appliqué')

  return {
    clientId,
    actionsAppliquees
  }
}

/**
 * Relance le traitement d'extraction sur un intake existant
 * @param {number} intakeId
 * @param {number} brokerId
 * @returns {Promise<Object>}
 */
async function reprocessIntake(intakeId, brokerId) {
  // Récupérer l'intake avec sa transcription
  const intakeRes = await pool.query(
    `SELECT * FROM voice_intakes WHERE id = $1 AND broker_id = $2`,
    [intakeId, brokerId]
  )

  if (intakeRes.rows.length === 0) {
    throw new Error('Intake non trouvé ou non autorisé')
  }

  const intake = intakeRes.rows[0]

  if (!intake.transcript) {
    throw new Error('Pas de transcription disponible pour retraitement')
  }

  // Mettre en processing
  await pool.query(
    `UPDATE voice_intakes SET status = 'processing' WHERE id = $1`,
    [intakeId]
  )

  const t0 = Date.now()

  try {
    // Re-extraire
    const extractionResult = await extractor.extractFromTranscript(intake.transcript, {
      userId: brokerId
    })

    // Reconstruire les suggestions
    const suggestedClient = extractor.buildSuggestedClient(extractionResult.data)
    const suggestedNeeds = extractor.buildSuggestedNeeds(extractionResult.data)
    const suggestedDocuments = extractor.buildSuggestedDocuments(extractionResult.data)
    const suggestedNextAction = extractor.buildSuggestedNextAction(extractionResult.data)

    // Mettre à jour
    await pool.query(
      `UPDATE voice_intakes 
       SET status = 'ready',
           extracted_data = $1,
           suggested_client = $2,
           suggested_needs = $3,
           suggested_documents = $4,
           suggested_next_action = $5,
           ai_cost_usd = COALESCE(ai_cost_usd, 0) + $6,
           processed_at = NOW()
       WHERE id = $7`,
      [
        JSON.stringify(extractionResult.data),
        JSON.stringify(suggestedClient),
        JSON.stringify(suggestedNeeds),
        JSON.stringify(suggestedDocuments),
        JSON.stringify(suggestedNextAction),
        extractionResult.costUsd,
        intakeId
      ]
    )

    return {
      id: intakeId,
      status: 'ready',
      extracted_data: extractionResult.data,
      suggested_client: suggestedClient,
      suggested_needs: suggestedNeeds,
      latency_ms: Date.now() - t0
    }

  } catch (err) {
    await pool.query(
      `UPDATE voice_intakes 
       SET status = 'error', 
           metadata = metadata || $1
       WHERE id = $2`,
      [JSON.stringify({ reprocess_error: err.message }), intakeId]
    )
    throw err
  }
}

/**
 * Obtient les statistiques voice intake d'un courtier
 * @param {number} brokerId
 * @returns {Promise<Object>}
 */
async function getStats(brokerId) {
  const result = await pool.query(
    `SELECT 
       COUNT(*) as total_intakes,
       COUNT(*) FILTER (WHERE status = 'ready') as ready_count,
       COUNT(*) FILTER (WHERE status = 'applied') as applied_count,
       COUNT(*) FILTER (WHERE status = 'error') as error_count,
       SUM(audio_duration_seconds) as total_duration_seconds,
       SUM(COALESCE(transcription_cost_usd, 0) + COALESCE(ai_cost_usd, 0)) as total_cost_usd,
       AVG(total_latency_ms) as avg_latency_ms
     FROM voice_intakes
     WHERE broker_id = $1`,
    [brokerId]
  )

  const row = result.rows[0]
  return {
    total_intakes: parseInt(row.total_intakes) || 0,
    ready_count: parseInt(row.ready_count) || 0,
    applied_count: parseInt(row.applied_count) || 0,
    error_count: parseInt(row.error_count) || 0,
    total_duration_seconds: parseInt(row.total_duration_seconds) || 0,
    total_duration_formatted: formatDuration(parseInt(row.total_duration_seconds) || 0),
    total_cost_usd: parseFloat(row.total_cost_usd) || 0,
    avg_latency_ms: parseInt(row.avg_latency_ms) || 0
  }
}

/**
 * Formate une durée en secondes en chaîne lisible
 * @param {number} seconds
 * @returns {string}
 */
function formatDuration(seconds) {
  if (seconds < 60) return `${seconds}s`
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hours = Math.floor(mins / 60)
  const remainMins = mins % 60
  return `${hours}h ${remainMins}m`
}

module.exports = {
  processIntake,
  applyIntake,
  reprocessIntake,
  getStats,
  formatDuration
}
