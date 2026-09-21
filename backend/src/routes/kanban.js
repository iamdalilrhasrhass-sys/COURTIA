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
const { messagePublic } = require('../lib/erreursPubliques')

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

/**
 * Identifiant numérique strict : `abc` ne doit pas finir en erreur SQL (500).
 * Un identifiant qui n'est pas un entier ne peut désigner aucune carte.
 */
function identifiantCarte(valeur) {
  const texte = String(valeur ?? '').trim()
  return /^\d+$/.test(texte) ? Number(texte) : null
}

/**
 * Affectation d'une carte (`assigned_to`).
 *
 * POURQUOI CE CONTRÔLE (défaut relevé le 20/09/2026) : l'écran de pipeline
 * proposait d'affecter une carte à un collaborateur, mais `kanban_cards` n'avait
 * aucune colonne d'affectation : soit la requête était refusée (« Aucun champ à
 * mettre à jour »), soit l'affectation était ignorée EN SILENCE quand d'autres
 * champs l'accompagnaient — une action proposée sans effet. La colonne existe
 * désormais (migration 115) et l'affectation est écrite.
 *
 * Deux noms pour UNE notion : `assigned_to` (nom de colonne) et `owner_id`
 * (nom lu par certaines interfaces) désignent le même collaborateur. Fournir
 * deux valeurs différentes est refusé plutôt que tranché au hasard.
 *
 * @returns {{ok: boolean, erreur?: object, valeur?: number|null}}
 */
function lireAffectation(corps) {
  const fournis = [
    ['assigned_to', corps.assigned_to],
    ['owner_id', corps.owner_id],
  ].filter(([, valeur]) => valeur !== undefined)

  if (fournis.length === 0) return { ok: true, valeur: undefined }

  const valeurs = new Set(fournis
    .filter(([, valeur]) => valeur !== null && String(valeur).trim() !== '')
    .map(([, valeur]) => String(valeur).trim()))

  if (valeurs.size > 1) {
    return {
      ok: false,
      erreur: {
        error: 'affectation_ambigue',
        message: 'assigned_to et owner_id désignent le même collaborateur : ils ne peuvent pas porter deux valeurs différentes.',
        champs: fournis.map(([nom]) => nom),
      },
    }
  }

  // Aucune valeur (null ou chaîne vide) = désaffectation explicite.
  if (valeurs.size === 0) return { ok: true, valeur: null }

  const valeur = [...valeurs][0]
  if (!/^\d+$/.test(valeur)) {
    return {
      ok: false,
      erreur: {
        error: 'affectation_invalide',
        message: `« ${valeur} » n'est pas un identifiant de collaborateur.`,
        champ: 'assigned_to',
      },
    }
  }
  return { ok: true, valeur: Number(valeur) }
}

/**
 * Le collaborateur existe-t-il DANS LE CABINET du tableau ?
 * Sans ce contrôle, une carte pourrait être affectée à un utilisateur d'un
 * autre cabinet : l'affectation afficherait un nom hors périmètre.
 * Sans cabinet (tableau mono-utilisateur), seul le créateur du tableau est un
 * destinataire légitime.
 *
 * @returns {Promise<boolean>}
 */
async function affectationAutorisee(pool, tableau, utilisateurId) {
  if (utilisateurId === null) return true // désaffectation : rien à vérifier
  if (tableau.cabinet_id) {
    const { rows } = await pool.query(
      `SELECT 1 FROM cabinet_members
        WHERE user_id = $1 AND cabinet_id = $2 AND removed_at IS NULL
        LIMIT 1`,
      [utilisateurId, tableau.cabinet_id]
    )
    return rows.length > 0
  }
  return Number(tableau.courtier_id) === Number(utilisateurId)
}

/** Lit la carte + son tableau dans la PORTÉE de l'appelant (aucune règle avant). */
async function lireCarteDansPortee(pool, portee, id) {
  const fBoard = filtreTableaux(portee, { depart: 2, ecriture: true, alias: 'kb' })
  const { rows } = await pool.query(
    `SELECT kc.id, kc.board_id, kb.cabinet_id, kb.courtier_id
       FROM kanban_cards kc
       JOIN kanban_boards kb ON kc.board_id = kb.id
      WHERE kc.id = $1 AND ${fBoard.sql}`,
    [id, ...fBoard.params]
  )
  return { existe: rows.length > 0, carte: rows[0] }
}

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
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
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
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
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
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
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
      `SELECT id, cabinet_id, courtier_id FROM kanban_boards WHERE id = $1 AND ${fBoard.sql}`,
      [board_id, ...fBoard.params]
    )
    if (boardCheck.rows.length === 0) {
      return res.status(404).json({ error: 'not_found', message: 'Board introuvable' })
    }

    // Affectation éventuelle : elle est écrite (jamais ignorée en silence) et
    // le collaborateur doit appartenir au cabinet du tableau.
    const affectation = lireAffectation(req.body || {})
    if (!affectation.ok) {
      return res.status(400).json(affectation.erreur)
    }
    if (affectation.valeur !== undefined
      && !(await affectationAutorisee(pool, boardCheck.rows[0], affectation.valeur))) {
      return res.status(400).json({
        error: 'affectation_hors_cabinet',
        message: "Ce collaborateur n'appartient pas au cabinet de ce tableau : la carte n'a pas été créée avec cette affectation.",
      })
    }

    const result = await pool.query(
      `INSERT INTO kanban_cards (board_id, column_id, client_id, title, description, position, cabinet_id, assigned_to)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [board_id, column_id, client_id || null, title, description || null, position || 0,
       porteeCabinet.cabinetPourCreation(portee),
       affectation.valeur === undefined ? null : affectation.valeur]
    ).catch((err) => {
      // Migration 115 non jouée : on le DIT (aucun succès simulé, aucun 500).
      if (err && err.code === '42703') return null
      throw err
    })

    if (!result) {
      return res.status(503).json({
        error: 'affectation_indisponible',
        message: "La colonne d'affectation n'est pas encore disponible en base (migration 115) : la carte n'a pas été créée.",
      })
    }

    return res.status(201).json({ success: true, data: result.rows[0] })
  } catch (err) {
    console.error('[POST /api/kanban/cards]', err.message)
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

// PATCH /api/kanban/cards/:id — mise à jour partielle d'une carte
router.patch('/cards/:id', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserEcriture(portee, res, 'modifier une carte')) return
    const id = identifiantCarte(req.params.id)
    if (id === null) {
      return res.status(404).json({ error: 'not_found', message: 'Carte introuvable' })
    }

    // Vérifier la portée via le TABLEAU : une carte n'a pas de propriétaire
    // propre, c'est le tableau qui porte le cabinet.
    const { existe, carte } = await lireCarteDansPortee(pool, portee, id)
    if (!existe) {
      return res.status(404).json({ error: 'not_found', message: 'Carte introuvable' })
    }

    const corps = req.body || {}
    const allowed = ['column_id', 'client_id', 'title', 'description', 'position']
    const updates = []
    const values = []
    let idx = 1

    for (const key of allowed) {
      if (corps[key] !== undefined) {
        updates.push(`${key} = $${idx}`)
        values.push(corps[key])
        idx++
      }
    }

    const affectation = lireAffectation(corps)
    if (!affectation.ok) {
      return res.status(400).json(affectation.erreur)
    }
    if (affectation.valeur !== undefined) {
      if (!(await affectationAutorisee(pool, carte, affectation.valeur))) {
        return res.status(400).json({
          error: 'affectation_hors_cabinet',
          statut: 400,
          message: "Ce collaborateur n'appartient pas au cabinet de ce tableau : la carte n'a pas été modifiée.",
        })
      }
      updates.push(`assigned_to = $${idx}`)
      values.push(affectation.valeur)
      idx++
    }

    if (updates.length === 0) {
      // Aucun champ CONNU : on dit lesquels ont été reçus, pour que l'écran ne
      // croie pas avoir enregistré quelque chose.
      return res.status(400).json({
        error: 'validation_error',
        message: 'Aucun champ à mettre à jour',
        champs_recus: Object.keys(corps),
      })
    }

    values.push(id)
    const result = await pool.query(
      `UPDATE kanban_cards SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`,
      values
    ).catch((err) => {
      // Migration 115 non jouée : refus explicite plutôt que 500 illisible.
      if (err && err.code === '42703') return null
      throw err
    })

    if (!result) {
      return res.status(503).json({
        error: 'affectation_indisponible',
        message: "La colonne d'affectation n'est pas encore disponible en base (migration 115) : la carte n'a pas été modifiée.",
      })
    }

    // Champs reçus mais non modifiables ici : DITS explicitement (même règle
    // que PUT /api/auth/me). Une affectation demandée n'est jamais ignorée en
    // silence : soit elle est écrite, soit la requête est refusée (400).
    const champsIgnores = Object.keys(corps).filter((cle) => !allowed.includes(cle)
      && cle !== 'assigned_to' && cle !== 'owner_id')

    return res.json({
      success: true,
      data: result.rows[0],
      champs_ignores: champsIgnores,
    })
  } catch (err) {
    console.error('[PATCH /api/kanban/cards/:id]', err.message)
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

// DELETE /api/kanban/cards/:id — supprimer une carte
router.delete('/cards/:id', async (req, res) => {
  try {
    const portee = await porteeCabinet.resoudrePortee(pool, req)
    if (porteeCabinet.refuserSuppression(portee, res)) return
    const id = identifiantCarte(req.params.id)
    if (id === null) {
      return res.status(404).json({ error: 'not_found', message: 'Carte introuvable' })
    }

    // Vérifier la portée via le TABLEAU (cf. PATCH).
    const { existe } = await lireCarteDansPortee(pool, portee, id)
    if (!existe) {
      return res.status(404).json({ error: 'not_found', message: 'Carte introuvable' })
    }

    const supprime = await pool.query('DELETE FROM kanban_cards WHERE id = $1', [id])
    if (!supprime.rowCount) {
      return res.status(404).json({ error: 'not_found', message: 'Carte introuvable' })
    }

    return res.json({ success: true, data: { deleted_id: id } })
  } catch (err) {
    console.error('[DELETE /api/kanban/cards/:id]', err.message)
    return res.status(500).json({ error: 'server_error', message: messagePublic(err, { statut: 500 }) })
  }
})

module.exports = router
