import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const client = readFileSync('app/hooks/useMessages.ts', 'utf8')
const coach = readFileSync('app/coach/hooks/useCoachDashboardMessaging.ts', 'utf8')
const detail = readFileSync('app/client/[id]/hooks/useClientDetail.ts', 'utf8')
const consumers = `${client}\n${coach}\n${detail}`

describe('messaging consumer lifecycle guards', () => {
  it('creates subscriptions only inside effects and always retains a cleanup', () => {
    expect(consumers.match(/subscribeIncoming\(/g)).toHaveLength(4)
    expect(consumers.match(/subscribeOutgoingUpdates\(/g)).toHaveLength(1)
    expect(consumers.match(/\bstop\(\)/g)?.length).toBeGreaterThanOrEqual(3)
    expect(coach).toContain('stopIncoming()')
    expect(coach).toContain('stopOutgoing()')
  })

  it('clears every messaging polling interval and invalidates stale loads', () => {
    expect(client).toContain('clearInterval(pollId)')
    expect(coach).toContain('clearInterval(timer)')
    expect(client).toContain('loadGenerationRef.current += 1')
    expect(client).toContain('scope !== identityScopeRef.current')
    expect(coach).toContain('loadGenerationRef.current += 1')
    expect(detail).toContain('coachMessageLoadGenerationRef.current += 1')
  })

  it('deduplicates realtime unread increments by persisted message ID', () => {
    expect(client).toContain('realtimeMessageIds.has(message.id)')
    expect(coach).toContain('seen.has(message.id)')
  })

  it('keeps data access and channel construction outside render consumers', () => {
    expect(consumers).not.toContain("from('messages')")
    expect(consumers).not.toContain('.channel(')
    expect(consumers).not.toContain('removeChannel(')
  })
})
