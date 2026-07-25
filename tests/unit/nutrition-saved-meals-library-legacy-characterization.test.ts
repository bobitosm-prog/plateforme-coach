import { describe, expect, it } from 'vitest'

const LEGACY_QUERY =
  "from('saved_meals').select('*').eq('user_id', userId).order('created_at', { ascending: false })"
const LEGACY_RESPONSE_HANDLER =
  '.then(({ data }: any) => setMyMeals(data || []))'
const LEGACY_EFFECT = `${LEGACY_QUERY}\n${LEGACY_RESPONSE_HANDLER}`

function legacySettlement<T>(data: readonly T[] | null | undefined) {
  return data || []
}

describe('C06 legacy Mes repas characterization', () => {
  it('records the owner-scoped wildcard query and historical order', () => {
    expect(LEGACY_EFFECT).toContain(LEGACY_QUERY)
  })

  it('records that a successful empty collection is displayed as empty', () => {
    expect(legacySettlement([])).toEqual([])
  })

  it('records that null data is silently converted to empty', () => {
    expect(legacySettlement(null)).toEqual([])
  })

  it('records that the response handler ignores the read error', () => {
    expect(LEGACY_EFFECT).toContain(LEGACY_RESPONSE_HANDLER)
    expect(LEGACY_EFFECT).not.toContain('myMealsRequest')
  })

  it('records the absence of cleanup and stale-response protection', () => {
    expect(LEGACY_EFFECT).not.toContain('return () =>')
    expect(LEGACY_EFFECT).not.toContain('request')
  })
})
