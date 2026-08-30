import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8')

describe('Account deep-link navigation integration', () => {
  const page = read('app/(application)/page.tsx')
  const dashboard = read('app/hooks/useClientDashboard.ts')
  const account = read('app/components/tabs/AccountTab.tsx')
  const trainingSection = read('app/components/tabs/profile/TrainingProgramSection.tsx')
  const navigation = read('lib/navigation/app-navigation.ts')

  it('uses URL state for tabs, Account sections, refresh and browser history', () => {
    expect(page).toContain('parseAppNavigation(searchParams)')
    expect(page).toContain('router.push(href, { scroll: false })')
    expect(page).toContain('router.replace(normalizedQuery')
    expect(page).toContain('setActiveTab(tabFromNavigation(navigation))')
    expect(page).toContain('aria-current={active')
  })

  it('routes Training and Account CTAs to the canonical program deep-link', () => {
    expect(page).toContain("training_program: 'training-program'")
    expect(page).toContain("onOpenProgramSettings={() => navigateTo('training_program')}")
    expect(account).toContain("onNavigate('training_program')")
  })

  it('keeps configure mode URL-controlled and the manager lazy', () => {
    expect(page).toContain("navigation.mode === 'configure'")
    expect(page).toContain("mode: open ? 'configure' : undefined")
    expect(trainingSection).toContain('configureOpen: boolean')
    expect(trainingSection).toContain("dynamic(() => import('../../training/TrainingProgramManager')")
    expect(trainingSection).not.toContain('useState')
  })

  it('preserves auth, onboarding, coach and active-workout authorities', () => {
    expect(dashboard).toContain('resolvePostAuthDestination')
    expect(dashboard).toContain("if (postAuthDecision.route !== '/')")
    expect(dashboard).toContain("if (postAuthDecision.destination === 'coach_app')")
    expect(dashboard).toContain('readActiveWorkoutDraft(localStorage, session.user.id)')
    expect(page).toContain("const CoachDashboard = dynamic(() => import('./coach/page')")
  })

  it('adds no navigation DB authority, polling, or transient overlay query', () => {
    expect(navigation).not.toMatch(/supabase|fetch\(|setInterval|localStorage|sessionStorage/i)
    expect(navigation).not.toMatch(/modal|timer|history|accordion|sheet/i)
  })
})
