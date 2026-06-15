const express = require('express')
const pool = require('../db')
const { COUNTRIES, getCountryConfig, normalizeCountryCode } = require('../config/countries')
const { generateCloserContract } = require('../services/contractService')
const {
  buildCommissionPreview,
  buildCommissionSchedule,
  calculateCloserCommission,
  generateReferralCode,
  getPricingSnapshot,
  normalizeClientType,
  shouldClawBackSetup,
} = require('../services/globalExpansionService')

const router = express.Router()

function publicCountryConfig(country) {
  return {
    code: country.code,
    name: country.name,
    flag: country.flag,
    currency: country.currency,
    currencySym: country.currencySym,
    setupFee: country.setupFee,
    monthlyFee: country.monthlyFee,
    plans: country.plans,
    segments: country.segments,
    compliance: country.compliance,
    languages: country.languages,
    supportsInsurers: country.supportsInsurers,
    closer: {
      setupPct: country.closer.setupPct,
      mrrPct: country.closer.mrrPct,
      mrrMonths: country.closer.mrrMonths,
      legalType: country.closer.legalType,
      legalNote: country.closer.legalNote,
    },
  }
}

function pickCloserPatch(body) {
  const allowed = ['full_name', 'phone', 'status', 'notes', 'us_segment', 'contract_signed_at']
  const patch = {}
  for (const key of allowed) {
    if (body[key] !== undefined) patch[key] = body[key]
  }
  return patch
}

async function findCloserByReferralCode(referralCode) {
  if (!referralCode) return null
  const result = await pool.query(
    'SELECT * FROM closers WHERE LOWER(referral_code) = LOWER($1) LIMIT 1',
    [String(referralCode).trim()],
  )
  return result.rows[0] || null
}

router.get('/countries', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM countries_config WHERE active = TRUE ORDER BY code')
    res.json({
      countries: result.rows,
      config: Object.values(COUNTRIES).map(publicCountryConfig),
    })
  } catch (err) {
    res.json({
      countries: Object.values(COUNTRIES).map((country) => ({
        code: country.code,
        name: country.name,
        currency: country.currency,
        currency_sym: country.currencySym,
        setup_fee: country.setupFee,
        monthly_fee: country.monthlyFee,
        supports_insurers: country.supportsInsurers,
        active: true,
      })),
      config: Object.values(COUNTRIES).map(publicCountryConfig),
      source: 'static-fallback',
    })
  }
})

router.get('/countries/:code/commission-preview', (req, res) => {
  try {
    const clientType = req.query.client_type || req.query.segment || 'broker'
    res.json(buildCommissionPreview(req.params.code, clientType))
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

router.post('/closers', async (req, res) => {
  const countryCode = normalizeCountryCode(req.body.country_code)
  const { full_name, email, phone, notes } = req.body
  const usSegment = req.body.us_segment || null
  const country = getCountryConfig(countryCode)

  if (!countryCode || !full_name || !email) {
    return res.status(400).json({ error: 'country_code, full_name et email sont requis' })
  }
  if (!country) {
    return res.status(400).json({ error: `Pays inconnu: ${countryCode}` })
  }
  if (countryCode === 'US' && !['broker', 'insurer', 'both'].includes(usSegment)) {
    return res.status(400).json({ error: 'us_segment requis pour US (broker|insurer|both)' })
  }

  const referralCode = generateReferralCode(full_name)

  try {
    const result = await pool.query(
      `INSERT INTO closers (country_code, full_name, email, phone, referral_code, us_segment, notes)
       VALUES ($1, $2, LOWER($3), $4, $5, $6, $7)
       RETURNING *`,
      [countryCode, full_name, email, phone || null, referralCode, usSegment, notes || null],
    )

    const closer = result.rows[0]
    const contractPdfUrl = await generateCloserContract(closer, country)

    const updated = await pool.query(
      'UPDATE closers SET contract_pdf_url = $1 WHERE id = $2 RETURNING *',
      [contractPdfUrl, closer.id],
    )

    res.status(201).json({
      ...updated.rows[0],
      commission_preview: buildCommissionPreview(countryCode, countryCode === 'US' && usSegment === 'insurer' ? 'insurer' : 'broker'),
    })
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email ou code de référence déjà enregistré' })
    res.status(500).json({ error: err.message })
  }
})

router.get('/closers', async (req, res) => {
  const params = []
  const filters = []

  if (req.query.country_code) {
    params.push(normalizeCountryCode(req.query.country_code))
    filters.push(`c.country_code = $${params.length}`)
  }
  if (req.query.status) {
    params.push(req.query.status)
    filters.push(`c.status = $${params.length}`)
  }

  const where = filters.length ? `WHERE ${filters.join(' AND ')}` : ''

  try {
    const result = await pool.query(
      `SELECT c.*, ces.active_deals, ces.total_paid, ces.pending_amount, ces.currency
       FROM closers c
       LEFT JOIN closer_earnings_summary ces ON ces.id = c.id
       ${where}
       ORDER BY c.created_at DESC`,
      params,
    )
    res.json({ closers: result.rows, total: result.rowCount })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/closers/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM closers WHERE id = $1', [req.params.id])
    if (!result.rows[0]) return res.status(404).json({ error: 'Closer introuvable' })
    res.json({ closer: result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.patch('/closers/:id', async (req, res) => {
  const patch = pickCloserPatch(req.body)
  const entries = Object.entries(patch)
  if (!entries.length) return res.status(400).json({ error: 'Aucun champ à modifier' })

  const sets = entries.map(([key], index) => `${key} = $${index + 1}`)
  const values = entries.map(([, value]) => value)
  values.push(req.params.id)

  try {
    const result = await pool.query(
      `UPDATE closers SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values,
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Closer introuvable' })
    res.json({ closer: result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.delete('/closers/:id', async (req, res) => {
  try {
    const result = await pool.query(
      "UPDATE closers SET status = 'terminated', updated_at = NOW() WHERE id = $1 RETURNING *",
      [req.params.id],
    )
    if (!result.rows[0]) return res.status(404).json({ error: 'Closer introuvable' })
    res.json({ closer: result.rows[0] })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/closers/:id/dashboard', async (req, res) => {
  try {
    const [closerResult, dealsResult, commissionsResult] = await Promise.all([
      pool.query('SELECT * FROM closers WHERE id = $1', [req.params.id]),
      pool.query('SELECT * FROM closer_deals WHERE closer_id = $1 ORDER BY signed_at DESC', [req.params.id]),
      pool.query('SELECT * FROM closer_commissions WHERE closer_id = $1 ORDER BY created_at DESC LIMIT 100', [req.params.id]),
    ])

    if (!closerResult.rows[0]) return res.status(404).json({ error: 'Closer introuvable' })

    const closer = closerResult.rows[0]
    const deals = dealsResult.rows
    const commissions = commissionsResult.rows
    const currency = getCountryConfig(closer.country_code)?.currency || closer.country_code

    res.json({
      closer,
      deals,
      commissions,
      stats: {
        totalDeals: deals.length,
        activeDeals: deals.filter((deal) => deal.status === 'active').length,
        totalPaid: commissions.filter((commission) => commission.status === 'paid').reduce((sum, commission) => sum + Number(commission.amount), 0),
        pendingAmount: commissions.filter((commission) => commission.status === 'pending').reduce((sum, commission) => sum + Number(commission.amount), 0),
        currency,
        referralLink: closer.referral_link,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/deals', async (req, res) => {
  const { client_name, client_email } = req.body
  const countryCode = normalizeCountryCode(req.body.country_code)
  const clientType = normalizeClientType(countryCode, req.body.client_type)
  let closerId = req.body.closer_id

  if (!closerId && req.body.referral_code) {
    const closer = await findCloserByReferralCode(req.body.referral_code)
    closerId = closer?.id
  }

  if (!closerId || !countryCode || !client_name || !client_email) {
    return res.status(400).json({ error: 'closer_id/referral_code, country_code, client_name et client_email sont requis' })
  }

  let pricing
  let commission
  try {
    pricing = getPricingSnapshot(countryCode, clientType)
    commission = calculateCloserCommission(countryCode, pricing)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const dealResult = await client.query(
      `INSERT INTO closer_deals
        (closer_id, country_code, client_name, client_email, client_type,
         setup_fee, monthly_fee, currency, setup_commission, mrr_commission, mrr_months_left, churn_guard_months)
       VALUES ($1,$2,$3,LOWER($4),$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        closerId,
        countryCode,
        client_name,
        client_email,
        clientType,
        pricing.setupFee,
        pricing.monthlyFee,
        pricing.currency,
        commission.setupCommission,
        commission.mrrCommission,
        commission.mrrMonths,
        pricing.churnGuardMonths,
      ],
    )
    const deal = dealResult.rows[0]
    const schedule = buildCommissionSchedule({
      closerId,
      dealId: deal.id,
      countryCode,
      clientType,
      signedAt: deal.signed_at,
    })

    for (const row of schedule) {
      await client.query(
        `INSERT INTO closer_commissions
          (closer_id, deal_id, commission_type, amount, currency, period_month, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [row.closer_id, row.deal_id, row.commission_type, row.amount, row.currency, row.period_month, row.status],
      )
    }

    await client.query('COMMIT')
    res.status(201).json({ deal, commission })
  } catch (err) {
    await client.query('ROLLBACK')
    if (err.code === '23503') return res.status(404).json({ error: 'Closer ou pays introuvable' })
    if (err.code === '23505') return res.status(409).json({ error: 'Client déjà enregistré pour ce closer' })
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

router.post('/deals/:id/churn', async (req, res) => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const dealResult = await client.query('SELECT * FROM closer_deals WHERE id = $1 FOR UPDATE', [req.params.id])
    const deal = dealResult.rows[0]
    if (!deal) {
      await client.query('ROLLBACK')
      return res.status(404).json({ error: 'Deal introuvable' })
    }

    const churnedAt = req.body.churned_at ? new Date(req.body.churned_at) : new Date()
    const clawBackSetup = shouldClawBackSetup({
      signedAt: deal.signed_at,
      churnedAt,
      guardMonths: deal.churn_guard_months,
    })

    await client.query(
      "UPDATE closer_deals SET status = 'churned', churned_at = $2 WHERE id = $1",
      [req.params.id, churnedAt],
    )

    if (clawBackSetup) {
      await client.query(
        `UPDATE closer_commissions
         SET status = 'clawed_back', claw_back_reason = 'Client churned before churn guard period'
         WHERE deal_id = $1 AND commission_type = 'setup' AND status = 'pending'`,
        [req.params.id],
      )
    }

    await client.query(
      `UPDATE closer_commissions
       SET status = 'clawed_back', claw_back_reason = 'Client churned'
       WHERE deal_id = $1 AND commission_type = 'mrr' AND status = 'pending' AND (period_month IS NULL OR period_month > CURRENT_DATE)`,
      [req.params.id],
    )

    await client.query('COMMIT')
    res.json({ message: 'Churn enregistré', churn_guard_applied: clawBackSetup })
  } catch (err) {
    await client.query('ROLLBACK')
    res.status(500).json({ error: err.message })
  } finally {
    client.release()
  }
})

router.get('/onboarding/:country_code/:client_type', async (req, res) => {
  const countryCode = normalizeCountryCode(req.params.country_code)
  try {
    const result = await pool.query(
      `SELECT * FROM onboarding_steps
       WHERE country_code = $1 AND client_type = $2
       ORDER BY step_order`,
      [countryCode, req.params.client_type],
    )

    if (!result.rows.length) return res.status(404).json({ error: 'Onboarding non configuré pour ce pays/type' })

    res.json({
      country: publicCountryConfig(getCountryConfig(countryCode)),
      client_type: req.params.client_type,
      steps: result.rows,
      total_steps: result.rowCount,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/referral/:code', async (req, res) => {
  try {
    const closer = await findCloserByReferralCode(req.params.code)
    if (!closer) return res.status(404).json({ error: 'Code invalide' })

    await pool.query(
      `INSERT INTO closer_referral_events (closer_id, referral_code, event_type, landing_path, user_agent, ip)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        closer.id,
        closer.referral_code,
        req.query.event || 'visit',
        req.query.path || req.get('referer') || null,
        req.get('user-agent') || null,
        req.ip,
      ],
    ).catch(() => null)

    res.json({
      valid: true,
      closer_id: closer.id,
      closer_name: closer.full_name,
      country: closer.country_code,
      referral_code: closer.referral_code,
      attribution_token: Buffer.from(`${closer.id}:${Date.now()}`).toString('base64'),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
