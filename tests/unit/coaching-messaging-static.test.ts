import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const moduleFiles = ['types.ts','schema.ts','model.ts','repository.ts','service.ts','realtime-port.ts','supabase-realtime.ts','controller.ts','index.ts']
const moduleSource = moduleFiles.map(file => readFileSync(`lib/coaching/messaging/${file}`, 'utf8')).join('\n')
const consumers = ['app/hooks/useMessages.ts','app/coach/hooks/useCoachDashboardMessaging.ts','app/client/[id]/hooks/useClientDetailResources.ts'].map(file => readFileSync(file, 'utf8')).join('\n')

describe('messaging module architecture', () => {
  it('leaves no direct messages access or channel lifecycle in human consumers', () => {
    expect(consumers).not.toContain("from('messages')")
    expect(consumers).not.toContain(".channel(")
    expect(consumers).not.toContain('removeChannel(')
    expect(consumers.match(/createMessagingRepository/g)).toHaveLength(6)
  })
  it('keeps persistence and realtime in isolated adapters with explicit projections', () => {
    expect(moduleSource).not.toContain("select('*')")
    expect(moduleSource).not.toContain('createClient')
    expect(moduleSource).not.toContain('service_role')
    expect(moduleSource).not.toMatch(/from ['"](?:react|next|@\/app)/)
    expect(readFileSync('lib/coaching/messaging/repository.ts','utf8')).toContain('MESSAGE_PROJECTION')
  })
  it('keeps chat_ai_messages and the secured migration outside the extraction', () => {
    expect(moduleSource).not.toContain('chat_ai_messages')
    expect(consumers).not.toContain('chat_ai_messages')
  })
})
