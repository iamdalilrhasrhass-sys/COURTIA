import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function callClaudeAPI(systemContext, userMessage) {
  try {
    const message = await client.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: systemContext
        }
      ]
    })

    // Extraire le texte de la réponse
    const response = message.content[0].type === 'text' ? message.content[0].text : ''
    return response
  } catch (error) {
    console.error('Claude API Error:', error)
    throw new Error('Failed to get response from Claude API')
  }
}
