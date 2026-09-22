/**
 * planService.js — Source unique de vérité pour les plans COURTIA
 * Plans V1 : starter (89€), pro (159€), cabinet (sur devis)
 */

const pool = require('../db');
const logger = require('../lib/logger');
const BILLING_MODE = process.env.BILLING_MODE || 'test';

/**
 * Price ID Stripe d'un plan, depuis la CONFIGURATION uniquement.
 *
 * POURQUOI UNE TABLE : les plans FACTURABLES sont exactement ceux listés ici.
 * Un plan absent de cette table (« Sur devis », alias hérité) n'a aucun prix à
 * encaisser, et c'est cette absence qui fait foi — pas une liste recopiée dans
 * la route de checkout.
 *
 * La grille suisse est facturée en francs sur ses propres prix Stripe : elle a
 * donc ses propres variables (`stripeService.getPriceId` lit les MÊMES noms, la
 * synchronisation des deux grilles se fait par la configuration, jamais par une
 * recopie de prix).
 */
const VARIABLES_PRIX = {
  starter: ['STRIPE_STARTER_PRICE_ID_TEST', 'STRIPE_PRICE_STARTER'],
  pro: ['STRIPE_PRO_PRICE_ID_TEST', 'STRIPE_PRICE_PRO'],
  independant: ['STRIPE_INDEPENDANT_PRICE_ID_TEST', 'STRIPE_PRICE_INDEPENDANT'],
  cabinet_ch: ['STRIPE_CABINET_CH_PRICE_ID_TEST', 'STRIPE_PRICE_CABINET_CH'],
};

function stripePriceFor(planCode) {
  const variables = VARIABLES_PRIX[planCode];
  if (!variables) return null; // sur devis, alias hérité, code inconnu
  const [variableTest, variableLive] = variables;
  if (BILLING_MODE === 'test') {
    return process.env[variableTest] || process.env[variableLive] || null;
  }
  return process.env[variableLive] || null;
}

const PLANS = {
  starter: {
    name: 'Starter',
    price: 89,
    currency: 'EUR',
    interval: 'month',
    description: 'Pour les courtiers indépendants qui démarrent',
    highlighted: false,
    features: {
      ark_basic: true,
      ark_full: false,
      reach: false,
      automations: false,
      advanced_reports: false,
      premium_support: false,
      multi_user: false,
      csv_import: true,
      crm_full: false,
      scoring: false,
      morning_brief: false,
      integrations_google_calendar: false,
      integrations_whatsapp: false,
      integrations_email_sync: false,
      integrations: false,
      documents: true,
      whatsapp: false,
      commissions: false,
      admin_costs: false,
      // Clés réclamées par les gardes de routes (backend/src/middleware/planGuard.js).
      // Elles manquaient du vocabulaire PLANS : les routes kanban, modèles
      // d'e-mail, lead scoring, tableaux de bord exécutif/conformité et
      // benchmarks répondaient 402 à TOUT LE MONDE, quel que soit le plan.
      // Valeurs alignées sur plan_limits (migration 003d) : start, pro, elite.
      kanban: false,
      email_templates_ai: false,
      lead_scoring: false,
      benchmarks: false,
      executive_dashboard: false,
      compliance_dashboard: false,
    },
    limits: {
      max_clients: 3,
      max_contrats: 50,
      max_ark_messages: 200,
      max_pdf_generations: 20,
      max_users: 1,
    },
    stripe_price_id: stripePriceFor('starter'),
  },
  pro: {
    name: 'Pro',
    price: 159,
    currency: 'EUR',
    interval: 'month',
    description: 'La solution complète pour les courtiers qui veulent ARK, les intégrations et les documents métier.',
    highlighted: true,
    features: {
      ark_basic: true,
      ark_full: true,
      reach: true,
      automations: true,
      advanced_reports: true,
      premium_support: false,
      multi_user: true,
      csv_import: true,
      crm_full: true,
      scoring: true,
      morning_brief: true,
      integrations_google_calendar: true,
      integrations_whatsapp: true,
      integrations_email_sync: true,
      integrations: true,
      documents: true,
      whatsapp: true,
      commissions: true,
      admin_costs: true,
      // Clés réclamées par les gardes de routes (backend/src/middleware/planGuard.js).
      // Elles manquaient du vocabulaire PLANS : les routes kanban, modèles
      // d'e-mail, lead scoring, tableaux de bord exécutif/conformité et
      // benchmarks répondaient 402 à TOUT LE MONDE, quel que soit le plan.
      // Valeurs alignées sur plan_limits (migration 003d) : start, pro, elite.
      kanban: true,
      email_templates_ai: true,
      lead_scoring: true,
      benchmarks: false,
      executive_dashboard: true,
      compliance_dashboard: true,
    },
    limits: {
      max_clients: 1500,
      max_contrats: Infinity,
      max_ark_messages: 2000,
      max_pdf_generations: 200,
      max_users: 3,
    },
    stripe_price_id: stripePriceFor('pro'),
  },
  cabinet: {
    name: 'Cabinet',
    price: null,
    currency: 'EUR',
    interval: 'month',
    description: 'Pour les cabinets structurés avec plusieurs collaborateurs et pilotage avancé.',
    highlighted: false,
    features: {
      ark_basic: true,
      ark_full: true,
      reach: true,
      automations: true,
      advanced_reports: true,
      premium_support: true,
      multi_user: true,
      csv_import: true,
      crm_full: true,
      scoring: true,
      morning_brief: true,
      integrations_google_calendar: true,
      integrations_whatsapp: true,
      integrations_email_sync: true,
      integrations: true,
      documents: true,
      whatsapp: true,
      commissions: true,
      admin_costs: true,
      // Clés réclamées par les gardes de routes (backend/src/middleware/planGuard.js).
      // Elles manquaient du vocabulaire PLANS : les routes kanban, modèles
      // d'e-mail, lead scoring, tableaux de bord exécutif/conformité et
      // benchmarks répondaient 402 à TOUT LE MONDE, quel que soit le plan.
      // Valeurs alignées sur plan_limits (migration 003d) : start, pro, elite.
      kanban: true,
      email_templates_ai: true,
      lead_scoring: true,
      benchmarks: true,
      executive_dashboard: true,
      compliance_dashboard: true,
    },
    limits: {
      max_clients: Infinity,
      max_contrats: Infinity,
      max_ark_messages: 5000,
      max_pdf_generations: Infinity,
      max_users: 10,
    },
    stripe_price_id: stripePriceFor('cabinet'),
  },
  // Legacy DB alias: older accounts can still carry plan='premium'.
  // Public/API surfaces expose it as Cabinet to keep the commercial grid current.
  premium: {
    name: 'Cabinet',
    price: null,
    currency: 'EUR',
    interval: 'month',
    description: 'Solution sur-mesure pour les cabinets et agences',
    highlighted: false,
    features: {
      ark_basic: true,
      ark_full: true,
      reach: true,
      automations: true,
      advanced_reports: true,
      premium_support: true,
      multi_user: true,
      csv_import: true,
      crm_full: true,
      scoring: true,
      morning_brief: true,
      integrations_google_calendar: true,
      integrations_whatsapp: true,
      integrations_email_sync: true,
      integrations: true,
      documents: true,
      whatsapp: true,
      commissions: true,
      admin_costs: true,
      // Clés réclamées par les gardes de routes (backend/src/middleware/planGuard.js).
      // Elles manquaient du vocabulaire PLANS : les routes kanban, modèles
      // d'e-mail, lead scoring, tableaux de bord exécutif/conformité et
      // benchmarks répondaient 402 à TOUT LE MONDE, quel que soit le plan.
      // Valeurs alignées sur plan_limits (migration 003d) : start, pro, elite.
      kanban: true,
      email_templates_ai: true,
      lead_scoring: true,
      benchmarks: true,
      executive_dashboard: true,
      compliance_dashboard: true,
    },
    limits: {
      max_clients: Infinity,
      max_contrats: Infinity,
      max_ark_messages: Infinity,
      max_pdf_generations: Infinity,
      max_users: Infinity,
    },
    stripe_price_id: null,
  },
};

/**
 * GRILLE SUISSE — source unique des prix pour un cabinet en Suisse.
 *
 * Un cabinet suisse est facturé en francs suisses, sur sa propre grille : lui
 * présenter « 106,80 € TTC / mois avec TVA 20 % » était une incohérence de
 * marché (constat CH-006 de l'audit du 20/09/2026). Les montants proviennent
 * d'ici et de nulle part ailleurs ; aucune recopie dans un composant.
 *
 * La qualification fiscale exacte (assujettissement, taux applicable) dépend de
 * la structure de facturation de COURTIA : elle est donc PORTÉE PAR LA
 * CONFIGURATION (`tax_label` / `tax_rate`) et non calculée à la place du
 * comptable. Sans taux configuré, on affiche un prix hors taxes sans total
 * inventé.
 */
const PLANS_CH = {
  independant: {
    name: 'Indépendant',
    price: 199,
    currency: 'CHF',
    interval: 'month',
    description: 'Pour le courtier indépendant : CRM, pipeline, documents et assistant ARK.',
    highlighted: false,
    features: { ...PLANS.pro.features },
    limits: { ...PLANS.pro.limits },
    stripe_price_id: stripePriceFor('independant'),
  },
  cabinet_ch: {
    name: 'Cabinet',
    price: 349,
    currency: 'CHF',
    interval: 'month',
    description: 'Pour les cabinets de plusieurs collaborateurs : équipe, conformité et suivi complet.',
    highlighted: true,
    features: { ...PLANS.cabinet.features },
    limits: { ...PLANS.cabinet.limits },
    stripe_price_id: stripePriceFor('cabinet_ch'),
  },
  cabinet_ch_sur_devis: {
    name: 'Sur devis',
    price: null,
    currency: 'CHF',
    interval: 'month',
    description: 'Cabinets multi-sites et besoins spécifiques : devis établi avec vous.',
    highlighted: false,
    features: { ...PLANS.cabinet.features },
    limits: { ...PLANS.cabinet.limits },
    // Aucun prix à encaisser : l'offre est sur devis (contact commercial).
    stripe_price_id: null,
  },
};

/** Taxe affichée par marché. `rate` null = pas de taux calculé automatiquement. */
const FISCALITE = {
  FR: { rate: 0.2, label: 'Prix indiqués hors taxes. TVA 20 % applicable.' },
  CH: { rate: 0.081, label: 'Prix hors taxes. TVA suisse (8,1 %) en sus, au taux en vigueur.' },
};

const DEFAULT_PLAN = 'starter';
const TRIAL_FEATURES = PLANS.pro.features; // Essai = features Pro
// Plafonds de l'essai = ceux du plan dont les FONCTIONS sont réellement ouvertes
// pendant l'essai (Pro). Avant ce correctif, l'essai ouvrait les fonctions Pro
// mais gardait les plafonds du plan de repli « starter » : un cabinet en essai
// de 7 jours ne pouvait enregistrer que 3 clients (limite « max_clients: 3 ») et
// se voyait répondre « Limite atteinte (3/3). Passez au plan Pro » dès le 4e
// client — c'est-à-dire pendant la période où il évalue justement le produit.
// L'essai reste borné dans le TEMPS par trial_ends_at (paywall J+7) : c'est la
// durée qui protège l'offre, pas un plafond de saisie.
const TRIAL_LIMITS = PLANS.pro.limits;

/**
 * PLAN D'UN CODE, TOUS MARCHÉS CONFONDUS.
 *
 * POURQUOI CETTE FONCTION EXISTE (défaut P1 mesuré le 22/09/2026, audit Stripe) :
 * `users.plan` reçoit le code RÉELLEMENT souscrit, y compris les codes de la
 * grille suisse (`independant`, `cabinet_ch`, `cabinet_ch_sur_devis`) écrits par
 * le webhook `checkout.session.completed`. Les résolutions qui ne consultaient
 * que le catalogue FRANÇAIS `PLANS` retombaient sur `DEFAULT_PLAN = 'starter'` :
 * un cabinet suisse ABONNÉ (199 CHF/mois, statut `active`) était servi avec
 * `plan: 'starter'`, `price: 89`, `ark_full: false`, `multi_user: false` — soit
 * une rétrogradation au plan d'entrée français APRÈS avoir payé l'offre suisse.
 * `getFeatureGate` et `getUsageLimit` (utilisés par `middleware/planGating`)
 * avaient le même angle mort.
 *
 * Un code inconnu (ex. `trial`) reste inconnu : le repli appartient à l'appelant.
 */
function planParCode(code) {
  if (!code) return null;
  const normalise = String(code).trim().toLowerCase();
  return PLANS[normalise] || PLANS_CH[normalise] || null;
}

/**
 * Retourne un plan complet par son nom
 */
function getPlan(name) {
  return planParCode(name);
}

/**
 * CATALOGUE D'UN MARCHÉ — SEULE SOURCE DE VÉRITÉ DES CODES DE PLAN.
 *
 * POURQUOI CETTE FONCTION EXISTE (défaut P1 mesuré le 21/09/2026, 4e passe
 * adverse) : `GET /api/billing/plans` servait au cabinet suisse les codes
 * `independant`, `cabinet_ch` et `cabinet_ch_sur_devis` (grille CHF, 199/349
 * CHF HT, TVA suisse 8,1 %), mais `POST /api/billing/create-checkout-session`
 * les refusait en 400 `invalid_plan` : la route validait ses codes sur une liste
 * recopiée (starter/pro/cabinet). Un cabinet suisse ne pouvait donc souscrire
 * AUCUN de ses plans, même Stripe configuré — la grille affichée était une
 * grille morte.
 *
 * La validation du checkout dérive DÉSORMAIS de cette liste (voir
 * `billingService.normalizePlanCode`) : ce qui est servi est ce qui est
 * acceptable, et un code retiré du catalogue est refusé des deux côtés.
 */
function cataloguePourMarche(marche = 'FR') {
  return String(marche).toUpperCase() === 'CH' ? PLANS_CH : PLANS;
}

/**
 * Codes de plan RÉELLEMENT servis pour un marché.
 * `premium` est exclu : c'est un alias de base historique, jamais un plan
 * présenté (les comptes anciens sont résolus vers `cabinet`).
 */
function codesPourMarche(marche = 'FR') {
  return Object.keys(cataloguePourMarche(marche)).filter((code) => code !== 'premium');
}

/**
 * Plan du catalogue pour un code donné, ou `null` si ce code n'existe pas dans
 * ce marché. Utilisé par la route de checkout : un code inconnu reste refusé.
 */
function planPourCode(code, marche = 'FR') {
  if (!code) return null;
  const normalise = String(code).trim().toLowerCase();
  if (normalise === 'premium') return PLANS.cabinet; // alias hérité
  return cataloguePourMarche(marche)[normalise] || null;
}

/**
 * Retourne tous les plans (sans secrets Stripe pour les routes publiques)
 */
function getAllPlans(marche = 'FR') {
  // Un cabinet suisse reçoit la grille CHF ; tout le reste garde la grille
  // historique en euros. Aucune page ne doit coder ses prix en dur.
  const source = cataloguePourMarche(marche)
  return Object.entries(source).filter(([key]) => key !== 'premium').map(([key, plan]) => ({
    id: key,
    name: plan.name,
    price: plan.price,
    currency: plan.currency,
    interval: plan.interval,
    description: plan.description,
    highlighted: plan.highlighted,
    features: plan.features,
    limits: plan.limits,
    has_stripe_price: !!plan.stripe_price_id,
  }));
}

/**
 * Vérifie si un plan a accès à une fonctionnalité donnée
 */
function getFeatureGate(planName, feature) {
  const plan = planParCode(planName);
  if (!plan) return false;
  return !!plan.features[feature];
}

/**
 * Retourne la limite d'utilisation pour un plan donné
 */
function getUsageLimit(planName, limitKey) {
  const plan = planParCode(planName);
  if (!plan) return 0;
  return plan.limits[limitKey] || 0;
}

/**
 * Récupère les infos plan d'un utilisateur depuis la DB
 */
async function getUserPlanInfo(userId) {
  try {
    const { rows } = await pool.query(
      'SELECT id, plan, subscription_status, trial_ends_at, stripe_customer_id, stripe_subscription_id FROM users WHERE id = $1',
      [userId]
    );
    if (rows.length === 0) {
      return { plan: DEFAULT_PLAN, ...PLANS[DEFAULT_PLAN], subscription_status: null };
    }
    const user = rows[0];
    // Le code souscrit vient de la base (`users.plan`) : il peut appartenir à la
    // grille suisse (`independant`, `cabinet_ch`) comme à la grille française. On
    // résout donc dans les DEUX catalogues ; seul un code réellement inconnu
    // (ex. `trial`) retombe sur DEFAULT_PLAN.
    const planKey = planParCode(user.plan) ? String(user.plan).trim().toLowerCase() : DEFAULT_PLAN;
    const publicPlanKey = planKey === 'premium' ? 'cabinet' : planKey;
    const plan = { ...planParCode(planKey) };

    // Vérifier si l'utilisateur est en période d'essai
    const onTrial = user.subscription_status === 'trialing' &&
      (!user.trial_ends_at || new Date(user.trial_ends_at) > new Date());

    // Si en essai, on donne les features Pro
    const activeFeatures = onTrial ? TRIAL_FEATURES : plan.features;

    // COHÉRENCE DES DEUX VUES (correction du 19/09/2026) : pendant l'essai, les
    // fonctions ouvertes sont celles de TRIAL_FEATURES (= PLANS.pro.features),
    // mais cette fonction renvoyait `plan: 'starter'` (car `users.plan` vaut
    // 'trial', absent de PLANS, donc repli sur DEFAULT_PLAN). L'application
    // affichait donc « Starter » tout en ouvrant les fonctions Pro, et
    // /api/billing/status affichait « not_started » — trois réponses pour un même
    // compte. Le plan effectif renvoyé est désormais celui dont les fonctions
    // sont réellement appliquées.
    const joursEssai = onTrial && user.trial_ends_at
      ? Math.max(0, Math.ceil((new Date(user.trial_ends_at).getTime() - Date.now()) / 86400000))
      : null;

    return {
      plan: onTrial ? 'pro' : publicPlanKey,
      // Pendant l'essai le nom doit dire le plan dont les fonctions sont ouvertes
      // (Pro), pas le plan de repli : « Starter (essai) » alors que plan='pro'
      // etait une contradiction de plus dans le meme objet.
      plan_name: onTrial ? `${PLANS.pro.name} (essai)` : plan.name,
      price: plan.price,
      subscription_status: user.subscription_status,
      on_trial: onTrial,
      trial_ends_at: user.trial_ends_at,
      trial_jours_restants: joursEssai,
      stripe_customer_id: user.stripe_customer_id,
      stripe_subscription_id: user.stripe_subscription_id,
      features: activeFeatures,
      limits: onTrial ? TRIAL_LIMITS : plan.limits,
    };
  } catch (error) {
    logger.warn({ error: error.message }, 'planService.getUserPlanInfo failed');
    return { plan: DEFAULT_PLAN, ...PLANS[DEFAULT_PLAN], subscription_status: null };
  }
}

/**
 * Vérifie si un utilisateur a accès à une feature
 */
async function checkFeatureAccess(userId, featureKey) {
  const planInfo = await getUserPlanInfo(userId);
  return !!planInfo.features[featureKey];
}

/**
 * Retourne le nom simple du plan d'un utilisateur
 */
async function getPlanName(user) {
  if (!user) return DEFAULT_PLAN;
  const id = user.id || user.userId;
  if (!id) return DEFAULT_PLAN;
  const planInfo = await getUserPlanInfo(id);
  return planInfo.plan || DEFAULT_PLAN;
}

/**
 * Vérifie les limites d'utilisation
 */
async function checkLimit(userId, limitType) {
  // Les super_admin contournent les limites
  const { rows } = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
  if (rows[0]?.role === 'super_admin') {
    return { allowed: true, current: 0, max: Infinity };
  }

  const planInfo = await getUserPlanInfo(userId);
  const limitKey = normalizeLimitKey(limitType);
  const max = planInfo.limits[limitKey] !== undefined ? planInfo.limits[limitKey] : Infinity;

  let current = 0;
  if (limitKey === 'max_clients') {
    const count = await pool.query('SELECT COUNT(*) FROM clients WHERE courtier_id = $1', [userId]);
    current = parseInt(count.rows[0].count, 10);
  } else if (limitKey === 'max_contrats') {
    const count = await pool.query('SELECT COUNT(*) FROM contracts WHERE courtier_id = $1', [userId]);
    current = parseInt(count.rows[0].count, 10);
  } else if (limitKey === 'max_users') {
    const count = await pool.query(
      `SELECT COUNT(*) FROM cabinet_members cm
       JOIN cabinet_members mine ON mine.cabinet_id = cm.cabinet_id
       WHERE mine.user_id = $1 AND cm.removed_at IS NULL AND mine.removed_at IS NULL`,
      [userId]
    );
    current = parseInt(count.rows[0]?.count || 0, 10);
  } else if (limitKey === 'max_ark_messages') {
    const count = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM plan_usage_events
       WHERE user_id = $1
         AND usage_type = 'ark_messages'
         AND period_start = date_trunc('month', NOW())::date`,
      [userId]
    ).catch(() => ({ rows: [{ total: 0 }] }));
    current = parseInt(count.rows[0]?.total || 0, 10);
  } else if (limitKey === 'max_pdf_generations') {
    const count = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) AS total
       FROM plan_usage_events
       WHERE user_id = $1
         AND usage_type IN ('pdf_generations','documents_generated')
         AND period_start = date_trunc('month', NOW())::date`,
      [userId]
    ).catch(() => ({ rows: [{ total: 0 }] }));
    current = parseInt(count.rows[0]?.total || 0, 10);
  }

  return { allowed: current < max, current, max, limit_key: limitKey };
}

/**
 * Incrémente un compteur d'utilisation
 */
async function incrementUsage(userId, usageType, amount = 1) {
  await pool.query(
    `INSERT INTO plan_usage_events (user_id, usage_type, amount)
     VALUES ($1,$2,$3)`,
    [userId, usageType, amount]
  );
  return { userId, usageType, amount };
}

/**
 * Calcule les limites restantes pour l'affichage
 */
async function getUsageWithLimits(userId) {
  const planInfo = await getUserPlanInfo(userId);
  const limits = planInfo.limits || {};
  const usage = {};

  for (const [key, max] of Object.entries(limits)) {
    if (key === 'max_users') continue;
    const limitType = key;
    let current = 0;
    try {
      const normalizedLimit = normalizeLimitKey(limitType);
      if (normalizedLimit === 'max_clients') {
        const count = await pool.query('SELECT COUNT(*) FROM clients WHERE courtier_id = $1', [userId]);
        current = parseInt(count.rows[0].count, 10);
      } else if (normalizedLimit === 'max_contrats') {
        const count = await pool.query('SELECT COUNT(*) FROM contracts WHERE courtier_id = $1', [userId]);
        current = parseInt(count.rows[0].count, 10);
      } else if (normalizedLimit === 'max_ark_messages' || normalizedLimit === 'max_pdf_generations') {
        const usageType = normalizedLimit === 'max_ark_messages' ? 'ark_messages' : 'pdf_generations';
        const count = await pool.query(
          `SELECT COALESCE(SUM(amount), 0) AS total
           FROM plan_usage_events
           WHERE user_id = $1 AND usage_type = $2 AND period_start = date_trunc('month', NOW())::date`,
          [userId, usageType]
        );
        current = parseInt(count.rows[0]?.total || 0, 10);
      }
    } catch (e) {
      // Ignorer les erreurs de comptage
    }
    usage[key.replace('max_', '')] = {
      current,
      max: max === Infinity ? null : max,
      percent: max === Infinity ? 0 : Math.round((current / max) * 100),
    };
  }

  return usage;
}

// Feature gating — mapping feature key -> plan minimum requis
const FEATURE_GATES = {
  ark_basic: 'starter',
  ark_full: 'pro',
  reach: 'pro',
  automations: 'pro',
  advanced_reports: 'pro',
  premium_support: 'cabinet',
  multi_user: 'cabinet',
  csv_import: 'starter',
  crm_full: 'pro',
  scoring: 'pro',
  morning_brief: 'pro',
  integrations_google_calendar: 'pro',
  integrations_whatsapp: 'pro',
  integrations_email_sync: 'pro',
  integrations: 'pro',
  documents: 'starter',
  whatsapp: 'pro',
  commissions: 'pro',
  admin_costs: 'pro',
  // Ajouts alignés sur plan_limits (003d) — sans quoi ces clés n'avaient aucun seuil.
  kanban: 'pro',
  email_templates_ai: 'pro',
  lead_scoring: 'pro',
  benchmarks: 'cabinet',
  executive_dashboard: 'pro',
  compliance_dashboard: 'pro',
};

const LIMIT_ALIASES = {
  clients: 'max_clients',
  max_clients: 'max_clients',
  contracts: 'max_contrats',
  contrats: 'max_contrats',
  max_contrats: 'max_contrats',
  users: 'max_users',
  invitations: 'max_users',
  max_users: 'max_users',
  ark_messages: 'max_ark_messages',
  ark_runs: 'max_ark_messages',
  max_ark_messages: 'max_ark_messages',
  pdf_generations: 'max_pdf_generations',
  documents: 'max_pdf_generations',
  documents_generated: 'max_pdf_generations',
  max_pdf_generations: 'max_pdf_generations',
};

function normalizeLimitKey(limitType) {
  return LIMIT_ALIASES[limitType] || limitType;
}

/**
 * Retourne le plan minimum requis pour une feature
 */
function getMinPlanForFeature(feature) {
  return FEATURE_GATES[feature] || null;
}

module.exports = {
  PLANS,
  PLANS_CH,
  FISCALITE,
  TRIAL_FEATURES,
  DEFAULT_PLAN,
  VARIABLES_PRIX,
  cataloguePourMarche,
  codesPourMarche,
  planPourCode,
  getPlan,
  getAllPlans,
  getFeatureGate,
  getUsageLimit,
  getUserPlanInfo,
  checkFeatureAccess,
  checkLimit,
  incrementUsage,
  getUsageWithLimits,
  getPlanName,
  getMinPlanForFeature,
  normalizeLimitKey,
  FEATURE_GATES,
};
