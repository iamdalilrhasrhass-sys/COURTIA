export function formatNomClient(client) {
  const nom = `${client.nom || client.first_name || ''} ${client.prenom || client.last_name || ''}`.trim()
  return nom || client.email || 'Client sans nom'
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('fr-FR')
}

export function formatEuros(montant) {
  if (montant === null || montant === undefined) return '—'
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(montant)
}

export function formatTelephone(tel) {
  if (!tel) return '—'
  return tel.replace(/(\d{2})(?=\d)/g, '$1 ').trim()
}

export function formatJoursRestants(dateEcheance) {
  const jours = Math.ceil((new Date(dateEcheance) - new Date()) / (1000 * 60 * 60 * 24))
  if (jours < 0) return 'Expiré'
  if (jours === 0) return "Aujourd'hui"
  return `dans ${jours} jour${jours > 1 ? 's' : ''}`
}
