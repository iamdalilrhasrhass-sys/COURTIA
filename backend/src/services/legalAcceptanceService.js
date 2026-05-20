const pool = require('../db');

const DEFAULT_DOC_VERSIONS = {
  cgv: 'draft-2026-05',
  privacy: 'draft-2026-05',
  dpa: 'draft-2026-05',
};

function ensureRequiredConsents(payload = {}) {
  const normalized = {
    accept_cgv: payload.accept_cgv ?? payload.accepted_cgv,
    accept_privacy: payload.accept_privacy ?? payload.accepted_privacy,
    accept_dpa: payload.accept_dpa ?? payload.accepted_dpa,
    accept_renewal: payload.accept_renewal ?? payload.accepted_renewal,
  };

  const checks = [
    ['accept_cgv', 'CGV'],
    ['accept_privacy', 'Politique de confidentialité'],
    ['accept_dpa', 'DPA'],
    ['accept_renewal', 'Renouvellement automatique'],
  ];

  for (const [key, label] of checks) {
    if (!normalized[key]) {
      const err = new Error(`Consentement obligatoire manquant: ${label}`);
      err.code = 'CONSENT_REQUIRED';
      throw err;
    }
  }

  return normalized;
}

async function ensureLegalDocumentSeed() {
  await pool.query(
    `INSERT INTO legal_documents (doc_type, version, title, is_active, published_at)
     VALUES
      ('cgv', $1, 'CGV SaaS B2B (draft)', TRUE, NOW()),
      ('privacy', $2, 'Politique de confidentialité (draft)', TRUE, NOW()),
      ('dpa', $3, 'DPA (draft)', TRUE, NOW())
     ON CONFLICT (doc_type, version) DO NOTHING`,
    [
      DEFAULT_DOC_VERSIONS.cgv,
      DEFAULT_DOC_VERSIONS.privacy,
      DEFAULT_DOC_VERSIONS.dpa,
    ]
  );
}

async function recordLegalAcceptance({
  organizationId,
  userId,
  payload,
  ip,
  userAgent,
  planCode,
}) {
  const normalizedConsents = ensureRequiredConsents(payload);
  await ensureLegalDocumentSeed();

  const cgvVersion = payload.cgv_version || DEFAULT_DOC_VERSIONS.cgv;
  const privacyVersion = payload.privacy_version || DEFAULT_DOC_VERSIONS.privacy;
  const dpaVersion = payload.dpa_version || DEFAULT_DOC_VERSIONS.dpa;

  const ctx = {
    plan_code: planCode,
    accepted_renewal: !!normalizedConsents.accept_renewal,
    accepted_cgv: !!normalizedConsents.accept_cgv,
    accepted_privacy: !!normalizedConsents.accept_privacy,
    accepted_dpa: !!normalizedConsents.accept_dpa,
    billing_mode: process.env.BILLING_MODE || 'test',
    accepted_at: new Date().toISOString(),
  };

  const rows = [];
  const docs = [
    ['cgv', cgvVersion],
    ['privacy', privacyVersion],
    ['dpa', dpaVersion],
    ['renewal_consent', 'v1'],
  ];

  for (const [docType, version] of docs) {
    const inserted = await pool.query(
      `INSERT INTO legal_acceptances (
        organization_id, user_id, doc_type, doc_version, accepted_at, ip, user_agent, consent_context_json
      )
      VALUES ($1,$2,$3,$4,NOW(),$5,$6,$7::jsonb)
      RETURNING id, doc_type, doc_version, accepted_at`,
      [
        organizationId,
        userId,
        docType,
        version,
        ip || null,
        userAgent || null,
        JSON.stringify(ctx),
      ]
    );
    rows.push(inserted.rows[0]);
  }

  return {
    acceptance_id: rows[0]?.id || null,
    accepted_docs: rows,
  };
}

async function getLatestAcceptance(organizationId, userId, planCode) {
  const result = await pool.query(
    `SELECT id, doc_type, doc_version, accepted_at, consent_context_json
     FROM legal_acceptances
     WHERE organization_id=$1 AND user_id=$2
     ORDER BY accepted_at DESC, id DESC
     LIMIT 20`,
    [organizationId, userId]
  );
  if (!result.rows.length) return null;

  const foundRenewal = result.rows.find((r) => r.doc_type === 'renewal_consent');
  const foundCgv = result.rows.find((r) => r.doc_type === 'cgv');
  const foundPrivacy = result.rows.find((r) => r.doc_type === 'privacy');
  const foundDpa = result.rows.find((r) => r.doc_type === 'dpa');

  if (!foundRenewal || !foundCgv || !foundPrivacy || !foundDpa) {
    return null;
  }

  const planOk = foundTrial.consent_context_json?.plan_code === planCode;
  if (!planOk) return null;

  return {
    legal_acceptance_id: foundTrial.id,
    accepted_at: foundTrial.accepted_at,
    docs: [foundCgv, foundPrivacy, foundDpa, foundRenewal],
  };
}

module.exports = {
  ensureRequiredConsents,
  ensureLegalDocumentSeed,
  recordLegalAcceptance,
  getLatestAcceptance,
};
