import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  AUTH_FUNCTION,
  AUTH_FUNCTION_GRANTS,
  AUTH_TABLE,
  AUTH_TRIGGER_NAME,
  REALTIME_MESSAGES_RELATION,
  REALTIME_PUBLICATION,
  assertAuthAfterMigration,
  assertAuthBefore,
  assertAuthRecovered,
  assertRealtimeAfterMigration,
  assertRealtimeBefore,
  assertRealtimeRecovered,
  buildAuthCompensation,
  buildRealtimeCompensation,
  buildStructuralRecoveryReport,
  structuralFingerprint,
} from '../../scripts/preproduction/validate-staging-structural-recovery.mjs'

const functionContract = {
  count: 1,
  identity: AUTH_FUNCTION,
  arguments: '',
  owner: 'postgres',
  securityDefiner: true,
  language: 'plpgsql',
  returnType: 'trigger',
  config: ['search_path=public'],
  definitionHash: 'a'.repeat(32),
  grants: [...AUTH_FUNCTION_GRANTS],
}
const expectedTrigger = {
  name: AUTH_TRIGGER_NAME,
  table: AUTH_TABLE,
  function: AUTH_FUNCTION,
  type: 5,
  enabled: 'O',
  condition: null,
}

function authBefore() {
  return { function: structuredClone(functionContract), triggers: [], authUserCount: 4 }
}

function authAfter() {
  return {
    function: structuredClone(functionContract),
    triggers: [structuredClone(expectedTrigger)],
    authUserCount: 4,
  }
}

function realtimeBefore() {
  return {
    publication: REALTIME_PUBLICATION,
    publicationExists: true,
    messagesExists: true,
    relations: ['public.notifications'],
    messageCount: 7,
  }
}

function realtimeAfter() {
  return {
    ...realtimeBefore(),
    relations: ['public.notifications', REALTIME_MESSAGES_RELATION],
  }
}

describe('staging structural recovery', () => {
  it('builds a guarded nominal Auth compensation', () => {
    const sql = buildAuthCompensation({ before: authBefore(), afterMigration: authAfter() })
    expect(sql).toContain('DROP TRIGGER on_auth_user_created ON auth.users')
    expect(sql).toContain("t.tgfoid = 'public.handle_new_user()'::regprocedure")
    expect(sql).toContain('t.tgtype = 5')
    expect(sql).toContain(`md5(pg_get_functiondef(p.oid)) = '${'a'.repeat(32)}'`)
    expect(sql).not.toMatch(/DROP\s+FUNCTION|DELETE\s+FROM|TRUNCATE/i)
  })

  it('refuses Auth compensation when the trigger is absent', () => {
    expect(() => buildAuthCompensation({ before: authBefore(), afterMigration: authBefore() }))
      .toThrow(/AUTH_TRIGGER_MISSING/)
  })

  it('refuses a homonymous Auth trigger with another definition', () => {
    const after = authAfter()
    after.triggers[0].type = 7
    expect(() => assertAuthAfterMigration(authBefore(), after))
      .toThrow(/AUTH_TRIGGER_DEFINITION_DIVERGENT/)
  })

  it('refuses several homonymous Auth triggers', () => {
    const after = authAfter()
    after.triggers.push(structuredClone(expectedTrigger))
    expect(() => assertAuthAfterMigration(authBefore(), after)).toThrow(/AUTH_TRIGGER_MULTIPLE/)
  })

  it('refuses another Auth function contract', () => {
    const after = authAfter()
    after.function.definitionHash = 'b'.repeat(32)
    expect(() => assertAuthAfterMigration(authBefore(), after)).toThrow(/AUTH_FUNCTION_CHANGED/)
  })

  it('refuses divergent Auth function grants', () => {
    const after = authAfter()
    after.function.grants = after.function.grants.filter(grant => !grant.startsWith('anon:'))
    expect(() => assertAuthAfterMigration(authBefore(), after))
      .toThrow(/AUTH_FUNCTION_GRANTS_DIVERGENT/)
  })

  it('restores the exact Auth structural fingerprint', () => {
    const before = authBefore()
    const recovered = authBefore()
    expect(assertAuthRecovered(before, recovered)).toBe(true)
    expect(structuralFingerprint(before)).toBe(structuralFingerprint(recovered))
  })

  it('refuses an Auth data mutation', () => {
    const after = authAfter()
    after.authUserCount += 1
    expect(() => assertAuthAfterMigration(authBefore(), after)).toThrow(/AUTH_DATA_CHANGED/)
  })

  it('validates the complete Auth before contract', () => {
    expect(assertAuthBefore(authBefore())).toBe(true)
    const before = authBefore()
    before.function.config = ['search_path=auth']
    expect(() => assertAuthBefore(before)).toThrow(/AUTH_FUNCTION_SEARCH_PATH_DIVERGENT/)
  })

  it('builds a guarded nominal Realtime compensation', () => {
    const sql = buildRealtimeCompensation({ before: realtimeBefore(), afterMigration: realtimeAfter() })
    expect(sql).toContain('ALTER PUBLICATION supabase_realtime DROP TABLE public.messages')
    expect(sql).toContain('REALTIME_PUBLICATION_DIVERGENT')
    expect(sql).not.toMatch(/DROP\s+PUBLICATION|DELETE\s+FROM|TRUNCATE/i)
  })

  it('refuses an absent Realtime publication', () => {
    const before = realtimeBefore()
    before.publicationExists = false
    expect(() => assertRealtimeBefore(before)).toThrow(/REALTIME_PUBLICATION_MISSING/)
  })

  it('refuses an absent messages relation', () => {
    const before = realtimeBefore()
    before.messagesExists = false
    expect(() => assertRealtimeBefore(before)).toThrow(/REALTIME_MESSAGES_MISSING/)
  })

  it('refuses a divergent Realtime publication state', () => {
    const after = realtimeAfter()
    after.relations = ['public.messages']
    expect(() => assertRealtimeAfterMigration(realtimeBefore(), after))
      .toThrow(/REALTIME_PUBLICATION_DIVERGENT/)
  })

  it('refuses another relation modified with messages', () => {
    const after = realtimeAfter()
    after.relations.push('public.profiles')
    expect(() => assertRealtimeAfterMigration(realtimeBefore(), after))
      .toThrow(/REALTIME_PUBLICATION_DIVERGENT/)
  })

  it('restores the exact Realtime structural fingerprint', () => {
    const before = realtimeBefore()
    const recovered = realtimeBefore()
    expect(assertRealtimeRecovered(before, recovered)).toBe(true)
    expect(structuralFingerprint(before)).toBe(structuralFingerprint(recovered))
  })

  it('refuses a messages data mutation', () => {
    const after = realtimeAfter()
    after.messageCount += 1
    expect(() => assertRealtimeAfterMigration(realtimeBefore(), after))
      .toThrow(/REALTIME_DATA_CHANGED/)
  })

  it('reports both recoveries without sensitive content', () => {
    const report = buildStructuralRecoveryReport({
      auth: { before: authBefore(), afterMigration: authAfter(), afterCompensation: authBefore() },
      realtime: {
        before: realtimeBefore(),
        afterMigration: realtimeAfter(),
        afterCompensation: realtimeBefore(),
      },
    })
    expect(report).toMatchObject({
      auth: { recoverable: true },
      realtime: { recoverable: true },
      overall: 'STRUCTURAL_RECOVERY_VERIFIED',
      remoteAccess: false,
    })
    expect(JSON.stringify(report)).not.toMatch(/password|token|cookie|postgresql:\/\//i)
  })

  it('has no network, Production or environment-loading capability', () => {
    const source = readFileSync('scripts/preproduction/validate-staging-structural-recovery.mjs', 'utf8')
    expect(source).not.toMatch(/node:(?:http|https|net|tls)|fetch\(|axios|undici|WebSocket/)
    expect(source).not.toMatch(/process\.env|dotenv|loadEnv|\.env\b/)
    expect(source).not.toMatch(/supabase\.co|app\.moovx\.ch|--linked|--prod/)
  })

  it('uses only targeted DDL and leaves cleanup to the isolated operator harness', () => {
    const authSql = buildAuthCompensation({ before: authBefore(), afterMigration: authAfter() })
    const realtimeSql = buildRealtimeCompensation({
      before: realtimeBefore(),
      afterMigration: realtimeAfter(),
    })
    expect(`${authSql}\n${realtimeSql}`).not.toMatch(/(?:^|\n)\s*DROP\s+(?:SCHEMA|TABLE|FUNCTION|PUBLICATION)/i)
    expect(`${authSql}\n${realtimeSql}`).not.toMatch(
      /(?:^|\n)\s*(?:GRANT|REVOKE|ALTER\s+ROLE|CREATE\s+ROLE)\b/i,
    )
  })
})
