export async function callArkAI(clientData, userMessage, token) {
  try {
    const response = await fetch(import.meta.env.VITE_API_URL || '/api') + '/ark/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        clientData,
        userMessage
      })
    })

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.response
  } catch (error) {
    console.error('ARK API Error:', error)
    throw error
  }
}
