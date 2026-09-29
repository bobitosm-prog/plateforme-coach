// Local PostgreSQL runtime test. Creates/destroys its OWN cluster; no remote credentials.
import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import assert from 'node:assert/strict'

const bin = execFileSync('pg_config', ['--bindir'], { encoding: 'utf8' }).trim()
const root = mkdtempSync(join(tmpdir(), 'moovx-apple-ledger-'))
const cluster = join(root, 'data')
const socket = join(root, 'socket')
mkdirSync(socket)
const args = ['-X', '-h', socket, '-p', '55439', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', '-Atq']
const sql = text => execFileSync(join(bin, 'psql'), args, { input: text, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim()
const service = text => sql(`SET ROLE service_role; ${text}`)
const fail = (text, message) => assert.throws(() => sql(text), error => error.stderr?.includes(message))
const parallel = text => new Promise((resolveRun, reject) => {
  const child = spawn(join(bin, 'psql'), args)
  let output = '', error = ''
  child.stdout.on('data', value => { output += value })
  child.stderr.on('data', value => { error += value })
  child.on('error', reject)
  child.on('close', code => resolveRun({ code, output: output.trim(), error }))
  child.stdin.end(`SET ROLE service_role; ${text}`)
})
const a = '00000000-0000-4000-8000-000000000001'
const b = '00000000-0000-4000-8000-000000000002'
const product = 'ch.moovx.app.athena.monthly'
let tokenA, tokenB
const record = ({ user = a, token = tokenA, env = 'Sandbox', transaction = '100', original = '100',
  signed = 2000, purchase = 1000, expires = 3000, revoked = null, upgraded = false, item = product } = {}) =>
  `SELECT public.record_apple_transaction_evidence('${user}','${env}','${token}','${transaction}','${original}',
  '${item}',${purchase},${signed},${expires ?? 'NULL'},${revoked ?? 'NULL'},${upgraded});`
let started = false
try {
  execFileSync(join(bin, 'initdb'), ['-D', cluster, '-U', 'postgres', '--auth=trust', '--no-locale'], { stdio: 'pipe' })
  execFileSync(join(bin, 'pg_ctl'), ['-D', cluster, '-l', join(root, 'postgres.log'), '-o', `-k ${socket} -p 55439 -c listen_addresses=''`, '-w', 'start'], { stdio: 'pipe' })
  started = true
  sql(`CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
    CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY);
    INSERT INTO auth.users VALUES ('${a}'), ('${b}');
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;`)
  const migration = readFileSync(resolve('supabase/migrations/20260929153040_apple_purchase_evidence_ledger.sql'), 'utf8')
  sql(migration)
  sql(migration)
  const inboxMigration = readFileSync(resolve('supabase/migrations/20260929154935_apple_notification_inbox.sql'), 'utf8')
  sql(inboxMigration)
  sql(inboxMigration)
  console.log('PASS migrations apply twice with default Supabase-style grants')

  tokenA = service(`SELECT public.prepare_apple_account_binding('${a}','Sandbox');`)
  tokenB = service(`SELECT public.prepare_apple_account_binding('${b}','Sandbox');`)
  assert.notEqual(tokenA, tokenB)
  assert.equal(service(`SELECT public.prepare_apple_account_binding('${a}','Sandbox');`), tokenA)
  const productionToken = service(`SELECT public.prepare_apple_account_binding('${a}','Production');`)
  assert.notEqual(productionToken, tokenA)
  console.log('PASS stable per-account, per-environment bindings')

  assert.equal(service(record()), 'inserted')
  assert.equal(service(record()), 'duplicate')
  assert.equal(sql('SELECT count(*) FROM public.apple_transaction_evidence;'), '1')
  console.log('PASS exact replay creates no duplicate')
  fail('SET ROLE service_role; ' + record({ user: b }), 'APPLE_ACCOUNT_MISMATCH')
  fail('SET ROLE service_role; ' + record({ user: b, token: tokenB }), 'APPLE_OWNERSHIP_CONFLICT')
  fail('SET ROLE service_role; ' + record({ signed: 2000, expires: 4000 }), 'APPLE_TRANSACTION_CONFLICT')
  fail('SET ROLE service_role; ' + record({ original: '101' }), 'APPLE_TRANSACTION_CONFLICT')
  assert.equal(sql("SELECT count(*) FROM public.apple_purchase_owners WHERE original_transaction_id='101';"), '0')
  console.log('PASS account/ownership/version conflicts roll back atomically')

  assert.equal(service(record({ env: 'Production', token: productionToken })), 'inserted')
  fail('SET ROLE service_role; ' + record({ env: 'Production' }), 'APPLE_ACCOUNT_MISMATCH')
  console.log('PASS sandbox and production are independent')

  assert.equal(service(record({ signed: 2500, revoked: 2400 })), 'inserted')
  assert.equal(service(record({ signed: 2100 })), 'inserted')
  assert.equal(sql("SELECT revoked_ms FROM public.apple_transaction_evidence WHERE environment='Sandbox' AND transaction_id='100' ORDER BY signed_ms DESC LIMIT 1;"), '2400')
  assert.equal(service(record({ transaction: '102', original: '100', purchase: 3000, signed: 3100, expires: 5000 })), 'inserted')
  assert.equal(service(record({ transaction: '103', original: '103', item: 'ch.moovx.app.athena.lifetime', expires: null })), 'inserted')
  console.log('PASS late delivery preserves latest refund evidence; renewal and lifetime recorded')

  const retries = await Promise.all(Array.from({ length: 12 }, () => parallel(record({ transaction: '200', original: '200' }))))
  assert.ok(retries.every(result => result.code === 0))
  assert.equal(retries.filter(result => result.output === 'inserted').length, 1)
  assert.equal(retries.filter(result => result.output === 'duplicate').length, 11)
  const competing = await Promise.all([
    parallel(record({ transaction: '300', original: '300' })),
    parallel(record({ user: b, token: tokenB, transaction: '300', original: '300' })),
  ])
  assert.equal(competing.filter(result => result.code === 0).length, 1)
  assert.equal(competing.filter(result => result.error.includes('APPLE_OWNERSHIP_CONFLICT')).length, 1)
  console.log('PASS concurrent retries insert once; competing accounts cannot steal ownership')

  for (const role of ['anon', 'authenticated']) {
    for (const table of ['apple_account_bindings', 'apple_purchase_owners', 'apple_transaction_evidence', 'apple_notification_inbox']) {
      fail(`SET ROLE ${role}; SELECT * FROM public.${table};`, 'permission denied')
      assert.equal(sql(`SELECT has_table_privilege('${role}', 'public.${table}', 'INSERT,UPDATE,DELETE,TRUNCATE');`), 'f')
    }
    fail(`SET ROLE ${role}; SELECT public.prepare_apple_account_binding('${a}','Sandbox');`, 'permission denied')
    fail(`SET ROLE ${role}; ${record()}`, 'permission denied')
  }
  assert.equal(sql("SELECT count(*) FROM pg_class WHERE relname IN ('apple_account_bindings','apple_purchase_owners','apple_transaction_evidence') AND relrowsecurity AND relforcerowsecurity;"), '3')
  assert.equal(sql("SELECT count(*) FROM pg_proc WHERE proname IN ('prepare_apple_account_binding','record_apple_transaction_evidence') AND NOT prosecdef AND proconfig @> ARRAY['search_path=\"\"'];"), '2')
  sql('GRANT SELECT ON public.apple_transaction_evidence TO authenticated;')
  assert.equal(sql('SET ROLE authenticated; SELECT count(*) FROM public.apple_transaction_evidence;'), '0')
  sql('REVOKE SELECT ON public.apple_transaction_evidence FROM authenticated;')
  fail('SET ROLE service_role; DELETE FROM public.apple_transaction_evidence;', 'permission denied')
  fail('SET ROLE service_role; UPDATE public.apple_purchase_owners SET app_account_token=gen_random_uuid();', 'permission denied')
  console.log('PASS browser grants/RPCs denied; RLS survives accidental SELECT grant; server updates/deletes denied')

  sql(`DELETE FROM auth.users WHERE id='${a}';`)
  assert.equal(sql(`SELECT count(*) FROM public.apple_account_bindings WHERE user_id IS NULL AND app_account_token='${tokenA}';`), '1')
  fail('SET ROLE service_role; ' + record({ user: b, token: tokenB }), 'APPLE_OWNERSHIP_CONFLICT')
  fail('SET ROLE service_role; ' + record(), 'APPLE_ACCOUNT_MISMATCH')
  console.log('PASS deleting an account preserves ownership tombstones and prevents reassignment')

  const notification = (payload = 'signed.test.payload', env = 'Sandbox', type = 'DID_RENEW') =>
    `SELECT public.enqueue_apple_notification('${env}','00000000-0000-4000-8000-000000000090','${type}',NULL,2000,'${payload}');`
  const notificationRetries = await Promise.all(Array.from({ length: 12 }, () => parallel(notification())))
  assert.ok(notificationRetries.every(result => result.code === 0))
  assert.equal(notificationRetries.filter(result => result.output === 'inserted').length, 1)
  assert.equal(notificationRetries.filter(result => result.output === 'duplicate').length, 11)
  assert.equal(sql("SELECT processing_status FROM public.apple_notification_inbox WHERE environment='Sandbox';"), 'pending')
  assert.equal(service(notification('signed.test.payload', 'Production', 'TEST')), 'inserted')
  assert.equal(sql("SELECT processing_status FROM public.apple_notification_inbox WHERE environment='Production';"), 'test_received')
  fail('SET ROLE service_role; ' + notification('different.signed.payload'), 'APPLE_NOTIFICATION_CONFLICT')
  for (const role of ['anon', 'authenticated']) fail(`SET ROLE ${role}; ${notification()}`, 'permission denied')
  fail('SET ROLE service_role; DELETE FROM public.apple_notification_inbox;', 'permission denied')
  assert.equal(sql("SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='public.apple_notification_inbox'::regclass;"), 't')
  assert.equal(sql("SELECT NOT prosecdef FROM pg_proc WHERE proname='enqueue_apple_notification';"), 't')
  console.log('PASS notification inbox deduplicates concurrent receipt, rejects conflicts, isolates environments and denies browser access')


  const processingMigration = readFileSync(resolve('supabase/migrations/20260929155616_apple_notification_processing.sql'), 'utf8')
  sql(processingMigration); sql(processingMigration)
  const claim = () => JSON.parse(service("SELECT coalesce(json_agg(t),'[]'::json) FROM public.claim_apple_notification('Sandbox') t;"))
  const firstClaim = claim()[0]
  assert.ok(firstClaim.lease_token)
  assert.equal(claim().length, 0)
  const claimedId = firstClaim.notification_id
  sql(`UPDATE public.apple_notification_inbox SET lease_until=now()-interval '1 second' WHERE environment='Sandbox' AND notification_id='${claimedId}';`)
  const recovered = claim()[0]
  assert.notEqual(recovered.lease_token, firstClaim.lease_token)
  assert.equal(recovered.attempts, 2)
  const at = Date.now()
  const observation = { state: 'active', accessUntil: at + 3600000, checkedAt: at,
    transaction: { environment: 'Sandbox', transactionId: '400', originalTransactionId: '400',
      productId: product, appAccountToken: tokenB, purchaseDate: at - 1000,
      signedDate: at - 100, expiresDate: at + 3600000, revocationDate: null, isUpgraded: false } }
  const complete = (event, value = observation) => `SELECT public.complete_apple_notification('Sandbox','${event.notification_id}','${event.lease_token}','${b}','${JSON.stringify(value)}'::jsonb);`
  fail('SET ROLE service_role; ' + complete(firstClaim), 'APPLE_LEASE_LOST')
  assert.equal(service(complete(recovered)), 'processed')
  assert.equal(sql("SELECT state FROM public.apple_purchase_state WHERE original_transaction_id='400';"), 'active')
  assert.equal(sql(`SELECT processing_status FROM public.apple_notification_inbox WHERE environment='Sandbox' AND notification_id='${claimedId}';`), 'processed')
  console.log('PASS lease recovery fences off crashed worker; completion atomically records current state and event')

  const enqueueId = id => service(`SELECT public.enqueue_apple_notification('Sandbox','${id}','REFUND',NULL,2000,'signed.${id}.payload');`)
  enqueueId('00000000-0000-4000-8000-000000000091')
  const refundEvent = claim()[0]
  const refund = { ...observation, state: 'revoked', accessUntil: null, checkedAt: at + 100,
    transaction: { ...observation.transaction, signedDate: at + 50, revocationDate: at + 25 } }
  assert.equal(service(complete(refundEvent, refund)), 'processed')
  enqueueId('00000000-0000-4000-8000-000000000092')
  assert.equal(service(complete(claim()[0], observation)), 'stale')
  assert.equal(sql("SELECT state FROM public.apple_purchase_state WHERE original_transaction_id='400';"), 'revoked')
  console.log('PASS late active observation cannot overwrite newer refund')

  enqueueId('00000000-0000-4000-8000-000000000093')
  const retryEvent = claim()[0]
  const invalidObservation = { ...observation, transaction: { ...observation.transaction, appAccountToken: tokenA } }
  fail('SET ROLE service_role; ' + complete(retryEvent, invalidObservation), 'APPLE_ACCOUNT_MISMATCH')
  assert.equal(sql(`SELECT processing_status FROM public.apple_notification_inbox WHERE notification_id='${retryEvent.notification_id}';`), 'processing')
  assert.equal(service(`SELECT public.fail_apple_notification('Sandbox','${retryEvent.notification_id}','${retryEvent.lease_token}',true,'APPLE_PROCESSING_UNAVAILABLE');`), 't')
  assert.equal(claim().length, 0)
  sql(`UPDATE public.apple_notification_inbox SET next_attempt_at=now()-interval '1 second' WHERE notification_id='${retryEvent.notification_id}';`)
  const retryClaim = claim()[0]
  assert.equal(service(`SELECT public.fail_apple_notification('Sandbox','${retryClaim.notification_id}','${retryClaim.lease_token}',false,'APPLE_UNBOUND_ACCOUNT');`), 't')
  assert.equal(claim().length, 0)
  assert.equal(sql("SELECT state FROM public.apple_purchase_state WHERE original_transaction_id='400';"), 'revoked')
  console.log('PASS failed completion rolls back; retry is delayed; quarantine preserves last confirmed state')

  for (const role of ['anon','authenticated']) {
    fail(`SET ROLE ${role}; SELECT * FROM public.apple_purchase_state;`, 'permission denied')
    fail(`SET ROLE ${role}; SELECT * FROM public.claim_apple_notification('Sandbox');`, 'permission denied')
    fail(`SET ROLE ${role}; ${complete(retryClaim)}`, 'permission denied')
    fail(`SET ROLE ${role}; SELECT public.fail_apple_notification('Sandbox','${retryClaim.notification_id}','${retryClaim.lease_token}',true,'APPLE_PROCESSING_UNAVAILABLE');`, 'permission denied')
  }
  assert.equal(sql("SELECT relrowsecurity AND relforcerowsecurity FROM pg_class WHERE oid='public.apple_purchase_state'::regclass;"), 't')
  fail("SET ROLE service_role; UPDATE public.apple_notification_inbox SET signed_payload='replacement';", 'permission denied')
  console.log('PASS processing RPCs/state denied to browser; signed evidence remains immutable')
  enqueueId('00000000-0000-4000-8000-000000000094')
  enqueueId('00000000-0000-4000-8000-000000000095')
  const simultaneousClaims = await Promise.all([1,2,3].map(() => parallel("SELECT notification_id FROM public.claim_apple_notification('Sandbox');")))
  assert.ok(simultaneousClaims.every(result => result.code === 0))
  const claimedIds = simultaneousClaims.map(result => result.output).filter(Boolean)
  assert.equal(claimedIds.length, 2)
  assert.equal(new Set(claimedIds).size, 2)
  console.log('PASS simultaneous workers claim distinct events with SKIP LOCKED')


  if (process.argv.includes('--advisors')) {
    const localUrl = `postgresql://postgres@localhost:55439/postgres?host=${encodeURIComponent(socket)}&sslmode=disable`
    const output = execFileSync('npx', ['--yes', 'supabase', 'db', 'advisors', '--db-url', localUrl,
      '--type', 'all', '--level', 'warn', '--fail-on', 'error'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
    console.log(output.trim())
  }
  console.log('All Apple ledger PostgreSQL runtime scenarios passed.')
} finally {
  if (started) execFileSync(join(bin, 'pg_ctl'), ['-D', cluster, '-m', 'fast', '-w', 'stop'], { stdio: 'pipe' })
  rmSync(root, { recursive: true, force: true })
}
