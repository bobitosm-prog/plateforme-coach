import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const clientHook = readFileSync('app/hooks/useMessages.ts', 'utf8')
const coachDashboard = readFileSync('app/coach/hooks/useCoachDashboardMessaging.ts', 'utf8')
const clientDetail = readFileSync('app/client/[id]/hooks/useClientDetailResources.ts', 'utf8')
const consumers = [clientHook, coachDashboard, clientDetail].join('\n')
const generatedTypes = readFileSync('lib/supabase/database.types.ts', 'utf8')
const initialMigration = readFileSync('supabase/migrations/20260318_messages.sql', 'utf8')
const coachPolicyMigration = readFileSync('supabase/migrations/20260419_messages_coach_rls.sql', 'utf8')
const secureMigration = readFileSync('supabase/migrations/20260719160000_secure_messages.sql', 'utf8')
const repository = readFileSync('lib/coaching/messaging/repository.ts', 'utf8')
const realtime = readFileSync('lib/coaching/messaging/supabase-realtime.ts', 'utf8')
const service = readFileSync('lib/coaching/messaging/service.ts', 'utf8')

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
    expect(block).toContain('image_url:')
    expect(initialMigration).not.toContain('image_url')
    expect(secureMigration).toContain('ADD COLUMN IF NOT EXISTS image_url text')
  })

  it('preserves image_url through typed optimistic and repository boundaries', () => {
    expect(repository).toContain('image_url: imageUrl')
    expect(consumers.match(/image_url/g)?.length).toBeGreaterThanOrEqual(3)
  })

  it('centralizes all direct access and realtime lifecycle after the measured 12/5/5/5/7 baseline', () => {
    expect(consumers.match(/from\('messages'\)/g)).toBeNull()
    expect(consumers.match(/\.channel\(/g)).toBeNull()
    expect(repository.match(/from\('messages'\)/g)).toHaveLength(6)
    expect(realtime.match(/\.channel\(/g)).toHaveLength(2)
    expect(realtime.match(/\.subscribe\(/g)).toHaveLength(2)
    expect(realtime.match(/removeChannel\(/g)).toHaveLength(2)
    expect(realtime.match(/postgres_changes/g)).toHaveLength(3)
  })

  it('replaces actor-only policies with three active-relation-scoped operations', () => {
    const policies = `${initialMigration}\n${coachPolicyMigration}`
    expect(policies).toContain('sender_id = auth.uid()')
    expect(policies).toContain('receiver_id = auth.uid()')
    expect(policies).not.toContain('coach_clients')
    expect(policies).not.toContain("status = 'active'")
    expect(coachPolicyMigration).toContain('FOR ALL')
    expect(secureMigration).toContain('DROP POLICY IF EXISTS "messages_coach_rw"')
    expect(secureMigration.match(/CREATE POLICY messages_/g)).toHaveLength(3)
    expect(secureMigration).toContain("relation.status = 'active'")
    expect(secureMigration).not.toContain('\nFOR ALL\n')
    expect(secureMigration).toContain('GRANT UPDATE (read)')
    expect(secureMigration).toContain('REVOKE ALL ON TABLE public.messages FROM anon, authenticated')
  })

  it('preserves bounded ordering, read receipts and notification-after-insert', () => {
    expect(repository).toContain("order('created_at', { ascending: true })")
    expect(repository).toContain("update({ read: true }).eq('receiver_id', actor.data).eq('sender_id', senderId)")
    expect(service.indexOf('repository.send')).toBeLessThan(service.indexOf('await notify'))
    expect(clientHook).toContain('messaging.listSince(coachId, since, 50)')
    expect(coachDashboard).toContain('repository.listConversation(clientId, 100)')
    expect(clientDetail).toContain('messaging.listConversation(id, 100)')
  })
})
