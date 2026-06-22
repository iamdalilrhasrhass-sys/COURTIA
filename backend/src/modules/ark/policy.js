const SENSITIVE_ACTIONS = new Set([
  'send_email',
  'send_whatsapp_message',
  'generate_advice_note',
  'send_to_insurer',
  'update_contract_status',
  'dossier_subscribe',
])

function isSensitive(actionType) {
  return SENSITIVE_ACTIONS.has(actionType)
}

function assertExecutable(action) {
  if (isSensitive(action.action_type) && !action.approved_by) {
    const error = new Error(`Action "${action.action_type}" : validation humaine requise avant execution.`)
    error.status = 403
    error.code = 'APPROVAL_REQUIRED'
    throw error
  }

  if (action.status === 'rejected') {
    const error = new Error('Action rejetee : execution impossible.')
    error.status = 409
    throw error
  }

  return true
}

module.exports = { SENSITIVE_ACTIONS, isSensitive, assertExecutable }
