/**
 * arkBrief — Brief matinal du courtier, calculé sur données réelles.
 * Reconstruit le 03/07/2026 : le module original n'avait jamais été versionné.
 * Consommé par arkVoice.buildMorningBriefAssistant (appel vocal ARK).
 */

async function safeQuery(pool, sql, params) {
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (_) {
    return [];
  }
}

async function generateMorningBrief(userId, pool) {
  // 1. Relances en attente d'envoi
  const relances = await safeQuery(pool, `
    SELECT r.priority, r.subject, r.channel,
           COALESCE(NULLIF(c.company_name, ''), TRIM(CONCAT(c.first_name, ' ', c.last_name))) AS client_name
    FROM relances r
    LEFT JOIN clients c ON r.client_id = c.id
    WHERE r.broker_id = $1 AND r.status <> 'sent'
    ORDER BY CASE r.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, r.created_at ASC
    LIMIT 5`, [userId]);

  // 2. Échéances de contrats sous 30 jours (quotes actives)
  const echeances = await safeQuery(pool, `
    SELECT TRIM(CONCAT(c.first_name, ' ', c.last_name)) AS client_name,
           q.quote_data->>'type_contrat' AS type_contrat,
           NULLIF(q.quote_data->>'prime_annuelle', '')::decimal AS prime,
           EXTRACT(DAY FROM NULLIF(q.quote_data->>'date_echeance', '')::date - NOW())::int AS jours
    FROM quotes q
    JOIN clients c ON q.client_id = c.id
    WHERE c.courtier_id = $1 AND q.status = 'actif'
      AND NULLIF(q.quote_data->>'date_echeance', '')::date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
    ORDER BY jours ASC
    LIMIT 5`, [userId]);

  // 3. Clients récents sans contrat actif (opportunités)
  const sansContrat = await safeQuery(pool, `
    SELECT TRIM(CONCAT(c.first_name, ' ', c.last_name)) AS client_name
    FROM clients c
    WHERE c.courtier_id = $1
      AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.client_id = c.id AND q.status = 'actif')
    ORDER BY c.created_at DESC
    LIMIT 3`, [userId]);

  const actions = [];
  echeances.forEach((e) => actions.push({
    priority: (e.jours ?? 99) <= 7 ? 1 : 2,
    action: "Préparer le renouvellement " + (e.type_contrat || "contrat") + " (échéance dans " + e.jours + " j)",
    client_name: e.client_name || "Client",
    expected_value: Math.round(Number(e.prime) || 0),
    estimated_minutes: 15,
    reason: "Échéance contrat dans " + e.jours + " jours",
  }));
  relances.forEach((r) => actions.push({
    priority: r.priority === "high" ? 1 : r.priority === "medium" ? 2 : 3,
    action: r.subject
      ? "Envoyer la relance « " + r.subject + " » (" + (r.channel || "email") + ")"
      : "Envoyer la relance " + (r.channel || "email"),
    client_name: r.client_name || "Client",
    expected_value: 0,
    estimated_minutes: 5,
    reason: "Relance en attente d'envoi",
  }));
  sansContrat.forEach((c) => actions.push({
    priority: 3,
    action: "Proposer un premier contrat",
    client_name: c.client_name || "Prospect",
    expected_value: 0,
    estimated_minutes: 10,
    reason: "Client sans contrat actif",
  }));

  actions.sort((a, b) => a.priority - b.priority);
  const top = actions.slice(0, 6);
  const revenue_potential = top.reduce((s, a) => s + (a.expected_value || 0), 0);

  const headline = top.length
    ? "Tu as " + top.length + " action" + (top.length > 1 ? "s" : "") + " prioritaire" + (top.length > 1 ? "s" : "") + " aujourd'hui" + (revenue_potential ? ", pour environ " + revenue_potential + " euros de potentiel." : ".")
    : "Journée calme : aucune action urgente détectée. Bon moment pour prospecter.";

  const summary = [
    echeances.length + " échéance(s) de contrat sous 30 jours.",
    relances.length + " relance(s) en attente d'envoi.",
    sansContrat.length + " client(s) récent(s) sans contrat actif.",
  ].join(" ");

  return { headline, summary, actions: top, revenue_potential };
}

module.exports = { generateMorningBrief };
