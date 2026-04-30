const express = require('express')
const router = express.Router()
const multer = require('multer')
const pool = require('../db')
const verifyToken = require('../middleware/authMiddleware')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

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
    return res.status(500).json({ error: 'server_error', message: err.message })
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
    const userId = req.user.id
    
    let imported = 0, errors = 0, duplicates = 0
    
    for (const row of rows) {
      try {
        const nom = mapping.nom !== undefined ? String(row[mapping.nom] || '').trim() : ''
        const prenom = mapping.prenom !== undefined ? String(row[mapping.prenom] || '').trim() : ''
        const email = mapping.email !== undefined ? String(row[mapping.email] || '').trim() : ''
        const telephone = mapping.telephone !== undefined ? String(row[mapping.telephone] || '').trim() : ''
        
        if (!nom && !prenom && !email && !telephone) { errors++; continue }
        
        // Vérifier doublon
        const existing = await pool.query(
          'SELECT id FROM clients WHERE courtier_id = $1 AND (email = $2 OR phone = $3) AND email IS NOT NULL AND phone IS NOT NULL',
          [userId, email, telephone]
        )
        if (existing.rows.length > 0) { duplicates++; continue }
        
        await pool.query(
          `INSERT INTO clients (courtier_id, nom, prenom, email, phone, adresse, code_postal, ville, date_naissance, segment, created_at, updated_at, documents)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW(), '[]'::jsonb)`,
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
            'import'
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
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// POST /api/import/clean — dédoublonnage + normalisation
router.post('/clean', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id
    
    // Trouver les doublons (même nom + téléphone)
    const dupes = await pool.query(`
      SELECT c1.id, c1.nom, c1.prenom, c1.phone, c1.email
      FROM clients c1
      JOIN clients c2 ON c1.courtier_id = c2.courtier_id
        AND c1.id != c2.id
        AND LOWER(COALESCE(c1.nom,'')) = LOWER(COALESCE(c2.nom,''))
        AND c1.phone = c2.phone
        AND c1.phone IS NOT NULL
      WHERE c1.courtier_id = $1
      ORDER BY c1.nom
    `, [userId])
    
    // Normaliser téléphones (enlever espaces, tirets)
    const normalized = await pool.query(`
      UPDATE clients
      SET phone = REGEXP_REPLACE(COALESCE(phone, ''), '[^0-9+]', '', 'g'),
          updated_at = NOW()
      WHERE courtier_id = $1
        AND phone IS NOT NULL
        AND phone ~ '[^0-9+]'
      RETURNING id, phone
    `, [userId])
    
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
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

module.exports = router
