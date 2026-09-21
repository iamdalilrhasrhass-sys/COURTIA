/**
 * arkBrief — Brief matinal du courtier, calculé sur données réelles.
 * Reconstruit le 03/07/2026 : le module original n'avait jamais été versionné.
 * Consommé par arkVoice.buildMorningBriefAssistant (appel vocal ARK).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * PORTÉE DES TROIS LECTURES : LE CABINET, PAS LA SEULE PERSONNE
 * (correction du 21/09/2026 — défaut P1 « deux vérités pour une même donnée »)
 *
 * DÉFAUT MESURÉ : les trois requêtes filtraient `r.broker_id = $1` /
 * `c.courtier_id = $1`. Un collaborateur (`broker`) d'un cabinet à plusieurs
 * commerciaux recevait donc un brief matinal VIDE (« Journée calme : aucune
 * action urgente détectée ») là où le propriétaire du même cabinet recevait six
 * actions : le brief affirmait une absence d'activité qui n'existait pas.
 *
 * RÈGLE TENUE : les trois lectures passent par `lib/porteeCabinet` (seule
 * autorité de portée). La clause du fragment est EXACTEMENT la clause
 * historique (`r.broker_id = $1`) quand le compte n'a pas de cabinet — les
 * cabinets mono-utilisateur ne changent pas de comportement — et devient
 * `(<cabinet de la ligne> = ANY($1::uuid[]) OR <propriétaire> = $2)` sinon.
 * Un compte dont l'appartenance a été retirée ne lit plus rien.
 * `options` accepte `{ portee }` (portée déjà résolue par la route : aucune
 * requête supplémentaire) ou `{ req }`.
 * ────────────────────────────────────────────────────────────────────────────
 */

const porteeCabinet = require('../lib/porteeCabinet')

async function safeQuery(pool, sql, params) {
  try {
    const r = await pool.query(sql, params);
    return r.rows;
  } catch (_) {
    return [];
  }
}

async function generateMorningBrief(userId, pool, options = {}) {
  const portee = await porteeCabinet.resoudrePorteeUtilisateur(pool, userId, options)

  // 1. Relances en attente d'envoi
  // `relances` porte `cabinet_id` (migration 113) : l'ancre du cabinet est la
  // colonne de la ligne, le propriétaire reste `broker_id`.
  const fRelances = porteeCabinet.fragment(portee, {
    cabinet: 'r.cabinet_id',
    proprietaire: 'r.broker_id',
    depart: 1,
  })
  const relances = await safeQuery(pool, `
    SELECT r.priority, r.subject, r.channel,
           COALESCE(NULLIF(c.company_name, ''), TRIM(CONCAT(c.first_name, ' ', c.last_name))) AS client_name
    FROM relances r
    LEFT JOIN clients c ON r.client_id = c.id
    WHERE ${fRelances.sql} AND r.status <> 'sent'
    ORDER BY CASE r.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, r.created_at ASC
    LIMIT 5`, fRelances.params);

  // 2. Échéances de contrats sous 30 jours (quotes actives) — portée du CABINET
  const fContrats = porteeCabinet.fragment(portee, {
    cabinet: 'c.cabinet_id',
    proprietaire: 'c.courtier_id',
    depart: 1,
  })
  const echeances = await safeQuery(pool, `
    SELECT TRIM(CONCAT(c.first_name, ' ', c.last_name)) AS client_name,
           q.quote_data->>'type_contrat' AS type_contrat,
           NULLIF(q.quote_data->>'prime_annuelle', '')::decimal AS prime,
           EXTRACT(DAY FROM NULLIF(q.quote_data->>'date_echeance', '')::date - NOW())::int AS jours
    FROM quotes q
    JOIN clients c ON q.client_id = c.id
    WHERE ${fContrats.sql} AND q.status = 'actif'
      AND NULLIF(q.quote_data->>'date_echeance', '')::date BETWEEN NOW() AND NOW() + INTERVAL '30 days'
    ORDER BY jours ASC
    LIMIT 5`, fContrats.params);

  // 3. Clients récents sans contrat actif (opportunités) — portée du CABINET
  //    Même clause que ci-dessus : alias identique (`c`), aucun autre paramètre.
  const sansContrat = await safeQuery(pool, `
    SELECT TRIM(CONCAT(c.first_name, ' ', c.last_name)) AS client_name
    FROM clients c
    WHERE ${fContrats.sql}
      AND NOT EXISTS (SELECT 1 FROM quotes q WHERE q.client_id = c.id AND q.status = 'actif')
    ORDER BY c.created_at DESC
    LIMIT 3`, fContrats.params);

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
