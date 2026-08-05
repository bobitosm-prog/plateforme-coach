import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync('supabase/migrations/20260805100000_publish_messages_realtime.sql', 'utf8')
const config = readFileSync('supabase/config.toml', 'utf8')

describe('messages Realtime publication', () => {
  it('enables Realtime only in the local Supabase configuration', () => {
    const activeConfig = config.split('\n').filter(line => !line.trimStart().startsWith('#')).join('\n')
    const configuredUrls = activeConfig.match(/https?:\/\/[^"\s,\]]+/g) ?? []
    expect(config).toMatch(/\[realtime\]\s+enabled = true/)
    expect(configuredUrls.every(value => ['127.0.0.1', 'localhost'].includes(new URL(value).hostname))).toBe(true)
  })

  it('adds public.messages idempotently without destructive publication changes', () => {
    expect(migration).toContain("pubname = 'supabase_realtime'")
    expect(migration).toContain("schemaname = 'public'")
    expect(migration).toContain("tablename = 'messages'")
    expect(migration).toContain('ALTER PUBLICATION supabase_realtime ADD TABLE public.messages')
    expect(migration).toMatch(/IF NOT EXISTS\s*\(/)
    expect(migration).not.toMatch(/DROP\s+(?:TABLE|PUBLICATION)|DELETE\s+FROM|TRUNCATE/i)
    expect(migration).not.toMatch(/CREATE\s+POLICY|ALTER\s+POLICY|DROP\s+POLICY/i)
  })
})
