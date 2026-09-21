const express = require('express')
const router = express.Router()
const multer = require('multer')
const pool = require('../db')
const verifyToken = require('../middleware/authMiddleware')
const importService = require('../services/importService')
const { trackEvent } = require('../services/analyticsService')
const { messagePublic } = require('../lib/erreursPubliques')
const porteeCabinet = require('../lib/porteeCabinet')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

function getSafeUserId(req) {
  return importService.safeUserId(req.user)
}

// ============================================================
// V2 alias — Import clients explicite demandé par le runbook GTM
// POST /api/import/clients/preview
// ============================================================
router.post('/clients/preview', verifyToken, upload.single('file'), async (req, res) => {
  try {
    const userId = getSafeUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'auth_required', message: 'Authentification requise.' })
    }
    if (!req.file) {
      return res.status(400).json({ error: 'validation_error', message: 'Fichier requis.' })
    }

    const filename = String(req.file.originalname || '').toLowerCase()
    if (!filename.match(/\.(csv|xlsx|xls)$/)) {
      return res.status(400).json({ error: 'validation_error', message: 'Format non supporté. Utilisez CSV, XLS ou XLSX.' })
    }

    const { headers, rows } = importService.parseWorkbookFromBuffer(req.file.buffer, req.file)
    const suggestedMapping = importService.suggestMapping(headers)
    const previewStats = importService.getPreviewStats({ headers, rows, mapping: suggestedMapping })

    const job = await importService.createImportJob({
      userId,
      filename: req.file.originalname || 'clients_import',
      headers,
      rows,
      mapping: suggestedMapping,
      summary: previewStats,
    })

    return res.json({
      success: true,
      import_job_id: job.id,
      status: job.status,
      headers,
      suggested_mapping: suggestedMapping,
      preview: previewStats.preview_rows,
      stats: {
        total_rows: previewStats.total_rows,
        valid_rows_estimate: previewStats.valid_rows_estimate,
        error_rows_estimate: previewStats.error_rows_estimate,
        unknown_columns: previewStats.unknown_columns,
      },
      message: 'Prévisualisation clients générée. Vérifiez le mapping puis confirmez l’import.',
    })
  } catch (error) {
    if (error.message === 'import_too_many_rows') {
      return res.status(413).json({
        error: 'import_too_many_rows',
        message: `Fichier trop volumineux. Limite actuelle: ${importService.MAX_ROWS} lignes.`,
      })
    }
    if (['import_empty_sheet', 'import_empty_file', 'import_missing_headers'].includes(error.message)) {
      return res.status(400).json({ error: messagePublic(error, { statut: 400 }), message: 'Le fichier importé est invalide ou incomplet.' })
    }
    return res.status(500).json({ error: 'import_preview_failed', message: 'Prévisualisation import indisponible pour le moment.' })
  }
})

// ============================================================
// V2 alias — Import clients confirm
// POST /api/import/clients/confirm
// ============================================================
router.post('/clients/confirm', verifyToken, async (req, res) => {
  try {
    const userId = getSafeUserId(req)
    if (!userId) {
      return res.status(401).json({ error: 'auth_required', message: 'Authentification requise.' })
    }

    const importJobId = Number(req.body?.import_job_id || 0)
    const mapping = req.body?.mapping || null
    if (!importJobId) {
      return res.status(400).json({ error: 'validation_error', message: 'import_job_id requis.' })
    }

    const result = await importService.commitImportJob({
      jobId: importJobId,
      userId,
      mapping,
    })

    await trackEvent({
      userId,
      event: 'import_completed',
      properties: {
        imported_clients: result.imported_clients,
        duplicate_rows: result.duplicate_rows,
        error_rows: result.error_rows,
      },
    }).catch(() => {})

    return res.json({
      success: true,
      import_job_id: importJobId,
      status: 'completed',
      summary: result,
      message: 'Import clients confirmé avec succès.',
    })
  } catch (error) {
    if (error.code === 'IMPORT_JOB_NOT_FOUND') {
      return res.status(404).json({ error: 'import_job_not_found', message: 'Import introuvable pour cet utilisateur.' })
    }
    return res.status(500).json({ error: 'import_confirm_failed', message: 'Confirmation import indisponible pour le moment.' })
  }
})

// POST /api/import/preview — analyse le fichier, retourne mapping suggéré
router.post('/preview', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'validation_error', message: 'Fichier requis' })
    
    const XLSX = require('xlsx')
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 })
    
    if (data.length < 2) return res.status(400).json({ error: 'validation_error', message: 'Fichier vide ou sans données' })
    
    const headers = data[0].map(h => String(h).trim())
    const rows = data.slice(1).filter(r => r.some(c => c !== undefined && c !== null && c !== ''))
    const preview = rows.slice(0, 5)
    
    // Mapping suggéré
    const mappingSuggestions = {
      'nom': { keywords: ['nom', 'name', 'lastname', 'last_name', 'nom_famille', 'prénom_nom'], champs: ['nom'] },
      'prenom': { keywords: ['prénom', 'prenom', 'firstname', 'first_name', 'prenoms'], champs: ['prenom'] },
      'email': { keywords: ['email', 'mail', 'e-mail', 'courriel', 'adresse_email'], champs: ['email'] },
      'telephone': { keywords: ['téléphone', 'telephone', 'phone', 'tel', 'portable', 'mobile', 'gsm', 'fixe'], champs: ['telephone'] },
      'adresse': { keywords: ['adresse', 'address', 'adresse_postale', 'rue', 'voie'], champs: ['adresse'] },
      'code_postal': { keywords: ['code postal', 'code_postal', 'postal', 'zip', 'cp'], champs: ['code_postal'] },
      'ville': { keywords: ['ville', 'city', 'town', 'commune', 'localité'], champs: ['ville'] },
      'date_naissance': { keywords: ['date naissance', 'date_naissance', 'birthdate', 'birth_date', 'ddn', 'né(e) le', 'nee_le'], champs: ['date_naissance'] },
      'type_contrat': { keywords: ['type contrat', 'type_contrat', 'contrat', 'contrat_type', 'produit', 'garantie'], champs: ['type_contrat'] }
    }

    const suggestedMapping = {}
    headers.forEach((header, idx) => {
      const h = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      for (const [field, config] of Object.entries(mappingSuggestions)) {
        if (config.keywords.some(k => h.includes(k))) {
          suggestedMapping[field] = header
          break
        }
      }
    })

    return res.json({
      success: true,
      data: {
        totalRows: rows.length,
        headers,
        preview,
        suggestedMapping,
        columns: headers.map((h, i) => ({ index: i, name: h, sample: rows[0]?.[i] || '' }))
      }
    })
  } catch (err) {
    console.error('[POST /api/import/preview]', err.message)
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

// POST /api/import/execute — exécute l'import après validation
router.post('/execute', verifyToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'validation_error', message: 'Fichier requis' })
    
    const { mapping } = req.body // { nom: 0, prenom: 1, email: 2, ... }
    if (!mapping) return res.status(400).json({ error: 'validation_error', message: 'Mapping requis' })
    
    const XLSX = require('xlsx')
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' })
    const sheetName = workbook.SheetNames[0]
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 })
    
    const headers = data[0]
    const rows = data.slice(1).filter(r => r.some(c => c !== undefined && c !== null && c !== ''))
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const userId = req.user.id || req.user.userId

    // Un rôle en LECTURE SEULE (assistant/viewer) ou un accès révoqué n'importe rien.
    if (porteeCabinet.refuserEcriture(portee, res, 'importer des clients')) return

    // PORTÉE = CABINET : le doublon est cherché dans tout le portefeuille du
    // cabinet (un client déjà saisi par un collègue ne doit pas être recréé), et
    // la ligne créée est estampillée du cabinet (`clients.cabinet_id`, migration
    // 113) pour que tout le cabinet la voie. `courtier_id` reste le CRÉATEUR.
    const f = porteeCabinet.fragment(portee, {
      cabinet: 'c.cabinet_id',
      proprietaire: 'c.courtier_id',
      depart: 1,
      ecriture: true,
    })
    const cabinetId = porteeCabinet.cabinetPourCreation(portee)

    // Défaut réel constaté en production le 21/09/2026 : un import avait créé
    // `clients.cabinet_id = NULL` — une ligne hors cloisonnement. Cause : quand la
    // lecture des appartenances échoue (base momentanément illisible), la portée
    // se dégrade silencieusement en « mono » AVEC droit d'écriture, et la ligne
    // part sans cabinet.
    //
    // On distingue les deux cas, volontairement :
    //   * compte SANS aucune appartenance = comportement historique assumé (portée
    //     mono-utilisateur, testé) → l'import reste autorisé ;
    //   * portée DÉGRADÉE (appartenances illisibles, pool indisponible) → on échoue
    //     fermé : aucun client n'est créé, l'utilisateur relance.
    const porteeDegradee = Boolean(
      !cabinetId && portee && portee.mode === 'mono' &&
      typeof portee.motif === 'string' && !portee.motif.startsWith('aucune appartenance')
    )
    if (porteeDegradee) {
      console.warn('[POST /api/import/execute] import refusé : portée dégradée', portee.motif)
      return res.status(409).json({
        error: 'portee_indeterminee',
        message: "Import refusé : le cabinet du compte n'a pas pu être vérifié " +
          "(lecture des appartenances impossible à cet instant). Aucun client n'a été créé. " +
          "Réessayez dans un instant ; si le problème persiste, vérifiez l'appartenance du compte à un cabinet.",
      })
    }

    let imported = 0, errors = 0, duplicates = 0
    
    for (const row of rows) {
      try {
        const nom = mapping.nom !== undefined ? String(row[mapping.nom] || '').trim() : ''
        const prenom = mapping.prenom !== undefined ? String(row[mapping.prenom] || '').trim() : ''
        const email = mapping.email !== undefined ? String(row[mapping.email] || '').trim() : ''
        const telephone = mapping.telephone !== undefined ? String(row[mapping.telephone] || '').trim() : ''
        
        if (!nom && !prenom && !email && !telephone) { errors++; continue }
        
        // Vérifier doublon — dans le CABINET
        const existing = await pool.query(
          `SELECT c.id FROM clients c
            WHERE ${f.sql} AND (c.email = $${f.suivant} OR c.phone = $${f.suivant + 1})
              AND c.email IS NOT NULL AND c.phone IS NOT NULL`,
          [...f.params, email, telephone]
        )
        if (existing.rows.length > 0) { duplicates++; continue }

        await pool.query(
          `INSERT INTO clients (courtier_id, nom, prenom, email, phone, adresse, code_postal, ville, date_naissance, segment, cabinet_id, created_at, updated_at, documents)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), '[]'::jsonb)`,
          [
            userId,
            nom || null,
            prenom || null,
            email || null,
            telephone || null,
            mapping.adresse !== undefined ? String(row[mapping.adresse] || '') : null,
            mapping.code_postal !== undefined ? String(row[mapping.code_postal] || '') : null,
            mapping.ville !== undefined ? String(row[mapping.ville] || '') : null,
            mapping.date_naissance !== undefined ? row[mapping.date_naissance] || null : null,
            'import',
            cabinetId
          ]
        )
        imported++
      } catch (e) {
        errors++
        console.error('[Import] Row error:', e.message)
      }
    }
    
    return res.json({
      success: true,
      data: { imported, duplicates, errors, total: rows.length }
    })
  } catch (err) {
    console.error('[POST /api/import/execute]', err.message)
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

// POST /api/import/clean — dédoublonnage + normalisation
router.post('/clean', verifyToken, async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'nettoyer le portefeuille')) return

    // PORTÉE = CABINET pour le périmètre SCANNÉ (`c1`). La comparaison reste
    // faite à propriétaire égal (`c2.courtier_id = c1.courtier_id`) : élargir la
    // comparaison au cabinet entier ferait remonter comme « doublon » deux
    // homonymes de deux commerciaux différents — on ne change ici que ce qui est
    // en défaut (le collaborateur ne voyait AUCUN doublon de son cabinet).
    const fDupes = porteeCabinet.fragment(portee, {
      cabinet: 'c1.cabinet_id',
      proprietaire: 'c1.courtier_id',
      depart: 1,
      ecriture: true,
    })
    // Deuxième fragment, sur l'alias RÉEL de la mise à jour (`c`) : un fragment
    // construit pour `c1` ne s'applique pas à un `UPDATE clients c`.
    const fMaj = porteeCabinet.fragment(portee, {
      cabinet: 'c.cabinet_id',
      proprietaire: 'c.courtier_id',
      depart: 1,
      ecriture: true,
    })

    // Trouver les doublons (même nom + téléphone)
    const dupes = await pool.query(`
      SELECT c1.id, c1.nom, c1.prenom, c1.phone, c1.email
      FROM clients c1
      JOIN clients c2 ON c1.courtier_id = c2.courtier_id
        AND c1.id != c2.id
        AND LOWER(COALESCE(c1.nom,'')) = LOWER(COALESCE(c2.nom,''))
        AND c1.phone = c2.phone
        AND c1.phone IS NOT NULL
      WHERE ${fDupes.sql}
      ORDER BY c1.nom
    `, [...fDupes.params])

    // Normaliser téléphones (mêmes lignes que la portée d'écriture ci-dessus)
    const normalized = await pool.query(`
      UPDATE clients c
      SET phone = REGEXP_REPLACE(COALESCE(c.phone, ''), '[^0-9+]', '', 'g'),
          updated_at = NOW()
      WHERE ${fMaj.sql}
        AND c.phone IS NOT NULL
        AND c.phone ~ '[^0-9+]'
      RETURNING c.id, c.phone
    `, [...fMaj.params])
    
    return res.json({
      success: true,
      data: {
        duplicatesFound: dupes.rows.length,
        duplicates: dupes.rows,
        phonesNormalized: normalized.rowCount
      }
    })
  } catch (err) {
    console.error('[POST /api/import/clean]', err.message)
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

module.exports = router
