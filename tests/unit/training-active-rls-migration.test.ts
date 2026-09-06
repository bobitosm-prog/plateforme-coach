import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  'supabase/migrations/20260822123000_harden_training_active_coach_rls.sql',
  'utf8',
)
const integration = readFileSync(
  'tests/integration/training-active-rls-migration.sql',
  'utf8',
)

describe('training active coach RLS migration', () => {
  it('fails fast when the shared helper or a target table is missing', () => {
    expect(migration).toContain(
      "to_regprocedure(\n    'public.is_active_coach_client_relation(uuid,uuid)'",
    )
    for (const table of [
      'workout_sessions',
      'workout_sets',
      'custom_programs',
      'client_programs',
      'completed_sessions',
      'exercise_feedback',
      'scheduled_sessions',
    ]) {
      expect(migration).toContain(`'${table}'`)
    }
    expect(migration).toContain('TRAINING_RLS_REQUIRES_TABLE')
    for (const [table, column] of [
      ['workout_sessions', 'user_id'],
      ['workout_sets', 'user_id'],
      ['custom_programs', 'user_id'],
      ['client_programs', 'client_id'],
      ['client_programs', 'coach_id'],
      ['completed_sessions', 'client_id'],
      ['exercise_feedback', 'client_id'],
      ['exercise_feedback', 'coach_id'],
      ['scheduled_sessions', 'user_id'],
    ]) {
      expect(migration).toContain(`('${table}', '${column}')`)
    }
    expect(migration).toContain('TRAINING_RLS_REQUIRES_COLUMN')
  })

  it.each([
    ['workout_sessions', 'workout_sessions_coach_read', 'user_id'],
    ['workout_sets', 'workout_sets_coach_read', 'user_id'],
    ['completed_sessions', 'completed_sessions_coach_read', 'client_id'],
  ] as const)('replaces %s coach reads with active-only policy %s', (table, policy, column) => {
    expect(migration).toContain(`DROP POLICY IF EXISTS "${policy}"`)
    expect(migration).toMatch(
      new RegExp(
        `CREATE POLICY "${policy}"[\\s\\S]*?ON public\\.${table}[\\s\\S]*?FOR SELECT[\\s\\S]*?TO authenticated[\\s\\S]*?is_active_coach_client_relation\\(auth\\.uid\\(\\), ${table}\\.${column}\\)`,
      ),
    )
  })

  it('binds every custom program operation to the active client relation', () => {
    for (const command of ['read', 'insert', 'update', 'delete']) {
      expect(migration).toContain(`CREATE POLICY "custom_programs_coach_${command}"`)
    }
    expect(migration).toMatch(
      /CREATE POLICY "custom_programs_coach_update"[\s\S]*FOR UPDATE[\s\S]*USING[\s\S]*is_active_coach_client_relation[\s\S]*WITH CHECK[\s\S]*is_active_coach_client_relation/,
    )
    expect(migration.match(/is_active_coach_client_relation\(auth\.uid\(\), custom_programs\.user_id\)/g)).toHaveLength(5)
  })

  it('replaces duplicate client program ALL policies with four active-bound operations', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "client_programs_coach_all"')
    expect(migration).toContain('DROP POLICY IF EXISTS "client_programs_coach_write"')
    expect(migration).toContain('DROP POLICY IF EXISTS "coaches manage programs"')
    for (const command of ['select', 'insert', 'update', 'delete']) {
      expect(migration).toContain(`CREATE POLICY "client_programs_coach_${command}_active"`)
    }
    expect(migration).toMatch(
      /CREATE POLICY "client_programs_coach_update_active"[\s\S]*FOR UPDATE[\s\S]*USING[\s\S]*coach_id[\s\S]*is_active_coach_client_relation[\s\S]*WITH CHECK[\s\S]*coach_id[\s\S]*is_active_coach_client_relation/,
    )
    expect(migration).not.toMatch(/CREATE POLICY "client_programs_coach_(?:all|write)"/)
  })

  it('limits coach feedback access to active SELECT and row-coach UPDATE', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Coaches manage client feedback"')
    expect(migration).toContain('DROP POLICY IF EXISTS "exercise_feedback_coach"')
    expect(migration).toMatch(
      /CREATE POLICY "exercise_feedback_coach_select_active"[\s\S]*FOR SELECT[\s\S]*is_active_coach_client_relation\(auth\.uid\(\), exercise_feedback\.client_id\)/,
    )
    expect(migration).toMatch(
      /CREATE POLICY "exercise_feedback_coach_update_active"[\s\S]*FOR UPDATE[\s\S]*USING[\s\S]*coach_id[\s\S]*is_active_coach_client_relation[\s\S]*WITH CHECK[\s\S]*coach_id[\s\S]*is_active_coach_client_relation/,
    )
    expect(migration).not.toMatch(/exercise_feedback_coach_(?:insert|delete)_active/)
  })

  it('replaces scheduled session ALL access with four active-bound operations', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "coaches manage scheduled sessions"')
    for (const command of ['select', 'insert', 'update', 'delete']) {
      expect(migration).toContain(`CREATE POLICY "scheduled_sessions_coach_${command}_active"`)
    }
    const scheduledBlock = migration.slice(
      migration.indexOf('-- scheduled_sessions stores client program calendar rows.'),
      migration.indexOf('DO $postflight$'),
    )
    expect(scheduledBlock.match(/is_active_coach_client_relation\([\s\S]*?scheduled_sessions\.user_id[\s\S]*?\)/g)).toHaveLength(5)
    expect(scheduledBlock).not.toMatch(/scheduled_sessions\.(?:client_id|coach_id)/)
    expect(scheduledBlock).toMatch(
      /CREATE POLICY "scheduled_sessions_coach_update_active"[\s\S]*FOR UPDATE[\s\S]*USING[\s\S]*scheduled_sessions\.user_id[\s\S]*WITH CHECK[\s\S]*scheduled_sessions\.user_id/,
    )
  })

  it('uses the shared helper and rejects parallel coach bypasses', () => {
    const createPolicies = migration.slice(migration.indexOf('CREATE POLICY'))
    expect(createPolicies).not.toMatch(/FROM\s+(?:public\.)?coach_clients/i)
    expect(migration).toContain('TRAINING_ACTIVE_COACH_POLICIES_INCOMPLETE')
    expect(migration).toContain('TRAINING_LEGACY_COACH_BYPASS_REMAINS')
    expect(migration).toContain('TRAINING_ACTIVE_COACH_HELPER_DEPENDENCIES_INVALID')
    expect(migration).toContain('TRAINING_ACTIVE_COACH_POLICY_SET_INVALID')
    expect(migration).toContain('SCHEDULED_SESSIONS_CLIENT_AUTHORITY_INVALID')
    expect(migration).toContain('TRAINING_UNRESTRICTED_POLICY_REMAINS')
    expect(migration).toContain('TRAINING_NAMED_LEGACY_POLICY_REMAINS')
    expect(migration).toContain("dependency.classid = 'pg_policy'::regclass")
    expect(migration).toContain("coalesce(qual, '') LIKE '%coach_clients%'")
    expect(migration).toMatch(/coach_id\|created_by/)
    expect(migration).toContain(
      '(?:coach_id|created_by)\\s*=\\s*auth\\.uid\\(\\)',
    )
    expect(migration).not.toMatch(/invited_by_coach|subscription_(?:type|status)/)
  })

  it('preserves owner policies and leaves coach-owned templates untouched', () => {
    expect(migration).not.toMatch(/DROP POLICY[^;]*(?:_own|users own|Users manage|client_read|client_insert|exercise_feedback_client)/)
    expect(migration).not.toMatch(/ON public\.training_programs/)
    expect(migration).not.toMatch(/training_programs_(?:coach_all|read_templates)/)
  })

  it('is transactional and leaves unrelated RLS domains untouched', () => {
    expect(migration.trimStart()).toMatch(/^BEGIN;/)
    expect(migration.trimEnd()).toMatch(/COMMIT;$/)
    expect(migration).not.toMatch(
      /ON public\.(?:profiles|progress_photos|body_measurements|weight_logs|daily_checkins|personal_records|daily_food_logs|meal_logs|meal_tracking|meal_plans|client_meal_plans|messages|payments|coach_notes|coach_appointments|activity_feed)/,
    )
    expect(migration).not.toMatch(/\b(?:GRANT|REVOKE)\b/)
  })

  it('covers scheduled session owner and active-relation CRUD at runtime', () => {
    for (const assertion of [
      'CLIENT_OWN_SELECT_DENIED',
      'OTHER_CLIENT_SELECT_ALLOWED',
      'OTHER_CLIENT_INSERT_ALLOWED',
      'OTHER_CLIENT_UPDATE_ALLOWED',
      'OTHER_CLIENT_DELETE_ALLOWED',
      'ACTIVE_COACH_SELECT_DENIED',
      'ACTIVE_COACH_UPDATE_DENIED',
      'ACTIVE_COACH_DELETE_DENIED',
      'ENDED_COACH_SELECT_ALLOWED',
      'ENDED_COACH_INSERT_ALLOWED',
      'ENDED_COACH_UPDATE_ALLOWED',
      'ENDED_COACH_DELETE_ALLOWED',
      'UNRELATED_COACH_SELECT_ALLOWED',
      'ANONYMOUS_SELECT_ALLOWED',
    ]) {
      expect(integration).toContain(assertion)
    }
    expect(integration.trimStart()).toMatch(/^\\set ON_ERROR_STOP on\s+BEGIN;/)
    expect(integration.trimEnd()).toMatch(/ROLLBACK;$/)
  })
})
