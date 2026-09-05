import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  'supabase/migrations/20260822124000_harden_communication_active_coach_rls.sql',
  'utf8',
)

describe('communication active coach RLS migration', () => {
  it('fails fast when the shared helper or a target table is missing', () => {
    expect(migration).toContain(
      "to_regprocedure(\n    'public.is_active_coach_client_relation(uuid,uuid)'",
    )
    for (const table of [
      'messages',
      'coach_notes',
      'coach_appointments',
      'activity_feed',
    ]) {
      expect(migration).toContain(`'${table}'`)
    }
    expect(migration).toContain('COMMUNICATION_RLS_REQUIRES_TABLE')
  })

  it('versions a locked-down active messaging pair helper', () => {
    expect(migration).toMatch(
      /CREATE OR REPLACE FUNCTION public\.is_active_messaging_pair\([\s\S]*LANGUAGE sql[\s\S]*STABLE[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = ''/,
    )
    const helperBody = migration.slice(
      migration.indexOf('CREATE OR REPLACE FUNCTION public.is_active_messaging_pair'),
      migration.indexOf('$function$;', migration.indexOf('CREATE OR REPLACE FUNCTION public.is_active_messaging_pair')),
    )
    expect(helperBody.match(/is_active_coach_client_relation\(/g)).toHaveLength(2)
    expect(migration).toContain(
      'REVOKE ALL ON FUNCTION public.is_active_messaging_pair(uuid, uuid)',
    )
    expect(migration).toContain('FROM PUBLIC, anon, authenticated, service_role')
    expect(migration).toContain('TO authenticated, service_role')
    expect(migration).not.toMatch(/invited_by_coach|subscription_(?:type|status)/)
  })

  it('removes every legacy participant-only message policy', () => {
    for (const policy of [
      'can read own messages',
      'users can read own messages',
      'users can send messages',
      'users can mark own messages read',
      'messages_read_own',
      'messages_send',
      'messages_mark_read',
      'messages_coach_rw',
    ]) {
      expect(migration).toContain(`DROP POLICY IF EXISTS "${policy}"`)
      expect(migration).not.toContain(`CREATE POLICY "${policy}"`)
    }
    expect(migration).toContain('COMMUNICATION_LEGACY_MESSAGE_POLICY_REMAINS')
  })

  it('requires an active pair for message select, insert, and recipient read updates', () => {
    expect(migration).toMatch(
      /CREATE POLICY "messages_select_active_participants"[\s\S]*FOR SELECT[\s\S]*auth\.uid\(\) = messages\.sender_id OR auth\.uid\(\) = messages\.receiver_id[\s\S]*is_active_messaging_pair/,
    )
    expect(migration).toMatch(
      /CREATE POLICY "messages_insert_active_participants"[\s\S]*FOR INSERT[\s\S]*auth\.uid\(\) = messages\.sender_id[\s\S]*is_active_messaging_pair/,
    )
    expect(migration).toMatch(
      /CREATE POLICY "messages_update_read_active_recipient"[\s\S]*FOR UPDATE[\s\S]*USING[\s\S]*auth\.uid\(\) = messages\.receiver_id[\s\S]*is_active_messaging_pair[\s\S]*WITH CHECK[\s\S]*auth\.uid\(\) = messages\.receiver_id[\s\S]*is_active_messaging_pair/,
    )
    expect(migration).toContain('GRANT UPDATE (read) ON public.messages TO authenticated')
    expect(migration).not.toContain('GRANT UPDATE ON public.messages TO authenticated')
  })

  it('replaces coach notes ALL access with the runtime-required operations', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "coach_notes_coach_all"')
    for (const command of ['select', 'insert', 'update']) {
      expect(migration).toContain(`CREATE POLICY "coach_notes_coach_${command}_active"`)
    }
    expect(migration).not.toContain('coach_notes_coach_delete_active')
    expect(migration).toMatch(
      /CREATE POLICY "coach_notes_coach_update_active"[\s\S]*FOR UPDATE[\s\S]*USING[\s\S]*coach_id[\s\S]*is_active_coach_client_relation[\s\S]*WITH CHECK[\s\S]*coach_id[\s\S]*is_active_coach_client_relation/,
    )
    expect(migration).not.toMatch(/DROP POLICY[^;]*coach_notes_client_read/)
  })

  it('preserves appointment CRUD while binding every coach operation to the active client', () => {
    expect(migration).toContain(
      'DROP POLICY IF EXISTS "Coach manages own appointments"',
    )
    for (const command of ['select', 'insert', 'update', 'delete']) {
      expect(migration).toContain(
        `CREATE POLICY "coach_appointments_coach_${command}_active"`,
      )
    }
    expect(migration).toMatch(
      /CREATE POLICY "coach_appointments_coach_update_active"[\s\S]*FOR UPDATE[\s\S]*USING[\s\S]*coach_id[\s\S]*is_active_coach_client_relation[\s\S]*WITH CHECK[\s\S]*coach_id[\s\S]*is_active_coach_client_relation/,
    )
    expect(migration).not.toMatch(/DROP POLICY[^;]*Client reads own appointments/)
  })

  it('preserves feed owner access and active-bounds the coach branch', () => {
    expect(migration).toMatch(
      /CREATE POLICY "activity_feed_own"[\s\S]*FOR SELECT[\s\S]*auth\.uid\(\) = activity_feed\.user_id[\s\S]*auth\.uid\(\) = activity_feed\.coach_id[\s\S]*is_active_coach_client_relation/,
    )
    expect(migration).toMatch(
      /CREATE POLICY "activity_feed_insert"[\s\S]*FOR INSERT[\s\S]*WITH CHECK[\s\S]*auth\.uid\(\) = activity_feed\.user_id[\s\S]*auth\.uid\(\) = activity_feed\.coach_id[\s\S]*is_active_coach_client_relation/,
    )
    expect(migration).not.toMatch(/activity_feed_(?:update|delete)/)
  })

  it('asserts policy completeness and rejects parallel bypasses', () => {
    expect(migration).toContain('COMMUNICATION_ACTIVE_POLICIES_INCOMPLETE')
    expect(migration).toContain('COMMUNICATION_LEGACY_COACH_BYPASS_REMAINS')
    expect(migration).toContain('COMMUNICATION_MESSAGE_PARTICIPANT_BYPASS_REMAINS')
    expect(migration).toContain("coalesce(qual, '') LIKE '%coach_clients%'")
  })

  it('leaves hardened scheduled sessions and unrelated domains untouched', () => {
    expect(migration).not.toMatch(/ON public\.scheduled_sessions/)
    expect(migration).not.toMatch(
      /ON public\.(?:profiles|progress_photos|body_measurements|weight_logs|daily_checkins|personal_records|daily_food_logs|meal_logs|meal_tracking|meal_plans|client_meal_plans|workout_sessions|workout_sets|custom_programs|client_programs|completed_sessions|exercise_feedback|payments)/,
    )
  })

  it('is transactional', () => {
    expect(migration.trimStart()).toMatch(/^BEGIN;/)
    expect(migration.trimEnd()).toMatch(/COMMIT;$/)
  })
})
