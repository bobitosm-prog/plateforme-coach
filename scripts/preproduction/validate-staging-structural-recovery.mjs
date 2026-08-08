import { createHash } from 'node:crypto'

export const AUTH_TRIGGER_NAME = 'on_auth_user_created'
export const AUTH_TABLE = 'auth.users'
export const AUTH_FUNCTION = 'public.handle_new_user'
export const AUTH_FUNCTION_GRANTS = [
  'PUBLIC:EXECUTE:f',
  'anon:EXECUTE:f',
  'authenticated:EXECUTE:f',
  'postgres:EXECUTE:f',
  'service_role:EXECUTE:f',
]
export const REALTIME_PUBLICATION = 'supabase_realtime'
export const REALTIME_MESSAGES_RELATION = 'public.messages'

function recoveryError(code) {
  const error = new Error(`Structural recovery blocked: ${code}`)
  error.code = code
  return error
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical)
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, canonical(child)]),
  )
}

export function structuralFingerprint(value) {
  return createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex')
}

function sortedTriggers(triggers) {
  if (!Array.isArray(triggers)) throw recoveryError('AUTH_TRIGGER_INVENTORY_INVALID')
  return [...triggers].sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
}

function authStructure(snapshot) {
  return {
    function: snapshot.function,
    triggers: sortedTriggers(snapshot.triggers),
  }
}

function assertExpectedAuthFunction(contract) {
  if (!contract || contract.count !== 1) throw recoveryError('AUTH_FUNCTION_COUNT_DIVERGENT')
  if (contract.identity !== AUTH_FUNCTION || contract.arguments !== '') {
    throw recoveryError('AUTH_FUNCTION_IDENTITY_DIVERGENT')
  }
  if (contract.owner !== 'postgres') throw recoveryError('AUTH_FUNCTION_OWNER_DIVERGENT')
  if (contract.securityDefiner !== true) throw recoveryError('AUTH_FUNCTION_SECURITY_DIVERGENT')
  if (contract.language !== 'plpgsql' || contract.returnType !== 'trigger') {
    throw recoveryError('AUTH_FUNCTION_SIGNATURE_DIVERGENT')
  }
  if (!Array.isArray(contract.config) || contract.config.length !== 1 || contract.config[0] !== 'search_path=public') {
    throw recoveryError('AUTH_FUNCTION_SEARCH_PATH_DIVERGENT')
  }
  if (!/^[a-f0-9]{32}$/.test(contract.definitionHash ?? '')) {
    throw recoveryError('AUTH_FUNCTION_DEFINITION_DIVERGENT')
  }
  if (
    !Array.isArray(contract.grants)
    || structuralFingerprint([...contract.grants].sort()) !== structuralFingerprint(AUTH_FUNCTION_GRANTS)
  ) {
    throw recoveryError('AUTH_FUNCTION_GRANTS_DIVERGENT')
  }
}

function isExpectedAuthTrigger(trigger) {
  return trigger?.name === AUTH_TRIGGER_NAME
    && trigger.table === AUTH_TABLE
    && trigger.function === AUTH_FUNCTION
    && trigger.type === 5
    && trigger.enabled === 'O'
    && trigger.condition === null
}

export function assertAuthBefore(snapshot) {
  assertExpectedAuthFunction(snapshot?.function)
  const matching = sortedTriggers(snapshot.triggers).filter(trigger => trigger.name === AUTH_TRIGGER_NAME)
  if (matching.length !== 0) throw recoveryError('AUTH_TRIGGER_EXPECTED_ABSENT')
  if (!Number.isInteger(snapshot.authUserCount) || snapshot.authUserCount < 0) {
    throw recoveryError('AUTH_DATA_COUNT_INVALID')
  }
  return true
}

export function assertAuthAfterMigration(before, afterMigration) {
  assertAuthBefore(before)
  assertExpectedAuthFunction(afterMigration?.function)
  if (structuralFingerprint(before.function) !== structuralFingerprint(afterMigration.function)) {
    throw recoveryError('AUTH_FUNCTION_CHANGED')
  }
  const matching = sortedTriggers(afterMigration.triggers).filter(
    trigger => trigger.name === AUTH_TRIGGER_NAME,
  )
  if (matching.length === 0) throw recoveryError('AUTH_TRIGGER_MISSING')
  if (matching.length > 1) throw recoveryError('AUTH_TRIGGER_MULTIPLE')
  if (!isExpectedAuthTrigger(matching[0])) throw recoveryError('AUTH_TRIGGER_DEFINITION_DIVERGENT')
  const beforeOther = sortedTriggers(before.triggers)
  const afterOther = sortedTriggers(afterMigration.triggers).filter(
    trigger => trigger.name !== AUTH_TRIGGER_NAME,
  )
  if (structuralFingerprint(beforeOther) !== structuralFingerprint(afterOther)) {
    throw recoveryError('AUTH_OTHER_TRIGGERS_CHANGED')
  }
  if (afterMigration.authUserCount !== before.authUserCount) {
    throw recoveryError('AUTH_DATA_CHANGED')
  }
  return true
}

export function buildAuthCompensation({ before, afterMigration }) {
  assertAuthAfterMigration(before, afterMigration)
  const definitionHash = before.function.definitionHash
  const grantsHash = createHash('md5').update(AUTH_FUNCTION_GRANTS.join('\n')).digest('hex')
  return `DO $structural_recovery$
DECLARE
  expected_trigger_count integer;
  exact_trigger_count integer;
  exact_function_count integer;
  function_grants_hash text;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE
    t.tgrelid = 'auth.users'::regclass
    AND t.tgfoid = 'public.handle_new_user()'::regprocedure
    AND t.tgtype = 5
    AND t.tgenabled = 'O'
    AND t.tgqual IS NULL
    AND NOT t.tgisinternal
  )
  INTO expected_trigger_count, exact_trigger_count
  FROM pg_trigger t
  WHERE t.tgname = 'on_auth_user_created';

  IF expected_trigger_count <> 1 OR exact_trigger_count <> 1 THEN
    RAISE EXCEPTION 'AUTH_TRIGGER_CONTRACT_DIVERGENT';
  END IF;

  SELECT count(*) INTO exact_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_language l ON l.oid = p.prolang
  WHERE n.nspname = 'public'
    AND p.proname = 'handle_new_user'
    AND pg_get_function_identity_arguments(p.oid) = ''
    AND pg_get_userbyid(p.proowner) = 'postgres'
    AND p.prosecdef
    AND l.lanname = 'plpgsql'
    AND pg_get_function_result(p.oid) = 'trigger'
    AND p.proconfig = ARRAY['search_path=public']::text[]
    AND md5(pg_get_functiondef(p.oid)) = '${definitionHash}';

  IF exact_function_count <> 1 THEN
    RAISE EXCEPTION 'AUTH_FUNCTION_CONTRACT_DIVERGENT';
  END IF;

  SELECT md5(string_agg(
    format('%s:%s:%s', coalesce(grantee.rolname, 'PUBLIC'), privilege_type, is_grantable),
    E'\n' ORDER BY coalesce(grantee.rolname, 'PUBLIC'), privilege_type, is_grantable
  )) INTO function_grants_hash
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  LEFT JOIN LATERAL aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl ON true
  LEFT JOIN pg_roles grantee ON grantee.oid = acl.grantee
  WHERE n.nspname = 'public'
    AND p.proname = 'handle_new_user'
    AND pg_get_function_identity_arguments(p.oid) = '';
  IF function_grants_hash <> '${grantsHash}' THEN
    RAISE EXCEPTION 'AUTH_FUNCTION_GRANTS_DIVERGENT';
  END IF;

  DROP TRIGGER on_auth_user_created ON auth.users;
END
$structural_recovery$;`
}

export function assertAuthRecovered(before, recovered) {
  assertAuthBefore(before)
  assertAuthBefore(recovered)
  if (recovered.authUserCount !== before.authUserCount) throw recoveryError('AUTH_DATA_CHANGED')
  if (structuralFingerprint(authStructure(before)) !== structuralFingerprint(authStructure(recovered))) {
    throw recoveryError('AUTH_FINGERPRINT_DIVERGENT')
  }
  return true
}

function sortedRelations(snapshot) {
  if (!Array.isArray(snapshot?.relations)) throw recoveryError('REALTIME_RELATION_INVENTORY_INVALID')
  if (snapshot.relations.some(relation => !/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(relation))) {
    throw recoveryError('REALTIME_RELATION_INVALID')
  }
  const sorted = [...snapshot.relations].sort()
  if (new Set(sorted).size !== sorted.length) throw recoveryError('REALTIME_RELATION_DUPLICATE')
  return sorted
}

function realtimeStructure(snapshot) {
  return {
    publication: snapshot.publication,
    publicationExists: snapshot.publicationExists,
    messagesExists: snapshot.messagesExists,
    relations: sortedRelations(snapshot),
  }
}

export function assertRealtimeBefore(snapshot) {
  if (snapshot?.publication !== REALTIME_PUBLICATION || snapshot.publicationExists !== true) {
    throw recoveryError('REALTIME_PUBLICATION_MISSING')
  }
  if (snapshot.messagesExists !== true) throw recoveryError('REALTIME_MESSAGES_MISSING')
  const relations = sortedRelations(snapshot)
  if (relations.includes(REALTIME_MESSAGES_RELATION)) {
    throw recoveryError('REALTIME_MESSAGES_EXPECTED_UNPUBLISHED')
  }
  if (!Number.isInteger(snapshot.messageCount) || snapshot.messageCount < 0) {
    throw recoveryError('REALTIME_DATA_COUNT_INVALID')
  }
  return true
}

export function assertRealtimeAfterMigration(before, afterMigration) {
  assertRealtimeBefore(before)
  if (afterMigration?.publication !== REALTIME_PUBLICATION || afterMigration.publicationExists !== true) {
    throw recoveryError('REALTIME_PUBLICATION_MISSING')
  }
  if (afterMigration.messagesExists !== true) throw recoveryError('REALTIME_MESSAGES_MISSING')
  const beforeRelations = sortedRelations(before)
  const afterRelations = sortedRelations(afterMigration)
  const expected = [...beforeRelations, REALTIME_MESSAGES_RELATION].sort()
  if (structuralFingerprint(expected) !== structuralFingerprint(afterRelations)) {
    throw recoveryError('REALTIME_PUBLICATION_DIVERGENT')
  }
  if (afterMigration.messageCount !== before.messageCount) {
    throw recoveryError('REALTIME_DATA_CHANGED')
  }
  return true
}

function publicationFingerprint(relations) {
  return createHash('md5').update([...relations].sort().join('\n')).digest('hex')
}

export function buildRealtimeCompensation({ before, afterMigration }) {
  assertRealtimeAfterMigration(before, afterMigration)
  const expectedHash = publicationFingerprint(afterMigration.relations)
  return `DO $structural_recovery$
DECLARE
  messages_count integer;
  publication_hash text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE EXCEPTION 'REALTIME_PUBLICATION_MISSING';
  END IF;
  IF to_regclass('public.messages') IS NULL THEN
    RAISE EXCEPTION 'REALTIME_MESSAGES_MISSING';
  END IF;

  SELECT count(*) INTO messages_count
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename = 'messages';
  IF messages_count <> 1 THEN
    RAISE EXCEPTION 'REALTIME_MESSAGES_MEMBERSHIP_DIVERGENT';
  END IF;

  SELECT md5(coalesce(string_agg(format('%I.%I', schemaname, tablename), E'\\n' ORDER BY schemaname, tablename), ''))
  INTO publication_hash
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime';
  IF publication_hash <> '${expectedHash}' THEN
    RAISE EXCEPTION 'REALTIME_PUBLICATION_DIVERGENT';
  END IF;

  ALTER PUBLICATION supabase_realtime DROP TABLE public.messages;
END
$structural_recovery$;`
}

export function assertRealtimeRecovered(before, recovered) {
  assertRealtimeBefore(before)
  assertRealtimeBefore(recovered)
  if (recovered.messageCount !== before.messageCount) throw recoveryError('REALTIME_DATA_CHANGED')
  if (structuralFingerprint(realtimeStructure(before)) !== structuralFingerprint(realtimeStructure(recovered))) {
    throw recoveryError('REALTIME_FINGERPRINT_DIVERGENT')
  }
  return true
}

export function buildStructuralRecoveryReport({ auth, realtime }) {
  assertAuthAfterMigration(auth.before, auth.afterMigration)
  assertAuthRecovered(auth.before, auth.afterCompensation)
  assertRealtimeAfterMigration(realtime.before, realtime.afterMigration)
  assertRealtimeRecovered(realtime.before, realtime.afterCompensation)
  return {
    auth: {
      beforeFingerprint: structuralFingerprint(authStructure(auth.before)),
      afterMigrationFingerprint: structuralFingerprint(authStructure(auth.afterMigration)),
      afterCompensationFingerprint: structuralFingerprint(authStructure(auth.afterCompensation)),
      recoverable: true,
    },
    realtime: {
      beforeFingerprint: structuralFingerprint(realtimeStructure(realtime.before)),
      afterMigrationFingerprint: structuralFingerprint(realtimeStructure(realtime.afterMigration)),
      afterCompensationFingerprint: structuralFingerprint(realtimeStructure(realtime.afterCompensation)),
      recoverable: true,
    },
    overall: 'STRUCTURAL_RECOVERY_VERIFIED',
    remoteAccess: false,
  }
}
