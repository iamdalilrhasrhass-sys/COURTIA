/**
 * billingConfig.test.js — LE DÉLAI DE GRÂCE NE S'INVENTE PAS, IL SE CONFIGURE.
 *
 * POURQUOI : l'audit du 22/09/2026 a montré qu'un impayé (`past_due`) était
 * toléré SANS BORNE et sans date de début, donc impossible à mesurer. La
 * correction stocke la date et sait appliquer une durée — mais AUCUNE durée
 * commerciale n'est choisie ici : sans `BILLING_GRACE_DAYS`, la tolérance reste
 * entière (comportement d'avant), et une valeur illisible ne coupe jamais
 * l'accès (une variable mal saisie ne doit pas fermer un cabinet).
 */
const billingConfig = require('./billingConfig');

describe('billingConfig — durée d’essai, délai de grâce, planification', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  test('durée d’essai : 7 jours par défaut, surchargeable et jamais nulle', () => {
    delete process.env.BILLING_TRIAL_DAYS;
    expect(billingConfig.trialDays()).toBe(7);

    process.env.BILLING_TRIAL_DAYS = '14';
    expect(billingConfig.trialDays()).toBe(14);

    process.env.BILLING_TRIAL_DAYS = '0';
    expect(billingConfig.trialDays()).toBe(7);

    process.env.BILLING_TRIAL_DAYS = 'n’importe quoi';
    expect(billingConfig.trialDays()).toBe(7);
  });

  test('délai de grâce : AUCUNE limite tant qu’aucune valeur n’est configurée', () => {
    delete process.env.BILLING_GRACE_DAYS;
    expect(billingConfig.graceDays()).toBeNull();
    // Sans durée configurée, la grâce n'est jamais « dépassée », même après des années.
    expect(billingConfig.graceExcedee('2020-01-01T00:00:00Z')).toBe(false);
    expect(billingConfig.graceDeadline('2020-01-01T00:00:00Z')).toBeNull();
  });

  test('délai de grâce configuré : la borne se calcule depuis la date d’impayé', () => {
    process.env.BILLING_GRACE_DAYS = '5';
    expect(billingConfig.graceDays()).toBe(5);

    const ilYa10Jours = new Date(Date.now() - 10 * 86400000).toISOString();
    expect(billingConfig.graceExcedee(ilYa10Jours)).toBe(true);

    const ilYa2Jours = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(billingConfig.graceExcedee(ilYa2Jours)).toBe(false);

    const fin = billingConfig.graceDeadline(ilYa2Jours);
    expect(fin).toBeInstanceOf(Date);
    expect(Math.round((fin.getTime() - (Date.now() - 2 * 86400000)) / 86400000)).toBe(5);
  });

  test('délai de grâce à 0 : coupure dès le premier jour d’impayé', () => {
    process.env.BILLING_GRACE_DAYS = '0';
    expect(billingConfig.graceExcedee(new Date().toISOString())).toBe(true);
  });

  test('valeur illisible : on garde le comportement sans limite plutôt que de couper', () => {
    process.env.BILLING_GRACE_DAYS = 'abc';
    expect(billingConfig.graceDays()).toBeNull();
    expect(billingConfig.graceExcedee('2020-01-01T00:00:00Z')).toBe(false);

    process.env.BILLING_GRACE_DAYS = '-3';
    expect(billingConfig.graceDays()).toBeNull();
  });

  test('réconciliation : aucune planification par défaut (décision d’exploitation)', () => {
    delete process.env.BILLING_RECONCILIATION_CRON;
    expect(billingConfig.reconciliationCron()).toBeNull();

    process.env.BILLING_RECONCILIATION_CRON = '30 4 * * *';
    expect(billingConfig.reconciliationCron()).toBe('30 4 * * *');
  });
});
