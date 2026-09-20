/**
 * marcheCabinet.test.js — LE MARCHÉ APPARTIENT AU CABINET.
 *
 * POURQUOI CES TESTS (défauts P0 reproduits en production le 20/09/2026 sur un
 * cabinet suisse à plusieurs utilisateurs, c8bb6112-4ecf-4807-b01d-b8ca561d11db)
 *   • `GET /api/auth/me` répondait « CH / CHF » au propriétaire et « FR / EUR »
 *     à ses collègues DU MÊME CABINET : le marché était lu dans la fiche de la
 *     personne connectée (réponse dépendante de QUI appelle).
 *   • Le commercial ne pouvait pas produire de document (`orias_required`).
 * Ce que ces tests figent, ce sont donc deux propriétés :
 *   1. l'INVARIANCE : tous les membres d'un cabinet reçoivent la même réponse ;
 *   2. le REPLI mono-utilisateur : un compte sans cabinet garde exactement son
 *      comportement d'avant (son profil, puis la France).
 */
jest.mock('../db', () => ({ query: jest.fn() }));

const pool = require('../db');
const marcheCabinet = require('./marcheCabinet');

const CAB_CH = 'c8bb6112-4ecf-4807-b01d-b8ca561d11db';
const CAB_FR = 'f0f0f0f0-0000-4000-8000-000000000001';

/**
 * Faux lecteur SQL : répond selon la REQUÊTE réellement envoyée, comme le ferait
 * la base. Aucune route n'est devinée par le test — c'est le SQL émis qui décide.
 */
function baseSimulee({ cabinets = {}, appartenances = {}, referents = {}, profils = {} } = {}) {
  const appelees = [];
  return {
    appelees,
    async query(sql, params) {
      const texte = String(sql);
      appelees.push({ sql: texte, params });
      if (texte.includes('FROM cabinet_members') && texte.includes('JOIN broker_profiles')) {
        return { rows: referents[params[0]] ? [referents[params[0]]] : [] };
      }
      if (texte.includes('FROM cabinets')) {
        return { rows: cabinets[params[0]] ? [cabinets[params[0]]] : [] };
      }
      if (texte.includes('FROM cabinet_members')) {
        return { rows: appartenances[params[0]] || [] };
      }
      if (texte.includes('FROM broker_profiles')) {
        return { rows: profils[params[0]] ? [profils[params[0]]] : [] };
      }
      return { rows: [] };
    },
  };
}

const CABINET_CH_RENSEIGNE = {
  id: CAB_CH,
  name: 'Cabinet QA Multi A',
  country: 'CH',
  orias_number: null,
  registre_type: 'FINMA',
  registre_numero: 'F01234567',
  uid: 'CHE-123.456.789',
  canton: 'GE',
  telephone: '+41 22 000 00 00',
  adresse: 'Av. de Rumine 1',
  ville: 'Lausanne',
  code_postal: '1003',
  address_line1: null,
  postal_code: null,
  city: null,
  tutelle_authority: 'ACPR', // défaut de colonne resté en base
};

describe('marcheDuCabinet — le cabinet décide', () => {
  test('un cabinet domicilié en Suisse donne CH / CHF', async () => {
    const base = baseSimulee({ cabinets: { [CAB_CH]: CABINET_CH_RENSEIGNE } });
    const verdict = await marcheCabinet.marcheDuCabinet(CAB_CH, { query: base.query });
    expect(verdict).toMatchObject({ marche: 'CH', devise: 'CHF', source: 'cabinet.country' });
    expect(verdict.pays).toBe('CH');
  });

  test('le pays « France » posé par défaut de colonne n’est PAS une décision : le référent tranche', async () => {
    const base = baseSimulee({
      cabinets: { [CAB_CH]: { id: CAB_CH, name: 'Cabinet COURTIA', country: 'France', tutelle_authority: 'ACPR' } },
      referents: { [CAB_CH]: { user_id: 42, pays: 'CH', registre_type: 'FINMA', registre_numero: 'F01234567', uid: 'CHE-123.456.789' } },
    });
    const verdict = await marcheCabinet.marcheDuCabinet(CAB_CH, { query: base.query });
    expect(verdict).toMatchObject({ marche: 'CH', devise: 'CHF', source: 'cabinet.referent' });
  });

  test('un cabinet suisse sans pays mais avec un registre FINMA est suisse', async () => {
    const base = baseSimulee({
      cabinets: { [CAB_CH]: { id: CAB_CH, name: 'X', country: null, registre_type: 'FINMA' } },
    });
    const verdict = await marcheCabinet.marcheDuCabinet(CAB_CH, { query: base.query });
    expect(verdict).toMatchObject({ marche: 'CH', devise: 'CHF', source: 'cabinet.registre_type' });
  });

  test('un cabinet français reste en euros', async () => {
    const base = baseSimulee({
      cabinets: { [CAB_FR]: { id: CAB_FR, name: 'Cabinet France', country: 'France', orias_number: '07000000' } },
      referents: { [CAB_FR]: { user_id: 5, pays: 'FR', orias: '07000000' } },
    });
    const verdict = await marcheCabinet.marcheDuCabinet(CAB_FR, { query: base.query });
    // 'France' est un défaut de colonne : le référent (FR) confirme l'euro.
    expect(verdict).toMatchObject({ marche: 'FR', devise: 'EUR' });
  });

  test('aucun cabinet : marché par défaut, jamais un marché inventé', async () => {
    const base = baseSimulee();
    const verdict = await marcheCabinet.marcheDuCabinet(null, { query: base.query });
    expect(verdict).toMatchObject({ marche: 'FR', devise: 'EUR', source: 'defaut_aucun_cabinet' });
    expect(base.appelees).toHaveLength(0);
  });

  test('migration 117 non appliquée : colonnes d’identité absentes ⇒ lecture de repli', async () => {
    const appels = [];
    const query = async (sql) => {
      const texte = String(sql);
      appels.push(texte);
      if (texte.includes('registre_type') && texte.includes('FROM cabinets')) {
        const err = new Error('column "registre_type" does not exist');
        err.code = '42703';
        throw err;
      }
      if (texte.includes('FROM cabinets')) return { rows: [{ id: CAB_CH, name: 'X', country: 'CH' }] };
      return { rows: [] };
    };
    const verdict = await marcheCabinet.marcheDuCabinet(CAB_CH, { query });
    expect(verdict).toMatchObject({ marche: 'CH', devise: 'CHF' });
    expect(appels.filter((s) => s.includes('FROM cabinets'))).toHaveLength(2);
  });
});

describe('marcheUtilisateur — invariance entre membres d’un même cabinet', () => {
  const baseMulti = () => baseSimulee({
    cabinets: { [CAB_CH]: { id: CAB_CH, name: 'Cabinet QA Multi A', country: 'France', tutelle_authority: 'ACPR' } },
    appartenances: {
      42: [{ cabinet_id: CAB_CH, role: 'owner' }],
      53: [{ cabinet_id: CAB_CH, role: 'broker' }],
      55: [{ cabinet_id: CAB_CH, role: 'assistant' }],
      56: [{ cabinet_id: CAB_CH, role: 'viewer' }],
    },
    referents: { [CAB_CH]: { user_id: 42, pays: 'CH', registre_type: 'FINMA', registre_numero: 'F01234567' } },
    profils: {
      // Le commercial n'a AUCUNE fiche : avant le correctif, il recevait « FR ».
      53: { user_id: 53 },
    },
  });

  test('propriétaire, commercial, assistant et lecteur reçoivent CH / CHF', async () => {
    for (const userId of [42, 53, 55, 56]) {
      const verdict = await marcheCabinet.marcheUtilisateur(userId, { query: baseMulti().query });
      expect({ userId, ...verdict }).toMatchObject({ userId, marche: 'CH', devise: 'CHF' });
    }
  });

  test('le profil du commercial suisse ne peut pas FAIRE BAISSER le marché du cabinet', async () => {
    // Un commercial établi en France qui travaille pour un cabinet suisse : la
    // réponse est celle du cabinet, pas la sienne (sinon deux écrans du même
    // cabinet afficheraient deux devises).
    const base = baseSimulee({
      cabinets: { [CAB_CH]: { id: CAB_CH, name: 'Cabinet QA Multi A', country: 'CH' } },
      appartenances: { 53: [{ cabinet_id: CAB_CH, role: 'broker' }] },
      profils: { 53: { user_id: 53, pays: 'FR' } },
    });
    const verdict = await marcheCabinet.marcheUtilisateur(53, { query: base.query });
    expect(verdict.marche).toBe('CH');
  });

  test('repli mono-utilisateur : sans cabinet, la fiche personnelle fait foi (comportement historique)', async () => {
    const base = baseSimulee({ profils: { 7: { user_id: 7, pays: 'CH', registre_type: 'FINMA' } } });
    const verdict = await marcheCabinet.marcheUtilisateur(7, { query: base.query });
    expect(verdict).toMatchObject({ marche: 'CH', devise: 'CHF', source: 'profil_utilisateur', cabinet_id: null });
  });

  test('repli mono-utilisateur : profil vide ⇒ France, jamais un autre pays', async () => {
    const base = baseSimulee({ profils: { 8: { user_id: 8 } } });
    const verdict = await marcheCabinet.marcheUtilisateur(8, { query: base.query });
    expect(verdict).toMatchObject({ marche: 'FR', devise: 'EUR', source: 'defaut_profil_vide' });
  });

  test('appartenance illisible ⇒ repli sur le profil de l’utilisateur, jamais un élargissement', async () => {
    const query = async (sql) => {
      const texte = String(sql);
      if (texte.includes('JOIN broker_profiles')) return { rows: [] };
      if (texte.includes('FROM cabinet_members')) throw new Error('relation indisponible');
      if (texte.includes('FROM broker_profiles')) return { rows: [{ user_id: 7, pays: 'CH' }] };
      return { rows: [] };
    };
    const verdict = await marcheCabinet.marcheUtilisateur(7, { query });
    expect(verdict).toMatchObject({ marche: 'CH', source: 'profil_utilisateur' });
  });

  test('les fonctions publiques marchent SANS lecteur injecté (appel réel des routes)', async () => {
    // DÉFAUT RÉELLEMENT RENCONTRÉ : `cabinetDeLUtilisateur(userId)` sans second
    // argument lançait `query is not a function`, l'erreur était absorbée par le
    // repli, et la route croyait que l'utilisateur n'avait pas de cabinet — le
    // marché retombait alors sur le profil de la personne (exactement le défaut
    // P0 que ce module corrige). Le pool par défaut est donc bien utilisé.
    pool.query.mockImplementation(async (sql) => {
      const texte = String(sql)
      if (texte.includes('FROM cabinet_members')) return { rows: [{ cabinet_id: CAB_CH, role: 'owner' }] }
      if (texte.includes('FROM cabinets')) return { rows: [{ id: CAB_CH, name: 'Cabinet QA', country: 'CH' }] }
      return { rows: [] }
    })
    await expect(marcheCabinet.cabinetDeLUtilisateur(42)).resolves.toEqual({ cabinet_id: CAB_CH, role: 'owner' })
    await expect(marcheCabinet.marcheUtilisateur(42)).resolves.toMatchObject({ marche: 'CH', devise: 'CHF', source: 'cabinet.country' })
  });

  test('marcheDeLaRequete lit l’identifiant du jeton (id ou userId)', async () => {
    const base = baseMulti();
    const verdict = await marcheCabinet.marcheDeLaRequete({ user: { userId: 53 } }, { query: base.query });
    expect(verdict).toMatchObject({ marche: 'CH', devise: 'CHF' });
    const autre = await marcheCabinet.marcheDeLaRequete({ user: { id: 56 } }, { query: baseMulti().query });
    expect(autre.devise).toBe('CHF');
  });
});

describe('identiteCabinet — le nom réel, jamais le gabarit', () => {
  test('« Cabinet COURTIA » (défaut de colonne) est remplacé par le nom réel du référent', async () => {
    const base = baseSimulee({
      cabinets: { [CAB_CH]: { id: CAB_CH, name: 'Cabinet COURTIA', country: 'CH', registre_type: 'FINMA', registre_numero: 'F01234567', tutelle_authority: 'ACPR' } },
      referents: { [CAB_CH]: { user_id: 42, cabinet: 'Red Team Alpha', pays: 'CH', registre_numero: 'F01234567', uid: 'CHE-123.456.789', canton: 'GE', ville: 'Genève' } },
    });
    const identite = await marcheCabinet.identiteCabinet(CAB_CH, { query: base.query });
    expect(identite.nom).toBe('Red Team Alpha');
    expect(identite.nom).not.toMatch(/COURTIA/i);
  });

  test('cabinet suisse : aucun ORIAS, autorité FINMA (jamais l’ACPR resté par défaut de colonne)', async () => {
    const base = baseSimulee({ cabinets: { [CAB_CH]: CABINET_CH_RENSEIGNE } });
    const identite = await marcheCabinet.identiteCabinet(CAB_CH, { query: base.query });
    expect(identite.orias).toBe('');
    expect(identite.tutelle_authority).toMatch(/FINMA/);
    expect(identite.devise).toBe('CHF');
    expect(identite.registre_numero).toBe('F01234567');
    expect(identite.canton).toBe('GE');
  });

  test('cabinet français : ORIAS conservé', async () => {
    const base = baseSimulee({
      cabinets: { [CAB_FR]: { id: CAB_FR, name: 'Cabinet France', country: 'France', orias_number: '07000000' } },
    });
    const identite = await marcheCabinet.identiteCabinet(CAB_FR, { query: base.query });
    expect(identite.orias).toBe('07000000');
    expect(identite.tutelle_authority).toBe('ACPR');
  });

  test('nomUtilisable refuse le gabarit et le vide', () => {
    expect(marcheCabinet.nomUtilisable('Cabinet COURTIA')).toBe(false);
    expect(marcheCabinet.nomUtilisable('  ')).toBe(false);
    expect(marcheCabinet.nomUtilisable(null)).toBe(false);
    expect(marcheCabinet.nomUtilisable('Red Team Alpha')).toBe(true);
  });
});

describe('mettreAJourIdentiteCabinet — l’écriture va sur le CABINET', () => {
  test('les colonnes jumelles et la normalisation du pays sont écrites', async () => {
    let vu = null;
    const query = async (sql, params) => {
      vu = { sql: String(sql), params };
      return { rowCount: 1, rows: [] };
    };
    const resultat = await marcheCabinet.mettreAJourIdentiteCabinet(CAB_CH, {
      cabinet: 'Century Finance',
      pays: 'Suisse',
      adresse: 'Av. de Rumine 1',
      ville: 'Lausanne',
      code_postal: '1003',
      registre_type: 'FINMA',
      registre_numero: 'F01234567',
      uid: 'CHE-123.456.789',
      canton: 'GE',
      telephone: '+41 22 000 00 00',
      orias: '',
    }, { query });
    expect(resultat.ok).toBe(true);
    expect(vu.sql).toContain('UPDATE cabinets SET');
    expect(vu.sql).toContain('name = $2');
    expect(vu.sql).toContain('country = ');
    expect(vu.params[0]).toBe(CAB_CH);
    expect(vu.params[1]).toBe('Century Finance');
    expect(vu.params).toContain('CH'); // « Suisse » normalisé en code pays
    expect(vu.params).toContain('FINMA');
    expect(vu.params).toContain('CHE-123.456.789');
    expect(vu.params).toContain(null); // ORIAS vidé explicitement ('' → NULL)
    // Colonnes jumelles historiques : la valeur est écrite DEUX fois (adresse,
    // ville, code postal), pour qu'aucun écran ne lise une colonne vide.
    expect(vu.params.filter((v) => v === 'Av. de Rumine 1')).toHaveLength(2);
    expect(vu.params.filter((v) => v === 'Lausanne')).toHaveLength(2);
    expect(vu.params.filter((v) => v === '1003')).toHaveLength(2);
    expect(vu.sql).toContain('address_line1 = ');
    expect(vu.sql).toContain('city = ');
    expect(vu.sql).toContain('postal_code = ');
  });

  test('un nom gabarit n’est jamais écrit', async () => {
    const query = async () => ({ rowCount: 1, rows: [] });
    const resultat = await marcheCabinet.mettreAJourIdentiteCabinet(CAB_CH, { cabinet: 'Cabinet COURTIA' }, { query });
    expect(resultat.ok).toBe(false);
    expect(resultat.motif).toMatch(/aucun champ/);
  });

  test('un champ non transmis n’efface rien, un champ vide remet à zéro explicitement', async () => {
    const appels = [];
    const query = async (sql, params) => { appels.push({ sql: String(sql), params }); return { rowCount: 1, rows: [] }; };
    await marcheCabinet.mettreAJourIdentiteCabinet(CAB_CH, { telephone: '  ' }, { query });
    expect(appels[0].sql).toContain('telephone = $2');
    expect(appels[0].params).toEqual([CAB_CH, null]);
    expect(appels[0].sql).not.toContain('adresse');
  });

  test('colonne absente (migration non appliquée) : l’échec est dit, pas maquillé', async () => {
    const query = async () => { const e = new Error('column "canton" does not exist'); e.code = '42703'; throw e; };
    const resultat = await marcheCabinet.mettreAJourIdentiteCabinet(CAB_CH, { canton: 'GE' }, { query });
    expect(resultat.ok).toBe(false);
    expect(resultat.motif).toMatch(/écriture refusée/);
  });
});
