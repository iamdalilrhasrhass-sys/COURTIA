export async function readAuthResponse(response) {
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    if (response.status >= 500) throw new Error('Le service de connexion est indisponible. Veuillez reessayer plus tard.')
    throw new Error(data?.message || data?.error || 'Authentification impossible.')
  }
  if (!data?.token || !data?.user?.id) throw new Error('Reponse de connexion invalide. Veuillez reessayer.')
  return data
}
