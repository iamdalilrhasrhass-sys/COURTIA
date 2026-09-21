/**
 * cabinetMembershipService.identite-marche.test.js — UN CABINET NAÎT AVEC SON
 * IDENTITÉ DE MARCHÉ, OU SANS RIEN.
 *
 * DÉFAUT MESURÉ EN PRODUCTION (21/09/2026, comptes pilotes) :
 *   cabinets · Century Finance  → country CH, registre_type FINMA, uid CHE-415…
 *   cabinets · Spondeo Sàrl     → country NULL, registre_type NULL, uid NULL
 * Le cabinet était créé avec un nom et un ORIAS, rien d'autre
 * (`INSERT INTO cabinets (name, created_by, orias_number, …)`) ; l'identité de
 * marché n'était reprise qu'à la première sauvegarde des paramètres. Les écrans
 * affichaient malgré tout le bon référentiel (relu sur `broker_profiles`), mais
 * toute lecture directe de `cabinets` voyait un cabinet sans marché — un cabinet
 * suisse sans pays étant indistinguable d'un cabinet non renseigné.
 *
 * CE QUE CE TEST VERROUILLE
 *   1. profil suisse → la ligne `cabinets` reçoit pays, registre, numéro, UID ;
 *   2. profil vide → AUCUNE valeur n'est inventée (pas de « France », pas
 *      d'« ORIAS ») : les champs absents ne sont pas écrits du tout.
 */
const service = require('./cabinetMembershipService')

function createPoolMock() {
  const state = { cabinets: [], memberships: [], misesAJour: [] }

  const pool = {
    state,
    async query(sql, params = []) {
      const compact = sql.replace(/\s+/g, ' ').trim()

      if (compact.includes('FROM cabinet_members cm') && compact.includes('cm.user_id = $1')) {
        return { rows: [] }                       // aucun cabinet existant
      }
      if (compact.includes('first_name, last_name, cabinet_name FROM users')) {
        return { rows: [{ first_name: 'Alessandro', last_name: 'Prodomo', cabinet_name: null }] }
      }
      if (compact.startsWith('INSERT INTO cabinets')) {
        const row = { id: 'cab-1', name: params[0], created_by: params[1], orias_number: params[2] || '' }
        state.cabinets.push(row)
        return { rows: [row] }
      }
      if (compact.startsWith('UPDATE cabinets SET')) {
        state.misesAJour.push({ sql: compact, params })
        return { rows: [], rowCount: 1 }
      }
      if (compact.startsWith('INSERT INTO cabinet_members')) {
        const row = { id: 'member-1', cabinet_id: params[0], user_id: params[1], role: params[2] }
        state.memberships.push(row)
        return { rows: [row] }
      }
      return { rows: [], rowCount: 0 }
    },
  }
  return pool
}

/** Colonnes réellement écrites dans le dernier UPDATE cabinets. */
function colonnesEcrites(pool) {
  const derniere = pool.state.misesAJour[pool.state.misesAJour.length - 1]
  if (!derniere) return {}
  const champs = {}
  const corps = derniere.sql.replace(/^UPDATE cabinets SET /, '').replace(/, updated_at = NOW\(\).*$/, '')
  for (const morceau of corps.split(', ')) {
    const [colonne, marqueur] = morceau.split(' = ')
    const index = Number(String(marqueur).replace('$', '')) - 1
    champs[colonne] = derniere.params[index]
  }
  return champs
}

describe('ensureUserCabinet — identité de marché reprise du profil', () => {
  test('profil suisse : pays, registre, numéro et UID sont écrits sur le cabinet', async () => {
    const pool = createPoolMock()
    await service.ensureUserCabinet(pool, 14, {
      pays: 'CH',
      registre_type: 'FINMA',
      registre_numero: 'F01387633',
      uid: 'CHE-250.353.619',
      canton: null,                       // non renseigné : ne doit pas être inventé
      cabinet: 'Spondeo Sàrl',
    })
    const champs = colonnesEcrites(pool)
    expect(champs.country).toBe('CH')
    expect(champs.registre_type).toBe('FINMA')
    expect(champs.registre_numero).toBe('F01387633')
    expect(champs.uid).toBe('CHE-250.353.619')
    // Aucune valeur par défaut : ni pays français, ni numéro de registre français.
    // (On vérifie les VALEURS : `orias_number: null` est la colonne légitime, vide
    // pour un cabinet suisse — c'est justement ce qu'il faut : rien d'inventé.)
    const valeurs = JSON.stringify(Object.entries(champs).filter(([c]) => c !== 'orias_number'))
    expect(valeurs).not.toMatch(/France|ORIAS|SIRET|FRA/i)
    expect(champs.orias_number).toBeNull()
  })

  test('profil vide : aucune valeur de marché n’est inventée', async () => {
    const pool = createPoolMock()
    await service.ensureUserCabinet(pool, 14, {})
    const champs = colonnesEcrites(pool)
    expect(champs.country).toBeUndefined()
    expect(champs.registre_type).toBeUndefined()
    expect(champs.registre_numero).toBeUndefined()
    expect(champs.uid).toBeUndefined()
    // …et le cabinet existe bien, avec son nom.
    expect(pool.state.cabinets).toHaveLength(1)
    expect(pool.state.memberships).toHaveLength(1)
  })

  test('pays en toutes lettres : « Suisse » est normalisé en CH', async () => {
    const pool = createPoolMock()
    await service.ensureUserCabinet(pool, 14, { pays: 'Suisse', cabinet: 'Cabinet CH' })
    expect(colonnesEcrites(pool).country).toBe('CH')
  })
})
