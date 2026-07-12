import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => {
  const getUser = vi.fn()
  const maybeSingle = vi.fn()
  const selectEq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq: selectEq }))
  const updateMaybeSingle = vi.fn()
  const updateSelect = vi.fn(() => ({ maybeSingle: updateMaybeSingle }))
  const updateEq2 = vi.fn(() => ({ select: updateSelect }))
  const updateEq1 = vi.fn(() => ({ eq: updateEq2 }))
  const update = vi.fn(() => ({ eq: updateEq1 }))
  const from = vi.fn(() => ({ select, update }))
  const createSupabaseRouteClient = vi.fn(async () => ({ auth: { getUser }, from }))
  return { getUser, maybeSingle, updateMaybeSingle, update, createSupabaseRouteClient }
})

vi.mock('@/lib/supabase/server', () => ({ createSupabaseRouteClient: mocks.createSupabaseRouteClient }))

import { POST as revokeInvitation } from '../../app/api/coach/invitations/revoke/route'

function request(body: unknown) {
  return new Request('http://localhost/api/coach/invitations/revoke', { method: 'POST', body: JSON.stringify(body) })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'coach-1' } } })
  mocks.maybeSingle.mockResolvedValue({ data: { id: 'invitation-1', coach_id: 'coach-1', status: 'pending' }, error: null })
  mocks.updateMaybeSingle.mockResolvedValue({ data: { id: 'invitation-1', status: 'revoked' }, error: null })
})

describe('POST /api/coach/invitations/revoke', () => {
  it('rejects anonymous and malformed requests before update', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    expect((await revokeInvitation(request({ invitationId: crypto.randomUUID() }))).status).toBe(401)
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'coach-1' } } })
    expect((await revokeInvitation(request({ invitationId: 'bad', coachId: 'forged' }))).status).toBe(400)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('does not reveal another coach invitation', async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    const response = await revokeInvitation(request({ invitationId: crypto.randomUUID() }))
    expect(response.status).toBe(404)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it.each(['consumed', 'revoked'])('rejects terminal status %s with 409', async (status) => {
    mocks.maybeSingle.mockResolvedValue({ data: { id: 'invitation-1', coach_id: 'coach-1', status }, error: null })
    expect((await revokeInvitation(request({ invitationId: crypto.randomUUID() }))).status).toBe(409)
  })

  it('revokes only the authenticated coach pending invitation', async () => {
    const response = await revokeInvitation(request({ invitationId: '11111111-1111-4111-8111-111111111111', reason: 'Client request' }))
    expect(response.status).toBe(200)
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'revoked', revoked_by: 'coach-1' }))
    await expect(response.json()).resolves.toEqual({ success: true, data: { invitationId: 'invitation-1', status: 'revoked' } })
  })
})
