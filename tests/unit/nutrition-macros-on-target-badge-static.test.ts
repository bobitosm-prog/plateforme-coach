import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), 'utf8')

describe('C07 macros_on_target static guard', () => {
  it('keeps the historical projections, owner, order and limit', () => {
    const source = read('lib/nutrition/macros-on-target-badge.ts')
    expect(source).toContain(".select('calorie_goal')")
    expect(source).toContain(".eq('id', ownerUserId)")
    expect(source).toContain(".single()")
    expect(source).toContain(".select('date, calories')")
    expect(source).toContain(".eq('user_id', ownerUserId)")
    expect(source).toContain(".order('date', { ascending: false })")
    expect(source).toContain('.limit(200)')
  })

  it('routes only macros_on_target through its explicit read boundary', () => {
    const source = read('lib/check-badges.ts')
    expect(source).toContain("case 'macros_on_target'")
    expect(source).toContain('getMacrosOnTargetBadgeReader(supabase)')
    expect(source).toContain("result.value.status !== 'calculable'")
  })

  it('does not coerce an unavailable C07 value to zero or unlock from it', () => {
    const source = read('lib/check-badges.ts')
    expect(source).toContain('if (value !== null) currentValues[ct] = value')
    expect(source).toContain('if (current === undefined) continue')
    expect(source).not.toContain('const current = currentValues[badge.condition_type] || 0')
  })

  it('keeps existing badge write payloads unchanged', () => {
    const source = read('lib/check-badges.ts')
    expect(source).toContain('{ user_id: userId, badge_id: badge.id, celebrated: false }')
    expect(source).toContain("{ onConflict: 'user_id,badge_id', ignoreDuplicates: true }")
    expect(source).toContain("{ onConflict: 'user_id', ignoreDuplicates: true }")
  })

  it('does not treat an unavailable badge value as almost unlocked', () => {
    const source = read('app/components/BadgesModal.tsx')
    expect(source).toContain('hasCurrentValue(currentValues, b.condition_type)')
    expect(source).not.toContain('getProgress(b.condition_value, currentValues[b.condition_type] || 0) >= 50')
  })
})
