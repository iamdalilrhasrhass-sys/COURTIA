/**
 * billingReconciliationService.test.js — RÉCONCILIER SANS RIEN INVENTER.
 *
 * POURQUOI CE FICHIER EXISTE (audit Stripe du 22/09/2026, confirmé par TypeSafe) :
 * le webhook était le SEUL chemin d'écriture de l'état d'abonnement. Un webhook
 * perdu laissait un cabinet payant sans droits (ou résilié avec droits) sans que
 * rien ne le signale. La réconciliation est la réparation — elle doit donc être
 * prouvée sur ses propriétés dangereuses :
 *   1. elle CRÉE l'abonnement manquant et redonne les bons droits ;
 *   2. elle est IDEMPOTENTE (réexécutée, elle n'écrit plus rien) ;
 *   3. elle n'INVENTE jamais un plan (prix inconnu => signalé, aucune écriture) ;
 *   4. elle ne SUPPRIME rien (une ligne en base absente de Stripe est signalée) ;
 *   5. elle n'écrit RIEN chez Stripe (aucune méthode d'écriture appelée) ;
 *   6. une erreur sur un cabinet n'interrompt pas les autres ;
 *   7. elle laisse un rapport consultable.
 */
const etatAbonnement = require('./billingSubscriptionState');
const reconciliation = require('./billingReconciliationService');

const ORG_CH = 77;
const ORG_FR = 78;
const USER_CH = 42;
const USER_FR = 43;
const CUS_CH = 'cus_ch_test';
const CUS_FR = 'cus_fr_test';
const PRIX_CH = 'price_test_independant';
const PRIX_FR = 'price_test_pro';

/** Base simulée : on enregistre les écritures au lieu de les interpréter. */
function creerBase() {
  const etat = {
    clients: { [CUS_CH]: ORG_CH, [CUS_FR]: ORG_FR },
    proprietaires: { [ORG_CH]: USER_CH, [ORG_FR]: USER_FR },
    abonnements: new Map(),
    ecrituresUtilisateurs: [],
    ecrituresVueHistorique: [],
    runs: [],
    suppressions: 0,
    prochainId: 300,
  };

  const query = jest.fn(async (sql, params = []) => {
    const s = String(sql);
    if (/^\s*(CREATE|ALTER|COMMENT|DROP)/i.test(s)) return { rows: [] };

    if (/FROM customer_billing_profiles\s+WHERE stripe_customer_id IS NOT NULL/.test(s)) {
      return { rows: Object.entries(etat.clients).map(([cus, org]) => ({ organization_id: org, stripe_customer_id: cus })) };
    }
    if (/SELECT owner_user_id FROM organization_profiles WHERE id=/.test(s) || /SELECT op\.owner_user_id/.test(s)) {
      const uid = etat.proprietaires[Number(params[0])];
      return { rows: uid ? [{ owner_user_id: uid, cabinet_id: null }] : [] };
    }
    if (/FROM billing_plans WHERE code=/.test(s)) {
      return { rows: [{ id: { starter: 1, pro: 2, cabinet: 3, independant: 76, cabinet_ch: 77 }[params[0]] || null }] };
    }
    if (/SELECT id, organization_id, plan_id, status, trial_end_at, current_period_end, cancel_at_period_end\s+FROM subscriptions WHERE provider_subscription_id=/.test(s)) {
      const ligne = etat.abonnements.get(params[0]);
      return { rows: ligne ? [ligne] : [] };
    }
    if (/SELECT id, status, last_event_created_at, past_due_since FROM subscriptions WHERE provider_subscription_id=/.test(s)) {
      const ligne = etat.abonnements.get(params[0]);
      return { rows: ligne ? [{ id: ligne.id, status: ligne.status, last_event_created_at: ligne.last_event_created_at || null, past_due_since: null }] : [] };
    }
    if (/SELECT provider_subscription_id, status FROM subscriptions\s+WHERE organization_id=/.test(s)) {
      const lignes = [...etat.abonnements.values()].filter((l) => Number(l.organization_id) === Number(params[0]));
      return { rows: lignes.map((l) => ({ provider_subscription_id: l.provider_subscription_id, status: l.status })) };
    }
    if (/INSERT INTO subscriptions/.test(s)) {
      const ligne = {
        id: etat.prochainId++,
        organization_id: params[0],
        plan_id: params[1],
        provider_subscription_id: params[2],
        status: params[3],
        trial_end_at: params[5] || null,
        current_period_end: params[7] || null,
        cancel_at_period_end: !!params[8],
      };
      etat.abonnements.set(params[2], ligne);
      return { rows: [{ id: ligne.id }] };
    }
    if (/UPDATE subscriptions/.test(s)) {
      const id = params[params.length - 1];
      const ligne = [...etat.abonnements.values()].find((l) => l.id === id);
      if (ligne) {
        ligne.status = params[2];
        ligne.plan_id = params[1];
        ligne.cancel_at_period_end = !!params[7];
        ligne.current_period_end = params[6] || ligne.current_period_end;
      }
      return { rows: [] };
    }
    if (/INSERT INTO billing_subscriptions/.test(s)) { etat.ecrituresVueHistorique.push(params); return { rows: [] }; }
    if (/UPDATE users/.test(s)) { etat.ecrituresUtilisateurs.push(params); return { rows: [] }; }
    if (/INSERT INTO billing_reconciliation_runs/.test(s)) { etat.runs.push(params); return { rows: [] }; }
    if (/DELETE/i.test(s)) { etat.suppressions += 1; return { rows: [] }; }
    return { rows: [] };
  });

  return { etat, query };
}

function abonnementStripe({ id, status = 'active', prix = PRIX_CH, updated = 1790000000, customer = CUS_CH, metadata = {} }) {
  return {
    id,
    status,
    customer,
    updated,
    metadata,
    trial_start: null,
    trial_end: null,
    current_period_start: updated - 1000,
    current_period_end: updated + 2000000,
    cancel_at_period_end: false,
    items: { data: [{ price: { id: prix } }] },
  };
}

/** Client Stripe EN LECTURE SEULE : toute écriture lève une erreur explicite. */
function creerStripe({ parClient, erreurSur } = {}) {
  return {
    subscriptions: {
      list: jest.fn(async ({ customer }) => {
        if (erreurSur && customer === erreurSur) throw new Error('stripe_injoignable (test)');
        return { data: parClient?.[customer] || [], has_more: false };
      }),
      create: jest.fn(async () => { throw new Error('ÉCRITURE INTERDITE : la réconciliation ne doit jamais écrire chez Stripe'); }),
      update: jest.fn(async () => { throw new Error('ÉCRITURE INTERDITE'); }),
      del: jest.fn(async () => { throw new Error('ÉCRITURE INTERDITE'); }),
      cancel: jest.fn(async () => { throw new Error('ÉCRITURE INTERDITE'); }),
    },
  };
}

const getPlanId = async (code) => ({ starter: 1, pro: 2, cabinet: 3, independant: 76, cabinet_ch: 77 }[code] || null);
const prixVersPlan = new Map([[PRIX_CH, 'independant'], [PRIX_FR, 'pro']]);

describe('réconciliation Stripe -> base', () => {
  test('reconstitue un abonnement suisse manquant et rend les BONS droits', async () => {
    const { etat, query } = creerBase();
    const stripe = creerStripe({ parClient: { [CUS_CH]: [abonnementStripe({ id: 'sub_manquant' })] } });

    const rapport = await reconciliation.reconcilierTous({ stripe, query, getPlanId, prixVersPlan, journaliser: null });

    expect(rapport.cabinets_examines).toBe(2);
    expect(rapport.appliques).toBe(1);
    const ligne = etat.abonnements.get('sub_manquant');
    expect(ligne).toBeDefined();
    expect(ligne.status).toBe('active');
    expect(ligne.organization_id).toBe(ORG_CH);

    const ecriture = etat.ecrituresUtilisateurs.at(-1);
    expect(ecriture[0]).toBe('independant');   // jamais « starter »
    expect(ecriture.at(-1)).toBe(USER_CH);     // propriétaire du cabinet
    expect(etat.runs.length).toBe(1);          // rapport conservé
    expect(etat.suppressions).toBe(0);
  });

  test('IDEMPOTENTE : réexécutée, elle ne réécrit rien', async () => {
    const { etat, query } = creerBase();
    const stripe = creerStripe({ parClient: { [CUS_CH]: [abonnementStripe({ id: 'sub_ok' })] } });

    const premiere = await reconciliation.reconcilierTous({ stripe, query, getPlanId, prixVersPlan, journaliser: null });
    const ecrituresApresPremiere = etat.ecrituresUtilisateurs.length;

    const seconde = await reconciliation.reconcilierTous({ stripe, query, getPlanId, prixVersPlan, journaliser: null });

    expect(premiere.appliques).toBe(1);
    expect(seconde.appliques).toBe(0);
    expect(seconde.deja_a_jour).toBe(1);
    expect(etat.ecrituresUtilisateurs.length).toBe(ecrituresApresPremiere);
  });

  test('N’INVENTE PAS de plan : prix inconnu => signalé, aucune écriture', async () => {
    const { etat, query } = creerBase();
    const stripe = creerStripe({
      parClient: { [CUS_CH]: [abonnementStripe({ id: 'sub_inconnu', prix: 'price_etranger_inconnu' })] },
    });

    const rapport = await reconciliation.reconcilierTous({ stripe, query, getPlanId, prixVersPlan, journaliser: null });

    expect(rapport.appliques).toBe(0);
    expect(rapport.plan_non_identifie).toBe(1);
    expect(etat.abonnements.size).toBe(0);
    expect(etat.ecrituresUtilisateurs.length).toBe(0);
  });

  test('NE SUPPRIME RIEN : une ligne en base absente de Stripe est signalée', async () => {
    const { etat, query } = creerBase();
    etat.abonnements.set('sub_fantome', {
      id: 999, organization_id: ORG_CH, provider_subscription_id: 'sub_fantome', status: 'active',
    });
    const stripe = creerStripe({ parClient: { [CUS_CH]: [] } });

    const rapport = await reconciliation.reconcilierTous({ stripe, query, getPlanId, prixVersPlan, journaliser: null });

    expect(rapport.orphelins_base).toBe(1);
    expect(etat.abonnements.has('sub_fantome')).toBe(true);   // toujours là
    expect(etat.suppressions).toBe(0);
  });

  test('N’ÉCRIT JAMAIS chez Stripe (aucune méthode d’écriture appelée)', async () => {
    const { query } = creerBase();
    const stripe = creerStripe({ parClient: { [CUS_CH]: [abonnementStripe({ id: 'sub_lecture' })] } });

    await reconciliation.reconcilierTous({ stripe, query, getPlanId, prixVersPlan, journaliser: null });

    expect(stripe.subscriptions.create).not.toHaveBeenCalled();
    expect(stripe.subscriptions.update).not.toHaveBeenCalled();
    expect(stripe.subscriptions.del).not.toHaveBeenCalled();
    expect(stripe.subscriptions.cancel).not.toHaveBeenCalled();
  });

  test('une erreur Stripe sur un cabinet n’empêche pas les autres', async () => {
    const { query } = creerBase();
    const stripe = creerStripe({
      parClient: { [CUS_FR]: [abonnementStripe({ id: 'sub_fr', prix: PRIX_FR, customer: CUS_FR })] },
      erreurSur: CUS_CH,
    });

    const rapport = await reconciliation.reconcilierTous({ stripe, query, getPlanId, prixVersPlan, journaliser: null });

    expect(rapport.erreurs.length).toBe(1);
    expect(rapport.appliques).toBe(1);        // le cabinet FR a bien été rattrapé
    expect(rapport.erreurs[0].organization_id).toBe(ORG_CH);
  });

  test('déduction par le prix : un abonnement sans métadonnées est rattaché au bon plan', async () => {
    expect(reconciliation.codePlanDepuisAbonnement(abonnementStripe({ id: 'x' }), prixVersPlan)).toBe('independant');
    expect(reconciliation.codePlanDepuisAbonnement(
      abonnementStripe({ id: 'x', prix: 'price_etranger' }), prixVersPlan
    )).toBeNull();
    // Les métadonnées restent prioritaires quand elles existent.
    expect(reconciliation.codePlanDepuisAbonnement(
      abonnementStripe({ id: 'x', prix: 'price_etranger', metadata: { plan_code: 'pro' } }), prixVersPlan
    )).toBe('pro');
  });
});

describe('état d’abonnement : protection contre les événements en retard', () => {
  test('un événement plus ancien que l’état appliqué n’écrase rien, pas même la fiche du cabinet', async () => {
    const { etat, query } = creerBase();
    etat.abonnements.set('sub_recent', {
      id: 5, organization_id: ORG_CH, plan_id: 76, status: 'active',
      last_event_created_at: new Date('2030-01-01T00:00:00Z'), current_period_end: null, trial_end_at: null,
      cancel_at_period_end: false,
    });

    const resultat = await etatAbonnement.appliquerEtatAbonnement({
      query,
      getPlanId,
      organizationId: ORG_CH,
      planCode: 'independant',
      abonnement: abonnementStripe({ id: 'sub_recent', status: 'canceled', updated: 1780000000 }),
      eventCreatedAt: new Date('2029-01-01T00:00:00Z').toISOString(),
      eventId: 'evt_vieux',
    });

    expect(resultat.applied).toBe(false);
    expect(resultat.reason).toBe('evenement_en_retard');
    expect(etat.abonnements.get('sub_recent').status).toBe('active');
    expect(etat.ecrituresUtilisateurs.length).toBe(0);
  });

  test('un impayé pose une date de début, une régularisation l’efface', async () => {
    const { etat, query } = creerBase();
    await etatAbonnement.appliquerEtatAbonnement({
      query, getPlanId, organizationId: ORG_CH, planCode: 'independant',
      abonnement: abonnementStripe({ id: 'sub_impaye', status: 'past_due' }),
      eventCreatedAt: new Date().toISOString(), eventId: 'evt_impaye',
    });

    // Première écriture : l'abonnement est créé en impayé, avec sa DATE de début
    // d'impayé (sans elle, aucun délai de grâce n'est calculable).
    const insertion = query.mock.calls.find(([sql]) => /INSERT INTO subscriptions/.test(String(sql)));
    expect(insertion).toBeDefined();
    expect(insertion[1][3]).toBe('past_due');                       // statut
    expect(insertion[1][9]).toMatch(/^\d{4}-\d{2}-\d{2}T/);         // past_due_since posée
    expect(etat.abonnements.get('sub_impaye').status).toBe('past_due');

    // Régularisation : la même règle efface la date d'impayé (sortDeImpaye = vrai).
    await etatAbonnement.appliquerEtatAbonnement({
      query, getPlanId, organizationId: ORG_CH, planCode: 'independant',
      abonnement: abonnementStripe({ id: 'sub_impaye', status: 'active', updated: 1790009999 }),
      eventCreatedAt: new Date().toISOString(), eventId: 'evt_regularise',
    });
    const miseAJour = query.mock.calls.filter(([sql]) => /UPDATE subscriptions/.test(String(sql))).at(-1);
    expect(miseAJour).toBeDefined();
    expect(miseAJour[1][2]).toBe('active');   // nouveau statut
    expect(miseAJour[1][9]).toBe(true);       // sortDeImpaye => past_due_since effacée
  });
});
