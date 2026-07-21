import type { AiImageBlock, AiInputBlock, AiJsonRequest, AiMessage, AiOutputValidator, AiTextRequest, AiToolRequest } from '@/lib/ai/provider'
import type { AiPromptInvocation } from '@/lib/ai/prompts/types'

function mapBlock(block: unknown): AiInputBlock | null {
  if (!block || typeof block !== 'object') return null
  const value = block as Record<string, unknown>
  if (value.type === 'text' && typeof value.text === 'string') return { type: 'text', text: value.text }
  const source = value.source
  if (value.type === 'image' && source && typeof source === 'object') {
    const image = source as Record<string, unknown>
    if (image.type === 'base64' && typeof image.data === 'string' && ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(String(image.media_type))) {
      return { type: 'image', mediaType: image.media_type as AiImageBlock['mediaType'], dataBase64: image.data }
    }
  }
  return null
}

function mapMessage(message: AiPromptInvocation['messages'][number]): AiMessage {
  const blocks = typeof message.content === 'string'
    ? [{ type: 'text' as const, text: message.content }]
    : Array.isArray(message.content) ? message.content.map(mapBlock).filter((block): block is AiInputBlock => block !== null) : []
  return { role: message.role, content: blocks }
}

export function promptInvocationToTextRequest(invocation: AiPromptInvocation, providerModel: string): AiTextRequest {
  return {
    output: 'text', model: providerModel, maxTokens: invocation.max_tokens,
    system: invocation.system, messages: invocation.messages.map(mapMessage), temperature: invocation.temperature,
  }
}

export function promptInvocationToJsonRequest<T>(
  invocation: AiPromptInvocation,
  providerModel: string,
  validate: AiOutputValidator<T>,
): AiJsonRequest<T> {
  return {
    output: 'json', model: providerModel, maxTokens: invocation.max_tokens,
    system: invocation.system, messages: invocation.messages.map(mapMessage), temperature: invocation.temperature, validate,
  }
}

export function promptInvocationToToolRequest<T>(
  invocation: AiPromptInvocation,
  providerModel: string,
  validate: AiOutputValidator<T>,
): AiToolRequest<T> {
  const tools = (invocation.tools ?? []).map(tool => ({
    name: String(tool.name ?? ''),
    description: typeof tool.description === 'string' ? tool.description : undefined,
    inputSchema: tool.input_schema && typeof tool.input_schema === 'object'
      ? tool.input_schema as Readonly<Record<string, unknown>> : {},
  }))
  const choice = invocation.tool_choice
  const forcedTool = choice && choice.type === 'tool' && typeof choice.name === 'string' ? choice.name : undefined
  return {
    output: 'tool', model: providerModel, maxTokens: invocation.max_tokens,
    system: invocation.system, messages: invocation.messages.map(mapMessage), temperature: invocation.temperature,
    tools, forcedTool, validate,
  }
}
