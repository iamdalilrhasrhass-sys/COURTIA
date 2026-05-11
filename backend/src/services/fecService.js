/**
 * FEC Service - Fichier des Écritures Comptables
 * LOT 22 — Export comptable format DGFIP
 */

const { centsToEuros } = require('./commissionService')

const JOURNAL_CODES = {
  VE: 'Journal des ventes',
  AC: 'Journal des achats',
  BQ: 'Journal de banque',
  OD: 'Opérations diverses'
}

const COMPTE_PLAN = {
  // Classe 4 - Tiers
  CLIENT: '411000',
  FOURNISSEUR: '401000',
  // Classe 5 - Financier
  BANQUE: '512000',
  // Classe 6 - Charges
  CHARGES_EXT: '622000',
  FRAIS_BANCAIRES: '627000',
  // Classe 7 - Produits
  COMMISSIONS: '706000',
  HONORAIRES: '706100',
  PRODUITS_DIVERS: '708000'
}

/**
 * Format date pour FEC (YYYYMMDD)
 */
function formatFecDate(date) {
  if (!date) return ''
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Format montant pour FEC (virgule décimale, pas de séparateur milliers)
 */
function formatFecAmount(cents) {
  const euros = Math.abs(centsToEuros(cents || 0))
  return euros.toFixed(2).replace('.', ',')
}

/**
 * Échappe les caractères spéciaux CSV
 */
function escapeFecField(value) {
  if (value === null || value === undefined) return ''
  const str = String(value).trim()
  // Remplacer les pipes et retours à la ligne
  return str.replace(/\|/g, ' ').replace(/[\r\n]/g, ' ').slice(0, 200)
}

/**
 * Génère le prochain numéro d'écriture
 */
async function getNextEcritureNum(pool, userId, fiscalYear) {
  const result = await pool.query(`
    INSERT INTO accounting_sequences (user_id, current_ecriture_num, fiscal_year)
    VALUES ($1, 1, $2)
    ON CONFLICT (user_id) DO UPDATE SET
      current_ecriture_num = CASE 
        WHEN accounting_sequences.fiscal_year = $2 
        THEN accounting_sequences.current_ecriture_num + 1
        ELSE 1
      END,
      fiscal_year = $2,
      updated_at = NOW()
    RETURNING current_ecriture_num
  `, [userId, fiscalYear])
  
  return result.rows[0].current_ecriture_num
}

/**
 * Crée une écriture comptable
 */
async function createAccountingEntry(pool, userId, entry) {
  const fiscalYear = new Date(entry.ecriture_date).getFullYear()
  const ecritureNum = entry.ecriture_num || await getNextEcritureNum(pool, userId, fiscalYear)

  const result = await pool.query(`
    INSERT INTO accounting_entries (
      user_id, journal_code, journal_lib, ecriture_num, ecriture_date,
      compte_num, compte_lib, comp_aux_num, comp_aux_lib,
      piece_ref, piece_date, ecriture_lib, debit_cents, credit_cents,
      ecriture_let, date_let, valid_date, montant_devise, idevise,
      source_type, source_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    RETURNING *
  `, [
    userId,
    entry.journal_code || 'VE',
    entry.journal_lib || JOURNAL_CODES[entry.journal_code] || 'Journal des ventes',
    ecritureNum,
    entry.ecriture_date,
    entry.compte_num,
    entry.compte_lib,
    entry.comp_aux_num || null,
    entry.comp_aux_lib || null,
    entry.piece_ref || null,
    entry.piece_date || entry.ecriture_date,
    entry.ecriture_lib,
    entry.debit_cents || 0,
    entry.credit_cents || 0,
    entry.ecriture_let || null,
    entry.date_let || null,
    entry.valid_date || entry.ecriture_date,
    entry.montant_devise || null,
    entry.idevise || 'EUR',
    entry.source_type || null,
    entry.source_id || null
  ])

  return result.rows[0]
}

/**
 * Génère les écritures comptables depuis les commissions
 */
async function generateEntriesFromCommissions(pool, userId, startDate, endDate) {
  // Récupérer les commissions de la période
  const commissionsRes = await pool.query(`
    SELECT co.*, q.client_id, q.quote_data->>'numero' AS contract_number,
           c.first_name || ' ' || c.last_name AS client_name
    FROM commissions co
    LEFT JOIN quotes q ON q.id = co.contract_id
    LEFT JOIN clients c ON c.id = q.client_id
    WHERE co.user_id = $1 
      AND co.status = 'paid'
      AND co.updated_at >= $2 
      AND co.updated_at <= $3
    ORDER BY co.updated_at ASC
  `, [userId, startDate, endDate])

  const entries = []
  const fiscalYear = new Date(startDate).getFullYear()

  for (const commission of commissionsRes.rows) {
    const ecritureNum = await getNextEcritureNum(pool, userId, fiscalYear)
    const pieceRef = `COM-${commission.period_year}${String(commission.period_month).padStart(2, '0')}-${commission.id}`
    const ecritureDate = new Date(commission.updated_at)

    // Écriture au débit (Banque)
    await createAccountingEntry(pool, userId, {
      journal_code: 'BQ',
      ecriture_num: ecritureNum,
      ecriture_date: ecritureDate,
      compte_num: COMPTE_PLAN.BANQUE,
      compte_lib: 'Banque',
      piece_ref: pieceRef,
      ecriture_lib: `Commission ${commission.insurer} - ${commission.contract_number || 'Contrat'}`,
      debit_cents: commission.received_amount_cents,
      credit_cents: 0,
      source_type: 'commission',
      source_id: commission.id
    })

    // Écriture au crédit (Produit commissions)
    await createAccountingEntry(pool, userId, {
      journal_code: 'BQ',
      ecriture_num: ecritureNum,
      ecriture_date: ecritureDate,
      compte_num: COMPTE_PLAN.COMMISSIONS,
      compte_lib: 'Commissions sur contrats',
      comp_aux_num: commission.insurer ? `F-${commission.insurer.slice(0, 10).toUpperCase()}` : null,
      comp_aux_lib: commission.insurer,
      piece_ref: pieceRef,
      ecriture_lib: `Commission ${commission.insurer} - ${commission.contract_number || 'Contrat'}`,
      debit_cents: 0,
      credit_cents: commission.received_amount_cents,
      source_type: 'commission',
      source_id: commission.id
    })

    entries.push({ commission_id: commission.id, ecriture_num: ecritureNum })
  }

  return { generated: entries.length, entries }
}

/**
 * Génère le fichier FEC
 */
async function generateFEC(pool, userId, startDate, endDate) {
  // En-tête FEC (format DGFIP)
  const header = [
    'JournalCode',
    'JournalLib',
    'EcritureNum',
    'EcritureDate',
    'CompteNum',
    'CompteLib',
    'CompAuxNum',
    'CompAuxLib',
    'PieceRef',
    'PieceDate',
    'EcritureLib',
    'Debit',
    'Credit',
    'EcritureLet',
    'DateLet',
    'ValidDate',
    'Montantdevise',
    'Idevise'
  ].join('|')

  // Récupérer les écritures
  const entriesRes = await pool.query(`
    SELECT * FROM accounting_entries
    WHERE user_id = $1 
      AND ecriture_date >= $2 
      AND ecriture_date <= $3
    ORDER BY ecriture_date ASC, ecriture_num ASC, id ASC
  `, [userId, startDate, endDate])

  const lines = [header]

  for (const entry of entriesRes.rows) {
    const line = [
      escapeFecField(entry.journal_code),
      escapeFecField(entry.journal_lib),
      entry.ecriture_num,
      formatFecDate(entry.ecriture_date),
      escapeFecField(entry.compte_num),
      escapeFecField(entry.compte_lib),
      escapeFecField(entry.comp_aux_num),
      escapeFecField(entry.comp_aux_lib),
      escapeFecField(entry.piece_ref),
      formatFecDate(entry.piece_date),
      escapeFecField(entry.ecriture_lib),
      formatFecAmount(entry.debit_cents),
      formatFecAmount(entry.credit_cents),
      escapeFecField(entry.ecriture_let),
      formatFecDate(entry.date_let),
      formatFecDate(entry.valid_date),
      entry.montant_devise ? formatFecAmount(entry.montant_devise * 100) : '',
      escapeFecField(entry.idevise)
    ].join('|')
    
    lines.push(line)
  }

  return {
    content: lines.join('\r\n'),
    filename: `FEC_${formatFecDate(startDate)}_${formatFecDate(endDate)}.txt`,
    entries_count: entriesRes.rows.length
  }
}

/**
 * Résumé comptable annuel
 */
async function getAccountingSummary(pool, userId, year) {
  // Total des produits (commissions)
  const produitsRes = await pool.query(`
    SELECT 
      COALESCE(SUM(credit_cents), 0)::bigint AS total_produits_cents,
      COUNT(*) AS entries_count
    FROM accounting_entries
    WHERE user_id = $1 
      AND EXTRACT(YEAR FROM ecriture_date) = $2
      AND compte_num LIKE '7%'
  `, [userId, year])

  // Total des charges
  const chargesRes = await pool.query(`
    SELECT 
      COALESCE(SUM(debit_cents), 0)::bigint AS total_charges_cents,
      COUNT(*) AS entries_count
    FROM accounting_entries
    WHERE user_id = $1 
      AND EXTRACT(YEAR FROM ecriture_date) = $2
      AND compte_num LIKE '6%'
  `, [userId, year])

  // Détail par mois
  const byMonthRes = await pool.query(`
    SELECT 
      EXTRACT(MONTH FROM ecriture_date)::int AS month,
      COALESCE(SUM(CASE WHEN compte_num LIKE '7%' THEN credit_cents ELSE 0 END), 0)::bigint AS produits_cents,
      COALESCE(SUM(CASE WHEN compte_num LIKE '6%' THEN debit_cents ELSE 0 END), 0)::bigint AS charges_cents
    FROM accounting_entries
    WHERE user_id = $1 AND EXTRACT(YEAR FROM ecriture_date) = $2
    GROUP BY EXTRACT(MONTH FROM ecriture_date)
    ORDER BY month ASC
  `, [userId, year])

  // Détail par compagnie (commissions)
  const byInsurerRes = await pool.query(`
    SELECT 
      COALESCE(comp_aux_lib, 'Non renseigné') AS insurer,
      COALESCE(SUM(credit_cents), 0)::bigint AS total_cents,
      COUNT(*) AS entries_count
    FROM accounting_entries
    WHERE user_id = $1 
      AND EXTRACT(YEAR FROM ecriture_date) = $2
      AND compte_num = $3
    GROUP BY comp_aux_lib
    ORDER BY total_cents DESC
  `, [userId, year, COMPTE_PLAN.COMMISSIONS])

  const totalProduits = parseInt(produitsRes.rows[0]?.total_produits_cents || 0, 10)
  const totalCharges = parseInt(chargesRes.rows[0]?.total_charges_cents || 0, 10)
  const resultatNet = totalProduits - totalCharges

  return {
    year,
    totals: {
      produits_cents: totalProduits,
      produits_eur: centsToEuros(totalProduits),
      charges_cents: totalCharges,
      charges_eur: centsToEuros(totalCharges),
      resultat_net_cents: resultatNet,
      resultat_net_eur: centsToEuros(resultatNet)
    },
    by_month: byMonthRes.rows.map(row => ({
      month: row.month,
      produits_eur: centsToEuros(row.produits_cents),
      charges_eur: centsToEuros(row.charges_cents),
      resultat_eur: centsToEuros(row.produits_cents - row.charges_cents)
    })),
    by_insurer: byInsurerRes.rows.map(row => ({
      insurer: row.insurer,
      total_eur: centsToEuros(row.total_cents),
      entries_count: parseInt(row.entries_count, 10)
    })),
    entries_count: parseInt(produitsRes.rows[0]?.entries_count || 0, 10) + parseInt(chargesRes.rows[0]?.entries_count || 0, 10)
  }
}

/**
 * Bilan simplifié
 */
async function getBalance(pool, userId, year) {
  // Actif (comptes 1-5)
  const actifRes = await pool.query(`
    SELECT 
      LEFT(compte_num, 2) AS classe,
      COALESCE(SUM(debit_cents) - SUM(credit_cents), 0)::bigint AS solde_cents
    FROM accounting_entries
    WHERE user_id = $1 
      AND EXTRACT(YEAR FROM ecriture_date) = $2
      AND LEFT(compte_num, 1) IN ('1', '2', '3', '4', '5')
    GROUP BY LEFT(compte_num, 2)
    ORDER BY classe ASC
  `, [userId, year])

  // Passif et résultat (comptes 6-7)
  const passifRes = await pool.query(`
    SELECT 
      LEFT(compte_num, 2) AS classe,
      COALESCE(SUM(credit_cents) - SUM(debit_cents), 0)::bigint AS solde_cents
    FROM accounting_entries
    WHERE user_id = $1 
      AND EXTRACT(YEAR FROM ecriture_date) = $2
      AND LEFT(compte_num, 1) IN ('6', '7')
    GROUP BY LEFT(compte_num, 2)
    ORDER BY classe ASC
  `, [userId, year])

  return {
    year,
    actif: actifRes.rows.map(r => ({
      classe: r.classe,
      solde_eur: centsToEuros(r.solde_cents)
    })),
    passif: passifRes.rows.map(r => ({
      classe: r.classe,
      solde_eur: centsToEuros(r.solde_cents)
    }))
  }
}

module.exports = {
  generateFEC,
  getAccountingSummary,
  getBalance,
  createAccountingEntry,
  generateEntriesFromCommissions,
  getNextEcritureNum,
  formatFecDate,
  formatFecAmount,
  JOURNAL_CODES,
  COMPTE_PLAN
}
