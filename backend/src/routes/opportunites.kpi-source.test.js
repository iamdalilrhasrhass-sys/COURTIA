/**
 * opportunites.kpi-source.test.js — CH-038 (source de vérité des contrats).
 *
 * Ce que ce fichier protège, et pourquoi il lit la source :
 * la détection d'opportunités a travaillé pendant des semaines sur les colonnes
 * HISTORIQUES de `quotes` (`product_type`, `premium`, `end_date`) — qui valent
 * NULL en production — et joignait les contrats avec `q.status = 'active'`
 * alors que le produit écrit « actif ». Résultat : aucun contrat joint, aucune
 * erreur levée, donc une analyse IA nourrie de portefeuilles vides.
 *
 * Un test de comportement nécessiterait une base PostgreSQL complète ; ce
 * dépôt utilise déjà des gardes de source (voir routes/erreursSqlP1.test.js)
 * pour empêcher la réapparition d'une requête interdite. C'est le même
 * mécanisme : les définitions KPI uniques (routes/dashboard.js) doivent rester
 * la seule source, et les graphies historiques ne doivent pas revenir.
 */
const fs = require('fs')
const path = require('path')

const SOURCE = fs.readFileSync(path.join(__dirname, 'opportunites.js'), 'utf8')

describe('opportunites.js — source unique des KPI de contrat (CH-038)', () => {
  it('n’écrit plus la graphie anglaise du statut actif', () => {
    expect(SOURCE).not.toMatch(/q\.status\s*=\s*'active'/)
  })

  it('utilise la constante STATUTS_CONTRAT_ACTIF pour joindre les contrats', () => {
    expect(SOURCE).toMatch(/kpi\.STATUTS_CONTRAT_ACTIF/)
  })

  it('ne somme plus la colonne historique `premium`', () => {
    expect(SOURCE).not.toMatch(/SUM\(q\.premium\)/)
  })

  it('passe par les définitions uniques de prime et d’échéance', () => {
    expect(SOURCE).toMatch(/kpi\.PRIME_CONTRAT/)
    expect(SOURCE).toMatch(/kpi\.ECHEANCE_CONTRAT/)
  })

  it('ne lit plus les colonnes historiques de produit et d’échéance', () => {
    expect(SOURCE).not.toMatch(/ARRAY_AGG\(DISTINCT q\.product_type\)/)
    expect(SOURCE).not.toMatch(/MAX\(q\.end_date\)/)
  })

  it('exclut les devis v1 restés dans `quotes` (NATURE_CONTRAT)', () => {
    expect(SOURCE).toMatch(/kpi\.NATURE_CONTRAT/)
  })
})
