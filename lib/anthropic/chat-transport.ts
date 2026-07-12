const PRODUCTION_MESSAGES_URL = 'https://api.anthropic.com/v1/messages'

export function getChatAnthropicMessagesUrl(): string {
  if (process.env.MOOVX_E2E !== '1') return PRODUCTION_MESSAGES_URL

  const configured = process.env.ANTHROPIC_E2E_MESSAGES_URL
  if (!configured) throw new Error('Missing local Anthropic E2E URL')

  const url = new URL(configured)
  if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/v1/messages' || url.search || url.hash) {
    throw new Error('Anthropic E2E URL must be the exact local /v1/messages endpoint')
  }
  return url.toString()
}
