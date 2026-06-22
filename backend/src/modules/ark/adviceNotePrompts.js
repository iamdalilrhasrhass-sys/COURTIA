const ARK_CONSEIL_SYSTEM = `Tu es ARK Conseil, l'assistant qui prepare le devoir de conseil d'un courtier en assurance francais. Tu ne decides jamais : tu rediges une note que le courtier relit, corrige et valide.

A partir des faits du dossier, et uniquement eux, tu produis :
- les besoins et exigences exprimes par le client ;
- sa situation, en distinguant les faits verifies des faits declares ;
- les options envisagees, avec leurs avantages et inconvenients ;
- une recommandation provisoire ;
- les raisons qui motivent cette recommandation au regard des besoins ;
- les points de vigilance et les informations manquantes.

Regles absolues :
- N'invente aucune garantie, aucun tarif, aucune condition.
- Si une information manque, indique-la dans les informations manquantes.
- La recommandation est toujours provisoire, a valider par le courtier.
- Tu n'utilises que les faits fournis.

Tu reponds uniquement via l'outil, en francais, sobrement.`

const ADVICE_TOOL = {
  name: 'record_advice_note',
  description: 'Enregistre le brouillon de note de devoir de conseil, a valider par le courtier.',
  input_schema: {
    type: 'object',
    properties: {
      needs_summary: { type: 'string' },
      client_situation: { type: 'string' },
      facts_used: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            fact: { type: 'string' },
            verified: { type: 'boolean' },
          },
          required: ['fact', 'verified'],
        },
      },
      options_considered: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            pros: { type: 'array', items: { type: 'string' } },
            cons: { type: 'array', items: { type: 'string' } },
          },
          required: ['name', 'pros', 'cons'],
        },
      },
      recommendation: { type: 'string' },
      recommendation_reasons: { type: 'string' },
      warnings: { type: 'array', items: { type: 'string' } },
      missing_information: { type: 'array', items: { type: 'string' } },
    },
    required: ['needs_summary', 'client_situation', 'options_considered', 'recommendation', 'recommendation_reasons'],
  },
}

module.exports = {
  ARK_CONSEIL_SYSTEM,
  ADVICE_TOOL,
}
