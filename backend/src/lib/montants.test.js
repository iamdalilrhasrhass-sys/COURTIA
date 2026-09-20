/**
 * montants.test.js — une valeur fautive ne doit JAMAIS casser un écran.
 *
 * POURQUOI CES TESTS (défaut P0 reproduit le 20/09/2026)
 * `POST /api/contrats {"prime_annuelle":"abc"}` répondait 201 ; la liste des
 * clients, /api/reporting/overview et /api/dashboard/stats tombaient ensuite en
 * 500 (« invalid input syntax for type numeric: "abc" ») pour TOUT le cabinet.
 * `-2000` faisait DIMINUER le total de primes du cockpit ; `99999999999999`
 * était accepté tel quel.
 */
const { montantOuNull, montantExige, erreurMontant, montantSur, PLAFOND_MONTANT, MOTIFS } = require('./montants');

describe('montantOuNull — refus explicite des montants inexploitables', () => {
  test('un texte n’est pas un montant', () => {
    for (const valeur of ['abc', '12abc', '1e5', 'NaN', 'Infinity', '1/2', '--3']) {
      const verdict = montantOuNull(valeur);
      expect({ valeur, ...verdict }).toMatchObject({ valeur, ok: false, motif: MOTIFS.NON_NUMERIQUE });
    }
  });

  test('un montant négatif est refusé', () => {
    const verdict = montantOuNull(-2000);
    expect(verdict).toMatchObject({ ok: false, motif: MOTIFS.NEGATIF });
    expect(verdict.message).toMatch(/négatif/);
  });

  test('un montant au-delà du plafond est refusé, avec le plafond annoncé', () => {
    const verdict = montantOuNull(99999999999999);
    expect(verdict).toMatchObject({ ok: false, motif: MOTIFS.HORS_PLAFOND, plafond: PLAFOND_MONTANT });
    expect(verdict.message).toMatch(/plafond/i);
    expect(montantOuNull(PLAFOND_MONTANT).ok).toBe(true);
    expect(montantOuNull(PLAFOND_MONTANT + 1).ok).toBe(false);
  });

  test('les écritures réelles d’un courtier sont acceptées', () => {
    expect(montantOuNull(1450.5)).toEqual({ ok: true, valeur: 1450.5 });
    expect(montantOuNull('1450,50')).toEqual({ ok: true, valeur: 1450.5 });
    expect(montantOuNull("1'450.50")).toEqual({ ok: true, valeur: 1450.5 });
    expect(montantOuNull('1 450.50')).toEqual({ ok: true, valeur: 1450.5 });
    expect(montantOuNull('+120')).toEqual({ ok: true, valeur: 120 });
    expect(montantOuNull(0)).toEqual({ ok: true, valeur: 0 });
    expect(montantOuNull('1450.555')).toEqual({ ok: true, valeur: 1450.56 }); // centime
  });

  test('absent ou vide : absence de mesure, jamais un zéro inventé', () => {
    expect(montantOuNull(undefined)).toEqual({ ok: true, valeur: null });
    expect(montantOuNull(null)).toEqual({ ok: true, valeur: null });
    expect(montantOuNull('   ')).toEqual({ ok: true, valeur: null });
  });

  test('montantExige refuse l’absence (utilisé là où l’absence serait un faux succès)', () => {
    expect(montantExige('')).toMatchObject({ ok: false });
    expect(montantExige('120')).toMatchObject({ ok: true, valeur: 120 });
  });

  test('erreurMontant produit un 400 prêt à servir', () => {
    const corps = erreurMontant('prime_annuelle', montantOuNull('abc'));
    expect(corps).toMatchObject({ error: 'montant_invalide', champ: 'prime_annuelle', motif: MOTIFS.NON_NUMERIQUE });
    expect(typeof corps.message).toBe('string');
  });
});

describe('montantSur — le cast tolérant qui protège listes et KPI', () => {
  test('le fragment n’appelle jamais un cast direct sur la valeur brute', () => {
    const fragment = montantSur('q');
    expect(fragment).toContain("q.quote_data->>'prime_annuelle'");
    // Le motif qui autorise le cast : chiffres, séparateur décimal optionnel,
    // signe optionnel — rien d'autre.
    expect(fragment).toContain("~ '^[[:space:]]*[+-]?[0-9]+([.,][0-9]+)?[[:space:]]*$'");
    expect(fragment).toContain('::numeric');
    // Le cast est DANS le CASE : une valeur qui ne correspond pas vaut NULL.
    expect(fragment.indexOf('CASE WHEN')).toBeLessThan(fragment.indexOf('::numeric'));
  });

  test('le champ est paramétrable (autres montants du même JSON)', () => {
    expect(montantSur('q', 'prime_mensuelle')).toContain("q.quote_data->>'prime_mensuelle'");
  });
});
