// ============================================================
// /srv/courtia/backend/src/services/ddaAudit.js
// KILLER FEATURE #9 — DDA Auto-Audit
// Vérifie la conformité Directive Distribution Assurance pour chaque dossier
// Génère un PDF horodaté exportable (ACPR-ready)
// ============================================================

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const pool = require('../db');

const deepseek = new OpenAI({ baseURL: 'https://api.deepseek.com', apiKey: process.env.DEEPSEEK_API_KEY });

const REPORTS_DIR = process.env.DDA_REPORTS_DIR || '/srv/courtia/backend/reports/dda';
if (!fs.existsSync(REPORTS_DIR)) fs.mkdirSync(REPORTS_DIR, { recursive: true });

// 9 checks DDA exigibles
const DDA_CHECKS = [
  { id: 'identite_client', label: 'Identité client complète et vérifiée', weight: 10, required: true },
  { id: 'questionnaire_besoins', label: 'Questionnaire des besoins et exigences', weight: 15, required: true },
  { id: 'consentement_rgpd', label: 'Consentement RGPD horodaté', weight: 10, required: true },
  { id: 'capacite_financiere', label: 'Évaluation capacité financière client', weight: 10, required: true },
  { id: 'recommandation_justifiee', label: 'Recommandation tracée et justifiée par écrit', weight: 15, required: true },
  { id: 'ipid_envoye', label: 'Document IPID/IPID-IP fourni au client', weight: 10, required: true },
  { id: 'devoir_conseil', label: 'Devoir de conseil documenté', weight: 10, required: true },
  { id: 'documents_obligatoires', label: 'Documents obligatoires du produit reçus', weight: 10, required: true },
  { id: 'historique_horodate', label: 'Historique d\'échanges horodaté complet', weight: 10, required: false }
];

async function loadDossierContext(clientId, pool) {
  const [client, documents, opportunites, contrats, devis, relances, conformiteFields] = await Promise.all([
    pool.query(`SELECT * FROM clients WHERE id=$1`, [clientId]),
    pool.query(`SELECT document_type, status, uploaded_at FROM client_documents WHERE client_id=$1`, [clientId]),
    pool.query(`SELECT * FROM opportunites WHERE client_id=$1`, [clientId]),
    pool.query(`SELECT * FROM contrats WHERE client_id=$1`, [clientId]).catch(() => ({ rows: [] })),
    pool.query(`SELECT id, produit, montant_prime, date_envoi, justification FROM devis WHERE client_id=$1`, [clientId]).catch(() => ({ rows: [] })),
    pool.query(`SELECT COUNT(*) cnt, MIN(created_at) first_interaction FROM relances WHERE client_id=$1`, [clientId]),
    pool.query(`SELECT * FROM client_conformite WHERE client_id=$1`, [clientId]).catch(() => ({ rows: [] }))
  ]);

  return {
    client: client.rows[0],
    documents: documents.rows,
    opportunites: opportunites.rows,
    contrats: contrats.rows,
    devis: devis.rows,
    relances_count: parseInt(relances.rows[0]?.cnt || 0),
    first_interaction: relances.rows[0]?.first_interaction,
    conformite_fields: conformiteFields.rows[0] || {}
  };
}

function evaluateChecks(ctx) {
  const checks = {};
  const { client, documents, opportunites, devis, contrats, conformite_fields } = ctx;

  // identite_client
  checks.identite_client = {
    ...DDA_CHECKS[0],
    status: client?.last_name && client?.email && client?.phone && client?.address ? 'ok' : 'missing',
    detail: !client?.last_name ? 'Nom manquant' :
            !client?.email ? 'Email manquant' :
            !client?.phone ? 'Téléphone manquant' :
            !client?.address ? 'Adresse manquante' : 'Identité complète',
    evidence: client ? `${client.last_name} ${client.first_name || ''} — ${client.email}` : null
  };

  // questionnaire_besoins
  const hasQuestionnaire = documents.some(d => d.document_type?.toLowerCase().includes('questionnaire') || d.document_type?.toLowerCase().includes('besoins'))
    || conformite_fields?.questionnaire_besoins_signe;
  checks.questionnaire_besoins = {
    ...DDA_CHECKS[1],
    status: hasQuestionnaire ? 'ok' : 'missing',
    detail: hasQuestionnaire ? 'Questionnaire détecté' : 'Aucun questionnaire des besoins trouvé',
    evidence: hasQuestionnaire ? 'Document présent' : null
  };

  // consentement_rgpd
  const hasRgpd = conformite_fields?.rgpd_consent_at || documents.some(d => d.document_type?.toLowerCase().includes('rgpd'));
  checks.consentement_rgpd = {
    ...DDA_CHECKS[2],
    status: hasRgpd ? 'ok' : 'missing',
    detail: hasRgpd ? `Consentement reçu ${conformite_fields?.rgpd_consent_at ? `le ${new Date(conformite_fields.rgpd_consent_at).toLocaleDateString('fr')}` : ''}` : 'Aucun consentement RGPD horodaté',
    evidence: conformite_fields?.rgpd_consent_at || null
  };

  // capacite_financiere
  const hasCapacite = client?.profession || conformite_fields?.capacite_evaluee;
  checks.capacite_financiere = {
    ...DDA_CHECKS[3],
    status: hasCapacite ? 'ok' : (client?.type === 'pro' ? 'partial' : 'missing'),
    detail: hasCapacite ? 'Capacité financière documentée' : 'CSP/revenus non renseignés',
    evidence: client?.profession || null
  };

  // recommandation_justifiee
  const devisAvecJustification = devis.filter(d => d.justification && d.justification.length > 30);
  checks.recommandation_justifiee = {
    ...DDA_CHECKS[4],
    status: devisAvecJustification.length > 0 ? 'ok' : (devis.length > 0 ? 'partial' : 'missing'),
    detail: devisAvecJustification.length > 0 ? `${devisAvecJustification.length} devis avec justification écrite` :
            devis.length > 0 ? `${devis.length} devis sans justification écrite` : 'Aucun devis tracé',
    evidence: devisAvecJustification[0]?.justification?.slice(0, 80) || null
  };

  // ipid_envoye
  const hasIpid = documents.some(d => /ipid/i.test(d.document_type || ''));
  checks.ipid_envoye = {
    ...DDA_CHECKS[5],
    status: hasIpid ? 'ok' : (opportunites.length === 0 ? 'na' : 'missing'),
    detail: hasIpid ? 'IPID/IPID-IP présent dans la GED' : 'Aucun IPID tracé pour ce client',
    evidence: hasIpid ? 'Document IPID' : null
  };

  // devoir_conseil
  const hasConseil = conformite_fields?.devoir_conseil_rempli || documents.some(d => d.document_type?.toLowerCase().includes('conseil'));
  checks.devoir_conseil = {
    ...DDA_CHECKS[6],
    status: hasConseil ? 'ok' : 'missing',
    detail: hasConseil ? 'Devoir de conseil documenté' : 'Document devoir de conseil manquant',
    evidence: null
  };

  // documents_obligatoires (selon type produit)
  const hasContrats = contrats.length > 0;
  const docsManquants = documents.filter(d => d.status === 'manquant').map(d => d.document_type);
  checks.documents_obligatoires = {
    ...DDA_CHECKS[7],
    status: docsManquants.length === 0 && hasContrats ? 'ok' : (docsManquants.length > 0 ? 'missing' : 'partial'),
    detail: docsManquants.length === 0 ? 'Tous les documents obligatoires sont présents' : `${docsManquants.length} document(s) manquant(s)`,
    evidence: docsManquants.length > 0 ? docsManquants.join(', ') : null
  };

  // historique_horodate
  checks.historique_horodate = {
    ...DDA_CHECKS[8],
    status: ctx.relances_count > 0 || opportunites.length > 0 ? 'ok' : 'partial',
    detail: `${ctx.relances_count} interactions tracées`,
    evidence: ctx.first_interaction ? new Date(ctx.first_interaction).toLocaleDateString('fr') : null
  };

  return checks;
}

function computeScore(checks) {
  let earned = 0;
  let total = 0;
  const missing = [];
  const redFlags = [];

  for (const id of Object.keys(checks)) {
    const c = checks[id];
    total += c.weight;
    if (c.status === 'ok') earned += c.weight;
    else if (c.status === 'partial') earned += c.weight * 0.5;
    else if (c.status === 'na') total -= c.weight;
    else if (c.status === 'missing' && c.required) {
      missing.push({ check: c.label, detail: c.detail });
      redFlags.push(c.id);
    }
  }

  const score = total > 0 ? Math.round((earned / total) * 100) : 0;
  let level = 'non_conforme';
  let risk = 'critique';
  if (score >= 90) { level = 'conforme'; risk = 'faible'; }
  else if (score >= 70) { level = 'partiel'; risk = 'modere'; }
  else if (score >= 50) { level = 'partiel'; risk = 'eleve'; }

  return { score, level, risk, missing, red_flags: redFlags };
}

async function generateRecommendations(ctx, checks, scoreResult) {
  if (scoreResult.missing.length === 0) return ['Dossier conforme — aucun écart majeur.'];

  try {
    const prompt = `Tu es expert conformité DDA assurance courtage France.
Client : ${ctx.client.last_name} ${ctx.client.first_name || ''} — ${ctx.client.type}
Score conformité : ${scoreResult.score}/100 (${scoreResult.level})

POINTS NON CONFORMES :
${scoreResult.missing.map((m, i) => `${i + 1}. ${m.check} → ${m.detail}`).join('\n')}

JSON STRICT :
{
  "recommendations": [
    "5 recommandations courtes, actionnables, priorisées, max 15 mots chacune"
  ],
  "urgence_globale": "haute|moyenne|basse",
  "risque_acpr": "string courte décrivant le risque si contrôle ACPR"
}`;
    const c = await deepseek.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 500
    });
    return JSON.parse(c.choices[0].message.content);
  } catch (e) {
    return { recommendations: scoreResult.missing.map(m => `Compléter : ${m.check}`), urgence_globale: 'moyenne', risque_acpr: 'Risque modéré' };
  }
}

async function generatePdfReport(clientId, audit, ctx) {
  const filename = `dda_${clientId}_${Date.now()}.pdf`;
  const filepath = path.join(REPORTS_DIR, filename);
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(fs.createWriteStream(filepath));

  const navy = '#0F172A';
  const cyan = '#06B6D4';
  const gold = '#D4AF37';
  const red = '#DC2626';
  const amber = '#F59E0B';
  const emerald = '#10B981';

  // Header
  doc.fillColor(navy).rect(0, 0, 595, 90).fill();
  doc.fillColor('white').fontSize(22).text('COURTIA', 50, 28, { continued: true })
     .fillColor(cyan).text(' — Rapport de conformité DDA', { continued: false });
  doc.fillColor('white').fontSize(10).text(`Généré le ${new Date().toLocaleString('fr-FR')}`, 50, 60);

  // Client info
  doc.fillColor(navy).fontSize(14).text('Client analysé', 50, 110);
  doc.fillColor('#475569').fontSize(11).text(`${ctx.client.last_name} ${ctx.client.first_name || ''}`, 50, 130);
  doc.text(`Type : ${ctx.client.type} — ${ctx.client.profession || 'n/a'}`);
  doc.text(`Email : ${ctx.client.email || 'n/a'}  •  Tél : ${ctx.client.phone || 'n/a'}`);

  // Score gauge
  const scoreColor = audit.global_score >= 90 ? emerald : audit.global_score >= 70 ? amber : red;
  doc.roundedRect(400, 110, 145, 70, 8).fillColor(navy).fill();
  doc.fillColor('white').fontSize(10).text('SCORE GLOBAL', 415, 122);
  doc.fillColor(scoreColor).fontSize(36).text(`${audit.global_score}`, 415, 138, { continued: true });
  doc.fillColor('#94A3B8').fontSize(14).text('/100');
  doc.fillColor('white').fontSize(9).text(audit.compliance_level.toUpperCase(), 415, 168);

  // Checks
  doc.moveDown(2);
  doc.fillColor(navy).fontSize(14).text('Points vérifiés', 50, 210);
  let y = 235;
  for (const [, check] of Object.entries(audit.checks)) {
    const statusColor = check.status === 'ok' ? emerald : check.status === 'partial' ? amber : check.status === 'na' ? '#94A3B8' : red;
    const statusLabel = check.status === 'ok' ? '✓ OK' : check.status === 'partial' ? '◐ Partiel' : check.status === 'na' ? '— N/A' : '✗ Manquant';
    doc.fillColor(statusColor).fontSize(10).text(statusLabel, 50, y, { width: 80 });
    doc.fillColor(navy).fontSize(10).text(check.label, 135, y, { width: 280 });
    doc.fillColor('#64748B').fontSize(9).text(check.detail, 135, y + 13, { width: 360 });
    doc.fillColor(scoreColor).fontSize(9).text(`${check.weight} pts`, 510, y, { width: 40, align: 'right' });
    y += 38;
    if (y > 730) { doc.addPage(); y = 60; }
  }

  // Recommandations
  if (y > 600) { doc.addPage(); y = 60; }
  doc.moveDown();
  doc.fillColor(navy).fontSize(14).text('Recommandations ARK', 50, y + 10);
  y += 35;
  const recs = audit.recommendations?.recommendations || audit.recommendations || [];
  recs.forEach((r, i) => {
    doc.fillColor(cyan).fontSize(11).text(`${i + 1}.`, 50, y, { continued: true });
    doc.fillColor(navy).text(` ${r}`, { width: 495 });
    y += 22;
  });

  // Footer
  doc.fontSize(8).fillColor('#94A3B8').text(
    `COURTIA — Rapport conformité DDA généré automatiquement le ${new Date().toLocaleString('fr-FR')} — Document à valeur indicative pour la traçabilité interne du courtier. Ne se substitue pas à un audit ACPR formel.`,
    50, 770, { width: 495, align: 'center' }
  );

  doc.end();
  return filepath;
}

async function auditClient(clientId, userId) {
  const ctx = await loadDossierContext(clientId, pool);
  if (!ctx.client) throw new Error('Client introuvable');

  const checks = evaluateChecks(ctx);
  const scoreResult = computeScore(checks);
  const recommendations = await generateRecommendations(ctx, checks, scoreResult);

  const audit = {
    client_id: clientId,
    user_id: userId,
    global_score: scoreResult.score,
    compliance_level: scoreResult.level,
    risk_level: scoreResult.risk,
    checks,
    missing_items: scoreResult.missing,
    red_flags: scoreResult.red_flags,
    recommendations
  };

  const pdfPath = await generatePdfReport(clientId, audit, ctx);
  audit.report_pdf_path = pdfPath;

  await pool.query(`
    INSERT INTO dda_audits (client_id, user_id, global_score, compliance_level, risk_level, checks, missing_items, red_flags, recommendations, report_pdf_path, audited_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW())
    ON CONFLICT (client_id) DO UPDATE SET
      global_score=$3, compliance_level=$4, risk_level=$5, checks=$6, missing_items=$7, red_flags=$8, recommendations=$9, report_pdf_path=$10, audited_at=NOW()
  `, [clientId, userId, audit.global_score, audit.compliance_level, audit.risk_level,
      JSON.stringify(audit.checks), JSON.stringify(audit.missing_items), JSON.stringify(audit.red_flags),
      JSON.stringify(audit.recommendations), pdfPath]);

  await pool.query(`
    INSERT INTO dda_audit_history (client_id, user_id, score, compliance_level, snapshot, audited_at)
    VALUES ($1,$2,$3,$4,$5,NOW())
  `, [clientId, userId, audit.global_score, audit.compliance_level, JSON.stringify({ checks: audit.checks, missing: audit.missing_items })]);

  return audit;
}

async function batchAudit(userId) {
  const clients = await pool.query(`SELECT id FROM clients WHERE courtier_id=$1 AND status='actif'`, [userId]);
  const results = [];
  for (let i = 0; i < clients.rows.length; i += 3) {
    const batch = clients.rows.slice(i, i + 3);
    const audited = await Promise.all(batch.map(c => auditClient(c.id, userId).catch(() => null)));
    results.push(...audited.filter(Boolean));
  }
  return { audited_count: results.length, average_score: Math.round(results.reduce((s, a) => s + a.global_score, 0) / Math.max(results.length, 1)) };
}

async function getAuditDashboard(userId) {
  const r = await pool.query(`
    SELECT
      COUNT(*) total,
      COUNT(*) FILTER (WHERE compliance_level='conforme') conforme,
      COUNT(*) FILTER (WHERE compliance_level='partiel') partiel,
      COUNT(*) FILTER (WHERE compliance_level='non_conforme') non_conforme,
      AVG(global_score)::int avg_score,
      COUNT(*) FILTER (WHERE risk_level IN ('eleve','critique')) at_risk
    FROM dda_audits WHERE user_id=$1
  `, [userId]);

  const worst = await pool.query(`
    SELECT da.*, c.last_name||' '||COALESCE(c.first_name,'') client_name
    FROM dda_audits da JOIN clients c ON c.id=da.client_id
    WHERE da.user_id=$1 ORDER BY da.global_score ASC LIMIT 10
  `, [userId]);

  return { stats: r.rows[0], worst: worst.rows };
}

module.exports = { auditClient, batchAudit, getAuditDashboard, generatePdfReport };
