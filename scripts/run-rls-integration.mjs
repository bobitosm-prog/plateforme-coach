import { spawnSync } from 'node:child_process'
import { config as loadEnv } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

const root = new URL('../', import.meta.url)
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit', env: process.env })
  if (result.status !== 0) throw new Error(`${command} failed with status ${result.status}`)
}

run(process.execPath, ['scripts/supabase-local.mjs', 'ensure'])
loadEnv({ path: new URL('../.env.e2e.local', import.meta.url), quiet: true, override: true })
const apiUrl = process.env.API_URL || ''
const anonKey = process.env.ANON_KEY || ''
const serviceKey = process.env.SERVICE_ROLE_KEY || ''
const url = new URL(apiUrl)
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || !anonKey || !serviceKey) throw new Error('RLS integration requires canonical local Supabase credentials')

run('psql', ['postgresql://postgres:postgres@127.0.0.1:55322/postgres', '-X', '-v', 'ON_ERROR_STOP=1', '-f', 'tests/integration/rls-matrix.sql'])
run('psql', ['postgresql://postgres:postgres@127.0.0.1:55322/postgres', '-X', '-v', 'ON_ERROR_STOP=1', '-f', 'tests/integration/messages-rls.sql'])

const admin = createClient(apiUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
const clientEmail = `rls-postgrest-client-${process.pid}@moovx.example.test`
const coachEmail = `rls-postgrest-coach-${process.pid}@moovx.example.test`
const password = `Local-RLS-${process.pid}-Only!`
const userIds = []
try {
  for (const fixture of [{ email: clientEmail, role: 'client' }, { email: coachEmail, role: 'coach' }]) {
    const created = await admin.auth.admin.createUser({ email: fixture.email, password, email_confirm: true, user_metadata: { role: fixture.role } })
    if (created.error || !created.data.user) throw created.error || new Error(`PostgREST ${fixture.role} Auth creation failed`)
    userIds.push(created.data.user.id)
    const prepared = await admin.from('profiles').upsert({ id: created.data.user.id, email: fixture.email, role: fixture.role, full_name: `PostgREST RLS ${fixture.role}` })
    if (prepared.error) throw prepared.error
  }
  const [clientId, coachId] = userIds
  const relation = await admin.from('coach_clients').insert({ client_id: clientId, coach_id: coachId, status: 'active' })
  if (relation.error) throw relation.error
  const payment = await admin.from('payments').insert({ client_id: clientId, coach_id: coachId, amount: 42, status: 'paid', stripe_id: 'pi_postgrest_rls', stripe_event_id: 'evt_postgrest_rls' })
  if (payment.error) throw payment.error

  const clientBrowser = createClient(apiUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const clientSigned = await clientBrowser.auth.signInWithPassword({ email: clientEmail, password })
  if (clientSigned.error || !clientSigned.data.session) throw clientSigned.error || new Error('PostgREST client login failed')
  const safeProfileUpdate = await clientBrowser.from('profiles').update({ full_name: 'PostgREST Safe Profile' }).eq('id', clientId).select('id,full_name').single()
  if (safeProfileUpdate.error || safeProfileUpdate.data?.full_name !== 'PostgREST Safe Profile') throw safeProfileUpdate.error || new Error('PostgREST safe profile update failed')
  const sensitiveProfileUpdate = await clientBrowser.from('profiles').update({ role: 'coach' }).eq('id', clientId)
  if (!sensitiveProfileUpdate.error) throw new Error('PostgREST sensitive profile update unexpectedly succeeded')
  const foreignProfileUpdate = await clientBrowser.from('profiles').update({ full_name: 'Foreign' }).eq('id', coachId).select('id')
  if (foreignProfileUpdate.error || foreignProfileUpdate.data?.length !== 0) throw foreignProfileUpdate.error || new Error('PostgREST foreign profile update leaked')
  const clientCoachProfile = await clientBrowser.from('active_related_profiles').select('id,full_name,coach_monthly_rate').eq('id', coachId).single()
  if (clientCoachProfile.error || clientCoachProfile.data?.id !== coachId) throw clientCoachProfile.error || new Error('PostgREST active client could not read projected coach')
  const clientCoachAuthority = await clientBrowser.from('active_related_profiles').select('stripe_account_id').eq('id', coachId)
  if (!clientCoachAuthority.error) throw new Error('PostgREST related profile projection exposed Stripe authority')
  const clientRead = await clientBrowser.from('payments').select('client_id,coach_id,stripe_event_id')
  if (clientRead.error || clientRead.data?.length !== 1 || clientRead.data[0]?.client_id !== clientId) throw clientRead.error || new Error('PostgREST client payment ownership failed')
  const clientWrite = await clientBrowser.from('payments').insert({ client_id: clientId, coach_id: coachId, amount: 1, stripe_event_id: 'evt_forged_postgrest' })
  if (!clientWrite.error) throw new Error('PostgREST authenticated payment insert unexpectedly succeeded')
  const clientRelationWrite = await clientBrowser.from('coach_clients').insert({ client_id: clientId, coach_id: coachId, status: 'active' })
  if (!clientRelationWrite.error) throw new Error('PostgREST client relationship insert unexpectedly succeeded')
  const clientMessage = await clientBrowser.from('messages').insert({ sender_id: clientId, receiver_id: coachId, content: 'PostgREST client message', image_url: 'messages/postgrest.jpg' }).select('id').single()
  if (clientMessage.error || !clientMessage.data?.id) throw clientMessage.error || new Error('PostgREST active client message insert failed')
  const arbitraryMessage = await clientBrowser.from('messages').insert({ sender_id: clientId, receiver_id: userIds[0], content: 'invalid self message' })
  if (!arbitraryMessage.error) throw new Error('PostgREST arbitrary message receiver unexpectedly succeeded')

  const coachBrowser = createClient(apiUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const coachSigned = await coachBrowser.auth.signInWithPassword({ email: coachEmail, password })
  if (coachSigned.error || !coachSigned.data.session) throw coachSigned.error || new Error('PostgREST coach login failed')
  const activeRead = await coachBrowser.from('payments').select('client_id,coach_id')
  if (activeRead.error || activeRead.data?.length !== 1 || activeRead.data[0]?.coach_id !== coachId) throw activeRead.error || new Error('PostgREST active coach payment read failed')
  const coachClientProfile = await coachBrowser.from('active_related_profiles').select('id,full_name,email,calorie_goal').eq('id', clientId).single()
  if (coachClientProfile.error || coachClientProfile.data?.id !== clientId) throw coachClientProfile.error || new Error('PostgREST active coach could not read projected client')
  const coachClientDirect = await coachBrowser.from('profiles').select('id,stripe_customer_id').eq('id', clientId)
  if (coachClientDirect.error || coachClientDirect.data?.length !== 0) throw coachClientDirect.error || new Error('PostgREST coach retained direct client profile access')
  const coachClientUpdate = await coachBrowser.rpc('update_active_client_profile', { target_client_id: clientId, changes: { calorie_goal: 2460 } })
  if (coachClientUpdate.error || coachClientUpdate.data?.calorie_goal !== 2460) throw coachClientUpdate.error || new Error('PostgREST active coach safe client update failed')
  const coachRelationWrite = await coachBrowser.from('coach_clients').insert({ client_id: clientId, coach_id: coachId, status: 'active' })
  if (!coachRelationWrite.error) throw new Error('PostgREST coach relationship insert unexpectedly succeeded')
  const coachMessages = await coachBrowser.from('messages').select('id,sender_id,receiver_id,content,image_url').eq('id', clientMessage.data.id).single()
  if (coachMessages.error || coachMessages.data?.sender_id !== clientId) throw coachMessages.error || new Error('PostgREST active coach message read failed')
  const coachMessage = await coachBrowser.from('messages').insert({ sender_id: coachId, receiver_id: clientId, content: 'PostgREST coach message' }).select('id').single()
  if (coachMessage.error || !coachMessage.data?.id) throw coachMessage.error || new Error('PostgREST active coach message insert failed')
  const markedRead = await clientBrowser.from('messages').update({ read: true }).eq('id', coachMessage.data.id).select('id,read').single()
  if (markedRead.error || markedRead.data?.read !== true) throw markedRead.error || new Error('PostgREST recipient mark-read failed')
  const contentMutation = await clientBrowser.from('messages').update({ content: 'forged' }).eq('id', coachMessage.data.id)
  if (!contentMutation.error) throw new Error('PostgREST immutable message content update unexpectedly succeeded')
  const clientDelete = await clientBrowser.from('messages').delete().eq('id', coachMessage.data.id)
  if (!clientDelete.error) throw new Error('PostgREST authenticated message delete unexpectedly succeeded')
  const deactivated = await admin.from('coach_clients').update({ status: 'inactive' }).eq('client_id', clientId).eq('coach_id', coachId)
  if (deactivated.error) throw deactivated.error
  const inactiveRead = await coachBrowser.from('payments').select('id')
  if (inactiveRead.error || inactiveRead.data?.length !== 0) throw inactiveRead.error || new Error('PostgREST inactive coach retained payment access')
  const inactiveCoachProfile = await clientBrowser.from('active_related_profiles').select('id').eq('id', coachId)
  if (inactiveCoachProfile.error || inactiveCoachProfile.data?.length !== 0) throw inactiveCoachProfile.error || new Error('PostgREST inactive client retained projected coach access')
  const inactiveClientProfile = await coachBrowser.from('active_related_profiles').select('id').eq('id', clientId)
  if (inactiveClientProfile.error || inactiveClientProfile.data?.length !== 0) throw inactiveClientProfile.error || new Error('PostgREST inactive coach retained projected client access')
  const inactiveClientUpdate = await coachBrowser.rpc('update_active_client_profile', { target_client_id: clientId, changes: { calorie_goal: 2470 } })
  if (!inactiveClientUpdate.error) throw new Error('PostgREST inactive coach retained client update access')
  console.log('RLS_POSTGREST_OK [profiles/own-safe-update/sensitive-denied/related-projection/authority-excluded/active-symmetric/inactive-denied; payments/client-read/auth-write-denied; coach-clients/auth-write-denied; messages/active-read-bidirectional-insert/mark-read/foreign-update-delete-denied]')
} finally {
  if (userIds.length) {
    await admin.from('messages').delete().or(`sender_id.in.(${userIds.join(',')}),receiver_id.in.(${userIds.join(',')})`)
    await admin.from('payments').delete().in('client_id', userIds)
    await admin.from('coach_clients').delete().or(`client_id.in.(${userIds.join(',')}),coach_id.in.(${userIds.join(',')})`)
    await admin.from('profiles').delete().in('id', userIds)
  }
  for (const userId of userIds.reverse()) await admin.auth.admin.deleteUser(userId)
}
