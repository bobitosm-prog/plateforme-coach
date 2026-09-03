import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const lifecycleMigration = readFileSync(
  'supabase/migrations/20260821211322_prepare_coach_clients_relation_lifecycle.sql',
  'utf8',
)

describe('coach relation lifecycle schema migration', () => {
  it('adds the provenance and lifecycle columns without removing historical fields', () => {
    for (const column of ['source', 'started_at', 'ended_at', 'ended_by', 'end_reason']) {
      expect(lifecycleMigration).toMatch(
        new RegExp(`ADD COLUMN IF NOT EXISTS ${column}\\b`, 'i'),
      )
    }

    expect(lifecycleMigration).not.toMatch(/DROP COLUMN/i)
    expect(lifecycleMigration).not.toMatch(/DROP TABLE/i)
    expect(lifecycleMigration).not.toMatch(/client_programs/i)
  })

  it('keeps the exact bounded status and source domains', () => {
    expect(lifecycleMigration).toContain("CHECK (status IN ('active', 'ended'))")
    expect(lifecycleMigration).toContain(
      "CHECK (source IN ('default', 'invitation', 'admin', 'legacy'))",
    )
    expect(lifecycleMigration).toContain('ALTER COLUMN status SET NOT NULL')
    expect(lifecycleMigration).toContain('ALTER COLUMN source SET NOT NULL')
  })

  it('conservatively classifies unknown historical relations as legacy', () => {
    expect(lifecycleMigration).toMatch(
      /UPDATE public\.coach_clients\s+SET source = 'legacy'\s+WHERE source IS NULL;/,
    )
    expect(lifecycleMigration).not.toMatch(
      /invited_by_coach\s*=\s*(?:true|false)[\s\S]{0,160}SET source/i,
    )
    expect(lifecycleMigration).not.toMatch(/SET source = 'invitation'/i)
    expect(lifecycleMigration).not.toMatch(/(?:email|get_default_coach_id)\s*\(/i)
  })

  it('preserves active semantics and separates technical creation from lifecycle start', () => {
    expect(lifecycleMigration).toMatch(
      /UPDATE public\.coach_clients\s+SET status = 'active'\s+WHERE status IS NULL;/,
    )
    expect(lifecycleMigration).toMatch(
      /UPDATE public\.coach_clients\s+SET started_at = created_at\s+WHERE started_at IS NULL;/,
    )
    expect(lifecycleMigration).toContain('ALTER COLUMN started_at SET NOT NULL')
    expect(lifecycleMigration).not.toMatch(/SET created_at\s*=/i)
  })

  it('requires consistent active and ended lifecycle states', () => {
    expect(lifecycleMigration).toMatch(
      /status = 'active'[\s\S]*ended_at IS NULL[\s\S]*ended_by IS NULL[\s\S]*end_reason IS NULL/,
    )
    expect(lifecycleMigration).toMatch(
      /status = 'ended'[\s\S]*ended_at IS NOT NULL[\s\S]*end_reason IS NOT NULL[\s\S]*ended_at >= started_at/,
    )
    expect(lifecycleMigration).toContain('coach_clients_ended_by_fkey')
    expect(lifecycleMigration).toContain('REFERENCES auth.users(id)')
    expect(lifecycleMigration).toContain('ON DELETE SET NULL')
  })

  it('rejects invalid provenance and controlled end reasons before validating constraints', () => {
    expect(lifecycleMigration).toContain('COACH_CLIENTS_INVALID_SOURCE')
    expect(lifecycleMigration).toContain('COACH_CLIENTS_INVALID_END_REASON')
    expect(lifecycleMigration).toContain('COACH_CLIENTS_INVALID_LIFECYCLE')
    expect(lifecycleMigration).toContain('VALIDATE CONSTRAINT coach_clients_source_valid')
    expect(lifecycleMigration).toContain('VALIDATE CONSTRAINT coach_clients_lifecycle_valid')
  })

  it('uses idempotent schema operations and sufficient canonical read indexes', () => {
    expect(lifecycleMigration).toContain('CREATE INDEX IF NOT EXISTS coach_clients_client_status_idx')
    expect(lifecycleMigration).toContain('ON public.coach_clients (client_id, status)')
    expect(lifecycleMigration).toContain('CREATE INDEX IF NOT EXISTS coach_clients_coach_status_idx')
    expect(lifecycleMigration).toContain('ON public.coach_clients (coach_id, status)')
    expect(lifecycleMigration).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS coach_clients_one_active_per_client_idx',
    )
    expect(lifecycleMigration).toMatch(/WHERE status = 'active';/)
    expect(lifecycleMigration).toContain('IF NOT EXISTS (')
  })

  it('does not change RLS policies in the schema-alignment migration', () => {
    expect(lifecycleMigration).not.toMatch(/(?:CREATE|ALTER|DROP) POLICY/i)
    expect(lifecycleMigration).not.toMatch(/ENABLE ROW LEVEL SECURITY/i)
  })
})
