const pool = require('../db');
const planService = require('./planService');
const billingConfig = require('./billingConfig');

const TRIAL_DAYS = Number(process.env.BILLING_TRIAL_DAYS || 7);
const FISCAL_LABEL = process.env.BILLING_FISCAL_LABEL || 'Prix indiqués hors taxes. TVA applicable au taux en vigueur.';

let foundationReady = false;

function safeUserId(user) {
  return user?.id || user?.userId || null;
}

async function ensureBillingFoundation() {
  if (foundationReady) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS organization_profiles (
      id SERIAL PRIMARY KEY,
      owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      cabinet_name VARCHAR(255),
      legal_form VARCHAR(120),
      siret VARCHAR(32),
      orias VARCHAR(64),
      billing_email VARCHAR(255),
      phone VARCHAR(40),
      address_line1 VARCHAR(255),
      postal_code VARCHAR(20),
      city VARCHAR(120),
      country VARCHAR(120) DEFAULT 'France',
      legal_signatory_name VARCHAR(255),
      legal_signatory_role VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_org_profiles_owner_user ON organization_profiles(owner_user_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS billing_plans (
      id SERIAL PRIMARY KEY,
      code VARCHAR(32) NOT NULL UNIQUE,
      display_name VARCHAR(120) NOT NULL,
      price_amount_cents INTEGER,
      currency VARCHAR(8) NOT NULL DEFAULT 'EUR',
      interval VARCHAR(16) NOT NULL DEFAULT 'month',
      stripe_price_id_test VARCHAR(128),
      stripe_price_id_live VARCHAR(128),
      features_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // LE CATALOGUE DE LA BASE EST CELUI DE L'API (planService), pas une liste
  // recopiée : un plan souscriptible doit exister ici, sans quoi
  // `subscriptions.plan_id` restait NULL et `/api/billing/status` relisait
  // « starter » pour un abonné suisse (défaut P1 du 21/09/2026 : les codes de la
  // grille CHF existaient côté planService mais pas dans `billing_plans`).
  const codesCatalogue = [
    ...planService.codesPourMarche('FR').map((code) => [code, 'FR']),
    ...planService.codesPourMarche('CH').map((code) => [code, 'CH']),
  ];
  const lignesPlans = codesCatalogue.map(([code, marche]) => ({
    code,
    plan: planService.planPourCode(code, marche),
  }));
  const parametresPlans = lignesPlans.flatMap(({ code, plan }) => [
    code,
    plan.name,
    plan.price != null ? Math.round(Number(plan.price) * 100) : null,
    plan.currency,
    plan.interval,
  ]);
  const valeursPlans = lignesPlans
    .map((_, index) => `($${index * 5 + 1}, $${index * 5 + 2}, $${index * 5 + 3}, $${index * 5 + 4}, $${index * 5 + 5}, TRUE)`)
    .join(',\n      ');

  await pool.query(`
    INSERT INTO billing_plans (code, display_name, price_amount_cents, currency, interval, is_active)
    VALUES
      ${valeursPlans}
    ON CONFLICT (code) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      price_amount_cents = EXCLUDED.price_amount_cents,
      currency = EXCLUDED.currency,
      interval = EXCLUDED.interval,
      is_active = EXCLUDED.is_active,
      updated_at = NOW();
  `, parametresPlans);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS customer_billing_profiles (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
      stripe_customer_id VARCHAR(128),
      tax_mode VARCHAR(32),
      vat_applicable BOOLEAN,
      vat_label VARCHAR(255),
      seller_status_snapshot VARCHAR(255),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_billing_profiles_org ON customer_billing_profiles(organization_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_customer_billing_profiles_stripe_customer ON customer_billing_profiles(stripe_customer_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS subscriptions (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
      plan_id INTEGER REFERENCES billing_plans(id),
      provider VARCHAR(32) NOT NULL DEFAULT 'stripe',
      provider_subscription_id VARCHAR(128),
      status VARCHAR(64) NOT NULL DEFAULT 'inactive',
      trial_start_at TIMESTAMPTZ,
      trial_end_at TIMESTAMPTZ,
      current_period_start TIMESTAMPTZ,
      current_period_end TIMESTAMPTZ,
      cancel_at_period_end BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_provider_sub_id ON subscriptions(provider_subscription_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON subscriptions(organization_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS checkout_sessions (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER REFERENCES organization_profiles(id) ON DELETE SET NULL,
      plan_id INTEGER REFERENCES billing_plans(id),
      provider_session_id VARCHAR(128),
      status VARCHAR(64) NOT NULL DEFAULT 'created',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ,
      raw_payload_json JSONB NOT NULL DEFAULT '{}'::jsonb
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_checkout_sessions_provider_id ON checkout_sessions(provider_session_id);
    CREATE INDEX IF NOT EXISTS idx_checkout_sessions_org ON checkout_sessions(organization_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS payment_events (
      id SERIAL PRIMARY KEY,
      provider VARCHAR(32) NOT NULL DEFAULT 'stripe',
      event_id VARCHAR(128) NOT NULL UNIQUE,
      event_type VARCHAR(128) NOT NULL,
      organization_id INTEGER REFERENCES organization_profiles(id) ON DELETE SET NULL,
      subscription_id INTEGER REFERENCES subscriptions(id) ON DELETE SET NULL,
      processed_at TIMESTAMPTZ,
      is_idempotent BOOLEAN NOT NULL DEFAULT TRUE,
      payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoices (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
      provider_invoice_id VARCHAR(128),
      status VARCHAR(64),
      amount_cents INTEGER,
      currency VARCHAR(8) DEFAULT 'EUR',
      invoice_url TEXT,
      paid_at TIMESTAMPTZ,
      due_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_provider_invoice_id ON invoices(provider_invoice_id);
    CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(organization_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS legal_documents (
      id SERIAL PRIMARY KEY,
      doc_type VARCHAR(64) NOT NULL,
      version VARCHAR(32) NOT NULL,
      title VARCHAR(255) NOT NULL,
      storage_url TEXT,
      published_at TIMESTAMPTZ,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(doc_type, version)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS legal_acceptances (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      doc_type VARCHAR(64) NOT NULL,
      doc_version VARCHAR(32) NOT NULL,
      accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ip VARCHAR(64),
      user_agent TEXT,
      consent_context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_legal_acceptances_org ON legal_acceptances(organization_id);
    CREATE INDEX IF NOT EXISTS idx_legal_acceptances_user ON legal_acceptances(user_id);
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS signature_requests (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
      provider VARCHAR(64),
      provider_request_id VARCHAR(128),
      status VARCHAR(64) NOT NULL DEFAULT 'pending',
      requested_at TIMESTAMPTZ,
      signed_at TIMESTAMPTZ,
      document_version VARCHAR(32),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS signed_documents (
      id SERIAL PRIMARY KEY,
      organization_id INTEGER NOT NULL REFERENCES organization_profiles(id) ON DELETE CASCADE,
      signature_request_id INTEGER REFERENCES signature_requests(id) ON DELETE SET NULL,
      provider_document_id VARCHAR(128),
      storage_url TEXT,
      checksum VARCHAR(255),
      signed_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  // ── COLONNES D'ORDRE ET D'IMPAYÉ (audit Stripe du 22/09/2026) ─────────────
  // `past_due_since` : sans date de début d'impayé, aucun délai de grâce n'est
  // calculable (le statut était toléré indéfiniment, sans trace).
  // `last_event_created_at` / `last_event_id` : les webhooks arrivent dans le
  // désordre ; sans horodatage du dernier événement appliqué, un événement en
  // retard pouvait écraser un état plus récent (résiliation rejouée après une
  // réactivation, par exemple).
  // Ajout idempotent ICI aussi (et non seulement par la migration) : le service
  // doit démarrer sur une base dont les migrations n'ont pas encore été rejouées.
  await pool.query(`
    ALTER TABLE subscriptions
      ADD COLUMN IF NOT EXISTS past_due_since TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_event_created_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS last_event_id TEXT;
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS billing_reconciliation_runs (
      id SERIAL PRIMARY KEY,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      mode VARCHAR(32) NOT NULL DEFAULT 'manuel',
      clients_examines INTEGER NOT NULL DEFAULT 0,
      abonnements_examines INTEGER NOT NULL DEFAULT 0,
      corrections INTEGER NOT NULL DEFAULT 0,
      erreurs INTEGER NOT NULL DEFAULT 0,
      report_json JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  foundationReady = true;
}

/**
 * Résout un code de plan sur le CATALOGUE (`planService`), seule source de
 * vérité. Retourne le code canonique, ou `null` si le plan n'existe pas.
 *
 * POURQUOI CE CHANGEMENT (défaut P1 mesuré le 21/09/2026, 4e passe adverse) :
 * cette fonction validait sur une liste recopiée `['starter','pro','cabinet']`
 * (grille euros). Les codes de la grille suisse — `independant`, `cabinet_ch`,
 * `cabinet_ch_sur_devis` — que `GET /api/billing/plans` sert LUI-MÊME à un
 * cabinet `pays=CH` étaient donc refusés par le checkout en 400 `invalid_plan` :
 * un cabinet suisse ne pouvait souscrire aucun de ses plans.
 *
 * `marche` restreint la validation à la grille RÉELLEMENT servie à ce cabinet
 * (ce qui est annoncé est ce qui est acceptable). Sans `marche` — webhooks
 * Stripe, appels internes — le catalogue complet est accepté, sans quoi un
 * abonnement suisse déjà payé serait relu comme « starter ».
 *
 * `premium` reste l'alias hérité de `cabinet` (comptes antérieurs à la grille
 * V1) : il n'est jamais servi, mais reste résolu.
 */
function normalizePlanCode(code, marche) {
  if (!code) return null;
  const v = String(code).trim().toLowerCase();
  if (v === 'premium') return 'cabinet';
  const marches = marche ? [marche] : ['FR', 'CH'];
  return marches.some((m) => planService.planPourCode(v, m)) ? v : null;
}

/**
 * Grille tarifaire servie à l'écran, selon le MARCHÉ du cabinet.
 *
 * Avant ce correctif, la grille était toujours en euros avec « TVA 20 % » : un
 * cabinet suisse recevait une taxe française en clair à l'écran, y compris sur
 * le paywall de fin d'essai (constat CH-006). La devise, le montant et la
 * mention fiscale viennent maintenant de la CONFIGURATION (planService), pas
 * d'un calcul recopié ici.
 */
function getPlans(marche = 'FR') {
  const estSuisse = String(marche).toUpperCase() === 'CH';
  const fiscal = planService.FISCALITE?.[estSuisse ? 'CH' : 'FR'] || { rate: null, label: FISCAL_LABEL };
  const all = planService.getAllPlans(estSuisse ? 'CH' : 'FR');
  return all.map((p) => {
    const devise = p.currency || (estSuisse ? 'CHF' : 'EUR');
    // Symbole affiché : le franc suisse s'écrit « CHF », l'euro garde son signe.
    const symbole = devise === 'CHF' ? 'CHF' : '€';
    const montant = p.price ? Number(p.price).toFixed(0) : null;
    // « Sur devis » (prix non renseigné) n'est pas payable en ligne : le
    // checkout répond 409 `cabinet_contact_required`. `has_checkout` dit donc
    // exactement ce que le checkout fera — prix connu ET price ID Stripe
    // configuré — sans quoi l'écran annoncerait un paiement impossible.
    const payableEnLigne = montant !== null && !!p.has_stripe_price;
    return {
      display_price_ht: montant ? `${montant} ${symbole} HT / mois` : 'Sur devis',
      // Le total TTC n'est affiché que si un taux est réellement configuré : on
      // ne fabrique pas une fiscalité à la place du comptable.
      display_price_ttc:
        montant && fiscal.rate
          ? `${(Number(p.price) * (1 + fiscal.rate)).toFixed(2).replace('.', ',')} ${symbole} TTC / mois`
          : null,
      code: p.id,
      name: p.name,
      price: p.price,
      currency: devise,
      interval: p.interval,
      highlighted: p.highlighted,
      trial_days: p.id === 'cabinet' || p.id === 'cabinet_ch' ? 0 : TRIAL_DAYS,
      has_checkout: payableEnLigne,
      sur_devis: montant === null,
      fiscal_label: fiscal.label,
      features: p.features,
    };
  });
}

async function getOrCreateOrganization(userId) {
  await ensureBillingFoundation();
  const existing = await pool.query(
    'SELECT * FROM organization_profiles WHERE owner_user_id = $1 LIMIT 1',
    [userId]
  );
  if (existing.rows[0]) return existing.rows[0];

  const userRes = await pool.query(
    `SELECT id, first_name, last_name, email FROM users WHERE id=$1`,
    [userId]
  );
  const user = userRes.rows[0];
  if (!user) throw new Error('user_not_found');

  const created = await pool.query(
    `INSERT INTO organization_profiles (
      owner_user_id, cabinet_name, billing_email, legal_signatory_name
    )
    VALUES ($1, $2, $3, $4)
    RETURNING *`,
    [
      userId,
      null,
      user.email || null,
      [user.first_name, user.last_name].filter(Boolean).join(' ') || null,
    ]
  );
  return created.rows[0];
}

async function upsertOrganizationProfile(userId, payload = {}) {
  const org = await getOrCreateOrganization(userId);
  const next = {
    cabinet_name: payload.cabinet_name ?? org.cabinet_name,
    legal_form: payload.legal_form ?? org.legal_form,
    siret: payload.siret ?? org.siret,
    orias: payload.orias ?? org.orias,
    billing_email: payload.billing_email ?? org.billing_email,
    phone: payload.phone ?? org.phone,
    address_line1: payload.address_line1 ?? org.address_line1,
    postal_code: payload.postal_code ?? org.postal_code,
    city: payload.city ?? org.city,
    country: payload.country ?? org.country,
    legal_signatory_name: payload.legal_signatory_name ?? org.legal_signatory_name,
    legal_signatory_role: payload.legal_signatory_role ?? org.legal_signatory_role,
  };

  const updated = await pool.query(
    `UPDATE organization_profiles
      SET cabinet_name=$1, legal_form=$2, siret=$3, orias=$4,
          billing_email=$5, phone=$6, address_line1=$7, postal_code=$8,
          city=$9, country=$10, legal_signatory_name=$11, legal_signatory_role=$12,
          updated_at=NOW()
      WHERE id=$13
      RETURNING *`,
    [
      next.cabinet_name,
      next.legal_form,
      next.siret,
      next.orias,
      next.billing_email,
      next.phone,
      next.address_line1,
      next.postal_code,
      next.city,
      next.country,
      next.legal_signatory_name,
      next.legal_signatory_role,
      org.id,
    ]
  );

  return updated.rows[0];
}

async function getPlanId(planCode) {
  const row = await pool.query('SELECT id FROM billing_plans WHERE code=$1 LIMIT 1', [planCode]);
  return row.rows[0]?.id || null;
}

async function getBillingStatus(userId) {
  await ensureBillingFoundation();
  const org = await getOrCreateOrganization(userId);
  const row = await pool.query(
    `SELECT s.status, s.trial_start_at, s.trial_end_at, s.current_period_start,
            s.current_period_end, s.cancel_at_period_end, s.past_due_since,
            bp.code AS plan_code, bp.display_name AS plan_name,
            cbp.stripe_customer_id
      FROM subscriptions s
      LEFT JOIN billing_plans bp ON bp.id = s.plan_id
      LEFT JOIN customer_billing_profiles cbp ON cbp.organization_id = s.organization_id
      WHERE s.organization_id=$1
      ORDER BY s.updated_at DESC, s.id DESC
      LIMIT 1`,
    [org.id]
  );

  if (!row.rows[0]) {
    // UNE SEULE SOURCE DE VÉRITÉ POUR L'ESSAI (correction du 19/09/2026).
    // L'inscription accorde l'essai dans `users` (plan='trial',
    // subscription_status='trialing', trial_ends_at), et c'est `users` que lit
    // planService/planGuard pour débrider les fonctions. Mais cette route ne
    // lisait QUE la table `subscriptions`, qui n'existe qu'après un paiement
    // Stripe : un compte en essai voyait donc « not_started / starter » pendant
    // que le produit lui ouvrait déjà les fonctions Pro — deux réponses
    // contradictoires pour le même compte, et « jours restants » introuvable.
    // Tant qu'aucune souscription Stripe n'existe, l'état vient de `users`.
    // Dès qu'une souscription existe (paiement ou essai Stripe), elle prime.
    const { rows: utilisateurs } = await pool.query(
      'SELECT plan, subscription_status, trial_ends_at, trial_days, trial_started_at, invited_at FROM users WHERE id = $1',
      [userId]
    );
    const utilisateur = utilisateurs[0] || {};
    const finBrute = utilisateur.trial_ends_at ? new Date(utilisateur.trial_ends_at) : null;
    const finValide = finBrute && !Number.isNaN(finBrute.getTime()) ? finBrute : null;
    const enEssai = utilisateur.subscription_status === 'trialing'
      && finValide !== null && finValide.getTime() > Date.now();
    const essaiExpire = utilisateur.subscription_status === 'trialing' && !enEssai;
    const joursRestants = enEssai
      ? Math.max(0, Math.ceil((finValide.getTime() - Date.now()) / 86400000))
      : 0;

    // Fonctions réellement ouvertes : la réponse vient de planService, pas d'une
    // liste recopiée ici (sinon les deux vues divergeraient de nouveau).
    let planEffectif = null;
    let fonctions = [];
    try {
      const info = await planService.getUserPlanInfo(userId);
      planEffectif = info.plan;
      fonctions = info.features || [];
    } catch (erreur) {
      console.warn('[billing.getBillingStatus] planService indisponible:', erreur.message);
    }

    // ETAT EXPLICITE (20/09/2026) : le frontend ne doit pas deduire lui-meme si
    // l'essai est fini (il le faisait avec sa propre date, donc deux verites).
    // Une regle business, un seul serveur : TRIAL_ACTIVE tant que trial_ends_at
    // est dans le futur, TRIAL_EXPIRED ensuite, sans jamais supprimer de donnee.
    // Etat derive EXACTEMENT comme la garde d'ecriture (middleware/subscriptionGuard) :
    // un compte dont users.subscription_status vaut 'active' est un abonnement actif,
    // meme s'il n'a pas encore de ligne dans `subscriptions` (cas de la periode
    // d'activation). Sans cela, l'API repondait NOT_STARTED alors que les ecritures
    // etaient autorisees : deux verites contradictoires pour le meme compte.
    const abonnementActif = ['active', 'past_due'].includes(utilisateur.subscription_status)
    // Compte invité non encore activé : l'essai n'a pas commencé. On le dit
    // explicitement au lieu de le présenter comme un essai expiré.
    const enAttenteActivation = utilisateur.subscription_status === 'pending_activation'
    const trialState = enAttenteActivation
      ? 'TRIAL_PENDING'
      : (enEssai
        ? 'TRIAL_ACTIVE'
        : (essaiExpire ? 'TRIAL_EXPIRED' : (abonnementActif ? 'SUBSCRIPTION_ACTIVE' : 'NOT_STARTED')))

    return {
      organization_id: org.id,
      plan_code: enEssai ? 'trial' : (abonnementActif ? (utilisateur.plan || 'starter') : 'starter'),
      plan_name: enEssai ? 'Essai gratuit' : (abonnementActif ? (utilisateur.plan || 'starter') : 'Starter'),
      status: enAttenteActivation
        ? 'pending_activation'
        : (enEssai ? 'trialing' : (essaiExpire ? 'trial_expired' : (abonnementActif ? 'active' : 'not_started'))),
      trial_state: trialState,
      trial_active: enEssai,
      trial_expired: essaiExpire,
      activation_requise: enAttenteActivation,
      // En lecture seule apres expiration : le cabinet garde l'acces a ses
      // donnees (aucune suppression, aucune perte) mais les ecritures metier
      // sont refusees en 402 jusqu'a souscription.
      lecture_seule: (essaiExpire || enAttenteActivation) && !abonnementActif,
      duree_essai_jours: Number(utilisateur.trial_days || TRIAL_DAYS),
      trial_start_at: utilisateur.trial_started_at
        ? new Date(utilisateur.trial_started_at).toISOString()
        : (enEssai || essaiExpire
          ? new Date(finValide.getTime() - TRIAL_DAYS * 86400000).toISOString()
          : null),
      trial_end_at: finValide ? finValide.toISOString() : null,
      jours_restants: joursRestants,
      plan_effectif: planEffectif,
      fonctions_ouvertes: fonctions,
      source_essai: 'users',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      portal_available: false,
    };
  }

  const sub = row.rows[0];
  // ── IMPAYÉ ET DÉLAI DE GRÂCE (audit Stripe du 22/09/2026) ──────────────────
  // Le statut `past_due` était toléré sans borne et sans date de début : on ne
  // pouvait ni le mesurer ni le borner. On expose désormais la date de début
  // d'impayé et la fin du délai de grâce ; la garde d'écriture applique
  // EXACTEMENT les mêmes règles (middleware/subscriptionGuard).
  const impayeDepuis = sub.status === 'past_due' ? (sub.past_due_since || null) : null;
  const delaiGraceJours = billingConfig.graceDays();
  const finDelaiGrace = billingConfig.graceDeadline(impayeDepuis, { jours: delaiGraceJours });
  const graceDepassee = billingConfig.graceExcedee(impayeDepuis, { jours: delaiGraceJours });
  const statutAutorise = ['trialing', 'active', 'past_due'].includes(sub.status) && !graceDepassee;

  return {
    organization_id: org.id,
    plan_code: sub.plan_code || 'starter',
    plan_name: sub.plan_name || 'Starter',
    status: sub.status,
    // Une souscription Stripe existe : c'est elle qui fait foi (essai Stripe ou
    // abonnement paye). `lecture_seule` est faux des que le statut est actif ET
    // que le délai de grâce d'impayé (s'il est configuré) n'est pas dépassé.
    trial_state: graceDepassee
      ? 'PAST_DUE_EXPIRED'
      : (sub.status === 'trialing'
        ? 'TRIAL_ACTIVE'
        : (['active', 'past_due'].includes(sub.status) ? 'SUBSCRIPTION_ACTIVE' : 'TRIAL_EXPIRED')),
    trial_active: sub.status === 'trialing',
    trial_expired: !statutAutorise,
    lecture_seule: !statutAutorise,
    impaye_depuis: impayeDepuis,
    delai_grace_jours: delaiGraceJours,
    fin_delai_grace: finDelaiGrace ? finDelaiGrace.toISOString() : null,
    grace_configuree: delaiGraceJours !== null,
    grace_depassee: graceDepassee,
    duree_essai_jours: TRIAL_DAYS,
    trial_start_at: sub.trial_start_at,
    trial_end_at: sub.trial_end_at,
    current_period_start: sub.current_period_start,
    current_period_end: sub.current_period_end,
    cancel_at_period_end: !!sub.cancel_at_period_end,
    portal_available: !!sub.stripe_customer_id,
    stripe_customer_id_masked: sub.stripe_customer_id
      ? `${sub.stripe_customer_id.slice(0, 6)}***${sub.stripe_customer_id.slice(-4)}`
      : null,
  };
}

module.exports = {
  TRIAL_DAYS,
  FISCAL_LABEL,
  getPlans,
  planPourMarche: (code, marche = 'FR') => planService.planPourCode(code, marche),
  safeUserId,
  ensureBillingFoundation,
  normalizePlanCode,
  getOrCreateOrganization,
  upsertOrganizationProfile,
  getPlanId,
  getBillingStatus,
};
