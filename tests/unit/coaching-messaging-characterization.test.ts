import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const clientHook = readFileSync('app/hooks/useMessages.ts', 'utf8')
const coachDashboard = readFileSync('app/coach/hooks/useCoachDashboard.ts', 'utf8')
const clientDetail = readFileSync('app/client/[id]/hooks/useClientDetail.ts', 'utf8')
const consumers = [clientHook, coachDashboard, clientDetail].join('\n')
const generatedTypes = readFileSync('lib/supabase/database.types.ts', 'utf8')
const initialMigration = readFileSync('supabase/migrations/20260318_messages.sql', 'utf8')
const coachPolicyMigration = readFileSync('supabase/migrations/20260419_messages_coach_rls.sql', 'utf8')

function messageTypeBlock(): string {
  const start = generatedTypes.indexOf('      messages: {')
  const end = generatedTypes.indexOf('      payments: {', start)
  return generatedTypes.slice(start, end)
}

describe('coaching messaging extraction blockers', () => {
  it('characterizes the canonical persisted message shape', () => {
    const block = messageTypeBlock()
    for (const field of ['id:', 'sender_id:', 'receiver_id:', 'content:', 'read:', 'created_at:']) {
      expect(block).toContain(field)
    }
    expect(block).not.toContain('image_url:')
    expect(initialMigration).not.toContain('image_url')
  })

  it('proves that the current UI nevertheless treats image_url as persisted', () => {
    expect(clientHook).toContain('row.image_url = imageUrl')
    expect(coachDashboard).toContain('row.image_url = imageUrl')
    expect(clientDetail).toContain('row.image_url = imageUrl')
    expect(consumers.match(/image_url/g)?.length).toBeGreaterThanOrEqual(9)
  })

  it('characterizes direct access and realtime lifecycle counts before extraction', () => {
    expect(consumers.match(/from\('messages'\)/g)).toHaveLength(12)
    expect(consumers.match(/\.channel\(/g)).toHaveLength(5)
    expect(consumers.match(/\.subscribe\(\)/g)).toHaveLength(5)
    expect(consumers.match(/removeChannel\(/g)).toHaveLength(5)
    expect(consumers.match(/postgres_changes/g)).toHaveLength(7)
  })

  it('characterizes policies as actor-scoped but not active-relation-scoped', () => {
    const policies = `${initialMigration}\n${coachPolicyMigration}`
    expect(policies).toContain('sender_id = auth.uid()')
    expect(policies).toContain('receiver_id = auth.uid()')
    expect(policies).not.toContain('coach_clients')
    expect(policies).not.toContain("status = 'active'")
    expect(coachPolicyMigration).toContain('FOR ALL')
  })

  it('preserves bounded ordering, read receipts and notification-after-insert', () => {
    expect(clientHook).toContain("order('created_at', { ascending: true }).limit(50)")
    expect(coachDashboard).toContain("order('created_at', { ascending: true })")
    expect(clientDetail).toContain("order('created_at', { ascending: true })")
    expect(consumers).toContain("update({ read: true }).eq('receiver_id', userId).eq('sender_id', coachId)")
    for (const source of [clientHook, coachDashboard, clientDetail]) {
      expect(source.indexOf("from('messages').insert")).toBeGreaterThan(-1)
      expect(source.indexOf("fetch('/api/send-notification'")).toBeGreaterThan(source.indexOf("from('messages').insert"))
    }
  })
})
