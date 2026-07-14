import { beforeEach, describe, expect, it, vi } from 'vitest'
import { assignConfiguredDefaultCoach } from '../../lib/coach-relations/default-assignment'

function adminWith(coaches: unknown[], rpcResult: unknown = { success: true, coachId: 'coach-1', assigned: true, isDefault: true }) {
  const limit = vi.fn().mockResolvedValue({ data: coaches, error: null })
  const eq = vi.fn(() => ({ limit }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const rpc = vi.fn().mockResolvedValue({ data: rpcResult, error: null })
  return { admin: { from, rpc } as never, from, eq, rpc }
}

describe('default coach assignment service', () => {
  beforeEach(() => vi.clearAllMocks())

  it('fails closed for missing, ambiguous or non-coach configuration', async () => {
    const missing = adminWith([])
    await expect(assignConfiguredDefaultCoach(missing.admin, 'client-1', undefined)).rejects.toThrow('DEFAULT_COACH_NOT_CONFIGURED')
    const ambiguous = adminWith([{ id: 'a', role: 'coach' }, { id: 'b', role: 'coach' }])
    await expect(assignConfiguredDefaultCoach(ambiguous.admin, 'client-1', 'default@moovx.example.test')).rejects.toThrow('DEFAULT_COACH_INVALID')
    const client = adminWith([{ id: 'a', role: 'client' }])
    await expect(assignConfiguredDefaultCoach(client.admin, 'client-1', 'default@moovx.example.test')).rejects.toThrow('DEFAULT_COACH_INVALID')
  })

  it('passes only server-resolved identities to the service-role RPC', async () => {
    const fixture = adminWith([{ id: 'coach-1', role: 'coach' }])
    await expect(assignConfiguredDefaultCoach(fixture.admin, 'client-1', ' DEFAULT@MOOVX.EXAMPLE.TEST ')).resolves.toEqual({ coachId: 'coach-1', assigned: true, isDefault: true })
    expect(fixture.eq).toHaveBeenCalledWith('email', 'default@moovx.example.test')
    expect(fixture.rpc).toHaveBeenCalledWith('assign_default_coach', { p_client_id: 'client-1', p_coach_id: 'coach-1' })
  })

  it('preserves an existing relationship returned by the atomic RPC', async () => {
    const fixture = adminWith([{ id: 'coach-1', role: 'coach' }], { success: true, coachId: 'coach-existing', assigned: false, isDefault: false })
    await expect(assignConfiguredDefaultCoach(fixture.admin, 'client-1', 'default@moovx.example.test')).resolves.toEqual({ coachId: 'coach-existing', assigned: false, isDefault: false })
  })
})
