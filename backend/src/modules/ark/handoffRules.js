const HANDOFF_RULES = [
  {
    when: { vertical_key: 'immobilier', product_type: 'transaction' },
    statuses: ['tarification', 'conseil', 'souscription', 'actif'],
    create: [
      {
        vertical_key: 'credit_immobilier',
        product_type: 'pret_immobilier',
        relation: 'financing',
        reason: "L'acquereur doit financer ce bien : monter le dossier credit.",
      },
      {
        vertical_key: 'assurance',
        product_type: 'habitation',
        relation: 'insurance',
        reason: 'Le bien acquis doit etre assure.',
      },
    ],
  },
  {
    when: { vertical_key: 'credit_immobilier', product_type: 'pret_immobilier' },
    statuses: ['souscription', 'actif'],
    create: [
      {
        vertical_key: 'assurance',
        product_type: 'habitation',
        relation: 'insurance',
        reason: "Un pret immobilier impose d'assurer le bien finance.",
      },
    ],
  },
  {
    when: { vertical_key: 'assurance', product_type: 'auto' },
    statuses: ['actif'],
    create: [
      {
        vertical_key: 'assurance',
        product_type: 'habitation',
        relation: 'cross_sell',
        reason: 'Client auto actif : opportunite de multi-equipement habitation.',
      },
    ],
  },
]

const RELATION_LABELS = {
  financing: 'Financement',
  insurance: 'Assurance du bien',
  cross_sell: 'Multi-equipement',
}

function matchHandoffRules({ verticalKey, productType, status }) {
  return HANDOFF_RULES.filter((rule) => (
    rule.when.vertical_key === verticalKey
    && (!rule.when.product_type || rule.when.product_type === productType)
    && (!rule.statuses || rule.statuses.includes(status))
  ))
}

function validateHandoffRules(getProductRequirements) {
  const errors = []

  for (const rule of HANDOFF_RULES) {
    if (!getProductRequirements(rule.when.vertical_key, rule.when.product_type)) {
      errors.push(`Source inconnue: ${rule.when.vertical_key}/${rule.when.product_type}`)
    }

    for (const target of rule.create) {
      if (!getProductRequirements(target.vertical_key, target.product_type)) {
        errors.push(`Cible inconnue: ${target.vertical_key}/${target.product_type}`)
      }
    }
  }

  return errors
}

module.exports = {
  HANDOFF_RULES,
  RELATION_LABELS,
  matchHandoffRules,
  validateHandoffRules,
}
