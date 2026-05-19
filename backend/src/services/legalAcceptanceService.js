     1|const pool = require('../db');
     2|
     3|const DEFAULT_DOC_VERSIONS = {
     4|  cgv: 'draft-2026-05',
     5|  privacy: 'draft-2026-05',
     6|  dpa: 'draft-2026-05',
     7|};
     8|
     9|function ensureRequiredConsents(payload = {}) {
    10|  const normalized = {
    11|    accept_cgv: payload.accept_cgv ?? payload.accepted_cgv,
    12|    accept_privacy: payload.accept_privacy ?? payload.accepted_privacy,
    13|    accept_dpa: payload.accept_dpa ?? payload.accepted_dpa,
    14|    15|    accept_renewal: payload.accept_renewal ?? payload.accepted_renewal,
    16|  };
    17|
    18|  const checks = [
    19|    ['accept_cgv', 'CGV'],
    20|    ['accept_privacy', 'Politique de confidentialité'],
    21|    ['accept_dpa', 'DPA'],
    22|    23|    ['accept_renewal', 'Renouvellement automatique'],
    24|  ];
    25|
    26|  for (const [key, label] of checks) {
    27|    if (!normalized[key]) {
    28|      const err = new Error(`Consentement obligatoire manquant: ${label}`);
    29|      err.code = 'CONSENT_REQUIRED';
    30|      throw err;
    31|    }
    32|  }
    33|
    34|  return normalized;
    35|}
    36|
    37|async function ensureLegalDocumentSeed() {
    38|  await pool.query(
    39|    `INSERT INTO legal_documents (doc_type, version, title, is_active, published_at)
    40|     VALUES
    41|      ('cgv', $1, 'CGV SaaS B2B (draft)', TRUE, NOW()),
    42|      ('privacy', $2, 'Politique de confidentialité (draft)', TRUE, NOW()),
    43|      ('dpa', $3, 'DPA (draft)', TRUE, NOW())
    44|     ON CONFLICT (doc_type, version) DO NOTHING`,
    45|    [
    46|      DEFAULT_DOC_VERSIONS.cgv,
    47|      DEFAULT_DOC_VERSIONS.privacy,
    48|      DEFAULT_DOC_VERSIONS.dpa,
    49|    ]
    50|  );
    51|}
    52|
    53|async function recordLegalAcceptance({
    54|  organizationId,
    55|  userId,
    56|  payload,
    57|  ip,
    58|  userAgent,
    59|  planCode,
    60|}) {
    61|  const normalizedConsents = ensureRequiredConsents(payload);
    62|  await ensureLegalDocumentSeed();
    63|
    64|  const cgvVersion = payload.cgv_version || DEFAULT_DOC_VERSIONS.cgv;
    65|  const privacyVersion = payload.privacy_version || DEFAULT_DOC_VERSIONS.privacy;
    66|  const dpaVersion = payload.dpa_version || DEFAULT_DOC_VERSIONS.dpa;
    67|
    68|  const ctx = {
    69|    plan_code: planCode,
    70|    71|    accepted_renewal: !!normalizedConsents.accept_renewal,
    72|    accepted_cgv: !!normalizedConsents.accept_cgv,
    73|    accepted_privacy: !!normalizedConsents.accept_privacy,
    74|    accepted_dpa: !!normalizedConsents.accept_dpa,
    75|    billing_mode: process.env.BILLING_MODE || 'test',
    76|    accepted_at: new Date().toISOString(),
    77|  };
    78|
    79|  const rows = [];
    80|  const docs = [
    81|    ['cgv', cgvVersion],
    82|    ['privacy', privacyVersion],
    83|    ['dpa', dpaVersion],
    84|    85|    ['renewal_consent', 'v1'],
    86|  ];
    87|
    88|  for (const [docType, version] of docs) {
    89|    const inserted = await pool.query(
    90|      `INSERT INTO legal_acceptances (
    91|        organization_id, user_id, doc_type, doc_version, accepted_at, ip, user_agent, consent_context_json
    92|      )
    93|      VALUES ($1,$2,$3,$4,NOW(),$5,$6,$7::jsonb)
    94|      RETURNING id, doc_type, doc_version, accepted_at`,
    95|      [
    96|        organizationId,
    97|        userId,
    98|        docType,
    99|        version,
   100|        ip || null,
   101|        userAgent || null,
   102|        JSON.stringify(ctx),
   103|      ]
   104|    );
   105|    rows.push(inserted.rows[0]);
   106|  }
   107|
   108|  return {
   109|    acceptance_id: rows[0]?.id || null,
   110|    accepted_docs: rows,
   111|  };
   112|}
   113|
   114|async function getLatestAcceptance(organizationId, userId, planCode) {
   115|  const result = await pool.query(
   116|    `SELECT id, doc_type, doc_version, accepted_at, consent_context_json
   117|     FROM legal_acceptances
   118|     WHERE organization_id=$1 AND user_id=$2
   119|     ORDER BY accepted_at DESC, id DESC
   120|     LIMIT 20`,
   121|    [organizationId, userId]
   122|  );
   123|  if (!result.rows.length) return null;
   124|
   125|   126|  const foundRenewal = result.rows.find((r) => r.doc_type === 'renewal_consent');
   127|  const foundCgv = result.rows.find((r) => r.doc_type === 'cgv');
   128|  const foundPrivacy = result.rows.find((r) => r.doc_type === 'privacy');
   129|  const foundDpa = result.rows.find((r) => r.doc_type === 'dpa');
   130|
   131|  if (!foundRenewal || !foundCgv || !foundPrivacy || !foundDpa) {
   132|    return null;
   133|  }
   134|
   135|  const planOk = foundTrial.consent_context_json?.plan_code === planCode;
   136|  if (!planOk) return null;
   137|
   138|  return {
   139|    legal_acceptance_id: foundTrial.id,
   140|    accepted_at: foundTrial.accepted_at,
   141|    docs: [foundCgv, foundPrivacy, foundDpa, foundRenewal],
   142|  };
   143|}
   144|
   145|module.exports = {
   146|  ensureRequiredConsents,
   147|  ensureLegalDocumentSeed,
   148|  recordLegalAcceptance,
   149|  getLatestAcceptance,
   150|};
   151|