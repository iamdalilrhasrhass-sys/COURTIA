/**
 * planService.marches.test.js — UN CABINET SUISSE ABONNÉ DOIT ÊTRE SERVI AVEC
 * SON PLAN, PAS AVEC LE PLAN DE REPLI FRANÇAIS.
 *
 * DÉFAUT P1 MESURÉ LE 22/09/2026 (audit Stripe de COURTIA) :
 *   Le webhook `checkout.session.completed` écrit `users.plan = plan_code`, donc
 *   `independant` ou `cabinet_ch` pour un cabinet suisse. Or `getUserPlanInfo`
 *   ne cherchait ce code que dans le catalogue FRANÇAIS (`PLANS`) et retombait
 *   sinon sur `DEFAULT_PLAN = 'starter'`.
 *   Conséquence prouvée par exécution : un cabinet suisse ABONNÉ (199 CHF/mois,
 *   statut `active`) recevait `plan: 'starter'`, `price: 89`, `ark_full: false`,
 *   `multi_user: false` — c'est-à-dire une rétrogradation au plan d'entrée
 *   français APRÈS avoir payé l'offre suisse. `checkFeatureAccess(1,'multi_user')`
 *   répondait `false`.
 *   `getFeatureGate` et `getUsageLimit` (utilisés par `middleware/planGating`)
 *   avaient le même angle mort : ils ne lisaient que `PLANS`.
 *
 * RÈGLE GARDÉE ICI : tous les codes de plan servis par l'API (FR ET CH) doivent
 * être résolus par les services de plans. Les codes FRANÇAIS ne changent pas.
 */
jest.mock('../db', () => ({ query: jest.fn() }));

const pool = require('../db');
const planService = require('./planService');

function utilisateur(plan, statut = 'active', trialEndsAt = null) {
  pool.query.mockResolvedValue({
    rows: [{
      id: 1,
      plan,
      subscription_status: statut,
      trial_ends_at: trialEndsAt,
      stripe_customer_id: 'cus_test',
      stripe_subscription_id: 'sub_test',
    }],
  });
}

describe('planService : résolution des plans des deux marchés', () => {
  beforeEach(() => pool.query.mockReset());

  test('cabinet suisse abonné « independant » (199 CHF) : ses fonctions sont intactes', async () => {
    utilisateur('independant');
    const info = await planService.getUserPlanInfo(1);

    expect(info.plan).toBe('independant');
    expect(info.price).toBe(199);
    expect(info.features.ark_full).toBe(true);
    expect(info.features.multi_user).toBe(true);
    expect(info.features.benchmarks).toBe(false); // offre Indépendant, pas Cabinet
  });

  test('cabinet suisse abonné « cabinet_ch » (349 CHF) : ses fonctions sont intactes', async () => {
    utilisateur('cabinet_ch');
    const info = await planService.getUserPlanInfo(1);

    expect(info.plan).toBe('cabinet_ch');
    expect(info.price).toBe(349);
    expect(info.features.benchmarks).toBe(true);
    expect(info.features.premium_support).toBe(true);
  });

  test('grille française INCHANGÉE : starter, pro et essai', async () => {
    utilisateur('starter');
    expect((await planService.getUserPlanInfo(1)).price).toBe(89);

    utilisateur('pro');
    const pro = await planService.getUserPlanInfo(1);
    expect(pro.plan).toBe('pro');
    expect(pro.price).toBe(159);

    // Compte en essai : fonctions Pro, libellé « Pro (essai) », plan effectif pro.
    utilisateur('trial', 'trialing', new Date(Date.now() + 3 * 86400000).toISOString());
    const essai = await planService.getUserPlanInfo(1);
    expect(essai.on_trial).toBe(true);
    expect(essai.plan).toBe('pro');
    expect(essai.features.multi_user).toBe(true);
  });

  test('getFeatureGate et getUsageLimit reconnaissent un code suisse', () => {
    expect(planService.getFeatureGate('independant', 'multi_user')).toBe(true);
    expect(planService.getFeatureGate('cabinet_ch', 'benchmarks')).toBe(true);
    expect(planService.getFeatureGate('cabinet_ch_sur_devis', 'benchmarks')).toBe(true);
    expect(planService.getFeatureGate('starter', 'multi_user')).toBe(false);
    expect(planService.getUsageLimit('independant', 'max_clients')).toBeGreaterThan(0);
  });

  test('checkFeatureAccess suit le plan réellement payé', async () => {
    utilisateur('independant');
    await expect(planService.checkFeatureAccess(1, 'multi_user')).resolves.toBe(true);

    utilisateur('starter');
    await expect(planService.checkFeatureAccess(1, 'multi_user')).resolves.toBe(false);
  });
});
