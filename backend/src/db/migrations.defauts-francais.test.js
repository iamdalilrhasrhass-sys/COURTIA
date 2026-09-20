/**
 * migrations.defauts-francais.test.js — PLUS AUCUN DÉFAUT DE COLONNE FRANÇAIS
 * DANS LES FICHIERS DE SCHÉMA.
 *
 * POURQUOI CE GARDE-FOU (défaut P0 CH-005, mesuré le 20/09/2026)
 * `clients.country` portait encore `DEFAULT 'France'` en production : un client
 * créé sans pays (le cas NORMAL — l'écran de création ne demande pas le pays)
 * devenait français, quelle que soit la domiciliation du cabinet. La migration
 * 119 l'a retiré, mais le défaut était écrit dans PLUSIEURS fichiers de schéma :
 * il suffisait qu'une base soit reconstruite depuis ces fichiers pour que le
 * défaut réapparaisse en silence.
 *
 * Ce test lit donc les fichiers de schéma RÉELS (commentaires retirés) et refuse
 * toute valeur française posée par défaut sur un pays, une devise ou une autorité
 * de tutelle. Il ne juge PAS les commentaires : une explication qui cite le
 * défaut (« DEFAULT 'France' faisait naître… ») reste légitime et utile.
 */
const fs = require('fs')
const path = require('path')

const RACINE_DEPOT = path.join(__dirname, '..', '..', '..')

/** Tous les fichiers SQL de schéma/migration du dépôt (chemins relatifs). */
const FICHIERS = [
  'backend/src/db/migrations',
  'backend/migrations',
  'backend/sql/migrations',
].flatMap((dossier) => {
  const absolu = path.join(RACINE_DEPOT, dossier)
  if (!fs.existsSync(absolu)) return []
  return fs.readdirSync(absolu)
    .filter((f) => f.endsWith('.sql'))
    .map((f) => path.join(dossier, f))
})
  .concat(['database/schema.sql', 'database/schema-fixed.sql', 'database/schema.sqlite.sql'])
  .filter((relatif) => fs.existsSync(path.join(RACINE_DEPOT, relatif)))

/** Retire les commentaires SQL : ce sont des explications, pas du code exécuté. */
function sansCommentaires(sql) {
  return String(sql)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((ligne) => ligne.replace(/--.*$/, ''))
    .join('\n')
}

const DEFAUTS_INTERDITS = [
  { motif: /DEFAULT\s+'France'/i, libelle: "DEFAULT 'France' (pays)" },
  { motif: /DEFAULT\s+'eur'/i, libelle: "DEFAULT 'eur' (devise)" },
  { motif: /DEFAULT\s+'EUR'/i, libelle: "DEFAULT 'EUR' (devise)" },
  { motif: /DEFAULT\s+'ACPR'/i, libelle: "DEFAULT 'ACPR' (autorité de tutelle)" },
  { motif: /DEFAULT\s+'4 place de Budapest/i, libelle: "adresse parisienne de l'ACPR par défaut" },
]

describe('schéma — aucun défaut de colonne français', () => {
  test('les fichiers de schéma sont bien trouvés (sinon le test ne garde rien)', () => {
    expect(FICHIERS.length).toBeGreaterThan(15)
    expect(FICHIERS).toContain('backend/src/db/migrations/101_tables_lots_non_appliques.sql')
    expect(FICHIERS).toContain('backend/src/db/migrations/104_tables_billing_legal_import.sql')
  })

  test.each(DEFAUTS_INTERDITS)('aucun fichier ne pose $libelle', ({ motif, libelle }) => {
    const coupables = []
    for (const relatif of FICHIERS) {
      const contenu = sansCommentaires(fs.readFileSync(path.join(RACINE_DEPOT, relatif), 'utf8'))
      if (motif.test(contenu)) coupables.push(relatif)
    }
    // Aucun fichier ne doit poser ce défaut (le diff Jest nomme le coupable).
    expect({ libelle, coupables }).toEqual({ libelle, coupables: [] })
  })

  test('la migration 120 retire les défauts sur les colonnes de pays et de devise', () => {
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', '120_plus_aucun_defaut_francais_pays_devise.sql'), 'utf8'
    )
    // Idempotence : DROP DEFAULT, jamais de destruction de données.
    expect(sql).toMatch(/DROP DEFAULT/)
    expect(sql).not.toMatch(/DROP COLUMN/i)
    expect(sql).not.toMatch(/DELETE FROM/i)
    for (const colonne of ['clients', 'broker_profile_settings', 'organization_profiles',
      'commissions', 'billing_invoices', 'invoices', 'billing_plans', 'accounting_entries']) {
      expect(sql).toContain(`'${colonne}'`)
    }
    // Le contrôle final échoue si un défaut français subsiste : il est bien là.
    expect(sql).toMatch(/RAISE EXCEPTION/)
  })

  test('l’exception documentée se limite au fuseau des rendez-vous (writers à corriger)', () => {
    const sql = fs.readFileSync(
      path.join(__dirname, 'migrations', '120_plus_aucun_defaut_francais_pays_devise.sql'), 'utf8'
    )
    // `appointments.timezone DEFAULT 'Europe/Paris'` n'est PAS traité dans cette
    // migration : tous les writers omettent la colonne, la retirer écrirait NULL.
    // Le test vérifie que l'exception est EXPLICITE (pas un oubli silencieux).
    expect(sql).toContain("table_name = 'appointments' AND column_name = 'timezone'")
    expect(sql).toMatch(/appointments\.timezone DEFAULT 'Europe\/Paris'`? N'EST PAS TRAITÉ ICI/)
  })
})
