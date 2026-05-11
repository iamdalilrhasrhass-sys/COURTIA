/**
 * Commissions Auto Service
 * LOT 22 — Calcul automatique et rapprochement des commissions
 */

const { v4: uuidv4 } = require('uuid')
const { eurosToCents, centsToEuros, normalizePeriod } = require('./commissionService')
const { generateEntriesFromCommissions } = require('./fecService')
const { generatePDF } = require('./pdfService')

/**
 * Récupère les règles de commission applicables
 */
async function getApplicableRules(pool, userId, productType, company, date = new Date()) {
  const result = await pool.query(`
    SELECT * FROM commission_rules
    WHERE user_id = $1
      AND is_active = true
      AND (product_type IS NULL OR product_type = $2)
      AND (company IS NULL OR company ILIKE $3)
      AND (applies_from IS NULL OR applies_from <= $4)
      AND (applies_until IS NULL OR applies_until >= $4)
    ORDER BY 
      CASE WHEN product_type IS NOT NULL AND company IS NOT NULL THEN 1
           WHEN product_type IS NOT NULL THEN 2
           WHEN company IS NOT NULL THEN 3
           ELSE 4 END,
      created_at DESC
    LIMIT 1
  `, [userId, productType, `%${company}%`, date])

  return result.rows[0] || null
}

/**
 * Crée ou met à jour une règle de commission
 */
async function upsertRule(pool, userId, rule) {
  const result = await pool.query(`
    INSERT INTO commission_rules (
      user_id, product_type, company, rate_percent, flat_fee_cents,
      conditions, applies_from, applies_until, is_active
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    ON CONFLICT (id) DO UPDATE SET
      product_type = EXCLUDED.product_type,
      company = EXCLUDED.company,
      rate_percent = EXCLUDED.rate_percent,
      flat_fee_cents = EXCLUDED.flat_fee_cents,
      conditions = EXCLUDED.conditions,
      applies_from = EXCLUDED.applies_from,
      applies_until = EXCLUDED.applies_until,
      is_active = EXCLUDED.is_active,
      updated_at = NOW()
    RETURNING *
  `, [
    userId,
    rule.product_type || null,
    rule.company || null,
    rule.rate_percent || 0,
    eurosToCents(rule.flat_fee || 0),
    JSON.stringify(rule.conditions || {}),
    rule.applies_from || null,
    rule.applies_until || null,
    rule.is_active !== false
  ])

  return result.rows[0]
}

/**
 * Liste les règles de commission
 */
async function listRules(pool, userId) {
  const result = await pool.query(`
    SELECT * FROM commission_rules
    WHERE user_id = $1
    ORDER BY is_active DESC, product_type NULLS LAST, company NULLS LAST
  `, [userId])

  return result.rows.map(r => ({
    ...r,
    flat_fee_eur: centsToEuros(r.flat_fee_cents)
  }))
}

/**
 * Calcule la commission pour un contrat
 */
async function calculateCommission(pool, userId, contractId, period) {
  // Récupérer le contrat
  const contractRes = await pool.query(`
    SELECT q.*, c.first_name, c.last_name
    FROM quotes q
    JOIN clients c ON c.id = q.client_id
    WHERE q.id = $1 AND c.courtier_id = $2
  `, [contractId, userId])

  const contract = contractRes.rows[0]
  if (!contract) {
    throw new Error('Contrat introuvable')
  }

  const quoteData = contract.quote_data || {}
  const productType = quoteData.type_contrat || quoteData.product_type || null
  const company = quoteData.compagnie || quoteData.company || null
  const primeTTC = parseFloat(quoteData.prime_ttc || quoteData.premium || 0)

  // Trouver la règle applicable
  const rule = await getApplicableRules(pool, userId, productType, company)

  let expectedAmountCents = 0
  if (rule) {
    // Calcul : (prime * taux%) + frais fixes
    const rateAmount = primeTTC * (rule.rate_percent / 100)
    expectedAmountCents = eurosToCents(rateAmount) + (rule.flat_fee_cents || 0)
  }

  // Normaliser la période
  const { year, month } = normalizePeriod(period)

  // Enregistrer ou mettre à jour la commission
  const result = await pool.query(`
    INSERT INTO commissions (
      user_id, contract_id, insurer, period_year, period_month,
      expected_amount_cents, received_amount_cents, status, rule_id, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, 0, 'expected', $7, NOW(), NOW())
    ON CONFLICT (user_id, contract_id, period_year, period_month) DO UPDATE SET
      expected_amount_cents = EXCLUDED.expected_amount_cents,
      rule_id = EXCLUDED.rule_id,
      updated_at = NOW()
    RETURNING *
  `, [userId, contractId, company || 'Non renseigné', year, month, expectedAmountCents, rule?.id || null])

  return {
    ...result.rows[0],
    expected_amount_eur: centsToEuros(expectedAmountCents),
    rule_applied: rule ? {
      id: rule.id,
      rate_percent: rule.rate_percent,
      flat_fee_eur: centsToEuros(rule.flat_fee_cents)
    } : null,
    contract: {
      id: contract.id,
      client: `${contract.first_name} ${contract.last_name}`,
      product_type: productType,
      company,
      prime_ttc: primeTTC
    }
  }
}

/**
 * Calcule les commissions pour une période entière
 */
async function calculatePeriodCommissions(pool, userId, period) {
  const { year, month } = normalizePeriod(period)

  // Récupérer tous les contrats actifs
  const contractsRes = await pool.query(`
    SELECT q.id 
    FROM quotes q
    JOIN clients c ON c.id = q.client_id
    WHERE c.courtier_id = $1 AND q.status IN ('accepted', 'active', 'en_cours')
  `, [userId])

  const results = []
  for (const contract of contractsRes.rows) {
    try {
      const commission = await calculateCommission(pool, userId, contract.id, { year, month })
      results.push({ success: true, commission })
    } catch (err) {
      results.push({ success: false, contract_id: contract.id, error: err.message })
    }
  }

  return {
    period: `${year}-${String(month).padStart(2, '0')}`,
    total: results.length,
    calculated: results.filter(r => r.success).length,
    errors: results.filter(r => !r.success)
  }
}

/**
 * Rapprochement mensuel des commissions
 */
async function reconcileMonth(pool, userId, year, month) {
  const batchId = uuidv4()

  // Récupérer les commissions du mois par compagnie
  const commissionsRes = await pool.query(`
    SELECT 
      insurer,
      COALESCE(SUM(expected_amount_cents), 0)::bigint AS expected_total,
      COALESCE(SUM(received_amount_cents), 0)::bigint AS received_total,
      COUNT(*)::int AS commission_count
    FROM commissions
    WHERE user_id = $1 AND period_year = $2 AND period_month = $3
    GROUP BY insurer
  `, [userId, year, month])

  const reconciliations = []

  for (const row of commissionsRes.rows) {
    const variance = parseInt(row.received_total, 10) - parseInt(row.expected_total, 10)
    const status = variance === 0 ? 'validated' : (variance < 0 ? 'pending' : 'validated')

    // Créer ou mettre à jour le rapprochement
    const result = await pool.query(`
      INSERT INTO commission_reconciliations (
        user_id, period_year, period_month, company,
        expected_total_cents, received_total_cents, variance_cents,
        commission_count, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id, period_year, period_month, company) DO UPDATE SET
        expected_total_cents = EXCLUDED.expected_total_cents,
        received_total_cents = EXCLUDED.received_total_cents,
        variance_cents = EXCLUDED.variance_cents,
        commission_count = EXCLUDED.commission_count,
        status = EXCLUDED.status,
        created_at = NOW()
      RETURNING *
    `, [
      userId, year, month, row.insurer,
      row.expected_total, row.received_total, variance,
      row.commission_count, status
    ])

    // Marquer les commissions comme rapprochées
    await pool.query(`
      UPDATE commissions 
      SET reconciled_at = NOW(), reconciliation_batch_id = $4, variance_cents = received_amount_cents - expected_amount_cents
      WHERE user_id = $1 AND period_year = $2 AND period_month = $3 AND insurer = $5
    `, [userId, year, month, batchId, row.insurer])

    reconciliations.push({
      ...result.rows[0],
      expected_total_eur: centsToEuros(row.expected_total),
      received_total_eur: centsToEuros(row.received_total),
      variance_eur: centsToEuros(variance)
    })
  }

  return {
    period: `${year}-${String(month).padStart(2, '0')}`,
    batch_id: batchId,
    reconciliations,
    summary: {
      total_expected_eur: centsToEuros(reconciliations.reduce((s, r) => s + parseInt(r.expected_total_cents, 10), 0)),
      total_received_eur: centsToEuros(reconciliations.reduce((s, r) => s + parseInt(r.received_total_cents, 10), 0)),
      total_variance_eur: centsToEuros(reconciliations.reduce((s, r) => s + parseInt(r.variance_cents, 10), 0)),
      companies_count: reconciliations.length
    }
  }
}

/**
 * Génère le relevé PDF des commissions
 */
async function generateStatement(pool, userId, year, month) {
  // Récupérer les données
  const commissionsRes = await pool.query(`
    SELECT co.*, q.quote_data->>'numero' AS contract_number,
           c.first_name || ' ' || c.last_name AS client_name
    FROM commissions co
    LEFT JOIN quotes q ON q.id = co.contract_id
    LEFT JOIN clients c ON c.id = q.client_id
    WHERE co.user_id = $1 AND co.period_year = $2 AND co.period_month = $3
    ORDER BY co.insurer, co.updated_at ASC
  `, [userId, year, month])

  const userRes = await pool.query(`
    SELECT first_name, last_name, cabinet_name, email FROM users WHERE id = $1
  `, [userId])
  const user = userRes.rows[0]

  // Totaux par compagnie
  const byInsurer = {}
  for (const com of commissionsRes.rows) {
    if (!byInsurer[com.insurer]) {
      byInsurer[com.insurer] = { expected: 0, received: 0, count: 0, items: [] }
    }
    byInsurer[com.insurer].expected += parseInt(com.expected_amount_cents, 10)
    byInsurer[com.insurer].received += parseInt(com.received_amount_cents, 10)
    byInsurer[com.insurer].count++
    byInsurer[com.insurer].items.push(com)
  }

  // Génération HTML pour PDF
  const monthNames = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
        h1 { color: #8B5CF6; margin-bottom: 10px; }
        h2 { color: #475569; border-bottom: 2px solid #E2E8F0; padding-bottom: 8px; margin-top: 30px; }
        .header { margin-bottom: 30px; }
        .meta { color: #64748B; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #E2E8F0; }
        th { background: #F8FAFC; color: #475569; font-weight: 600; }
        .amount { text-align: right; }
        .total { font-weight: 600; background: #F1F5F9; }
        .positive { color: #10B981; }
        .negative { color: #EF4444; }
        .summary { background: linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); color: white; padding: 20px; border-radius: 12px; margin-top: 30px; }
        .summary h3 { margin: 0 0 15px 0; }
        .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .summary-item { text-align: center; }
        .summary-value { font-size: 24px; font-weight: 700; }
        .summary-label { font-size: 12px; opacity: 0.9; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Relevé de Commissions</h1>
        <div class="meta">
          ${user.cabinet_name || `${user.first_name} ${user.last_name}`}<br>
          ${monthNames[month]} ${year}
        </div>
      </div>
  `

  let grandTotalExpected = 0
  let grandTotalReceived = 0

  for (const [insurer, data] of Object.entries(byInsurer)) {
    html += `
      <h2>${insurer}</h2>
      <table>
        <tr>
          <th>Contrat</th>
          <th>Client</th>
          <th class="amount">Attendu</th>
          <th class="amount">Reçu</th>
          <th class="amount">Écart</th>
        </tr>
    `

    for (const item of data.items) {
      const expected = centsToEuros(item.expected_amount_cents)
      const received = centsToEuros(item.received_amount_cents)
      const variance = received - expected
      const varianceClass = variance >= 0 ? 'positive' : 'negative'
      
      html += `
        <tr>
          <td>${item.contract_number || `#${item.contract_id}`}</td>
          <td>${item.client_name || '-'}</td>
          <td class="amount">${expected.toFixed(2)} €</td>
          <td class="amount">${received.toFixed(2)} €</td>
          <td class="amount ${varianceClass}">${variance >= 0 ? '+' : ''}${variance.toFixed(2)} €</td>
        </tr>
      `
    }

    const insurerVariance = centsToEuros(data.received - data.expected)
    const varianceClass = insurerVariance >= 0 ? 'positive' : 'negative'
    
    html += `
        <tr class="total">
          <td colspan="2">Total ${insurer}</td>
          <td class="amount">${centsToEuros(data.expected).toFixed(2)} €</td>
          <td class="amount">${centsToEuros(data.received).toFixed(2)} €</td>
          <td class="amount ${varianceClass}">${insurerVariance >= 0 ? '+' : ''}${insurerVariance.toFixed(2)} €</td>
        </tr>
      </table>
    `

    grandTotalExpected += data.expected
    grandTotalReceived += data.received
  }

  const grandVariance = centsToEuros(grandTotalReceived - grandTotalExpected)
  
  html += `
      <div class="summary">
        <h3>Récapitulatif</h3>
        <div class="summary-grid">
          <div class="summary-item">
            <div class="summary-value">${centsToEuros(grandTotalExpected).toFixed(2)} €</div>
            <div class="summary-label">Total Attendu</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${centsToEuros(grandTotalReceived).toFixed(2)} €</div>
            <div class="summary-label">Total Reçu</div>
          </div>
          <div class="summary-item">
            <div class="summary-value">${grandVariance >= 0 ? '+' : ''}${grandVariance.toFixed(2)} €</div>
            <div class="summary-label">Écart Total</div>
          </div>
        </div>
      </div>
      <p style="margin-top: 30px; color: #94A3B8; font-size: 12px; text-align: center;">
        Généré le ${new Date().toLocaleDateString('fr-FR')} par COURTIA
      </p>
    </body>
    </html>
  `

  // Générer le PDF
  const pdf = await generatePDF(html, {
    format: 'A4',
    margin: { top: 20, right: 20, bottom: 20, left: 20 }
  })

  return {
    pdf,
    filename: `releve_commissions_${year}_${String(month).padStart(2, '0')}.pdf`,
    summary: {
      total_expected_eur: centsToEuros(grandTotalExpected),
      total_received_eur: centsToEuros(grandTotalReceived),
      variance_eur: grandVariance,
      commissions_count: commissionsRes.rows.length,
      insurers_count: Object.keys(byInsurer).length
    }
  }
}

module.exports = {
  getApplicableRules,
  upsertRule,
  listRules,
  calculateCommission,
  calculatePeriodCommissions,
  reconcileMonth,
  generateStatement
}
