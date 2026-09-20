/**
 * kanban.js — Routes Kanban CRM
 * Feature requise : 'kanban' (plan PRO+)
 */

const express = require('express')
const router = express.Router()
const pool = require('../db')
const { verifyToken } = require('../middleware/auth')
const { requireFeature } = require('../middleware/planGuard')
const porteeCabinet = require('../lib/porteeCabinet')

router.use(verifyToken)
router.use(requireFeature('kanban'))

// ─────────────────────────────────────────────────────────────────────────────
// PORTÉE DES TABLEAUX KANBAN : LE CABINET
//
// POURQUOI : les tableaux appartenaient à UN utilisateur (`kanban_boards
// .courtier_id`) — un collaborateur invité voyait donc un pipeline vide au lieu
// du pipeline du cabinet. Le tableau porte désormais `cabinet_id` (migration
// 113) ; `courtier_id` reste le CRÉATEUR du tableau, et c'est lui qui est
// affiché (affectation commerciale).
// ─────────────────────────────────────────────────────────────────────────────

/** Portée SQL sur les tableaux kanban (propriétaire = courtier_id). */
function filtreTableaux(portee, { depart = 1, ecriture = false, alias = 'kanban_boards' } = {}) {
  return porteeCabinet.fragment(portee, {
    cabinet: `${alias}.cabinet_id`,
    proprietaire: `${alias}.courtier_id`,
    depart,
    ecriture,
  })
}

const DEFAULT_COLUMNS = [
  { id: 'lead', name: 'Prospect', order: 1 },
  { id: 'qualified', name: 'Qualifié', order: 2 },
  { id: 'proposal', name: 'Proposition', order: 3 },
  { id: 'closed', name: 'Signé', order: 4 }
]

// GET /api/kanban — liste des boards du cabinet
router.get('/', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const f = filtreTableaux(portee, { depart: 1 })
    const result = await pool.query(
      `SELECT id, name, columns, created_at, courtier_id FROM kanban_boards WHERE ${f.sql} ORDER BY created_at DESC`,
      [...f.params]
    )
    return res.json({ success: true, data: result.rows })
  } catch (err) {
    console.error('[GET /api/kanban]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// POST /api/kanban — créer un board
router.post('/', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    // Créer un tableau est une ÉCRITURE : un assistant ou un viewer lit tout le
    // cabinet mais ne le modifie pas.
    if (porteeCabinet.refuserEcriture(portee, res, 'créer un tableau')) return
    const courtier_id = portee.userId || req.user.userId
    const { name, columns } = req.body

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: 'validation_error', message: 'Le champ name est requis' })
    }

    const cols = Array.isArray(columns) && columns.length > 0 ? columns : DEFAULT_COLUMNS

    const result = await pool.query(
      `INSERT INTO kanban_boards (courtier_id, name, columns, cabinet_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [courtier_id, name.trim(), JSON.stringify(cols), porteeCabinet.cabinetPourCreation(portee)]
    )

    return res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[POST /api/kanban]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// GET /api/kanban/:id — board + cards groupées par colonne
router.get('/:id', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    const { id } = req.params
    const f = filtreTableaux(portee, { depart: 2 })

    const boardResult = await pool.query(
      `SELECT * FROM kanban_boards WHERE id = $1 AND ${f.sql}`,
      [id, ...f.params]
    )
    if (boardResult.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Board introuvable' })
    }

    const board = boardResult.rows[0]

    const cardsResult = await pool.query(
      `SELECT kc.*, c.first_name, c.last_name, c.email
       FROM kanban_cards kc
       LEFT JOIN clients c ON kc.client_id = c.id
       WHERE kc.board_id = $1
       ORDER BY kc.position`,
      [id]
    )

    // Grouper par colonne
    const cards_by_column = {}
    const columns = Array.isArray(board.columns) ? board.columns : []
    for (const col of columns) {
      cards_by_column[col.id] = []
    }
    for (const card of cardsResult.rows) {
      const colId = card.column_id
      if (!cards_by_column[colId]) cards_by_column[colId] = []
      cards_by_column[colId].push(card)
    }

    return res.json({ success: true, data: { board, cards_by_column } })
  } catch (err) {
    console.error('[GET /api/kanban/:id]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// POST /api/kanban/cards — créer une carte
router.post('/cards', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'créer une carte')) return
    const { board_id, column_id, client_id, title, description, position } = req.body

    if (!board_id || !column_id || !title) {
      return res.status(400).json({
        error: 'validation_error',
        message: 'board_id, column_id et title sont requis'
      })
    }

    // Vérifier que le board appartient AU CABINET de l'appelant (404 sinon).
    const fBoard = filtreTableaux(portee, { depart: 2, ecriture: true })
    const boardCheck = await pool.query(
      `SELECT id FROM kanban_boards WHERE id = $1 AND ${fBoard.sql}`,
      [board_id, ...fBoard.params]
    )
    if (boardCheck.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Board introuvable' })
    }

    const result = await pool.query(
      `INSERT INTO kanban_cards (board_id, column_id, client_id, title, description, position, cabinet_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [board_id, column_id, client_id || null, title, description || null, position || 0,
       porteeCabinet.cabinetPourCreation(portee)]
    )

    return res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[POST /api/kanban/cards]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// PATCH /api/kanban/cards/:id — mise à jour partielle d'une carte
router.patch('/cards/:id', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'modifier une carte')) return
    const { id } = req.params

    // Vérifier la portée via le TABLEAU : une carte n'a pas de propriétaire
    // propre, c'est le tableau qui porte le cabinet.
    const fBoard = filtreTableaux(portee, { depart: 2, ecriture: true, alias: 'kb' })
    const ownerCheck = await pool.query(
      `SELECT kc.id FROM kanban_cards kc
       JOIN kanban_boards kb ON kc.board_id = kb.id
       WHERE kc.id = $1 AND ${fBoard.sql}`,
      [id, ...fBoard.params]
    )
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Carte introuvable' })
    }

    const allowed = ['column_id', 'client_id', 'title', 'description', 'position']
    const updates = []
    const values = []
    let idx = 1

    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        updates.push(`${key} = $${idx}`)
        values.push(req.body[key])
        idx++
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'validation_error', message: 'Aucun champ à mettre à jour' })
    }

    values.push(id)
    const result = await pool.query(
      `UPDATE kanban_cards SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    )

    return res.json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[PATCH /api/kanban/cards/:id]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

// DELETE /api/kanban/cards/:id — supprimer une carte
router.delete('/cards/:id', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserSuppression(portee, res)) return
    const { id } = req.params

    // Vérifier la portée via le TABLEAU (cf. PATCH).
    const fBoard = filtreTableaux(portee, { depart: 2, ecriture: true, alias: 'kb' })
    const ownerCheck = await pool.query(
      `SELECT kc.id FROM kanban_cards kc
       JOIN kanban_boards kb ON kc.board_id = kb.id
       WHERE kc.id = $1 AND ${fBoard.sql}`,
      [id, ...fBoard.params]
    )
    if (ownerCheck.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Carte introuvable' })
    }

    await pool.query('DELETE FROM kanban_cards WHERE id = $1', [id])

    return res.json({ success: true, data: { deleted_id: id } })
  } catch (err) {
    console.error('[DELETE /api/kanban/cards/:id]', err.message)
    return res.status(500).json({ error: 'server_error', message: err.message })
  }
})

module.exports = router
