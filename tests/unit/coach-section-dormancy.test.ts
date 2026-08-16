import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('CoachSection dormancy contract', () => {
  it('remains imported but is not rendered by ProfileTab', () => {
    const profileTab = readFileSync('app/components/tabs/ProfileTab.tsx', 'utf8')

    expect(profileTab).toContain("import CoachSection from './profile/CoachSection'")
    expect(profileTab).not.toContain('<CoachSection')
  })
})
